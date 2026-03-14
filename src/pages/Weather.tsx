import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cloud, CloudRain, Sun, Thermometer, Wind, Droplets, Loader2, Crown, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useLanguage } from '@/hooks/useLanguage';
import { format, addDays } from 'date-fns';

const weatherCache: { data: any; timestamp: number; coords: string } | null = null;
const CACHE_DURATION = 5 * 60 * 1000;

const Weather = () => {
  const { user } = useAuth();
  const { hasFeature, openUpgrade, currentPlan } = useUsageLimits();
  const { getLocation } = useLocation();
  const { t } = useLanguage();
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState<string>('');

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    
    if (weatherCache && weatherCache.coords === cacheKey && Date.now() - weatherCache.timestamp < CACHE_DURATION) {
      setWeather(weatherCache.data);
      setLoading(false);
      return;
    }

    const cachedData = localStorage.getItem('imvelo_weather_cache');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.coords === cacheKey && Date.now() - parsed.timestamp < CACHE_DURATION) {
          setWeather(parsed.data);
          setLoading(false);
          return;
        }
      } catch { }
    }

    const { data, error } = await supabase.functions.invoke('get-weather', {
      body: { latitude: lat, longitude: lon, user_id: user?.id }
    });
    
    if (!error && data) {
      setWeather(data);
      const cacheEntry = { data, timestamp: Date.now(), coords: cacheKey };
      localStorage.setItem('imvelo_weather_cache', JSON.stringify(cacheEntry));
    }
    setLoading(false);
  }, [user?.id]);

  const getWeatherData = useCallback(async () => {
    try {
      const locationData = await getLocation({ preferGps: true });
      setLocationName(locationData.city ? `${locationData.city}${locationData.country_name ? ', ' + locationData.country_name : ''}` : '');
      await fetchWeather(locationData.latitude, locationData.longitude);
    } catch {
      setLocationName('Mbabane, Eswatini');
      await fetchWeather(-26.3054, 31.1367);
    }
  }, [fetchWeather, getLocation]);

  useEffect(() => {
    getWeatherData();
  }, [getWeatherData]);

  const getWeatherIcon = (description: string, size = 'w-8 h-8') => {
    if (description?.includes('mvula') || description?.includes('Imvula') || description?.includes('Sikhukhula')) {
      return <CloudRain className={`${size} text-blue-500`} />;
    }
    if (description?.includes('mafu') || description?.includes('Limafu') || description?.includes('nkungu')) {
      return <Cloud className={`${size} text-gray-500`} />;
    }
    return <Sun className={`${size} text-yellow-500`} />;
  };

  const getDayName = (index: number) => {
    if (index === 0) return t('today');
    if (index === 1) return t('tomorrow');
    return format(addDays(new Date(), index), 'EEEE');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-8 px-4">
        <div className="max-w-screen-sm mx-auto text-center">
          <Cloud className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">{t('weather')}</h1>
          {locationName && <p className="text-sm opacity-80 mt-1">📍 {locationName}</p>}
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        {weather ? (
          <>
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('today')}</p>
                    <p className="text-5xl font-bold text-foreground">{weather.current.temperature}°C</p>
                    <p className="text-lg text-muted-foreground mt-2">{weather.current.weather_description}</p>
                    <p className="text-sm text-muted-foreground">{t('feelsLike')} {weather.current.feels_like}°C</p>
                  </div>
                  <div className="text-right">
                    {getWeatherIcon(weather.current.weather_description, 'w-20 h-20')}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                  <div className="text-center">
                    <Thermometer className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                    <p className="text-xs text-muted-foreground">{t('highLow')}</p>
                    <p className="text-sm font-medium">{weather.daily.max_temp}° / {weather.daily.min_temp}°</p>
                  </div>
                  <div className="text-center">
                    <Droplets className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-xs text-muted-foreground">{t('humidity')}</p>
                    <p className="text-sm font-medium">{weather.current.humidity}%</p>
                  </div>
                  <div className="text-center">
                    <Wind className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                    <p className="text-xs text-muted-foreground">{t('wind')}</p>
                    <p className="text-sm font-medium">{weather.current.wind_speed} km/h</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {hasFeature('forecast') ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="w-5 h-5" />
                    {t('sevenDayForecast')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {weather.forecast?.map((day: any, index: number) => (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between py-3 ${
                        index !== weather.forecast.length - 1 ? 'border-b border-border' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-20">
                          <p className={`text-sm ${index === 0 ? 'font-bold' : ''}`}>
                            {getDayName(index)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(addDays(new Date(), index), 'MMM d')}
                          </p>
                        </div>
                        {day.precipitation_probability > 30 ? (
                          <CloudRain className="w-6 h-6 text-blue-500" />
                        ) : (
                          <Sun className="w-6 h-6 text-yellow-500" />
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {day.precipitation_probability > 0 && (
                          <div className="flex items-center gap-1 text-blue-500">
                            <Droplets className="w-4 h-4" />
                            <span className="text-sm">{day.precipitation_probability}%</span>
                          </div>
                        )}
                        <div className="text-right">
                          <span className="font-medium">{day.max_temp}°</span>
                          <span className="text-muted-foreground text-sm ml-1">/ {day.min_temp}°</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-muted-foreground" />
                    {t('sevenDayForecast')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4 py-6">
                  <p className="text-sm text-muted-foreground">
                    {t('upgradeForForecast')}
                  </p>
                  <Button onClick={() => openUpgrade('premium')} className="gap-2">
                    <Crown className="w-4 h-4" />
                    Upgrade to Premium - $6.00/mo
                  </Button>
                </CardContent>
              </Card>
            )}

            {hasFeature('farmingTips') && (
              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">{t('farmingTipsToday')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {weather.current.temperature > 30 && (
                    <p className="text-orange-600">🌡️ {t('tipHighTemp')}</p>
                  )}
                  {weather.daily.precipitation_probability > 50 && (
                    <p className="text-blue-600">🌧️ {t('tipRain')}</p>
                  )}
                  {weather.current.wind_speed > 20 && (
                    <p className="text-gray-600">💨 {t('tipWind')}</p>
                  )}
                  {weather.current.humidity > 80 && (
                    <p className="text-teal-600">💧 {t('tipHumidity')}</p>
                  )}
                  {weather.daily.precipitation_probability < 20 && weather.current.temperature < 30 && (
                    <p className="text-green-600">🌱 {t('tipGoodConditions')}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t('unableLoadWeather')}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Weather;
