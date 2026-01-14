import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const WeatherCard = () => {
  const { user } = useAuth();
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeather();
  }, []);

  const getWeather = async () => {
    try {
      // Use IP geolocation API for location detection
      const { data: locationData, error: locationError } = await supabase.functions.invoke('get-location', {});
      
      let lat = -26.3054;
      let lon = 31.1367;
      
      if (!locationError && locationData && locationData.latitude && locationData.longitude) {
        lat = locationData.latitude;
        lon = locationData.longitude;
      }
      
      const { data, error } = await supabase.functions.invoke('get-weather', {
        body: { latitude: lat, longitude: lon, user_id: user?.id }
      });

      if (error) throw error;
      setWeather(data);
      setLoading(false);
    } catch (error) {
      console.error('Weather error:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-sky/10 border-sky/20">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!weather) return null;

  return (
    <Card className="bg-sky/10 border-sky/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Cloud className="w-5 h-5" />
          Weather Forecast
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Today</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-2xl">{weather.current.temperature}°</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{weather.current.weather_description}</p>
          
          {weather.current.feels_like && (
            <p className="text-xs text-muted-foreground">
              Feels like: {weather.current.feels_like}°
            </p>
          )}
          
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t">
            <span>High: {weather.daily.max_temp}°</span>
            <span>Low: {weather.daily.min_temp}°</span>
            {weather.current.humidity && (
              <span>Humidity: {weather.current.humidity}%</span>
            )}
            {weather.daily.precipitation_probability && (
              <span>Rain: {weather.daily.precipitation_probability}%</span>
            )}
          </div>
          
          {weather.current.wind_speed > 0 && (
            <p className="text-xs text-muted-foreground">
              Wind: {weather.current.wind_speed} km/h
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherCard;
