import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Satellite, Crosshair, MapPin, Loader2, Bug, Droplets, Leaf, Trash2, RefreshCw,
  ArrowLeft, AlertTriangle, Radar, Camera,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { toast } from 'sonner';
import SEO from '@/components/SEO';

interface FarmZone {
  id: string;
  name: string;
  crop: string | null;
  latitude: number;
  longitude: number;
  radius_m: number;
  notes: string | null;
  monitoring_enabled: boolean;
  last_report: any;
  last_scanned_at: string | null;
}

const riskColor = (score?: number) => {
  const s = score ?? 0;
  if (s >= 70) return 'text-destructive';
  if (s >= 40) return 'text-amber-600';
  return 'text-primary';
};

const MapClickHandler = ({ onPick }: { onPick: (lat: number, lng: number) => void }) => {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
};

const MapFocus = ({ center, zoom }: { center: [number, number]; zoom?: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom ?? map.getZoom(), { animate: true });
  }, [center, zoom, map]);
  return null;
};

const SatelliteMonitor = () => {
  const { user } = useAuth();
  const { getLocation } = useLocation();
  const navigate = useNavigate();

  const [center, setCenter] = useState<[number, number]>([-26.3054, 31.1367]);
  const [zoom, setZoom] = useState(16);
  const [zones, setZones] = useState<FarmZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [draft, setDraft] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState({ name: '', crop: '', radius: 100, notes: '' });

  const loadZones = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('farm_zones')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Could not load your farm zones');
    } else {
      setZones((data || []) as unknown as FarmZone[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadZones(); }, [loadZones]);

  // Live updates: any change to my zones (from this or another device) reflects instantly.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('farm-zones-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'farm_zones' }, () => loadZones())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadZones]);

  useEffect(() => {
    if (zones.length && !selectedId) {
      setSelectedId(zones[0].id);
      setCenter([Number(zones[0].latitude), Number(zones[0].longitude)]);
    }
  }, [zones, selectedId]);

  const locateMe = async () => {
    try {
      setLocating(true);
      const loc = await getLocation({ preferGps: true });
      setCenter([loc.latitude, loc.longitude]);
      setZoom(17);
      toast.success(`Centered on ${loc.city || 'your position'}`);
    } catch {
      toast.error('Could not get your location');
    } finally {
      setLocating(false);
    }
  };

  const saveZone = async () => {
    if (!draft || !user) return;
    if (!form.name.trim()) { toast.error('Give this section a name'); return; }
    const { error } = await supabase.from('farm_zones').insert({
      user_id: user.id,
      name: form.name.trim(),
      crop: form.crop.trim() || null,
      latitude: draft.lat,
      longitude: draft.lng,
      radius_m: form.radius,
      notes: form.notes.trim() || null,
    });
    if (error) { toast.error('Could not save the zone'); return; }
    toast.success('Zone marked for monitoring');
    setDraft(null);
    setForm({ name: '', crop: '', radius: 100, notes: '' });
    loadZones();
  };

  const toggleMonitoring = async (zone: FarmZone) => {
    await supabase.from('farm_zones')
      .update({ monitoring_enabled: !zone.monitoring_enabled })
      .eq('id', zone.id);
    loadZones();
  };

  const deleteZone = async (id: string) => {
    await supabase.from('farm_zones').delete().eq('id', id);
    toast.success('Zone removed');
    setSelectedId((s) => (s === id ? null : s));
    loadZones();
  };

  const scanZone = async (zone: FarmZone) => {
    try {
      setScanningId(zone.id);
      const { data, error } = await supabase.functions.invoke('satellite-monitor', {
        body: {
          latitude: Number(zone.latitude),
          longitude: Number(zone.longitude),
          name: zone.name,
          crop: zone.crop,
          radius_m: Number(zone.radius_m),
        },
      });
      if (error) throw error;
      await supabase.from('farm_zones')
        .update({ last_report: data, last_scanned_at: new Date().toISOString() })
        .eq('id', zone.id);
      toast.success(`${zone.name} scanned`);
      loadZones();
    } catch (e: any) {
      toast.error(e?.message?.includes('429') ? 'Scanner is busy, try again shortly' : 'Zone scan failed');
    } finally {
      setScanningId(null);
    }
  };

  const scanAll = async () => {
    const active = zones.filter((z) => z.monitoring_enabled);
    if (!active.length) { toast.error('No zones set to monitor'); return; }
    for (const z of active) await scanZone(z);
  };

  const selected = useMemo(() => zones.find((z) => z.id === selectedId) || null, [zones, selectedId]);
  const report = selected?.last_report;

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO
        title="Satellite Farm Monitor — Imvelo"
        description="View your farm from satellite imagery, mark sections for constant monitoring, and get pest and crop-stress alerts for every zone."
        path="/satellite-monitor"
      />

      <header className="bg-primary text-primary-foreground px-4 py-4">
        <div className="max-w-screen-sm mx-auto">
          <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm opacity-90 mb-2">
            <ArrowLeft className="w-4 h-4" /> Home
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Satellite className="w-6 h-6" /> Satellite Farm Monitor
          </h1>
          <p className="text-sm opacity-90 mt-1">
            Tap the map to mark a section of your farm, then keep it under constant watch for pests and stress.
          </p>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-4 space-y-4">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={locateMe} disabled={locating}>
            {locating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Crosshair className="w-4 h-4 mr-1" />}
            My farm
          </Button>
          <Button size="sm" className="flex-1" onClick={scanAll} disabled={!!scanningId}>
            {scanningId ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Radar className="w-4 h-4 mr-1" />}
            Scan all zones
          </Button>
        </div>

        <div className="rounded-xl overflow-hidden border border-border">
          <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom
            style={{ height: 320, width: '100%' }}
          >
            <TileLayer
              attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
            <MapFocus center={center} zoom={zoom} />
            <MapClickHandler onPick={(lat, lng) => setDraft({ lat, lng })} />
            {zones.map((z) => (
              <Circle
                key={z.id}
                center={[Number(z.latitude), Number(z.longitude)]}
                radius={Number(z.radius_m)}
                pathOptions={{
                  color: z.id === selectedId ? '#fbbf24' : z.monitoring_enabled ? '#22c55e' : '#94a3b8',
                  weight: 2,
                  fillOpacity: 0.2,
                }}
                eventHandlers={{ click: () => setSelectedId(z.id) }}
              />
            ))}
            {draft && (
              <Circle
                center={[draft.lat, draft.lng]}
                radius={form.radius}
                pathOptions={{ color: '#f97316', dashArray: '6', weight: 2, fillOpacity: 0.15 }}
              />
            )}
          </MapContainer>
        </div>
        <p className="text-xs text-muted-foreground">
          Tip: pinch to zoom into your field, then tap the exact block you want monitored.
        </p>

        {/* Zone list */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : zones.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center space-y-2">
                <MapPin className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No zones yet. Tap anywhere on the satellite map to mark your first field section.</p>
              </CardContent>
            </Card>
          ) : (
            zones.map((z) => (
              <Card key={z.id} className={z.id === selectedId ? 'border-primary' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <button className="text-left" onClick={() => { setSelectedId(z.id); setCenter([Number(z.latitude), Number(z.longitude)]); }}>
                      <CardTitle className="text-base">{z.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {z.crop || 'Mixed'} · {Number(z.radius_m)} m radius
                        {z.last_scanned_at ? ` · scanned ${new Date(z.last_scanned_at).toLocaleString()}` : ' · never scanned'}
                      </p>
                    </button>
                    <Switch checked={z.monitoring_enabled} onCheckedChange={() => toggleMonitoring(z)} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {z.last_report?.pest_risk && (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <Leaf className="w-3 h-3" /> Health {z.last_report?.vegetation_health?.index ?? '—'}
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Bug className="w-3 h-3" /> Pest {z.last_report.pest_risk.level}
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Droplets className="w-3 h-3" /> {z.last_report?.moisture_status?.level ?? '—'}
                      </Badge>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => scanZone(z)} disabled={scanningId === z.id}>
                      {scanningId === z.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                      Scan now
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteZone(z.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Selected zone report */}
        {selected && report && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Radar className="w-4 h-4 text-primary" /> {selected.name} — field report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {report.vegetation_health && (
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Vegetation health</span>
                    <span>{report.vegetation_health.index}/100 · {report.vegetation_health.label}</span>
                  </div>
                  <Progress value={Number(report.vegetation_health.index) || 0} />
                  <p className="text-muted-foreground mt-1">{report.vegetation_health.summary}</p>
                </div>
              )}

              {report.pest_risk && (
                <div>
                  <p className={`font-medium flex items-center gap-1 ${riskColor(report.pest_risk.score)}`}>
                    <Bug className="w-4 h-4" /> Pest pressure: {report.pest_risk.level} ({report.pest_risk.score}/100)
                  </p>
                  <div className="mt-2 space-y-2">
                    {(report.pest_risk.likely_pests || []).map((p: any, i: number) => (
                      <div key={i} className="rounded-lg border border-border p-2">
                        <p className="font-medium">{p.name} <span className="text-xs text-muted-foreground">({p.risk})</span></p>
                        <p className="text-xs text-muted-foreground">{p.why}</p>
                        {p.scouting_tip && <p className="text-xs mt-1">Scout: {p.scouting_tip}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.disease_risk && (
                <p className={riskColor(report.disease_risk.score)}>
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Disease risk: {report.disease_risk.level} — {report.disease_risk.notes}
                </p>
              )}

              {report.moisture_status && (
                <p className="text-muted-foreground">
                  <Droplets className="w-4 h-4 inline mr-1 text-primary" />
                  Moisture: {report.moisture_status.level} — {report.moisture_status.summary}
                </p>
              )}

              {!!(report.actions || []).length && (
                <div>
                  <p className="font-medium mb-1">Recommended actions</p>
                  <ul className="space-y-1">
                    {report.actions.map((a: any, i: number) => (
                      <li key={i} className="text-muted-foreground">
                        <span className="font-medium text-foreground">[{a.priority}]</span> {a.action} — {a.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.observed && (
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Rain last 7d: {report.observed.rain_past_7d_mm} mm</span>
                  <span>Rain next 7d: {report.observed.rain_next_7d_mm} mm</span>
                  <span>Soil moisture: {report.observed.soil_moisture ?? '—'}</span>
                  <span>Max temp: {report.observed.max_temp_c ?? '—'}°C</span>
                </div>
              )}

              <Button variant="outline" className="w-full" onClick={() => navigate('/scanner')}>
                <Camera className="w-4 h-4 mr-2" /> Confirm with a photo scan
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Advisory only — based on satellite imagery context and weather signals. Confirm in-field before applying chemicals.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* New zone dialog */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark this section</DialogTitle>
            <DialogDescription>
              {draft ? `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="zname">Section name</Label>
              <Input id="zname" value={form.name} placeholder="e.g. Lower maize block"
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="zcrop">Crop</Label>
              <Input id="zcrop" value={form.crop} placeholder="e.g. Maize"
                onChange={(e) => setForm({ ...form, crop: e.target.value })} />
            </div>
            <div>
              <Label>Monitored radius: {form.radius} m</Label>
              <Slider className="mt-2" min={20} max={1000} step={10} value={[form.radius]}
                onValueChange={(v) => setForm({ ...form, radius: v[0] })} />
            </div>
            <div>
              <Label htmlFor="znotes">Notes</Label>
              <Textarea id="znotes" rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={saveZone}>Start monitoring</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SatelliteMonitor;
