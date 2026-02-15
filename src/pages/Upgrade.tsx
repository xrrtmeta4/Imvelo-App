import { Check, Crown, Zap, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUsageLimits, PLANS, PlanTier } from '@/hooks/useUsageLimits';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from 'react-router-dom';

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

  const tiers: PlanTier[] = ['starter', 'pro', 'enterprise'];

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
          {trialDaysLeft !== null && trialDaysLeft > 0 && (
            <Badge variant="secondary" className="mt-3">
              {trialDaysLeft} days left on free trial
            </Badge>
          )}
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-4">
        {tiers.map((tier) => {
          const plan = PLANS[tier];
          const isCurrent = currentPlan === tier;
          const isUpgrade = ['free', 'starter', 'pro', 'enterprise'].indexOf(tier) > ['free', 'starter', 'pro', 'enterprise'].indexOf(currentPlan);

          return (
            <Card key={tier} className={`relative overflow-hidden ${planColors[tier]}`}>
              {tier === 'pro' && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${tier === 'enterprise' ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                    {planIcons[tier]}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-foreground">${plan.price.toFixed(2)}</span>
                      <span className="text-sm text-muted-foreground">/month</span>
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
                  <Button className="w-full gap-2" onClick={() => openUpgrade(tier)}>
                    <Crown className="w-4 h-4" />
                    {t('upgradeTo')} {plan.name}
                  </Button>
                ) : (
                  <Button disabled variant="ghost" className="w-full text-muted-foreground">
                    Included in your plan
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}

        <p className="text-center text-xs text-muted-foreground pt-4">
          All plans include a 7-day free trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
};

export default Upgrade;
