-- Phase 3: Delivery Integration + Cross-Branch Inventory Synchronization

-- Delivery drivers table
CREATE TABLE IF NOT EXISTS delivery_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  full_name varchar(255) NOT NULL,
  phone_number varchar(20) NOT NULL,
  vehicle_plate varchar(30),
  status varchar(20) NOT NULL DEFAULT 'available', -- available / assigned / off_shift
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Delivery assignments table
CREATE TABLE IF NOT EXISTS delivery_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES delivery_drivers(id) ON DELETE SET NULL,
  assigned_by uuid REFERENCES staff(id) ON DELETE SET NULL,
  eta_minutes integer NOT NULL DEFAULT 20,
  status varchar(30) NOT NULL DEFAULT 'awaiting_pickup', -- awaiting_pickup, en_route, arrived, delivered, cancelled, failed
  route_geojson text,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cross-branch transfer requests
CREATE TABLE IF NOT EXISTS inventory_transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  to_branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  inventory_id uuid NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  quantity numeric(10, 2) NOT NULL CHECK (quantity > 0),
  requested_by uuid REFERENCES staff(id),
  approved_by uuid REFERENCES staff(id),
  status varchar(20) NOT NULL DEFAULT 'requested', -- requested / approved / rejected / completed
  requested_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  decided_at timestamp WITH TIME ZONE,
  notes text
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_branch_id ON delivery_drivers(branch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_branch_id ON delivery_assignments(branch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_status ON delivery_assignments(status);
CREATE INDEX IF NOT EXISTS idx_inventory_transfer_requests_from ON inventory_transfer_requests(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfer_requests_to ON inventory_transfer_requests(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfer_requests_status ON inventory_transfer_requests(status);

-- Row level security
ALTER TABLE delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfer_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies: same branch data or admin
CREATE POLICY "delivery drivers can be viewed by branch or admin"
  ON delivery_drivers FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
    OR (
      SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1
    ) = 'admin'
  );

CREATE POLICY "delivery assignments can be viewed by branch or admin"
  ON delivery_assignments FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
    OR (
      SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1
    ) = 'admin'
  );

CREATE POLICY "inventory transfers can be viewed by branch or admin"
  ON inventory_transfer_requests FOR SELECT
  USING (
    from_branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
    OR to_branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
    OR (
      SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1
    ) = 'admin'
  );

CREATE POLICY "inventory transfer requests insert"
  ON inventory_transfer_requests FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    AND from_branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_delivery_drivers_updated_at
BEFORE UPDATE ON delivery_drivers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER update_delivery_assignments_updated_at
BEFORE UPDATE ON delivery_assignments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
