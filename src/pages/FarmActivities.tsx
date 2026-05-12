import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Sparkles, Loader2, Trash2, Calendar, ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface FarmActivity {
  id: string;
  activity_date: string;
  activity_type: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  weather_conditions: string | null;
  created_at: string;
}

const activityTypes = [
  'Planting',
  'Watering',
  'Fertilizing',
  'Harvesting',
  'Weeding',
  'Pest Control',
  'Pruning',
  'Soil Preparation',
  'Livestock Feeding',
  'Livestock Health Check',
  'Equipment Maintenance',
  'Sales',
  'Purchase',
  'Other'
];

const units = ['kg', 'bags', 'liters', 'hours', 'hectares', 'plants', 'animals', 'units'];

const FarmActivities = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<FarmActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [formData, setFormData] = useState({
    activity_date: format(new Date(), 'yyyy-MM-dd'),
    activity_type: '',
    description: '',
    quantity: '',
    unit: '',
    notes: '',
    weather_conditions: ''
  });

  const fetchLanguagePreference = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', user.id)
      .single();
    if (data?.preferred_language) {
      setPreferredLanguage(data.preferred_language);
    }
  }, [user]);

  const fetchActivities = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('farm_activities')
      .select('*')
      .eq('user_id', user.id)
      .order('activity_date', { ascending: false })
      .limit(50);

    if (error) {
      toast.error('Failed to load activities');
    } else {
      setActivities(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchActivities();
      fetchLanguagePreference();
    }
  }, [user, fetchActivities, fetchLanguagePreference]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.activity_type) {
      toast.error('Please select an activity type');
      return;
    }

    const { error } = await supabase.from('farm_activities').insert({
      user_id: user.id,
      activity_date: formData.activity_date,
      activity_type: formData.activity_type,
      description: formData.description || null,
      quantity: formData.quantity ? parseFloat(formData.quantity) : null,
      unit: formData.unit || null,
      notes: formData.notes || null,
      weather_conditions: formData.weather_conditions || null
    });

    if (error) {
      toast.error('Failed to add activity');
    } else {
      toast.success('Activity recorded!');
      setFormData({
        activity_date: format(new Date(), 'yyyy-MM-dd'),
        activity_type: '',
        description: '',
        quantity: '',
        unit: '',
        notes: '',
        weather_conditions: ''
      });
      setDialogOpen(false);
      fetchActivities();
    }
  };

  const deleteActivity = async (id: string) => {
    const { error } = await supabase
      .from('farm_activities')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id);

    if (error) {
      toast.error('Failed to delete activity');
    } else {
      setActivities(activities.filter(a => a.id !== id));
      toast.success('Activity deleted');
    }
  };

  const analyzeActivities = async () => {
    if (activities.length === 0) {
      toast.error('Record some activities first to get AI insights');
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-farm-activities', {
        body: { activities, preferredLanguage }
      });

      if (error) throw error;
      setAnalysis(data.analysis);
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze activities');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6" />
          Farm Activity Log
        </h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 gap-2">
                <Plus className="w-4 h-4" />
                Add Activity
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Farm Activity</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="activity_date">Date</Label>
                  <Input
                    id="activity_date"
                    type="date"
                    value={formData.activity_date}
                    onChange={(e) => setFormData({ ...formData, activity_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="activity_type">Activity Type</Label>
                  <Select
                    value={formData.activity_type}
                    onValueChange={(value) => setFormData({ ...formData, activity_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {activityTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="e.g., Planted maize in field A"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value) => setFormData({ ...formData, unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((unit) => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weather">Weather Conditions</Label>
                  <Input
                    id="weather"
                    placeholder="e.g., Sunny, 25°C"
                    value={formData.weather_conditions}
                    onChange={(e) => setFormData({ ...formData, weather_conditions: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional observations..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Save Activity
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={analyzeActivities}
            disabled={analyzing || activities.length === 0}
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            AI Insights
          </Button>
        </div>

        {/* AI Analysis */}
        {analysis && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Farm Advisor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none text-foreground">
                {analysis.split('\n').map((paragraph, idx) => (
                  <p key={idx} className="mb-2 text-sm">{paragraph}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activities Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No activities recorded yet.</p>
                <p className="text-sm">Start logging your daily farm work!</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(activity.activity_date), 'MMM d')}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {activity.activity_type}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                          {activity.description || activity.notes || '-'}
                          {activity.quantity && ` (${activity.quantity} ${activity.unit || ''})`}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteActivity(activity.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmActivities;
