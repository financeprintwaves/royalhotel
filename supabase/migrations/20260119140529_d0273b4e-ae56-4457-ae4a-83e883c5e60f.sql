-- Bootstrap function: allow the very first authenticated user to claim admin role + demo branch
-- This is intended for fresh/dev environments to make testing easy.

CREATE OR REPLACE FUNCTION public.bootstrap_demo_admin(p_branch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_has_any_admin boolean;
  v_branch_exists boolean;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.branches b WHERE b.id = p_branch_id
  ) INTO v_branch_exists;

  IF NOT v_branch_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'Branch not found');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur WHERE ur.role = 'admin'
  ) INTO v_has_any_admin;

  IF v_has_any_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'An admin already exists');
  END IF;

  -- Assign branch to caller
  UPDATE public.profiles
  SET branch_id = p_branch_id,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Grant admin role to caller
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'message', 'Demo admin bootstrapped', 'branch_id', p_branch_id);
END;
$$;