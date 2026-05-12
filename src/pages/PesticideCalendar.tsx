import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Trash2, Calendar, Check, SkipForward, Bell, Droplets } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { toast } from 'sonner';
import { format, addDays, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface PesticideSchedule {
  id: string;
  crop_name: string;
  pesticide_name: string;
  application_date: string;
  repeat_interval_days: number | null;
  notes: string | null;
  status: 'scheduled' | 'completed' | 'skipped';
  created_at: string;
}

const commonPesticides = [
  'Neem Oil',
  'Pyrethrin',
  'Bacillus thuringiensis (Bt)',
  'Copper Fungicide',
  'Sulfur Dust',
  'Spinosad',
  'Insecticidal Soap',
  'Horticultural Oil',
  'Malathion',
  'Carbaryl (Sevin)',
  'Chlorpyrifos',
  'Glyphosate',
  'Custom'
];

const commonCrops = [
  'Maize',
  'Tomatoes',
  'Cabbage',
  'Beans',
  'Potatoes',
  'Onions',
  'Peppers',
  'Spinach',
  'Carrots',
  'Lettuce',
  'Cucumbers',
  'Squash',
  'Cotton',
  'Sugarcane',
  'Citrus',
  'Other'
];

const repeatOptions = [
  { value: '0', label: 'One-time only' },
  { value: '7', label: 'Weekly' },
  { value: '14', label: 'Every 2 weeks' },
  { value: '21', label: 'Every 3 weeks' },
  { value: '30', label: 'Monthly' }
];

const PesticideCalendarContent = () => {
  const { user } = useAuth();
  const { canAddSprayEntry, getMaxSprayEntries, currentPlan } = useUsageLimits();
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<PesticideSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    crop_name: '',
    pesticide_name: '',
    custom_pesticide: '',
    application_date: format(new Date(), 'yyyy-MM-dd'),
    repeat_interval_days: '0',
    notes: ''
  });

  const fetchSchedules = useCallback(async () => {
    const { data, error } = await supabase
      .from('pesticide_schedules')
      .select('*')
      .eq('user_id', user?.id)
      .order('application_date', { ascending: true });

    if (error) {
      toast.error('Failed to load schedules');
    } else {
      setSchedules(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSchedules();
    }
  }, [user, fetchSchedules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.crop_name || !formData.application_date) {
      toast.error('Please fill in required fields');
      return;
    }

    if (!canAddSprayEntry(schedules.length)) {
      toast.error(`Entry limit reached (${getMaxSprayEntries()}). Upgrade for unlimited entries!`);
      return;
    }

    const pesticideName = formData.pesticide_name === 'Custom' 
      ? formData.custom_pesticide 
      : formData.pesticide_name;

    if (!pesticideName) {
      toast.error('Please select or enter a pesticide name');
      return;
    }

    const repeatDays = parseInt(formData.repeat_interval_days);

    const { error } = await supabase.from('pesticide_schedules').insert({
      user_id: user.id,
      crop_name: formData.crop_name,
      pesticide_name: pesticideName,
      application_date: formData.application_date,
      repeat_interval_days: repeatDays > 0 ? repeatDays : null,
      notes: formData.notes || null,
      status: 'scheduled'
    });

    if (error) {
      toast.error('Failed to add schedule');
    } else {
      toast.success('Spray schedule added!');
      setFormData({
        crop_name: '',
        pesticide_name: '',
        custom_pesticide: '',
        application_date: format(new Date(), 'yyyy-MM-dd'),
        repeat_interval_days: '0',
        notes: ''
      });
      setDialogOpen(false);
      fetchSchedules();
    }
  };

  const updateStatus = async (id: string, status: 'completed' | 'skipped', schedule: PesticideSchedule) => {
    const { error } = await supabase
      .from('pesticide_schedules')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user?.id);

    if (error) {
      toast.error('Failed to update');
      return;
    }

    // If it's a recurring schedule, create the next occurrence
    if (schedule.repeat_interval_days && status === 'completed') {
      const nextDate = addDays(new Date(schedule.application_date), schedule.repeat_interval_days);
      await supabase.from('pesticide_schedules').insert({
        user_id: user?.id,
        crop_name: schedule.crop_name,
        pesticide_name: schedule.pesticide_name,
        application_date: format(nextDate, 'yyyy-MM-dd'),
        repeat_interval_days: schedule.repeat_interval_days,
        notes: schedule.notes,
        status: 'scheduled'
      });
    }

    toast.success(status === 'completed' ? 'Marked as done!' : 'Skipped');
    fetchSchedules();
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase
      .from('pesticide_schedules')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id);

    if (error) {
      toast.error('Failed to delete');
    } else {
      setSchedules(schedules.filter(s => s.id !== id));
      toast.success('Schedule deleted');
    }
  };

  const getScheduleStatus = (schedule: PesticideSchedule) => {
    if (schedule.status !== 'scheduled') return schedule.status;
    const appDate = new Date(schedule.application_date);
    if (isToday(appDate)) return 'today';
    if (isTomorrow(appDate)) return 'tomorrow';
    if (isPast(appDate)) return 'overdue';
    return 'upcoming';
  };

  const getStatusBadge = (schedule: PesticideSchedule) => {
    const status = getScheduleStatus(schedule);
    switch (status) {
      case 'today':
        return <Badge className="bg-yellow-500">Today</Badge>;
      case 'tomorrow':
        return <Badge variant="secondary">Tomorrow</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Done</Badge>;
      case 'skipped':
        return <Badge variant="outline">Skipped</Badge>;
      default: {
        const days = differenceInDays(new Date(schedule.application_date), new Date());
        return <Badge variant="outline">In {days} days</Badge>;
      }
    }
  };

  const upcomingSchedules = schedules.filter(s => s.status === 'scheduled');
  const completedSchedules = schedules.filter(s => s.status === 'completed' || s.status === 'skipped');
  const todayCount = upcomingSchedules.filter(s => isToday(new Date(s.application_date))).length;
  const overdueCount = upcomingSchedules.filter(s => isPast(new Date(s.application_date)) && !isToday(new Date(s.application_date))).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Droplets className="w-6 h-6" />
          Pesticide Calendar
        </h1>
        <p className="text-sm text-primary-foreground/80 mt-1">Track and schedule pesticide applications</p>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{todayCount}</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-500">Due Today</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{overdueCount}</p>
              <p className="text-xs text-red-600 dark:text-red-500">Overdue</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
            <CardContent className="pt-3 pb-3 text-center">
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{completedSchedules.length}</p>
              <p className="text-xs text-green-600 dark:text-green-500">Completed</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Schedule Button */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Spray Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Spray Schedule</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Crop *</Label>
                <Select
                  value={formData.crop_name}
                  onValueChange={(value) => setFormData({ ...formData, crop_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select crop" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonCrops.map((crop) => (
                      <SelectItem key={crop} value={crop}>{crop}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Pesticide/Treatment *</Label>
                <Select
                  value={formData.pesticide_name}
                  onValueChange={(value) => setFormData({ ...formData, pesticide_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pesticide" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonPesticides.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.pesticide_name === 'Custom' && (
                <div className="space-y-2">
                  <Label>Custom Pesticide Name</Label>
                  <Input
                    placeholder="Enter pesticide name"
                    value={formData.custom_pesticide}
                    onChange={(e) => setFormData({ ...formData, custom_pesticide: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Application Date *</Label>
                <Input
                  type="date"
                  value={formData.application_date}
                  onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Repeat</Label>
                <Select
                  value={formData.repeat_interval_days}
                  onValueChange={(value) => setFormData({ ...formData, repeat_interval_days: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {repeatOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Dosage, weather conditions, etc."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>

              <Button type="submit" className="w-full">
                Save Schedule
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Upcoming Schedules */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Upcoming Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : upcomingSchedules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Droplets className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No scheduled applications</p>
                <p className="text-sm">Add your first spray schedule!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSchedules.map((schedule) => (
                  <div 
                    key={schedule.id} 
                    className={`p-3 border rounded-lg ${
                      getScheduleStatus(schedule) === 'overdue' ? 'border-red-300 bg-red-50 dark:bg-red-950/20' :
                      getScheduleStatus(schedule) === 'today' ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{schedule.crop_name}</p>
                        <p className="text-xs text-muted-foreground">{schedule.pesticide_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(schedule.application_date), 'MMM d, yyyy')}
                          {schedule.repeat_interval_days && (
                            <span className="ml-2">• Repeats every {schedule.repeat_interval_days} days</span>
                          )}
                        </p>
                        {schedule.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">"{schedule.notes}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(schedule)}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 h-8"
                        onClick={() => updateStatus(schedule.id, 'completed', schedule)}
                      >
                        <Check className="w-3 h-3" />
                        Done
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 h-8"
                        onClick={() => updateStatus(schedule.id, 'skipped', schedule)}
                      >
                        <SkipForward className="w-3 h-3" />
                        Skip
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => deleteSchedule(schedule.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed History */}
        {completedSchedules.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Recent History
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 h-8"
                  onClick={async () => {
                    const ids = completedSchedules.map(s => s.id);
                    const { error } = await supabase
                      .from('pesticide_schedules')
                      .delete()
                      .in('id', ids)
                      .eq('user_id', user?.id);
                    if (error) {
                      toast.error('Failed to clear history');
                    } else {
                      setSchedules(schedules.filter(s => s.status === 'scheduled'));
                      toast.success('History cleared');
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {completedSchedules.slice(0, 10).map((schedule) => (
                  <div key={schedule.id} className="flex justify-between items-center p-2 border rounded text-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{schedule.crop_name} - {schedule.pesticide_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(schedule.application_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(schedule)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => deleteSchedule(schedule.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PesticideCalendarContent;
