import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ShieldCheck, Loader2, Thermometer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const CROPS = ['Maize', 'Beans', 'Tomatoes', 'Cabbage', 'Sweet Potato', 'Groundnuts', 'Onions', 'Mango', 'Banana', 'Avocado', 'Sugarcane', 'Rice', 'Other'];
const STORAGE = ['Open air', 'Silo/Granary', 'Cold room', 'Warehouse', 'Underground', 'None/Planning'];

const PostHarvestGuide = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [form, setForm] = useState({ crop: '', quantity: '', storageMethod: '', location: '', harvestDate: '' });

  const handleAnalyze = async () => {
    if (!form.crop) { toast.error('Please select a crop'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: `As a post-harvest management expert for sub-Saharan Africa, provide detailed guidance for:
          - Crop: ${form.crop}
          - Quantity: ${form.quantity || 'Not specified'} 
          - Current Storage: ${form.storageMethod || 'Not specified'}
          - Location: ${form.location || 'Eswatini (subtropical)'}
          - Harvest Date: ${form.harvestDate || 'Recent'}
          
          Please provide:
          1. Optimal storage conditions (temperature, humidity, ventilation)
          2. Expected shelf life under different storage methods
          3. Common spoilage risks and how to prevent them
          4. Signs of spoilage to watch for
          5. Best drying/curing methods if applicable
          6. Affordable storage solutions for smallholder farmers
          7. When and how to process for value addition
          8. Food safety considerations
          
          Be practical and consider resource-limited settings.`,
          language: 'en'
        }
      });
      if (error) throw error;
      setResult(data.response || data.message);
    } catch (err) {
      toast.error('Analysis failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-red-700 to-orange-600 text-white py-6 px-4">
        <div className="max-w-screen-sm mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/80 mb-3 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
          <h1 className="text-2xl font-bold">🛡️ Post-Harvest Guide</h1>
          <p className="text-white/80 text-sm">Reduce losses with AI storage guidance</p>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-4 space-y-4">
        <Card className="p-4 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
          <p className="text-xs text-red-800 dark:text-red-200">⚠️ <strong>Did you know?</strong> Up to 40% of crops in sub-Saharan Africa are lost post-harvest. Proper storage can save your earnings.</p>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div><Label>Crop *</Label>
              <Select value={form.crop} onValueChange={v => setForm({ ...form, crop: v })}>
                <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                <SelectContent>{CROPS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Quantity (kg)</Label>
              <Input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 500" />
            </div>
            <div><Label>Current Storage Method</Label>
              <Select value={form.storageMethod} onValueChange={v => setForm({ ...form, storageMethod: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{STORAGE.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Harvest Date</Label>
              <Input type="date" value={form.harvestDate} onChange={e => setForm({ ...form, harvestDate: e.target.value })} />
            </div>
            <Button onClick={handleAnalyze} className="w-full gap-2" disabled={loading || !form.crop}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {loading ? 'Analyzing...' : 'Get Storage Guidance'}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <h3 className="font-bold text-foreground mb-2 flex items-center gap-2"><Thermometer className="w-4 h-4 text-orange-600" /> Storage & Preservation Guide</h3>
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{result}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PostHarvestGuide;
