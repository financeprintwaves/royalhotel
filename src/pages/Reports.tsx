import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, BarChart3, TrendingUp, CreditCard, DollarSign, ShoppingCart } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { getReportingSummary, type DailySales, type TopSellingItem, type PaymentBreakdown } from '@/services/reportingService';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--info))'];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 14 | 30>(7);
  const [data, setData] = useState<{
    dailySales: DailySales[];
    topItems: TopSellingItem[];
    paymentBreakdown: PaymentBreakdown[];
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const result = await getReportingSummary(period);
      setData(result);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
        </Button>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="font-bold text-lg">Reports</h1>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Period Selector */}
        <Tabs value={String(period)} onValueChange={v => setPeriod(Number(v) as 7 | 14 | 30)}>
          <TabsList>
            <TabsTrigger value="7">Last 7 Days</TabsTrigger>
            <TabsTrigger value="14">Last 14 Days</TabsTrigger>
            <TabsTrigger value="30">Last 30 Days</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading reports...</div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${data.totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Last {period} days</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totalOrders}</div>
                  <p className="text-xs text-muted-foreground">Last {period} days</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${data.avgOrderValue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Last {period} days</p>
                </CardContent>
              </Card>
            </div>

            {/* Sales Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.dailySales}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        className="text-xs"
                      />
                      <YAxis tickFormatter={(v) => `$${v}`} className="text-xs" />
                      <Tooltip 
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Top Selling Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.topItems} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={100}
                          className="text-xs"
                          tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + '...' : v}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            name === 'quantity' ? `${value} sold` : `$${value.toFixed(2)}`,
                            name === 'quantity' ? 'Quantity' : 'Revenue'
                          ]}
                        />
                        <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Payment Methods
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.paymentBreakdown.length > 0 ? (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.paymentBreakdown}
                            dataKey="amount"
                            nameKey="method"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ method, percent }) => 
                              `${method} (${(percent * 100).toFixed(0)}%)`
                            }
                          >
                            {data.paymentBreakdown.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No payment data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">No data available</div>
        )}
      </main>
    </div>
  );
}
