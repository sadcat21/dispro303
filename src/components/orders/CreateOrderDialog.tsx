import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CustomerSummary from '@/components/customers/CustomerSummary';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { addDays, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import CustomerPickerDialog from './CustomerPickerDialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  ShoppingCart, Plus, Loader2, User,
  Receipt, ReceiptText, UserPlus, Edit2, XCircle, Package, Check, ChevronsUpDown, Stamp,
  AlertTriangle, Gift, Banknote
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateOrder, useMyOrders } from '@/hooks/useOrders';
import { useTrackVisit } from '@/hooks/useVisitTracking';
import { Customer, Product, PaymentType, PriceSubType, Sector } from '@/types/database';
import { InvoicePaymentMethod, INVOICE_PAYMENT_METHODS } from '@/types/stamp';
import { useActiveStampTiers, calculateStampAmount } from '@/hooks/useStampTiers';
import ProductQuantityDialog, { PerItemPricing } from './ProductQuantityDialog';
import AssignWorkerAfterSaveDialog from './AssignWorkerAfterSaveDialog';
import AddCustomerDialog from '@/components/promo/AddCustomerDialog';
import CustomerDistanceIndicator from './CustomerDistanceIndicator';
import EditCustomerDialog from './EditCustomerDialog';
import CustomerRecentOrders from './CustomerRecentOrders';
import InvoicePaymentMethodSelect from './InvoicePaymentMethodSelect';
import ProductPriceBadge from './ProductPriceBadge';
import { useCompanyInfo } from '@/hooks/useCompanyInfo';
import { useProductOffers } from '@/hooks/useProductOffers';
import { cn } from '@/lib/utils';
import { loadSmsSettings, buildSmsFromTemplate, openSmsApp } from '@/components/settings/SmsSettingsCard';
import { sendSmsDirectly } from '@/utils/smsHelper';

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCustomerId?: string;
  embedded?: boolean;
  hideHeader?: boolean;
}

interface OrderItemWithPrice {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customUnitPrice?: number;
  giftQuantity?: number;
  giftPieces?: number;
  giftOfferId?: string;
  isUnitSale?: boolean;
  itemPaymentType?: string;
  itemInvoicePaymentMethod?: string | null;
  itemPriceSubType?: string;
  pricingUnit?: string;
  weightPerBox?: number | null;
  piecesPerBox?: number;
}

const CreateOrderDialog: React.FC<CreateOrderDialogProps> = ({
  open,
  onOpenChange,
  initialCustomerId,
  embedded = false,
  hideHeader = false,
}) => {
  const { workerId, activeBranch } = useAuth();
  const { t, dir, language } = useLanguage();
  const { companyInfo } = useCompanyInfo();
  const createOrder = useCreateOrder();
  const { trackVisit } = useTrackVisit();
  const { data: orders } = useMyOrders();
  const { data: stampTiers } = useActiveStampTiers();
  const { activeOffers } = useProductOffers();

  // Data states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [shortageProductIds, setShortageProductIds] = useState<Set<string>>(new Set());
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [offerProductIds, setOfferProductIds] = useState<Set<string>>(new Set());
  const [warehouseStockProductIds, setWarehouseStockProductIds] = useState<Set<string>>(new Set());

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState<OrderItemWithPrice[]>([]);
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('with_invoice');
  const [priceSubType, setPriceSubType] = useState<PriceSubType>('gros');
  const [prepaidAmount, setPrepaidAmount] = useState('');
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState<InvoicePaymentMethod | null>(null);
  const [selectedDeliveryWorker, setSelectedDeliveryWorker] = useState('');
  const [showAssignWorkerDialog, setShowAssignWorkerDialog] = useState(false);
  const [savedOrderId, setSavedOrderId] = useState('');
  const [savedCustomerBranchId, setSavedCustomerBranchId] = useState<string | null>(null);
  const [savedDefaultDeliveryWorkerId, setSavedDefaultDeliveryWorkerId] = useState<string | null>(null);

  // Search and dialogs
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [showEditCustomerDialog, setShowEditCustomerDialog] = useState(false);
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProductMode, setEditingProductMode] = useState(false);
  const [editingInitialQuantity, setEditingInitialQuantity] = useState(1);
  const [editingCustomUnitPrice, setEditingCustomUnitPrice] = useState<number | undefined>(undefined);

  // Derived data
  const selectedCustomer = useMemo(() =>
    customers.find(c => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );


  useEffect(() => {
    if (open && workerId) {
      fetchData();
    }
    if (open && initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
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

      // Auto-suggest delivery date based on sector's visit_day_delivery
      if (selectedCustomer.sector_id) {
        const sector = sectors.find(s => s.id === selectedCustomer.sector_id);
        if (sector?.visit_day_delivery) {
          const dayMap: Record<string, number> = {
            sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
            thursday: 4, friday: 5, saturday: 6,
          };
          const targetDayIndex = dayMap[sector.visit_day_delivery.toLowerCase()];
          if (targetDayIndex !== undefined) {
            const today = new Date();
            const todayDayIndex = today.getDay();
            let daysAhead = targetDayIndex - todayDayIndex;
            if (daysAhead < 0) daysAhead += 7;
            // If today is the delivery day, suggest today (daysAhead = 0)
            const suggestedDate = addDays(today, daysAhead);
            setDeliveryDate(format(suggestedDate, 'yyyy-MM-dd'));
          }
        }
      }
    }
  }, [selectedCustomer, sectors]);

  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      let customersQuery = supabase.from('customers').select('*').eq('status', 'active').order('name');

      if (activeBranch) {
        customersQuery = customersQuery.or(`branch_id.eq.${activeBranch.id},branch_id.is.null`);
      }

      let sectorsQuery = supabase.from('sectors').select('*').order('name');
      if (activeBranch) {
        sectorsQuery = sectorsQuery.eq('branch_id', activeBranch.id);
      }

      let shortageQuery = supabase
        .from('product_shortage_tracking')
        .select('product_id')
        .eq('status', 'pending');
      if (activeBranch) {
        shortageQuery = shortageQuery.eq('branch_id', activeBranch.id);
      }

      const today = new Date().toISOString().split('T')[0];

      // Build warehouse stock query (مخزون المستودع)
      let warehouseStockQuery = supabase
        .from('warehouse_stock')
        .select('product_id, quantity')
        .gt('quantity', 0);
      if (activeBranch) {
        warehouseStockQuery = warehouseStockQuery.eq('branch_id', activeBranch.id);
      }

      const [customersRes, productsRes, shortageRes, offersRes, warehouseStockRes, sectorsRes] = await Promise.all([
        customersQuery,
        supabase.from('products').select('*').eq('is_active', true).order('sort_order', { ascending: true }).order('name'),
        shortageQuery,
        supabase.from('product_offers').select('product_id')
          .eq('is_active', true)
          .or(`start_date.is.null,start_date.lte.${today}`)
          .or(`end_date.is.null,end_date.gte.${today}`),
        warehouseStockQuery,
        sectorsQuery,
      ]);

      if (customersRes.error) throw customersRes.error;
      if (productsRes.error) throw productsRes.error;

      setCustomers(customersRes.data || []);
      setProducts(productsRes.data || []);
      setSectors((sectorsRes.data || []) as Sector[]);
      setShortageProductIds(new Set((shortageRes.data || []).map(s => s.product_id)));
      setOfferProductIds(new Set((offersRes.data || []).map(o => o.product_id)));
      setWarehouseStockProductIds(new Set((warehouseStockRes.data || []).map(s => s.product_id)));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t('orders.fetch_error'));
    } finally {
      setIsLoadingData(false);
    }
  };

  const resetForm = useCallback(() => {
    setSelectedCustomerId('');
    setOrderItems([]);
    setNotes('');
    setDeliveryDate('');
    setDeliveryTime('');
    setPrepaidAmount('');
    setPaymentType('with_invoice');
    setPriceSubType('gros');
    setInvoicePaymentMethod(null);
    setSelectedDeliveryWorker('');
    setCustomerDropdownOpen(false);
  }, []);

  const handleClose = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  }, [onOpenChange, resetForm]);

  // Product handlers
  const handleProductClick = (product: Product) => {
    if (shortageProductIds.has(product.id) || !warehouseStockProductIds.has(product.id)) {
      toast.warning(t('stock.product_unavailable_warning'), { duration: 5000 });
    }
    // Check if product already in cart - open in edit mode
    const existingItem = orderItems.find(item => item.productId === product.id && !item.isUnitSale);
    if (existingItem) {
      setEditingProductMode(true);
      const existingPaidQuantity = Math.max(1, existingItem.quantity - (existingItem.giftQuantity || 0));
      setEditingInitialQuantity(existingPaidQuantity);
      setEditingCustomUnitPrice(existingItem.customUnitPrice);
    } else {
      setEditingProductMode(false);
      setEditingInitialQuantity(1);
      setEditingCustomUnitPrice(undefined);
    }
    setSelectedProduct(product);
    setShowQuantityDialog(true);
  };

  const getProductPrice = (product: Product, pt?: PaymentType, pst?: PriceSubType): number => {
    const currentPaymentType = pt || paymentType;
    const currentPriceSubType = pst || priceSubType;

    let basePrice = 0;
    if (currentPaymentType === 'with_invoice') {
      basePrice = product.price_invoice || 0;
    } else {
      switch (currentPriceSubType) {
        case 'super_gros': basePrice = product.price_super_gros || product.price_no_invoice || 0; break;
        case 'gros': basePrice = product.price_gros || product.price_no_invoice || 0; break;
        case 'retail': basePrice = product.price_retail || product.price_no_invoice || 0; break;
        default: basePrice = product.price_gros || product.price_no_invoice || 0;
      }
    }

    // If pricing is per kg, multiply by weight_per_box to get box price
    if (product.pricing_unit === 'kg' && product.weight_per_box) {
      return basePrice * product.weight_per_box;
    }
    // If pricing is per unit, multiply by pieces_per_box to get box price
    if (product.pricing_unit === 'unit' && product.pieces_per_box > 1) {
      return basePrice * product.pieces_per_box;
    }
    return basePrice;
  };

  const resolveCustomSalePrice = (product: Product, baseUnitPrice: number, unitSale: boolean): number => {
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
  };

  const handleAddProductWithQuantity = (productId: string, quantity: number, giftInfo?: { giftQuantity: number; giftPieces: number; offerId?: string }, isUnitSale?: boolean, perItemPricing?: PerItemPricing) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Use per-item pricing if provided, otherwise use order-level defaults
    const effectivePaymentType = perItemPricing?.paymentType || paymentType;
    const effectivePriceSubType = perItemPricing?.priceSubType || priceSubType;
    const customUnitPrice = perItemPricing?.customUnitPrice;
    const customSalePrice = customUnitPrice !== undefined ? resolveCustomSalePrice(product, customUnitPrice, !!isUnitSale) : undefined;

    if (isUnitSale) {
      const boxPrice = getProductPrice(product, effectivePaymentType, effectivePriceSubType);
      const basePiecePrice = product.pieces_per_box > 0 ? boxPrice / product.pieces_per_box : boxPrice;
      const piecePrice = customSalePrice ?? basePiecePrice;
      const totalPrice = piecePrice * quantity;

      setOrderItems(prev => {
        return [...prev, {
          productId,
          quantity,
          unitPrice: piecePrice,
          totalPrice,
          customUnitPrice: customUnitPrice,
          isUnitSale: true,
          itemPaymentType: perItemPricing?.paymentType || paymentType,
          itemInvoicePaymentMethod: perItemPricing?.invoicePaymentMethod,
          itemPriceSubType: perItemPricing?.priceSubType || priceSubType,
          pricingUnit: product.pricing_unit || 'box',
          weightPerBox: product.weight_per_box,
          piecesPerBox: product.pieces_per_box,
        }];
      });
      setEditingProductMode(false);
      return;
    }

    const unitPrice = customSalePrice ?? getProductPrice(product, effectivePaymentType, effectivePriceSubType);
    const giftQuantity = giftInfo?.giftQuantity || 0;
    const paidQuantity = quantity - giftQuantity;

    const newItem = {
      productId,
      quantity,
      unitPrice,
      totalPrice: paidQuantity * unitPrice,
      customUnitPrice: customUnitPrice,
      giftQuantity: giftQuantity || undefined,
      giftPieces: giftInfo?.giftPieces || undefined,
      giftOfferId: giftInfo?.offerId,
      itemPaymentType: perItemPricing?.paymentType || paymentType,
      itemInvoicePaymentMethod: perItemPricing?.invoicePaymentMethod,
      itemPriceSubType: perItemPricing?.priceSubType || priceSubType,
      pricingUnit: product.pricing_unit || 'box',
      weightPerBox: product.weight_per_box,
      piecesPerBox: product.pieces_per_box,
    };

    if (editingProductMode) {
      // Replace existing item
      setOrderItems(prev => {
        const idx = prev.findIndex(item => item.productId === productId && !item.isUnitSale);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = newItem;
          return updated;
        }
        return [...prev, newItem];
      });
    } else {
      setOrderItems(prev => {
        const existing = prev.find(item => item.productId === productId && !item.isUnitSale && !item.itemPaymentType && !item.customUnitPrice && !perItemPricing);
        if (existing && !perItemPricing) {
          const newQuantity = existing.quantity + quantity;
          const newGiftBoxes = (existing.giftQuantity || 0) + giftQuantity;
          const newGiftPieces = (existing.giftPieces || 0) + (giftInfo?.giftPieces || 0);
          const newPaid = newQuantity - newGiftBoxes;
          return prev.map(item =>
            item === existing
              ? { ...item, quantity: newQuantity, totalPrice: newPaid * unitPrice, giftQuantity: newGiftBoxes, giftPieces: newGiftPieces || undefined, giftOfferId: giftInfo?.offerId || existing.giftOfferId }
              : item
          );
        }
        return [...prev, newItem];
      });
    }
    setEditingProductMode(false);
  };

  const recalcGiftPieces = useCallback((productId: string, paidQty: number, piecesPerBox: number): number => {
    const offersForProduct = activeOffers.filter((offer) => offer.product_id === productId);
    if (offersForProduct.length === 0 || paidQty <= 0) return 0;

    let totalGiftPieces = 0;
    const safePiecesPerBox = piecesPerBox > 0 ? piecesPerBox : 1;

    for (const offer of offersForProduct) {
      const tiers = offer.tiers && offer.tiers.length > 0 ? offer.tiers : null;

      if (tiers) {
        if (offer.condition_type === 'multiplier') {
          const sortedTiers = [...tiers].sort((a, b) => b.min_quantity - a.min_quantity);
          let remaining = paidQty;

          for (const tier of sortedTiers) {
            if (remaining < tier.min_quantity) continue;
            const timesApplied = Math.floor(remaining / tier.min_quantity);
            remaining = remaining % tier.min_quantity;
            const giftUnit = tier.gift_quantity_unit || 'piece';
            const giftAmount = timesApplied * tier.gift_quantity;
            totalGiftPieces += giftUnit === 'box' ? giftAmount * safePiecesPerBox : giftAmount;
          }
        } else {
          for (const tier of [...tiers].sort((a, b) => b.min_quantity - a.min_quantity)) {
            if (paidQty >= tier.min_quantity && (tier.max_quantity === null || paidQty <= tier.max_quantity)) {
              const giftUnit = tier.gift_quantity_unit || 'piece';
              totalGiftPieces += giftUnit === 'box' ? tier.gift_quantity * safePiecesPerBox : tier.gift_quantity;
              break;
            }
          }
        }
      } else {
        if (paidQty < offer.min_quantity) continue;

        const timesApplied = offer.condition_type === 'multiplier'
          ? Math.floor(paidQty / offer.min_quantity)
          : 1;

        const offerGift = offer.gift_quantity || 0;
        totalGiftPieces += offer.gift_quantity_unit === 'box'
          ? timesApplied * offerGift * safePiecesPerBox
          : timesApplied * offerGift;
      }
    }

    return totalGiftPieces;
  }, [activeOffers]);

  const handleRemoveProduct = (productId: string) => {
    setOrderItems(prev => prev.filter(item => item.productId !== productId));
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || '';
  };

  // Recalculate prices when payment type changes
  useEffect(() => {
    if (orderItems.length > 0) {
      setOrderItems(prev => prev.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const effectivePaymentType = (item.itemPaymentType as PaymentType | undefined) || paymentType;
          const effectivePriceSubType = (item.itemPriceSubType as PriceSubType | undefined) || priceSubType;
          const baseBoxPrice = getProductPrice(product, effectivePaymentType, effectivePriceSubType);
          const basePiecePrice = product.pieces_per_box > 0 ? baseBoxPrice / product.pieces_per_box : baseBoxPrice;
          const fallbackUnitPrice = item.isUnitSale ? basePiecePrice : baseBoxPrice;
          const unitPrice = item.customUnitPrice !== undefined
            ? resolveCustomSalePrice(product, item.customUnitPrice, !!item.isUnitSale)
            : fallbackUnitPrice;
          const paidQty = item.quantity - (item.giftQuantity || 0);
          const totalPrice = item.isUnitSale ? unitPrice * item.quantity : paidQty * unitPrice;
          return { ...item, unitPrice, totalPrice };
        }
        return item;
      }));
    }
  }, [paymentType, priceSubType, products]);

  // Calculate totals including stamp price for invoice payments when cash method is selected
  const orderTotals = useMemo(() => {
    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalGiftBoxes = orderItems.reduce((sum, item) => sum + (item.giftQuantity || 0), 0);
    const totalPaidItems = totalItems - totalGiftBoxes;
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

    // Calculate stamp amount only for invoice payments with cash method
    let stampAmount = 0;
    const shouldApplyStamp = paymentType === 'with_invoice' && invoicePaymentMethod === 'cash';

    if (shouldApplyStamp && stampTiers && stampTiers.length > 0) {
      stampAmount = calculateStampAmount(subtotal, stampTiers);
    }

    const totalAmount = subtotal + stampAmount;
    return { totalItems, totalGiftBoxes, totalPaidItems, subtotal, stampAmount, totalAmount };
  }, [orderItems, paymentType, invoicePaymentMethod, stampTiers]);

  // Customer handlers
  const handleNewCustomerAdded = (newCustomer: Customer) => {
    setCustomers(prev => [...prev, newCustomer]);
    setSelectedCustomerId(newCustomer.id);
    setShowAddCustomerDialog(false);
    setCustomerDropdownOpen(false);
  };

  const handleCustomerUpdated = (updatedCustomer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    setShowEditCustomerDialog(false);
  };

  // Submit handler
  const handleCreateOrder = async () => {
    if (!selectedCustomerId) {
      toast.error(t('orders.select_customer_error'));
      return;
    }
    if (orderItems.length === 0) {
      toast.error(t('orders.add_products_error'));
      return;
    }
    if (paymentType === 'with_invoice' && !invoicePaymentMethod) {
      toast.error(t('orders.select_payment_error'));
      return;
    }

    try {
      // Don't auto-assign worker at creation - let the AssignWorkerAfterSaveDialog handle it
      const defaultWorkerId = selectedCustomer?.default_delivery_worker_id || undefined;

      const order = await createOrder.mutateAsync({
        customerId: selectedCustomerId,
        items: orderItems,
        notes: notes || undefined,
        deliveryDate: deliveryDate ? (deliveryTime ? `${deliveryDate}T${deliveryTime}` : deliveryDate) : undefined,
        paymentType,
        invoicePaymentMethod: paymentType === 'with_invoice' ? invoicePaymentMethod : undefined,
        totalAmount: orderTotals.totalAmount > 0 ? orderTotals.totalAmount : undefined,
        prepaidAmount: Number(prepaidAmount) || 0,
      });

      toast.success(t('orders.created_success'));

      // SMS notification for order creation
      void (async () => {
        try {
          const smsConfig = await loadSmsSettings(activeBranch?.id);
          const opConfig = smsConfig.order_create;
          if (!opConfig.enabled || opConfig.mode === 'disabled') return;
          const customerPhone = selectedCustomer?.phone;
          if (!customerPhone) return;

          const message = buildSmsFromTemplate(opConfig.template, {
            customer: selectedCustomer?.store_name || selectedCustomer?.name || '',
            total: orderTotals.totalAmount.toLocaleString(),
            order_id: order.id.slice(0, 8),
            company: companyInfo?.company_name || '',
            amount: orderTotals.totalAmount.toLocaleString(),
            remaining: '0',
            payment_status: paymentType === 'with_invoice' ? 'بفاتورة' : 'نقدي',
          });

          if (opConfig.mode === 'automatic') {
            const sent = await sendSmsDirectly(customerPhone, message);
            if (sent) toast.success('تم إرسال رسالة تأكيد الطلبية للعميل');
          } else if (opConfig.mode === 'semi_automatic') {
            openSmsApp(customerPhone, message);
          }
        } catch (smsErr) {
          console.error('[SMS] order_create error:', smsErr);
        }
      })();

      // Track visit GPS
      trackVisit({ customerId: selectedCustomerId, operationType: 'order', operationId: order.id });

      // Save info for assign dialog and close create dialog
      const branchId = selectedCustomer?.branch_id || activeBranch?.id || null;
      setSavedOrderId(order.id);
      setSavedCustomerBranchId(branchId);
      setSavedDefaultDeliveryWorkerId(defaultWorkerId || null);
      handleClose(false);

      // Always show assign worker dialog (with pre-selection if default exists)
      setShowAssignWorkerDialog(true);
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden" dir={dir}>
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {t('orders.create_new')}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-8rem)]">
            <div className="px-4">
            <div className="py-4 space-y-5">
              {/* Customer Section */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">{t('orders.customer')}</Label>
                </div>

                {/* Customer Selection Button - opens dialog */}
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
                        sector_name: selectedCustomer.sector_id ? sectors.find(s => s.id === selectedCustomer.sector_id)?.name : undefined,
                      }}
                      compact
                      hideBadges
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
                  <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                    <CustomerSummary
                      customer={{
                        name: selectedCustomer.name,
                        store_name: selectedCustomer.store_name,
                        customer_type: selectedCustomer.customer_type,
                        sector_name: selectedCustomer.sector_id ? sectors.find(s => s.id === selectedCustomer.sector_id)?.name : undefined,
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
                      rightSlot={(
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setShowEditCustomerDialog(true)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                    />

                    <CustomerDistanceIndicator
                      customerLatitude={selectedCustomer.latitude}
                      customerLongitude={selectedCustomer.longitude}
                    />

                    {orders && orders.length > 0 && (
                      <CustomerRecentOrders
                        customerId={selectedCustomerId}
                        orders={orders}
                        maxOrders={5}
                      />
                    )}
                  </div>
                )}
              </section>

              {/* Payment Type */}
              <section className="space-y-3">
                <Label className="text-base font-semibold">{t('orders.purchase_method')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={paymentType === 'with_invoice' ? 'default' : 'outline'}
                    className={`h-16 flex flex-col gap-1.5 ${paymentType === 'with_invoice' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'border-blue-300 text-blue-700 hover:bg-blue-50'}`}
                    onClick={() => setPaymentType('with_invoice')}
                  >
                    <Receipt className="w-5 h-5" />
                    <span className="text-sm">{t('orders.with_invoice')}</span>
                  </Button>
                  <Button
                    type="button"
                    variant={paymentType === 'without_invoice' ? 'default' : 'outline'}
                    className={`h-16 flex flex-col gap-1.5 ${paymentType === 'without_invoice' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}
                    onClick={() => setPaymentType('without_invoice')}
                  >
                    <ReceiptText className="w-5 h-5" />
                    <span className="text-sm">{t('orders.without_invoice')}</span>
                  </Button>
                </div>

                {/* Price Sub-Type Selection for without invoice */}
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

                {/* Invoice Payment Method Selection */}
                {paymentType === 'with_invoice' && (
                  <InvoicePaymentMethodSelect
                    value={invoicePaymentMethod}
                    onChange={setInvoicePaymentMethod}
                  />
                )}
              </section>

              {/* Products */}
              <section className="space-y-3">
                <Label className="text-base font-semibold">{t('products.title')}</Label>
                <div className="grid grid-cols-2 gap-3 p-1">
                  {products.map((product) => {
                    const productCartItems = orderItems.filter(item => item.productId === product.id);
                    const inCart = productCartItems.find(item => !item.isUnitSale) || productCartItems[0];
                    const totalCartQuantity = productCartItems.reduce((sum, item) => sum + item.quantity, 0);
                    const totalGiftBoxes = productCartItems.reduce((sum, item) => sum + (item.giftQuantity || 0), 0);
                    const totalGiftPieces = productCartItems.reduce((sum, item) => sum + (item.giftPieces || 0), 0);
                    const hasAppliedGift = totalGiftBoxes > 0 || totalGiftPieces > 0;
                    const price = getProductPrice(product);
                    const isShortage = shortageProductIds.has(product.id);
                    const isNotInStock = !warehouseStockProductIds.has(product.id);
                    const hasOffer = offerProductIds.has(product.id);
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
                            : inCart ? 'border-primary ring-2 ring-primary/40' : 'border-red-200 hover:border-primary/60 hover:shadow-xl',
                          (isShortage || isNotInStock) && !inCart && "border-orange-400/60",
                          hasOffer && !isShortage && !isNotInStock && !inCart && "border-green-500/50"
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
                            {hasOffer ? (
                              <span className="flex items-center gap-1 rounded-full bg-green-500 px-2 py-1 shadow-lg">
                                <Gift className="w-4 h-4 text-white" />
                                {hasAppliedGift && (
                                  <span className="text-white text-xs font-bold">{totalGiftBoxes > 0 ? totalGiftBoxes : totalGiftPieces}</span>
                                )}
                              </span>
                            ) : <span />}
                            {(isShortage || isNotInStock) && (
                              <span className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
                                <AlertTriangle className="w-4 h-4 text-white" />
                              </span>
                            )}
                            {inCart ? (
                              <Badge variant="default" className="text-sm px-2.5 py-0.5 shadow-lg font-bold">
                                {totalCartQuantity}
                              </Badge>
                            ) : <span />}
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

              {/* Selected Items with Order Summary */}
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
                    {orderItems.map((item, idx) => (
                      <div key={`${item.productId}-${item.isUnitSale ? 'unit' : 'box'}-${idx}`} className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm truncate block">
                            {getProductName(item.productId)}
                            {item.isUnitSale && (
                              <Badge variant="outline" className="ms-1 text-[10px] px-1 py-0">
                                {t('offers.unit_piece')}
                              </Badge>
                            )}
                            {!item.isUnitSale && ((item.giftQuantity && item.giftQuantity > 0) || (item.giftPieces && item.giftPieces > 0)) && (
                              <Badge variant="outline" className="ms-1 text-[10px] px-1 py-0 border-green-500 text-green-600">
                                <Gift className="w-3 h-3 ms-0.5" />
                                {item.giftQuantity && item.giftQuantity > 0 ? `${item.giftQuantity} ${t('offers.unit_box')}` : ''}
                                {item.giftQuantity && item.giftQuantity > 0 && item.giftPieces && (item.giftPieces % (products.find(p => p.id === item.productId)?.pieces_per_box || 1)) > 0 ? ' + ' : ''}
                                {item.giftPieces && (item.giftPieces % (products.find(p => p.id === item.productId)?.pieces_per_box || 1)) > 0 ? `${item.giftPieces % (products.find(p => p.id === item.productId)?.pieces_per_box || 1)} ${t('offers.unit_piece')}` : ''}
                                {' '}{t('common.free')}
                              </Badge>
                            )}
                          </span>
                          {item.unitPrice > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {item.unitPrice.toLocaleString()} دج × {item.isUnitSale ? item.quantity : (item.quantity - (item.giftQuantity || 0))} = {item.totalPrice.toLocaleString()} دج
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                            {item.isUnitSale ? item.quantity : Math.max(0, item.quantity - (item.giftQuantity || 0))}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveProduct(item.productId)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Order Summary */}
                    <div className="pt-3 mt-3 border-t border-border/50 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('products.total')}:</span>
                        <span className="font-medium">{orderItems.length} {t('products.title')}</span>
                      </div>

                      {/* Paid quantity */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{t('common.quantity')}:</span>
                        <span className="font-medium">{orderTotals.totalPaidItems} {orderTotals.totalPaidItems > 1 ? t('common.boxes') : t('common.box')}</span>
                      </div>
                      {orderTotals.subtotal > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t('orders.subtotal')}:</span>
                          <span className="font-medium">{orderTotals.subtotal.toLocaleString()} {t('common.currency')}</span>
                        </div>
                      )}

                      {/* Gift quantity */}
                      {orderTotals.totalGiftBoxes > 0 && (
                        <div className="mt-2 pt-2 border-t border-green-300/50 dark:border-green-700/50">
                          <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                            <span className="flex items-center gap-1">
                              <Gift className="w-3 h-3" />
                              {t('offers.gift')}:
                            </span>
                            <span className="font-medium">{orderTotals.totalGiftBoxes} {orderTotals.totalGiftBoxes > 1 ? t('common.boxes') : t('common.box')}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-green-600 dark:text-green-400">
                            <span className="text-xs">{t('orders.subtotal')}:</span>
                            <span className="font-medium">0 {t('common.currency')}</span>
                          </div>
                        </div>
                      )}

                      {/* Grand totals */}
                      {orderTotals.subtotal > 0 && (
                        <>
                          {orderTotals.totalGiftBoxes > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{t('orders.total_boxes')}:</span>
                                <span className="font-medium">{orderTotals.totalItems} {orderTotals.totalItems > 1 ? t('common.boxes') : t('common.box')}</span>
                              </div>
                            </div>
                          )}
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

              {/* Delivery Worker - removed, now shown after save */}

              {/* Prepaid Amount Toggle - moved above delivery date */}
              <section className="space-y-2">
                <Button
                  type="button"
                  variant={Number(prepaidAmount) > 0 ? 'default' : 'outline'}
                  className={`w-full h-12 text-sm font-bold gap-2 ${
                    Number(prepaidAmount) > 0
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/50'
                      : 'border-dashed border-2'
                  }`}
                  onClick={() => {
                    if (Number(prepaidAmount) > 0) {
                      setPrepaidAmount('');
                    } else {
                      setPrepaidAmount('1');
                    }
                  }}
                >
                  <Banknote className="w-5 h-5" />
                  {Number(prepaidAmount) > 0 ? `💰 دفع مسبق: ${Number(prepaidAmount).toLocaleString()} ${t('common.currency')}` : '💰 إضافة دفع مسبق (عربون)'}
                </Button>
                {Number(prepaidAmount) > 0 && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 space-y-2">
                    <Label className="text-emerald-700 dark:text-emerald-400 font-semibold text-sm">مبلغ الدفع المسبق</Label>
                    <Input
                      type="number"
                      value={prepaidAmount}
                      onChange={(e) => setPrepaidAmount(e.target.value)}
                      placeholder="0"
                      className="h-11 text-lg font-bold text-center"
                    />
                  </div>
                )}
              </section>

              {/* Delivery Date */}
              <section className="space-y-3">
                <Label>{t('orders.delivery_date')} ({t('common.optional')})</Label>
                
                {/* Quick select: اليوم / غداً */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={deliveryDate === format(new Date(), 'yyyy-MM-dd') ? 'default' : 'outline'}
                    onClick={() => {
                      const today = format(new Date(), 'yyyy-MM-dd');
                      setDeliveryDate(deliveryDate === today ? '' : today);
                    }}
                    className="flex-1"
                  >
                    اليوم
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={deliveryDate === format(addDays(new Date(), 1), 'yyyy-MM-dd') ? 'default' : 'outline'}
                    onClick={() => {
                      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
                      setDeliveryDate(deliveryDate === tomorrow ? '' : tomorrow);
                    }}
                    className="flex-1"
                  >
                    غداً
                  </Button>
                </div>

                {/* Week day buttons */}
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = addDays(new Date(), i);
                    const dateStr = format(d, 'yyyy-MM-dd');
                    const dayName = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][d.getDay()];
                    const isSelected = deliveryDate === dateStr;
                    return (
                      <Button
                        key={dateStr}
                        type="button"
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={() => setDeliveryDate(isSelected ? '' : dateStr)}
                        className="flex flex-col items-center h-auto py-1.5 text-xs"
                      >
                        <span className="font-bold">{dayName}</span>
                        <span className="text-[10px] opacity-80">{format(d, 'dd/MM')}</span>
                      </Button>
                    );
                  })}
                </div>

                {/* Date + Time inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">التاريخ</Label>
                    <Input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">الوقت</Label>
                    <Input
                      type="time"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                    />
                  </div>
                </div>
              </section>


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
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t bg-background">
            <Button
              onClick={handleCreateOrder}
              className="w-full h-12 text-base"
              disabled={createOrder.isPending || !selectedCustomerId || orderItems.length === 0}
            >
              {createOrder.isPending ? (
                <Loader2 className="w-5 h-5 ms-2 animate-spin" />
              ) : (
                <ShoppingCart className="w-5 h-5 ms-2" />
              )}
              {t('orders.create')}
              {orderTotals.totalAmount > 0 ? (
                <Badge variant="secondary" className="mr-2 bg-primary-foreground/20">
                  {orderTotals.totalAmount.toLocaleString()} دج
                </Badge>
              ) : orderItems.length > 0 ? (
                <Badge variant="secondary" className="mr-2 bg-primary-foreground/20">
                  {orderTotals.totalItems}
                </Badge>
              ) : null}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs */}
      <ProductQuantityDialog
        open={showQuantityDialog}
        onOpenChange={setShowQuantityDialog}
        product={selectedProduct}
        onConfirm={handleAddProductWithQuantity}
        unitPrice={selectedProduct ? getProductPrice(selectedProduct) : 0}
        unitPiecePrice={selectedProduct ? (getProductPrice(selectedProduct) / (selectedProduct.pieces_per_box || 1)) : 0}
        defaultPaymentType={paymentType}
        defaultPriceSubType={priceSubType}
        defaultInvoicePaymentMethod={invoicePaymentMethod}
        initialQuantity={editingInitialQuantity}
        initialCustomUnitPrice={editingCustomUnitPrice}
      />

      <AddCustomerDialog
        open={showAddCustomerDialog}
        onOpenChange={setShowAddCustomerDialog}
        onSuccess={handleNewCustomerAdded}
      />

      <EditCustomerDialog
        open={showEditCustomerDialog}
        onOpenChange={setShowEditCustomerDialog}
        customer={selectedCustomer || null}
        onSuccess={handleCustomerUpdated}
      />

      <AssignWorkerAfterSaveDialog
        open={showAssignWorkerDialog}
        onOpenChange={setShowAssignWorkerDialog}
        orderId={savedOrderId}
        customerBranchId={savedCustomerBranchId}
        defaultDeliveryWorkerId={savedDefaultDeliveryWorkerId}
      />
    </>
  );
};

export default CreateOrderDialog;
