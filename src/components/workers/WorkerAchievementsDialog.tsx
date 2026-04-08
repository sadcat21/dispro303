import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, Truck, MapPin, UserPlus, Edit2, Banknote, Eye, Package, Loader2, X, Clock, User, FileText, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { getOperationLabel, type OperationType } from '@/hooks/useVisitTracking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import OrderDetailsDialog from '@/components/orders/OrderDetailsDialog';
import type { OrderWithDetails } from '@/types/database';

interface WorkerAchievementsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId?: string;
  workerName?: string;
}

const OPERATION_ICONS: Record<string, React.ReactNode> = {
  order: <ShoppingCart className="w-4 h-4 text-blue-600" />,
  direct_sale: <Package className="w-4 h-4 text-emerald-600" />,
  delivery: <Truck className="w-4 h-4 text-green-600" />,
  add_customer: <UserPlus className="w-4 h-4 text-purple-600" />,
  update_customer: <Edit2 className="w-4 h-4 text-amber-600" />,
  delete_customer: <Edit2 className="w-4 h-4 text-red-600" />,
  debt_collection: <Banknote className="w-4 h-4 text-orange-600" />,
  visit: <Eye className="w-4 h-4 text-cyan-600" />,
  delivery_visit: <MapPin className="w-4 h-4 text-teal-600" />,
};

const OPERATION_COLORS: Record<string, string> = {
  order: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200',
  direct_sale: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200',
  delivery: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200',
  add_customer: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200',
  update_customer: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200',
  delete_customer: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200',
  debt_collection: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200',
  visit: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-200',
  delivery_visit: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200',
};

// Sub-component for achievement detail with order items
const AchievementDetailContent: React.FC<{ visit: any; onClose: () => void }> = ({ visit, onClose }) => {
  const isOrderType = ['order', 'direct_sale', 'delivery'].includes(visit.operation_type);
  const entityId = visit.operation_id || visit.entity_id;

  const { data: orderData, isLoading: orderLoading } = useQuery({
    queryKey: ['achievement-order-detail', entityId],
    queryFn: async () => {
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .select('id, total_amount, status, payment_status, invoice_payment_method, created_at, delivery_date')
        .eq('id', entityId!)
        .maybeSingle();
      if (orderErr) throw orderErr;
      if (!order) return null;

      const { data: items, error: itemsErr } = await supabase
        .from('order_items')
        .select('id, quantity, unit_price, total_price, product:products(id, name, image_url)')
        .eq('order_id', entityId!);
      if (itemsErr) throw itemsErr;

      return { order, items: items || [] };
    },
    enabled: isOrderType && !!entityId,
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {OPERATION_ICONS[visit.operation_type] || <MapPin className="w-5 h-5" />}
          تفاصيل الإنجاز
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 mt-2">
        <div className={`p-3 rounded-lg border ${OPERATION_COLORS[visit.operation_type] || 'border-border'}`}>
          <p className="font-bold text-sm">{getOperationLabel(visit.operation_type as OperationType)}</p>
        </div>

        {visit.customer_name && (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium">العميل:</span>
            <span>{visit.customer_name}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="font-medium">التوقيت:</span>
          <span dir="ltr">{format(new Date(visit.created_at), 'HH:mm:ss')}</span>
        </div>

        {visit.latitude && visit.longitude && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="font-medium">الموقع:</span>
            <span dir="ltr" className="text-xs text-muted-foreground">
              {Number(visit.latitude).toFixed(5)}, {Number(visit.longitude).toFixed(5)}
            </span>
          </div>
        )}

        {visit.notes && (
          <div className="flex items-start gap-2 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <span className="font-medium">ملاحظات:</span>
            <span className="text-muted-foreground">{visit.notes}</span>
          </div>
        )}

        {/* Order items section */}
        {isOrderType && entityId && (
          <div className="border-t pt-3 mt-3">
            <p className="font-bold text-sm mb-2 flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              تفاصيل الطلبية
            </p>
            {orderLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : orderData ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  <span>الإجمالي: <strong className="text-foreground">{Number(orderData.order.total_amount).toLocaleString()} د.ج</strong></span>
                  {orderData.order.invoice_payment_method && (
                    <Badge variant="outline" className="text-[10px]">
                      {orderData.order.invoice_payment_method === 'cash' ? 'نقدي' :
                       orderData.order.invoice_payment_method === 'check' ? 'شيك' :
                       orderData.order.invoice_payment_method === 'transfer' ? 'تحويل' :
                       orderData.order.invoice_payment_method === 'receipt' ? 'وصل' : orderData.order.invoice_payment_method}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1.5">
                  {orderData.items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2 bg-card border rounded-lg p-2">
                      {item.product?.image_url ? (
                        <img src={item.product.image_url} alt="" className="w-9 h-9 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded bg-muted flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.product?.name || '—'}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.quantity} × {Number(item.unit_price).toLocaleString()} = <strong>{Number(item.total_price).toLocaleString()}</strong>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2">لا توجد تفاصيل</p>
            )}
          </div>
        )}
      </div>
      <div className="mt-4">
        <Button variant="outline" className="w-full" onClick={onClose}>
          إغلاق
        </Button>
      </div>
    </>
  );
};

const WorkerAchievementsDialog: React.FC<WorkerAchievementsDialogProps> = ({
  open, onOpenChange, workerId, workerName
}) => {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderWithDetails | null>(null);

  // Reset dates when dialog opens
  React.useEffect(() => {
    if (open) {
      const t = format(new Date(), 'yyyy-MM-dd');
      setDateFrom(t);
      setDateTo(t);
      setActiveFilter(null);
    }
  }, [open]);

  // Real-time subscription for visit_tracking
  useRealtimeSubscription(
    `achievements-realtime-${workerId}`,
    [{ table: 'visit_tracking', filter: workerId ? `worker_id=eq.${workerId}` : undefined }],
    [['worker-achievements', workerId, dateFrom, dateTo]],
    open && !!workerId
  );

  const { data, isLoading } = useQuery({
    queryKey: ['worker-achievements', workerId, dateFrom, dateTo],
    queryFn: async () => {
      if (!workerId) return { visits: [], counts: {} };

      const { data: visits } = await supabase
        .from('visit_tracking')
        .select('*')
        .eq('worker_id', workerId)
        .gte('created_at', dateFrom + 'T00:00:00')
        .lte('created_at', dateTo + 'T23:59:59')
        .order('created_at', { ascending: false });

      const customerIds = [...new Set((visits || []).filter(v => v.customer_id).map(v => v.customer_id!))];
      let customerMap = new Map<string, string>();
      if (customerIds.length > 0) {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, name, store_name')
          .in('id', customerIds);
        for (const c of (customers || [])) {
          customerMap.set(c.id, c.store_name || c.name);
        }
      }

      const enrichedVisits = (visits || []).map(v => ({
        ...v,
        customer_name: v.customer_id ? customerMap.get(v.customer_id) || '' : '',
      }));

      const counts: Record<string, number> = {};
      for (const v of enrichedVisits) {
        counts[v.operation_type] = (counts[v.operation_type] || 0) + 1;
      }

      return { visits: enrichedVisits, counts };
    },
    enabled: open && !!workerId,
    refetchInterval: 30000, // Real-time polling every 30s
  });

  const counts = data?.counts || {};
  const visits = data?.visits || [];
  const totalOps = visits.length;

  const filteredVisits = useMemo(() => {
    if (!activeFilter) return visits;
    return visits.filter((v: any) => v.operation_type === activeFilter);
  }, [visits, activeFilter]);

  const isToday = dateFrom === today && dateTo === today;


  const handleOpenAchievement = async (visit: any) => {
    const orderLikeTypes = ['order', 'direct_sale', 'delivery'];
    const entityId = visit.entity_id || visit.order_id || visit.reference_id;
    if (!orderLikeTypes.includes(visit.operation_type) || !entityId) {
      setSelectedVisit(visit);
      return;
    }

    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(*),
        worker:workers(*)
      `)
      .eq('id', entityId)
      .single();

    if (data) {
      setSelectedOrderDetails(data as OrderWithDetails);
      return;
    }

    setSelectedVisit(visit);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setActiveFilter(null); }}>
        <DialogContent className="max-w-md p-0 flex flex-col" style={{ maxHeight: '85vh' }} dir="rtl">
          <DialogHeader className="shrink-0 p-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {isToday ? 'منجزات اليوم' : 'المنجزات'} - {workerName}
            </DialogTitle>
          </DialogHeader>

          {/* Date range picker */}
          <div className="px-4 pb-2 flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-[10px] text-muted-foreground">من</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-[10px] text-muted-foreground">إلى</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs" />
            </div>
            <Button
              variant={isToday ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-[10px] mt-4 shrink-0"
              onClick={() => { setDateFrom(today); setDateTo(today); }}
            >
              اليوم
            </Button>
          </div>

          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : totalOps === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <MapPin className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>لا توجد عمليات مسجلة</p>
            </div>
          ) : (
            <div className="flex flex-col min-h-0 flex-1">
              {/* Filter buttons */}
              <div className="flex flex-wrap gap-1.5 shrink-0 px-4 pb-2">
                <button
                  onClick={() => setActiveFilter(null)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors border ${
                    !activeFilter
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/60 hover:bg-muted text-foreground border-border'
                  }`}
                >
                  الكل
                  <span className="font-bold">{totalOps}</span>
                </button>
                {Object.entries(counts).map(([type, count]) => (
                  <button
                    key={type}
                    onClick={() => setActiveFilter(activeFilter === type ? null : type)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors border ${
                      activeFilter === type
                        ? 'bg-primary text-primary-foreground border-primary'
                        : OPERATION_COLORS[type] || 'border-border'
                    }`}
                  >
                    {OPERATION_ICONS[type]}
                    <span>{getOperationLabel(type as OperationType)}</span>
                    <span className="font-bold">{count}</span>
                  </button>
                ))}
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <div className="space-y-2">
                  {filteredVisits.map((v: any) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleOpenAchievement(v)}
                      className={`w-full text-start flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${OPERATION_COLORS[v.operation_type] || 'border-border'}`}
                    >
                      <div className="mt-0.5">
                        {OPERATION_ICONS[v.operation_type] || <MapPin className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{getOperationLabel(v.operation_type as OperationType)}</span>
                          <span className="text-[10px] text-muted-foreground" dir="ltr">
                            {format(new Date(v.created_at), dateFrom === dateTo ? 'HH:mm' : 'dd/MM HH:mm')}
                          </span>
                        </div>
                        {v.customer_name && (
                          <p className="text-xs text-muted-foreground truncate">{v.customer_name}</p>
                        )}
                      </div>
                    </button>
                  ))}
                  {filteredVisits.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">لا توجد عمليات من هذا النوع</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Achievement Detail Dialog */}
      <Dialog open={!!selectedVisit} onOpenChange={(o) => { if (!o) setSelectedVisit(null); }}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto" dir="rtl">
          {selectedVisit && (
            <AchievementDetailContent
              visit={selectedVisit}
              onClose={() => setSelectedVisit(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <OrderDetailsDialog
        open={!!selectedOrderDetails}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedOrderDetails(null);
        }}
        order={selectedOrderDetails}
      />
    </>
  );
};

export default WorkerAchievementsDialog;
