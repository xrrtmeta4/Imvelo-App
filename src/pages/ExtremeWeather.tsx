import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Sun, CloudRain, Wind, Snowflake, Flame, Droplets, Sprout, Shield } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

const weatherTypes = [
  {
    titleKey: 'drought',
    icon: Sun,
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    crops: ['droughtCrop1', 'droughtCrop2', 'droughtCrop3', 'droughtCrop4', 'droughtCrop5', 'droughtCrop6'],
    livestock: ['droughtLivestock1', 'droughtLivestock2', 'droughtLivestock3', 'droughtLivestock4', 'droughtLivestock5', 'droughtLivestock6'],
  },
  {
    titleKey: 'flooding',
    icon: CloudRain,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    crops: ['floodingCrop1', 'floodingCrop2', 'floodingCrop3', 'floodingCrop4', 'floodingCrop5', 'floodingCrop6'],
    livestock: ['floodingLivestock1', 'floodingLivestock2', 'floodingLivestock3', 'floodingLivestock4', 'floodingLivestock5', 'floodingLivestock6'],
  },
  {
    titleKey: 'heatwave',
    icon: Flame,
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    crops: ['heatwaveCrop1', 'heatwaveCrop2', 'heatwaveCrop3', 'heatwaveCrop4', 'heatwaveCrop5', 'heatwaveCrop6'],
    livestock: ['heatwaveLivestock1', 'heatwaveLivestock2', 'heatwaveLivestock3', 'heatwaveLivestock4', 'heatwaveLivestock5', 'heatwaveLivestock6'],
  },
  {
    titleKey: 'coldSpell',
    icon: Snowflake,
    color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30',
    crops: ['coldSpellCrop1', 'coldSpellCrop2', 'coldSpellCrop3', 'coldSpellCrop4', 'coldSpellCrop5', 'coldSpellCrop6'],
    livestock: ['coldSpellLivestock1', 'coldSpellLivestock2', 'coldSpellLivestock3', 'coldSpellLivestock4', 'coldSpellLivestock5', 'coldSpellLivestock6'],
  },
  {
    titleKey: 'strongWinds',
    icon: Wind,
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    crops: ['strongWindsCrop1', 'strongWindsCrop2', 'strongWindsCrop3', 'strongWindsCrop4', 'strongWindsCrop5', 'strongWindsCrop6'],
    livestock: ['strongWindsLivestock1', 'strongWindsLivestock2', 'strongWindsLivestock3', 'strongWindsLivestock4', 'strongWindsLivestock5', 'strongWindsLivestock6'],
  },
];

const generalTips = ['generalTip1', 'generalTip2', 'generalTip3', 'generalTip4', 'generalTip5'];

const ExtremeWeather = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-sky-600 to-sky-700 text-white py-8 px-4">
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/10">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('extremeWeather')}</h1>
            <p className="text-sm text-white/80 mt-0.5">{t('extremeWeatherSubtitle')}</p>
          </div>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <Card className="bg-sky-50/50 border-sky-200 dark:bg-sky-950/20 dark:border-sky-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-sky-600" />
              {t('whyThisMatters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('extremeWeatherDesc')}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-5">
          {weatherTypes.map((weather, idx) => {
            const Icon = weather.icon;
            return (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-base">
                    <div className={`p-2 rounded-lg ${weather.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {t(weather.titleKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Sprout className="w-4 h-4 text-green-600" />
                      {t('crops')}
                    </h3>
                    <ul className="space-y-1.5">
                      {weather.crops.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1 text-lg leading-none">•</span>
                          <span>{t(tip)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-600" />
                      {t('livestock')}
                    </h3>
                    <ul className="space-y-1.5">
                      {weather.livestock.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1 text-lg leading-none">•</span>
                          <span>{t(tip)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Droplets className="w-5 h-5 text-primary" />
              {t('generalPreparedness')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {generalTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-1 text-lg leading-none">•</span>
                  <span>{t(tip)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExtremeWeather;
