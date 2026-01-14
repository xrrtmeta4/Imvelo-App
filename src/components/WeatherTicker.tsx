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
      
      if (!error) setWeather(data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const getWeatherIcon = (code: number) => {
    if (code >= 51 && code <= 99) {
      return <CloudRain className="w-4 h-4" />;
    }
    if (code >= 1 && code <= 3) {
      return <Cloud className="w-4 h-4" />;
    }
    return <Sun className="w-4 h-4" />;
  };

  const getWeatherDescription = (code: number): string => {
    const descriptions: Record<number, string> = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Slight showers',
      81: 'Moderate showers',
      82: 'Violent showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with hail',
      99: 'Severe thunderstorm'
    };
    return descriptions[code] || 'Unknown';
  };

  if (loading || !weather) return null;

  const weatherCode = weather.current.weather_code || 0;

  return (
    <div className="bg-primary/10 border-b border-primary/20 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap py-2 flex items-center gap-8">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Thermometer className="w-4 h-4 text-primary" />
          <span className="font-medium">{weather.current.temperature}°C</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground">
          {getWeatherIcon(weatherCode)}
          <span>{getWeatherDescription(weatherCode)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>High: {weather.daily.max_temp}°</span>
          <span>Low: {weather.daily.min_temp}°</span>
        </div>
        {weather.current.humidity && (
          <div className="text-sm text-muted-foreground">
            Humidity: {weather.current.humidity}%
          </div>
        )}
        {weather.daily.precipitation_probability > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CloudRain className="w-4 h-4" />
            <span>{weather.daily.precipitation_probability}% chance of rain</span>
          </div>
        )}
        {/* Duplicate for seamless loop */}
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Thermometer className="w-4 h-4 text-primary" />
          <span className="font-medium">{weather.current.temperature}°C</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-foreground">
          {getWeatherIcon(weatherCode)}
          <span>{getWeatherDescription(weatherCode)}</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherTicker;
