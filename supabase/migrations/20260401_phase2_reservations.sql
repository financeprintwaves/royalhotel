-- Phase 2: Table Reservation System
-- Adds comprehensive table booking, reservations, and pre-orders

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES loyalty_customers(id) ON DELETE SET NULL,
  customer_name varchar(255) NOT NULL,
  phone_number varchar(20) NOT NULL,
  email varchar(255),
  party_size integer NOT NULL CHECK (party_size > 0),
  reservation_time timestamp WITH TIME ZONE NOT NULL,
  reservation_status varchar(50) DEFAULT 'confirmed', -- confirmed, checked_in, no_show, cancelled, completed
  special_requests text,
  seating_preference varchar(100),
  created_by_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  checked_in_at timestamp WITH TIME ZONE,
  checked_in_by_staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  deposit_amount decimal(10, 2),
  deposit_paid_at timestamp WITH TIME ZONE,
  notes text,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reservation_pre_orders table for items ordered before arrival
CREATE TABLE IF NOT EXISTS reservation_pre_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  special_instructions text,
  notes text,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reservation_notes table for staff communication
CREATE TABLE IF NOT EXISTS reservation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE SET NULL,
  note_type varchar(50) DEFAULT 'general', -- general, vip, dietary, special, follow_up
  note_text text NOT NULL,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reservation_preferences table for customer preferences
CREATE TABLE IF NOT EXISTS reservation_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES loyalty_customers(id) ON DELETE CASCADE,
  preference_type varchar(50) NOT NULL, -- table_preference, dietary, occasion, allergies
  preference_value text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create reservation_slots table for time-slot based booking
CREATE TABLE IF NOT EXISTS reservation_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  slot_time timestamp WITH TIME ZONE NOT NULL,
  slot_duration_minutes integer DEFAULT 120,
  max_capacity integer NOT NULL,
  available_capacity integer NOT NULL,
  is_blocked boolean DEFAULT false,
  blocked_reason text,
  created_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, slot_time)
);

-- Create indexes for performance
CREATE INDEX idx_reservations_branch_id ON reservations(branch_id);
CREATE INDEX idx_reservations_table_id ON reservations(table_id);
CREATE INDEX idx_reservations_customer_id ON reservations(customer_id);
CREATE INDEX idx_reservations_status ON reservations(reservation_status);
CREATE INDEX idx_reservations_reservation_time ON reservations(reservation_time);
CREATE INDEX idx_reservations_phone ON reservations(phone_number);
CREATE INDEX idx_reservation_pre_orders_reservation_id ON reservation_pre_orders(reservation_id);
CREATE INDEX idx_reservation_notes_reservation_id ON reservation_notes(reservation_id);
CREATE INDEX idx_reservation_slots_branch_id ON reservation_slots(branch_id);
CREATE INDEX idx_reservation_slots_time ON reservation_slots(slot_time);

-- Enable RLS (Row Level Security)
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_pre_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_slots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reservations
CREATE POLICY "Users can view reservations from their branch"
  ON reservations FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reservations in their branch"
  ON reservations FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update reservations in their branch"
  ON reservations FOR UPDATE
  USING (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for reservation_pre_orders
CREATE POLICY "Users can view pre-orders from their branch"
  ON reservation_pre_orders FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage pre-orders in their branch"
  ON reservation_pre_orders FOR ALL
  USING (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for reservation_notes
CREATE POLICY "Users can view notes from their branch"
  ON reservation_notes FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert notes in their branch"
  ON reservation_notes FOR INSERT
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for reservation_preferences
CREATE POLICY "Users can view customer preferences from their branch"
  ON reservation_preferences FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for reservation_slots
CREATE POLICY "Users can view slots from their branch"
  ON reservation_slots FOR SELECT
  USING (
    branch_id IN (
      SELECT branch_id FROM staff WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can manage slots"
  ON reservation_slots FOR ALL
  USING (
    (SELECT role FROM staff WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  );

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_reservation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER reservations_updated_at_trigger
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_reservation_updated_at();

CREATE TRIGGER reservation_pre_orders_updated_at_trigger
  BEFORE UPDATE ON reservation_pre_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_reservation_updated_at();
