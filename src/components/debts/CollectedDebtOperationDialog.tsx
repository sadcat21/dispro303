import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import ReceiptDialog from '@/components/printing/ReceiptDialog';
import CustomerSummary from '@/components/customers/CustomerSummary';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkerPrintInfo } from '@/hooks/useWorkerPrintInfo';
import { useCompanyInfo } from '@/hooks/useCompanyInfo';
import { supabase } from '@/integrations/supabase/client';
import { CalendarClock, CheckCircle2, Loader2, Pencil, Printer, RotateCcw, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface TodayDebtCollectionOperation {
  id: string;
  debt_id: string;
  worker_id: string;
  collection_date: string;
  action: 'no_payment' | 'partial_payment' | 'full_payment';
  amount_collected: number;
  payment_method: string | null;
  next_due_date: string | null;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  created_at: string;
  worker?: {
    id: string;
    full_name?: string | null;
    username?: string | null;
  } | null;
  debt?: {
    id: string;
    customer_id: string;
    total_amount: number;
    paid_amount: number;
    remaining_amount: number;
    due_date: string | null;
    collection_type?: string | null;
    collection_days?: string[] | null;
    collection_amount?: number | null;
    worker?: {
      id: string;
      full_name?: string | null;
      username?: string | null;
    } | null;
    customer?: {
      id: string;
      name: string;
      store_name?: string | null;
      phone?: string | null;
      customer_type?: string | null;
    } | null;
  } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection: TodayDebtCollectionOperation | null;
}

const withinCollectionWindow = (paymentCreatedAt: string, collectionCreatedAt: string) => {
  const diff = Math.abs(new Date(paymentCreatedAt).getTime() - new Date(collectionCreatedAt).getTime());
  return diff <= 5 * 60 * 1000;
};

const CollectedDebtOperationDialog: React.FC<Props> = ({ open, onOpenChange, collection }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: workerPrintInfo } = useWorkerPrintInfo(collection?.worker_id);
  const { companyInfo } = useCompanyInfo();
  const [editMode, setEditMode] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');

  useEffect(() => {
    if (!collection) return;
    setEditMode(false);
    setAmount(String(Number(collection.amount_collected || 0)));
    setPaymentMethod(collection.payment_method || 'cash');
    setNotes(collection.notes || '');
    setNextDueDate(collection.next_due_date ? String(collection.next_due_date).slice(0, 10) : '');
  }, [collection]);

  const { data: debtHistory = [] } = useQuery({
    queryKey: ['today-debt-collection-history', collection?.debt_id],
    queryFn: async () => {
      if (!collection?.debt_id) return [];
      const { data, error } = await supabase
        .from('debt_collections')
        .select('id, action, amount_collected, created_at')
        .eq('debt_id', collection.debt_id)
        .neq('status', 'rejected')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!collection?.debt_id,
  });

  const { data: debtPayments = [] } = useQuery({
    queryKey: ['today-debt-payment-history', collection?.debt_id, collection?.worker_id],
    queryFn: async () => {
      if (!collection?.debt_id || !collection?.worker_id) return [];
      const { data, error } = await supabase
        .from('debt_payments')
        .select('id, amount, payment_method, notes, created_at')
        .eq('debt_id', collection.debt_id)
        .eq('worker_id', collection.worker_id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!collection?.debt_id && !!collection?.worker_id,
  });

  const beforeAfter = useMemo(() => {
    const total = Number(collection?.debt?.total_amount || 0);
    if (!collection) {
      return { total, before: 0, after: 0 };
    }
    const priorPaid = debtHistory
      .filter((entry) => entry.id !== collection.id && entry.action !== 'no_payment' && new Date(entry.created_at) < new Date(collection.created_at))
      .reduce((sum, entry) => sum + Number(entry.amount_collected || 0), 0);
    const before = Math.max(0, total - priorPaid);
    const after = Math.max(0, before - Number(collection.amount_collected || 0));
    return { total, before, after };
  }, [collection, debtHistory]);

  const matchedDebtPayment = useMemo(() => {
    if (!collection) return null;
    return debtPayments.find((payment) =>
      withinCollectionWindow(payment.created_at, collection.created_at) &&
      Math.abs(Number(payment.amount || 0) - Number(collection.amount_collected || 0)) < 0.001
    ) || null;
  }, [collection, debtPayments]);

  const refreshDebtQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['customer-debts'] }),
      queryClient.invalidateQueries({ queryKey: ['customer-debt-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['customer-debts-summary-all'] }),
      queryClient.invalidateQueries({ queryKey: ['debt-payments'] }),
      queryClient.invalidateQueries({ queryKey: ['pending-collections'] }),
      queryClient.invalidateQueries({ queryKey: ['due-debts'] }),
      queryClient.invalidateQueries({ queryKey: ['today-debt-collections-dialog'] }),
    ]);
  };

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!collection?.debt) throw new Error('لا توجد بيانات كافية');
      const nextAmount = Number(amount || 0);
      if (!nextAmount || nextAmount <= 0) throw new Error('أدخل مبلغ تحصيل صحيح');
      if (nextAmount > beforeAfter.before) throw new Error('المبلغ أكبر من الدين قبل التحصيل');

      const total = Number(collection.debt.total_amount || 0);
      const paidBeforeThisCollection = Math.max(0, total - beforeAfter.before);
      const nextPaid = Math.min(total, paidBeforeThisCollection + nextAmount);
      const nextStatus = nextPaid >= total ? 'paid' : nextPaid > 0 ? 'partially_paid' : 'active';
      const nextAction = nextAmount >= beforeAfter.before ? 'full_payment' : 'partial_payment';

      const { error: debtError } = await supabase
        .from('customer_debts')
        .update({
          paid_amount: nextPaid,
          status: nextStatus,
          due_date: nextDueDate || collection.debt.due_date || null,
        })
        .eq('id', collection.debt_id);
      if (debtError) throw debtError;

      const { error: collectionError } = await supabase
        .from('debt_collections')
        .update({
          action: nextAction,
          amount_collected: nextAmount,
          payment_method: paymentMethod,
          notes: notes || null,
          next_due_date: nextDueDate || null,
        })
        .eq('id', collection.id);
      if (collectionError) throw collectionError;

      if (matchedDebtPayment) {
        const { error: paymentError } = await supabase
          .from('debt_payments')
          .update({
            amount: nextAmount,
            payment_method: paymentMethod,
            notes: notes || null,
          })
          .eq('id', matchedDebtPayment.id);
        if (paymentError) throw paymentError;
      } else {
        const { error: insertPaymentError } = await supabase
          .from('debt_payments')
          .insert({
            debt_id: collection.debt_id,
            worker_id: collection.worker_id,
            amount: nextAmount,
            payment_method: paymentMethod,
            notes: notes || null,
          });
        if (insertPaymentError) throw insertPaymentError;
      }
    },
    onSuccess: async () => {
      await refreshDebtQueries();
      toast.success('تم تعديل التحصيل');
      setEditMode(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'فشل تعديل التحصيل');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!collection?.debt) throw new Error('لا توجد بيانات كافية');
      const currentPaid = Number(collection.debt.paid_amount || 0);
      const nextPaid = Math.max(0, currentPaid - Number(collection.amount_collected || 0));
      const total = Number(collection.debt.total_amount || 0);
      const nextStatus = nextPaid <= 0 ? 'active' : nextPaid >= total ? 'paid' : 'partially_paid';

      const { error: debtError } = await supabase
        .from('customer_debts')
        .update({
          paid_amount: nextPaid,
          status: nextStatus,
        })
        .eq('id', collection.debt_id);
      if (debtError) throw debtError;

      if (matchedDebtPayment) {
        const { error: deletePaymentError } = await supabase
          .from('debt_payments')
          .delete()
          .eq('id', matchedDebtPayment.id);
        if (deletePaymentError) throw deletePaymentError;
      }

      const { error: deleteCollectionError } = await supabase
        .from('debt_collections')
        .delete()
        .eq('id', collection.id);
      if (deleteCollectionError) throw deleteCollectionError;
    },
    onSuccess: async () => {
      await refreshDebtQueries();
      toast.success('تم إلغاء التحصيل');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'فشل إلغاء التحصيل');
    },
  });

  if (!collection?.debt) return null;

  const customer = collection.debt.customer;
  const debtCreatorName = collection.debt.worker?.full_name || collection.debt.worker?.username || '—';
  const receiptData = {
    receiptType: 'debt_payment' as const,
    orderId: null,
    debtId: collection.debt_id,
    customerId: collection.debt.customer_id,
    customerName: customer?.store_name || customer?.name || '—',
    customerPhone: customer?.phone || null,
    workerId: collection.worker_id,
    workerName: workerPrintInfo?.printName || user?.full_name || '',
    workerPhone: workerPrintInfo?.workPhone || null,
    branchId: null,
    items: [],
    totalAmount: Number(collection.amount_collected || 0),
    discountAmount: 0,
    paidAmount: Number(collection.amount_collected || 0),
    remainingAmount: beforeAfter.after,
    paymentMethod: collection.payment_method || 'cash',
    notes: collection.notes || null,
    debtTotalAmount: beforeAfter.total,
    debtPaidBefore: Math.max(0, beforeAfter.total - beforeAfter.before),
    collectorName: collection.worker?.full_name || collection.worker?.username || user?.full_name || '',
    nextCollectionDate: collection.next_due_date ? String(collection.next_due_date).slice(0, 10) : null,
    nextCollectionTime: collection.next_due_date && String(collection.next_due_date).includes('T')
      ? String(collection.next_due_date).slice(11, 16)
      : null,
    companyName: companyInfo?.company_name || '',
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-md p-4 gap-3 max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="pb-0">
            <DialogTitle className="text-base">تفاصيل التحصيل</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Card className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <CustomerSummary
                  customer={{
                    name: customer?.name,
                    store_name: customer?.store_name,
                    customer_type: customer?.customer_type,
                    phone: customer?.phone,
                  }}
                  compact
                  showAvatar={false}
                  showMeta={false}
                />
                <div className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                  {Number(collection.amount_collected || 0).toLocaleString()} DA
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="truncate">المحل</span>
                <span className="font-semibold text-foreground truncate">
                  {customer?.store_name || customer?.name || '—'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5" />
                  {format(new Date(collection.created_at), 'dd/MM/yyyy HH:mm')}
                </span>
                <span>• عامل التحصيل: {collection.worker?.full_name || collection.worker?.username || '—'}</span>
                <span>• منشئ الدين: {debtCreatorName}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                  {collection.payment_method || 'cash'}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${collection.status === 'approved' ? 'bg-green-100 text-green-700' : collection.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {collection.status === 'approved' ? 'معتمد' : collection.status === 'rejected' ? 'مرفوض' : 'معلّق'}
                </span>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Card className="p-3 text-center">
                <div className="text-xs text-muted-foreground">الدين الإجمالي</div>
                <div className="mt-1 text-base font-black">{beforeAfter.total.toLocaleString()} DA</div>
              </Card>
              <Card className="p-3 text-center border-orange-200 bg-orange-50/50">
                <div className="text-xs text-orange-700">قبل التحصيل</div>
                <div className="mt-1 text-base font-black text-orange-700">{beforeAfter.before.toLocaleString()} DA</div>
              </Card>
              <Card className="p-3 text-center border-green-200 bg-green-50/50">
                <div className="text-xs text-green-700">بعد التحصيل</div>
                <div className="mt-1 text-base font-black text-green-700">{beforeAfter.after.toLocaleString()} DA</div>
              </Card>
            </div>

            {!editMode ? (
              <Card className="p-3 space-y-2">
                <div className="text-sm font-semibold">معلومات العملية</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-muted/40 p-2">
                    <div className="text-xs text-muted-foreground">المبلغ المحصل</div>
                    <div className="font-bold">{Number(collection.amount_collected || 0).toLocaleString()} DA</div>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-2">
                    <div className="text-xs text-muted-foreground">طريقة الدفع</div>
                    <div className="font-bold">{collection.payment_method || 'cash'}</div>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-2">
                    <div className="text-xs text-muted-foreground">منشئ الدين</div>
                    <div className="font-bold">{debtCreatorName}</div>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-2 col-span-2">
                    <div className="text-xs text-muted-foreground">الموعد القادم</div>
                    <div className="font-bold">{collection.next_due_date ? format(new Date(collection.next_due_date), 'dd/MM/yyyy HH:mm') : 'غير محدد'}</div>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-2 col-span-2">
                    <div className="text-xs text-muted-foreground">ملاحظات</div>
                    <div className="font-medium">{collection.notes || '—'}</div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-3 space-y-3">
                <div className="text-sm font-semibold">تعديل التحصيل</div>
                <div className="space-y-1.5">
                  <Label className="text-xs">مبلغ التحصيل</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={0} max={beforeAfter.before} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">طريقة الدفع</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">cash</SelectItem>
                      <SelectItem value="check">check</SelectItem>
                      <SelectItem value="transfer">transfer</SelectItem>
                      <SelectItem value="receipt">receipt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">التاريخ القادم</Label>
                  <Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">ملاحظات</Label>
                  <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => editMutation.mutate()} disabled={editMutation.isPending}>
                    {editMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    حفظ
                  </Button>
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setEditMode(false)}>
                    <RotateCcw className="w-4 h-4" />
                    تراجع
                  </Button>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button variant="outline" className="gap-2" onClick={() => setEditMode((prev) => !prev)}>
                <Pencil className="w-4 h-4" />
                {editMode ? 'إلغاء التعديل' : 'تعديل التحصيل'}
              </Button>
              <Button variant="outline" className="gap-2" onClick={() => setShowReceiptDialog(true)}>
                <Printer className="w-4 h-4" />
                طباعة الوصل
              </Button>
              <Button variant="destructive" className="gap-2" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending || editMutation.isPending}>
                {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                إلغاء التحصيل
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ReceiptDialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog} receiptData={receiptData} />
    </>
  );
};

export default CollectedDebtOperationDialog;
