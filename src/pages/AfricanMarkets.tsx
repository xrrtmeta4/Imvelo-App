import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { useLocation } from '@/hooks/useLocation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, TrendingUp, MapPin, Phone, Mail, Globe, Clock, Store, Loader2, RefreshCw, Flame, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface HighDemandProduct {
  product: string;
  demand_level: string;
  price_range_min: number;
  price_range_max: number;
  currency: string;
  unit: string;
  top_markets: string[];
  season: string;
  notes: string;
}

interface MarketContact {
  name: string;
  location: string;
  type: string;
  specialization: string;
  contact_phone: string;
  contact_email: string;
  operating_hours: string;
  website: string;
}

const getDemandColor = (level: string) => {
  if (level === 'Very High') return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800';
  if (level === 'High') return 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800';
  return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
};

const getTypeColor = (type: string) => {
  if (type === 'Export Hub') return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
  if (type === 'Wholesale') return 'bg-green-500/10 text-green-700 dark:text-green-400';
  if (type === 'Regional') return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
  return 'bg-muted text-muted-foreground';
};

const AfricanMarkets = () => {
  const { user } = useAuth();
  const { selectedCurrency } = useCurrency();
  const { location, getLocation } = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<HighDemandProduct[]>([]);
  const [markets, setMarkets] = useState<MarketContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [demandFilter, setDemandFilter] = useState<string>('all');

  const initAndFetch = useCallback(async () => {
    let loc = location;
    if (!loc) {
      loc = await getLocation();
    }
    fetchMarketData(loc?.country_name);
  }, [location, getLocation]);

  useEffect(() => {
    initAndFetch();
  }, [initAndFetch, selectedCurrency]);

  const fetchMarketData = async (country?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('african-markets', {
        body: {
          user_currency: selectedCurrency.code,
          user_country: country || 'General',
        },
      });

      if (error) throw error;

      if (data?.high_demand_products) setProducts(data.high_demand_products);
      if (data?.markets) setMarkets(data.markets);
    } catch (err) {
      console.error('Failed to fetch market data:', err);
      toast.error('Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = demandFilter === 'all'
    ? products
    : products.filter(p => p.demand_level === demandFilter);

  const formatPrice = (min: number, max: number) => {
    const fmt = (n: number) => n >= 1000
      ? n.toLocaleString(undefined, { maximumFractionDigits: 0 })
      : n.toFixed(2);
    return `${selectedCurrency.symbol}${fmt(min)} - ${selectedCurrency.symbol}${fmt(max)}`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-emerald-700 via-green-600 to-teal-600 text-white py-6 px-4">
        <div className="max-w-screen-md mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/80 mb-3 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <Store className="w-7 h-7" />
            <h1 className="text-2xl font-bold">African Markets</h1>
          </div>
          <p className="text-white/80 text-sm mt-1">
            High-demand products & market contacts • Prices in {selectedCurrency.code}
          </p>
        </div>
      </header>

      <div className="max-w-screen-md mx-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading African market intelligence...</p>
          </div>
        ) : (
          <Tabs defaultValue="products" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="products" className="gap-1">
                <Flame className="w-4 h-4" /> Products ({products.length})
              </TabsTrigger>
              <TabsTrigger value="markets" className="gap-1">
                <MapPin className="w-4 h-4" /> Markets ({markets.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-3 mt-3">
              <div className="flex items-center justify-between gap-2">
                <Select value={demandFilter} onValueChange={setDemandFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Demand</SelectItem>
                    <SelectItem value="Very High">🔥 Very High</SelectItem>
                    <SelectItem value="High">📈 High</SelectItem>
                    <SelectItem value="Moderate">📊 Moderate</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => initAndFetch()} className="gap-1">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </Button>
              </div>

              {filteredProducts.map((p, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-foreground text-lg">{p.product}</h3>
                        <p className="text-sm text-primary font-semibold">
                          {formatPrice(p.price_range_min, p.price_range_max)}
                          <span className="text-muted-foreground font-normal"> {p.unit}</span>
                        </p>
                      </div>
                      <Badge className={getDemandColor(p.demand_level)}>
                        {p.demand_level === 'Very High' && '🔥'} {p.demand_level}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.top_markets.map((m, j) => (
                        <Badge key={j} variant="outline" className="text-xs">
                          <MapPin className="w-3 h-3 mr-0.5" />{m}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>📅 {p.season}</span>
                    </div>
                    {p.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{p.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="markets" className="space-y-3 mt-3">
              <Card className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                <p className="text-xs text-emerald-800 dark:text-emerald-200">
                  🏪 Major agricultural markets across Africa. Contact them for bulk pricing and trade opportunities.
                </p>
              </Card>

              {markets.map((m, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-foreground">{m.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {m.location}
                        </p>
                      </div>
                      <Badge className={getTypeColor(m.type)}>{m.type}</Badge>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3">
                      <BarChart3 className="w-3 h-3 inline mr-1" />
                      {m.specialization}
                    </p>

                    <div className="space-y-1.5 text-sm">
                      {m.contact_phone && (
                        <a href={`tel:${m.contact_phone}`} className="flex items-center gap-2 text-primary hover:underline">
                          <Phone className="w-3.5 h-3.5" /> {m.contact_phone}
                        </a>
                      )}
                      {m.contact_email && (
                        <a href={`mailto:${m.contact_email}`} className="flex items-center gap-2 text-primary hover:underline">
                          <Mail className="w-3.5 h-3.5" /> {m.contact_email}
                        </a>
                      )}
                      {m.website && (
                        <a href={m.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                          <Globe className="w-3.5 h-3.5" /> Website
                        </a>
                      )}
                      {m.operating_hours && (
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" /> {m.operating_hours}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default AfricanMarkets;
