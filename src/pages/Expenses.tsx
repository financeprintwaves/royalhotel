import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Plus, Edit, Trash2, DollarSign, Calendar,
  FileText, Receipt, TrendingUp, Download
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getExpenses, createExpense, updateExpense, deleteExpense, getExpenseSummary } from '@/services/expenseService';
import type { Expense } from '@/types/pos';
import DateRangePicker, { type DateRange } from '@/components/DateRangePicker';

const EXPENSE_CATEGORIES = [
  'Food Supplies',
  'Beverages',
  'Utilities',
  'Rent',
  'Salaries',
  'Marketing',
  'Equipment',
  'Maintenance',
  'Transportation',
  'Miscellaneous'
];

export default function Expenses() {
  const { profile, isAdmin, isManagerOrAdmin } = useAuth();
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form state
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  // Filter state
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Summary state
  const [summary, setSummary] = useState<{
    totalExpenses: number;
    expensesByCategory: Record<string, number>;
  }>({ totalExpenses: 0, expensesByCategory: {} });

  useEffect(() => {
    loadExpenses();
    loadSummary();
  }, [dateRange, categoryFilter]);

  async function loadExpenses() {
    try {
      setLoading(true);
      const data = await getExpenses(profile?.branch_id);
      let filtered = data;

      // Apply date filter
      if (dateRange.from && dateRange.to) {
        filtered = filtered.filter(exp => {
          const expDate = new Date(exp.expense_date);
          return expDate >= dateRange.from && expDate <= dateRange.to;
        });
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        filtered = filtered.filter(exp => exp.category === categoryFilter);
      }

      setExpenses(filtered);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load expenses' });
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    try {
      const result = await getExpenseSummary(dateRange.from, dateRange.to, profile?.branch_id);
      setSummary({
        totalExpenses: result.totalExpenses,
        expensesByCategory: result.expensesByCategory
      });
    } catch (error) {
      // Silently handle summary error
    }
  }

  function resetForm() {
    setCategory('');
    setDescription('');
    setAmount('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setEditingExpense(null);
  }

  function openAddDialog() {
    resetForm();
    setShowAddDialog(true);
  }

  function openEditDialog(expense: Expense) {
    setEditingExpense(expense);
    setCategory(expense.category);
    setDescription(expense.description);
    setAmount(expense.amount.toString());
    setExpenseDate(expense.expense_date);
    setShowAddDialog(true);
  }

  async function handleSubmit() {
    if (!category || !description || !amount) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill all required fields' });
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please enter a valid amount' });
      return;
    }

    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          category,
          description,
          amount: numAmount,
          expense_date: expenseDate
        });
        toast({ title: 'Success', description: 'Expense updated successfully' });
      } else {
        await createExpense({
          category,
          description,
          amount: numAmount,
          expenseDate: expenseDate
        });
        toast({ title: 'Success', description: 'Expense added successfully' });
      }

      setShowAddDialog(false);
      resetForm();
      loadExpenses();
      loadSummary();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save expense';
      toast({ variant: 'destructive', title: 'Error', description: message });
    }
  }

  async function handleDelete(expenseId: string) {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      await deleteExpense(expenseId);
      toast({ title: 'Success', description: 'Expense deleted successfully' });
      loadExpenses();
      loadSummary();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete expense';
      toast({ variant: 'destructive', title: 'Error', description: message });
    }
  }

  const handleExportCSV = () => {
    let csvContent = 'Date,Category,Description,Amount (OMR)\n';
    expenses.forEach(exp => {
      csvContent += `${new Date(exp.expense_date).toLocaleDateString()},"${exp.category}","${exp.description}",${exp.amount.toFixed(3)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(expenses, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-4 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Expense Management</h1>
            <p className="text-muted-foreground">Track and manage business expenses</p>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalExpenses.toFixed(3)} OMR</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expenses
                  .filter(exp => {
                    const expDate = new Date(exp.expense_date);
                    const now = new Date();
                    return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
                  })
                  .reduce((sum, exp) => sum + exp.amount, 0)
                  .toFixed(3)} OMR
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expenses
                  .filter(exp => {
                    const expDate = new Date(exp.expense_date);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return expDate >= weekAgo;
                  })
                  .reduce((sum, exp) => sum + exp.amount, 0)
                  .toFixed(3)} OMR
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expenses.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Expenses</CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportJSON}>
                  <Download className="h-4 w-4 mr-1" />
                  JSON
                </Button>
                {isManagerOrAdmin() && (
                  <Button onClick={openAddDialog}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Expense
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Expenses Table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    {isAdmin() && <TableHead className="w-24">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin() ? 5 : 4} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isAdmin() ? 5 : 4} className="text-center py-8 text-muted-foreground">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{new Date(expense.expense_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{expense.category}</Badge>
                        </TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell className="text-right font-medium">
                          {expense.amount.toFixed(3)} OMR
                        </TableCell>
                        {isAdmin() && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(expense)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(expense.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Add/Edit Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter expense description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (OMR) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingExpense ? 'Update' : 'Add'} Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}