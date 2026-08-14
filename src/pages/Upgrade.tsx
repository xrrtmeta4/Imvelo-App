import { useState, useEffect } from 'react';
import { Check, Crown, ArrowLeft, Loader2, PartyPopper, ShieldCheck, Lock, BadgeCheck, CreditCard, Globe, Receipt, Zap, TimerReset } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsageLimits, PLANS, PlanTier } from '@/hooks/useUsageLimits';
import { useLanguage } from '@/hooks/useLanguage';
import { useCurrency } from '@/hooks/useCurrency';
import { formatLocalPrice } from '@/lib/fxRates';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import PaymentLogos from '@/components/PaymentLogos';

const PRODUCT_ID = 'pdt_0NYZaqcOARihEXXOPIdmC';

const SUPPORTED_METHODS = [
  'credit', 'debit',
  'apple_pay', 'google_pay',
  'upi_collect', 'upi_intent',
  'cashapp', 'venmo', 'paypal',
  'ali_pay', 'we_chat_pay',
  'ach', 'ideal', 'sepa', 'sofort',
  'pix', 'boleto', 'oxxo'
];

const Upgrade = () => {
  const { currentPlan, openUpgrade, trialDaysLeft } = useUsageLimits();
  const { t } = useLanguage();
  const { selectedCurrency } = useCurrency();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Payment successful! Your plan is being activated.');
    }
  }, [searchParams]);

  const handleUpgrade = async () => {
    setLoadingTier('premium');
    try {
      await openUpgrade('premium', SUPPORTED_METHODS);
    } finally {
      setTimeout(() => setLoadingTier(null), 5000);
    }
  };

  const plan = PLANS['premium'];
  const isCurrent = currentPlan === 'premium';
  const isLoading = loadingTier === 'premium';

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground py-8 px-4">
        <div className="max-w-screen-sm mx-auto">
          <Button variant="ghost" size="sm" className="mb-4 text-primary-foreground/80 hover:text-primary-foreground" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('choosePlan')}</h1>
              <p className="text-sm text-primary-foreground/80 mt-0.5">Powered by Dodo Payments</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-5">
        {searchParams.get('success') === 'true' && (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950/30">
            <CardContent className="flex items-center gap-3 py-4">
              <PartyPopper className="w-6 h-6 text-green-600" />
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {t('paymentSuccess') || 'Payment successful! Your premium access is being activated.'}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="relative overflow-hidden border-primary ring-2 ring-primary/20">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
            {t('popular')}
          </div>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Crown className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="flex flex-col mt-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{formatLocalPrice(plan.price, selectedCurrency)}</span>
                    <span className="text-sm text-muted-foreground">{t('perMonth')}</span>
                  </div>
                  {selectedCurrency.code !== 'USD' && (
                    <span className="text-[10px] text-muted-foreground">≈ ${plan.price.toFixed(2)} USD · billed in USD</span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="space-y-2.5">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {isCurrent ? (
              <Button disabled className="w-full" variant="outline">
                {t('currentPlan')}
              </Button>
            ) : (
              <Button className="w-full gap-2 h-12 text-base font-semibold" disabled={isLoading} onClick={handleUpgrade}>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Globe className="w-5 h-5" />
                )}
                {isLoading ? t('processing') || 'Processing...' : `Pay ${formatLocalPrice(plan.price, selectedCurrency)} ${t('perMonth')}`}
              </Button>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" /> SSL Encrypted</span>
              <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> PCI Compliant</span>
              <span className="inline-flex items-center gap-1"><TimerReset className="w-3 h-3" /> Cancel Anytime</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="w-4 h-4 text-primary" />
              What happens next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <p>You will be redirected to our secure Dodo Payments checkout.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <p>Choose your preferred payment method from 100+ options worldwide.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</div>
              <p>After successful payment, premium access is activated immediately.</p>
            </div>
          </CardContent>
        </Card>

        <PaymentLogos />

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-5 space-y-4">
            <div className="flex items-center gap-2 justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">Your Transactions Are Secure</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="flex flex-col items-center gap-1.5">
                <Lock className="w-4 h-4 text-primary" />
                <span className="text-[10px] text-muted-foreground leading-tight">256-bit SSL Encryption</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-[10px] text-muted-foreground leading-tight">PCI DSS Compliant</span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-primary" />
                <span className="text-[10px] text-muted-foreground leading-tight">Verified & Protected</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              All payments are processed through Dodo Payments using secure, encrypted channels. Your financial data is never stored on our servers. We use industry-standard security protocols to protect every transaction.
            </p>
          </CardContent>
        </Card>

        <div className="rounded-xl bg-muted/40 border border-border/50 p-4 text-center space-y-1">
          <p className="text-[11px] text-muted-foreground">
            Product ID: <span className="font-mono text-foreground">{PRODUCT_ID}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t('cancelAnytime')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;
