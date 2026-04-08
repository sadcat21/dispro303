import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Banknote, Calendar, Eye, Phone, MapPin, Printer, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useDebtPayments, useDebtPaymentsGroup } from '@/hooks/useDebtPayments';
import { useCustomerDebts, useDeleteCustomerDebt } from '@/hooks/useCustomerDebts';
import { CustomerDebtWithDetails } from '@/types/accounting';
import { format } from 'date-fns';
import CollectDebtDialog from './CollectDebtDialog';
import VisitNoPaymentDialog from './VisitNoPaymentDialog';
import DebtScheduleSection from './DebtScheduleSection';
import { useIsElementHidden } from '@/hooks/useUIOverrides';
import CollectCustomerDebtDialog from './CollectCustomerDebtDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { isAdminRole } from '@/lib/utils';

interface DebtDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debts: CustomerDebtWithDetails[];
  customerName: string;
  customerId?: string;
  initialTab?: 'collect' | 'visit' | 'history';
}

const DebtDetailsDialog: React.FC<DebtDetailsDialogProps> = ({
  open, onOpenChange, debts: propDebts, customerName, customerId, initialTab = 'collect',
}) => {
  const { t, dir } = useLanguage();
  const { role } = useAuth();
  const isAdmin = isAdminRole(role);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [showCollect, setShowCollect] = useState(false);
  const [showVisit, setShowVisit] = useState(false);
  const [showCollectAll, setShowCollectAll] = useState(false);
  const [collectDebt, setCollectDebt] = useState<CustomerDebtWithDetails | null>(null);
  const [visitDebt, setVisitDebt] = useState<CustomerDebtWithDetails | null>(null);
  const [debtToDelete, setDebtToDelete] = useState<CustomerDebtWithDetails | null>(null);
  const [showSources, setShowSources] = useState(false);
  const { data: payments, isLoading: paymentsLoading } = useDebtPayments(selectedDebtId);
  const isCollectDebtHidden = useIsElementHidden('action', 'collect_debt');
  const deleteDebt = useDeleteCustomerDebt();

  // Fetch live debts when customerId is provided; fall back to props
  const { data: liveDebts } = useCustomerDebts(
    customerId ? { customerId, status: 'all' } : undefined
  );
  const debts = (customerId && liveDebts?.length) ? liveDebts.filter(d => d.status !== 'paid' || propDebts.some(pd => pd.id === d.id)) : propDebts;

  const activeDebts = useMemo(
    () => debts.filter((debt) => Number(debt.remaining_amount || 0) > 0),
    [debts]
  );
  const { data: groupedPayments = [], isLoading: groupedPaymentsLoading } = useDebtPaymentsGroup(
    activeDebts.map((debt) => debt.id)
  );

  const totalRemaining = activeDebts.reduce((sum, d) => sum + Number(d.remaining_amount), 0);
  const totalPaid = activeDebts.reduce((sum, d) => sum + Number(d.paid_amount || 0), 0);
  const totalOriginal = activeDebts.reduce((sum, d) => sum + Number(d.total_amount || 0), 0);

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return '';
    }
  };

  const handleCollect = (debt: CustomerDebtWithDetails) => {
    setCollectDebt(debt);
    setShowCollect(true);
  };

  const handleVisitNoPayment = (debt: CustomerDebtWithDetails) => {
    setVisitDebt(debt);
    setShowVisit(true);
  };

  const handleDeleteDebt = async () => {
    if (!debtToDelete) return;
    try {
      await deleteDebt.mutateAsync(debtToDelete.id);
      toast.success('تم حذف الدين بدون احتسابه كتسديد');
      setDebtToDelete(null);
    } catch (error: any) {
      toast.error(error?.message || 'تعذر حذف الدين');
    }
  };

  const handlePrintStatement = (mode: 'a4' | 'thermal') => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    const debtRows = debts
      .map((debt, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${format(new Date(debt.created_at), 'dd/MM/yyyy HH:mm')}</td>
          <td>${debt.worker?.full_name || debt.worker?.username || '—'}</td>
          <td>${Number(debt.total_amount || 0).toLocaleString()} DA</td>
          <td>${Number(debt.paid_amount || 0).toLocaleString()} DA</td>
          <td>${Number(debt.remaining_amount || 0).toLocaleString()} DA</td>
          <td>${debt.status}</td>
        </tr>
      `)
      .join('');

    const width = mode === 'thermal' ? '48mm' : '210mm';
    const title = mode === 'thermal' ? 'سجل ديون العميل - 48mm' : 'سجل ديون العميل';

    win.document.write(`
      <html dir="rtl">
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 12px; width: ${width}; margin: 0 auto; color: #111; }
            h1 { font-size: ${mode === 'thermal' ? '16px' : '24px'}; margin: 0 0 8px; }
            .meta { font-size: ${mode === 'thermal' ? '11px' : '14px'}; margin-bottom: 12px; color: #444; }
            .total { border: 1px solid #ddd; border-radius: 12px; padding: 10px; margin-bottom: 12px; font-weight: bold; color: #c62828; }
            table { width: 100%; border-collapse: collapse; font-size: ${mode === 'thermal' ? '10px' : '13px'}; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: right; }
            th { background: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>سجل ديون العميل</h1>
          <div class="meta">العميل: ${customerName}</div>
          <div class="total">إجمالي المتبقي: ${totalRemaining.toLocaleString()} DA</div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>التاريخ</th>
                <th>العامل</th>
                <th>الإجمالي</th>
                <th>المسدّد</th>
                <th>المتبقي</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>${debtRows || '<tr><td colspan="7">لا توجد ديون</td></tr>'}</tbody>
          </table>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // When collect dialog closes, refresh the collectDebt reference from live data
  const handleCollectDialogChange = (open: boolean) => {
    setShowCollect(open);
    if (!open && collectDebt) {
      // Update collectDebt ref from latest debts data
      const updated = debts.find(d => d.id === collectDebt.id);
      if (updated) setCollectDebt(updated);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] p-0 gap-0 overflow-hidden" dir={dir}>
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle>{customerName}</DialogTitle>
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('debts.total_debts')}</span>
                <span className="text-lg font-bold text-destructive">{totalRemaining.toLocaleString()} DA</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => setShowCollectAll(true)} disabled={!activeDebts.length || isCollectDebtHidden}>
                  <Banknote className="w-4 h-4 ml-1" />
                  تحصيل رصيد العميل
                </Button>
                <Button variant="outline" onClick={() => handlePrintStatement('a4')}>
                  <Printer className="w-4 h-4 ml-1" />
                  طباعة A4
                </Button>
              </div>
              <Button variant="ghost" className="w-full" onClick={() => handlePrintStatement('thermal')}>
                <Printer className="w-4 h-4 ml-1" />
                طباعة حرارية 48mm
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-6rem)] px-4 py-3">
            <div className="space-y-3">
              <div className="rounded-xl border p-3 space-y-3 bg-muted/10">
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">إجمالي الدين</p>
                    <p className="font-bold">{totalOriginal.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">المدفوع</p>
                    <p className="font-bold text-green-600">{totalPaid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">المتبقي</p>
                    <p className="font-bold text-destructive">{totalRemaining.toLocaleString()}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border/60 overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">سجل العميل المجمّع</span>
                    <Badge variant="outline" className="text-[10px]">
                      {groupedPayments.filter(p => Number(p.amount || 0) > 0).length} تحصيل / {groupedPayments.filter(p => Number(p.amount || 0) === 0).length} زيارة
                    </Badge>
                  </div>
                  <div className="max-h-56 overflow-y-auto p-1.5" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehavior: 'contain' }}>
                    {groupedPaymentsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto my-3" />
                    ) : groupedPayments.length ? (
                      [...groupedPayments]
                        .sort((a, b) => new Date(b.collected_at).getTime() - new Date(a.collected_at).getTime())
                        .map((p) => {
                          const isVisit = Number(p.amount) === 0;
                          const isPhone = p.notes?.includes('اتصال');
                          return (
                            <div key={p.id} className={`rounded-md p-2 mb-1.5 last:mb-0 text-xs ${isVisit ? 'bg-muted/40 border border-dashed border-border/60' : 'bg-background border border-border shadow-sm'}`}>
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 font-medium">
                                  {isVisit ? (
                                    <>
                                      {isPhone ? (
                                        <Phone className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                                      ) : (
                                        <MapPin className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                                      )}
                                      <span className={isPhone ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}>
                                        {isPhone ? 'اتصال' : 'زيارة'}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Banknote className="w-3.5 h-3.5 text-primary" />
                                      <span className="text-foreground">{Number(p.amount).toLocaleString()} DA</span>
                                      <Badge variant="outline" className="text-[9px] h-4 px-1">{p.payment_method || 'cash'}</Badge>
                                    </>
                                  )}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {format(new Date(p.collected_at), 'dd/MM HH:mm')}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                {p.worker && (
                                  <span className="text-[10px] text-muted-foreground">المحصّل: {p.worker.full_name}</span>
                                )}
                                {p.notes ? (
                                  <span className="text-[10px] text-muted-foreground truncate max-w-[60%]">{p.notes}</span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <p className="text-xs text-center text-muted-foreground py-3">لا يوجد سجل بعد لهذا العميل</p>
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between text-sm"
                  onClick={() => setShowSources(prev => !prev)}
                >
                  <span>تفاصيل مصادر الديون الفرعية</span>
                  {showSources ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>

              {showSources ? debts.map(debt => (
                <div
                  key={debt.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge className={statusColor(debt.status)}>
                      {t(`debts.${debt.status}`)}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(debt.created_at), 'dd/MM/yyyy')}
                      </span>
                      {isAdmin && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDebtToDelete(debt)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">{t('debts.total_debts')}</p>
                      <p className="font-bold">{Number(debt.total_amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{t('debts.paid_amount')}</p>
                      <p className="font-bold text-green-600">{Number(debt.paid_amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">{t('debts.remaining')}</p>
                      <p className="font-bold text-destructive">{Number(debt.remaining_amount).toLocaleString()}</p>
                    </div>
                  </div>

                  {debt.worker && (
                    <p className="text-xs text-muted-foreground">
                      {t('orders.created_by')}: {debt.worker.full_name}
                    </p>
                  )}

                  {/* Payment history toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setSelectedDebtId(selectedDebtId === debt.id ? null : debt.id)}
                  >
                    {selectedDebtId === debt.id ? '▲ إخفاء السجل' : '▼ سجل المدفوعات'}
                  </Button>

                  {selectedDebtId === debt.id && (
                    <div className="bg-muted/20 rounded-lg border border-border/50 overflow-hidden">
                      <div className="bg-muted/50 px-3 py-1.5 border-b border-border/50">
                        <span className="text-[11px] font-medium text-muted-foreground">سجل المدفوعات</span>
                      </div>
                      <div
                        className="max-h-52 overflow-y-auto p-1.5"
                        style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehavior: 'contain' }}
                        onTouchMove={e => e.stopPropagation()}
                      >
                          {paymentsLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mx-auto my-3" />
                          ) : payments && payments.length > 0 ? (
                            (() => {
                              const sorted = [...payments].sort((a, b) => 
                                new Date(a.collected_at).getTime() - new Date(b.collected_at).getTime()
                              );
                              const total = Number(debt.total_amount);
                              const paymentsSum = sorted.reduce((s, p) => s + Number(p.amount), 0);
                              const basePaid = Number(debt.paid_amount) - paymentsSum;
                              let cumPaid = basePaid;
                              const withBalances = sorted.map(p => {
                                cumPaid += Number(p.amount);
                                return { ...p, cumPaid, remaining: total - cumPaid };
                              });
                              withBalances.reverse();
                              
                              return withBalances.map((p) => {
                                const isVisit = Number(p.amount) === 0;
                                const isPhone = p.notes?.includes('اتصال هاتفي');
                                
                                return (
                                  <div
                                    key={p.id}
                                    className={`rounded-md p-2 mb-1.5 last:mb-0 text-xs ${
                                      isVisit
                                        ? 'bg-muted/40 border border-dashed border-border/60'
                                        : 'bg-background border border-border shadow-sm'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="flex items-center gap-1.5 font-medium">
                                        {isVisit ? (
                                          <>
                                            {isPhone ? (
                                              <Phone className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                                            ) : (
                                              <MapPin className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                                            )}
                                            <span className={isPhone ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}>
                                              {isPhone ? '📞 اتصال' : '🏪 محلي'}
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <Banknote className="w-3.5 h-3.5 text-primary" />
                                            <span className="text-foreground">{Number(p.amount).toLocaleString()} DA</span>
                                            <Badge variant="outline" className="text-[9px] h-4 px-1">
                                              {t(`debts.method_${p.payment_method}`)}
                                            </Badge>
                                          </>
                                        )}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {format(new Date(p.collected_at), 'dd/MM HH:mm')}
                                      </span>
                                    </div>

                                    {!isVisit && (
                                      <div className="flex items-center gap-3 text-[10px] mt-1 mr-5">
                                        <span className="text-primary">
                                          ✓ {t('debts.paid_amount')}: {p.cumPaid.toLocaleString()} DA
                                        </span>
                                        <span className="text-destructive">
                                          ← {t('debts.remaining')}: {Math.max(0, p.remaining).toLocaleString()} DA
                                        </span>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between mt-0.5">
                                      {p.worker && (
                                        <span className="text-[10px] text-muted-foreground">
                                          {t('debts.collector')}: {p.worker.full_name}
                                        </span>
                                      )}
                                      {p.notes && !isVisit && (
                                        <span className="text-[10px] text-muted-foreground truncate max-w-[50%]">{p.notes}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              });
                            })()
                          ) : (
                            <p className="text-xs text-center text-muted-foreground py-3">لا توجد مدفوعات</p>
                          )}
                      </div>
                    </div>
                  )}

                  {debt.status !== 'paid' && (
                    <>
                      <div className="flex gap-2">
                        {!isCollectDebtHidden && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleCollect(debt)}
                          >
                            <Banknote className="w-4 h-4 ml-1" />
                            {t('debts.collect')}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleVisitNoPayment(debt)}
                          disabled={false}
                        >
                          <Eye className="w-4 h-4 ml-1" />
                          {t('debts.visit_no_payment')}
                        </Button>
                      </div>
                      <DebtScheduleSection debt={debt} />
                    </>
                  )}
                </div>
              )) : null}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {collectDebt && (
        <CollectDebtDialog
          open={showCollect}
          onOpenChange={handleCollectDialogChange}
          debtId={collectDebt.id}
          totalDebtAmount={Number(collectDebt.total_amount)}
          paidAmountBefore={Number(collectDebt.paid_amount)}
          remainingAmount={Number(collectDebt.remaining_amount)}
          customerName={customerName}
          customerId={collectDebt.customer_id}
          customerPhone={null}
          defaultAmount={collectDebt.collection_amount || undefined}
          collectionType={collectDebt.collection_type}
          collectionDays={collectDebt.collection_days}
        />
      )}

      <CollectCustomerDebtDialog
        open={showCollectAll}
        onOpenChange={setShowCollectAll}
        customerName={customerName}
        customerId={customerId}
        customerPhone={activeDebts[0]?.customer?.phone || null}
        debts={activeDebts}
        initialTab={initialTab}
      />

      {visitDebt && (
        <VisitNoPaymentDialog
          open={showVisit}
          onOpenChange={setShowVisit}
          debtId={visitDebt.id}
          customerName={customerName}
          collectionType={visitDebt.collection_type}
          collectionDays={visitDebt.collection_days}
          customerLatitude={visitDebt.customer?.latitude}
          customerLongitude={visitDebt.customer?.longitude}
        />
      )}

      <AlertDialog open={isAdmin && !!debtToDelete} onOpenChange={(open) => !open && setDebtToDelete(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الدين</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف هذا الدين وسجل تحصيلاته المرتبط به بدون احتسابه كتسديد. استخدم هذا الخيار فقط إذا كان الدين أُضيف بالخطأ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteDebt}
            >
              حذف الدين
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DebtDetailsDialog;
