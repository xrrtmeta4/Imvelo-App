import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X, CloudRain, Thermometer, Wind, Droplets } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface WeatherAlert {
  id: string;
  alert_type: string;
  message: string;
  severity: string;
  created_at: string;
  read: boolean;
}

const alertIcons: Record<string, React.ReactNode> = {
  storm: <CloudRain className="w-5 h-5" />,
  heavy_rain: <CloudRain className="w-5 h-5" />,
  extreme_heat: <Thermometer className="w-5 h-5" />,
  drought: <Droplets className="w-5 h-5" />,
  strong_wind: <Wind className="w-5 h-5" />,
};

const severityColors: Record<string, string> = {
  high: 'bg-destructive/10 border-destructive/30 text-destructive',
  medium: 'bg-orange-500/10 border-orange-500/30 text-orange-600',
  low: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600',
};

const WeatherAlerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('weather_alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching alerts:', error);
    } else {
      setAlerts(data || []);
    }
    setLoading(false);
  }, [user]);

  const triggerLocationWeatherCheck = useCallback(async () => {
    if (!user) return;

    try {
      // Get user's location using IP geolocation
      const { data: locationData } = await supabase.functions.invoke('get-location', {});

      if (locationData && locationData.latitude && locationData.longitude) {
        // Fetch weather which will automatically create alerts for extreme conditions
        await supabase.functions.invoke('get-weather', {
          body: { 
            latitude: locationData.latitude, 
            longitude: locationData.longitude, 
            user_id: user.id 
          }
        });

        // Refresh alerts after weather check
        await fetchAlerts();
      }
    } catch (error) {
      console.error('Error checking weather:', error);
    }
  }, [user, fetchAlerts]);

  useEffect(() => {
    if (user) {
      fetchAlerts();
      // Check for location-based weather alerts on mount
      triggerLocationWeatherCheck();
    }
  }, [user, fetchAlerts, triggerLocationWeatherCheck]);

  const dismissAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('weather_alerts')
      .update({ read: true })
      .eq('id', alertId);

    if (error) {
      toast.error('Failed to dismiss alert');
    } else {
      setAlerts(alerts.filter(a => a.id !== alertId));
    }
  };

  const dismissAll = async () => {
    if (alerts.length === 0) return;

    const { error } = await supabase
      .from('weather_alerts')
      .update({ read: true })
      .eq('user_id', user?.id)
      .eq('read', false);

    if (error) {
      toast.error('Failed to dismiss alerts');
    } else {
      setAlerts([]);
      toast.success('All alerts dismissed');
    }
  };

  if (loading || alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          Weather Alerts
        </h3>
        {alerts.length > 1 && (
          <Button variant="ghost" size="sm" onClick={dismissAll} className="text-xs h-7">
            Dismiss All
          </Button>
        )}
      </div>
      
      {alerts.map((alert) => (
        <Card 
          key={alert.id} 
          className={`border ${severityColors[alert.severity] || severityColors.medium}`}
        >
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {alertIcons[alert.alert_type] || <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(alert.created_at).toLocaleString()}
                </p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 shrink-0"
                onClick={() => dismissAlert(alert.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WeatherAlerts;
