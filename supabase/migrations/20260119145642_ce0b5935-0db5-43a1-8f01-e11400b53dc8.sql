-- Create reservations table
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  party_size INTEGER NOT NULL DEFAULT 2,
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reservations
CREATE POLICY "All authenticated users can view reservations in their branch"
ON public.reservations FOR SELECT
USING ((branch_id = get_user_branch_id(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Cashiers and above can create reservations"
ON public.reservations FOR INSERT
WITH CHECK ((branch_id = get_user_branch_id(auth.uid())) AND 
  (has_role(auth.uid(), 'cashier') OR has_role(auth.uid(), 'manager') OR is_admin(auth.uid())));

CREATE POLICY "Cashiers and above can update reservations"
ON public.reservations FOR UPDATE
USING ((branch_id = get_user_branch_id(auth.uid())) AND 
  (has_role(auth.uid(), 'cashier') OR has_role(auth.uid(), 'manager') OR is_admin(auth.uid())));

CREATE POLICY "Managers and admins can delete reservations"
ON public.reservations FOR DELETE
USING (((branch_id = get_user_branch_id(auth.uid())) AND is_manager_or_admin(auth.uid())) OR is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for reservations
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;

-- Function to auto-update table status based on reservations
CREATE OR REPLACE FUNCTION public.update_table_status_from_reservation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Set table to reserved if reservation is confirmed and upcoming
    IF NEW.status = 'confirmed' AND NEW.reservation_date >= CURRENT_DATE THEN
      UPDATE public.restaurant_tables 
      SET status = 'reserved', updated_at = now()
      WHERE id = NEW.table_id AND status = 'available';
    END IF;
    
    -- Set table to occupied when seated
    IF NEW.status = 'seated' THEN
      UPDATE public.restaurant_tables 
      SET status = 'occupied', updated_at = now()
      WHERE id = NEW.table_id;
    END IF;
    
    -- Set table to cleaning when completed
    IF NEW.status = 'completed' THEN
      UPDATE public.restaurant_tables 
      SET status = 'cleaning', updated_at = now()
      WHERE id = NEW.table_id;
    END IF;
    
    -- Set table back to available if cancelled or no-show
    IF NEW.status IN ('cancelled', 'no_show') THEN
      UPDATE public.restaurant_tables 
      SET status = 'available', updated_at = now()
      WHERE id = NEW.table_id AND status = 'reserved';
    END IF;
    
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic table status updates
CREATE TRIGGER reservation_table_status_trigger
AFTER INSERT OR UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_table_status_from_reservation();

-- Add email column to profiles for staff management lookups
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update profiles RLS to allow admins to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (is_admin(auth.uid()));

-- Create a function to get all users with their roles for staff management
CREATE OR REPLACE FUNCTION public.get_staff_with_roles()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  branch_id UUID,
  branch_name TEXT,
  roles TEXT[],
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.email,
    p.full_name,
    p.branch_id,
    b.name as branch_name,
    COALESCE(ARRAY_AGG(ur.role::TEXT) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::TEXT[]) as roles,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.branches b ON b.id = p.branch_id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  GROUP BY p.user_id, p.email, p.full_name, p.branch_id, b.name, p.created_at
  ORDER BY p.created_at DESC
$$;