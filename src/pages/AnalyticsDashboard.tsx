import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, TrendingUp, Users, ShoppingCart, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  getSalesSummary,
  getPerformanceTrends,
  getStaffPerformanceLeaderboard,
  getTopSellingItems,
  getTopCustomers
} from '@/services/analyticsService';

export default function AnalyticsDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [salebSummary, setSalesSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [staffLeaderboard, setStaffLeaderboard] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.branch_id) return;
    loadAnalytics();
  }, [profile?.branch_id]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      const [summary, trendsData, staff, items, customers] = await Promise.all([
        getSalesSummary(profile?.branch_id || '', 30),
        getPerformanceTrends(profile?.branch_id || '', 30),
        getStaffPerformanceLeaderboard(profile?.branch_id || '', 30),
        getTopSellingItems(profile?.branch_id || '', 30),
        getTopCustomers(profile?.branch_id || '', 10)
      ]);

      setSalesSummary(summary);
      setTrends(trendsData || []);
      setStaffLeaderboard(staff || []);
      setTopItems(items || []);
      setTopCustomers(customers || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load analytics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="border-b bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Analytics Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{salebSummary?.total_orders || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Sales (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                OMR {(salebSummary?.total_sales || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                OMR {(salebSummary?.avg_aov || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Per order</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{staffLeaderboard.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Staff tracked</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Staff Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Staff Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {staffLeaderboard.length > 0 ? (
                  staffLeaderboard.slice(0, 5).map((staff, i) => (
                    <div key={staff.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Rank #{i + 1}</div>
                        <div className="text-sm text-muted-foreground">
                          {staff.incentive_points} points
                        </div>
                      </div>
                      <Badge>{staff.total_sales?.toFixed(0) || 0} OMR</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No staff performance data</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Customers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Customers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCustomers.length > 0 ? (
                  topCustomers.slice(0, 5).map((customer, i) => (
                    <div key={customer.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Customer {i + 1}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.total_orders} orders
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {(customer.total_spent || 0).toFixed(0)} OMR
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No customer data</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Selling Items */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Top Selling Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {topItems.length > 0 ? (
                  topItems.slice(0, 10).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.menu_item?.name || 'Unknown Item'}</div>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Qty: </span>
                          <span className="font-semibold">{item.quantity_sold}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Revenue: </span>
                          <span className="font-semibold">OMR {(item.revenue || 0).toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No item data</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
