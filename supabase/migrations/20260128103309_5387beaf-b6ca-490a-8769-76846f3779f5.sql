-- Create cash_drawer_counts table for end-of-shift reconciliation
CREATE TABLE public.cash_drawer_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.staff_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  branch_id UUID REFERENCES public.branches(id) NOT NULL,
  expected_cash NUMERIC(10,3) NOT NULL DEFAULT 0,
  counted_cash NUMERIC(10,3) NOT NULL DEFAULT 0,
  variance NUMERIC(10,3) GENERATED ALWAYS AS (counted_cash - expected_cash) STORED,
  denomination_breakdown JSONB,
  notes TEXT,
  counted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_drawer_counts ENABLE ROW LEVEL SECURITY;

-- Users can insert their own cash counts
CREATE POLICY "Users can insert their own cash counts"
ON public.cash_drawer_counts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own cash counts
CREATE POLICY "Users can view their own cash counts"
ON public.cash_drawer_counts
FOR SELECT
USING (auth.uid() = user_id);

-- Managers can view all cash counts in their branch
CREATE POLICY "Managers can view branch cash counts"
ON public.cash_drawer_counts
FOR SELECT
USING (
  (branch_id = get_user_branch_id(auth.uid()) AND is_manager_or_admin(auth.uid()))
  OR is_admin(auth.uid())
);

-- Create index for faster lookups
CREATE INDEX idx_cash_drawer_counts_session ON public.cash_drawer_counts(session_id);
CREATE INDEX idx_cash_drawer_counts_user ON public.cash_drawer_counts(user_id);
CREATE INDEX idx_cash_drawer_counts_branch ON public.cash_drawer_counts(branch_id);