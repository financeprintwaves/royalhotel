import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import LoyaltyService from '@/services/loyaltyService';

interface CustomerLookupProps {
  branchId: string;
  onCustomerFound: (customer: any) => void;
  onNew?: () => void;
}

export const CustomerLookup: React.FC<CustomerLookupProps> = ({
  branchId,
  onCustomerFound,
  onNew
}) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!phone.trim()) return;
    
    setLoading(true);
    try {
      const customer = await LoyaltyService.findOrCreateCustomer(
        branchId,
        phone
      );
      onCustomerFound(customer);
    } catch (error) {
      console.error('Error finding customer:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex gap-2 md:gap-3">
        <Input
          placeholder="Enter phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="rounded-md"
        />
        <Button
          onClick={handleSearch}
          disabled={loading}
          className="rounded-md"
        >
          {loading ? 'Searching...' : 'Find'}
        </Button>
      </div>
    </div>
  );
};

interface LoyaltyStatusProps {
  customer: any;
  onRedeemReward?: (rewardId: string) => void;
}

export const LoyaltyStatus: React.FC<LoyaltyStatusProps> = ({
  customer,
  onRedeemReward
}) => {
  const tierColors = {
    bronze: 'bg-yellow-700',
    silver: 'bg-gray-400',
    gold: 'bg-yellow-400',
    platinum: 'bg-purple-400'
  };

  const tierPercentages = {
    bronze: 0,
    silver: (500 / 3000) * 100,
    gold: (1500 / 3000) * 100,
    platinum: 100
  };

  return (
    <Card className="w-full rounded-lg md:rounded-xl p-4 md:p-6">
      <div className="space-y-4">
        {/* Customer Name */}
        <div>
          <h3 className="text-lg md:text-xl font-bold">{customer.customer_name}</h3>
          <p className="text-sm md:text-base text-muted-foreground">{customer.phone_number}</p>
        </div>

        {/* Loyalty Tier */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase">{customer.loyalty_tier}</span>
            <span className={cn(
              'px-3 py-1 rounded-full text-white text-sm font-bold',
              tierColors[customer.loyalty_tier as keyof typeof tierColors] || 'bg-gray-500'
            )}>
              {customer.total_points} pts
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                tierColors[customer.loyalty_tier as keyof typeof tierColors] || 'bg-gray-500'
              )}
              style={{
                width: `${Math.min(
                  tierPercentages[customer.loyalty_tier as keyof typeof tierPercentages] || 0,
                  100
                )}%`
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <div className="text-center">
            <div className="text-lg md:text-2xl font-bold">{customer.visits_count}</div>
            <div className="text-xs md:text-sm text-muted-foreground">Visits</div>
          </div>
          <div className="text-center">
            <div className="text-lg md:text-2xl font-bold">${customer.total_spent}</div>
            <div className="text-xs md:text-sm text-muted-foreground">Spent</div>
          </div>
          <div className="text-center">
            <div className="text-lg md:text-2xl font-bold">{customer.total_points}</div>
            <div className="text-xs md:text-sm text-muted-foreground">Points</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

interface PointsDisplayProps {
  points: number;
  spent: number;
  compact?: boolean;
}

export const PointsDisplay: React.FC<PointsDisplayProps> = ({
  points,
  spent,
  compact = false
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 md:gap-3">
        <div className="bg-yellow-100 text-yellow-800 px-2 md:px-3 py-1 rounded-md text-xs md:text-sm font-bold">
          {points} pts
        </div>
        <div className="text-sm md:text-base font-semibold">
          ${spent.toFixed(2)}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:gap-6">
      <Card className="rounded-lg md:rounded-xl p-4 md:p-6 text-center">
        <div className="text-2xl md:text-4xl font-bold text-yellow-600">{points}</div>
        <div className="text-xs md:text-sm text-muted-foreground mt-1">Loyalty Points</div>
      </Card>
      <Card className="rounded-lg md:rounded-xl p-4 md:p-6 text-center">
        <div className="text-2xl md:text-4xl font-bold text-green-600">${spent}</div>
        <div className="text-xs md:text-sm text-muted-foreground mt-1">Total Spent</div>
      </Card>
    </div>
  );
};

export default {
  CustomerLookup,
  LoyaltyStatus,
  PointsDisplay
};
