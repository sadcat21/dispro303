import React, { useState, useMemo } from 'react';
import CustomerSummary from '@/components/customers/CustomerSummary';
import { Landmark, Check, X, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDueDebts, usePendingCollections, useApproveCollection, DueDebt } from '@/hooks/useDebtCollections';
import { useSectors } from '@/hooks/useSectors';
import { getLocalizedName } from '@/utils/sectorName';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DebtFlowDialog from '@/components/debts/DebtFlowDialog';
import { Input } from '@/components/ui/input';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { isAdminRole } from '@/lib/utils';

// Algerian work week: 0=Saturday, 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday
const WORK_DAYS = [
  { num: 0, ar: 'سبت', jsDay: 6 },
  { num: 1, ar: 'أحد', jsDay: 0 },
  { num: 2, ar: 'إثن', jsDay: 1 },
  { num: 3, ar: 'ثلا', jsDay: 2 },
  { num: 4, ar: 'أرب', jsDay: 3 },
  { num: 5, ar: 'خمي', jsDay: 4 },
];

/** Get the next occurrence of a given JS day (0=Sun..6=Sat), including today */
const getNextDateForJsDay = (jsDay: number): string => {
  const today = new Date();
  const todayDay = today.getDay();
  let diff = jsDay - todayDay;
  if (diff < 0) diff += 7;
  const target = addDays(today, diff);
  return target.toISOString().split('T')[0];
};

const DebtCollectionsPopover: React.FC = () => {
  const { t, language } = useLanguage();
  const { role } = useAuth();
  const { sectors } = useSectors();
  const sectorMap = useMemo(() => {
    const map = new Map<string, string>();
    sectors.forEach(s => map.set(s.id, getLocalizedName(s, language)));
    return map;
  }, [sectors, language]);
  // -1 = all, null = today (default), 0-5 = specific work day
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate target date based on selected day
  const targetDate = useMemo(() => {
    if (selectedDayNum === -1) return '__all__';
    if (selectedDayNum === null) return undefined;
    const workDay = WORK_DAYS.find(d => d.num === selectedDayNum);
    if (!workDay) return undefined;
    return getNextDateForJsDay(workDay.jsDay);
  }, [selectedDayNum]);

  const { data: dueDebts = [] } = useDueDebts(targetDate);
  const { data: todayDebts = [] } = useDueDebts(undefined); // Always today — for badge count
  const { data: pendingCollections = [] } = usePendingCollections();
  const approveCollection = useApproveCollection();

  const [selectedDebt, setSelectedDebt] = useState<DueDebt | null>(null);

  const isAdmin = isAdminRole(role);
  // Badge always shows TODAY's count, not the selected day
  const totalCount = todayDebts.length + (isAdmin ? pendingCollections.length : 0);

  const todayJsDay = new Date().getDay();

  const handleApprove = async (collectionId: string) => {
    try {
      await approveCollection.mutateAsync({ collectionId, approved: true });
      toast.success('تمت الموافقة');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReject = async (collectionId: string) => {
    try {
      await approveCollection.mutateAsync({ collectionId, approved: false, rejectionReason: 'مرفوض' });
      toast.success('تم الرفض');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const dayButtons = (
    <div className="flex gap-1 p-2 border-b overflow-x-auto">
      {/* "All" button */}
      <button
        onClick={() => setSelectedDayNum(-1)}
        className={`flex flex-col items-center min-w-[40px] px-1.5 py-1 rounded-lg text-xs font-bold transition-colors ${
          selectedDayNum === -1
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/60 hover:bg-muted text-foreground'
        }`}
      >
        <span className="text-[10px] leading-tight">الكل</span>
        <span className="text-sm leading-tight">∞</span>
      </button>
      {WORK_DAYS.map(day => {
        const isToday = day.jsDay === todayJsDay;
        const isSelected = selectedDayNum === day.num || (selectedDayNum === null && isToday);
        return (
          <button
            key={day.num}
            onClick={() => setSelectedDayNum(day.num === selectedDayNum ? null : day.num)}
            className={`flex flex-col items-center min-w-[40px] px-1.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 hover:bg-muted text-foreground'
            }`}
          >
            <span className="text-[10px] leading-tight">{day.ar}</span>
            <span className="text-sm leading-tight">{day.num}</span>
          </button>
        );
      })}
    </div>
  );

  const selectedDateLabel = targetDate === '__all__'
    ? 'جميع الديون المستحقة'
    : targetDate
      ? format(new Date(targetDate + 'T00:00:00'), 'dd/MM/yyyy')
      : 'اليوم والمتأخرة';

  return (
    <>
      <Popover onOpenChange={(open) => { if (open) setSelectedDayNum(null); }}>
        <PopoverTrigger asChild>
          <button
            className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 transition-colors"
            title="استحقاق الديون"
          >
            <Landmark className="w-4 h-4 text-orange-500" />
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {totalCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[min(96vw,25rem)] max-w-[96vw] p-0 h-[min(82dvh,42rem)] overflow-hidden flex flex-col rounded-[26px]">
          {isAdmin ? (
            <Tabs defaultValue="due" className="flex flex-col h-full">
              <TabsList className="w-full rounded-none border-b h-12 px-1">
                <TabsTrigger value="due" className="flex-1 gap-1">
                  ديون مستحقة
                  {dueDebts.length > 0 && <Badge variant="destructive" className="text-[10px] px-1">{dueDebts.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex-1 gap-1">
                  في الانتظار
                  {pendingCollections.length > 0 && <Badge variant="secondary" className="text-[10px] px-1">{pendingCollections.length}</Badge>}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="due" className="m-0 flex-1">
                {dayButtons}
                <div className="border-b px-3 py-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالاسم أو الهاتف..."
                    className="h-9 text-xs"
                    dir="rtl"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center py-1">{selectedDateLabel}</p>
                <DueDebtsList debts={dueDebts} onSelect={setSelectedDebt} sectorMap={sectorMap} searchQuery={searchQuery} />
              </TabsContent>
              <TabsContent value="pending" className="m-0 flex-1">
                <div className="border-b px-3 py-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالاسم أو العامل..."
                    className="h-9 text-xs"
                    dir="rtl"
                  />
                </div>
                <PendingCollectionsList
                  collections={pendingCollections}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isLoading={approveCollection.isPending}
                  sectorMap={sectorMap}
                  searchQuery={searchQuery}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <div className="p-3 border-b font-bold text-sm">ديون مستحقة</div>
              {dayButtons}
              <div className="border-b px-3 py-2">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم أو الهاتف..."
                  className="h-9 text-xs"
                  dir="rtl"
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-center py-1">{selectedDateLabel}</p>
              <DueDebtsList debts={dueDebts} onSelect={setSelectedDebt} sectorMap={sectorMap} searchQuery={searchQuery} />
            </>
          )}
        </PopoverContent>
      </Popover>

      {selectedDebt && (
        <DebtFlowDialog
          open={!!selectedDebt}
          onOpenChange={(open) => !open && setSelectedDebt(null)}
          mode="details"
          debt={selectedDebt}
        />
      )}
    </>
  );
};

const DueDebtsList: React.FC<{ debts: DueDebt[]; onSelect: (d: DueDebt) => void; sectorMap?: Map<string, string>; searchQuery?: string }> = ({ debts, onSelect, sectorMap, searchQuery }) => {
  const filteredDebts = useMemo(() => {
    if (!searchQuery?.trim()) return debts;
    const q = searchQuery.trim().toLowerCase();
    return debts.filter((debt) =>
      (debt.customer?.name || '').toLowerCase().includes(q) ||
      (debt.customer?.store_name || '').toLowerCase().includes(q) ||
      (debt.customer?.phone || '').includes(q)
    );
  }, [debts, searchQuery]);

  if (filteredDebts.length === 0) {
    return <div className="p-6 text-center text-sm text-muted-foreground">لا توجد ديون مستحقة</div>;
  }

  return (
    <ScrollArea className="h-[calc(82dvh-11rem)]">
      <div className="divide-y">
        {filteredDebts.map(debt => (
          <button
            key={debt.id}
            className="w-full p-3 text-right hover:bg-muted/50 transition-colors"
            onClick={() => onSelect(debt)}
          >
            <div className="flex flex-col gap-2">
              <div className="min-w-0">
                <CustomerSummary
                  customer={{
                    name: debt.customer?.name,
                    store_name: debt.customer?.store_name,
                    customer_type: debt.customer?.customer_type,
                    sector_name: debt.customer?.sector_id && sectorMap ? sectorMap.get(debt.customer.sector_id) : undefined,
                    phone: debt.customer?.phone,
                    wilaya: debt.customer?.wilaya,
                  }}
                  compact
                  showAvatar={false}
                  showMeta={false}
                />
              </div>
              <div className="rounded-2xl border border-red-100 bg-red-50/80 px-3 py-2 text-right">
                <div className="text-[11px] font-medium text-red-500">المتبقي</div>
                <div className="mt-1 text-base font-black text-destructive" dir="ltr">
                  {Number(debt.remaining_amount).toLocaleString()} DA
                </div>
              </div>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{debt.due_date ? format(new Date(debt.due_date + 'T00:00:00'), 'dd/MM/yyyy') : '—'}</span>
              {debt.customer?.phone && <span>• {debt.customer.phone}</span>}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};

const PendingCollectionsList: React.FC<{
  collections: any[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isLoading: boolean;
  sectorMap?: Map<string, string>;
  searchQuery?: string;
}> = ({ collections, onApprove, onReject, isLoading, sectorMap, searchQuery }) => {
  const filteredCollections = useMemo(() => {
    if (!searchQuery?.trim()) return collections;
    const q = searchQuery.trim().toLowerCase();
    return collections.filter((collection) =>
      (collection.debt?.customer?.name || '').toLowerCase().includes(q) ||
      (collection.debt?.customer?.store_name || '').toLowerCase().includes(q) ||
      (collection.worker?.full_name || '').toLowerCase().includes(q)
    );
  }, [collections, searchQuery]);

  if (filteredCollections.length === 0) {
    return <div className="p-6 text-center text-sm text-muted-foreground">لا توجد تحصيلات في الانتظار</div>;
  }

  const actionLabels: Record<string, string> = {
    no_payment: 'بدون دفع',
    partial_payment: 'دفع جزئي',
    full_payment: 'دفع كامل',
  };

  return (
    <ScrollArea className="h-[calc(82dvh-9rem)]">
      <div className="divide-y">
        {filteredCollections.map(c => (
          <div key={c.id} className="p-3 space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CustomerSummary
                customer={{
                  name: c.debt?.customer?.name,
                  store_name: c.debt?.customer?.store_name,
                  customer_type: c.debt?.customer?.customer_type,
                  sector_name: c.debt?.customer?.sector_id && sectorMap ? sectorMap.get(c.debt.customer.sector_id) : undefined,
                  phone: c.debt?.customer?.phone,
                  wilaya: c.debt?.customer?.wilaya,
                }}
                compact
                hideBadges
                showAvatar={false}
                showMeta={false}
              />
              <Badge variant="outline" className="text-xs">{actionLabels[c.action] || c.action}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              بواسطة: {c.worker?.full_name || '—'}
              {c.amount_collected > 0 && <span className="text-primary font-bold mr-2"> • {Number(c.amount_collected).toLocaleString()} DA</span>}
            </div>
            {c.next_due_date && (
              <p className="text-xs text-muted-foreground">الاستحقاق التالي: {format(new Date(c.next_due_date + 'T00:00:00'), 'dd/MM/yyyy')}</p>
            )}
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 gap-1" onClick={() => onApprove(c.id)} disabled={isLoading}>
                <Check className="w-3 h-3" /> موافقة
              </Button>
              <Button size="sm" variant="destructive" className="flex-1 gap-1" onClick={() => onReject(c.id)} disabled={isLoading}>
                <X className="w-3 h-3" /> رفض
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};

export default DebtCollectionsPopover;
