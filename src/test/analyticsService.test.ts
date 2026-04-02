import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  getSalesAnalytics,
  getDailySalesMetrics,
  getHourlySalesMetrics,
  recordSalesMetrics,
  getStaffPerformance,
  getStaffPerformanceLeaderboard,
  recordStaffPerformance,
  getProductAnalytics,
  getTopSellingItems,
  recordProductAnalytics,
  getCustomerAnalytics,
  getTopCustomers,
  recordCustomerAnalytics,
  getOperationalMetrics,
  recordOperationalMetrics,
  getSalesSummary,
  getPerformanceTrends
} from '@/services/analyticsService';

vi.mock('@/integrations/supabase/client');

describe('Analytics Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sales Analytics', () => {
    it('should retrieve sales analytics for date range', async () => {
      const mockAnalytics = [
        { id: '1', branch_id: 'branch-1', date: '2026-04-01', total_sales: 1000, total_orders: 10 }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockAnalytics, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getSalesAnalytics('branch-1', '2026-04-01', '2026-04-30');
      expect(result).toEqual(mockAnalytics);
    });

    it('should record sales metrics', async () => {
      const params = {
        branch_id: 'branch-1',
        date: '2026-04-01',
        total_orders: 10,
        total_sales: 1000,
        total_items: 25,
        average_order_value: 100,
        revenue_by_category: { food: 600, beverage: 400 },
        service_type_breakdown: { dine_in: 8, takeaway: 2 },
        payment_method_breakdown: { cash: 500, card: 500 }
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1', ...params }, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await recordSalesMetrics(params);
      expect(result.total_sales).toBe(1000);
      expect(result.total_orders).toBe(10);
    });
  });

  describe('Staff Performance', () => {
    it('should get staff performance for period', async () => {
      const mockPerformance = [
        { id: '1', staff_id: 'staff-1', date: '2026-04-01', total_sales: 500, orders_count: 5 }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPerformance, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getStaffPerformance('branch-1', '2026-04-01', '2026-04-30');
      expect(result).toEqual(mockPerformance);
    });

    it('should get performance leaderboard', async () => {
      const mockLeaderboard = [
        { id: '1', staff_id: 'staff-1', incentive_points: 100 },
        { id: '2', staff_id: 'staff-2', incentive_points: 80 }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockLeaderboard, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getStaffPerformanceLeaderboard('branch-1', 30);
      expect(result).toHaveLength(2);
      expect(result[0].incentive_points).toBe(100);
    });

    it('should record staff performance', async () => {
      const params = {
        branch_id: 'branch-1',
        staff_id: 'staff-1',
        date: '2026-04-01',
        orders_count: 5,
        total_sales: 500,
        average_order_value: 100,
        items_sold: 12,
        incentive_points: 50
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1', ...params }, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await recordStaffPerformance(params);
      expect(result.orders_count).toBe(5);
      expect(result.incentive_points).toBe(50);
    });
  });

  describe('Product Analytics', () => {
    it('should get top selling items', async () => {
      const mockProducts = [
        { id: '1', menu_item_id: 'item-1', quantity_sold: 100, revenue: 1000 },
        { id: '2', menu_item_id: 'item-2', quantity_sold: 80, revenue: 800 }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockProducts, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getTopSellingItems('branch-1', 30);
      expect(result).toHaveLength(2);
      expect(result[0].quantity_sold).toBe(100);
    });

    it('should record product analytics', async () => {
      const params = {
        branch_id: 'branch-1',
        menu_item_id: 'item-1',
        date: '2026-04-01',
        quantity_sold: 50,
        revenue: 500,
        cost: 200,
        gross_margin: 60
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1', ...params }, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await recordProductAnalytics(params);
      expect(result.quantity_sold).toBe(50);
      expect(result.gross_margin).toBe(60);
    });
  });

  describe('Customer Analytics', () => {
    it('should get top customers', async () => {
      const mockCustomers = [
        { id: '1', phone_number: '123456', total_spent: 5000, total_orders: 20 },
        { id: '2', phone_number: '654321', total_spent: 4000, total_orders: 15 }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockCustomers, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getTopCustomers('branch-1', 50);
      expect(result).toHaveLength(2);
      expect(result[0].total_spent).toBe(5000);
    });

    it('should record customer analytics', async () => {
      const params = {
        branch_id: 'branch-1',
        phone_number: '123456',
        total_orders: 5,
        total_spent: 500,
        average_order_value: 100,
        customer_lifetime_value: 500,
        is_returning_customer: false
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1', ...params }, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await recordCustomerAnalytics(params);
      expect(result.total_orders).toBe(5);
      expect(result.is_returning_customer).toBe(false);
    });
  });

  describe('Operational Metrics', () => {
    it('should record operational metrics', async () => {
      const params = {
        branch_id: 'branch-1',
        date: '2026-04-01',
        table_turnover_rate: 2.5,
        average_service_time: 45,
        peak_hour: 20,
        delivery_success_rate: 95
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1', ...params }, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await recordOperationalMetrics(params);
      expect(result.table_turnover_rate).toBe(2.5);
      expect(result.delivery_success_rate).toBe(95);
    });
  });

  describe('Summary Functions', () => {
    it('should get sales summary', async () => {
      const mockSummary = {
        total_orders: 300,
        total_sales: 30000,
        avg_aov: 100
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSummary, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getSalesSummary('branch-1', 30);
      expect(result.total_sales).toBe(30000);
      expect(result.total_orders).toBe(300);
    });
  });
});
