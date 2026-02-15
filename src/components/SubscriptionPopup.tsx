import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, TrendingUp, Shield, Zap, BarChart3, FileText } from 'lucide-react';
import { useUsageLimits, PLANS, PlanTier } from '@/hooks/useUsageLimits';

const popupMessages = [
  { icon: TrendingUp, title: "Unlock More Scans", description: "Upgrade your plan for more pest and disease detection scans every week!" },
  { icon: Shield, title: "Protect Your Farm", description: "Higher plans give you instant AI-powered diagnostics anytime. Early detection saves crops!" },
  { icon: Zap, title: "More AI Assistance", description: "Ask the AI assistant more questions about farming, weather, and best practices!" },
  { icon: BarChart3, title: "Track Your Finances", description: "Pro members can access the Digital Ledger to track expenses, income, and export financial reports!" },
  { icon: FileText, title: "Advanced Analytics", description: "Enterprise members get crop monitoring, climate risk analysis, and unlimited access to everything!" }
];

interface SubscriptionPopupProps {
  enabled?: boolean;
}

const SubscriptionPopup = ({ enabled = true }: SubscriptionPopupProps) => {
  const [open, setOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(0);
  const { currentPlan, loadingPremium, openUpgrade, trialDaysLeft } = useUsageLimits();

  useEffect(() => {
    if (!enabled || loadingPremium || currentPlan === 'enterprise') return;
    const timer = setTimeout(() => {
      setCurrentMessage(Math.floor(Math.random() * popupMessages.length));
      setOpen(true);
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [enabled, currentPlan, loadingPremium]);

  useEffect(() => {
    if (!enabled || loadingPremium || currentPlan === 'enterprise') return;
    const interval = setInterval(() => {
      setCurrentMessage(Math.floor(Math.random() * popupMessages.length));
      setOpen(true);
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [enabled, currentPlan, loadingPremium]);

  if (currentPlan === 'enterprise' || loadingPremium) return null;

  const message = popupMessages[currentMessage];
  const IconComponent = message.icon;

  const suggestedPlan: PlanTier = currentPlan === 'free' ? 'starter' : currentPlan === 'starter' ? 'pro' : 'enterprise';
  const suggestedConfig = PLANS[suggestedPlan];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <IconComponent className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">{message.title}</DialogTitle>
          <DialogDescription className="text-center text-base">
            {message.description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          <Button 
            onClick={() => { openUpgrade(suggestedPlan); setOpen(false); }}
            className="w-full gap-2"
          >
            <Crown className="w-4 h-4" />
            Upgrade to {suggestedConfig.name} - ${suggestedConfig.price.toFixed(2)}/mo
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} className="w-full text-muted-foreground">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPopup;
