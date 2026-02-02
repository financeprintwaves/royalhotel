-- Add portion options for flexible size/price combinations
ALTER TABLE public.menu_items 
ADD COLUMN portion_options JSONB DEFAULT NULL;

COMMENT ON COLUMN public.menu_items.portion_options IS 
  'JSON array of portion options: [{name, price, size_ml}]';