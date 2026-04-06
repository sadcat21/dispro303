export type AppRole = 'admin' | 'worker' | 'supervisor' | 'branch_admin' | 'project_manager' | 'accountant' | 'admin_assistant' | 'warehouse_manager';

export type OrderStatus = 'pending' | 'assigned' | 'in_progress' | 'delivered' | 'cancelled';

export interface Branch {
  id: string;
  name: string;
  wilaya: string;
  address: string | null;
  admin_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Worker {
  id: string;
  username: string;
  full_name: string;
  role: AppRole;
  is_active: boolean;
  branch_id: string | null;
  created_at: string;
  updated_at: string;
}

export type PriceSubType = 'super_gros' | 'gros' | 'retail';

export interface Customer {
  id: string;
  name: string;
  name_fr?: string | null;
  internal_name?: string | null;
  store_name?: string | null;
  store_name_fr?: string | null;
  phone: string | null;
  address: string | null;
  wilaya: string | null;
  branch_id: string | null;
  sector_id?: string | null;
  latitude: number | null;
  longitude: number | null;
  location_type?: string | null;
  zone_id?: string | null;
  is_trusted?: boolean | null;
  trust_notes?: string | null;
  default_payment_type?: string | null;
  default_price_subtype?: string | null;
  sales_rep_name?: string | null;
  sales_rep_phone?: string | null;
  customer_type?: string | null;
  default_delivery_worker_id?: string | null;
  created_at: string;
  created_by: string | null;
  updated_at?: string;
}

export type SectorType = 'prevente' | 'cash_van';

export interface Sector {
  id: string;
  name: string;
  name_fr?: string | null;
  branch_id: string | null;
  sector_type: SectorType;
  visit_day_sales: string | null;
  visit_day_delivery: string | null;
  sales_worker_id: string | null;
  delivery_worker_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PricingUnit = 'box' | 'kg' | 'unit';

// Helper to cast Supabase string to PricingUnit
export const asPricingUnit = (val: string | null | undefined): PricingUnit => {
  if (val === 'kg' || val === 'unit') return val;
  return 'box';
};

export interface Product {
  id: string;
  name: string;
  product_code: string | null;
  pieces_per_box: number;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  // Pricing
  pricing_unit: string;
  weight_per_box: number | null;
  price_super_gros: number | null;
  price_gros: number | null;
  price_invoice: number | null;
  price_retail: number | null;
  price_no_invoice: number | null;
  allow_unit_sale: boolean;
  image_url: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  gift_quantity: number;
  gift_pieces: number;
  gift_offer_id: string | null;
  payment_type: string | null;
  invoice_payment_method: string | null;
  price_subtype: string | null;
  created_at: string;
}

export interface Promo {
  id: string;
  worker_id: string;
  customer_id: string;
  product_id: string;
  vente_quantity: number;
  gratuite_quantity: number;
  has_bonus: boolean | null;
  bonus_amount: number | null;
  promo_date: string;
  notes: string | null;
  created_at: string;
}

export interface PromoWithDetails extends Promo {
  customer?: Customer;
  product?: Product;
  worker?: Worker;
}

export type PaymentType = 'with_invoice' | 'without_invoice';
export type PaymentStatus = 'pending' | 'cash' | 'check' | 'credit' | 'partial';

export interface Order {
  id: string;
  customer_id: string;
  created_by: string;
  assigned_worker_id: string | null;
  branch_id: string | null;
  status: OrderStatus;
  payment_type: PaymentType;
  payment_status: PaymentStatus;
  invoice_payment_method: string | null;
  partial_amount: number | null;
  prepaid_amount: number | null;
  notes: string | null;
  delivery_date: string | null;
  total_amount: number | null;
  created_at: string;
  updated_at: string;
}


export interface WorkerBasic {
  id: string;
  full_name: string;
  username: string;
}

export interface OrderWithDetails extends Order {
  customer?: Customer;
  created_by_worker?: WorkerBasic;
  assigned_worker?: WorkerBasic;
  items?: (OrderItem & { product?: Product })[];
}

export interface UserRole {
  id: string;
  user_id: string;
  worker_id: string | null;
  role: AppRole;
}

export interface AuthState {
  user: Worker | null;
  role: AppRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
