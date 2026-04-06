import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CustomerDebt, CustomerDebtWithDetails } from '@/types/accounting';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSubscription } from './useRealtimeSubscription';

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
      const { error: paymentError } = await supabase
        .from('debt_payments')
        .insert({
          debt_id: debtId,
          worker_id: workerId,
          amount,
          payment_method: paymentMethod,
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
          payment_method: amount > 0 ? paymentMethod : null,
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
