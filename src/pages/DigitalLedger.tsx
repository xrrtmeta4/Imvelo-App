import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Plus, Loader2, Trash2, Download, BookOpen, TrendingUp, TrendingDown, Target, AlertTriangle, Brain, Sparkles, Settings, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency, currencies } from '@/hooks/useCurrency';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useNavigate } from 'react-router-dom';
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

const DigitalLedgerContent = () => {
  const { user } = useAuth();
  const { selectedCurrency, setCurrency, formatAmount } = useCurrency();
  const { canAddLedgerEntry, getMaxLedgerEntries, currentPlan } = useUsageLimits();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [budgets, setBudgets] = useState<BudgetLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'income' | 'expense' | 'budgets' | 'ai'>('all');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
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
    if (user) {
      fetchEntries();
      fetchBudgets();
    } else {
      setLoading(false);
    }
  }, [user]);

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

    if (!canAddLedgerEntry(entries.length)) {
      toast.error(`Entry limit reached (${getMaxLedgerEntries()}). Upgrade for unlimited entries!`);
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

  const exportToPdf = async () => {
    const doc = new jsPDF();
    const filteredEntries = getFilteredEntries();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    
    const totalInc = filteredEntries.filter(e => e.entry_type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const totalExp = filteredEntries.filter(e => e.entry_type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const netBal = totalInc - totalExp;

    // Load logo
    let logoLoaded = false;
    const logoImg = new Image();
    try {
      logoImg.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = reject;
        logoImg.src = '/imvelo-logo.png';
      });
      logoLoaded = true;
    } catch { /* continue without logo */ }

    const addHeader = (isFirstPage: boolean) => {
      if (isFirstPage) {
        // Logo
        if (logoLoaded) {
          doc.addImage(logoImg, 'PNG', (pageWidth - 30) / 2, 10, 30, 30);
        }
        doc.setFont('times', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(34, 139, 34);
        doc.text('Imvelo', pageWidth / 2, 48, { align: 'center' });
        doc.setFont('times', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Farmer's Best Friend", pageWidth / 2, 55, { align: 'center' });
      }
    };

    const addFooter = (pageNum: number, totalPages: number) => {
      const footerY = pageHeight - 25;
      // Divider
      doc.setDrawColor(34, 139, 34);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
      // Logo text
      if (logoLoaded) {
        doc.addImage(logoImg, 'PNG', margin, footerY - 3, 10, 10);
      }
      doc.setFont('times', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(34, 139, 34);
      doc.text('Imvelo - Farmer\'s Best Friend', margin + 13, footerY + 1);
      doc.setFont('times', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text('Email: imveloapps@gmail.com | Phone: +268 7921 5621 | USSD: *384*51139#', margin + 13, footerY + 6);
      // Page number
      doc.setFont('times', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY + 1, { align: 'right' });
    };

    // ---- PAGE 1: Cover & Summary ----
    addHeader(true);
    
    // Title block
    doc.setDrawColor(34, 139, 34);
    doc.setLineWidth(0.8);
    doc.line(margin, 60, pageWidth - margin, 60);

    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('FINANCIAL STATEMENT', pageWidth / 2, 72, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const periodText = filteredEntries.length > 0
      ? `${format(new Date(filteredEntries[filteredEntries.length - 1].entry_date), 'dd MMM yyyy')} — ${format(new Date(filteredEntries[0].entry_date), 'dd MMM yyyy')}`
      : format(new Date(), 'dd MMM yyyy');
    doc.text(`Period: ${periodText}`, pageWidth / 2, 80, { align: 'center' });
    doc.text(`Currency: ${selectedCurrency.name} (${selectedCurrency.code})`, pageWidth / 2, 86, { align: 'center' });
    doc.text(`Generated: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`, pageWidth / 2, 92, { align: 'center' });

    // Summary box
    let y = 105;
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, y - 5, contentWidth, 45, 3, 3, 'F');
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Financial Summary', margin + 5, y + 5);
    
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(34, 139, 34);
    doc.text(`Total Income:`, margin + 5, y + 18);
    doc.text(`${formatAmount(totalInc)}`, pageWidth - margin - 5, y + 18, { align: 'right' });
    
    doc.setTextColor(200, 0, 0);
    doc.text(`Total Expenses:`, margin + 5, y + 27);
    doc.text(`${formatAmount(totalExp)}`, pageWidth - margin - 5, y + 27, { align: 'right' });
    
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(margin + 5, y + 30, pageWidth - margin - 5, y + 30);
    
    const balColor = netBal >= 0 ? [34, 139, 34] : [200, 0, 0];
    doc.setFont('times', 'bold');
    doc.setTextColor(balColor[0], balColor[1], balColor[2]);
    doc.text(`Net Balance:`, margin + 5, y + 37);
    doc.text(`${netBal >= 0 ? '' : '-'}${formatAmount(Math.abs(netBal))}`, pageWidth - margin - 5, y + 37, { align: 'right' });

    // Category breakdown
    y = 165;
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Income by Category', margin, y);
    y += 8;
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    
    const incomeByCategory: Record<string, number> = {};
    const expenseByCategory: Record<string, number> = {};
    filteredEntries.forEach(e => {
      if (e.entry_type === 'income') {
        incomeByCategory[e.category] = (incomeByCategory[e.category] || 0) + e.amount;
      } else {
        expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
      }
    });

    Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
      doc.setTextColor(60, 60, 60);
      doc.text(cat, margin + 5, y);
      doc.text(formatAmount(amt), pageWidth - margin - 5, y, { align: 'right' });
      y += 6;
    });
    if (Object.keys(incomeByCategory).length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.text('No income recorded', margin + 5, y);
      y += 6;
    }

    y += 6;
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Expenses by Category', margin, y);
    y += 8;
    doc.setFont('times', 'normal');
    doc.setFontSize(9);

    Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
      doc.setTextColor(60, 60, 60);
      doc.text(cat, margin + 5, y);
      doc.text(formatAmount(amt), pageWidth - margin - 5, y, { align: 'right' });
      y += 6;
    });
    if (Object.keys(expenseByCategory).length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.text('No expenses recorded', margin + 5, y);
      y += 6;
    }

    // ---- PAGE 2+: Transaction Details (table) ----
    doc.addPage();
    const colDate = margin;
    const colRef = margin + 22;
    const colType = margin + 48;
    const colCategory = margin + 64;
    const colDesc = margin + 102;
    const colAmount = pageWidth - margin;
    const rowH = 6;

    let tableY = 20;
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Transaction Details', margin, tableY);
    tableY += 10;

    // Table header
    const drawTableHeader = () => {
      doc.setFillColor(34, 139, 34);
      doc.rect(margin, tableY - 4, contentWidth, rowH + 2, 'F');
      doc.setFont('times', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('Date', colDate + 2, tableY);
      doc.text('Ref #', colRef + 2, tableY);
      doc.text('Type', colType + 2, tableY);
      doc.text('Category', colCategory + 2, tableY);
      doc.text('Description', colDesc + 2, tableY);
      doc.text('Amount', colAmount - 2, tableY, { align: 'right' });
      tableY += rowH + 2;
    };

    drawTableHeader();

    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    let rowIndex = 0;

    filteredEntries.forEach((entry) => {
      if (tableY > pageHeight - 35) {
        doc.addPage();
        tableY = 20;
        drawTableHeader();
      }

      // Alternating row color
      if (rowIndex % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, tableY - 4, contentWidth, rowH, 'F');
      }

      doc.setTextColor(60, 60, 60);
      doc.text(format(new Date(entry.entry_date), 'dd/MM/yy'), colDate + 2, tableY);
      doc.text((entry.reference_number || '-').substring(0, 12), colRef + 2, tableY);
      doc.text(entry.entry_type === 'income' ? 'CR' : 'DR', colType + 2, tableY);
      doc.text(entry.category.substring(0, 18), colCategory + 2, tableY);
      doc.text((entry.description || '-').substring(0, 22), colDesc + 2, tableY);
      
      const amtColor = entry.entry_type === 'income' ? [34, 139, 34] : [200, 0, 0];
      doc.setTextColor(amtColor[0], amtColor[1], amtColor[2]);
      doc.text(
        `${entry.entry_type === 'income' ? '+' : '-'}${formatAmount(entry.amount)}`,
        colAmount - 2, tableY, { align: 'right' }
      );

      tableY += rowH;
      rowIndex++;
    });

    // Bottom line totals
    tableY += 4;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(margin, tableY - 2, pageWidth - margin, tableY - 2);
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL', colCategory + 2, tableY + 2);
    const balStr = `${netBal >= 0 ? '+' : '-'}${formatAmount(Math.abs(netBal))}`;
    doc.setTextColor(balColor[0], balColor[1], balColor[2]);
    doc.text(balStr, colAmount - 2, tableY + 2, { align: 'right' });

    // Add footers to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i, totalPages);
    }
    
    doc.save(`imvelo-financial-statement-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast.success('Financial statement exported!');
  };

  const getFilteredEntries = () => {
    if (activeTab === 'all' || activeTab === 'budgets' || activeTab === 'ai') return entries;
    return entries.filter(e => e.entry_type === activeTab);
  };

  const analyzeWithAI = async (action: 'analyze' | 'forecast' | 'suggestions') => {
    if (entries.length < 3) {
      toast.error('Add at least 3 entries for AI analysis');
      return;
    }

    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-ledger', {
        body: { 
          entries: entries.slice(0, 50).map(e => ({
            date: e.entry_date,
            type: e.entry_type,
            category: e.category,
            amount: e.amount,
            description: e.description
          })),
          action 
        }
      });

      if (error) throw error;
      setAiAnalysis(data.analysis);
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Failed to analyze. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const totalIncome = entries.filter(e => e.entry_type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = entries.filter(e => e.entry_type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalIncome - totalExpense;
  const budgetAlerts = getOverBudgetAlerts();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Digital Ledger
          </h1>
          <Dialog open={currencyDialogOpen} onOpenChange={setCurrencyDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-primary-foreground gap-1">
                <Settings className="w-4 h-4" />
                {selectedCurrency.code}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Currency</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 mt-4 max-h-[300px] overflow-y-auto">
                {currencies.map((currency) => (
                  <Button
                    key={currency.code}
                    variant={selectedCurrency.code === currency.code ? 'default' : 'outline'}
                    className="justify-start gap-2"
                    onClick={() => {
                      setCurrency(currency.code);
                      setCurrencyDialogOpen(false);
                      toast.success(`Currency set to ${currency.name}`);
                    }}
                  >
                    <span className="font-bold">{currency.symbol}</span>
                    <span>{currency.code}</span>
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
                  {budget.category}: {formatAmount(spent)} / {formatAmount(budget.monthly_limit)} ({percentage.toFixed(0)}%)
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="flex items-center justify-center gap-1 text-green-700 dark:text-green-400 mb-1">
                <TrendingUp className="w-3 h-3" />
                <span className="text-xs font-medium">Income</span>
              </div>
              <p className="text-lg font-bold text-green-800 dark:text-green-300">{formatAmount(totalIncome)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="flex items-center justify-center gap-1 text-red-700 dark:text-red-400 mb-1">
                <TrendingDown className="w-3 h-3" />
                <span className="text-xs font-medium">Expenses</span>
              </div>
              <p className="text-lg font-bold text-red-800 dark:text-red-300">{formatAmount(totalExpense)}</p>
            </CardContent>
          </Card>
          <Card className={`${netBalance >= 0 ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'}`}>
            <CardContent className="pt-3 pb-3 text-center">
              <div className={`flex items-center justify-center gap-1 mb-1 ${netBalance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
                <Sparkles className="w-3 h-3" />
                <span className="text-xs font-medium">Balance</span>
              </div>
              <p className={`text-lg font-bold ${netBalance >= 0 ? 'text-blue-800 dark:text-blue-300' : 'text-orange-800 dark:text-orange-300'}`}>
                {netBalance >= 0 ? '+' : ''}{formatAmount(Math.abs(netBalance))}
              </p>
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
                  <Label>Amount ({selectedCurrency.symbol}) *</Label>
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
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="income">In</TabsTrigger>
                <TabsTrigger value="expense">Out</TabsTrigger>
                <TabsTrigger value="budgets">Budget</TabsTrigger>
                <TabsTrigger value="ai" className="gap-1">
                  <Brain className="w-3 h-3" />
                  AI
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {activeTab === 'ai' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => analyzeWithAI('analyze')}
                    disabled={aiLoading}
                  >
                    <Brain className="w-4 h-4" />
                    <span className="text-xs">Analyze</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => analyzeWithAI('forecast')}
                    disabled={aiLoading}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs">Forecast</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-auto py-3 flex-col gap-1"
                    onClick={() => analyzeWithAI('suggestions')}
                    disabled={aiLoading}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs">Tips</span>
                  </Button>
                </div>
                
                {aiLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">Analyzing your finances...</p>
                  </div>
                ) : aiAnalysis ? (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">AI Analysis</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{aiAnalysis}</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Get AI-powered insights</p>
                    <p className="text-xs">Click a button above to analyze your finances</p>
                  </div>
                )}
              </div>
            ) : activeTab === 'budgets' ? (
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
                        <Label>Monthly Limit ({selectedCurrency.symbol}) *</Label>
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
                                {formatAmount(spent)} of {formatAmount(budget.monthly_limit)}
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
              <div className="space-y-2">
                {getFilteredEntries().map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      entry.entry_type === 'income' ? 'bg-green-100 dark:bg-green-950/30' : 'bg-red-100 dark:bg-red-950/30'
                    }`}>
                      {entry.entry_type === 'income' ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.category}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(entry.entry_date), 'MMM d')}</span>
                        {entry.description && (
                          <>
                            <span>•</span>
                            <span className="truncate">{entry.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-sm font-semibold ${
                        entry.entry_type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {entry.entry_type === 'income' ? '+' : '-'}{formatAmount(entry.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteEntry(entry.id)}
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DigitalLedgerContent;
