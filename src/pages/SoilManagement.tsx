import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Droplets, TestTube, Recycle } from 'lucide-react';

const SoilManagement = () => {
  const tips = [
    {
      title: "Kuhlola Inhlabati",
      icon: TestTube,
      description: "Hlola inhlabati yakho njalo kusita kwati kutsi inemitselo muni",
      details: [
        "Hlola pH level (4.5-7.5 lehle kulilimo)",
        "Bona ematselo ladzingekako (N, P, K)",
        "Hlola kutsi inhlabati iteseka kahle yini"
      ]
    },
    {
      title: "Kumanyelisa",
      icon: Leaf,
      description: "Sebentisa imanyolo kusita kulondza inhlabati iphilile",
      details: [
        "Sebentisa umanyolo wemvelo (compost, manure)",
        "Faka umanyolo lapho kudzingeka khona",
        "Hlanganisa umanyolo nemhlabati kahle"
      ]
    },
    {
      title: "Emanti Nenhlabati",
      icon: Droplets,
      description: "Phata emanti nenhlabati ngendlela lefanele",
      details: [
        "Nika emanti afanele, hhayi lamancanti kakhulu",
        "Sebentisa mulch kulondvolota emanti",
        "Enta tikhambi letifanele ekwesekeni"
      ]
    },
    {
      title: "Kuguga Tijalo",
      icon: Recycle,
      description: "Guga tijalo letehlukahlukene ngenkathi",
      details: [
        "Guga tijalo kuvikela inhlabati",
        "Yehlisa tifo natilusizi",
        "Vundza inhlabati ngemvelo"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-primary text-primary-foreground py-4 px-4">
        <h1 className="text-xl font-bold">Kuphata Inhlabati</h1>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tindlela Tekuphata Inhlabati</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Inhlabati lephilile yisisekelo sekuvuna lokukhulu. Landzelela lawo macebiso kulondza inhlabati yakho iphilile.
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
            <p className="text-sm font-medium mb-2">Khumbula:</p>
            <p className="text-sm text-muted-foreground">
              Inhlabati lephilile itawukuphatsa ngekuvuna lokukhulu nelikhulu. Yinakekela kahle futsi itawukunakekela nawe!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SoilManagement;