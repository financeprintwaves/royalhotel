-- Add menu session, daily special, and favorite support to menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS session TEXT DEFAULT 'all';

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS is_daily_special BOOLEAN DEFAULT false;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Add session constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public' AND tc.table_name = 'menu_items'
      AND tc.constraint_type = 'CHECK'
      AND tc.constraint_name = 'menu_items_session_check'
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT menu_items_session_check
      CHECK (session IN ('breakfast', 'lunch', 'dinner', 'all'));
  END IF;
END$$;