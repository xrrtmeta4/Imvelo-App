import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, LogOut, Package, Edit, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    location: '',
  });
  const [listings, setListings] = useState<any[]>([]);
  const [editingListing, setEditingListing] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    product_name: '',
    price: '',
    quantity: '',
    unit: '',
    category: '',
    description: '',
    location: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserListings();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (data) {
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        phone_number: data.phone_number || '',
        location: data.location || '',
      });
    }
    setLoading(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update(formData)
      .eq('id', user?.id);

    if (error) {
      toast.error('Kuhlulekile ukushintja');
    } else {
      toast.success('Kushintjiwe ngempumelelo!');
      fetchProfile();
    }
    setLoading(false);
  };

  const fetchUserListings = async () => {
    const { data } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('seller_id', user?.id)
      .order('created_at', { ascending: false });

    if (data) {
      setListings(data);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    const { error } = await supabase
      .from('marketplace_listings')
      .delete()
      .eq('id', listingId);

    if (error) {
      toast.error('Kuhlulekile kususa');
    } else {
      toast.success('Kususiwe ngempumelelo!');
      fetchUserListings();
    }
  };

  const handleEditListing = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('marketplace_listings')
      .update({
        product_name: editFormData.product_name,
        price: parseFloat(editFormData.price),
        quantity: parseFloat(editFormData.quantity),
        unit: editFormData.unit,
        category: editFormData.category,
        description: editFormData.description,
        location: editFormData.location
      })
      .eq('id', editingListing.id);

    if (error) {
      toast.error('Kuhlulekile kushintja');
    } else {
      toast.success('Kushintjiwe ngempumelelo!');
      setEditingListing(null);
      fetchUserListings();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold">I-Profile Yami</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Imininingwane Yami
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Ligama Lonkhe</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Inombolo Yocingo</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Indawo</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label>Umsebenzi</Label>
                <p className="text-sm font-medium capitalize">{profile?.role}</p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                Gcina Kushintja
              </Button>
            </form>

            <Button
              variant="destructive"
              className="w-full mt-4"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Phuma
            </Button>
          </CardContent>
        </Card>

        {/* User's Marketplace Listings */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Tintfo Tami Temakethe
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => navigate('/create-listing')}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Faka
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate('/seller-analytics')}
                >
                  Buka Tibalo
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {listings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Awunato tintfo temakethe
              </p>
            ) : (
              <div className="space-y-4">
                {listings.map((listing) => (
                  <Card key={listing.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {listing.image_url && (
                            <img 
                              src={listing.image_url} 
                              alt={listing.product_name}
                              className="w-full h-32 object-cover rounded-md mb-3"
                            />
                          )}
                          <h3 className="font-semibold text-lg">{listing.product_name}</h3>
                          <p className="text-sm text-muted-foreground">{listing.category}</p>
                          <p className="text-primary font-bold mt-1">
                            E{listing.price} / {listing.unit}
                          </p>
                          {listing.quantity && (
                            <p className="text-sm">Linani: {listing.quantity}</p>
                          )}
                          {listing.location && (
                            <p className="text-sm text-muted-foreground">Indzawo: {listing.location}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Dialog open={editingListing?.id === listing.id} onOpenChange={(open) => !open && setEditingListing(null)}>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setEditingListing(listing);
                                  setEditFormData({
                                    product_name: listing.product_name,
                                    price: listing.price.toString(),
                                    quantity: listing.quantity?.toString() || '',
                                    unit: listing.unit,
                                    category: listing.category,
                                    description: listing.description || '',
                                    location: listing.location || ''
                                  });
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Hlela Into</DialogTitle>
                              </DialogHeader>
                              <form onSubmit={handleEditListing} className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Ligama Lomkhicito</Label>
                                  <Input
                                    value={editFormData.product_name}
                                    onChange={(e) => setEditFormData({...editFormData, product_name: e.target.value})}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Intengo</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={editFormData.price}
                                    onChange={(e) => setEditFormData({...editFormData, price: e.target.value})}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Linani</Label>
                                  <Input
                                    type="number"
                                    value={editFormData.quantity}
                                    onChange={(e) => setEditFormData({...editFormData, quantity: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Silinganiselwa</Label>
                                  <Input
                                    value={editFormData.unit}
                                    onChange={(e) => setEditFormData({...editFormData, unit: e.target.value})}
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Indzawo</Label>
                                  <Input
                                    value={editFormData.location}
                                    onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Inchazelo</Label>
                                  <Input
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                                  />
                                </div>
                                <Button type="submit" className="w-full">
                                  Gcina Kushintja
                                </Button>
                              </form>
                            </DialogContent>
                          </Dialog>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Uyacinca kutsi ufuna kususa lento?')) {
                                handleDeleteListing(listing.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
