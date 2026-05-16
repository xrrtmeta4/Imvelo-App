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
import { ArrowLeft, Plus, Package, AlertTriangle, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  low_stock_threshold: number;
  purchase_date: string | null;
  expiry_date: string | null;
  cost_per_unit: number | null;
  supplier: string | null;
  notes: string | null;
}

const CATEGORIES = ['Seeds', 'Fertilizers', 'Pesticides', 'Tools', 'Equipment', 'Feed', 'Fuel', 'Packaging', 'Other'];

const FarmInventory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ item_name: '', category: 'Seeds', quantity: '', unit: 'kg', low_stock_threshold: '5', purchase_date: '', expiry_date: '', cost_per_unit: '', supplier: '' });

  const fetchItems = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('farm_inventory').select('*').eq('user_id', user.id).order('category');
    setItems((data as any[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAdd = async () => {
    if (!user || !form.item_name || !form.quantity) return;
    const { error } = await supabase.from('farm_inventory').insert({
      user_id: user.id, item_name: form.item_name, category: form.category,
      quantity: Number(form.quantity), unit: form.unit,
      low_stock_threshold: Number(form.low_stock_threshold),
      purchase_date: form.purchase_date || null, expiry_date: form.expiry_date || null,
      cost_per_unit: form.cost_per_unit ? Number(form.cost_per_unit) : null,
      supplier: form.supplier || null
    } as any);
    if (error) { toast.error('Failed to add item'); return; }
    toast.success('Item added!');
    setShowAdd(false);
    setForm({ item_name: '', category: 'Seeds', quantity: '', unit: 'kg', low_stock_threshold: '5', purchase_date: '', expiry_date: '', cost_per_unit: '', supplier: '' });
    fetchItems();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('farm_inventory').delete().eq('id', id);
    toast.success('Item removed');
    fetchItems();
  };

  const lowStockItems = items.filter(i => i.quantity <= i.low_stock_threshold);
  const expiringSoon = items.filter(i => {
    if (!i.expiry_date) return false;
    const daysLeft = (new Date(i.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 30;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-teal-700 to-teal-600 text-white py-6 px-4">
        <div className="max-w-screen-sm mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/80 mb-3 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
          <h1 className="text-2xl font-bold">📦 Farm Inventory</h1>
          <p className="text-white/80 text-sm">Track supplies & get low-stock alerts</p>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-4 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center"><p className="text-2xl font-bold text-foreground">{items.length}</p><p className="text-[10px] text-muted-foreground">Items</p></Card>
          <Card className="p-3 text-center"><p className="text-2xl font-bold text-orange-500">{lowStockItems.length}</p><p className="text-[10px] text-muted-foreground">Low Stock</p></Card>
          <Card className="p-3 text-center"><p className="text-2xl font-bold text-destructive">{expiringSoon.length}</p><p className="text-[10px] text-muted-foreground">Expiring</p></Card>
        </div>

        {lowStockItems.length > 0 && (
          <Card className="p-3 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-orange-500" /><span className="text-sm font-semibold text-orange-800 dark:text-orange-200">Low Stock Alert</span></div>
            <p className="text-xs text-orange-700 dark:text-orange-300">{lowStockItems.map(i => i.item_name).join(', ')}</p>
          </Card>
        )}

        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button className="w-full gap-2"><Plus className="w-4 h-4" /> Add Item</Button></DialogTrigger>
          <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Inventory Item</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Item Name *</Label><Input value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} placeholder="e.g. NPK Fertilizer" /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
                <div><Label>Unit</Label>
                  <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="litres">litres</SelectItem><SelectItem value="units">units</SelectItem><SelectItem value="bags">bags</SelectItem><SelectItem value="bottles">bottles</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Low Stock Threshold</Label><Input type="number" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Purchase Date</Label><Input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} /></div>
                <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} /></div>
              </div>
              <div><Label>Cost per Unit ($)</Label><Input type="number" value={form.cost_per_unit} onChange={e => setForm({ ...form, cost_per_unit: e.target.value })} /></div>
              <div><Label>Supplier</Label><Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="e.g. AgroSupply Ltd" /></div>
              <Button onClick={handleAdd} className="w-full" disabled={!form.item_name || !form.quantity}>Add Item</Button>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? <p className="text-center text-muted-foreground py-8">Loading...</p> :
          items.length === 0 ? <Card className="p-8 text-center"><p className="text-muted-foreground">No inventory items yet.</p></Card> :
          items.map(item => {
            const isLow = item.quantity <= item.low_stock_threshold;
            return (
              <Card key={item.id} className={isLow ? 'border-orange-300 dark:border-orange-700' : ''}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-foreground">{item.item_name}</h3>
                      <p className="text-sm text-muted-foreground">{item.category} {item.supplier && `· ${item.supplier}`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isLow ? 'destructive' : 'secondary'}>{item.quantity} {item.unit}</Badge>
                      <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    {item.cost_per_unit && <span>💰 ${item.cost_per_unit}/{item.unit}</span>}
                    {item.expiry_date && <span>📅 Exp: {new Date(item.expiry_date).toLocaleDateString()}</span>}
                    {isLow && <span className="text-orange-500 font-medium">⚠️ Low stock</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })
        }
      </div>
    </div>
  );
};

export default FarmInventory;
