-- Add order_prefix column to branches table
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS order_prefix TEXT NOT NULL DEFAULT 'INB';

-- Add constraint for prefix format (2-5 uppercase letters)
ALTER TABLE public.branches
ADD CONSTRAINT check_order_prefix CHECK (order_prefix ~ '^[A-Z]{2,5}$');

-- Update generate_order_number function to use branch-specific prefix
CREATE OR REPLACE FUNCTION public.generate_order_number(p_branch_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year_month TEXT;
  v_prefix TEXT;
  v_sequence INTEGER;
  v_order_number TEXT;
BEGIN
  -- Get branch prefix (fallback to 'INB' if null)
  SELECT COALESCE(order_prefix, 'INB') INTO v_prefix
  FROM public.branches WHERE id = p_branch_id;
  
  IF v_prefix IS NULL THEN
    v_prefix := 'INB';
  END IF;
  
  v_year_month := TO_CHAR(NOW(), 'YYMM');
  
  INSERT INTO public.order_sequences (branch_id, year_month, last_sequence, prefix)
  VALUES (p_branch_id, v_year_month, 1, v_prefix)
  ON CONFLICT (branch_id, year_month)
  DO UPDATE SET 
    last_sequence = public.order_sequences.last_sequence + 1,
    prefix = v_prefix,
    updated_at = now()
  RETURNING last_sequence INTO v_sequence;
  
  v_order_number := v_prefix || v_year_month || LPAD(v_sequence::TEXT, 3, '0');
  
  RETURN v_order_number;
END;
$$;