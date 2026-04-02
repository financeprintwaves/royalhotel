-- Phase 4: Advanced Analytics & Business Intelligence

-- Sales Analytics Table
CREATE TABLE IF NOT EXISTS sales_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hour_of_day INTEGER,
  total_orders INTEGER DEFAULT 0,
  total_sales NUMERIC(12, 3) DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  average_order_value NUMERIC(12, 3) DEFAULT 0,
  revenue_by_category JSONB DEFAULT '{}',
  service_type_breakdown JSONB DEFAULT '{}',
  payment_method_breakdown JSONB DEFAULT '{}',
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, date, hour_of_day)
);

-- Staff Performance Analytics
CREATE TABLE IF NOT EXISTS staff_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  orders_count INTEGER DEFAULT 0,
  total_sales NUMERIC(12, 3) DEFAULT 0,
  average_order_value NUMERIC(12, 3) DEFAULT 0,
  items_sold INTEGER DEFAULT 0,
  customer_satisfaction_avg NUMERIC(3, 2),
  efficiency_score NUMERIC(3, 2),
  incentive_points INTEGER DEFAULT 0,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(staff_id, date)
);

-- Product Analytics
CREATE TABLE IF NOT EXISTS product_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  quantity_sold INTEGER DEFAULT 0,
  revenue NUMERIC(12, 3) DEFAULT 0,
  cost NUMERIC(12, 3) DEFAULT 0,
  gross_margin NUMERIC(3, 2),
  rank_by_revenue INTEGER,
  rank_by_quantity INTEGER,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, menu_item_id, date)
);

-- Customer Analytics
CREATE TABLE IF NOT EXISTS customer_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  loyalty_customer_id uuid REFERENCES loyalty_customers(id) ON DELETE CASCADE,
  phone_number varchar(20),
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(12, 3) DEFAULT 0,
  average_order_value NUMERIC(12, 3) DEFAULT 0,
  last_order_date DATE,
  customer_lifetime_value NUMERIC(12, 3) DEFAULT 0,
  loyalty_tier varchar(50),
  creation_date DATE,
  is_returning_customer BOOLEAN DEFAULT false,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, loyalty_customer_id)
);

-- Operational Metrics
CREATE TABLE IF NOT EXISTS operational_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  table_turnover_rate NUMERIC(5, 2),
  average_service_time INTEGER,
  peak_hour INTEGER,
  peak_hour_orders INTEGER,
  delivery_average_time INTEGER,
  delivery_success_rate NUMERIC(5, 2),
  cancellation_rate NUMERIC(5, 2),
  waste_cost NUMERIC(12, 3),
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, date)
);

-- Indexes for Analytics
CREATE INDEX IF NOT EXISTS idx_sales_analytics_branch_date ON sales_analytics(branch_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_performance_branch_date ON staff_performance(branch_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_performance_staff_date ON staff_performance(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_product_analytics_branch_date ON product_analytics(branch_id, date);
CREATE INDEX IF NOT EXISTS idx_customer_analytics_branch ON customer_analytics(branch_id);
CREATE INDEX IF NOT EXISTS idx_operational_metrics_branch_date ON operational_metrics(branch_id, date);

-- RLS for Analytics Tables
ALTER TABLE sales_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_branch_access"
  ON sales_analytics FOR SELECT
  USING (
    branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid())
    OR (SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  );

CREATE POLICY "staff_performance_branch_access"
  ON staff_performance FOR SELECT
  USING (
    branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid())
    OR (SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  );

CREATE POLICY "product_analytics_branch_access"
  ON product_analytics FOR SELECT
  USING (
    branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid())
    OR (SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  );

CREATE POLICY "customer_analytics_branch_access"
  ON customer_analytics FOR SELECT
  USING (
    branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid())
    OR (SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  );

CREATE POLICY "operational_metrics_branch_access"
  ON operational_metrics FOR SELECT
  USING (
    branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid())
    OR (SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  );
