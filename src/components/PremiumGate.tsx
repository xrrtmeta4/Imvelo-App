import { Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useUsageLimits, PlanTier, PLANS } from '@/hooks/useUsageLimits';
import { useNavigate } from 'react-router-dom';

interface PremiumGateProps {
  feature: string;
  requiredPlan: PlanTier;
  children: React.ReactNode;
}

const PremiumGate = ({ feature, requiredPlan, children }: PremiumGateProps) => {
  const { currentPlan, loadingPremium } = useUsageLimits();
  const navigate = useNavigate();

  if (loadingPremium) return null;

  const planOrder: PlanTier[] = ['free', 'starter', 'pro', 'enterprise'];
  const currentIndex = planOrder.indexOf(currentPlan);
  const requiredIndex = planOrder.indexOf(requiredPlan);

  if (currentIndex >= requiredIndex) return <>{children}</>;

  const requiredPlanConfig = PLANS[requiredPlan];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-screen-sm mx-auto px-4 py-12">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{requiredPlanConfig.name} Feature</h2>
              <p className="text-muted-foreground">
                <strong>{feature}</strong> requires the {requiredPlanConfig.name} plan or higher.
              </p>
            </div>
            <Button onClick={() => navigate('/upgrade')} size="lg" className="gap-2 w-full max-w-xs">
              <Crown className="w-5 h-5" />
              View Plans & Upgrade
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PremiumGate;
