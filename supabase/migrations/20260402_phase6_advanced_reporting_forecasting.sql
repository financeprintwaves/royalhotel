-- Phase 6: Advanced Reporting & Forecasting

-- Forecasting Tables
CREATE TABLE IF NOT EXISTS sales_forecasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  forecast_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  predicted_revenue DECIMAL(10,2) NOT NULL,
  predicted_orders INTEGER NOT NULL,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  actual_revenue DECIMAL(10,2),
  actual_orders INTEGER,
  accuracy_score DECIMAL(3,2),
  factors JSONB, -- weather, holidays, events, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_forecasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  predicted_demand DECIMAL(8,2) NOT NULL,
  safety_stock_level DECIMAL(8,2),
  reorder_point DECIMAL(8,2),
  confidence_score DECIMAL(3,2),
  actual_consumption DECIMAL(8,2),
  accuracy_score DECIMAL(3,2),
  factors JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staffing_forecasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  shift_type VARCHAR(20) NOT NULL, -- 'morning', 'afternoon', 'evening', 'night'
  predicted_staff_needed INTEGER NOT NULL,
  actual_staff_used INTEGER,
  peak_hour_prediction TIME,
  busy_period_start TIME,
  busy_period_end TIME,
  factors JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom Reports Table
CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL, -- 'sales', 'inventory', 'staff', 'customer'
  config JSONB NOT NULL, -- report configuration
  schedule JSONB, -- scheduling configuration
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES staff(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report Schedules
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
  frequency VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  schedule_time TIME NOT NULL,
  recipients JSONB NOT NULL, -- email addresses
  is_active BOOLEAN DEFAULT true,
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trend Analysis Data
CREATE TABLE IF NOT EXISTS trend_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50) NOT NULL, -- 'seasonal', 'weekly', 'monthly', 'yearly'
  data_type VARCHAR(50) NOT NULL, -- 'sales', 'orders', 'customers', 'items'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  trend_direction VARCHAR(20), -- 'increasing', 'decreasing', 'stable'
  trend_strength DECIMAL(3,2), -- 0.00 to 1.00
  seasonality_score DECIMAL(3,2),
  forecast_accuracy DECIMAL(3,2),
  insights JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_forecasts_branch_date ON sales_forecasts(branch_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_inventory_forecasts_branch_item_date ON inventory_forecasts(branch_id, item_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_staffing_forecasts_branch_date ON staffing_forecasts(branch_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_custom_reports_branch ON custom_reports(branch_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_report ON report_schedules(report_id);
CREATE INDEX IF NOT EXISTS idx_trend_analysis_branch_type ON trend_analysis(branch_id, analysis_type);

-- RLS Policies
ALTER TABLE sales_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffing_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Forecasting
CREATE POLICY "forecasts_branch_access"
  ON sales_forecasts FOR ALL
  USING (branch_id IN (
    SELECT branch_id FROM staff WHERE id = auth.uid()
    UNION
    SELECT id FROM branches WHERE id IN (
      SELECT branch_id FROM staff WHERE id = auth.uid()
    )
  ));

CREATE POLICY "inventory_forecasts_branch_access"
  ON inventory_forecasts FOR ALL
  USING (branch_id IN (
    SELECT branch_id FROM staff WHERE id = auth.uid()
    UNION
    SELECT id FROM branches WHERE id IN (
      SELECT branch_id FROM staff WHERE id = auth.uid()
    )
  ));

CREATE POLICY "staffing_forecasts_branch_access"
  ON staffing_forecasts FOR ALL
  USING (branch_id IN (
    SELECT branch_id FROM staff WHERE id = auth.uid()
    UNION
    SELECT id FROM branches WHERE id IN (
      SELECT branch_id FROM staff WHERE id = auth.uid()
    )
  ));

CREATE POLICY "custom_reports_branch_access"
  ON custom_reports FOR ALL
  USING (branch_id IN (
    SELECT branch_id FROM staff WHERE id = auth.uid()
    UNION
    SELECT id FROM branches WHERE id IN (
      SELECT branch_id FROM staff WHERE id = auth.uid()
    )
  ));

CREATE POLICY "report_schedules_access"
  ON report_schedules FOR ALL
  USING (report_id IN (
    SELECT id FROM custom_reports WHERE branch_id IN (
      SELECT branch_id FROM staff WHERE id = auth.uid()
      UNION
      SELECT id FROM branches WHERE id IN (
        SELECT branch_id FROM staff WHERE id = auth.uid()
      )
    )
  ));

CREATE POLICY "trend_analysis_branch_access"
  ON trend_analysis FOR ALL
  USING (branch_id IN (
    SELECT branch_id FROM staff WHERE id = auth.uid()
    UNION
    SELECT id FROM branches WHERE id IN (
      SELECT branch_id FROM staff WHERE id = auth.uid()
    )
  ));

-- Functions for Forecasting

-- Function to calculate moving average
CREATE OR REPLACE FUNCTION calculate_moving_average(
  p_branch_id UUID,
  p_data_type VARCHAR,
  p_periods INTEGER DEFAULT 7
) RETURNS TABLE (
  date DATE,
  value DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.date,
    AVG(d.value) OVER (ORDER BY d.date ROWS (p_periods - 1) PRECEDING) as moving_avg
  FROM (
    SELECT
      DATE(o.created_at) as date,
      CASE
        WHEN p_data_type = 'revenue' THEN SUM(oi.quantity * oi.price)
        WHEN p_data_type = 'orders' THEN COUNT(DISTINCT o.id)::DECIMAL
        ELSE 0
      END as value
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.branch_id = p_branch_id
      AND o.status = 'paid'
      AND o.created_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY DATE(o.created_at)
    ORDER BY DATE(o.created_at)
  ) d;
END;
$$ LANGUAGE plpgsql;

-- Function to detect seasonality
CREATE OR REPLACE FUNCTION detect_seasonality(
  p_branch_id UUID,
  p_data_type VARCHAR
) RETURNS DECIMAL AS $$
DECLARE
  weekly_avg DECIMAL;
  daily_avg DECIMAL;
  seasonality_score DECIMAL;
BEGIN
  -- Calculate average by day of week vs overall average
  SELECT
    AVG(weekly_data.avg_value) / AVG(daily_data.avg_value)
  INTO seasonality_score
  FROM (
    SELECT
      EXTRACT(DOW FROM DATE(o.created_at)) as day_of_week,
      AVG(
        CASE
          WHEN p_data_type = 'revenue' THEN oi.quantity * oi.price
          WHEN p_data_type = 'orders' THEN 1::DECIMAL
          ELSE 0
        END
      ) as avg_value
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.branch_id = p_branch_id
      AND o.status = 'paid'
      AND o.created_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY EXTRACT(DOW FROM DATE(o.created_at))
  ) weekly_data
  CROSS JOIN (
    SELECT
      AVG(
        CASE
          WHEN p_data_type = 'revenue' THEN oi.quantity * oi.price
          WHEN p_data_type = 'orders' THEN 1::DECIMAL
          ELSE 0
        END
      ) as avg_value
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.branch_id = p_branch_id
      AND o.status = 'paid'
      AND o.created_at >= CURRENT_DATE - INTERVAL '90 days'
  ) daily_data;

  RETURN COALESCE(seasonality_score, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Function to generate sales forecast
CREATE OR REPLACE FUNCTION generate_sales_forecast(
  p_branch_id UUID,
  p_forecast_date DATE,
  p_forecast_type VARCHAR DEFAULT 'daily'
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  historical_avg DECIMAL;
  trend_factor DECIMAL;
  seasonality_factor DECIMAL;
  predicted_revenue DECIMAL;
  predicted_orders INTEGER;
  confidence_score DECIMAL;
BEGIN
  -- Calculate historical averages
  SELECT
    AVG(daily_revenue),
    AVG(daily_orders)
  INTO historical_avg, predicted_orders
  FROM (
    SELECT
      DATE(o.created_at) as order_date,
      SUM(oi.quantity * oi.price) as daily_revenue,
      COUNT(DISTINCT o.id) as daily_orders
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.branch_id = p_branch_id
      AND o.status = 'paid'
      AND DATE(o.created_at) >= p_forecast_date - INTERVAL '30 days'
      AND DATE(o.created_at) < p_forecast_date
    GROUP BY DATE(o.created_at)
  ) historical;

  -- Calculate trend (simple linear trend)
  SELECT
    CASE
      WHEN COUNT(*) > 1 THEN
        (SUM((row_num - 1) * revenue) - SUM(row_num - 1) * SUM(revenue) / COUNT(*)) /
        (SUM((row_num - 1) * (row_num - 1)) - SUM(row_num - 1) * SUM(row_num - 1) / COUNT(*))
      ELSE 0
    END
  INTO trend_factor
  FROM (
    SELECT
      ROW_NUMBER() OVER (ORDER BY order_date) as row_num,
      daily_revenue as revenue
    FROM (
      SELECT
        DATE(o.created_at) as order_date,
        SUM(oi.quantity * oi.price) as daily_revenue
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.branch_id = p_branch_id
        AND o.status = 'paid'
        AND DATE(o.created_at) >= p_forecast_date - INTERVAL '30 days'
        AND DATE(o.created_at) < p_forecast_date
      GROUP BY DATE(o.created_at)
      ORDER BY order_date
    ) trend_data
  ) trend_calc;

  -- Get seasonality factor
  SELECT detect_seasonality(p_branch_id, 'revenue') INTO seasonality_factor;

  -- Calculate prediction
  predicted_revenue := GREATEST(0, historical_avg * (1 + trend_factor) * seasonality_factor);
  predicted_orders := GREATEST(1, ROUND(predicted_orders * (1 + trend_factor) * seasonality_factor));

  -- Calculate confidence score based on data availability
  SELECT
    CASE
      WHEN COUNT(*) >= 20 THEN 0.85
      WHEN COUNT(*) >= 10 THEN 0.70
      WHEN COUNT(*) >= 5 THEN 0.55
      ELSE 0.40
    END
  INTO confidence_score
  FROM (
    SELECT DATE(o.created_at)
    FROM orders o
    WHERE o.branch_id = p_branch_id
      AND o.status = 'paid'
      AND DATE(o.created_at) >= p_forecast_date - INTERVAL '30 days'
      AND DATE(o.created_at) < p_forecast_date
    GROUP BY DATE(o.created_at)
  ) data_points;

  -- Build result
  result := jsonb_build_object(
    'predicted_revenue', predicted_revenue,
    'predicted_orders', predicted_orders,
    'confidence_score', confidence_score,
    'factors', jsonb_build_object(
      'historical_average', historical_avg,
      'trend_factor', trend_factor,
      'seasonality_factor', seasonality_factor,
      'data_points', (SELECT COUNT(*) FROM (
        SELECT DATE(o.created_at)
        FROM orders o
        WHERE o.branch_id = p_branch_id
          AND o.status = 'paid'
          AND DATE(o.created_at) >= p_forecast_date - INTERVAL '30 days'
          AND DATE(o.created_at) < p_forecast_date
        GROUP BY DATE(o.created_at)
      ) data_points)
    )
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sales_forecasts_updated_at
    BEFORE UPDATE ON sales_forecasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_forecasts_updated_at
    BEFORE UPDATE ON inventory_forecasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staffing_forecasts_updated_at
    BEFORE UPDATE ON staffing_forecasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_reports_updated_at
    BEFORE UPDATE ON custom_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();