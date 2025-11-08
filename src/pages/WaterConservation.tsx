import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, CloudRain, Gauge, Sprout } from 'lucide-react';

const WaterConservation = () => {
  const methods = [
    {
      title: "Drip Irrigation",
      icon: Droplets,
      description: "Kusebentisa emanti ngendlela lefanele",
      benefits: [
        "Sinciphisa emanti lasetjentiswako",
        "Emanti afika embitsini wetijalo",
        "Kunciphisa tilusizi"
      ]
    },
    {
      title: "Rainwater Harvesting",
      icon: CloudRain,
      description: "Butsa emvula kusita ngemalanga lemaomile",
      benefits: [
        "Sinciphisa kuncika emalithini",
        "Mahala futsi asuka emvuleni",
        "Lokuhle kulilimo"
      ]
    },
    {
      title: "Mulching",
      icon: Gauge,
      description: "Embotsa inhlabati kulondza emanti",
      benefits: [
        "Kuvikela kuphuma kwemanti",
        "Gcina inhlabati ipholile",
        "Kuvikela timbuti"
      ]
    },
    {
      title: "Crop Selection",
      icon: Sprout,
      description: "Khetha tijalo letingafuni emanti lamancanti",
      benefits: [
        "Lungele lilanga laso",
        "Kunciphisa kudzinga emanti",
        "Tivuna kahle nangamashaye emvula"
      ]
    }
  ];

  const tips = [
    "Misela ekuseni noma kusihlwa kunciphisa kuphuma kwemanti",
    "Hlola inhlabati ngaphambi kwekumisela",
    "Sebentisa emanti lamaphumula kusita ekutitsaleni letincane",
    "Lungisa tipayipi letilindzako kuvikela kucemeleka kwemanti",
    "Tsala tijalo letitawusebentisa emanti akufana"
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold">Kulondvolota Emanti</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Kungani Kulondvolota Emanti Kubalulekile?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Emanti angumnotfo lobalulekile kulilimo. Kusebentisa emanti ngendlela lefanele kusita kuvikela imvelo, kunciphisa tindleko, nekuvuna kahle nangamashaye emvula.
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
                  <p className="text-xs font-medium mb-2">Tinjongo:</p>
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
            <CardTitle>Emacebiso Lamcoka</CardTitle>
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
            <p className="text-sm font-medium mb-2">Khumbula:</p>
            <p className="text-sm text-muted-foreground">
              Lonke ligotsa lemanti lelilondvolotsako litawusita ekuphatseni kwawo kahle nasemalangeni letidzako!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WaterConservation;