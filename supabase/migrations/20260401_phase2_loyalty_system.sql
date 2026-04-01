-- Phase 2: Loyalty Program System
-- Adds loyalty program management with points and tiered rewards

-- Create loyalty_customers table
CREATE TABLE IF NOT EXISTS loyalty_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  phone_number varchar(20) UNIQUE NOT NULL,
  email varchar(255),
  customer_name varchar(255) NOT NULL,
  loyalty_tier varchar(50) DEFAULT 'bronze', -- bronze, silver, gold, platinum
  total_points integer DEFAULT 0,
  total_spent decimal(12, 2) DEFAULT 0,
  visits_count integer DEFAULT 0,
  birthdate date,
  joined_date timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_visit_date timestamp WITH TIME ZONE,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT phone_email_check CHECK (phone_number IS NOT NULL OR email IS NOT NULL)
);

-- Create loyalty_tiers table for tier configuration
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  tier_name varchar(50) NOT NULL,
  min_points integer NOT NULL,
  discount_percentage decimal(5, 2) DEFAULT 0,
  points_multiplier decimal(3, 2) DEFAULT 1,
  exclusive_benefits text,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, tier_name)
);

-- Create loyalty_points_transactions table
CREATE TABLE IF NOT EXISTS loyalty_points_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES loyalty_customers(id) ON DELETE CASCADE,
  transaction_type varchar(50) NOT NULL, -- 'earned', 'redeemed', 'adjustment', 'expired'
  points_value integer NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  description varchar(255),
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create loyalty_rewards table
CREATE TABLE IF NOT EXISTS loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  reward_name varchar(255) NOT NULL,
  description text,
  points_required integer NOT NULL,
  reward_type varchar(50) NOT NULL, -- 'discount', 'free_item', 'cashback'
  reward_value decimal(10, 2),
  max_uses integer,
  current_uses integer DEFAULT 0,
  is_active boolean DEFAULT true,
  valid_from timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  valid_until timestamp WITH TIME ZONE,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create loyalty_redemptions table
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES loyalty_customers(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES loyalty_rewards(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  redemption_date timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  points_redeemed integer NOT NULL,
  status varchar(50) DEFAULT 'completed', -- completed, cancelled, expired
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_loyalty_customers_branch_id ON loyalty_customers(branch_id);
CREATE INDEX idx_loyalty_customers_phone ON loyalty_customers(phone_number);
CREATE INDEX idx_loyalty_customers_email ON loyalty_customers(email);
CREATE INDEX idx_loyalty_customers_tier ON loyalty_customers(loyalty_tier);
CREATE INDEX idx_loyalty_points_transactions_customer_id ON loyalty_points_transactions(customer_id);
CREATE INDEX idx_loyalty_points_transactions_created_at ON loyalty_points_transactions(created_at);
CREATE INDEX idx_loyalty_redemptions_customer_id ON loyalty_redemptions(customer_id);
CREATE INDEX idx_loyalty_redemptions_status ON loyalty_redemptions(status);

-- Enable RLS (Row Level Security)
ALTER TABLE loyalty_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loyalty_customers
CREATE POLICY "Users can view loyalty customers from their branch"
  ON loyalty_customers FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
    OR (
      SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1
    ) = 'admin'
  );

CREATE POLICY "Users can insert loyalty customers in their branch"
  ON loyalty_customers FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update loyalty customers in their branch"
  ON loyalty_customers FOR UPDATE
  USING (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for loyalty_points_transactions
CREATE POLICY "Users can view points transactions from their branch"
  ON loyalty_points_transactions FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert points transactions in their branch"
  ON loyalty_points_transactions FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for loyalty_rewards
CREATE POLICY "Users can view loyalty rewards from their branch"
  ON loyalty_rewards FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage loyalty rewards in their branch (admin only)"
  ON loyalty_rewards FOR ALL
  USING (
    (SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  );

-- RLS Policies for loyalty_redemptions
CREATE POLICY "Users can view loyalty redemptions from their branch"
  ON loyalty_redemptions FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert loyalty redemptions in their branch"
  ON loyalty_redemptions FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

-- Insert default loyalty tiers
INSERT INTO loyalty_tiers (branch_id, tier_name, min_points, discount_percentage, points_multiplier, exclusive_benefits)
SELECT id, 'bronze', 0, 0, 1, 'Standard customer' FROM branches
ON CONFLICT DO NOTHING;

INSERT INTO loyalty_tiers (branch_id, tier_name, min_points, discount_percentage, points_multiplier, exclusive_benefits)
SELECT id, 'silver', 500, 2, 1.25, 'Birthday discounts, Early access to specials' FROM branches
ON CONFLICT DO NOTHING;

INSERT INTO loyalty_tiers (branch_id, tier_name, min_points, discount_percentage, points_multiplier, exclusive_benefits)
SELECT id, 'gold', 1500, 5, 1.5, 'VIP priority, Free drinks, Exclusive events' FROM branches
ON CONFLICT DO NOTHING;

INSERT INTO loyalty_tiers (branch_id, tier_name, min_points, discount_percentage, points_multiplier, exclusive_benefits)
SELECT id, 'platinum', 3000, 10, 2, 'Concierge service, Private events, Unlimited benefits' FROM branches
ON CONFLICT DO NOTHING;
