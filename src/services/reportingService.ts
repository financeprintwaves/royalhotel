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

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id,
      total_amount,
      created_by,
      profiles:profiles!orders_created_by_fkey(display_name)
    `)
    .gte('created_at', startDate.toISOString())
    .in('order_status', ['PAID', 'CLOSED']);

  if (error) throw error;

  // Aggregate by staff
  const staffStats: Record<string, { 
    staff_name: string;
    orders_count: number; 
    total_revenue: number;
  }> = {};

  (orders || []).forEach(order => {
    const staffId = order.created_by || 'unknown';
    const staffName = (order.profiles as any)?.display_name || 'Unknown Staff';
    
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

export async function getReportingSummary(days: number = 7) {
  const [dailySales, hourlySales, topItems, categorySales, staffPerformance, paymentBreakdown] = await Promise.all([
    getDailySales(days),
    getHourlySales(days),
    getTopSellingItems(10),
    getCategorySales(days),
    getStaffPerformance(days),
    getPaymentBreakdown(days),
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
    totalRevenue,
    totalOrders,
    avgOrderValue,
    peakHour: peakHour?.hour ?? 12,
  };
}
