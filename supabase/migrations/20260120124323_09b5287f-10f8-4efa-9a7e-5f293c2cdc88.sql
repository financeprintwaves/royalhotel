-- Drop existing policies on staff_sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.staff_sessions;
DROP POLICY IF EXISTS "Managers can view branch sessions" ON public.staff_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.staff_sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.staff_sessions;

-- Create stricter RLS policies for staff_sessions

-- Users can only view their own sessions (strict)
CREATE POLICY "Users can view their own sessions"
ON public.staff_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Managers and admins can view all sessions in their branch
CREATE POLICY "Managers can view branch sessions"
ON public.staff_sessions
FOR SELECT
USING (
  ((branch_id = get_user_branch_id(auth.uid())) AND is_manager_or_admin(auth.uid()))
  OR is_admin(auth.uid())
);

-- Users can only insert sessions for themselves
CREATE POLICY "Users can insert their own sessions"
ON public.staff_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own sessions
CREATE POLICY "Users can update their own sessions"
ON public.staff_sessions
FOR UPDATE
USING (auth.uid() = user_id);