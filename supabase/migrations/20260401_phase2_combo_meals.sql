-- Phase 2: Combo Meals
-- Create tables for combo meal bundles and selections

CREATE TABLE IF NOT EXISTS combo_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text,
  price decimal(12,2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS combo_meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_meal_id uuid NOT NULL REFERENCES combo_meals(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  is_required boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_combo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  combo_meal_id uuid NOT NULL REFERENCES combo_meals(id) ON DELETE CASCADE,
  selected_items jsonb,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_combo_meals_branch_id ON combo_meals(branch_id);
CREATE INDEX idx_combo_meal_items_combo_meal_id ON combo_meal_items(combo_meal_id);
CREATE INDEX idx_order_combo_items_order_id ON order_combo_items(order_id);

-- RLS policies
ALTER TABLE combo_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_combo_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Branch access for combo meals" ON combo_meals FOR ALL
  USING (branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid()))
  WITH CHECK (branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid()));

CREATE POLICY "Branch access for combo meal items" ON combo_meal_items FOR ALL
  USING (combo_meal_id IN (SELECT id FROM combo_meals WHERE branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid())) )
  WITH CHECK (combo_meal_id IN (SELECT id FROM combo_meals WHERE branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid())) );

CREATE POLICY "Branch access for order combo items" ON order_combo_items FOR ALL
  USING (order_id IN (SELECT id FROM orders WHERE branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid())) )
  WITH CHECK (order_id IN (SELECT id FROM orders WHERE branch_id IN (SELECT branch_id FROM staff WHERE user_id = auth.uid())) );

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER combo_meals_updated_at
  BEFORE UPDATE ON combo_meals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER combo_meal_items_updated_at
  BEFORE UPDATE ON combo_meal_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

CREATE TRIGGER order_combo_items_updated_at
  BEFORE UPDATE ON order_combo_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();
