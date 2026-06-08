import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const messageChannel = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          toast.info('Umlayeto omusha!', {
            description: 'Utfole umlayeto lomusha'
          });
        }
      )
      .subscribe();

    const marketChannel = supabase
      .channel('market-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_listings'
        },
        () => {
          toast.info('Imakethe Imusha!', {
            description: 'Kufakwe into lemsha eimakethe'
          });
        }
      )
      .subscribe();

    const weatherChannel = supabase
      .channel('weather-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'weather_alerts',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
          const alert = payload.new;
          
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
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(marketChannel);
      supabase.removeChannel(weatherChannel);
    };
  }, [user]);
};
