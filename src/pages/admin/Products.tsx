import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Package, Loader2, Trash2, Box, Pencil, Stamp, Layers, Weight, Scale, Camera, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import StampTiersDialog from '@/components/products/StampTiersDialog';
import PricingGroupsTab from '@/components/products/PricingGroupsTab';
import GroupPriceUpdateDialog from '@/components/products/GroupPriceUpdateDialog';
import ProductInvoiceTemplateDialog from '@/components/products/ProductInvoiceTemplateDialog';

interface ProductGroup {
  id: string;
  name: string;
  products: Product[];
}

const VAT_RATE = 0.19;
const VAT_DIVISOR = 1 + VAT_RATE;

const getNetPriceBeforeVat = (grossPrice: number) => {
  if (!grossPrice || grossPrice <= 0) return 0;
  return grossPrice / VAT_DIVISOR;
};

const getGrossPriceWithVat = (officialPrice: number) => {
  if (!officialPrice || officialPrice <= 0) return 0;
  return officialPrice * VAT_DIVISOR;
};

const formatPrice = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const formatPrecisePrice = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });

const productOfficialNameLabel = '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0631\u0633\u0645\u064a';
const productAppNameLabel = '\u0627\u0633\u0645 \u0627\u0644\u0645\u0646\u062a\u062c \u0641\u064a \u0627\u0644\u062a\u0637\u0628\u064a\u0642';
const productAppNamePlaceholder = '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0630\u064a \u0633\u064a\u0638\u0647\u0631 \u062f\u0627\u062e\u0644 \u0627\u0644\u062a\u0637\u0628\u064a\u0642';
const productAppNameHelp = '\u0625\u0630\u0627 \u062a\u0631\u0643\u062a\u0647 \u0641\u0627\u0631\u063a\u064b\u0627 \u0633\u064a\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0631\u0633\u0645\u064a \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627 \u062f\u0627\u062e\u0644 \u0627\u0644\u062a\u0637\u0628\u064a\u0642.';
const invoiceOfficialPriceLabel = '\u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0631\u0633\u0645\u064a';
const invoiceWithVatLabel = '\u0633\u0639\u0631 \u0627\u0644\u0628\u064a\u0639 \u0628\u0639\u062f TVA 19%';
const invoiceWithVatHelp = '\u064a\u064f\u062d\u062a\u0633\u0628 \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627 \u0645\u0646 \u0627\u0644\u0633\u0639\u0631 \u0627\u0644\u0631\u0633\u0645\u064a:';
const allowInvoiceSaleLabel = '\u0627\u0644\u0633\u0645\u0627\u062d \u0628\u0628\u064a\u0639 \u0641\u0627\u062a\u0648\u0631\u0629 1';
const allowInvoiceSaleHelp = '\u0639\u0646\u062f \u0625\u064a\u0642\u0627\u0641\u0647 \u0644\u0646 \u064a\u0638\u0647\u0631 \u0627\u0644\u0645\u0646\u062a\u062c \u0643\u062e\u064a\u0627\u0631 \u0644\u0644\u0628\u064a\u0639 \u0628\u0641\u0627\u062a\u0648\u0631\u0629 1.';
const invoiceSaleDisabledBadge = '\u0641\u0627\u062a\u0648\u0631\u0629 1 \u0645\u0639\u0637\u0644\u0629';
const productCodeHint = '\u0633\u064a\u0638\u0647\u0631 \u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u062f \u0644\u0627\u062d\u0642\u064b\u0627 \u0641\u064a \u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631.';
const sortOrderDescription = '\u0631\u062a\u0628\u0629 \u0627\u0644\u0639\u0631\u0636 (\u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0645\u0646\u062a\u062c \u0641\u064a \u0627\u0644\u0642\u0627\u0626\u0645\u0629)';
const sortOrderHint = '\u0631\u0642\u0645 \u0623\u0635\u063a\u0631 = \u064a\u0638\u0647\u0631 \u0623\u0648\u0644\u064b\u0627 \u0641\u064a \u0627\u0644\u0642\u0627\u0626\u0645\u0629';
const productImageLabel = '\u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0646\u062a\u062c';
const chooseImageLabel = '\u0627\u062e\u062a\u0631 \u0635\u0648\u0631\u0629';
const kilogramLabel = '\u0643\u063a';
const productsTabLabel = '\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a';
const officialNamePrefix = '\u0627\u0644\u0627\u0633\u0645 \u0627\u0644\u0631\u0633\u0645\u064a:';
const piecesPerBoxSuffix = '\u0642\u0637\u0639\u0629/\u0635\u0646\u062f\u0648\u0642';
const activeProductsLabel = '\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0646\u0634\u0637\u0629';
const updatingLabel = '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u062f\u064a\u062b...';
const belongsToGroupLabel = '\u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u062a\u062c \u0636\u0645\u0646 \u0645\u062c\u0645\u0648\u0639\u0629:';
const productCountSuffix = '\u0645\u0646\u062a\u062c';
const deleteConfirmTitle = '\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u062d\u0630\u0641';
const deleteConfirmAction = '\u0625\u0644\u063a\u0627\u0621';
const buildUnsupportedColumnsMessage = (removedColumns: string[]) =>
  `\u062a\u0645 \u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644 \u0628\u062f\u0648\u0646 \u0627\u0644\u062d\u0642\u0648\u0644 \u0627\u0644\u062a\u0627\u0644\u064a\u0629 \u0644\u0623\u0646 \u0623\u0639\u0645\u062f\u062a\u0647\u0627 \u0644\u0645 \u062a\u064f\u0637\u0628\u0651\u0642 \u0628\u0639\u062f: ${removedColumns.join(', ')}`;
const buildDeleteDescription = (productName: string) =>
  `\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f \u0645\u0646 \u062d\u0630\u0641 \u0627\u0644\u0645\u0646\u062a\u062c \"${productName}\"\u061f \u0644\u0627 \u064a\u0645\u0643\u0646 \u0627\u0644\u062a\u0631\u0627\u062c\u0639 \u0639\u0646 \u0647\u0630\u0627 \u0627\u0644\u0625\u062c\u0631\u0627\u0621.`;

const isMissingProductColumnError = (error: any, columnName: string) =>
  typeof error?.message === 'string' &&
  error.message.includes(`Could not find the '${columnName}' column of 'products' in the schema cache`);

const stripUnsupportedProductColumns = (payload: Record<string, any>, error: any) => {
  const fallbackPayload = { ...payload };
  const removedColumns: string[] = [];

  for (const columnName of ['product_code', 'app_name', 'price_invoice_official', 'allow_invoice_sale']) {
    if (columnName in fallbackPayload && isMissingProductColumnError(error, columnName)) {
      delete fallbackPayload[columnName];
      removedColumns.push(columnName);
    }
  }

  return { fallbackPayload, removedColumns };
};

const Products: React.FC = () => {
  const { workerId } = useAuth();
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [productName, setProductName] = useState('');
  const [productAppName, setProductAppName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [piecesPerBox, setPiecesPerBox] = useState<number>(1);
  const [priceSuperGros, setPriceSuperGros] = useState<number>(0);
  const [priceGros, setPriceGros] = useState<number>(0);
  const [priceInvoice, setPriceInvoice] = useState<number>(0);
  const [priceInvoiceOfficial, setPriceInvoiceOfficial] = useState<number>(0);
  const [allowInvoiceSale, setAllowInvoiceSale] = useState<boolean>(true);
  const [priceRetail, setPriceRetail] = useState<number>(0);
  const [priceNoInvoice, setPriceNoInvoice] = useState<number>(0);
  const [pricingUnit, setPricingUnit] = useState<string>('box');
  const [weightPerBox, setWeightPerBox] = useState<number>(0);
  const [allowUnitSale, setAllowUnitSale] = useState<boolean>(false);
  const [productSortOrder, setProductSortOrder] = useState<number>(0);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Edit states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductAppName, setEditProductAppName] = useState('');
  const [editProductCode, setEditProductCode] = useState('');
  const [editPiecesPerBox, setEditPiecesPerBox] = useState<number>(1);
  const [editPriceSuperGros, setEditPriceSuperGros] = useState<number>(0);
  const [editPriceGros, setEditPriceGros] = useState<number>(0);
  const [editPriceInvoice, setEditPriceInvoice] = useState<number>(0);
  const [editPriceInvoiceOfficial, setEditPriceInvoiceOfficial] = useState<number>(0);
  const [editAllowInvoiceSale, setEditAllowInvoiceSale] = useState<boolean>(true);
  const [editPriceRetail, setEditPriceRetail] = useState<number>(0);
  const [editPriceNoInvoice, setEditPriceNoInvoice] = useState<number>(0);
  const [editPricingUnit, setEditPricingUnit] = useState<string>('box');
  const [editWeightPerBox, setEditWeightPerBox] = useState<number>(0);
  const [editAllowUnitSale, setEditAllowUnitSale] = useState<boolean>(false);
  const [editProductImage, setEditProductImage] = useState<File | null>(null);
  const [editProductImagePreview, setEditProductImagePreview] = useState<string | null>(null);
  const [editSortOrder, setEditSortOrder] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStampPriceDialog, setShowStampPriceDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [invoiceTemplateOpen, setInvoiceTemplateOpen] = useState(false);
  const [titleTapCount, setTitleTapCount] = useState(0);
  
  // Group price update states
  const [showGroupUpdateDialog, setShowGroupUpdateDialog] = useState(false);
  const [productGroup, setProductGroup] = useState<ProductGroup | null>(null);
  const [pendingPriceUpdates, setPendingPriceUpdates] = useState<Record<string, number>>({});
  const [originalPrices, setOriginalPrices] = useState<Record<string, number>>({});
  const addImageInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);
  const titleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleTap = () => {
    const nextCount = titleTapCount + 1;
    setTitleTapCount(nextCount);

    if (titleTapTimeoutRef.current) {
      clearTimeout(titleTapTimeoutRef.current);
    }

    if (nextCount >= 3) {
      setInvoiceTemplateOpen(true);
      setTitleTapCount(0);
      titleTapTimeoutRef.current = null;
      return;
    }

    titleTapTimeoutRef.current = setTimeout(() => {
      setTitleTapCount(0);
      titleTapTimeoutRef.current = null;
    }, 900);
  };

  const uploadProductImage = async (file: File, productId: string): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const filePath = `${productId}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(filePath, file, { upsert: true });
    if (error) { console.error('Upload error:', error); return null; }
    const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(filePath);
    return publicUrl;
  };

  const handleImageSelect = (file: File | null, setFile: (f: File | null) => void, setPreview: (p: string | null) => void) => {
    if (!file) { setFile(null); setPreview(null); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(t('products.image_too_large')); return; }
    setFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    fetchProducts();

    // Realtime subscription for products
    const baseChannelName = 'products-realtime';
    const existing = (supabase as any).getChannels?.()?.find((ch: any) => ch.topic === `realtime:${baseChannelName}`);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const channel = supabase
      .channel(`${baseChannelName}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    return () => {
      if (titleTapTimeoutRef.current) clearTimeout(titleTapTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    setPriceInvoice(getGrossPriceWithVat(priceInvoiceOfficial));
  }, [priceInvoiceOfficial]);

  useEffect(() => {
    setEditPriceInvoice(getGrossPriceWithVat(editPriceInvoiceOfficial));
  }, [editPriceInvoiceOfficial]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('is_active', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error(t('stats.load_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      if (a.is_active !== b.is_active) {
        return Number(b.is_active) - Number(a.is_active);
      }

      const aOrder = (a as any).sort_order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = (b as any).sort_order ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;

      return a.name.localeCompare(b.name);
    });
  }, [products]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productName.trim()) {
      toast.error(t('products.enter_name'));
      return;
    }

    if (piecesPerBox < 1) {
      toast.error(t('validation.min_one'));
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: productName.trim(),
        app_name: productAppName.trim() || productName.trim(),
        product_code: productCode.trim() || null,
        pieces_per_box: piecesPerBox,
        pricing_unit: pricingUnit,
        weight_per_box: pricingUnit === 'kg' ? weightPerBox : null,
        price_super_gros: priceSuperGros,
        price_gros: priceGros,
        price_invoice_official: priceInvoiceOfficial,
        price_invoice: priceInvoice,
        allow_invoice_sale: allowInvoiceSale,
        price_retail: priceRetail,
        price_no_invoice: priceNoInvoice,
        allow_unit_sale: allowUnitSale,
        sort_order: productSortOrder,
        created_by: workerId,
      };

      let { data: insertedProduct, error } = await supabase.from('products').insert(payload).select('id').single();

      if (
        error &&
        (isMissingProductColumnError(error, 'product_code') ||
          isMissingProductColumnError(error, 'app_name') ||
          isMissingProductColumnError(error, 'price_invoice_official') ||
          isMissingProductColumnError(error, 'allow_invoice_sale'))
      ) {
        const { fallbackPayload, removedColumns } = stripUnsupportedProductColumns(payload, error);
        const fallbackResult = await supabase.from('products').insert(fallbackPayload).select('id').single();
        insertedProduct = fallbackResult.data;
        error = fallbackResult.error;
        if (!fallbackResult.error && removedColumns.length > 0) {
          toast.warning(buildUnsupportedColumnsMessage(removedColumns));
        }
      }

      if (error) throw error;

      // Upload image if selected
      if (productImage && insertedProduct) {
        const imageUrl = await uploadProductImage(productImage, insertedProduct.id);
        if (imageUrl) {
          await supabase.from('products').update({ image_url: imageUrl }).eq('id', insertedProduct.id);
        }
      }

      toast.success(t('products.added'));
      setShowAddDialog(false);
      setProductName('');
      setProductAppName('');
      setProductCode('');
      setPiecesPerBox(1);
      setPriceSuperGros(0);
      setPriceGros(0);
      setPriceInvoiceOfficial(0);
      setPriceInvoice(0);
      setAllowInvoiceSale(true);
      setPriceRetail(0);
      setPriceNoInvoice(0);
      setPricingUnit('box');
      setWeightPerBox(0);
      setAllowUnitSale(true);
      setProductSortOrder(0);
      setProductImage(null);
      setProductImagePreview(null);
      fetchProducts();
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast.error(error.message || t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === product.id ? { ...p, is_active: !p.is_active } : p
      ));
      
      toast.success(product.is_active ? t('products.deactivated') : t('products.activated'));
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast.error(t('common.error'));
    }
  };

  const openEditDialog = async (product: Product) => {
    setEditingProduct(product);
    setEditProductName(product.name);
    setEditProductAppName((product as any).app_name || product.name || '');
    setEditProductCode(product.product_code || '');
    setEditPiecesPerBox(product.pieces_per_box);
    setEditPricingUnit(product.pricing_unit || 'box');
    setEditWeightPerBox(product.weight_per_box || 0);
    setEditAllowUnitSale(product.allow_unit_sale !== false);
    setEditSortOrder((product as any).sort_order || 0);
    setEditProductImage(null);
    setEditProductImagePreview(product.image_url || null);
    setEditPriceSuperGros(product.price_super_gros || 0);
    setEditPriceGros(product.price_gros || 0);
    setEditPriceInvoiceOfficial((product as any).price_invoice_official || getNetPriceBeforeVat(product.price_invoice || 0));
    setEditPriceInvoice(product.price_invoice || 0);
    setEditAllowInvoiceSale((product as any).allow_invoice_sale !== false);
    setEditPriceRetail(product.price_retail || 0);
    setEditPriceNoInvoice(product.price_no_invoice || 0);
    
    // Store original prices for comparison
    setOriginalPrices({
      price_super_gros: product.price_super_gros || 0,
      price_gros: product.price_gros || 0,
      price_invoice_official: (product as any).price_invoice_official || getNetPriceBeforeVat(product.price_invoice || 0),
      price_invoice: product.price_invoice || 0,
      price_retail: product.price_retail || 0,
      price_no_invoice: product.price_no_invoice || 0,
    });
    
    // Fetch product's group
    try {
      const { data: mappings } = await supabase
        .from('product_pricing_groups')
        .select('group_id')
        .eq('product_id', product.id);
      
      if (mappings && mappings.length > 0) {
        const groupId = mappings[0].group_id;
        const [groupRes, groupProductsRes] = await Promise.all([
          supabase.from('pricing_groups').select('*').eq('id', groupId).single(),
          supabase.from('product_pricing_groups').select('product_id').eq('group_id', groupId),
        ]);
        
        if (groupRes.data && groupProductsRes.data) {
          const groupProductIds = groupProductsRes.data.map(m => m.product_id);
          const groupProducts = products.filter(p => groupProductIds.includes(p.id));
          setProductGroup({
            id: groupId,
            name: groupRes.data.name,
            products: groupProducts,
          });
        }
      } else {
        setProductGroup(null);
      }
    } catch (error) {
      console.error('Error fetching product group:', error);
      setProductGroup(null);
    }
  };

  const hasPriceChanges = () => {
    return (
      editPriceSuperGros !== originalPrices.price_super_gros ||
      editPriceGros !== originalPrices.price_gros ||
      editPriceInvoiceOfficial !== originalPrices.price_invoice_official ||
      editPriceInvoice !== originalPrices.price_invoice ||
      editPriceRetail !== originalPrices.price_retail ||
      editPriceNoInvoice !== originalPrices.price_no_invoice
    );
  };

  const getPriceUpdates = () => {
    const updates: Record<string, number> = {};
    if (editPriceSuperGros !== originalPrices.price_super_gros) updates.price_super_gros = editPriceSuperGros;
    if (editPriceGros !== originalPrices.price_gros) updates.price_gros = editPriceGros;
    if (editPriceInvoiceOfficial !== originalPrices.price_invoice_official) updates.price_invoice_official = editPriceInvoiceOfficial;
    if (editPriceInvoice !== originalPrices.price_invoice) updates.price_invoice = editPriceInvoice;
    if (editPriceRetail !== originalPrices.price_retail) updates.price_retail = editPriceRetail;
    if (editPriceNoInvoice !== originalPrices.price_no_invoice) updates.price_no_invoice = editPriceNoInvoice;
    return updates;
  };

  const handleSaveProductOnly = async () => {
    if (!editingProduct) return;
    if (!editProductName.trim()) {
      toast.error(t('products.enter_name_error'));
      return;
    }

    setIsUpdating(true);
    try {
      let imageUrl = editingProduct.image_url;
      if (editProductImage) {
        const uploaded = await uploadProductImage(editProductImage, editingProduct.id);
        if (uploaded) imageUrl = uploaded;
      }

      const payload = {
        name: editProductName.trim(),
        app_name: editProductAppName.trim() || editProductName.trim(),
        product_code: editProductCode.trim() || null,
        pieces_per_box: editPiecesPerBox,
        pricing_unit: editPricingUnit,
        weight_per_box: editPricingUnit === 'kg' ? editWeightPerBox : null,
        price_super_gros: editPriceSuperGros,
        price_gros: editPriceGros,
        price_invoice_official: editPriceInvoiceOfficial,
        price_invoice: editPriceInvoice,
        allow_invoice_sale: editAllowInvoiceSale,
        price_retail: editPriceRetail,
        price_no_invoice: editPriceNoInvoice,
        allow_unit_sale: editAllowUnitSale,
        sort_order: editSortOrder,
        image_url: imageUrl,
      };

      let { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id);

      if (
        error &&
        (isMissingProductColumnError(error, 'product_code') ||
          isMissingProductColumnError(error, 'app_name') ||
          isMissingProductColumnError(error, 'price_invoice_official') ||
          isMissingProductColumnError(error, 'allow_invoice_sale'))
      ) {
        const { fallbackPayload, removedColumns } = stripUnsupportedProductColumns(payload, error);
        const fallbackResult = await supabase
          .from('products')
          .update(fallbackPayload)
          .eq('id', editingProduct.id);
        error = fallbackResult.error;
        if (!fallbackResult.error && removedColumns.length > 0) {
          toast.warning(buildUnsupportedColumnsMessage(removedColumns));
        }
      }

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === editingProduct.id 
          ? { 
              ...p, 
              name: editProductName.trim(), 
              app_name: editProductAppName.trim() || editProductName.trim(),
              product_code: editProductCode.trim() || null,
              pieces_per_box: editPiecesPerBox,
              pricing_unit: editPricingUnit,
              weight_per_box: editPricingUnit === 'kg' ? editWeightPerBox : null,
              price_super_gros: editPriceSuperGros,
              price_gros: editPriceGros,
              price_invoice_official: editPriceInvoiceOfficial,
              price_invoice: editPriceInvoice,
              allow_invoice_sale: editAllowInvoiceSale,
              price_retail: editPriceRetail,
              price_no_invoice: editPriceNoInvoice,
              allow_unit_sale: editAllowUnitSale,
            } 
          : p
      ));

      toast.success(t('products.updated'));
      setEditingProduct(null);
      setProductGroup(null);
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error(error.message || t('products.update_failed'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveGroupClick = () => {
    if (!productGroup || !editingProduct) return;
    setPendingPriceUpdates(getPriceUpdates());
    setShowGroupUpdateDialog(true);
  };

  const handleGroupUpdateComplete = () => {
    fetchProducts();
    setEditingProduct(null);
    setProductGroup(null);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    if (!editProductName.trim()) {
      toast.error(t('products.enter_name_error'));
      return;
    }

    if (editPiecesPerBox < 1) {
      toast.error(t('products.min_pieces_error'));
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        name: editProductName.trim(),
        app_name: editProductAppName.trim() || editProductName.trim(),
        product_code: editProductCode.trim() || null,
        pieces_per_box: editPiecesPerBox,
        pricing_unit: editPricingUnit,
        weight_per_box: editPricingUnit === 'kg' ? editWeightPerBox : null,
        price_super_gros: editPriceSuperGros,
        price_gros: editPriceGros,
        price_invoice_official: editPriceInvoiceOfficial,
        price_invoice: editPriceInvoice,
        allow_invoice_sale: editAllowInvoiceSale,
        price_retail: editPriceRetail,
        price_no_invoice: editPriceNoInvoice,
        allow_unit_sale: editAllowUnitSale,
      };

      let { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProduct.id);

      if (
        error &&
        (isMissingProductColumnError(error, 'product_code') ||
          isMissingProductColumnError(error, 'app_name') ||
          isMissingProductColumnError(error, 'price_invoice_official') ||
          isMissingProductColumnError(error, 'allow_invoice_sale'))
      ) {
        const { fallbackPayload, removedColumns } = stripUnsupportedProductColumns(payload, error);
        const fallbackResult = await supabase
          .from('products')
          .update(fallbackPayload)
          .eq('id', editingProduct.id);
        error = fallbackResult.error;
        if (!fallbackResult.error && removedColumns.length > 0) {
          toast.warning(buildUnsupportedColumnsMessage(removedColumns));
        }
      }

      if (error) throw error;

      setProducts(prev => prev.map(p => 
        p.id === editingProduct.id 
          ? { 
              ...p, 
              name: editProductName.trim(), 
              app_name: editProductAppName.trim() || editProductName.trim(),
              product_code: editProductCode.trim() || null,
              pieces_per_box: editPiecesPerBox,
              pricing_unit: editPricingUnit,
              weight_per_box: editPricingUnit === 'kg' ? editWeightPerBox : null,
              price_super_gros: editPriceSuperGros,
              price_gros: editPriceGros,
              price_invoice_official: editPriceInvoiceOfficial,
              price_invoice: editPriceInvoice,
              allow_invoice_sale: editAllowInvoiceSale,
              price_retail: editPriceRetail,
              price_no_invoice: editPriceNoInvoice,
              allow_unit_sale: editAllowUnitSale,
            } 
          : p
      ));

      toast.success(t('products.updated'));
      setEditingProduct(null);
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error(error.message || t('products.update_failed'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;

      toast.success(t('products.deleted'));
      setProductToDelete(null);
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || t('common.error'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={handleTitleTap} className="text-xl font-bold">
          {t('products.title')}
        </button>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowStampPriceDialog(true)}
          >
            <Stamp className="w-4 h-4 ml-2" />
            {t('products.stamp_tiers')}
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 ml-2" />
                {t('products.add')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>{t('products.add_new')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="space-y-2">
                <Label>{productOfficialNameLabel}</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={t('products.enter_name')}
                  className="text-right"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>{productAppNameLabel}</Label>
                <Input
                  value={productAppName}
                  onChange={(e) => setProductAppName(e.target.value)}
                  placeholder={productAppNamePlaceholder}
                  className="text-right"
                />
                <p className="text-xs text-muted-foreground">
                  {productAppNameHelp}
                </p>
              </div>

              <div className="space-y-2">
                <Label>CODE</Label>
                <Input
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="AROMA-125"
                  className="text-left [direction:ltr]"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">{productCodeHint}</p>
              </div>

              {/* Sort Order */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  {sortOrderDescription}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={productSortOrder}
                  onChange={(e) => setProductSortOrder(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="text-right"
                />
                <p className="text-xs text-muted-foreground">{sortOrderHint}</p>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  {productImageLabel}
                </Label>
                <input
                  ref={addImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageSelect(e.target.files?.[0] || null, setProductImage, setProductImagePreview)}
                />
                {productImagePreview ? (
                  <div className="relative w-20 h-20">
                    <img src={productImagePreview} alt={t('products.preview')} className="w-20 h-20 rounded-lg object-cover border" />
                    <button type="button" onClick={() => { setProductImage(null); setProductImagePreview(null); }} className="absolute -top-2 -left-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => addImageInputRef.current?.click()} className="gap-2">
                    <Camera className="w-4 h-4" />
                    {chooseImageLabel}
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Box className="w-4 h-4" />
                  {t('products.pieces_per_box')}
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={piecesPerBox}
                  onChange={(e) => setPiecesPerBox(parseInt(e.target.value) || 1)}
                  placeholder={t('products.pieces_per_box')}
                  className="text-right"
                />
              </div>

              {/* Allow unit sale switch */}
              <div className="flex items-center justify-between py-2">
                <Label className="text-sm">{t('products.allow_unit_sale')}</Label>
                <Switch checked={allowUnitSale} onCheckedChange={setAllowUnitSale} />
              </div>


              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  {t('products.pricing_unit')}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['box', 'kg', 'unit'] as const).map((unit) => (
                    <Button
                      key={unit}
                      type="button"
                      variant={pricingUnit === unit ? 'default' : 'outline'}
                      size="sm"
                      className="h-10"
                      onClick={() => setPricingUnit(unit)}
                    >
                      {t(`products.pricing_unit_${unit}`)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Weight per box (for kg pricing) */}
              {pricingUnit === 'kg' && (
                <div className="space-y-2">
                  <Label className="text-sm">{t('products.weight_per_box')}</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={weightPerBox}
                    onChange={(e) => setWeightPerBox(parseFloat(e.target.value) || 0)}
                    className="text-right"
                  />
                  {weightPerBox > 0 && piecesPerBox > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t('products.weight_per_unit')}: {(weightPerBox / piecesPerBox).toFixed(3)} {kilogramLabel}
                    </p>
                  )}
                </div>
              )}
              {/* Pricing Section */}
              <div className="pt-2 border-t space-y-4">
                <Label className="text-base font-semibold block">{t('products.prices')}</Label>
                
                {/* فاتورة 2 */}
                <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                  <Label className="text-sm font-bold text-primary block">{t('products.invoice2_title')}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">{t('products.price_super_gros')}</Label>
                      <Input type="number" min={0} step="0.01" value={priceSuperGros} onChange={(e) => setPriceSuperGros(parseFloat(e.target.value) || 0)} className="text-right h-9" onFocus={(e) => e.target.select()} />
                      <p className="text-[10px] text-muted-foreground">قبل TVA 19%: <span dir="ltr" className="font-medium">{formatPrice(getNetPriceBeforeVat(priceSuperGros))} DA</span></p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">{t('products.price_gros')}</Label>
                      <Input type="number" min={0} step="0.01" value={priceGros} onChange={(e) => setPriceGros(parseFloat(e.target.value) || 0)} className="text-right h-9" onFocus={(e) => e.target.select()} />
                      <p className="text-[10px] text-muted-foreground">قبل TVA 19%: <span dir="ltr" className="font-medium">{formatPrice(getNetPriceBeforeVat(priceGros))} DA</span></p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">{t('products.price_retail')}</Label>
                      <Input type="number" min={0} step="0.01" value={priceRetail} onChange={(e) => setPriceRetail(parseFloat(e.target.value) || 0)} className="text-right h-9" onFocus={(e) => e.target.select()} />
                      <p className="text-[10px] text-muted-foreground">قبل TVA 19%: <span dir="ltr" className="font-medium">{formatPrice(getNetPriceBeforeVat(priceRetail))} DA</span></p>
                    </div>
                  </div>
                </div>
                
                {/* فاتورة 1 */}
                <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-sm font-bold text-primary block">{t('products.invoice1_title')}</Label>
                    <div className="flex items-center gap-2">
                      <Label className="text-[11px] text-muted-foreground">{allowInvoiceSaleLabel}</Label>
                      <Switch checked={allowInvoiceSale} onCheckedChange={setAllowInvoiceSale} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{allowInvoiceSaleHelp}</p>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{invoiceOfficialPriceLabel}</Label>
                    <Input type="number" min={0} step="0.0001" value={priceInvoiceOfficial} onChange={(e) => setPriceInvoiceOfficial(parseFloat(e.target.value) || 0)} className="text-right h-9" onFocus={(e) => e.target.select()} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{invoiceWithVatLabel}</Label>
                    <Input type="number" value={Number(priceInvoice.toFixed(4))} readOnly className="text-right h-9 bg-muted" />
                    <p className="text-[10px] text-muted-foreground">
                      {invoiceWithVatHelp}
                      <span dir="ltr" className="font-medium ms-1">{formatPrecisePrice(priceInvoiceOfficial)} DA × 1.19 = {formatPrecisePrice(priceInvoice)} DA</span>
                    </p>
                  </div>
                </div>


              {/* Computed box price */}
                {((pricingUnit === 'kg' && weightPerBox > 0) || (pricingUnit === 'unit' && piecesPerBox > 1)) && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{t('products.box_price_calculated')}:</p>
                    {(() => {
                      const multiplier = pricingUnit === 'kg' ? weightPerBox : piecesPerBox;
                      return (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {priceSuperGros > 0 && <p>{t('products.price_super_gros')}: <span className="font-bold">{(priceSuperGros * multiplier).toLocaleString()} {t('common.currency')}</span></p>}
                          {priceGros > 0 && <p>{t('products.price_gros')}: <span className="font-bold">{(priceGros * multiplier).toLocaleString()} {t('common.currency')}</span></p>}
                          {priceRetail > 0 && <p>{t('products.price_retail')}: <span className="font-bold">{(priceRetail * multiplier).toLocaleString()} {t('common.currency')}</span></p>}
                          {priceInvoice > 0 && <p>{t('products.invoice1_title')}: <span className="font-bold">{(priceInvoice * multiplier).toLocaleString()} {t('common.currency')}</span></p>}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('products.add')
                )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            {productsTabLabel}
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            {t('products.pricing_groups')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-secondary text-secondary-foreground">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('products.total')}</p>
                  <p className="text-xl font-bold">{products.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-accent/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{activeProductsLabel}</p>
                  <p className="text-xl font-bold text-primary">{products.filter(p => p.is_active).length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products List */}
          <div className="space-y-2">
        {sortedProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center">
                {/* Product Info */}
                <div className="flex-1 flex items-center gap-3 p-3">
                  {product.image_url ? (
                    <img src={product.image_url} alt={(product as any).app_name || product.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{(product as any).app_name || product.name}</p>
                    {(product as any).app_name && (product as any).app_name !== product.name && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {officialNamePrefix} <span className="font-medium text-foreground">{product.name}</span>
                      </p>
                    )}
                    {product.product_code && (
                      <p className="text-[11px] text-muted-foreground" dir="ltr">
                        CODE: <span className="font-medium text-foreground">{product.product_code}</span>
                      </p>
                    )}
                    {(product as any).allow_invoice_sale === false && (
                      <p className="text-[11px] text-amber-600 font-medium">
                        {invoiceSaleDisabledBadge}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Box className="w-3 h-3" />
                      {product.pieces_per_box} {piecesPerBoxSuffix}
                      {product.pricing_unit === 'kg' && product.weight_per_box && (
                        <span className="text-primary ms-1">• {product.weight_per_box} {kilogramLabel}</span>
                      )}
                      {product.pricing_unit !== 'box' && (
                        <span className="bg-primary/10 text-primary text-[10px] px-1.5 rounded-full ms-1">
                          {t(`products.pricing_unit_${product.pricing_unit}`)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className="px-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    product.is_active 
                      ? 'bg-primary/10 text-primary' 
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {product.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                </div>
                
                {/* Actions */}
                <div className="flex items-center border-r border-border">
                  <div className="px-3 py-2 flex items-center">
                    <Switch
                      checked={product.is_active}
                      onCheckedChange={() => toggleProductStatus(product)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-none hover:bg-muted"
                    onClick={() => openEditDialog(product)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-none text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setProductToDelete(product)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

          {products.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{t('products.no_products')}</p>
            </div>
          )}
          </div>
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <PricingGroupsTab />
        </TabsContent>
      </Tabs>

      {/* Edit Product Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{t('products.edit')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProduct} className="space-y-4">
            <div className="space-y-2">
              <Label>{productOfficialNameLabel}</Label>
              <Input
                value={editProductName}
                onChange={(e) => setEditProductName(e.target.value)}
                placeholder={t('products.enter_name')}
                className="text-right"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>{productAppNameLabel}</Label>
              <Input
                value={editProductAppName}
                onChange={(e) => setEditProductAppName(e.target.value)}
                placeholder={productAppNamePlaceholder}
                className="text-right"
              />
              <p className="text-xs text-muted-foreground">
                {productAppNameHelp}
              </p>
            </div>

            <div className="space-y-2">
              <Label>CODE</Label>
              <Input
                value={editProductCode}
                onChange={(e) => setEditProductCode(e.target.value)}
                placeholder="AROMA-125"
                className="text-left [direction:ltr]"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground">{productCodeHint}</p>
            </div>

            {/* Sort Order */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                {t('products.sort_order')}
              </Label>
              <Input
                type="number"
                min={0}
                value={editSortOrder}
                onChange={(e) => setEditSortOrder(parseInt(e.target.value) || 0)}
                placeholder="0"
                className="text-right"
              />
              <p className="text-xs text-muted-foreground">{sortOrderHint}</p>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                {productImageLabel}
              </Label>
              <input
                ref={editImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageSelect(e.target.files?.[0] || null, setEditProductImage, setEditProductImagePreview)}
              />
              {editProductImagePreview ? (
                <div className="relative w-20 h-20">
                  <img src={editProductImagePreview} alt={t('products.preview')} className="w-20 h-20 rounded-lg object-cover border" />
                  <button type="button" onClick={() => { setEditProductImage(null); setEditProductImagePreview(null); }} className="absolute -top-2 -left-2 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => editImageInputRef.current?.click()} className="gap-2">
                  <Camera className="w-4 h-4" />
                  {chooseImageLabel}
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Box className="w-4 h-4" />
                {t('products.pieces_per_box')}
              </Label>
              <Input
                type="number"
                min={1}
                value={editPiecesPerBox}
                onChange={(e) => setEditPiecesPerBox(parseInt(e.target.value) || 1)}
                placeholder={t('products.enter_pieces')}
                className="text-right"
              />
            </div>

            {/* Allow unit sale switch */}
            <div className="flex items-center justify-between py-2">
              <Label className="text-sm">{t('products.allow_unit_sale')}</Label>
              <Switch checked={editAllowUnitSale} onCheckedChange={setEditAllowUnitSale} />
            </div>


            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Scale className="w-4 h-4" />
                {t('products.pricing_unit')}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(['box', 'kg', 'unit'] as const).map((unit) => (
                  <Button
                    key={unit}
                    type="button"
                    variant={editPricingUnit === unit ? 'default' : 'outline'}
                    size="sm"
                    className="h-10"
                    onClick={() => setEditPricingUnit(unit)}
                  >
                    {t(`products.pricing_unit_${unit}`)}
                  </Button>
                ))}
              </div>
            </div>

            {editPricingUnit === 'kg' && (
              <div className="space-y-2">
                <Label className="text-sm">{t('products.weight_per_box')}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editWeightPerBox}
                  onChange={(e) => setEditWeightPerBox(parseFloat(e.target.value) || 0)}
                  className="text-right"
                />
                {editWeightPerBox > 0 && editPiecesPerBox > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('products.weight_per_unit')}: {(editWeightPerBox / editPiecesPerBox).toFixed(3)} كغ
                  </p>
                )}
              </div>
            )}
            
            {/* Pricing Section */}
            <div className="pt-2 border-t space-y-4">
              <Label className="text-base font-semibold block">{t('products.prices')}</Label>
              
              {/* فاتورة 2 */}
              <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                <Label className="text-sm font-bold text-primary block">{t('products.invoice2_title')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t('products.price_super_gros')}</Label>
                    <Input type="number" min={0} step="0.01" value={editPriceSuperGros} onChange={(e) => setEditPriceSuperGros(parseFloat(e.target.value) || 0)} className="text-right h-9" onFocus={(e) => e.target.select()} />
                    <p className="text-[10px] text-muted-foreground">قبل TVA 19%: <span dir="ltr" className="font-medium">{formatPrice(getNetPriceBeforeVat(editPriceSuperGros))} DA</span></p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t('products.price_gros')}</Label>
                    <Input type="number" min={0} step="0.01" value={editPriceGros} onChange={(e) => setEditPriceGros(parseFloat(e.target.value) || 0)} className="text-right h-9" onFocus={(e) => e.target.select()} />
                    <p className="text-[10px] text-muted-foreground">قبل TVA 19%: <span dir="ltr" className="font-medium">{formatPrice(getNetPriceBeforeVat(editPriceGros))} DA</span></p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">{t('products.price_retail')}</Label>
                    <Input type="number" min={0} step="0.01" value={editPriceRetail} onChange={(e) => setEditPriceRetail(parseFloat(e.target.value) || 0)} className="text-right h-9" onFocus={(e) => e.target.select()} />
                    <p className="text-[10px] text-muted-foreground">قبل TVA 19%: <span dir="ltr" className="font-medium">{formatPrice(getNetPriceBeforeVat(editPriceRetail))} DA</span></p>
                  </div>
                </div>
              </div>
              
              {/* فاتورة 1 */}
              <div className="border rounded-lg p-3 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm font-bold text-primary block">{t('products.invoice1_title')}</Label>
                  <div className="flex items-center gap-2">
                    <Label className="text-[11px] text-muted-foreground">{allowInvoiceSaleLabel}</Label>
                    <Switch checked={editAllowInvoiceSale} onCheckedChange={setEditAllowInvoiceSale} />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">{allowInvoiceSaleHelp}</p>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{invoiceOfficialPriceLabel}</Label>
                  <Input type="number" min={0} step="0.0001" value={editPriceInvoiceOfficial} onChange={(e) => setEditPriceInvoiceOfficial(parseFloat(e.target.value) || 0)} className="text-right h-9" onFocus={(e) => e.target.select()} />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">{invoiceWithVatLabel}</Label>
                  <Input type="number" value={Number(editPriceInvoice.toFixed(4))} readOnly className="text-right h-9 bg-muted" />
                  <p className="text-[10px] text-muted-foreground">
                    {invoiceWithVatHelp}
                    <span dir="ltr" className="font-medium ms-1">{formatPrecisePrice(editPriceInvoiceOfficial)} DA × 1.19 = {formatPrecisePrice(editPriceInvoice)} DA</span>
                  </p>
                </div>
              </div>


              {/* Computed box price */}
              {((editPricingUnit === 'kg' && editWeightPerBox > 0) || (editPricingUnit === 'unit' && editPiecesPerBox > 1)) && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{t('products.box_price_calculated')}:</p>
                  {(() => {
                    const multiplier = editPricingUnit === 'kg' ? editWeightPerBox : editPiecesPerBox;
                    return (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {editPriceSuperGros > 0 && <p>{t('products.price_super_gros')}: <span className="font-bold">{(editPriceSuperGros * multiplier).toLocaleString()} {t('common.currency')}</span></p>}
                        {editPriceGros > 0 && <p>{t('products.price_gros')}: <span className="font-bold">{(editPriceGros * multiplier).toLocaleString()} {t('common.currency')}</span></p>}
                        {editPriceRetail > 0 && <p>{t('products.price_retail')}: <span className="font-bold">{(editPriceRetail * multiplier).toLocaleString()} {t('common.currency')}</span></p>}
                        {editPriceInvoice > 0 && <p>{t('products.invoice1_title')}: <span className="font-bold">{(editPriceInvoice * multiplier).toLocaleString()} {t('common.currency')}</span></p>}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            
            {/* Group indicator */}
            {productGroup && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>{belongsToGroupLabel}</span>
                  <span className="font-bold text-primary">{productGroup.name}</span>
                  <span className="text-muted-foreground">({productGroup.products.length} {productCountSuffix})</span>
                </div>
              </div>
            )}
            
            {/* Save buttons */}
            <div className="space-y-2">
              <Button 
                type="button" 
                className="w-full" 
                disabled={isUpdating}
                onClick={handleSaveProductOnly}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    {updatingLabel}
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 ml-2" />
                    {t('products.save_product_only')}
                  </>
                )}
              </Button>
              
              {productGroup && hasPriceChanges() && (
                <Button 
                  type="button" 
                  variant="secondary"
                  className="w-full" 
                  onClick={handleSaveGroupClick}
                >
                  <Layers className="w-4 h-4 ml-2" />
                  {t('products.save_with_group')} ({productGroup.products.length} {productCountSuffix})
                </Button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Group Price Update Dialog */}
      {editingProduct && productGroup && (
        <GroupPriceUpdateDialog
          open={showGroupUpdateDialog}
          onOpenChange={setShowGroupUpdateDialog}
          currentProduct={editingProduct}
          groupProducts={productGroup.products}
          groupName={productGroup.name}
          priceUpdates={pendingPriceUpdates}
          onComplete={handleGroupUpdateComplete}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {buildDeleteDescription(productToDelete?.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>{deleteConfirmAction}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  {t('products.deleting')}
                </>
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stamp Tiers Dialog */}
      <StampTiersDialog 
        open={showStampPriceDialog} 
        onOpenChange={setShowStampPriceDialog} 
      />

      <ProductInvoiceTemplateDialog
        open={invoiceTemplateOpen}
        onOpenChange={setInvoiceTemplateOpen}
        products={sortedProducts}
      />
    </div>
  );
};

export default Products;

