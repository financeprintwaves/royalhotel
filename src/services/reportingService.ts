import { supabase } from '@/integrations/supabase/client';
import type { PaymentMethod } from '@/types/pos';

export interface DailySales {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopSellingItem {
  name: string;
  quantity: number;
  revenue: number;
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
  const [dailySales, topItems, paymentBreakdown] = await Promise.all([
    getDailySales(days),
    getTopSellingItems(5),
    getPaymentBreakdown(days),
  ]);

  const totalRevenue = dailySales.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = dailySales.reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    dailySales,
    topItems,
    paymentBreakdown,
    totalRevenue,
    totalOrders,
    avgOrderValue,
  };
}
