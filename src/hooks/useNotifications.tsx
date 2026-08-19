import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const getShownKey = (userId: string, alertId: string) => `imvelo-shown-alert-${userId}-${alertId}`;

export const useNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const weatherChannel = supabase
      .channel(`weather-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'weather_alerts',
          filter: `user_id=eq.${user.id}`
        },
        (payload: { new: Record<string, unknown> }) => {
          const alert = payload.new as { id?: string; alert_type?: string; message?: string; severity?: string };
          const alertId = alert.id || payload.new?.id;

          // Deduplicate: show each alert exactly once per id (real-time can
          // surface the same INSERT twice while the service worker and this
          // Realtime channel both process it).
          if (alertId && typeof window !== 'undefined') {
            const key = getShownKey(user.id, alertId);
            if (window.sessionStorage.getItem(key) === '1') return;
            window.sessionStorage.setItem(key, '1');
          }

          if (alert.alert_type === 'planting_reminder') {
            toast.success('🌱 Sikhumbutso Sekutjala!', {
              description: alert.message,
              duration: 10000
            });
            return;
          }

          const title = alert.severity === 'high' ? 'Critical weather alert!' : 'Weather alert';
          toast.error(title, {
            description: alert.message,
            duration: 12000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(weatherChannel);
    };
  }, [user]);
};
