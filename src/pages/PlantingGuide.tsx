import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Sprout, Sun, Cloud, Bell, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CropReminder {
  id: string;
  crop_name: string;
  planting_start_month: number;
  planting_end_month: number;
}

const PlantingGuide = () => {
  const { user } = useAuth();
  const [subscribedCrops, setSubscribedCrops] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  const seasons = [
    {
      season: "Spring/Summer",
      months: "September - February",
      crops: [
        { name: "Maize", bestTime: "October - November", icon: Sprout, startMonth: 10, endMonth: 11 },
        { name: "Potatoes", bestTime: "September - October", icon: Sprout, startMonth: 9, endMonth: 10 },
        { name: "Beans", bestTime: "October - December", icon: Sprout, startMonth: 10, endMonth: 12 },
        { name: "Pumpkins", bestTime: "September - November", icon: Sprout, startMonth: 9, endMonth: 11 }
      ]
    },
    {
      season: "Autumn/Winter",
      months: "March - August",
      crops: [
        { name: "Cabbage", bestTime: "February - April", icon: Sun, startMonth: 2, endMonth: 4 },
        { name: "Spinach", bestTime: "March - July", icon: Cloud, startMonth: 3, endMonth: 7 },
        { name: "Carrots", bestTime: "February - May", icon: Sun, startMonth: 2, endMonth: 5 },
        { name: "Onions", bestTime: "March - June", icon: Cloud, startMonth: 3, endMonth: 6 },
        { name: "Beetroot", bestTime: "March - May", icon: Sun, startMonth: 3, endMonth: 5 },
        { name: "Lettuce", bestTime: "April - July", icon: Cloud, startMonth: 4, endMonth: 7 }
      ]
    }
  ];

  const fetchSubscriptions = useCallback(async () => {
    const { data, error } = await supabase
      .from('crop_reminders')
      .select('crop_name')
      .eq('user_id', user?.id);
    
    if (!error && data) {
      setSubscribedCrops(data.map(r => r.crop_name));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
    }
  }, [user, fetchSubscriptions]);

  const toggleReminder = async (cropName: string, startMonth: number, endMonth: number) => {
    if (!user) {
      toast.error('Please login to set reminders');
      return;
    }

    setLoading(cropName);
    const isSubscribed = subscribedCrops.includes(cropName);

    try {
      if (isSubscribed) {
        // Unsubscribe
        const { error } = await supabase
          .from('crop_reminders')
          .delete()
          .eq('user_id', user.id)
          .eq('crop_name', cropName);

        if (error) throw error;
        
        setSubscribedCrops(prev => prev.filter(c => c !== cropName));
        toast.success(`Reminder for ${cropName} removed`);
      } else {
        // Subscribe
        const { error } = await supabase
          .from('crop_reminders')
          .insert({
            user_id: user.id,
            crop_name: cropName,
            planting_start_month: startMonth,
            planting_end_month: endMonth
          });

        if (error) throw error;
        
        setSubscribedCrops(prev => [...prev, cropName]);
        toast.success(`You'll receive a reminder for ${cropName}`);
      }
    } catch (error) {
      console.error('Error toggling reminder:', error);
      toast.error('Failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold">Seasonal Planting Guide</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        {/* Reminder Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Planting Reminders</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click the bell button to receive reminders when planting season arrives.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Seasonal Planting Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Choose the right time to plant your crops for maximum harvest yield.
            </p>

            <div className="space-y-6">
              {seasons.map((season, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="bg-accent p-3 rounded-lg">
                    <h3 className="font-semibold text-sm">{season.season}</h3>
                    <p className="text-xs text-muted-foreground">{season.months}</p>
                  </div>

                  <div className="space-y-2">
                    {season.crops.map((crop, cropIdx) => {
                      const isSubscribed = subscribedCrops.includes(crop.name);
                      const isLoading = loading === crop.name;
                      
                      return (
                        <div key={cropIdx} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                          <crop.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{crop.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Best time: {crop.bestTime}
                            </p>
                          </div>
                          <Button
                            variant={isSubscribed ? "default" : "outline"}
                            size="sm"
                            className="flex-shrink-0"
                            onClick={() => toggleReminder(crop.name, crop.startMonth, crop.endMonth)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                            ) : isSubscribed ? (
                              <>
                                <Check className="w-4 h-4 mr-1" />
                                <span className="text-xs">Subscribed</span>
                              </>
                            ) : (
                              <>
                                <Bell className="w-4 h-4 mr-1" />
                                <span className="text-xs">Remind Me</span>
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Subscribed Crops Summary */}
        {subscribedCrops.length > 0 && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-green-600" />
                Your Reminders ({subscribedCrops.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {subscribedCrops.map((crop, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs"
                  >
                    {crop}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                You'll receive notifications when planting season arrives.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Important Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Check your soil before planting</p>
            <p>• Start planting when rains begin</p>
            <p>• Keep soil moist but not waterlogged</p>
            <p>• Follow planting instructions for each crop</p>
            <p>• Use appropriate fertilizer to enrich soil</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlantingGuide;
