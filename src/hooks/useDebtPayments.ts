import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DebtPaymentWithDetails } from '@/types/accounting';

export const useDebtPayments = (debtId: string | null) => {
  return useQuery({
    queryKey: ['debt-payments', debtId],
    queryFn: async () => {
      if (!debtId) return [];
      const { data, error } = await supabase
        .from('debt_payments')
        .select(`
          *,
          worker:workers!debt_payments_worker_id_fkey(id, full_name)
        `)
        .eq('debt_id', debtId)
        .order('collected_at', { ascending: false });

      if (error) throw error;
      return data as unknown as DebtPaymentWithDetails[];
    },
    enabled: !!debtId,
  });
};

export const useDebtPaymentsGroup = (debtIds: string[]) => {
  const normalizedIds = [...debtIds].filter(Boolean).sort();

  return useQuery({
    queryKey: ['debt-payments-group', normalizedIds],
    queryFn: async () => {
      if (!normalizedIds.length) return [];
      const { data, error } = await supabase
        .from('debt_payments')
        .select(`
          *,
          worker:workers!debt_payments_worker_id_fkey(id, full_name)
        `)
        .in('debt_id', normalizedIds)
        .order('collected_at', { ascending: false });

      if (error) throw error;
      return data as unknown as DebtPaymentWithDetails[];
    },
    enabled: normalizedIds.length > 0,
  });
};
