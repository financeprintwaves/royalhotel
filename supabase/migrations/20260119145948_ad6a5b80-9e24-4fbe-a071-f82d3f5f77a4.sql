-- Create a function to auto-assign admin role to specific bootstrap email
-- This will be triggered when the user signs up
CREATE OR REPLACE FUNCTION public.auto_assign_super_admin()
RETURNS TRIGGER AS $$
DECLARE
  v_super_admin_email TEXT := 'iqbalussain@gmail.com';
BEGIN
  -- Check if this is the super admin email
  IF NEW.email = v_super_admin_email THEN
    -- Get the first branch to assign (or create one if none exists)
    DECLARE
      v_branch_id UUID;
    BEGIN
      SELECT id INTO v_branch_id FROM public.branches WHERE is_active = true LIMIT 1;
      
      -- If no branch exists, create a default one
      IF v_branch_id IS NULL THEN
        INSERT INTO public.branches (name, address) 
        VALUES ('Main Branch', 'Headquarters')
        RETURNING id INTO v_branch_id;
      END IF;
      
      -- Update the profile with branch
      UPDATE public.profiles 
      SET branch_id = v_branch_id,
          email = NEW.email,
          updated_at = now()
      WHERE user_id = NEW.id;
      
      -- Assign admin role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin')
      ON CONFLICT DO NOTHING;
    END;
  ELSE
    -- For non-admin users, just update email in profiles
    UPDATE public.profiles 
    SET email = NEW.email,
        updated_at = now()
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created_super_admin ON auth.users;

-- Create trigger to run after user is created
CREATE TRIGGER on_auth_user_created_super_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_super_admin();