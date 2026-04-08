import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import AdaptiveScrollContainer from '@/components/ui/adaptive-scroll-container';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Gift, Package, User, Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Phone, MapPin, Printer, Users, ArrowRight, FileText } from 'lucide-react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useAuth } from '@/contexts/AuthContext';
import { useBluetoothPrinter } from '@/hooks/useBluetoothPrinter';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import ThermalPreview, { ThermalLine } from '@/components/stock/ThermalPreview';
import GiftsPrintView, { GiftPrintRow, SummaryRow } from '@/components/accounting/GiftsPrintView';
import GiftsPrintSettingsDialog, { GiftPrintSettings } from '@/components/accounting/GiftsPrintSettingsDialog';
import TemplatePrintDialog, { TemplatePrintConfig } from '@/components/accounting/TemplatePrintDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId?: string;
  workerName?: string;
}

interface GiftCustomerDetail {
  customerId: string;
  customerName: string;
  customerNameFr: string;
  storeName: string | null;
  storeNameFr: string | null;
  customerPhone: string;
  customerAddress: string;
  customerWilaya: string;
  sectorName: string;
  sectorNameFr: string;
  workerName: string;
  giftPieces: number;
  quantitySold: number;
  piecesPerBox: number;
  date: string;
}

interface GiftProductAgg {
  productId: string;
  productName: string;
  imageUrl: string | null;
  piecesPerBox: number;
  totalGiftPieces: number;
  totalQuantitySold: number;
  offerName: string;
  offerDetails: string[];  // each tier as separate entry
  customers: GiftCustomerDetail[];
}

const formatGiftDisplay = (giftPieces: number, piecesPerBox: number): string => {
  if (piecesPerBox <= 1) return `${giftPieces}`;
  const boxes = Math.floor(giftPieces / piecesPerBox);
  const remainingPieces = giftPieces % piecesPerBox;
  return `${boxes}.${String(remainingPieces).padStart(2, '0')}`;
};

const ARABIC_TO_LATIN: Record<string, string> = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th',
  'ج': 'dj', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'ch', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'dh', 'ع': 'a',
  'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'ou', 'ي': 'i', 'ى': 'a', 'ة': 'a', 'ئ': 'i', 'ؤ': 'ou',
  'ء': '', '\u064B': '', '\u064C': '', '\u064D': '', '\u064E': '', '\u064F': '',
  '\u0650': '', '\u0651': '', '\u0652': '',
};

function transliterate(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    result += ARABIC_TO_LATIN[ch] ?? ch;
  }
  return result.replace(/\s+/g, ' ').trim().substring(0, 20);
}

type OfferTierRule = {
  minQuantity: number;
  minQuantityUnit: 'box' | 'piece';
  giftQuantity: number;
  giftQuantityUnit: 'box' | 'piece';
  tierOrder: number;
  detail: string;
};

const normalizeOfferUnit = (unit: string | null | undefined): 'box' | 'piece' =>
  unit === 'box' ? 'box' : 'piece';

const toOfferDetail = (
  minQuantity: number,
  minUnit: 'box' | 'piece',
  giftQuantity: number,
  giftUnit: 'box' | 'piece'
): string => `${minQuantity}${minUnit === 'box' ? 'BOX' : 'PCS'}+${giftQuantity}${giftUnit === 'box' ? 'BOX' : 'PCS'}`;

const resolveAppliedOfferDetail = ({
  rules,
  soldQuantity,
  piecesPerBox,
}: {
  rules: OfferTierRule[];
  soldQuantity: number;
  piecesPerBox: number;
}): string => {
  if (!rules.length) return '';

  const safePieces = Math.max(1, piecesPerBox || 1);
  const matchingRules = rules.filter((rule) => {
    const soldComparable = rule.minQuantityUnit === 'box' ? soldQuantity : soldQuantity * safePieces;
    return soldComparable + 1e-6 >= rule.minQuantity;
  });

  return (matchingRules.length > 0 ? matchingRules[matchingRules.length - 1] : rules[0]).detail;
};

/** Carousel view for expanded gift product with customer overlay */
const GiftExpandedCarousel: React.FC<{
  items: GiftProductAgg[];
  expandedProduct: string;
  onNavigate: (id: string) => void;
  onClose: () => void;
}> = ({ items, expandedProduct, onNavigate, onClose }) => {
  const currentIdx = items.findIndex(i => (i.productId + '_' + i.offerName) === expandedProduct);
  const item = items[currentIdx];
  if (!item) return null;

  const getKey = (i: GiftProductAgg) => i.productId + '_' + i.offerName;

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIdx > 0) onNavigate(getKey(items[currentIdx - 1]));
  };
  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIdx < items.length - 1) onNavigate(getKey(items[currentIdx + 1]));
  };

  return (
    <div className="flex flex-col gap-2 pb-2">
      {/* Navigation with thumbnails */}
      <div className="flex items-center justify-between px-1 py-1.5 gap-2">
        {currentIdx > 0 ? (
          <button onClick={goPrev} className="w-10 h-10 rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors shrink-0">
            {items[currentIdx - 1].imageUrl ? (
              <img src={items[currentIdx - 1].imageUrl!} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Package className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </button>
        ) : (
          <div className="w-10 h-10 shrink-0" />
        )}
        <span className="text-xs text-muted-foreground">{currentIdx + 1} / {items.length}</span>
        {currentIdx < items.length - 1 ? (
          <button onClick={goNext} className="w-10 h-10 rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors shrink-0">
            {items[currentIdx + 1].imageUrl ? (
              <img src={items[currentIdx + 1].imageUrl!} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Package className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </button>
        ) : (
          <div className="w-10 h-10 shrink-0" />
        )}
      </div>

      {/* Product card with customer overlay */}
      <div
        className="flex flex-col rounded-2xl overflow-hidden shadow-lg border-2 border-primary ring-2 ring-primary/30 cursor-pointer"
        onClick={onClose}
      >
        <div className="px-3 py-2 text-center bg-primary">
          <span className="font-bold text-sm block truncate text-primary-foreground">{item.productName}</span>
          {item.offerDetails.length > 0 ? (
            <span className="inline-block mt-0.5 text-[10px] font-bold text-primary-foreground/90 bg-primary-foreground/15 rounded px-1.5 py-0.5">{item.offerDetails.join(' | ')}</span>
          ) : item.offerName ? (
            <span className="text-[10px] text-primary-foreground/70 block truncate">{item.offerName}</span>
          ) : null}
        </div>

        <div className="relative w-full overflow-hidden bg-muted h-[38vh] min-h-[200px] max-h-[400px]">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.productName} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="w-16 h-16 text-primary/30" />
            </div>
          )}

          {item.customers.length > 0 && (
            <>
              <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
              <AdaptiveScrollContainer
                className="absolute inset-0 z-10"
                maxHeightClassName="absolute inset-0"
                contentClassName="p-3 space-y-1.5"
              >
                {item.customers.map((c, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-card/80 border border-border/60 text-sm"
                    dir="rtl"
                  >
                    <div className="flex flex-col min-w-0 gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate font-medium">{c.storeName || c.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {c.sectorName && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" /> {c.sectorName}
                          </span>
                        )}
                        {c.customerPhone && <span dir="ltr" className="shrink-0">{c.customerPhone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-primary text-base">
                        🎁 {formatGiftDisplay(c.giftPieces, item.piecesPerBox)}
                      </span>
                    </div>
                  </div>
                ))}
              </AdaptiveScrollContainer>
            </>
          )}
        </div>

        <div className="px-2 py-2 bg-card flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center justify-center gap-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 py-1.5 text-sm font-bold">
              🎁 {formatGiftDisplay(item.totalGiftPieces, item.piecesPerBox)}
            </div>
            <div className="flex items-center justify-center gap-1 rounded-md bg-muted py-1.5 px-2 text-xs font-semibold text-muted-foreground">
              {item.customers.length} عميل
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const WorkerGiftsSummaryDialog: React.FC<Props> = ({ open, onOpenChange, workerId, workerName }) => {
  const { activeBranch } = useAuth();
  const { isConnected, scanAndConnect } = useBluetoothPrinter();
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [allWorkers, setAllWorkers] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | undefined>(workerId);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [printSettings, setPrintSettings] = useState<GiftPrintSettings | null>(null);
  const [templateConfig, setTemplateConfig] = useState<TemplatePrintConfig | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Date range: current month → 1st to today, past month → 1st to last day
  const periodStartDate = startOfMonth(currentMonth);
  const periodEndDate = isSameMonth(currentMonth, new Date()) ? new Date() : endOfMonth(currentMonth);
  const periodDateLabel = `${format(periodStartDate, 'dd/MM/yyyy')} → ${format(periodEndDate, 'dd/MM/yyyy')}`;

  const periodStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const periodEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
  const periodStartTz = periodStart + 'T00:00:00+01:00';
  const periodEndTz = periodEnd + 'T23:59:59+01:00';

  const effectiveWorkerId = allWorkers ? null : (selectedWorkerId || workerId);

  useRealtimeSubscription(
    `worker-gifts-realtime-${effectiveWorkerId || 'all'}`,
    [{ table: 'orders' }, { table: 'order_items' }, { table: 'promos' }],
    [['worker-gifts-summary', effectiveWorkerId, periodStart, periodEnd]],
    open
  );

  // Fetch workers for names
  const { data: workersMap = {} } = useQuery({
    queryKey: ['workers-names-map', activeBranch?.id],
    queryFn: async () => {
      const { data } = await supabase.from('workers').select('id, full_name').eq('is_active', true);
      const map: Record<string, string> = {};
      (data || []).forEach(w => { map[w.id] = w.full_name; });
      return map;
    },
    enabled: open,
  });

  const effectiveWorkerName = allWorkers ? 'جميع العمال' : (workersMap[effectiveWorkerId || ''] || workerName || '');
  const workersList = useMemo(() => Object.entries(workersMap).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)), [workersMap]);

  const { data: giftsData, isLoading } = useQuery({
    queryKey: ['worker-gifts-summary', effectiveWorkerId, periodStart, periodEnd, allWorkers],
    queryFn: async () => {
      // Fetch delivered orders
      let ordersQuery = supabase
        .from('orders')
        .select('id, customer_id, assigned_worker_id, created_by, updated_at, notes, customer:customers(name, name_fr, store_name, store_name_fr, phone, address, wilaya, sector:sectors(name, name_fr))')
        .in('status', ['delivered', 'completed', 'confirmed'])
        .gte('updated_at', periodStartTz)
        .lte('updated_at', periodEndTz);

      if (effectiveWorkerId) {
        ordersQuery = ordersQuery.or(`assigned_worker_id.eq.${effectiveWorkerId},created_by.eq.${effectiveWorkerId}`);
      }
      if (activeBranch?.id) {
        ordersQuery = ordersQuery.eq('branch_id', activeBranch.id);
      }

      const { data: orders } = await ordersQuery;
      if (!orders || orders.length === 0) return { items: [], totalGifts: 0 };

      const orderIds = orders.map(o => o.id);

      // Fetch order items with gifts
      const { data: items } = await supabase
        .from('order_items')
        .select('order_id, product_id, quantity, gift_quantity, gift_offer_id, pieces_per_box, product:products(name, pieces_per_box, image_url)')
        .in('order_id', orderIds)
        .gt('gift_quantity', 0);

      // Fetch offer names + rules (single tier or multi-tier)
      const giftOfferIds = new Set<string>();
      (items || []).forEach(i => { if (i.gift_offer_id) giftOfferIds.add(i.gift_offer_id); });
      const offerNamesMap: Record<string, string> = {};
      const offerRulesMap: Record<string, OfferTierRule[]> = {};

      if (giftOfferIds.size > 0) {
        const offerIds = Array.from(giftOfferIds);
        const { data: offers } = await supabase
          .from('product_offers')
          .select('id, name, min_quantity, min_quantity_unit, gift_quantity, gift_quantity_unit')
          .in('id', offerIds);

        (offers || []).forEach((o: any) => {
          offerNamesMap[o.id] = o.name;
          const minQuantityUnit = normalizeOfferUnit(o.min_quantity_unit);
          const giftQuantityUnit = normalizeOfferUnit(o.gift_quantity_unit);
          const minQuantity = Number(o.min_quantity || 0);
          const giftQuantity = Number(o.gift_quantity || 0);

          offerRulesMap[o.id] = [{
            minQuantity,
            minQuantityUnit,
            giftQuantity,
            giftQuantityUnit,
            tierOrder: 0,
            detail: toOfferDetail(minQuantity, minQuantityUnit, giftQuantity, giftQuantityUnit),
          }];
        });

        // Multi-tier: replace default rule with explicit tier rules
        const { data: tiers } = await supabase
          .from('product_offer_tiers')
          .select('offer_id, min_quantity, min_quantity_unit, gift_quantity, gift_quantity_unit, tier_order')
          .in('offer_id', offerIds)
          .order('tier_order', { ascending: true });

        if (tiers && tiers.length > 0) {
          const tiersByOffer: Record<string, any[]> = {};
          tiers.forEach((t: any) => {
            if (!t.offer_id) return;
            if (!tiersByOffer[t.offer_id]) tiersByOffer[t.offer_id] = [];
            tiersByOffer[t.offer_id].push(t);
          });

          for (const [oid, offerTiers] of Object.entries(tiersByOffer)) {
            const mappedRules: OfferTierRule[] = offerTiers
              .map((t: any) => {
                const minQuantityUnit = normalizeOfferUnit(t.min_quantity_unit);
                const giftQuantityUnit = normalizeOfferUnit(t.gift_quantity_unit);
                const minQuantity = Number(t.min_quantity || 0);
                const giftQuantity = Number(t.gift_quantity || 0);
                return {
                  minQuantity,
                  minQuantityUnit,
                  giftQuantity,
                  giftQuantityUnit,
                  tierOrder: Number(t.tier_order || 0),
                  detail: toOfferDetail(minQuantity, minQuantityUnit, giftQuantity, giftQuantityUnit),
                };
              })
              .filter(rule => rule.minQuantity > 0 && rule.giftQuantity > 0)
              .sort((a, b) => (a.tierOrder - b.tierOrder) || (a.minQuantity - b.minQuantity));

            if (mappedRules.length > 0) {
              offerRulesMap[oid] = mappedRules;
            }
          }
        }
      }

      const orderMap = new Map(orders.map(o => [o.id, o]));
      const agg: Record<string, GiftProductAgg> = {};

      for (const item of (items || [])) {
        const order = orderMap.get(item.order_id) as any;
        if (!order) continue;

        const piecesPerBox = Number((item as any).pieces_per_box || (item as any).product?.pieces_per_box || 1);
        const rawGift = Number(item.gift_quantity || 0);
        const isDirectSale = String(order?.notes || '').includes('بيع مباشر');
        const giftPieces = (isDirectSale || piecesPerBox <= 1) ? rawGift : rawGift * piecesPerBox;
        const soldQty = Math.max(0, Number(item.quantity || 0) - (piecesPerBox > 0 ? giftPieces / piecesPerBox : 0));

        const offerId = item.gift_offer_id || 'unknown';
        const offerRules = offerRulesMap[offerId] || [];
        const appliedOfferDetail = resolveAppliedOfferDetail({
          rules: offerRules,
          soldQuantity: soldQty,
          piecesPerBox,
        }) || offerRules[0]?.detail || '';
        const key = `${item.product_id}_${offerId}_${appliedOfferDetail || 'default'}`;

        if (!agg[key]) {
          agg[key] = {
            productId: item.product_id,
            productName: (item as any).product?.name || 'منتج غير معروف',
            imageUrl: (item as any).product?.image_url || null,
            piecesPerBox,
            totalGiftPieces: 0,
            totalQuantitySold: 0,
            offerName: offerNamesMap[offerId] || '',
            offerDetails: appliedOfferDetail ? [appliedOfferDetail] : [],
            customers: [],
          };
        }

        agg[key].totalGiftPieces += giftPieces;
        agg[key].totalQuantitySold += soldQty;

        const deliveryWorkerId = order.assigned_worker_id || order.created_by;

        const existing = agg[key].customers.find(c => c.customerId === order.customer_id && c.workerName === (workersMap[deliveryWorkerId] || ''));
        if (existing) {
          existing.giftPieces += giftPieces;
          existing.quantitySold += soldQty;
        } else {
          agg[key].customers.push({
            customerId: order.customer_id || '',
            customerName: order.customer?.name || '',
            customerNameFr: (order.customer as any)?.name_fr || '',
            storeName: order.customer?.store_name || null,
            storeNameFr: (order.customer as any)?.store_name_fr || null,
            customerPhone: order.customer?.phone || '',
            customerAddress: (order.customer as any)?.address || '',
            customerWilaya: (order.customer as any)?.wilaya || '',
            sectorName: order.customer?.sector?.name || '',
            sectorNameFr: (order.customer?.sector as any)?.name_fr || '',
            workerName: workersMap[deliveryWorkerId] || '',
            giftPieces,
            quantitySold: soldQty,
            piecesPerBox,
            date: order.updated_at || '',
          });
        }
      }

      // Also check promos table
      let promosQuery = supabase
        .from('promos')
        .select('product_id, worker_id, vente_quantity, gratuite_quantity, notes, promo_date, customer_id, customer:customers(name, name_fr, store_name, store_name_fr, phone, sector:sectors(name, name_fr)), product:products(name, pieces_per_box, image_url)')
        .gt('gratuite_quantity', 0)
        .gte('promo_date', periodStartTz)
        .lte('promo_date', periodEndTz);
      if (effectiveWorkerId) {
        promosQuery = promosQuery.eq('worker_id', effectiveWorkerId);
      }
      const { data: promosData } = await promosQuery;

      const promoProductIds = [...new Set((promosData || []).map(p => p.product_id))];
      let offerUnitMap: Record<string, string> = {};
      if (promoProductIds.length > 0) {
        const { data: productOffers } = await supabase
          .from('product_offers')
          .select('id, product_id, gift_quantity_unit')
          .in('product_id', promoProductIds)
          .eq('is_active', true);
        (productOffers || []).forEach(o => { offerUnitMap[o.product_id] = o.gift_quantity_unit || 'piece'; });
      }

      const orderGiftsByProduct: Record<string, number> = {};
      Object.values(agg).forEach(p => {
        orderGiftsByProduct[p.productId] = (orderGiftsByProduct[p.productId] || 0) + p.totalGiftPieces;
      });

      const promosByProduct: Record<string, { totalGiftPieces: number; totalVente: number; product: any; customers: GiftCustomerDetail[] }> = {};
      for (const promo of (promosData || [])) {
        const giftQty = Number(promo.gratuite_quantity || 0);
        if (giftQty <= 0) continue;
        const piecesPerBox = Number((promo.product as any)?.pieces_per_box || 1);
        const giftUnit = offerUnitMap[promo.product_id] || 'piece';
        const isDirectSalePromo = String(promo?.notes || '').includes('بيع مباشر');
        const giftInPieces = (isDirectSalePromo || piecesPerBox <= 1) ? giftQty : (giftUnit === 'box' ? giftQty * piecesPerBox : giftQty);

        if (!promosByProduct[promo.product_id]) {
          promosByProduct[promo.product_id] = { totalGiftPieces: 0, totalVente: 0, product: promo.product, customers: [] };
        }
        promosByProduct[promo.product_id].totalGiftPieces += giftInPieces;
        promosByProduct[promo.product_id].totalVente += Number(promo.vente_quantity || 0);
        promosByProduct[promo.product_id].customers.push({
          customerId: (promo as any).customer_id || '',
          customerName: (promo as any).customer?.name || '',
          customerNameFr: (promo as any).customer?.name_fr || '',
          storeName: (promo as any).customer?.store_name || null,
          storeNameFr: (promo as any).customer?.store_name_fr || null,
          customerPhone: (promo as any).customer?.phone || '',
          customerAddress: (promo as any).customer?.address || '',
          customerWilaya: (promo as any).customer?.wilaya || '',
          sectorName: (promo as any).customer?.sector?.name || '',
          sectorNameFr: (promo as any).customer?.sector?.name_fr || '',
          workerName: workersMap[(promo as any).worker_id] || '',
          giftPieces: giftInPieces,
          quantitySold: Number(promo.vente_quantity || 0),
          piecesPerBox,
          date: (promo as any).promo_date || '',
        });
      }

      for (const [productId, promoAgg] of Object.entries(promosByProduct)) {
        const alreadyTracked = orderGiftsByProduct[productId] || 0;
        const extra = promoAgg.totalGiftPieces - alreadyTracked;
        if (extra <= 0) continue;
        const product = promoAgg.product as any;
        const key = `${productId}_promo`;
        agg[key] = {
          productId,
          productName: product?.name || '',
          imageUrl: product?.image_url || null,
          piecesPerBox: Number(product?.pieces_per_box || 1),
          totalGiftPieces: extra,
          totalQuantitySold: promoAgg.totalVente,
          offerName: 'عرض ترويجي',
          offerDetails: ['Directe'],
          customers: promoAgg.customers,
        };
      }

      const sorted = Object.values(agg).sort((a, b) => b.totalGiftPieces - a.totalGiftPieces);
      const totalGifts = sorted.reduce((s, i) => s + i.totalGiftPieces, 0);

      return { items: sorted, totalGifts };
    },
    enabled: open,
    refetchInterval: open ? 15000 : false,
  });

  const uniqueCustomerCount = useMemo(() => {
    if (!giftsData?.items) return 0;
    const ids = new Set<string>();
    giftsData.items.forEach(item => item.customers.forEach(c => ids.add(c.customerId)));
    return ids.size;
  }, [giftsData]);

  // Build thermal preview lines
  const thermalLines = useMemo((): ThermalLine[] => {
    if (!giftsData?.items?.length) return [];
    const lines: ThermalLine[] = [];
    
    lines.push({ text: 'RECAPITULATIF PROMOS', bold: true, center: true, large: true });
    lines.push({ text: periodDateLabel, center: true });
    lines.push({ text: !allWorkers && workerName ? transliterate(workerName) : 'Tous les travailleurs', center: true });
    lines.push({ separator: true });
    
    // Assign a unique code per tier (each tier gets its own P code)
    const itemCodeMap: string[][] = []; // per item, list of codes assigned
    const legendEntries: { code: string; productName: string; detail: string }[] = [];
    let codeIndex = 1;
    for (const item of giftsData.items) {
      const prodName = transliterate(item.productName).substring(0, 16);
      const tierDetails = item.offerDetails.length > 0 ? item.offerDetails : [transliterate(item.offerName || item.productName)];
      const codes: string[] = [];
      for (const detail of tierDetails) {
        const code = `P${codeIndex}`;
        legendEntries.push({ code, productName: prodName, detail });
        codes.push(code);
        codeIndex++;
      }
      itemCodeMap.push(codes);
    }

    const hdr = 'Produit'.padEnd(12) + 'Qte'.padStart(7) + 'Cli'.padStart(4) + 'Code'.padStart(5);
    lines.push({ text: hdr, bold: true });
    lines.push({ separator: true });
    
    for (let idx = 0; idx < giftsData.items.length; idx++) {
      const item = giftsData.items[idx];
      const codes = itemCodeMap[idx] || [];
      const codeLabel = codes.join(',');
      const name = transliterate(item.productName).substring(0, 12).padEnd(12);
      const qty = formatGiftDisplay(item.totalGiftPieces, item.piecesPerBox).padStart(7);
      const cli = String(item.customers.length).padStart(4);
      lines.push({ text: name + qty + cli + codeLabel.padStart(5) });
    }
    
    lines.push({ separator: true });
    const totalLine = 'TOTAL'.padEnd(12) + String(giftsData.totalGifts).padStart(7) + String(uniqueCustomerCount).padStart(4);
    lines.push({ text: totalLine, bold: true });
    lines.push({ separator: true });

    // Legend section - product name + detail on one line, separator between products
    lines.push({ text: 'LEGENDE OFFRES:', bold: true });
    lines.push({ dotSeparator: true });
    let lastProductName = '';
    for (const entry of legendEntries) {
      if (lastProductName && lastProductName !== entry.productName) {
        lines.push({ dotSeparator: true });
      }
      const combined = `${entry.code}: ${entry.productName}`;
      const detailPart = entry.detail.substring(0, 30 - combined.length);
      lines.push({ text: `${combined} ${detailPart}` });
      lastProductName = entry.productName;
    }
    lines.push({ separator: true });

    lines.push({ text: format(new Date(), 'dd/MM/yyyy HH:mm'), center: true });
    lines.push({ text: 'Laser Food', center: true });
    
    return lines;
  }, [giftsData, allWorkers, workerName, periodDateLabel, uniqueCustomerCount]);

  // Build flat print rows for A4 printing
  const printRows = useMemo((): GiftPrintRow[] => {
    if (!giftsData?.items?.length) return [];
    const rows: GiftPrintRow[] = [];
    const productFilter = printSettings?.productFilter;
    for (const item of giftsData.items) {
      if (productFilter && productFilter !== 'all' && item.productId !== productFilter) continue;
      for (const c of item.customers) {
        const ppb = c.piecesPerBox || item.piecesPerBox || 1;
        rows.push({
          customerName: c.customerName || '-',
          customerNameFr: c.customerNameFr || '',
          storeName: c.storeName || '',
          storeNameFr: c.storeNameFr || '',
          sector: c.sectorNameFr || c.sectorName || '',
          address: c.customerAddress || '',
          wilaya: c.customerWilaya || '',
          phone: c.customerPhone || '',
          productName: item.productName,
          offerDetail: item.offerDetails?.[0] || '',
          venteQuantity: Math.round(c.quantitySold),
          giftQuantity: c.giftPieces,
          giftBoxPiece: formatGiftDisplay(c.giftPieces, ppb),
          workerName: c.workerName || '-',
          date: c.date || '',
          piecesPerBox: ppb,
        });
      }
    }
    return rows;
  }, [giftsData, printSettings]);

  // Build summary rows for the summary page
  const { summaryRows, summaryWorkerNames } = useMemo(() => {
    if (!giftsData?.items?.length) return { summaryRows: [] as SummaryRow[], summaryWorkerNames: [] as string[] };
    const workerSet = new Set<string>();
    const rows: SummaryRow[] = [];
    const productFilter = printSettings?.productFilter;

    for (const item of giftsData.items) {
      if (productFilter && productFilter !== 'all' && item.productId !== productFilter) continue;
      // Build offer detail string like "50 box + 1 box gift"
      const offerDetail = item.offerDetails?.length
        ? item.offerDetails.join(' | ')
        : item.offerName || '-';

      const workerGifts: Record<string, number> = {};
      for (const c of item.customers) {
        const wName = c.workerName || '-';
        workerSet.add(wName);
        workerGifts[wName] = (workerGifts[wName] || 0) + c.giftPieces;
      }

      rows.push({
        productName: item.productName,
        offerDetail,
        workerGifts,
        piecesPerBox: item.piecesPerBox || 1,
      });
    }

    return { summaryRows: rows, summaryWorkerNames: Array.from(workerSet).sort() };
  }, [giftsData, printSettings]);

  // Available products for filter
  const availableProducts = useMemo(() => {
    if (!giftsData?.items?.length) return [];
    return giftsData.items.map(item => ({ id: item.productId, name: item.productName }));
  }, [giftsData]);

  // Available offers for template dialog
  const templateOfferOptions = useMemo(() => {
    if (!giftsData?.items?.length) return [];
    const options: { productId: string; detail: string }[] = [];
    for (const item of giftsData.items) {
      for (const detail of (item.offerDetails || [])) {
        options.push({ productId: item.productId, detail });
      }
    }
    return options;
  }, [giftsData]);

  const printProductLabel = useMemo(() => {
    if (!printSettings || printSettings.productFilter === 'all') return 'Tous les produits';
    return giftsData?.items?.find(i => i.productId === printSettings.productFilter)?.productName || '';
  }, [printSettings, giftsData]);

  const handleA4Print = useCallback((settings: GiftPrintSettings) => {
    if (settings.isTemplate) {
      // Open template dialog instead of printing directly
      setPrintSettings(settings);
      setShowTemplateDialog(true);
      return;
    }
    setPrintSettings(settings);
    setTemplateConfig(null);
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setShowPrintView(false), 500);
    }, 200);
  }, []);

  const handleTemplatePrint = useCallback((config: TemplatePrintConfig) => {
    setTemplateConfig(config);
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setShowPrintView(false), 500);
    }, 200);
  }, []);

  const handleThermalPrint = useCallback(async () => {
    if (!giftsData?.items?.length) return;
    setIsPrinting(true);
    try {
      if (!isConnected) {
        const connected = await scanAndConnect();
        if (!connected) { setIsPrinting(false); return; }
      }

      const ESC = 0x1B;
      const GS = 0x1D;
      const LF = 0x0A;
      const LINE_WIDTH = 32;

      const encoder = new TextEncoder();
      const chunks: Uint8Array[] = [];

      const push = (...arrs: Uint8Array[]) => arrs.forEach(a => chunks.push(a));
      const cmd = (...bytes: number[]) => new Uint8Array(bytes);
      const text = (s: string) => encoder.encode(s);
      const line = (s: string) => { push(text(s), cmd(LF)); };
      const center = () => push(cmd(ESC, 0x61, 1));
      const left = () => push(cmd(ESC, 0x61, 0));
      const bold = (on: boolean) => push(cmd(ESC, 0x45, on ? 1 : 0));
      const dblH = (on: boolean) => push(cmd(GS, 0x21, on ? 0x01 : 0x00));
      const sep = () => line('-'.repeat(LINE_WIDTH));

      push(cmd(ESC, 0x40));
      center();
      bold(true);
      dblH(true);
      line('RECAPITULATIF PROMOS');
      dblH(false);
      bold(false);

      line(periodDateLabel);
      if (!allWorkers && workerName) {
        line(transliterate(workerName));
      } else {
        line('Tous les travailleurs');
      }
      sep();

      // Build offer codes - each tier gets its own P code
      const btItemCodeMap: string[][] = [];
      const btLegendEntries: { code: string; productName: string; detail: string }[] = [];
      let codeIndex = 1;
      for (const item of giftsData.items) {
        const prodName = transliterate(item.productName).substring(0, 16);
        const tierDetails = item.offerDetails.length > 0 ? item.offerDetails : [transliterate(item.offerName || item.productName)];
        const codes: string[] = [];
        for (const detail of tierDetails) {
          const code = `P${codeIndex}`;
          btLegendEntries.push({ code, productName: prodName, detail });
          codes.push(code);
          codeIndex++;
        }
        btItemCodeMap.push(codes);
      }

      left();
      bold(true);
      const hdr = 'Produit'.padEnd(12) + 'Qte'.padStart(7) + 'Cli'.padStart(4) + 'Code'.padStart(5);
      line(hdr);
      bold(false);
      sep();

      for (let idx = 0; idx < giftsData.items.length; idx++) {
        const item = giftsData.items[idx];
        const codes = btItemCodeMap[idx] || [];
        const codeLabel = codes.join(',');
        const name = transliterate(item.productName).substring(0, 12).padEnd(12);
        const qty = formatGiftDisplay(item.totalGiftPieces, item.piecesPerBox).padStart(7);
        const cli = String(item.customers.length).padStart(4);
        line(name + qty + cli + codeLabel.padStart(5));
      }

      sep();
      bold(true);
      const totalLine = 'TOTAL'.padEnd(12) + String(giftsData.totalGifts).padStart(7) + String(uniqueCustomerCount).padStart(4);
      line(totalLine);
      bold(false);
      sep();

      // Legend
      bold(true);
      line('LEGENDE OFFRES:');
      bold(false);
      line('.'.repeat(LINE_WIDTH));
      let lastProd = '';
      for (const entry of btLegendEntries) {
        if (lastProd && lastProd !== entry.productName) {
          line('.'.repeat(LINE_WIDTH));
        }
        const combined = `${entry.code}: ${entry.productName}`;
        const detailPart = entry.detail.substring(0, LINE_WIDTH - combined.length - 1);
        line(`${combined} ${detailPart}`);
        lastProd = entry.productName;
      }
      sep();

      center();
      line(format(new Date(), 'dd/MM/yyyy HH:mm'));
      line('Laser Food');

      push(cmd(LF, LF, LF));
      push(cmd(GS, 0x56, 0x00));

      const totalLen = chunks.reduce((s, c) => s + c.length, 0);
      const merged = new Uint8Array(totalLen);
      let offset = 0;
      for (const c of chunks) { merged.set(c, offset); offset += c.length; }

      const { bluetoothPrinter } = await import('@/services/bluetoothPrinter');
      await bluetoothPrinter.print(merged);

      const { toast } = await import('sonner');
      toast.success('تمت الطباعة بنجاح');
      setShowPreview(false);
    } catch (err: any) {
      const { toast } = await import('sonner');
      toast.error('فشل الطباعة: ' + (err.message || ''));
    } finally {
      setIsPrinting(false);
    }
  }, [giftsData, isConnected, scanAndConnect, allWorkers, workerName, periodDateLabel, uniqueCustomerCount]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92dvh] min-h-0 overflow-hidden flex flex-col" dir="rtl">
        {!expandedProduct && (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-purple-600" />
              {allWorkers ? 'تجميع العروض - جميع العمال' : `تجميع العروض - ${effectiveWorkerName || ''}`}
            </DialogTitle>
          </DialogHeader>
        )}

        {!expandedProduct && (
          <>
            {/* Controls: all workers toggle + worker picker + month navigation */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch id="all-workers" checked={allWorkers} onCheckedChange={setAllWorkers} />
                  <Label htmlFor="all-workers" className="text-xs cursor-pointer flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    جميع العمال
                  </Label>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="gap-1 text-[10px] h-7" onClick={() => setShowPrintSettings(true)} disabled={!giftsData?.items?.length}>
                    <FileText className="w-3 h-3" />
                    طباعة A4
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1 text-[10px] h-7" onClick={() => setShowPreview(prev => !prev)} disabled={!giftsData?.items?.length}>
                    <Printer className="w-3 h-3" />
                    {showPreview ? 'إخفاء' : 'حرارية'}
                  </Button>
                </div>
              </div>

              {!allWorkers && workersList.length > 0 && (
                <Select value={selectedWorkerId || workerId || ''} onValueChange={setSelectedWorkerId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="اختر العامل" />
                  </SelectTrigger>
                  <SelectContent>
                    {workersList.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex items-center justify-center gap-2 bg-muted/30 rounded-lg p-1.5">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1.5 min-w-[140px] justify-center">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{format(currentMonth, 'MMMM yyyy', { locale: ar })}</span>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 items-center text-xs">
              <Badge variant="secondary" className="text-xs">{giftsData?.items?.length || 0} منتج</Badge>
              <Badge className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0">🎁 {giftsData?.totalGifts || 0} قطعة عروض</Badge>
              <Badge variant="outline" className="text-xs">{uniqueCustomerCount} عميل</Badge>
            </div>

            {/* Thermal Preview */}
            {showPreview && thermalLines.length > 0 && (
              <div className="space-y-2">
                <ThermalPreview lines={thermalLines} showLegendToggle={false} />
                <Button size="sm" className="w-full gap-1.5" onClick={handleThermalPrint} disabled={isPrinting}>
                  <Printer className="w-3.5 h-3.5" />
                  {isPrinting ? 'جاري الطباعة...' : 'طباعة حرارية 48mm'}
                </Button>
              </div>
            )}
          </>
        )}

        <ScrollArea className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : !giftsData?.items?.length && !expandedProduct ? (
            <div className="py-10 text-center text-muted-foreground">
              <Gift className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>لا توجد عروض في هذه الفترة</p>
            </div>
          ) : expandedProduct ? (
            <GiftExpandedCarousel
              items={giftsData!.items}
              expandedProduct={expandedProduct}
              onNavigate={setExpandedProduct}
              onClose={() => setExpandedProduct(null)}
            />
          ) : (
            <div className="grid grid-cols-3 gap-2 pb-2">
              {giftsData!.items.map((item) => {
                const toggleKey = item.productId + '_' + item.offerName;
                return (
                  <div
                    key={toggleKey}
                    className="flex flex-col rounded-2xl overflow-hidden shadow-lg border-2 border-border hover:border-purple-400/50 cursor-pointer active:scale-[0.97] transition-all"
                    onClick={() => setExpandedProduct(toggleKey)}
                  >
                    <div className="px-2 py-1.5 border-b text-center bg-muted border-border">
                      <span className="font-bold text-xs leading-tight block truncate text-foreground">{item.productName}</span>
                      {item.offerDetails.length > 0 ? (
                        <span className="inline-block mt-0.5 text-[9px] font-bold text-primary bg-primary/10 rounded px-1 py-0.5 truncate max-w-full">{item.offerDetails.join(' | ')}</span>
                      ) : item.offerName ? (
                        <span className="text-[8px] text-muted-foreground block truncate">{item.offerName}</span>
                      ) : null}
                    </div>
                    <div className="w-full aspect-square bg-muted overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-10 h-10 text-primary/30" />
                        </div>
                      )}
                    </div>
                    <div className="px-1.5 py-1.5 bg-card flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <div className="flex-1 flex items-center justify-center gap-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 py-1 text-xs font-bold">
                          🎁 {formatGiftDisplay(item.totalGiftPieces, item.piecesPerBox)}
                        </div>
                      </div>
                      <div className="flex items-center justify-center rounded-md bg-muted py-1 text-[10px] font-semibold text-muted-foreground">
                        عميل {item.customers.length} • ({item.totalGiftPieces} قطعة)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
      <GiftsPrintView
        ref={printRef}
        rows={printRows}
        summaryRows={summaryRows}
        workerNames={summaryWorkerNames}
        workerName={allWorkers ? 'Tous les employés' : effectiveWorkerName}
        dateRange={periodDateLabel}
        productFilter={printProductLabel}
        isVisible={showPrintView}
        visibleColumns={printSettings?.columns}
        separateByProduct={printSettings?.separateByProduct ?? true}
        printSummary={printSettings?.printSummary ?? false}
        summaryOnly={printSettings?.summaryOnly ?? false}
        isTemplate={printSettings?.isTemplate ?? false}
        templatePageCount={templateConfig?.pageCount ?? 2}
        templateProductName={templateConfig?.productName ?? ''}
        templateOfferDetail={templateConfig?.offerDetail ?? ''}
      />
      <GiftsPrintSettingsDialog
        open={showPrintSettings}
        onOpenChange={setShowPrintSettings}
        products={availableProducts}
        onPrint={handleA4Print}
        isAdmin={!!activeBranch || true}
      />
      <TemplatePrintDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        products={availableProducts}
        offers={templateOfferOptions}
        onPrint={handleTemplatePrint}
      />
    </Dialog>
  );
};

export default WorkerGiftsSummaryDialog;
