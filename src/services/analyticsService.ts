import { supabase } from '@/integrations/supabase/client';
import type {
  SalesAnalytics,
  StaffPerformance,
  ProductAnalytics,
  CustomerAnalytics,
  OperationalMetrics
} from '@/types/pos';

// These tables are created via Phase 4 migration and may not exist in all environments.
// Using `as any` to bypass strict type checking against the auto-generated schema.
const db = supabase as any;

// Sales Analytics Functions
export async function getSalesAnalytics(branchId: string, startDate: string, endDate: string) {
  const { data, error } = await db
    .from('sales_analytics')
    .select('*')
    .eq('branch_id', branchId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data || []) as SalesAnalytics[];
}

export async function getDailySalesMetrics(branchId: string, date: string) {
  const { data, error } = await db
    .from('sales_analytics')
    .select('*')
    .eq('branch_id', branchId)
    .eq('date', date)
    .is('hour_of_day', null)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data || null) as SalesAnalytics | null;
}

export async function getHourlySalesMetrics(branchId: string, date: string) {
  const { data, error } = await db
    .from('sales_analytics')
    .select('*')
    .eq('branch_id', branchId)
    .eq('date', date)
    .not('hour_of_day', 'is', null)
    .order('hour_of_day', { ascending: true });

  if (error) throw error;
  return (data || []) as SalesAnalytics[];
}

export async function recordSalesMetrics(params: {
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
}) {
  const { data, error } = await db
    .from('sales_analytics')
    .insert([params])
    .select()
    .single();

  if (error) throw error;
  return data as SalesAnalytics;
}

// Staff Performance Functions
export async function getStaffPerformance(branchId: string, startDate: string, endDate: string) {
  const { data, error } = await db
    .from('staff_performance')
    .select('*')
    .eq('branch_id', branchId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('total_sales', { ascending: false });

  if (error) throw error;
  return (data || []) as StaffPerformance[];
}

export async function getStaffPerformanceLeaderboard(branchId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const dateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await db
    .from('staff_performance')
    .select('*, staff(*)')
    .eq('branch_id', branchId)
    .gte('date', dateStr)
    .order('incentive_points', { ascending: false });

  if (error) throw error;
  return data;
}

export async function recordStaffPerformance(params: {
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
}) {
  const { data, error } = await db
    .from('staff_performance')
    .insert([params])
    .select()
    .single();

  if (error) throw error;
  return data as StaffPerformance;
}

// Product Analytics Functions
export async function getProductAnalytics(branchId: string, startDate: string, endDate: string) {
  const { data, error } = await db
    .from('product_analytics')
    .select('*, menu_item(*)')
    .eq('branch_id', branchId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('revenue', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getTopSellingItems(branchId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const dateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await db
    .from('product_analytics')
    .select('*, menu_item(*)')
    .eq('branch_id', branchId)
    .gte('date', dateStr)
    .order('quantity_sold', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data;
}

export async function getProductMarginAnalysis(branchId: string, date: string) {
  const { data, error } = await db
    .from('product_analytics')
    .select('*, menu_item(*)')
    .eq('branch_id', branchId)
    .eq('date', date)
    .order('gross_margin', { ascending: false });

  if (error) throw error;
  return data;
}

export async function recordProductAnalytics(params: {
  branch_id: string;
  menu_item_id: string;
  date: string;
  quantity_sold: number;
  revenue: number;
  cost: number;
  gross_margin?: number;
  rank_by_revenue?: number;
  rank_by_quantity?: number;
}) {
  const { data, error } = await db
    .from('product_analytics')
    .insert([params])
    .select()
    .single();

  if (error) throw error;
  return data as ProductAnalytics;
}

// Customer Analytics Functions
export async function getCustomerAnalytics(branchId: string) {
  const { data, error } = await db
    .from('customer_analytics')
    .select('*, loyalty_customer(*)')
    .eq('branch_id', branchId)
    .order('customer_lifetime_value', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getTopCustomers(branchId: string, limit: number = 50) {
  const { data, error } = await db
    .from('customer_analytics')
    .select('*, loyalty_customer(*)')
    .eq('branch_id', branchId)
    .order('total_spent', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function getNewVsReturningCustomers(branchId: string, startDate: string, endDate: string) {
  const { data, error } = await db
    .from('customer_analytics')
    .select('is_returning_customer, COUNT(*) as count')
    .eq('branch_id', branchId)
    .gte('creation_date', startDate)
    .lte('creation_date', endDate);

  if (error) throw error;
  return data;
}

export async function recordCustomerAnalytics(params: {
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
}) {
  const { data, error } = await db
    .from('customer_analytics')
    .insert([params])
    .select()
    .single();

  if (error) throw error;
  return data as CustomerAnalytics;
}

// Operational Metrics Functions
export async function getOperationalMetrics(branchId: string, startDate: string, endDate: string) {
  const { data, error } = await db
    .from('operational_metrics')
    .select('*')
    .eq('branch_id', branchId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) throw error;
  return (data || []) as OperationalMetrics[];
}

export async function recordOperationalMetrics(params: {
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
}) {
  const { data, error } = await db
    .from('operational_metrics')
    .insert([params])
    .select()
    .single();

  if (error) throw error;
  return data as OperationalMetrics;
}

// Summary functions for dashboard
export async function getSalesSummary(branchId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const dateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await db
    .from('sales_analytics')
    .select('SUM(total_orders) as total_orders, SUM(total_sales) as total_sales, AVG(average_order_value) as avg_aov')
    .eq('branch_id', branchId)
    .gte('date', dateStr)
    .is('hour_of_day', null)
    .single();

  if (error) throw error;
  return data;
}

export async function getPerformanceTrends(branchId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const dateStr = startDate.toISOString().split('T')[0];

  const { data, error } = await db
    .from('sales_analytics')
    .select('date, total_sales, average_order_value, total_orders')
    .eq('branch_id', branchId)
    .gte('date', dateStr)
    .is('hour_of_day', null)
    .order('date', { ascending: true });

  if (error) throw error;
  return data;
}
