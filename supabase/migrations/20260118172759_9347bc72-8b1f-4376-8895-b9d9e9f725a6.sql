-- Fix the permissive RLS policy on order_status_log
-- Replace the overly permissive INSERT policy with a proper one

DROP POLICY IF EXISTS "System can insert status logs" ON public.order_status_log;

CREATE POLICY "Authenticated users can insert status logs for their branch orders"
ON public.order_status_log FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
    AND (o.branch_id = public.get_user_branch_id(auth.uid()) OR public.is_admin(auth.uid()))
  )
);

-- Fix function search_path for handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;