import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CustomerSummary from '@/components/customers/CustomerSummary';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReceiptDialog from '@/components/printing/ReceiptDialog';
import AddCustomerDialog from '@/components/promo/AddCustomerDialog';
import { ReceiptItem, ReceiptType } from '@/types/receipt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
// ScrollArea removed - using native scroll for better mobile clipping behavior
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import CustomerPickerDialog from '@/components/orders/CustomerPickerDialog';
import {
  Truck, Plus, Loader2, User,
  Receipt, ReceiptText, XCircle, Package, Check, ChevronsUpDown, Stamp, Gift, Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkerPrintInfo } from '@/hooks/useWorkerPrintInfo';
import { Customer, Product, PaymentType, PriceSubType, Sector } from '@/types/database';
import { InvoicePaymentMethod } from '@/types/stamp';
import { useActiveStampTiers, calculateStampAmount } from '@/hooks/useStampTiers';
import { useCreateDebt } from '@/hooks/useCustomerDebts';
import ProductQuantityDialog, { PerItemPricing } from '@/components/orders/ProductQuantityDialog';
import InvoicePaymentMethodSelect from '@/components/orders/InvoicePaymentMethodSelect';
import ProductPriceBadge from '@/components/orders/ProductPriceBadge';
import { useCompanyInfo } from '@/hooks/useCompanyInfo';
import DeliveryPaymentDialog from '@/components/orders/DeliveryPaymentDialog';
import StockOverflowDialog from '@/components/warehouse/StockOverflowDialog';
import { cn } from '@/lib/utils';
import CustomerDistanceIndicator from '@/components/orders/CustomerDistanceIndicator';
import { useQueryClient } from '@tanstack/react-query';
import { useTrackVisit } from '@/hooks/useVisitTracking';
import { sendSmsDirectly, buildDeliveryConfirmationSms } from '@/utils/smsHelper';
import { loadSmsSettings, buildSmsFromTemplate, openSmsApp } from '@/components/settings/SmsSettingsCard';

interface StockItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: Product;
}

interface DirectSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockItems: StockItem[];
  initialCustomerId?: string;
  stockSource?: 'worker' | 'warehouse';
  embedded?: boolean;
  hideHeader?: boolean;
}

interface OrderItemWithPrice {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customUnitPrice?: number;
  isUnitSale?: boolean;
  giftQuantity?: number;
  giftPieces?: number;
  giftOfferId?: string;
  offerNote?: string; // note for managers when offer was overridden
  pricingUnit?: string;
  weightPerBox?: number | null;
  piecesPerBox?: number;
}

const DirectSaleDialog: React.FC<DirectSaleDialogProps> = ({
  open,
  onOpenChange,
  stockItems,
  initialCustomerId,
  stockSource = 'worker',
  embedded = false,
  hideHeader = false,
}) => {
  const { workerId, activeBranch, user, activeRole } = useAuth();
  const isWarehouseManager = activeRole?.custom_role_code === 'warehouse_manager';
  const { data: workerPrintInfo } = useWorkerPrintInfo(workerId);
  const { t, dir } = useLanguage();
  const queryClient = useQueryClient();
  const { companyInfo } = useCompanyInfo();
  const { data: stampTiers } = useActiveStampTiers();
  const createDebt = useCreateDebt();
  const { trackVisit } = useTrackVisit();
  // Data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItemWithPrice[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('without_invoice');
  const [priceSubType, setPriceSubType] = useState<PriceSubType>('gros');
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState<InvoicePaymentMethod | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // CRITICAL: Frozen state values captured at save time - immune to customer defaults
  const [frozenPaymentType, setFrozenPaymentType] = useState<PaymentType>('without_invoice');
  const [frozenInvoiceMethod, setFrozenInvoiceMethod] = useState<InvoicePaymentMethod | null>(null);

  // Pricing groups
  const [pricingGroupMappings, setPricingGroupMappings] = useState<{ group_id: string; product_id: string }[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);

  // Dialogs
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProductMode, setEditingProductMode] = useState(false);
  const [editingTargetProductId, setEditingTargetProductId] = useState<string | null>(null);
  const [editingInitialQuantity, setEditingInitialQuantity] = useState(1);
  const [editingInitialGiftPieces, setEditingInitialGiftPieces] = useState(0);
  const [editingInitialOfferApplied, setEditingInitialOfferApplied] = useState(false);
  const [editingInitialIsUnitSale, setEditingInitialIsUnitSale] = useState(false);
  const [editingInitialCustomUnitPrice, setEditingInitialCustomUnitPrice] = useState<number | undefined>(undefined);
  const [editingInitialGiftOfferId, setEditingInitialGiftOfferId] = useState<string | undefined>(undefined);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [showOverflowDialog, setShowOverflowDialog] = useState(false);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [overflowData, setOverflowData] = useState<any>(null);

  // Derived
  const selectedCustomer = useMemo(() =>
    customers.find(c => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  // Available products from worker stock
  const availableProducts = useMemo(() => {
    const productsMap = new Map<string, Product>();

    stockItems
      .filter(s => s.quantity > 0 && s.product)
      .forEach((s) => {
        const fullProduct = allProducts.find(p => p.id === s.product_id);
        const product = fullProduct || s.product;
        if (product) productsMap.set(product.id, product);
      });

    return Array.from(productsMap.values()).sort((a, b) => {
      const aOrder = (a as any).sort_order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = (b as any).sort_order ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });
  }, [stockItems, allProducts]);

  useEffect(() => {
    if (open && workerId) {
      fetchData();
      if (initialCustomerId) {
        setSelectedCustomerId(initialCustomerId);
      }
    }
  }, [open, workerId, activeBranch, initialCustomerId]);

  // Apply customer defaults when selectedCustomer changes (e.g. from initialCustomerId)
  useEffect(() => {
    if (selectedCustomer) {
      if (selectedCustomer.default_payment_type) {
        setPaymentType(selectedCustomer.default_payment_type as PaymentType);
      }
      if (selectedCustomer.default_price_subtype) {
        setPriceSubType(selectedCustomer.default_price_subtype as PriceSubType);
      }
    }
  }, [selectedCustomer]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      let customersQuery = supabase.from('customers').select('*').eq('status', 'active').order('name');
      if (activeBranch) customersQuery = customersQuery.or(`branch_id.eq.${activeBranch.id},branch_id.is.null`);

      let sectorsQuery = supabase.from('sectors').select('*').order('name');
      if (activeBranch) sectorsQuery = sectorsQuery.eq('branch_id', activeBranch.id);

      const [customersRes, mappingsRes, productsRes, sectorsRes] = await Promise.all([
        customersQuery,
        supabase.from('product_pricing_groups').select('group_id, product_id'),
        supabase.from('products').select('*').eq('is_active', true).order('sort_order', { ascending: true }).order('name'),
        sectorsQuery,
      ]);

      setCustomers(customersRes.data || []);
      setSectors((sectorsRes.data || []) as Sector[]);
      setPricingGroupMappings(mappingsRes.data || []);
      setAllProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const resetForm = useCallback(() => {
    setSelectedCustomerId('');
    setOrderItems([]);
    setNotes('');
    setPaymentType('without_invoice');
    setPriceSubType('gros');
    setInvoicePaymentMethod(null);
    setCustomerDropdownOpen(false);
    // NOTE: Do NOT reset receiptData/showReceiptDialog here — they must persist after dialog closes
  }, []);

  const handleClose = useCallback((isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  }, [onOpenChange, resetForm]);

  // Pricing group logic
  const getEffectiveProduct = useCallback((productId: string): Product | undefined => {
    const directProduct = allProducts.find(p => p.id === productId) ||
      stockItems.find(s => s.product_id === productId)?.product;
    if (!directProduct) return undefined;

    const mapping = pricingGroupMappings.find(m => m.product_id === productId);
    if (!mapping) return directProduct;

    const groupProductIds = pricingGroupMappings.filter(m => m.group_id === mapping.group_id).map(m => m.product_id);
    const refProduct = groupProductIds
      .map(id => allProducts.find(p => p.id === id))
      .filter(Boolean)
      .find(p => p!.price_invoice !== null && p!.price_invoice !== 0) as Product | undefined;

    if (!refProduct || refProduct.id === productId) return directProduct;

    return {
      ...directProduct,
      price_invoice: directProduct.price_invoice || refProduct.price_invoice,
      price_super_gros: directProduct.price_super_gros || refProduct.price_super_gros,
      price_gros: directProduct.price_gros || refProduct.price_gros,
      price_retail: directProduct.price_retail || refProduct.price_retail,
    };
  }, [allProducts, stockItems, pricingGroupMappings]);

  const getProductPrice = useCallback((product: Product): number => {
    const effective = getEffectiveProduct(product.id) || product;
    let basePrice = 0;
    if (paymentType === 'with_invoice') {
      basePrice = effective.price_invoice || 0;
    } else {
      switch (priceSubType) {
        case 'super_gros': basePrice = effective.price_super_gros || effective.price_no_invoice || 0; break;
        case 'gros': basePrice = effective.price_gros || effective.price_no_invoice || 0; break;
        case 'retail': basePrice = effective.price_retail || effective.price_no_invoice || 0; break;
        default: basePrice = effective.price_gros || effective.price_no_invoice || 0;
      }
    }
    // If pricing is per kg, multiply by weight_per_box to get box price
    if (effective.pricing_unit === 'kg' && effective.weight_per_box) {
      return basePrice * effective.weight_per_box;
    }
    // If pricing is per unit, multiply by pieces_per_box to get box price
    if (effective.pricing_unit === 'unit' && effective.pieces_per_box > 1) {
      return basePrice * effective.pieces_per_box;
    }
    return basePrice;
  }, [paymentType, priceSubType, getEffectiveProduct]);

  const resolveCustomSalePrice = useCallback((product: Product, baseUnitPrice: number, unitSale: boolean): number => {
    const piecesPerBox = product.pieces_per_box || 1;
    const weightPerBox = product.weight_per_box || 1;
    const pricingUnit = product.pricing_unit || 'box';
    if (pricingUnit === 'kg') {
      const boxPrice = baseUnitPrice * weightPerBox;
      return unitSale ? boxPrice / piecesPerBox : boxPrice;
    }
    if (pricingUnit === 'unit') {
      const piecePrice = baseUnitPrice;
      return unitSale ? piecePrice : piecePrice * piecesPerBox;
    }
    const boxPrice = baseUnitPrice;
    return unitSale ? boxPrice / piecesPerBox : boxPrice;
  }, []);

  const getAvailable = (productId: string) =>
    stockItems.find(s => s.product_id === productId)?.quantity || 0;

  // Product handlers
  const handleEditItem = (item: OrderItemWithPrice) => {
    const product = allProducts.find(p => p.id === item.productId) || availableProducts.find(p => p.id === item.productId);
    if (!product) return;
    const piecesPerBox = item.piecesPerBox ?? product.pieces_per_box ?? 1;
    const paidQuantity = Math.max(1, item.quantity - (item.giftQuantity || 0));
    const totalGiftPieces = item.isUnitSale ? 0 : ((item.giftQuantity || 0) * piecesPerBox + (item.giftPieces || 0));

    setEditingProductMode(true);
    setEditingTargetProductId(item.productId);
    setEditingInitialQuantity(paidQuantity);
    setEditingInitialGiftPieces(totalGiftPieces);
    setEditingInitialOfferApplied(!item.isUnitSale && ((item.giftQuantity || 0) > 0 || (item.giftPieces || 0) > 0));
    setEditingInitialIsUnitSale(!!item.isUnitSale);
    setEditingInitialCustomUnitPrice(item.customUnitPrice);
    setEditingInitialGiftOfferId(item.giftOfferId);
    setSelectedProduct(product);
    setShowQuantityDialog(true);
  };

  const handleProductClick = (product: Product) => {
    const existingItem = orderItems.find(item => item.productId === product.id);
    if (existingItem) {
      handleEditItem(existingItem);
      return;
    }
    setEditingProductMode(false);
    setEditingTargetProductId(null);
    setSelectedProduct(product);
    setShowQuantityDialog(true);
  };

  const handleAddProductWithQuantity = (productId: string, quantity: number, giftInfo?: any, isUnitSale?: boolean, perItemPricing?: PerItemPricing) => {
    const product = availableProducts.find(p => p.id === productId);
    if (!product) return;

    const available = getAvailable(productId);
    const customUnitPrice = perItemPricing?.customUnitPrice;
    const customSalePrice = customUnitPrice !== undefined ? resolveCustomSalePrice(product, customUnitPrice, !!isUnitSale) : undefined;

    if (isUnitSale) {
      const boxPrice = getProductPrice(product);
      const basePiecePrice = product.pieces_per_box > 0 ? boxPrice / product.pieces_per_box : boxPrice;
      const piecePrice = customSalePrice ?? basePiecePrice;
      const totalPrice = piecePrice * quantity;
      setOrderItems(prev => [...prev, { productId, quantity, unitPrice: piecePrice, totalPrice, customUnitPrice, isUnitSale: true }]);
      return;
    }

    // Check if quantity exceeds available stock
    const baseQuantity = giftInfo?.giftQuantity ? quantity - giftInfo.giftQuantity : quantity;
    if (baseQuantity > available) {
      // Calculate gift for available quantity using ProductOfferBadge logic
      const deliveredGiftPieces = 0; // Will be recalculated in overflow dialog
      const deliveredGiftBoxes = 0;

      setOverflowData({
        product,
        requestedQuantity: baseQuantity,
        availableQuantity: available,
        originalGift: giftInfo ? { giftQuantity: giftInfo.giftQuantity || 0, giftPieces: giftInfo.giftPieces || 0, offerId: giftInfo.offerId } : null,
        deliveredGift: { giftQuantity: deliveredGiftBoxes, giftPieces: deliveredGiftPieces },
        customUnitPrice,
      });
      setShowOverflowDialog(true);
      return;
    }

    const unitPrice = customSalePrice ?? getProductPrice(product);
    const giftQuantity = giftInfo?.giftQuantity || 0;
    const paidQuantity = quantity - giftQuantity;

    setOrderItems(prev => {
      const existing = prev.find(item => item.productId === productId && !item.customUnitPrice && !customUnitPrice);
      if (existing) {
        const newQuantity = Math.min(existing.quantity + quantity, available + giftQuantity);
        const newPaid = Math.max(0, newQuantity - giftQuantity);
        return prev.map(item =>
          item.productId === productId
            ? { ...item, quantity: newQuantity, totalPrice: newPaid * unitPrice }
            : item
        );
      }
      return [...prev, { productId, quantity, unitPrice, totalPrice: paidQuantity * unitPrice, customUnitPrice, giftQuantity: giftQuantity || undefined, giftPieces: giftInfo?.giftPieces || undefined, giftOfferId: giftInfo?.offerId }];
    });
  };

  const handleEditProductWithQuantity = (
    productId: string,
    quantity: number,
    giftInfo?: any,
    isUnitSale?: boolean,
    perItemPricing?: PerItemPricing
  ) => {
    const product = availableProducts.find(p => p.id === productId) || allProducts.find(p => p.id === productId);
    if (!product) return;

    const customUnitPrice = perItemPricing?.customUnitPrice;
    const customSalePrice = customUnitPrice !== undefined ? resolveCustomSalePrice(product, customUnitPrice, !!isUnitSale) : undefined;

    if (isUnitSale) {
      const boxPrice = getProductPrice(product);
      const basePiecePrice = product.pieces_per_box > 0 ? boxPrice / product.pieces_per_box : boxPrice;
      const piecePrice = customSalePrice ?? basePiecePrice;
      const totalPrice = piecePrice * quantity;
      setOrderItems(prev => prev.map(item => item.productId === productId ? {
        ...item,
        quantity,
        unitPrice: piecePrice,
        totalPrice,
        customUnitPrice,
        isUnitSale: true,
        giftQuantity: 0,
        giftPieces: 0,
        giftOfferId: undefined,
      } : item));
    } else {
      const unitPrice = customSalePrice ?? getProductPrice(product);
      const giftQuantity = giftInfo?.giftQuantity || 0;
      const giftPieces = giftInfo?.giftPieces || 0;
      const paidQuantity = Math.max(0, quantity - giftQuantity);
      const totalPrice = paidQuantity * unitPrice;
      setOrderItems(prev => prev.map(item => item.productId === productId ? {
        ...item,
        quantity,
        unitPrice,
        totalPrice,
        customUnitPrice,
        isUnitSale: false,
        giftQuantity: giftQuantity || undefined,
        giftPieces: giftPieces || undefined,
        giftOfferId: giftInfo?.offerId ?? item.giftOfferId,
      } : item));
    }

    setEditingProductMode(false);
    setEditingTargetProductId(null);
  };

  // Sync function for gift calculation from overflow dialog
  const calcGiftForQty = useCallback((_qty: number): { giftPieces: number; giftBoxes: number } => {
    return { giftPieces: 0, giftBoxes: 0 };
  }, []);

  const handleOverflowConfirm = async (
    deliveredQty: number,
    giftInfo: { giftQuantity: number; giftPieces: number; offerId?: string } | null,
    createOrderForExcess: boolean,
    excessQty: number,
    offerNote: string | null,
  ) => {
    if (!overflowData?.product) return;
    const product = overflowData.product;
    const unitPrice = overflowData.customUnitPrice !== undefined
      ? resolveCustomSalePrice(product, overflowData.customUnitPrice, false)
      : getProductPrice(product);
    const giftQuantity = giftInfo?.giftQuantity || 0;
    const totalQty = deliveredQty + giftQuantity;
    const paidQty = deliveredQty;

    setOrderItems(prev => [...prev, {
      productId: product.id,
      quantity: totalQty,
      unitPrice,
      totalPrice: paidQty * unitPrice,
      customUnitPrice: overflowData.customUnitPrice,
      giftQuantity: giftQuantity || undefined,
      giftPieces: giftInfo?.giftPieces || undefined,
      giftOfferId: giftInfo?.offerId,
      offerNote: offerNote || undefined,
    }]);

    // Create order for excess quantity if requested
    if (createOrderForExcess && excessQty > 0 && selectedCustomerId && workerId) {
      try {
        const { data: order, error } = await supabase
          .from('orders')
          .insert({
            customer_id: selectedCustomerId,
            created_by: workerId,
            assigned_worker_id: workerId,
            branch_id: activeBranch?.id || null,
            status: 'pending',
            payment_type: paymentType,
            notes: `طلبية تلقائية - كمية غير متوفرة: ${excessQty} ${product.name}`,
          })
          .select()
          .single();

        if (!error && order) {
          await supabase.from('order_items').insert({
            order_id: order.id,
            product_id: product.id,
            quantity: excessQty,
            unit_price: unitPrice,
            total_price: excessQty * unitPrice,
          });
          toast.success(`تم إنشاء طلبية بـ ${excessQty} ${product.name}`);
        }
      } catch (err) {
        console.error('Error creating overflow order:', err);
        toast.error('فشل إنشاء الطلبية');
      }
    }

    setOverflowData(null);
  };

  const handleRemoveProduct = (productId: string) => {
    setOrderItems(prev => prev.filter(item => item.productId !== productId));
  };

  const getProductName = (productId: string) =>
    availableProducts.find(p => p.id === productId)?.name || '';

  // Recalculate prices when payment type / sub-type changes
  useEffect(() => {
    if (orderItems.length > 0) {
      setOrderItems(prev => prev.map(item => {
        const product = availableProducts.find(p => p.id === item.productId);
        if (product) {
          const baseBoxPrice = getProductPrice(product);
          const basePiecePrice = product.pieces_per_box > 0 ? baseBoxPrice / product.pieces_per_box : baseBoxPrice;
          const fallbackUnitPrice = item.isUnitSale ? basePiecePrice : baseBoxPrice;
          const unitPrice = item.customUnitPrice !== undefined
            ? resolveCustomSalePrice(product, item.customUnitPrice, !!item.isUnitSale)
            : fallbackUnitPrice;
          const paidQuantity = item.quantity - (item.giftQuantity || 0);
          const totalPrice = item.isUnitSale ? unitPrice * item.quantity : paidQuantity * unitPrice;
          return { ...item, unitPrice, totalPrice };
        }
        return item;
      }));
    }
  }, [paymentType, priceSubType, availableProducts]);

  // Totals
  const orderTotals = useMemo(() => {
    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    let stampAmount = 0;
    let stampPercentage = 0;
    if (paymentType === 'with_invoice' && invoicePaymentMethod === 'cash' && stampTiers?.length) {
      stampAmount = calculateStampAmount(subtotal, stampTiers);
      const activeTiers = stampTiers.filter(t => t.is_active);
      const matchedTier = activeTiers.find(t => subtotal >= t.min_amount && (t.max_amount === null || subtotal <= t.max_amount));
      if (matchedTier) stampPercentage = matchedTier.percentage;
    }
    return { totalItems, subtotal, stampAmount, stampPercentage, totalAmount: subtotal + stampAmount };
  }, [orderItems, paymentType, invoicePaymentMethod, stampTiers]);

  // Show payment dialog before completing
  const handleSave = () => {
    if (!selectedCustomerId) { toast.error(t('orders.select_customer_error')); return; }
    if (orderItems.length === 0) { toast.error(t('orders.add_products_error')); return; }

    // Validate stock
    for (const item of orderItems) {
      const available = getAvailable(item.productId);
      if (item.quantity > available) {
        toast.error(`${getProductName(item.productId)}: ${t('stock.available')} ${available}`);
        return;
      }
    }

    // CRITICAL: Freeze the current values into state BEFORE opening dialog
    // React 18 batches these setState calls, so all values are consistent in the next render
    setFrozenPaymentType(paymentType);
    setFrozenInvoiceMethod(invoicePaymentMethod);
    console.log('[DirectSale] FROZEN VALUES SET:', JSON.stringify({
      paymentType: paymentType,
      invoiceMethod: invoicePaymentMethod,
    }));

    setShowPaymentDialog(true);
  };

  const handlePaymentConfirm = async (paymentData: {
    paidAmount: number;
    remainingAmount: number;
    paymentMethod: string;
    notes?: string;
    isFullPayment: boolean;
    isNoPayment?: boolean;
    confirmedPaymentType?: string;
    confirmedInvoiceMethod?: string | null;
  }) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      // USE FROZEN STATE directly - these were captured at save time before dialog opened
      const finalPaymentType = frozenPaymentType;
      const finalInvoiceMethod = frozenInvoiceMethod;
      console.log('[DirectSale] SAVING WITH:', JSON.stringify({ finalPaymentType, finalInvoiceMethod }));

      // Determine payment status based on invoice payment method
      let paymentStatus: string;
      if (paymentData.isNoPayment) {
        paymentStatus = 'pending';
      } else if (!paymentData.isFullPayment) {
        paymentStatus = 'partial';
      } else if (finalPaymentType === 'with_invoice' && finalInvoiceMethod === 'check') {
        paymentStatus = 'check';
      } else {
        paymentStatus = 'cash';
      }

      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_id: selectedCustomerId,
          created_by: workerId!,
          assigned_worker_id: workerId!,
          branch_id: activeBranch?.id || null,
          status: 'delivered',
          payment_type: finalPaymentType,
          payment_status: paymentStatus,
          invoice_payment_method: finalPaymentType === 'with_invoice' ? (finalInvoiceMethod || null) : null,
          partial_amount: paymentData.isFullPayment ? null : paymentData.paidAmount,
          total_amount: orderTotals.totalAmount,
          notes: (() => {
            const defaultNote = isWarehouseManager ? 'بيع مخزن - Vente Dépôt' : (stockSource === 'warehouse' ? 'بيع مباشر من المخزن' : 'بيع مباشر من الشاحنة');
            const offerNotes = orderItems.filter(i => i.offerNote).map(i => i.offerNote).join(' | ');
            return [notes || defaultNote, offerNotes].filter(Boolean).join(' | ');
          })(),
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      const orderItemsData = orderItems.map(item => {
        const prod = availableProducts.find(p => p.id === item.productId);
        return {
          order_id: order.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          gift_quantity: item.giftPieces || item.giftQuantity || 0,
          gift_offer_id: item.giftOfferId || null,
          pricing_unit: item.pricingUnit || prod?.pricing_unit || 'box',
          weight_per_box: item.weightPerBox ?? prod?.weight_per_box ?? null,
          pieces_per_box: item.piecesPerBox ?? prod?.pieces_per_box ?? null,
        };
      });

      const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsData);
      if (itemsErr) throw new Error('فشل في حفظ بنود الطلب: ' + itemsErr.message);

      // Deduct from stock & log movements (including gift quantities)
      for (const item of orderItems) {
        const ws = stockItems.find(s => s.product_id === item.productId);
        if (ws) {
          // Calculate gift deduction in box.pieces format
          const giftInPieces = item.giftPieces || item.giftQuantity || 0;
          let totalDeduction = item.quantity;
          if (giftInPieces > 0) {
            const product = allProducts.find(p => p.id === item.productId);
            const piecesPerBox = product?.pieces_per_box || 20;
            // Convert gift pieces to box.pieces format
            const giftBoxes = Math.floor(giftInPieces / piecesPerBox);
            const giftRemainingPieces = Math.round(giftInPieces % piecesPerBox);
            const giftInBoxFormat = giftBoxes + giftRemainingPieces / 100;
            // Convert current stock and sold qty to total pieces, add gift, convert back
            const stockPieces = (() => {
              const boxes = Math.floor(Math.round(ws.quantity * 100) / 100);
              const dec = Math.round((Math.round(ws.quantity * 100) / 100 - boxes) * 100);
              return boxes * piecesPerBox + dec;
            })();
            const soldPieces = (() => {
              const boxes = Math.floor(Math.round(item.quantity * 100) / 100);
              const dec = Math.round((Math.round(item.quantity * 100) / 100 - boxes) * 100);
              return boxes * piecesPerBox + dec;
            })();
            const remainingPieces = stockPieces - soldPieces;
            const newBoxes = Math.floor(remainingPieces / piecesPerBox);
            const newRemaining = Math.round(remainingPieces % piecesPerBox);
            const newQty = newBoxes + newRemaining / 100;

            const stockTable = stockSource === 'warehouse' ? 'warehouse_stock' : 'worker_stock';
            await supabase.from(stockTable).update({ quantity: newQty }).eq('id', ws.id);
          } else {
            if (stockSource === 'warehouse') {
              await supabase.from('warehouse_stock').update({ quantity: ws.quantity - item.quantity }).eq('id', ws.id);
            } else {
              await supabase.from('worker_stock').update({ quantity: ws.quantity - item.quantity }).eq('id', ws.id);
            }
          }
        }
        await supabase.from('stock_movements').insert({
          product_id: item.productId,
          branch_id: activeBranch?.id || null,
          quantity: item.quantity,
          movement_type: 'delivery',
          status: 'approved',
          created_by: workerId!,
          worker_id: workerId!,
          order_id: order.id,
          notes: isWarehouseManager ? 'بيع مخزن - Vente Dépôt' : (stockSource === 'warehouse' ? 'بيع مباشر من المخزن' : 'بيع مباشر من الشاحنة'),
        });
      }

      // Record gifts in promos table
      const giftItems = orderItems.filter(i => (i.giftQuantity && i.giftQuantity > 0) || (i.giftPieces && i.giftPieces > 0));
      for (const item of giftItems) {
        const giftInPieces = item.giftPieces || item.giftQuantity || 0;
        await supabase.from('promos').insert({
          worker_id: workerId!,
          customer_id: selectedCustomerId,
          product_id: item.productId,
          vente_quantity: item.quantity - (item.giftQuantity || 0),
          gratuite_quantity: giftInPieces,
          has_bonus: false,
          bonus_amount: 0,
          notes: `هدية عرض - بيع مباشر ${order.id.slice(0, 8)}`,
        });
      }

      // Create debt if partial payment
      if (!paymentData.isFullPayment && paymentData.remainingAmount > 0) {
        await createDebt.mutateAsync({
          customer_id: selectedCustomerId,
          order_id: order.id,
          worker_id: workerId!,
          branch_id: activeBranch?.id,
          total_amount: paymentData.remainingAmount,
          paid_amount: 0,
          notes: paymentData.notes,
        });
        toast.success(t('debts.debt_recorded'));
      } else {
        toast.success(t('stock.direct_sale_success'));
      }

      queryClient.invalidateQueries({ queryKey: ['my-worker-stock'] });
      if (stockSource === 'warehouse') {
        queryClient.invalidateQueries({ queryKey: ['warehouse-stock'] });
        queryClient.invalidateQueries({ queryKey: ['warehouse-stock-for-sale'] });
      }

      // Track direct sale visit GPS
      trackVisit({ customerId: selectedCustomerId, operationType: 'direct_sale', operationId: order.id });

      // إرسال SMS حسب الإعدادات
      const customerPhone = selectedCustomer?.phone;
      if (customerPhone) {
        void (async () => {
          try {
            const smsConfig = await loadSmsSettings(activeBranch?.id);
            const opConfig = smsConfig.direct_sale;
            if (!opConfig.enabled || opConfig.mode === 'disabled') return;

            const paymentStatusText = paymentData.paidAmount >= orderTotals.totalAmount
              ? 'الحالة: مدفوع بالكامل'
              : paymentData.paidAmount > 0
                ? `المدفوع: ${paymentData.paidAmount.toLocaleString()} دج\nالمتبقي: ${paymentData.remainingAmount.toLocaleString()} دج`
                : `الحالة: دين ${orderTotals.totalAmount.toLocaleString()} دج`;

            const message = buildSmsFromTemplate(opConfig.template, {
              customer: selectedCustomer?.name || '',
              total: orderTotals.totalAmount.toLocaleString(),
              order_id: order.id.slice(0, 8),
              company: companyInfo?.company_name || '',
              amount: paymentData.paidAmount.toLocaleString(),
              remaining: paymentData.remainingAmount.toLocaleString(),
              payment_status: paymentStatusText,
            });

            if (opConfig.mode === 'automatic') {
              const sent = await sendSmsDirectly(customerPhone, message);
              if (sent) toast.success('تم إرسال رسالة التأكيد للعميل');
            } else if (opConfig.mode === 'semi_automatic') {
              openSmsApp(customerPhone, message);
            }
          } catch (smsError) {
            console.error('[SMS] Direct sale SMS error:', smsError);
          }
        })();
      }

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['assigned-orders'] });
      setShowPaymentDialog(false);

      // Build receipt data and show receipt dialog
      const offerNotes = orderItems.filter(i => i.offerNote).map(i => i.offerNote).join(' | ');
      const receiptItems: ReceiptItem[] = orderItems.map(item => {
        const prod = availableProducts.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          productName: getProductName(item.productId),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          giftQuantity: item.giftQuantity,
          giftPieces: item.giftPieces,
          offerNote: item.offerNote,
          pricingUnit: item.pricingUnit || prod?.pricing_unit || 'box',
          weightPerBox: item.weightPerBox ?? prod?.weight_per_box ?? null,
          piecesPerBox: item.piecesPerBox ?? prod?.pieces_per_box ?? null,
        };
      });
      const combinedNotes = [notes, offerNotes].filter(Boolean).join(' | ');

      setReceiptData({
        receiptType: 'direct_sale' as ReceiptType,
        orderId: order.id,
        debtId: null,
        customerId: selectedCustomerId,
        customerName: selectedCustomer?.name || '',
        customerPhone: selectedCustomer?.phone || null,
        workerId: workerId!,
        workerName: workerPrintInfo?.printName || user?.full_name || '',
        workerPhone: workerPrintInfo?.workPhone || null,
        branchId: activeBranch?.id || null,
        items: receiptItems,
        totalAmount: orderTotals.totalAmount,
        discountAmount: 0,
        paidAmount: paymentData.paidAmount,
        remainingAmount: paymentData.remainingAmount,
        paymentMethod: paymentData.paymentMethod,
        notes: combinedNotes || null,
        orderPaymentType: frozenPaymentType,
        orderPriceSubtype: priceSubType,
        orderInvoicePaymentMethod: frozenInvoiceMethod || undefined,
        stampAmount: orderTotals.stampAmount > 0 ? orderTotals.stampAmount : undefined,
        stampPercentage: orderTotals.stampPercentage > 0 ? orderTotals.stampPercentage : undefined,
      });
      setShowReceiptDialog(true);
      handleClose(false);
    } catch (error: any) {
      console.error('Direct sale error:', error);
      toast.error(error.message || t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const content = (
    <>
      {!hideHeader && (
        <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              {isWarehouseManager ? 'بيع مخزن - Vente Dépôt' : t('stock.direct_sale')}
            </DialogTitle>
        </DialogHeader>
      )}

       <div
         className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4"
         style={embedded ? { WebkitOverflowScrolling: 'touch' } : { WebkitOverflowScrolling: 'touch', maxHeight: 'calc(90vh - 8rem)' }}
       >
            <div className="py-4 space-y-5">
              {/* Customer Section */}
              <section className="space-y-3">
                <Label className="text-base font-semibold">{t('orders.customer')}</Label>

                <Button
                  variant="outline"
                  className="w-full justify-between h-11"
                  disabled={isLoadingData}
                  onClick={() => setCustomerDropdownOpen(true)}
                >
                  {isLoadingData ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('common.loading')}
                    </span>
                  ) : selectedCustomer ? (
                    <CustomerSummary
                      customer={{
                        name: selectedCustomer.name,
                        store_name: selectedCustomer.store_name,
                        customer_type: selectedCustomer.customer_type,
                        sector_name: sectors?.find(s => s.id === selectedCustomer.sector_id)?.name,
                      }}
                      compact
                      avatarSize="sm"
                      showMeta={false}
                    />
                  ) : (
                    <span className="text-muted-foreground">{t('orders.select_customer')}</span>
                  )}
                  <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>

                <CustomerPickerDialog
                  open={customerDropdownOpen}
                  onOpenChange={setCustomerDropdownOpen}
                  customers={customers}
                  sectors={sectors}
                  isLoading={isLoadingData}
                  selectedCustomerId={selectedCustomerId}
                  onSelect={(customer) => {
                    setSelectedCustomerId(customer.id);
                    if (customer.default_payment_type) {
                      setPaymentType(customer.default_payment_type as PaymentType);
                    }
                    if (customer.default_price_subtype) {
                      setPriceSubType(customer.default_price_subtype as PriceSubType);
                    }
                  }}
                  onAddNew={() => {
                    setCustomerDropdownOpen(false);
                    setShowAddCustomerDialog(true);
                  }}
                />

                {/* Selected Customer Info */}
                {selectedCustomer && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <CustomerSummary
                      customer={{
                        name: selectedCustomer.name,
                        store_name: selectedCustomer.store_name,
                        customer_type: selectedCustomer.customer_type,
                        sector_name: sectors?.find(s => s.id === selectedCustomer.sector_id)?.name,
                        phone: selectedCustomer.phone,
                        wilaya: selectedCustomer.wilaya,
                      }}
                      avatarSize="md"
                      footer={(
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {selectedCustomer.default_payment_type === 'with_invoice' ? t('orders.with_invoice') :
                              selectedCustomer.default_price_subtype === 'super_gros' ? t('products.price_super_gros') :
                                selectedCustomer.default_price_subtype === 'retail' ? t('products.price_retail') : t('products.price_gros')
                            }
                          </Badge>
                        </div>
                      )}
                    />
                    <CustomerDistanceIndicator
                      customerLatitude={selectedCustomer.latitude}
                      customerLongitude={selectedCustomer.longitude}
                    />
                  </div>
                )}
              </section>

              {/* Payment Type - warehouse_manager can choose, others always without invoice */}
              <section className="space-y-3">
                <Label className="text-base font-semibold">{t('orders.purchase_method')}</Label>
                {isWarehouseManager ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={paymentType === 'with_invoice' ? 'default' : 'outline'}
                      className={`h-12 text-sm font-bold ${paymentType === 'with_invoice' ? 'ring-2 ring-primary/40' : 'opacity-60'}`}
                      onClick={() => setPaymentType('with_invoice')}
                    >
                      <Receipt className="w-4 h-4 ml-2" />
                      {t('orders.with_invoice')}
                    </Button>
                    <Button
                      type="button"
                      variant={paymentType === 'without_invoice' ? 'default' : 'outline'}
                      className={`h-12 text-sm font-bold ${paymentType === 'without_invoice' ? 'ring-2 ring-primary/40' : 'opacity-60'}`}
                      onClick={() => setPaymentType('without_invoice')}
                    >
                      <ReceiptText className="w-4 h-4 ml-2" />
                      {t('orders.without_invoice')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                    <ReceiptText className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{t('orders.without_invoice')}</span>
                  </div>
                )}

                {/* Invoice Payment Method for warehouse_manager with_invoice */}
                {isWarehouseManager && paymentType === 'with_invoice' && (
                  <InvoicePaymentMethodSelect
                    value={invoicePaymentMethod}
                    onChange={setInvoicePaymentMethod}
                  />
                )}

                {/* Price Sub-Type - only for without_invoice */}
                {paymentType === 'without_invoice' && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('orders.price_type')}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'super_gros' as PriceSubType, label: t('products.price_super_gros'), colors: { active: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 ring-2 ring-indigo-400', inactive: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600' } },
                      { value: 'gros' as PriceSubType, label: t('products.price_gros'), colors: { active: 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600 ring-2 ring-cyan-400', inactive: 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600' } },
                      { value: 'retail' as PriceSubType, label: t('products.price_retail'), colors: { active: 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 ring-2 ring-rose-400', inactive: 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600' } },
                    ]).map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={priceSubType === option.value ? 'default' : 'outline'}
                        size="sm"
                        className={`h-12 text-sm font-bold transition-opacity ${priceSubType === option.value ? option.colors.active : option.colors.inactive} ${priceSubType !== option.value ? 'opacity-50' : ''}`}
                        onClick={() => setPriceSubType(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                  {selectedCustomer?.default_price_subtype && (
                    <p className="text-xs text-muted-foreground">
                      ⓘ {t('orders.customer_default')}: {
                        selectedCustomer.default_price_subtype === 'super_gros' ? t('products.price_super_gros') :
                          selectedCustomer.default_price_subtype === 'gros' ? t('products.price_gros') :
                            t('products.price_retail')
                      }
                    </p>
                  )}
                </div>
                )}
              </section>

              {/* Products - Grid like CreateOrderDialog */}
              <section className="space-y-3">
                <Label className="text-base font-semibold">{t('products.title')}</Label>
                <div className="grid grid-cols-2 gap-3 p-1">
                  {availableProducts.map((product) => {
                    const productCartItems = orderItems.filter(item => item.productId === product.id);
                    const inCart = productCartItems.length > 0 ? productCartItems[0] : null;
                    const totalCartQuantity = productCartItems.reduce((sum, item) => sum + item.quantity, 0);
                    const totalGiftBoxes = productCartItems.reduce((sum, item) => sum + (item.giftQuantity || 0), 0);
                    const totalGiftPieces = productCartItems.reduce((sum, item) => sum + (item.giftPieces || 0), 0);
                    const hasAppliedGift = totalGiftBoxes > 0 || totalGiftPieces > 0;
                    const available = getAvailable(product.id);
                    const price = getProductPrice(product);
                    return (
                      <button
                        key={product.id}
                        dir="rtl"
                        onClick={() => handleProductClick(product)}
                        className={cn(
                          "flex flex-col rounded-2xl overflow-hidden text-center transition-all relative",
                          "bg-white shadow-lg border-2",
                          hasAppliedGift
                            ? 'border-green-500 ring-2 ring-green-400/40'
                            : inCart ? 'border-primary ring-2 ring-primary/40' : 'border-red-200 hover:border-primary/60 hover:shadow-xl'
                        )}
                      >
                        {/* اسم المنتج أعلى الصورة */}
                        <div className={cn(
                          "px-2 py-2 border-b",
                          hasAppliedGift
                            ? 'bg-green-500 border-green-500'
                            : inCart ? 'bg-primary border-primary' : 'bg-red-50 border-red-100'
                        )}>
                          <span className={cn(
                            "font-bold leading-tight block text-center truncate text-sm",
                            inCart ? 'text-white' : 'text-red-900'
                          )}>
                            {product.name}
                          </span>
                          {inCart && (
                            <span className="text-lg font-extrabold block text-center mt-1 rounded-md px-2 py-0.5 bg-primary text-primary-foreground">
                              {productCartItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0).toLocaleString()} {t('common.currency')}
                            </span>
                          )}
                        </div>

                        {/* الصورة */}
                        <div className="flex-1 relative">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name} 
                              className="w-full aspect-square object-cover"
                              loading="lazy"
                            />
                          ) : companyInfo.company_logo ? (
                            <div className="w-full aspect-square bg-muted flex items-center justify-center">
                              <img 
                                src={companyInfo.company_logo} 
                                alt="logo" 
                                className="w-3/4 h-3/4 object-contain opacity-40"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="w-full aspect-square bg-red-50 flex items-center justify-center">
                              <Plus className="w-10 h-10 text-primary/40" />
                            </div>
                          )}
                          {/* شارات أسفل الصورة */}
                          <div className="absolute bottom-2 start-2 end-2 flex items-center justify-between">
                            <Badge variant="outline" className="bg-white/90 text-[10px] px-1.5 font-bold">
                              {available}
                            </Badge>
                            {hasAppliedGift && (
                              <span className="flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 shadow-lg">
                                <Gift className="w-4 h-4 text-white" />
                                <span className="text-white text-xs font-bold">{totalGiftBoxes > 0 ? totalGiftBoxes : totalGiftPieces}</span>
                              </span>
                            )}
                            {inCart && (
                              <Badge variant="default" className="text-sm px-2.5 py-0.5 shadow-lg font-bold">
                                {totalCartQuantity}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* السعر أسفل الصورة */}
                        <div className={cn(
                          "px-2 py-2 border-t",
                          hasAppliedGift
                            ? 'bg-green-50 border-green-100'
                            : 'bg-red-50 border-red-100'
                        )}>
                          <ProductPriceBadge product={product} boxPrice={price} totalQuantity={totalCartQuantity} giftBoxes={totalGiftBoxes} giftPieces={totalGiftPieces} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Cart / Selected Items */}
              {orderItems.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">{t('orders.cart')}</Label>
                    <Badge variant="secondary" className="text-xs">
                      <Package className="w-3 h-3 ms-1" />
                      {orderTotals.totalItems} {t('common.piece')}
                    </Badge>
                  </div>
                  <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                    {orderItems.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm truncate block">
                            {getProductName(item.productId)}
                            {item.giftQuantity && item.giftQuantity > 0 && (
                              <Badge variant="outline" className="ms-1 text-[10px] px-1 py-0 border-green-500 text-green-600">
                                <Gift className="w-3 h-3 ms-0.5" />
                                {t('common.free')} {item.giftQuantity} {t('offers.unit_box')}
                              </Badge>
                            )}
                            {(!item.giftQuantity || item.giftQuantity === 0) && item.giftPieces && item.giftPieces > 0 && (
                              <Badge variant="outline" className="ms-1 text-[10px] px-1 py-0 border-green-500 text-green-600">
                                <Gift className="w-3 h-3 ms-0.5" />
                                {t('common.free')} {item.giftPieces} {t('offers.unit_piece')}
                              </Badge>
                            )}
                          </span>
                          {item.offerNote && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5">
                              {item.offerNote}
                            </span>
                          )}
                          {item.unitPrice > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {item.unitPrice.toLocaleString()} {t('common.currency')} × {item.quantity - (item.giftQuantity || 0)} = {item.totalPrice.toLocaleString()} {t('common.currency')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEditItem(item)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                            {item.quantity}
                          </span>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleRemoveProduct(item.productId)}>
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Summary */}
                    <div className="pt-3 mt-3 border-t border-border/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('products.total')}:</span>
                        <span className="font-medium">{orderItems.length} {t('products.title')}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('common.quantity')}:</span>
                        <span className="font-medium">{orderTotals.totalItems} {t('common.piece')}</span>
                      </div>
                      {orderTotals.subtotal > 0 && (
                        <>
                          <div className="flex items-center justify-between text-sm mt-1">
                            <span className="text-muted-foreground">{t('orders.subtotal')}:</span>
                            <span className="font-medium">{orderTotals.subtotal.toLocaleString()} {t('common.currency')}</span>
                          </div>
                          {orderTotals.stampAmount > 0 && (
                            <div className="flex items-center justify-between text-sm text-amber-600 dark:text-amber-400">
                              <span className="flex items-center gap-1">
                                <Stamp className="w-3 h-3" />
                                {t('orders.stamp_tax')}:
                              </span>
                              <span className="font-medium">{orderTotals.stampAmount.toLocaleString('ar-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('common.currency')}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-base font-bold mt-2 pt-2 border-t border-border/50">
                            <span>{t('orders.grand_total')}:</span>
                            <span className="text-primary">{orderTotals.totalAmount.toLocaleString('ar-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('common.currency')}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Notes */}
              <section className="space-y-2">
                <Label>{t('common.notes')} ({t('common.optional')})</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('orders.add_notes')}
                  rows={2}
                />
              </section>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-background">
            <Button
              onClick={handleSave}
              className="w-full h-12 text-base"
              disabled={isSaving || !selectedCustomerId || orderItems.length === 0}
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 ms-2 animate-spin" />
              ) : (
                <Truck className="w-5 h-5 ms-2" />
              )}
              {t('stock.confirm_sale')}
              {orderTotals.totalAmount > 0 ? (
                <Badge variant="secondary" className="mr-2 bg-primary-foreground/20">
                  {orderTotals.totalAmount.toLocaleString()} {t('common.currency')}
                </Badge>
              ) : orderItems.length > 0 ? (
                <Badge variant="secondary" className="mr-2 bg-primary-foreground/20">
                  {orderTotals.totalItems}
                </Badge>
              ) : null}
            </Button>
          </div>
    </>
  );

  return (
    <>
      {embedded ? (
        <div className="flex flex-col flex-1 min-h-0" dir={dir}>
          {content}
        </div>
      ) : (
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden" dir={dir}>
            {content}
          </DialogContent>
        </Dialog>
      )}

      {/* Quantity Dialog */}
      <ProductQuantityDialog
        open={showQuantityDialog}
        onOpenChange={(openState) => {
          setShowQuantityDialog(openState);
          if (!openState) {
            setEditingProductMode(false);
            setEditingTargetProductId(null);
            setEditingInitialGiftOfferId(undefined);
          }
        }}
        product={selectedProduct}
        onConfirm={editingProductMode ? handleEditProductWithQuantity : handleAddProductWithQuantity}
        unitPrice={selectedProduct ? getProductPrice(selectedProduct) : 0}
        unitPiecePrice={selectedProduct ? (getProductPrice(selectedProduct) / (selectedProduct.pieces_per_box || 1)) : 0}
        mode={editingProductMode ? 'edit' : 'add'}
        initialQuantity={editingProductMode ? editingInitialQuantity : 1}
        initialGiftPieces={editingProductMode ? editingInitialGiftPieces : 0}
        initialGiftOfferId={editingProductMode ? editingInitialGiftOfferId : undefined}
        initialOfferApplied={editingProductMode ? editingInitialOfferApplied : false}
        initialIsUnitSale={editingProductMode ? editingInitialIsUnitSale : false}
        initialCustomUnitPrice={editingProductMode ? editingInitialCustomUnitPrice : undefined}
      />

      {/* Payment Dialog */}
      <DeliveryPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        orderTotal={orderTotals.totalAmount}
        customerName={selectedCustomer?.name || ''}
        frozenPaymentType={frozenPaymentType}
        frozenInvoiceMethod={frozenInvoiceMethod}
        onConfirm={handlePaymentConfirm}
      />

      {/* Stock Overflow Dialog */}
      <StockOverflowDialog
        open={showOverflowDialog}
        onOpenChange={setShowOverflowDialog}
        product={overflowData?.product || null}
        requestedQuantity={overflowData?.requestedQuantity || 0}
        availableQuantity={overflowData?.availableQuantity || 0}
        originalGift={overflowData?.originalGift || null}
        deliveredGift={overflowData?.deliveredGift || null}
        onConfirm={handleOverflowConfirm}
        calculateGiftForQuantity={calcGiftForQty}
      />

      {/* Receipt Dialog */}
      {receiptData && (
        <ReceiptDialog
          open={showReceiptDialog}
          onOpenChange={setShowReceiptDialog}
          receiptData={receiptData}
        />
      )}

      {/* Add Customer Dialog */}
      <AddCustomerDialog
        open={showAddCustomerDialog}
        onOpenChange={setShowAddCustomerDialog}
        onSuccess={(newCustomer) => {
          setCustomers(prev => [...prev, newCustomer]);
          setSelectedCustomerId(newCustomer.id);
          setShowAddCustomerDialog(false);
        }}
      />
    </>
  );
};

export default DirectSaleDialog;
