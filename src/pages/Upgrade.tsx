import { useState, useEffect } from 'react';
import { Crown, Check, Loader2, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import PaymentLogos from '@/components/PaymentLogos';

const PREMIUM_PRICE = 2.0;

const FEATURES = [
  'Unlimited pest & disease scans',
  'Unlimited AI chat messages',
  'Unlimited ledger entries',
  'Unlimited spray schedules',
  'Full 7-day weather forecast',
  'Priority support',
];

const Upgrade = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isPremium, refreshPremiumStatus } = useUsageLimits();
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const success = searchParams.get('success');

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name.split(' ')[0]);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (success === 'true') {
      refreshPremiumStatus();
      toast.success('Payment successful! Premium access activated.');
    }
  }, [success, refreshPremiumStatus]);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('Please sign in to upgrade');
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          product_id: 'pdt_0NYZaqcOARihEXXOPIdmC',
          customer_email: user.email,
          customer_name: user.user_metadata?.full_name || userName || 'Customer',
          redirect_url: window.location.origin + '/upgrade?success=true',
        },
      });

      const edgeError = (data as any)?.error || (error as any)?.message || (error as any)?.details;
      if (edgeError) {
        throw new Error(typeof edgeError === 'string' ? edgeError : JSON.stringify(edgeError));
      }

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      toast.error(err?.message || 'Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  if (isPremium) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-screen-sm mx-auto text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">You&apos;re on Premium!</h1>
          <p className="text-sm text-muted-foreground">
            Enjoy unlimited access to all farming tools.
          </p>
          <Button onClick={() => navigate('/')} variant="outline">
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t('backToApp')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-6 px-4">
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/10">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('upgradeTo')} Premium</h1>
            <p className="text-sm text-white/80 mt-0.5">{t('unlockTools')}</p>
          </div>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        {success === 'true' && (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-4 text-center">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Payment successful! Your premium access is being activated.
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                Premium Plan
              </span>
              <span className="text-lg font-bold">
                ${PREMIUM_PRICE.toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground">{t('perMonth')}</span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2">
              {FEATURES.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full gap-2"
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
              {t('upgradeNow')}
            </>
          )}
        </Button>

        {loading && (
          <p className="text-xs text-center text-muted-foreground">
            {t('clickToContinue')}
          </p>
        )}

        <PaymentLogos />

        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="w-full text-muted-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('backToApp')}
        </Button>
      </div>
    </div>
  );
};

export default Upgrade;
