-- Add bar-specific columns to menu_items
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS bottle_size_ml INTEGER;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,3);
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS serving_size_ml INTEGER;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS serving_price NUMERIC(10,3);
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'bottle_only';

-- Add ml tracking to inventory for open bottles
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS ml_remaining INTEGER DEFAULT 0;

-- Add is_serving flag to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS is_serving BOOLEAN DEFAULT false;

-- Create billing_type check constraint
DO $$ BEGIN
  ALTER TABLE public.menu_items ADD CONSTRAINT menu_items_billing_type_check 
    CHECK (billing_type IN ('bottle_only', 'by_serving', 'service'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;