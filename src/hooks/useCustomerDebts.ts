import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CustomerDebt, CustomerDebtWithDetails } from '@/types/accounting';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';

const resolveDebtCollectionMethod = async (
  debtId: string,
  fallbackMethod: string
) => {
  const normalizedFallback = String(fallbackMethod || 'cash').toLowerCase();

  const { data: debtRow, error } = await supabase
    .from('customer_debts')
    .select(`
      id,
      order_id,
      order:orders!customer_debts_order_id_fkey(
        id,
        payment_type,
        invoice_payment_method,
        document_verification
      )
    `)
    .eq('id', debtId)
    .maybeSingle();

  if (error) throw error;

  const order = (debtRow as any)?.order;
  if (!order || order.payment_type !== 'with_invoice') {
    return normalizedFallback;
  }

  const invoiceMethod = String(order.invoice_payment_method || '').toLowerCase();
  const paidByCash = Boolean(order.document_verification && typeof order.document_verification === 'object' && order.document_verification.paid_by_cash === true);

  if (invoiceMethod === 'check') return 'check';
  if (invoiceMethod === 'transfer' || invoiceMethod === 'virement') return 'transfer';
  if (invoiceMethod === 'receipt' || invoiceMethod === 'versement') {
    return paidByCash ? normalizedFallback : 'receipt';
  }

  return normalizedFallback;
};

export const useCustomerDebts = (filters?: {
  status?: string;
  workerId?: string;
  branchId?: string;
  customerId?: string;
}) => {
  useRealtimeSubscription(
    'customer-debts-realtime',
    [{ table: 'customer_debts' }, { table: 'debt_payments' }],
    [['customer-debts'], ['customer-debt-summary'], ['debt-payments'], ['customer-debts-summary-all']],
  );

  return useQuery({
    queryKey: ['customer-debts', filters],
    queryFn: async () => {
      let query = supabase
        .from('customer_debts')
        .select(`
          *,
          customer:customers(id, name, store_name, phone, wilaya, latitude, longitude, customer_type, sector_id, zone_id),
          worker:workers!customer_debts_worker_id_fkey(id, full_name, username)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.workerId) {
        query = query.eq('worker_id', filters.workerId);
      }
      if (filters?.branchId) {
        query = query.eq('branch_id', filters.branchId);
      }
      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as CustomerDebtWithDetails[];
    },
  });
};

export const useCustomerDebtSummary = (customerId: string | null) => {
  return useQuery({
    queryKey: ['customer-debt-summary', customerId],
    queryFn: async () => {
      if (!customerId) return null;
      const { data, error } = await supabase
        .from('customer_debts')
        .select('total_amount, paid_amount, remaining_amount, status')
        .eq('customer_id', customerId)
        .eq('status', 'active');

      if (error) throw error;
      const totalDebt = data?.reduce((sum, d) => sum + Number(d.remaining_amount), 0) || 0;
      return { totalDebt, count: data?.length || 0 };
    },
    enabled: !!customerId,
  });
};

export const useCreateDebt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (debt: {
      customer_id: string;
      order_id?: string;
      worker_id: string;
      branch_id?: string;
      total_amount: number;
      paid_amount: number;
      notes?: string;
      due_date?: string;
      remaining_amount?: number;
      collection_type?: 'none' | 'daily' | 'weekly';
    }) => {
      const status = debt.paid_amount >= debt.total_amount
        ? 'paid'
        : debt.paid_amount > 0
          ? 'partially_paid'
          : 'active';
      const { data, error } = await supabase
        .from('customer_debts')
        .insert({
          ...debt,
          status,
          collection_type: debt.collection_type ?? 'none',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-debts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debt-summary'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debts-summary-all'] });
      queryClient.invalidateQueries({ queryKey: ['due-debts'] });
    },
  });
};

export const useUpdateDebtPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      debtId,
      amount,
      workerId,
      paymentMethod = 'cash',
      notes,
      nextDueDate,
    }: {
      debtId: string;
      amount: number;
      workerId: string;
      paymentMethod?: string;
      notes?: string;
      nextDueDate?: string;
    }) => {
      // Insert payment record (even for zero-amount visits)
      const effectivePaymentMethod = amount > 0
        ? await resolveDebtCollectionMethod(debtId, paymentMethod)
        : paymentMethod;

      const { error: paymentError } = await supabase
        .from('debt_payments')
        .insert({
          debt_id: debtId,
          worker_id: workerId,
          amount,
          payment_method: effectivePaymentMethod,
          notes,
        });

      if (paymentError) throw paymentError;

      // Determine action type for the collection record
      let action: string = 'no_payment';
      if (amount > 0) {
        // Get current debt to check if full or partial
        const { data: debt, error: debtError } = await supabase
          .from('customer_debts')
          .select('total_amount, paid_amount, remaining_amount')
          .eq('id', debtId)
          .single();

        if (debtError) throw debtError;

        const remaining = Number(debt.remaining_amount) || (Number(debt.total_amount) - Number(debt.paid_amount));
        action = amount >= remaining ? 'full_payment' : 'partial_payment';

        const newPaid = Number(debt.paid_amount) + amount;
        const newStatus = newPaid >= Number(debt.total_amount) ? 'paid' : 'partially_paid';

        const updateData: Record<string, any> = { paid_amount: newPaid, status: newStatus };
        if (nextDueDate) updateData.due_date = nextDueDate;

        const { error: updateError } = await supabase
          .from('customer_debts')
          .update(updateData)
          .eq('id', debtId);

        if (updateError) throw updateError;
      } else if (nextDueDate) {
        // Zero-amount visit: just update due_date
        const { error: updateError } = await supabase
          .from('customer_debts')
          .update({ due_date: nextDueDate })
          .eq('id', debtId);

        if (updateError) throw updateError;
      }

      // Create a pending collection record for admin review in accounting session
      const { error: collectionError } = await supabase
        .from('debt_collections')
        .insert({
          debt_id: debtId,
          worker_id: workerId,
          action,
          amount_collected: amount,
          payment_method: amount > 0 ? effectivePaymentMethod : null,
          next_due_date: nextDueDate || null,
          notes: notes || null,
          status: 'pending',
        });

      if (collectionError) throw collectionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-debts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debt-summary'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debts-summary-all'] });
      queryClient.invalidateQueries({ queryKey: ['debt-payments'] });
      queryClient.invalidateQueries({ queryKey: ['pending-collections'] });
      queryClient.invalidateQueries({ queryKey: ['due-debts'] });
      queryClient.invalidateQueries({ queryKey: ['today-debt-collections-dialog'] });
    },
  });
};

export const useDeleteCustomerDebt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (debtId: string) => {
      const { error } = await supabase
        .from('customer_debts')
        .delete()
        .eq('id', debtId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-debts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debt-summary'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debts-summary-all'] });
      queryClient.invalidateQueries({ queryKey: ['debt-payments'] });
      queryClient.invalidateQueries({ queryKey: ['pending-collections'] });
      queryClient.invalidateQueries({ queryKey: ['due-debts'] });
      queryClient.invalidateQueries({ queryKey: ['today-debt-collections-dialog'] });
      queryClient.invalidateQueries({ queryKey: ['customer-journey-debts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-journey-collections'] });
    },
  });
};

export const useCollectCustomerDebtGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      debts,
      amount,
      workerId,
      paymentMethod = 'cash',
      notes,
      nextDueDate,
    }: {
      debts: CustomerDebtWithDetails[];
      amount: number;
      workerId: string;
      paymentMethod?: string;
      notes?: string;
      nextDueDate?: string;
    }) => {
      const activeDebts = [...debts]
        .filter((debt) => Number(debt.remaining_amount || 0) > 0)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (!activeDebts.length) {
        throw new Error('لا توجد ديون نشطة لهذا العميل');
      }

      if (!amount || amount <= 0) {
        throw new Error('أدخل مبلغ تحصيل صحيح');
      }

      const totalRemaining = activeDebts.reduce(
        (sum, debt) => sum + Number(debt.remaining_amount || 0),
        0
      );

      if (amount > totalRemaining) {
        throw new Error(`المبلغ أكبر من الرصيد المتبقي (${totalRemaining})`);
      }

      let remainingToAllocate = amount;

      for (const debt of activeDebts) {
        const debtRemaining = Number(debt.remaining_amount || 0);
        if (debtRemaining <= 0) continue;

        const allocated = Math.min(remainingToAllocate, debtRemaining);
        if (allocated <= 0) continue;

        const nextPaid = Number(debt.paid_amount || 0) + allocated;
        const nextStatus =
          nextPaid >= Number(debt.total_amount || 0)
            ? 'paid'
            : nextPaid > 0
              ? 'partially_paid'
              : 'active';

        const updatePayload: Record<string, any> = {
          paid_amount: nextPaid,
          status: nextStatus,
        };

        if (nextDueDate && nextStatus !== 'paid') {
          updatePayload.due_date = nextDueDate;
        }

        const { error: updateDebtError } = await supabase
          .from('customer_debts')
          .update(updatePayload)
          .eq('id', debt.id);

        if (updateDebtError) throw updateDebtError;

        const effectivePaymentMethod = await resolveDebtCollectionMethod(debt.id, paymentMethod);

        const { error: paymentError } = await supabase
          .from('debt_payments')
          .insert({
            debt_id: debt.id,
            worker_id: workerId,
            amount: allocated,
            payment_method: effectivePaymentMethod,
            notes: notes || null,
          });

        if (paymentError) throw paymentError;

        const { error: collectionError } = await supabase
          .from('debt_collections')
          .insert({
            debt_id: debt.id,
            worker_id: workerId,
            action: allocated >= debtRemaining ? 'full_payment' : 'partial_payment',
            amount_collected: allocated,
            payment_method: effectivePaymentMethod,
            next_due_date: nextDueDate || null,
            notes: notes || null,
            status: 'pending',
          });

        if (collectionError) throw collectionError;

        remainingToAllocate -= allocated;
        if (remainingToAllocate <= 0) break;
      }

      if (nextDueDate && remainingToAllocate <= 0) {
        const stillOpenDebtIds = activeDebts
          .filter((debt) => Number(debt.remaining_amount || 0) > 0)
          .map((debt) => debt.id);

        if (stillOpenDebtIds.length > 0) {
          await supabase
            .from('customer_debts')
            .update({ due_date: nextDueDate })
            .in('id', stillOpenDebtIds)
            .in('status', ['active', 'partially_paid']);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-debts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debt-summary'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debts-summary-all'] });
      queryClient.invalidateQueries({ queryKey: ['debt-payments'] });
      queryClient.invalidateQueries({ queryKey: ['pending-collections'] });
      queryClient.invalidateQueries({ queryKey: ['due-debts'] });
      queryClient.invalidateQueries({ queryKey: ['today-debt-collections-dialog'] });
      queryClient.invalidateQueries({ queryKey: ['customer-journey-debts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-journey-collections'] });
    },
  });
};

export const useRecordCustomerDebtGroupVisit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      debts,
      workerId,
      notes,
      nextDueDate,
      visitType,
    }: {
      debts: CustomerDebtWithDetails[];
      workerId: string;
      notes?: string;
      nextDueDate?: string;
      visitType: 'in_person' | 'phone';
    }) => {
      const activeDebts = debts.filter((debt) => Number(debt.remaining_amount || 0) > 0);
      const visitLabel = visitType === 'phone' ? '[📞 اتصال هاتفي]' : '[🏪 زيارة ميدانية]';

      for (const debt of activeDebts) {
        const { error: paymentError } = await supabase
          .from('debt_payments')
          .insert({
            debt_id: debt.id,
            worker_id: workerId,
            amount: 0,
            payment_method: 'visit',
            notes: `${visitLabel} ${notes || 'بدون تحصيل'}`,
          });

        if (paymentError) throw paymentError;

        if (nextDueDate) {
          const { error: updateError } = await supabase
            .from('customer_debts')
            .update({ due_date: nextDueDate })
            .eq('id', debt.id);

          if (updateError) throw updateError;
        }

        const { error: collectionError } = await supabase
          .from('debt_collections')
          .insert({
            debt_id: debt.id,
            worker_id: workerId,
            action: 'no_payment',
            amount_collected: 0,
            payment_method: null,
            next_due_date: nextDueDate || null,
            notes: `${visitLabel} ${notes || 'بدون تحصيل'}`,
            status: 'pending',
          });

        if (collectionError) throw collectionError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-debts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debt-summary'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debts-summary-all'] });
      queryClient.invalidateQueries({ queryKey: ['debt-payments'] });
      queryClient.invalidateQueries({ queryKey: ['pending-collections'] });
      queryClient.invalidateQueries({ queryKey: ['due-debts'] });
      queryClient.invalidateQueries({ queryKey: ['today-debt-collections-dialog'] });
      queryClient.invalidateQueries({ queryKey: ['customer-journey-debts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-journey-collections'] });
    },
  });
};

export const useUpdateCustomerDebtGroupSchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      debtIds,
      collectionType,
      collectionAmount,
      collectionDays,
    }: {
      debtIds: string[];
      collectionType: 'none' | 'daily' | 'weekly';
      collectionAmount?: number | null;
      collectionDays?: string[] | null;
    }) => {
      if (!debtIds.length) return;

      const { error } = await supabase
        .from('customer_debts')
        .update({
          collection_type: collectionType,
          collection_amount: collectionAmount ?? null,
          collection_days: collectionType === 'weekly' ? (collectionDays || []) : null,
        } as any)
        .in('id', debtIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-debts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debt-summary'] });
      queryClient.invalidateQueries({ queryKey: ['customer-debts-summary-all'] });
      queryClient.invalidateQueries({ queryKey: ['due-debts'] });
      queryClient.invalidateQueries({ queryKey: ['customer-journey-debts'] });
    },
  });
};
