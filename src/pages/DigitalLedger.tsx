import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, Loader2, Trash2, Download, BookOpen, TrendingUp, TrendingDown, Crown, Lock, Target, AlertTriangle, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import jsPDF from 'jspdf';

interface LedgerEntry {
  id: string;
  entry_date: string;
  entry_type: 'income' | 'expense';
  category: string;
  description: string | null;
  amount: number;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

interface BudgetLimit {
  id: string;
  category: string;
  monthly_limit: number;
  alert_threshold: number;
}

const incomeCategories = [
  'Crop Sales',
  'Livestock Sales',
  'Dairy Products',
  'Eggs',
  'Produce',
  'Government Subsidy',
  'Rental Income',
  'Contract Farming',
  'Other Income'
];

const expenseCategories = [
  'Seeds & Seedlings',
  'Fertilizers',
  'Pesticides',
  'Animal Feed',
  'Veterinary Services',
  'Labor & Wages',
  'Equipment Purchase',
  'Equipment Repair',
  'Fuel & Energy',
  'Water & Irrigation',
  'Transportation',
  'Packaging',
  'Storage',
  'Land Rent',
  'Insurance',
  'Loan Payment',
  'Other Expense'
];

const paymentMethods = ['Cash', 'Bank Transfer', 'Mobile Money', 'Check', 'Credit', 'Other'];

const DigitalLedger = () => {
  const { user } = useAuth();
  const { isPremium, loadingPremium, openUpgrade } = useUsageLimits();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [budgets, setBudgets] = useState<BudgetLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense' | 'budgets'>('all');
  const [formData, setFormData] = useState({
    entry_date: format(new Date(), 'yyyy-MM-dd'),
    entry_type: 'expense' as 'income' | 'expense',
    category: '',
    description: '',
    amount: '',
    payment_method: '',
    reference_number: '',
    notes: ''
  });
  const [budgetForm, setBudgetForm] = useState({
    category: '',
    monthly_limit: '',
    alert_threshold: '80'
  });

  useEffect(() => {
    if (user && isPremium) {
      fetchEntries();
      fetchBudgets();
    } else {
      setLoading(false);
    }
  }, [user, isPremium]);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('user_id', user?.id)
      .order('entry_date', { ascending: false })
      .limit(100);

    if (error) {
      toast.error('Failed to load entries');
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  const fetchBudgets = async () => {
    const { data, error } = await supabase
      .from('budget_limits')
      .select('*')
      .eq('user_id', user?.id);

    if (!error && data) {
      setBudgets(data);
    }
  };

  const getMonthlySpending = (category: string) => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    return entries
      .filter(e => 
        e.entry_type === 'expense' && 
        e.category === category &&
        new Date(e.entry_date) >= monthStart &&
        new Date(e.entry_date) <= monthEnd
      )
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const getBudgetStatus = (budget: BudgetLimit) => {
    const spent = getMonthlySpending(budget.category);
    const percentage = (spent / budget.monthly_limit) * 100;
    
    if (percentage >= 100) return { status: 'exceeded', percentage, spent };
    if (percentage >= budget.alert_threshold) return { status: 'warning', percentage, spent };
    return { status: 'ok', percentage, spent };
  };

  const getOverBudgetAlerts = () => {
    return budgets
      .map(budget => ({ budget, ...getBudgetStatus(budget) }))
      .filter(b => b.status === 'exceeded' || b.status === 'warning');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.category || !formData.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    const { error } = await supabase.from('ledger_entries').insert({
      user_id: user.id,
      entry_date: formData.entry_date,
      entry_type: formData.entry_type,
      category: formData.category,
      description: formData.description || null,
      amount: parseFloat(formData.amount),
      payment_method: formData.payment_method || null,
      reference_number: formData.reference_number || null,
      notes: formData.notes || null
    });

    if (error) {
      toast.error('Failed to add entry');
    } else {
      toast.success('Entry recorded!');
      
      // Check budget after adding expense
      if (formData.entry_type === 'expense') {
        const budget = budgets.find(b => b.category === formData.category);
        if (budget) {
          const spent = getMonthlySpending(formData.category) + parseFloat(formData.amount);
          const percentage = (spent / budget.monthly_limit) * 100;
          if (percentage >= 100) {
            toast.error(`⚠️ You've exceeded your ${formData.category} budget!`, { duration: 5000 });
          } else if (percentage >= budget.alert_threshold) {
            toast.warning(`⚠️ You're at ${percentage.toFixed(0)}% of your ${formData.category} budget`, { duration: 5000 });
          }
        }
      }
      
      setFormData({
        entry_date: format(new Date(), 'yyyy-MM-dd'),
        entry_type: 'expense',
        category: '',
        description: '',
        amount: '',
        payment_method: '',
        reference_number: '',
        notes: ''
      });
      setDialogOpen(false);
      fetchEntries();
    }
  };

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !budgetForm.category || !budgetForm.monthly_limit) {
      toast.error('Please fill in required fields');
      return;
    }

    const { error } = await supabase.from('budget_limits').upsert({
      user_id: user.id,
      category: budgetForm.category,
      monthly_limit: parseFloat(budgetForm.monthly_limit),
      alert_threshold: parseFloat(budgetForm.alert_threshold)
    }, { onConflict: 'user_id,category' });

    if (error) {
      toast.error('Failed to save budget');
    } else {
      toast.success('Budget saved!');
      setBudgetForm({ category: '', monthly_limit: '', alert_threshold: '80' });
      setBudgetDialogOpen(false);
      fetchBudgets();
    }
  };

  const deleteBudget = async (id: string) => {
    const { error } = await supabase
      .from('budget_limits')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id);

    if (error) {
      toast.error('Failed to delete budget');
    } else {
      setBudgets(budgets.filter(b => b.id !== id));
      toast.success('Budget deleted');
    }
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase
      .from('ledger_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id);

    if (error) {
      toast.error('Failed to delete entry');
    } else {
      setEntries(entries.filter(e => e.id !== id));
      toast.success('Entry deleted');
    }
  };

  const exportToPdf = () => {
    const doc = new jsPDF();
    const filteredEntries = getFilteredEntries();
    
    doc.setFontSize(20);
    doc.setFont('times', 'bold');
    doc.text('Farm Financial Ledger', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy')}`, 105, 30, { align: 'center' });
    
    const totalIncome = filteredEntries.filter(e => e.entry_type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const totalExpense = filteredEntries.filter(e => e.entry_type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const netBalance = totalIncome - totalExpense;
    
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text('Summary', 20, 45);
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text(`Total Income: $${totalIncome.toFixed(2)}`, 20, 55);
    doc.text(`Total Expenses: $${totalExpense.toFixed(2)}`, 20, 62);
    doc.text(`Net Balance: $${netBalance.toFixed(2)}`, 20, 69);
    
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    doc.text('Transaction Details', 20, 85);
    
    let yPos = 95;
    doc.setFontSize(9);
    doc.setFont('times', 'bold');
    doc.text('Date', 20, yPos);
    doc.text('Type', 45, yPos);
    doc.text('Category', 70, yPos);
    doc.text('Amount', 130, yPos);
    doc.text('Description', 155, yPos);
    
    doc.setFont('times', 'normal');
    yPos += 8;
    
    filteredEntries.slice(0, 30).forEach((entry) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text(format(new Date(entry.entry_date), 'MM/dd/yy'), 20, yPos);
      doc.text(entry.entry_type, 45, yPos);
      doc.text(entry.category.substring(0, 20), 70, yPos);
      doc.text(`$${entry.amount.toFixed(2)}`, 130, yPos);
      doc.text((entry.description || '-').substring(0, 25), 155, yPos);
      
      yPos += 7;
    });
    
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text('Imvelo - Farmer\'s Best Friend | USSD: *384*51139#', 105, 290, { align: 'center' });
    }
    
    doc.save(`farm-ledger-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Ledger exported successfully!');
  };

  const getFilteredEntries = () => {
    if (activeTab === 'all' || activeTab === 'budgets') return entries;
    return entries.filter(e => e.entry_type === activeTab);
  };

  const totalIncome = entries.filter(e => e.entry_type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = entries.filter(e => e.entry_type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const budgetAlerts = getOverBudgetAlerts();

  if (loadingPremium) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-primary text-primary-foreground py-4 px-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Digital Ledger
          </h1>
        </header>
        
        <div className="max-w-screen-sm mx-auto px-4 py-12">
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Lock className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">Premium Feature</h2>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                The Digital Ledger helps you track farm expenses, income, and export professional financial reports. Upgrade to access this feature!
              </p>
              <ul className="text-left max-w-xs mx-auto mb-6 space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Track income and expenses
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4 text-primary" />
                  Export PDF reports
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-primary" />
                  Set budget limits with alerts
                </li>
              </ul>
              <Button onClick={openUpgrade} className="gap-2">
                <Crown className="w-4 h-4" />
                Upgrade to Premium - $6.04
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Digital Ledger
        </h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        {/* Budget Alerts */}
        {budgetAlerts.length > 0 && (
          <div className="space-y-2">
            {budgetAlerts.map(({ budget, status, percentage, spent }) => (
              <Alert key={budget.id} variant={status === 'exceeded' ? 'destructive' : 'default'} className={status === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' : ''}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm font-medium">
                  {status === 'exceeded' ? 'Budget Exceeded!' : 'Budget Warning'}
                </AlertTitle>
                <AlertDescription className="text-xs">
                  {budget.category}: ${spent.toFixed(2)} / ${budget.monthly_limit.toFixed(2)} ({percentage.toFixed(0)}%)
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Income</span>
              </div>
              <p className="text-xl font-bold text-green-800 dark:text-green-300">${totalIncome.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-medium">Expenses</span>
              </div>
              <p className="text-xl font-bold text-red-800 dark:text-red-300">${totalExpense.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 gap-2">
                <Plus className="w-4 h-4" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Ledger Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Entry Type</Label>
                  <Select
                    value={formData.entry_type}
                    onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, entry_type: value, category: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.entry_date}
                    onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {(formData.entry_type === 'income' ? incomeCategories : expenseCategories).map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount ($) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="e.g., Sold 50kg tomatoes"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Reference Number</Label>
                  <Input
                    placeholder="Receipt/Invoice number"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Save Entry
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            className="gap-2"
            onClick={exportToPdf}
            disabled={entries.length === 0}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>

        {/* Tabs */}
        <Card>
          <CardHeader className="pb-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="expense">Expenses</TabsTrigger>
                <TabsTrigger value="budgets">Budgets</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {activeTab === 'budgets' ? (
              <div className="space-y-4">
                <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full gap-2">
                      <Target className="w-4 h-4" />
                      Set Budget Limit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Set Monthly Budget</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleBudgetSubmit} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Expense Category *</Label>
                        <Select
                          value={budgetForm.category}
                          onValueChange={(value) => setBudgetForm({ ...budgetForm, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {expenseCategories.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Monthly Limit ($) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="100.00"
                          value={budgetForm.monthly_limit}
                          onChange={(e) => setBudgetForm({ ...budgetForm, monthly_limit: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Alert at (% of budget)</Label>
                        <Input
                          type="number"
                          min="50"
                          max="100"
                          value={budgetForm.alert_threshold}
                          onChange={(e) => setBudgetForm({ ...budgetForm, alert_threshold: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Get warned when spending reaches this percentage</p>
                      </div>

                      <Button type="submit" className="w-full">
                        Save Budget
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                {budgets.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No budgets set yet</p>
                    <p className="text-xs">Set limits to track your spending</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {budgets.map((budget) => {
                      const { status, percentage, spent } = getBudgetStatus(budget);
                      return (
                        <div key={budget.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-sm">{budget.category}</p>
                              <p className="text-xs text-muted-foreground">
                                ${spent.toFixed(2)} of ${budget.monthly_limit.toFixed(2)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteBudget(budget.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <Progress 
                            value={Math.min(percentage, 100)} 
                            className={`h-2 ${
                              status === 'exceeded' ? '[&>div]:bg-red-500' : 
                              status === 'warning' ? '[&>div]:bg-yellow-500' : ''
                            }`}
                          />
                          <p className={`text-xs mt-1 ${
                            status === 'exceeded' ? 'text-red-600' : 
                            status === 'warning' ? 'text-yellow-600' : 'text-muted-foreground'
                          }`}>
                            {percentage.toFixed(0)}% used this month
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : getFilteredEntries().length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No entries yet.</p>
                <p className="text-sm">Start tracking your farm finances!</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredEntries().map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">
                          {format(new Date(entry.entry_date), 'MMM d')}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            {entry.entry_type === 'income' ? (
                              <TrendingUp className="w-3 h-3 text-green-600" />
                            ) : (
                              <TrendingDown className="w-3 h-3 text-red-600" />
                            )}
                            <span className="truncate max-w-[120px]">{entry.category}</span>
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-medium text-sm ${
                          entry.entry_type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {entry.entry_type === 'income' ? '+' : '-'}${entry.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteEntry(entry.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DigitalLedger;
