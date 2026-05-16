import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, CloudRain, Sun, Loader2, MapPin, Droplets, Wind, Thermometer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { useLanguage } from '@/hooks/useLanguage';
import { format, addDays } from 'date-fns';

const CACHE_DURATION = 5 * 60 * 1000;

const WeatherCard = () => {
  const { user } = useAuth();
  const { getLocation } = useLocation();
  const { t } = useLanguage();
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState<string>('');

  const getWeatherIcon = (description: string, size = 'w-6 h-6') => {
    const lower = description?.toLowerCase() || '';
    if (lower.includes('rain') || lower.includes('mvula') || lower.includes('imvula') || lower.includes('drizzle')) {
      return <CloudRain className={`${size} text-blue-500`} />;
    }
    if (lower.includes('cloud') || lower.includes('mafu') || lower.includes('limafu') || lower.includes('overcast')) {
      return <Cloud className={`${size} text-muted-foreground`} />;
    }
    return <Sun className={`${size} text-yellow-500`} />;
  };

  const getDayLabel = (index: number) => {
    if (index === 0) return t('today');
    if (index === 1) return t('tomorrow');
    return format(addDays(new Date(), index), 'EEE');
  };

  const fetchWeather = useCallback(async () => {
    try {
      const cached = localStorage.getItem('imvelo_weather_card_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_DURATION) {
            setWeather(parsed.data);
            setLocationName(parsed.locationName || '');
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('Failed to parse cached weather:', e);
        }
      }

      const locationData = await getLocation({ preferGps: true });

      if (locationData.city && locationData.country_name) {
        setLocationName(`${locationData.city}, ${locationData.country_name}`);
      } else if (locationData.source === 'gps') {
        setLocationName('📍 GPS Location');
      }

      const { data, error } = await supabase.functions.invoke('get-weather', {
        body: { latitude: locationData.latitude, longitude: locationData.longitude, user_id: user?.id }
      });

      if (error) throw error;
      
      setWeather(data);

      const locName = locationData.city && locationData.country_name 
        ? `${locationData.city}, ${locationData.country_name}` 
        : '📍 GPS Location';
      localStorage.setItem('imvelo_weather_card_cache', JSON.stringify({
        data, timestamp: Date.now(), locationName: locName
      }));
    } catch (error) {
      console.error('Weather error:', error);
    } finally {
      setLoading(false);
    }
  }, [getLocation, user?.id]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!weather) return null;

  return (
    <Card className="border-border overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5 pb-4">
        <CardTitle className="flex items-center justify-between text-foreground">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            {t('weatherForecast')}
          </div>
          {getWeatherIcon(weather.current.weather_description, 'w-10 h-10')}
        </CardTitle>
        {locationName && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {locationName}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold text-foreground">{weather.current.temperature}°C</p>
            <p className="text-sm text-muted-foreground mt-1">{weather.current.weather_description}</p>
            {weather.current.feels_like && (
              <p className="text-xs text-muted-foreground">{t('feelsLike')} {weather.current.feels_like}°</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-orange-500" />
              <span>{weather.daily.max_temp}°/{weather.daily.min_temp}°</span>
            </div>
            <div className="flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-blue-500" />
              <span>{weather.current.humidity}%</span>
            </div>
            <div className="flex items-center gap-1">
              <Wind className="w-3.5 h-3.5" />
              <span>{weather.current.wind_speed} km/h</span>
            </div>
            {weather.daily.precipitation_probability > 0 && (
              <div className="flex items-center gap-1">
                <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                <span>{weather.daily.precipitation_probability}%</span>
              </div>
            )}
          </div>
        </div>

        {weather.forecast && weather.forecast.length > 0 && (
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t('sevenDayForecast')}</p>
            <div className="space-y-2">
              {weather.forecast.map((day: any, index: number) => (
                <div
                  key={index}
                  className={`flex items-center justify-between py-2 ${
                    index !== weather.forecast.length - 1 ? 'border-b border-border/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 w-20">
                    <p className={`text-sm ${index === 0 ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                      {getDayLabel(index)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {day.precipitation_probability > 30
                      ? <CloudRain className="w-5 h-5 text-blue-500" />
                      : <Sun className="w-5 h-5 text-yellow-500" />
                    }
                    {day.precipitation_probability > 0 && (
                      <span className="text-xs text-blue-500 w-8 text-right">{day.precipitation_probability}%</span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-medium text-foreground">{day.max_temp}°</span>
                    <span className="text-xs text-muted-foreground ml-1">/ {day.min_temp}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeatherCard;
