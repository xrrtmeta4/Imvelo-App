import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, TrendingUp, Shield, Zap, BarChart3, FileText } from 'lucide-react';
import { useUsageLimits } from '@/hooks/useUsageLimits';

const popupMessages = [
  {
    icon: TrendingUp,
    title: "Unlock Unlimited Scans",
    description: "Premium members get unlimited pest and disease detection scans every day. Never worry about limits again!"
  },
  {
    icon: Shield,
    title: "Protect Your Farm",
    description: "With premium, get instant AI-powered diagnostics anytime. Early detection saves crops and livestock!"
  },
  {
    icon: Zap,
    title: "Unlimited AI Assistance",
    description: "Ask the AI assistant unlimited questions about farming, weather, and best practices. Get expert advice 24/7!"
  },
  {
    icon: BarChart3,
    title: "Track Your Finances",
    description: "Premium members can access the Digital Ledger to track expenses, income, and export financial reports!"
  },
  {
    icon: FileText,
    title: "Export Professional Reports",
    description: "Generate and download professional PDF reports of your farm finances and activities anytime!"
  }
];

interface SubscriptionPopupProps {
  enabled?: boolean;
}

const SubscriptionPopup = ({ enabled = true }: SubscriptionPopupProps) => {
  const [open, setOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(0);
  const { isPremium, loadingPremium, openUpgrade } = useUsageLimits();

  useEffect(() => {
    if (!enabled || loadingPremium || isPremium) return;

    // Show popup randomly between 30-90 seconds after mount
    const initialDelay = Math.random() * 60000 + 30000;
    
    const timer = setTimeout(() => {
      setCurrentMessage(Math.floor(Math.random() * popupMessages.length));
      setOpen(true);
    }, initialDelay);

    return () => clearTimeout(timer);
  }, [enabled, isPremium, loadingPremium]);

  useEffect(() => {
    if (!enabled || loadingPremium || isPremium) return;

    // Show popup every 2-5 minutes
    const interval = setInterval(() => {
      const shouldShow = Math.random() > 0.5; // 50% chance
      if (shouldShow) {
        setCurrentMessage(Math.floor(Math.random() * popupMessages.length));
        setOpen(true);
      }
    }, Math.random() * 180000 + 120000);

    return () => clearInterval(interval);
  }, [enabled, isPremium, loadingPremium]);

  if (isPremium || loadingPremium) return null;

  const message = popupMessages[currentMessage];
  const IconComponent = message.icon;

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
            onClick={() => {
              openUpgrade();
              setOpen(false);
            }}
            className="w-full gap-2"
          >
            <Crown className="w-4 h-4" />
            Upgrade to Premium - $6.04
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => setOpen(false)}
            className="w-full text-muted-foreground"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionPopup;
