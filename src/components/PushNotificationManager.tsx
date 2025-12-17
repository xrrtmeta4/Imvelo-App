import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, AlertTriangle, Cloud, Bug } from 'lucide-react';
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
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    weather_alerts: true,
    pest_outbreaks: true,
    disease_alerts: true,
    planting_reminders: true,
  });

  useEffect(() => {
    // Check if notifications are supported
    if ('Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Push notifications enabled!');
        // Show a test notification
        showNotification('Notifications Enabled', 'You will now receive important alerts about weather, pests, and diseases.');
      } else if (result === 'denied') {
        toast.error('Notifications blocked. Please enable them in your browser settings.');
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications');
    }
  };

  const showNotification = (title: string, body: string, icon?: string) => {
    if (permission !== 'granted') return;

    const notification = new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'imvelo-notification',
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  };

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
        {permission !== 'granted' ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Enable push notifications to receive important alerts about weather, pests, and disease outbreaks.
            </p>
            <Button onClick={requestPermission} className="w-full">
              <Bell className="w-4 h-4 mr-2" />
              Enable Notifications
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

            <p className="text-xs text-muted-foreground text-center mt-2">
              ✓ Notifications enabled
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PushNotificationManager;
