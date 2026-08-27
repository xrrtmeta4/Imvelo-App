import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { loadAdSense, unloadAdSense } from '@/lib/adsense';

const NO_ADS_PATHS = new Set([
  '/auth',
  '/settings',
  '/ussd',
  '/upgrade',
  '/privacy-policy',
  '/terms-of-service',
  '/not-found',
]);

export const useAdsense = () => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  const isAuthPath =
    location.pathname === '/auth' || location.pathname.startsWith('/auth/');
  const isNoAdsPath =
    NO_ADS_PATHS.has(location.pathname) ||
    NO_ADS_PATHS.has(location.pathname.replace(/\/$/, ''));

  const eligible =
    !authLoading && !!user && !isAuthPath && !isNoAdsPath;

  useEffect(() => {
    if (eligible) {
      void loadAdSense();
    } else {
      unloadAdSense();
    }
  }, [eligible]);

  return { eligible };
};
