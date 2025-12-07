import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, MapPin, Phone, MessageCircle, Package, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProductDetails();
    }
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      // Fetch listing
      const { data: listingData, error: listingError } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('id', id)
        .single();

      if (listingError) throw listingError;
      setListing(listingData);

      // Increment views
      await supabase.rpc('increment_listing_views', { listing_id: id });

      // Fetch seller profile
      if (listingData?.seller_id) {
        const { data: sellerData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', listingData.seller_id)
          .single();

        setSeller(sellerData);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Kuhlulekile kulayisha umkhicito');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async () => {
    if (!listing) return;
    await supabase.rpc('increment_listing_messages', { listing_id: listing.id });
    navigate(`/messages?seller=${listing.seller_id}&listing=${listing.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-primary text-primary-foreground py-4 px-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Umkhicito</h1>
        </header>
        <div className="max-w-screen-sm mx-auto px-4 py-6">
          <p className="text-center text-muted-foreground">Umkhicito awutfolakali</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary/80">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Imininingwane Yomkhicito</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        {/* Product Image */}
        {listing.image_url && (
          <div className="rounded-xl overflow-hidden">
            <img
              src={listing.image_url}
              alt={listing.product_name}
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        {/* Product Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{listing.product_name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{listing.category}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">E{listing.price}</p>
                <p className="text-sm text-muted-foreground">/{listing.unit}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {listing.description && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Inchazelo</h4>
                <p className="text-sm text-muted-foreground">{listing.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2">
              {listing.quantity && (
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Linani</p>
                    <p className="text-sm font-medium">{listing.quantity} {listing.unit}</p>
                  </div>
                </div>
              )}
              {listing.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Indzawo</p>
                    <p className="text-sm font-medium">{listing.location}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Lafakwa</p>
                  <p className="text-sm font-medium">
                    {new Date(listing.created_at).toLocaleDateString('ss-ZA')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seller Info */}
        {seller && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Umtengiselisi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  {seller.avatar_url ? (
                    <img src={seller.avatar_url} alt={seller.full_name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{seller.full_name}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{seller.role}</p>
                </div>
              </div>

              <div className="space-y-2">
                {seller.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{seller.location}</span>
                  </div>
                )}
                {seller.phone_number && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${seller.phone_number}`} className="text-primary hover:underline">
                      {seller.phone_number}
                    </a>
                  </div>
                )}
              </div>

              {user && user.id !== listing.seller_id && (
                <Button className="w-full" onClick={handleContact}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Xhumana Nemtengiselisi
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">{listing.views || 0}</p>
              <p className="text-sm text-muted-foreground">Tibukeli</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold">{listing.messages_received || 0}</p>
              <p className="text-sm text-muted-foreground">Imilayeto</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;