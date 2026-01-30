-- Add kitchen routing flag to categories
ALTER TABLE public.categories 
ADD COLUMN requires_kitchen BOOLEAN NOT NULL DEFAULT false;

-- Comment for documentation
COMMENT ON COLUMN public.categories.requires_kitchen IS 
  'When true, items in this category are sent to kitchen for preparation';