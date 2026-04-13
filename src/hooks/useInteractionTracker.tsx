import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView, startSession, trackTimeSpent } from '@/lib/interactionTracker';

/**
 * Hook that automatically tracks page views and session time via cookies.
 * Drop into App.tsx or a layout component.
 */
export const useInteractionTracker = () => {
  const location = useLocation();

  // Track page views on route change
  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  // Start session on mount, track time on unmount
  useEffect(() => {
    startSession();
    const start = Date.now();

    const handleUnload = () => {
      const minutes = Math.round((Date.now() - start) / 60000);
      if (minutes > 0) trackTimeSpent(minutes);
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      handleUnload();
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);
};
