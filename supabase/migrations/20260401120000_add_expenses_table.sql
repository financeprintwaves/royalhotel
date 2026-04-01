-- Add expenses table for expense tracking
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,3) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID NOT NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key for expenses.recorded_by → profiles.user_id
ALTER TABLE public.expenses ADD CONSTRAINT expenses_recorded_by_fkey_profiles
  FOREIGN KEY (recorded_by) REFERENCES public.profiles(user_id);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view expenses from their branch" ON public.expenses
  FOR SELECT USING (
    branch_id IN (
      SELECT branch_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers and admins can insert expenses" ON public.expenses
  FOR INSERT WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM public.profiles WHERE user_id = auth.uid()
    ) AND
    public.is_manager_or_admin(auth.uid())
  );

CREATE POLICY "Admins can update expenses" ON public.expenses
  FOR UPDATE USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete expenses" ON public.expenses
  FOR DELETE USING (public.is_admin(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add indexes
CREATE INDEX idx_expenses_branch_id ON public.expenses(branch_id);
CREATE INDEX idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_category ON public.expenses(category);