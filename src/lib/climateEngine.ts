/**
 * Eswatini Climate Intelligence Engine
 * -----------------------------------------------------------------------------
 * Pure, dependency-free statistical / predictive routines used by the
 * Climate Intelligence Dashboard. Everything runs client-side on ERA5
 * reanalysis daily records pulled from the Open-Meteo archive for each of
 * Eswatini's four agro-ecological zones.
 *
 * Algorithms implemented here:
 *  - Theil–Sen robust slope estimator
 *  - Mann–Kendall non-parametric trend test (with tie-corrected variance)
 *  - Standardized Precipitation Index (SPI) via gamma fit + normal quantile
 *  - Holt–Winters triple exponential smoothing (additive seasonality)
 *  - Monte-Carlo ensemble projection with block bootstrap resampling
 *  - Gumbel (EV-I) extreme value fit -> return periods / return levels
 *  - First-order Markov chain wet/dry state model + dry-spell survival
 *  - Growing degree days, season onset probability, heat/chill stress counts
 *  - Harmonic (Fourier) seasonal decomposition
 *  - Analog-year nearest neighbour matching on standardized anomaly vectors
 */

export interface DailyRecord {
  date: string;
  tmax: number;
  tmin: number;
  precip: number;
}

export interface Zone {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  altitude: string;
  blurb: string;
}

/** Eswatini's four agro-ecological zones. */
export const ESWATINI_ZONES: Zone[] = [
  {
    id: 'highveld',
    name: 'Highveld',
    region: 'Hhohho · Mbabane',
    lat: -26.3054,
    lon: 31.1367,
    altitude: '900–1400 m',
    blurb: 'Cool, high rainfall. Maize, forestry, vegetables.',
  },
  {
    id: 'middleveld',
    name: 'Middleveld',
    region: 'Manzini · Matsapha',
    lat: -26.4833,
    lon: 31.3667,
    altitude: '400–800 m',
    blurb: 'Sub-humid core cropping belt. Maize, cotton, citrus.',
  },
  {
    id: 'lowveld',
    name: 'Lowveld',
    region: 'Lubombo · Big Bend',
    lat: -26.8167,
    lon: 31.9333,
    altitude: '150–400 m',
    blurb: 'Hot, semi-arid. Sugarcane, irrigated cropping, cattle.',
  },
  {
    id: 'lubombo',
    name: 'Lubombo Plateau',
    region: 'Lubombo · Siteki',
    lat: -26.4500,
    lon: 31.9500,
    altitude: '400–850 m',
    blurb: 'Drier escarpment. Cattle, drought-tolerant grains.',
  },
];

/* ------------------------------------------------------------------ utils */

export const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

export const stdev = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};

export const quantile = (arr: number[], q: number) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((x, y) => x - y);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
};

/** Abramowitz & Stegun inverse normal CDF. */
export function invNorm(p: number): number {
  const pp = Math.min(Math.max(p, 1e-6), 1 - 1e-6);
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const pl = 0.02425;
  if (pp < pl) {
    const q = Math.sqrt(-2 * Math.log(pp));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (pp > 1 - pl) {
    const q = Math.sqrt(-2 * Math.log(1 - pp));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = pp - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Standard normal CDF (Zelen & Severo approximation). */
export function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
}

/* ------------------------------------------------------- trend detection */

export interface TrendResult {
  slope: number;        // units per step
  intercept: number;
  perDecade: number;    // assuming step = 1 year
  tau: number;
  pValue: number;
  significant: boolean;
  direction: 'rising' | 'falling' | 'stable';
}

/** Theil–Sen slope + Mann–Kendall significance test. */
export function theilSenMannKendall(values: number[], stepPerDecade = 10): TrendResult {
  const n = values.length;
  if (n < 4) {
    return { slope: 0, intercept: 0, perDecade: 0, tau: 0, pValue: 1, significant: false, direction: 'stable' };
  }
  const slopes: number[] = [];
  let S = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      slopes.push((values[j] - values[i]) / (j - i));
      S += Math.sign(values[j] - values[i]);
    }
  }
  slopes.sort((a, b) => a - b);
  const slope = slopes[Math.floor(slopes.length / 2)];

  // tie-corrected variance
  const counts = new Map<number, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  let tieTerm = 0;
  counts.forEach((t) => { if (t > 1) tieTerm += t * (t - 1) * (2 * t + 5); });
  const varS = (n * (n - 1) * (2 * n + 5) - tieTerm) / 18;
  const z = S > 0 ? (S - 1) / Math.sqrt(varS) : S < 0 ? (S + 1) / Math.sqrt(varS) : 0;
  const pValue = 2 * (1 - normCdf(Math.abs(z)));
  const tau = (2 * S) / (n * (n - 1));

  const medIdx = Math.floor(n / 2);
  const sortedVals = [...values].sort((a, b) => a - b);
  const intercept = sortedVals[medIdx] - slope * medIdx;

  return {
    slope,
    intercept,
    perDecade: slope * stepPerDecade,
    tau,
    pValue,
    significant: pValue < 0.05,
    direction: !Number.isFinite(slope) || Math.abs(slope) < 1e-9 ? 'stable' : slope > 0 ? 'rising' : 'falling',
  };
}

/* --------------------------------------------------------------- SPI ---- */

/** Fit 2-parameter gamma by Thom's maximum-likelihood approximation. */
function gammaFit(series: number[]) {
  const positive = series.filter((v) => v > 0);
  if (positive.length < 3) return null;
  const m = mean(positive);
  const A = Math.log(m) - mean(positive.map((v) => Math.log(v)));
  const shape = (1 + Math.sqrt(1 + (4 * A) / 3)) / (4 * A);
  const scale = m / shape;
  const zeroProb = (series.length - positive.length) / series.length;
  return { shape, scale, zeroProb };
}

/** Lower incomplete gamma P(a,x) by series/continued fraction. */
function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  const gln = lnGamma(a);
  if (x < a + 1) {
    let ap = a; let sum = 1 / a; let del = sum;
    for (let i = 0; i < 200; i++) {
      ap += 1; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-10) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - gln);
  }
  let b = x + 1 - a; let c = 1e30; let d = 1 / b; let h = d;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    b += 2; d = an * d + b; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-10) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - gln) * h;
}

function lnGamma(z: number): number {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = z; let y = z; let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y += 1; ser += g[j] / y; }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/**
 * Standardized Precipitation Index for an accumulation series
 * (e.g. rolling 3-month rainfall totals).
 */
export function spi(series: number[]): number[] {
  const fit = gammaFit(series);
  if (!fit) return series.map(() => 0);
  return series.map((v) => {
    const g = v <= 0 ? 0 : gammaP(fit.shape, v / fit.scale);
    const p = fit.zeroProb + (1 - fit.zeroProb) * g;
    return Math.max(-3.5, Math.min(3.5, invNorm(p)));
  });
}

export const spiCategory = (v: number) =>
  v <= -2 ? 'Extreme drought'
    : v <= -1.5 ? 'Severe drought'
      : v <= -1 ? 'Moderate drought'
        : v < 1 ? 'Near normal'
          : v < 1.5 ? 'Moderately wet'
            : v < 2 ? 'Very wet' : 'Extremely wet';

/* ---------------------------------------------- Holt–Winters forecasting */

export interface HoltWintersResult {
  fitted: number[];
  forecast: number[];
  residualSd: number;
}

/** Additive triple exponential smoothing. */
export function holtWinters(
  series: number[],
  period = 12,
  horizon = 12,
  alpha = 0.35,
  beta = 0.08,
  gamma = 0.4,
): HoltWintersResult {
  if (series.length < period * 2) {
    const m = mean(series);
    return { fitted: series.map(() => m), forecast: Array(horizon).fill(m), residualSd: stdev(series) };
  }
  const seasons = Math.floor(series.length / period);
  const seasonAverages: number[] = [];
  for (let s = 0; s < seasons; s++) seasonAverages.push(mean(series.slice(s * period, (s + 1) * period)));
  const seasonal: number[] = [];
  for (let i = 0; i < period; i++) {
    let acc = 0;
    for (let s = 0; s < seasons; s++) acc += series[s * period + i] - seasonAverages[s];
    seasonal.push(acc / seasons);
  }
  let level = seasonAverages[0];
  let trend = (seasonAverages[seasons - 1] - seasonAverages[0]) / Math.max(1, (seasons - 1) * period);
  const fitted: number[] = [];
  const residuals: number[] = [];

  for (let i = 0; i < series.length; i++) {
    const si = seasonal[i % period];
    const pred = level + trend + si;
    fitted.push(pred);
    residuals.push(series[i] - pred);
    const lastLevel = level;
    level = alpha * (series[i] - si) + (1 - alpha) * (level + trend);
    trend = beta * (level - lastLevel) + (1 - beta) * trend;
    seasonal[i % period] = gamma * (series[i] - level) + (1 - gamma) * si;
  }
  const forecast: number[] = [];
  for (let h = 1; h <= horizon; h++) {
    forecast.push(level + h * trend + seasonal[(series.length + h - 1) % period]);
  }
  return { fitted, forecast, residualSd: stdev(residuals) };
}

/* ------------------------------------------------- Monte-Carlo ensemble */

export interface EnsembleBand {
  step: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
}

/**
 * Monte-Carlo ensemble around a deterministic path using a block bootstrap of
 * historical residuals plus a drift term. Returns percentile fan bands.
 */
export function monteCarloEnsemble(
  path: number[],
  residuals: number[],
  runs = 800,
  floorAtZero = false,
): EnsembleBand[] {
  const pool = residuals.length ? residuals : [0];
  const sims: number[][] = [];
  for (let r = 0; r < runs; r++) {
    const sim: number[] = [];
    let carry = 0;
    for (let i = 0; i < path.length; i++) {
      const shock = pool[Math.floor(Math.random() * pool.length)];
      carry = 0.35 * carry + shock;                     // AR(1) persistence
      const drift = Math.sqrt(i + 1) * 0.05 * stdev(pool); // widening cone
      const v = path[i] + carry + (Math.random() - 0.5) * 2 * drift;
      sim.push(floorAtZero ? Math.max(0, v) : v);
    }
    sims.push(sim);
  }
  return path.map((_, i) => {
    const col = sims.map((s) => s[i]);
    return {
      step: i,
      p10: quantile(col, 0.1),
      p25: quantile(col, 0.25),
      median: quantile(col, 0.5),
      p75: quantile(col, 0.75),
      p90: quantile(col, 0.9),
    };
  });
}

/* ------------------------------------------------- extreme value theory */

export interface ReturnLevel { returnPeriod: number; level: number; lower: number; upper: number; }

/** Gumbel (EV-I) fit by method of moments -> return levels. */
export function gumbelReturnLevels(annualMaxima: number[], periods = [2, 5, 10, 20, 50, 100]): ReturnLevel[] {
  if (annualMaxima.length < 5) return [];
  const s = stdev(annualMaxima);
  const m = mean(annualMaxima);
  const beta = (s * Math.sqrt(6)) / Math.PI;
  const mu = m - 0.5772 * beta;
  const n = annualMaxima.length;
  return periods.map((T) => {
    const y = -Math.log(-Math.log(1 - 1 / T));
    const level = mu + beta * y;
    // delta-method standard error
    const se = (beta / Math.sqrt(n)) * Math.sqrt(1.1128 + 0.4574 * y + 0.8046 * y * y);
    return { returnPeriod: T, level, lower: Math.max(0, level - 1.96 * se), upper: level + 1.96 * se };
  });
}

/* --------------------------------------------------------- Markov chain */

export interface MarkovModel {
  pWetGivenWet: number;
  pWetGivenDry: number;
  wetDayProb: number;
  drySpellSurvival: { days: number; probability: number }[];
  meanDrySpell: number;
  longestDrySpell: number;
}

/** First-order two-state (wet/dry) Markov chain with dry-spell survival curve. */
export function markovWetDry(daily: DailyRecord[], threshold = 1): MarkovModel {
  let ww = 0, wd = 0, dw = 0, dd = 0, wet = 0;
  let run = 0, longest = 0;
  const runs: number[] = [];
  for (let i = 0; i < daily.length; i++) {
    const isWet = daily[i].precip >= threshold;
    if (isWet) {
      wet++;
      if (run > 0) { runs.push(run); longest = Math.max(longest, run); run = 0; }
    } else run++;
    if (i > 0) {
      const prevWet = daily[i - 1].precip >= threshold;
      if (prevWet && isWet) ww++;
      else if (prevWet && !isWet) wd++;
      else if (!prevWet && isWet) dw++;
      else dd++;
    }
  }
  if (run > 0) { runs.push(run); longest = Math.max(longest, run); }
  const pWetGivenWet = ww + wd ? ww / (ww + wd) : 0;
  const pWetGivenDry = dw + dd ? dw / (dw + dd) : 0;
  const pDryGivenDry = 1 - pWetGivenDry;
  const survival = [3, 5, 7, 10, 14, 21, 30].map((d) => ({
    days: d,
    probability: Math.round(Math.pow(pDryGivenDry, d - 1) * 100),
  }));
  return {
    pWetGivenWet,
    pWetGivenDry,
    wetDayProb: daily.length ? wet / daily.length : 0,
    drySpellSurvival: survival,
    meanDrySpell: runs.length ? mean(runs) : 0,
    longestDrySpell: longest,
  };
}

/* ---------------------------------------------------- harmonic analysis */

/** Fourier decomposition of the mean annual cycle (first k harmonics). */
export function harmonics(monthlyMeans: number[], k = 3) {
  const n = monthlyMeans.length;
  const m = mean(monthlyMeans);
  const terms: { harmonic: number; amplitude: number; phaseMonth: number; varianceShare: number }[] = [];
  const totalVar = monthlyMeans.reduce((s, v) => s + (v - m) ** 2, 0) || 1;
  for (let h = 1; h <= k; h++) {
    let a = 0, b = 0;
    for (let t = 0; t < n; t++) {
      a += monthlyMeans[t] * Math.cos((2 * Math.PI * h * t) / n);
      b += monthlyMeans[t] * Math.sin((2 * Math.PI * h * t) / n);
    }
    a = (2 / n) * a; b = (2 / n) * b;
    const amp = Math.sqrt(a * a + b * b);
    const phase = Math.atan2(b, a);
    terms.push({
      harmonic: h,
      amplitude: amp,
      phaseMonth: ((phase / (2 * Math.PI)) * n + n) % n,
      varianceShare: ((n / 2) * amp * amp) / totalVar,
    });
  }
  return terms;
}

/* --------------------------------------------------------- agro indices */

export function growingDegreeDays(daily: DailyRecord[], base = 10, cap = 30) {
  return daily.reduce((sum, d) => {
    const tmax = Math.min(d.tmax, cap);
    const tmin = Math.min(d.tmin, cap);
    return sum + Math.max(0, (tmax + tmin) / 2 - base);
  }, 0);
}

/**
 * Season onset probability by dekad (10-day block) using the classic
 * Eswatini/SADC criterion: >=20 mm over 3 days with no 10-day dry spell
 * in the following 30 days.
 */
export function onsetProbability(byYear: Map<number, DailyRecord[]>) {
  const dekadHits = new Map<string, number>();
  let years = 0;
  byYear.forEach((records) => {
    if (records.length < 200) return;
    years++;
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < sorted.length - 33; i++) {
      const acc = sorted[i].precip + sorted[i + 1].precip + sorted[i + 2].precip;
      if (acc < 20) continue;
      let dry = 0, maxDry = 0;
      for (let j = i + 3; j < i + 33; j++) {
        if (sorted[j].precip < 1) { dry++; maxDry = Math.max(maxDry, dry); } else dry = 0;
      }
      if (maxDry >= 10) continue;
      const d = new Date(sorted[i].date);
      const dekad = Math.min(2, Math.floor((d.getDate() - 1) / 10));
      const key = `${d.getMonth()}-${dekad}`;
      dekadHits.set(key, (dekadHits.get(key) || 0) + 1);
      break;
    }
  });
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const out: { label: string; probability: number }[] = [];
  // Southern-hemisphere cropping year: Sep -> Feb
  const order = [8, 9, 10, 11, 0, 1];
  order.forEach((mo) => {
    for (let dk = 0; dk < 3; dk++) {
      const hits = dekadHits.get(`${mo}-${dk}`) || 0;
      out.push({ label: `${labels[mo]} ${dk === 0 ? 'I' : dk === 1 ? 'II' : 'III'}`, probability: years ? Math.round((hits / years) * 100) : 0 });
    }
  });
  return out;
}

/* --------------------------------------------------------- analog years */

export interface AnalogYear { year: number; distance: number; similarity: number; rainfall: number; meanTmax: number; }

/** Nearest-neighbour matching on standardized monthly anomaly vectors. */
export function analogYears(
  target: number[],
  library: { year: number; vector: number[]; rainfall: number; meanTmax: number }[],
  top = 4,
): AnalogYear[] {
  const scored = library.map((y) => {
    let d = 0;
    for (let i = 0; i < target.length; i++) d += (target[i] - (y.vector[i] ?? 0)) ** 2;
    return { year: y.year, distance: Math.sqrt(d), rainfall: y.rainfall, meanTmax: y.meanTmax };
  }).sort((a, b) => a.distance - b.distance);
  const worst = scored[scored.length - 1]?.distance || 1;
  return scored.slice(0, top).map((s) => ({ ...s, similarity: Math.round((1 - s.distance / worst) * 100) }));
}

/* --------------------------------------------------------- data loading */

const ARCHIVE = 'https://archive-api.open-meteo.com/v1/archive';

export async function fetchZoneDaily(zone: Zone, startYear = 1991): Promise<DailyRecord[]> {
  const end = new Date();
  end.setDate(end.getDate() - 6); // ERA5 lag
  const url = `${ARCHIVE}?latitude=${zone.lat}&longitude=${zone.lon}` +
    `&start_date=${startYear}-01-01&end_date=${end.toISOString().slice(0, 10)}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Africa%2FMbabane`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`archive ${res.status}`);
  const j = await res.json();
  const t: string[] = j?.daily?.time || [];
  const out: DailyRecord[] = [];
  for (let i = 0; i < t.length; i++) {
    const tmax = j.daily.temperature_2m_max?.[i];
    const tmin = j.daily.temperature_2m_min?.[i];
    const pr = j.daily.precipitation_sum?.[i];
    if (tmax == null || tmin == null) continue;
    out.push({ date: t[i], tmax, tmin, precip: pr ?? 0 });
  }
  return out;
}

/* -------------------------------------------------------- aggregations */

export interface YearStats {
  year: number;
  meanTmax: number;
  meanTmin: number;
  rainfall: number;
  hotDays: number;      // tmax >= 35
  coldNights: number;   // tmin <= 5
  wetDays: number;
  maxDailyRain: number;
  gdd: number;
  longestDrySpell: number;
}

export function annualStats(daily: DailyRecord[]): YearStats[] {
  const groups = new Map<number, DailyRecord[]>();
  daily.forEach((d) => {
    const y = Number(d.date.slice(0, 4));
    if (!groups.has(y)) groups.set(y, []);
    groups.get(y)!.push(d);
  });
  const out: YearStats[] = [];
  groups.forEach((recs, year) => {
    if (recs.length < 300) return;
    let dry = 0, longest = 0;
    recs.forEach((r) => {
      if (r.precip < 1) { dry++; longest = Math.max(longest, dry); } else dry = 0;
    });
    out.push({
      year,
      meanTmax: mean(recs.map((r) => r.tmax)),
      meanTmin: mean(recs.map((r) => r.tmin)),
      rainfall: recs.reduce((s, r) => s + r.precip, 0),
      hotDays: recs.filter((r) => r.tmax >= 35).length,
      coldNights: recs.filter((r) => r.tmin <= 5).length,
      wetDays: recs.filter((r) => r.precip >= 1).length,
      maxDailyRain: Math.max(...recs.map((r) => r.precip)),
      gdd: growingDegreeDays(recs),
      longestDrySpell: longest,
    });
  });
  return out.sort((a, b) => a.year - b.year);
}

export interface MonthPoint { key: string; year: number; month: number; rainfall: number; tmax: number; tmin: number; }

export function monthlySeries(daily: DailyRecord[]): MonthPoint[] {
  const groups = new Map<string, DailyRecord[]>();
  daily.forEach((d) => {
    const key = d.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  });
  const out: MonthPoint[] = [];
  groups.forEach((recs, key) => {
    if (recs.length < 25) return;
    out.push({
      key,
      year: Number(key.slice(0, 4)),
      month: Number(key.slice(5, 7)),
      rainfall: recs.reduce((s, r) => s + r.precip, 0),
      tmax: mean(recs.map((r) => r.tmax)),
      tmin: mean(recs.map((r) => r.tmin)),
    });
  });
  return out.sort((a, b) => a.key.localeCompare(b.key));
}

export function rolling(values: number[], window: number) {
  return values.map((_, i) => {
    if (i < window - 1) return NaN;
    return values.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
  });
}

export function groupByYear(daily: DailyRecord[]) {
  const m = new Map<number, DailyRecord[]>();
  daily.forEach((d) => {
    const y = Number(d.date.slice(0, 4));
    if (!m.has(y)) m.set(y, []);
    m.get(y)!.push(d);
  });
  return m;
}
