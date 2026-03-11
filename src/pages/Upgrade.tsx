import { useState, useEffect } from 'react';
import { Check, Crown, Zap, Building2, ArrowLeft, Loader2, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsageLimits, PLANS, PlanTier } from '@/hooks/useUsageLimits';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const planIcons: Record<PlanTier, React.ReactNode> = {
  free: null,
  starter: <Zap className="w-6 h-6" />,
  pro: <Crown className="w-6 h-6" />,
  enterprise: <Building2 className="w-6 h-6" />,
};

const planColors: Record<PlanTier, string> = {
  free: 'border-border',
  starter: 'border-primary/40',
  pro: 'border-primary ring-2 ring-primary/20',
  enterprise: 'border-amber-500 ring-2 ring-amber-500/20',
};

const Upgrade = () => {
  const { currentPlan, openUpgrade, trialDaysLeft } = useUsageLimits();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingTier, setLoadingTier] = useState<PlanTier | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('🎉 Payment successful! Your plan is being activated.');
    }
  }, [searchParams]);

  const handleUpgrade = async (tier: PlanTier) => {
    setLoadingTier(tier);
    try {
      await openUpgrade(tier);
    } finally {
      // Reset after a delay in case redirect doesn't happen
      setTimeout(() => setLoadingTier(null), 5000);
    }
  };

  const tiers: PlanTier[] = ['pro', 'enterprise'];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-8 px-4">
        <div className="max-w-screen-sm mx-auto">
          <Button variant="ghost" size="sm" className="mb-4 text-primary-foreground/80 hover:text-primary-foreground" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('back')}
          </Button>
          <h1 className="text-3xl font-bold">{t('choosePlan')}</h1>
          <p className="text-primary-foreground/90 mt-1">{t('unlockTools')}</p>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-4">
        {searchParams.get('success') === 'true' && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="flex items-center gap-3 py-4">
              <PartyPopper className="w-6 h-6 text-primary" />
              <p className="text-sm font-medium">{t('paymentSuccess') || 'Payment successful! Your premium access is being activated.'}</p>
            </CardContent>
          </Card>
        )}

        {tiers.map((tier) => {
          const plan = PLANS[tier];
          const isCurrent = currentPlan === tier;
          const isUpgrade = ['free', 'starter', 'pro', 'enterprise'].indexOf(tier) > ['free', 'starter', 'pro', 'enterprise'].indexOf(currentPlan);
          const isLoading = loadingTier === tier;

          return (
            <Card key={tier} className={`relative overflow-hidden ${planColors[tier]}`}>
              {tier === 'pro' && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                  {t('popular')}
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${tier === 'enterprise' ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                    {planIcons[tier]}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {tier === 'enterprise' ? (
                      <span className="text-2xl font-bold text-foreground">{t('contactUs')}</span>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-foreground">${plan.price.toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground">{t('perMonth')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button disabled className="w-full" variant="outline">
                    {t('currentPlan')}
                  </Button>
                ) : isUpgrade && tier === 'enterprise' ? (
                  <Button className="w-full gap-2" onClick={() => window.open('mailto:support@imveloapp.com?subject=Enterprise Plan Inquiry', '_blank')}>
                    <Building2 className="w-4 h-4" />
                    {t('contactSales')}
                  </Button>
                ) : isUpgrade ? (
                  <Button className="w-full gap-2" disabled={isLoading} onClick={() => handleUpgrade(tier)}>
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Crown className="w-4 h-4" />
                    )}
                    {isLoading ? t('processing') || 'Processing...' : `${t('upgradeTo')} ${plan.name}`}
                  </Button>
                ) : (
                  <Button disabled variant="ghost" className="w-full text-muted-foreground">
                    {t('includedInPlan')}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Payment Methods Section */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground text-center">Accepted Payment Methods</p>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
              <CreditCard className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">Credit & Debit Cards</span>
            </div>
            <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
              <Smartphone className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">Apple Pay</span>
            </div>
            <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
              <Smartphone className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">Google Pay</span>
            </div>
            <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
              <Wallet className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">PayPal</span>
            </div>
            <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
              <Banknote className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">UPI</span>
            </div>
            <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
              <Globe className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">Pix</span>
            </div>
            <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
              <Wallet className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">Venmo / CashApp</span>
            </div>
            <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-2">
              <Banknote className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">Bank Transfer</span>
            </div>
          </div>
          
          <p className="text-[10px] text-muted-foreground text-center">
            + Klarna, Affirm, Afterpay, AliPay, WeChat Pay, Samsung Pay, GCash, SEPA, iDEAL & 20+ more
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-4">
          {t('cancelAnytime')}
        </p>
      </div>
    </div>
  );
};

export default Upgrade;
