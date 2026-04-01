import { supabase } from '@/integrations/supabase/client';
import type { Expense } from '@/types/pos';

export interface CreateExpenseOptions {
  category: string;
  description: string;
  amount: number;
  expenseDate?: string;
  receiptUrl?: string;
}

// Get all expenses for branch
export async function getExpenses(branchId?: string): Promise<Expense[]> {
  let query = (supabase as any)
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false });

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// Get expense by ID
export async function getExpense(expenseId: string): Promise<Expense | null> {
  const { data, error } = await (supabase as any)
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Create expense
export async function createExpense(options: CreateExpenseOptions): Promise<Expense> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('branch_id')
    .eq('user_id', userData.user.id)
    .single();

  if (!profile?.branch_id) throw new Error('User not assigned to a branch');

  const { data, error } = await (supabase as any)
    .from('expenses')
    .insert({
      branch_id: profile.branch_id,
      category: options.category,
      description: options.description,
      amount: options.amount,
      expense_date: options.expenseDate || new Date().toISOString().split('T')[0],
      recorded_by: userData.user.id,
      receipt_url: options.receiptUrl,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update expense
export async function updateExpense(
  expenseId: string,
  updates: Partial<Pick<Expense, 'category' | 'description' | 'amount' | 'expense_date' | 'receipt_url'>>
): Promise<Expense> {
  const { data, error } = await (supabase as any)
    .from('expenses')
    .update(updates)
    .eq('id', expenseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete expense
export async function deleteExpense(expenseId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) throw error;
}

// Get expense summary for reporting
export async function getExpenseSummary(
  startDate: Date,
  endDate: Date,
  branchId?: string
): Promise<{
  totalExpenses: number;
  expensesByCategory: Record<string, number>;
  expenses: Expense[];
}> {
  let query = supabase
    .from('expenses')
    .select('*')
    .gte('expense_date', startDate.toISOString().split('T')[0])
    .lte('expense_date', endDate.toISOString().split('T')[0])
    .order('expense_date', { ascending: false });

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  const { data: expenses, error } = await query;
  if (error) throw error;

  const totalExpenses = (expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
  const expensesByCategory = (expenses || []).reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalExpenses,
    expensesByCategory,
    expenses: expenses || [],
  };
}