
-- Create printer_settings table
CREATE TABLE public.printer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL UNIQUE REFERENCES public.branches(id) ON DELETE CASCADE,
  printer_name TEXT NOT NULL DEFAULT 'POS_PRINTER',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;

-- Admins and managers can manage printer settings
CREATE POLICY "Admins and managers can manage printer settings"
  ON public.printer_settings FOR ALL
  TO authenticated
  USING (is_manager_or_admin(auth.uid()) AND (branch_id = get_user_branch_id(auth.uid()) OR is_admin(auth.uid())))
  WITH CHECK (is_manager_or_admin(auth.uid()) AND (branch_id = get_user_branch_id(auth.uid()) OR is_admin(auth.uid())));

-- All authenticated staff can read printer settings for their branch
CREATE POLICY "Staff can view printer settings"
  ON public.printer_settings FOR SELECT
  TO authenticated
  USING (branch_id = get_user_branch_id(auth.uid()) OR is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_printer_settings_updated_at
  BEFORE UPDATE ON public.printer_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
