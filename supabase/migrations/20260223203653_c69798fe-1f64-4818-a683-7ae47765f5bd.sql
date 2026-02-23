-- Revoke validate_staff_pin from both anon and authenticated users
-- Only the Edge Function with service role should call this
REVOKE EXECUTE ON FUNCTION public.validate_staff_pin(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_staff_pin(TEXT) FROM authenticated;