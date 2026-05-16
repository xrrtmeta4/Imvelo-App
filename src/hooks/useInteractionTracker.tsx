import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView, startSession, trackTimeSpent } from '@/lib/interactionTracker';
import { dashboard } from '@/lib/dashboardClient';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook that automatically tracks page views and session time via cookies.
 * Drop into App.tsx or a layout component.
 */
export const useInteractionTracker = () => {
  const location = useLocation();

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname);
    // Mirror to external dashboard activity feed (best-effort, non-blocking)
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await dashboard.logActivity(
          {
            actor_name: session?.user?.email || 'Web visitor',
            action: `page_view ${location.pathname}`,
            category: 'navigation',
          },
          session?.access_token,
        );
      } catch {
        // ignore — dashboard logging must never break the app
      }
    })();
  }, [location.pathname]);

  // Start session on mount, track time on unmount
  useEffect(() => {
    startSession();
    const start = Date.now();
    let unloadHandler: (() => void) | null = null;

    const handleUnload = () => {
      const minutes = Math.round((Date.now() - start) / 60000);
      if (minutes > 0) trackTimeSpent(minutes);
    };

    unloadHandler = handleUnload;
    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      if (unloadHandler) {
        handleUnload();
        window.removeEventListener('beforeunload', handleUnload);
      }
    };
  }, []);
};
