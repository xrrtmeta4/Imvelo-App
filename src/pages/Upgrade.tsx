import { useState, useEffect, useCallback } from 'react';
import { Crown, Check, Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useUsageLimits, PlanTier, PLANS } from '@/hooks/useUsageLimits';
import { useAuth } from '@/hooks/useAuth';
import PaymentLogos from '@/components/PaymentLogos';

export const PAID_PLANS: PlanTier[] = ['premium', 'commercial', 'enterprise'];

const Upgrade = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isPremium, currentPlan, openUpgrade, refreshPremiumStatus } = useUsageLimits();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('commercial');

  const success = searchParams.get('success');

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setUserName(user.user_metadata.full_name.split(' ')[0]);
    } else if (user?.email) {
      setUserName(user.user_metadata.full_name?.split(' ')[0] ?? user.email.split('@')[0]);
    }
  }, [user]);

  useEffect(() => {
    if (success === 'true') {
      refreshPremiumStatus();
      toast.success('Payment successful! Access upgraded.');
    }
  }, [success, refreshPremiumStatus]);

  const handleUpgrade = useCallback(async () => {
    setLoading(true);
    try {
      const customerEmail = user?.email;
      if (!customerEmail) {
        throw new Error('Please sign in to upgrade');
      }

      await openUpgrade(selectedPlan);
    } catch (err: any) {
      console.error('[Upgrade] Checkout error:', err);
      toast.error(err?.message || 'Failed to start checkout. Please try again.');
      setLoading(false);
    }
  }, [user, selectedPlan]);

  if (isPremium) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundImage: "url('/african-farmers-farm-working_875825-177512.avif')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

        <div className="relative z-10 max-w-screen-sm mx-auto text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
            <Crown className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">You&apos;re on {PLANS[currentPlan].name}!</h1>
          <p className="text-sm text-white/80">
            Enjoy unlimited access to all the tools on this plan.
          </p>
          <Button onClick={() => navigate('/')} variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20">
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t('backToApp')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: "url('/african-farmers-farm-working_875825-177512.avif')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-screen-sm mx-auto">
        {success === 'true' && (
          <Card className="mb-6 border-green-500/50 bg-green-500/10 backdrop-blur-md">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Payment successful! Your access is being upgraded.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base text-white">
              <span className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                Choose a plan
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 mb-3">
              {PAID_PLANS.map((plan) => {
                const cfg = PLANS[plan];
                const selected = currentPlan === plan;
                return (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    disabled={selected}
                    className={`flex-1 py-2 px-3 rounded-lg border text-center transition ${
                      selected
                        ? 'border-primary bg-primary/20 text-white'
                        : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-sm font-medium">{cfg.name}</span>
                    <span className="block text-xs text-white/60">E{cfg.price.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
            <ul className="space-y-1.5 max-h-56 overflow-y-auto">
              {PLANS[selectedPlan].features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-white/90">
                  <Check className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600 backdrop-blur-md"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('redirecting')}
            </>
          ) : (
            <>
              <Crown className="w-4 h-4" />
              {t('upgradeNow')} E{PLANS[selectedPlan].price.toFixed(2)}
            </>
          )}
        </Button>

        {loading && (
          <p className="text-xs text-center text-white/70 mt-2">
            {t('clickToContinue')}
          </p>
        )}

        <Card className="mt-6 border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-4">
            <PaymentLogos />
          </CardContent>
        </Card>

        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="w-full text-white/70 hover:text-white hover:bg-white/10 mt-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('backToApp')}
        </Button>
      </div>
    </div>
  );
};

export default Upgrade;
