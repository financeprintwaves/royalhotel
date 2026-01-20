-- Add staff_pin column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN staff_pin TEXT UNIQUE;

-- Create index for fast PIN lookups
CREATE INDEX idx_profiles_staff_pin ON public.profiles(staff_pin) 
WHERE staff_pin IS NOT NULL;

-- Create secure PIN validation function
CREATE OR REPLACE FUNCTION public.validate_staff_pin(p_pin TEXT)
RETURNS TABLE(user_id UUID, email TEXT, full_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate PIN format (exactly 5 digits)
  IF p_pin !~ '^\d{5}$' THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT p.user_id, p.email, p.full_name
  FROM public.profiles p
  WHERE p.staff_pin = p_pin
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated and anon users for the function
GRANT EXECUTE ON FUNCTION public.validate_staff_pin(TEXT) TO authenticated, anon;