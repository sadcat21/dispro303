import React from 'react';
import CheckVerificationDialog from '@/components/orders/CheckVerificationDialog';
import DocVisitNoCollectionDialog from './DocVisitNoCollectionDialog';

export type DocumentFlowMode = 'collect' | 'visit' | 'verify';

interface DocumentFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: DocumentFlowMode;
  orderId?: string;
  orderTotal?: number;
  customerName?: string;
  documentType?: 'check' | 'receipt' | 'transfer';
  initialCheckReceived?: boolean;
  initialVerification?: any;
  customerLatitude?: number | null;
  customerLongitude?: number | null;
  onConfirm?: (data: {
    checkReceived: boolean;
    verification: any;
    skippedVerification?: boolean;
  }) => void;
}

const DocumentFlowDialog: React.FC<DocumentFlowDialogProps> = ({
  open,
  onOpenChange,
  mode,
  orderId,
  orderTotal,
  customerName,
  documentType,
  initialCheckReceived,
  initialVerification,
  customerLatitude,
  customerLongitude,
  onConfirm,
}) => {
  if (mode === 'visit') {
    if (!orderId) return null;
    return (
      <DocVisitNoCollectionDialog
        open={open}
        onOpenChange={onOpenChange}
        orderId={orderId}
        customerName={customerName || ''}
        documentType={documentType || 'check'}
        customerLatitude={customerLatitude}
        customerLongitude={customerLongitude}
      />
    );
  }

  if (mode === 'collect' || mode === 'verify') {
    if (!orderTotal) return null;
    return (
      <CheckVerificationDialog
        open={open}
        onOpenChange={onOpenChange}
        orderTotal={orderTotal}
        customerName={customerName || ''}
        documentType={documentType || 'check'}
        initialCheckReceived={initialCheckReceived ?? true}
        initialVerification={initialVerification}
        onConfirm={onConfirm}
      />
    );
  }

  return null;
};

export default DocumentFlowDialog;
