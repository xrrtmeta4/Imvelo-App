import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Heart, Syringe, Baby, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';

interface LivestockItem {
  id: string;
  animal_type: string;
  breed: string | null;
  name: string | null;
  tag_id: string | null;
  birth_date: string | null;
  gender: string;
  weight_kg: number | null;
  health_status: string;
  vaccination_history: any[];
  breeding_status: string | null;
  feed_schedule: string | null;
  notes: string | null;
}

const ANIMAL_TYPES = ['Cattle', 'Goat', 'Sheep', 'Pig', 'Chicken', 'Duck', 'Horse', 'Donkey', 'Other'];
const HEALTH_STATUSES = ['healthy', 'sick', 'recovering', 'pregnant', 'lactating'];

const LivestockManager = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [animals, setAnimals] = useState<LivestockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    animal_type: '', breed: '', name: '', tag_id: '', birth_date: '',
    gender: 'unknown', weight_kg: '', health_status: 'healthy',
    breeding_status: '', feed_schedule: '', notes: ''
  });

  const fetchAnimals = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('livestock').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setAnimals((data as any[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAnimals(); }, [fetchAnimals]);

  const handleAdd = async () => {
    if (!user || !form.animal_type) return;
    const { error } = await supabase.from('livestock').insert({
      user_id: user.id, animal_type: form.animal_type, breed: form.breed || null,
      name: form.name || null, tag_id: form.tag_id || null, birth_date: form.birth_date || null,
      gender: form.gender, weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      health_status: form.health_status, breeding_status: form.breeding_status || null,
      feed_schedule: form.feed_schedule || null, notes: form.notes || null
    } as any);
    if (error) { toast.error('Failed to add animal'); return; }
    toast.success('Animal added!');
    setShowAdd(false);
    setForm({ animal_type: '', breed: '', name: '', tag_id: '', birth_date: '', gender: 'unknown', weight_kg: '', health_status: 'healthy', breeding_status: '', feed_schedule: '', notes: '' });
    fetchAnimals();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('livestock').delete().eq('id', id);
    toast.success('Animal removed');
    fetchAnimals();
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'healthy': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'sick': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'pregnant': return 'bg-pink-500/10 text-pink-700 border-pink-500/20';
      case 'lactating': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const stats = {
    total: animals.length,
    healthy: animals.filter(a => a.health_status === 'healthy').length,
    sick: animals.filter(a => a.health_status === 'sick').length,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-amber-600 to-amber-500 text-white py-6 px-4">
        <div className="max-w-screen-sm mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/80 mb-3 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-2xl font-bold">🐄 Livestock Manager</h1>
          <p className="text-white/80 text-sm">Track animals, health & breeding</p>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Card className="text-center p-3"><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-[10px] text-muted-foreground">Total</p></Card>
          <Card className="text-center p-3"><p className="text-2xl font-bold text-green-600">{stats.healthy}</p><p className="text-[10px] text-muted-foreground">Healthy</p></Card>
          <Card className="text-center p-3"><p className="text-2xl font-bold text-destructive">{stats.sick}</p><p className="text-[10px] text-muted-foreground">Sick</p></Card>
        </div>

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2"><Plus className="w-4 h-4" /> Add Animal</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Animal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Type *</Label>
                <Select value={form.animal_type} onValueChange={v => setForm({ ...form, animal_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{ANIMAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Bessie" /></div>
              <div><Label>Breed</Label><Input value={form.breed} onChange={e => setForm({ ...form, breed: e.target.value })} placeholder="e.g. Nguni" /></div>
              <div><Label>Tag/ID</Label><Input value={form.tag_id} onChange={e => setForm({ ...form, tag_id: e.target.value })} placeholder="e.g. #001" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Birth Date</Label><Input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} /></div>
                <div><Label>Gender</Label>
                  <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="unknown">Unknown</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Weight (kg)</Label><Input type="number" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} /></div>
              <div><Label>Health Status</Label>
                <Select value={form.health_status} onValueChange={v => setForm({ ...form, health_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{HEALTH_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
              <Button onClick={handleAdd} className="w-full" disabled={!form.animal_type}>Add Animal</Button>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? <p className="text-center text-muted-foreground py-8">Loading...</p> :
          animals.length === 0 ? <Card className="p-8 text-center"><p className="text-muted-foreground">No animals yet. Add your first one!</p></Card> :
          animals.map(a => (
            <Card key={a.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-foreground">{a.name || a.animal_type} {a.tag_id && <span className="text-xs text-muted-foreground">({a.tag_id})</span>}</h3>
                    <p className="text-sm text-muted-foreground">{a.animal_type} {a.breed && `· ${a.breed}`} {a.gender !== 'unknown' && `· ${a.gender}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusColor(a.health_status)}>{a.health_status}</Badge>
                    <button onClick={() => handleDelete(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  {a.weight_kg && <span>⚖️ {a.weight_kg}kg</span>}
                  {a.birth_date && <span>🎂 {new Date(a.birth_date).toLocaleDateString()}</span>}
                  {a.breeding_status && <span>🐣 {a.breeding_status}</span>}
                </div>
                {a.notes && <p className="text-xs text-muted-foreground mt-2 italic">{a.notes}</p>}
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  );
};

export default LivestockManager;
