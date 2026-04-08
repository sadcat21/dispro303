import React, { useState, useEffect, useMemo } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkerPermissions } from '@/hooks/usePermissions';
import { useIsElementHidden } from '@/hooks/useUIOverrides';
import ProductGrid from '@/components/promo/ProductGrid';
import AddPromoDialog from '@/components/promo/AddPromoDialog';
import SalesHubDialog from '@/components/sales/SalesHubDialog';
import FactoryReceiptQuickDialog from '@/components/stock/FactoryReceiptQuickDialog';
import FactoryDeliveryQuickDialog from '@/components/stock/FactoryDeliveryQuickDialog';
import CustomerActionDialog from '@/components/orders/CustomerActionDialog';
import OrderFlowDialog from '@/components/orders/OrderFlowDialog';
import CustomerPickerDialog from '@/components/orders/CustomerPickerDialog';
import { useTrackVisit } from '@/hooks/useVisitTracking';
import { Customer } from '@/types/database';
import { toast } from 'sonner';
import { ShoppingCart, Gift, Loader2, ShoppingBag, Truck, Package, Banknote, Users, Wallet, ClipboardList, MapPin, Trophy, MessageCircle, HardHat, CalendarCheck, ArrowDownToLine, Warehouse, ClipboardCheck } from 'lucide-react';

import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import WorkerHandoverPreviewDialog from '@/components/accounting/WorkerHandoverPreviewDialog';
import TodayCustomersDialog from '@/components/sectors/TodayCustomersDialog';
import PalletCalculatorDialog from '@/components/stock/PalletCalculatorDialog';
import AttendanceButton from '@/components/attendance/AttendanceButton';
import ManualPromoEntryDialog from '@/components/offers/ManualPromoEntryDialog';
import WorkerSalesSummaryCard from '@/components/workers/WorkerSalesSummaryCard';
import WorkerSalesSummaryDialog from '@/components/accounting/WorkerSalesSummaryDialog';

const WorkerHome: React.FC = () => {
  const { user, workerId, role, activeRole, activeBranch } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: permissions = [], isLoading: permissionsLoading } = useWorkerPermissions();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [showSalesHubDialog, setShowSalesHubDialog] = useState(false);
  const [salesHubTab, setSalesHubTab] = useState<'direct' | 'delivery'>('direct');
  const [showCreateOrderDialog, setShowCreateOrderDialog] = useState(false);
  const [showCustomerPickerForOrder, setShowCustomerPickerForOrder] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedCustomerForAction, setSelectedCustomerForAction] = useState<Customer | null>(null);
  const [showHandoverPreview, setShowHandoverPreview] = useState(false);
  const [showTodayCustomers, setShowTodayCustomers] = useState(false);
  const [showPalletCalculator, setShowPalletCalculator] = useState(false);
  const [showManualPromoEntry, setShowManualPromoEntry] = useState(false);
  const [showFactoryReceipt, setShowFactoryReceipt] = useState(false);
  const [showFactoryDelivery, setShowFactoryDelivery] = useState(false);
  const [showStockManagement, setShowStockManagement] = useState(false);
  const [showSalesSummary, setShowSalesSummary] = useState(false);

  const { trackVisit } = useTrackVisit();
  const isDirectSaleHidden = useIsElementHidden('button', 'home_direct_sale');
  const isCreateOrderHidden = useIsElementHidden('button', 'home_orders');
  const isAddCustomerHidden = useIsElementHidden('button', 'home_customers');
  const isAddPromoHidden = useIsElementHidden('button', 'home_promos');
  const isCollectDebtHidden = useIsElementHidden('button', 'home_debts');
  const isDeliveriesHidden = useIsElementHidden('button', 'home_deliveries');
  const isMyStockHidden = useIsElementHidden('button', 'home_my_stock');
  const isExpensesHidden = useIsElementHidden('button', 'home_expenses');
  const isOrdersPageHidden = useIsElementHidden('page', '/orders');
  const isDeliveriesPageHidden = useIsElementHidden('page', '/my-deliveries');
  const isMyStockPageHidden = useIsElementHidden('page', '/my-stock');
  const isCustomersPageHidden = useIsElementHidden('page', '/customers');
  const isExpensesPageHidden = useIsElementHidden('page', '/expenses');
  const isMyPromosPageHidden = useIsElementHidden('page', '/my-promos');
  const isDebtsPageHidden = useIsElementHidden('page', '/customer-debts');
  const isRewardsHidden = useIsElementHidden('button', 'home_rewards');
  const isRewardsPageHidden = useIsElementHidden('page', '/my-rewards');
  const isDailyReceiptsHidden = useIsElementHidden('button', 'home_daily_receipts');
  const isDailyReceiptsPageHidden = useIsElementHidden('page', '/daily-receipts');
  const isAvailableOffersHidden = useIsElementHidden('button', 'home_available_offers');
  const isAvailableOffersPageHidden = useIsElementHidden('page', '/available-offers');
  const isWorkerActionsHidden = useIsElementHidden('page', '/worker-actions');
  const isWorkerActionsButtonHidden = useIsElementHidden('button', 'home_worker_actions');
  const isWarehouseStockHidden = useIsElementHidden('page', '/warehouse');
  const isWarehouseStockButtonHidden = useIsElementHidden('button', 'home_warehouse_stock');
  const isTodayCustomersHidden = useIsElementHidden('button', 'home_today_customers');
  const isSupervisor = role === 'supervisor';
  const isWarehouseManager = activeRole?.custom_role_code === 'warehouse_manager';

  const JS_DAY_TO_NAME: Record<number, string> = {
    6: 'saturday', 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday',
  };
  const DAY_NAMES: Record<string, string> = {
    saturday: t('days.saturday'), sunday: t('days.sunday'), monday: t('days.monday'),
    tuesday: t('days.tuesday'), wednesday: t('days.wednesday'), thursday: t('days.thursday'),
  };
  const todayName = JS_DAY_TO_NAME[new Date().getDay()] || '';
  const todayDayLabel = DAY_NAMES[todayName] || todayName;

  // Fetch today's scheduled sectors for current worker
  const { data: todaySectorNames = [] } = useQuery({
    queryKey: ['home-today-sector-names', workerId, todayName],
    queryFn: async () => {
      // Get sector_schedules for today
      const { data: schedules } = await supabase
        .from('sector_schedules')
        .select('sector_id')
        .eq('worker_id', workerId!)
        .eq('day', todayName);
      const sectorIds = (schedules || []).map(s => s.sector_id);
      if (sectorIds.length === 0) return [];
      const { data: sectors } = await supabase
        .from('sectors')
        .select('name')
        .in('id', sectorIds);
      return (sectors || []).map(s => s.name);
    },
    enabled: !!workerId && !!todayName,
    staleTime: 5 * 60 * 1000,
  });

  const todayCustomersLabel = useMemo(() => {
    const parts = [t('worker.today_customers'), todayDayLabel];
    if (todaySectorNames.length > 0) parts.push(todaySectorNames.join(' / '));
    return parts.join(' — ');
  }, [todayDayLabel, todaySectorNames]);

  const { data: stockItems } = useQuery({
    queryKey: ['my-worker-stock', workerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('worker_stock')
        .select('*, product:products(*)')
        .eq('worker_id', workerId!)
        .gt('quantity', 0);
      if (error) throw error;
      return data;
    },
    enabled: !!workerId,
  });

  // Resolve branch for warehouse manager (activeBranch may be null for non-admin roles)
  const { data: workerBranchId } = useQuery({
    queryKey: ['worker-branch-id', workerId],
    queryFn: async () => {
      const { data } = await supabase.from('workers').select('branch_id').eq('id', workerId!).maybeSingle();
      return data?.branch_id || null;
    },
    enabled: isWarehouseManager && !activeBranch?.id && !!workerId,
  });
  const effectiveBranchId = activeBranch?.id || workerBranchId;

  // Warehouse stock for warehouse manager direct sales
  const { data: warehouseStockItems } = useQuery({
    queryKey: ['warehouse-stock-for-sale', effectiveBranchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_stock')
        .select('*, product:products(*)')
        .eq('branch_id', effectiveBranchId!)
        .gt('quantity', 0);
      if (error) throw error;
      return data;
    },
    enabled: isWarehouseManager && !!effectiveBranchId,
  });

  const { data: allCustomers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers-for-order-picker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data as Customer[];
    },
    enabled: showCustomerPickerForOrder,
  });

  // Check permissions
  const hasPromoAccess = permissions.some(p =>
    ['view_promos', 'create_promos', 'page_promos'].includes(p.permission_code)
  );
  const hasOrdersAccess = permissions.some(p =>
    ['view_orders', 'create_orders', 'page_orders'].includes(p.permission_code)
  );
  const hasDeliveryAccess = permissions.some(p =>
    ['view_assigned_orders', 'update_order_status'].includes(p.permission_code)
  );
  const hasDebtAccess = permissions.some(p =>
    ['page_customer_debts', 'view_customer_debts', 'collect_debts'].includes(p.permission_code)
  );
  const hasCustomerAccess = permissions.some(p =>
    ['page_customers'].includes(p.permission_code)
  );
  const hasExpenseAccess = true; // All workers can access expenses

  useEffect(() => {
    if (!permissionsLoading && hasPromoAccess) {
      fetchProducts();
    } else if (!permissionsLoading) {
      setIsLoading(false);
    }
  }, [hasPromoAccess, permissionsLoading]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error(t('products.loading_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setShowPromoDialog(true);
  };

  // Determine welcome message based on permissions
  const getWelcomeMessage = () => {
    if (permissionsLoading) return t('common.loading_permissions');
    if (hasPromoAccess) {
      return t('products.choose');
    }
    if (hasOrdersAccess) {
      return t('orders.manage');
    }
    return t('common.welcome');
  };



  // Loading skeleton for permissions
  if (permissionsLoading) {
    return (
      <div className="pb-4">
        {/* Welcome Section */}
        <div className="bg-gradient-to-l from-primary to-primary/80 text-primary-foreground p-6">
          <h2 className="text-xl font-bold mb-1">{t('common.welcome')} {user?.full_name} 👋</h2>
          <p className="text-primary-foreground/80 text-sm">{t('common.loading_permissions')}</p>
        </div>

        {/* Loading Skeleton */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 touch-pan-y">
      {/* Welcome Section */}
      <div className="bg-gradient-to-l from-primary to-primary/80 text-primary-foreground p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold mb-1">{t('common.welcome')} {user?.full_name} 👋</h2>
            <p className="text-primary-foreground/80 text-sm">
              {getWelcomeMessage()}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AttendanceButton />
            <button
              onClick={() => setShowPalletCalculator(true)}
              className="bg-white/20 hover:bg-white/30 rounded-xl p-2.5 transition-colors"
              title={t('worker.pallet_calculator')}
            >
              <Package className="w-5 h-5" />
            </button>
            <Link
              to="/chat"
              className="bg-white/20 hover:bg-white/30 rounded-xl p-2.5 transition-colors"
              title={t('worker.chat')}
            >
              <MessageCircle className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setShowHandoverPreview(true)}
              className="bg-white/20 hover:bg-white/30 rounded-xl p-2.5 transition-colors"
              title={t('worker.handover_summary')}
            >
              <ClipboardList className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Worker Sales Summary */}
      <WorkerSalesSummaryCard onOpenSalesSummary={() => setShowSalesSummary(true)} />

      {/* Today's Customers Notification for Supervisors */}
      {isSupervisor && (
        <div className="px-4 mt-3">
          <div
            onClick={() => setShowTodayCustomers(true)}
            className="relative overflow-hidden rounded-xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 to-blue-100 p-4 cursor-pointer active:scale-[0.97] transition-all hover:shadow-lg flex items-center gap-3"
          >
            <CalendarCheck className="w-8 h-8 text-sky-600 shrink-0" />
            <div>
              <p className="font-bold text-sm text-sky-900">{todayCustomersLabel}</p>
              <p className="text-xs text-sky-700">{t('worker.today_schedule_desc')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Warehouse Manager: Today's Customers */}
      {isWarehouseManager && !isSupervisor && (
        <div className="px-4 mt-3">
          <div
            onClick={() => setShowTodayCustomers(true)}
            className="relative overflow-hidden rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-100 p-4 cursor-pointer active:scale-[0.97] transition-all hover:shadow-lg flex items-center gap-3"
          >
            <CalendarCheck className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-sm text-emerald-900">{todayCustomersLabel}</p>
              <p className="text-xs text-emerald-700">{t('worker.today_schedule_desc')}</p>
            </div>
          </div>
        </div>
      )}


      {hasPromoAccess ? (
        <>
          <div className="px-4 mt-4">
            <button
              onClick={() => setShowManualPromoEntry(true)}
              className="w-full rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-white p-4 flex items-center justify-center gap-2 shadow-lg active:scale-[0.97] transition-all"
            >
              <Gift className="w-5 h-5" />
              <span className="font-bold text-sm">{t('worker.manual_promo')}</span>
            </button>
          </div>

          {/* Products Section for Promo */}
          <div className="mt-4">
            <div className="px-4 mb-2">
              <h3 className="text-lg font-bold">{t('products.list')}</h3>
            </div>
            <ProductGrid
              products={products}
              onProductSelect={handleProductSelect}
              isLoading={isLoading}
            />
          </div>

          {/* Add Promo Dialog */}
          <AddPromoDialog
            open={showPromoDialog}
            onOpenChange={setShowPromoDialog}
            product={selectedProduct}
            onSuccess={() => {
              // Optionally refresh data
            }}
          />
        </>
      ) : (hasOrdersAccess || hasDeliveryAccess || hasDebtAccess || isWarehouseManager) ? (
        (() => {
          // Build visible actions dynamically
          const quickActions: { key: string; icon: React.ReactNode; label: string; onClick: () => void }[] = [];

          if (hasDeliveryAccess && !isDeliveriesPageHidden && !isDeliveriesHidden) {
            quickActions.push({ key: 'deliveries', icon: <Truck className="w-6 h-6" />, label: t('deliveries.title'), onClick: () => navigate('/my-deliveries') });
          }
          if ((hasDeliveryAccess || isWarehouseManager) && !isDirectSaleHidden) {
            quickActions.push({
              key: 'direct-sale',
              icon: <ShoppingBag className="w-6 h-6" />,
              label: isWarehouseManager ? 'بيع مخزن - Vente Dépôt' : t('stock.direct_sale'),
              onClick: () => {
                setSalesHubTab('direct');
                setShowActionDialog(true);
              },
            });
          }
          // Stock management hub for warehouse manager
          if (isWarehouseManager) {
            quickActions.push({ key: 'stock-management', icon: <Warehouse className="w-6 h-6" />, label: 'إدارة المخزن', onClick: () => setShowStockManagement(true) });
          }
          if (hasDeliveryAccess && !isMyStockPageHidden && !isMyStockHidden) {
            quickActions.push({ key: 'my-stock', icon: <Package className="w-6 h-6" />, label: t('stock.my_stock'), onClick: () => navigate('/my-stock') });
          }
          if (hasOrdersAccess && !isOrdersPageHidden && !isCreateOrderHidden) {
            quickActions.push({ key: 'create-order', icon: <ShoppingCart className="w-6 h-6" />, label: t('orders.create_new'), onClick: () => setShowCustomerPickerForOrder(true) });
            quickActions.push({ key: 'orders', icon: <ShoppingCart className="w-6 h-6" />, label: t('orders.manage'), onClick: () => navigate('/orders') });
            quickActions.push({ key: 'order-tracking', icon: <ClipboardCheck className="w-6 h-6" />, label: 'تتبع طلباتي', onClick: () => navigate('/my-order-tracking') });
          }
          if (hasOrdersAccess && !hasDeliveryAccess && !isWarehouseManager && !isMyPromosPageHidden) {
            quickActions.push({ key: 'promos', icon: <Gift className="w-6 h-6" />, label: t('promos.add_new'), onClick: () => navigate('/my-promos') });
          }
          if (hasDebtAccess && !isCollectDebtHidden && !isDebtsPageHidden) {
            quickActions.push({ key: 'debts', icon: <Banknote className="w-6 h-6" />, label: t('debts.title'), onClick: () => navigate('/customer-debts') });
          }
          if (hasCustomerAccess && !isCustomersPageHidden && !isAddCustomerHidden) {
            quickActions.push({ key: 'customers', icon: <Users className="w-6 h-6" />, label: t('nav.customers'), onClick: () => navigate('/customers') });
          }
          if (hasExpenseAccess && !isExpensesPageHidden && !isExpensesHidden) {
            quickActions.push({ key: 'expenses', icon: <Wallet className="w-6 h-6" />, label: t('expenses.my_expenses'), onClick: () => navigate('/expenses') });
          }
          // Today's customers
          if (!isTodayCustomersHidden) {
            quickActions.push({ key: 'today-customers', icon: <MapPin className="w-6 h-6" />, label: todayCustomersLabel, onClick: () => setShowTodayCustomers(true) });
          }
          quickActions.push({ key: 'my-achievements', icon: <CalendarCheck className="w-6 h-6" />, label: 'منجزات اليوم', onClick: () => navigate('/my-achievements') });
          // Rewards page
          if (!isRewardsHidden && !isRewardsPageHidden) {
            quickActions.push({ key: 'rewards', icon: <Trophy className="w-6 h-6" />, label: t('worker.rewards'), onClick: () => navigate('/my-rewards') });
          }
          // Worker Actions for supervisor or warehouse_manager
          if ((isSupervisor || activeRole?.custom_role_code === 'warehouse_manager') && !isWorkerActionsHidden && !isWorkerActionsButtonHidden) {
            quickActions.push({ key: 'worker-actions', icon: <HardHat className="w-6 h-6" />, label: t('worker.worker_actions'), onClick: () => navigate('/worker-actions') });
          }
          // Worker Actions for regular workers (self-view) — removed per user request

          const itemColors: Record<string, { bg: string; icon: string; border: string }> = {
            deliveries: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
            'direct-sale': { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-200' },
            'my-stock': { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-200' },
            orders: { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-200' },
            'create-order': { bg: 'bg-blue-50', icon: 'text-blue-700', border: 'border-blue-200' },
            'order-tracking': { bg: 'bg-slate-50', icon: 'text-slate-600', border: 'border-slate-200' },
            promos: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
            debts: { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-200' },
            customers: { bg: 'bg-cyan-50', icon: 'text-cyan-600', border: 'border-cyan-200' },
            expenses: { bg: 'bg-yellow-50', icon: 'text-yellow-600', border: 'border-yellow-200' },
            'today-customers': { bg: 'bg-sky-50', icon: 'text-sky-600', border: 'border-sky-200' },
            'my-achievements': { bg: 'bg-violet-50', icon: 'text-violet-600', border: 'border-violet-200' },
            rewards: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
            'worker-actions': { bg: 'bg-indigo-50', icon: 'text-indigo-600', border: 'border-indigo-200' },
            'stock-management': { bg: 'bg-teal-50', icon: 'text-teal-600', border: 'border-teal-200' },
            'warehouse-stock': { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-200' },
            'factory-receipt': { bg: 'bg-lime-50', icon: 'text-lime-600', border: 'border-lime-200' },
            'daily-receipts': { bg: 'bg-teal-50', icon: 'text-teal-600', border: 'border-teal-200' },
            'available-offers': { bg: 'bg-rose-50', icon: 'text-rose-600', border: 'border-rose-200' },
          };
          const defaultColor = { bg: 'bg-muted/30', icon: 'text-primary', border: 'border-border' };

          return quickActions.length > 0 ? (
            <div className="p-4 space-y-3">
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                <h3 className="text-xs font-bold text-muted-foreground px-1">{t('common.quick_actions')}</h3>
                <div className="grid grid-cols-3 gap-2">
                  {quickActions.map((action) => {
                    const ic = itemColors[action.key] || defaultColor;
                    return (
                      <button
                        key={action.key}
                        onClick={action.onClick}
                        className={`flex flex-col items-center justify-center p-2.5 gap-1.5 rounded-xl border cursor-pointer active:scale-95 transition-all bg-white/80 ${ic.border} hover:shadow-md`}
                      >
                        {React.cloneElement(action.icon as React.ReactElement, { className: `w-5 h-5 ${ic.icon}` })}
                        <span className="text-[10px] font-medium text-center leading-tight text-foreground">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null;
        })()
      ) : (
        /* No specific permissions */
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Gift className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-lg font-medium">{t('common.no_permissions')}</p>
          <p className="text-sm">{t('common.contact_admin')}</p>
        </div>
      )}

      <SalesHubDialog
        open={showSalesHubDialog}
        onOpenChange={(open) => {
          setShowSalesHubDialog(open);
          if (!open) setSelectedCustomerForAction(null);
        }}
        initialCustomerId={selectedCustomerForAction?.id}
        initialTab={salesHubTab}
        stockSource={isWarehouseManager ? 'warehouse' : 'worker'}
        stockItems={(isWarehouseManager ? (warehouseStockItems || []) : (stockItems || [])).map(s => ({
          id: s.id,
          product_id: s.product_id,
          quantity: s.quantity,
          product: (s as any).product,
        }))}
      />

      <OrderFlowDialog
        open={showCreateOrderDialog}
        onOpenChange={setShowCreateOrderDialog}
        mode="create"
        initialCustomerId={selectedCustomerForAction?.id}
      />

      <CustomerActionDialog
        open={showActionDialog}
        onOpenChange={setShowActionDialog}
        onSale={(customer) => {
          setSelectedCustomerForAction(customer);
          setSalesHubTab('direct');
          setShowSalesHubDialog(true);
        }}
        directAction="sale"
        allowedActions={['sale']}
      />
      <CustomerPickerDialog
        open={showCustomerPickerForOrder}
        onOpenChange={setShowCustomerPickerForOrder}
        customers={allCustomers}
        isLoading={customersLoading}
        onSelect={(customer) => {
          setSelectedCustomerForAction(customer);
          setShowCustomerPickerForOrder(false);
          setShowCreateOrderDialog(true);
        }}
      />
      <WorkerHandoverPreviewDialog
        open={showHandoverPreview}
        onOpenChange={setShowHandoverPreview}
      />
      <TodayCustomersDialog
        open={showTodayCustomers}
        onOpenChange={setShowTodayCustomers}
      />
      <PalletCalculatorDialog
        open={showPalletCalculator}
        onOpenChange={setShowPalletCalculator}
      />
      <ManualPromoEntryDialog
        open={showManualPromoEntry}
        onOpenChange={setShowManualPromoEntry}
      />
      <FactoryReceiptQuickDialog
        open={showFactoryReceipt}
        onOpenChange={setShowFactoryReceipt}
      />
      <FactoryDeliveryQuickDialog
        open={showFactoryDelivery}
        onOpenChange={setShowFactoryDelivery}
      />
      <WorkerSalesSummaryDialog
        open={showSalesSummary}
        onOpenChange={setShowSalesSummary}
        workerId={workerId || undefined}
        workerName={user?.full_name}
      />

      {showStockManagement && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setShowStockManagement(false)}>
          <div className="bg-background rounded-t-2xl w-full max-w-lg p-5 pb-8 space-y-3 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-center mb-4">إدارة المخزن</h3>
            <button
              onClick={() => { setShowStockManagement(false); navigate('/warehouse'); }}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent transition-colors"
            >
              <Package className="w-6 h-6 text-primary" />
              <span className="font-semibold">مخزون الفرع</span>
            </button>
            <button
              onClick={() => { setShowStockManagement(false); setShowFactoryReceipt(true); }}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent transition-colors"
            >
              <ArrowDownToLine className="w-6 h-6 text-emerald-600" />
              <span className="font-semibold">استلام من المصنع</span>
            </button>
            <button
              onClick={() => { setShowStockManagement(false); setShowFactoryDelivery(true); }}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent transition-colors"
            >
              <Truck className="w-6 h-6 text-orange-600" />
              <span className="font-semibold">تسليم للمصنع</span>
            </button>
            {/* Stock Review - scheduled Sun, Tue, Thu but always accessible */}
            {(() => {
              const today = new Date().getDay();
              const isReviewDay = [0, 2, 4].includes(today);
              return (
                <button
                  onClick={() => { setShowStockManagement(false); navigate('/warehouse-review'); }}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors ${isReviewDay ? 'border-blue-300 bg-blue-50/50 hover:bg-blue-100/50 dark:border-blue-800 dark:bg-blue-950/20' : 'border-border hover:bg-accent'}`}
                >
                  <ClipboardCheck className={`w-6 h-6 ${isReviewDay ? 'text-blue-600' : 'text-primary'}`} />
                  <div className="text-right">
                    <span className="font-semibold block">مراجعة المخزون</span>
                    <span className="text-[10px] text-muted-foreground">
                      أيام المراجعة: الأحد، الثلاثاء، الخميس {isReviewDay ? '✅ اليوم يوم مراجعة' : ''}
                    </span>
                  </div>
                </button>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerHome;
