import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, MoreHorizontal, Bluetooth, BluetoothOff, Printer, Receipt, MessageCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, Language } from '@/contexts/LanguageContext';
import { cn, isAdminRole } from '@/lib/utils';
import icon from '@/assets/icon.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import BranchSelectionDialog from '@/components/auth/BranchSelectionDialog';
import OffersNotification from '@/components/offers/OffersNotification';
import StockAlertsNotification from '@/components/stock/StockAlertsNotification';
import TasksPopover from '@/components/tasks/TasksPopover';
import WorkerRequestsPopover from '@/components/tasks/WorkerRequestsPopover';
// DebtCollectionsPopover moved into SectorCustomersPopover
import SectorCustomersPopover from '@/components/sectors/SectorCustomersPopover';
import DocumentCollectionsPopover from '@/components/documents/DocumentCollectionsPopover';
import ReceiptModificationsNotification from '@/components/printing/ReceiptModificationsNotification';
import InvoiceRequestDialog from '@/components/treasury/InvoiceRequestDialog';
import { useChat } from '@/hooks/useChat';
import { ALGERIAN_WILAYAS } from '@/data/algerianWilayas';
import { useNavigation } from '@/hooks/useNavigation';
import { useNavbarPreferences } from '@/hooks/useNavbarPreferences';
import { useBluetoothPrinter } from '@/hooks/useBluetoothPrinter';
import { useLocationBroadcast } from '@/hooks/useWorkerLocation';
import AttendanceButton from '@/components/attendance/AttendanceButton';
import { useIsElementHidden } from '@/hooks/useUIOverrides';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const moreItemColors: Record<string, { bg: string; icon: string; border: string }> = {
  '/orders': { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
  '/order-tracking': { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-200' },
  '/my-deliveries': { bg: 'bg-teal-50', icon: 'text-teal-600', border: 'border-teal-200' },
  '/my-promos': { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
  '/product-offers': { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-200' },
  '/promo-splits': { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-200' },
  '/customer-accounts': { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-200' },
  '/customer-journey': { bg: 'bg-sky-50', icon: 'text-sky-700', border: 'border-sky-200' },
  '/warehouse': { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-200' },
  '/warehouse-review': { bg: 'bg-teal-50', icon: 'text-teal-600', border: 'border-teal-200' },
  '/stock-receipts': { bg: 'bg-lime-50', icon: 'text-lime-600', border: 'border-lime-200' },
  '/load-stock': { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' },
  '/my-stock': { bg: 'bg-green-50', icon: 'text-green-600', border: 'border-green-200' },
  '/expenses': { bg: 'bg-yellow-50', icon: 'text-yellow-600', border: 'border-yellow-200' },
  '/expenses-management': { bg: 'bg-red-50', icon: 'text-red-600', border: 'border-red-200' },
  '/daily-receipts': { bg: 'bg-teal-50', icon: 'text-teal-600', border: 'border-teal-200' },
  '/customer-debts': { bg: 'bg-rose-50', icon: 'text-rose-700', border: 'border-rose-200' },
  '/accounting': { bg: 'bg-amber-50', icon: 'text-amber-700', border: 'border-amber-200' },
  '/manager-treasury': { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-200' },
  '/shared-invoices': { bg: 'bg-orange-50', icon: 'text-orange-700', border: 'border-orange-200' },
  '/surplus-deficit': { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-200' },
  '/rewards': { bg: 'bg-yellow-50', icon: 'text-yellow-600', border: 'border-yellow-200' },
  '/worker-debts': { bg: 'bg-pink-50', icon: 'text-pink-600', border: 'border-pink-200' },
  '/worker-tracking': { bg: 'bg-sky-50', icon: 'text-sky-600', border: 'border-sky-200' },
  '/attendance': { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-200' },
  '/geo-operations': { bg: 'bg-teal-50', icon: 'text-teal-600', border: 'border-teal-200' },
  '/activity-logs': { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-200' },
  '/nearby-stores': { bg: 'bg-sky-50', icon: 'text-sky-600', border: 'border-sky-200' },
  '/branches': { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-200' },
  '/customers': { bg: 'bg-blue-50', icon: 'text-blue-700', border: 'border-blue-200' },
  '/workers': { bg: 'bg-fuchsia-50', icon: 'text-fuchsia-600', border: 'border-fuchsia-200' },
  '/worker-actions': { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-200' },
  '/products': { bg: 'bg-pink-50', icon: 'text-pink-600', border: 'border-pink-200' },
  '/permissions': { bg: 'bg-slate-50', icon: 'text-slate-600', border: 'border-slate-200' },
  '/settings': { bg: 'bg-gray-50', icon: 'text-gray-600', border: 'border-gray-200' },
  '/guide': { bg: 'bg-stone-50', icon: 'text-stone-600', border: 'border-stone-200' },
  '/promo-table': { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-200' },
  '/stats': { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-200' },
};

const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const { role, user, logout, activeBranch, switchBranch, showBranchSelection, selectBranch, activeRole } = useAuth();
  const { t, dir, language, setLanguage } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';
  const { isConnected, deviceName, scanAndConnect, disconnect, status: printerStatus } = useBluetoothPrinter();
  const [invoiceRequestOpen, setInvoiceRequestOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const showInvoiceButton = isAdminRole(role);
  const { totalUnread } = useChat();
  const { startTracking } = useLocationBroadcast();
  const isChatHidden = useIsElementHidden('notification', 'notif_chat');
  const isOffersHidden = useIsElementHidden('notification', 'notif_offers');
  const isTodayCustomersHidden = useIsElementHidden('notification', 'notif_today_customers');
  const isStockAlertsHidden = useIsElementHidden('notification', 'notif_stock_alerts');
  const isTasksHidden = useIsElementHidden('notification', 'notif_tasks');
  const isWorkerRequestsHidden = useIsElementHidden('notification', 'notif_worker_requests');
  const isReceiptModsHidden = useIsElementHidden('notification', 'notif_receipt_modifications');
  const isDocCollectionsHidden = useIsElementHidden('notification', 'notif_document_collections');
  const isAttendanceHidden = useIsElementHidden('notification', 'notif_attendance');

  // Fetch pending invoice orders count for badge
  const { data: pendingInvoiceCount } = useQuery({
    queryKey: ['pending-invoice-count', activeBranch?.id],
    queryFn: async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      let q = supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('payment_type', 'with_invoice')
        .is('invoice_sent_at', null)
        .in('status', ['pending', 'assigned', 'in_progress', 'delivered']);
      if (activeBranch?.id) q = q.eq('branch_id', activeBranch.id);
      const { count, error } = await q;
      if (error) return 0;
      return count || 0;
    },
    enabled: showInvoiceButton,
    refetchInterval: 30000,
  });

  const LANGUAGES: { code: Language; label: string; flag: string }[] = [
    { code: 'ar', label: 'العربية', flag: '🇩🇿' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
  ];
  const { main: defaultMainItems, more: defaultMoreItems } = useNavigation();
  const { tabPaths } = useNavbarPreferences();

  // Apply navbar preferences: if user has custom tabs, use them for main nav
  const allNavItems = [...defaultMainItems, ...defaultMoreItems];
  const homeItem = defaultMainItems.find(i => i.path === '/');
  
  let mainNavItems = defaultMainItems;
  let moreNavItems = defaultMoreItems;

  if (tabPaths && tabPaths.length > 0) {
    const customMain = tabPaths
      .map(path => allNavItems.find(i => i.path === path))
      .filter(Boolean) as typeof allNavItems;
    mainNavItems = homeItem ? [homeItem, ...customMain] : customMain;
    // More = everything not in main (excluding home)
    const mainPaths = new Set(mainNavItems.map(i => i.path));
    moreNavItems = allNavItems.filter(i => i.path !== '/' && !mainPaths.has(i.path));
  }

  const isMoreActive = moreNavItems.some(item => location.pathname === item.path);

  // Close more sheet on route change
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  // Start worker GPS broadcast globally (not only in deliveries page)
  useEffect(() => {
    const isFieldWorker = role === 'worker' || role === 'supervisor';
    if (isFieldWorker) {
      startTracking();
    }
  }, [role, startTracking]);

  // Get role display text
  const getRoleDisplayText = () => {
    const parts: string[] = [];
    
    // Add system role (صفة)
    if (role === 'admin') {
      parts.push(t('workers.role_admin'));
    } else if (role === 'project_manager') {
      parts.push('مدير المشروع');
    } else if (role === 'branch_admin') {
      parts.push(t('workers.role_branch_admin'));
    } else if (role === 'supervisor') {
      parts.push(t('workers.role_supervisor'));
    } else if (role === 'accountant') {
      parts.push('محاسب');
    } else if (role === 'admin_assistant') {
      parts.push('عون إداري');
    } else if (role === 'worker') {
      parts.push(t('workers.role_worker'));
    }
    
    // Add functional role (دور وظيفي) if available
    if (activeRole?.custom_role_name) {
      parts.push(activeRole.custom_role_name);
    }
    
    return parts.join(' - ');
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] bg-background flex flex-col overflow-hidden" dir={dir}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-secondary text-secondary-foreground safe-top">
        <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
          {/* Branding icon only */}
          <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 p-1">
            <img src={icon} alt="Laser Food" className="w-full h-full object-contain" />
          </div>

          {/* Global back button */}
          {!isHomePage && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
              aria-label="رجوع"
            >
              {dir === 'rtl' ? (
                <ArrowRight className="w-4 h-4 text-primary" />
              ) : (
                <ArrowLeft className="w-4 h-4 text-primary" />
              )}
            </button>
          )}

          {/* Action icons */}
          {(role === 'worker' || role === 'supervisor') && !isAttendanceHidden && <AttendanceButton />}
          {!isWorkerRequestsHidden && <WorkerRequestsPopover />}
          {!isTasksHidden && <TasksPopover />}
          {!isTodayCustomersHidden && <SectorCustomersPopover />}
          {!isReceiptModsHidden && <ReceiptModificationsNotification />}
          {!isStockAlertsHidden && <StockAlertsNotification />}
          {!isOffersHidden && <OffersNotification />}
          {!isDocCollectionsHidden && <DocumentCollectionsPopover />}

          {/* Chat */}
          {!isChatHidden && (
            <Link
              to="/chat"
              className="relative flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-primary" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </span>
              )}
            </Link>
          )}

          {/* Settings dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                <MoreHorizontal className="w-4 h-4 text-primary" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {/* User info inside dropdown */}
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-bold truncate">{user?.full_name}</p>
                {getRoleDisplayText() && (
                  <p className="text-[11px] text-primary font-semibold truncate">{getRoleDisplayText()}</p>
                )}
              </div>
              {LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={cn(
                    'flex items-center gap-2 cursor-pointer',
                    language === lang.code && 'bg-primary/10 text-primary font-semibold'
                  )}
                >
                  <span>{lang.flag}</span>
                  <span className="text-sm">{lang.label}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {isConnected ? (
                <>
                  <DropdownMenuItem className="flex items-center gap-2 text-green-600 cursor-default">
                    <Printer className="w-4 h-4" />
                    <span className="text-sm truncate">{deviceName || 'طابعة متصلة'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={disconnect}
                    className="flex items-center gap-2 cursor-pointer text-destructive"
                  >
                    <BluetoothOff className="w-4 h-4" />
                    <span className="text-sm">قطع الاتصال</span>
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  onClick={scanAndConnect}
                  className="flex items-center gap-2 cursor-pointer"
                  disabled={printerStatus === 'connecting'}
                >
                  <Bluetooth className="w-4 h-4" />
                  <span className="text-sm">{printerStatus === 'connecting' ? 'جاري الاتصال...' : 'ربط الطابعة'}</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {isAdminRole(role) && (
                <DropdownMenuItem
                  onClick={switchBranch}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-sm font-bold text-primary">
                    {activeBranch 
                      ? ALGERIAN_WILAYAS.find(w => w.name === activeBranch.wilaya)?.code || '∞'
                      : '∞'}
                  </span>
                  <span className="text-sm">{activeBranch ? activeBranch.name : t('branches.all_branches')}</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={logout}
                className="flex items-center gap-2 cursor-pointer text-destructive"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">{t('auth.logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y pb-20"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-secondary border-t border-border safe-bottom z-50">
        <div className="flex items-center justify-around py-1.5">
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-lg transition-colors',
                  isActive
                    ? 'text-primary-foreground bg-primary'
                    : 'text-secondary-foreground hover:text-primary'
                )}
                title={item.label}
              >
                <item.icon className="w-5 h-5" />
              </Link>
            );
          })}
          
          {/* Invoice Request Button */}
          {showInvoiceButton && (
            <button
              onClick={() => setInvoiceRequestOpen(true)}
              className={cn(
                'relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors',
                'text-secondary-foreground hover:text-primary'
              )}
              title="طلب فاتورة"
            >
              <Receipt className="w-5 h-5" />
              {(pendingInvoiceCount || 0) > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {pendingInvoiceCount}
                </span>
              )}
            </button>
          )}

          {/* More Menu - Sheet Style */}
          {moreNavItems.length > 0 && (
            <>
              <button
                onClick={() => setMoreOpen(true)}
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-lg transition-colors',
                  isMoreActive
                    ? 'text-primary-foreground bg-primary'
                    : 'text-secondary-foreground hover:text-primary'
                )}
                title={t('nav.more')}
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {moreOpen && (
                <div className="fixed inset-0 z-[100]" onClick={() => setMoreOpen(false)}>
                  <div className="absolute inset-0 bg-black/40" />
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-2xl max-h-[75vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-center pt-3 pb-1">
                      <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                    </div>
                    <div className="px-4 pb-6 pt-2">
                      <div className="grid grid-cols-4 gap-3">
                        {moreNavItems.map((item) => {
                          const isActive = location.pathname === item.path;
                          const colors = moreItemColors[item.path] || { bg: 'bg-muted/50', icon: 'text-muted-foreground', border: 'border-border' };
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              onClick={() => setMoreOpen(false)}
                              className={cn(
                                'flex flex-col items-center justify-center p-2.5 gap-1.5 rounded-xl border transition-all active:scale-95 hover:shadow-md',
                                isActive
                                  ? 'ring-2 ring-primary/40 shadow-md border-primary/30 bg-primary/5'
                                  : `${colors.bg} ${colors.border}`
                              )}
                            >
                              <item.icon className={cn('w-5 h-5', isActive ? 'text-primary' : colors.icon)} />
                              <span className={cn(
                                'text-[10px] font-medium text-center leading-tight',
                                isActive ? 'text-primary font-bold' : 'text-foreground'
                              )}>{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </nav>

      {/* Branch Selection Dialog */}
      <BranchSelectionDialog
        open={showBranchSelection}
        onSelectBranch={selectBranch}
      />
      
      {showInvoiceButton && (
        <InvoiceRequestDialog open={invoiceRequestOpen} onOpenChange={setInvoiceRequestOpen} />
      )}
    </div>
  );
};

export default MobileLayout;
