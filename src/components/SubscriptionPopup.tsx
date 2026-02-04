import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Crown, TrendingUp, Shield, Zap, BarChart3, FileText } from 'lucide-react';
import { useUsageLimits, subscriptionPricing } from '@/hooks/useUsageLimits';

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
  const { isPremium, loadingPremium, openUpgrade, userCurrency, setPreferredCurrency, getFormattedPrice } = useUsageLimits();

  useEffect(() => {
    if (!enabled || loadingPremium || isPremium) return;

    // Show popup after 5 minutes, then every 10 minutes (less aggressive)
    const initialDelay = 5 * 60 * 1000; // 5 minutes
    
    const timer = setTimeout(() => {
      setCurrentMessage(Math.floor(Math.random() * popupMessages.length));
      setOpen(true);
    }, initialDelay);

    return () => clearTimeout(timer);
  }, [enabled, isPremium, loadingPremium]);

  useEffect(() => {
    if (!enabled || loadingPremium || isPremium) return;

    // Show popup every 10 minutes (less intrusive)
    const interval = setInterval(() => {
      setCurrentMessage(Math.floor(Math.random() * popupMessages.length));
      setOpen(true);
    }, 10 * 60 * 1000); // 10 minutes

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
          <div className="flex items-center gap-2">
            <Select value={userCurrency} onValueChange={setPreferredCurrency}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(subscriptionPricing).map(([code, { symbol }]) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => {
                openUpgrade();
                setOpen(false);
              }}
              className="flex-1 gap-2"
            >
              <Crown className="w-4 h-4" />
              Upgrade - {getFormattedPrice()}
            </Button>
          </div>
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
