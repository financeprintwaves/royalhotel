import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, BarChart3, TrendingUp, CreditCard, DollarSign, ShoppingCart, 
  Clock, Users, PieChart as PieChartIcon, UtensilsCrossed, Package, FileText, Percent, Gift
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  getReportingSummary, 
  type DailySales, 
  type TopSellingItem, 
  type PaymentBreakdown,
  type HourlySales,
  type CategorySales,
  type StaffPerformance,
  type OrderTypeSales,
  type ItemSalesDetail,
  type SalesSummary,
  type DiscountReport,
  type DailyDiscount,
  type DiscountDetail,
  type FOCReport,
  type FOCDetail,
} from '@/services/reportingService';
import DateRangePicker, { type DateRange } from '@/components/DateRangePicker';
import ExportButtons from '@/components/ExportButtons';
import BranchSelector from '@/components/BranchSelector';
import { useAuth } from '@/contexts/AuthContext';

const CHART_COLORS = [
  'hsl(var(--primary))', 
  'hsl(142, 76%, 36%)', // green
  'hsl(38, 92%, 50%)', // amber
  'hsl(217, 91%, 60%)', // blue
  'hsl(280, 87%, 65%)', // purple
  'hsl(346, 77%, 49%)' // red
];

export default function Reports() {
  const { profile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(subDays(new Date(), 6)),
    to: endOfDay(new Date())
  });
  const [data, setData] = useState<{
    dailySales: DailySales[];
    hourlySales: HourlySales[];
    topItems: TopSellingItem[];
    categorySales: CategorySales[];
    staffPerformance: StaffPerformance[];
    paymentBreakdown: PaymentBreakdown[];
    orderTypeSales: OrderTypeSales[];
    itemSalesDetails: ItemSalesDetail[];
    salesSummary: SalesSummary;
    discountReport: DiscountReport;
    focReport: FOCReport;
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    peakHour: number;
  } | null>(null);

  // Set default branch for non-admins
  useEffect(() => {
    if (!isAdmin() && profile?.branch_id && !selectedBranchId) {
      setSelectedBranchId(profile.branch_id);
    }
  }, [profile?.branch_id, isAdmin, selectedBranchId]);

  useEffect(() => {
    loadData();
  }, [dateRange, selectedBranchId]);

  async function loadData() {
    setLoading(true);
    try {
      const result = await getReportingSummary({
        startDate: dateRange.from,
        endDate: dateRange.to
      }, selectedBranchId || undefined);
      setData(result);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatHour(hour: number) {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
        </Button>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="font-bold text-lg">Reports & Analytics</h1>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Date Range & Export Controls */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <DateRangePicker 
              dateRange={dateRange} 
              onDateRangeChange={setDateRange} 
            />
            <BranchSelector
              selectedBranchId={selectedBranchId}
              onBranchChange={setSelectedBranchId}
            />
            
            {/* Report Type Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="overflow-x-auto scrollbar-hide">
                <TabsList className="inline-flex w-auto min-w-max">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="sales">Sales</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="items">Items</TabsTrigger>
                  <TabsTrigger value="discounts">Discounts</TabsTrigger>
                  <TabsTrigger value="foc">FOC</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                </TabsList>
              </div>
            </Tabs>
          </div>

          {/* Export Buttons */}
          {data && (
            <ExportButtons 
              data={data} 
              dateRange={dateRange} 
              activeTab={activeTab} 
            />
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading reports...</div>
        ) : data ? (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.totalRevenue.toFixed(3)} OMR</div>
                      <p className="text-xs text-muted-foreground">Selected period</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.totalOrders}</div>
                      <p className="text-xs text-muted-foreground">Selected period</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.avgOrderValue.toFixed(3)} OMR</div>
                      <p className="text-xs text-muted-foreground">Selected period</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatHour(data.peakHour)}</div>
                      <p className="text-xs text-muted-foreground">Busiest time</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Daily Sales Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Sales Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data.dailySales}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            className="text-xs"
                          />
                          <YAxis tickFormatter={(v) => `${v} OMR`} className="text-xs" />
                          <Tooltip 
                            formatter={(value: number, name: string) => [
                              name === 'revenue' ? `${value.toFixed(3)} OMR` : value,
                              name === 'revenue' ? 'Revenue' : 'Orders'
                            ]}
                            labelFormatter={(label) => new Date(label).toLocaleDateString()}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="hsl(var(--primary))" 
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Staff Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Staff Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.staffPerformance.length > 0 ? (
                        <div className="space-y-4">
                          {data.staffPerformance.slice(0, 5).map((staff, index) => (
                            <div key={staff.staff_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium">{staff.staff_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {staff.orders_count} orders • Avg: {staff.avg_order_value.toFixed(3)} OMR
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{staff.total_revenue.toFixed(3)} OMR</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                          No staff performance data
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Order Type Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UtensilsCrossed className="h-4 w-4" />
                        Order Type Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {data.orderTypeSales.map((type) => {
                          const total = data.orderTypeSales.reduce((sum, t) => sum + t.revenue, 0);
                          const percentage = total > 0 ? (type.revenue / total) * 100 : 0;
                          
                          return (
                            <div key={type.type} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant={type.type === 'dine-in' ? 'default' : 'secondary'}>
                                    {type.type === 'dine-in' ? 'Dine-In' : 'Takeaway'}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {type.orders} orders
                                  </span>
                                </div>
                                <span className="font-bold">{type.revenue.toFixed(3)} OMR</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-muted rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${type.type === 'dine-in' ? 'bg-primary' : 'bg-secondary'}`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="text-sm text-muted-foreground min-w-[40px]">
                                  {percentage.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* Sales Tab */}
            {activeTab === 'sales' && (
              <>
                {/* Hourly Sales */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Sales by Hour
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.hourlySales.filter(h => h.orders > 0 || (h.hour >= 8 && h.hour <= 23))}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis 
                            dataKey="hour" 
                            tickFormatter={formatHour}
                            className="text-xs"
                          />
                          <YAxis className="text-xs" />
                          <Tooltip 
                            formatter={(value: number, name: string) => [
                              name === 'revenue' ? `${value.toFixed(3)} OMR` : value,
                              name === 'revenue' ? 'Revenue' : 'Orders'
                            ]}
                            labelFormatter={(h) => formatHour(h)}
                          />
                          <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Orders" />
                          <Bar dataKey="revenue" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Revenue" />
                        </BarChart>
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
                          <BarChart data={data.topItems.slice(0, 8)} layout="vertical">
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
                                name === 'quantity' ? `${value} sold` : `${value.toFixed(3)} OMR`,
                                name === 'quantity' ? 'Quantity' : 'Revenue'
                              ]}
                            />
                            <Bar dataKey="quantity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category Sales */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChartIcon className="h-4 w-4" />
                        Sales by Category
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.categorySales.length > 0 ? (
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={data.categorySales}
                                dataKey="revenue"
                                nameKey="category"
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label={({ category, percent }) => 
                                  `${category} (${(percent * 100).toFixed(0)}%)`
                                }
                              >
                                {data.categorySales.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => [`${value.toFixed(3)} OMR`, 'Revenue']} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          No category data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Payment Methods */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment Methods Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.paymentBreakdown.length > 0 ? (
                      <div className="space-y-4">
                        {data.paymentBreakdown.map((payment) => {
                          const total = data.paymentBreakdown.reduce((sum, p) => sum + p.amount, 0);
                          const percentage = total > 0 ? (payment.amount / total) * 100 : 0;
                          
                          return (
                            <div key={payment.method} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="capitalize font-medium">{payment.method}</span>
                                <span className="text-sm text-muted-foreground">
                                  {payment.count} transactions
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-muted rounded-full h-2">
                                  <div 
                                    className="h-2 rounded-full bg-primary" 
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="font-bold min-w-[80px] text-right">
                                  {payment.amount.toFixed(3)} OMR
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        No payment data available
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Distribution</CardTitle>
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
                            <Tooltip formatter={(value: number) => [`${value.toFixed(3)} OMR`, 'Amount']} />
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
            )}

            {/* Items Tab */}
            {activeTab === 'items' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Item-wise Sales Report
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2 font-medium">#</th>
                          <th className="text-left py-3 px-2 font-medium">Item Name</th>
                          <th className="text-left py-3 px-2 font-medium">Category</th>
                          <th className="text-right py-3 px-2 font-medium">Qty Sold</th>
                          <th className="text-right py-3 px-2 font-medium">Avg Price</th>
                          <th className="text-right py-3 px-2 font-medium">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.itemSalesDetails.map((item, index) => (
                          <tr key={item.name} className="border-b hover:bg-muted/50">
                            <td className="py-3 px-2 text-muted-foreground">{index + 1}</td>
                            <td className="py-3 px-2 font-medium">{item.name}</td>
                            <td className="py-3 px-2">
                              <Badge variant="outline">{item.category}</Badge>
                            </td>
                            <td className="py-3 px-2 text-right">{item.quantity}</td>
                            <td className="py-3 px-2 text-right">{item.avg_price.toFixed(3)} OMR</td>
                            <td className="py-3 px-2 text-right font-bold">{item.revenue.toFixed(3)} OMR</td>
                          </tr>
                        ))}
                        {data.itemSalesDetails.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-muted-foreground">
                              No item sales data available
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {data.itemSalesDetails.length > 0 && (
                        <tfoot>
                          <tr className="border-t-2 font-bold">
                            <td colSpan={3} className="py-3 px-2">Total</td>
                            <td className="py-3 px-2 text-right">
                              {data.itemSalesDetails.reduce((sum, i) => sum + i.quantity, 0)}
                            </td>
                            <td className="py-3 px-2 text-right">-</td>
                            <td className="py-3 px-2 text-right">
                              {data.itemSalesDetails.reduce((sum, i) => sum + i.revenue, 0).toFixed(3)} OMR
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Discounts Tab */}
            {activeTab === 'discounts' && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Total Discount Given</CardTitle>
                      <Percent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-destructive">
                        {data.discountReport.totalDiscount.toFixed(3)} OMR
                      </div>
                      <p className="text-xs text-muted-foreground">Selected period</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Orders with Discount</CardTitle>
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.discountReport.orderCount}</div>
                      <p className="text-xs text-muted-foreground">
                        {data.totalOrders > 0 
                          ? `${((data.discountReport.orderCount / data.totalOrders) * 100).toFixed(1)}% of total orders`
                          : 'No orders'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Avg Discount per Order</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {data.discountReport.orderCount > 0 
                          ? (data.discountReport.totalDiscount / data.discountReport.orderCount).toFixed(3)
                          : '0.000'} OMR
                      </div>
                      <p className="text-xs text-muted-foreground">Per discounted order</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Discount Rate</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {data.totalRevenue > 0 
                          ? ((data.discountReport.totalDiscount / (data.totalRevenue + data.discountReport.totalDiscount)) * 100).toFixed(2)
                          : '0.00'}%
                      </div>
                      <p className="text-xs text-muted-foreground">Of gross revenue</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Daily Discount Chart */}
                {data.discountReport.dailyDiscounts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Discount Trend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data.discountReport.dailyDiscounts}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="date" 
                              tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              className="text-xs"
                            />
                            <YAxis tickFormatter={(v) => `${v} OMR`} className="text-xs" />
                            <Tooltip 
                              formatter={(value: number, name: string) => [
                                name === 'total_discount' ? `${value.toFixed(3)} OMR` : value,
                                name === 'total_discount' ? 'Discount' : 'Orders'
                              ]}
                              labelFormatter={(label) => new Date(label).toLocaleDateString()}
                            />
                            <Bar dataKey="total_discount" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="total_discount" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Order-wise Discount Details Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Order-wise Discount Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2 font-medium">#</th>
                            <th className="text-left py-3 px-2 font-medium">Order #</th>
                            <th className="text-left py-3 px-2 font-medium">Date</th>
                            <th className="text-right py-3 px-2 font-medium">Original Amt</th>
                            <th className="text-right py-3 px-2 font-medium">Discount</th>
                            <th className="text-right py-3 px-2 font-medium">Final Amt</th>
                            <th className="text-left py-3 px-2 font-medium">Staff</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.discountReport.discountDetails.map((item, index) => (
                            <tr key={item.order_id} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-2 text-muted-foreground">{index + 1}</td>
                              <td className="py-3 px-2 font-mono text-xs">{item.order_number}</td>
                              <td className="py-3 px-2">
                                {new Date(item.date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </td>
                              <td className="py-3 px-2 text-right">{item.original_total.toFixed(3)} OMR</td>
                              <td className="py-3 px-2 text-right font-bold text-destructive">
                                -{item.discount_amount.toFixed(3)} OMR
                              </td>
                              <td className="py-3 px-2 text-right font-bold">{item.final_total.toFixed(3)} OMR</td>
                              <td className="py-3 px-2">
                                <Badge variant="outline">{item.staff_name}</Badge>
                              </td>
                            </tr>
                          ))}
                          {data.discountReport.discountDetails.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                No discounts given in this period
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {data.discountReport.discountDetails.length > 0 && (
                          <tfoot>
                            <tr className="border-t-2 font-bold">
                              <td colSpan={4} className="py-3 px-2">Total</td>
                              <td className="py-3 px-2 text-right text-destructive">
                                -{data.discountReport.totalDiscount.toFixed(3)} OMR
                              </td>
                              <td className="py-3 px-2 text-right">
                                {data.discountReport.discountDetails.reduce((sum, i) => sum + i.final_total, 0).toFixed(3)} OMR
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* FOC Tab */}
            {activeTab === 'foc' && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Total FOC Value</CardTitle>
                      <Gift className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {data.focReport.totalFOCValue.toFixed(3)} OMR
                      </div>
                      <p className="text-xs text-muted-foreground">Items given free</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">FOC Orders</CardTitle>
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.focReport.focCount}</div>
                      <p className="text-xs text-muted-foreground">Total FOC orders</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Persons</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{data.focReport.personSummary.length}</div>
                      <p className="text-xs text-muted-foreground">Unique persons</p>
                    </CardContent>
                  </Card>
                </div>

                {/* By Dancer Table */}
                {data.focReport.personSummary.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        FOC by Person
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-2 font-medium">Person</th>
                              <th className="text-right py-3 px-2 font-medium">Orders</th>
                              <th className="text-right py-3 px-2 font-medium">Total Value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.focReport.personSummary.map((d) => (
                              <tr key={d.person} className="border-b hover:bg-muted/50">
                                <td className="py-3 px-2 font-medium">{d.person}</td>
                                <td className="py-3 px-2 text-right">{d.count}</td>
                                <td className="py-3 px-2 text-right font-bold">{d.value.toFixed(3)} OMR</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 font-bold">
                              <td className="py-3 px-2">Total</td>
                              <td className="py-3 px-2 text-right">{data.focReport.focCount}</td>
                              <td className="py-3 px-2 text-right">{data.focReport.totalFOCValue.toFixed(3)} OMR</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* FOC Order Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      FOC Order Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2 font-medium">#</th>
                            <th className="text-left py-3 px-2 font-medium">Order #</th>
                            <th className="text-left py-3 px-2 font-medium">Date</th>
                            <th className="text-left py-3 px-2 font-medium">Person</th>
                            <th className="text-left py-3 px-2 font-medium">Items</th>
                            <th className="text-right py-3 px-2 font-medium">Value</th>
                            <th className="text-left py-3 px-2 font-medium">Staff</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.focReport.focDetails.map((item, index) => (
                            <tr key={item.order_id} className="border-b hover:bg-muted/50">
                              <td className="py-3 px-2 text-muted-foreground">{index + 1}</td>
                              <td className="py-3 px-2 font-mono text-xs">{item.order_number}</td>
                              <td className="py-3 px-2">
                                {new Date(item.date).toLocaleDateString('en-US', { 
                                  month: 'short', day: 'numeric', year: 'numeric'
                                })}
                              </td>
                              <td className="py-3 px-2 font-medium">{item.person_name}</td>
                              <td className="py-3 px-2 text-xs">{item.items.join(', ')}</td>
                              <td className="py-3 px-2 text-right font-bold">{item.total_value.toFixed(3)} OMR</td>
                              <td className="py-3 px-2">
                                <Badge variant="outline">{item.staff_name}</Badge>
                              </td>
                            </tr>
                          ))}
                          {data.focReport.focDetails.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                No FOC orders in this period
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {data.focReport.focDetails.length > 0 && (
                          <tfoot>
                            <tr className="border-t-2 font-bold">
                              <td colSpan={5} className="py-3 px-2">Total</td>
                              <td className="py-3 px-2 text-right">{data.focReport.totalFOCValue.toFixed(3)} OMR</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                {/* Summary Header */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Sales Summary Report
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="text-center p-4 bg-background rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                        <p className="text-3xl font-bold text-primary">{data.salesSummary.gross_revenue.toFixed(3)} OMR</p>
                      </div>
                      <div className="text-center p-4 bg-background rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Total Orders</p>
                        <p className="text-3xl font-bold">{data.salesSummary.total_orders}</p>
                      </div>
                      <div className="text-center p-4 bg-background rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Average Order Value</p>
                        <p className="text-3xl font-bold">{data.salesSummary.avg_order_value.toFixed(3)} OMR</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Order Type Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Type Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              <UtensilsCrossed className="h-4 w-4" /> Dine-In
                            </p>
                            <p className="text-sm text-muted-foreground">{data.salesSummary.dine_in_orders} orders</p>
                          </div>
                          <p className="text-xl font-bold">{data.salesSummary.dine_in_revenue.toFixed(3)} OMR</p>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium flex items-center gap-2">
                              <Package className="h-4 w-4" /> Takeaway
                            </p>
                            <p className="text-sm text-muted-foreground">{data.salesSummary.takeaway_orders} orders</p>
                          </div>
                          <p className="text-xl font-bold">{data.salesSummary.takeaway_revenue.toFixed(3)} OMR</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Insights */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Key Insights</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 border-b">
                          <span className="text-muted-foreground">Peak Hour</span>
                          <span className="font-medium">{formatHour(data.salesSummary.peak_hour)}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 border-b">
                          <span className="text-muted-foreground">Best Day</span>
                          <span className="font-medium">
                            {data.salesSummary.peak_day ? new Date(data.salesSummary.peak_day).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'N/A'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 border-b">
                          <span className="text-muted-foreground">Top Selling Item</span>
                          <span className="font-medium">{data.salesSummary.top_item}</span>
                        </div>
                        <div className="flex items-center justify-between p-3">
                          <span className="text-muted-foreground">Top Category</span>
                          <span className="font-medium">{data.salesSummary.top_category}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-4">
                      {data.paymentBreakdown.map((payment) => (
                        <div key={payment.method} className="text-center p-4 bg-muted/50 rounded-lg">
                          <p className="text-sm text-muted-foreground capitalize mb-1">{payment.method}</p>
                          <p className="text-xl font-bold">{payment.amount.toFixed(3)} OMR</p>
                          <p className="text-xs text-muted-foreground">{payment.count} transactions</p>
                        </div>
                      ))}
                      {data.paymentBreakdown.length === 0 && (
                        <p className="col-span-4 text-center py-4 text-muted-foreground">No payment data</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">No data available</div>
        )}
      </main>
    </div>
  );
}
