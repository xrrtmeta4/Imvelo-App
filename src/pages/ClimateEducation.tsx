import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  CloudRain, 
  Sun, 
  Wind, 
  Snowflake, 
  Thermometer, 
  Droplets,
  AlertTriangle,
  Leaf,
  Shield,
  BookOpen
} from 'lucide-react';

interface WeatherEvent {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  safetyMeasures: string[];
  farmingTips: string[];
}

const weatherEvents: WeatherEvent[] = [
  {
    id: 'drought',
    title: 'Drought Conditions',
    icon: <Sun className="w-6 h-6 text-orange-500" />,
    description: 'Extended periods of low rainfall can severely impact crop yields and livestock health.',
    safetyMeasures: [
      'Store water in tanks and containers during rainy season',
      'Reduce water usage by fixing leaks and using drip irrigation',
      'Create shade structures for livestock',
      'Keep emergency water reserves for drinking'
    ],
    farmingTips: [
      'Plant drought-resistant crop varieties',
      'Use mulching to retain soil moisture',
      'Implement conservation tillage practices',
      'Consider reducing herd size if water is scarce',
      'Harvest rainwater from rooftops'
    ]
  },
  {
    id: 'flooding',
    title: 'Flooding & Heavy Rains',
    icon: <CloudRain className="w-6 h-6 text-blue-500" />,
    description: 'Excessive rainfall can cause soil erosion, crop damage, and waterborne diseases.',
    safetyMeasures: [
      'Move livestock to higher ground before floods',
      'Avoid crossing flooded roads or rivers',
      'Store important documents in waterproof containers',
      'Have an evacuation plan ready',
      'Keep emergency supplies accessible'
    ],
    farmingTips: [
      'Build drainage channels around fields',
      'Use raised beds for vegetable gardens',
      'Plant cover crops to prevent soil erosion',
      'Create water diversion channels',
      'Avoid planting in flood-prone low areas'
    ]
  },
  {
    id: 'heatwave',
    title: 'Heat Waves',
    icon: <Thermometer className="w-6 h-6 text-red-500" />,
    description: 'Extreme heat can stress crops, livestock, and people, reducing productivity.',
    safetyMeasures: [
      'Stay hydrated - drink water regularly',
      'Work during cooler morning and evening hours',
      'Wear light-colored, loose clothing',
      'Take regular breaks in shade',
      'Check on elderly neighbors and livestock frequently'
    ],
    farmingTips: [
      'Water crops early morning or late evening',
      'Use shade cloth for sensitive crops',
      'Provide ventilation and shade for animals',
      'Increase water availability for livestock',
      'Delay planting if extreme heat is forecasted'
    ]
  },
  {
    id: 'frost',
    title: 'Frost & Cold Weather',
    icon: <Snowflake className="w-6 h-6 text-cyan-500" />,
    description: 'Cold snaps can damage tender crops and affect livestock health.',
    safetyMeasures: [
      'Prepare warm shelter for livestock',
      'Stock up on firewood and warm clothing',
      'Insulate water pipes to prevent freezing',
      'Keep emergency heating supplies ready'
    ],
    farmingTips: [
      'Cover tender plants with cloth or plastic at night',
      'Plant frost-resistant varieties in prone areas',
      'Delay planting sensitive crops until frost risk passes',
      'Use row covers and cold frames',
      'Water plants before a frost to provide insulation'
    ]
  },
  {
    id: 'windstorm',
    title: 'Strong Winds & Storms',
    icon: <Wind className="w-6 h-6 text-gray-500" />,
    description: 'High winds can damage structures, uproot crops, and create fire risks.',
    safetyMeasures: [
      'Secure loose objects around the farm',
      'Stay indoors during severe storms',
      'Keep away from trees and power lines',
      'Have emergency supplies ready',
      'Know your shelter locations'
    ],
    farmingTips: [
      'Plant windbreaks with trees and shrubs',
      'Stake tall crops like maize and sunflowers',
      'Secure greenhouse and tunnel structures',
      'Harvest ripe crops before expected storms',
      'Strengthen animal shelters'
    ]
  },
  {
    id: 'humidity',
    title: 'High Humidity & Disease',
    icon: <Droplets className="w-6 h-6 text-teal-500" />,
    description: 'High moisture levels promote fungal diseases and pest outbreaks.',
    safetyMeasures: [
      'Ensure good ventilation in living spaces',
      'Watch for mold in stored crops and food',
      'Prevent mosquito breeding in standing water'
    ],
    farmingTips: [
      'Space plants adequately for air circulation',
      'Remove infected plant material immediately',
      'Apply preventive fungicide treatments',
      'Harvest crops at correct moisture levels',
      'Store grains in dry, ventilated areas'
    ]
  }
];

const weeklyFocus = [
  { week: 'Week 1', topic: 'Drought Preparedness', description: 'Learn water conservation and drought-resistant farming techniques' },
  { week: 'Week 2', topic: 'Flood Safety', description: 'Understand flood prevention and emergency response measures' },
  { week: 'Week 3', topic: 'Heat Management', description: 'Protect crops and livestock during extreme heat' },
  { week: 'Week 4', topic: 'Storm Readiness', description: 'Prepare for wind and thunderstorm events' }
];

const ClimateEducation = () => {
  const [activeTab, setActiveTab] = useState('events');

  // Get current week of month (1-4)
  const currentWeek = Math.min(Math.ceil(new Date().getDate() / 7), 4);
  const currentFocus = weeklyFocus[currentWeek - 1];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Leaf className="w-6 h-6" />
          Climate Change Education Hub
        </h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        {/* Weekly Focus Banner */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="bg-primary/20 p-2 rounded-full">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">This Week's Focus</p>
                <h3 className="font-semibold text-lg">{currentFocus.topic}</h3>
                <p className="text-sm text-muted-foreground mt-1">{currentFocus.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="events">Weather Events</TabsTrigger>
            <TabsTrigger value="safety">Safety Guide</TabsTrigger>
            <TabsTrigger value="climate">Climate Change</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Weather Events & Preparedness
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {weatherEvents.map((event) => (
                    <AccordionItem key={event.id} value={event.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          {event.icon}
                          <span>{event.title}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-4 pt-2">
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                          <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-blue-600" />
                            Safety Measures
                          </h4>
                          <ul className="space-y-1">
                            {event.safetyMeasures.map((measure, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <span className="text-blue-600">•</span>
                                {measure}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                          <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                            <Leaf className="w-4 h-4 text-green-600" />
                            Farming Tips
                          </h4>
                          <ul className="space-y-1">
                            {event.farmingTips.map((tip, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <span className="text-green-600">•</span>
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="safety" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-blue-500" />
                  Emergency Safety Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">General Emergency Preparedness</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">1.</span>
                      Keep a battery-powered radio for weather updates
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">2.</span>
                      Store at least 3 days of drinking water per person
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">3.</span>
                      Maintain a first aid kit with essential medicines
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">4.</span>
                      Keep important documents in waterproof bags
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">5.</span>
                      Know your local emergency contact numbers
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary font-bold">6.</span>
                      Have a meeting point for family members
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Livestock Emergency Care</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">•</span>
                      Identify safe shelter areas for all animals
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">•</span>
                      Store extra feed for at least one week
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">•</span>
                      Have veterinary supplies and medications ready
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">•</span>
                      Keep animal identification records updated
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">•</span>
                      Know evacuation routes for livestock transport
                    </li>
                  </ul>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg">
                  <h3 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    Emergency Contacts
                  </h3>
                  <p className="text-sm mt-2 text-muted-foreground">
                    Save these numbers in your phone for emergencies:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Police/Emergency: 999</li>
                    <li>• Fire Department: 933</li>
                    <li>• Ambulance: 977</li>
                    <li>• Disaster Management: Contact local office</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="climate" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Leaf className="w-5 h-5 text-green-500" />
                  Understanding Climate Change
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="font-semibold">What is Climate Change?</h3>
                  <p className="text-sm text-muted-foreground">
                    Climate change refers to long-term shifts in global temperatures and weather patterns. 
                    While natural causes exist, human activities have been the main driver since the 1800s, 
                    primarily through burning fossil fuels.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">Impacts on Farming in Eswatini</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      Unpredictable rainfall patterns affecting planting seasons
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      More frequent droughts reducing crop yields
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      Increased pest and disease pressure
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      Rising temperatures affecting livestock health
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-500 font-bold">•</span>
                      Soil degradation and erosion from extreme weather
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold">What Farmers Can Do</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      Adopt climate-smart agriculture practices
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      Plant trees and maintain vegetation cover
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      Use water-efficient irrigation methods
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      Diversify crops to spread risk
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      Practice soil conservation techniques
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      Stay informed through weather updates and alerts
                    </li>
                  </ul>
                </div>

                <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-700 dark:text-green-400">
                    Enable Notifications
                  </h3>
                  <p className="text-sm mt-2 text-muted-foreground">
                    Stay informed about weather changes and climate alerts. 
                    Visit your Profile page to enable push notifications for automatic hourly weather updates.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Weekly Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weekly Weather Focus Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weeklyFocus.map((item, index) => (
                <div 
                  key={item.week} 
                  className={`p-3 rounded-lg border ${
                    index + 1 === currentWeek 
                      ? 'bg-primary/10 border-primary' 
                      : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{item.week}</p>
                      <p className="font-medium">{item.topic}</p>
                    </div>
                    {index + 1 === currentWeek && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        Current
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClimateEducation;