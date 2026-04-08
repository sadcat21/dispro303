import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import AdaptiveScrollContainer from '@/components/ui/adaptive-scroll-container';
import { Loader2, MapPin, ShoppingCart, Truck, Package, UserPlus, Edit2, Banknote, Eye, CalendarCheck, ClipboardList, BarChart3, ArrowRight } from 'lucide-react';
import { getOperationLabel, type OperationType } from '@/hooks/useVisitTracking';
import OrderDetailsDialog from '@/components/orders/OrderDetailsDialog';
import WorkerHandoverPreviewDialog from '@/components/accounting/WorkerHandoverPreviewDialog';
import WorkerSalesSummaryDialog from '@/components/accounting/WorkerSalesSummaryDialog';
import WorkerOrdersSummaryDialog from '@/components/accounting/WorkerOrdersSummaryDialog';
import type { OrderWithDetails } from '@/types/database';

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
  order: 'bg-blue-100/70 text-blue-700 border-blue-200',
  direct_sale: 'bg-emerald-100/70 text-emerald-700 border-emerald-200',
  delivery: 'bg-green-100/70 text-green-700 border-green-200',
  add_customer: 'bg-purple-100/70 text-purple-700 border-purple-200',
  update_customer: 'bg-amber-100/70 text-amber-700 border-amber-200',
  delete_customer: 'bg-red-100/70 text-red-700 border-red-200',
  debt_collection: 'bg-orange-100/70 text-orange-700 border-orange-200',
  visit: 'bg-cyan-100/70 text-cyan-700 border-cyan-200',
  delivery_visit: 'bg-teal-100/70 text-teal-700 border-teal-200',
};

const AchievementDetailContent: React.FC<{ visit: any; onClose: () => void }> = ({ visit, onClose }) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {OPERATION_ICONS[visit.operation_type] || <MapPin className="w-5 h-5" />}
          {getOperationLabel(visit.operation_type as OperationType)}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 text-sm">
        <div className="rounded-xl border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">التاريخ</span>
            <span dir="ltr">{format(new Date(visit.created_at), 'dd/MM/yyyy HH:mm')}</span>
          </div>
          {visit.customer_name ? (
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">العميل</span>
              <span>{visit.customer_name}</span>
            </div>
          ) : null}
          {visit.notes ? (
            <div className="space-y-1">
              <div className="font-medium">ملاحظات</div>
              <div className="text-muted-foreground">{visit.notes}</div>
            </div>
          ) : null}
        </div>
        <Button variant="outline" className="w-full" onClick={onClose}>
          إغلاق
        </Button>
      </div>
    </>
  );
};

const DebtAggregatesDialog: React.FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId?: string;
  dateFrom: string;
  dateTo: string;
}> = ({ open, onOpenChange, workerId, dateFrom, dateTo }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['worker-achievement-debt-aggregates', workerId, dateFrom, dateTo],
    queryFn: async () => {
      if (!workerId) return { newDebts: [], collectedDebts: [] };
      const [{ data: newDebts }, { data: collectedDebts }] = await Promise.all([
        supabase
          .from('customer_debts')
          .select('id,total_amount,remaining_amount,created_at,status,customer:customers(name,store_name,phone)')
          .eq('created_by', workerId)
          .gte('created_at', `${dateFrom}T00:00:00`)
          .lte('created_at', `${dateTo}T23:59:59`)
          .order('created_at', { ascending: false }),
        supabase
          .from('debt_collections')
          .select('id,amount,collected_at,payment_method,debt:customer_debts(customer:customers(name,store_name,phone))')
          .eq('collector_id', workerId)
          .gte('collected_at', `${dateFrom}T00:00:00`)
          .lte('collected_at', `${dateTo}T23:59:59`)
          .order('collected_at', { ascending: false }),
      ]);
      return { newDebts: newDebts || [], collectedDebts: collectedDebts || [] };
    },
    enabled: open && !!workerId,
  });

  const newDebtTotal = (data?.newDebts || []).reduce((sum: number, item: any) => sum + Number(item.total_amount || 0), 0);
  const collectedTotal = (data?.collectedDebts || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>تجميعات الديون</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="collected" className="space-y-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="collected">الديون المحصلة</TabsTrigger>
            <TabsTrigger value="new">الديون الجديدة</TabsTrigger>
          </TabsList>

          <TabsContent value="collected" className="space-y-3">
            <Card className="rounded-2xl">
              <CardContent className="p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">الإجمالي</span>
                <span className="font-black text-green-700" dir="ltr">{collectedTotal.toLocaleString()} DA</span>
              </CardContent>
            </Card>
            <AdaptiveScrollContainer
              maxHeightClassName="h-[45vh]"
              className="rounded-2xl border"
              contentClassName="space-y-2 p-2"
            >
                {(data?.collectedDebts || []).map((item: any) => (
                  <div key={item.id} className="rounded-xl border bg-green-50/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{item.debt?.customer?.store_name || item.debt?.customer?.name || 'عميل'}</div>
                      <div className="font-bold text-green-700" dir="ltr">{Number(item.amount || 0).toLocaleString()} DA</div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground" dir="ltr">
                      {format(new Date(item.collected_at), 'dd/MM/yyyy')}
                    </div>
                  </div>
                ))}
                {!isLoading && !(data?.collectedDebts || []).length ? <div className="py-8 text-center text-sm text-muted-foreground">لا توجد تحصيلات</div> : null}
            </AdaptiveScrollContainer>
          </TabsContent>

          <TabsContent value="new" className="space-y-3">
            <Card className="rounded-2xl">
              <CardContent className="p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">الإجمالي</span>
                <span className="font-black text-destructive" dir="ltr">{newDebtTotal.toLocaleString()} DA</span>
              </CardContent>
            </Card>
            <AdaptiveScrollContainer
              maxHeightClassName="h-[45vh]"
              className="rounded-2xl border"
              contentClassName="space-y-2 p-2"
            >
                {(data?.newDebts || []).map((item: any) => (
                  <div key={item.id} className="rounded-xl border bg-red-50/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{item.customer?.store_name || item.customer?.name || 'عميل'}</div>
                      <div className="font-bold text-destructive" dir="ltr">{Number(item.total_amount || 0).toLocaleString()} DA</div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground" dir="ltr">
                      {format(new Date(item.created_at), 'dd/MM/yyyy')}
                    </div>
                  </div>
                ))}
                {!isLoading && !(data?.newDebts || []).length ? <div className="py-8 text-center text-sm text-muted-foreground">لا توجد ديون جديدة</div> : null}
            </AdaptiveScrollContainer>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const MyAchievements: React.FC = () => {
  const { workerId, user } = useAuth();
  const [searchParams] = useSearchParams();
  const today = format(new Date(), 'yyyy-MM-dd');
  const targetWorkerId = searchParams.get('worker') || workerId;
  const targetWorkerName = searchParams.get('name') || user?.full_name;
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<OrderWithDetails | null>(null);
  const [showHandoverSummary, setShowHandoverSummary] = useState(false);
  const [showSalesSummary, setShowSalesSummary] = useState(false);
  const [showOrdersSummary, setShowOrdersSummary] = useState(false);
  const [showDebtAggregates, setShowDebtAggregates] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['my-achievements-page', targetWorkerId, today],
    queryFn: async () => {
      if (!targetWorkerId) return { visits: [], counts: {} };
      const { data: visits } = await supabase
        .from('visit_tracking')
        .select('*')
        .eq('worker_id', targetWorkerId)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false });

      const customerIds = [...new Set((visits || []).filter((v) => v.customer_id).map((v) => v.customer_id!))];
      let customerMap = new Map<string, string>();
      if (customerIds.length) {
        const { data: customers } = await supabase.from('customers').select('id,name,store_name').in('id', customerIds);
        for (const customer of customers || []) {
          customerMap.set(customer.id, customer.store_name || customer.name);
        }
      }

      const enrichedVisits = (visits || []).map((visit) => ({
        ...visit,
        customer_name: visit.customer_id ? customerMap.get(visit.customer_id) || '' : '',
      }));

      const counts: Record<string, number> = {};
      for (const visit of enrichedVisits) counts[visit.operation_type] = (counts[visit.operation_type] || 0) + 1;
      return { visits: enrichedVisits, counts };
    },
    enabled: !!targetWorkerId,
  });

  const visits = data?.visits || [];
  const counts = data?.counts || {};
  const filteredVisits = useMemo(() => {
    if (!activeFilter) return visits;
    return visits.filter((visit: any) => visit.operation_type === activeFilter);
  }, [visits, activeFilter]);

  const handleOpenAchievement = async (visit: any) => {
    const orderLikeTypes = ['order', 'direct_sale', 'delivery'];
    const entityId = visit.entity_id || visit.order_id || visit.reference_id;
    if (!orderLikeTypes.includes(visit.operation_type) || !entityId) {
      setSelectedVisit(visit);
      return;
    }

    const { data } = await supabase
      .from('orders')
      .select(`*, customer:customers(*), worker:workers(*)`)
      .eq('id', entityId)
      .single();

    if (data) {
      setSelectedOrderDetails(data as OrderWithDetails);
      return;
    }
    setSelectedVisit(visit);
  };

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">منجزات اليوم</h1>
          <p className="text-sm text-muted-foreground">{targetWorkerName || 'العامل'}</p>
        </div>
        <Button variant="outline" className="rounded-full" onClick={() => history.back()}>
          <ArrowRight className="w-4 h-4 ml-1" />
          رجوع
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button className="rounded-2xl" variant="outline" onClick={() => setShowHandoverSummary(true)}>
          <ClipboardList className="w-4 h-4 ml-1" />
          ملخص التسليم
        </Button>
        <Button className="rounded-2xl" variant="outline" onClick={() => setShowDebtAggregates(true)}>
          <BarChart3 className="w-4 h-4 ml-1" />
          التجميعات
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="rounded-2xl" onClick={() => setShowSalesSummary(true)}>
          <Package className="w-4 h-4 ml-1" />
          تجميع المبيعات
        </Button>
        <Button variant="outline" className="rounded-2xl" onClick={() => setShowOrdersSummary(true)}>
          <ShoppingCart className="w-4 h-4 ml-1" />
          تجميع الطلبات
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter(null)}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border ${!activeFilter ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/60 text-foreground border-border'}`}
        >
          الكل
          <span>{visits.length}</span>
        </button>
        {Object.entries(counts).map(([type, count]) => (
          <button
            key={type}
            onClick={() => setActiveFilter(activeFilter === type ? null : type)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${activeFilter === type ? 'bg-primary text-primary-foreground border-primary' : OPERATION_COLORS[type] || 'border-border'}`}
          >
            {OPERATION_ICONS[type]}
            <span>{getOperationLabel(type as OperationType)}</span>
            <span className="font-bold">{count}</span>
          </button>
        ))}
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">قائمة المنجزات</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {isLoading ? (
            <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <AdaptiveScrollContainer
              maxHeightClassName="max-h-[min(62dvh,620px)]"
              contentClassName="space-y-2 pe-1"
            >
              {filteredVisits.map((visit: any) => (
                <button
                  key={visit.id}
                  type="button"
                  onClick={() => handleOpenAchievement(visit)}
                  className={`w-full rounded-2xl border p-3 text-right transition-shadow hover:shadow-sm ${OPERATION_COLORS[visit.operation_type] || 'border-border'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{OPERATION_ICONS[visit.operation_type] || <MapPin className="w-4 h-4" />}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold">{getOperationLabel(visit.operation_type as OperationType)}</div>
                        <div className="text-[11px] text-muted-foreground" dir="ltr">{format(new Date(visit.created_at), 'dd/MM/yyyy')}</div>
                      </div>
                      {visit.customer_name ? <div className="mt-1 text-sm text-muted-foreground truncate">{visit.customer_name}</div> : null}
                    </div>
                  </div>
                </button>
              ))}
              {!filteredVisits.length ? <div className="py-10 text-center text-sm text-muted-foreground">لا توجد منجزات ضمن هذه الفترة</div> : null}
            </AdaptiveScrollContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedVisit} onOpenChange={(open) => !open && setSelectedVisit(null)}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto" dir="rtl">
          {selectedVisit ? <AchievementDetailContent visit={selectedVisit} onClose={() => setSelectedVisit(null)} /> : null}
        </DialogContent>
      </Dialog>

      <OrderDetailsDialog
        open={!!selectedOrderDetails}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedOrderDetails(null);
        }}
        order={selectedOrderDetails}
      />

      <WorkerHandoverPreviewDialog open={showHandoverSummary} onOpenChange={setShowHandoverSummary} />
      <WorkerSalesSummaryDialog open={showSalesSummary} onOpenChange={setShowSalesSummary} workerId={targetWorkerId || undefined} workerName={targetWorkerName || undefined} />
      <WorkerOrdersSummaryDialog open={showOrdersSummary} onOpenChange={setShowOrdersSummary} workerId={targetWorkerId || undefined} workerName={targetWorkerName || undefined} />
      <DebtAggregatesDialog open={showDebtAggregates} onOpenChange={setShowDebtAggregates} workerId={targetWorkerId || undefined} dateFrom={today} dateTo={today} />
    </div>
  );
};

export default MyAchievements;
