import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, Thermometer, Droplets, Flame, Sprout, Activity, AlertTriangle,
  RefreshCw, Loader2, Waves, Gauge, Cpu, Radar as RadarIcon, MapPin,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResponsiveContainer, ComposedChart, AreaChart, Area, BarChart, Bar, LineChart, Line,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ReferenceLine, Scatter, ScatterChart,
} from 'recharts';
import {
  ESWATINI_ZONES, Zone, DailyRecord, fetchZoneDaily, annualStats, monthlySeries, rolling,
  theilSenMannKendall, spi, spiCategory, holtWinters, monteCarloEnsemble, gumbelReturnLevels,
  markovWetDry, harmonics, onsetProbability, analogYears, groupByYear, mean, stdev, YearStats,
} from '@/lib/climateEngine';

const ADMIN_EMAIL = 'ncamisoxaba56@gmail.com';

const C = {
  hot: '#ef4444',
  warm: '#f97316',
  amber: '#f59e0b',
  green: '#10b981',
  blue: '#3b82f6',
  cyan: '#06b6d4',
  violet: '#8b5cf6',
  slate: '#64748b',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const tip = { backgroundColor: '#0f172a', border: 'none', borderRadius: 10, fontSize: 12, color: '#fff' };

interface ZoneAnalysis {
  zone: Zone;
  years: YearStats[];
  monthly: ReturnType<typeof monthlySeries>;
  tmaxTrend: ReturnType<typeof theilSenMannKendall>;
  rainTrend: ReturnType<typeof theilSenMannKendall>;
  hotTrend: ReturnType<typeof theilSenMannKendall>;
  spiSeries: { key: string; label: string; spi: number }[];
  forecast: { label: string; rainfall?: number; median?: number; p10?: number; p25?: number; p75?: number; p90?: number; band50?: [number, number]; band80?: [number, number] }[];
  tempForecast: { label: string; tmax?: number; predicted?: number }[];
  returnLevels: ReturnType<typeof gumbelReturnLevels>;
  heatReturn: ReturnType<typeof gumbelReturnLevels>;
  markov: ReturnType<typeof markovWetDry>;
  harmonic: ReturnType<typeof harmonics>;
  onset: { label: string; probability: number }[];
  analogs: ReturnType<typeof analogYears>;
  climatology: { month: string; rainfall: number; tmax: number; tmin: number; recent: number }[];
  hazards: { hazard: string; score: number }[];
  volatility: { year: number; cv: number; rainfall: number }[];
  riskIndex: number;
  seasonOutlook: { total: number; lower: number; upper: number; vsNormal: number };
}

function buildAnalysis(zone: Zone, daily: DailyRecord[]): ZoneAnalysis {
  const years = annualStats(daily);
  const monthly = monthlySeries(daily);
  const rainSeries = monthly.map((m) => m.rainfall);

  const tmaxTrend = theilSenMannKendall(years.map((y) => y.meanTmax));
  const rainTrend = theilSenMannKendall(years.map((y) => y.rainfall));
  const hotTrend = theilSenMannKendall(years.map((y) => y.hotDays));

  // SPI-3 on rolling 3-month totals
  const acc3 = rolling(rainSeries, 3);
  const valid = acc3.map((v, i) => ({ v, i })).filter((x) => !Number.isNaN(x.v));
  const spiVals = spi(valid.map((x) => x.v));
  const spiSeries = valid.slice(-180).map((x, k) => {
    const idx = valid.length - Math.min(180, valid.length) + k;
    return {
      key: monthly[x.i].key,
      label: `${MONTHS[monthly[x.i].month - 1]} ${monthly[x.i].year}`,
      spi: Number(spiVals[idx].toFixed(2)),
    };
  });

  // Holt–Winters + Monte-Carlo ensemble on monthly rainfall (12-month horizon)
  const hwRain = holtWinters(rainSeries, 12, 12);
  const rainResid = rainSeries.map((v, i) => v - hwRain.fitted[i]).slice(24);
  const bands = monteCarloEnsemble(hwRain.forecast, rainResid, 900, true);
  const lastMonth = monthly[monthly.length - 1];
  const forecast: ZoneAnalysis['forecast'] = [];
  monthly.slice(-18).forEach((m) => forecast.push({ label: `${MONTHS[m.month - 1]} ${String(m.year).slice(2)}`, rainfall: Math.round(m.rainfall) }));
  bands.forEach((b, i) => {
    const d = new Date(lastMonth.year, lastMonth.month - 1 + i + 1, 1);
    forecast.push({
      label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      median: Math.round(b.median),
      band50: [Math.round(b.p25), Math.round(b.p75)],
      band80: [Math.round(b.p10), Math.round(b.p90)],
      p10: Math.round(b.p10), p25: Math.round(b.p25), p75: Math.round(b.p75), p90: Math.round(b.p90),
    });
  });

  const tmaxMonthly = monthly.map((m) => m.tmax);
  const hwT = holtWinters(tmaxMonthly, 12, 12, 0.25, 0.05, 0.35);
  const tempForecast: ZoneAnalysis['tempForecast'] = [];
  monthly.slice(-24).forEach((m) => tempForecast.push({ label: `${MONTHS[m.month - 1]} ${String(m.year).slice(2)}`, tmax: Number(m.tmax.toFixed(1)) }));
  hwT.forecast.forEach((v, i) => {
    const d = new Date(lastMonth.year, lastMonth.month - 1 + i + 1, 1);
    tempForecast.push({ label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`, predicted: Number(v.toFixed(1)) });
  });

  const returnLevels = gumbelReturnLevels(years.map((y) => y.maxDailyRain));
  const heatReturn = gumbelReturnLevels(years.map((y) => Math.max(...[y.meanTmax + 8, y.meanTmax])).map((v, i) => years[i].hotDays));
  const markov = markovWetDry(daily.filter((d) => {
    const m = Number(d.date.slice(5, 7));
    return m >= 10 || m <= 3; // cropping season
  }));

  // climatology + recent decade shift
  const climatology = MONTHS.map((label, i) => {
    const all = monthly.filter((m) => m.month === i + 1);
    const recent = all.filter((m) => m.year >= new Date().getFullYear() - 10);
    return {
      month: label,
      rainfall: Math.round(mean(all.map((m) => m.rainfall))),
      recent: Math.round(mean(recent.map((m) => m.rainfall))),
      tmax: Number(mean(all.map((m) => m.tmax)).toFixed(1)),
      tmin: Number(mean(all.map((m) => m.tmin)).toFixed(1)),
    };
  });
  const harmonic = harmonics(climatology.map((c) => c.rainfall));
  const onset = onsetProbability(groupByYear(daily));

  // analog years on standardized monthly rainfall anomalies of the last 6 months
  const monthNorm = new Map<number, { m: number; s: number }>();
  MONTHS.forEach((_, i) => {
    const vals = monthly.filter((x) => x.month === i + 1).map((x) => x.rainfall);
    monthNorm.set(i + 1, { m: mean(vals), s: stdev(vals) || 1 });
  });
  const z = (p: { month: number; rainfall: number }) => {
    const n = monthNorm.get(p.month)!;
    return (p.rainfall - n.m) / n.s;
  };
  const target = monthly.slice(-6).map(z);
  const library = years.slice(0, -1).map((y) => {
    const yearMonths = monthly.filter((m) => m.year === y.year).slice(-6);
    return { year: y.year, vector: yearMonths.map(z), rainfall: Math.round(y.rainfall), meanTmax: Number(y.meanTmax.toFixed(1)) };
  }).filter((y) => y.vector.length === 6);
  const analogs = analogYears(target, library);

  // rainfall volatility (10-year rolling coefficient of variation)
  const volatility = years.map((y, i) => {
    const win = years.slice(Math.max(0, i - 9), i + 1).map((v) => v.rainfall);
    return { year: y.year, cv: Number(((stdev(win) / (mean(win) || 1)) * 100).toFixed(1)), rainfall: Math.round(y.rainfall) };
  }).filter((_, i) => i >= 9);

  // hazard scoring (0-100) from the last 5 years vs the full baseline
  const recent = years.slice(-5);
  const pct = (v: number, arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b);
    const idx = s.findIndex((x) => x >= v);
    return Math.round(((idx < 0 ? s.length : idx) / s.length) * 100);
  };
  const droughtScore = 100 - pct(mean(recent.map((r) => r.rainfall)), years.map((y) => y.rainfall));
  const heatScore = pct(mean(recent.map((r) => r.hotDays)), years.map((y) => y.hotDays));
  const floodScore = pct(mean(recent.map((r) => r.maxDailyRain)), years.map((y) => y.maxDailyRain));
  const drySpellScore = pct(mean(recent.map((r) => r.longestDrySpell)), years.map((y) => y.longestDrySpell));
  const frostScore = pct(mean(recent.map((r) => r.coldNights)), years.map((y) => y.coldNights));
  const varScore = Math.min(100, Math.round((volatility[volatility.length - 1]?.cv || 0) * 2.5));
  const hazards = [
    { hazard: 'Drought', score: droughtScore },
    { hazard: 'Heat', score: heatScore },
    { hazard: 'Flood', score: floodScore },
    { hazard: 'Dry spell', score: drySpellScore },
    { hazard: 'Frost', score: frostScore },
    { hazard: 'Volatility', score: varScore },
  ];
  const riskIndex = Math.round(mean(hazards.map((h) => h.score)));

  // Oct–Mar season outlook from the ensemble
  const seasonBands = bands.slice(0, 6);
  const total = Math.round(seasonBands.reduce((s, b) => s + b.median, 0));
  const lower = Math.round(seasonBands.reduce((s, b) => s + b.p10, 0));
  const upper = Math.round(seasonBands.reduce((s, b) => s + b.p90, 0));
  const normal = mean(years.map((y) => y.rainfall)) / 2;
  const seasonOutlook = { total, lower, upper, vsNormal: Math.round(((total - normal) / (normal || 1)) * 100) };

  return {
    zone, years, monthly, tmaxTrend, rainTrend, hotTrend, spiSeries, forecast, tempForecast,
    returnLevels, heatReturn, markov, harmonic, onset, analogs, climatology, hazards, volatility,
    riskIndex, seasonOutlook,
  };
}

const riskColor = (v: number) => (v >= 75 ? C.hot : v >= 50 ? C.warm : v >= 25 ? C.amber : C.green);

const Metric = ({ icon, label, value, sub, color }: { icon: JSX.Element; label: string; value: string; sub: string; color: string }) => (
  <Card className="border-l-4" style={{ borderLeftColor: color }}>
    <CardContent className="p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </CardContent>
  </Card>
);

const SecretDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [zoneId, setZoneId] = useState(ESWATINI_ZONES[1].id);
  const [analyses, setAnalyses] = useState<Record<string, ZoneAnalysis>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState('');
  const cache = useRef<Record<string, DailyRecord[]>>({});

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  const load = useCallback(async (ids: string[], force = false) => {
    setLoading(true);
    setError(null);
    try {
      for (const id of ids) {
        const zone = ESWATINI_ZONES.find((z) => z.id === id)!;
        if (!force && cache.current[id]) continue;
        setStage(`Pulling ERA5 reanalysis · ${zone.name}`);
        cache.current[id] = await fetchZoneDaily(zone);
      }
      setStage('Running Theil–Sen · Mann–Kendall · SPI · Holt–Winters · Monte-Carlo…');
      const next: Record<string, ZoneAnalysis> = {};
      ids.forEach((id) => {
        const zone = ESWATINI_ZONES.find((z) => z.id === id)!;
        if (cache.current[id]) next[id] = buildAnalysis(zone, cache.current[id]);
      });
      setAnalyses((prev) => ({ ...prev, ...next }));
    } catch (e: any) {
      console.error('climate engine error', e);
      setError('Could not reach the ERA5 reanalysis archive. Try again in a moment.');
    } finally {
      setStage('');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) load([zoneId]);
  }, [isAdmin, zoneId, load]);

  const a = analyses[zoneId];
  const compareReady = ESWATINI_ZONES.every((z) => analyses[z.id]);

  const nationalCompare = useMemo(() => ESWATINI_ZONES
    .filter((z) => analyses[z.id])
    .map((z) => {
      const an = analyses[z.id];
      const last = an.years[an.years.length - 1];
      return {
        zone: z.name,
        rainfall: Math.round(mean(an.years.map((y) => y.rainfall))),
        recentRain: Math.round(last.rainfall),
        hotDays: Math.round(mean(an.years.map((y) => y.hotDays))),
        warmingPerDecade: Number(an.tmaxTrend.perDecade.toFixed(2)),
        risk: an.riskIndex,
      };
    }), [analyses]);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">This dashboard is restricted to authorized personnel only.</p>
            <Button onClick={() => navigate('/')}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const zone = ESWATINI_ZONES.find((z) => z.id === zoneId)!;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white py-4 px-4">
        <div className="max-w-screen-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white" aria-label="Back">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Eswatini Climate Intelligence
              </h1>
              <p className="text-xs text-white/60">ERA5 reanalysis · 1991–present · four agro-ecological zones</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => load([zoneId], true)} disabled={loading} className="text-white hover:bg-white/10">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {ESWATINI_ZONES.map((z) => (
              <button
                key={z.id}
                onClick={() => setZoneId(z.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs border transition ${
                  z.id === zoneId ? 'bg-white text-emerald-900 border-white font-semibold' : 'border-white/25 text-white/80 hover:bg-white/10'
                }`}
              >
                {z.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-white/60">
            <MapPin className="w-3 h-3" />
            <span>{zone.region} · {zone.altitude} · {zone.blurb}</span>
          </div>
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto px-4 py-4 space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> {stage || 'Loading…'}
          </div>
        )}
        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {a && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Metric
                icon={<Thermometer className="w-4 h-4" style={{ color: C.hot }} />}
                label="Warming rate"
                value={`${a.tmaxTrend.perDecade >= 0 ? '+' : ''}${a.tmaxTrend.perDecade.toFixed(2)}°C/decade`}
                sub={`Mann–Kendall p=${a.tmaxTrend.pValue.toFixed(3)} ${a.tmaxTrend.significant ? '· significant' : '· not significant'}`}
                color={C.hot}
              />
              <Metric
                icon={<Droplets className="w-4 h-4" style={{ color: C.blue }} />}
                label="Rainfall trend"
                value={`${a.rainTrend.perDecade >= 0 ? '+' : ''}${Math.round(a.rainTrend.perDecade)} mm/decade`}
                sub={`τ=${a.rainTrend.tau.toFixed(2)} · Theil–Sen robust slope`}
                color={C.blue}
              />
              <Metric
                icon={<Flame className="w-4 h-4" style={{ color: C.warm }} />}
                label="Hot days ≥35°C"
                value={`${a.years[a.years.length - 1].hotDays}/yr`}
                sub={`${a.hotTrend.perDecade >= 0 ? '+' : ''}${a.hotTrend.perDecade.toFixed(1)} days/decade`}
                color={C.warm}
              />
              <Metric
                icon={<Gauge className="w-4 h-4" style={{ color: riskColor(a.riskIndex) }} />}
                label="Composite risk"
                value={`${a.riskIndex}/100`}
                sub={`${a.zone.name} zone percentile blend`}
                color={riskColor(a.riskIndex)}
              />
            </div>

            <Tabs defaultValue="outlook">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="outlook" className="text-[11px]">Outlook</TabsTrigger>
                <TabsTrigger value="drought" className="text-[11px]">Drought</TabsTrigger>
                <TabsTrigger value="extremes" className="text-[11px]">Extremes</TabsTrigger>
                <TabsTrigger value="season" className="text-[11px]">Season</TabsTrigger>
                <TabsTrigger value="zones" className="text-[11px]">Zones</TabsTrigger>
              </TabsList>

              {/* -------------------------------------------------- OUTLOOK */}
              <TabsContent value="outlook" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      12-month rainfall ensemble
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Holt–Winters triple exponential smoothing driving a 900-member block-bootstrap Monte-Carlo ensemble.
                    </p>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={a.forecast}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
                        <YAxis tick={{ fontSize: 10 }} unit="mm" width={44} />
                        <Tooltip contentStyle={tip} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Area dataKey="band80" name="80% ensemble" stroke="none" fill={C.cyan} fillOpacity={0.18} />
                        <Area dataKey="band50" name="50% ensemble" stroke="none" fill={C.cyan} fillOpacity={0.32} />
                        <Bar dataKey="rainfall" name="Observed (mm)" fill={C.blue} radius={[3, 3, 0, 0]} />
                        <Line dataKey="median" name="Median forecast" stroke={C.violet} strokeWidth={2.5} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Oct–Mar season outlook</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-bold" style={{ color: C.blue }}>{a.seasonOutlook.total}</p>
                      <p className="text-[11px] text-muted-foreground">mm median</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: C.slate }}>{a.seasonOutlook.lower}–{a.seasonOutlook.upper}</p>
                      <p className="text-[11px] text-muted-foreground">80% range</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: a.seasonOutlook.vsNormal < 0 ? C.warm : C.green }}>
                        {a.seasonOutlook.vsNormal >= 0 ? '+' : ''}{a.seasonOutlook.vsNormal}%
                      </p>
                      <p className="text-[11px] text-muted-foreground">vs 1991–now normal</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Maximum temperature — observed vs forecast</CardTitle>
                    <p className="text-xs text-muted-foreground">Seasonal state-space smoothing, 12 months ahead.</p>
                  </CardHeader>
                  <CardContent className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={a.tempForecast}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={3} />
                        <YAxis tick={{ fontSize: 10 }} unit="°" width={36} domain={['dataMin - 2', 'dataMax + 2']} />
                        <Tooltip contentStyle={tip} />
                        <Line dataKey="tmax" name="Observed °C" stroke={C.hot} strokeWidth={2} dot={false} />
                        <Line dataKey="predicted" name="Forecast °C" stroke={C.violet} strokeWidth={2} strokeDasharray="5 3" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <RadarIcon className="w-4 h-4" /> Hazard signature
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={a.hazards} outerRadius="72%">
                        <PolarGrid />
                        <PolarAngleAxis dataKey="hazard" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar dataKey="score" stroke={C.green} fill={C.green} fillOpacity={0.35} />
                        <Tooltip contentStyle={tip} formatter={(v: any) => [`${v}/100`, 'Percentile risk']} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* -------------------------------------------------- DROUGHT */}
              <TabsContent value="drought" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">SPI-3 drought timeline (last 15 years)</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Gamma-fitted Standardized Precipitation Index on 3-month accumulations.
                      Current state: <strong>{spiCategory(a.spiSeries[a.spiSeries.length - 1]?.spi ?? 0)}</strong> (SPI {a.spiSeries[a.spiSeries.length - 1]?.spi})
                    </p>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={a.spiSeries}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={17} />
                        <YAxis domain={[-3, 3]} tick={{ fontSize: 10 }} width={30} />
                        <ReferenceLine y={-1} stroke={C.amber} strokeDasharray="3 3" />
                        <ReferenceLine y={-1.5} stroke={C.hot} strokeDasharray="3 3" />
                        <Tooltip contentStyle={tip} formatter={(v: any) => [v, 'SPI-3']} />
                        <Bar dataKey="spi">
                          {a.spiSeries.map((d, i) => (
                            <Cell key={i} fill={d.spi <= -1.5 ? C.hot : d.spi <= -1 ? C.warm : d.spi >= 1 ? C.blue : C.slate} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Dry-spell survival (Markov chain)</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Wet-day probability {(a.markov.wetDayProb * 100).toFixed(0)}% · P(wet|wet) {(a.markov.pWetGivenWet * 100).toFixed(0)}% ·
                      mean dry run {a.markov.meanDrySpell.toFixed(1)} days · longest {a.markov.longestDrySpell} days
                    </p>
                  </CardHeader>
                  <CardContent className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={a.markov.drySpellSurvival}>
                        <defs>
                          <linearGradient id="dryg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={C.warm} stopOpacity={0.7} />
                            <stop offset="100%" stopColor={C.warm} stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="days" tick={{ fontSize: 10 }} unit="d" />
                        <YAxis tick={{ fontSize: 10 }} unit="%" width={36} />
                        <Tooltip contentStyle={tip} formatter={(v: any) => [`${v}%`, 'Chance spell continues']} />
                        <Area dataKey="probability" stroke={C.warm} fill="url(#dryg)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Rainfall volatility (10-yr rolling CV)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={a.volatility}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="l" tick={{ fontSize: 10 }} unit="%" width={40} />
                        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} width={44} />
                        <Tooltip contentStyle={tip} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar yAxisId="r" dataKey="rainfall" name="Annual mm" fill={C.blue} opacity={0.45} radius={[3, 3, 0, 0]} />
                        <Line yAxisId="l" dataKey="cv" name="Volatility CV %" stroke={C.violet} strokeWidth={2.5} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Closest analog years</CardTitle>
                    <p className="text-xs text-muted-foreground">Nearest-neighbour match on the last six months of standardized rainfall anomalies.</p>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2">
                    {a.analogs.map((an) => (
                      <div key={an.year} className="rounded-lg border p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{an.year}</span>
                          <Badge variant="secondary" className="text-[10px]">{an.similarity}% match</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">{an.rainfall} mm · mean max {an.meanTmax}°C</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ------------------------------------------------- EXTREMES */}
              <TabsContent value="extremes" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Extreme rainfall return levels (Gumbel EV-I)</CardTitle>
                    <p className="text-xs text-muted-foreground">Annual daily maxima fitted by method of moments with 95% delta-method bounds.</p>
                  </CardHeader>
                  <CardContent className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={a.returnLevels}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="returnPeriod" tick={{ fontSize: 10 }} unit="yr" />
                        <YAxis tick={{ fontSize: 10 }} unit="mm" width={44} />
                        <Tooltip contentStyle={tip} formatter={(v: any) => [`${Math.round(v)} mm`, '']} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Area dataKey="upper" name="Upper 95%" stroke="none" fill={C.hot} fillOpacity={0.12} />
                        <Area dataKey="lower" name="Lower 95%" stroke="none" fill="#fff" fillOpacity={0} />
                        <Line dataKey="level" name="Return level" stroke={C.hot} strokeWidth={2.5} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Heat & cold extremes by year</CardTitle>
                  </CardHeader>
                  <CardContent className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={a.years}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="year" tick={{ fontSize: 9 }} interval={3} />
                        <YAxis tick={{ fontSize: 10 }} width={34} />
                        <Tooltip contentStyle={tip} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="hotDays" name="Days ≥35°C" fill={C.hot} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="coldNights" name="Nights ≤5°C" fill={C.cyan} radius={[3, 3, 0, 0]} />
                        <Line dataKey="longestDrySpell" name="Longest dry spell (d)" stroke={C.amber} strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Warming signal (Theil–Sen)</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Robust slope {a.tmaxTrend.perDecade.toFixed(2)}°C/decade, Kendall τ {a.tmaxTrend.tau.toFixed(2)}, p={a.tmaxTrend.pValue.toFixed(4)}.
                    </p>
                  </CardHeader>
                  <CardContent className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="year" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 10 }} />
                        <YAxis dataKey="meanTmax" type="number" domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fontSize: 10 }} unit="°" width={40} />
                        <Tooltip contentStyle={tip} formatter={(v: any) => [Number(v).toFixed(2), '']} />
                        <Scatter data={a.years} fill={C.hot} />
                        <Line
                          data={a.years.map((y, i) => ({ year: y.year, fit: a.tmaxTrend.intercept + a.tmaxTrend.slope * i }))}
                          dataKey="fit" stroke={C.violet} strokeWidth={2} dot={false} name="Theil–Sen fit"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* --------------------------------------------------- SEASON */}
              <TabsContent value="season" className="space-y-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sprout className="w-4 h-4 text-emerald-600" /> Planting-window onset probability
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      SADC onset criterion: ≥20 mm in 3 days with no 10-day dry spell in the following 30 days, scored by dekad.
                    </p>
                  </CardHeader>
                  <CardContent className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={a.onset}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="label" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" height={50} />
                        <YAxis tick={{ fontSize: 10 }} unit="%" width={36} />
                        <Tooltip contentStyle={tip} formatter={(v: any) => [`${v}%`, 'Onset chance']} />
                        <Bar dataKey="probability" radius={[3, 3, 0, 0]}>
                          {a.onset.map((d, i) => <Cell key={i} fill={d.probability >= 20 ? C.green : d.probability >= 10 ? C.amber : C.slate} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Climatology shift — long-term vs last decade</CardTitle>
                  </CardHeader>
                  <CardContent className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={a.climatology}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="l" tick={{ fontSize: 10 }} unit="mm" width={44} />
                        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} unit="°" width={36} />
                        <Tooltip contentStyle={tip} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar yAxisId="l" dataKey="rainfall" name="1991–now mm" fill={C.blue} opacity={0.5} radius={[3, 3, 0, 0]} />
                        <Bar yAxisId="l" dataKey="recent" name="Last 10 yr mm" fill={C.cyan} radius={[3, 3, 0, 0]} />
                        <Line yAxisId="r" dataKey="tmax" name="Max °C" stroke={C.hot} strokeWidth={2} dot={false} />
                        <Line yAxisId="r" dataKey="tmin" name="Min °C" stroke={C.violet} strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Seasonality decomposition (Fourier harmonics)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {a.harmonic.map((h) => (
                      <div key={h.harmonic} className="flex items-center gap-3">
                        <span className="text-xs w-20 text-muted-foreground">Harmonic {h.harmonic}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, h.varianceShare * 100)}%`, background: C.green }} />
                        </div>
                        <span className="text-xs w-28 text-right">{(h.varianceShare * 100).toFixed(1)}% variance</span>
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground pt-1">
                      A dominant first harmonic confirms a single wet season; a strong second harmonic signals a bimodal or unstable rainfall regime.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Growing degree days & wet days</CardTitle>
                  </CardHeader>
                  <CardContent className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={a.years}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                        <XAxis dataKey="year" tick={{ fontSize: 9 }} interval={3} />
                        <YAxis yAxisId="l" tick={{ fontSize: 10 }} width={48} />
                        <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} width={34} />
                        <Tooltip contentStyle={tip} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Area yAxisId="l" dataKey="gdd" name="GDD (base 10°C)" stroke={C.green} fill={C.green} fillOpacity={0.2} />
                        <Line yAxisId="r" dataKey="wetDays" name="Wet days" stroke={C.blue} strokeWidth={2} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ---------------------------------------------------- ZONES */}
              <TabsContent value="zones" className="space-y-4 mt-4">
                {!compareReady && (
                  <Card>
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <p className="text-sm text-muted-foreground">Load all four agro-ecological zones for the national comparison.</p>
                      <Button size="sm" onClick={() => load(ESWATINI_ZONES.map((z) => z.id))} disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run national scan'}
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {nationalCompare.length > 1 && (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Waves className="w-4 h-4 text-blue-500" /> Rainfall & warming by zone
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={nationalCompare}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                            <XAxis dataKey="zone" tick={{ fontSize: 10 }} />
                            <YAxis yAxisId="l" tick={{ fontSize: 10 }} unit="mm" width={48} />
                            <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} width={40} />
                            <Tooltip contentStyle={tip} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Bar yAxisId="l" dataKey="rainfall" name="Mean annual mm" fill={C.blue} radius={[3, 3, 0, 0]} />
                            <Bar yAxisId="l" dataKey="recentRain" name="Latest year mm" fill={C.cyan} radius={[3, 3, 0, 0]} />
                            <Line yAxisId="r" dataKey="warmingPerDecade" name="°C/decade" stroke={C.hot} strokeWidth={2.5} dot={{ r: 4 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Zone risk ranking</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {[...nationalCompare].sort((x, y) => y.risk - x.risk).map((z) => (
                          <div key={z.zone} className="flex items-center gap-3">
                            <span className="text-xs w-28">{z.zone}</span>
                            <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${z.risk}%`, background: riskColor(z.risk) }} />
                            </div>
                            <span className="text-xs w-16 text-right font-semibold" style={{ color: riskColor(z.risk) }}>{z.risk}/100</span>
                          </div>
                        ))}
                        <p className="text-[11px] text-muted-foreground pt-1">
                          Composite of drought, heat, flood, dry-spell, frost and volatility percentiles for the last five years against the 1991-onward baseline.
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Heat exposure by zone</CardTitle>
                      </CardHeader>
                      <CardContent className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={nationalCompare} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="zone" tick={{ fontSize: 10 }} width={90} />
                            <Tooltip contentStyle={tip} formatter={(v: any) => [`${v} days`, 'Mean days ≥35°C']} />
                            <Bar dataKey="hotDays" radius={[0, 4, 4, 0]}>
                              {nationalCompare.map((d, i) => <Cell key={i} fill={d.hotDays > 40 ? C.hot : d.hotDays > 15 ? C.warm : C.amber} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>

            <div className="text-center py-4 border-t">
              <p className="text-xs text-muted-foreground">
                Source: ECMWF ERA5 reanalysis via Open-Meteo archive, sampled at Mbabane, Manzini, Big Bend and Siteki.
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Models: Theil–Sen · Mann–Kendall · Gamma-SPI · Holt–Winters · Monte-Carlo block bootstrap · Gumbel EV-I · Markov chain · Fourier decomposition · analog matching.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SecretDashboard;
