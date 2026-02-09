ALTER TABLE public.orders ADD COLUMN is_foc BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN foc_dancer_name TEXT;