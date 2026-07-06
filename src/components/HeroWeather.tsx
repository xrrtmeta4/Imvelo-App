import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocation } from '@/hooks/useLocation';
import { MapPin, Droplets, Wind, Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeroWeatherData {
  temperature: number;
  description: string;
  emoji: string;
  humidity: number;
  wind_speed: number;
  today: { max: number; min: number };
  precip_probability: number;
}

const CACHE_KEY = 'imvelo_hero_weather_v1';
const CACHE_MS = 10 * 60 * 1000;

const HeroWeather = () => {
  const { getLocation } = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<HeroWeatherData | null>(null);
  const [loc, setLoc] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const p = JSON.parse(cached);
            if (Date.now() - p.ts < CACHE_MS) {
              if (!cancelled) { setData(p.data); setLoc(p.loc || ''); setLoading(false); }
              return;
            }
          } catch {}
        }
        const l = await getLocation({ preferGps: true });
        const locName = l.city && l.country_name ? `${l.city}, ${l.country_name}` : '📍 Your location';
        if (!cancelled) setLoc(locName);
        const { data: w, error } = await supabase.functions.invoke('hero-weather', {
          body: { latitude: l.latitude, longitude: l.longitude },
        });
        if (error) throw error;
        if (w?.error) throw new Error(w.error);
        if (!cancelled) {
          setData(w);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: w, loc: locName }));
        }
      } catch (e) {
        console.error('HeroWeather error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [getLocation]);

  if (loading) {
    return (
      <div className="mt-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4 flex items-center gap-2 text-white/90">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Fetching your local weather…</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <button
      type="button"
      onClick={() => navigate('/weather')}
      aria-label="Open 7-day weather forecast"
      className="mt-4 w-full text-left rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4 text-white shadow-xl hover:bg-white/15 active:scale-[0.99] transition"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-4xl leading-none drop-shadow" aria-hidden>{data.emoji}</div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums">{data.temperature}°</span>
              <span className="text-xs text-white/80 tabular-nums">
                H {data.today.max}° · L {data.today.min}°
              </span>
            </div>
            <p className="text-xs text-white/85 truncate">{data.description}</p>
            {loc && (
              <p className="text-[10px] text-white/70 flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="w-2.5 h-2.5" />
                {loc}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-[11px] text-white/85 shrink-0">
          <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> {data.humidity}%</span>
          <span className="flex items-center gap-1"><Wind className="w-3 h-3" /> {data.wind_speed} km/h</span>
          {data.precip_probability > 0 && (
            <span className="text-[10px] text-white/70">Rain {data.precip_probability}%</span>
          )}
          <span className="flex items-center gap-0.5 text-[10px] text-white/80 mt-0.5">7-day <ChevronRight className="w-3 h-3" /></span>
        </div>
      </div>
    </button>
  );
};

export default HeroWeather;