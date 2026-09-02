import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle, CloudRain, ThermometerSun, Wind, Droplets, ShieldCheck, RefreshCw,
  Calendar, MapPin, Loader2, Zap, Bug, Snowflake, Activity,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadialBarChart, RadialBar,
  AreaChart, Legend,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { toast } from 'sonner';

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-destructive/15 border-destructive/30 text-destructive',
  moderate: 'bg-orange-500/10 border-orange-500/30 text-orange-600',
};

const DISASTER_ICONS: Record<string, JSX.Element> = {
  flood_risk: <CloudRain className="w-5 h-5" />,
  heatwave: <ThermometerSun className="w-5 h-5" />,
  drought: <Droplets className="w-5 h-5" />,
  frost: <Snowflake className="w-5 h-5" />,
  wind_storm: <Wind className="w-5 h-5" />,
  cold_outbreak: <Snowflake className="w-5 h-5" />,
  storm: <Zap className="w-5 h-5" />,
  disease_pressure: <Bug className="w-5 h-5" />,
};

const HAZARD_ORDER = [
  'flood_risk', 'storm', 'heatwave', 'drought', 'frost', 'cold_outbreak', 'wind_storm', 'disease_pressure',
];

const HAZARD_LABELS: Record<string, string> = {
  flood_risk: 'Flood', storm: 'Storm', heatwave: 'Heat', drought: 'Drought',
  frost: 'Frost', cold_outbreak: 'Cold', wind_storm: 'Wind', disease_pressure: 'Disease',
};

interface Prediction {
  key: string;
  label: string;
  severity: string;
  confidence: number;
  when: string;
  detail: string;
}

const riskTone = (v: number) => {
  if (v >= 75) return 'hsl(var(--destructive))';
  if (v >= 50) return 'hsl(25 95% 53%)';
  if (v >= 25) return 'hsl(45 93% 47%)';
  return 'hsl(142 55% 45%)';
};

const riskWord = (v: number) => (v >= 75 ? 'Severe' : v >= 50 ? 'Elevated' : v >= 25 ? 'Watch' : 'Calm');

const shortDay = (d: string) => {
  try { return new Date(d).toLocaleDateString(undefined, { weekday: 'short' }); } catch { return d; }
};

const DisasterWatch = () => {
  const { user } = useAuth();
  const { getLocation } = useLocation();
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [imminent, setImminent] = useState<any[]>([]);
  const [locationName, setLocationName] = useState<string>('');
  const [confidence, setConfidence] = useState<string>('');
  const [days, setDays] = useState<any[]>([]);
  const [riskSeries, setRiskSeries] = useState<any[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [riskIndex, setRiskIndex] = useState(0);
  const [activeHazard, setActiveHazard] = useState<string | null>(null);

  const fetchOutlook = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const loc = await getLocation({ preferGps: true });
      setLocationName(loc.city ? `${loc.city}, ${loc.country_code}` : `${loc.latitude}, ${loc.longitude}`);

      const { data, error } = await supabase.functions.invoke('predict-early-warning', {
        body: { latitude: loc.latitude, longitude: loc.longitude, user_id: user.id },
      });

      if (error) throw error;
      setPredictions(data?.predictions || []);
      setImminent(data?.imminent || []);
      setDays(data?.days || []);
      setRiskSeries((data?.riskSeries || []).map((r: any) => ({ ...r, day: shortDay(r.date) })));
      setRadarData(data?.radar || []);
      setRiskIndex(data?.riskIndex || 0);
      const preds: Prediction[] = data?.predictions || [];
      const avgConf = preds.length
        ? Math.round(preds.reduce((a, p) => a + p.confidence, 0) / preds.length)
        : 0;
      setConfidence(`${avgConf}% avg model confidence`);
    } catch (e: any) {
      console.error('DisasterWatch error:', e);
      const status = e?.context?.status;
      const msg = e?.context?.body || e?.message || String(e);
      if (status === 404 || /not found/i.test(msg)) {
        toast.error('Outlook service is updating — try again in a moment.');
      } else {
        toast.error('Could not load the hazard outlook. Showing last cached data.');
      }
    } finally {
      setLoading(false);
    }
  }, [user, getLocation]);

  useEffect(() => { fetchOutlook(); }, [fetchOutlook]);

  const urgent = imminent.filter((m) => m.severity === 'high');

  const gauge = useMemo(
    () => [{ name: 'risk', value: riskIndex, fill: riskTone(riskIndex) }],
    [riskIndex],
  );

  const hazardKeys = useMemo(
    () => HAZARD_ORDER.filter((k) => riskSeries.some((r) => (r[k] || 0) > 0)),
    [riskSeries],
  );

  const selected = activeHazard && riskSeries.length ? activeHazard : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white py-6 px-4">
        <div className="max-w-screen-sm mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Disaster Watch</h1>
                <p className="text-sm opacity-85">7-day multi-hazard intelligence</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchOutlook} disabled={loading} className="text-white hover:bg-white/10">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-white/70">
            <MapPin className="w-3 h-3" />
            <span>{locationName || 'locating…'}</span>
            <span className="mx-1">·</span>
            <span>{confidence}</span>
          </div>
        </div>
      </div>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-5">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Running hazard models…
          </div>
        )}

        {!!urgent.length && (
          <Card className="border-destructive bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                IMMEDIATE ACTION REQUIRED
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {urgent.map((m) => (
                <div key={m.key} className="flex items-start gap-3">
                  {DISASTER_ICONS[m.key]}
                  <p className="font-medium">{m.label}: {m.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Composite risk gauge + hazard radar */}
        {!!riskSeries.length && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-5 h-5 text-slate-600" />
                Composite Risk Index
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <div className="relative h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="68%" outerRadius="100%" data={gauge}
                    startAngle={220} endAngle={-40}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={12} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold" style={{ color: riskTone(riskIndex) }}>{riskIndex}</span>
                  <span className="text-xs text-muted-foreground">{riskWord(riskIndex)}</span>
                </div>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} outerRadius="75%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="hazard" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
                    <Tooltip formatter={(v: any) => [`${v}/100`, 'Peak risk']} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Daily hazard heatmap */}
        {!!riskSeries.length && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Hazard Heatmap</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <div className="min-w-[320px]">
                <div className="grid" style={{ gridTemplateColumns: `72px repeat(${riskSeries.length}, minmax(0,1fr))` }}>
                  <div />
                  {riskSeries.map((r) => (
                    <div key={r.date} className="text-[10px] text-center text-muted-foreground pb-1">{r.day}</div>
                  ))}
                  {(hazardKeys.length ? hazardKeys : HAZARD_ORDER).map((k) => (
                    <>
                      <button
                        key={`${k}-label`}
                        onClick={() => setActiveHazard(activeHazard === k ? null : k)}
                        className={`text-[11px] text-left pr-2 py-1 truncate ${activeHazard === k ? 'font-semibold text-primary' : 'text-foreground'}`}
                      >
                        {HAZARD_LABELS[k]}
                      </button>
                      {riskSeries.map((r) => {
                        const v = r[k] || 0;
                        return (
                          <div key={`${k}-${r.date}`} className="p-0.5">
                            <div
                              className="h-6 rounded-sm flex items-center justify-center text-[9px] font-medium text-white/90"
                              style={{ backgroundColor: riskTone(v), opacity: 0.25 + (v / 100) * 0.75 }}
                              title={`${HAZARD_LABELS[k]} · ${r.day}: ${v}/100`}
                            >
                              {v >= 25 ? v : ''}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">Tap a hazard to chart its trend below.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selected hazard trend */}
        {selected && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                {DISASTER_ICONS[selected]}
                {HAZARD_LABELS[selected]} risk trend
              </CardTitle>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={riskSeries}>
                  <defs>
                    <linearGradient id="hz" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={riskTone(riskIndex)} stopOpacity={0.7} />
                      <stop offset="95%" stopColor={riskTone(riskIndex)} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} />
                  <Tooltip formatter={(v: any) => [`${v}/100`, 'Risk']} />
                  <Area type="monotone" dataKey={selected} stroke={riskTone(riskIndex)} fill="url(#hz)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Temperature + rainfall drivers */}
        {!!riskSeries.length && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Forecast Drivers</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={riskSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="l" tick={{ fontSize: 10 }} width={28} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} width={28} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar yAxisId="r" dataKey="precip" name="Rain (mm)" fill="hsl(210 90% 55%)" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="l" type="monotone" dataKey="tmax" name="Max °C" stroke="hsl(12 85% 55%)" strokeWidth={2} dot={false} />
                  <Line yAxisId="l" type="monotone" dataKey="tmin" name="Min °C" stroke="hsl(200 70% 45%)" strokeWidth={2} dot={false} />
                  <Line yAxisId="l" type="monotone" dataKey="wind" name="Wind km/h" stroke="hsl(270 50% 55%)" strokeDasharray="4 3" strokeWidth={1.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {!!imminent.length && (
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <Calendar className="w-5 h-5" />
                Within 48 hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {imminent.map((m) => (
                <div key={m.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {DISASTER_ICONS[m.key]}
                    <span className="text-sm">{m.label}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${SEVERITY_COLORS[m.severity] || ''}`}>
                    {m.severity}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-600" />
              3–7 Day Outlook
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading model…
              </div>
            ) : predictions.length === 0 ? (
              <p className="text-sm text-green-700 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> No hazards forecast for the next 7 days.
              </p>
            ) : (
              <div className="space-y-3">
                {predictions.map((p) => (
                  <div key={p.key} className={`p-3 rounded-lg border ${SEVERITY_COLORS[p.severity] || 'border-border'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {DISASTER_ICONS[p.key]}
                        <span className="font-medium">{p.label}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[p.severity] || 'bg-muted'}`}>
                        {p.severity} · {p.confidence}%
                      </span>
                    </div>
                    <p className="text-sm mt-1">{p.when} — {p.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {!!days.length && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CloudRain className="w-5 h-5 text-slate-600" />
                7-Day Forecast Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center">
                {days.map((d) => (
                  <div key={d.date} className="rounded-md border border-border p-1.5">
                    <p className="text-[10px] text-muted-foreground">{shortDay(d.date)}</p>
                    <p className="text-[11px] font-semibold">{Math.round(d.tmax)}°</p>
                    <p className="text-[10px] text-muted-foreground">{Math.round(d.tmin)}°</p>
                    <p className="text-[10px] text-blue-600 mt-0.5">{Math.round(d.precip)}mm</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Eight hazard models (flood, thunderstorm/hail, heatwave, drought, frost, cold outbreak, strong wind and crop
              disease pressure) score every forecast day 0–100 using <strong>Meteoblue</strong> data, with Open-Meteo and
              Copernicus ERA5 as fallbacks. The composite index is the worst daily hazard score averaged across the window;
              imminent alerts (≤48h) trigger in-app toasts and push notifications.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DisasterWatch;
