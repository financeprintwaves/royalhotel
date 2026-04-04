import { supabase } from '@/integrations/supabase/client';

type StaffPerformance = {
  staff_id: string;
  staff_name: string;
  branch_id: string;
  completed_orders: number;
  open_orders: number;
  revenue_generated: number;
  avg_order_completion_time: number;
  discount_orders: number;
};

export class StaffAnalyticsService {
  static async getPerformanceMetrics(branchId: string): Promise<StaffPerformance[]> {
    const { data, error } = await (supabase as any)
      .from('staff_performance_metrics')
      .select('*')
      .eq('branch_id', branchId)
      .order('revenue_generated', { ascending: false });

    if (error) throw error;
    return (data || []) as StaffPerformance[];
  }

  static async getTopPerformers(branchId: string, limit = 5): Promise<StaffPerformance[]> {
    const { data, error } = await (supabase as any)
      .from('staff_performance_metrics')
      .select('*')
      .eq('branch_id', branchId)
      .order('completed_orders', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as StaffPerformance[];
  }

  static async getOrderCompletionTimes(branchId: string): Promise<StaffPerformance[]> {
    const { data, error } = await supabase
      .from('staff_performance_metrics')
      .select('staff_id, staff_name, avg_order_completion_time')
      .eq('branch_id', branchId)
      .order('avg_order_completion_time', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}

export default StaffAnalyticsService;
