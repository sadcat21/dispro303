import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ar, enUS, fr } from 'date-fns/locale';
import {
  Activity,
  ArrowLeft,
  CreditCard,
  Loader2,
  MapPin,
  ShoppingCart,
  User,
  Wallet,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Customer, OrderWithDetails } from '@/types/database';
import CustomerPickerDialog from '@/components/orders/CustomerPickerDialog';
import CustomerSummary from '@/components/customers/CustomerSummary';
import OrderDetailsDialog from '@/components/orders/OrderDetailsDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getLocalizedName } from '@/utils/sectorName';

interface NamedEntry {
  id?: string;
  name: string;
  name_fr?: string | null;
}

interface CustomerRecord extends Customer {
  sector?: NamedEntry | null;
  zone?: NamedEntry | null;
}

interface DebtRecord {
  id: string;
  customer_id: string;
  order_id: string | null;
  worker_id: string;
  branch_id: string | null;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number | null;
  status: string;
  notes: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  worker?: {
    id: string;
    full_name: string;
    username: string;
  } | null;
}

interface DebtCollectionRecord {
  id: string;
  debt_id: string;
  action: string;
  amount_collected: number;
  collection_date: string;
  created_at: string;
  next_due_date: string | null;
  notes: string | null;
  payment_method: string | null;
  status: string;
  worker?: {
    id: string;
    full_name: string;
    username: string;
  } | null;
  debt?: {
    id: string;
    customer_id: string;
    total_amount: number;
    remaining_amount: number | null;
    due_date: string | null;
    order_id: string | null;
  } | null;
}

interface VisitRecord {
  id: string;
  created_at: string;
  operation_type: string;
  operation_id: string | null;
  notes: string | null;
  address: string | null;
  worker_id: string;
  worker?: {
    id: string;
    full_name: string;
    username: string;
  } | null;
  order?: OrderWithDetails | null;
}

interface DebtTimelineItem {
  id: string;
  createdAt: string;
  kind: 'debt' | 'collection' | 'visit';
  title: string;
  amount: number;
  delta: number;
  debtId: string;
  workerName: string;
  paymentMethod: string | null;
  nextDueDate: string | null;
  notes: string | null;
  status: string | null;
  balanceAfter: number;
  debtRemainingAfter: number | null;
}

const managerRoles = ['admin', 'branch_admin', 'project_manager'];

const CustomerJourney = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCustomerId = searchParams.get('customerId');
  const { role, activeBranch } = useAuth();
  const { t, dir, language } = useLanguage();
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerId);
  const [activeTab, setActiveTab] = useState('debts');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);

  const dateLocale = language === 'ar' ? ar : language === 'fr' ? fr : enUS;
  const amountLocale = language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-US' : 'ar-DZ';

  useEffect(() => {
    if (initialCustomerId && initialCustomerId !== selectedCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    }
  }, [initialCustomerId, selectedCustomerId]);

  const formatAmount = (value: number | null | undefined) =>
    new Intl.NumberFormat(amountLocale, {
      minimumFractionDigits: Number(value || 0) % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—';
    return format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: dateLocale });
  };

  const getPaymentMethodLabel = (method: string | null | undefined) => {
    if (!method) return '—';
    if (method === 'cash') return language === 'fr' ? 'Espèces' : language === 'en' ? 'Cash' : 'كاش';
    if (method === 'check') return language === 'fr' ? 'Chèque' : language === 'en' ? 'Check' : 'شيك';
    if (method === 'transfer') return language === 'fr' ? 'Virement' : language === 'en' ? 'Transfer' : 'تحويل';
    if (method === 'receipt') return language === 'fr' ? 'Versement' : language === 'en' ? 'Receipt' : 'وصل';
    return method;
  };

  const getCollectionStatusLabel = (status: string | null | undefined) => {
    if (status === 'pending') return t('customers.journey.status_pending');
    if (status === 'approved') return t('customers.journey.status_approved');
    if (status === 'rejected') return t('customers.journey.status_rejected');
    return status || '—';
  };

  const getVisitOperationLabel = (type: string) => {
    const labels: Record<string, { ar: string; fr: string; en: string }> = {
      order: { ar: 'طلبية', fr: 'Commande', en: 'Order' },
      direct_sale: { ar: 'بيع مباشر', fr: 'Vente directe', en: 'Direct Sale' },
      delivery: { ar: 'توصيل', fr: 'Livraison', en: 'Delivery' },
      debt_collection: { ar: 'تحصيل دين', fr: 'Recouvrement', en: 'Debt Collection' },
      visit: { ar: 'زيارة', fr: 'Visite', en: 'Visit' },
      delivery_visit: { ar: 'زيارة بدون تسليم', fr: 'Visite sans livraison', en: 'Visit Without Delivery' },
      add_customer: { ar: 'إضافة عميل', fr: 'Ajout client', en: 'Add Customer' },
      update_customer: { ar: 'تعديل عميل', fr: 'Modification client', en: 'Update Customer' },
      delete_customer: { ar: 'حذف عميل', fr: 'Suppression client', en: 'Delete Customer' },
    };

    const label = labels[type];
    if (!label) return type;
    return label[language];
  };

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customer-journey-customers', role, activeBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select(`
          *,
          sector:sectors(id, name, name_fr),
          zone:sector_zones(id, name, name_fr)
        `)
        .order('name');

      if (role === 'branch_admin' && activeBranch?.id) {
        query = query.eq('branch_id', activeBranch.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CustomerRecord[];
    },
    enabled: managerRoles.includes(role || ''),
  });

  const { data: selectedCustomerRecord, isLoading: selectedCustomerLoading } = useQuery({
    queryKey: ['customer-journey-customer', selectedCustomerId, role, activeBranch?.id],
    queryFn: async () => {
      if (!selectedCustomerId) return null;

      let query = supabase
        .from('customers')
        .select(`
          *,
          sector:sectors(id, name, name_fr),
          zone:sector_zones(id, name, name_fr)
        `)
        .eq('id', selectedCustomerId);

      if (role === 'branch_admin' && activeBranch?.id) {
        query = query.eq('branch_id', activeBranch.id);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as CustomerRecord | null;
    },
    enabled: !!selectedCustomerId,
  });

  const { data: customerDebts = [], isLoading: debtsLoading } = useQuery({
    queryKey: ['customer-journey-debts', selectedCustomerId, role, activeBranch?.id],
    queryFn: async () => {
      if (!selectedCustomerId) return [];

      let query = supabase
        .from('customer_debts')
        .select(`
          *,
          worker:workers!customer_debts_worker_id_fkey(id, full_name, username)
        `)
        .eq('customer_id', selectedCustomerId)
        .order('created_at', { ascending: false });

      if (role === 'branch_admin' && activeBranch?.id) {
        query = query.eq('branch_id', activeBranch.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DebtRecord[];
    },
    enabled: !!selectedCustomerId,
  });

  const debtIds = useMemo(() => customerDebts.map((debt) => debt.id), [customerDebts]);

  const { data: debtCollections = [], isLoading: collectionsLoading } = useQuery({
    queryKey: ['customer-journey-collections', debtIds],
    queryFn: async () => {
      if (debtIds.length === 0) return [];

      const { data, error } = await supabase
        .from('debt_collections')
        .select(`
          *,
          worker:workers!debt_collections_worker_id_fkey(id, full_name, username),
          debt:customer_debts!debt_collections_debt_id_fkey(id, customer_id, total_amount, remaining_amount, due_date, order_id)
        `)
        .in('debt_id', debtIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as DebtCollectionRecord[];
    },
    enabled: debtIds.length > 0,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-journey-orders', selectedCustomerId, role, activeBranch?.id],
    queryFn: async () => {
      if (!selectedCustomerId) return [];

      let query = supabase
        .from('orders')
        .select(`
          *,
          customer:customers(*, sector:sectors(id, name, name_fr), zone:sector_zones(id, name, name_fr)),
          created_by_worker:workers!orders_created_by_fkey(id, full_name, username),
          assigned_worker:workers!orders_assigned_worker_id_fkey(id, full_name, username)
        `)
        .eq('customer_id', selectedCustomerId)
        .order('created_at', { ascending: false });

      if (role === 'branch_admin' && activeBranch?.id) {
        query = query.eq('branch_id', activeBranch.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as OrderWithDetails[];
    },
    enabled: !!selectedCustomerId,
  });

  const { data: visits = [], isLoading: visitsLoading } = useQuery({
    queryKey: ['customer-journey-visits', selectedCustomerId, role, activeBranch?.id],
    queryFn: async () => {
      if (!selectedCustomerId) return [];

      let query = supabase
        .from('visit_tracking')
        .select(`
          *,
          worker:workers!visit_tracking_worker_id_fkey(id, full_name, username)
        `)
        .eq('customer_id', selectedCustomerId)
        .order('created_at', { ascending: false });

      if (role === 'branch_admin' && activeBranch?.id) {
        query = query.eq('branch_id', activeBranch.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const orderIds = Array.from(
        new Set((data || []).map((visit) => visit.operation_id).filter(Boolean))
      ) as string[];

      const linkedOrders = orderIds.length > 0
        ? await supabase
            .from('orders')
            .select(`
              *,
              customer:customers(*, sector:sectors(id, name, name_fr), zone:sector_zones(id, name, name_fr)),
              created_by_worker:workers!orders_created_by_fkey(id, full_name, username),
              assigned_worker:workers!orders_assigned_worker_id_fkey(id, full_name, username)
            `)
            .in('id', orderIds)
        : { data: [], error: null };

      if (linkedOrders.error) throw linkedOrders.error;

      const orderMap = new Map((linkedOrders.data || []).map((order) => [order.id, order as OrderWithDetails]));

      return ((data || []).map((visit) => ({
        ...visit,
        order: visit.operation_id ? orderMap.get(visit.operation_id) || null : null,
      })) as VisitRecord[]);
    },
    enabled: !!selectedCustomerId,
  });

  const selectedCustomer = selectedCustomerRecord || customers.find((customer) => customer.id === selectedCustomerId) || null;

  const selectedCustomerSummary = useMemo(() => {
    if (!selectedCustomer) return null;

    return {
      ...selectedCustomer,
      name: language !== 'ar' ? (selectedCustomer.name_fr || selectedCustomer.name) : selectedCustomer.name,
      store_name: language !== 'ar' ? (selectedCustomer.store_name_fr || selectedCustomer.store_name) : selectedCustomer.store_name,
      sector_name: selectedCustomer.sector ? getLocalizedName(selectedCustomer.sector, language) : undefined,
      zone_name: selectedCustomer.zone ? getLocalizedName(selectedCustomer.zone, language) : undefined,
    };
  }, [language, selectedCustomer]);

  const debtSummary = useMemo(() => {
    const activeDebts = customerDebts.filter((debt) => debt.status !== 'paid');
    const currentDebt = activeDebts.reduce((sum, debt) => sum + Number(debt.remaining_amount || 0), 0);
    return {
      currentDebt,
      activeCount: activeDebts.length,
    };
  }, [customerDebts]);

  const purchaseSummary = useMemo(() => ({
    totalAmount: orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    ordersCount: orders.length,
  }), [orders]);

  const visitSummary = useMemo(() => {
    const withOrder = visits.filter((visit) => !!visit.order || visit.operation_type === 'order').length;
    return {
      total: visits.length,
      withOrder,
      withoutOrder: Math.max(0, visits.length - withOrder),
    };
  }, [visits]);

  const debtTimeline = useMemo(() => {
    const baseItems = [
      ...customerDebts.map((debt) => ({
        id: `debt-${debt.id}`,
        createdAt: debt.created_at,
        kind: 'debt' as const,
        title: t('customers.journey.created_debt'),
        amount: Number(debt.total_amount || 0),
        delta: Number(debt.total_amount || 0),
        debtId: debt.id,
        workerName: debt.worker?.full_name || debt.worker?.username || '—',
        paymentMethod: null,
        nextDueDate: debt.due_date,
        notes: debt.notes,
        status: debt.status,
      })),
      ...debtCollections.map((collection) => ({
        id: `collection-${collection.id}`,
        createdAt: collection.created_at || collection.collection_date,
        kind: collection.amount_collected > 0 ? ('collection' as const) : ('visit' as const),
        title: collection.amount_collected > 0 ? t('customers.journey.collected_debt') : t('customers.journey.no_payment_visit'),
        amount: Number(collection.amount_collected || 0),
        delta: ['partial_payment', 'full_payment'].includes(collection.action)
          ? -Number(collection.amount_collected || 0)
          : 0,
        debtId: collection.debt_id,
        workerName: collection.worker?.full_name || collection.worker?.username || '—',
        paymentMethod: collection.payment_method,
        nextDueDate: collection.next_due_date,
        notes: collection.notes,
        status: collection.status,
      })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let runningBalance = 0;
    const debtRunning = new Map<string, number>();

    const enriched = baseItems.map((item) => {
      if (item.kind === 'debt') {
        runningBalance += item.delta;
        debtRunning.set(item.debtId, item.amount);
      } else if (item.delta !== 0) {
        runningBalance += item.delta;
        const currentRemaining = debtRunning.get(item.debtId) ?? 0;
        debtRunning.set(item.debtId, Math.max(0, currentRemaining + item.delta));
      }

      return {
        ...item,
        balanceAfter: runningBalance,
        debtRemainingAfter: debtRunning.get(item.debtId) ?? null,
      };
    });

    return enriched.reverse() as DebtTimelineItem[];
  }, [customerDebts, debtCollections, t]);

  const isPageLoading = customersLoading || selectedCustomerLoading;
  const isDebtTabLoading = debtsLoading || collectionsLoading;
  const isPurchaseTabLoading = ordersLoading;
  const isVisitTabLoading = visitsLoading;

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setSearchParams({ customerId: customer.id });
    setCustomerPickerOpen(false);
  };

  return (
    <div className="p-3 pb-24 space-y-3" dir={dir}>
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
          {t('sales.back_to_list')}
        </Button>
        <div className="min-w-0 text-end">
          <h1 className="text-xl font-black truncate">{t('customers.journey.title')}</h1>
          <p className="text-xs text-muted-foreground truncate">{t('customers.journey.subtitle')}</p>
        </div>
      </div>

      <Card className="border-primary/15 shadow-sm">
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t('customers.journey.select_customer')}</p>
              <p className="font-semibold text-sm">
                {selectedCustomerSummary
                  ? (selectedCustomerSummary.store_name || selectedCustomerSummary.name || '—')
                  : t('customers.journey.empty')}
              </p>
            </div>
            <Button type="button" onClick={() => setCustomerPickerOpen(true)} className="shrink-0">
              {selectedCustomerSummary ? t('customers.journey.change_customer') : t('customers.journey.select_customer')}
            </Button>
          </div>

          {selectedCustomerSummary && (
            <div className="rounded-2xl border bg-muted/30 p-3">
              <CustomerSummary
                customer={selectedCustomerSummary}
                avatarSize="lg"
                meta={[
                  selectedCustomerSummary.phone,
                  selectedCustomerSummary.sector_name,
                  selectedCustomerSummary.zone_name,
                  selectedCustomerSummary.wilaya,
                ].filter(Boolean).join(' • ')}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {!selectedCustomerId ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-6 text-center">
            <User className="w-12 h-12 text-muted-foreground/60" />
            <p className="max-w-sm text-sm text-muted-foreground">{t('customers.journey.empty')}</p>
            <Button type="button" onClick={() => setCustomerPickerOpen(true)}>
              {t('customers.journey.select_customer')}
            </Button>
          </CardContent>
        </Card>
      ) : isPageLoading ? (
        <Card>
          <CardContent className="flex min-h-[220px] items-center justify-center p-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="grid w-full grid-cols-3 h-auto rounded-2xl p-1">
            <TabsTrigger value="debts" className="rounded-xl px-2 py-2.5 text-xs sm:text-sm">
              {t('customers.journey.debts_tab')}
            </TabsTrigger>
            <TabsTrigger value="purchases" className="rounded-xl px-2 py-2.5 text-xs sm:text-sm">
              {t('customers.journey.purchases_tab')}
            </TabsTrigger>
            <TabsTrigger value="visits" className="rounded-xl px-2 py-2.5 text-xs sm:text-sm">
              {t('customers.journey.visits_tab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="debts" className="space-y-3 mt-0">
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard
                title={t('customers.journey.current_debt')}
                value={formatAmount(debtSummary.currentDebt)}
                icon={Wallet}
                tone="rose"
                currency={t('common.currency')}
              />
              <SummaryCard
                title={t('customers.journey.active_debts')}
                value={String(debtSummary.activeCount)}
                icon={CreditCard}
                tone="amber"
              />
            </div>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('customers.journey.debt_movement')}</CardTitle>
                <CardDescription>{debtTimeline.length} {t('common.events')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isDebtTabLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : debtTimeline.length === 0 ? (
                  <EmptyState label={t('customers.journey.no_debt_events')} />
                ) : (
                  debtTimeline.map((item) => (
                    <div key={item.id} className="rounded-2xl border bg-background p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="border-primary/20 text-primary">
                              {item.title}
                            </Badge>
                            {item.status && (
                              <Badge
                                className={cn(
                                  'border-0',
                                  item.status === 'approved' && 'bg-emerald-100 text-emerald-700',
                                  item.status === 'pending' && 'bg-amber-100 text-amber-700',
                                  item.status === 'rejected' && 'bg-rose-100 text-rose-700',
                                  !['approved', 'pending', 'rejected'].includes(item.status) && 'bg-secondary text-secondary-foreground'
                                )}
                              >
                                {getCollectionStatusLabel(item.status)}
                              </Badge>
                            )}
                            {item.paymentMethod && (
                              <Badge variant="secondary">{getPaymentMethodLabel(item.paymentMethod)}</Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                            <span>{formatDateTime(item.createdAt)}</span>
                            <span>{item.kind === 'debt' ? t('customers.journey.created_by') : t('customers.journey.collected_by')}: {item.workerName}</span>
                            {item.nextDueDate && (
                              <span>{t('customers.journey.next_due')}: {formatDateTime(item.nextDueDate)}</span>
                            )}
                            {item.notes && <span className="line-clamp-2">{item.notes}</span>}
                          </div>
                        </div>

                        <div className="shrink-0 text-end">
                          <div className={cn(
                            'text-base font-black',
                            item.delta > 0 && 'text-rose-600',
                            item.delta < 0 && 'text-emerald-600',
                            item.delta === 0 && 'text-amber-600'
                          )} dir="ltr">
                            {item.delta > 0 ? '+' : item.delta < 0 ? '-' : '±'} {formatAmount(Math.abs(item.amount))} {t('common.currency')}
                          </div>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="grid grid-cols-2 gap-2">
                        <MiniInfoCard
                          label={t('customers.journey.running_balance')}
                          value={`${formatAmount(item.balanceAfter)} ${t('common.currency')}`}
                          tone="slate"
                        />
                        <MiniInfoCard
                          label={t('customers.journey.debt_remaining')}
                          value={`${formatAmount(item.debtRemainingAfter)} ${t('common.currency')}`}
                          tone="rose"
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchases" className="space-y-3 mt-0">
            <div className="grid grid-cols-2 gap-3">
              <SummaryCard
                title={t('customers.journey.total_purchases')}
                value={formatAmount(purchaseSummary.totalAmount)}
                icon={ShoppingCart}
                tone="emerald"
                currency={t('common.currency')}
              />
              <SummaryCard
                title={t('customers.journey.orders_count')}
                value={String(purchaseSummary.ordersCount)}
                icon={Activity}
                tone="sky"
              />
            </div>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('customers.journey.purchase_history')}</CardTitle>
                <CardDescription>{purchaseSummary.ordersCount} {t('nav.orders')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isPurchaseTabLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : orders.length === 0 ? (
                  <EmptyState label={t('customers.journey.no_orders')} />
                ) : (
                  orders.map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="w-full rounded-2xl border bg-background p-3 text-start shadow-sm transition hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">#{order.id.slice(0, 8)}</Badge>
                            <Badge
                              className={cn(
                                'border-0',
                                order.status === 'delivered' && 'bg-emerald-100 text-emerald-700',
                                order.status === 'pending' && 'bg-amber-100 text-amber-700',
                                order.status === 'assigned' && 'bg-sky-100 text-sky-700',
                                order.status === 'in_progress' && 'bg-indigo-100 text-indigo-700',
                                order.status === 'cancelled' && 'bg-rose-100 text-rose-700'
                              )}
                            >
                              {order.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                            <span>{formatDateTime(order.created_at)}</span>
                            <span>
                              {t('customers.journey.assigned_worker')}: {order.assigned_worker?.full_name || order.created_by_worker?.full_name || '—'}
                            </span>
                            <span>{order.payment_type || '—'}</span>
                            {order.notes && <span className="line-clamp-1">{order.notes}</span>}
                          </div>
                        </div>

                        <div className="shrink-0 text-end">
                          <div className="text-base font-black text-primary" dir="ltr">
                            {formatAmount(order.total_amount)} {t('common.currency')}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visits" className="space-y-3 mt-0">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SummaryCard
                title={t('customers.journey.total_visits')}
                value={String(visitSummary.total)}
                icon={Activity}
                tone="sky"
              />
              <SummaryCard
                title={t('customers.journey.with_order')}
                value={String(visitSummary.withOrder)}
                icon={ShoppingCart}
                tone="emerald"
              />
              <SummaryCard
                title={t('customers.journey.without_order')}
                value={String(visitSummary.withoutOrder)}
                icon={MapPin}
                tone="amber"
              />
            </div>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t('customers.journey.visit_timeline')}</CardTitle>
                <CardDescription>{visits.length} {t('common.events')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isVisitTabLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : visits.length === 0 ? (
                  <EmptyState label={t('customers.journey.no_visits')} />
                ) : (
                  visits.map((visit) => (
                    <div key={visit.id} className="rounded-2xl border bg-background p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="border-primary/20 text-primary">
                              {getVisitOperationLabel(visit.operation_type)}
                            </Badge>
                            {visit.order && (
                              <Badge className="bg-emerald-100 text-emerald-700 border-0">
                                {t('customers.journey.order_linked')}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                            <span>{formatDateTime(visit.created_at)}</span>
                            <span>{t('customers.journey.assigned_worker')}: {visit.worker?.full_name || visit.worker?.username || '—'}</span>
                            {visit.address && <span className="line-clamp-1">{visit.address}</span>}
                            {visit.notes && <span className="line-clamp-2">{visit.notes}</span>}
                          </div>
                        </div>

                        {visit.order && (
                          <button
                            type="button"
                            className="shrink-0 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-end transition hover:border-primary/40 hover:bg-primary/10"
                            onClick={() => setSelectedOrder(visit.order || null)}
                          >
                            <div className="text-[11px] text-muted-foreground">{visit.order.status}</div>
                            <div className="text-sm font-black text-primary" dir="ltr">
                              {formatAmount(visit.order.total_amount)} {t('common.currency')}
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <CustomerPickerDialog
        open={customerPickerOpen}
        onOpenChange={setCustomerPickerOpen}
        customers={customers}
        selectedCustomerId={selectedCustomerId || undefined}
        onSelect={handleSelectCustomer}
        isLoading={customersLoading}
      />

      <OrderDetailsDialog
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
        }}
        order={selectedOrder}
      />
    </div>
  );
};

const SummaryCard = ({
  title,
  value,
  icon: Icon,
  tone,
  currency,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'rose' | 'amber' | 'emerald' | 'sky' | 'slate';
  currency?: string;
}) => {
  const tones = {
    rose: 'border-rose-200 bg-rose-50/80 text-rose-700',
    amber: 'border-amber-200 bg-amber-50/80 text-amber-700',
    emerald: 'border-emerald-200 bg-emerald-50/80 text-emerald-700',
    sky: 'border-sky-200 bg-sky-50/80 text-sky-700',
    slate: 'border-slate-200 bg-slate-50/80 text-slate-700',
  };

  return (
    <Card className={cn('shadow-sm', tones[tone])}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium">{title}</span>
          <Icon className="w-4 h-4" />
        </div>
        <div className="text-lg font-black" dir="ltr">
          {value}{currency ? ` ${currency}` : ''}
        </div>
      </CardContent>
    </Card>
  );
};

const MiniInfoCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'rose' | 'slate';
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border p-2',
        tone === 'rose' ? 'border-rose-200 bg-rose-50/70' : 'border-slate-200 bg-slate-50/70'
      )}
    >
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-bold text-sm" dir="ltr">{value}</div>
    </div>
  );
};

const EmptyState = ({ label }: { label: string }) => (
  <div className="rounded-2xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
    {label}
  </div>
);

export default CustomerJourney;
