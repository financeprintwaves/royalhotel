import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ArrowLeft, TrendingUp, TrendingDown, BarChart3, Calendar, Users, Package,
  DollarSign, Target, AlertTriangle, CheckCircle, Clock, Zap, PieChart as PieChartIcon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import {
  generateSalesForecast,
  getSalesForecasts,
  generateInventoryForecast,
  getInventoryForecasts,
  generateStaffingForecast,
  getStaffingForecasts,
  performTrendAnalysis,
  getTrendAnalyses,
  createCustomReport,
  getCustomReports
} from '@/services/forecastingService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import DateRangePicker, { type DateRange } from '@/components/DateRangePicker';
import BranchSelector from '@/components/BranchSelector';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)', // green
  'hsl(38, 92%, 50%)', // amber
  'hsl(217, 91%, 60%)', // blue
  'hsl(280, 87%, 65%)', // purple
  'hsl(346, 77%, 49%)' // red
];

export default function ForecastingDashboard() {
  const { profile, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sales');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  // Sales Forecast State
  const [salesForecasts, setSalesForecasts] = useState<any[]>([]);
  const [salesForecastDate, setSalesForecastDate] = useState(
    format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );

  // Inventory Forecast State
  const [inventoryForecasts, setInventoryForecasts] = useState<any[]>([]);
  const [inventoryForecastDate, setInventoryForecastDate] = useState(
    format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );

  // Staffing Forecast State
  const [staffingForecasts, setStaffingForecasts] = useState<any[]>([]);
  const [staffingForecastDate, setStaffingForecastDate] = useState(
    format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  );

  // Trend Analysis State
  const [trendAnalyses, setTrendAnalyses] = useState<any[]>([]);
  const [trendAnalysisType, setTrendAnalysisType] = useState<'seasonal' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [trendDataType, setTrendDataType] = useState<'sales' | 'orders' | 'customers' | 'items'>('sales');

  // Custom Reports State
  const [customReports, setCustomReports] = useState<any[]>([]);
  const [newReportName, setNewReportName] = useState('');
  const [newReportType, setNewReportType] = useState<'sales' | 'inventory' | 'staff' | 'customer'>('sales');

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date())
  });

  // Set default branch for non-admins
  useEffect(() => {
    if (!isAdmin() && profile?.branch_id && !selectedBranchId) {
      setSelectedBranchId(profile.branch_id);
    }
  }, [profile?.branch_id, isAdmin, selectedBranchId]);

  useEffect(() => {
    if (selectedBranchId) {
      loadData();
    }
  }, [selectedBranchId, dateRange]);

  async function loadData() {
    if (!selectedBranchId) return;

    setLoading(true);
    try {
      // Load existing forecasts
      const [salesData, inventoryData, staffingData, trendData, reportsData] = await Promise.all([
        getSalesForecasts(selectedBranchId, dateRange.from.toISOString().split('T')[0], dateRange.to.toISOString().split('T')[0]),
        getInventoryForecasts(selectedBranchId, dateRange.from.toISOString().split('T')[0], dateRange.to.toISOString().split('T')[0]),
        getStaffingForecasts(selectedBranchId, dateRange.from.toISOString().split('T')[0], dateRange.to.toISOString().split('T')[0]),
        getTrendAnalyses(selectedBranchId),
        getCustomReports(selectedBranchId)
      ]);

      setSalesForecasts(salesData);
      setInventoryForecasts(inventoryData);
      setStaffingForecasts(staffingData);
      setTrendAnalyses(trendData);
      setCustomReports(reportsData);
    } catch (error) {
      console.error('Error loading forecast data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load forecast data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateSalesForecast() {
    if (!selectedBranchId) return;

    setLoading(true);
    try {
      await generateSalesForecast(selectedBranchId, salesForecastDate, 'daily');
      toast({
        title: 'Success',
        description: 'Sales forecast generated successfully'
      });
      loadData();
    } catch (error) {
      console.error('Error generating sales forecast:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate sales forecast',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateInventoryForecast() {
    if (!selectedBranchId) return;

    setLoading(true);
    try {
      // Generate forecasts for all menu items
      const { data: menuItems, error } = await supabase
        .from('menu_items')
        .select('id')
        .eq('branch_id', selectedBranchId)
        .eq('is_active', true);

      if (error) throw error;

      await Promise.all(
        menuItems.map(item =>
          generateInventoryForecast(selectedBranchId, item.id, inventoryForecastDate)
        )
      );

      toast({
        title: 'Success',
        description: 'Inventory forecasts generated successfully'
      });
      loadData();
    } catch (error) {
      console.error('Error generating inventory forecast:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate inventory forecasts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateStaffingForecast() {
    if (!selectedBranchId) return;

    setLoading(true);
    try {
      await generateStaffingForecast(selectedBranchId, staffingForecastDate);
      toast({
        title: 'Success',
        description: 'Staffing forecast generated successfully'
      });
      loadData();
    } catch (error) {
      console.error('Error generating staffing forecast:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate staffing forecast',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handlePerformTrendAnalysis() {
    if (!selectedBranchId) return;

    setLoading(true);
    try {
      await performTrendAnalysis(
        selectedBranchId,
        trendAnalysisType,
        trendDataType,
        dateRange.from.toISOString().split('T')[0],
        dateRange.to.toISOString().split('T')[0]
      );
      toast({
        title: 'Success',
        description: 'Trend analysis completed successfully'
      });
      loadData();
    } catch (error) {
      console.error('Error performing trend analysis:', error);
      toast({
        title: 'Error',
        description: 'Failed to perform trend analysis',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCustomReport() {
    if (!selectedBranchId || !newReportName.trim()) return;

    setLoading(true);
    try {
      await createCustomReport({
        branch_id: selectedBranchId,
        name: newReportName,
        report_type: newReportType,
        config: {
          dateRange: {
            start: dateRange.from.toISOString().split('T')[0],
            end: dateRange.to.toISOString().split('T')[0]
          },
          filters: {},
          metrics: ['total_sales', 'total_orders', 'average_order_value'],
          chartType: 'bar'
        },
        is_active: true,
        created_by: profile?.id
      });

      setNewReportName('');
      toast({
        title: 'Success',
        description: 'Custom report created successfully'
      });
      loadData();
    } catch (error) {
      console.error('Error creating custom report:', error);
      toast({
        title: 'Error',
        description: 'Failed to create custom report',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Advanced Forecasting & Analytics</h1>
              <p className="text-gray-600">AI-powered predictions and trend analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <BranchSelector
              selectedBranchId={selectedBranchId}
              onBranchChange={setSelectedBranchId}
            />
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="sales">Sales Forecast</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Forecast</TabsTrigger>
            <TabsTrigger value="staffing">Staffing Forecast</TabsTrigger>
            <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
            <TabsTrigger value="reports">Custom Reports</TabsTrigger>
          </TabsList>

          {/* Sales Forecast Tab */}
          <TabsContent value="sales" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Sales Forecasting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sales-date">Forecast Date</Label>
                    <Input
                      id="sales-date"
                      type="date"
                      value={salesForecastDate}
                      onChange={(e) => setSalesForecastDate(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleGenerateSalesForecast}
                    disabled={loading || !selectedBranchId}
                    className="mt-8"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Generate Forecast
                  </Button>
                </div>

                {salesForecasts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Forecast Results</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {salesForecasts.slice(-7).map((forecast, index) => (
                        <Card key={forecast.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-gray-600">
                                  {format(new Date(forecast.forecast_date), 'MMM dd')}
                                </p>
                                <p className="text-2xl font-bold">
                                  ${forecast.predicted_revenue.toFixed(0)}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {forecast.predicted_orders} orders
                                </p>
                              </div>
                              <Badge variant={forecast.confidence_score > 0.7 ? 'default' : 'secondary'}>
                                {Math.round(forecast.confidence_score * 100)}%
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={salesForecasts.slice(-14)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="forecast_date"
                          tickFormatter={(date) => format(new Date(date), 'MMM dd')}
                        />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                          formatter={(value, name) => [
                            name === 'predicted_revenue' ? `$${value.toFixed(0)}` : value,
                            name === 'predicted_revenue' ? 'Revenue' : 'Orders'
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="predicted_revenue"
                          stroke={CHART_COLORS[0]}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Forecast Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Inventory Forecasting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inventory-date">Forecast Date</Label>
                    <Input
                      id="inventory-date"
                      type="date"
                      value={inventoryForecastDate}
                      onChange={(e) => setInventoryForecastDate(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleGenerateInventoryForecast}
                    disabled={loading || !selectedBranchId}
                    className="mt-8"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Generate Forecasts
                  </Button>
                </div>

                {inventoryForecasts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Low Stock Alerts</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Predicted Demand</TableHead>
                          <TableHead>Safety Stock</TableHead>
                          <TableHead>Reorder Point</TableHead>
                          <TableHead>Confidence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryForecasts.slice(0, 10).map((forecast) => (
                          <TableRow key={forecast.id}>
                            <TableCell>{forecast.menu_items?.name || 'Unknown Item'}</TableCell>
                            <TableCell>{forecast.predicted_demand.toFixed(1)}</TableCell>
                            <TableCell>{forecast.safety_stock_level?.toFixed(1) || 'N/A'}</TableCell>
                            <TableCell>{forecast.reorder_point?.toFixed(1) || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant={forecast.confidence_score > 0.7 ? 'default' : 'secondary'}>
                                {Math.round(forecast.confidence_score * 100)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staffing Forecast Tab */}
          <TabsContent value="staffing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Staffing Forecasting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="staffing-date">Forecast Date</Label>
                    <Input
                      id="staffing-date"
                      type="date"
                      value={staffingForecastDate}
                      onChange={(e) => setStaffingForecastDate(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleGenerateStaffingForecast}
                    disabled={loading || !selectedBranchId}
                    className="mt-8"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Generate Forecast
                  </Button>
                </div>

                {staffingForecasts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Staff Requirements by Shift</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {staffingForecasts.slice(-4).map((forecast) => (
                        <Card key={forecast.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold capitalize">{forecast.shift_type}</h4>
                              <Badge variant="outline">
                                {forecast.predicted_staff_needed} staff
                              </Badge>
                            </div>
                            {forecast.peak_hour_prediction && (
                              <p className="text-sm text-gray-600">
                                Peak: {forecast.peak_hour_prediction.split(':')[0]}:00
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trend Analysis Tab */}
          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Trend Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <Label>Analysis Type</Label>
                    <Select value={trendAnalysisType} onValueChange={(value: any) => setTrendAnalysisType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seasonal">Seasonal</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data Type</Label>
                    <Select value={trendDataType} onValueChange={(value: any) => setTrendDataType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="orders">Orders</SelectItem>
                        <SelectItem value="customers">Customers</SelectItem>
                        <SelectItem value="items">Items</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handlePerformTrendAnalysis}
                    disabled={loading || !selectedBranchId}
                    className="mt-8"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analyze Trends
                  </Button>
                </div>

                {trendAnalyses.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Analysis Results</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {trendAnalyses.slice(0, 4).map((analysis) => (
                        <Card key={analysis.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold capitalize">
                                {analysis.analysis_type} {analysis.data_type}
                              </h4>
                              <Badge variant={
                                analysis.trend_direction === 'increasing' ? 'default' :
                                analysis.trend_direction === 'decreasing' ? 'destructive' : 'secondary'
                              }>
                                {analysis.trend_direction}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              Strength: {Math.round(analysis.trend_strength * 100)}%
                            </p>
                            <p className="text-sm text-gray-600">
                              Seasonality: {Math.round(analysis.seasonality_score * 100)}%
                            </p>
                            {analysis.insights?.key_findings && (
                              <div className="mt-2">
                                <p className="text-xs font-medium">Key Finding:</p>
                                <p className="text-xs text-gray-600">
                                  {analysis.insights.key_findings[0]}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Custom Reports
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="report-name">Report Name</Label>
                    <Input
                      id="report-name"
                      value={newReportName}
                      onChange={(e) => setNewReportName(e.target.value)}
                      placeholder="Enter report name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Report Type</Label>
                    <Select value={newReportType} onValueChange={(value: any) => setNewReportType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sales">Sales Report</SelectItem>
                        <SelectItem value="inventory">Inventory Report</SelectItem>
                        <SelectItem value="staff">Staff Report</SelectItem>
                        <SelectItem value="customer">Customer Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleCreateCustomReport}
                    disabled={loading || !selectedBranchId || !newReportName.trim()}
                    className="mt-8"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Create Report
                  </Button>
                </div>

                {customReports.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Your Reports</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell className="font-medium">{report.name}</TableCell>
                            <TableCell className="capitalize">{report.report_type}</TableCell>
                            <TableCell>
                              {format(new Date(report.created_at), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={report.is_active ? 'default' : 'secondary'}>
                                {report.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}