import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, CloudRain, Gauge, Sprout } from 'lucide-react';

const WaterConservation = () => {
  const methods = [
    {
      title: "Drip Irrigation",
      icon: Droplets,
      description: "Use water efficiently and precisely",
      benefits: [
        "Reduces water usage",
        "Water reaches plant roots directly",
        "Reduces weed growth"
      ]
    },
    {
      title: "Rainwater Harvesting",
      icon: CloudRain,
      description: "Collect rainwater to help during dry days",
      benefits: [
        "Reduces reliance on tap water",
        "Free water from rain",
        "Good for farming"
      ]
    },
    {
      title: "Mulching",
      icon: Gauge,
      description: "Cover soil to retain moisture",
      benefits: [
        "Prevents water evaporation",
        "Keeps soil cool",
        "Prevents weeds"
      ]
    },
    {
      title: "Crop Selection",
      icon: Sprout,
      description: "Choose crops that need less water",
      benefits: [
        "Suitable for your climate",
        "Reduces water needs",
        "Harvest well even with little rain"
      ]
    }
  ];

  const tips = [
    "Water in the morning or evening to reduce evaporation",
    "Check soil before watering",
    "Use drip water systems to help small plants",
    "Fix leaking pipes to prevent water waste",
    "Plant crops that use similar amounts of water together"
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold">Water Conservation</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Why is Water Conservation Important?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Water is a precious resource for farming. Using water efficiently helps protect the environment, reduces costs, and ensures good harvests even with little rain.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {methods.map((method, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <method.icon className="w-5 h-5 text-primary" />
                  {method.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{method.description}</p>
                <div className="bg-accent/50 p-3 rounded-lg">
                  <p className="text-xs font-medium mb-2">Benefits:</p>
                  <div className="space-y-1">
                    {method.benefits.map((benefit, benefitIdx) => (
                      <p key={benefitIdx} className="text-xs">
                        ✓ {benefit}
                      </p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Important Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {tips.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-primary text-lg">•</span>
                <p className="text-sm flex-1">{tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-sky/5 border-sky/20">
          <CardContent className="pt-6">
            <p className="text-sm font-medium mb-2">Remember:</p>
            <p className="text-sm text-muted-foreground">
              Every drop of water you save will help you manage it better in the days ahead!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WaterConservation;
