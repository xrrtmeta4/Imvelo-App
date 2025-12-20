import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, AlertTriangle, Cloud, Bug, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface NotificationPreferences {
  weather_alerts: boolean;
  pest_outbreaks: boolean;
  disease_alerts: boolean;
  planting_reminders: boolean;
}

const PushNotificationManager = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    weather_alerts: true,
    pest_outbreaks: true,
    disease_alerts: true,
    planting_reminders: true,
  });

  useEffect(() => {
    // Check if notifications and service workers are supported
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = async () => {
    if (!user) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  };

  const subscribeToPush = async () => {
    if (!user) {
      toast.error('Please sign in to enable notifications');
      return;
    }

    setIsSubscribing(true);
    
    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        toast.error('Notification permission denied');
        setIsSubscribing(false);
        return;
      }

      // Register service worker
      const registration = await registerServiceWorker();
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          // Public VAPID key - this is safe to expose
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
        ) as BufferSource,
      });

      // Save subscription to database
      const subscriptionJSON = subscription.toJSON();
      
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh_key: subscriptionJSON.keys?.p256dh || '',
          auth_key: subscriptionJSON.keys?.auth || '',
        }, { onConflict: 'user_id,endpoint' });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success('Push notifications enabled!');
      
      // Show test notification
      showNotification('Notifications Enabled', 'You will receive weather updates and climate alerts automatically.');
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Failed to enable push notifications');
    } finally {
      setIsSubscribing(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!user) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Failed to disable notifications');
    }
  };

  const showNotification = (title: string, body: string, icon?: string) => {
    if (permission !== 'granted') return;

    const notification = new Notification(title, {
      body,
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'imvelo-notification',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  };

  // Helper function to convert VAPID key
  function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  const togglePreference = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    toast.success(`${key.replace('_', ' ')} notifications ${preferences[key] ? 'disabled' : 'enabled'}`);
  };

  // Listen for real-time alerts
  useEffect(() => {
    if (!user || permission !== 'granted') return;

    // Subscribe to weather alerts
    const weatherChannel = supabase
      .channel('push-weather-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'weather_alerts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (preferences.weather_alerts) {
            const alert = payload.new as any;
            showNotification(
              `⚠️ Weather Alert: ${alert.alert_type}`,
              alert.message,
              '/favicon.ico'
            );
          }
        }
      )
      .subscribe();

    // Subscribe to pest reports (for outbreak detection)
    const pestChannel = supabase
      .channel('push-pest-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pest_reports',
        },
        (payload) => {
          if (preferences.pest_outbreaks) {
            const report = payload.new as any;
            // Only show if it's a high confidence detection nearby
            if (report.confidence > 80) {
              showNotification(
                '🐛 Pest Alert',
                `${report.pest_name} detected with ${report.confidence}% confidence. Check recommended treatment.`,
                '/favicon.ico'
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(weatherChannel);
      supabase.removeChannel(pestChannel);
    };
  }, [user, permission, preferences]);

  if (!isSupported) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="w-5 h-5" />
          Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSubscribed ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Enable push notifications to receive automatic hourly weather updates and climate alerts.
            </p>
            <Button onClick={subscribeToPush} className="w-full" disabled={isSubscribing}>
              {isSubscribing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bell className="w-4 h-4 mr-2" />
              )}
              {isSubscribing ? 'Enabling...' : 'Enable Push Notifications'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Weather Alerts</span>
              </div>
              <Button
                variant={preferences.weather_alerts ? "default" : "outline"}
                size="sm"
                onClick={() => togglePreference('weather_alerts')}
              >
                {preferences.weather_alerts ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-orange-500" />
                <span className="text-sm">Pest Outbreaks</span>
              </div>
              <Button
                variant={preferences.pest_outbreaks ? "default" : "outline"}
                size="sm"
                onClick={() => togglePreference('pest_outbreaks')}
              >
                {preferences.pest_outbreaks ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm">Disease Alerts</span>
              </div>
              <Button
                variant={preferences.disease_alerts ? "default" : "outline"}
                size="sm"
                onClick={() => togglePreference('disease_alerts')}
              >
                {preferences.disease_alerts ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-green-500" />
                <span className="text-sm">Planting Reminders</span>
              </div>
              <Button
                variant={preferences.planting_reminders ? "default" : "outline"}
                size="sm"
                onClick={() => togglePreference('planting_reminders')}
              >
                {preferences.planting_reminders ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t">
              <p className="text-xs text-muted-foreground">
                ✓ Push notifications active
              </p>
              <Button variant="outline" size="sm" onClick={unsubscribeFromPush}>
                <BellOff className="w-4 h-4 mr-1" />
                Disable
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PushNotificationManager;
