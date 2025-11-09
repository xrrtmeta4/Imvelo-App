import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Eye, MessageCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const SellerAnalytics = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({
    totalViews: 0,
    totalMessages: 0,
    activeListings: 0,
  });

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('seller_id', user?.id)
        .order('views', { ascending: false });

      if (error) throw error;

      setAnalytics(data || []);
      
      // Calculate totals
      const totals = (data || []).reduce(
        (acc, listing) => ({
          totalViews: acc.totalViews + (listing.views || 0),
          totalMessages: acc.totalMessages + (listing.messages_received || 0),
          activeListings: acc.activeListings + (listing.status === 'active' ? 1 : 0),
        }),
        { totalViews: 0, totalMessages: 0, activeListings: 0 }
      );
      
      setTotalStats(totals);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold">Tibalo Tekulengisa</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <Eye className="w-8 h-8 text-primary mb-2" />
                <p className="text-2xl font-bold">{totalStats.totalViews}</p>
                <p className="text-xs text-muted-foreground">Tibukelo Sonkhe</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <MessageCircle className="w-8 h-8 text-primary mb-2" />
                <p className="text-2xl font-bold">{totalStats.totalMessages}</p>
                <p className="text-xs text-muted-foreground">Imilayeto</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <TrendingUp className="w-8 h-8 text-primary mb-2" />
                <p className="text-2xl font-bold">{totalStats.activeListings}</p>
                <p className="text-xs text-muted-foreground">Tintfo Letisebentako</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <BarChart3 className="w-8 h-8 text-primary mb-2" />
                <p className="text-2xl font-bold">
                  {totalStats.totalViews > 0 
                    ? ((totalStats.totalMessages / totalStats.totalViews) * 100).toFixed(1) 
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Engagement Rate</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Listings Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Tintfo Takho Temakethe</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Kuyalayisha...</p>
            ) : analytics.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Awunato tintfo temakethe
              </p>
            ) : (
              <div className="space-y-3">
                {analytics.map((listing) => (
                  <div 
                    key={listing.id} 
                    className="p-4 rounded-lg bg-accent/50 border border-border"
                  >
                    <div className="flex items-start gap-3">
                      {listing.image_url && (
                        <img 
                          src={listing.image_url} 
                          alt={listing.product_name}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold">{listing.product_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          E{listing.price} / {listing.unit}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{listing.views || 0} tibukelo</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            <span>{listing.messages_received || 0} imilayeto</span>
                          </div>
                        </div>
                      </div>
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

export default SellerAnalytics;
