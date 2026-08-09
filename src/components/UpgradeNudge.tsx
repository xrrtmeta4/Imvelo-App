import { Crown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useUsageLimits } from '@/hooks/useUsageLimits';

interface UpgradeNudgeProps {
  message?: string;
  className?: string;
}

const UpgradeNudge = ({ message, className = '' }: UpgradeNudgeProps) => {
  const { isPremium, loadingPremium, getRemainingDetections, getRemainingChats } = useUsageLimits();
  const navigate = useNavigate();

  if (loadingPremium || isPremium) return null;

  const scans = getRemainingDetections();
  const chats = getRemainingChats();

  return (
    <div
      className={`rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-3 flex items-center gap-3 ${className}`}
    >
      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {message || 'You are on the Free plan'}
        </p>
        <p className="text-xs text-muted-foreground">
          {scans} scan{scans === 1 ? '' : 's'} and {chats} Chloe chat{chats === 1 ? '' : 's'} left. Go Premium for unlimited access.
        </p>
      </div>
      <Button size="sm" className="gap-1 shrink-0" onClick={() => navigate('/upgrade')}>
        <Crown className="w-4 h-4" />
        Upgrade
      </Button>
    </div>
  );
};

export default UpgradeNudge;