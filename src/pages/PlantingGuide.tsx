import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Sprout, Sun, Cloud } from 'lucide-react';

const PlantingGuide = () => {
  const seasons = [
    {
      season: "Ehlobo (Spring/Summer)",
      months: "September - February",
      crops: [
        { name: "Umbila", bestTime: "October - November", icon: Sprout },
        { name: "Amazambane", bestTime: "September - October", icon: Sprout },
        { name: "Emabotjisi", bestTime: "October - December", icon: Sprout },
        { name: "Ematsanga", bestTime: "September - November", icon: Sprout }
      ]
    },
    {
      season: "Busika (Autumn/Winter)",
      months: "March - August",
      crops: [
        { name: "Cabbage (Iklabishi)", bestTime: "February - April", icon: Sun },
        { name: "Spinach (Imbuya)", bestTime: "March - July", icon: Cloud },
        { name: "Carrots (Emakhertjisi)", bestTime: "February - May", icon: Sun },
        { name: "Onions (Ema-anyanisi)", bestTime: "March - June", icon: Cloud },
        { name: "Beetroot (Libhithruthi)", bestTime: "March - May", icon: Sun },
        { name: "Lettuce (Letisi)", bestTime: "April - July", icon: Cloud }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold">Kuhlanyela ngekuhamba kwemnyaka</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Kutjala ngekuhamba kwemnyaka
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Khetha sikhatsi lesifanele sekutjala tijalo takho kusita kuvuna lokukhulu nelikhulu.
            </p>

            <div className="space-y-6">
              {seasons.map((season, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="bg-accent p-3 rounded-lg">
                    <h3 className="font-semibold text-sm">{season.season}</h3>
                    <p className="text-xs text-muted-foreground">{season.months}</p>
                  </div>

                  <div className="space-y-2">
                    {season.crops.map((crop, cropIdx) => (
                      <div key={cropIdx} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                        <crop.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{crop.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Sikhatsi lesihle: {crop.bestTime}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lokumcoka</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Hlola umhlabatsi wakho ngaphambi kwekutjala</p>
            <p>• Cala ngekutjala lapho imvula isicale khona</p>
            <p>• Gcina umhlabatsi umanzi kodvwa hhayi kutsi umanji kakhulu</p>
            <p>• Landzelela imiyaleto yekutjala yalelo jalo</p>
            <p>• Sebentisa umanyolo lofanele wekuvundza umhlabatsi</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PlantingGuide;