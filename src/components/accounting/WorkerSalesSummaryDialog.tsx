import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import AdaptiveScrollContainer from '@/components/ui/adaptive-scroll-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag, Package, User, Clock, Calendar, ChevronLeft, ChevronRight, ChevronDown, TrendingUp } from 'lucide-react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { inferPricingSubtype } from '@/utils/pricingSubtype';
import { buildPricingGroups } from './PricingGroupsSummary';
import PricingGroupsSummary from './PricingGroupsSummary';
/** Format quantity as boxes.pieces (e.g. 1.05 = 1 box + 5 pieces) */
const formatBoxPieces = (qty: number, piecesPerBox: number | null): string => {
  if (!piecesPerBox || piecesPerBox <= 0) return String(qty);
  const boxes = Math.floor(qty / piecesPerBox);
  const pieces = qty % piecesPerBox;
  return `${boxes}.${String(pieces).padStart(2, '0')}`;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId?: string;
  workerName?: string;
}

interface CustomerBreakdown {
  customerId: string;
  customerName: string;
  storeName: string | null;
  phone: string | null;
  deliveryTime: string | null;
  quantity: number;
  giftQuantity: number;
  totalAmount: number;
}

interface ProductAgg {
  productId: string;
  name: string;
  quantity: number;
  giftQuantity: number;
  totalAmount: number;
  piecesPerBox: number | null;
  imageUrl: string | null;
  customers: CustomerBreakdown[];
}

/** Carousel view for expanded product with customer overlay */
const ExpandedCarousel: React.FC<{
  items: ProductAgg[];
  expandedProduct: string;
  onNavigate: (id: string) => void;
  onClose: () => void;
}> = ({ items, expandedProduct, onNavigate, onClose }) => {
  const currentIdx = items.findIndex(i => i.productId === expandedProduct);
  const item = items[currentIdx];
  if (!item) return null;

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIdx > 0) onNavigate(items[currentIdx - 1].productId);
  };
  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIdx < items.length - 1) onNavigate(items[currentIdx + 1].productId);
  };

  return (
    <div className="flex flex-col gap-2 pb-2">
      {/* Navigation with thumbnails */}
      <div className="flex items-center justify-between px-1 py-1.5 gap-2">
        {/* Previous thumbnail */}
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

        <span className="text-xs text-muted-foreground">
          {currentIdx + 1} / {items.length}
        </span>

        {/* Next thumbnail */}
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

      {/* Product card */}
      <div
        className="flex flex-col rounded-2xl overflow-hidden shadow-lg border-2 border-primary ring-2 ring-primary/30 cursor-pointer"
        onClick={onClose}
      >
        {/* Product name */}
        <div className="px-3 py-2 text-center bg-primary">
          <span className="font-bold text-sm block truncate text-primary-foreground">
            {item.name}
          </span>
        </div>

        {/* Image area with guaranteed height + customer overlay */}
        <div className="relative w-full overflow-hidden bg-muted h-[38vh] min-h-[200px] max-h-[400px]">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
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
                {item.customers.map((c) => (
                  <div
                    key={c.customerId}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-card/80 border border-border/60 text-sm" dir="rtl"
                  >
                    <div className="flex flex-col min-w-0 gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate font-medium">{c.storeName || c.customerName}</span>
                        {c.deliveryTime && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(c.deliveryTime).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {c.storeName && <span className="truncate">{c.customerName}</span>}
                        {c.phone && <span dir="ltr" className="shrink-0">{c.phone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-primary text-base">{c.quantity}</span>
                      {c.giftQuantity > 0 && (
                        <span className="text-xs text-muted-foreground">(+{formatBoxPieces(c.giftQuantity, item.piecesPerBox)})</span>
                      )}
                    </div>
                  </div>
                ))}
              </AdaptiveScrollContainer>
            </>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-2 py-2 bg-card flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 flex items-center justify-center gap-1 rounded-md bg-primary/10 text-primary py-1.5 text-sm font-bold">
              <Package className="w-3.5 h-3.5" />
              {item.quantity}
            </div>
            {item.giftQuantity > 0 && (
              <div className="flex items-center justify-center gap-1 rounded-md bg-secondary py-1.5 px-2 text-xs font-semibold text-secondary-foreground">
                🎁 {formatBoxPieces(item.giftQuantity, item.piecesPerBox)}
              </div>
            )}
          </div>
          <div className="flex items-center justify-center rounded-md bg-muted py-1.5 text-xs font-semibold text-muted-foreground">
            {item.totalAmount.toLocaleString('ar-DZ')} د.ج
          </div>
        </div>
      </div>
    </div>
  );
};

interface PriceTrackingRow { subtype: string; quantity: number; unitPrice: number; total: number; pricingUnit: string | null; weightPerBox: number | null; piecesPerBox: number | null; }
interface PriceTrackedProduct { productName: string; quantity: number; totalValue: number; pricingRows: PriceTrackingRow[]; }

const fmtQty = (v: number): string => {
  const rounded = Math.round(v * 100) / 100;
  if (rounded === Math.floor(rounded)) return rounded.toString();
  return rounded.toFixed(2).replace(/0+$/, '');
};

const subtypeLabelsMap: Record<string, string> = {
  retail: 'تجزئة', gros: 'جملة', super_gros: 'سوبر جملة', invoice: 'فاتورة 1',
};
const subtypeAbbrMap: Record<string, string> = { retail: 'D', gros: 'G', super_gros: 'SG', invoice: 'F1' };
const subtypeColorMap: Record<string, string> = {
  retail: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  gros: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  super_gros: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  invoice: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const PriceTrackingTab: React.FC<{ priceTracking: PriceTrackedProduct[] }> = ({ priceTracking }) => {
  if (!priceTracking.length) {
    return <p className="text-center text-muted-foreground py-6 text-sm">لا توجد بيانات</p>;
  }

  const totalQty = priceTracking.reduce((s, r) => s + r.quantity, 0);
  const totalValue = priceTracking.reduce((s, r) => s + r.totalValue, 0);

  const getUnitPrice = (row: PriceTrackingRow): { price: number | null; label: string } => {
    if (row.pricingUnit === 'kg' && row.weightPerBox && row.weightPerBox > 0)
      return { price: row.unitPrice / row.weightPerBox, label: 'DA/kg' };
    if (row.pricingUnit === 'unit' && row.piecesPerBox && row.piecesPerBox > 0)
      return { price: row.unitPrice / row.piecesPerBox, label: 'DA/pcs' };
    return { price: null, label: '' };
  };

  return (
    <div className="space-y-2 pb-2">
      {priceTracking.map((product) => (
        <Collapsible key={product.productName}>
          <div className="border rounded-lg overflow-hidden">
            <CollapsibleTrigger className="w-full flex flex-col gap-1 p-2 text-start hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between w-full">
                <span className="font-medium text-sm text-wrap">{product.productName}</span>
                <span className="flex items-center gap-1.5 shrink-0 ms-2">
                  <span className="text-xs text-muted-foreground">{fmtQty(product.quantity)} صندوق</span>
                  <span className="text-xs font-bold">{product.totalValue.toLocaleString()} DA</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {(() => {
                  const grouped: Record<string, number> = {};
                  product.pricingRows.forEach(pr => { grouped[pr.subtype] = (grouped[pr.subtype] || 0) + pr.quantity; });
                  return Object.entries(grouped).map(([subtype, qty]) => (
                    <span key={subtype} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${subtypeColorMap[subtype] || 'bg-muted text-muted-foreground'}`}>
                      {subtypeAbbrMap[subtype] || subtype} ({fmtQty(qty)})
                    </span>
                  ));
                })()}
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="border-t p-1.5 space-y-1">
                <div className="grid grid-cols-5 gap-1 text-[10px] text-muted-foreground text-center font-medium border-b pb-1">
                  <span className="text-start">التسعير</span>
                  <span>الكمية</span>
                  <span>سعر الصندوق</span>
                  <span>سعر الوحدة</span>
                  <span>القيمة الإجمالية</span>
                </div>
                {product.pricingRows.sort((a, b) => b.quantity - a.quantity).map((row, idx) => {
                  const unit = getUnitPrice(row);
                  return (
                    <div key={idx} className="grid grid-cols-5 gap-1 text-xs text-center items-center py-1 border-b border-dashed last:border-0">
                      <span className="text-start">
                        <Badge variant="secondary" className="text-[10px] px-1.5">
                          {subtypeLabelsMap[row.subtype] || row.subtype}
                        </Badge>
                      </span>
                      <span className="font-bold">{fmtQty(row.quantity)}</span>
                      <span className="text-muted-foreground">{row.unitPrice.toLocaleString()}</span>
                      <span className="text-muted-foreground">
                        {unit.price !== null ? `${unit.price.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit.label}` : '-'}
                      </span>
                      <span className="font-semibold">{row.total.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}

      <div className="grid grid-cols-2 gap-2 text-xs text-center font-bold border-t-2 pt-1 bg-primary/5 rounded p-1.5">
        <span className="text-start">الإجمالي: {fmtQty(totalQty)} صندوق</span>
        <span className="text-primary">{totalValue.toLocaleString()} DA</span>
      </div>
    </div>
  );
};

const WorkerSalesSummaryDialog: React.FC<Props> = ({ open, onOpenChange, workerId, workerName }) => {
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('products');
  const [periodFrom, setPeriodFrom] = useState<string>('');
  const [periodTo, setPeriodTo] = useState<string>('');

  const normalizePeriodRange = (from: string, to: string) => {
    const now = new Date();

    let start = from ? new Date(`${from}T00:00:00`) : null;
    let end = to ? new Date(`${to}T23:59:59`) : null;

    if (!start && !end) {
      return null;
    }

    if (!start) start = new Date('1970-01-01T00:00:00Z');
    if (!end) end = now;

    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    return { start, end };
  };

  const resetFilters = () => {
    setPeriodFrom('');
    setPeriodTo('');
  };

  useRealtimeSubscription(
    `worker-sales-realtime-${workerId}`,
    [
      { table: 'orders' },
      { table: 'order_items' },
    ],
    [['worker-sales-summary', workerId, periodFrom, periodTo], ['worker-last-accounting-sales', workerId]],
    open && !!workerId
  );

  const { data: lastAccounting } = useQuery({
    queryKey: ['worker-last-accounting-sales', workerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('accounting_sessions')
        .select('completed_at')
        .eq('worker_id', workerId!)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();
      return data?.completed_at || null;
    },
    enabled: open && !!workerId,
  });

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['worker-sales-summary', workerId, lastAccounting, periodFrom, periodTo],
    queryFn: async () => {
      let ordersQuery = supabase
        .from('orders')
        .select('id, status, payment_type, created_at, updated_at, customer_id, customer:customers(default_price_subtype)')
        .in('status', ['delivered', 'completed', 'confirmed'])
        .or(`assigned_worker_id.eq.${workerId!},created_by.eq.${workerId!}`);

      const normalized = normalizePeriodRange(periodFrom, periodTo);
      if (normalized) {
        ordersQuery = ordersQuery.gte('created_at', normalized.start.toISOString()).lte('created_at', normalized.end.toISOString());
      } else if (lastAccounting) {
        ordersQuery = ordersQuery.gte('updated_at', lastAccounting);
      }

      const { data: orders, error } = await ordersQuery;
      if (error) throw error;
      if (!orders || orders.length === 0) return { items: [], orderCount: 0, firstOrderTime: null, lastOrderTime: null };

      const orderIds = orders.map(o => o.id);
      const orderCustomerMap = new Map(orders.map(o => [o.id, o.customer_id]));
      const orderTimeMap = new Map(orders.map(o => [o.id, o.updated_at]));

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id, product_id, quantity, gift_quantity, unit_price, total_price, price_subtype, payment_type, pricing_unit, weight_per_box, pieces_per_box, product:products(name, pieces_per_box, image_url, pricing_unit, weight_per_box, price_retail, price_gros, price_super_gros, price_invoice)')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      const productInfoMap: Record<string, { name: string; pieces_per_box: number | null; image_url: string | null }> = {};
      for (const item of (items || [])) {
        const prod = (item as any).product;
        if (prod?.name && !productInfoMap[item.product_id]) {
          productInfoMap[item.product_id] = {
            name: prod.name,
            pieces_per_box: prod.pieces_per_box || null,
            image_url: prod.image_url || null,
          };
        }
      }

      const orderPaymentTypeMap = new Map(orders.map(o => [o.id, o.payment_type || '']));
      const orderCustomerSubtypeMap = new Map(orders.map(o => [o.id, (o as any).customer?.default_price_subtype || 'gros']));

      const customerIds = [...new Set(orders.map(o => o.customer_id).filter(Boolean))];
      const { data: customers } = customerIds.length > 0
        ? await supabase.from('customers').select('id, name, store_name, phone').in('id', customerIds)
        : { data: [] };
      const customerNameMap = new Map((customers || []).map(c => [c.id, c.name]));
      const customerStoreMap = new Map((customers || []).map(c => [c.id, c.store_name || null]));
      const customerPhoneMap = new Map((customers || []).map(c => [c.id, c.phone || null]));

      const agg: Record<string, ProductAgg> = {};

      for (const item of (items || [])) {
        const customerId = orderCustomerMap.get(item.order_id) || 'unknown';
        if (!agg[item.product_id]) {
          const product = productInfoMap[item.product_id];
          agg[item.product_id] = {
            productId: item.product_id,
            name: product?.name || 'منتج غير معروف',
            quantity: 0,
            giftQuantity: 0,
            totalAmount: 0,
            piecesPerBox: product?.pieces_per_box || null,
            imageUrl: product?.image_url || null,
            customers: [],
          };
        }
        agg[item.product_id].quantity += item.quantity || 0;
        agg[item.product_id].giftQuantity += item.gift_quantity || 0;
        agg[item.product_id].totalAmount += item.total_price || 0;

        const existing = agg[item.product_id].customers.find(c => c.customerId === customerId);
        if (existing) {
          existing.quantity += item.quantity || 0;
          existing.giftQuantity += item.gift_quantity || 0;
          existing.totalAmount += item.total_price || 0;
        } else {
          agg[item.product_id].customers.push({
            customerId,
            customerName: customerNameMap.get(customerId) || 'عميل غير معروف',
            storeName: customerStoreMap.get(customerId) || null,
            phone: customerPhoneMap.get(customerId) || null,
            deliveryTime: orderTimeMap.get(item.order_id) || null,
            quantity: item.quantity || 0,
            giftQuantity: item.gift_quantity || 0,
            totalAmount: item.total_price || 0,
          });
        }
      }

      for (const p of Object.values(agg)) {
        p.customers.sort((a, b) => {
          const tA = a.deliveryTime ? new Date(a.deliveryTime).getTime() : 0;
          const tB = b.deliveryTime ? new Date(b.deliveryTime).getTime() : 0;
          return tA - tB;
        });
      }

      const createdTimes = orders.map(o => new Date(o.created_at).getTime());
      const updatedTimes = orders.map(o => new Date(o.updated_at).getTime());
      const firstOrderTime = createdTimes.length ? new Date(Math.min(...createdTimes)).toISOString() : null;
      const lastOrderTime = updatedTimes.length ? new Date(Math.max(...updatedTimes)).toISOString() : null;

      // Build price tracking data
      const priceMap: Record<string, PriceTrackedProduct> = {};

      for (const item of (items || [])) {
        const prod = (item as any).product;
        const productName = prod?.name || '';
        if (!productName) continue;

        const rawQty = Number(item.quantity || 0);
        const giftQty = Number(item.gift_quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const totalPrice = Number(item.total_price || 0);
        const paidQtyByDiff = rawQty - giftQty;
        const paidQtyByAmount = unitPrice > 0 ? totalPrice / unitPrice : 0;
        const paidQty = Number(Math.max(0, paidQtyByDiff > 0 ? paidQtyByDiff : paidQtyByAmount).toFixed(3));
        if (paidQty <= 0) continue;

        const orderPaymentType = orderPaymentTypeMap.get(item.order_id) || '';
        const itemPaymentType = (item as any).payment_type || orderPaymentType;
        const itemPricingUnit = (item as any).pricing_unit || 'box';
        const itemWeightPerBox = Number((item as any).weight_per_box || 0);
        const itemPiecesPerBox = Number((item as any).pieces_per_box || 0);

        const subtype = inferPricingSubtype({
          itemPaymentType,
          unitPrice,
          explicitSubtype: (item as any).price_subtype || null,
          fallbackSubtype: orderCustomerSubtypeMap.get(item.order_id) || 'gros',
          product: prod || null,
          pricingUnit: itemPricingUnit,
          weightPerBox: itemWeightPerBox > 0 ? itemWeightPerBox : null,
          piecesPerBox: itemPiecesPerBox > 0 ? itemPiecesPerBox : null,
        });
        const lineTotal = totalPrice > 0 ? totalPrice : paidQty * unitPrice;

        if (!priceMap[productName]) {
          priceMap[productName] = { productName, quantity: 0, totalValue: 0, pricingRows: [] };
        }
        priceMap[productName].quantity += paidQty;
        priceMap[productName].totalValue += lineTotal;

        const existingRow = priceMap[productName].pricingRows.find(r => r.subtype === subtype && Math.abs(r.unitPrice - unitPrice) < 0.01);
        if (existingRow) {
          existingRow.quantity += paidQty;
          existingRow.total += lineTotal;
        } else {
          priceMap[productName].pricingRows.push({
            subtype, quantity: paidQty, unitPrice, total: lineTotal,
            pricingUnit: itemPricingUnit, weightPerBox: itemWeightPerBox > 0 ? itemWeightPerBox : null, piecesPerBox: itemPiecesPerBox > 0 ? itemPiecesPerBox : null,
          });
        }
      }

      const priceTracking = Object.values(priceMap).filter(r => r.quantity > 0).sort((a, b) => b.totalValue - a.totalValue);

      return {
        items: Object.values(agg).sort((a, b) => b.quantity - a.quantity),
        orderCount: orders.length,
        firstOrderTime,
        lastOrderTime,
        priceTracking,
      };
    },
    enabled: open && !!workerId,
    refetchInterval: open ? 15000 : false,
    refetchOnWindowFocus: true,
  });

  const totalAmount = useMemo(() => {
    return (salesData?.items || []).reduce((s, i) => s + i.totalAmount, 0);
  }, [salesData]);

  const totalQty = useMemo(() => {
    return (salesData?.items || []).reduce((s, i) => s + i.quantity, 0);
  }, [salesData]);

  const firstTime = salesData?.firstOrderTime ? new Date(salesData.firstOrderTime) : null;
  const lastTime = salesData?.lastOrderTime ? new Date(salesData.lastOrderTime) : null;
  const todayDate = new Date().toLocaleDateString('ar-DZ', { year: 'numeric', month: 'long', day: 'numeric' });


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[92dvh] min-h-0 overflow-hidden flex flex-col" dir="rtl">
        {!expandedProduct && (
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                تجميع مبيعات {workerName}
              </div>
              <div className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{todayDate}</span>
              </div>
            </DialogTitle>
          </DialogHeader>
        )}

        {!expandedProduct && (
          <div className="flex flex-wrap gap-1.5 items-center text-xs mb-3">
            <label className="text-xs font-medium text-slate-700" htmlFor="workerPeriodFrom">من</label>
            <input
              id="workerPeriodFrom"
              type="date"
              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
              value={periodFrom}
              onChange={e => setPeriodFrom(e.target.value)}
            />

            <label className="text-xs font-medium text-slate-700" htmlFor="workerPeriodTo">إلى</label>
            <input
              id="workerPeriodTo"
              type="date"
              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
              value={periodTo}
              onChange={e => setPeriodTo(e.target.value)}
            />

            <Button onClick={resetFilters} size="sm" variant="outline" className="text-xs px-2 py-1 h-auto">إعادة تعيين</Button>
          </div>
        )}

        {!expandedProduct && (
          <div className="flex flex-wrap gap-1.5 items-center text-xs">
            <Badge variant="secondary" className="text-xs">
              {salesData?.orderCount || 0} طلبية
            </Badge>
            <Badge variant="outline" className="text-xs">
              {totalQty} وحدة
            </Badge>
            <Badge className="text-xs bg-primary/10 text-primary border-0">
              {totalAmount.toLocaleString('ar-DZ')} د.ج
            </Badge>
            {lastAccounting && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                منذ آخر محاسبة
              </Badge>
            )}
            {firstTime && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 bg-[hsl(var(--success)/0.18)] text-[hsl(var(--success-foreground))] font-semibold text-[11px]">
                <Clock className="w-3 h-3" />
                {firstTime.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {lastTime && (
              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 bg-destructive/15 text-destructive font-semibold text-[11px]">
                <Clock className="w-3 h-3" />
                {lastTime.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}

        {!expandedProduct && salesData?.items?.length ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full shrink-0">
              <TabsTrigger value="products" className="flex-1 text-xs">المنتجات</TabsTrigger>
              <TabsTrigger value="pricing" className="flex-1 text-xs">المتابعة السعرية</TabsTrigger>
              <TabsTrigger value="groups" className="flex-1 text-xs">مجموعات التسعير</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="flex-1 min-h-0 mt-1">
              <ScrollArea className="h-full min-h-0">
                <div className="grid grid-cols-3 gap-2 pb-2">
                  {salesData.items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex flex-col rounded-2xl overflow-hidden shadow-lg border-2 border-border hover:border-primary/50 cursor-pointer active:scale-[0.97] transition-all"
                      onClick={() => setExpandedProduct(item.productId)}
                    >
                      <div className="px-2 py-1.5 border-b text-center bg-muted border-border">
                        <span className="font-bold text-xs leading-tight block truncate text-foreground">
                          {item.name}
                        </span>
                      </div>
                      <div className="w-full aspect-square bg-muted overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-10 h-10 text-primary/30" />
                          </div>
                        )}
                      </div>
                      <div className="px-1.5 py-1.5 bg-card flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <div className="flex-1 flex items-center justify-center gap-1 rounded-md bg-primary/10 text-primary py-1 text-xs font-bold">
                            <Package className="w-3 h-3" />
                            {item.quantity}
                          </div>
                          {item.giftQuantity > 0 && (
                            <div className="flex items-center justify-center gap-0.5 rounded-md bg-secondary py-1 px-1.5 text-[10px] font-semibold text-secondary-foreground">
                              🎁 {formatBoxPieces(item.giftQuantity, item.piecesPerBox)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-center rounded-md bg-muted py-1 text-[10px] font-semibold text-muted-foreground">
                          {item.totalAmount.toLocaleString('ar-DZ')} د.ج
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="pricing" className="flex-1 min-h-0 mt-1">
              <ScrollArea className="h-full min-h-0">
                <PriceTrackingTab priceTracking={salesData.priceTracking || []} />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="groups" className="flex-1 min-h-0 mt-1">
              <ScrollArea className="h-full min-h-0">
                <PricingGroupsSummary
                  workerId={workerId!}
                  periodStart={lastAccounting || new Date().toISOString().split('T')[0]}
                  periodEnd={new Date().toISOString()}
                />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : !salesData?.items?.length && !expandedProduct ? (
              <div className="py-10 text-center text-muted-foreground">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>لا توجد مبيعات في هذه الفترة</p>
                <p className="text-xs mt-1">جرب تغيير الفترة الزمنية أو إعادة التعيين</p>
              </div>
            ) : expandedProduct ? (
              <ExpandedCarousel
                items={salesData!.items}
                expandedProduct={expandedProduct}
                onNavigate={setExpandedProduct}
                onClose={() => setExpandedProduct(null)}
              />
            ) : null}
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WorkerSalesSummaryDialog;
