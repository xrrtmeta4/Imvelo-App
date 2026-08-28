import { useState, useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Thermometer, Waves, Wind, CloudLightning, Snowflake, Sun, Droplets, Leaf, BarChart3, Activity, Globe, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const ADMIN_EMAIL = 'ncamisoxaba56@gmail.com';

const SECRET_DASHBOARD_DATA = {
  temperatureAnomalies: [
    { year: 1880, anomaly: -0.16, smoothed: -0.12, uncertainty: 0.05 },
    { year: 1890, anomaly: -0.35, smoothed: -0.18, uncertainty: 0.05 },
    { year: 1900, anomaly: -0.08, smoothed: -0.15, uncertainty: 0.04 },
    { year: 1910, anomaly: -0.35, smoothed: -0.22, uncertainty: 0.04 },
    { year: 1920, anomaly: -0.27, smoothed: -0.20, uncertainty: 0.04 },
    { year: 1930, anomaly: -0.14, smoothed: -0.10, uncertainty: 0.03 },
    { year: 1940, anomaly: 0.12, smoothed: -0.02, uncertainty: 0.03 },
    { year: 1950, anomaly: -0.17, smoothed: -0.05, uncertainty: 0.03 },
    { year: 1960, anomaly: -0.03, smoothed: 0.01, uncertainty: 0.02 },
    { year: 1970, anomaly: 0.04, smoothed: 0.02, uncertainty: 0.02 },
    { year: 1980, anomaly: 0.26, smoothed: 0.18, uncertainty: 0.02 },
    { year: 1985, anomaly: 0.12, smoothed: 0.22, uncertainty: 0.02 },
    { year: 1990, anomaly: 0.45, smoothed: 0.33, uncertainty: 0.02 },
    { year: 1995, anomaly: 0.45, smoothed: 0.40, uncertainty: 0.02 },
    { year: 2000, anomaly: 0.42, smoothed: 0.47, uncertainty: 0.02 },
    { year: 2005, anomaly: 0.68, smoothed: 0.55, uncertainty: 0.02 },
    { year: 2010, anomaly: 0.72, smoothed: 0.62, uncertainty: 0.01 },
    { year: 2015, anomaly: 0.90, smoothed: 0.80, uncertainty: 0.01 },
    { year: 2016, anomaly: 1.01, smoothed: 0.88, uncertainty: 0.01 },
    { year: 2017, anomaly: 0.92, smoothed: 0.92, uncertainty: 0.01 },
    { year: 2018, anomaly: 0.85, smoothed: 0.95, uncertainty: 0.01 },
    { year: 2019, anomaly: 0.98, smoothed: 0.98, uncertainty: 0.01 },
    { year: 2020, anomaly: 1.02, smoothed: 1.02, uncertainty: 0.01 },
    { year: 2021, anomaly: 0.85, smoothed: 1.05, uncertainty: 0.01 },
    { year: 2022, anomaly: 0.89, smoothed: 1.08, uncertainty: 0.01 },
    { year: 2023, anomaly: 1.17, smoothed: 1.15, uncertainty: 0.01 },
    { year: 2024, anomaly: 1.29, smoothed: 1.22, uncertainty: 0.01 },
    { year: 2025, anomaly: 1.35, smoothed: 1.28, uncertainty: 0.01 },
  ],
  co2Data: [
    { year: 1960, co2: 316.91, annual: 3.1 },
    { year: 1965, co2: 320.04, annual: 2.5 },
    { year: 1970, co2: 325.68, annual: 2.9 },
    { year: 1975, co2: 331.08, annual: 3.4 },
    { year: 1980, co2: 338.76, annual: 4.7 },
    { year: 1985, co2: 346.12, annual: 5.0 },
    { year: 1990, co2: 354.16, annual: 3.4 },
    { year: 1995, co2: 360.82, annual: 5.0 },
    { year: 2000, co2: 369.52, annual: 3.1 },
    { year: 2005, co2: 379.80, annual: 5.7 },
    { year: 2010, co2: 389.85, annual: 6.1 },
    { year: 2015, co2: 400.83, annual: 10.1 },
    { year: 2016, co2: 404.21, annual: 8.9 },
    { year: 2017, co2: 406.53, annual: 7.6 },
    { year: 2018, co2: 408.52, annual: 5.2 },
    { year: 2019, co2: 411.66, annual: 5.5 },
    { year: 2020, co2: 414.24, annual: 4.9 },
    { year: 2021, co2: 416.41, annual: 5.2 },
    { year: 2022, co2: 418.56, annual: 5.0 },
    { year: 2023, co2: 421.00, annual: 5.7 },
    { year: 2024, co2: 424.61, annual: 6.2 },
  ],
  seaLevel: [
    { year: 1993, level: 0, uncertainty: 0 },
    { year: 1995, level: 12, uncertainty: 3 },
    { year: 1997, level: 22, uncertainty: 3 },
    { year: 1999, level: 32, uncertainty: 3 },
    { year: 2001, level: 42, uncertainty: 3 },
    { year: 2003, level: 52, uncertainty: 3 },
    { year: 2005, level: 62, uncertainty: 3 },
    { year: 2007, level: 72, uncertainty: 3 },
    { year: 2009, level: 82, uncertainty: 3 },
    { year: 2011, level: 90, uncertainty: 3 },
    { year: 2013, level: 102, uncertainty: 3 },
    { year: 2015, level: 115, uncertainty: 3 },
    { year: 2017, level: 128, uncertainty: 3 },
    { year: 2019, level: 142, uncertainty: 3 },
    { year: 2021, level: 155, uncertainty: 3 },
    { year: 2023, level: 170, uncertainty: 3 },
    { year: 2025, level: 185, uncertainty: 3 },
  ],
  arcticIce: [
    { year: 1980, extent: 7.8, thickness: 3.2 },
    { year: 1985, extent: 7.2, thickness: 2.9 },
    { year: 1990, extent: 6.5, thickness: 2.7 },
    { year: 1995, extent: 6.1, thickness: 2.4 },
    { year: 2000, extent: 5.9, thickness: 2.2 },
    { year: 2005, extent: 5.3, thickness: 1.9 },
    { year: 2007, extent: 4.3, thickness: 1.7 },
    { year: 2010, extent: 4.9, thickness: 1.6 },
    { year: 2012, extent: 3.4, thickness: 1.4 },
    { year: 2015, extent: 4.4, thickness: 1.3 },
    { year: 2016, extent: 4.1, thickness: 1.2 },
    { year: 2018, extent: 4.7, thickness: 1.1 },
    { year: 2020, extent: 3.9, thickness: 1.0 },
    { year: 2022, extent: 4.9, thickness: 0.9 },
    { year: 2024, extent: 4.3, thickness: 0.8 },
    { year: 2025, extent: 4.0, thickness: 0.7 },
  ],
  extremeEvents: [
    { year: 2000, hurricanes: 15, floods: 180, droughts: 45, wildfires: 30, heatwaves: 25 },
    { year: 2005, hurricanes: 18, floods: 210, droughts: 52, wildfires: 38, heatwaves: 32 },
    { year: 2010, hurricanes: 12, floods: 240, droughts: 68, wildfires: 45, heatwaves: 42 },
    { year: 2015, hurricanes: 16, floods: 280, droughts: 75, wildfires: 58, heatwaves: 55 },
    { year: 2016, hurricanes: 14, floods: 290, droughts: 80, wildfires: 62, heatwaves: 60 },
    { year: 2017, hurricanes: 17, floods: 310, droughts: 85, wildfires: 70, heatwaves: 65 },
    { year: 2018, hurricanes: 15, floods: 320, droughts: 90, wildfires: 75, heatwaves: 72 },
    { year: 2019, hurricanes: 18, floods: 340, droughts: 95, wildfires: 82, heatwaves: 78 },
    { year: 2020, hurricanes: 14, floods: 350, droughts: 100, wildfires: 90, heatwaves: 85 },
    { year: 2021, hurricanes: 16, floods: 360, droughts: 105, wildfires: 95, heatwaves: 92 },
    { year: 2022, hurricanes: 14, floods: 380, droughts: 110, wildfires: 100, heatwaves: 98 },
    { year: 2023, hurricanes: 15, floods: 400, droughts: 115, wildfires: 110, heatwaves: 105 },
    { year: 2024, hurricanes: 17, floods: 420, droughts: 120, wildfires: 118, heatwaves: 112 },
    { year: 2025, hurricanes: 18, floods: 440, droughts: 125, wildfires: 125, heatwaves: 120 },
  ],
  predictions: [
    { year: 2025, ssp126: 1.4, ssp245: 1.5, ssp585: 1.6, current: 1.35 },
    { year: 2030, ssp126: 1.5, ssp245: 1.8, ssp585: 2.0, current: null },
    { year: 2035, ssp126: 1.5, ssp245: 2.1, ssp585: 2.5, current: null },
    { year: 2040, ssp126: 1.4, ssp245: 2.4, ssp585: 3.0, current: null },
    { year: 2045, ssp126: 1.3, ssp245: 2.7, ssp585: 3.5, current: null },
    { year: 2050, ssp126: 1.2, ssp245: 3.0, ssp585: 4.0, current: null },
    { year: 2060, ssp126: 1.0, ssp245: 3.4, ssp585: 4.8, current: null },
    { year: 2070, ssp126: 0.8, ssp245: 3.7, ssp585: 5.5, current: null },
    { year: 2080, ssp126: 0.6, ssp245: 3.9, ssp585: 6.0, current: null },
    { year: 2090, ssp126: 0.5, ssp245: 4.0, ssp585: 6.5, current: null },
    { year: 2100, ssp126: 0.4, ssp245: 4.1, ssp585: 7.0, current: null },
  ],
  regionalRisk: [
    { region: 'Sub-Saharan Africa', drought: 92, flood: 78, heat: 95, food: 88, overall: 88 },
    { region: 'South Asia', drought: 75, flood: 95, heat: 90, food: 82, overall: 86 },
    { region: 'Southeast Asia', drought: 60, flood: 92, heat: 70, food: 65, overall: 72 },
    { region: 'Middle East', drought: 98, flood: 45, heat: 97, food: 90, overall: 83 },
    { region: 'Central America', drought: 80, flood: 85, heat: 75, food: 78, overall: 80 },
    { region: 'Pacific Islands', drought: 50, flood: 98, heat: 60, food: 70, overall: 70 },
    { region: 'Arctic', drought: 30, flood: 40, heat: 99, food: 55, overall: 56 },
    { region: 'Europe', drought: 55, flood: 65, heat: 72, food: 40, overall: 58 },
  ],
  carbonBudget: [
    { sector: 'Energy', emissions: 35.8, share: 36.2 },
    { sector: 'Industry', emissions: 20.2, share: 20.4 },
    { sector: 'Agriculture', emissions: 12.0, share: 12.1 },
    { sector: 'Transport', emissions: 16.2, share: 16.4 },
    { sector: 'Buildings', emissions: 8.9, share: 9.0 },
    { sector: 'Other', emissions: 5.9, share: 5.9 },
  ],
  renewableAdoption: [
    { year: 2010, solar: 0.2, wind: 0.4, hydro: 1.6, nuclear: 1.2, fossil: 8.1 },
    { year: 2015, solar: 0.6, wind: 0.8, hydro: 1.7, nuclear: 1.1, fossil: 8.3 },
    { year: 2018, solar: 1.0, wind: 1.1, hydro: 1.7, nuclear: 1.0, fossil: 8.5 },
    { year: 2020, solar: 1.4, wind: 1.4, hydro: 1.7, nuclear: 0.9, fossil: 8.1 },
    { year: 2022, solar: 1.9, wind: 1.7, hydro: 1.7, nuclear: 0.9, fossil: 8.0 },
    { year: 2024, solar: 2.5, wind: 2.0, hydro: 1.7, nuclear: 0.9, fossil: 7.8 },
    { year: 2025, solar: 2.9, wind: 2.2, hydro: 1.7, nuclear: 0.9, fossil: 7.6 },
  ],
  oceanPH: [
    { year: 1850, ph: 8.17 },
    { year: 1900, ph: 8.15 },
    { year: 1950, ph: 8.12 },
    { year: 1980, ph: 8.09 },
    { year: 2000, ph: 8.06 },
    { year: 2010, ph: 8.04 },
    { year: 2020, ph: 8.02 },
    { year: 2024, ph: 8.00 },
    { year: 2025, ph: 7.99 },
  ],
  methane: [
    { year: 2000, ch4: 1774 },
    { year: 2005, ch4: 1786 },
    { year: 2010, ch4: 1803 },
    { year: 2015, ch4: 1834 },
    { year: 2018, ch4: 1866 },
    { year: 2020, ch4: 1890 },
    { year: 2022, ch4: 1912 },
    { year: 2024, ch4: 1934 },
    { year: 2025, ch4: 1945 },
  ],
};

const COLORS = {
  primary: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  orange: '#f97316',
  pink: '#ec4899',
  teal: '#14b8a6',
};

const SecretDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  if (user?.email?.toLowerCase() !== ADMIN_EMAIL) {
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

  const currentTemp = SECRET_DASHBOARD_DATA.temperatureAnomalies[SECRET_DASHBOARD_DATA.temperatureAnomalies.length - 1];
  const currentCO2 = SECRET_DASHBOARD_DATA.co2Data[SECRET_DASHBOARD_DATA.co2Data.length - 1];
  const currentSeaLevel = SECRET_DASHBOARD_DATA.seaLevel[SECRET_DASHBOARD_DATA.seaLevel.length - 1];
  const currentIce = SECRET_DASHBOARD_DATA.arcticIce[SECRET_DASHBOARD_DATA.arcticIce.length - 1];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-r from-emerald-900 via-teal-900 to-cyan-900 text-white py-4 px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Climate Intelligence Dashboard
            </h1>
            <p className="text-xs text-white/60">Advanced Climate Analysis & Predictions</p>
          </div>
          <Badge variant="outline" className="border-white/30 text-white/80 text-xs">
            CLASSIFIED
          </Badge>
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto px-4 py-4 space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Thermometer className="w-4 h-4 text-red-500" />
                <span className="text-xs text-muted-foreground">Temp Anomaly</span>
              </div>
              <p className="text-xl font-bold text-red-600">+{currentTemp.anomaly}°C</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-red-500" />
                <span className="text-xs text-red-500">+0.06°C/yr</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wind className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">CO₂ Level</span>
              </div>
              <p className="text-xl font-bold text-orange-600">{currentCO2.co2} ppm</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-orange-500" />
                <span className="text-xs text-orange-500">+{currentCO2.annual} ppm/yr</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Waves className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Sea Level</span>
              </div>
              <p className="text-xl font-bold text-blue-600">+{currentSeaLevel.level}mm</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-blue-500" />
                <span className="text-xs text-blue-500">+3.4mm/yr</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-cyan-500">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Snowflake className="w-4 h-4 text-cyan-500" />
                <span className="text-xs text-muted-foreground">Arctic Ice</span>
              </div>
              <p className="text-xl font-bold text-cyan-600">{currentIce.extent}M km²</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingDown className="w-3 h-3 text-cyan-500" />
                <span className="text-xs text-cyan-500">-13%/decade</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="predictions" className="text-xs">Predictions</TabsTrigger>
            <TabsTrigger value="regional" className="text-xs">Regional</TabsTrigger>
            <TabsTrigger value="emissions" className="text-xs">Emissions</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Temperature Anomaly Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-red-500" />
                  Global Temperature Anomaly (1880-2025)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={SECRET_DASHBOARD_DATA.temperatureAnomalies}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={[-0.5, 1.5]} unit="°C" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Area type="monotone" dataKey="smoothed" stroke={COLORS.danger} fill={COLORS.danger} fillOpacity={0.2} name="Smoothed" />
                    <Area type="monotone" dataKey="anomaly" stroke={COLORS.warning} fill={COLORS.warning} fillOpacity={0.1} name="Annual" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* CO2 & Methane Combined */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Wind className="w-4 h-4 text-orange-500" />
                    Atmospheric CO₂ (1960-2024)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={SECRET_DASHBOARD_DATA.co2Data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} domain={[300, 430]} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="co2" stroke={COLORS.orange} strokeWidth={2} dot={false} name="CO₂ (ppm)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-500" />
                    Methane Concentration (2000-2025)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={SECRET_DASHBOARD_DATA.methane}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} domain={[1750, 2000]} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="ch4" stroke={COLORS.purple} strokeWidth={2} dot={false} name="CH₄ (ppb)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Sea Level & Arctic Ice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Waves className="w-4 h-4 text-blue-500" />
                    Global Sea Level Rise (1993-2025)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={SECRET_DASHBOARD_DATA.seaLevel}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="mm" />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="level" stroke={COLORS.info} fill={COLORS.info} fillOpacity={0.3} name="Sea Level (mm)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Snowflake className="w-4 h-4 text-cyan-500" />
                    Arctic Sea Ice Extent (1980-2025)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={SECRET_DASHBOARD_DATA.arcticIce}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={[0, 9]} unit="M km²" />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} domain={[0, 4]} unit="m" />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar yAxisId="left" dataKey="extent" fill={COLORS.cyan} fillOpacity={0.6} name="Extent (M km²)" />
                      <Line yAxisId="right" type="monotone" dataKey="thickness" stroke={COLORS.pink} strokeWidth={2} name="Thickness (m)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Extreme Weather Events */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CloudLightning className="w-4 h-4 text-yellow-500" />
                  Extreme Weather Events Frequency (2000-2025)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={SECRET_DASHBOARD_DATA.extremeEvents}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="hurricanes" stackId="a" fill={COLORS.info} name="Hurricanes" />
                    <Bar dataKey="floods" stackId="a" fill={COLORS.cyan} name="Floods" />
                    <Bar dataKey="droughts" stackId="a" fill={COLORS.warning} name="Droughts" />
                    <Bar dataKey="wildfires" stackId="a" fill={COLORS.danger} name="Wildfires" />
                    <Bar dataKey="heatwaves" stackId="a" fill={COLORS.orange} name="Heatwaves" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Ocean Acidification */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-teal-500" />
                  Ocean Acidification (pH) - 1850 to Present
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={SECRET_DASHBOARD_DATA.oceanPH}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={[7.95, 8.20]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="ph" stroke={COLORS.teal} strokeWidth={2} dot={{ r: 3 }} name="Ocean pH" />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">
                  Ocean pH has decreased by 0.11 units since pre-industrial times, representing a 30% increase in acidity.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PREDICTIONS TAB */}
          <TabsContent value="predictions" className="space-y-4 mt-4">
            {/* SSP Scenarios */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Temperature Projections by SSP Scenario (2025-2100)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={SECRET_DASHBOARD_DATA.predictions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 8]} unit="°C" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="ssp126" stroke={COLORS.primary} strokeWidth={2} name="SSP1-2.6 (Best Case)" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="ssp245" stroke={COLORS.warning} strokeWidth={2} name="SSP2-4.5 (Moderate)" />
                    <Line type="monotone" dataKey="ssp585" stroke={COLORS.danger} strokeWidth={2} name="SSP5-8.5 (Worst Case)" />
                    <Line type="monotone" dataKey="current" stroke={COLORS.cyan} strokeWidth={3} dot={{ r: 4 }} name="Observed" connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>SSP1-2.6:</strong> Sustainability pathway | <strong>SSP2-4.5:</strong> Middle of the road | <strong>SSP5-8.5:</strong> Fossil-fueled development
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sea Level Projections */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Waves className="w-4 h-4 text-blue-500" />
                  Sea Level Rise Projections (2025-2100)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={[
                    { year: 2025, low: 0.20, mid: 0.25, high: 0.32 },
                    { year: 2030, low: 0.25, mid: 0.33, high: 0.45 },
                    { year: 2040, low: 0.35, mid: 0.50, high: 0.72 },
                    { year: 2050, low: 0.45, mid: 0.68, high: 1.00 },
                    { year: 2060, low: 0.55, mid: 0.85, high: 1.30 },
                    { year: 2070, low: 0.62, mid: 1.00, high: 1.62 },
                    { year: 2080, low: 0.68, mid: 1.15, high: 1.95 },
                    { year: 2090, low: 0.72, mid: 1.28, high: 2.30 },
                    { year: 2100, low: 0.75, mid: 1.40, high: 2.65 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit="m" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Area type="monotone" dataKey="high" stroke={COLORS.danger} fill={COLORS.danger} fillOpacity={0.1} name="High (RCP8.5)" />
                    <Area type="monotone" dataKey="mid" stroke={COLORS.warning} fill={COLORS.warning} fillOpacity={0.2} name="Medium (RCP4.5)" />
                    <Area type="monotone" dataKey="low" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} name="Low (RCP2.6)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Tipping Points */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Climate Tipping Points Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'AMOC Collapse', risk: 45, threshold: '1.5-3.0°C', status: 'Medium', color: COLORS.warning },
                    { name: 'Greenland Ice Sheet', risk: 65, threshold: '1.0-2.5°C', status: 'High', color: COLORS.danger },
                    { name: 'Amazon Rainforest Dieback', risk: 55, threshold: '2.0-3.5°C', status: 'High', color: COLORS.danger },
                    { name: 'Permafrost Carbon Release', risk: 72, threshold: '1.5-2.0°C', status: 'Very High', color: COLORS.danger },
                    { name: 'Coral Reef Die-off', risk: 85, threshold: '1.0-1.5°C', status: 'Critical', color: COLORS.danger },
                    { name: 'West Antarctic Ice Sheet', risk: 35, threshold: '2.0-4.0°C', status: 'Medium', color: COLORS.warning },
                    { name: 'Boreal Forest Shift', risk: 40, threshold: '2.5-4.0°C', status: 'Medium', color: COLORS.warning },
                    { name: 'Arctic Summer Ice-free', risk: 78, threshold: '1.0-2.0°C', status: 'Very High', color: COLORS.danger },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{item.name}</span>
                          <span className="text-xs" style={{ color: item.color }}>{item.status}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ width: `${item.risk}%`, backgroundColor: item.color }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">Threshold: {item.threshold}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* REGIONAL TAB */}
          <TabsContent value="regional" className="space-y-4 mt-4">
            {/* Regional Risk Radar */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  Regional Climate Vulnerability Index
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={SECRET_DASHBOARD_DATA.regionalRisk}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="region" tick={{ fontSize: 9 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Drought" dataKey="drought" stroke={COLORS.warning} fill={COLORS.warning} fillOpacity={0.2} />
                    <Radar name="Flood" dataKey="flood" stroke={COLORS.info} fill={COLORS.info} fillOpacity={0.2} />
                    <Radar name="Heat" dataKey="heat" stroke={COLORS.danger} fill={COLORS.danger} fillOpacity={0.2} />
                    <Radar name="Food Security" dataKey="food" stroke={COLORS.purple} fill={COLORS.purple} fillOpacity={0.2} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Regional Risk Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  Regional Risk Scores (0-100)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Region</th>
                        <th className="text-center py-2 px-2">Drought</th>
                        <th className="text-center py-2 px-2">Flood</th>
                        <th className="text-center py-2 px-2">Heat</th>
                        <th className="text-center py-2 px-2">Food</th>
                        <th className="text-center py-2 px-2">Overall</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SECRET_DASHBOARD_DATA.regionalRisk.map((row) => (
                        <tr key={row.region} className="border-b border-muted">
                          <td className="py-2 px-2 font-medium">{row.region}</td>
                          <td className="text-center py-2 px-2">
                            <span className={row.drought > 80 ? 'text-red-500 font-bold' : row.drought > 60 ? 'text-orange-500' : ''}>
                              {row.drought}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className={row.flood > 80 ? 'text-red-500 font-bold' : row.flood > 60 ? 'text-orange-500' : ''}>
                              {row.flood}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className={row.heat > 80 ? 'text-red-500 font-bold' : row.heat > 60 ? 'text-orange-500' : ''}>
                              {row.heat}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <span className={row.food > 80 ? 'text-red-500 font-bold' : row.food > 60 ? 'text-orange-500' : ''}>
                              {row.food}
                            </span>
                          </td>
                          <td className="text-center py-2 px-2">
                            <Badge variant={row.overall > 80 ? 'destructive' : row.overall > 65 ? 'default' : 'outline'} className="text-xs">
                              {row.overall}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Africa Focus */}
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sun className="w-4 h-4 text-yellow-500" />
                  Africa Climate Outlook (2025-2035)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <p className="text-xs font-medium text-red-600">Sahel Region</p>
                    <p className="text-lg font-bold">+2.1°C</p>
                    <p className="text-xs text-muted-foreground">Projected warming by 2035</p>
                  </div>
                  <div className="p-3 bg-orange-500/10 rounded-lg">
                    <p className="text-xs font-medium text-orange-600">East Africa</p>
                    <p className="text-lg font-bold">+40%</p>
                    <p className="text-xs text-muted-foreground">Extreme rainfall variability</p>
                  </div>
                  <div className="p-3 bg-yellow-500/10 rounded-lg">
                    <p className="text-xs font-medium text-yellow-600">Southern Africa</p>
                    <p className="text-lg font-bold">-25%</p>
                    <p className="text-xs text-muted-foreground">Maize yield decline projected</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Key Finding:</strong> Sub-Saharan Africa faces compound risks from drought intensification, 
                    reduced agricultural productivity, and increased vector-borne disease range expansion. 
                    Adaptation investment gap estimated at $40B/year by 2030.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* EMISSIONS TAB */}
          <TabsContent value="emissions" className="space-y-4 mt-4">
            {/* Carbon Budget by Sector */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-emerald-500" />
                  Global CO₂ Emissions by Sector (2024)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={SECRET_DASHBOARD_DATA.carbonBudget} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis type="number" tick={{ fontSize: 10 }} unit=" Gt" />
                      <YAxis type="category" dataKey="sector" tick={{ fontSize: 10 }} width={70} />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="emissions" name="Emissions (Gt CO₂)">
                        {SECRET_DASHBOARD_DATA.carbonBudget.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={[COLORS.danger, COLORS.orange, COLORS.warning, COLORS.info, COLORS.purple, COLORS.teal][index]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {SECRET_DASHBOARD_DATA.carbonBudget.map((item, i) => (
                      <div key={item.sector} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: [COLORS.danger, COLORS.orange, COLORS.warning, COLORS.info, COLORS.purple, COLORS.teal][i] }} />
                        <span className="text-xs flex-1">{item.sector}</span>
                        <span className="text-xs font-bold">{item.emissions} Gt</span>
                        <span className="text-xs text-muted-foreground">({item.share}%)</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Total</span>
                        <span className="text-xs font-bold">99.0 Gt CO₂</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Renewable Energy Transition */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sun className="w-4 h-4 text-yellow-500" />
                  Global Energy Mix Transition (2010-2025)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={SECRET_DASHBOARD_DATA.renewableAdoption}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit=" EJ" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Area type="monotone" dataKey="solar" stackId="1" stroke={COLORS.warning} fill={COLORS.warning} fillOpacity={0.6} name="Solar" />
                    <Area type="monotone" dataKey="wind" stackId="1" stroke={COLORS.cyan} fill={COLORS.cyan} fillOpacity={0.6} name="Wind" />
                    <Area type="monotone" dataKey="hydro" stackId="1" stroke={COLORS.info} fill={COLORS.info} fillOpacity={0.6} name="Hydro" />
                    <Area type="monotone" dataKey="nuclear" stackId="1" stroke={COLORS.purple} fill={COLORS.purple} fillOpacity={0.6} name="Nuclear" />
                    <Area type="monotone" dataKey="fossil" stackId="1" stroke={COLORS.danger} fill={COLORS.danger} fillOpacity={0.4} name="Fossil Fuels" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Carbon Budget Remaining */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-500" />
                  Remaining Carbon Budget (1.5°C Target)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Budget Consumed</span>
                      <span className="text-sm font-bold text-red-500">82% used</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-4">
                      <div className="h-4 rounded-full bg-gradient-to-r from-red-500 to-red-700" style={{ width: '82%' }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">0 Gt</span>
                      <span className="text-xs text-muted-foreground">~500 Gt remaining</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <p className="text-lg font-bold text-red-500">~200 Gt</p>
                      <p className="text-xs text-muted-foreground">Remaining for 1.5°C</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <p className="text-lg font-bold text-orange-500">~900 Gt</p>
                      <p className="text-xs text-muted-foreground">Remaining for 2.0°C</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <p className="text-lg font-bold">~12 years</p>
                      <p className="text-xs text-muted-foreground">At current rate (1.5°C)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* NDC Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  Nationally Determined Contributions (NDC) Gap Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { country: 'EU', current: 55, needed: 65, gap: 10 },
                    { country: 'USA', current: 50, needed: 60, gap: 10 },
                    { country: 'China', current: 30, needed: 55, gap: 25 },
                    { country: 'India', current: 25, needed: 50, gap: 25 },
                    { country: 'Brazil', current: 40, needed: 55, gap: 15 },
                    { country: 'Africa', current: 15, needed: 45, gap: 30 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="country" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="current" stackId="a" fill={COLORS.primary} name="Current NDC (%)" />
                    <Bar dataKey="gap" stackId="a" fill={COLORS.danger} name="Ambition Gap (%)" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2">
                  Current NDCs project 2.5-2.9°C warming by 2100. The ambition gap shows additional reductions needed for 1.5°C.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center py-4 border-t">
          <p className="text-xs text-muted-foreground">
            Data sources: NASA GISS, NOAA, IPCC AR6, Global Carbon Project, Copernicus Climate Change Service
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Last updated: August 2025 | Classification: Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
};

export default SecretDashboard;
