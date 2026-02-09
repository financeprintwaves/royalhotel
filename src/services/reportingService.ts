import { supabase } from '@/integrations/supabase/client';
import type { PaymentMethod } from '@/types/pos';

export interface DailySales {
  date: string;
  revenue: number;
  orders: number;
}

export interface HourlySales {
  hour: number;
  revenue: number;
  orders: number;
}

export interface TopSellingItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface CategorySales {
  category: string;
  revenue: number;
  quantity: number;
}

export interface StaffPerformance {
  staff_name: string;
  staff_id: string;
  orders_count: number;
  total_revenue: number;
  avg_order_value: number;
}

export interface PaymentBreakdown {
  method: PaymentMethod;
  amount: number;
  count: number;
}

export interface OrderTypeSales {
  type: 'dine-in' | 'takeaway';
  orders: number;
  revenue: number;
}

export interface ItemSalesDetail {
  name: string;
  category: string;
  quantity: number;
  revenue: number;
  avg_price: number;
}

export interface SalesSummary {
  gross_revenue: number;
  net_revenue: number;
  total_orders: number;
  avg_order_value: number;
  dine_in_orders: number;
  dine_in_revenue: number;
  takeaway_orders: number;
  takeaway_revenue: number;
  peak_hour: number;
  peak_day: string;
  top_item: string;
  top_category: string;
}

export interface DateRangeParams {
  startDate: Date;
  endDate: Date;
}

// Helper to generate dates between start and end
function getDatesBetween(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function getDailySales(params: DateRangeParams, branchId?: string): Promise<DailySales[]> {
  let query = supabase
    .from('orders')
    .select('created_at, total_amount, order_status, branch_id')
    .gte('created_at', params.startDate.toISOString())
    .lte('created_at', params.endDate.toISOString())
    .in('order_status', ['PAID', 'CLOSED']);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data: orders, error } = await query;

  if (error) throw error;

  // Initialize all dates in range
  const salesByDate: Record<string, { revenue: number; orders: number }> = {};
  const allDates = getDatesBetween(params.startDate, params.endDate);
  allDates.forEach(date => {
    salesByDate[date] = { revenue: 0, orders: 0 };
  });

  (orders || []).forEach(order => {
    const dateStr = order.created_at?.split('T')[0] || '';
    if (salesByDate[dateStr]) {
      salesByDate[dateStr].revenue += Number(order.total_amount) || 0;
      salesByDate[dateStr].orders += 1;
    }
  });

  return Object.entries(salesByDate)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getHourlySales(params: DateRangeParams, branchId?: string): Promise<HourlySales[]> {
  let query = supabase
    .from('orders')
    .select('created_at, total_amount, order_status, branch_id')
    .gte('created_at', params.startDate.toISOString())
    .lte('created_at', params.endDate.toISOString())
    .in('order_status', ['PAID', 'CLOSED']);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data: orders, error } = await query;

  if (error) throw error;

  // Group by hour
  const salesByHour: Record<number, { revenue: number; orders: number }> = {};
  
  for (let i = 0; i < 24; i++) {
    salesByHour[i] = { revenue: 0, orders: 0 };
  }

  (orders || []).forEach(order => {
    const hour = new Date(order.created_at).getHours();
    salesByHour[hour].revenue += Number(order.total_amount) || 0;
    salesByHour[hour].orders += 1;
  });

  return Object.entries(salesByHour)
    .map(([hour, data]) => ({ hour: Number(hour), ...data }))
    .sort((a, b) => a.hour - b.hour);
}

export async function getTopSellingItems(params: DateRangeParams, limit: number = 10, branchId?: string): Promise<TopSellingItem[]> {
  let query = supabase
    .from('order_items')
    .select(`
      quantity,
      total_price,
      menu_item:menu_items(name, branch_id),
      order:orders!inner(order_status, created_at, branch_id)
    `)
    .gte('order.created_at', params.startDate.toISOString())
    .lte('order.created_at', params.endDate.toISOString())
    .in('order.order_status', ['PAID', 'CLOSED']);

  if (branchId) {
    query = query.eq('order.branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Aggregate by menu item
  const itemStats: Record<string, { quantity: number; revenue: number }> = {};

  (data || []).forEach(item => {
    const name = (item.menu_item as any)?.name || 'Unknown';
    if (!itemStats[name]) {
      itemStats[name] = { quantity: 0, revenue: 0 };
    }
    itemStats[name].quantity += item.quantity;
    itemStats[name].revenue += Number(item.total_price) || 0;
  });

  return Object.entries(itemStats)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export async function getCategorySales(params: DateRangeParams, branchId?: string): Promise<CategorySales[]> {
  let query = supabase
    .from('order_items')
    .select(`
      quantity,
      total_price,
      menu_item:menu_items(category:categories(name), branch_id),
      order:orders!inner(order_status, created_at, branch_id)
    `)
    .gte('order.created_at', params.startDate.toISOString())
    .lte('order.created_at', params.endDate.toISOString())
    .in('order.order_status', ['PAID', 'CLOSED']);

  if (branchId) {
    query = query.eq('order.branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Aggregate by category
  const categoryStats: Record<string, { revenue: number; quantity: number }> = {};

  (data || []).forEach(item => {
    const categoryName = (item.menu_item as any)?.category?.name || 'Uncategorized';
    if (!categoryStats[categoryName]) {
      categoryStats[categoryName] = { revenue: 0, quantity: 0 };
    }
    categoryStats[categoryName].quantity += item.quantity;
    categoryStats[categoryName].revenue += Number(item.total_price) || 0;
  });

  return Object.entries(categoryStats)
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getStaffPerformance(params: DateRangeParams, branchId?: string): Promise<StaffPerformance[]> {
  // Get orders with created_by
  let query = supabase
    .from('orders')
    .select('id, total_amount, created_by, branch_id')
    .gte('created_at', params.startDate.toISOString())
    .lte('created_at', params.endDate.toISOString())
    .in('order_status', ['PAID', 'CLOSED']);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data: orders, error: ordersError } = await query;

  if (ordersError) throw ordersError;

  // Get all staff user_ids from orders
  const staffIds = [...new Set((orders || []).map(o => o.created_by).filter(Boolean))];
  
  // Fetch profiles separately
  let profilesMap: Record<string, string> = {};
  if (staffIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', staffIds);
    
    (profiles || []).forEach(p => {
      profilesMap[p.user_id] = p.full_name || 'Unknown Staff';
    });
  }

  // Aggregate by staff
  const staffStats: Record<string, { 
    staff_name: string;
    orders_count: number; 
    total_revenue: number;
  }> = {};

  (orders || []).forEach(order => {
    const staffId = order.created_by || 'unknown';
    const staffName = profilesMap[staffId] || 'Unknown Staff';
    
    if (!staffStats[staffId]) {
      staffStats[staffId] = { 
        staff_name: staffName,
        orders_count: 0, 
        total_revenue: 0 
      };
    }
    staffStats[staffId].orders_count += 1;
    staffStats[staffId].total_revenue += Number(order.total_amount) || 0;
  });

  return Object.entries(staffStats)
    .map(([staff_id, stats]) => ({
      staff_id,
      ...stats,
      avg_order_value: stats.orders_count > 0 ? stats.total_revenue / stats.orders_count : 0,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue);
}

export async function getPaymentBreakdown(params: DateRangeParams, branchId?: string): Promise<PaymentBreakdown[]> {
  let query = supabase
    .from('payments')
    .select('payment_method, amount, branch_id')
    .eq('payment_status', 'paid')
    .gte('created_at', params.startDate.toISOString())
    .lte('created_at', params.endDate.toISOString());

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) throw error;

  const breakdown: Record<PaymentMethod, { amount: number; count: number }> = {
    cash: { amount: 0, count: 0 },
    card: { amount: 0, count: 0 },
    mobile: { amount: 0, count: 0 },
    split: { amount: 0, count: 0 },
  };

  (data || []).forEach(payment => {
    const method = payment.payment_method as PaymentMethod;
    breakdown[method].amount += Number(payment.amount) || 0;
    breakdown[method].count += 1;
  });

  return Object.entries(breakdown)
    .filter(([_, stats]) => stats.count > 0)
    .map(([method, stats]) => ({ method: method as PaymentMethod, ...stats }));
}

export async function getOrderTypeSales(params: DateRangeParams, branchId?: string): Promise<OrderTypeSales[]> {
  let query = supabase
    .from('orders')
    .select('table_id, total_amount, branch_id')
    .gte('created_at', params.startDate.toISOString())
    .lte('created_at', params.endDate.toISOString())
    .in('order_status', ['PAID', 'CLOSED']);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data: orders, error } = await query;

  if (error) throw error;

  let dineIn = { orders: 0, revenue: 0 };
  let takeaway = { orders: 0, revenue: 0 };

  (orders || []).forEach(order => {
    if (order.table_id) {
      dineIn.orders += 1;
      dineIn.revenue += Number(order.total_amount) || 0;
    } else {
      takeaway.orders += 1;
      takeaway.revenue += Number(order.total_amount) || 0;
    }
  });

  return [
    { type: 'dine-in' as const, ...dineIn },
    { type: 'takeaway' as const, ...takeaway },
  ];
}

export async function getItemSalesDetails(params: DateRangeParams, branchId?: string): Promise<ItemSalesDetail[]> {
  let query = supabase
    .from('order_items')
    .select(`
      quantity,
      total_price,
      unit_price,
      menu_item:menu_items(name, category:categories(name), branch_id),
      order:orders!inner(order_status, created_at, branch_id)
    `)
    .gte('order.created_at', params.startDate.toISOString())
    .lte('order.created_at', params.endDate.toISOString())
    .in('order.order_status', ['PAID', 'CLOSED']);

  if (branchId) {
    query = query.eq('order.branch_id', branchId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Aggregate by item
  const itemDetails: Record<string, { 
    category: string; 
    quantity: number; 
    revenue: number;
    total_price_sum: number;
  }> = {};

  (data || []).forEach(item => {
    const name = (item.menu_item as any)?.name || 'Unknown';
    const category = (item.menu_item as any)?.category?.name || 'Uncategorized';
    
    if (!itemDetails[name]) {
      itemDetails[name] = { category, quantity: 0, revenue: 0, total_price_sum: 0 };
    }
    itemDetails[name].quantity += item.quantity;
    itemDetails[name].revenue += Number(item.total_price) || 0;
    itemDetails[name].total_price_sum += Number(item.total_price) || 0;
  });

  return Object.entries(itemDetails)
    .map(([name, stats]) => ({
      name,
      category: stats.category,
      quantity: stats.quantity,
      revenue: stats.revenue,
      avg_price: stats.quantity > 0 ? stats.revenue / stats.quantity : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getSalesSummary(params: DateRangeParams, branchId?: string): Promise<SalesSummary> {
  const [dailySales, hourlySales, topItems, categorySales, orderTypeSales] = await Promise.all([
    getDailySales(params, branchId),
    getHourlySales(params, branchId),
    getTopSellingItems(params, 1, branchId),
    getCategorySales(params, branchId),
    getOrderTypeSales(params, branchId),
  ]);

  const totalRevenue = dailySales.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = dailySales.reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Find peak hour
  const peakHour = hourlySales.reduce((max, h) => h.orders > max.orders ? h : max, hourlySales[0]);

  // Find peak day
  const peakDay = dailySales.reduce((max, d) => d.revenue > max.revenue ? d : max, dailySales[0]);

  const dineIn = orderTypeSales.find(o => o.type === 'dine-in') || { orders: 0, revenue: 0 };
  const takeaway = orderTypeSales.find(o => o.type === 'takeaway') || { orders: 0, revenue: 0 };

  return {
    gross_revenue: totalRevenue,
    net_revenue: totalRevenue, // No tax deduction per user request
    total_orders: totalOrders,
    avg_order_value: avgOrderValue,
    dine_in_orders: dineIn.orders,
    dine_in_revenue: dineIn.revenue,
    takeaway_orders: takeaway.orders,
    takeaway_revenue: takeaway.revenue,
    peak_hour: peakHour?.hour ?? 12,
    peak_day: peakDay?.date || '',
    top_item: topItems[0]?.name || 'N/A',
    top_category: categorySales[0]?.category || 'N/A',
  };
}

// ===== DISCOUNT REPORT =====

export interface DiscountDetail {
  order_id: string;
  order_number: string;
  date: string;
  discount_amount: number;
  original_total: number;
  final_total: number;
  staff_name: string;
  staff_id: string;
}

export interface DailyDiscount {
  date: string;
  total_discount: number;
  order_count: number;
}

export interface DiscountReport {
  dailyDiscounts: DailyDiscount[];
  discountDetails: DiscountDetail[];
  totalDiscount: number;
  orderCount: number;
}

export async function getDiscountReport(params: DateRangeParams, branchId?: string): Promise<DiscountReport> {
  // Query orders with discount_amount > 0
  let query = supabase
    .from('orders')
    .select('id, order_number, created_at, discount_amount, subtotal, total_amount, created_by, branch_id')
    .gte('created_at', params.startDate.toISOString())
    .lte('created_at', params.endDate.toISOString())
    .gt('discount_amount', 0)
    .in('order_status', ['PAID', 'CLOSED']);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data: orders, error } = await query;

  if (error) throw error;

  // Get staff user_ids from orders
  const staffIds = [...new Set((orders || []).map(o => o.created_by).filter(Boolean))];
  
  // Fetch profiles for staff names
  let profilesMap: Record<string, string> = {};
  if (staffIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', staffIds);
    
    (profiles || []).forEach(p => {
      profilesMap[p.user_id] = p.full_name || 'Unknown Staff';
    });
  }

  // Build discount details
  const discountDetails: DiscountDetail[] = (orders || []).map(order => ({
    order_id: order.id,
    order_number: order.order_number || order.id.slice(0, 8),
    date: order.created_at?.split('T')[0] || '',
    discount_amount: Number(order.discount_amount) || 0,
    original_total: (Number(order.subtotal) || 0) + (Number(order.discount_amount) || 0),
    final_total: Number(order.total_amount) || 0,
    staff_name: order.created_by ? (profilesMap[order.created_by] || 'Unknown Staff') : 'Unknown',
    staff_id: order.created_by || '',
  }));

  // Aggregate daily discounts
  const dailyMap: Record<string, { total_discount: number; order_count: number }> = {};
  
  discountDetails.forEach(d => {
    if (!dailyMap[d.date]) {
      dailyMap[d.date] = { total_discount: 0, order_count: 0 };
    }
    dailyMap[d.date].total_discount += d.discount_amount;
    dailyMap[d.date].order_count += 1;
  });

  const dailyDiscounts: DailyDiscount[] = Object.entries(dailyMap)
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalDiscount = discountDetails.reduce((sum, d) => sum + d.discount_amount, 0);
  const orderCount = discountDetails.length;

  return {
    dailyDiscounts,
    discountDetails,
    totalDiscount,
    orderCount,
  };
}

// ===== FOC REPORT =====

export interface FOCDetail {
  order_id: string;
  order_number: string;
  date: string;
  dancer_name: string;
  items: string[];
  total_value: number;
  staff_name: string;
  staff_id: string;
}

export interface FOCReport {
  focDetails: FOCDetail[];
  totalFOCValue: number;
  focCount: number;
  dancerSummary: { dancer: string; count: number; value: number }[];
}

export async function getFOCReport(params: DateRangeParams, branchId?: string): Promise<FOCReport> {
  let query = supabase
    .from('orders')
    .select('id, order_number, created_at, subtotal, created_by, foc_dancer_name, branch_id, order_items(quantity, menu_item:menu_items(name, price))')
    .eq('is_foc', true)
    .gte('created_at', params.startDate.toISOString())
    .lte('created_at', params.endDate.toISOString())
    .in('order_status', ['PAID', 'CLOSED']);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data: orders, error } = await query;
  if (error) throw error;

  const staffIds = [...new Set((orders || []).map(o => o.created_by).filter(Boolean))];
  let profilesMap: Record<string, string> = {};
  if (staffIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', staffIds);
    (profiles || []).forEach(p => {
      profilesMap[p.user_id] = p.full_name || 'Unknown Staff';
    });
  }

  const focDetails: FOCDetail[] = (orders || []).map(order => {
    const items = ((order as any).order_items || []).map((oi: any) => 
      `${oi.quantity}x ${oi.menu_item?.name || 'Item'}`
    );
    return {
      order_id: order.id,
      order_number: order.order_number || order.id.slice(0, 8),
      date: order.created_at?.split('T')[0] || '',
      dancer_name: order.foc_dancer_name || 'Unknown',
      items,
      total_value: Number(order.subtotal) || 0,
      staff_name: order.created_by ? (profilesMap[order.created_by] || 'Unknown Staff') : 'Unknown',
      staff_id: order.created_by || '',
    };
  });

  const totalFOCValue = focDetails.reduce((sum, d) => sum + d.total_value, 0);

  // Dancer summary
  const dancerMap: Record<string, { count: number; value: number }> = {};
  focDetails.forEach(d => {
    if (!dancerMap[d.dancer_name]) dancerMap[d.dancer_name] = { count: 0, value: 0 };
    dancerMap[d.dancer_name].count += 1;
    dancerMap[d.dancer_name].value += d.total_value;
  });
  const dancerSummary = Object.entries(dancerMap)
    .map(([dancer, stats]) => ({ dancer, ...stats }))
    .sort((a, b) => b.value - a.value);

  return { focDetails, totalFOCValue, focCount: focDetails.length, dancerSummary };
}

export async function getReportingSummary(params: DateRangeParams, branchId?: string) {
  const [
    dailySales, 
    hourlySales, 
    topItems, 
    categorySales, 
    staffPerformance, 
    paymentBreakdown,
    orderTypeSales,
    itemSalesDetails,
    salesSummary,
    discountReport,
    focReport
  ] = await Promise.all([
    getDailySales(params, branchId),
    getHourlySales(params, branchId),
    getTopSellingItems(params, 10, branchId),
    getCategorySales(params, branchId),
    getStaffPerformance(params, branchId),
    getPaymentBreakdown(params, branchId),
    getOrderTypeSales(params, branchId),
    getItemSalesDetails(params, branchId),
    getSalesSummary(params, branchId),
    getDiscountReport(params, branchId),
    getFOCReport(params, branchId),
  ]);

  const totalRevenue = dailySales.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = dailySales.reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Find peak hour
  const peakHour = hourlySales.reduce((max, h) => h.orders > max.orders ? h : max, hourlySales[0]);

  return {
    dailySales,
    hourlySales,
    topItems,
    categorySales,
    staffPerformance,
    paymentBreakdown,
    orderTypeSales,
    itemSalesDetails,
    salesSummary,
    discountReport,
    focReport,
    totalRevenue,
    totalOrders,
    avgOrderValue,
    peakHour: peakHour?.hour ?? 12,
  };
}