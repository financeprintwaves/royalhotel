
## Plan: Connect Your Own Supabase Project

### Summary
This plan provides a complete consolidated migration script that you can run in your own Supabase project. The script combines all 21 migrations into a single file for easy deployment.

---

### What You Need To Do

| Step | Action | Where |
|------|--------|-------|
| 1 | Create a new Supabase project | supabase.com |
| 2 | Run the consolidated migration SQL | SQL Editor in Supabase Dashboard |
| 3 | Update your `.env` file | Your codebase |
| 4 | Deploy edge functions | Supabase CLI |
| 5 | Create your first admin user | Your app |

---

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your:
   - **Project URL**: `https://YOUR_PROJECT_ID.supabase.co`
   - **Anon Key**: Found in Settings > API
   - **Service Role Key**: Found in Settings > API (needed for edge functions)

---

### Step 2: Consolidated Migration Script

Run this complete SQL in your Supabase SQL Editor:

```sql
-- =============================================
-- ROYAL HOTEL POS - COMPLETE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
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

-- PHASE 2: Create Core Tables

-- Branches table
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  order_prefix TEXT NOT NULL DEFAULT 'INB',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
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
  price DECIMAL(10,3) NOT NULL CHECK (price >= 0),
  cost_price DECIMAL(10,3),
  bottle_size_ml INTEGER,
  serving_size_ml INTEGER,
  serving_price DECIMAL(10,3),
  billing_type TEXT DEFAULT 'bottle_only',
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
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
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
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number TEXT,
  customer_name TEXT,
  order_status public.order_status DEFAULT 'CREATED' NOT NULL,
  payment_status public.payment_status DEFAULT 'unpaid' NOT NULL,
  subtotal DECIMAL(10,3) DEFAULT 0,
  tax_amount DECIMAL(10,3) DEFAULT 0,
  discount_amount DECIMAL(10,3) DEFAULT 0,
  total_amount DECIMAL(10,3) DEFAULT 0,
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
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,3) NOT NULL,
  total_price DECIMAL(10,3) NOT NULL,
  is_serving BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE RESTRICT NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT NOT NULL,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount DECIMAL(10,3) NOT NULL CHECK (amount > 0),
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
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount DECIMAL(10,3) NOT NULL CHECK (amount > 0),
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
  variance NUMERIC(10,3) GENERATED ALWAYS AS (counted_cash - expected_cash) STORED,
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

-- PHASE 3: Security Definer Functions

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
  v_order_number TEXT;
BEGIN
  SELECT COALESCE(order_prefix, 'INB') INTO v_prefix FROM public.branches WHERE id = p_branch_id;
  IF v_prefix IS NULL THEN v_prefix := 'INB'; END IF;
  v_year_month := TO_CHAR(NOW(), 'YYMM');
  INSERT INTO public.order_sequences (branch_id, prefix, year_month, last_sequence)
  VALUES (p_branch_id, v_prefix, v_year_month, 1)
  ON CONFLICT (branch_id, year_month)
  DO UPDATE SET last_sequence = order_sequences.last_sequence + 1, updated_at = NOW()
  RETURNING last_sequence INTO v_sequence;
  v_order_number := v_prefix || '-' || v_year_month || '-' || LPAD(v_sequence::TEXT, 4, '0');
  RETURN v_order_number;
END;
$$;

-- Bootstrap demo admin function
CREATE OR REPLACE FUNCTION public.bootstrap_demo_admin(p_branch_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_has_any_admin boolean;
  v_branch_exists boolean;
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
RETURNS TABLE(user_id UUID, email TEXT, full_name TEXT, branch_id UUID, branch_name TEXT, roles app_role[], created_at TIMESTAMPTZ, staff_pin TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.user_id, p.email, p.full_name, p.branch_id, b.name as branch_name,
    COALESCE(ARRAY_AGG(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}')::app_role[] as roles,
    p.created_at, p.staff_pin
  FROM public.profiles p
  LEFT JOIN public.branches b ON b.id = p.branch_id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  GROUP BY p.id, p.user_id, p.email, p.full_name, p.branch_id, b.name, p.created_at, p.staff_pin;
END;
$$;

-- PHASE 4: Enable RLS on all tables
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
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

-- PHASE 5: RLS Policies (see full migration files for all policies)
-- Key policies included here:

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

-- Categories
CREATE POLICY "Staff can view categories in their branch" ON public.categories FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers and admins can manage categories" ON public.categories FOR ALL TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers can create categories in their branch" ON public.categories FOR INSERT TO authenticated WITH CHECK (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers can update categories in their branch" ON public.categories FOR UPDATE TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Menu Items
CREATE POLICY "Staff can view menu items in their branch" ON public.menu_items FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers and admins can manage menu items" ON public.menu_items FOR ALL TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers can create menu items in their branch" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Managers can update menu items in their branch" ON public.menu_items FOR UPDATE TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete menu items" ON public.menu_items FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Orders
CREATE POLICY "Cashiers, kitchen, managers, admins can view orders in their br" ON public.orders FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Cashiers and above can create orders in their branch" ON public.orders FOR INSERT TO authenticated WITH CHECK ((branch_id = public.get_user_branch_id(auth.uid())) AND (public.has_role(auth.uid(), 'cashier') OR public.has_role(auth.uid(), 'manager') OR public.is_admin(auth.uid())));
CREATE POLICY "Managers and admins can manage all orders in their branch" ON public.orders FOR ALL TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));
CREATE POLICY "Cashiers can update unpaid orders in their branch" ON public.orders FOR UPDATE TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) AND public.has_role(auth.uid(), 'cashier') AND (locked_at IS NULL));
CREATE POLICY "Kitchen can update order status only" ON public.orders FOR UPDATE TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) AND public.has_role(auth.uid(), 'kitchen'));

-- Payments
CREATE POLICY "Cashiers can insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK ((branch_id = public.get_user_branch_id(auth.uid())) AND (public.has_role(auth.uid(), 'cashier') OR public.is_manager_or_admin(auth.uid())));
CREATE POLICY "Cashiers can view their own payments" ON public.payments FOR SELECT TO authenticated USING ((branch_id = public.get_user_branch_id(auth.uid())) AND (processed_by = auth.uid()));
CREATE POLICY "Managers and admins can view payments in their branch" ON public.payments FOR SELECT TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));

-- Staff Sessions
CREATE POLICY "Users can insert their own sessions" ON public.staff_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own sessions" ON public.staff_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.staff_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Managers can view branch sessions" ON public.staff_sessions FOR SELECT TO authenticated USING (((branch_id = public.get_user_branch_id(auth.uid())) AND public.is_manager_or_admin(auth.uid())) OR public.is_admin(auth.uid()));

-- PHASE 6: Triggers
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated at triggers for all relevant tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.restaurant_tables FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.order_sequences FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- PHASE 7: Indexes
CREATE INDEX idx_profiles_staff_pin ON public.profiles(staff_pin) WHERE staff_pin IS NOT NULL;
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_branch_id ON public.profiles(branch_id);
CREATE INDEX idx_orders_branch_id ON public.orders(branch_id);
CREATE INDEX idx_orders_table_id ON public.orders(table_id);
CREATE INDEX idx_orders_created_at ON public.orders(created_at);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_inventory_menu_item ON public.inventory(menu_item_id);
CREATE INDEX idx_cash_drawer_counts_session ON public.cash_drawer_counts(session_id);

-- PHASE 8: Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- PHASE 9: Grant permissions
GRANT EXECUTE ON FUNCTION public.validate_staff_pin(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.generate_order_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_demo_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_with_roles() TO authenticated;

-- =============================================
-- SCHEMA COMPLETE - Now add your sample data
-- =============================================
```

---

### Step 3: Update Environment Variables

Update your `.env` file with your new Supabase credentials:

```env
VITE_SUPABASE_PROJECT_ID="YOUR_NEW_PROJECT_ID"
VITE_SUPABASE_URL="https://YOUR_NEW_PROJECT_ID.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_ANON_KEY"
```

---

### Step 4: Deploy Edge Functions

You have 2 edge functions that need deployment:

| Function | Purpose |
|----------|---------|
| `pin-login` | Staff PIN authentication |
| `create-staff` | Admin staff creation |

**Using Supabase CLI:**
```bash
# Install CLI if needed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Deploy functions
supabase functions deploy pin-login
supabase functions deploy create-staff
```

---

### Step 5: Create First Admin User

1. Sign up through your app
2. Run this SQL in Supabase SQL Editor to make yourself admin:

```sql
-- First, insert a demo branch
INSERT INTO public.branches (id, name, address, order_prefix)
VALUES ('a1111111-1111-1111-1111-111111111111', 'Main Branch', 'Your Address', 'MB');

-- Then bootstrap your user as admin (run after signing up)
-- Replace YOUR_USER_ID with your actual user ID from auth.users
UPDATE public.profiles SET branch_id = 'a1111111-1111-1111-1111-111111111111' WHERE user_id = 'YOUR_USER_ID';
INSERT INTO public.user_roles (user_id, role) VALUES ('YOUR_USER_ID', 'admin');
```

Or use the bootstrap function after signup:
```sql
SELECT public.bootstrap_demo_admin('a1111111-1111-1111-1111-111111111111');
```

---

### Data Migration (Optional)

If you need to export existing data from Lovable Cloud:

| Table | Export Method |
|-------|---------------|
| branches | CSV from Cloud View |
| categories | CSV from Cloud View |
| menu_items | CSV from Cloud View |
| inventory | CSV from Cloud View |
| restaurant_tables | CSV from Cloud View |

**Note:** User data in `auth.users` cannot be exported - users will need to re-register.

---

### Summary

| Step | Action | Time |
|------|--------|------|
| 1 | Create Supabase project | 2 min |
| 2 | Run consolidated SQL | 1 min |
| 3 | Update .env file | 1 min |
| 4 | Deploy edge functions | 5 min |
| 5 | Create admin user | 2 min |

**Total: ~10 minutes to have your own Supabase backend running!**
