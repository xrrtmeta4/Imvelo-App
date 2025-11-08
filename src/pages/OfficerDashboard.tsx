import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Bug, MapPin, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OfficerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'extension_officer') {
      navigate('/');
      return;
    }

    fetchReports();
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('pest_reports')
        .select(`
          *,
          profiles:user_id (full_name, location, phone_number)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold">Lidashboard Lomhlengikati</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Yonkhe Imibiko Yetifo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Kuyalayisha...</p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Akukho mibiko</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="p-4 rounded-lg border bg-card space-y-3">
                    {report.image_url && (
                      <img
                        src={report.image_url}
                        alt="Pest"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                    
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Isipho: {report.pest_name || 'Akukatfolakali'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ukuqiniseka: {report.confidence}%
                        </p>
                      </div>

                      {report.treatment && (
                        <div className="bg-accent/50 p-3 rounded-lg">
                          <p className="text-xs font-medium mb-1">Lokwelapha:</p>
                          <p className="text-xs text-muted-foreground">{report.treatment}</p>
                        </div>
                      )}

                      <div className="pt-2 border-t space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Bug className="w-3 h-3" />
                          <span>{report.profiles?.full_name || 'Unknown'}</span>
                        </div>
                        {report.profiles?.phone_number && (
                          <p className="text-xs text-muted-foreground">
                            Inombolo: {report.profiles.phone_number}
                          </p>
                        )}
                        {report.location && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{report.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(report.created_at).toLocaleDateString('en-GB')}</span>
                        </div>
                      </div>

                      {report.notes && (
                        <div className="text-xs">
                          <p className="font-medium mb-1">Emaphointi:</p>
                          <p className="text-muted-foreground">{report.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OfficerDashboard;