import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, GraduationCap, Send, Sparkles, TrendingUp, Shield, Landmark, PiggyBank, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from 'sonner';

interface FinancialAdvisorProps {
  entries: Array<{
    entry_date: string;
    entry_type: string;
    category: string;
    amount: number;
    description: string | null;
  }>;
}

const quickTopics = [
  { icon: TrendingUp, label: 'Cash Flow', prompt: 'Analyze my cash flow patterns and suggest how to optimize my farm\'s working capital and liquidity.' },
  { icon: Shield, label: 'Risk Management', prompt: 'Assess my financial risk exposure based on my income/expense patterns and recommend risk mitigation strategies.' },
  { icon: Landmark, label: 'Tax Strategy', prompt: 'Review my farm finances and suggest tax optimization strategies, deductions, and timing of expenses for maximum tax benefit.' },
  { icon: PiggyBank, label: 'Investment', prompt: 'Based on my farm\'s financial position, recommend investment opportunities and capital allocation strategies for growth.' },
  { icon: BarChart3, label: 'Loan Readiness', prompt: 'Evaluate my farm\'s financial health and readiness for securing a loan. What ratios and metrics would a lender look at?' },
  { icon: Sparkles, label: 'Profit Boost', prompt: 'Identify the top 5 specific, actionable strategies to increase my farm\'s profitability based on my current financial data.' },
];

const FinancialAdvisor = ({ entries }: FinancialAdvisorProps) => {
  const { t } = useLanguage();
  const { selectedCurrency } = useCurrency();
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const askAdvisor = async (prompt: string) => {
    if (entries.length < 2) {
      toast.error('Add at least 2 ledger entries for the advisor to analyze');
      return;
    }

    setLoading(true);
    setResponse(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-ledger', {
        body: {
          entries: entries.slice(0, 50).map(e => ({
            date: e.entry_date,
            type: e.entry_type,
            category: e.category,
            amount: e.amount,
            description: e.description,
          })),
          action: 'advisor',
          advisorPrompt: prompt,
          currency: selectedCurrency.code,
        },
      });

      if (error) throw error;
      setResponse(data.analysis);
    } catch (err) {
      console.error('Advisor error:', err);
      toast.error('Failed to get advice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!question.trim()) return;
    askAdvisor(question.trim());
    setQuestion('');
  };

  return (
    <div className="space-y-4">
      {/* Advisor Header */}
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-200 dark:border-amber-800 rounded-lg">
        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-sm">{t('financialAdvisor')}</p>
          <p className="text-xs text-muted-foreground">{t('advisorDesc')}</p>
        </div>
      </div>

      {/* Quick Topics */}
      <div className="grid grid-cols-3 gap-2">
        {quickTopics.map((topic) => (
          <Button
            key={topic.label}
            variant="outline"
            size="sm"
            className="h-auto py-2.5 flex-col gap-1 text-xs"
            onClick={() => askAdvisor(topic.prompt)}
            disabled={loading}
          >
            <topic.icon className="w-4 h-4" />
            {topic.label}
          </Button>
        ))}
      </div>

      {/* Custom Question */}
      <div className="flex gap-2">
        <Textarea
          placeholder={t('advisorPlaceholder')}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          size="icon"
          className="flex-shrink-0 self-end"
          onClick={handleSubmit}
          disabled={loading || !question.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Response */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
          <p className="text-sm text-muted-foreground">{t('advisorThinking')}</p>
        </div>
      ) : response ? (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-sm">{t('financialAdvisor')}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{response}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-xs">{t('advisorWelcome')}</p>
        </div>
      )}
    </div>
  );
};

export default FinancialAdvisor;
