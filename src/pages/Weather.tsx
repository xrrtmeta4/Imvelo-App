import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, CloudRain, Sun, Thermometer, Wind, Droplets, Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { format, addDays } from 'date-fns';

const Weather = () => {
  const { user } = useAuth();
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<string>('Eswatini');

  useEffect(() => {
    getWeather();
  }, []);

  const getWeather = async () => {
    try {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await fetchWeather(latitude, longitude);
            // Try to get location name
            try {
              const geoResponse = await fetch(
                `https://geocode.maps.co/reverse?lat=${latitude}&lon=${longitude}`
              );
              const geoData = await geoResponse.json();
              if (geoData.address) {
                setLocation(geoData.address.city || geoData.address.town || geoData.address.country || 'Eswatini');
              }
            } catch {
              setLocation('Your Location');
            }
          },
          async () => {
            await fetchWeather(-26.3054, 31.1367);
            setLocation('Mbabane, Eswatini');
          }
        );
      } else {
        await fetchWeather(-26.3054, 31.1367);
        setLocation('Mbabane, Eswatini');
      }
    } catch {
      setLoading(false);
    }
  };

  const fetchWeather = async (lat: number, lon: number) => {
    const { data, error } = await supabase.functions.invoke('get-weather', {
      body: { latitude: lat, longitude: lon, user_id: user?.id }
    });
    if (!error && data) {
      setWeather(data);
    }
    setLoading(false);
  };

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
    if (index === 0) return 'Namuhla';
    if (index === 1) return 'Kusasa';
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
          <h1 className="text-3xl font-bold mb-2">Litulu</h1>
          <div className="flex items-center justify-center gap-2 text-primary-foreground/90">
            <MapPin className="w-4 h-4" />
            <span>{location}</span>
          </div>
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
                    <p className="text-sm text-muted-foreground mb-1">Namuhla</p>
                    <p className="text-5xl font-bold text-foreground">{weather.current.temperature}°C</p>
                    <p className="text-lg text-muted-foreground mt-2">{weather.current.weather_description}</p>
                    <p className="text-sm text-muted-foreground">Kutiva njenge {weather.current.feels_like}°C</p>
                  </div>
                  <div className="text-right">
                    {getWeatherIcon(weather.current.weather_description, 'w-20 h-20')}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
                  <div className="text-center">
                    <Thermometer className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                    <p className="text-xs text-muted-foreground">Liphakeme/Liphansi</p>
                    <p className="text-sm font-medium">{weather.daily.max_temp}° / {weather.daily.min_temp}°</p>
                  </div>
                  <div className="text-center">
                    <Droplets className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                    <p className="text-xs text-muted-foreground">Umswakama</p>
                    <p className="text-sm font-medium">{weather.current.humidity}%</p>
                  </div>
                  <div className="text-center">
                    <Wind className="w-5 h-5 mx-auto mb-1 text-gray-500" />
                    <p className="text-xs text-muted-foreground">Umoya</p>
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
