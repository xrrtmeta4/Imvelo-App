import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, Thermometer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const WeatherTicker = () => {
  const { user } = useAuth();
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWeather();
  }, []);

  const getWeather = async () => {
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const { data, error } = await supabase.functions.invoke('get-weather', {
              body: { latitude, longitude, user_id: user?.id }
            });
            if (!error) setWeather(data);
            setLoading(false);
          },
          async () => {
            // Default to Mbabane
            const { data } = await supabase.functions.invoke('get-weather', {
              body: { latitude: -26.3054, longitude: 31.1367, user_id: user?.id }
            });
            if (data) setWeather(data);
            setLoading(false);
          }
        );
      } else {
        const { data } = await supabase.functions.invoke('get-weather', {
          body: { latitude: -26.3054, longitude: 31.1367, user_id: user?.id }
        });
        if (data) setWeather(data);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  const getWeatherIcon = (description: string) => {
    if (description.includes('mvula') || description.includes('Imvula')) {
      return <CloudRain className="w-4 h-4" />;
    }
    if (description.includes('mafu') || description.includes('Limafu')) {
      return <Cloud className="w-4 h-4" />;
    }
    return <Sun className="w-4 h-4" />;
  };

  if (loading || !weather) return null;

  return (
    <div className="bg-primary/10 border-b border-primary/20 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap py-2 flex items-center gap-8">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Thermometer className="w-4 h-4 text-primary" />
          <span className="font-medium">{weather.current.temperature}°C</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground">
          {getWeatherIcon(weather.current.weather_description)}
          <span>{weather.current.weather_description}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>↑{weather.daily.max_temp}°</span>
          <span>↓{weather.daily.min_temp}°</span>
        </div>
        {weather.current.humidity && (
          <div className="text-sm text-muted-foreground">
            Umswakama: {weather.current.humidity}%
          </div>
        )}
        {weather.daily.precipitation_probability > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CloudRain className="w-4 h-4" />
            <span>{weather.daily.precipitation_probability}% imvula</span>
          </div>
        )}
        {/* Duplicate for seamless loop */}
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Thermometer className="w-4 h-4 text-primary" />
          <span className="font-medium">{weather.current.temperature}°C</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground">
          {getWeatherIcon(weather.current.weather_description)}
          <span>{weather.current.weather_description}</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherTicker;
