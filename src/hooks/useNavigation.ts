import { useMemo } from 'react';
import { Home, Users, Package, BarChart3, Settings, FileSpreadsheet, UserCheck, Building2, Shield, ShoppingCart, Truck, Activity, Store, BookOpen, UserCog, Gift, Wallet, Warehouse, ClipboardList, Banknote, Calculator, MapPin, Navigation, FileText, Vault, FolderOpen, Scale, Trophy, CalendarDays, Split, ClipboardCheck, Radar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkerPermissions } from '@/hooks/usePermissions';
import { useMyUIOverrides } from '@/hooks/useUIOverrides';
import { useLanguage } from '@/contexts/LanguageContext';
import { LucideIcon } from 'lucide-react';

export interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
}

export const useNavigation = () => {
  const { role } = useAuth();
  const { data: permissions, isLoading } = useWorkerPermissions();
  const { data: uiOverrides } = useMyUIOverrides();
  const { t } = useLanguage();

  const isPageHidden = (path: string) => {
    return uiOverrides?.some(o => o.element_type === 'page' && o.element_key === path && o.is_hidden) ?? false;
  };

  const isTabHidden = (path: string) => {
    return uiOverrides?.some(o => o.element_type === 'tab' && o.element_key === path && o.is_hidden) ?? false;
  };

  const hasPermission = (code: string) => {
    // Admin-level roles have all permissions
    if (role === 'admin' || role === 'branch_admin' || role === 'project_manager') return true;
    return permissions?.some(p => p.permission_code === code) ?? false;
  };

  const navItems = useMemo(() => {
    // Admin gets full navigation including worker capabilities
    if (role === 'admin' || role === 'project_manager') {
      return {
        main: [
          { path: '/', icon: Home, label: t('nav.home') },
          { path: '/promo-table', icon: FileSpreadsheet, label: t('nav.table') },
          { path: '/stats', icon: BarChart3, label: t('nav.stats') },
        ],
        more: [
          { path: '/orders', icon: ShoppingCart, label: t('nav.orders') },
          { path: '/order-tracking', icon: Radar, label: 'تتبع الطلبات' },
          { path: '/my-deliveries', icon: Truck, label: t('nav.my_deliveries') },
          { path: '/my-promos', icon: BarChart3, label: t('nav.my_promos') },
          { path: '/product-offers', icon: Gift, label: t('nav.product_offers') },
          { path: '/promo-splits', icon: Split, label: 'تجزئة العروض' },
          { path: '/customer-accounts', icon: UserCog, label: t('nav.customer_accounts') },
          { path: '/customer-journey', icon: Activity, label: t('nav.customer_journey') },
          { path: '/warehouse', icon: Warehouse, label: t('stock.warehouse_stock') },
          { path: '/warehouse-review', icon: ClipboardCheck, label: 'مراجعة مخزون الفرع' },
          { path: '/stock-receipts', icon: ClipboardList, label: t('stock.receipts') },
          { path: '/load-stock', icon: Truck, label: t('stock.load_to_worker') },
          { path: '/expenses', icon: Wallet, label: t('expenses.my_expenses') },
          { path: '/daily-receipts', icon: FileText, label: t('nav.daily_receipts') },
          { path: '/expenses-management', icon: Wallet, label: t('expenses.title') },
          { path: '/customer-debts', icon: Banknote, label: t('debts.title') },
          { path: '/accounting', icon: Calculator, label: t('accounting.title') },
          { path: '/manager-treasury', icon: Vault, label: t('nav.manager_treasury') },
          { path: '/shared-invoices', icon: FolderOpen, label: 'الفواتير المشاركة' },
          { path: '/surplus-deficit', icon: Scale, label: 'خزينة الفائض والعجز' },
          { path: '/rewards', icon: Trophy, label: 'المكافآت والعقوبات' },
          { path: '/worker-debts', icon: Banknote, label: t('nav.worker_debts') },
          { path: '/worker-tracking', icon: MapPin, label: t('navigation.worker_tracking') },
          { path: '/attendance', icon: CalendarDays, label: 'المداومة' },
          { path: '/geo-operations', icon: Navigation, label: t('nav.geo_operations') },
          { path: '/activity-logs', icon: Activity, label: t('nav.activity_logs') },
          { path: '/nearby-stores', icon: Store, label: t('nav.nearby_stores') },
          { path: '/branches', icon: Building2, label: t('nav.branches') },
          { path: '/customers', icon: UserCheck, label: t('nav.customers') },
          { path: '/workers', icon: Users, label: t('nav.workers') },
          { path: '/worker-actions', icon: Users, label: t('nav.worker_actions') },
          { path: '/products', icon: Package, label: t('nav.products') },
          { path: '/permissions', icon: Shield, label: t('nav.permissions') },
          { path: '/settings', icon: Settings, label: t('nav.settings') },
          { path: '/guide', icon: BookOpen, label: t('nav.guide') },
        ],
      };
    }

    // Supervisor navigation
    if (role === 'supervisor') {
      return {
        main: [
          { path: '/', icon: Home, label: t('nav.home') },
          { path: '/promo-table', icon: FileSpreadsheet, label: t('nav.table') },
          { path: '/stats', icon: BarChart3, label: t('nav.stats') },
          { path: '/orders', icon: ShoppingCart, label: t('nav.orders') },
        ],
        more: [
          { path: '/nearby-stores', icon: Store, label: t('nav.nearby_stores') },
          { path: '/guide', icon: BookOpen, label: t('nav.guide') },
        ],
      };
    }

    // Branch admin navigation - restricted to their branch, no global settings
    if (role === 'branch_admin') {
      return {
        main: [
          { path: '/', icon: Home, label: t('nav.home') },
          { path: '/promo-table', icon: FileSpreadsheet, label: t('nav.table') },
          { path: '/stats', icon: BarChart3, label: t('nav.stats') },
        ],
        more: [
          { path: '/orders', icon: ShoppingCart, label: t('nav.orders') },
          { path: '/order-tracking', icon: Radar, label: 'تتبع الطلبات' },
          { path: '/my-deliveries', icon: Truck, label: t('nav.my_deliveries') },
          { path: '/my-promos', icon: BarChart3, label: t('nav.my_promos') },
          { path: '/product-offers', icon: Gift, label: t('nav.product_offers') },
          { path: '/promo-splits', icon: Split, label: 'تجزئة العروض' },
          { path: '/customer-accounts', icon: UserCog, label: t('nav.customer_accounts') },
          { path: '/customer-journey', icon: Activity, label: t('nav.customer_journey') },
          { path: '/warehouse', icon: Warehouse, label: t('stock.warehouse_stock') },
          { path: '/warehouse-review', icon: ClipboardCheck, label: 'مراجعة مخزون الفرع' },
          { path: '/stock-receipts', icon: ClipboardList, label: t('stock.receipts') },
          { path: '/load-stock', icon: Truck, label: t('stock.load_to_worker') },
          { path: '/expenses', icon: Wallet, label: t('expenses.my_expenses') },
          { path: '/daily-receipts', icon: FileText, label: t('nav.daily_receipts') },
          { path: '/expenses-management', icon: Wallet, label: t('expenses.title') },
          { path: '/customer-debts', icon: Banknote, label: t('debts.title') },
          { path: '/accounting', icon: Calculator, label: t('accounting.title') },
          { path: '/manager-treasury', icon: Vault, label: t('nav.manager_treasury') },
          { path: '/shared-invoices', icon: FolderOpen, label: 'الفواتير المشاركة' },
          { path: '/surplus-deficit', icon: Scale, label: 'خزينة الفائض والعجز' },
          { path: '/rewards', icon: Trophy, label: 'المكافآت والعقوبات' },
          { path: '/worker-debts', icon: Banknote, label: t('nav.worker_debts') },
          { path: '/worker-tracking', icon: MapPin, label: t('navigation.worker_tracking') },
          { path: '/attendance', icon: CalendarDays, label: 'المداومة' },
          { path: '/geo-operations', icon: Navigation, label: t('nav.geo_operations') },
          { path: '/activity-logs', icon: Activity, label: t('nav.activity_logs') },
          { path: '/nearby-stores', icon: Store, label: t('nav.nearby_stores') },
          { path: '/customers', icon: UserCheck, label: t('nav.customers') },
          { path: '/workers', icon: Users, label: t('nav.workers') },
          { path: '/worker-actions', icon: Users, label: t('nav.worker_actions') },
          { path: '/products', icon: Package, label: t('nav.products') },
          { path: '/settings', icon: Settings, label: t('nav.settings') },
          { path: '/guide', icon: BookOpen, label: t('nav.guide') },
          // EXCLUDED for branch_admin: /branches, /permissions
        ],
      };
    }

    // Worker - build navigation based on permissions
    const mainItems: NavItem[] = [];
    const moreItems: NavItem[] = [];

    // Home is always available for all workers
    mainItems.push({ path: '/', icon: Home, label: t('nav.home') });

    // Orders page - for sales reps
    if (hasPermission('view_orders') || hasPermission('create_orders') || hasPermission('page_orders')) {
      mainItems.push({ path: '/orders', icon: ShoppingCart, label: t('nav.orders') });
    }

    // My Promos page - for workers with promo access
    if (hasPermission('page_my_promos')) {
      mainItems.push({ path: '/my-promos', icon: BarChart3, label: t('nav.my_promos') });
    }

    // My Deliveries page - for delivery workers
    if (hasPermission('view_assigned_orders') || hasPermission('update_order_status')) {
      mainItems.push({ path: '/my-deliveries', icon: Truck, label: t('nav.my_deliveries') });
      moreItems.push({ path: '/my-stock', icon: Package, label: t('stock.my_stock') });
    }

    // Customers page
    if (hasPermission('page_customers')) {
      moreItems.push({ path: '/customers', icon: UserCheck, label: t('nav.customers') });
    }

    // Products page
    if (hasPermission('page_products')) {
      moreItems.push({ path: '/products', icon: Package, label: t('nav.products') });
    }

    // Order tracking - for workers with order permissions
    if (hasPermission('view_orders') || hasPermission('create_orders') || hasPermission('page_orders') || hasPermission('view_assigned_orders')) {
      moreItems.push({ path: '/order-tracking', icon: Radar, label: 'تتبع الطلبات' });
    }

    // Customer debts - for workers with debt collection permission
    if (hasPermission('page_customer_debts') || hasPermission('view_customer_debts') || hasPermission('collect_debts')) {
      moreItems.push({ path: '/customer-debts', icon: Banknote, label: t('debts.title') });
    }

    // Expenses - always available for workers
    moreItems.push({ path: '/expenses', icon: Wallet, label: t('expenses.my_expenses') });

    // Daily receipts - always available for workers
    moreItems.push({ path: '/daily-receipts', icon: FileText, label: t('nav.daily_receipts') });

    // Guide page - always available for workers
    moreItems.push({ path: '/guide', icon: BookOpen, label: t('nav.guide') });

    return { main: mainItems, more: moreItems };
  }, [role, permissions, t]);

  // Apply UI overrides to filter hidden pages
  const filteredNavItems = useMemo(() => {
    if (!uiOverrides || uiOverrides.length === 0) return navItems;
    return {
      main: navItems.main.filter(item => !isPageHidden(item.path) && !isTabHidden(item.path)),
      more: navItems.more.filter(item => !isPageHidden(item.path)),
    };
  }, [navItems, uiOverrides]);

  return { ...filteredNavItems, isLoading, hasPermission, isPageHidden, isTabHidden };
};
