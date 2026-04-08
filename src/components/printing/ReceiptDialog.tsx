import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useBluetoothPrinter } from '@/hooks/useBluetoothPrinter';
import { useCreateReceipt, useUpdateReceiptPrintCount } from '@/hooks/useReceipts';
import { formatReceiptForPreview, ReceiptData, AdvancedReceiptOptions } from '@/services/receiptFormatter';
import { ReceiptItem, ReceiptType } from '@/types/receipt';
import { Printer, Eye, Bluetooth, Loader2, Check, AlertCircle, ChevronDown, Settings2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PRINT_SETTINGS_KEY = 'receipt_print_settings';

interface PrintSettings {
  showSignatures: boolean;
  showThankYouMessage: boolean;
  thankYouMessage: string;
  useClassicLayout: boolean;
  showLogo: boolean;
  showCompanyName: boolean;
  replaceNameWithLogo: boolean;
}

const DEFAULT_SETTINGS: PrintSettings = {
  showSignatures: false,
  showThankYouMessage: false,
  thankYouMessage: 'Merci pour votre confiance',
  useClassicLayout: false,
  showLogo: true,
  showCompanyName: false,
  replaceNameWithLogo: false,
};

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData: {
    receiptType: ReceiptType;
    orderId?: string | null;
    debtId?: string | null;
    customerId: string;
    customerName: string;
    customerPhone?: string | null;
    workerId: string;
    workerName: string;
    workerPhone?: string | null;
    branchId?: string | null;
    items: ReceiptItem[];
    totalAmount: number;
    discountAmount?: number;
    paidAmount: number;
    remainingAmount: number;
    paymentMethod?: string | null;
    notes?: string | null;
    orderPaymentType?: string;
    orderPriceSubtype?: string;
    orderInvoicePaymentMethod?: string;
    debtTotalAmount?: number;
    debtPaidBefore?: number;
    collectorName?: string;
    nextCollectionDate?: string | null;
    nextCollectionTime?: string | null;
    customerSurplusAmount?: number;
    receiptTitleOverride?: string;
    hidePaymentDetails?: boolean;
    showDebtTotalSummary?: boolean;
    showDebtPaidSummary?: boolean;
    debtMovementEntries?: Array<{
      kind: 'debt' | 'partial' | 'full' | 'visit';
      date: string;
      workerName?: string | null;
      paymentMethod?: string | null;
      beforeAmount?: number | null;
      afterAmount?: number | null;
      amount: number;
      note?: string | null;
    }>;
  };
}
const ReceiptDialog: React.FC<ReceiptDialogProps> = ({ open, onOpenChange, receiptData }) => {
  const { dir } = useLanguage();
  const { status, deviceName, isConnected, isPrinting, scanAndConnect, printReceipt } = useBluetoothPrinter();
  const createReceipt = useCreateReceipt();
  const updatePrintCount = useUpdateReceiptPrintCount();
  const [savedReceiptId, setSavedReceiptId] = useState<string | null>(null);
  const [receiptNumber, setReceiptNumber] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Persisted settings
  const [useClassicLayout, setUseClassicLayout] = useState(false);
  const [showSignatures, setShowSignatures] = useState(false);
  const [showThankYouMessage, setShowThankYouMessage] = useState(false);
  const [thankYouMessage, setThankYouMessage] = useState('Merci pour votre confiance');
  const [showLogo, setShowLogo] = useState(true);
  const [showCompanyName, setShowCompanyName] = useState(false);
  const [replaceNameWithLogo, setReplaceNameWithLogo] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Advanced distribution toggles
  const [showStockBeforeAfter, setShowStockBeforeAfter] = useState(false);
  const [showDeliveryStatus, setShowDeliveryStatus] = useState(false);
  const [deliveryStatusValue, setDeliveryStatusValue] = useState<'full' | 'partial' | 'refused'>('full');
  const [showRouteCode, setShowRouteCode] = useState(false);
  const [routeCode, setRouteCode] = useState('');
  const [showTruckId, setShowTruckId] = useState(false);
  const [truckId, setTruckId] = useState('');
  const [showSessionId, setShowSessionId] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [showDebtTotalSummary, setShowDebtTotalSummary] = useState(receiptData.showDebtTotalSummary ?? true);
  const [showDebtPaidSummary, setShowDebtPaidSummary] = useState(receiptData.showDebtPaidSummary ?? true);

  // Load settings from DB
  useEffect(() => {
    if (!open || settingsLoaded) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', PRINT_SETTINGS_KEY)
          .maybeSingle();
        if (data?.value) {
          const s: PrintSettings = JSON.parse(data.value);
          setUseClassicLayout(s.useClassicLayout ?? false);
          setShowSignatures(s.showSignatures ?? false);
          setShowThankYouMessage(s.showThankYouMessage ?? false);
          setThankYouMessage(s.thankYouMessage || 'Merci pour votre confiance');
          setShowLogo(s.showLogo ?? true);
          setShowCompanyName(s.showCompanyName ?? false);
          setReplaceNameWithLogo(s.replaceNameWithLogo ?? false);
        }
      } catch { /* use defaults */ }
      setSettingsLoaded(true);
    })();
  }, [open, settingsLoaded]);

  useEffect(() => {
    if (!open) return;
    setShowDebtTotalSummary(receiptData.showDebtTotalSummary ?? true);
    setShowDebtPaidSummary(receiptData.showDebtPaidSummary ?? true);
  }, [open, receiptData.showDebtPaidSummary, receiptData.showDebtTotalSummary]);

  // Save settings to DB when they change
  const saveSettings = async (partial: Partial<PrintSettings>) => {
    const settings: PrintSettings = {
      showSignatures,
      showThankYouMessage,
      thankYouMessage,
      useClassicLayout,
      showLogo,
      showCompanyName,
      replaceNameWithLogo,
      ...partial,
    };
    try {
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('key', PRINT_SETTINGS_KEY)
        .maybeSingle();
      if (existing) {
        await supabase.from('app_settings').update({ value: JSON.stringify(settings) }).eq('key', PRINT_SETTINGS_KEY);
      } else {
        await supabase.from('app_settings').insert({ key: PRINT_SETTINGS_KEY, value: JSON.stringify(settings) });
      }
    } catch { /* silent */ }
  };

  const handleClassicToggle = (v: boolean) => { setUseClassicLayout(v); saveSettings({ useClassicLayout: v }); };
  const handleSignaturesToggle = (v: boolean) => { setShowSignatures(v); saveSettings({ showSignatures: v }); };
  const handleThankYouToggle = (v: boolean) => { setShowThankYouMessage(v); saveSettings({ showThankYouMessage: v }); };
  const handleThankYouMessageChange = (v: string) => { setThankYouMessage(v); saveSettings({ thankYouMessage: v }); };
  const handleLogoToggle = (v: boolean) => { setShowLogo(v); saveSettings({ showLogo: v }); };
  const handleCompanyNameToggle = (v: boolean) => { setShowCompanyName(v); saveSettings({ showCompanyName: v }); };
  const handleReplaceNameToggle = (v: boolean) => { setReplaceNameWithLogo(v); saveSettings({ replaceNameWithLogo: v }); };

  const advancedOptions: AdvancedReceiptOptions = {
    showWorkerStockBeforeAfter: showStockBeforeAfter,
    showDeliveryStatus,
    deliveryStatusValue,
    showRouteCode,
    routeCode,
    showTruckId,
    truckId,
    showSessionId,
    sessionId,
    showSignatures,
    showThankYouMessage,
    thankYouMessage,
  };

  const receiptDataForFormatter: ReceiptData = {
    receiptNumber,
    receiptType: receiptData.receiptType,
    customerName: receiptData.customerName,
    customerPhone: receiptData.customerPhone,
    workerName: receiptData.workerName,
    workerPhone: receiptData.workerPhone,
    items: receiptData.items,
    totalAmount: receiptData.totalAmount,
    discountAmount: receiptData.discountAmount || 0,
    paidAmount: receiptData.paidAmount,
    remainingAmount: receiptData.remainingAmount,
    paymentMethod: receiptData.paymentMethod,
    notes: receiptData.notes,
    date: new Date(),
    printCount: 0,
    orderPaymentType: receiptData.orderPaymentType,
    orderPriceSubtype: receiptData.orderPriceSubtype,
    orderInvoicePaymentMethod: receiptData.orderInvoicePaymentMethod,
    debtTotalAmount: receiptData.debtTotalAmount,
    debtPaidBefore: receiptData.debtPaidBefore,
    collectorName: receiptData.collectorName,
    nextCollectionDate: receiptData.nextCollectionDate,
    nextCollectionTime: receiptData.nextCollectionTime,
    customerSurplusAmount: receiptData.customerSurplusAmount,
    advancedOptions,
    classicLayout: useClassicLayout,
    showLogo,
    showCompanyName,
    replaceNameWithLogo,
    receiptTitleOverride: receiptData.receiptTitleOverride,
    hidePaymentDetails: receiptData.hidePaymentDetails,
    showDebtTotalSummary,
    showDebtPaidSummary,
    debtMovementEntries: receiptData.debtMovementEntries,
  };

  const previewHtml = formatReceiptForPreview(receiptDataForFormatter);

  const handleSaveAndPrint = async () => {
    setIsSaving(true);
    try {
      let receiptId = savedReceiptId;
      if (!receiptId) {
        const saved = await createReceipt.mutateAsync({
          receipt_type: receiptData.receiptType,
          order_id: receiptData.orderId || null,
          debt_id: receiptData.debtId || null,
          customer_id: receiptData.customerId,
          worker_id: receiptData.workerId,
          branch_id: receiptData.branchId || null,
          customer_name: receiptData.customerName,
          customer_phone: receiptData.customerPhone || null,
          worker_name: receiptData.workerName,
          worker_phone: receiptData.workerPhone || null,
          items: receiptData.items,
          total_amount: receiptData.totalAmount,
          discount_amount: receiptData.discountAmount || 0,
          paid_amount: receiptData.paidAmount,
          remaining_amount: receiptData.remainingAmount,
          payment_method: receiptData.paymentMethod || null,
          notes: receiptData.notes || null,
        });
        receiptId = saved.id;
        setReceiptNumber(saved.receipt_number);
        setSavedReceiptId(saved.id);
        receiptDataForFormatter.receiptNumber = saved.receipt_number;
      }

      const printed = await printReceipt(receiptDataForFormatter);
      if (printed && receiptId) {
        await updatePrintCount.mutateAsync(receiptId);
      }
    } catch (error: any) {
      console.error('Save/Print error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const statusConfig = {
    disconnected: { label: 'غير متصل', color: 'bg-muted text-muted-foreground', icon: Bluetooth },
    connecting: { label: 'جاري الاتصال...', color: 'bg-yellow-100 text-yellow-800', icon: Loader2 },
    connected: { label: deviceName || 'متصل', color: 'bg-green-100 text-green-800', icon: Check },
    printing: { label: 'جاري الطباعة...', color: 'bg-blue-100 text-blue-800', icon: Loader2 },
    error: { label: 'خطأ', color: 'bg-destructive/10 text-destructive', icon: AlertCircle },
  };

  const st = statusConfig[status];
  const StIcon = st.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] p-0 gap-0" dir={dir}>
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Printer className="w-5 h-5" />
            وصل {receiptData.receiptType === 'direct_sale' ? 'بيع مباشر' : receiptData.receiptType === 'delivery' ? 'توصيل' : 'تسديد دين'}
          </DialogTitle>
        </DialogHeader>

        {/* Classic Layout Toggle + Printer Status */}
        <div className="px-4 pt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Switch checked={useClassicLayout} onCheckedChange={handleClassicToggle} />
            <Label className="text-xs">طباعة كلاسيكية</Label>
          </div>
        </div>
        <div className="px-4 pt-2 flex items-center justify-between gap-2">
          <Badge variant="outline" className={`gap-1.5 ${st.color}`}>
            <StIcon className={`w-3 h-3 ${status === 'connecting' || status === 'printing' ? 'animate-spin' : ''}`} />
            {st.label}
          </Badge>
          {!isConnected && status !== 'connecting' && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" onClick={scanAndConnect}>
              <Bluetooth className="w-3 h-3" />
              اتصال بالطابعة
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[calc(90vh-14rem)] px-4">
          {/* Advanced Distribution Toggles */}
          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="mt-3">
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2">
              <Settings2 className="w-4 h-4" />
              <span>خيارات الطباعة المتقدمة</span>
              <ChevronDown className={`w-4 h-4 mr-auto transition-transform ${advancedOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pb-3 border rounded-lg p-3 bg-muted/30">
              {/* Logo */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">طباعة اللوقو</Label>
                <Switch checked={showLogo} onCheckedChange={handleLogoToggle} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">إظهار اسم الشركة</Label>
                <Switch checked={showCompanyName} onCheckedChange={handleCompanyNameToggle} />
              </div>
              {showLogo && (
                <div className="flex items-center justify-between">
                  <Label className="text-xs">استبدال اسم الشركة باللوقو</Label>
                  <Switch checked={replaceNameWithLogo} onCheckedChange={handleReplaceNameToggle} />
                </div>
              )}

              {/* Signatures */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">إمضاء البائع والعميل</Label>
                <Switch checked={showSignatures} onCheckedChange={handleSignaturesToggle} />
              </div>

              {/* Thank you message */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">رسالة الشكر</Label>
                <Switch checked={showThankYouMessage} onCheckedChange={handleThankYouToggle} />
              </div>
              {showThankYouMessage && (
                <Input
                  className="h-8 text-xs"
                  placeholder="Merci pour votre confiance"
                  value={thankYouMessage}
                  onChange={e => handleThankYouMessageChange(e.target.value)}
                />
              )}

              {/* Delivery Status */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">حالة التسليم</Label>
                <Switch checked={showDeliveryStatus} onCheckedChange={setShowDeliveryStatus} />
              </div>
              {showDeliveryStatus && (
                <Select value={deliveryStatusValue} onValueChange={(v) => setDeliveryStatusValue(v as any)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">✅ كامل (Complet)</SelectItem>
                    <SelectItem value="partial">⚠️ جزئي (Partiel)</SelectItem>
                    <SelectItem value="refused">❌ مرفوض (Refusé)</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Route Code */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">رمز المسار</Label>
                <Switch checked={showRouteCode} onCheckedChange={setShowRouteCode} />
              </div>
              {showRouteCode && (
                <Input className="h-8 text-xs" placeholder="رمز المسار..." value={routeCode} onChange={e => setRouteCode(e.target.value)} />
              )}

              {/* Truck ID */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">رقم الشاحنة</Label>
                <Switch checked={showTruckId} onCheckedChange={setShowTruckId} />
              </div>
              {showTruckId && (
                <Input className="h-8 text-xs" placeholder="رقم الشاحنة..." value={truckId} onChange={e => setTruckId(e.target.value)} />
              )}

              {/* Session ID */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">رقم الجلسة</Label>
                <Switch checked={showSessionId} onCheckedChange={setShowSessionId} />
              </div>
              {showSessionId && (
                <Input className="h-8 text-xs" placeholder="رقم الجلسة..." value={sessionId} onChange={e => setSessionId(e.target.value)} />
              )}

              {/* Worker Stock Before/After */}
              <div className="flex items-center justify-between">
                <Label className="text-xs">مخزون العامل (قبل/بعد)</Label>
                <Switch checked={showStockBeforeAfter} onCheckedChange={setShowStockBeforeAfter} />
              </div>
              {receiptData.receiptType === 'debt_payment' && receiptData.debtMovementEntries?.length ? (
                <>
                  <div className="h-px bg-border" />
                  <div className="text-xs font-semibold text-muted-foreground">خيارات وصل حركة الدين</div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">إظهار إجمالي الدين</Label>
                    <Switch checked={showDebtTotalSummary} onCheckedChange={setShowDebtTotalSummary} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">إظهار المبلغ المدفوع سابقاً</Label>
                    <Switch checked={showDebtPaidSummary} onCheckedChange={setShowDebtPaidSummary} />
                  </div>
                </>
              ) : null}
            </CollapsibleContent>
          </Collapsible>

          {/* Preview */}
          <div className="py-3">
            {showPreview && (
              <div
                className="bg-white text-black rounded border p-3 text-xs"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="p-4 pt-2 border-t flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="w-4 h-4 ml-1" />
            {showPreview ? 'إخفاء' : 'معاينة'}
          </Button>
          <Button
            className="flex-1"
            onClick={handleSaveAndPrint}
            disabled={!isConnected || isPrinting || isSaving}
          >
            {(isPrinting || isSaving) ? (
              <Loader2 className="w-4 h-4 animate-spin ml-1" />
            ) : (
              <Printer className="w-4 h-4 ml-1" />
            )}
            طباعة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptDialog;
