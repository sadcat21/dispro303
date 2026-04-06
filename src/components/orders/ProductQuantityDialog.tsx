import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Minus, Package, Gift, Check, Settings2, Receipt, ReceiptText } from 'lucide-react';
import { Product, PaymentType, PriceSubType } from '@/types/database';
import { InvoicePaymentMethod } from '@/types/stamp';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHasPermission } from '@/hooks/usePermissions';
import ProductOfferBadge from '@/components/offers/ProductOfferBadge';
import InvoicePaymentMethodSelect from '@/components/orders/InvoicePaymentMethodSelect';
import { parseBP, boxesToBP } from '@/utils/boxPieceInput';

export interface GiftInfo {
  giftQuantity: number;
  giftPieces: number;
  offerId?: string;
}

export interface PerItemPricing {
  paymentType: PaymentType;
  invoicePaymentMethod: InvoicePaymentMethod | null;
  priceSubType: PriceSubType;
  customUnitPrice?: number;
}

interface ProductQuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onConfirm: (productId: string, quantity: number, giftInfo?: GiftInfo, isUnitSale?: boolean, perItemPricing?: PerItemPricing) => void;
  unitPrice?: number;
  unitPiecePrice?: number;
  defaultPaymentType?: PaymentType;
  defaultPriceSubType?: PriceSubType;
  defaultInvoicePaymentMethod?: InvoicePaymentMethod | null;
  initialQuantity?: number;
  initialCustomUnitPrice?: number;
  mode?: 'add' | 'edit';
  initialIsUnitSale?: boolean;
  initialGiftPieces?: number;
  initialGiftOfferId?: string;
  initialOfferApplied?: boolean;
}

const ProductQuantityDialog: React.FC<ProductQuantityDialogProps> = ({
  open,
  onOpenChange,
  product,
  onConfirm,
  unitPrice = 0,
  unitPiecePrice = 0,
  defaultPaymentType = 'with_invoice',
  defaultPriceSubType = 'gros',
  defaultInvoicePaymentMethod = null,
  initialQuantity = 1,
  initialCustomUnitPrice,
  mode = 'add',
  initialIsUnitSale = false,
  initialGiftPieces = 0,
  initialGiftOfferId,
  initialOfferApplied = false,
}) => {
  const { t, dir } = useLanguage();
  const canCustomizePrices = useHasPermission('customize_prices');
  const [quantityInput, setQuantityInput] = useState(String(initialQuantity));
  const piecesPerBox = product?.pieces_per_box || 1;
  const [giftPieces, setGiftPieces] = useState(initialGiftPieces || 0);
  const [giftOfferId, setGiftOfferId] = useState<string | undefined>(initialGiftOfferId);
  const [offerApplied, setOfferApplied] = useState(initialOfferApplied || initialGiftPieces > 0);
  const [isUnitSale, setIsUnitSale] = useState(initialIsUnitSale);
  const [showPricingOverride, setShowPricingOverride] = useState(false);
  const [itemPaymentType, setItemPaymentType] = useState<PaymentType>(defaultPaymentType);
  const [itemPriceSubType, setItemPriceSubType] = useState<PriceSubType>(defaultPriceSubType);
  const [itemInvoicePaymentMethod, setItemInvoicePaymentMethod] = useState<InvoicePaymentMethod | null>(defaultInvoicePaymentMethod);
  const [customPriceOpen, setCustomPriceOpen] = useState(false);
  const [customUnitPriceInput, setCustomUnitPriceInput] = useState(initialCustomUnitPrice ? String(initialCustomUnitPrice) : '');
  const safeT = useCallback((key: string, fallback: string) => {
    const value = t(key);
    return value && value !== key ? value : fallback;
  }, [t]);

  // Derived quantity from B.P input
  const parsed = useMemo(() => parseBP(quantityInput, piecesPerBox), [quantityInput, piecesPerBox]);
  const quantity = isUnitSale ? (parseInt(quantityInput) || 0) : parsed.boxes;
  const quantityPieces = isUnitSale ? 0 : parsed.pieces;
  const customUnitPriceValue = Number(customUnitPriceInput || 0);
  const hasCustomUnitPrice = Number.isFinite(customUnitPriceValue) && customUnitPriceValue > 0;
  const pricingUnit = product?.pricing_unit || 'box';
  const safePiecesPerBox = product?.pieces_per_box || 1;
  const safeWeightPerBox = product?.weight_per_box || 1;
  const pricingUnitLabel = pricingUnit === 'kg'
    ? 'kg'
    : pricingUnit === 'unit'
      ? t('offers.unit_piece')
      : t('offers.unit_box');
  const basePricingUnitPrice = pricingUnit === 'kg'
    ? (safeWeightPerBox > 0 ? unitPrice / safeWeightPerBox : unitPrice)
    : pricingUnit === 'unit'
      ? (safePiecesPerBox > 0 ? unitPrice / safePiecesPerBox : unitPrice)
      : unitPrice;
  const resolveSaleUnitPrice = useCallback((basePrice: number, unitSale: boolean) => {
    if (pricingUnit === 'kg') {
      const boxPrice = basePrice * (safeWeightPerBox || 1);
      return unitSale ? boxPrice / (safePiecesPerBox || 1) : boxPrice;
    }
    if (pricingUnit === 'unit') {
      const piecePrice = basePrice;
      return unitSale ? piecePrice : piecePrice * (safePiecesPerBox || 1);
    }
    const boxPrice = basePrice;
    return unitSale ? boxPrice / (safePiecesPerBox || 1) : boxPrice;
  }, [pricingUnit, safeWeightPerBox, safePiecesPerBox]);

  // Sync quantity when initialQuantity changes (edit mode vs new)
  useEffect(() => {
    if (open) {
      setIsUnitSale(initialIsUnitSale);
      setQuantityInput(initialIsUnitSale ? String(initialQuantity) : boxesToBP(initialQuantity, piecesPerBox));
    }
  }, [open, initialQuantity, piecesPerBox, initialIsUnitSale]);

  useEffect(() => {
    if (open) {
      setCustomUnitPriceInput(initialCustomUnitPrice ? String(initialCustomUnitPrice) : '');
    }
  }, [open, initialCustomUnitPrice]);

  useEffect(() => {
    if (open) {
      setGiftPieces(initialGiftPieces || 0);
      setGiftOfferId(initialGiftOfferId);
      setOfferApplied((initialOfferApplied || initialGiftPieces > 0) && !initialIsUnitSale);
    }
  }, [open, initialGiftPieces, initialGiftOfferId, initialOfferApplied, initialIsUnitSale]);

  // Offer must be applied before confirming (mandatory)
  const hasUnappliedOffer = !isUnitSale && giftPieces > 0 && !offerApplied;

  const handleConfirm = () => {
    const effectiveQty = isUnitSale ? quantity : parsed.totalBoxes;
    if (product && effectiveQty > 0 && !hasUnappliedOffer) {
      const perItemPricing: PerItemPricing | undefined = (showPricingOverride || hasCustomUnitPrice) ? {
        paymentType: itemPaymentType,
        invoicePaymentMethod: itemPaymentType === 'with_invoice' ? itemInvoicePaymentMethod : null,
        priceSubType: itemPriceSubType,
        customUnitPrice: hasCustomUnitPrice ? customUnitPriceValue : undefined,
      } : undefined;

      if (isUnitSale) {
        onConfirm(product.id, effectiveQty, undefined, true, perItemPricing);
      } else {
        const giftBoxes = product.pieces_per_box > 0 ? Math.floor(giftPieces / product.pieces_per_box) : 0;
        const appliedGiftBoxes = offerApplied ? giftBoxes : 0;
        const appliedGiftPieces = offerApplied ? giftPieces : 0;
        const totalQuantity = effectiveQty + appliedGiftBoxes;

        if (appliedGiftPieces > 0 || appliedGiftBoxes > 0) {
          onConfirm(product.id, totalQuantity, { giftQuantity: appliedGiftBoxes, giftPieces: appliedGiftPieces, offerId: giftOfferId }, false, perItemPricing);
        } else {
          onConfirm(product.id, effectiveQty, undefined, false, perItemPricing);
        }
      }
      setQuantityInput('1');
      setGiftPieces(0);
      setGiftOfferId(undefined);
      setOfferApplied(false);
      setIsUnitSale(false);
      setShowPricingOverride(false);
      setCustomUnitPriceInput('');
      onOpenChange(false);
    }
  };

  const handleQuantityChange = (delta: number) => {
    const newQty = Math.max(1, quantity + delta);
    if (isUnitSale) {
      setQuantityInput(String(newQty));
    } else {
      setQuantityInput(boxesToBP(newQty + quantityPieces / piecesPerBox, piecesPerBox));
    }
  };

  const handleGiftCalculated = useCallback((pieces: number, offerId?: string) => {
    setGiftPieces(pieces);
    setGiftOfferId(offerId);
  }, []);

  const handleApplyOffer = () => {
    if (!product || giftPieces <= 0) return;
    setOfferApplied(true);
  };

  useEffect(() => {
    if (!offerApplied || isUnitSale) return;
    if (giftPieces <= 0) {
      setOfferApplied(false);
      setGiftOfferId(undefined);
    }
  }, [offerApplied, giftPieces, isUnitSale]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setGiftPieces(initialGiftPieces || 0);
      setGiftOfferId(initialGiftOfferId);
      setQuantityInput(initialIsUnitSale ? String(initialQuantity) : boxesToBP(initialQuantity, piecesPerBox));
      setOfferApplied((initialOfferApplied || initialGiftPieces > 0) && !initialIsUnitSale);
      setIsUnitSale(initialIsUnitSale);
      setShowPricingOverride(false);
      setItemPaymentType(defaultPaymentType);
      setItemPriceSubType(defaultPriceSubType);
      setItemInvoicePaymentMethod(defaultInvoicePaymentMethod);
      setCustomUnitPriceInput(initialCustomUnitPrice ? String(initialCustomUnitPrice) : '');
    }
    onOpenChange(isOpen);
  };

  const handleQuantityInput = (value: string) => {
    // Allow digits, dots for B.P notation
    const cleaned = value.replace(/[^0-9.]/g, '');
    setQuantityInput(cleaned);
  };

  if (!product) return null;

  const giftBoxes = product.pieces_per_box > 0 ? Math.floor(giftPieces / product.pieces_per_box) : 0;
  const giftRemainingPieces = product.pieces_per_box > 0 ? giftPieces % product.pieces_per_box : 0;
  const appliedGiftBoxes = offerApplied ? giftBoxes : 0;
  const appliedGiftPieces = offerApplied ? giftPieces : 0;
  const baseQuantity = quantity;
  const basePieces = isUnitSale ? quantity : parsed.totalPieces;
  const totalPieces = isUnitSale ? quantity : (parsed.totalPieces + appliedGiftPieces);
  const baseUnitPrice = isUnitSale ? unitPiecePrice : unitPrice;
  const displayPrice = hasCustomUnitPrice ? resolveSaleUnitPrice(customUnitPriceValue, isUnitSale) : baseUnitPrice;
  const displayTotal = isUnitSale ? (displayPrice * quantity) : (displayPrice * parsed.totalBoxes);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] flex flex-col overflow-hidden p-0" dir={dir}>
        <div className="px-4 pt-4 pb-1">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Package className="w-4 h-4 text-primary" />
              {mode === 'edit' ? (t('orders.edit_product') || 'تعديل منتج') : t('orders.add_product')}
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-1">
          <div className="space-y-2 py-1">
            {/* Product Info - compact */}
            <div className="bg-muted/50 rounded-lg p-2 flex items-center gap-3">
              {product.image_url && (
                <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-base text-primary tracking-wide truncate">{product.name}</h3>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {product.pieces_per_box} {t('products.piece_per_box')}
                  </Badge>
                  {displayPrice > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary font-bold">
                      {displayPrice.toLocaleString()} {t('common.currency')}/{isUnitSale ? t('offers.unit_piece') : t('offers.unit_box')}
                    </Badge>
                  )}
                  {!isUnitSale && unitPiecePrice > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                      {unitPiecePrice.toLocaleString()} {t('common.currency')}/{t('offers.unit_piece')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {product.allow_unit_sale && product.pieces_per_box > 1 && (
              <div className="flex items-center justify-center gap-3">
                <Label htmlFor="unit-sale-switch" className="text-xs cursor-pointer">
                  {t('offers.unit_box')}
                </Label>
                <Switch
                  id="unit-sale-switch"
                  checked={isUnitSale}
                  onCheckedChange={(checked) => {
                    setIsUnitSale(checked);
                    setQuantityInput('1');
                    setOfferApplied(false);
                    setGiftPieces(0);
                  }}
                />
                <Label htmlFor="unit-sale-switch" className="text-xs cursor-pointer">
                  {t('offers.unit_piece')}
                </Label>
              </div>
            )}

            {canCustomizePrices && (
              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="outline" size="sm" className="h-8 text-[11px] gap-1" onClick={() => setCustomPriceOpen(true)}>
                  <Settings2 className="w-3.5 h-3.5" />
                  {safeT('orders.custom_unit_price', 'تخصيص سعر الوحدة')}
                </Button>
                {hasCustomUnitPrice && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {customUnitPriceValue.toLocaleString()} {t('common.currency')} / {pricingUnitLabel}
                  </Badge>
                )}
              </div>
            )}

            {/* Quantity Selector - compact */}
            <div className="space-y-1">
              <Label className="text-center block text-xs">
                {isUnitSale ? t('orders.quantity_pieces') || 'الكمية (قطع)' : `${t('orders.quantity_boxes')} (صندوق.قطعة)`}
              </Label>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => handleQuantityChange(-1)} disabled={quantity <= (isUnitSale ? 1 : 0)}>
                  <Minus className="w-4 h-4" />
                </Button>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={quantityInput}
                  onChange={(e) => handleQuantityInput(e.target.value)}
                  onBlur={() => {
                    if (!isUnitSale) {
                      setQuantityInput(parsed.display || '0');
                    }
                  }}
                  className="w-24 h-11 text-center text-xl font-bold"
                  placeholder={isUnitSale ? '1' : '0.00'}
                />
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => handleQuantityChange(1)}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {!isUnitSale && quantityPieces > 0 && (
                <p className="text-center text-[10px] text-muted-foreground">
                  {quantity} صندوق + {quantityPieces} قطعة
                </p>
              )}
            </div>

            {/* Product Detail Summary - always visible */}
            {!isUnitSale && (
              <div className="rounded-lg border border-border bg-muted/30 divide-y divide-border text-xs">
                <div className="flex justify-between items-center px-2.5 py-1.5">
                  <span className="text-muted-foreground">{t('orders.quantity_boxes') || 'الكمية'}</span>
                  <span className="font-bold">{baseQuantity} {t('offers.unit_box')}</span>
                </div>
                {displayPrice > 0 && (
                  <div className="flex justify-between items-center px-2.5 py-1.5">
                    <span className="text-muted-foreground">{t('orders.subtotal') || 'المجموع الفرعي'}</span>
                    <span className="font-bold">{displayTotal.toLocaleString()} {t('common.currency')}</span>
                  </div>
                )}
                {(giftPieces > 0 || appliedGiftPieces > 0) && (
                  <>
                    <div className="flex justify-between items-center px-2.5 py-1.5 text-green-700 dark:text-green-400">
                      <span className="flex items-center gap-1"><Gift className="w-3.5 h-3.5" />{t('common.free') || 'العرض'}</span>
                      <span className="font-bold">
                        {giftBoxes > 0 ? `${giftBoxes} ${t('offers.unit_box')}` : ''}
                        {giftBoxes > 0 && giftRemainingPieces > 0 ? ' + ' : ''}
                        {giftRemainingPieces > 0 ? `${giftRemainingPieces} ${t('offers.unit_piece')}` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center px-2.5 py-1.5 text-green-700 dark:text-green-400">
                      <span className="text-muted-foreground">{t('orders.subtotal') || 'المجموع الفرعي (العرض)'}</span>
                      <span className="font-bold">0 {t('common.currency')}</span>
                    </div>
                    <div className="flex justify-between items-center px-2.5 py-1.5 font-bold">
                      <span>{t('orders.total_boxes') || 'إجمالي الصناديق'}</span>
                      <span className="text-primary">{quantity + appliedGiftBoxes} {t('offers.unit_box')}</span>
                    </div>
                  </>
                )}
                {displayPrice > 0 && (
                  <div className="flex justify-between items-center px-2.5 py-1.5 bg-primary/5 rounded-b-lg font-extrabold text-sm">
                    <span>{t('orders.grand_total') || 'الإجمالي'}</span>
                    <span className="text-primary">{displayTotal.toLocaleString()} {t('common.currency')}</span>
                  </div>
                )}
              </div>
            )}

            {isUnitSale && displayPrice > 0 && (
              <div className="rounded-lg border border-border bg-muted/30 text-xs">
                <div className="flex justify-between items-center px-2.5 py-1.5 font-extrabold text-sm bg-primary/5 rounded-lg">
                  <span>{t('orders.grand_total') || 'الإجمالي'}</span>
                  <span className="text-primary">{displayTotal.toLocaleString()} {t('common.currency')}</span>
                </div>
              </div>
            )}

            {/* Offer badge */}
            {!isUnitSale && !offerApplied && giftPieces > 0 && (
              <div className="bg-green-100 dark:bg-green-900/30 border border-green-500 rounded-lg p-3">
                <div className="flex items-center justify-center gap-2">
                  <Gift className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-bold text-green-700 dark:text-green-300">
                    +{giftPieces} {t('offers.unit_piece')} {t('common.free')}
                    {(giftBoxes > 0 || giftRemainingPieces > 0) && (
                      <span className="text-green-600 dark:text-green-400 font-normal">
                        {' '}({giftBoxes > 0 ? `${giftBoxes} ${t('offers.unit_box')}` : ''}{giftBoxes > 0 && giftRemainingPieces > 0 ? ' + ' : ''}{giftRemainingPieces > 0 ? `${giftRemainingPieces} ${t('offers.unit_piece')}` : ''})
                      </span>
                    )}
                  </span>
                </div>
                <Button className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white" onClick={handleApplyOffer}>
                  <Gift className="w-4 h-4 ms-2" />
                  {t('offers.apply_offer')} ({giftBoxes > 0 ? `+${giftBoxes} ${t('offers.unit_box')}` : ''}{giftBoxes > 0 && giftRemainingPieces > 0 ? ' + ' : ''}{giftRemainingPieces > 0 ? `+${giftRemainingPieces} ${t('offers.unit_piece')}` : ''})
                </Button>
              </div>
            )}

            {!isUnitSale && offerApplied && (appliedGiftBoxes > 0 || appliedGiftPieces > 0) && (
              <div className="bg-green-600 text-white rounded-lg p-3">
                <div className="flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  <span className="font-bold">{t('offers.offer_applied_success')}</span>
                </div>
                <p className="text-sm mt-1 text-green-100">
                  {(appliedGiftBoxes > 0 || appliedGiftPieces > 0) && (
                    <>{t('orders.total')}: {quantity + appliedGiftBoxes} {t('offers.unit_box')} ({quantity} + {appliedGiftBoxes} {t('common.free')})</>
                  )}
                  {appliedGiftBoxes > 0 && giftRemainingPieces > 0 && <br />}
                  {giftRemainingPieces > 0 && <>+ {giftRemainingPieces} {t('offers.unit_piece')} {t('common.free')}</>}
                  {appliedGiftBoxes === 0 && giftRemainingPieces > 0 && <>{appliedGiftPieces} {t('offers.unit_piece')} {t('common.free')}</>}
                </p>
              </div>
            )}

            {!isUnitSale && (
              <div className={offerApplied ? 'hidden' : ''}>
                <ProductOfferBadge productId={product.id} quantity={quantity} piecesPerBox={product.pieces_per_box} onGiftCalculated={handleGiftCalculated} />
              </div>
            )}

            {/* Per-Item Pricing Override */}
            <Collapsible open={showPricingOverride} onOpenChange={setShowPricingOverride}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground gap-1">
                  <Settings2 className="w-3.5 h-3.5" />
                  {showPricingOverride ? t('orders.hide_pricing_options') || 'إخفاء خيارات التسعير' : t('orders.custom_pricing') || 'تسعير مخصص لهذا المنتج'}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={itemPaymentType === 'with_invoice' ? 'default' : 'outline'}
                      size="sm"
                      className="h-9 flex items-center gap-1 text-xs"
                      onClick={() => setItemPaymentType('with_invoice')}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      {t('orders.with_invoice')}
                    </Button>
                    <Button
                      type="button"
                      variant={itemPaymentType === 'without_invoice' ? 'default' : 'outline'}
                      size="sm"
                      className="h-9 flex items-center gap-1 text-xs"
                      onClick={() => setItemPaymentType('without_invoice')}
                    >
                      <ReceiptText className="w-3.5 h-3.5" />
                      {t('orders.without_invoice')}
                    </Button>
                  </div>

                  {itemPaymentType === 'without_invoice' && (
                    <div className="grid grid-cols-3 gap-1">
                      {(['super_gros', 'gros', 'retail'] as PriceSubType[]).map((pst) => (
                        <Button
                          key={pst}
                          type="button"
                          variant={itemPriceSubType === pst ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 text-[10px]"
                          onClick={() => setItemPriceSubType(pst)}
                        >
                          {pst === 'super_gros' ? t('products.price_super_gros') : pst === 'gros' ? t('products.price_gros') : t('products.price_retail')}
                        </Button>
                      ))}
                    </div>
                  )}

                  {itemPaymentType === 'with_invoice' && (
                    <InvoicePaymentMethodSelect
                      value={itemInvoicePaymentMethod}
                      onChange={setItemInvoicePaymentMethod}
                    />
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>

        <Dialog open={customPriceOpen} onOpenChange={setCustomPriceOpen}>
          <DialogContent className="max-w-xs" dir={dir}>
            <DialogHeader>
              <DialogTitle className="text-sm">{safeT('orders.custom_unit_price', 'تخصيص سعر الوحدة')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {safeT('accounting.unit_price', 'سعر الوحدة')} ({pricingUnitLabel})
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={customUnitPriceInput}
                  onChange={(e) => setCustomUnitPriceInput(e.target.value)}
                  placeholder={String(basePricingUnitPrice || 0)}
                />
                <div className="text-[10px] text-muted-foreground">
                  {safeT('orders.default_price', 'السعر الافتراضي')}: {basePricingUnitPrice.toLocaleString()} {t('common.currency')} / {pricingUnitLabel}
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => setCustomPriceOpen(false)}>
                  {t('common.save') || 'حفظ'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setCustomUnitPriceInput('');
                    setCustomPriceOpen(false);
                  }}
                >
                  {safeT('orders.use_default_price', 'استخدام السعر الافتراضي')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="sticky bottom-0 border-t border-border bg-background px-6 py-3 flex flex-row gap-2">
          <Button className="flex-1" onClick={handleConfirm} disabled={hasUnappliedOffer}>
            <Plus className="w-4 h-4 ms-2" />
            {hasUnappliedOffer
              ? (t('offers.must_apply_offer') || 'يجب تفعيل العرض أولاً')
              : (mode === 'edit' ? (t('orders.update_item') || 'تحديث المنتج') : t('orders.add_to_order'))}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => handleOpenChange(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductQuantityDialog;
