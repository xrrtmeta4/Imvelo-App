import PestScanner from '@/components/PestScanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const Scanner = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user]);

  const fetchReports = async () => {
    const { data } = await supabase
      .from('pest_reports')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) setReports(data);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold">Khangela Isipho</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <PestScanner />

        {reports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Imiphumela Yekucala</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="p-3 rounded-lg bg-accent/50">
                  <p className="font-medium text-sm">{report.pest_name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(report.created_at).toLocaleDateString('ss-ZA')}
                  </p>
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
