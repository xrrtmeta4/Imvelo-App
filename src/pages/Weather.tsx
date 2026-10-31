import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cloud, CloudRain, Sun, Thermometer, Wind, Droplets, Loader2, Sunrise, Sunset, MapPin, Sprout, StickyNote } from 'lucide-react';
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
  const { hasFeature } = useUsageLimits();
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

  const fmtTime = (v?: string | null) => {
    if (!v) return '--:--';
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v).slice(-5) : format(d, 'HH:mm');
  };

  const tips: string[] = [];
  if (weather) {
    if (weather.current.temperature > 30) tips.push(t('tipHighTemp'));
    if (weather.daily.precipitation_probability > 50) tips.push(t('tipRain'));
    if (weather.current.wind_speed > 20) tips.push(t('tipWind'));
    if (weather.current.humidity > 80) tips.push(t('tipHumidity'));
    if (!tips.length) tips.push(t('tipGoodConditions'));
  }

  const notes: string[] = [];
  if (weather) {
    const rainy = weather.forecast?.findIndex((d: any) => d.precipitation_probability > 60);
    if (rainy > 0) notes.push(`Rain likely ${getDayName(rainy).toLowerCase()} — plan spraying and harvesting before then.`);
    if ((weather.daily.uv_index ?? 0) >= 8) notes.push('Very high UV today — protect workers and young seedlings at midday.');
    if (weather.daily.min_temp <= 3) notes.push('Frost risk overnight — cover sensitive crops.');
    if (!notes.length) notes.push('No severe weather expected. You will get an email and push alert if that changes.');
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-b-3xl px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-6">
        <div className="max-w-screen-sm mx-auto">
          <h1 className="text-2xl font-bold">{t('weather')}</h1>
          {locationName && (
            <p className="text-sm opacity-90 mt-1 flex items-center gap-1"><MapPin className="w-4 h-4" />{locationName}</p>
          )}
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 -mt-2 py-4 space-y-4">
        {weather ? (
          <>
            <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-5 shadow-lg">
              <p className="text-sm opacity-90">Today's Weather · {format(new Date(), 'EEE, MMM d')}</p>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <p className="text-6xl font-bold leading-none">{weather.current.temperature}°</p>
                  <p className="mt-2 font-medium">{weather.current.weather_description}</p>
                  <p className="text-sm opacity-80">{t('feelsLike')} {weather.current.feels_like}°C</p>
                </div>
                <div className="bg-primary-foreground/15 rounded-2xl p-3">
                  {getWeatherIcon(weather.current.weather_description, 'w-16 h-16')}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-5">
                {[
                  { icon: Thermometer, label: t('highLow'), value: `${weather.daily.max_temp}°/${weather.daily.min_temp}°` },
                  { icon: Droplets, label: t('humidity'), value: `${weather.current.humidity}%` },
                  { icon: Wind, label: t('wind'), value: `${weather.current.wind_speed} km/h` },
                  { icon: CloudRain, label: 'Rain', value: `${weather.daily.precipitation_probability ?? 0}%` },
                ].map(({ icon: I, label, value }) => (
                  <div key={label} className="bg-primary-foreground/15 backdrop-blur rounded-2xl py-2 text-center">
                    <I className="w-4 h-4 mx-auto mb-1" />
                    <p className="text-[10px] opacity-80">{label}</p>
                    <p className="text-xs font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {hasFeature('farmingTips') && (
              <Card className="rounded-3xl border-primary/20 bg-accent/30">
                <CardContent className="p-4 flex gap-3">
                  <div className="bg-primary/15 rounded-2xl p-2 h-fit"><Sprout className="w-6 h-6 text-primary" /></div>
                  <div>
                    <p className="font-semibold text-foreground">Farming Tip</p>
                    <p className="text-sm text-muted-foreground mt-1">{tips[0]}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Card className="rounded-3xl">
                <CardContent className="p-4 flex items-center gap-3">
                  <Sunrise className="w-8 h-8 text-primary" />
                  <div><p className="text-xs text-muted-foreground">Sunrise</p><p className="text-lg font-bold">{fmtTime(weather.daily.sunrise)}</p></div>
                </CardContent>
              </Card>
              <Card className="rounded-3xl">
                <CardContent className="p-4 flex items-center gap-3">
                  <Sunset className="w-8 h-8 text-primary" />
                  <div><p className="text-xs text-muted-foreground">Sunset</p><p className="text-lg font-bold">{fmtTime(weather.daily.sunset)}</p></div>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-3xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Cloud className="w-5 h-5 text-primary" />{t('sevenDayForecast')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 overflow-x-auto snap-x pb-1">
                  {weather.forecast?.map((day: any, index: number) => (
                    <div key={index} className={`snap-start shrink-0 w-20 rounded-2xl p-3 text-center ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <p className="text-xs font-semibold truncate">{index < 2 ? getDayName(index) : format(addDays(new Date(), index), 'EEE')}</p>
                      <div className="my-2 flex justify-center">
                        {day.precipitation_probability > 30 ? <CloudRain className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
                      </div>
                      <p className="text-sm font-bold">{day.max_temp}°</p>
                      <p className="text-xs opacity-70">{day.min_temp}°</p>
                      <p className="text-[10px] mt-1 opacity-80">💧{day.precipitation_probability ?? 0}%</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><StickyNote className="w-5 h-5 text-primary" />Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {notes.map((n) => (
                  <p key={n} className="text-sm text-muted-foreground border-l-4 border-primary pl-3">{n}</p>
                ))}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">{t('unableLoadWeather')}</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Weather;
