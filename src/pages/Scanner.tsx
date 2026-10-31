import PestScanner from '@/components/PestScanner';
import AnimalDiseaseScanner from '@/components/AnimalDiseaseScanner';
import ProduceEstimator from '@/components/ProduceEstimator';
import SoilScanner from '@/components/SoilScanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Bug, Stethoscope, Wheat, Mountain, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import UpgradeNudge from '@/components/UpgradeNudge';

const Scanner = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [reports, setReports] = useState<any[]>([]);

  const fetchReports = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('pest_reports')
      .select('*')
      .eq('user_id', user.id)
      .eq('hidden_by_user', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) setReports(data);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user, fetchReports]);

  const deleteReport = async (reportId: string) => {
    // Permanent delete — the record must not come back on refresh.
    const { error } = await supabase
      .from('pest_reports')
      .delete()
      .eq('id', reportId)
      .eq('user_id', user?.id);

    if (error) {
      toast.error(t('failedDeleteReport'));
      return;
    }

    setReports((prev) => prev.filter((r) => r.id !== reportId));
    toast.success(t('reportDeleted'));
    fetchReports();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-b-3xl px-5 pt-[max(env(safe-area-inset-top),1.25rem)] pb-6">
        <div className="max-w-screen-sm mx-auto">
          <p className="text-sm opacity-90">Chloe AI Scanner</p>
          <h1 className="text-2xl font-bold">{t('identifyPestsDiseases')}</h1>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <UpgradeNudge />
        <Tabs defaultValue="pest" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto rounded-2xl p-1">
            <TabsTrigger value="pest" className="flex flex-col items-center gap-1 rounded-xl py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bug className="w-4 h-4" />
              <span className="text-[11px]">{t('pests')}</span>
            </TabsTrigger>
            <TabsTrigger value="animal" className="flex flex-col items-center gap-1 rounded-xl py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Stethoscope className="w-4 h-4" />
              <span className="text-[11px]">{t('animal')}</span>
            </TabsTrigger>
            <TabsTrigger value="soil" className="flex flex-col items-center gap-1 rounded-xl py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Mountain className="w-4 h-4" />
              <span className="text-[11px]">{t('soil')}</span>
            </TabsTrigger>
            <TabsTrigger value="produce" className="flex flex-col items-center gap-1 rounded-xl py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Wheat className="w-4 h-4" />
              <span className="text-[11px]">{t('yield')}</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pest" className="mt-4">
            <PestScanner />
          </TabsContent>
          
          <TabsContent value="animal" className="mt-4">
            <AnimalDiseaseScanner />
          </TabsContent>

          <TabsContent value="soil" className="mt-4">
            <SoilScanner />
          </TabsContent>
          
          <TabsContent value="produce" className="mt-4">
            <ProduceEstimator />
          </TabsContent>
        </Tabs>

        {reports.length > 0 && (
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle className="text-base">{t('detectionHistory')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="p-3 rounded-2xl bg-muted border-l-4 border-primary flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{report.pest_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteReport(report.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Scanner;
