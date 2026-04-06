export interface Permission {
  id: string;
  code: string;
  name_ar: string;
  description_ar: string | null;
  category: 'page_access' | 'crud' | 'data_scope';
  resource: string | null;
  created_at: string;
}

export interface CustomRole {
  id: string;
  code: string;
  name_ar: string;
  description_ar: string | null;
  is_system: boolean;
  created_at: string;
  created_by: string | null;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface RoleWithPermissions extends CustomRole {
  permissions: Permission[];
}

export type PermissionCategory = 'page_access' | 'crud' | 'data_scope';

export const PERMISSION_CATEGORIES: Record<PermissionCategory, string> = {
  page_access: 'الوصول للصفحات',
  crud: 'العمليات',
  data_scope: 'نطاق البيانات',
};

export const RESOURCE_NAMES: Record<string, string> = {
  gps: 'GPS',
  pricing: 'التسعير',
  home: 'الرئيسية',
  my_promos: 'عملياتي',
  workers: 'العمال',
  products: 'المنتجات',
  customers: 'العملاء',
  stats: 'الإحصائيات',
  promo_table: 'جدول العمليات',
  branches: 'الفروع',
  settings: 'الإعدادات',
  permissions: 'الصلاحيات',
  promos: 'العمليات',
  orders: 'الطلبيات',
  supervision: 'الإشراف',
  all: 'الكل',
  customer_debts: 'ديون العملاء',
  activity_logs: 'سجل الأحداث',
  warehouse: 'المخزن',
  stock_receipts: 'وصولات المخزن',
  load_stock: 'تحميل للعامل',
  accounting: 'المحاسبة',
  worker_debts: 'ديون العمال',
  worker_tracking: 'تتبع العمال',
  worker_actions: 'إجراءات العمال',
  geo_operations: 'العمليات الجغرافية',
  daily_receipts: 'الفواتير اليومية',
  manager_treasury: 'خزينة المدير',
  worker_liability: 'عهدة العمال',
  shared_invoices: 'الفواتير المشتركة',
  surplus_deficit: 'الفائض والعجز',
  rewards: 'المكافآت',
  expenses: 'المصاريف',
  expenses_management: 'إدارة المصاريف',
  product_offers: 'عروض المنتجات',
  customer_accounts: 'حسابات العملاء',
  nearby_stores: 'المحلات القريبة',
  attendance: 'الحضور والانصراف',
  chat: 'المحادثات',
  available_offers: 'العروض المتاحة',
  deliveries: 'التوصيلات',
  my_stock: 'مخزوني',
  guide: 'الدليل',
};

// System roles vs Functional roles
export const SYSTEM_ROLE_CODES = ['admin', 'branch_admin', 'supervisor', 'worker', 'project_manager', 'accountant', 'admin_assistant'];
export const FUNCTIONAL_ROLE_CODES = ['sales_rep', 'delivery_rep', 'warehouse_manager'];

export const ROLE_TYPE_LABELS: Record<string, string> = {
  system: 'أدوار النظام',
  functional: 'الأدوار الوظيفية',
};
