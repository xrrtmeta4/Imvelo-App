import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

interface RotationItem {
  id: string;
  plot_name: string;
  plot_size: number | null;
  plot_unit: string;
  current_season: string | null;
  current_crop: string | null;
  soil_type: string | null;
  rotation_plan: { season: string; crop: string }[];
  notes: string | null;
}

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const CROPS = ['Maize', 'Beans', 'Sorghum', 'Sweet Potato', 'Groundnuts', 'Cowpeas', 'Vegetables', 'Fallow', 'Other'];
const SOIL_TYPES = ['Clay', 'Sandy', 'Loam', 'Silt', 'Clay Loam', 'Sandy Loam'];

const CropRotation = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plots, setPlots] = useState<RotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ plot_name: '', plot_size: '', plot_unit: 'hectares', current_crop: '', current_season: '', soil_type: '', notes: '' });
  const [rotationEntries, setRotationEntries] = useState<{ season: string; crop: string }[]>([]);

  const fetchPlots = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('crop_rotations').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setPlots((data as any[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPlots(); }, [fetchPlots]);

  const handleAdd = async () => {
    if (!user || !form.plot_name) return;
    const { error } = await supabase.from('crop_rotations').insert({
      user_id: user.id, plot_name: form.plot_name,
      plot_size: form.plot_size ? Number(form.plot_size) : null,
      plot_unit: form.plot_unit, current_crop: form.current_crop || null,
      current_season: form.current_season || null, soil_type: form.soil_type || null,
      rotation_plan: rotationEntries, notes: form.notes || null
    } as any);
    if (error) { toast.error('Failed to add plot'); return; }
    toast.success('Plot added!');
    setShowAdd(false);
    setForm({ plot_name: '', plot_size: '', plot_unit: 'hectares', current_crop: '', current_season: '', soil_type: '', notes: '' });
    setRotationEntries([]);
    fetchPlots();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('crop_rotations').delete().eq('id', id);
    toast.success('Plot removed');
    fetchPlots();
  };

  const addRotationEntry = () => setRotationEntries([...rotationEntries, { season: '', crop: '' }]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-green-700 to-green-600 text-white py-6 px-4">
        <div className="max-w-screen-sm mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/80 mb-3 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
          <h1 className="text-2xl font-bold">🔄 Crop Rotation Planner</h1>
          <p className="text-white/80 text-sm">Optimize soil health with smart rotations</p>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-4 space-y-4">
        <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <p className="text-xs text-green-800 dark:text-green-200">💡 <strong>Tip:</strong> Rotate legumes (beans, groundnuts) with cereals (maize, sorghum) to naturally restore nitrogen in your soil.</p>
        </Card>

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button className="w-full gap-2"><Plus className="w-4 h-4" /> Add Plot</Button></DialogTrigger>
          <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Plot & Rotation</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Plot Name *</Label><Input value={form.plot_name} onChange={e => setForm({ ...form, plot_name: e.target.value })} placeholder="e.g. Field A" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Size</Label><Input type="number" value={form.plot_size} onChange={e => setForm({ ...form, plot_size: e.target.value })} /></div>
                <div><Label>Unit</Label>
                  <Select value={form.plot_unit} onValueChange={v => setForm({ ...form, plot_unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="hectares">Hectares</SelectItem><SelectItem value="acres">Acres</SelectItem><SelectItem value="sqm">m²</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Soil Type</Label>
                <Select value={form.soil_type} onValueChange={v => setForm({ ...form, soil_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{SOIL_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Current Crop</Label>
                <Select value={form.current_crop} onValueChange={v => setForm({ ...form, current_crop: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{CROPS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Current Season</Label>
                <Select value={form.current_season} onValueChange={v => setForm({ ...form, current_season: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{SEASONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <div className="flex justify-between items-center"><Label>Rotation Plan</Label><Button variant="outline" size="sm" onClick={addRotationEntry}><Plus className="w-3 h-3" /></Button></div>
                {rotationEntries.map((entry, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 mt-2">
                    <Select value={entry.season} onValueChange={v => { const e = [...rotationEntries]; e[i].season = v; setRotationEntries(e); }}>
                      <SelectTrigger><SelectValue placeholder="Season" /></SelectTrigger>
                      <SelectContent>{SEASONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={entry.crop} onValueChange={v => { const e = [...rotationEntries]; e[i].crop = v; setRotationEntries(e); }}>
                      <SelectTrigger><SelectValue placeholder="Crop" /></SelectTrigger>
                      <SelectContent>{CROPS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <Button onClick={handleAdd} className="w-full" disabled={!form.plot_name}>Save Plot</Button>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? <p className="text-center text-muted-foreground py-8">Loading...</p> :
          plots.length === 0 ? <Card className="p-8 text-center"><p className="text-muted-foreground">No plots yet. Start planning your rotations!</p></Card> :
          plots.map(p => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-foreground">{p.plot_name}</h3>
                    <p className="text-sm text-muted-foreground">{p.plot_size && `${p.plot_size} ${p.plot_unit}`} {p.soil_type && `· ${p.soil_type}`}</p>
                  </div>
                  <button onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
                {p.current_crop && <Badge variant="outline" className="mt-2 bg-primary/10 text-primary border-primary/20">{p.current_season}: {p.current_crop}</Badge>}
                {p.rotation_plan?.length > 0 && (
                  <div className="mt-3 flex gap-1 flex-wrap">
                    {p.rotation_plan.map((r: any, i: number) => (
                      <div key={i} className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px]">{r.season}: {r.crop}</Badge>
                        {i < p.rotation_plan.length - 1 && <RotateCcw className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  );
};

export default CropRotation;
