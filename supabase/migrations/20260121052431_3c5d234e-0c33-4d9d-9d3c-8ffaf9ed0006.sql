-- Add position and shape columns to restaurant_tables for floor layout
ALTER TABLE public.restaurant_tables 
ADD COLUMN IF NOT EXISTS position_x INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS position_y INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 120,
ADD COLUMN IF NOT EXISTS shape TEXT DEFAULT 'square';

-- Add comment for documentation
COMMENT ON COLUMN public.restaurant_tables.position_x IS 'X position on floor canvas';
COMMENT ON COLUMN public.restaurant_tables.position_y IS 'Y position on floor canvas';
COMMENT ON COLUMN public.restaurant_tables.shape IS 'Table shape: square, round, or rectangle';