-- Add table_type for distinguishing bar vs dining tables
ALTER TABLE public.restaurant_tables 
ADD COLUMN IF NOT EXISTS table_type TEXT DEFAULT 'dining';

-- Add merged_with column to track merged tables
ALTER TABLE public.restaurant_tables 
ADD COLUMN IF NOT EXISTS merged_with UUID[] DEFAULT '{}';

-- Add is_merged flag
ALTER TABLE public.restaurant_tables 
ADD COLUMN IF NOT EXISTS is_merged BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.restaurant_tables.table_type IS 'Type of table: dining, bar, booth, outdoor';
COMMENT ON COLUMN public.restaurant_tables.merged_with IS 'Array of table IDs that are merged with this table';
COMMENT ON COLUMN public.restaurant_tables.is_merged IS 'True if this table is currently part of a merge group';