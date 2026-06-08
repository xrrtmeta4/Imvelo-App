import { ArrowLeft, Type, Wifi, Sun, Minus, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { useSettings } from '@/hooks/useSettings';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const Settings = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { fontSize, setFontSize, dataSaver, setDataSaver, brightness, setBrightness } = useSettings();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-3 px-4 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="text-primary-foreground/80">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">{t('settings')}</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-4 space-y-4">
        {/* Language */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t('language')}</CardTitle>
          </CardHeader>
          <CardContent>
            <LanguageSwitcher />
          </CardContent>
        </Card>

        {/* Font Size */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Type className="w-4 h-4" />
              {t('fontSizeLabel')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setFontSize(fontSize - 1)}>
                <Minus className="w-4 h-4" />
              </Button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-bold">{fontSize}px</span>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setFontSize(fontSize + 1)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <Slider
              value={[fontSize]}
              onValueChange={([v]) => setFontSize(v)}
              min={12}
              max={24}
              step={1}
            />
            <p className="text-xs text-muted-foreground">{t('fontSizeHint')}</p>
            <div className="p-3 bg-muted rounded-lg">
              <p style={{ fontSize: `${fontSize}px` }}>{t('fontPreview')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Data Saver */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              {t('dataSaverLabel')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">{t('dataSaverDesc')}</p>
              </div>
              <Switch checked={dataSaver} onCheckedChange={setDataSaver} />
            </div>
          </CardContent>
        </Card>

        {/* Brightness */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sun className="w-4 h-4" />
              {t('brightnessLabel')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Sun className="w-4 h-4 text-muted-foreground" />
              <Slider
                value={[brightness]}
                onValueChange={([v]) => setBrightness(v)}
                min={30}
                max={100}
                step={5}
                className="flex-1"
              />
              <span className="text-sm font-medium w-10 text-right">{brightness}%</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('brightnessHint')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Type className="w-4 h-4" />
              Legal & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate('/terms-of-service')}
            >
              <span>{t('termsOfService')}</span>
              <span className="text-xs text-muted-foreground">View</span>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => navigate('/privacy-policy')}
            >
              <span>{t('privacyPolicy')}</span>
              <span className="text-xs text-muted-foreground">View</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;