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

export async function getDailySales(days: number = 7): Promise<DailySales[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data: orders, error } = await supabase
    .from('orders')
    .select('created_at, total_amount, order_status')
    .gte('created_at', startDate.toISOString())
    .in('order_status', ['PAID', 'CLOSED']);

  if (error) throw error;

  // Group by date
  const salesByDate: Record<string, { revenue: number; orders: number }> = {};
  
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    salesByDate[dateStr] = { revenue: 0, orders: 0 };
  }

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

export async function getHourlySales(days: number = 7): Promise<HourlySales[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const { data: orders, error } = await supabase
    .from('orders')
    .select('created_at, total_amount, order_status')
    .gte('created_at', startDate.toISOString())
    .in('order_status', ['PAID', 'CLOSED']);

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

export async function getTopSellingItems(limit: number = 10): Promise<TopSellingItem[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const { data, error } = await supabase
    .from('order_items')
    .select(`
      quantity,
      total_price,
      menu_item:menu_items(name),
      order:orders!inner(order_status, created_at)
    `)
    .gte('order.created_at', startDate.toISOString())
    .in('order.order_status', ['PAID', 'CLOSED']);

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

export async function getCategorySales(days: number = 30): Promise<CategorySales[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('order_items')
    .select(`
      quantity,
      total_price,
      menu_item:menu_items(category:categories(name)),
      order:orders!inner(order_status, created_at)
    `)
    .gte('order.created_at', startDate.toISOString())
    .in('order.order_status', ['PAID', 'CLOSED']);

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

export async function getStaffPerformance(days: number = 30): Promise<StaffPerformance[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get orders with created_by
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, total_amount, created_by')
    .gte('created_at', startDate.toISOString())
    .in('order_status', ['PAID', 'CLOSED']);

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

export async function getPaymentBreakdown(days: number = 30): Promise<PaymentBreakdown[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('payments')
    .select('payment_method, amount')
    .eq('payment_status', 'paid')
    .gte('created_at', startDate.toISOString());

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

export async function getOrderTypeSales(days: number = 30): Promise<OrderTypeSales[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: orders, error } = await supabase
    .from('orders')
    .select('table_id, total_amount')
    .gte('created_at', startDate.toISOString())
    .in('order_status', ['PAID', 'CLOSED']);

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

export async function getItemSalesDetails(days: number = 30): Promise<ItemSalesDetail[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('order_items')
    .select(`
      quantity,
      total_price,
      unit_price,
      menu_item:menu_items(name, category:categories(name)),
      order:orders!inner(order_status, created_at)
    `)
    .gte('order.created_at', startDate.toISOString())
    .in('order.order_status', ['PAID', 'CLOSED']);

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

export async function getSalesSummary(days: number = 7): Promise<SalesSummary> {
  const [dailySales, hourlySales, topItems, categorySales, orderTypeSales] = await Promise.all([
    getDailySales(days),
    getHourlySales(days),
    getTopSellingItems(1),
    getCategorySales(days),
    getOrderTypeSales(days),
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

export async function getReportingSummary(days: number = 7) {
  const [
    dailySales, 
    hourlySales, 
    topItems, 
    categorySales, 
    staffPerformance, 
    paymentBreakdown,
    orderTypeSales,
    itemSalesDetails,
    salesSummary
  ] = await Promise.all([
    getDailySales(days),
    getHourlySales(days),
    getTopSellingItems(10),
    getCategorySales(days),
    getStaffPerformance(days),
    getPaymentBreakdown(days),
    getOrderTypeSales(days),
    getItemSalesDetails(days),
    getSalesSummary(days),
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
    totalRevenue,
    totalOrders,
    avgOrderValue,
    peakHour: peakHour?.hour ?? 12,
  };
}
