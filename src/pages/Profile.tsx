import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, LogOut, Camera, Crown, Languages, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PushNotificationManager from '@/components/PushNotificationManager';

const Profile = () => {
  const { user } = useAuth();
  const { t, setLang } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpiry, setPremiumExpiry] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    location: '',
    preferred_language: 'en',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      checkPremiumStatus();
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
        preferred_language: data.preferred_language || 'en',
      });
    }
    setLoading(false);
  };

  const checkPremiumStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('premium_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (data) {
      setIsPremium(true);
      setPremiumExpiry(data.expires_at);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update(formData)
      .eq('id', user?.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully!');
      if (formData.preferred_language) {
        setLang(formData.preferred_language);
      }
      fetchProfile();
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Avatar updated successfully!');
      fetchProfile();
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold">{t('myProfile')}</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Profile avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-muted-foreground" />
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full w-8 h-8"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera className="w-4 h-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="text-center">
                <h2 className="font-semibold text-lg">{profile?.full_name || 'User'}</h2>
                <p className="text-sm text-muted-foreground capitalize">{profile?.role}</p>
                {isPremium ? (
                  <Badge className="mt-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0">
                    <Crown className="w-3 h-3 mr-1" />
                    {t('premiumMember')}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="mt-2">
                    {t('freePlan')}
                  </Badge>
                )}
                {isPremium && premiumExpiry && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('expires')}: {new Date(premiumExpiry).toLocaleDateString()}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-2"
                  onClick={() => navigate('/upgrade')}
                >
                  <Zap className="w-4 h-4" />
                  {isPremium ? t('managePlan') : t('upgradePlan')}
                </Button>
              </div>
              {uploading && (
                <p className="text-sm text-muted-foreground">{t('uploading')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <PushNotificationManager />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {t('myInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t('fullName')}</Label>
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
                <Label htmlFor="phone_number">{t('phone')}</Label>
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
                <Label htmlFor="location">{t('location')}</Label>
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
                <Label htmlFor="preferred_language" className="flex items-center gap-2">
                  <Languages className="w-4 h-4" />
                  {t('language')}
                </Label>
                <Select
                  value={formData.preferred_language}
                  onValueChange={(value) => setFormData({ ...formData, preferred_language: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('language')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="fr">Français (French)</SelectItem>
                    <SelectItem value="de">Deutsch (German)</SelectItem>
                    <SelectItem value="es">Español (Spanish)</SelectItem>
                    <SelectItem value="pt">Português (Portuguese)</SelectItem>
                    <SelectItem value="it">Italiano (Italian)</SelectItem>
                    <SelectItem value="nl">Nederlands (Dutch)</SelectItem>
                    <SelectItem value="pl">Polski (Polish)</SelectItem>
                    <SelectItem value="sv">Svenska (Swedish)</SelectItem>
                    <SelectItem value="da">Dansk (Danish)</SelectItem>
                    <SelectItem value="no">Norsk (Norwegian)</SelectItem>
                    <SelectItem value="fi">Suomi (Finnish)</SelectItem>
                    <SelectItem value="el">Ελληνικά (Greek)</SelectItem>
                    <SelectItem value="cs">Čeština (Czech)</SelectItem>
                    <SelectItem value="hu">Magyar (Hungarian)</SelectItem>
                    <SelectItem value="ro">Română (Romanian)</SelectItem>
                    <SelectItem value="bg">Български (Bulgarian)</SelectItem>
                    <SelectItem value="hr">Hrvatski (Croatian)</SelectItem>
                    <SelectItem value="sk">Slovenčina (Slovak)</SelectItem>
                    <SelectItem value="sl">Slovenščina (Slovenian)</SelectItem>
                    <SelectItem value="ss">siSwati</SelectItem>
                    <SelectItem value="sw">Kiswahili (Swahili)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('langHint')}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{t('role')}</Label>
                <p className="text-sm font-medium capitalize">{profile?.role}</p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {t('save')}
              </Button>
            </form>

            <Button
              variant="destructive"
              className="w-full mt-4"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('logout')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
