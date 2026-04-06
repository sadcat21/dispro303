import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, FileCheck2, Truck, Clock, ShieldCheck, ShieldAlert, AlertCircle, ClipboardCheck, Stamp, CheckCircle, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import DocumentFlowDialog from '@/components/documents/DocumentFlowDialog';
import { toast } from 'sonner';

interface StampedInvoice {
  orderId: string;
  customerName: string;
  orderTotal: number;
  paymentMethod: string;
  received: boolean;
  receivedAt: string | null;
}

interface DocumentCollectionsSummaryProps {
  workerId: string;
  periodStart: string;
  periodEnd: string;
  receivedDocs?: Record<string, boolean>;
  onReceivedDocsChange?: (docs: Record<string, boolean>) => void;
}

interface CollectedDoc {
  orderId: string;
  customerName: string;
  documentType: string;
  orderTotal: number;
  source: 'delivery' | 'pending_collection';
  documentStatus: string | null;
  verification: {
    checkNumber?: string;
    checkDate?: string;
    checkBank?: string;
    receiptNumber?: string;
    transferReference?: string;
    verified?: boolean;
    verifiedFields?: number;
    totalFields?: number;
  };
}

const fmt = (n: number) => n.toLocaleString();
const extractDate = (v: string): string => v.replace('T', ' ').substring(0, 10);

const docTypeLabel = (t: string) => {
  const map: Record<string, string> = { check: 'Chèque', receipt: 'Versement', transfer: 'Virement', versement: 'Versement', virement: 'Virement' };
  return map[t] || t;
};

const docTypeColor = (t: string) => {
  switch (t) {
    case 'check': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'receipt': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    default: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
  }
};

const docStatusLabel = (s: string | null) => {
  const map: Record<string, string> = { none: 'غير مطلوب', pending: 'معلق', collected: 'تم الاستلام', verified: 'تم التحقق' };
  return map[s || 'none'] || s || 'غير محدد';
};

const parseVerification = (v: any, docType: string) => {
  if (!v || typeof v !== 'object') return { verifiedFields: 0, totalFields: 0 };
  
  let totalFields = 0;
  let verifiedFields = 0;

  const checkField = (val: any) => {
    totalFields++;
    if (val && val !== '' && val !== null && val !== undefined) verifiedFields++;
  };

  if (docType === 'check') {
    checkField(v.check_number || v.checkNumber);
    checkField(v.check_date || v.checkDate);
    checkField(v.check_bank || v.checkBank);
    checkField(v.check_amount || v.checkAmount || v.amount);
  } else if (docType === 'receipt' || docType === 'versement') {
    checkField(v.receipt_number || v.receiptNumber);
    checkField(v.receipt_amount || v.amount);
  } else if (docType === 'transfer' || docType === 'virement') {
    checkField(v.transfer_reference || v.transferReference);
    checkField(v.transfer_amount || v.amount);
  }

  return {
    checkNumber: v.check_number || v.checkNumber,
    checkDate: v.check_date || v.checkDate,
    checkBank: v.check_bank || v.checkBank,
    receiptNumber: v.receipt_number || v.receiptNumber,
    transferReference: v.transfer_reference || v.transferReference,
    verified: totalFields > 0 && verifiedFields === totalFields,
    verifiedFields,
    totalFields,
  };
};

const isCollectedDuringDelivery = (order: any) => {
  const status = String(order?.document_status || '').toLowerCase();
  const verification = order?.document_verification;
  const method = String(order?.invoice_payment_method || '').toLowerCase();

  if (status === 'received' || status === 'verified') return true;
  if (status !== 'pending' || !verification || typeof verification !== 'object') return false;
  if ((verification as any).status === 'not_received') return false;

  if (method === 'check') return true;
  if (method === 'receipt' || method === 'versement') {
    return (verification as any).receipt_received === true || !!((verification as any).receipt_number || (verification as any).receiptNumber);
  }
  if (method === 'transfer' || method === 'virement') {
    return (verification as any).receipt_received === true || !!((verification as any).transfer_reference || (verification as any).transferReference);
  }

  return false;
};

const DocumentCollectionsSummary: React.FC<DocumentCollectionsSummaryProps> = ({ workerId, periodStart, periodEnd, receivedDocs, onReceivedDocsChange }) => {
  const queryClient = useQueryClient();
  const [verifyDoc, setVerifyDoc] = useState<CollectedDoc | null>(null);
  const { data: docs, isLoading } = useQuery({
    queryKey: ['session-document-collections', workerId, periodStart, periodEnd],
    queryFn: async () => {
      const startDate = extractDate(periodStart);
      const endDate = extractDate(periodEnd);
      // Use exact period timestamps
      const toTz = (v: string, isEnd: boolean) => {
        if (v.includes('+') || v.includes('Z')) return v;
        if (v.includes('T')) return v + ':00+01:00';
        return isEnd ? v + 'T23:59:59+01:00' : v + 'T00:00:00+01:00';
      };
      const startTz = toTz(periodStart, false);
      const endTz = toTz(periodEnd, true);

      const result: CollectedDoc[] = [];

      // 1) Pending documents that were actually collected (source of truth)
      const { data: pendingCollections } = await supabase
        .from('document_collections')
        .select(`id, action, status, collection_date, created_at, order_id, order:orders!document_collections_order_id_fkey(id, total_amount, invoice_payment_method, document_status, document_verification, customer:customers!orders_customer_id_fkey(name))`)
        .eq('worker_id', workerId)
        .eq('action', 'collected')
        .neq('status', 'rejected')
        .gte('created_at', startTz)
        .lte('created_at', endTz);

      for (const c of (pendingCollections || [])) {
        const order = c.order as any;
        if (!order) continue;
        const docType = order.invoice_payment_method || 'check';
        result.push({
          orderId: order.id,
          customerName: order.customer?.name || 'غير معروف',
          documentType: docType,
          orderTotal: Number(order.total_amount || 0),
          source: 'pending_collection',
          documentStatus: order.document_status,
          verification: parseVerification(order.document_verification, docType),
        });
      }

      const pendingOrderIds = new Set(result.map((r) => r.orderId));

      const { data: deliveryOrders } = await supabase
        .from('orders')
        .select(`id, total_amount, invoice_payment_method, document_status, document_verification, updated_at, customer:customers!orders_customer_id_fkey(name)`)
        .eq('assigned_worker_id', workerId)
        .eq('status', 'delivered')
        .in('invoice_payment_method', ['check', 'receipt', 'transfer', 'versement', 'virement'])
        .in('document_status', ['pending', 'received', 'verified'])
        .gte('updated_at', startTz)
        .lte('updated_at', endTz);

      for (const o of (deliveryOrders || [])) {
        if (pendingOrderIds.has(o.id)) continue;
        if (!isCollectedDuringDelivery(o)) continue;

        const docType = o.invoice_payment_method || 'check';
        result.push({
          orderId: o.id,
          customerName: (o.customer as any)?.name || 'غير معروف',
          documentType: docType,
          orderTotal: Number(o.total_amount || 0),
          source: 'delivery',
          documentStatus: o.document_status,
          verification: parseVerification(o.document_verification, docType),
        });
      }

      return result;
    },
  });

  // Query stamped invoices (فاتورة مختومة) - for with_invoice + check/cash
  const { data: stampedInvoices } = useQuery({
    queryKey: ['session-stamped-invoices', workerId, periodStart, periodEnd],
    queryFn: async () => {
      const toTz2 = (v: string, isEnd: boolean) => {
        if (v.includes('+') || v.includes('Z')) return v;
        if (v.includes('T')) return v + ':00+01:00';
        return isEnd ? v + 'T23:59:59+01:00' : v + 'T00:00:00+01:00';
      };
      const startTz = toTz2(periodStart, false);
      const endTz = toTz2(periodEnd, true);

      const { data } = await supabase
        .from('orders')
        .select(`id, total_amount, invoice_payment_method, invoice_received_at, updated_at, payment_type, customer:customers!orders_customer_id_fkey(name)`)
        .eq('assigned_worker_id', workerId)
        .eq('status', 'delivered')
        .eq('payment_type', 'with_invoice')
        .in('invoice_payment_method', ['check', 'cash'])
        .gte('updated_at', startTz)
        .lte('updated_at', endTz);

      return (data || []).map((o: any): StampedInvoice => ({
        orderId: o.id,
        customerName: o.customer?.name || 'غير معروف',
        orderTotal: Number(o.total_amount || 0),
        paymentMethod: o.invoice_payment_method || 'cash',
        received: !!o.invoice_received_at,
        receivedAt: o.invoice_received_at,
      }));
    },
  });

  if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  if ((!docs || docs.length === 0) && (!stampedInvoices || stampedInvoices.length === 0)) return <p className="text-xs text-muted-foreground text-center py-3">لا توجد مستندات محصلة في هذه الفترة</p>;

  const allDocs = docs || [];
  const deliveryDocs = allDocs.filter(d => d.source === 'delivery');
  const pendingDocs = allDocs.filter(d => d.source === 'pending_collection');
  const totalAmount = allDocs.reduce((s, d) => s + d.orderTotal, 0);

  const renderDocCard = (doc: CollectedDoc) => {
    const v = doc.verification;
    const pct = v.totalFields > 0 ? Math.round((v.verifiedFields! / v.totalFields) * 100) : 0;
    const docKey = `doc_${doc.orderId}`;
    const isReceived = receivedDocs ? receivedDocs[docKey] !== false : true;

    return (
      <div key={doc.orderId} className={`border rounded-lg p-3 space-y-2 ${!isReceived ? 'border-destructive/40 bg-destructive/5' : ''}`}>
        {/* Header: checkbox + customer + amount */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onReceivedDocsChange && (
              <button
                onClick={() => onReceivedDocsChange({ ...receivedDocs, [docKey]: !isReceived })}
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isReceived ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-destructive/10 text-destructive'}`}
              >
                {isReceived ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              </button>
            )}
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">{doc.customerName}</p>
              <p className="text-[10px] text-muted-foreground">#{doc.orderId.slice(0, 8)}</p>
            </div>
          </div>
          <div className="text-end">
            <span className="font-bold text-sm">{fmt(doc.orderTotal)} DA</span>
            <div className="mt-0.5">
              <Badge className={`${docTypeColor(doc.documentType)} text-[9px] px-1.5 py-0`}>
                {docTypeLabel(doc.documentType)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Verification details */}
        {doc.documentType === 'check' && (
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <div className="bg-muted/50 rounded p-1.5 text-center">
              <p className="text-muted-foreground mb-0.5">رقم الشيك</p>
              <p className="font-bold">{v.checkNumber || '—'}</p>
            </div>
            <div className="bg-muted/50 rounded p-1.5 text-center">
              <p className="text-muted-foreground mb-0.5">تاريخ الشيك</p>
              <p className="font-bold">{v.checkDate || '—'}</p>
            </div>
            <div className="bg-muted/50 rounded p-1.5 text-center">
              <p className="text-muted-foreground mb-0.5">البنك</p>
              <p className="font-bold">{v.checkBank || '—'}</p>
            </div>
          </div>
        )}

        {(doc.documentType === 'receipt' || doc.documentType === 'versement') && v.receiptNumber && (
          <div className="bg-muted/50 rounded p-1.5 text-[10px] text-center">
            <p className="text-muted-foreground mb-0.5">رقم الوصل</p>
            <p className="font-bold">{v.receiptNumber}</p>
          </div>
        )}

        {(doc.documentType === 'transfer' || doc.documentType === 'virement') && v.transferReference && (
          <div className="bg-muted/50 rounded p-1.5 text-[10px] text-center">
            <p className="text-muted-foreground mb-0.5">مرجع التحويل</p>
            <p className="font-bold">{v.transferReference}</p>
          </div>
        )}

        {/* Verification progress + button */}
        <div className="flex items-center gap-2">
          {v.verified ? (
            <ShieldCheck className="w-3.5 h-3.5 text-green-600 shrink-0" />
          ) : v.verifiedFields! > 0 ? (
            <ShieldAlert className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
          )}
          <Progress value={pct} className="h-1.5 flex-1" />
          <span className={`text-[10px] font-bold ${v.verified ? 'text-green-600' : pct > 0 ? 'text-orange-500' : 'text-destructive'}`}>
            {pct}%
          </span>
          {!v.verified && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2 gap-1"
              onClick={() => setVerifyDoc(doc)}
            >
              <ClipboardCheck className="w-3 h-3" />
              تحقق
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderDocList = (items: CollectedDoc[]) => items.map(renderDocCard);

  return (
    <div className="space-y-3">
      {deliveryDocs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-green-700 dark:text-green-400">
            <Truck className="w-3.5 h-3.5" />
            <span>مستندات مستلمة أثناء التوصيل ({deliveryDocs.length})</span>
          </div>
          <div className="border-2 border-green-200 dark:border-green-900/40 rounded-xl p-2.5 space-y-2 bg-green-50/30 dark:bg-green-900/10">
            {renderDocList(deliveryDocs)}
          </div>
        </div>
      )}

      {pendingDocs.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-700 dark:text-orange-400">
            <Clock className="w-3.5 h-3.5" />
            <span>مستندات معلقة تم تحصيلها ({pendingDocs.length})</span>
          </div>
          <div className="border-2 border-orange-200 dark:border-orange-900/40 rounded-xl p-2.5 space-y-2 bg-orange-50/30 dark:bg-orange-900/10">
            {renderDocList(pendingDocs)}
          </div>
        </div>
      )}

      {/* Stamped invoices section */}
      {stampedInvoices && stampedInvoices.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-700 dark:text-violet-400">
            <Stamp className="w-3.5 h-3.5" />
            <span>فواتير مختومة ({stampedInvoices.filter(s => s.received).length}/{stampedInvoices.length})</span>
          </div>
          <div className="border-2 border-violet-200 dark:border-violet-900/40 rounded-xl p-2.5 space-y-2 bg-violet-50/30 dark:bg-violet-900/10">
            {stampedInvoices.map(inv => {
              const stampKey = `stamp_${inv.orderId}`;
              const isStampReceived = receivedDocs ? receivedDocs[stampKey] !== false : true;
              return (
              <div key={inv.orderId} className={`border rounded-lg p-2.5 flex items-center justify-between gap-2 ${!isStampReceived ? 'border-destructive/40 bg-destructive/5' : ''}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {onReceivedDocsChange && (
                    <button
                      onClick={() => onReceivedDocsChange({ ...receivedDocs, [stampKey]: !isStampReceived })}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isStampReceived ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-destructive/10 text-destructive'}`}
                    >
                      {isStampReceived ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </button>
                  )}
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${inv.received ? 'bg-green-100 dark:bg-green-900/30' : 'bg-destructive/10'}`}>
                    {inv.received ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <XCircle className="w-3.5 h-3.5 text-destructive" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{inv.customerName}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">#{inv.orderId.slice(0, 8)}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {inv.paymentMethod === 'check' ? 'Chèque' : 'كاش'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <span className="font-bold text-xs">{fmt(inv.orderTotal)} DA</span>
                  <p className={`text-[10px] font-medium ${inv.received ? 'text-green-600' : 'text-destructive'}`}>
                    {inv.received ? 'تم الاستلام ✓' : 'لم تُستلم'}
                  </p>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 flex justify-between items-center">
        <span className="text-sm font-bold">إجمالي المستندات: {(docs?.length || 0) + (stampedInvoices?.length || 0)}</span>
        <span className="font-bold text-primary">{fmt(totalAmount)} DA</span>
      </div>

      {/* Verification dialog */}
      {verifyDoc && (
        <DocumentFlowDialog
          open={!!verifyDoc}
          onOpenChange={(open) => { if (!open) setVerifyDoc(null); }}
          mode="verify"
          orderId={verifyDoc.orderId}
          orderTotal={verifyDoc.orderTotal}
          customerName={verifyDoc.customerName}
          documentType={verifyDoc.documentType === 'check' ? 'check' : verifyDoc.documentType === 'transfer' || verifyDoc.documentType === 'virement' ? 'transfer' : 'receipt'}
          initialCheckReceived={true}
          initialVerification={verifyDoc.verification}
          onConfirm={async (data) => {
            if (!data.checkReceived || !data.verification) {
              setVerifyDoc(null);
              return;
            }
            const { error } = await supabase
              .from('orders')
              .update({
                document_verification: data.verification,
                document_status: data.skippedVerification ? 'received' : 'verified',
              })
              .eq('id', verifyDoc.orderId);
            if (error) {
              toast.error('فشل حفظ التحقق');
            } else {
              toast.success('تم حفظ التحقق بنجاح');
              queryClient.invalidateQueries({ queryKey: ['session-document-collections'] });
            }
            setVerifyDoc(null);
          }}
        />
      )}
    </div>
  );
};

export default DocumentCollectionsSummary;
