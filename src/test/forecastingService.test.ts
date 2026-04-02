import { describe, it, expect, vi, beforeEach } from 'vitest';
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

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn()
  }
}));

describe('Forecasting Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sales Forecasting', () => {
    it('should generate sales forecast', async () => {
      const mockForecast = {
        id: 'forecast-1',
        branch_id: 'branch-1',
        forecast_date: '2026-04-15',
        forecast_type: 'daily',
        predicted_revenue: 2500.00,
        predicted_orders: 25,
        confidence_score: 0.85,
        factors: {
          historical_average: 2200.00,
          trend_factor: 0.05,
          seasonality_factor: 1.1,
          data_points: 30
        },
        created_at: '2026-04-02T10:00:00Z',
        updated_at: '2026-04-02T10:00:00Z'
      };

      const mockRpcResponse = {
        predicted_revenue: 2500.00,
        predicted_orders: 25,
        confidence_score: 0.85,
        factors: {
          historical_average: 2200.00,
          trend_factor: 0.05,
          seasonality_factor: 1.1,
          data_points: 30
        }
      };

      const mockInsertResponse = { data: mockForecast, error: null };

      // Mock the RPC call
      (supabase.rpc as any).mockReturnValue({
        then: vi.fn((callback) => callback(mockRpcResponse))
      });

      // Mock the insert call
      (supabase.from as any).mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              then: vi.fn((callback) => callback(mockInsertResponse))
            }))
          }))
        }))
      });

      const result = await generateSalesForecast('branch-1', '2026-04-15', 'daily');

      expect(result).toEqual(mockForecast);
      expect(supabase.rpc).toHaveBeenCalledWith('generate_sales_forecast', {
        p_branch_id: 'branch-1',
        p_forecast_date: '2026-04-15',
        p_forecast_type: 'daily'
      });
    });

    it('should get sales forecasts', async () => {
      const mockForecasts = [
        {
          id: 'forecast-1',
          branch_id: 'branch-1',
          forecast_date: '2026-04-15',
          predicted_revenue: 2500.00,
          predicted_orders: 25,
          confidence_score: 0.85
        }
      ];

      const mockResponse = { data: mockForecasts, error: null };

      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => ({
                  then: vi.fn((callback) => callback(mockResponse))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await getSalesForecasts('branch-1', '2026-04-01', '2026-04-30');

      expect(result).toEqual(mockForecasts);
    });
  });

  describe('Inventory Forecasting', () => {
    it('should generate inventory forecast', async () => {
      const mockForecast = {
        id: 'inv-forecast-1',
        branch_id: 'branch-1',
        item_id: 'item-1',
        forecast_date: '2026-04-15',
        predicted_demand: 15.5,
        safety_stock_level: 50.0,
        reorder_point: 25.0,
        confidence_score: 0.75,
        factors: {
          historical_avg_daily: 12.5,
          data_points: 25,
          calculation_period_days: 30
        }
      };

      const mockHistoricalData = [
        { quantity: 10, orders: { created_at: '2026-03-15T10:00:00Z' } },
        { quantity: 15, orders: { created_at: '2026-03-16T10:00:00Z' } }
      ];

      const mockInsertResponse = { data: mockForecast, error: null };

      // Mock historical data query
      (supabase.from as any)
        .mockReturnValueOnce({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    then: vi.fn((callback) => callback({ data: mockHistoricalData, error: null }))
                  }))
                }))
              }))
            }))
          }))
        })
        .mockReturnValueOnce({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({
                then: vi.fn((callback) => callback(mockInsertResponse))
              }))
            }))
          }))
        });

      const result = await generateInventoryForecast('branch-1', 'item-1', '2026-04-15');

      expect(result).toEqual(mockForecast);
    });

    it('should get inventory forecasts', async () => {
      const mockForecasts = [
        {
          id: 'inv-forecast-1',
          branch_id: 'branch-1',
          item_id: 'item-1',
          forecast_date: '2026-04-15',
          predicted_demand: 15.5,
          menu_items: { name: 'Test Item' }
        }
      ];

      const mockResponse = { data: mockForecasts, error: null };

      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => ({
                  then: vi.fn((callback) => callback(mockResponse))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await getInventoryForecasts('branch-1', '2026-04-01', '2026-04-30');

      expect(result).toEqual(mockForecasts);
    });
  });

  describe('Staffing Forecasting', () => {
    it('should generate staffing forecast', async () => {
      const mockShiftData = [
        { created_at: '2026-03-15T08:00:00Z', total_amount: 150.00 },
        { created_at: '2026-03-15T14:00:00Z', total_amount: 200.00 },
        { created_at: '2026-03-15T19:00:00Z', total_amount: 300.00 }
      ];

      const mockForecasts = [
        {
          id: 'staff-forecast-1',
          branch_id: 'branch-1',
          forecast_date: '2026-04-15',
          shift_type: 'morning',
          predicted_staff_needed: 2
        }
      ];

      let callCount = 0;
      (supabase.from as any).mockImplementation(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                then: vi.fn((callback) => {
                  callCount++;
                  if (callCount === 1) {
                    callback({ data: mockShiftData, error: null });
                  } else {
                    callback({ data: mockForecasts[0], error: null });
                  }
                })
              }))
            }))
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              then: vi.fn((callback) => callback({ data: mockForecasts[0], error: null }))
            }))
          }))
        }))
      }));

      const result = await generateStaffingForecast('branch-1', '2026-04-15');

      expect(result).toHaveLength(4); // 4 shifts
      expect(result[0].shift_type).toBe('morning');
    });

    it('should get staffing forecasts', async () => {
      const mockForecasts = [
        {
          id: 'staff-forecast-1',
          branch_id: 'branch-1',
          forecast_date: '2026-04-15',
          shift_type: 'morning',
          predicted_staff_needed: 2
        }
      ];

      const mockResponse = { data: mockForecasts, error: null };

      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => ({
                  then: vi.fn((callback) => callback(mockResponse))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await getStaffingForecasts('branch-1', '2026-04-01', '2026-04-30');

      expect(result).toEqual(mockForecasts);
    });
  });

  describe('Trend Analysis', () => {
    it('should perform trend analysis', async () => {
      const mockOrders = [
        { id: '1', created_at: '2026-03-01T10:00:00Z', total_amount: 100.00, status: 'paid' },
        { id: '2', created_at: '2026-03-02T10:00:00Z', total_amount: 150.00, status: 'paid' },
        { id: '3', created_at: '2026-03-03T10:00:00Z', total_amount: 120.00, status: 'paid' }
      ];

      const mockAnalysis = {
        id: 'trend-1',
        branch_id: 'branch-1',
        analysis_type: 'monthly',
        data_type: 'sales',
        period_start: '2026-03-01',
        period_end: '2026-03-31',
        trend_direction: 'increasing',
        trend_strength: 0.75,
        seasonality_score: 0.6,
        insights: {
          key_findings: ['Sales showing upward trend'],
          recommendations: ['Consider expanding staff'],
          anomalies: []
        }
      };

      // Mock the from query for orders
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => ({
                  then: vi.fn((callback) => callback({ data: mockOrders, error: null }))
                }))
              }))
            }))
          }))
        }))
      });

      // Mock the rpc call for seasonality
      (supabase.rpc as any).mockReturnValueOnce({
        then: vi.fn((callback) => callback(0.6))
      });

      // Mock the insert for trend analysis
      (supabase.from as any).mockReturnValueOnce({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              then: vi.fn((callback) => callback({ data: mockAnalysis, error: null }))
            }))
          }))
        }))
      });

      const result = await performTrendAnalysis(
        'branch-1',
        'monthly',
        'sales',
        '2026-03-01',
        '2026-03-31'
      );

      expect(result).toEqual(mockAnalysis);
    });

    it('should get trend analyses', async () => {
      const mockAnalyses = [
        {
          id: 'trend-1',
          branch_id: 'branch-1',
          analysis_type: 'monthly',
          data_type: 'sales',
          trend_direction: 'increasing'
        }
      ];

      const mockResponse = { data: mockAnalyses, error: null };

      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() => ({
                then: vi.fn((callback) => callback(mockResponse))
              }))
            }))
          }))
        }))
      });

      const result = await getTrendAnalyses('branch-1');

      expect(result).toEqual(mockAnalyses);
    });
  });

  describe('Custom Reports', () => {
    it('should create custom report', async () => {
      const mockReport = {
        id: 'report-1',
        branch_id: 'branch-1',
        name: 'Test Report',
        report_type: 'sales',
        config: {
          dateRange: { start: '2026-04-01', end: '2026-04-30' },
          filters: {},
          metrics: ['total_sales'],
          chartType: 'bar'
        },
        is_active: true,
        created_by: 'user-1'
      };

      const mockResponse = { data: mockReport, error: null };

      (supabase.from as any).mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              then: vi.fn((callback) => callback(mockResponse))
            }))
          }))
        }))
      });

      const result = await createCustomReport({
        branch_id: 'branch-1',
        name: 'Test Report',
        report_type: 'sales',
        config: {
          dateRange: { start: '2026-04-01', end: '2026-04-30' },
          filters: {},
          metrics: ['total_sales'],
          chartType: 'bar'
        },
        is_active: true,
        created_by: 'user-1'
      });

      expect(result).toEqual(mockReport);
    });

    it('should get custom reports', async () => {
      const mockReports = [
        {
          id: 'report-1',
          branch_id: 'branch-1',
          name: 'Test Report',
          report_type: 'sales',
          is_active: true
        }
      ];

      const mockResponse = { data: mockReports, error: null };

      (supabase.from as any).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                then: vi.fn((callback) => callback(mockResponse))
              }))
            }))
          }))
        }))
      });

      const result = await getCustomReports('branch-1');

      expect(result).toEqual(mockReports);
    });
  });
});