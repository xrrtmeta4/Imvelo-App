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
    const { error } = await supabase
      .from('pest_reports')
      .update({ hidden_by_user: true, hidden_at: new Date().toISOString() })
      .eq('id', reportId)
      .eq('user_id', user?.id);

    if (error) {
      toast.error(t('failedDeleteReport'));
      return;
    }

    setReports(reports.filter(r => r.id !== reportId));
    toast.success(t('reportDeleted'));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold">{t('identifyPestsDiseases')}</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="pest" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pest" className="flex items-center gap-1">
              <Bug className="w-4 h-4" />
              <span className="hidden sm:inline">{t('pests')}</span>
            </TabsTrigger>
            <TabsTrigger value="animal" className="flex items-center gap-1">
              <Stethoscope className="w-4 h-4" />
              <span className="hidden sm:inline">{t('animal')}</span>
            </TabsTrigger>
            <TabsTrigger value="soil" className="flex items-center gap-1">
              <Mountain className="w-4 h-4" />
              <span className="hidden sm:inline">{t('soil')}</span>
            </TabsTrigger>
            <TabsTrigger value="produce" className="flex items-center gap-1">
              <Wheat className="w-4 h-4" />
              <span className="hidden sm:inline">{t('yield')}</span>
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
          <Card>
            <CardHeader>
              <CardTitle>{t('detectionHistory')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="p-3 rounded-lg bg-accent/50 flex items-center justify-between">
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
