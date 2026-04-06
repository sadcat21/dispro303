import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Search, UserPlus, User, ChevronLeft, ChevronDown, ChevronUp, Loader2, X, Banknote } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Customer, Sector } from '@/types/database';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLocalizedName } from '@/utils/sectorName';
import CustomerSummary from '@/components/customers/CustomerSummary';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface CustomerPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  sectors?: Sector[];
  isLoading?: boolean;
  selectedCustomerId?: string;
  onSelect: (customer: Customer) => void;
  onAddNew?: () => void;
}

interface SectorGroup {
  sectorId: string | null;
  sectorName: string;
  customers: Customer[];
}

const CustomerPickerDialog: React.FC<CustomerPickerDialogProps> = ({
  open,
  onOpenChange,
  customers,
  sectors = [],
  isLoading,
  selectedCustomerId,
  onSelect,
  onAddNew,
}) => {
  const { t, dir, language } = useLanguage();
  const { activeBranch } = useAuth();
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [autoExpand, setAutoExpand] = useState(false);

  // Self-fetch sectors when not provided via props
  const { data: fetchedSectors } = useQuery({
    queryKey: ['sectors-for-picker', activeBranch?.id],
    queryFn: async () => {
      let query = supabase.from('sectors').select('*').order('name');
      if (activeBranch) {
        query = query.eq('branch_id', activeBranch.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Sector[];
    },
    enabled: open && sectors.length === 0,
  });

  const effectiveSectors = sectors.length > 0 ? sectors : (fetchedSectors || []);

  // Fetch active debts for all customers
  const { data: customerDebtsMap } = useQuery({
    queryKey: ['customer-debts-summary-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('customer_debts')
        .select('customer_id, remaining_amount, updated_at')
        .in('status', ['active', 'partially_paid']);
      const map: Record<string, { total: number; lastDate: string | null }> = {};
      (data || []).forEach(d => {
        if (!map[d.customer_id]) map[d.customer_id] = { total: 0, lastDate: null };
        map[d.customer_id].total += Number(d.remaining_amount || 0);
        if (d.updated_at && (!map[d.customer_id].lastDate || d.updated_at > map[d.customer_id].lastDate!)) {
          map[d.customer_id].lastDate = d.updated_at;
        }
      });
      return map;
    },
    enabled: open,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (open) {
      setSearch('');
      setAutoExpand(false);
      setOpenGroups(new Set());
    }
  }, [open]);

  

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.name_fr?.toLowerCase().includes(q) ||
      c.store_name?.toLowerCase().includes(q) ||
      (c as any).store_name_fr?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.wilaya?.toLowerCase().includes(q) ||
      c.internal_name?.toLowerCase().includes(q) ||
      c.address?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  // Build sector map for quick lookup
  const sectorMap = useMemo(() => {
    const map = new Map<string, string>();
    effectiveSectors.forEach(s => map.set(s.id, getLocalizedName(s, language)));
    return map;
  }, [effectiveSectors, language]);

  // Group customers by sector
  const groupedCustomers = useMemo((): SectorGroup[] => {
    const groups = new Map<string | null, Customer[]>();
    
    filteredCustomers.forEach(c => {
      const key = c.sector_id || null;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    });

    const result: SectorGroup[] = [];
    
    // Add sectors with customers first (ordered by sector name)
    const sectorIds = Array.from(groups.keys()).filter(k => k !== null) as string[];
    sectorIds.sort((a, b) => {
      const nameA = sectorMap.get(a) || '';
      const nameB = sectorMap.get(b) || '';
      return nameA.localeCompare(nameB, 'ar');
    });

    sectorIds.forEach(sid => {
      result.push({
        sectorId: sid,
        sectorName: sectorMap.get(sid) || 'غير معروف',
        customers: groups.get(sid)!,
      });
    });

    // Add "no sector" group at the end
    if (groups.has(null) && groups.get(null)!.length > 0) {
      result.push({
        sectorId: null,
        sectorName: 'بدون سكتور',
        customers: groups.get(null)!,
      });
    }

    return result;
  }, [filteredCustomers, sectorMap]);

  // When autoExpand changes, sync openGroups (only react to autoExpand toggle, not groupedCustomers changes)
  useEffect(() => {
    if (autoExpand) {
      const allKeys = groupedCustomers.map(g => g.sectorId || 'no-sector');
      setOpenGroups(new Set(allKeys));
    }
    // Only clear when autoExpand is explicitly turned off (not on every groupedCustomers change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoExpand]);

  const getSectorName = (sectorId: string | null | undefined) => {
    if (!sectorId) return '';
    return sectorMap.get(sectorId) || '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] p-0 gap-0 rounded-2xl" dir={dir}>
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b">
          <DialogTitle className="text-center text-base font-bold">
            اختر عميل...
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 left-4 text-destructive hover:text-destructive/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 space-y-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم، المحل، أو الهاتف..."
              className="pr-10 h-11 rounded-full border-2 border-primary/30 focus:border-primary text-sm"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="auto-expand" className="text-xs text-muted-foreground">فتح الأقسام تلقائياً</label>
            <Switch id="auto-expand" checked={autoExpand} onCheckedChange={setAutoExpand} />
          </div>
        </div>

        {/* Customers List */}
        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-10 text-center">
              <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm text-muted-foreground">
                {search ? 'لا يوجد عميل مطابق' : t('orders.no_customers')}
              </p>
              {search && onAddNew && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1"
                  onClick={onAddNew}
                >
                  <UserPlus className="w-4 h-4" />
                  إضافة عميل جديد
                </Button>
              )}
            </div>
          ) : (
            <div>
              {groupedCustomers.map((group) => {
                const groupKey = group.sectorId || 'no-sector';
                const isOpen = search.trim() ? true : openGroups.has(groupKey);
                return (
                  <Collapsible key={groupKey} open={isOpen} onOpenChange={() => toggleGroup(groupKey)}>
                    {/* Sector header */}
                    <CollapsibleTrigger asChild>
                      <button className="sticky top-0 z-10 w-full bg-muted/80 backdrop-blur-sm px-4 py-2 border-b border-t flex items-center justify-between">
                        <p className="text-xs font-bold text-primary">
                          {group.sectorName} ({group.customers.length})
                        </p>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </CollapsibleTrigger>
                    {/* Customers in this sector */}
                    <CollapsibleContent>
                      <div className="divide-y divide-border">
                        {group.customers.map((customer) => {
                          const isSelected = selectedCustomerId === customer.id;
                          const subtitle = [customer.store_name, customer.phone].filter(Boolean).join(' • ');
                          const debtInfo = customerDebtsMap?.[customer.id];
                          return (
                            <button
                              key={customer.id}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-right transition-colors",
                                "hover:bg-accent/50 active:bg-accent",
                                isSelected && "bg-primary/5"
                              )}
                              onClick={() => {
                                onSelect(customer);
                                onOpenChange(false);
                              }}
                            >
                              <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0 text-right">
                                <CustomerSummary
                                  customer={{
                                    name: customer.name,
                                    store_name: customer.store_name,
                                    customer_type: customer.customer_type,
                                    sector_name: getSectorName(customer.sector_id),
                                    phone: customer.phone,
                                    wilaya: customer.wilaya,
                                  }}
                                  compact
                                  showAvatar={false}
                                  showMeta={false}
                                />
                                {debtInfo && debtInfo.total > 0 && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                                      <Banknote className="w-2.5 h-2.5" />
                                      دين: {debtInfo.total.toLocaleString()} DA
                                    </Badge>
                                    {debtInfo.lastDate && (
                                      <span className="text-[10px] text-muted-foreground">
                                        آخر: {new Date(debtInfo.lastDate).toLocaleDateString('ar-DZ')}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                isSelected ? "bg-primary/10 text-primary" : debtInfo && debtInfo.total > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                              )}>
                                <User className="w-5 h-5" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-2.5 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filteredCustomers.length} عميل
          </p>
          {onAddNew && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-primary hover:text-primary gap-1"
              onClick={onAddNew}
            >
              <UserPlus className="w-4 h-4" />
              عميل جديد
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerPickerDialog;
