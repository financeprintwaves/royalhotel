import { supabase } from '@/integrations/supabase/client';
const db = supabase as any;
import {
  SalesForecast,
  InventoryForecast,
  StaffingForecast,
  CustomReport,
  ReportSchedule,
  TrendAnalysis,
  ForecastFactors
} from '@/types/pos';

// Sales Forecasting Functions
export async function generateSalesForecast(
  branchId: string,
  forecastDate: string,
  forecastType: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<SalesForecast> {
  const { data, error } = await db
    .rpc('generate_sales_forecast', {
      p_branch_id: branchId,
      p_forecast_date: forecastDate,
      p_forecast_type: forecastType
    });

  if (error) throw error;

  // Insert the forecast into the database
  const { data: forecast, error: insertError } = await db
    .from('sales_forecasts')
    .insert({
      branch_id: branchId,
      forecast_date: forecastDate,
      forecast_type: forecastType,
      predicted_revenue: data.predicted_revenue,
      predicted_orders: data.predicted_orders,
      confidence_score: data.confidence_score,
      factors: data.factors
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return forecast;
}

export async function getSalesForecasts(
  branchId: string,
  startDate: string,
  endDate: string
): Promise<SalesForecast[]> {
  const { data, error } = await db
    .from('sales_forecasts')
    .select('*')
    .eq('branch_id', branchId)
    .gte('forecast_date', startDate)
    .lte('forecast_date', endDate)
    .order('forecast_date', { ascending: true });

  if (error) throw error;
  return data;
}

export async function updateForecastAccuracy(
  forecastId: string,
  actualRevenue: number,
  actualOrders: number
): Promise<SalesForecast> {
  const { data, error } = await db
    .from('sales_forecasts')
    .update({
      actual_revenue: actualRevenue,
      actual_orders: actualOrders,
      accuracy_score: null // Will be calculated by a trigger or function
    })
    .eq('id', forecastId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Inventory Forecasting Functions
export async function generateInventoryForecast(
  branchId: string,
  itemId: string,
  forecastDate: string
): Promise<InventoryForecast> {
  // Calculate predicted demand based on historical data
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: historicalData, error: histError } = await db
    .from('order_items')
    .select('quantity, orders!inner(created_at)')
    .eq('menu_item_id', itemId)
    .gte('orders.created_at', thirtyDaysAgo.toISOString())
    .eq('orders.status', 'paid');

  if (histError) throw histError;

  const totalQuantity = historicalData.reduce((sum, item) => sum + item.quantity, 0);
  const avgDailyDemand = totalQuantity / 30;
  const predictedDemand = Math.max(0, avgDailyDemand);

  // Calculate safety stock (7 days worth)
  const safetyStockLevel = avgDailyDemand * 7;

  // Calculate reorder point (3 days worth)
  const reorderPoint = avgDailyDemand * 3;

  // Calculate confidence score based on data availability
  const dataPoints = historicalData.length;
  const confidenceScore = Math.min(0.9, Math.max(0.3, dataPoints / 100));

  const { data, error } = await db
    .from('inventory_forecasts')
    .insert({
      branch_id: branchId,
      item_id: itemId,
      forecast_date: forecastDate,
      predicted_demand: predictedDemand,
      safety_stock_level: safetyStockLevel,
      reorder_point: reorderPoint,
      confidence_score: confidenceScore,
      factors: {
        historical_avg_daily: avgDailyDemand,
        data_points: dataPoints,
        calculation_period_days: 30
      }
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getInventoryForecasts(
  branchId: string,
  startDate: string,
  endDate: string
): Promise<InventoryForecast[]> {
  const { data, error } = await db
    .from('inventory_forecasts')
    .select(`
      *,
      menu_items(name, category_id)
    `)
    .eq('branch_id', branchId)
    .gte('forecast_date', startDate)
    .lte('forecast_date', endDate)
    .order('forecast_date', { ascending: true });

  if (error) throw error;
  return data;
}

// Staffing Forecasting Functions
export async function generateStaffingForecast(
  branchId: string,
  forecastDate: string
): Promise<StaffingForecast[]> {
  const forecasts: StaffingForecast[] = [];
  const shifts = ['morning', 'afternoon', 'evening', 'night'] as const;

  for (const shiftType of shifts) {
    // Get historical data for this shift
    const { data: shiftData, error } = await db
      .from('orders')
      .select('created_at, total_amount')
      .eq('branch_id', branchId)
      .eq('status', 'paid')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .lte('created_at', new Date().toISOString());

    if (error) throw error;

    // Calculate shift-specific metrics
    const shiftOrders = shiftData.filter(order => {
      const hour = new Date(order.created_at).getHours();
      switch (shiftType) {
        case 'morning': return hour >= 6 && hour < 12;
        case 'afternoon': return hour >= 12 && hour < 18;
        case 'evening': return hour >= 18 && hour < 22;
        case 'night': return hour >= 22 || hour < 6;
        default: return false;
      }
    });

    const avgOrdersPerShift = shiftOrders.length / 90; // 90 days of data
    const avgRevenuePerShift = shiftOrders.reduce((sum, order) => sum + order.total_amount, 0) / 90;

    // Estimate staff needed based on orders and revenue
    const predictedStaffNeeded = Math.max(1, Math.ceil(avgOrdersPerShift / 5)); // 1 staff per 5 orders

    // Find peak hour for this shift
    const hourCounts = shiftOrders.reduce((acc, order) => {
      const hour = new Date(order.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakHour = Object.entries(hourCounts).reduce((a, b) =>
      hourCounts[a[0] as any] > hourCounts[b[0] as any] ? a : b
    )?.[0];

    const { data: forecast, error: insertError } = await db
      .from('staffing_forecasts')
      .insert({
        branch_id: branchId,
        forecast_date: forecastDate,
        shift_type: shiftType,
        predicted_staff_needed: predictedStaffNeeded,
        peak_hour_prediction: peakHour ? `${peakHour}:00:00` : null,
        factors: {
          avg_orders_per_shift: avgOrdersPerShift,
          avg_revenue_per_shift: avgRevenuePerShift,
          historical_shifts_analyzed: 90
        }
      })
      .select()
      .single();

    if (insertError) throw insertError;
    forecasts.push(forecast);
  }

  return forecasts;
}

export async function getStaffingForecasts(
  branchId: string,
  startDate: string,
  endDate: string
): Promise<StaffingForecast[]> {
  const { data, error } = await db
    .from('staffing_forecasts')
    .select('*')
    .eq('branch_id', branchId)
    .gte('forecast_date', startDate)
    .lte('forecast_date', endDate)
    .order('forecast_date', { ascending: true });

  if (error) throw error;
  return data;
}

// Custom Reports Functions
export async function createCustomReport(
  report: Omit<CustomReport, 'id' | 'created_at' | 'updated_at'>
): Promise<CustomReport> {
  const { data, error } = await db
    .from('custom_reports')
    .insert(report)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCustomReports(branchId: string): Promise<CustomReport[]> {
  const { data, error } = await db
    .from('custom_reports')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateCustomReport(
  reportId: string,
  updates: Partial<CustomReport>
): Promise<CustomReport> {
  const { data, error } = await db
    .from('custom_reports')
    .update(updates)
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCustomReport(reportId: string): Promise<void> {
  const { error } = await db
    .from('custom_reports')
    .update({ is_active: false })
    .eq('id', reportId);

  if (error) throw error;
}

// Report Scheduling Functions
export async function scheduleReport(
  reportId: string,
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    schedule_time: string;
    recipients: string[];
  }
): Promise<ReportSchedule> {
  const { data, error } = await db
    .from('report_schedules')
    .insert({
      report_id: reportId,
      ...schedule
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getReportSchedules(branchId: string): Promise<ReportSchedule[]> {
  const { data, error } = await db
    .from('report_schedules')
    .select(`
      *,
      custom_reports!inner(branch_id, name)
    `)
    .eq('custom_reports.branch_id', branchId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Trend Analysis Functions
export async function performTrendAnalysis(
  branchId: string,
  analysisType: 'seasonal' | 'weekly' | 'monthly' | 'yearly',
  dataType: 'sales' | 'orders' | 'customers' | 'items',
  startDate: string,
  endDate: string
): Promise<TrendAnalysis> {
  // Get historical data
  let query = supabase.from('orders').select('*').eq('branch_id', branchId).eq('status', 'paid');

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data: orders, error } = await query.order('created_at', { ascending: true });

  if (error) throw error;

  // Perform trend analysis
  const dataPoints = orders.map(order => ({
    date: new Date(order.created_at),
    value: dataType === 'sales' ? order.total_amount :
           dataType === 'orders' ? 1 : 0
  }));

  // Calculate trend direction and strength
  const trendDirection = calculateTrendDirection(dataPoints);
  const trendStrength = calculateTrendStrength(dataPoints);
  const seasonalityScore = await calculateSeasonalityScore(branchId, dataType);

  // Generate insights
  const insights = generateInsights(dataPoints, trendDirection, trendStrength, seasonalityScore);

  const { data: analysis, error: insertError } = await db
    .from('trend_analysis')
    .insert({
      branch_id: branchId,
      analysis_type: analysisType,
      data_type: dataType,
      period_start: startDate,
      period_end: endDate,
      trend_direction: trendDirection,
      trend_strength: trendStrength,
      seasonality_score: seasonalityScore,
      insights: insights
    })
    .select()
    .single();

  if (insertError) throw insertError;
  return analysis;
}

export async function getTrendAnalyses(
  branchId: string,
  analysisType?: string
): Promise<TrendAnalysis[]> {
  let query = supabase
    .from('trend_analysis')
    .select('*')
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });

  if (analysisType) {
    query = query.eq('analysis_type', analysisType);
  }

  const { data, error } = await query.limit(20);

  if (error) throw error;
  return data;
}

// Helper Functions
function calculateTrendDirection(dataPoints: { date: Date; value: number }[]): 'increasing' | 'decreasing' | 'stable' {
  if (dataPoints.length < 2) return 'stable';

  const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
  const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));

  const firstAvg = firstHalf.reduce((sum, point) => sum + point.value, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, point) => sum + point.value, 0) / secondHalf.length;

  const changePercent = (secondAvg - firstAvg) / firstAvg;

  if (changePercent > 0.05) return 'increasing';
  if (changePercent < -0.05) return 'decreasing';
  return 'stable';
}

function calculateTrendStrength(dataPoints: { date: Date; value: number }[]): number {
  if (dataPoints.length < 2) return 0;

  // Calculate R-squared value as trend strength indicator
  const n = dataPoints.length;
  const sumX = dataPoints.reduce((sum, _, i) => sum + i, 0);
  const sumY = dataPoints.reduce((sum, point) => sum + point.value, 0);
  const sumXY = dataPoints.reduce((sum, point, i) => sum + i * point.value, 0);
  const sumXX = dataPoints.reduce((sum, _, i) => sum + i * i, 0);
  const sumYY = dataPoints.reduce((sum, point) => sum + point.value * point.value, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  let ssRes = 0;
  let ssTot = 0;
  const meanY = sumY / n;

  dataPoints.forEach((point, i) => {
    const predicted = slope * i + intercept;
    ssRes += Math.pow(point.value - predicted, 2);
    ssTot += Math.pow(point.value - meanY, 2);
  });

  const rSquared = 1 - (ssRes / ssTot);
  return Math.max(0, Math.min(1, rSquared));
}

async function calculateSeasonalityScore(branchId: string, dataType: string): Promise<number> {
  const { data, error } = await db.rpc('detect_seasonality', {
    p_branch_id: branchId,
    p_data_type: dataType
  });

  if (error) return 0.5; // Default moderate seasonality
  return data;
}

function generateInsights(
  dataPoints: { date: Date; value: number }[],
  trendDirection: string,
  trendStrength: number,
  seasonalityScore: number
): { key_findings: string[]; recommendations: string[]; anomalies: any[] } {
  const insights = {
    key_findings: [] as string[],
    recommendations: [] as string[],
    anomalies: [] as any[]
  };

  // Key findings
  if (trendDirection === 'increasing') {
    insights.key_findings.push(`Sales showing upward trend with ${Math.round(trendStrength * 100)}% confidence`);
  } else if (trendDirection === 'decreasing') {
    insights.key_findings.push(`Sales showing downward trend - requires attention`);
  } else {
    insights.key_findings.push('Sales trend is stable');
  }

  if (seasonalityScore > 0.7) {
    insights.key_findings.push('Strong seasonal patterns detected');
  } else if (seasonalityScore < 0.3) {
    insights.key_findings.push('Minimal seasonal variation observed');
  }

  // Recommendations
  if (trendDirection === 'increasing') {
    insights.recommendations.push('Consider expanding inventory and staff during peak periods');
    insights.recommendations.push('Evaluate marketing strategies that are driving growth');
  } else if (trendDirection === 'decreasing') {
    insights.recommendations.push('Review pricing strategy and competitive positioning');
    insights.recommendations.push('Analyze customer feedback for potential issues');
  }

  if (seasonalityScore > 0.7) {
    insights.recommendations.push('Prepare for seasonal demand fluctuations');
    insights.recommendations.push('Optimize staffing schedules based on seasonal patterns');
  }

  // Detect anomalies (simple outlier detection)
  const values = dataPoints.map(p => p.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);

  dataPoints.forEach((point, index) => {
    const zScore = Math.abs((point.value - mean) / stdDev);
    if (zScore > 2) { // More than 2 standard deviations
      insights.anomalies.push({
        date: point.date.toISOString().split('T')[0],
        value: point.value,
        expected: mean,
        deviation: zScore,
        type: point.value > mean ? 'high' : 'low'
      });
    }
  });

  return insights;
}

// Export all functions
export {
  type SalesForecast,
  type InventoryForecast,
  type StaffingForecast,
  type CustomReport,
  type ReportSchedule,
  type TrendAnalysis,
  type ForecastFactors
};