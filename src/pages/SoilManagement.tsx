import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Droplets, TestTube, Recycle } from 'lucide-react';

const SoilManagement = () => {
  const tips = [
    {
      title: "Soil Testing",
      icon: TestTube,
      description: "Test your soil regularly to understand its nutrient content",
      details: [
        "Check pH level (4.5-7.5 is ideal for farming)",
        "Identify required nutrients (N, P, K)",
        "Check if soil drains properly"
      ]
    },
    {
      title: "Fertilization",
      icon: Leaf,
      description: "Use fertilizer to keep your soil healthy",
      details: [
        "Use organic fertilizer (compost, manure)",
        "Apply fertilizer where needed",
        "Mix fertilizer with soil thoroughly"
      ]
    },
    {
      title: "Water & Soil",
      icon: Droplets,
      description: "Manage water and soil properly",
      details: [
        "Provide adequate water, not too little",
        "Use mulch to retain moisture",
        "Create proper drainage channels"
      ]
    },
    {
      title: "Crop Rotation",
      icon: Recycle,
      description: "Rotate different crops over time",
      details: [
        "Rotate crops to protect the soil",
        "Reduce diseases and pests",
        "Enrich soil naturally"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold">Soil Management</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Soil Management Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Healthy soil is the foundation of a good harvest. Follow these tips to keep your soil healthy.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {tips.map((tip, idx) => (
            <Card key={idx}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <tip.icon className="w-5 h-5 text-primary" />
                  {tip.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{tip.description}</p>
                <div className="bg-accent/50 p-3 rounded-lg space-y-2">
                  {tip.details.map((detail, detailIdx) => (
                    <p key={detailIdx} className="text-xs">
                      • {detail}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm font-medium mb-2">Remember:</p>
            <p className="text-sm text-muted-foreground">
              Healthy soil will reward you with a big and abundant harvest. Take care of it and it will take care of you!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SoilManagement;
