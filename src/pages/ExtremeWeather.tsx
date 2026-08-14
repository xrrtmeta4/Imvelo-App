import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sun, CloudRain, Wind, Snowflake, Flame, Droplets, Sprout, Shield, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

const weatherTypes = [
  {
    titleKey: 'drought',
    icon: Sun,
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    crops: [
      'Use drought-tolerant crop varieties',
      'Apply mulch to retain soil moisture',
      'Use drip irrigation to water roots directly',
      'Harvest rainwater when it rains',
      'Avoid over-fertilizing; it increases water needs',
      'Plant windbreaks to reduce evaporation',
    ],
    livestock: [
      'Provide extra water points around the farm',
      'Move animals to shaded grazing areas',
      'Supplement feed with hay and protein blocks',
      'Monitor animals for signs of dehydration',
      'Use mineral licks to maintain health',
      'Avoid moving livestock during the hottest hours',
    ],
  },
  {
    titleKey: 'flooding',
    icon: CloudRain,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    crops: [
      'Raise seed beds before heavy rains',
      'Plant flood-tolerant varieties such as rice',
      'Improve field drainage with ditches or channels',
      'Avoid planting in low-lying water-logged areas',
      'Use raised containers for sensitive vegetables',
      'Apply fungicides preventively after floods',
    ],
    livestock: [
      'Move animals to higher ground before floods',
      'Store feed in waterproof, elevated containers',
      'Disinfect shelters after floodwaters recede',
      'Vaccinate against waterborne diseases',
      'Provide dry bedding in temporary shelters',
      'Check water sources for contamination',
    ],
  },
  {
    titleKey: 'heatwave',
    icon: Flame,
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    crops: [
      'Water early morning or late evening',
      'Use shade nets for sensitive crops',
      'Increase irrigation frequency but reduce quantity',
      'Avoid pruning during extreme heat',
      'Apply kaolin clay sprays to reflect sunlight',
      'Harvest ripe produce earlier than usual',
    ],
    livestock: [
      'Ensure constant access to cool, clean water',
      'Provide artificial shade in holding pens',
      'Feed during cooler parts of the day',
      'Watch for heat stress: panting, lethargy, drooling',
      'Sprinkle water on animals if necessary',
      'Reduce stocking density temporarily',
    ],
  },
  {
    titleKey: 'coldSpell',
    icon: Snowflake,
    color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30',
    crops: [
      'Cover seedlings with cloth or plastic at night',
      'Use frost-tolerant varieties in cold seasons',
      'Water crops before expected frost; moist soil retains heat',
      'Use smoke generators or heaters in orchards',
      'Avoid late-season nitrogen applications',
      'Mulch roots of perennial crops with straw',
    ],
    livestock: [
      'Provide warm, dry shelter with bedding',
      'Increase energy-rich feed during cold periods',
      'Protect young animals with blankets or covers',
      'Ensure water does not freeze; use heated drinkers',
      'Reduce wind exposure with windbreaks',
      'Monitor for hypothermia and pneumonia',
    ],
  },
  {
    titleKey: 'strongWinds',
    icon: Wind,
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    crops: [
      'Install windbreaks with trees or fences',
      'Use stakes and supports for tall crops',
      'Plant in sheltered areas away from open fields',
      'Harvest mature crops before storm season',
      'Secure greenhouses and tunnel structures',
      'Remove weak branches that could become projectiles',
    ],
    livestock: [
      'Secure animals in sturdy shelters before storms',
      'Reinforce fences and gates',
      'Store feed in windproof, elevated locations',
      'Keep emergency supplies on hand',
      'Avoid tying animals to trees or weak posts',
      'Inspect shelters after storms for damage',
    ],
  },
];

const generalTips = [
  'Stay updated with local weather forecasts and early warning systems.',
  'Create a farm emergency plan for your family and workers.',
  'Keep an emergency kit with food, water, medicine, and tools.',
  'Work with local extension officers for climate-smart advice.',
  'Record weather events and crop responses to improve future planning.',
];

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
          {weatherTypes.map((weather, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className={`p-2 rounded-lg ${weather.color}`}>
                    <weather.icon className="w-5 h-5" />
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
                        <span>{tip}</span>
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
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
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
                  <span>{tip}</span>
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
