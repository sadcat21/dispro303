import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Banknote, Calendar, Clock3, FileCheck, Loader2, MapPin, Plus, Search, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/utils/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateDebt, useCustomerDebts } from '@/hooks/useCustomerDebts';
import { CustomerDebtWithDetails } from '@/types/accounting';
import CustomerSummary from '@/components/customers/CustomerSummary';
import CollectCustomerDebtDialog from '@/components/debts/CollectCustomerDebtDialog';
import PendingDocumentsSection from '@/components/debts/PendingDocumentsSection';
import PermissionGate from '@/components/auth/PermissionGate';
import { isAdminRole } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSectors } from '@/hooks/useSectors';
import { getLocalizedName } from '@/utils/sectorName';
import ClientTrustBadge from '@/components/customers/ClientTrustBadge';
import { computeClientTrustScoreFromHistory } from '@/utils/clientTrustScore';

const DAY_INDEX_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const getNextCollectionDate = (debt: CustomerDebtWithDetails): string | null => {
  if (debt.status === 'paid') return null;

  if (debt.collection_type === 'daily') {
    return new Date().toISOString().slice(0, 10);
  }

  if (debt.collection_type === 'weekly' && debt.collection_days?.length) {
    const now = new Date();
    const todayIndex = now.getDay();
    let minOffset = 8;

    for (const dayKey of debt.collection_days) {
      const targetIndex = DAY_INDEX_MAP[dayKey];
      if (targetIndex === undefined) continue;
      const offset = (targetIndex - todayIndex + 7) % 7;
      if (offset < minOffset) minOffset = offset;
    }

    if (minOffset <= 7) {
      const next = new Date(now);
      next.setDate(next.getDate() + minOffset);
      return next.toISOString().slice(0, 10);
    }
  }

  return debt.due_date || null;
};

type CustomerGroup = {
  id: string;
  name: string;
  phone: string | null;
  wilaya: string | null;
  debts: CustomerDebtWithDetails[];
  totalRemaining: number;
  nextDueDate: string | null;
  lastEventAt: string | null;
  searchableText: string;
  workerIds: Set<string>;
  trustScore: ReturnType<typeof computeClientTrustScoreFromHistory> | null;
};

const CustomerDebts: React.FC = () => {
  const { t, language } = useLanguage();
  const { role, workerId, activeBranch } = useAuth();
  const { sectors } = useSectors();
  const isAdmin = isAdminRole(role);
  const location = useLocation();
  const createDebt = useCreateDebt();

  const [activeTab, setActiveTab] = useState<'debts' | 'documents'>('debts');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [eventDateFilter, setEventDateFilter] = useState('');
  const [workerFilter, setWorkerFilter] = useState('all');
  const [quickCustomerAction, setQuickCustomerAction] = useState<{ id: string; name: string; debts: CustomerDebtWithDetails[]; initialTab: 'collect' | 'visit' | 'history' } | null>(null);
  const [addDebtOpen, setAddDebtOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [newDebtCustomerId, setNewDebtCustomerId] = useState('');
  const [newDebtAmount, setNewDebtAmount] = useState('');
  const [newDebtDueDate, setNewDebtDueDate] = useState('');
  const [newDebtNotes, setNewDebtNotes] = useState('');

  const { data: debts, isLoading } = useCustomerDebts({ status: statusFilter });
  const debtIds = useMemo(() => debts?.map((debt) => debt.id) || [], [debts]);

  const { data: customers } = useQuery({
    queryKey: ['customer-debts-customers', activeBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('id, name, store_name, phone')
        .order('name');

      if (activeBranch?.id) query = query.eq('branch_id', activeBranch.id);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allZones = [] } = useQuery({
    queryKey: ['customer-debts-zones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('zones')
        .select('id, name, name_fr, sector_id')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: branchWorkers = [] } = useQuery({
    queryKey: ['customer-debts-workers', activeBranch?.id],
    queryFn: async () => {
      let query = supabase
        .from('workers')
        .select('id, full_name, username')
        .eq('is_active', true)
        .order('full_name');

      if (activeBranch?.id) query = query.eq('branch_id', activeBranch.id);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  const { data: debtEvents = [] } = useQuery({
    queryKey: ['customer-debts-events', debtIds],
    queryFn: async () => {
      if (!debtIds.length) return [];

      const { data, error } = await supabase
        .from('debt_collections')
        .select('debt_id, created_at, worker_id, action')
        .in('debt_id', debtIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: debtIds.length > 0,
  });

  const { data: debtCollectionAmounts = [] } = useQuery({
    queryKey: ['customer-debts-collections-for-trust', debtIds],
    queryFn: async () => {
      if (!debtIds.length) return [];
      const { data, error } = await supabase
        .from('debt_collections')
        .select('debt_id, amount, created_at')
        .in('debt_id', debtIds)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: debtIds.length > 0,
  });

  const customerGroups = useMemo(() => {
    if (!debts) return [] as CustomerGroup[];

    const eventsByDebtId = debtEvents.reduce<Record<string, { created_at: string; worker_id: string | null }[]>>((acc, event) => {
      if (!acc[event.debt_id]) acc[event.debt_id] = [];
      acc[event.debt_id].push(event);
      return acc;
    }, {});

    const collectionsByDebtId = debtCollectionAmounts.reduce<Record<string, { debt_id: string; amount: number | null; created_at: string | null }[]>>((acc, item) => {
      if (!acc[item.debt_id]) acc[item.debt_id] = [];
      acc[item.debt_id].push(item);
      return acc;
    }, {});

    const groups: Record<string, CustomerGroup> = {};

    debts.forEach((debt) => {
      const customerId = debt.customer_id;
      const sector = debt.customer?.sector_id ? sectors.find((item) => item.id === debt.customer?.sector_id) : null;
      const zone = debt.customer?.zone_id ? allZones.find((item) => item.id === debt.customer?.zone_id) : null;

      if (!groups[customerId]) {
        groups[customerId] = {
          id: customerId,
          name: debt.customer?.name || '—',
          phone: debt.customer?.phone || null,
          wilaya: debt.customer?.wilaya || null,
          debts: [],
          totalRemaining: 0,
          nextDueDate: null,
          lastEventAt: null,
          searchableText: [
            debt.customer?.name,
            debt.customer?.store_name,
            debt.customer?.phone,
            debt.customer?.wilaya,
            debt.customer?.customer_type,
            sector ? getLocalizedName(sector, language) : '',
            zone ? getLocalizedName(zone, language) : '',
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
          workerIds: new Set<string>(),
          trustScore: null,
        };
      }

      const group = groups[customerId];
      group.debts.push(debt);
      group.totalRemaining += Number(debt.remaining_amount || 0);
      if (debt.worker_id) group.workerIds.add(debt.worker_id);

      const nextDate = getNextCollectionDate(debt);
      if (nextDate && (!group.nextDueDate || nextDate < group.nextDueDate)) {
        group.nextDueDate = nextDate;
      }

      const lastEventCandidates = [
        debt.created_at,
        debt.updated_at,
        ...(eventsByDebtId[debt.id]?.map((event) => {
          if (event.worker_id) group.workerIds.add(event.worker_id);
          return event.created_at;
        }) || []),
      ].filter(Boolean) as string[];

      const latestDebtEvent = [...lastEventCandidates].sort().at(-1) || null;
      if (latestDebtEvent && (!group.lastEventAt || latestDebtEvent > group.lastEventAt)) {
        group.lastEventAt = latestDebtEvent;
      }
    });

    Object.values(groups).forEach((group) => {
      const collections = group.debts.flatMap((debt) => collectionsByDebtId[debt.id] || []);
      group.trustScore = computeClientTrustScoreFromHistory(group.debts as any, collections as any);
    });

    return Object.values(groups)
      .filter((group) => {
        const matchesSearch = !search || group.searchableText.includes(search.toLowerCase());
        const matchesDate = !eventDateFilter || (group.lastEventAt ? group.lastEventAt.slice(0, 10) === eventDateFilter : false);
        const matchesWorker = workerFilter === 'all' || group.workerIds.has(workerFilter);
        return matchesSearch && matchesDate && matchesWorker;
      })
      .sort((a, b) => (b.lastEventAt || '').localeCompare(a.lastEventAt || ''));
  }, [allZones, debtCollectionAmounts, debtEvents, debts, eventDateFilter, language, search, sectors, workerFilter]);

  const customerSections = useMemo(() => {
    const sections: { day: string; label: string; items: CustomerGroup[] }[] = [];

    customerGroups.forEach((group) => {
      const day = group.lastEventAt?.slice(0, 10) || 'unknown';
      const label = group.lastEventAt
        ? formatDate(new Date(group.lastEventAt), 'EEEE dd/MM/yyyy', language)
        : 'بدون تاريخ';
      const existing = sections.find((section) => section.day === day);
      if (existing) {
        existing.items.push(group);
      } else {
        sections.push({ day, label, items: [group] });
      }
    });

    return sections;
  }, [customerGroups, language]);

  useEffect(() => {
    if (location.state?.customerId && customerGroups.length > 0) {
      const group = customerGroups.find((item) => item.id === location.state.customerId);
      if (group) {
        setQuickCustomerAction({ id: group.id, name: group.name, debts: group.debts, initialTab: 'collect' });
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, customerGroups]);

  useEffect(() => {
    if (location.state?.tab === 'documents') {
      setActiveTab('documents');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const totalActiveDebts = customerGroups.reduce((sum, group) => sum + group.totalRemaining, 0);

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!customers) return [];
    if (!term) return customers;
    return customers.filter((customer) =>
      (customer.name || '').toLowerCase().includes(term) ||
      (customer.store_name || '').toLowerCase().includes(term) ||
      (customer.phone || '').includes(term)
    );
  }, [customerSearch, customers]);

  const selectedDebtCustomer = customers?.find((customer) => customer.id === newDebtCustomerId) || null;

  const resetNewDebtForm = () => {
    setNewDebtCustomerId('');
    setNewDebtAmount('');
    setNewDebtDueDate('');
    setNewDebtNotes('');
    setCustomerSearch('');
  };

  const handleCreateDebt = async () => {
    const amount = Number(newDebtAmount || 0);

    if (!newDebtCustomerId) {
      toast.error('يرجى اختيار العميل');
      return;
    }

    if (!workerId) {
      toast.error('تعذر تحديد المستخدم الحالي');
      return;
    }

    if (amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح');
      return;
    }

    try {
      await createDebt.mutateAsync({
        customer_id: newDebtCustomerId,
        worker_id: workerId,
        branch_id: activeBranch?.id,
        total_amount: amount,
        paid_amount: 0,
        collection_type: 'none',
        due_date: newDebtDueDate || undefined,
        notes: newDebtNotes || 'دين سابق مضاف يدويًا',
      });

      toast.success('تمت إضافة الدين بنجاح');
      setAddDebtOpen(false);
      resetNewDebtForm();
    } catch (error: any) {
      toast.error(error?.message || 'تعذر إضافة الدين');
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
    <PermissionGate requiredPermissions={['page_customer_debts', 'view_customer_debts', 'collect_debts']}>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Banknote className="w-5 h-5 text-primary" />
            {t('debts.title')}
          </h2>
          {isAdmin && (
            <Button size="sm" className="h-9 rounded-full px-3 text-xs sm:text-sm" onClick={() => setAddDebtOpen(true)}>
              <Plus className="w-4 h-4" />
              <span>دين جديد</span>
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'debts' | 'documents')} dir="rtl">
          <TabsList className="w-full h-10 p-1 bg-muted/60">
            <TabsTrigger value="debts" className="flex-1 gap-1.5 data-[state=active]:shadow-sm">
              <Banknote className="w-4 h-4" />
              <span className="text-xs font-bold">{t('debts.debts_tab')}</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex-1 gap-1.5 data-[state=active]:shadow-sm">
              <FileCheck className="w-4 h-4" />
              <span className="text-xs font-bold">{t('debts.pending_documents')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="debts" className="space-y-4 mt-4">
            <Card className="overflow-hidden rounded-[26px] border border-red-200 bg-white shadow-sm">
              <CardContent className="p-0">
                <div className="border-b border-red-100 bg-red-50/70 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 text-right">
                      <p className="text-sm font-semibold text-slate-500">{t('debts.total_debts')}</p>
                      <p className="mt-1 text-2xl font-black text-destructive" dir="ltr">
                        {totalActiveDebts.toLocaleString()} DA
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-2 ring-1 ring-red-100">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="text-base font-extrabold text-slate-900">{customerGroups.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث بالاسم أو المحل أو الهاتف أو المنطقة..."
                    className="pr-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="active">{t('debts.active')}</SelectItem>
                    <SelectItem value="partially_paid">{t('debts.partially_paid')}</SelectItem>
                    <SelectItem value="paid">{t('debts.paid')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isAdmin && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    type="date"
                    value={eventDateFilter}
                    onChange={(e) => setEventDateFilter(e.target.value)}
                  />
                  <Select value={workerFilter} onValueChange={setWorkerFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="كل العمال" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل العمال</SelectItem>
                      {branchWorkers.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.full_name || worker.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {customerGroups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{t('debts.no_debts')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {customerSections.map((section) => (
                  <div key={section.day} className="space-y-2">
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-center text-xs font-bold text-slate-600">
                      {section.label}
                    </div>

                    {section.items.map((group) => {
                      const primaryDebt = group.debts[0];
                      const sector = primaryDebt?.customer?.sector_id
                        ? sectors.find((item) => item.id === primaryDebt.customer?.sector_id)
                        : null;
                      const zone = primaryDebt?.customer?.zone_id
                        ? allZones.find((item) => item.id === primaryDebt.customer?.zone_id)
                        : null;

                      return (
                        <Card
                          key={group.id}
                          className="cursor-pointer overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition-all hover:border-red-200 hover:shadow-md active:scale-[0.99]"
                          onClick={() => setQuickCustomerAction({ id: group.id, name: primaryDebt?.customer?.store_name || group.name, debts: group.debts, initialTab: 'collect' })}
                        >
                          <CardContent className="p-4">
                            <div className="flex flex-col gap-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1 text-right">
                                  <CustomerSummary
                                    customer={{
                                      name: primaryDebt?.customer?.name,
                                      store_name: primaryDebt?.customer?.store_name,
                                      customer_type: primaryDebt?.customer?.customer_type,
                                      sector_name: sector ? getLocalizedName(sector, language) : undefined,
                                      zone_name: zone ? getLocalizedName(zone, language) : undefined,
                                    }}
                                    className="items-end"
                                    showAvatar={false}
                                    showMeta={false}
                                  />
                                  {group.trustScore ? (
                                    <div className="mt-1 flex justify-end">
                                      <ClientTrustBadge trust={group.trustScore} />
                                    </div>
                                  ) : null}
                                </div>
                                <div className="shrink-0 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-center">
                                  <p className="text-lg font-black text-destructive" dir="ltr">{group.totalRemaining.toLocaleString()} DA</p>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="default"
                                  className="h-9 rounded-full px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickCustomerAction({ id: group.id, name: primaryDebt?.customer?.store_name || group.name, debts: group.debts, initialTab: 'collect' });
                                  }}
                                >
                                  <Banknote className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-9 rounded-full px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickCustomerAction({ id: group.id, name: primaryDebt?.customer?.store_name || group.name, debts: group.debts, initialTab: 'visit' });
                                  }}
                                >
                                  <MapPin className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-9 rounded-full px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQuickCustomerAction({ id: group.id, name: primaryDebt?.customer?.store_name || group.name, debts: group.debts, initialTab: 'history' });
                                  }}
                                >
                                  <Clock3 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <PendingDocumentsSection />
          </TabsContent>
        </Tabs>

        {quickCustomerAction && (
          <CollectCustomerDebtDialog
            open={!!quickCustomerAction}
            onOpenChange={(open) => !open && setQuickCustomerAction(null)}
            customerName={quickCustomerAction.name}
            customerId={quickCustomerAction.id}
            customerPhone={quickCustomerAction.debts[0]?.customer?.phone || null}
            debts={quickCustomerAction.debts}
            initialTab={quickCustomerAction.initialTab}
          />
        )}

        <Dialog
          open={addDebtOpen}
          onOpenChange={(open) => {
            setAddDebtOpen(open);
            if (!open) resetNewDebtForm();
          }}
        >
          <DialogContent dir="rtl" className="max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة دين سابق</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">اختيار العميل</label>
                <Input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="ابحث باسم العميل أو الهاتف"
                />
                <Select value={newDebtCustomerId} onValueChange={setNewDebtCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCustomers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                        {customer.store_name ? ` - ${customer.store_name}` : ''}
                        {customer.phone ? ` - ${customer.phone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDebtCustomer && (
                  <p className="text-xs text-muted-foreground">
                    {selectedDebtCustomer.name}
                    {selectedDebtCustomer.store_name ? ` - ${selectedDebtCustomer.store_name}` : ''}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">مبلغ الدين</label>
                <Input type="number" min="0" value={newDebtAmount} onChange={(e) => setNewDebtAmount(e.target.value)} placeholder="0" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">تاريخ الاستحقاق</label>
                <Input type="date" value={newDebtDueDate} onChange={(e) => setNewDebtDueDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ملاحظات</label>
                <Textarea
                  value={newDebtNotes}
                  onChange={(e) => setNewDebtNotes(e.target.value)}
                  placeholder="دين سابق بدون تفاصيل منتجات أو كميات"
                  className="min-h-[96px]"
                />
              </div>

              <Button className="w-full" onClick={handleCreateDebt} disabled={createDebt.isPending}>
                {createDebt.isPending ? 'جارٍ الإضافة...' : 'حفظ الدين'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
};

export default CustomerDebts;
