-- Add customer_name column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- Add index for searching orders by customer name
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON public.orders USING gin(to_tsvector('english', COALESCE(customer_name, '')));

-- Add index for date-based searching
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);