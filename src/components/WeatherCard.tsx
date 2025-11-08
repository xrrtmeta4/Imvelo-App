import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const WeatherCard = () => {
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeather();
  }, []);

  const getWeather = async () => {
    try {
      // Get user location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            const { data, error } = await supabase.functions.invoke('get-weather', {
              body: { latitude, longitude }
            });

            if (error) throw error;
            setWeather(data);
            setLoading(false);
          },
          (error) => {
            console.error('Location error:', error);
            // Use default location (Eswatini capital)
            fetchDefaultWeather();
          }
        );
      } else {
        fetchDefaultWeather();
      }
    } catch (error) {
      console.error('Weather error:', error);
      setLoading(false);
    }
  };

  const fetchDefaultWeather = async () => {
    const { data, error } = await supabase.functions.invoke('get-weather', {
      body: { latitude: -26.3054, longitude: 31.1367 } // Mbabane, Eswatini
    });

    if (!error) {
      setWeather(data);
    }
    setLoading(false);
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
          Sikhatsi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Namuhla</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-2xl">{weather.current.temperature}°</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{weather.current.weather_description}</p>
          <div className="flex justify-between text-xs text-muted-foreground pt-2">
            <span>Iphakeme: {weather.daily.max_temp}°</span>
            <span>Liphansi: {weather.daily.min_temp}°</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherCard;
