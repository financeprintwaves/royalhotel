-- Create inventory_history table to track all stock changes
CREATE TABLE public.inventory_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('add', 'set', 'deduct', 'refund', 'threshold', 'initial')),
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_inventory_history_inventory_id ON public.inventory_history(inventory_id);
CREATE INDEX idx_inventory_history_branch_id ON public.inventory_history(branch_id);
CREATE INDEX idx_inventory_history_created_at ON public.inventory_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.inventory_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_history
CREATE POLICY "Staff can view inventory history in their branch"
ON public.inventory_history FOR SELECT
TO authenticated
USING (
  branch_id = public.get_user_branch_id(auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Staff can create inventory history in their branch"
ON public.inventory_history FOR INSERT
TO authenticated
WITH CHECK (
  branch_id = public.get_user_branch_id(auth.uid())
  OR public.is_admin(auth.uid())
);

-- Enable realtime for orders (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END$$;