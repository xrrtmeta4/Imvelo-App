import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SyncStatusBar = () => {
  const { isOnline, isSyncing, pendingCount, syncNow, conflicts } = useOfflineSync();

  // Don't show if online with nothing pending
  if (isOnline && pendingCount === 0 && conflicts.length === 0 && !isSyncing) return null;

  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-[60] px-3 py-1.5 flex items-center justify-between text-xs font-medium transition-colors',
      !isOnline
        ? 'bg-amber-500 text-amber-950'
        : conflicts.length > 0
          ? 'bg-destructive text-destructive-foreground'
          : isSyncing
            ? 'bg-blue-500 text-white'
            : 'bg-primary text-primary-foreground'
    )}>
      <div className="flex items-center gap-1.5">
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline — {pendingCount} change{pendingCount !== 1 ? 's' : ''} saved locally</span>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Syncing...</span>
          </>
        ) : conflicts.length > 0 ? (
          <>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} to resolve</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>{pendingCount} pending</span>
          </>
        ) : null}
      </div>

      {isOnline && pendingCount > 0 && !isSyncing && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-2 text-xs hover:bg-white/20"
          onClick={syncNow}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Sync
        </Button>
      )}
    </div>
  );
};

export default SyncStatusBar;
