import { useState, useEffect } from 'react';
import { Check, Crown, ArrowLeft, Loader2, PartyPopper, ShieldCheck, Lock, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsageLimits, PLANS, PlanTier } from '@/hooks/useUsageLimits';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import PaymentLogos from '@/components/PaymentLogos';

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

  const handleUpgrade = async () => {
    setLoadingTier('premium');
    try {
      await openUpgrade('premium');
    } finally {
      setTimeout(() => setLoadingTier(null), 5000);
    }
  };

  const plan = PLANS['premium'];
  const isCurrent = currentPlan === 'premium';
  const isUpgrade = !isCurrent;
  const isLoading = loadingTier === 'premium';

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

        <Card className="relative overflow-hidden border-primary ring-2 ring-primary/20">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
            {t('popular')}
          </div>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">${plan.price.toFixed(2)}</span>
                  <span className="text-sm text-muted-foreground">{t('perMonth')}</span>
                </div>
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
            ) : isUpgrade ? (
              <Button className="w-full gap-2" disabled={isLoading} onClick={handleUpgrade}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Crown className="w-4 h-4" />
                )}
                {isLoading ? t('processing') || 'Processing...' : `${t('upgradeTo')} ${plan.name}`}
              </Button>
            ) : null}
          </CardContent>
        </Card>

        <PaymentLogos />

        {/* Security Trust Section */}
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
              All payments are processed through secure, encrypted channels. Your financial data is never stored on our servers. We use industry-standard security protocols to protect every transaction.
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pt-4">
          {t('cancelAnytime')}
        </p>
      </div>
    </div>
  );
};

export default Upgrade;
