import React from 'react';
import CollectCustomerDebtDialog from './CollectCustomerDebtDialog';
import CollectDebtDialog from './CollectDebtDialog';
import VisitNoPaymentDialog from './VisitNoPaymentDialog';
import CollectedDebtOperationDialog, { TodayDebtCollectionOperation } from './CollectedDebtOperationDialog';
import { CustomerDebtWithDetails } from '@/types/accounting';
import { DueDebt } from '@/hooks/useDebtCollections';

export type DebtFlowMode = 'details' | 'collect' | 'visit' | 'collection_operation';

interface DebtFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: DebtFlowMode;
  debt?: CustomerDebtWithDetails | DueDebt | null;
  debts?: CustomerDebtWithDetails[];
  customerName?: string;
  customerId?: string;
  collection?: TodayDebtCollectionOperation | null;
  initialTab?: 'collect' | 'visit' | 'history';
}

const resolveCustomerName = (debt?: CustomerDebtWithDetails | DueDebt | null, fallback?: string) => {
  if (fallback) return fallback;
  return debt?.customer?.store_name || debt?.customer?.name || '';
};

const DebtFlowDialog: React.FC<DebtFlowDialogProps> = ({
  open,
  onOpenChange,
  mode,
  debt,
  debts,
  customerName,
  customerId,
  collection,
  initialTab,
}) => {
  if (mode === 'details') {
    const list = debts ?? (debt ? [debt as CustomerDebtWithDetails] : []);
    const name = resolveCustomerName(debt, customerName);
    const id = customerId || debt?.customer_id;
    if (!list || list.length === 0) return null;
    return (
      <CollectCustomerDebtDialog
        open={open}
        onOpenChange={onOpenChange}
        debts={list as CustomerDebtWithDetails[]}
        customerName={name}
        customerId={id}
        initialTab={initialTab}
        customerPhone={(list[0] as CustomerDebtWithDetails | undefined)?.customer?.phone || null}
      />
    );
  }

  if (mode === 'collect' && debt) {
    return (
      <CollectDebtDialog
        open={open}
        onOpenChange={onOpenChange}
        debtId={debt.id}
        customerName={resolveCustomerName(debt)}
        totalDebtAmount={Number(debt.total_amount || 0)}
        paidAmountBefore={Number(debt.paid_amount || 0)}
        remainingAmount={Number(debt.remaining_amount || 0)}
        customerId={debt.customer_id}
        customerPhone={debt.customer?.phone || null}
        defaultAmount={debt.collection_amount ? Number(debt.collection_amount) : undefined}
        collectionType={debt.collection_type}
        collectionDays={debt.collection_days}
      />
    );
  }

  if (mode === 'visit' && debt) {
    return (
      <VisitNoPaymentDialog
        open={open}
        onOpenChange={onOpenChange}
        debtId={debt.id}
        customerName={resolveCustomerName(debt)}
        collectionType={debt.collection_type}
        collectionDays={debt.collection_days}
        customerLatitude={debt.customer?.latitude}
        customerLongitude={debt.customer?.longitude}
      />
    );
  }

  if (mode === 'collection_operation' && collection) {
    return (
      <CollectedDebtOperationDialog
        open={open}
        onOpenChange={onOpenChange}
        collection={collection}
      />
    );
  }

  return null;
};

export default DebtFlowDialog;
