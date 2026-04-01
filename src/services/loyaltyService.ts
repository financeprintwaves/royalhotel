import { supabase } from '@/integrations/supabase';
import { Database } from '@/integrations/supabase/types.ts';

type LoyaltyCustomer = Database['public']['Tables']['loyalty_customers']['Row'];
type LoyaltyPointsTransaction = Database['public']['Tables']['loyalty_points_transactions']['Row'];
type LoyaltyReward = Database['public']['Tables']['loyalty_rewards']['Row'];
type LoyaltyRedemption = Database['public']['Tables']['loyalty_redemptions']['Row'];

export class LoyaltyService {
  /**
   * Add or get loyalty customer by phone number
   */
  static async findOrCreateCustomer(
    branchId: string,
    phoneNumber: string,
    customerName?: string,
    email?: string
  ): Promise<LoyaltyCustomer> {
    // Try to find existing customer
    const { data: existing } = await supabase
      .from('loyalty_customers')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('branch_id', branchId)
      .single();

    if (existing) {
      return existing;
    }

    // Create new customer
    const { data: newCustomer, error } = await supabase
      .from('loyalty_customers')
      .insert({
        branch_id: branchId,
        phone_number: phoneNumber,
        customer_name: customerName || `Customer ${phoneNumber}`,
        email,
        total_points: 0,
        total_spent: 0,
        visits_count: 1
      })
      .select()
      .single();

    if (error) throw error;
    return newCustomer;
  }

  /**
   * Add points to customer account
   */
  static async addPoints(
    branchId: string,
    customerId: string,
    points: number,
    orderId?: string,
    description?: string,
    staffId?: string
  ): Promise<void> {
    // Record transaction
    const { error: txError } = await supabase
      .from('loyalty_points_transactions')
      .insert({
        branch_id: branchId,
        customer_id: customerId,
        transaction_type: 'earned',
        points_value: points,
        order_id: orderId,
        description,
        staff_id: staffId
      });

    if (txError) throw txError;

    // Update customer points
    const { error: updateError } = await supabase
      .from('loyalty_customers')
      .update({
        total_points: { increment: points },
        visits_count: { increment: 1 }
      })
      .eq('id', customerId);

    if (updateError) throw updateError;
  }

  /**
   * Redeem points for a reward
   */
  static async redeemReward(
    branchId: string,
    customerId: string,
    rewardId: string,
    orderId?: string
  ): Promise<LoyaltyRedemption> {
    // Get reward details
    const { data: reward, error: rewardError } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('id', rewardId)
      .single();

    if (rewardError) throw rewardError;
    if (!reward) throw new Error('Reward not found');

    // Get customer
    const { data: customer, error: customerError } = await supabase
      .from('loyalty_customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;
    if (!customer) throw new Error('Customer not found');

    // Check if customer has enough points
    if (customer.total_points < reward.points_required) {
      throw new Error(
        `Insufficient points. Required: ${reward.points_required}, Available: ${customer.total_points}`
      );
    }

    // Create redemption
    const { data: redemption, error: redemptionError } = await supabase
      .from('loyalty_redemptions')
      .insert({
        branch_id: branchId,
        customer_id: customerId,
        reward_id: rewardId,
        order_id: orderId,
        points_redeemed: reward.points_required,
        status: 'completed'
      })
      .select()
      .single();

    if (redemptionError) throw redemptionError;

    // Deduct points
    const { error: deductError } = await supabase
      .from('loyalty_customers')
      .update({
        total_points: { decrement: reward.points_required }
      })
      .eq('id', customerId);

    if (deductError) throw deductError;

    // Record transaction
    await supabase
      .from('loyalty_points_transactions')
      .insert({
        branch_id: branchId,
        customer_id: customerId,
        transaction_type: 'redeemed',
        points_value: -reward.points_required,
        description: `Redeemed: ${reward.reward_name}`,
        order_id: orderId
      });

    return redemption;
  }

  /**
   * Get customer loyalty status
   */
  static async getCustomerStatus(customerId: string) {
    const { data: customer, error } = await supabase
      .from('loyalty_customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error) throw error;

    // Get available rewards
    const { data: rewards } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('branch_id', customer.branch_id)
      .eq('is_active', true)
      .lte('points_required', customer.total_points);

    return {
      customer,
      availableRewards: rewards || []
    };
  }

  /**
   * Get customer points history
   */
  static async getPointsHistory(
    customerId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<LoyaltyPointsTransaction[]> {
    const { data, error } = await supabase
      .from('loyalty_points_transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get active rewards for branch
   */
  static async getAvailableRewards(branchId: string): Promise<LoyaltyReward[]> {
    const { data, error } = await supabase
      .from('loyalty_rewards')
      .select('*')
      .eq('branch_id', branchId)
      .eq('is_active', true)
      .order('points_required', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Update customer tier based on points
   */
  static async updateCustomerTier(customerId: string, branchId: string): Promise<void> {
    const { data: customer } = await supabase
      .from('loyalty_customers')
      .select('total_points')
      .eq('id', customerId)
      .single();

    if (!customer) throw new Error('Customer not found');

    // Get tiers for branch, ordered by min_points descending
    const { data: tiers } = await supabase
      .from('loyalty_tiers')
      .select('tier_name, min_points')
      .eq('branch_id', branchId)
      .order('min_points', { ascending: false });

    if (!tiers || tiers.length === 0) return;

    // Find appropriate tier
    const newTier = tiers.find(t => customer.total_points >= t.min_points);
    if (!newTier) return;

    // Update tier
    await supabase
      .from('loyalty_customers')
      .update({ loyalty_tier: newTier.tier_name })
      .eq('id', customerId);
  }

  /**
   * Get loyalty dashboard stats
   */
  static async getLoyaltyStats(branchId: string) {
    // Total customers
    const { count: totalCustomers } = await supabase
      .from('loyalty_customers')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId);

    // Tier breakdown
    const { data: tierBreakdown } = await supabase
      .from('loyalty_customers')
      .select('loyalty_tier')
      .eq('branch_id', branchId);

    // Points distributed
    const { data: pointsData } = await supabase
      .from('loyalty_customers')
      .select('total_points')
      .eq('branch_id', branchId);

    const totalPointsDistributed = pointsData?.reduce((sum, c) => sum + (c.total_points || 0), 0) || 0;

    // Redemptions this month
    const { count: redemptionsThisMonth } = await supabase
      .from('loyalty_redemptions')
      .select('*', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .gte('redemption_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    return {
      totalCustomers,
      tierBreakdown: tierBreakdown?.reduce((acc, c) => {
        acc[c.loyalty_tier] = (acc[c.loyalty_tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalPointsDistributed,
      redemptionsThisMonth
    };
  }
}

export default LoyaltyService;
