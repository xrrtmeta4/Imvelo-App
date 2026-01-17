import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, CloudRain, Sun, Thermometer, Wind, Droplets, Loader2, MapPin, Navigation } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, LocationData } from '@/hooks/useLocation';
import { format, addDays } from 'date-fns';

// Cache weather data in memory
const weatherCache: { data: any; timestamp: number; coords: string } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const Weather = () => {
  const { user } = useAuth();
  const { getLocation } = useLocation();
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locationInfo, setLocationInfo] = useState<{ name: string; source: string }>({ name: 'Detecting location...', source: '' });

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    
    // Check memory cache first
    if (weatherCache && weatherCache.coords === cacheKey && Date.now() - weatherCache.timestamp < CACHE_DURATION) {
      setWeather(weatherCache.data);
      setLoading(false);
      return;
    }

    // Check localStorage cache
    const cachedData = localStorage.getItem('imvelo_weather_cache');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed.coords === cacheKey && Date.now() - parsed.timestamp < CACHE_DURATION) {
          setWeather(parsed.data);
          setLoading(false);
          return;
        }
      } catch {
        // Invalid cache, continue to fetch
      }
    }

    const { data, error } = await supabase.functions.invoke('get-weather', {
      body: { latitude: lat, longitude: lon, user_id: user?.id }
    });
    
    if (!error && data) {
      setWeather(data);
      // Cache the result
      const cacheEntry = { data, timestamp: Date.now(), coords: cacheKey };
      localStorage.setItem('imvelo_weather_cache', JSON.stringify(cacheEntry));
    }
    setLoading(false);
  }, [user?.id]);

  const getWeatherData = useCallback(async () => {
    try {
      // Prefer GPS on this page for the most accurate city/country
      const locationData = await getLocation({ preferGps: true });
      
      // Set location display name based on available data
      let locationName = 'Unknown Location';
      if (locationData.city && locationData.country_name) {
        locationName = `${locationData.city}, ${locationData.country_name}`;
      } else if (locationData.city) {
        locationName = locationData.city;
      } else if (locationData.source === 'gps') {
        locationName = 'GPS Location';
      }
      
      setLocationInfo({ 
        name: locationName, 
        source: locationData.source 
      });
      
      await fetchWeather(locationData.latitude, locationData.longitude);
    } catch {
      // Fallback to default location on error
      const defaultLat = -26.3054;
      const defaultLon = 31.1367;
      await fetchWeather(defaultLat, defaultLon);
      setLocationInfo({ name: 'Mbabane, Eswatini', source: 'fallback' });
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
    if (index === 0) return 'Today';
    if (index === 1) return 'Tomorrow';
    return format(addDays(new Date(), index), 'EEEE');
  };

  const getLocationIcon = () => {
    if (locationInfo.source === 'gps') {
      return <Navigation className="w-4 h-4" />;
    }
    return <MapPin className="w-4 h-4" />;
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
          <h1 className="text-3xl font-bold mb-2">Weather</h1>
          <div className="flex items-center justify-center gap-2 text-primary-foreground/90">
            {getLocationIcon()}
            <span>{locationInfo.name}</span>
          </div>
          {locationInfo.source === 'gps' && (
            <p className="text-xs text-primary-foreground/70 mt-1">Using GPS for precise location</p>
          )}
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        {weather ? (
          <>
            {/* Current Weather */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Today</p>
                    <p className="text-5xl font-bold text-foreground">{weather.current.temperature}°C</p>
                    <p className="text-lg text-muted-foreground mt-2">{weather.current.weather_description}</p>
                    <p className="text-sm text-muted-foreground">Feels like {weather.current.feels_like}°C</p>
                  </div>
                  <div className="text-right">
                    {getWeatherIcon(weather.current.weather_description, 'w-20 h-20')}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                  <div className="text-center">
                    <Thermometer className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                    <p className="text-xs text-muted-foreground">High/Low</p>
                    <p className="text-sm font-medium">{weather.daily.max_temp}° / {weather.daily.min_temp}°</p>
                  </div>
                  <div className="text-center">
                    <Droplets className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-xs text-muted-foreground">Humidity</p>
                    <p className="text-sm font-medium">{weather.current.humidity}%</p>
                  </div>
                  <div className="text-center">
                    <Wind className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                    <p className="text-xs text-muted-foreground">Wind</p>
                    <p className="text-sm font-medium">{weather.current.wind_speed} km/h</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 7-Day Forecast */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="w-5 h-5" />
                  7 Days Forecast
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

            {/* Weather Tips */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">Farming Tips for Today</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {weather.current.temperature > 30 && (
                  <p className="text-orange-600">🌡️ High temperature - Water your crops early morning or late evening to reduce evaporation.</p>
                )}
                {weather.daily.precipitation_probability > 50 && (
                  <p className="text-blue-600">🌧️ High chance of rain - Avoid spraying pesticides, as they may wash away.</p>
                )}
                {weather.current.wind_speed > 20 && (
                  <p className="text-gray-600">💨 Windy conditions - Secure lightweight structures and avoid burning activities.</p>
                )}
                {weather.current.humidity > 80 && (
                  <p className="text-teal-600">💧 High humidity - Monitor crops for fungal diseases.</p>
                )}
                {weather.daily.precipitation_probability < 20 && weather.current.temperature < 30 && (
                  <p className="text-green-600">🌱 Good conditions for planting and outdoor farming activities.</p>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Unable to load weather data. Please try again later.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Weather;
