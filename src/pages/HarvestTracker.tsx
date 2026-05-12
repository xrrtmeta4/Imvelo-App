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
import { ArrowLeft, Plus, TrendingUp, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

interface HarvestItem {
  id: string;
  crop_name: string;
  plot_name: string | null;
  harvest_date: string;
  quantity: number;
  unit: string;
  quality_grade: string;
  season: string | null;
  revenue: number | null;
  notes: string | null;
}

const CROPS = ['Maize', 'Beans', 'Sorghum', 'Sweet Potato', 'Groundnuts', 'Tomatoes', 'Cabbage', 'Sugarcane', 'Other'];
const GRADES = ['A', 'B', 'C', 'D'];

const HarvestTracker = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [harvests, setHarvests] = useState<HarvestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ crop_name: '', plot_name: '', harvest_date: new Date().toISOString().split('T')[0], quantity: '', unit: 'kg', quality_grade: 'A', season: '', revenue: '', notes: '' });

  const fetchHarvests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('harvests').select('*').eq('user_id', user.id).order('harvest_date', { ascending: false });
    setHarvests((data as any[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchHarvests(); }, [fetchHarvests]);

  const handleAdd = async () => {
    if (!user || !form.crop_name || !form.quantity) return;
    const { error } = await supabase.from('harvests').insert({
      user_id: user.id, crop_name: form.crop_name, plot_name: form.plot_name || null,
      harvest_date: form.harvest_date, quantity: Number(form.quantity), unit: form.unit,
      quality_grade: form.quality_grade, season: form.season || null,
      revenue: form.revenue ? Number(form.revenue) : null, notes: form.notes || null
    } as any);
    if (error) { toast.error('Failed to log harvest'); return; }
    toast.success('Harvest logged!');
    setShowAdd(false);
    setForm({ crop_name: '', plot_name: '', harvest_date: new Date().toISOString().split('T')[0], quantity: '', unit: 'kg', quality_grade: 'A', season: '', revenue: '', notes: '' });
    fetchHarvests();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('harvests').delete().eq('id', id);
    toast.success('Harvest removed');
    fetchHarvests();
  };

  const totalYield = harvests.reduce((sum, h) => sum + h.quantity, 0);
  const totalRevenue = harvests.reduce((sum, h) => sum + (h.revenue || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-yellow-600 to-orange-500 text-white py-6 px-4">
        <div className="max-w-screen-sm mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/80 mb-3 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
          <h1 className="text-2xl font-bold">🌾 Harvest Tracker</h1>
          <p className="text-white/80 text-sm">Log yields & track performance</p>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3 text-center"><p className="text-xl font-bold text-foreground">{totalYield.toLocaleString()}<span className="text-xs font-normal text-muted-foreground"> kg</span></p><p className="text-[10px] text-muted-foreground">Total Yield</p></Card>
          <Card className="p-3 text-center"><p className="text-xl font-bold text-green-600">${totalRevenue.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Total Revenue</p></Card>
        </div>

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button className="w-full gap-2"><Plus className="w-4 h-4" /> Log Harvest</Button></DialogTrigger>
          <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Log Harvest</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Crop *</Label>
                <Select value={form.crop_name} onValueChange={v => setForm({ ...form, crop_name: v })}>
                  <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                  <SelectContent>{CROPS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Plot Name</Label><Input value={form.plot_name} onChange={e => setForm({ ...form, plot_name: e.target.value })} placeholder="e.g. Field A" /></div>
              <div><Label>Harvest Date</Label><Input type="date" value={form.harvest_date} onChange={e => setForm({ ...form, harvest_date: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
                <div><Label>Unit</Label>
                  <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="tonnes">tonnes</SelectItem><SelectItem value="bags">bags</SelectItem><SelectItem value="bundles">bundles</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Quality Grade</Label>
                <Select value={form.quality_grade} onValueChange={v => setForm({ ...form, quality_grade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Revenue ($)</Label><Input type="number" value={form.revenue} onChange={e => setForm({ ...form, revenue: e.target.value })} placeholder="Income from this harvest" /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <Button onClick={handleAdd} className="w-full" disabled={!form.crop_name || !form.quantity}>Log Harvest</Button>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? <p className="text-center text-muted-foreground py-8">Loading...</p> :
          harvests.length === 0 ? <Card className="p-8 text-center"><p className="text-muted-foreground">No harvests logged yet.</p></Card> :
          harvests.map(h => (
            <Card key={h.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-foreground">{h.crop_name} {h.plot_name && <span className="text-xs text-muted-foreground">· {h.plot_name}</span>}</h3>
                    <p className="text-sm text-muted-foreground">{new Date(h.harvest_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{h.quantity} {h.unit}</Badge>
                    <Badge variant="secondary">Grade {h.quality_grade}</Badge>
                    <button onClick={() => handleDelete(h.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {h.revenue && <p className="text-sm text-green-600 mt-1 font-medium">${h.revenue.toLocaleString()}</p>}
                {h.notes && <p className="text-xs text-muted-foreground mt-1 italic">{h.notes}</p>}
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  );
};

export default HarvestTracker;
