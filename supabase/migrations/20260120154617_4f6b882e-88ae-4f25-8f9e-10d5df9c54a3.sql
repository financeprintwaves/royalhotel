-- Add order_number column to orders table for sequential numbering
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Create index for order number lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- Create sequence table for tracking order numbers per branch per month
CREATE TABLE IF NOT EXISTS public.order_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  year_month TEXT NOT NULL, -- Format: YYMM (e.g., "2601" for Jan 2026)
  last_sequence INTEGER NOT NULL DEFAULT 0,
  prefix TEXT NOT NULL DEFAULT 'INB', -- Can be customized per branch
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, year_month)
);

-- Enable RLS on order_sequences
ALTER TABLE public.order_sequences ENABLE ROW LEVEL SECURITY;

-- Policies for order_sequences (all authenticated users in branch can read, system handles updates)
CREATE POLICY "Users can view sequences in their branch"
ON public.order_sequences
FOR SELECT
USING (
  (branch_id = get_user_branch_id(auth.uid())) 
  OR is_admin(auth.uid())
);

CREATE POLICY "System can manage sequences"
ON public.order_sequences
FOR ALL
USING (is_manager_or_admin(auth.uid()));

-- Function to generate next order number atomically
CREATE OR REPLACE FUNCTION public.generate_order_number(p_branch_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year_month TEXT;
  v_prefix TEXT := 'INB';
  v_sequence INTEGER;
  v_order_number TEXT;
BEGIN
  -- Get current year (last 2 digits) and month (2 digits)
  v_year_month := TO_CHAR(NOW(), 'YYMM');
  
  -- Upsert the sequence record and get the next sequence number atomically
  INSERT INTO public.order_sequences (branch_id, year_month, last_sequence, prefix)
  VALUES (p_branch_id, v_year_month, 1, v_prefix)
  ON CONFLICT (branch_id, year_month)
  DO UPDATE SET 
    last_sequence = public.order_sequences.last_sequence + 1,
    updated_at = now()
  RETURNING last_sequence, prefix INTO v_sequence, v_prefix;
  
  -- Format: PREFIX + YYMM + 3-digit sequence (e.g., INB2601001)
  v_order_number := v_prefix || v_year_month || LPAD(v_sequence::TEXT, 3, '0');
  
  RETURN v_order_number;
END;
$$;

-- Trigger to auto-generate order number on insert
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set order_number if not already set
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.generate_order_number(NEW.branch_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for automatic order number generation
DROP TRIGGER IF EXISTS trigger_set_order_number ON public.orders;
CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();