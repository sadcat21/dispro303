import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAllOrderEvents } from '@/hooks/useOrderEvents';
import { useOrderItems } from '@/hooks/useOrders';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Search, Filter, ArrowRightLeft, UserCheck, CreditCard, Package, Printer, Plus, DollarSign, Clock, Users, ChevronLeft, Truck, ShoppingCart, CheckCircle2, XCircle, Loader2, MapPin, Ban, Lock, UserX, HandCoins, Receipt, Pencil } from 'lucide-react';
import OrderFlowDialog from '@/components/orders/OrderFlowDialog';
import CustomerSummary from '@/components/customers/CustomerSummary';

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  created: { label: 'إنشاء طلبية', icon: Plus, color: 'bg-green-100 text-green-700 border-green-200' },
  status_change: { label: 'تغيير الحالة', icon: ArrowRightLeft, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  worker_changed: { label: 'تعيين عامل', icon: UserCheck, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  payment_updated: { label: 'تحديث الدفع', icon: CreditCard, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  item_modified: { label: 'تعديل المنتجات', icon: Package, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  amount_changed: { label: 'تغيير المبلغ', icon: DollarSign, color: 'bg-rose-100 text-rose-700 border-rose-200' },
  printed: { label: 'طباعة', icon: Printer, color: 'bg-gray-100 text-gray-700 border-gray-200' },
  price_changed: { label: 'تغيير السعر', icon: DollarSign, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  assigned: 'معيّنة',
  in_transit: 'قيد التوصيل',
  delivered: 'تم التسليم',
  cancelled: 'ملغاة',
  postponed: 'مؤجلة',
  confirmed: 'مؤكدة',
  completed: 'مكتملة',
};

const STATUS_STEPS = ['pending', 'assigned', 'in_transit', 'arrived', 'delivered'];

const STATUS_STEP_CONFIG: Record<string, { label: string; icon: React.ElementType; activeColor: string }> = {
  pending: { label: 'إنشاء', icon: ShoppingCart, activeColor: 'bg-blue-500' },
  assigned: { label: 'تعيين', icon: UserCheck, activeColor: 'bg-purple-500' },
  in_transit: { label: 'نقل', icon: Truck, activeColor: 'bg-amber-500' },
  arrived: { label: 'وصول', icon: MapPin, activeColor: 'bg-cyan-500' },
  delivered: { label: 'تسليم', icon: CheckCircle2, activeColor: 'bg-green-500' },
};

// Non-delivery reasons
const NON_DELIVERY_REASONS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  closed: { label: 'مغلق', icon: Lock, color: 'text-orange-600' },
  unavailable: { label: 'غير متاح', icon: UserX, color: 'text-amber-600' },
  debt_refused: { label: 'رفض دين', icon: HandCoins, color: 'text-red-600' },
  customer_cancelled: { label: 'إلغاء العميل', icon: Ban, color: 'text-gray-600' },
  unknown: { label: 'بدون تسليم', icon: XCircle, color: 'text-muted-foreground' },
};

interface GroupedOrder {
  orderId: string;
  customerName: string;
  currentStatus: string;
  totalAmount: number | null;
  events: any[];
  latestEvent: string;
  createdByName: string | null;
  assignedWorkerName: string | null;
  orderNotes: string | null;
  paymentType: string | null;
  invoicePaymentMethod: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  customerData: {
    name?: string | null;
    store_name?: string | null;
    customer_type?: string | null;
    sector_name?: string | null;
    zone_name?: string | null;
  } | null;
}

const getDeliveryOutcome = (order: GroupedOrder) => {
  const notes = order.orderNotes?.toLowerCase() || '';
  const events = order.events;
  const lastStatusEvent = [...events].reverse().find((e: any) => e.event_type === 'status_change');
  
  if (order.currentStatus === 'delivered') return { type: 'delivered' as const };
  if (order.currentStatus === 'cancelled') {
    if (notes.includes('مغلق')) return { type: 'not_delivered' as const, reason: 'closed' };
    if (notes.includes('غير متاح')) return { type: 'not_delivered' as const, reason: 'unavailable' };
    if (notes.includes('دين') || notes.includes('رفض')) return { type: 'not_delivered' as const, reason: 'debt_refused' };
    if (notes.includes('إلغاء') || notes.includes('الغ')) return { type: 'not_delivered' as const, reason: 'customer_cancelled' };
    return { type: 'not_delivered' as const, reason: 'unknown' };
  }
  return null;
};

const OrderTimeline: React.FC<{ order: GroupedOrder }> = ({ order }) => {
  const { events } = order;
  const outcome = getDeliveryOutcome(order);

  return (
    <div className="relative pe-4">
      <div className="absolute end-[7px] top-2 bottom-2 w-0.5 bg-border" />
      
      {events.map((event: any, idx: number) => {
        const config = EVENT_TYPE_CONFIG[event.event_type] || { label: event.event_type, icon: Clock, color: 'bg-muted text-muted-foreground' };
        const Icon = config.icon;
        const isLast = idx === events.length - 1;

        // Determine contextual worker name
        let workerInfo: string | null = null;
        if (event.event_type === 'created') {
          workerInfo = event.performer?.full_name || order.createdByName;
        } else if (event.event_type === 'worker_changed' || (event.event_type === 'status_change' && event.new_value === 'assigned')) {
          workerInfo = order.assignedWorkerName || event.performer?.full_name;
        } else if (event.performer?.full_name) {
          workerInfo = event.performer.full_name;
        }
        
        return (
          <div key={event.id} className="relative flex items-start gap-3 pb-4">
            <div className={`relative z-10 w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-1 ${
              isLast ? 'bg-primary border-primary' : 'bg-background border-muted-foreground/40'
            }`} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3 w-3 ${config.color.split(' ')[1]}`} />
                  <span className="text-xs font-medium">{config.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(event.created_at), 'MM/dd HH:mm')}
                </span>
              </div>
              
              {event.event_type === 'status_change' && (
                <div className="mt-0.5 flex items-center gap-1 text-[11px]">
                  <span className="text-muted-foreground">{STATUS_LABELS[event.old_value] || event.old_value}</span>
                  <span>←</span>
                  <span className="font-medium text-primary">{STATUS_LABELS[event.new_value] || event.new_value}</span>
                </div>
              )}
              
              {event.event_type === 'amount_changed' && (
                <div className="mt-0.5 text-[11px]">
                  <span className="text-muted-foreground" dir="ltr" style={{ unicodeBidi: 'embed' }}>
                    {Number(event.old_value).toLocaleString()} → {Number(event.new_value).toLocaleString()} د.ج
                  </span>
                  {/* Show current payment context from enhanced trigger */}
                  {event.details?.payment_type && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge variant="outline" className={`text-[8px] py-0 px-1 ${
                        event.details.payment_type === 'with_invoice' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                      }`}>
                        {event.details.payment_type === 'with_invoice' ? 'F1' : 'F2'}
                      </Badge>
                      {event.details.invoice_payment_method && event.details.payment_type !== 'with_invoice' && (
                        <Badge variant="outline" className="text-[8px] py-0 px-1 bg-purple-50 text-purple-600 border-purple-200">
                          {event.details.invoice_payment_method === 'super_gros' ? 'SG' : event.details.invoice_payment_method === 'gros' ? 'G' : event.details.invoice_payment_method === 'retail' ? 'D' : event.details.invoice_payment_method}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Payment type change event (F1 ← F2) */}
              {event.event_type === 'payment_updated' && (
                <div className="mt-0.5 text-[11px]">
                  {event.details?.payment_type_change && (
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className={`text-[8px] py-0 px-1 ${
                        event.old_value === 'with_invoice' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                      }`}>
                        {event.old_value === 'with_invoice' ? 'F1' : 'F2'}
                      </Badge>
                      <span className="text-[10px]">←</span>
                      <Badge variant="outline" className={`text-[8px] py-0 px-1 font-bold ${
                        event.new_value === 'with_invoice' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-orange-100 text-orange-700 border-orange-300'
                      }`}>
                        {event.new_value === 'with_invoice' ? 'F1' : 'F2'}
                      </Badge>
                    </div>
                  )}
                  {event.details?.invoice_method_change && (
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[8px] py-0 px-1">
                        {event.details.old_invoice_method === 'super_gros' ? 'SG' : event.details.old_invoice_method === 'gros' ? 'G' : event.details.old_invoice_method === 'retail' ? 'D' : event.details.old_invoice_method || '—'}
                      </Badge>
                      <span className="text-[10px]">←</span>
                      <Badge variant="outline" className="text-[8px] py-0 px-1 bg-primary/10 text-primary border-primary/20 font-bold">
                        {event.details.new_invoice_method === 'super_gros' ? 'SG' : event.details.new_invoice_method === 'gros' ? 'G' : event.details.new_invoice_method === 'retail' ? 'D' : event.details.new_invoice_method || '—'}
                      </Badge>
                    </div>
                  )}
                  {!event.details?.payment_type_change && !event.details?.invoice_method_change && (
                    <span className="text-muted-foreground">
                      {event.old_value || '—'} → {event.new_value || '—'}
                    </span>
                  )}
                </div>
              )}

              {event.event_type === 'created' && event.details?.total_amount && (
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  المبلغ: {Number(event.details.total_amount).toLocaleString()} د.ج
                </div>
              )}
              
              {workerInfo && (
                <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Users className="h-2.5 w-2.5" />
                  {workerInfo}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Delivery outcome */}
      {outcome && (
        <div className="relative flex items-start gap-3 pb-2">
          <div className={`relative z-10 w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-1 ${
            outcome.type === 'delivered' ? 'bg-green-500 border-green-500' : 'bg-destructive border-destructive'
          }`} />
          <div className="flex-1">
            {outcome.type === 'delivered' ? (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                <span className="text-xs font-medium text-green-700">تم التسليم بنجاح</span>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-1.5">
                  {React.createElement(NON_DELIVERY_REASONS[outcome.reason || 'unknown'].icon, { className: `h-3 w-3 ${NON_DELIVERY_REASONS[outcome.reason || 'unknown'].color}` })}
                  <span className={`text-xs font-medium ${NON_DELIVERY_REASONS[outcome.reason || 'unknown'].color}`}>
                    {NON_DELIVERY_REASONS[outcome.reason || 'unknown'].label}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const StatusProgressBar: React.FC<{ order: GroupedOrder; large?: boolean }> = ({ order, large = false }) => {
  const { currentStatus } = order;
  const isCancelled = currentStatus === 'cancelled';
  const isDelivered = currentStatus === 'delivered';
  
  const hasAssigned = order.events.some((e: any) => 
    (e.event_type === 'status_change' && e.new_value === 'assigned') || e.event_type === 'worker_changed'
  );
  const hasInTransit = order.events.some((e: any) => 
    e.event_type === 'status_change' && e.new_value === 'in_transit'
  );

  const getStepActive = (step: string) => {
    if (isCancelled) return false;
    switch (step) {
      case 'pending': return true;
      case 'assigned': return hasAssigned || ['assigned', 'in_transit', 'delivered'].includes(currentStatus);
      case 'in_transit': return hasInTransit || ['in_transit', 'delivered'].includes(currentStatus);
      case 'arrived': return isDelivered || isCancelled;
      case 'delivered': return isDelivered;
      default: return false;
    }
  };

  const iconSize = large ? 'h-3.5 w-3.5' : 'h-2.5 w-2.5';
  const dotSize = large ? 'w-7 h-7' : 'w-5 h-5';
  const fontSize = large ? 'text-[9px]' : 'text-[7px]';
  const workerFont = large ? 'text-[8px] max-w-[56px]' : 'text-[7px] max-w-[42px]';

  return (
    <div className="my-2 w-full">
      {/* Connection line behind dots */}
      <div className="relative">
        <div className="grid grid-cols-5 gap-1 w-full">
          {STATUS_STEPS.map((step, idx) => {
            const config = STATUS_STEP_CONFIG[step];
            const StepIcon = config.icon;
            const isActive = getStepActive(step);
            const isCurrent = step === currentStatus || (step === 'arrived' && isCancelled);

            return (
              <div key={step} className="flex flex-col items-center gap-0.5 min-w-0">
                <div className={`${dotSize} rounded-full flex items-center justify-center transition-all ${
                  isActive ? config.activeColor + ' text-white shadow-sm' : 'bg-muted text-muted-foreground'
                } ${isCurrent ? 'ring-2 ring-offset-1 ring-primary/60' : ''} ${isCancelled && step === 'arrived' ? 'bg-destructive text-white ring-destructive/40' : ''}`}>
                  {isCancelled && step === 'arrived' ? (
                    <XCircle className={iconSize} />
                  ) : (
                    <StepIcon className={iconSize} />
                  )}
                </div>
                <span className={`${fontSize} leading-tight text-center truncate max-w-full ${isActive ? 'font-semibold' : 'text-muted-foreground'}`}>
                  {config.label}
                </span>
                {step === 'pending' && order.createdByName && (
                  <span className={`${workerFont} text-muted-foreground truncate`}>{order.createdByName}</span>
                )}
                {step === 'assigned' && order.assignedWorkerName && (
                  <span className={`${workerFont} text-muted-foreground truncate`}>{order.assignedWorkerName}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {isCancelled && (
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          {(() => {
            const outcome = getDeliveryOutcome(order);
            const reason = outcome?.reason || 'unknown';
            const reasonConfig = NON_DELIVERY_REASONS[reason];
            return (
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border-destructive/30 ${reasonConfig.color}`}>
                {React.createElement(reasonConfig.icon, { className: 'h-3 w-3 me-1 inline' })}
                {reasonConfig.label}
              </Badge>
            );
          })()}
        </div>
      )}
    </div>
  );
};

const OrderTracking: React.FC<{ workerMode?: boolean }> = ({ workerMode = false }) => {
  const { language } = useLanguage();
  const { workerId } = useAuth();
  const isRTL = language === 'ar';
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return format(d, 'yyyy-MM-dd');
  });
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [workerFilter, setWorkerFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<GroupedOrder | null>(null);

  const { data: workers } = useQuery({
    queryKey: ['workers-list-for-tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workers')
        .select('id, full_name, role')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !workerMode,
  });

  const { data: events, isLoading } = useAllOrderEvents({
    dateFrom,
    dateTo,
    eventType: eventTypeFilter,
    workerId: workerMode ? undefined : workerFilter,
    createdBy: workerMode ? workerId || undefined : undefined,
  });

  const groupedOrders = useMemo<GroupedOrder[]>(() => {
    if (!events) return [];
    const map = new Map<string, GroupedOrder>();
    
    for (const e of events as any[]) {
      if (!map.has(e.order_id)) {
        map.set(e.order_id, {
          orderId: e.order_id,
          customerName: e.order?.customer?.name || 'غير معروف',
          currentStatus: e.order?.status || 'pending',
          totalAmount: e.order?.total_amount,
          events: [],
          latestEvent: e.created_at,
          createdByName: e.order?.created_by_worker?.full_name || null,
          assignedWorkerName: e.order?.assigned_worker?.full_name || null,
          orderNotes: e.order?.notes || null,
          paymentType: e.order?.payment_type || null,
          invoicePaymentMethod: e.order?.invoice_payment_method || null,
          createdAt: e.order?.created_at || null,
          updatedAt: e.order?.updated_at || null,
          customerData: e.order?.customer ? {
            name: e.order.customer.name,
            store_name: e.order.customer.store_name,
            customer_type: e.order.customer.customer_type,
            sector_name: e.order.customer.sector?.name || null,
            zone_name: e.order.customer.zone?.name || null,
          } : null,
        });
      }
      map.get(e.order_id)!.events.push(e);
    }

    for (const group of map.values()) {
      group.events.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return Array.from(map.values()).sort((a, b) => 
      new Date(b.latestEvent).getTime() - new Date(a.latestEvent).getTime()
    );
  }, [events]);

  const filteredOrders = useMemo(() => {
    if (!searchQuery) return groupedOrders;
    const q = searchQuery.toLowerCase();
    return groupedOrders.filter(o => 
      o.customerName.toLowerCase().includes(q) || o.orderId.toLowerCase().includes(q)
    );
  }, [groupedOrders, searchQuery]);

  const stats = useMemo(() => {
    if (!events) return { total: 0, statusChanges: 0, modifications: 0, newOrders: 0 };
    const evts = events as any[];
    return {
      total: evts.length,
      statusChanges: evts.filter(e => e.event_type === 'status_change').length,
      modifications: evts.filter(e => ['item_modified', 'amount_changed', 'price_changed', 'payment_updated'].includes(e.event_type)).length,
      newOrders: evts.filter(e => e.event_type === 'created').length,
    };
  }, [events]);

  return (
    <div className="space-y-3 pb-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="text-xl font-bold">{workerMode ? 'تتبع طلباتي' : 'لوحة تتبع الطلبات'}</h1>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <Card className="p-2 text-center">
          <div className="text-lg font-bold text-primary">{stats.total}</div>
          <div className="text-[9px] text-muted-foreground">الأحداث</div>
        </Card>
        <Card className="p-2 text-center">
          <div className="text-lg font-bold text-green-600">{stats.newOrders}</div>
          <div className="text-[9px] text-muted-foreground">جديدة</div>
        </Card>
        <Card className="p-2 text-center">
          <div className="text-lg font-bold text-blue-600">{stats.statusChanges}</div>
          <div className="text-[9px] text-muted-foreground">حالات</div>
        </Card>
        <Card className="p-2 text-center">
          <div className="text-lg font-bold text-orange-600">{stats.modifications}</div>
          <div className="text-[9px] text-muted-foreground">تعديلات</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">من</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">إلى</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute end-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-8 text-sm pe-8" />
            </div>
            <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
              <SelectTrigger className="w-28 h-8 text-sm">
                <Filter className="h-3 w-3 ml-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="created">إنشاء</SelectItem>
                <SelectItem value="status_change">حالة</SelectItem>
                <SelectItem value="worker_changed">عامل</SelectItem>
                <SelectItem value="payment_updated">دفع</SelectItem>
                <SelectItem value="amount_changed">مبلغ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!workerMode && (
            <Select value={workerFilter} onValueChange={setWorkerFilter}>
              <SelectTrigger className="h-8 text-sm">
                <Users className="h-3 w-3 ml-1" />
                <SelectValue placeholder="كل العمال" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل العمال</SelectItem>
                {workers?.map(w => (
                  <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Orders List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          لا توجد طلبات في الفترة المحددة
        </Card>
      ) : (
        <div className="pb-20">
          <div className="space-y-2">
            {filteredOrders.map(order => {
              const statusStyle = 
                order.currentStatus === 'delivered' ? 'border-s-green-500' :
                order.currentStatus === 'cancelled' ? 'border-s-red-500' :
                order.currentStatus === 'assigned' ? 'border-s-purple-500' :
                order.currentStatus === 'in_transit' ? 'border-s-amber-500' :
                'border-s-blue-500';

              return (
                <Card
                  key={order.orderId}
                  className={`cursor-pointer hover:shadow-md transition-all border-s-[3px] ${statusStyle} active:scale-[0.99]`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="p-3 space-y-2">
                    {/* Header: Customer + Status + Amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {order.customerData ? (
                          <CustomerSummary
                            customer={order.customerData}
                            compact
                            showAvatar={false}
                            showMeta={false}
                          />
                        ) : (
                          <span className="font-medium text-sm">{order.customerName}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className={`text-[10px] ${
                          order.currentStatus === 'delivered' ? 'bg-green-100 text-green-700 border-green-200' :
                          order.currentStatus === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                          order.currentStatus === 'assigned' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                          order.currentStatus === 'in_transit' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-blue-100 text-blue-700 border-blue-200'
                        }`}>
                          {STATUS_LABELS[order.currentStatus] || order.currentStatus}
                        </Badge>
                        {order.totalAmount && (
                          <span className="text-xs font-bold text-foreground">{Number(order.totalAmount).toLocaleString()} د.ج</span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <StatusProgressBar order={order} />
                    
                    {/* Footer: meta info */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{order.events.length} حدث</span>
                        {order.paymentType && (
                          <Badge variant="outline" className={`text-[8px] py-0 px-1 ${
                            order.paymentType === 'with_invoice' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-orange-50 text-orange-600 border-orange-200'
                          }`}>
                            {order.paymentType === 'with_invoice' ? 'F1' : 'F2'}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">#{order.orderId.slice(0, 6)}</span>
                        <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
          {/* Dialog Header */}
          <div className="p-4 pb-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-mono">#{selectedOrder?.orderId.slice(0, 8)}</span>
              <Badge variant="outline" className={`text-[10px] ${
                selectedOrder?.currentStatus === 'delivered' ? 'bg-green-100 text-green-700 border-green-200' :
                selectedOrder?.currentStatus === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                selectedOrder?.currentStatus === 'in_transit' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                'bg-blue-100 text-blue-700 border-blue-200'
              }`}>
                {STATUS_LABELS[selectedOrder?.currentStatus || ''] || selectedOrder?.currentStatus}
              </Badge>
            </div>
            {selectedOrder?.customerData && (
              <CustomerSummary
                customer={selectedOrder.customerData}
                compact
                showAvatar={false}
                showMeta={false}
              />
            )}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
              {selectedOrder?.createdAt && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(selectedOrder.createdAt), 'yyyy/MM/dd HH:mm')}
                </span>
              )}
              {selectedOrder?.currentStatus === 'delivered' && selectedOrder?.updatedAt && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {format(new Date(selectedOrder.updatedAt), 'yyyy/MM/dd HH:mm')}
                </span>
              )}
            </div>
          </div>
          
          {selectedOrder && (
            <div className="flex-1 overflow-auto p-4">
              <OrderDetailsContent order={selectedOrder} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Separate component so useOrderItems hook is called at top level
const OrderDetailsContent: React.FC<{ order: GroupedOrder }> = ({ order }) => {
  const { data: orderItems, isLoading: itemsLoading } = useOrderItems(order.orderId);
  const [showModify, setShowModify] = useState(false);

  // Fetch full order for OrderFlowDialog
  const { data: fullOrder } = useQuery({
    queryKey: ['order-full', order.orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:customers(*), assigned_worker:workers!orders_assigned_worker_id_fkey(id, full_name, username)')
        .eq('id', order.orderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: showModify,
  });
  
  const PAYMENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    with_invoice: { label: 'فاتورة 1 (Facture 1)', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    without_invoice: { label: 'فاتورة 2 (Sans Facture)', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  };
  const INVOICE_METHOD_LABELS: Record<string, string> = {
    receipt: 'Versement',
    check: 'Chèque',
    cash: 'Espèces (نقداً)',
    transfer: 'Virement',
  };
  const PRICE_SUBTYPE_LABELS: Record<string, { label: string; color: string }> = {
    retail: { label: 'تجزئة (Détail)', color: 'bg-green-100 text-green-700 border-green-200' },
    gros: { label: 'جملة (Gros)', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    super_gros: { label: 'سوبر جملة (Super Gros)', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    invoice: { label: 'فاتورة (Invoice)', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  };

  // Get price_subtype from first order item
  const priceSubtype = orderItems?.[0]?.price_subtype as string | undefined;

  return (
    <div className="space-y-4">
      {/* Large Progress Bar */}
      <StatusProgressBar order={order} large />
      
      {/* Order Summary Card */}
      <div className="bg-muted/30 rounded-xl p-3 space-y-2.5">
        {/* Amount row */}
        {order.totalAmount && (
          <div className="text-center">
            <span className="text-2xl font-bold text-foreground">{Number(order.totalAmount).toLocaleString()}</span>
            <span className="text-sm text-muted-foreground ms-1">د.ج</span>
          </div>
        )}
        
        {/* Payment badges */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {order.paymentType && (
            <Badge variant="outline" className={`text-[10px] ${PAYMENT_TYPE_LABELS[order.paymentType]?.color || ''}`}>
              <Receipt className="h-2.5 w-2.5 me-1" />
              {PAYMENT_TYPE_LABELS[order.paymentType]?.label || order.paymentType}
            </Badge>
          )}
          {order.paymentType === 'without_invoice' && priceSubtype && (
            <Badge variant="outline" className={`text-[10px] ${PRICE_SUBTYPE_LABELS[priceSubtype]?.color || ''}`}>
              {PRICE_SUBTYPE_LABELS[priceSubtype]?.label || priceSubtype}
            </Badge>
          )}
          {order.invoicePaymentMethod && (
            <Badge variant="outline" className="text-[10px]">
              <CreditCard className="h-2.5 w-2.5 me-1" />
              {INVOICE_METHOD_LABELS[order.invoicePaymentMethod] || order.invoicePaymentMethod}
            </Badge>
          )}
        </div>

        {/* Workers row */}
        <div className="flex items-center justify-center gap-2">
          {order.createdByName && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ShoppingCart className="h-3 w-3" />
              <span>{order.createdByName}</span>
            </div>
          )}
          {order.createdByName && order.assignedWorkerName && (
            <span className="text-muted-foreground/40">|</span>
          )}
          {order.assignedWorkerName && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Truck className="h-3 w-3" />
              <span>{order.assignedWorkerName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Modify Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 rounded-full px-4"
          onClick={() => setShowModify(true)}
        >
          <Pencil className="h-3 w-3" />
          تعديل الطلبية
        </Button>
      </div>

      {/* Order Items */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="bg-muted/40 px-3 py-2 border-b flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground">منتجات الطلبية</h3>
        </div>
        {itemsLoading ? (
          <div className="flex justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : orderItems && orderItems.length > 0 ? (
          <div className="divide-y divide-border/50">
            {orderItems.map((item: any) => (
              <div key={item.id} className="flex items-center gap-2.5 p-2.5">
                <div className="relative w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-visible">
                  {item.product?.image_url ? (
                    <img src={item.product.image_url} alt={item.product?.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Package className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="absolute -top-1.5 -end-1.5 bg-primary text-primary-foreground text-[10px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full px-1 shadow-sm">
                    {item.quantity}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{item.product?.name || 'منتج'}</div>
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-muted-foreground">
                    {item.gift_quantity > 0 && (
                      <span className="text-green-600 font-medium">+ {item.gift_quantity} 🎁</span>
                    )}
                    {item.pricing_unit && item.pricing_unit !== 'box' && (
                      <Badge variant="outline" className="text-[8px] py-0 px-1">{item.pricing_unit === 'piece' ? 'قطعة' : item.pricing_unit === 'kg' ? 'كغ' : item.pricing_unit}</Badge>
                    )}
                    {(item as any).price_subtype && (
                      <Badge variant="outline" className={`text-[8px] py-0 px-1 ${
                        (item as any).price_subtype === 'invoice' ? 'border-blue-200 text-blue-600' :
                        (item as any).price_subtype === 'super_gros' ? 'border-indigo-200 text-indigo-600' :
                        (item as any).price_subtype === 'gros' ? 'border-purple-200 text-purple-600' :
                        'border-green-200 text-green-600'
                      }`}>
                        {(item as any).price_subtype === 'invoice' ? 'F1' : (item as any).price_subtype === 'super_gros' ? 'SG' : (item as any).price_subtype === 'gros' ? 'G' : 'D'}
                      </Badge>
                    )}
                  </div>
                  {item.product && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {item.product.price_retail != null && (
                        <span className={`text-[8px] px-1 rounded ${(item as any).price_subtype === 'retail' ? 'bg-green-100 text-green-700 font-bold' : 'text-muted-foreground'}`}>
                          D: {Number(item.product.price_retail).toLocaleString()}
                        </span>
                      )}
                      {item.product.price_gros != null && (
                        <span className={`text-[8px] px-1 rounded ${(item as any).price_subtype === 'gros' ? 'bg-purple-100 text-purple-700 font-bold' : 'text-muted-foreground'}`}>
                          G: {Number(item.product.price_gros).toLocaleString()}
                        </span>
                      )}
                      {item.product.price_super_gros != null && (
                        <span className={`text-[8px] px-1 rounded ${(item as any).price_subtype === 'super_gros' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-muted-foreground'}`}>
                          SG: {Number(item.product.price_super_gros).toLocaleString()}
                        </span>
                      )}
                      {item.product.price_invoice != null && (
                        <span className={`text-[8px] px-1 rounded ${(item as any).price_subtype === 'invoice' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-muted-foreground'}`}>
                          F1: {Number(item.product.price_invoice).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-end shrink-0">
                  <div className="text-xs font-bold">{Number(item.total_price || 0).toLocaleString()}</div>
                  <div className="text-[9px] text-muted-foreground">
                    {Number(item.unit_price || 0).toLocaleString()} / و
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-xs text-muted-foreground py-4">لا توجد منتجات</div>
        )}
      </div>
      
      {/* Full Timeline */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="bg-muted/40 px-3 py-2 border-b flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-foreground">سجل الأحداث</h3>
        </div>
        <div className="p-3">
          <OrderTimeline order={order} />
        </div>
      </div>

      {/* Modify Order Dialog */}
      {showModify && fullOrder && (
        <OrderFlowDialog
          open={showModify}
          onOpenChange={(open) => setShowModify(open)}
          mode="edit"
          order={fullOrder as any}
        />
      )}
    </div>
  );
};

export default OrderTracking;
