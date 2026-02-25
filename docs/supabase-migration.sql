-- =============================================
-- ROYAL HOTEL POS - COMPLETE DATABASE SCHEMA
-- Updated: 2026-02-25
-- Run this in your Supabase SQL Editor (fresh project)
-- =============================================

-- PHASE 1: Create ENUM Types
CREATE TYPE public.order_status AS ENUM (
  'CREATED', 'SENT_TO_KITCHEN', 'SERVED', 'BILL_REQUESTED', 'PAID', 'CLOSED'
);

CREATE TYPE public.payment_status AS ENUM (
  'unpaid', 'pending', 'paid', 'refunded'
);

CREATE TYPE public.app_role AS ENUM (
  'admin', 'manager', 'cashier', 'kitchen'
);

CREATE TYPE public.payment_method AS ENUM (
  'cash', 'card', 'mobile', 'split'
);

-- =============================================
-- PHASE 2: Create Core Tables
-- =============================================

-- Branches table
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  order_prefix TEXT NOT NULL DEFAULT 'INB',
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  staff_pin TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- User-branch assignments (multi-branch support)
CREATE TABLE public.user_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, branch_id)
);

-- Menu categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  requires_kitchen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Menu items
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,3) NOT NULL,
  cost_price DECIMAL(10,3),
  bottle_size_ml INTEGER,
  serving_size_ml INTEGER,
  serving_price DECIMAL(10,3),
  billing_type TEXT DEFAULT 'bottle_only',
  portion_options JSONB,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inventory table
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  ml_remaining INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch_id, menu_item_id)
);

-- Inventory history
CREATE TABLE public.inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) NOT NULL,
  change_type TEXT NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  reason TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Restaurant tables
CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  table_number TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  status TEXT DEFAULT 'available',
  table_type TEXT DEFAULT 'dining',
  shape TEXT DEFAULT 'square',
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 120,
  height INTEGER DEFAULT 120,
  is_merged BOOLEAN DEFAULT false,
  merged_with UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch_id, table_number)
);

-- Order sequences for order numbers
CREATE TABLE public.order_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) NOT NULL,
  prefix TEXT NOT NULL DEFAULT 'INB',
  year_month TEXT NOT NULL,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch_id, year_month)
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  created_by UUID,
  order_number TEXT,
  customer_name TEXT,
  order_status public.order_status DEFAULT 'CREATED' NOT NULL,
  payment_status public.payment_status DEFAULT 'unpaid' NOT NULL,
  subtotal DECIMAL(10,3) DEFAULT 0,
  tax_amount DECIMAL(10,3) DEFAULT 0,
  discount_amount DECIMAL(10,3) DEFAULT 0,
  total_amount DECIMAL(10,3) DEFAULT 0,
  is_foc BOOLEAN DEFAULT false,
  foc_dancer_name TEXT,
  notes TEXT,
  locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,3) NOT NULL,
  total_price DECIMAL(10,3) NOT NULL,
  is_serving BOOLEAN DEFAULT false,
  portion_name TEXT,
  item_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT NOT NULL,
  processed_by UUID,
  amount DECIMAL(10,3) NOT NULL,
  payment_method public.payment_method NOT NULL,
  payment_status public.payment_status DEFAULT 'pending' NOT NULL,
  idempotency_key UUID NOT NULL UNIQUE,
  transaction_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Refunds table
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE RESTRICT NOT NULL,
  processed_by UUID,
  amount DECIMAL(10,3) NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Order status audit log
CREATE TABLE public.order_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  previous_status public.order_status,
  new_status public.order_status NOT NULL,
  changed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Staff sessions
CREATE TABLE public.staff_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  login_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_time TIMESTAMPTZ,
  cash_total NUMERIC(10,3) DEFAULT 0,
  card_total NUMERIC(10,3) DEFAULT 0,
  mobile_total NUMERIC(10,3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cash drawer counts
CREATE TABLE public.cash_drawer_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.staff_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  branch_id UUID REFERENCES public.branches(id) NOT NULL,
  expected_cash NUMERIC(10,3) NOT NULL DEFAULT 0,
  counted_cash NUMERIC(10,3) NOT NULL DEFAULT 0,
  variance NUMERIC(10,3),
  denomination_breakdown JSONB,
  notes TEXT,
  counted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reservations
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  party_size INTEGER NOT NULL DEFAULT 2,
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Printer settings (per branch)
CREATE TABLE public.printer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL UNIQUE REFERENCES public.branches(id),
  printer_name TEXT NOT NULL DEFAULT 'POS_PRINTER',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Storage bucket for branch logos
INSERT INTO storage.buckets (id, name, public) VALUES ('branch-logos', 'branch-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view branch logos" ON storage.objects FOR SELECT USING (bucket_id = 'branch-logos');
CREATE POLICY "Authenticated users can upload branch logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branch-logos');
CREATE POLICY "Authenticated users can update branch logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'branch-logos');
CREATE POLICY "Authenticated users can delete branch logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'branch-logos');

-- =============================================
-- PHASE 3: Security Definer Functions
-- =============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.get_user_branch_id(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT branch_id FROM public.profiles WHERE user_id = _user_id LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin') $$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'manager') $$;

CREATE OR REPLACE FUNCTION public.is_order_editable(_order_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = _order_id
    AND order_status NOT IN ('PAID', 'CLOSED')
    AND locked_at IS NULL
  )
$$;

-- Handle updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

-- Auto-assign super admin on signup
CREATE OR REPLACE FUNCTION public.auto_assign_super_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_super_admin_email TEXT := 'iqbalussain@gmail.com'; -- Change this to your admin email
  v_branch_id UUID;
BEGIN
  IF NEW.email = v_super_admin_email THEN
    SELECT id INTO v_branch_id FROM public.branches WHERE is_active = true LIMIT 1;
    IF v_branch_id IS NULL THEN
      INSERT INTO public.branches (name, address) VALUES ('Main Branch', 'Headquarters')
      RETURNING id INTO v_branch_id;
    END IF;
    UPDATE public.profiles SET branch_id = v_branch_id, email = NEW.email, updated_at = now() WHERE user_id = NEW.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    UPDATE public.profiles SET email = NEW.email, updated_at = now() WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- PIN validation function
CREATE OR REPLACE FUNCTION public.validate_staff_pin(p_pin TEXT)
RETURNS TABLE(user_id UUID, email TEXT, full_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_pin !~ '^\d{5}$' THEN RETURN; END IF;
  RETURN QUERY SELECT p.user_id, p.email, p.full_name FROM public.profiles p WHERE p.staff_pin = p_pin LIMIT 1;
END;
$$;

-- Generate order number function
CREATE OR REPLACE FUNCTION public.generate_order_number(p_branch_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_year_month TEXT;
  v_sequence INTEGER;
BEGIN
  SELECT COALESCE(order_prefix, 'INB') INTO v_prefix FROM public.branches WHERE id = p_branch_id;
  IF v_prefix IS NULL THEN v_prefix := 'INB'; END IF;
  v_year_month := TO_CHAR(NOW(), 'YYMM');
  INSERT INTO public.order_sequences (branch_id, prefix, year_month, last_sequence)
  VALUES (p_branch_id, v_prefix, v_year_month, 1)
  ON CONFLICT (branch_id, year_month)
  DO UPDATE SET last_sequence = order_sequences.last_sequence + 1, prefix = v_prefix, updated_at = now()
  RETURNING last_sequence INTO v_sequence;
  RETURN v_prefix || v_year_month || LPAD(v_sequence::TEXT, 3, '0');
END;
$$;

-- Set order number trigger function
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.generate_order_number(NEW.branch_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Bootstrap demo admin function
CREATE OR REPLACE FUNCTION public.bootstrap_demo_admin(p_branch_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_has_any_admin BOOLEAN;
  v_branch_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not authenticated'); END IF;
  SELECT EXISTS (SELECT 1 FROM public.branches WHERE id = p_branch_id) INTO v_branch_exists;
  IF NOT v_branch_exists THEN RETURN jsonb_build_object('success', false, 'error', 'Branch not found'); END IF;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO v_has_any_admin;
  IF v_has_any_admin THEN RETURN jsonb_build_object('success', false, 'error', 'An admin already exists'); END IF;
  UPDATE public.profiles SET branch_id = p_branch_id, updated_at = now() WHERE user_id = v_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin') ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true, 'message', 'Demo admin bootstrapped', 'branch_id', p_branch_id);
END;
$$;

-- Get staff with roles function
CREATE OR REPLACE FUNCTION public.get_staff_with_roles()
RETURNS TABLE(
  user_id UUID, email TEXT, full_name TEXT, branch_id UUID, branch_name TEXT,
  branch_ids UUID[], branch_names TEXT[], roles TEXT[], created_at TIMESTAMPTZ, staff_pin TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p.user_id, p.email, p.full_name, p.branch_id, b.name as branch_name,
    COALESCE(ARRAY_AGG(DISTINCT ub.branch_id) FILTER (WHERE ub.branch_id IS NOT NULL), ARRAY[]::UUID[]) as branch_ids,
    COALESCE(ARRAY_AGG(DISTINCT br.name) FILTER (WHERE br.name IS NOT NULL), ARRAY[]::TEXT[]) as branch_names,
    COALESCE(ARRAY_AGG(DISTINCT ur.role::TEXT) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::TEXT[]) as roles,
    p.created_at, p.staff_pin
  FROM public.profiles p
  LEFT JOIN public.branches b ON b.id = p.branch_id
  LEFT JOIN public.user_branches ub ON ub.user_id = p.user_id
  LEFT JOIN public.branches br ON br.id = ub.branch_id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  GROUP BY p.user_id, p.email, p.full_name, p.branch_id, b.name, p.created_at, p.staff_pin
  ORDER BY p.created_at DESC
$$;

-- Finalize payment function
CREATE OR REPLACE FUNCTION public.finalize_payment(
  p_order_id UUID, p_amount NUMERIC, p_payment_method public.payment_method,
  p_idempotency_key UUID, p_transaction_reference TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order RECORD; v_payment_id UUID; v_user_id UUID; v_user_branch_id UUID; v_existing_payment RECORD; v_item RECORD;
BEGIN
  v_user_id := auth.uid();
  v_user_branch_id := public.get_user_branch_id(v_user_id);

  SELECT * INTO v_existing_payment FROM public.payments WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'payment_id', v_existing_payment.id, 'message', 'Payment already processed (idempotent)', 'idempotent', true);
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.branch_id != v_user_branch_id AND NOT public.is_admin(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied to this branch');
  END IF;
  IF v_order.order_status NOT IN ('BILL_REQUESTED', 'SERVED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order must be in BILL_REQUESTED or SERVED status');
  END IF;
  IF v_order.locked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is already locked');
  END IF;
  IF p_amount < v_order.total_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment amount is less than order total');
  END IF;

  INSERT INTO public.payments (order_id, branch_id, processed_by, amount, payment_method, payment_status, idempotency_key, transaction_reference, notes)
  VALUES (p_order_id, v_order.branch_id, v_user_id, p_amount, p_payment_method, 'paid', p_idempotency_key, p_transaction_reference, p_notes)
  RETURNING id INTO v_payment_id;

  UPDATE public.orders SET order_status = 'PAID', payment_status = 'paid', locked_at = now(), updated_at = now() WHERE id = p_order_id;
  INSERT INTO public.order_status_log (order_id, previous_status, new_status, changed_by) VALUES (p_order_id, v_order.order_status, 'PAID', v_user_id);

  FOR v_item IN SELECT oi.menu_item_id, oi.quantity FROM public.order_items oi WHERE oi.order_id = p_order_id
  LOOP
    UPDATE public.inventory SET quantity = quantity - v_item.quantity, updated_at = now()
    WHERE branch_id = v_order.branch_id AND menu_item_id = v_item.menu_item_id;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id, 'message', 'Payment processed successfully', 'idempotent', false);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Quick pay order (traverses full state machine in one call)
CREATE OR REPLACE FUNCTION public.quick_pay_order(
  p_order_id UUID, p_amount NUMERIC, p_payment_method public.payment_method,
  p_idempotency_key UUID, p_transaction_reference TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order RECORD; v_user_id UUID; v_user_branch_id UUID; v_payment_id UUID;
  v_existing_payment RECORD; v_item RECORD; v_prev_status order_status;
BEGIN
  v_user_id := auth.uid();
  v_user_branch_id := public.get_user_branch_id(v_user_id);

  SELECT * INTO v_existing_payment FROM public.payments WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'payment_id', v_existing_payment.id, 'message', 'Payment already processed (idempotent)', 'idempotent', true);
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.branch_id != v_user_branch_id AND NOT public.is_admin(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied to this branch');
  END IF;
  IF v_order.locked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is already locked');
  END IF;

  -- Traverse state machine: CREATED → SENT_TO_KITCHEN → SERVED → BILL_REQUESTED → PAID
  v_prev_status := v_order.order_status;
  IF v_prev_status = 'CREATED' THEN
    INSERT INTO public.order_status_log (order_id, previous_status, new_status, changed_by) VALUES (p_order_id, 'CREATED', 'SENT_TO_KITCHEN', v_user_id);
    v_prev_status := 'SENT_TO_KITCHEN';
  END IF;
  IF v_prev_status = 'SENT_TO_KITCHEN' THEN
    INSERT INTO public.order_status_log (order_id, previous_status, new_status, changed_by) VALUES (p_order_id, 'SENT_TO_KITCHEN', 'SERVED', v_user_id);
    v_prev_status := 'SERVED';
  END IF;
  IF v_prev_status = 'SERVED' THEN
    INSERT INTO public.order_status_log (order_id, previous_status, new_status, changed_by) VALUES (p_order_id, 'SERVED', 'BILL_REQUESTED', v_user_id);
    v_prev_status := 'BILL_REQUESTED';
  END IF;
  IF v_prev_status != 'BILL_REQUESTED' THEN
    RETURN jsonb_build_object('success', false, 'error', format('Cannot pay order in status %s', v_order.order_status));
  END IF;
  IF p_amount < COALESCE(v_order.total_amount, 0) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment amount is less than order total');
  END IF;

  INSERT INTO public.payments (order_id, branch_id, processed_by, amount, payment_method, payment_status, idempotency_key, transaction_reference, notes)
  VALUES (p_order_id, v_order.branch_id, v_user_id, p_amount, p_payment_method, 'paid', p_idempotency_key, p_transaction_reference, p_notes)
  RETURNING id INTO v_payment_id;

  INSERT INTO public.order_status_log (order_id, previous_status, new_status, changed_by) VALUES (p_order_id, 'BILL_REQUESTED', 'PAID', v_user_id);
  UPDATE public.orders SET order_status = 'PAID', payment_status = 'paid', locked_at = now(), updated_at = now() WHERE id = p_order_id;

  FOR v_item IN SELECT oi.menu_item_id, oi.quantity FROM public.order_items oi WHERE oi.order_id = p_order_id
  LOOP
    UPDATE public.inventory SET quantity = quantity - v_item.quantity, updated_at = now()
    WHERE branch_id = v_order.branch_id AND menu_item_id = v_item.menu_item_id;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'payment_id', v_payment_id, 'message', 'Quick payment processed successfully', 'idempotent', false);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update order status function
CREATE OR REPLACE FUNCTION public.update_order_status(p_order_id UUID, p_new_status public.order_status)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order RECORD; v_user_id UUID; v_user_branch_id UUID; v_valid_transition BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();
  v_user_branch_id := public.get_user_branch_id(v_user_id);
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.branch_id != v_user_branch_id AND NOT public.is_admin(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;
  IF v_order.locked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is locked and cannot be modified');
  END IF;

  CASE v_order.order_status
    WHEN 'CREATED' THEN v_valid_transition := p_new_status = 'SENT_TO_KITCHEN';
    WHEN 'SENT_TO_KITCHEN' THEN v_valid_transition := p_new_status = 'SERVED';
    WHEN 'SERVED' THEN v_valid_transition := p_new_status = 'BILL_REQUESTED';
    WHEN 'BILL_REQUESTED' THEN v_valid_transition := p_new_status IN ('PAID', 'SERVED');
    WHEN 'PAID' THEN v_valid_transition := p_new_status = 'CLOSED';
    WHEN 'CLOSED' THEN v_valid_transition := false;
  END CASE;

  IF NOT v_valid_transition THEN
    RETURN jsonb_build_object('success', false, 'error', format('Invalid status transition from %s to %s', v_order.order_status, p_new_status));
  END IF;

  IF public.has_role(v_user_id, 'kitchen') THEN
    IF p_new_status NOT IN ('SENT_TO_KITCHEN', 'SERVED') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Kitchen staff can only update to SENT_TO_KITCHEN or SERVED');
    END IF;
  END IF;

  UPDATE public.orders SET order_status = p_new_status, updated_at = now() WHERE id = p_order_id;
  INSERT INTO public.order_status_log (order_id, previous_status, new_status, changed_by) VALUES (p_order_id, v_order.order_status, p_new_status, v_user_id);

  RETURN jsonb_build_object('success', true, 'previous_status', v_order.order_status, 'new_status', p_new_status, 'message', 'Order status updated successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Process refund function
CREATE OR REPLACE FUNCTION public.process_refund(p_payment_id UUID, p_amount NUMERIC, p_reason TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_payment RECORD; v_order RECORD; v_user_id UUID; v_refund_id UUID; v_item RECORD;
BEGIN
  v_user_id := auth.uid();
  IF NOT public.is_manager_or_admin(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only managers and admins can process refunds');
  END IF;
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Payment not found'); END IF;
  IF v_payment.payment_status = 'refunded' THEN RETURN jsonb_build_object('success', false, 'error', 'Payment already refunded'); END IF;
  IF p_amount > v_payment.amount THEN RETURN jsonb_build_object('success', false, 'error', 'Refund amount exceeds payment amount'); END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = v_payment.order_id;
  INSERT INTO public.refunds (payment_id, processed_by, amount, reason) VALUES (p_payment_id, v_user_id, p_amount, p_reason) RETURNING id INTO v_refund_id;
  UPDATE public.orders SET payment_status = 'refunded', updated_at = now() WHERE id = v_payment.order_id;

  FOR v_item IN SELECT oi.menu_item_id, oi.quantity FROM public.order_items oi WHERE oi.order_id = v_payment.order_id
  LOOP
    UPDATE public.inventory SET quantity = quantity + v_item.quantity, updated_at = now()
    WHERE branch_id = v_order.branch_id AND menu_item_id = v_item.menu_item_id;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'refund_id', v_refund_id, 'message', 'Refund processed successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Process split payment function
CREATE OR REPLACE FUNCTION public.process_split_payment(p_order_id UUID, p_payments JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_order RECORD; v_user_id UUID; v_user_branch_id UUID; v_total_paid DECIMAL := 0;
  v_payment JSONB; v_payment_id UUID; v_item RECORD; v_existing_payment RECORD;
BEGIN
  v_user_id := auth.uid();
  v_user_branch_id := public.get_user_branch_id(v_user_id);
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Order not found'); END IF;
  IF v_order.branch_id != v_user_branch_id AND NOT public.is_admin(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;
  IF v_order.order_status NOT IN ('BILL_REQUESTED', 'SERVED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order must be in BILL_REQUESTED or SERVED status');
  END IF;
  IF v_order.locked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is already locked');
  END IF;

  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    SELECT * INTO v_existing_payment FROM public.payments WHERE idempotency_key = (v_payment->>'idempotency_key')::UUID;
    IF NOT FOUND THEN
      INSERT INTO public.payments (order_id, branch_id, processed_by, amount, payment_method, payment_status, idempotency_key)
      VALUES (p_order_id, v_order.branch_id, v_user_id, (v_payment->>'amount')::DECIMAL, (v_payment->>'payment_method')::public.payment_method, 'paid', (v_payment->>'idempotency_key')::UUID);
    END IF;
    v_total_paid := v_total_paid + (v_payment->>'amount')::DECIMAL;
  END LOOP;

  IF v_total_paid < v_order.total_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Total payments do not cover order amount');
  END IF;

  UPDATE public.orders SET order_status = 'PAID', payment_status = 'paid', locked_at = now(), updated_at = now() WHERE id = p_order_id;
  INSERT INTO public.order_status_log (order_id, previous_status, new_status, changed_by) VALUES (p_order_id, v_order.order_status, 'PAID', v_user_id);

  FOR v_item IN SELECT oi.menu_item_id, oi.quantity FROM public.order_items oi WHERE oi.order_id = p_order_id
  LOOP
    UPDATE public.inventory SET quantity = quantity - v_item.quantity, updated_at = now()
    WHERE branch_id = v_order.branch_id AND menu_item_id = v_item.menu_item_id;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'message', 'Split payment processed successfully', 'total_paid', v_total_paid);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Reservation table status trigger
CREATE OR REPLACE FUNCTION public.update_table_status_from_reservation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.status = 'confirmed' AND NEW.reservation_date >= CURRENT_DATE THEN
      UPDATE public.restaurant_tables SET status = 'reserved', updated_at = now() WHERE id = NEW.table_id AND status = 'available';
    END IF;
    IF NEW.status = 'seated' THEN
      UPDATE public.restaurant_tables SET status = 'occupied', updated_at = now() WHERE id = NEW.table_id;
    END IF;
    IF NEW.status = 'completed' THEN
      UPDATE public.restaurant_tables SET status = 'cleaning', updated_at = now() WHERE id = NEW.table_id;
    END IF;
    IF NEW.status IN ('cancelled', 'no_show') THEN
      UPDATE public.restaurant_tables SET status = 'available', updated_at = now() WHERE id = NEW.table_id AND status = 'reserved';
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- =============================================
-- PHASE 4: Enable RLS on all tables
-- =============================================
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_drawer_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PHASE 5: RLS Policies
-- =============================================

-- Branches
CREATE POLICY "Admins can manage all branches" ON public.branches FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view their assigned branch" ON public.branches FOR SELECT TO authenticated USING (id = public.get_user_branch_id(auth.uid()));

-- Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- User Roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- User Branches
CREATE POLICY "Admins can manage all branch assignments" ON public.user_branches FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Users can view their own branch assignments" ON public.user_branches FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Categories
CREATE POLICY "Staff can view categories in their branch" ON public.categories FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers and admins can manage categories" ON public.categories FOR ALL TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers can create categories in their branch" ON public.categories FOR INSERT TO authenticated WITH CHECK (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers can update categories in their branch" ON public.categories FOR UPDATE TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "All authenticated users can view categories in their branch" ON public.categories FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));

-- Menu Items
CREATE POLICY "Staff can view menu items in their branch" ON public.menu_items FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers and admins can manage menu items" ON public.menu_items FOR ALL TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers can create menu items in their branch" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers can update menu items in their branch" ON public.menu_items FOR UPDATE TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete menu items" ON public.menu_items FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "All authenticated users can view menu items in their branch" ON public.menu_items FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));

-- Inventory
CREATE POLICY "Staff can view inventory in their branch" ON public.inventory FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM menu_items mi WHERE mi.id = inventory.menu_item_id AND ((mi.branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()))));
CREATE POLICY "Managers and admins can manage inventory" ON public.inventory FOR ALL TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers can insert inventory in their branch" ON public.inventory FOR INSERT TO authenticated WITH CHECK ((EXISTS (SELECT 1 FROM menu_items mi WHERE mi.id = inventory.menu_item_id AND mi.branch_id = public.get_user_branch_id(auth.uid()) AND public.is_manager_or_admin(auth.uid()))) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers can update inventory in their branch" ON public.inventory FOR UPDATE TO authenticated USING ((EXISTS (SELECT 1 FROM menu_items mi WHERE mi.id = inventory.menu_item_id AND mi.branch_id = public.get_user_branch_id(auth.uid()) AND public.is_manager_or_admin(auth.uid()))) OR public.is_admin(auth.uid()));
CREATE POLICY "All authenticated users can view inventory in their branch" ON public.inventory FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));

-- Inventory History
CREATE POLICY "Staff can view inventory history in their branch" ON public.inventory_history FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Staff can create inventory history in their branch" ON public.inventory_history FOR INSERT TO authenticated WITH CHECK ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));

-- Restaurant Tables
CREATE POLICY "Staff can view tables in their branch" ON public.restaurant_tables FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers and admins can manage tables" ON public.restaurant_tables FOR INSERT TO authenticated WITH CHECK (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers can create tables in their branch" ON public.restaurant_tables FOR INSERT TO authenticated WITH CHECK (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers can update tables in their branch" ON public.restaurant_tables FOR UPDATE TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers and admins can delete tables" ON public.restaurant_tables FOR DELETE TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete tables" ON public.restaurant_tables FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "All authenticated users can view tables in their branch" ON public.restaurant_tables FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "All authenticated users can update table status in their branch" ON public.restaurant_tables FOR UPDATE TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));

-- Order Sequences
CREATE POLICY "Users can view sequences in their branch" ON public.order_sequences FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "System can manage sequences" ON public.order_sequences FOR ALL TO authenticated USING (public.is_manager_or_admin(auth.uid()));

-- Orders
CREATE POLICY "Cashiers, kitchen, managers, admins can view orders in their br" ON public.orders FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Cashiers and above can create orders in their branch" ON public.orders FOR INSERT TO authenticated WITH CHECK ((branch_id = public.get_user_branch_id(auth.uid())) AND (public.has_role(auth.uid(), 'cashier') OR public.has_role(auth.uid(), 'manager') OR public.is_admin(auth.uid())));
CREATE POLICY "Managers and admins can manage all orders in their branch" ON public.orders FOR ALL TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Cashiers can update unpaid orders in their branch" ON public.orders FOR UPDATE TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) AND public.has_role(auth.uid(), 'cashier') AND (locked_at IS NULL));
CREATE POLICY "Kitchen can update order status only" ON public.orders FOR UPDATE TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) AND public.has_role(auth.uid(), 'kitchen'));

-- Order Items
CREATE POLICY "All authenticated users can view order items in their branch" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND ((o.branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()))));
CREATE POLICY "Cashiers can add items to unlocked orders" ON public.order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.branch_id = public.get_user_branch_id(auth.uid()) AND o.locked_at IS NULL AND (public.has_role(auth.uid(), 'cashier') OR public.is_manager_or_admin(auth.uid()))));
CREATE POLICY "Cashiers can update items in unlocked orders" ON public.order_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.branch_id = public.get_user_branch_id(auth.uid()) AND o.locked_at IS NULL AND (public.has_role(auth.uid(), 'cashier') OR public.is_manager_or_admin(auth.uid()))));
CREATE POLICY "Cashiers can delete items from unlocked orders" ON public.order_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.branch_id = public.get_user_branch_id(auth.uid()) AND o.locked_at IS NULL AND (public.has_role(auth.uid(), 'cashier') OR public.is_manager_or_admin(auth.uid()))));
CREATE POLICY "Kitchen staff can update item status" ON public.order_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND o.branch_id = public.get_user_branch_id(auth.uid()) AND (public.has_role(auth.uid(), 'kitchen') OR public.is_manager_or_admin(auth.uid()))));
CREATE POLICY "Managers and admins can manage order items" ON public.order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM orders o WHERE ((o.id = order_items.order_id) AND ((o.branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid()))) OR public.is_admin(auth.uid())));

-- Payments
CREATE POLICY "Cashiers can insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK ((branch_id = public.get_user_branch_id(auth.uid())) AND (public.has_role(auth.uid(), 'cashier') OR public.is_manager_or_admin(auth.uid())));
CREATE POLICY "Cashiers can view their own payments" ON public.payments FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) AND (processed_by = auth.uid()));
CREATE POLICY "Managers and admins can view payments in their branch" ON public.payments FOR SELECT TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));

-- Refunds
CREATE POLICY "Managers and admins can view refunds" ON public.refunds FOR SELECT TO authenticated USING (public.is_manager_or_admin(auth.uid()));
CREATE POLICY "Only managers and admins can create refunds" ON public.refunds FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_admin(auth.uid()));

-- Order Status Log
CREATE POLICY "Authenticated users can view logs for their branch orders" ON public.order_status_log FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_status_log.order_id AND ((o.branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()))));
CREATE POLICY "Authenticated users can insert status logs for their branch ord" ON public.order_status_log FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_status_log.order_id AND ((o.branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()))));

-- Staff Sessions
CREATE POLICY "Users can insert their own sessions" ON public.staff_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own sessions" ON public.staff_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.staff_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Managers can view branch sessions" ON public.staff_sessions FOR SELECT TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));

-- Cash Drawer Counts
CREATE POLICY "Users can view their own cash counts" ON public.cash_drawer_counts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cash counts" ON public.cash_drawer_counts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Managers can view branch cash counts" ON public.cash_drawer_counts FOR SELECT TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));

-- Reservations
CREATE POLICY "All authenticated users can view reservations in their branch" ON public.reservations FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Cashiers and above can create reservations" ON public.reservations FOR INSERT TO authenticated WITH CHECK ((branch_id = public.get_user_branch_id(auth.uid())) AND (public.has_role(auth.uid(), 'cashier') OR public.has_role(auth.uid(), 'manager') OR public.is_admin(auth.uid())));
CREATE POLICY "Cashiers and above can update reservations" ON public.reservations FOR UPDATE TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) AND (public.has_role(auth.uid(), 'cashier') OR public.has_role(auth.uid(), 'manager') OR public.is_admin(auth.uid())));
CREATE POLICY "Managers and admins can delete reservations" ON public.reservations FOR DELETE TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));

-- Printer Settings
CREATE POLICY "Admins and managers can manage printer settings" ON public.printer_settings FOR ALL TO authenticated USING (public.is_manager_or_admin(auth.uid()) AND ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()))) WITH CHECK (public.is_manager_or_admin(auth.uid()) AND ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid())));
CREATE POLICY "Staff can view printer settings" ON public.printer_settings FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));

-- =============================================
-- PHASE 6: Triggers
-- =============================================

-- Auto-create profile on user signup
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-assign super admin on signup
CREATE TRIGGER on_auth_user_created_admin AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.auto_assign_super_admin();

-- Auto-set order number
CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- Reservation → table status sync
CREATE TRIGGER update_table_on_reservation AFTER INSERT OR UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.update_table_status_from_reservation();

-- Updated_at triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.restaurant_tables FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.order_sequences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.printer_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================
-- PHASE 7: Indexes
-- =============================================
CREATE INDEX idx_profiles_staff_pin ON public.profiles(staff_pin) WHERE staff_pin IS NOT NULL;
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_branch_id ON public.profiles(branch_id);
CREATE INDEX idx_orders_branch_id ON public.orders(branch_id);
CREATE INDEX idx_orders_table_id ON public.orders(table_id);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_orders_status ON public.orders(order_status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_status ON public.order_items(item_status);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_idempotency ON public.payments(idempotency_key);
CREATE INDEX idx_inventory_menu_item ON public.inventory(menu_item_id);
CREATE INDEX idx_cash_drawer_counts_session ON public.cash_drawer_counts(session_id);
CREATE INDEX idx_reservations_date ON public.reservations(reservation_date);

-- =============================================
-- PHASE 8: Enable Realtime
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- =============================================
-- PHASE 9: Grant permissions
-- =============================================
GRANT EXECUTE ON FUNCTION public.validate_staff_pin(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.generate_order_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_demo_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_payment(UUID, NUMERIC, payment_method, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quick_pay_order(UUID, NUMERIC, payment_method, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status(UUID, order_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_refund(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_split_payment(UUID, JSONB) TO authenticated;

-- =============================================
-- PHASE 10: Initial data (optional)
-- =============================================
-- Uncomment to create a starter branch:
-- INSERT INTO public.branches (id, name, address, order_prefix)
-- VALUES ('a1111111-1111-1111-1111-111111111111', 'Main Branch', 'Your Address', 'MB');

-- =============================================
-- SCHEMA COMPLETE!
-- =============================================
-- Next steps:
-- 1. Deploy edge functions: pin-login, create-staff (via Supabase CLI)
-- 2. Sign up a user through your app
-- 3. Run: SELECT public.bootstrap_demo_admin('a1111111-1111-1111-1111-111111111111');
-- 4. Configure env vars: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
