// POS Type Definitions

export type OrderStatus = 
  | 'CREATED' 
  | 'SENT_TO_KITCHEN' 
  | 'SERVED' 
  | 'BILL_REQUESTED' 
  | 'PAID' 
  | 'CLOSED';

export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded';

export type AppRole = 'admin' | 'manager' | 'cashier' | 'kitchen';

export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'split';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';

// Database types
export interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  branch_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Category {
  id: string;
  branch_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  branch_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Inventory {
  id: string;
  branch_id: string;
  menu_item_id: string;
  quantity: number;
  low_stock_threshold: number;
  updated_at: string;
  menu_item?: MenuItem;
}

export interface RestaurantTable {
  id: string;
  branch_id: string;
  table_number: string;
  capacity: number;
  status: TableStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  branch_id: string;
  table_id: string | null;
  created_by: string | null;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
  table?: RestaurantTable;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  created_at: string;
  menu_item?: MenuItem;
}

export interface Payment {
  id: string;
  order_id: string;
  branch_id: string;
  processed_by: string | null;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  idempotency_key: string;
  transaction_reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface Refund {
  id: string;
  payment_id: string;
  processed_by: string | null;
  amount: number;
  reason: string;
  created_at: string;
}

export interface OrderStatusLog {
  id: string;
  order_id: string;
  previous_status: OrderStatus | null;
  new_status: OrderStatus;
  changed_by: string | null;
  created_at: string;
}

// RPC Response types
export interface RPCResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export interface FinalizePaymentResponse extends RPCResponse {
  payment_id?: string;
  idempotent?: boolean;
}

export interface SplitPaymentResponse extends RPCResponse {
  total_paid?: number;
}

export interface RefundResponse extends RPCResponse {
  refund_id?: string;
}

export interface UpdateOrderStatusResponse extends RPCResponse {
  previous_status?: OrderStatus;
  new_status?: OrderStatus;
}

// Split payment input
export interface SplitPaymentInput {
  amount: number;
  payment_method: PaymentMethod;
  idempotency_key: string;
}

// Order workflow helpers
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus | null> = {
  CREATED: 'SENT_TO_KITCHEN',
  SENT_TO_KITCHEN: 'SERVED',
  SERVED: 'BILL_REQUESTED',
  BILL_REQUESTED: 'PAID',
  PAID: 'CLOSED',
  CLOSED: null,
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: 'New Order',
  SENT_TO_KITCHEN: 'In Kitchen',
  SERVED: 'Served',
  BILL_REQUESTED: 'Bill Requested',
  PAID: 'Paid',
  CLOSED: 'Closed',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  pending: 'Pending',
  paid: 'Paid',
  refunded: 'Refunded',
};

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  cleaning: 'Cleaning',
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  cashier: 'Cashier',
  kitchen: 'Kitchen Staff',
};
