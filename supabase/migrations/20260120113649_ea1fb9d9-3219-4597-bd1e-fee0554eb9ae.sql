-- Create staff sessions table for login/logout tracking
CREATE TABLE public.staff_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  login_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_time TIMESTAMPTZ,
  cash_total NUMERIC(10,3) DEFAULT 0,
  card_total NUMERIC(10,3) DEFAULT 0,
  mobile_total NUMERIC(10,3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for active sessions lookup
CREATE INDEX idx_staff_sessions_user_active 
ON public.staff_sessions(user_id, logout_time) 
WHERE logout_time IS NULL;

-- Index for date range queries
CREATE INDEX idx_staff_sessions_login_time 
ON public.staff_sessions(login_time DESC);

-- Enable RLS
ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY "Users can view their own sessions" 
ON public.staff_sessions FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own sessions
CREATE POLICY "Users can insert their own sessions" 
ON public.staff_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own sessions
CREATE POLICY "Users can update their own sessions" 
ON public.staff_sessions FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy: Managers and admins can view all sessions in their branch
CREATE POLICY "Managers can view branch sessions" 
ON public.staff_sessions FOR SELECT 
USING (
  (branch_id = public.get_user_branch_id(auth.uid()) AND public.is_manager_or_admin(auth.uid()))
  OR public.is_admin(auth.uid())
);