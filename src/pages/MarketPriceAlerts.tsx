import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Bell, BellOff, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface PriceAlert {
  id: string;
  commodity: string;
  target_price: number;
  direction: string;
  current_price: number | null;
  is_active: boolean;
  triggered_at: string | null;
}

const COMMODITIES = ['Maize', 'Wheat', 'Soybeans', 'Rice', 'Sugar', 'Coffee', 'Cotton', 'Cocoa', 'Sunflower', 'Sorghum'];

const MarketPriceAlerts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ commodity: '', target_price: '', direction: 'above' });

  useEffect(() => { fetchAlerts(); }, [user]);

  const fetchAlerts = async () => {
    if (!user) return;
    const { data } = await supabase.from('price_alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setAlerts((data as any[]) || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!user || !form.commodity || !form.target_price) return;
    const { error } = await supabase.from('price_alerts').insert({
      user_id: user.id, commodity: form.commodity,
      target_price: Number(form.target_price), direction: form.direction
    } as any);
    if (error) { toast.error('Failed to create alert'); return; }
    toast.success('Price alert created!');
    setShowAdd(false);
    setForm({ commodity: '', target_price: '', direction: 'above' });
    fetchAlerts();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('price_alerts').update({ is_active: !current } as any).eq('id', id);
    fetchAlerts();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('price_alerts').delete().eq('id', id);
    toast.success('Alert deleted');
    fetchAlerts();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-blue-700 to-indigo-600 text-white py-6 px-4">
        <div className="max-w-screen-sm mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/80 mb-3 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
          <h1 className="text-2xl font-bold">📊 Market Price Alerts</h1>
          <p className="text-white/80 text-sm">Get notified when prices hit your targets</p>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-4 space-y-4">
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-800 dark:text-blue-200">💡 Set target prices for commodities and get alerted when market prices cross your thresholds.</p>
        </Card>

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button className="w-full gap-2"><Plus className="w-4 h-4" /> Create Alert</Button></DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>New Price Alert</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Commodity *</Label>
                <Select value={form.commodity} onValueChange={v => setForm({ ...form, commodity: v })}>
                  <SelectTrigger><SelectValue placeholder="Select commodity" /></SelectTrigger>
                  <SelectContent>{COMMODITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Target Price ($/tonne) *</Label>
                <Input type="number" value={form.target_price} onChange={e => setForm({ ...form, target_price: e.target.value })} placeholder="e.g. 250" />
              </div>
              <div><Label>Alert when price goes</Label>
                <Select value={form.direction} onValueChange={v => setForm({ ...form, direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Above target ↑</SelectItem>
                    <SelectItem value="below">Below target ↓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} className="w-full" disabled={!form.commodity || !form.target_price}>Create Alert</Button>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? <p className="text-center text-muted-foreground py-8">Loading...</p> :
          alerts.length === 0 ? <Card className="p-8 text-center"><p className="text-muted-foreground">No price alerts yet. Create your first one!</p></Card> :
          alerts.map(a => (
            <Card key={a.id} className={!a.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-foreground">{a.commodity}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      {a.direction === 'above' ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-destructive" />}
                      Alert {a.direction} ${a.target_price}/tonne
                    </p>
                    {a.triggered_at && <p className="text-xs text-primary mt-1">🔔 Triggered {new Date(a.triggered_at).toLocaleDateString()}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={a.is_active} onCheckedChange={() => toggleActive(a.id, a.is_active)} />
                    <button onClick={() => handleDelete(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        }
      </div>
    </div>
  );
};

export default MarketPriceAlerts;
