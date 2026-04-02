// POS Type Definitions

export type OrderStatus = 
  | 'CREATED' 
  | 'SENT_TO_KITCHEN' 
  | 'SERVED' 
  | 'BILL_REQUESTED' 
  | 'PAID' 
  | 'CLOSED';

// Billing type for bar products
export type BillingType = 'bottle_only' | 'by_serving' | 'service';

export type MenuSession = 'breakfast' | 'lunch' | 'dinner' | 'all';

// Portion option for flexible size/price combinations
export interface PortionOption {
  name: string;      // "Small", "Medium", "Large", "Regular", "Shot", etc.
  price: number;     // Price for this portion
  size?: string;     // Optional size label: "30ml", "Regular", "500g", etc.
  size_ml?: number;  // Deprecated: kept for backward compatibility
}

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
  order_prefix: string;
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
  requires_kitchen: boolean;
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
  session: MenuSession;
  is_daily_special: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  // Bar product fields
  bottle_size_ml: number | null;
  cost_price: number | null;
  serving_size_ml: number | null;
  serving_price: number | null;
  billing_type: BillingType;
  portion_options: PortionOption[] | null;
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

export type TableType = 'dining' | 'bar' | 'booth' | 'outdoor';

export interface RestaurantTable {
  id: string;
  branch_id: string;
  table_number: string;
  capacity: number;
  status: TableStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Floor layout fields
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
  shape?: 'square' | 'round' | 'rectangle';
  // Table type and merge fields
  table_type?: TableType;
  merged_with?: string[];
  is_merged?: boolean;
}

export interface Order {
  id: string;
  branch_id: string;
  table_id: string | null;
  created_by: string | null;
  order_number: string | null;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  customer_name?: string | null;
  is_foc?: boolean;
  foc_dancer_name?: string | null;
  locked_at: string | null;
  created_at: string;
  updated_at: string;
  table?: RestaurantTable;
  order_items?: OrderItem[];
}

export type ItemStatus = 'pending' | 'ready';

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  created_at: string;
  item_status: ItemStatus;
  is_serving?: boolean;
  portion_name?: string | null;
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

export interface Expense {
  id: string;
  branch_id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  recorded_by: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

// Phase 3: Delivery, driver, and cross-branch inventory sync types
export type DeliveryStatus = 'awaiting_pickup' | 'en_route' | 'arrived' | 'delivered' | 'cancelled' | 'failed';

export interface DeliveryDriver {
  id: string;
  branch_id: string;
  full_name: string;
  phone_number: string;
  vehicle_plate: string | null;
  status: 'available' | 'assigned' | 'off_shift';
  created_at: string;
  updated_at: string;
}

export interface DeliveryAssignment {
  id: string;
  order_id: string;
  driver_id: string;
  assigned_by: string;
  eta_minutes: number;
  status: DeliveryStatus;
  route_geojson: string | null;
  created_at: string;
  updated_at: string;
  order?: Order;
  driver?: DeliveryDriver;
}

export interface InventoryTransferRequest {
  id: string;
  from_branch_id: string;
  to_branch_id: string;
  inventory_id: string;
  quantity: number;
  requested_by: string;
  approved_by?: string;
  status: 'requested' | 'approved' | 'rejected' | 'completed';
  requested_at: string;
  decided_at?: string;
  notes?: string;
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

// Cart item for order creation
export interface CartItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
  isServing?: boolean; // true if ordering by shot/glass for by_serving items
  selectedPortion?: PortionOption; // Selected portion for items with portion_options
  portionName?: string; // Explicit portion name for reliable saving
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

// Phase 4: Advanced Analytics Types
export interface SalesAnalytics {
  id: string;
  branch_id: string;
  date: string;
  hour_of_day?: number;
  total_orders: number;
  total_sales: number;
  total_items: number;
  average_order_value: number;
  revenue_by_category: Record<string, number>;
  service_type_breakdown: Record<string, number>;
  payment_method_breakdown: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface StaffPerformance {
  id: string;
  branch_id: string;
  staff_id: string;
  date: string;
  orders_count: number;
  total_sales: number;
  average_order_value: number;
  items_sold: number;
  customer_satisfaction_avg?: number;
  efficiency_score?: number;
  incentive_points: number;
  created_at: string;
  updated_at: string;
}

export interface ProductAnalytics {
  id: string;
  branch_id: string;
  menu_item_id: string;
  date: string;
  quantity_sold: number;
  revenue: number;
  cost: number;
  gross_margin?: number;
  rank_by_revenue?: number;
  rank_by_quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerAnalytics {
  id: string;
  branch_id: string;
  loyalty_customer_id?: string;
  phone_number?: string;
  total_orders: number;
  total_spent: number;
  average_order_value: number;
  last_order_date?: string;
  customer_lifetime_value: number;
  loyalty_tier?: string;
  is_returning_customer: boolean;
  created_at: string;
  updated_at: string;
}

export interface OperationalMetrics {
  id: string;
  branch_id: string;
  date: string;
  table_turnover_rate?: number;
  average_service_time?: number;
  peak_hour?: number;
  peak_hour_orders?: number;
  delivery_average_time?: number;
  delivery_success_rate?: number;
  cancellation_rate?: number;
  waste_cost?: number;
  created_at: string;
  updated_at: string;
}

// Phase 5: Customer Engagement Types
export interface RewardsRedemption {
  id: string;
  branch_id: string;
  customer_id: string;
  order_id?: string;
  reward_id?: string;
  points_redeemed: number;
  redemption_type: 'reward' | 'discount' | 'free_item';
  discount_amount?: number;
  notes?: string;
  redeemed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerNotification {
  id: string;
  branch_id: string;
  customer_id?: string;
  phone_number?: string;
  email?: string;
  notification_type: 'sms' | 'email' | 'push';
  subject?: string;
  message: string;
  related_order_id?: string;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  scheduled_for?: string;
  sent_at?: string;
  delivery_error?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerFeedback {
  id: string;
  branch_id: string;
  order_id?: string;
  customer_id?: string;
  phone_number?: string;
  rating: number; // 1-5
  comment?: string;
  feedback_categories: Record<string, number>;
  sentiment: 'positive' | 'neutral' | 'negative';
  response_from_management?: string;
  responded_at?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarketingCampaign {
  id: string;
  branch_id: string;
  name: string;
  description?: string;
  campaign_type: 'sms' | 'email' | 'in_app';
  discount_percentage?: number;
  discount_amount?: number;
  coupon_code?: string;
  start_date: string;
  end_date: string;
  target_segment: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  recipients_count: number;
  click_count: number;
  redemption_count: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  customer_id?: string;
  phone_number?: string;
  email?: string;
  delivery_status: 'pending' | 'sent' | 'failed' | 'clicked' | 'redeemed';
  sent_at?: string;
  clicked_at?: string;
  redeemed_at?: string;
  created_at: string;
}

export interface Currency {
  id: string;
  branch_id: string;
  currency_code: string;
  currency_symbol: string;
  exchange_rate: number;
  is_primary: boolean;
  decimal_places: number;
  rounding_mode: 'round' | 'ceil' | 'floor';
  created_at: string;
  updated_at: string;
}

// Phase 6: Advanced Reporting & Forecasting Types
export interface SalesForecast {
  id: string;
  branch_id: string;
  forecast_date: string;
  forecast_type: 'daily' | 'weekly' | 'monthly';
  predicted_revenue: number;
  predicted_orders: number;
  confidence_score: number; // 0.00 to 1.00
  actual_revenue?: number;
  actual_orders?: number;
  accuracy_score?: number;
  factors: {
    historical_average: number;
    trend_factor: number;
    seasonality_factor: number;
    data_points: number;
  };
  created_at: string;
  updated_at: string;
}

export interface InventoryForecast {
  id: string;
  branch_id: string;
  item_id: string;
  forecast_date: string;
  predicted_demand: number;
  safety_stock_level?: number;
  reorder_point?: number;
  confidence_score: number;
  actual_consumption?: number;
  accuracy_score?: number;
  factors: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface StaffingForecast {
  id: string;
  branch_id: string;
  forecast_date: string;
  shift_type: 'morning' | 'afternoon' | 'evening' | 'night';
  predicted_staff_needed: number;
  actual_staff_used?: number;
  peak_hour_prediction?: string;
  busy_period_start?: string;
  busy_period_end?: string;
  factors: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CustomReport {
  id: string;
  branch_id: string;
  name: string;
  description?: string;
  report_type: 'sales' | 'inventory' | 'staff' | 'customer';
  config: {
    dateRange: {
      start: string;
      end: string;
    };
    filters: Record<string, any>;
    groupBy?: string[];
    metrics: string[];
    chartType?: 'bar' | 'line' | 'pie' | 'table';
  };
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportSchedule {
  id: string;
  report_id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  schedule_time: string;
  recipients: string[];
  is_active: boolean;
  last_run?: string;
  next_run?: string;
  created_at: string;
}

export interface TrendAnalysis {
  id: string;
  branch_id: string;
  analysis_type: 'seasonal' | 'weekly' | 'monthly' | 'yearly';
  data_type: 'sales' | 'orders' | 'customers' | 'items';
  period_start: string;
  period_end: string;
  trend_direction: 'increasing' | 'decreasing' | 'stable';
  trend_strength: number; // 0.00 to 1.00
  seasonality_score: number;
  forecast_accuracy?: number;
  insights: {
    key_findings: string[];
    recommendations: string[];
    anomalies: any[];
  };
  created_at: string;
}

export interface ForecastFactors {
  weather?: {
    temperature: number;
    condition: string;
    impact_score: number;
  };
  holidays?: {
    is_holiday: boolean;
    holiday_name?: string;
    impact_score: number;
  };
  events?: {
    has_event: boolean;
    event_type?: string;
    impact_score: number;
  };
  seasonality?: {
    day_of_week: number;
    month_of_year: number;
    seasonal_multiplier: number;
  };
  historical_performance?: {
    previous_period_avg: number;
    growth_rate: number;
    volatility: number;
  };
}
