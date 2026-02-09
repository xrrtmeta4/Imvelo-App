import { Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUsageLimits } from '@/hooks/useUsageLimits';

interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
}

const PremiumGate = ({ feature, children }: PremiumGateProps) => {
  const { isPremium, loadingPremium, openUpgrade, getFormattedPrice } = useUsageLimits();

  if (loadingPremium) return null;

  if (isPremium) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-screen-sm mx-auto px-4 py-12">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Premium Feature</h2>
              <p className="text-muted-foreground">
                <strong>{feature}</strong> is available exclusively for premium members.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Unlock all features for just</p>
              <p className="text-3xl font-bold text-primary">{getFormattedPrice()}/mo</p>
            </div>
            <ul className="text-sm text-left space-y-2 max-w-xs mx-auto">
              <li className="flex items-center gap-2">✅ Unlimited pest & disease scans</li>
              <li className="flex items-center gap-2">✅ Unlimited AI chat</li>
              <li className="flex items-center gap-2">✅ Spray scheduling calendar</li>
              <li className="flex items-center gap-2">✅ Digital financial ledger</li>
              <li className="flex items-center gap-2">✅ Detailed weather forecasts</li>
              <li className="flex items-center gap-2">✅ Crop monitoring & climate risk</li>
            </ul>
            <Button onClick={openUpgrade} size="lg" className="gap-2 w-full max-w-xs">
              <Crown className="w-5 h-5" />
              Upgrade to Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PremiumGate;
