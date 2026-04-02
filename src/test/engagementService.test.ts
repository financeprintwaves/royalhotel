import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import {
  redeemRewards,
  getRedemptionHistory,
  sendNotification,
  getNotificationHistory,
  submitFeedback,
  getFeedbackStats,
  createCampaign,
  getCampaigns,
  updateCampaignStatus,
  addCampaignRecipients,
  getCurrencies,
  getPrimaryCurrency,
  addCurrency,
  convertCurrency,
  roundAmount
} from '@/services/engagementService';

vi.mock('@/integrations/supabase/client');

describe('Engagement Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loyalty Redemptions', () => {
    it('should redeem rewards', async () => {
      const params = {
        branch_id: 'branch-1',
        customer_id: 'customer-1',
        points_redeemed: 100,
        redemption_type: 'discount' as const,
        discount_amount: 50
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1', ...params }, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await redeemRewards(params);
      expect(result.points_redeemed).toBe(100);
      expect(result.redemption_type).toBe('discount');
      expect(result.discount_amount).toBe(50);
    });

    it('should get redemption history', async () => {
      const mockHistory = [
        { id: '1', customer_id: 'customer-1', points_redeemed: 100, redemption_type: 'discount' },
        { id: '2', customer_id: 'customer-1', points_redeemed: 50, redemption_type: 'free_item' }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockHistory, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getRedemptionHistory('customer-1');
      expect(result).toHaveLength(2);
      expect(result[0].points_redeemed).toBe(100);
    });
  });

  describe('Customer Notifications', () => {
    it('should send notification', async () => {
      const params = {
        branch_id: 'branch-1',
        customer_id: 'customer-1',
        phone_number: '1234567890',
        notification_type: 'sms' as const,
        message: 'Your order is ready!'
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1', ...params, status: 'pending' }, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await sendNotification(params);
      expect(result.message).toBe('Your order is ready!');
      expect(result.status).toBe('pending');
      expect(result.notification_type).toBe('sms');
    });

    it('should get notification history', async () => {
      const mockNotifications = [
        { id: '1', customer_id: 'customer-1', message: 'Order ready', status: 'sent' },
        { id: '2', customer_id: 'customer-1', message: 'Order confirmed', status: 'sent' }
      ];

      // Create a reusable mock chain that properly chains methods
      const mockChain = {
        select: vi.fn(function() { return this; }),
        eq: vi.fn(function() { return this; }),
        order: vi.fn(function() { return this; }),
        limit: vi.fn(function() { return this; }),
        then: vi.fn(function(callback) { return callback({ data: mockNotifications, error: null }); })
      };

      (supabase.from as any).mockReturnValue(mockChain);

      const result = await getNotificationHistory('customer-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('Customer Feedback', () => {
    it('should submit feedback', async () => {
      const params = {
        branch_id: 'branch-1',
        customer_id: 'customer-1',
        rating: 5,
        comment: 'Excellent service!',
        feedback_categories: { food: 5, service: 5, price: 4 }
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', ...params, sentiment: 'positive', is_public: true },
          error: null
        })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await submitFeedback(params);
      expect(result.rating).toBe(5);
      expect(result.sentiment).toBe('positive');
      expect(result.is_public).toBe(true);
    });

    it('should get feedback stats', async () => {
      const mockStats = [
        { rating: 5, sentiment: 'positive', count: 50, avg_rating: 4.8 },
        { rating: 4, sentiment: 'positive', count: 30, avg_rating: 4.8 },
        { rating: 1, sentiment: 'negative', count: 5, avg_rating: 4.8 }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        group_by: vi.fn().mockResolvedValue({ data: mockStats, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getFeedbackStats('branch-1', '2026-04-01', '2026-04-30');
      expect(result).toHaveLength(3);
      expect(result.some(r => r.sentiment === 'negative')).toBe(true);
    });
  });

  describe('Marketing Campaigns', () => {
    it('should create campaign', async () => {
      const params = {
        branch_id: 'branch-1',
        name: 'Spring Sale',
        campaign_type: 'sms' as const,
        discount_percentage: 20,
        start_date: '2026-04-01',
        end_date: '2026-04-30',
        target_segment: 'all'
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', ...params, status: 'draft', recipients_count: 0 },
          error: null
        })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await createCampaign(params);
      expect(result.name).toBe('Spring Sale');
      expect(result.status).toBe('draft');
      expect(result.discount_percentage).toBe(20);
    });

    it('should get campaigns', async () => {
      const mockCampaigns = [
        { id: '1', name: 'Spring Sale', status: 'active' },
        { id: '2', name: 'Summer Sale', status: 'draft' }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCampaigns, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getCampaigns('branch-1');
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Spring Sale');
    });

    it('should update campaign status', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', name: 'Spring Sale', status: 'active' },
          error: null
        })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await updateCampaignStatus('campaign-1', 'active');
      expect(result.status).toBe('active');
    });

    it('should add campaign recipients', async () => {
      const recipients = [
        { phone_number: '1234567890', email: 'test@example.com' },
        { phone_number: '0987654321', email: 'test2@example.com' }
      ];

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: recipients.map((r, i) => ({ id: `${i}`, campaign_id: 'campaign-1', ...r, delivery_status: 'pending' })),
          error: null
        })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await addCampaignRecipients('campaign-1', recipients);
      expect(result).toHaveLength(2);
      expect(result[0].delivery_status).toBe('pending');
    });
  });

  describe('Multi-Currency', () => {
    it('should get currencies', async () => {
      const mockCurrencies = [
        { id: '1', currency_code: 'OMR', currency_symbol: 'ر.ع.', is_primary: true },
        { id: '2', currency_code: 'USD', currency_symbol: '$', is_primary: false }
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockCurrencies, error: null })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await getCurrencies('branch-1');
      expect(result).toHaveLength(2);
      expect(result[0].is_primary).toBe(true);
    });

    it('should add currency', async () => {
      const params = {
        branch_id: 'branch-1',
        currency_code: 'EUR',
        currency_symbol: '€',
        exchange_rate: 0.95
      };

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', ...params, is_primary: false },
          error: null
        })
      };

      (supabase.from as any).mockReturnValue(mockQuery);

      const result = await addCurrency(params);
      expect(result.currency_code).toBe('EUR');
      expect(result.exchange_rate).toBe(0.95);
    });

    it('should convert currency', () => {
      const amount = 100;
      const fromRate = 1.0; // OMR
      const toRate = 2.6; // USD

      const result = convertCurrency(amount, fromRate, toRate);
      expect(result).toBe(260);
    });

    it('should round amount', () => {
      expect(roundAmount(10.456, 2, 'round')).toBe(10.46);
      expect(roundAmount(10.456, 2, 'ceil')).toBe(10.46);
      expect(roundAmount(10.456, 2, 'floor')).toBe(10.45);
    });
  });
});
