import React, { useEffect, useState } from 'react';
import StaffAnalyticsService from '@/services/staffAnalyticsService';

interface StaffMetrics {
  staff_id: string;
  staff_name: string;
  branch_id: string;
  completed_orders: number;
  open_orders: number;
  revenue_generated: number;
  avg_order_completion_time: number;
  discount_orders: number;
}

interface StaffAnalyticsDashboardProps {
  branchId: string;
}

export default function StaffAnalyticsDashboard({ branchId }: StaffAnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<StaffMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await StaffAnalyticsService.getPerformanceMetrics(branchId);
        setMetrics(data);
      } catch (err) {
        setError((err as Error).message || 'Error fetching staff analytics');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [branchId]);

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading staff metrics...</div>;
  if (error) return <div className="p-4 text-sm text-danger">{error}</div>;

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xl font-bold">Staff Performance Dashboard</h2>
      <div className="overflow-auto rounded-lg border border-border bg-card">
        <table className="min-w-full divide-y divide-border text-left text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Staff</th>
              <th className="px-4 py-2">Completed</th>
              <th className="px-4 py-2">Open</th>
              <th className="px-4 py-2">Revenue</th>
              <th className="px-4 py-2">Avg Completion (s)</th>
              <th className="px-4 py-2">Discount Orders</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((row) => (
              <tr key={row.staff_id} className="border-t border-border hover:bg-muted/40">
                <td className="px-4 py-3 font-semibold">{row.staff_name}</td>
                <td className="px-4 py-3">{row.completed_orders}</td>
                <td className="px-4 py-3">{row.open_orders}</td>
                <td className="px-4 py-3">${row.revenue_generated?.toFixed(2) || '0.00'}</td>
                <td className="px-4 py-3">{row.avg_order_completion_time?.toFixed(1) || '0.0'}</td>
                <td className="px-4 py-3">{row.discount_orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
