-- =============================================
-- PHASE 1: Create ENUM Types
-- =============================================

-- Order status workflow enum
CREATE TYPE public.order_status AS ENUM (
  'CREATED',
  'SENT_TO_KITCHEN',
  'SERVED',
  'BILL_REQUESTED',
  'PAID',
  'CLOSED'
);

-- Payment status enum
CREATE TYPE public.payment_status AS ENUM (
  'unpaid',
  'pending',
  'paid',
  'refunded'
);

-- User role enum
CREATE TYPE public.app_role AS ENUM (
  'admin',
  'manager',
  'cashier',
  'kitchen'
);

-- Payment method enum
CREATE TYPE public.payment_method AS ENUM (
  'cash',
  'card',
  'mobile',
  'split'
);

-- =============================================
-- PHASE 2: Create Core Tables
-- =============================================

-- Branches table (multi-location support)
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Menu categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
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
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
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
  low_stock_threshold INTEGER DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch_id, menu_item_id)
);

-- Restaurant tables
CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  table_number TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch_id, table_number)
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_status public.order_status DEFAULT 'CREATED' NOT NULL,
  payment_status public.payment_status DEFAULT 'unpaid' NOT NULL,
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  locked_at TIMESTAMPTZ, -- Set when order is paid, prevents modifications
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payments table (immutable - no updates/deletes allowed)
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT NOT NULL,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method public.payment_method NOT NULL,
  payment_status public.payment_status DEFAULT 'pending' NOT NULL,
  idempotency_key UUID NOT NULL UNIQUE, -- Prevents duplicate payments on retry
  transaction_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Refunds table (append-only audit trail)
CREATE TABLE public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE RESTRICT NOT NULL,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Order status audit log
CREATE TABLE public.order_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  previous_status public.order_status,
  new_status public.order_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PHASE 3: Security Definer Functions
-- =============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Get user's branch ID
CREATE OR REPLACE FUNCTION public.get_user_branch_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Check if user is admin (can access all branches)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Check if user is manager or admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'manager')
$$;

-- Check if order is editable (not paid or closed)
CREATE OR REPLACE FUNCTION public.is_order_editable(_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders
    WHERE id = _order_id
      AND order_status NOT IN ('PAID', 'CLOSED')
      AND locked_at IS NULL
  )
$$;

-- =============================================
-- PHASE 4: Row Level Security Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_log ENABLE ROW LEVEL SECURITY;

-- BRANCHES POLICIES
CREATE POLICY "Admins can manage all branches"
ON public.branches FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their assigned branch"
ON public.branches FOR SELECT
TO authenticated
USING (id = public.get_user_branch_id(auth.uid()));

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- USER ROLES POLICIES (Very restrictive - only admins)
CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- CATEGORIES POLICIES
CREATE POLICY "All authenticated users can view categories in their branch"
ON public.categories FOR SELECT
TO authenticated
USING (
  branch_id = public.get_user_branch_id(auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Managers and admins can manage categories"
ON public.categories FOR ALL
TO authenticated
USING (
  (branch_id = public.get_user_branch_id(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  OR public.is_admin(auth.uid())
);

-- MENU ITEMS POLICIES
CREATE POLICY "All authenticated users can view menu items in their branch"
ON public.menu_items FOR SELECT
TO authenticated
USING (
  branch_id = public.get_user_branch_id(auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Managers and admins can manage menu items"
ON public.menu_items FOR ALL
TO authenticated
USING (
  (branch_id = public.get_user_branch_id(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  OR public.is_admin(auth.uid())
);

-- INVENTORY POLICIES
CREATE POLICY "All authenticated users can view inventory in their branch"
ON public.inventory FOR SELECT
TO authenticated
USING (
  branch_id = public.get_user_branch_id(auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Managers and admins can manage inventory"
ON public.inventory FOR ALL
TO authenticated
USING (
  (branch_id = public.get_user_branch_id(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  OR public.is_admin(auth.uid())
);

-- RESTAURANT TABLES POLICIES
CREATE POLICY "All authenticated users can view tables in their branch"
ON public.restaurant_tables FOR SELECT
TO authenticated
USING (
  branch_id = public.get_user_branch_id(auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "All authenticated users can update table status in their branch"
ON public.restaurant_tables FOR UPDATE
TO authenticated
USING (
  branch_id = public.get_user_branch_id(auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Managers and admins can manage tables"
ON public.restaurant_tables FOR INSERT
TO authenticated
WITH CHECK (
  (branch_id = public.get_user_branch_id(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Managers and admins can delete tables"
ON public.restaurant_tables FOR DELETE
TO authenticated
USING (
  (branch_id = public.get_user_branch_id(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  OR public.is_admin(auth.uid())
);

-- ORDERS POLICIES
CREATE POLICY "Cashiers, kitchen, managers, admins can view orders in their branch"
ON public.orders FOR SELECT
TO authenticated
USING (
  branch_id = public.get_user_branch_id(auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Cashiers and above can create orders in their branch"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (
  branch_id = public.get_user_branch_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'cashier')
    OR public.has_role(auth.uid(), 'manager')
    OR public.is_admin(auth.uid())
  )
);

CREATE POLICY "Kitchen can update order status only"
ON public.orders FOR UPDATE
TO authenticated
USING (
  branch_id = public.get_user_branch_id(auth.uid())
  AND public.has_role(auth.uid(), 'kitchen')
);

CREATE POLICY "Cashiers can update unpaid orders in their branch"
ON public.orders FOR UPDATE
TO authenticated
USING (
  branch_id = public.get_user_branch_id(auth.uid())
  AND public.has_role(auth.uid(), 'cashier')
  AND locked_at IS NULL
);

CREATE POLICY "Managers and admins can manage all orders in their branch"
ON public.orders FOR ALL
TO authenticated
USING (
  (branch_id = public.get_user_branch_id(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  OR public.is_admin(auth.uid())
);

-- ORDER ITEMS POLICIES
CREATE POLICY "All authenticated users can view order items in their branch"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND (o.branch_id = public.get_user_branch_id(auth.uid()) OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "Cashiers can add items to unlocked orders"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND o.branch_id = public.get_user_branch_id(auth.uid())
    AND o.locked_at IS NULL
    AND (public.has_role(auth.uid(), 'cashier') OR public.is_manager_or_admin(auth.uid()))
  )
);

CREATE POLICY "Managers and admins can manage order items"
ON public.order_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND (o.branch_id = public.get_user_branch_id(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
    OR public.is_admin(auth.uid())
  )
);

-- PAYMENTS POLICIES (Immutable - no UPDATE or DELETE)
CREATE POLICY "Cashiers can insert payments"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (
  branch_id = public.get_user_branch_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'cashier')
    OR public.is_manager_or_admin(auth.uid())
  )
);

CREATE POLICY "Managers and admins can view payments in their branch"
ON public.payments FOR SELECT
TO authenticated
USING (
  (branch_id = public.get_user_branch_id(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Cashiers can view their own payments"
ON public.payments FOR SELECT
TO authenticated
USING (
  branch_id = public.get_user_branch_id(auth.uid())
  AND processed_by = auth.uid()
);

-- No UPDATE or DELETE policies for payments (immutable)

-- REFUNDS POLICIES
CREATE POLICY "Only managers and admins can create refunds"
ON public.refunds FOR INSERT
TO authenticated
WITH CHECK (
  public.is_manager_or_admin(auth.uid())
);

CREATE POLICY "Managers and admins can view refunds"
ON public.refunds FOR SELECT
TO authenticated
USING (
  public.is_manager_or_admin(auth.uid())
);

-- ORDER STATUS LOG POLICIES
CREATE POLICY "Authenticated users can view logs for their branch orders"
ON public.order_status_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND (o.branch_id = public.get_user_branch_id(auth.uid()) OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "System can insert status logs"
ON public.order_status_log FOR INSERT
TO authenticated
WITH CHECK (true);

-- =============================================
-- PHASE 5: Atomic RPC Functions
-- =============================================

-- Finalize payment atomically
CREATE OR REPLACE FUNCTION public.finalize_payment(
  p_order_id UUID,
  p_amount DECIMAL,
  p_payment_method public.payment_method,
  p_idempotency_key UUID,
  p_transaction_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_payment_id UUID;
  v_user_id UUID;
  v_user_branch_id UUID;
  v_existing_payment RECORD;
  v_item RECORD;
BEGIN
  v_user_id := auth.uid();
  v_user_branch_id := public.get_user_branch_id(v_user_id);
  
  -- Check idempotency - return existing payment if already processed
  SELECT * INTO v_existing_payment
  FROM public.payments
  WHERE idempotency_key = p_idempotency_key;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'payment_id', v_existing_payment.id,
      'message', 'Payment already processed (idempotent)',
      'idempotent', true
    );
  END IF;
  
  -- Get and lock the order
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Verify branch access
  IF v_order.branch_id != v_user_branch_id AND NOT public.is_admin(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied to this branch');
  END IF;
  
  -- Check order status
  IF v_order.order_status NOT IN ('BILL_REQUESTED', 'SERVED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order must be in BILL_REQUESTED or SERVED status');
  END IF;
  
  IF v_order.locked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is already locked');
  END IF;
  
  -- Validate amount
  IF p_amount < v_order.total_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment amount is less than order total');
  END IF;
  
  -- Insert payment record
  INSERT INTO public.payments (
    order_id, branch_id, processed_by, amount, payment_method,
    payment_status, idempotency_key, transaction_reference, notes
  ) VALUES (
    p_order_id, v_order.branch_id, v_user_id, p_amount, p_payment_method,
    'paid', p_idempotency_key, p_transaction_reference, p_notes
  )
  RETURNING id INTO v_payment_id;
  
  -- Update order status
  UPDATE public.orders
  SET 
    order_status = 'PAID',
    payment_status = 'paid',
    locked_at = now(),
    updated_at = now()
  WHERE id = p_order_id;
  
  -- Log status change
  INSERT INTO public.order_status_log (order_id, previous_status, new_status, changed_by)
  VALUES (p_order_id, v_order.order_status, 'PAID', v_user_id);
  
  -- Deduct inventory for each order item
  FOR v_item IN 
    SELECT oi.menu_item_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    UPDATE public.inventory
    SET 
      quantity = quantity - v_item.quantity,
      updated_at = now()
    WHERE branch_id = v_order.branch_id
      AND menu_item_id = v_item.menu_item_id;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'message', 'Payment processed successfully',
    'idempotent', false
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Process split payment
CREATE OR REPLACE FUNCTION public.process_split_payment(
  p_order_id UUID,
  p_payments JSONB -- Array of {amount, payment_method, idempotency_key}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_user_id UUID;
  v_user_branch_id UUID;
  v_total_paid DECIMAL := 0;
  v_payment JSONB;
  v_payment_id UUID;
  v_item RECORD;
  v_existing_payment RECORD;
BEGIN
  v_user_id := auth.uid();
  v_user_branch_id := public.get_user_branch_id(v_user_id);
  
  -- Get and lock the order
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Verify branch access
  IF v_order.branch_id != v_user_branch_id AND NOT public.is_admin(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;
  
  -- Check order status
  IF v_order.order_status NOT IN ('BILL_REQUESTED', 'SERVED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order must be in BILL_REQUESTED or SERVED status');
  END IF;
  
  IF v_order.locked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is already locked');
  END IF;
  
  -- Process each payment
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    -- Check idempotency for each split payment
    SELECT * INTO v_existing_payment
    FROM public.payments
    WHERE idempotency_key = (v_payment->>'idempotency_key')::UUID;
    
    IF NOT FOUND THEN
      INSERT INTO public.payments (
        order_id, branch_id, processed_by, amount, payment_method,
        payment_status, idempotency_key
      ) VALUES (
        p_order_id, v_order.branch_id, v_user_id, 
        (v_payment->>'amount')::DECIMAL,
        (v_payment->>'payment_method')::public.payment_method,
        'paid',
        (v_payment->>'idempotency_key')::UUID
      );
    END IF;
    
    v_total_paid := v_total_paid + (v_payment->>'amount')::DECIMAL;
  END LOOP;
  
  -- Validate total covers order
  IF v_total_paid < v_order.total_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Total payments do not cover order amount');
  END IF;
  
  -- Update order status
  UPDATE public.orders
  SET 
    order_status = 'PAID',
    payment_status = 'paid',
    locked_at = now(),
    updated_at = now()
  WHERE id = p_order_id;
  
  -- Log status change
  INSERT INTO public.order_status_log (order_id, previous_status, new_status, changed_by)
  VALUES (p_order_id, v_order.order_status, 'PAID', v_user_id);
  
  -- Deduct inventory
  FOR v_item IN 
    SELECT oi.menu_item_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id
  LOOP
    UPDATE public.inventory
    SET 
      quantity = quantity - v_item.quantity,
      updated_at = now()
    WHERE branch_id = v_order.branch_id
      AND menu_item_id = v_item.menu_item_id;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Split payment processed successfully',
    'total_paid', v_total_paid
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Process refund (Manager/Admin only)
CREATE OR REPLACE FUNCTION public.process_refund(
  p_payment_id UUID,
  p_amount DECIMAL,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_order RECORD;
  v_user_id UUID;
  v_refund_id UUID;
  v_item RECORD;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if user is manager or admin
  IF NOT public.is_manager_or_admin(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only managers and admins can process refunds');
  END IF;
  
  -- Get payment
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
  END IF;
  
  IF v_payment.payment_status = 'refunded' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment already refunded');
  END IF;
  
  IF p_amount > v_payment.amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Refund amount exceeds payment amount');
  END IF;
  
  -- Get order
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = v_payment.order_id;
  
  -- Create refund record
  INSERT INTO public.refunds (payment_id, processed_by, amount, reason)
  VALUES (p_payment_id, v_user_id, p_amount, p_reason)
  RETURNING id INTO v_refund_id;
  
  -- Update order status
  UPDATE public.orders
  SET 
    payment_status = 'refunded',
    updated_at = now()
  WHERE id = v_payment.order_id;
  
  -- Restore inventory
  FOR v_item IN 
    SELECT oi.menu_item_id, oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = v_payment.order_id
  LOOP
    UPDATE public.inventory
    SET 
      quantity = quantity + v_item.quantity,
      updated_at = now()
    WHERE branch_id = v_order.branch_id
      AND menu_item_id = v_item.menu_item_id;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'refund_id', v_refund_id,
    'message', 'Refund processed successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Update order status (with workflow validation)
CREATE OR REPLACE FUNCTION public.update_order_status(
  p_order_id UUID,
  p_new_status public.order_status
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_user_id UUID;
  v_user_branch_id UUID;
  v_valid_transition BOOLEAN := false;
BEGIN
  v_user_id := auth.uid();
  v_user_branch_id := public.get_user_branch_id(v_user_id);
  
  -- Get order
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Verify branch access
  IF v_order.branch_id != v_user_branch_id AND NOT public.is_admin(v_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;
  
  -- Cannot modify locked orders
  IF v_order.locked_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order is locked and cannot be modified');
  END IF;
  
  -- Validate workflow transition
  CASE v_order.order_status
    WHEN 'CREATED' THEN
      v_valid_transition := p_new_status = 'SENT_TO_KITCHEN';
    WHEN 'SENT_TO_KITCHEN' THEN
      v_valid_transition := p_new_status = 'SERVED';
    WHEN 'SERVED' THEN
      v_valid_transition := p_new_status = 'BILL_REQUESTED';
    WHEN 'BILL_REQUESTED' THEN
      v_valid_transition := p_new_status IN ('PAID', 'SERVED'); -- Can go back to SERVED if needed
    WHEN 'PAID' THEN
      v_valid_transition := p_new_status = 'CLOSED';
    WHEN 'CLOSED' THEN
      v_valid_transition := false; -- Cannot change from CLOSED
  END CASE;
  
  IF NOT v_valid_transition THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', format('Invalid status transition from %s to %s', v_order.order_status, p_new_status)
    );
  END IF;
  
  -- Role-based restrictions
  IF public.has_role(v_user_id, 'kitchen') THEN
    IF p_new_status NOT IN ('SENT_TO_KITCHEN', 'SERVED') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Kitchen staff can only update to SENT_TO_KITCHEN or SERVED');
    END IF;
  END IF;
  
  -- Update order status
  UPDATE public.orders
  SET 
    order_status = p_new_status,
    updated_at = now()
  WHERE id = p_order_id;
  
  -- Log status change
  INSERT INTO public.order_status_log (order_id, previous_status, new_status, changed_by)
  VALUES (p_order_id, v_order.order_status, p_new_status, v_user_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'previous_status', v_order.order_status,
    'new_status', p_new_status,
    'message', 'Order status updated successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =============================================
-- PHASE 6: Triggers and Indexes
-- =============================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_branches
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_categories
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_menu_items
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_restaurant_tables
  BEFORE UPDATE ON public.restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_orders
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Performance indexes
CREATE INDEX idx_orders_branch_status ON public.orders(branch_id, order_status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_idempotency ON public.payments(idempotency_key);
CREATE INDEX idx_inventory_branch_item ON public.inventory(branch_id, menu_item_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_branch_id ON public.profiles(branch_id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();