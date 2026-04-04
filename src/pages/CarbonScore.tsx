import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Leaf, Loader2, TreePine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

const CarbonScore = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [form, setForm] = useState({
    farmSize: '', cropTypes: '', irrigationMethod: '', fertilizerUse: '',
    tillageMethod: '', livestockCount: '', energySource: ''
  });

  const IRRIGATION = ['Rainfed', 'Drip', 'Sprinkler', 'Flood', 'None'];
  const TILLAGE = ['No-till', 'Minimum tillage', 'Conventional tillage', 'Ridge tillage'];
  const ENERGY = ['Solar', 'Grid electricity', 'Diesel generator', 'Manual/Animal', 'Mixed'];

  const handleAnalyze = async () => {
    if (!form.farmSize) { toast.error('Please enter your farm size'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: `As a sustainability expert, analyze this farm's carbon footprint and provide a sustainability score:
          - Farm Size: ${form.farmSize} hectares
          - Crops: ${form.cropTypes || 'Mixed'}
          - Irrigation: ${form.irrigationMethod || 'Not specified'}
          - Fertilizer Use: ${form.fertilizerUse || 'Not specified'}
          - Tillage Method: ${form.tillageMethod || 'Not specified'}
          - Livestock Count: ${form.livestockCount || '0'}
          - Energy Source: ${form.energySource || 'Not specified'}
          
          Please provide:
          1. Estimated Carbon Footprint Score (0-100, where 100 is most sustainable)
          2. CO2 emissions estimate (tonnes/year)
          3. Top 3 carbon reduction opportunities
          4. Recommended sustainable practices
          5. Potential carbon credit opportunities
          6. Comparison to regional averages
          
          Be specific and actionable.`,
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
      <header className="bg-gradient-to-br from-emerald-700 to-green-600 text-white py-6 px-4">
        <div className="max-w-screen-sm mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/80 mb-3 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
          <h1 className="text-2xl font-bold">🌍 Carbon & Sustainability</h1>
          <p className="text-white/80 text-sm">Track your farm's environmental impact</p>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div><Label>Farm Size (hectares) *</Label>
              <Input type="number" value={form.farmSize} onChange={e => setForm({ ...form, farmSize: e.target.value })} placeholder="e.g. 5" />
            </div>
            <div><Label>Main Crops</Label>
              <Input value={form.cropTypes} onChange={e => setForm({ ...form, cropTypes: e.target.value })} placeholder="e.g. Maize, Beans, Sugarcane" />
            </div>
            <div><Label>Irrigation Method</Label>
              <Select value={form.irrigationMethod} onValueChange={v => setForm({ ...form, irrigationMethod: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{IRRIGATION.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Fertilizer Use</Label>
              <Input value={form.fertilizerUse} onChange={e => setForm({ ...form, fertilizerUse: e.target.value })} placeholder="e.g. NPK 200kg/season, Manure" />
            </div>
            <div><Label>Tillage Method</Label>
              <Select value={form.tillageMethod} onValueChange={v => setForm({ ...form, tillageMethod: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{TILLAGE.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Number of Livestock</Label>
              <Input type="number" value={form.livestockCount} onChange={e => setForm({ ...form, livestockCount: e.target.value })} placeholder="0" />
            </div>
            <div><Label>Energy Source</Label>
              <Select value={form.energySource} onValueChange={v => setForm({ ...form, energySource: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{ENERGY.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleAnalyze} className="w-full gap-2" disabled={loading || !form.farmSize}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TreePine className="w-4 h-4" />}
              {loading ? 'Analyzing...' : 'Analyze Sustainability'}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <h3 className="font-bold text-foreground mb-2 flex items-center gap-2"><Leaf className="w-4 h-4 text-emerald-600" /> Sustainability Report</h3>
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{result}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CarbonScore;
