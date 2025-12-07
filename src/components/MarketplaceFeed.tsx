import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Search, User, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const MarketplaceFeed = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      // Fetch listings first
      const { data: listingsData, error: listingsError } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (listingsError) throw listingsError;

      if (listingsData && listingsData.length > 0) {
        // Get unique seller IDs
        const sellerIds = [...new Set(listingsData.map(l => l.seller_id))];
        
        // Fetch profiles for those sellers
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, location')
          .in('id', sellerIds);

        // Merge profiles into listings
        const listingsWithProfiles = listingsData.map(listing => ({
          ...listing,
          profiles: profilesData?.find(p => p.id === listing.seller_id) || null
        }));

        setListings(listingsWithProfiles);
      } else {
        setListings([]);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = !locationFilter || 
      listing.location?.toLowerCase().includes(locationFilter.toLowerCase()) ||
      listing.profiles?.location?.toLowerCase().includes(locationFilter.toLowerCase());
    return matchesSearch && matchesLocation;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          Imakethe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Funa tintfo"
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Input
            placeholder="Funisela ngendawo..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
          />
        </div>
        
        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Kuyalayisha...</p>
          ) : filteredListings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Akukho tintfo</p>
          ) : (
            filteredListings.map((listing) => (
              <div key={listing.id} className="p-3 rounded-lg bg-accent/50 border border-border">
                {listing.image_url && (
                  <img
                    src={listing.image_url}
                    alt={listing.product_name}
                    className="w-full h-32 object-cover rounded-lg mb-2"
                  />
                )}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-medium">{listing.product_name}</p>
                    <p className="text-sm text-muted-foreground">
                      E{listing.price}/{listing.unit}
                    </p>
                  </div>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => navigate(`/product/${listing.id}`)}
                  >
                    Buka
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{listing.profiles?.full_name || 'Unknown'}</span>
                  </div>
                  {listing.profiles?.location && (
                    <span>{listing.profiles.location}</span>
                  )}
                </div>
                {user && user.id !== listing.seller_id && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={async () => {
                      await supabase.rpc('increment_listing_messages', { listing_id: listing.id });
                      navigate(`/messages?seller=${listing.seller_id}&listing=${listing.id}`);
                    }}
                  >
                    <MessageCircle className="w-3 h-3 mr-1" />
                    Xhumana Nemtengiselisi
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketplaceFeed;
