-- Phase 5: Customer Engagement & Loyalty Enhancement

-- Rewards Redemptions
CREATE TABLE IF NOT EXISTS rewards_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES loyalty_customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  reward_id uuid REFERENCES loyalty_rewards(id) ON DELETE SET NULL,
  points_redeemed INTEGER NOT NULL,
  redemption_type varchar(50), -- 'reward', 'discount', 'free_item'
  discount_amount NUMERIC(12, 3),
  notes text,
  redeemed_by uuid REFERENCES staff(id) ON DELETE SET NULL,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer Notifications
CREATE TABLE IF NOT EXISTS customer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES loyalty_customers(id) ON DELETE SET NULL,
  phone_number varchar(20),
  email varchar(255),
  notification_type varchar(50), -- 'sms', 'email', 'push'
  subject varchar(255),
  message text NOT NULL,
  related_order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  status varchar(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'delivered'
  scheduled_for timestamp WITH TIME ZONE,
  sent_at timestamp WITH TIME ZONE,
  delivery_error text,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customer Feedback
CREATE TABLE IF NOT EXISTS customer_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES loyalty_customers(id) ON DELETE SET NULL,
  phone_number varchar(20),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment text,
  feedback_categories JSONB DEFAULT '{}', -- food, service, price, cleanliness, ambiance
  sentiment varchar(20), -- 'positive', 'neutral', 'negative'
  response_from_management text,
  responded_at timestamp WITH TIME ZONE,
  is_public BOOLEAN DEFAULT true,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Marketing Campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text,
  campaign_type varchar(50), -- 'sms', 'email', 'in_app'
  discount_percentage NUMERIC(5, 2),
  discount_amount NUMERIC(12, 3),
  coupon_code varchar(50) UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_segment varchar(100), -- 'all', 'new_customers', 'loyal', 'inactive'
  status varchar(20) NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'active', 'completed'
  recipients_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  redemption_count INTEGER DEFAULT 0,
  created_by uuid REFERENCES staff(id),
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Campaign Recipients
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES loyalty_customers(id) ON DELETE SET NULL,
  phone_number varchar(20),
  email varchar(255),
  delivery_status varchar(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'clicked', 'redeemed'
  sent_at timestamp WITH TIME ZONE,
  clicked_at timestamp WITH TIME ZONE,
  redeemed_at timestamp WITH TIME ZONE,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Multi-Currency Configuration
CREATE TABLE IF NOT EXISTS currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  currency_code varchar(3) NOT NULL, -- 'USD', 'OMR', 'AED', etc
  currency_symbol varchar(5) NOT NULL,
  exchange_rate NUMERIC(12, 6) DEFAULT 1.0,
  is_primary BOOLEAN DEFAULT false,
  decimal_places INTEGER DEFAULT 2,
  rounding_mode varchar(20) DEFAULT 'round', -- 'round', 'ceil', 'floor'
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, currency_code)
);

-- Indexes for Phase 5
CREATE INDEX IF NOT EXISTS idx_rewards_redemptions_customer ON rewards_redemptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_rewards_redemptions_branch_date ON rewards_redemptions(branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_status ON customer_notifications(status);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_scheduled ON customer_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_branch_date ON customer_feedback(branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_rating ON customer_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(delivery_status);
CREATE INDEX IF NOT EXISTS idx_currencies_branch ON currencies(branch_id);

-- RLS for Phase 5 Tables
ALTER TABLE rewards_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "redemptions_branch_access"
  ON rewards_redemptions FOR SELECT
  USING (
    branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid())
    OR (SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  );

CREATE POLICY "notifications_branch_access"
  ON customer_notifications FOR SELECT
  USING (
    branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid())
    OR (SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  );

CREATE POLICY "feedback_branch_access"
  ON customer_feedback FOR SELECT
  USING (
    branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid())
    OR (SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  );

CREATE POLICY "campaigns_branch_access"
  ON marketing_campaigns FOR SELECT
  USING (
    branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid())
    OR (SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  );

CREATE POLICY "campaign_recipients_branch_access"
  ON campaign_recipients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM marketing_campaigns mc
      WHERE mc.id = campaign_id
      AND mc.branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "currencies_branch_access"
  ON currencies FOR SELECT
  USING (
    branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid())
    OR (SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  );
