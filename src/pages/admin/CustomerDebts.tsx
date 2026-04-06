import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Banknote, Search, Users, AlertCircle, Calendar, FileCheck, Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatDate } from '@/utils/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomerDebts, useCreateDebt } from '@/hooks/useCustomerDebts';
import { CustomerDebtWithDetails } from '@/types/accounting';
import CustomerSummary from '@/components/customers/CustomerSummary';
import DebtFlowDialog from '@/components/debts/DebtFlowDialog';
import PendingDocumentsSection from '@/components/debts/PendingDocumentsSection';
import PermissionGate from '@/components/auth/PermissionGate';
import { isAdminRole } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSectors } from '@/hooks/useSectors';
import { getLocalizedName } from '@/utils/sectorName';

const DAY_INDEX_MAP: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

const getNextCollectionDate = (debt: CustomerDebtWithDetails): string | null => {
  if (debt.status === 'paid') return null;
  const collectionType = debt.collection_type;
  const collectionDays = debt.collection_days;
  if (collectionType === 'daily') return new Date().toISOString().slice(0, 10);
  if (collectionType === 'weekly' && collectionDays && collectionDays.length > 0) {
    const now = new Date();
    const todayIndex = now.getDay();
    let minOffset = 8;
    for (const dayKey of collectionDays) {
      const targetIndex = DAY_INDEX_MAP[dayKey];
      if (targetIndex === undefined) continue;
      let offset = (targetIndex - todayIndex + 7) % 7;
      if (offset === 0) offset = 0;
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

const CustomerDebts: React.FC = () => {
  const { t, language } = useLanguage();
  const { role, workerId, activeBranch } = useAuth();
  const { sectors } = useSectors();
  const isAdmin = isAdminRole(role);
  const [activeTab, setActiveTab] = useState<'debts' | 'documents'>('debts');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; debts: CustomerDebtWithDetails[] } | null>(null);
  const [addDebtOpen, setAddDebtOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [newDebtCustomerId, setNewDebtCustomerId] = useState('');
  const [newDebtAmount, setNewDebtAmount] = useState('');
  const [newDebtDueDate, setNewDebtDueDate] = useState('');
  const [newDebtNotes, setNewDebtNotes] = useState('');
  const location = useLocation();
  const createDebt = useCreateDebt();

  const { data: debts, isLoading } = useCustomerDebts({ status: statusFilter });
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

  const customerGroups = useMemo(() => {
    if (!debts) return [];
    const groups: Record<string, { id: string; name: string; phone: string | null; wilaya: string | null; debts: CustomerDebtWithDetails[]; totalRemaining: number; lastPaymentDate: string | null; nextDueDate: string | null }> = {};
    debts.forEach(debt => {
      const cId = debt.customer_id;
      if (!groups[cId]) {
        groups[cId] = { id: cId, name: debt.customer?.name || '—', phone: debt.customer?.phone || null, wilaya: debt.customer?.wilaya || null, debts: [], totalRemaining: 0, lastPaymentDate: null, nextDueDate: null };
      }
      groups[cId].debts.push(debt);
      groups[cId].totalRemaining += Number(debt.remaining_amount);
      const nextDate = getNextCollectionDate(debt);
      if (nextDate) {
        const current = groups[cId].nextDueDate;
        if (!current || nextDate < current) groups[cId].nextDueDate = nextDate;
      }
    });
    return Object.values(groups)
      .filter(g => {
        if (!search) return true;
        const s = search.toLowerCase();
        return g.name.toLowerCase().includes(s) || (g.phone && g.phone.includes(s));
      })
      .sort((a, b) => b.totalRemaining - a.totalRemaining);
  }, [debts, search]);

  useEffect(() => {
    if (location.state?.customerId && customerGroups.length > 0) {
      const group = customerGroups.find(g => g.id === location.state.customerId);
      if (group) {
        setSelectedCustomer({ id: group.id, name: group.name, debts: group.debts });
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, customerGroups]);

  // Check if navigated with tab=documents
  useEffect(() => {
    if (location.state?.tab === 'documents') {
      setActiveTab('documents');
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const totalActiveDebts = customerGroups.reduce((sum, g) => sum + g.totalRemaining, 0);
  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!customers) return [];
    if (!term) return customers;
    return customers.filter((customer) =>
      (customer.name || '').toLowerCase().includes(term) ||
      (customer.store_name || '').toLowerCase().includes(term) ||
      (customer.phone || '').includes(term),
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

        {/* Tabs: Debts vs Pending Documents */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} dir="rtl">
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
            {/* Summary Card */}
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

            {/* Filters */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('common.search')} className="pr-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="active">{t('debts.active')}</SelectItem>
                  <SelectItem value="partially_paid">{t('debts.partially_paid')}</SelectItem>
                  <SelectItem value="paid">{t('debts.paid')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer List */}
            {customerGroups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{t('debts.no_debts')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {customerGroups.map(group => (
                  (() => {
                    const primaryDebt = group.debts[0];
                    const sector = primaryDebt?.customer?.sector_id
                      ? sectors.find((s) => s.id === primaryDebt.customer?.sector_id)
                      : null;
                    const zone = primaryDebt?.customer?.zone_id
                      ? allZones.find((z) => z.id === primaryDebt.customer?.zone_id)
                      : null;

                    return (
                  <Card
                    key={group.id}
                    className="cursor-pointer overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition-all hover:border-red-200 hover:shadow-md active:scale-[0.99]"
                    onClick={() => setSelectedCustomer({ id: group.id, name: group.name, debts: group.debts })}
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
                            <div className="mt-1 flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
                              {group.wilaya && <span>{group.wilaya}</span>}
                              {group.phone && <span>• {group.phone}</span>}
                              <span>• {group.debts.length} {group.debts.length === 1 ? t('debts.debt_count_singular') : t('debts.debt_count_plural')}</span>
                            </div>
                          </div>
                          <div className="shrink-0 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-center">
                            <p className="text-lg font-black text-destructive" dir="ltr">{group.totalRemaining.toLocaleString()} DA</p>
                          </div>
                        </div>
                        {group.nextDueDate && (
                          <div className="flex flex-wrap items-center justify-end gap-1 text-xs">
                            <span className={new Date(group.nextDueDate + (group.nextDueDate.includes('T') ? '' : 'T00:00:00')) < new Date() ? 'font-medium text-destructive' : 'font-medium text-primary'}>
                              {group.nextDueDate.includes('T')
                                ? formatDate(new Date(group.nextDueDate), 'EEEE dd/MM/yyyy HH:mm', language)
                                : formatDate(new Date(group.nextDueDate + 'T00:00:00'), 'EEEE dd/MM/yyyy', language)
                              }
                            </span>
                            <span className="text-muted-foreground">{t('debts.next_due')}:</span>
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                    );
                  })()
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <PendingDocumentsSection />
          </TabsContent>
        </Tabs>

        {/* Debt Details Dialog */}
        {selectedCustomer && (
          <DebtFlowDialog
            open={!!selectedCustomer}
            onOpenChange={(open) => !open && setSelectedCustomer(null)}
            mode="details"
            debts={selectedCustomer.debts}
            customerName={selectedCustomer.name}
            customerId={selectedCustomer.id}
          />
        )}

        <Dialog open={addDebtOpen} onOpenChange={(open) => { setAddDebtOpen(open); if (!open) resetNewDebtForm(); }}>
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
                        {customer.name}{customer.store_name ? ` - ${customer.store_name}` : ''}{customer.phone ? ` - ${customer.phone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDebtCustomer && (
                  <p className="text-xs text-muted-foreground">
                    {selectedDebtCustomer.name}{selectedDebtCustomer.store_name ? ` - ${selectedDebtCustomer.store_name}` : ''}
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
