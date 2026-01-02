import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const useNativePush = () => {
  const { user } = useAuth();
  const [isNative, setIsNative] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    setIsNative(platform === 'android' || platform === 'ios');
  }, []);

  useEffect(() => {
    if (!isNative || !user) return;

    const registerPush = async () => {
      try {
        // Request permission
        const permStatus = await PushNotifications.requestPermissions();
        
        if (permStatus.receive === 'granted') {
          // Register with the native push notification service
          await PushNotifications.register();
        } else {
          console.log('Push notification permission denied');
        }
      } catch (error) {
        console.error('Error registering push notifications:', error);
      }
    };

    // Add listeners
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token:', token.value);
      setPushToken(token.value);
      
      // Save token to database
      if (user) {
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            endpoint: `fcm:${token.value}`,
            p256dh_key: 'native',
            auth_key: 'native',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,endpoint'
          });

        if (error) {
          console.error('Error saving push token:', error);
        }
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      toast.info(notification.title || 'Notification', {
        description: notification.body
      });
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('Push notification action performed:', action);
    });

    registerPush();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [isNative, user]);

  return {
    isNative,
    pushToken,
    isSupported: isNative
  };
};
