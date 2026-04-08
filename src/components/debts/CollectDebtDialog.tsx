import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReceiptDialog from '@/components/printing/ReceiptDialog';
import { ReceiptType } from '@/types/receipt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';
import QuickDayPicker, { DAY_NAMES } from './QuickDayPicker';
import ScheduleOverrideAlert from './ScheduleOverrideAlert';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkerPrintInfo } from '@/hooks/useWorkerPrintInfo';
import { useUpdateDebtPayment } from '@/hooks/useCustomerDebts';
import { useTrackVisit } from '@/hooks/useVisitTracking';
import { toast } from 'sonner';
import { loadSmsSettings, buildSmsFromTemplate, openSmsApp } from '@/components/settings/SmsSettingsCard';
import { sendSmsDirectly } from '@/utils/smsHelper';
import { useCompanyInfo } from '@/hooks/useCompanyInfo';

interface CollectDebtDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debtId: string;
  totalDebtAmount: number;
  paidAmountBefore: number;
  remainingAmount: number;
  customerName: string;
  customerId?: string;
  customerPhone?: string | null;
  defaultAmount?: number;
  collectionType?: string | null;
  collectionDays?: string[] | null;
}

const CollectDebtDialog: React.FC<CollectDebtDialogProps> = ({
  open, onOpenChange, debtId, totalDebtAmount, paidAmountBefore, remainingAmount, customerName, customerId, customerPhone,
  defaultAmount, collectionType, collectionDays,
}) => {
  const { t, dir } = useLanguage();
  const queryClient = useQueryClient();
  const { workerId, user, activeBranch } = useAuth();
  const { data: workerPrintInfo } = useWorkerPrintInfo(workerId);
  const { companyInfo } = useCompanyInfo();
  const updatePayment = useUpdateDebtPayment();
  const { trackVisit } = useTrackVisit();
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [nextDueTime, setNextDueTime] = useState('');
  const [showScheduleWarning, setShowScheduleWarning] = useState(false);
  const [scheduleOverrideConfirmed, setScheduleOverrideConfirmed] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptDataState, setReceiptDataState] = useState<any>(null);

  const hasSchedule = collectionType === 'daily' || collectionType === 'weekly';

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount ? String(defaultAmount) : '');
      setShowScheduleWarning(false);
      setScheduleOverrideConfirmed(false);
    }
  }, [open, defaultAmount]);

  useEffect(() => {
    if (nextDueDate && hasSchedule && !scheduleOverrideConfirmed) {
      setShowScheduleWarning(true);
    } else {
      setShowScheduleWarning(false);
    }
  }, [nextDueDate, hasSchedule, scheduleOverrideConfirmed]);

  const numAmount = Number(amount) || 0;
  const isPartial = numAmount > 0 && numAmount < remainingAmount;
  const isFullPayment = numAmount > 0 && numAmount >= remainingAmount;
  const liveRemaining = Math.max(0, remainingAmount - numAmount);
  const scheduleLabel = collectionType === 'daily'
    ? t('debts.schedule_type_daily')
    : collectionType === 'weekly' && collectionDays?.length
      ? `${t('debts.schedule_type_weekly')} (${collectionDays.map(d => DAY_NAMES[d]?.ar || d).join('، ')})`
      : '';

  const handleConfirmOverride = () => {
    setScheduleOverrideConfirmed(true);
    setShowScheduleWarning(false);
  };

  const handleCancelOverride = () => {
    setNextDueDate('');
    setNextDueTime('');
    setShowScheduleWarning(false);
  };

  const handleSubmit = async () => {
    if (!numAmount || numAmount <= 0) {
      toast.error(t('debts.paid_amount'));
      return;
    }
    if (numAmount > remainingAmount) {
      toast.error(`المبلغ أكبر من المتبقي (${remainingAmount})`);
      return;
    }
    try {
      await updatePayment.mutateAsync({
        debtId,
        amount: numAmount,
        workerId: workerId!,
        paymentMethod,
        notes: notes || undefined,
        nextDueDate: nextDueDate 
          ? (nextDueTime ? `${nextDueDate}T${nextDueTime}` : nextDueDate) 
          : undefined,
      });
      toast.success(t('debts.payment_success'));
      trackVisit({ operationType: 'debt_collection', operationId: debtId });

      // Force invalidate and wait for refetch BEFORE showing receipt
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customer-debts'] }),
        queryClient.invalidateQueries({ queryKey: ['customer-debt-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['customer-debts-summary-all'] }),
        queryClient.invalidateQueries({ queryKey: ['debt-payments'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-collections'] }),
        queryClient.invalidateQueries({ queryKey: ['due-debts'] }),
        queryClient.invalidateQueries({ queryKey: ['today-debt-collections-dialog'] }),
      ]);

      // SMS notification for debt collection
      void (async () => {
        try {
          const smsConfig = await loadSmsSettings(activeBranch?.id);
          const opConfig = smsConfig.debt_collection;
          if (!opConfig.enabled || opConfig.mode === 'disabled') return;
          const message = buildSmsFromTemplate(opConfig.template, {
            customer: customerName,
            total: totalDebtAmount.toLocaleString(),
            order_id: debtId.slice(0, 8),
            company: companyInfo?.company_name || '',
            amount: numAmount.toLocaleString(),
            remaining: liveRemaining.toLocaleString(),
            payment_status: isFullPayment ? 'تم السداد الكامل' : `متبقي ${liveRemaining.toLocaleString()} دج`,
          });

          if (customerPhone) {
            if (opConfig.mode === 'automatic') {
              const sent = await sendSmsDirectly(customerPhone, message);
              if (sent) toast.success('تم إرسال رسالة تأكيد التحصيل للعميل');
            } else if (opConfig.mode === 'semi_automatic') {
              openSmsApp(customerPhone, message);
            }
          }
        } catch (smsErr) {
          console.error('[SMS] debt_collection error:', smsErr);
        }
      })();

      // Close collect dialog first, then show receipt
      onOpenChange(false);

      setReceiptDataState({
        receiptType: 'debt_payment' as ReceiptType,
        orderId: null,
        debtId: debtId,
        customerId: customerId || '',
        customerName: customerName,
        customerPhone: null,
        workerId: workerId!,
        workerName: workerPrintInfo?.printName || user?.full_name || '',
        workerPhone: workerPrintInfo?.workPhone || null,
        branchId: null,
        items: [],
        totalAmount: numAmount,
        discountAmount: 0,
        paidAmount: numAmount,
        remainingAmount: liveRemaining,
        paymentMethod: paymentMethod,
        notes: notes || null,
        debtTotalAmount: totalDebtAmount,
        debtPaidBefore: paidAmountBefore,
        collectorName: user?.full_name || '',
        nextCollectionDate: nextDueDate || null,
        nextCollectionTime: nextDueTime || null,
      });
      setShowReceiptDialog(true);

      setAmount('');
      setNotes('');
      setNextDueDate('');
      setNextDueTime('');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-sm p-4 gap-3" dir={dir}>
        <DialogHeader className="pb-0">
          <DialogTitle className="text-base truncate">{t('debts.collect')} - {customerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2.5">
          {/* Remaining amount */}
          <div className="bg-muted/50 rounded-md p-2 text-center">
            <p className="text-xs text-muted-foreground">{t('debts.remaining')}</p>
            <p className="text-xl font-bold text-destructive">{Math.round(remainingAmount).toLocaleString()} DA</p>
          </div>

          {/* Amount + Full payment button */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t('debts.paid_amount')}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                min={0}
                max={remainingAmount}
                className="h-9 text-sm flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-9 text-xs shrink-0"
                onClick={() => setAmount(String(remainingAmount))}
              >
                {t('debts.full_payment')}
              </Button>
            </div>
          </div>

          {/* Live remaining amount indicator */}
          {numAmount > 0 && (
            <div className={`rounded-md p-2 text-center text-sm font-bold ${isFullPayment ? 'bg-green-100 dark:bg-green-900/20 text-green-700' : 'bg-orange-100 dark:bg-orange-900/20 text-orange-700'}`}>
              {isFullPayment ? (
                <span>✓ تسديد كامل</span>
              ) : (
                <span>المتبقي بعد التحصيل: {Math.round(liveRemaining).toLocaleString()} DA</span>
              )}
            </div>
          )}

          {/* Payment method */}
          {numAmount > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">{t('debts.payment_method')}</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('debts.method_cash')}</SelectItem>
                  <SelectItem value="check">{t('debts.method_check')}</SelectItem>
                  <SelectItem value="transfer">{t('debts.method_transfer')}</SelectItem>
                  <SelectItem value="receipt">{t('debts.method_receipt')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Next due date section - show for partial */}
          {isPartial && (
            <div className="space-y-2 border-t pt-2">
              {hasSchedule && (
                <div className="bg-primary/10 border border-primary/30 rounded-md px-2 py-1.5 flex items-center gap-1.5 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="leading-tight">{t('debts.schedule_override_title')}: <strong>{scheduleLabel}</strong></span>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-destructive">{t('debts.quick_day_pick')} *</Label>
                <QuickDayPicker onSelectDate={setNextDueDate} selectedDate={nextDueDate} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t('debts.next_due_date')} *</Label>
                  <Input
                    type="date"
                    value={nextDueDate}
                    onChange={e => setNextDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="h-9 text-sm"
                    required
                  />
                </div>
                {nextDueDate && (
                  <div className="space-y-1">
                    <Label className="text-xs">{t('debts.next_due_time')}</Label>
                    <Input
                      type="time"
                      value={nextDueTime}
                      onChange={e => setNextDueTime(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                )}
              </div>

              <ScheduleOverrideAlert
                open={showScheduleWarning}
                onConfirm={handleConfirmOverride}
                onCancel={handleCancelOverride}
                scheduleLabel={scheduleLabel}
              />
            </div>
          )}

          {/* Notes */}
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={1}
            placeholder={t('common.notes') + '...'}
            className="text-sm min-h-[36px] resize-none"
          />

          <Button
            className="w-full h-9"
            onClick={handleSubmit}
            disabled={updatePayment.isPending || !amount || numAmount <= 0 || showScheduleWarning || (isPartial && !nextDueDate)}
          >
            {updatePayment.isPending && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            {t('debts.collect')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {receiptDataState && (
      <ReceiptDialog
        open={showReceiptDialog}
        onOpenChange={setShowReceiptDialog}
        receiptData={receiptDataState}
      />
    )}
    </>
  );
};

export default CollectDebtDialog;
