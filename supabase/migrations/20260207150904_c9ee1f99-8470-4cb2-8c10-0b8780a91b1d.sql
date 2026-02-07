-- Drop existing function to change return type (must be done first before table creation that the function references)
DROP FUNCTION IF EXISTS public.get_staff_with_roles();

-- Create junction table for multi-branch assignments
CREATE TABLE IF NOT EXISTS public.user_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, branch_id)
);

-- Enable RLS
ALTER TABLE public.user_branches ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (no IF NOT EXISTS for policies)
DROP POLICY IF EXISTS "Users can view their own branch assignments" ON public.user_branches;
DROP POLICY IF EXISTS "Admins can manage all branch assignments" ON public.user_branches;

-- Users can view their own branch assignments
CREATE POLICY "Users can view their own branch assignments"
  ON public.user_branches FOR SELECT
  USING (user_id = auth.uid());

-- Admins can manage all branch assignments  
CREATE POLICY "Admins can manage all branch assignments"
  ON public.user_branches FOR ALL
  USING (public.is_admin(auth.uid()));

-- Recreate function with new return type including branch arrays
CREATE FUNCTION public.get_staff_with_roles()
 RETURNS TABLE(
   user_id uuid, 
   email text, 
   full_name text, 
   branch_id uuid, 
   branch_name text, 
   branch_ids uuid[],
   branch_names text[],
   roles text[], 
   created_at timestamp with time zone,
   staff_pin text
 )
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.user_id,
    p.email,
    p.full_name,
    p.branch_id,
    b.name as branch_name,
    COALESCE(ARRAY_AGG(DISTINCT ub.branch_id) FILTER (WHERE ub.branch_id IS NOT NULL), ARRAY[]::UUID[]) as branch_ids,
    COALESCE(ARRAY_AGG(DISTINCT br.name) FILTER (WHERE br.name IS NOT NULL), ARRAY[]::TEXT[]) as branch_names,
    COALESCE(ARRAY_AGG(DISTINCT ur.role::TEXT) FILTER (WHERE ur.role IS NOT NULL), ARRAY[]::TEXT[]) as roles,
    p.created_at,
    p.staff_pin
  FROM public.profiles p
  LEFT JOIN public.branches b ON b.id = p.branch_id
  LEFT JOIN public.user_branches ub ON ub.user_id = p.user_id
  LEFT JOIN public.branches br ON br.id = ub.branch_id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  GROUP BY p.user_id, p.email, p.full_name, p.branch_id, b.name, p.created_at, p.staff_pin
  ORDER BY p.created_at DESC
$function$;

-- Migrate existing branch assignments to user_branches table
INSERT INTO public.user_branches (user_id, branch_id)
SELECT user_id, branch_id 
FROM public.profiles 
WHERE branch_id IS NOT NULL
ON CONFLICT (user_id, branch_id) DO NOTHING;