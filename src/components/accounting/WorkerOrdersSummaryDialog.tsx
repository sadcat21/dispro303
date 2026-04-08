import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import AdaptiveScrollContainer from '@/components/ui/adaptive-scroll-container';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList, Package, User, Calendar, ChevronLeft, ChevronRight, Loader2, ShoppingCart, UserCheck, Printer, Settings2, Layers, Gift, Users, Truck, Minus, Plus, Check, Save } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import OrdersPrintView from '@/components/print/OrdersPrintView';
import type { PrintColumnConfig } from '@/components/print/OrdersPrintView';
import { usePrintColumnsConfig } from '@/hooks/usePrintColumnsConfig';
import PrintColumnsConfigDialog from '@/components/print/PrintColumnsConfigDialog';
import { OrderWithDetails, Product } from '@/types/database';
import { useWorkerPrintInfo } from '@/hooks/useWorkerPrintInfo';
import GiftsPrintView from '@/components/accounting/GiftsPrintView';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
  orderTime: string | null;
  quantity: number;
}

interface ProductAgg {
  productId: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  customerCount: number;
  customers: CustomerBreakdown[];
}

/** Carousel overlay for orders – mirrors the sales summary carousel */
const OrdersCarousel: React.FC<{
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

        {/* Image area with customer overlay */}
        <div className="relative w-full overflow-hidden bg-muted min-h-[200px]" style={{ height: item.customers.length > 3 ? '45vh' : '38vh', maxHeight: '450px' }}>
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
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-card/80 border border-border/60 text-sm"
                    dir="rtl"
                  >
                    <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate font-medium">{c.storeName || c.customerName}</span>
                        {c.orderTime && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(c.orderTime).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {c.storeName && <span className="truncate">{c.customerName}</span>}
                        {c.phone && <span dir="ltr" className="shrink-0">{c.phone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center shrink-0 ms-2">
                      <span className="font-bold text-primary text-base">{c.quantity}</span>
                    </div>
                  </div>
                ))}
              </AdaptiveScrollContainer>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-2 py-2 bg-card flex flex-col gap-1.5">
          <div className="flex items-center justify-center gap-1 rounded-md bg-primary/10 text-primary py-1.5 text-sm font-bold">
            <Package className="w-3.5 h-3.5" />
            {item.quantity}
          </div>
        </div>
      </div>
    </div>
  );
};

const WorkerOrdersSummaryDialog: React.FC<Props> = ({ open, onOpenChange, workerId, workerName }) => {
  const [activeTab, setActiveTab] = useState<'created' | 'assigned'>('assigned');
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [isPrintReady, setIsPrintReady] = useState(false);
  const [printOrders, setPrintOrders] = useState<OrderWithDetails[]>([]);
  const [printOrderItems, setPrintOrderItems] = useState<Map<string, any[]>>(new Map());
  const [printProducts, setPrintProducts] = useState<Product[]>([]);
  const [printExtraRows, setPrintExtraRows] = useState<{ label: string; productQuantities: Record<string, number>; totalAmount?: number; style?: 'highlight' | 'normal' }[]>([]);
  const [isPrintLoading, setIsPrintLoading] = useState(false);
  const isPrintingRef = useRef(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Print settings dialog state
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [showColumnsConfig, setShowColumnsConfig] = useState(false);
  const [groupCustomers, setGroupCustomers] = useState(true);
  const [groupProducts, setGroupProducts] = useState(true);
  const [includePromoRegistre, setIncludePromoRegistre] = useState(false);
  
  // Customer selection state
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  
  // Cash Van reserve products state
  const [showCashVanDialog, setShowCashVanDialog] = useState(false);
  const [cashVanProducts, setCashVanProducts] = useState<Record<string, number>>({});
  const [cashVanSaving, setCashVanSaving] = useState(false);
  const [customersSaving, setCustomersSaving] = useState(false);
  const [loadedFromDb, setLoadedFromDb] = useState(false);

  const { activeBranch } = useAuth();
  const { columns: columnConfig, saveColumns } = usePrintColumnsConfig();
  const { data: workerPrintInfo } = useWorkerPrintInfo(workerId);

  // DB keys for persistence
  const cashVanKey = workerId ? `cashvan_${workerId}_${selectedDate}` : '';
  const customerSelKey = workerId ? `print_customers_${workerId}_${selectedDate}` : '';

  // Load saved Cash Van & customer selection from DB
  useEffect(() => {
    if (!open || !workerId) return;
    setLoadedFromDb(false);
    const load = async () => {
      try {
        const { data: settings } = await supabase
          .from('app_settings')
          .select('key, value')
          .in('key', [cashVanKey, customerSelKey]);
        
        if (settings) {
          for (const s of settings) {
            if (s.key === cashVanKey) {
              try { setCashVanProducts(JSON.parse(s.value)); } catch {}
            }
            if (s.key === customerSelKey) {
              try { setSelectedCustomerIds(new Set(JSON.parse(s.value))); } catch {}
            }
          }
        }
      } catch (e) {
        console.error('Failed to load saved settings:', e);
      }
      setLoadedFromDb(true);
    };
    load();
  }, [open, workerId, selectedDate, cashVanKey, customerSelKey]);

  // Save Cash Van to DB
  const saveCashVan = useCallback(async () => {
    if (!cashVanKey) return;
    setCashVanSaving(true);
    try {
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('key', cashVanKey)
        .maybeSingle();
      
      if (existing) {
        await supabase.from('app_settings').update({ value: JSON.stringify(cashVanProducts), updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await supabase.from('app_settings').insert({ key: cashVanKey, value: JSON.stringify(cashVanProducts), branch_id: activeBranch?.id || null });
      }
      toast.success('تم حفظ كميات CASH VAN');
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setCashVanSaving(false);
    }
  }, [cashVanKey, cashVanProducts, activeBranch]);

  // Save customer selection to DB
  const saveCustomerSelection = useCallback(async () => {
    if (!customerSelKey) return;
    setCustomersSaving(true);
    try {
      const value = JSON.stringify(Array.from(selectedCustomerIds));
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('key', customerSelKey)
        .maybeSingle();
      
      if (existing) {
        await supabase.from('app_settings').update({ value, updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await supabase.from('app_settings').insert({ key: customerSelKey, value, branch_id: activeBranch?.id || null });
      }
      toast.success('تم حفظ تحديد العملاء');
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setCustomersSaving(false);
    }
  }, [customerSelKey, selectedCustomerIds, activeBranch]);

  const { data, isLoading } = useQuery({
    queryKey: ['worker-orders-summary', workerId, selectedDate],
    queryFn: async () => {
      if (!workerId) return { created: [], assigned: [] };

      const dayStart = `${selectedDate}T00:00:00+01:00`;
      const dayEnd = `${selectedDate}T23:59:59+01:00`;

      const { data: createdOrders } = await supabase
        .from('orders')
        .select('id, customer_id, created_at, customer:customers(name, store_name, phone)')
        .eq('created_by', workerId)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .in('status', ['pending', 'assigned', 'in_progress', 'delivered', 'completed', 'confirmed']);

      const { data: assignedOrders } = await supabase
        .from('orders')
        .select('id, customer_id, created_at, customer:customers(name, store_name, phone)')
        .eq('assigned_worker_id', workerId)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .in('status', ['pending', 'assigned', 'in_progress', 'delivered', 'completed', 'confirmed']);

      const allOrderIds = [...new Set([
        ...(createdOrders || []).map(o => o.id),
        ...(assignedOrders || []).map(o => o.id),
      ])];

      if (allOrderIds.length === 0) return { created: [], assigned: [] };

      const { data: items } = await supabase
        .from('order_items')
        .select('order_id, product_id, quantity, product:products(name, image_url)')
        .in('order_id', allOrderIds);

      const buildAgg = (orders: any[]): ProductAgg[] => {
        const map = new Map<string, ProductAgg>();
        for (const order of orders) {
          const orderItems = (items || []).filter(i => i.order_id === order.id);
          for (const item of orderItems) {
            const pid = item.product_id;
            if (!map.has(pid)) {
              map.set(pid, {
                productId: pid,
                name: (item.product as any)?.name || '—',
                imageUrl: (item.product as any)?.image_url || null,
                quantity: 0,
                customerCount: 0,
                customers: [],
              });
            }
            const agg = map.get(pid)!;
            agg.quantity += item.quantity || 0;
            const custId = order.customer_id;
            const existing = agg.customers.find(c => c.customerId === custId);
            if (existing) {
              existing.quantity += item.quantity || 0;
            } else {
              agg.customers.push({
                customerId: custId,
                customerName: (order.customer as any)?.name || '—',
                storeName: (order.customer as any)?.store_name || null,
                phone: (order.customer as any)?.phone || null,
                orderTime: order.created_at || null,
                quantity: item.quantity || 0,
              });
            }
          }
        }
        for (const agg of map.values()) {
          agg.customerCount = agg.customers.length;
        }
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
      };

      return {
        created: buildAgg(createdOrders || []),
        assigned: buildAgg(assignedOrders || []),
      };
    },
    enabled: open && !!workerId,
  });

  const currentData = activeTab === 'created' ? data?.created || [] : data?.assigned || [];
  const totalQuantity = currentData.reduce((s, p) => s + p.quantity, 0);
  const totalCustomers = new Set(currentData.flatMap(p => p.customers.map(c => c.customerId))).size;
  const createdCustomers = new Set((data?.created || []).flatMap(p => p.customers.map(c => c.customerId))).size;
  const assignedCustomers = new Set((data?.assigned || []).flatMap(p => p.customers.map(c => c.customerId))).size;

  // Unique customers list for picker
  const uniqueCustomers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; storeName: string | null }>();
    for (const p of currentData) {
      for (const c of p.customers) {
        if (!map.has(c.customerId)) {
          map.set(c.customerId, { id: c.customerId, name: c.customerName, storeName: c.storeName });
        }
      }
    }
    return Array.from(map.values());
  }, [currentData]);

  // Aggregated product quantities for cash van reference
  const aggregatedProducts = useMemo(() => {
    return currentData.map(p => ({
      productId: p.productId,
      name: p.name,
      imageUrl: p.imageUrl,
      totalQuantity: p.quantity,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [currentData]);

  // Open print settings dialog instead of printing directly
  const handlePrintClick = () => {
    if (!workerId || currentData.length === 0) return;
    // Only initialize all customers if no saved selection exists
    if (selectedCustomerIds.size === 0) {
      const allIds = new Set(uniqueCustomers.map(c => c.id));
      setSelectedCustomerIds(allIds);
    }
    setShowPrintSettings(true);
  };

  const handlePrint = async () => {
    if (!workerId) return;
    setIsPrintLoading(true);
    try {
      const dayStart = `${selectedDate}T00:00:00+01:00`;
      const dayEnd = `${selectedDate}T23:59:59+01:00`;

      const filterCol = activeTab === 'created' ? 'created_by' : 'assigned_worker_id';
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*, sector:sectors(name, name_fr), zone:sector_zones(name, name_fr)),
          assigned_worker:workers!orders_assigned_worker_id_fkey(id, full_name),
          order_items(*, product:products(*))
        `)
        .eq(filterCol, workerId)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .in('status', ['pending', 'assigned', 'in_progress', 'delivered', 'completed', 'confirmed'])
        .order('created_at', { ascending: true });

      let fetchedOrders = (ordersData || []) as unknown as OrderWithDetails[];
      
      // Filter by selected customers
      if (selectedCustomerIds.size > 0 && selectedCustomerIds.size < uniqueCustomers.length) {
        fetchedOrders = fetchedOrders.filter(o => selectedCustomerIds.has(o.customer_id));
      }
      
      if (fetchedOrders.length === 0) {
        toast.info('لا توجد طلبيات للطباعة');
        setIsPrintLoading(false);
        return;
      }

      const itemsMap = new Map<string, any[]>();
      const productMap = new Map<string, Product>();
      for (const order of fetchedOrders) {
        const items = (order as any).order_items || [];
        itemsMap.set(order.id, items);
        for (const item of items) {
          if (item.product) productMap.set(item.product_id, item.product as Product);
        }
      }

      // Build cash van extra row
      const cashVanExtraRows: { label: string; productQuantities: Record<string, number>; style?: 'highlight' | 'normal' }[] = [];
      const hasCashVan = Object.values(cashVanProducts).some(q => q > 0);
      if (hasCashVan) {
        cashVanExtraRows.push({
          label: 'CASH VAN',
          productQuantities: cashVanProducts,
          style: 'highlight',
        });
      }

      setPrintOrders(fetchedOrders);
      setPrintOrderItems(itemsMap);
      setPrintProducts(Array.from(productMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      setPrintExtraRows(cashVanExtraRows);
      setIsPrintReady(true);
      isPrintingRef.current = true;

      // Close print settings dialog AFTER data is ready, then print after a delay
      setShowPrintSettings(false);

      setTimeout(() => {
        window.print();
        setTimeout(() => {
          setIsPrintReady(false);
          isPrintingRef.current = false;
        }, 500);
      }, 800);
    } catch (err) {
      console.error('Print error:', err);
      toast.error('حدث خطأ أثناء تحضير الطباعة');
    } finally {
      setIsPrintLoading(false);
    }
  };

  const goDay = (dir: number) => {
    const d = dir > 0 ? addDays(new Date(selectedDate), 1) : subDays(new Date(selectedDate), 1);
    setSelectedDate(format(d, 'yyyy-MM-dd'));
    setExpandedProduct(null);
  };

  const printTitle = `${activeTab === 'created' ? 'طلبيات' : 'معيّنة'} - ${workerPrintInfo?.printName || workerName || ''} - ${format(new Date(selectedDate), 'dd/MM/yyyy')}`;

  return (
    <>
      {isPrintReady && (
        <OrdersPrintView
          ref={printRef}
          orders={printOrders}
          orderItems={printOrderItems}
          products={printProducts}
          title={printTitle}
          dateRange={format(new Date(selectedDate), 'dd/MM/yyyy')}
          isVisible
          columnConfig={columnConfig}
          extraRows={printExtraRows}
        />
      )}
      {isPrintReady && includePromoRegistre && (
        <GiftsPrintView
          rows={[]}
          workerName={workerPrintInfo?.printName || workerName || ''}
          dateRange={format(new Date(selectedDate), 'dd/MM/yyyy')}
          isVisible
          isTemplate
          templatePageCount={1}
        />
      )}

    <Dialog open={open} onOpenChange={(v) => { if (isPrintingRef.current) return; onOpenChange(v); }}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[92dvh] flex flex-col overflow-hidden p-0 gap-0 rounded-2xl" dir="rtl">
        {/* Header */}
        <div className="bg-primary/5 border-b px-4 pt-4 pb-3 shrink-0">
          <DialogHeader className="p-0 space-y-1">
            <DialogTitle className="flex items-center gap-2.5 text-base">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <span className="flex-1">تجميع الطلبيات {workerName ? `- ${workerName}` : ''}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handlePrintClick}
                disabled={isPrintLoading || currentData.length === 0}
              >
                {isPrintLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              </Button>
            </DialogTitle>
          </DialogHeader>

          {/* Date navigation */}
          <div className="flex items-center justify-center gap-3 mt-3">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goDay(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1.5 text-xs font-semibold bg-background rounded-lg px-3 py-1.5 border">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {format(new Date(selectedDate), 'dd/MM/yyyy')}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goDay(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as any); setExpandedProduct(null); }} className="flex-1 min-h-0 flex flex-col">
          <div className="px-3 pt-2 shrink-0">
            <TabsList className="grid grid-cols-2 h-9 bg-muted/60 rounded-lg p-0.5">
             <TabsTrigger value="assigned" className="text-[11px] rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1 h-full">
                <UserCheck className="w-3.5 h-3.5" />
                معيّنة ({assignedCustomers})
              </TabsTrigger>
              <TabsTrigger value="created" className="text-[11px] rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1 h-full">
                <ShoppingCart className="w-3.5 h-3.5" />
                طلبياته ({createdCustomers})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Stats bar */}
          {currentData.length > 0 && (
            <div className="flex items-center justify-center gap-4 px-3 py-2 shrink-0">
              <span className="text-[11px] font-semibold flex items-center gap-1 text-primary">
                <Package className="w-3.5 h-3.5" />
                {currentData.length} منتج
              </span>
              <span className="text-[11px] font-semibold flex items-center gap-1 text-foreground">
                {totalQuantity} صندوق
              </span>
              <span className="text-[11px] font-semibold flex items-center gap-1 text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                {totalCustomers} عميل
              </span>
            </div>
          )}

          <TabsContent value={activeTab} className="flex-1 min-h-0 mt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
              </div>
            ) : currentData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ClipboardList className="w-12 h-12 opacity-30 mb-2" />
                <p className="text-sm">لا توجد طلبيات في هذا التاريخ</p>
              </div>
            ) : expandedProduct ? (
              <ScrollArea className="h-full px-3">
                <OrdersCarousel
                  items={currentData}
                  expandedProduct={expandedProduct}
                  onNavigate={setExpandedProduct}
                  onClose={() => setExpandedProduct(null)}
                />
              </ScrollArea>
            ) : (
              <ScrollArea className="h-full">
                <div className="grid grid-cols-3 gap-2 px-3 pb-4">
                  {currentData.map(product => (
                    <div
                      key={product.productId}
                      onClick={() => setExpandedProduct(product.productId)}
                      className="rounded-xl border cursor-pointer transition-all active:scale-[0.97] hover:shadow-sm overflow-hidden"
                    >
                      <div className="aspect-square bg-muted/30 relative overflow-hidden">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-muted-foreground/30" />
                          </div>
                        )}
                        <Badge className="absolute top-1 end-1 text-[10px] px-1.5 py-0 h-5 bg-primary text-primary-foreground shadow">
                          {product.quantity}
                        </Badge>
                      </div>
                      <div className="p-1.5 text-center">
                        <p className="text-[10px] font-semibold leading-tight line-clamp-2">{product.name}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">
                          <User className="w-2.5 h-2.5 inline me-0.5" />
                          {product.customerCount} عميل
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>

    {/* Print Settings Dialog */}
    <Dialog open={showPrintSettings} onOpenChange={setShowPrintSettings}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm p-4 max-h-[85dvh] overflow-hidden" dir="rtl">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Printer className="w-4 h-4" />
            إعدادات الطباعة
          </DialogTitle>
        </DialogHeader>
        <AdaptiveScrollContainer
          maxHeightClassName="max-h-[calc(85dvh-4rem)]"
          contentClassName="space-y-3 pe-1"
        >
          {/* Summary */}
          <div className="bg-primary/10 p-3 rounded-lg text-center">
            <p className="text-base font-bold">{selectedCustomerIds.size} عميل • {totalQuantity} صندوق</p>
            <p className="text-xs text-muted-foreground">{activeTab === 'created' ? 'طلبياته' : 'معيّنة'} - {format(new Date(selectedDate), 'dd/MM/yyyy')}</p>
          </div>

          {/* Customer Selection */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setShowCustomerPicker(true)}
          >
            <Users className="w-4 h-4" />
            تحديد العملاء ({selectedCustomerIds.size}/{uniqueCustomers.length})
            {selectedCustomerIds.size < uniqueCustomers.length && (
              <Badge variant="secondary" className="text-[10px] px-1.5 h-5">محدد</Badge>
            )}
          </Button>

          {/* Grouping Options */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="groupCustomersOS" className="flex items-center gap-2 cursor-pointer flex-1">
                <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                <div>
                  <div className="text-sm font-medium">تجميع طلبات نفس العميل</div>
                  <p className="text-xs text-muted-foreground">دمج الطلبات المتعددة لنفس العميل</p>
                </div>
              </Label>
              <Switch id="groupCustomersOS" checked={groupCustomers} onCheckedChange={setGroupCustomers} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="groupProductsOS" className="flex items-center gap-2 cursor-pointer flex-1">
                <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                <div>
                  <div className="text-sm font-medium">تجميع كميات المنتجات</div>
                  <p className="text-xs text-muted-foreground">جمع كميات نفس المنتج من طلبات مختلفة</p>
                </div>
              </Label>
              <Switch id="groupProductsOS" checked={groupProducts} onCheckedChange={setGroupProducts} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="includePromoOS" className="flex items-center gap-2 cursor-pointer flex-1">
                <Gift className="w-3.5 h-3.5 text-primary shrink-0" />
                <div>
                  <div className="text-sm font-medium">Registre des promotions</div>
                  <p className="text-xs text-muted-foreground">إضافة صفحة سجل العروض الترويجية</p>
                </div>
              </Label>
              <Switch id="includePromoOS" checked={includePromoRegistre} onCheckedChange={setIncludePromoRegistre} />
            </div>
          </div>

          {/* Cash Van Button */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => setShowCashVanDialog(true)}
          >
            <Truck className="w-4 h-4" />
            CASH VAN - منتجات احتياطية
            {Object.values(cashVanProducts).some(q => q > 0) && (
              <Badge variant="secondary" className="text-[10px] px-1.5 h-5 bg-accent text-accent-foreground">
                {Object.values(cashVanProducts).filter(q => q > 0).length} منتج
              </Badge>
            )}
          </Button>

          {/* Column Config Button */}
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowColumnsConfig(true)}>
            <Settings2 className="w-4 h-4" />
            إعدادات الأعمدة
          </Button>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handlePrint} disabled={selectedCustomerIds.size === 0} className="gap-2">
              <Printer className="w-4 h-4" />
              طباعة
            </Button>
            <Button variant="outline" onClick={() => setShowPrintSettings(false)}>
              إلغاء
            </Button>
          </div>
        </AdaptiveScrollContainer>
      </DialogContent>
    </Dialog>

    {/* Customer Picker Dialog */}
    <Dialog open={showCustomerPicker} onOpenChange={setShowCustomerPicker}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm p-4 max-h-[80dvh] flex flex-col" dir="rtl">
        <DialogHeader className="pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            تحديد العملاء للطباعة
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-between gap-2 pb-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {selectedCustomerIds.size}/{uniqueCustomers.length} عميل محدد
          </span>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1"
              onClick={() => setSelectedCustomerIds(new Set(uniqueCustomers.map(c => c.id)))}
            >
              <Check className="w-3 h-3" />
              تحديد الكل
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => setSelectedCustomerIds(new Set())}
            >
              إلغاء الكل
            </Button>
          </div>
        </div>
        <AdaptiveScrollContainer
          className="flex-1"
          maxHeightClassName="flex-1"
          contentClassName="space-y-1 pe-2"
        >
            {uniqueCustomers.map((customer) => (
              <div
                key={customer.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/60 cursor-pointer"
                onClick={() => {
                  setSelectedCustomerIds(prev => {
                    const next = new Set(prev);
                    if (next.has(customer.id)) next.delete(customer.id);
                    else next.add(customer.id);
                    return next;
                  });
                }}
              >
                <Checkbox
                  checked={selectedCustomerIds.has(customer.id)}
                  onCheckedChange={() => {
                    setSelectedCustomerIds(prev => {
                      const next = new Set(prev);
                      if (next.has(customer.id)) next.delete(customer.id);
                      else next.add(customer.id);
                      return next;
                    });
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{customer.storeName || customer.name}</p>
                  {customer.storeName && (
                    <p className="text-[11px] text-muted-foreground truncate">{customer.name}</p>
                  )}
                </div>
              </div>
            ))}
        </AdaptiveScrollContainer>
        <div className="pt-2 shrink-0">
          <Button className="w-full gap-1.5" size="sm" onClick={async () => { await saveCustomerSelection(); setShowCustomerPicker(false); }} disabled={customersSaving}>
            <Save className="w-3.5 h-3.5" />
            {customersSaving ? 'جاري الحفظ...' : `حفظ (${selectedCustomerIds.size} عميل)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Cash Van Dialog */}
    <Dialog open={showCashVanDialog} onOpenChange={setShowCashVanDialog}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm p-4 max-h-[80dvh] flex flex-col" dir="rtl">
        <DialogHeader className="pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Truck className="w-4 h-4" />
            CASH VAN - منتجات احتياطية
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground shrink-0">أضف كميات احتياطية لكل منتج. ستظهر كصف خاص في الطباعة.</p>
        <AdaptiveScrollContainer
          className="flex-1 mt-2"
          maxHeightClassName="flex-1"
          contentClassName="space-y-1.5 pe-2"
        >
            {aggregatedProducts.map((product) => {
              const reserveQty = cashVanProducts[product.productId] || 0;
              const totalWithReserve = product.totalQuantity + reserveQty;
              return (
                <div
                  key={product.productId}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50"
                >
                  {/* Product image */}
                  <div className="w-9 h-9 rounded-lg bg-muted overflow-hidden shrink-0">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-4 h-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate">{product.name}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>طلبيات: <span className="font-bold text-foreground">{product.totalQuantity}</span></span>
                      {reserveQty > 0 && (
                        <>
                          <span>+</span>
                          <span className="text-destructive font-bold">{reserveQty}</span>
                          <span>=</span>
                          <span className="font-bold text-primary">{totalWithReserve}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Quantity controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setCashVanProducts(prev => ({
                          ...prev,
                          [product.productId]: Math.max(0, (prev[product.productId] || 0) - 1),
                        }));
                      }}
                      disabled={reserveQty <= 0}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Input
                      type="number"
                      min={0}
                      value={reserveQty || ''}
                      placeholder="0"
                      className="w-12 h-7 text-center text-sm p-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setCashVanProducts(prev => ({
                          ...prev,
                          [product.productId]: Math.max(0, val),
                        }));
                      }}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      onClick={() => {
                        setCashVanProducts(prev => ({
                          ...prev,
                          [product.productId]: (prev[product.productId] || 0) + 1,
                        }));
                      }}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
        </AdaptiveScrollContainer>
        <div className="grid grid-cols-2 gap-2 pt-2 shrink-0">
          <Button size="sm" onClick={async () => { await saveCashVan(); setShowCashVanDialog(false); }} disabled={cashVanSaving} className="gap-1.5">
            <Save className="w-3.5 h-3.5" />
            {cashVanSaving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setCashVanProducts({}); }}
          >
            مسح الكل
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Column Config Dialog */}
    <PrintColumnsConfigDialog
      open={showColumnsConfig}
      onOpenChange={setShowColumnsConfig}
      columns={columnConfig}
      onColumnsChange={saveColumns}
    />
    </>
  );
};

export default WorkerOrdersSummaryDialog;
