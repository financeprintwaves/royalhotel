import { supabase } from '@/integrations/supabase/client';
const db = supabase as any;
import type {
  RewardsRedemption,
  CustomerNotification,
  CustomerFeedback,
  MarketingCampaign,
  CampaignRecipient,
  Currency
} from '@/types/pos';

// Rewards Redemption Functions
export async function redeemRewards(params: {
  branch_id: string;
  customer_id: string;
  order_id?: string;
  reward_id?: string;
  points_redeemed: number;
  redemption_type: 'reward' | 'discount' | 'free_item';
  discount_amount?: number;
  notes?: string;
  redeemed_by?: string;
}) {
  const { data, error } = await db
    .from('rewards_redemptions')
    .insert([params])
    .select()
    .single();

  if (error) throw error;
  return data as RewardsRedemption;
}

export async function getRedemptionHistory(customerId: string) {
  const { data, error } = await db
    .from('rewards_redemptions')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as RewardsRedemption[];
}

export async function getRedemptionStats(branchId: string, startDate: string, endDate: string) {
  const { data, error } = await db
    .from('rewards_redemptions')
    .select('redemption_type, COUNT(*) as count, SUM(points_redeemed) as total_points')
    .eq('branch_id', branchId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .group_by('redemption_type');

  if (error) throw error;
  return data;
}

// Customer Notifications Functions
export async function sendNotification(params: {
  branch_id: string;
  customer_id?: string;
  phone_number?: string;
  email?: string;
  notification_type: 'sms' | 'email' | 'push';
  subject?: string;
  message: string;
  related_order_id?: string;
  scheduled_for?: string;
}) {
  const { data, error } = await db
    .from('customer_notifications')
    .insert([{ ...params, status: 'pending' }])
    .select()
    .single();

  if (error) throw error;
  return data as CustomerNotification;
}

export async function getNotificationHistory(customerId?: string, branchId?: string, limit: number = 100) {
  let query = supabase
    .from('customer_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (customerId) query = query.eq('customer_id', customerId);
  if (branchId) query = query.eq('branch_id', branchId);

  const { data, error } = await query;
  if (error) throw error;
  return data as CustomerNotification[];
}

export async function updateNotificationStatus(notificationId: string, status: string, sentAt?: string) {
  const { data, error } = await db
    .from('customer_notifications')
    .update({
      status,
      sent_at: sentAt || (status === 'sent' ? new Date().toISOString() : null)
    })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) throw error;
  return data as CustomerNotification;
}

// Customer Feedback Functions
export async function submitFeedback(params: {
  branch_id: string;
  order_id?: string;
  customer_id?: string;
  phone_number?: string;
  rating: number;
  comment?: string;
  feedback_categories: Record<string, number>;
}) {
  // Determine sentiment based on rating
  const sentiment = params.rating >= 4 ? 'positive' : params.rating >= 3 ? 'neutral' : 'negative';

  const { data, error } = await db
    .from('customer_feedback')
    .insert([{ ...params, sentiment, is_public: true }])
    .select()
    .single();

  if (error) throw error;
  return data as CustomerFeedback;
}

export async function getFeedbackStats(branchId: string, startDate: string, endDate: string) {
  const { data, error } = await db
    .from('customer_feedback')
    .select('rating, sentiment, COUNT(*) as count, AVG(CAST(rating as NUMERIC)) as avg_rating')
    .eq('branch_id', branchId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .group_by('rating', 'sentiment');

  if (error) throw error;
  return data;
}

export async function getFeedbackList(branchId: string, limit: number = 50) {
  const { data, error } = await db
    .from('customer_feedback')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as CustomerFeedback[];
}

export async function respondToFeedback(feedbackId: string, response: string) {
  const { data, error } = await db
    .from('customer_feedback')
    .update({
      response_from_management: response,
      responded_at: new Date().toISOString()
    })
    .eq('id', feedbackId)
    .select()
    .single();

  if (error) throw error;
  return data as CustomerFeedback;
}

// Marketing Campaign Functions
export async function createCampaign(params: {
  branch_id: string;
  name: string;
  description?: string;
  campaign_type: 'sms' | 'email' | 'in_app';
  discount_percentage?: number;
  discount_amount?: number;
  coupon_code?: string;
  start_date: string;
  end_date: string;
  target_segment: string;
  created_by?: string;
}) {
  const { data, error } = await db
    .from('marketing_campaigns')
    .insert([{ ...params, status: 'draft' }])
    .select()
    .single();

  if (error) throw error;
  return data as MarketingCampaign;
}

export async function getCampaigns(branchId: string, status?: string) {
  let query = supabase
    .from('marketing_campaigns')
    .select('*')
    .eq('branch_id', branchId);

  if (status) query = query.eq('status', status);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data as MarketingCampaign[];
}

export async function updateCampaignStatus(campaignId: string, status: string) {
  const { data, error } = await db
    .from('marketing_campaigns')
    .update({ status })
    .eq('id', campaignId)
    .select()
    .single();

  if (error) throw error;
  return data as MarketingCampaign;
}

export async function addCampaignRecipients(campaignId: string, recipients: Array<{ phone_number?: string; email?: string; customer_id?: string }>) {
  const campaignRecipients = recipients.map(r => ({
    campaign_id: campaignId,
    ...r,
    delivery_status: 'pending'
  }));

  const { data, error } = await db
    .from('campaign_recipients')
    .insert(campaignRecipients)
    .select();

  if (error) throw error;
  return data as CampaignRecipient[];
}

export async function getCampaignRecipients(campaignId: string) {
  const { data, error } = await db
    .from('campaign_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CampaignRecipient[];
}

export async function updateRecipientStatus(recipientId: string, status: string) {
  const updatePayload: any = { delivery_status: status };

  if (status === 'clicked') updatePayload.clicked_at = new Date().toISOString();
  if (status === 'redeemed') updatePayload.redeemed_at = new Date().toISOString();
  if (status === 'sent') updatePayload.sent_at = new Date().toISOString();

  const { data, error } = await db
    .from('campaign_recipients')
    .update(updatePayload)
    .eq('id', recipientId)
    .select()
    .single();

  if (error) throw error;
  return data as CampaignRecipient;
}

// Currency Functions
export async function getCurrencies(branchId: string) {
  const { data, error } = await db
    .from('currencies')
    .select('*')
    .eq('branch_id', branchId)
    .order('is_primary', { ascending: false });

  if (error) throw error;
  return data as Currency[];
}

export async function getPrimaryCurrency(branchId: string) {
  const { data, error } = await db
    .from('currencies')
    .select('*')
    .eq('branch_id', branchId)
    .eq('is_primary', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as Currency | null;
}

export async function addCurrency(params: {
  branch_id: string;
  currency_code: string;
  currency_symbol: string;
  exchange_rate?: number;
  is_primary?: boolean;
  decimal_places?: number;
  rounding_mode?: string;
}) {
  const { data, error } = await db
    .from('currencies')
    .insert([{ ...params, exchange_rate: params.exchange_rate || 1, is_primary: params.is_primary || false }])
    .select()
    .single();

  if (error) throw error;
  return data as Currency;
}

export async function updateCurrencyRate(currencyId: string, exchangeRate: number) {
  const { data, error } = await db
    .from('currencies')
    .update({ exchange_rate: exchangeRate })
    .eq('id', currencyId)
    .select()
    .single();

  if (error) throw error;
  return data as Currency;
}

// Helper function for currency conversion
export function convertCurrency(amount: number, fromRate: number, toRate: number): number {
  const baseAmount = amount / fromRate;
  return baseAmount * toRate;
}

// Helper function for rounding based on currency rules
export function roundAmount(amount: number, decimalPlaces: number, mode: 'round' | 'ceil' | 'floor' = 'round'): number {
  const multiplier = Math.pow(10, decimalPlaces);
  
  if (mode === 'ceil') return Math.ceil(amount * multiplier) / multiplier;
  if (mode === 'floor') return Math.floor(amount * multiplier) / multiplier;
  
  return Math.round(amount * multiplier) / multiplier;
}
