import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CustomerSummary from '@/components/customers/CustomerSummary';
import ReceiptDialog from '@/components/printing/ReceiptDialog';
import ModifyOrderDialog from '@/components/orders/ModifyOrderDialog';
import { Loader2, Pencil, Phone, Printer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderItems } from '@/hooks/useOrders';
import { OrderItem, OrderWithDetails, Product } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderWithDetails | null;
}

const toSafeNumber = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const normalizeSaleItem = (item: any) => ({
  productId: item?.product_id || item?.productId || item?.product?.id || '',
  productName: item?.product?.name || item?.product_name || item?.productName || '—',
  quantity: toSafeNumber(item?.quantity),
  unitPrice: toSafeNumber(item?.unit_price ?? item?.unitPrice),
  totalPrice: toSafeNumber(item?.total_price ?? item?.totalPrice),
  giftQuantity: toSafeNumber(item?.gift_quantity ?? item?.giftQuantity),
});

const resolveOrderPayment = (
  order: any,
  isOrderRequest: boolean,
  totalAmountOverride?: number,
) => {
  const totalAmount = totalAmountOverride != null
    ? Number(totalAmountOverride || 0)
    : Number(order?.total_amount || 0);
  const paymentStatus = String(order?.payment_status || '').toLowerCase();
  const partialAmount = order?.partial_amount != null ? Number(order.partial_amount) : null;

  if (isOrderRequest) return { paidAmount: 0, remainingAmount: totalAmount };

  if (partialAmount != null && partialAmount >= 0 && partialAmount < totalAmount) {
    return {
      paidAmount: partialAmount,
      remainingAmount: Math.max(0, totalAmount - partialAmount),
    };
  }

  if (['pending', 'payment_pending', 'no_payment', 'credit'].includes(paymentStatus)) {
    return { paidAmount: 0, remainingAmount: totalAmount };
  }

  if (['partial', 'payment_partial'].includes(paymentStatus)) {
    const paid = Math.max(0, Math.min(totalAmount, partialAmount ?? 0));
    return { paidAmount: paid, remainingAmount: Math.max(0, totalAmount - paid) };
  }

  if (['cash', 'check', 'payment_full', 'paid', 'full'].includes(paymentStatus)) {
    return { paidAmount: totalAmount, remainingAmount: 0 };
  }

  if (order?.remaining_amount != null) {
    const remainingAmount = Number(order.remaining_amount);
    return {
      paidAmount: Math.max(0, totalAmount - remainingAmount),
      remainingAmount: Math.max(0, remainingAmount),
    };
  }

  return { paidAmount: totalAmount, remainingAmount: 0 };
};

const getPaymentMethodLabel = (order: any) => {
  const paymentType = order?.payment_type;
  if (paymentType === 'with_invoice') {
    const method = order?.invoice_payment_method;
    if (method === 'cash') return 'كاش';
    if (method === 'check') return 'شيك';
    if (method === 'transfer') return 'Virement';
    if (method === 'receipt') return 'Versement Doc';
    return 'فاتورة';
  }
  if (paymentType === 'without_invoice') return 'بدون فاتورة';
  if (paymentType === 'cash') return 'كاش';
  if (paymentType === 'check') return 'شيك';
  if (paymentType === 'transfer') return 'Virement';
  if (paymentType === 'receipt') return 'Versement Doc';
  return 'كاش';
};

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({ open, onOpenChange, order }) => {
  const { dir } = useLanguage();
  const { user } = useAuth();
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showModifyDialog, setShowModifyDialog] = useState(false);
  const { data: orderItems = [], isLoading: orderItemsLoading } = useOrderItems(open ? order?.id ?? null : null);

  const { data: orderDebt } = useQuery({
    queryKey: ['order-debt-details', order?.id],
    queryFn: async () => {
      if (!order?.id) return null;
      const { data, error } = await supabase
        .from('customer_debts')
        .select('total_amount, paid_amount, remaining_amount')
        .eq('order_id', order.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: open && !!order?.id,
  });

  const displayItems = useMemo(() => {
    if (orderItems.length > 0) return orderItems;
    return (order?.items || []) as (OrderItem & { product?: Product })[];
  }, [order?.items, orderItems]);

  const itemsTotalAmount = useMemo(
    () => displayItems.reduce((sum, item: any) => {
      const normalizedItem = normalizeSaleItem(item);
      if (normalizedItem.totalPrice > 0) {
        return sum + normalizedItem.totalPrice;
      }
      const paidQuantity = Math.max(0, normalizedItem.quantity - normalizedItem.giftQuantity);
      return sum + (paidQuantity * normalizedItem.unitPrice);
    }, 0),
    [displayItems],
  );

  if (!order) return null;

  const customer = order.customer;
  const isOrderRequest = !!(order as any)._isOrderRequest;
  const shouldUseStampedTotal = order.payment_type === 'with_invoice' && order.invoice_payment_method === 'cash';
  const effectiveTotalAmount = shouldUseStampedTotal
    ? Math.max(
      itemsTotalAmount,
      Number(orderDebt?.total_amount || 0),
      Number(order.total_amount || 0),
    )
    : itemsTotalAmount > 0
      ? itemsTotalAmount
      : Number(orderDebt?.total_amount || order.total_amount || 0);
  const fallback = resolveOrderPayment(order, isOrderRequest, effectiveTotalAmount);
  const paidAmount = orderDebt
    ? Math.max(0, effectiveTotalAmount - Number(orderDebt.remaining_amount || 0))
    : fallback.paidAmount;
  const remainingAmount = orderDebt
    ? Number(orderDebt.remaining_amount || 0)
    : fallback.remainingAmount;
  const paymentStatus = String(order?.payment_status || '').toLowerCase();
  const hasDebt =
    remainingAmount > 0 ||
    Number(orderDebt?.total_amount || 0) > 0 ||
    ['pending', 'payment_pending', 'no_payment', 'credit', 'partial', 'payment_partial'].includes(paymentStatus);
  const paymentMethodLabel = getPaymentMethodLabel(order);
  const debtTagLabel = remainingAmount > 0
    ? (paidAmount > 0 ? 'دين جزئي' : 'دين كلي')
    : null;

  const receiptData = {
    receiptType: 'delivery' as const,
    orderId: order.id || null,
    customerId: customer?.id || '',
    customerName: customer?.store_name || customer?.name || order.customer_name || '—',
    customerPhone: customer?.phone || null,
    workerId: user?.id || '',
    workerName: user?.full_name || '',
    workerPhone: null,
    branchId: user?.branch_id || null,
    items: displayItems.map((item: any) => {
      const normalizedItem = normalizeSaleItem(item);
      return {
        productId: normalizedItem.productId,
        productName: normalizedItem.productName,
        quantity: normalizedItem.quantity,
        unitPrice: normalizedItem.unitPrice,
        totalPrice: normalizedItem.totalPrice,
        giftQuantity: normalizedItem.giftQuantity,
      };
    }),
    totalAmount: effectiveTotalAmount,
    paidAmount,
    remainingAmount,
    paymentMethod: order.payment_type || 'cash',
    notes: order.notes || null,
    receiptTitleOverride: isOrderRequest ? 'BON DE COMMANDE' : undefined,
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] gap-3 overflow-y-auto p-4 sm:max-w-sm max-h-[85vh]" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-base">تفاصيل الطلبية</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2 rounded-lg bg-muted/50 p-3">
              <CustomerSummary
                customer={{
                  name: customer?.name,
                  store_name: customer?.store_name,
                  customer_type: customer?.customer_type,
                  phone: customer?.phone,
                  wilaya: customer?.wilaya,
                }}
                compact
                showAvatar={false}
                showMeta={false}
              />

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {customer?.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {customer.phone}
                  </span>
                )}
                {order.created_at && <span>• {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}</span>}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <div className="border-b bg-muted/30 px-3 py-2 text-xs font-bold">المنتجات</div>

              {orderItemsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : displayItems.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">لا توجد منتجات</div>
              ) : (
                <div className="divide-y">
                  {displayItems.map((item: any, idx: number) => {
                    const normalizedItem = normalizeSaleItem(item);
                    const productImage = item?.product?.image_url || item?.image_url || null;

                    return (
                      <div key={item.id || idx} className="px-3 py-2">
                        <div className="flex items-start gap-3">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border bg-muted/40">
                            {productImage ? (
                              <img
                                src={productImage}
                                alt={normalizedItem.productName}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                لا صورة
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-medium leading-5">{normalizedItem.productName}</span>
                              <span className="whitespace-nowrap text-sm font-bold">
                                {Number(normalizedItem.totalPrice || 0).toLocaleString()} DA
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span>الكمية: {normalizedItem.quantity}</span>
                              <span>السعر: {Number(normalizedItem.unitPrice || 0).toLocaleString()} DA</span>
                              {normalizedItem.giftQuantity > 0 && (
                                <span className="text-emerald-600">هدية: {normalizedItem.giftQuantity}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3">
              <span className="font-bold">المجموع</span>
              <span className="text-lg font-bold text-primary">{Number(effectiveTotalAmount || 0).toLocaleString()} DA</span>
            </div>

            <div className="space-y-1.5 rounded-lg bg-muted/30 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">طريقة الدفع</span>
                <span className="font-bold">{paymentMethodLabel}</span>
              </div>
            </div>

            {hasDebt && (
              <div className="space-y-1.5 rounded-lg bg-muted/30 p-3">
                {debtTagLabel && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">حالة الدين</span>
                    <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                      {debtTagLabel}
                    </Badge>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">المبلغ المدفوع</span>
                  <span className="font-bold text-emerald-600">{paidAmount.toLocaleString()} DA</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">المتبقي (دين)</span>
                  <span className="font-bold text-destructive">{remainingAmount.toLocaleString()} DA</span>
                </div>
              </div>
            )}

            {order.notes && (
              <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
                ملاحظات: {order.notes}
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={() => setShowModifyDialog(true)}
              disabled={orderItemsLoading}
            >
              <Pencil className="h-4 w-4" />
              تعديل الطلبية
            </Button>

            <Button className="w-full gap-2" variant="outline" onClick={() => setShowReceiptDialog(true)}>
              <Printer className="h-4 w-4" />
              طباعة الوصل
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ReceiptDialog
        open={showReceiptDialog}
        onOpenChange={setShowReceiptDialog}
        receiptData={receiptData}
      />

      {showModifyDialog && displayItems.length > 0 && (
        <ModifyOrderDialog
          open={showModifyDialog}
          onOpenChange={(nextOpen) => {
            setShowModifyDialog(nextOpen);
            if (!nextOpen) onOpenChange(false);
          }}
          order={order}
          orderItems={displayItems as (OrderItem & { product?: Product })[]}
        />
      )}
    </>
  );
};

export default OrderDetailsDialog;
