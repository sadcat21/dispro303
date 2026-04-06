import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CustomerSummary from '@/components/customers/CustomerSummary';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { AlertCircle, CalendarDays } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DebtRow {
  id: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date: string | null;
  created_at: string;
  notes: string | null;
  customer_id: string;
  customer?: {
    name: string | null;
    store_name: string | null;
  } | null;
}

interface CustomerDebtGroup {
  customer_id: string;
  customer_name: string;
  store_name: string | null;
  debts: DebtRow[];
  total_remaining: number;
}

const UncollectedDebtsDialog = ({ open, onOpenChange }: Props) => {
  const { data: groups, isLoading } = useQuery({
    queryKey: ['treasury-uncollected-debts'],
    enabled: open,
    queryFn: async () => {
      const query = supabase
        .from('customer_debts')
        .select(`
          id,
          total_amount,
          paid_amount,
          remaining_amount,
          due_date,
          created_at,
          notes,
          customer_id,
          customer:customers(name, store_name)
        `)
        .in('status', ['active', 'partially_paid'])
        .gt('remaining_amount', 0)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      const grouped = new Map<string, CustomerDebtGroup>();

      for (const debt of (data || []) as DebtRow[]) {
        const existing = grouped.get(debt.customer_id);
        if (existing) {
          existing.debts.push(debt);
          existing.total_remaining += Number(debt.remaining_amount || 0);
          continue;
        }

        grouped.set(debt.customer_id, {
          customer_id: debt.customer_id,
          customer_name: debt.customer?.name || 'عميل غير معروف',
          store_name: debt.customer?.store_name || null,
          debts: [debt],
          total_remaining: Number(debt.remaining_amount || 0),
        });
      }

      return Array.from(grouped.values()).sort((a, b) => b.total_remaining - a.total_remaining);
    },
  });

  const totalRemaining = (groups || []).reduce((sum, group) => sum + group.total_remaining, 0);
  const totalDebts = (groups || []).reduce((sum, group) => sum + group.debts.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-destructive" />
            الديون غير المحصلة
            <Badge variant="secondary" className="mr-auto">
              {totalDebts} دين - {groups?.length || 0} عميل
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-center mb-2">
          <p className="text-xs text-muted-foreground">الإجمالي</p>
          <p className="text-xl font-bold text-destructive">{totalRemaining.toLocaleString()} د.ج</p>
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-muted-foreground">جارٍ التحميل...</p>
        ) : !groups || groups.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">لا توجد ديون غير محصلة</p>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <Card key={group.customer_id}>
                <CardContent className="p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <CustomerSummary
                      customer={{
                        name: group.customer_name,
                        store_name: group.store_name,
                      }}
                      compact
                      showAvatar={false}
                      showMeta={false}
                    />
                    <div className="text-left">
                      <p className="font-bold text-destructive">{group.total_remaining.toLocaleString()} د.ج</p>
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {group.debts.length} دين
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t pt-2">
                    {group.debts.map((debt) => (
                      <div key={debt.id} className="rounded-lg bg-muted/30 p-2 text-xs">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-muted-foreground">
                              {format(new Date(debt.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                            </p>
                            {debt.due_date && (
                              <p className="flex items-center gap-1 text-muted-foreground">
                                <CalendarDays className="w-3 h-3" />
                                <span>{format(new Date(`${debt.due_date}T00:00:00`), 'dd/MM/yyyy', { locale: ar })}</span>
                              </p>
                            )}
                            {debt.notes && <p className="text-[10px] text-muted-foreground">{debt.notes}</p>}
                          </div>
                          <div className="text-left">
                            <p className="font-medium">{Number(debt.total_amount || 0).toLocaleString()} د.ج</p>
                            <p className="text-destructive">متبقٍ: {Number(debt.remaining_amount || 0).toLocaleString()} د.ج</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UncollectedDebtsDialog;
