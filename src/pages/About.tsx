import { ArrowLeft, Leaf, Users, Target, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Mayelana Natsi</h1>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-4xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full">
            <Leaf className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground">Imvelo</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Kusita balimi be-Eswatini nge-technology yesimanje nekuhlakanipha kwe-AI
          </p>
        </div>

        {/* Mission */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-full shrink-0">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Injongo Yetfu</h3>
                <p className="text-muted-foreground">
                  Injongo yetfu kusita balimi be-Eswatini kutsi bakhicite kahle futsi batfole imali lengetekile. 
                  Sisebentisa i-technology yesimanje ne-AI kusita ekuhloleni tilokatane, tifo tetilwane, 
                  nekulinganisela sivuno. Sifuna kutsi wonkhe umlimi atfole lusito lolufanele, kungakhatsaleki 
                  kutsi mncane noma mkhulu.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What We Offer */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Siniketa Ini</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">🔍 Kuhlola Tilokatane</h4>
                <p className="text-sm text-muted-foreground">
                  Tsatsa sitfombe sesilwane noma umutsi wakho, i-AI yetfu itokutsela kutsi silokatane sini futsi sikalapha kanjani.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">🐄 Kuhlola Tifo Tetilwane</h4>
                <p className="text-sm text-muted-foreground">
                  Tsatsa sitfombe sesilwane sakho, sitokutsela kutsi siyagula yini futsi wenteni.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">📊 Kulinganisela Sivuno</h4>
                <p className="text-sm text-muted-foreground">
                  Tsatsa sitfombe semkhicito wakho, sitolinganisela kutsi utovuna kangakanani.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">🌤️ Litulu Langempela</h4>
                <p className="text-sm text-muted-foreground">
                  Tfola lwatiso lwelitulu lwendzawo yakho, kanye neticwayiso telilumo lelibi.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">🛒 Imakethe</h4>
                <p className="text-sm text-muted-foreground">
                  Tsengisa imikhicito yakho kubatsengi, futsi utsenge kulabanye balimi.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">📚 Emacebiso Ekulima</h4>
                <p className="text-sm text-muted-foreground">
                  Funda ngekulima lokukahle, kuhlanyela, nekuphatsa umhlabatsi wakho.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Team */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-full shrink-0">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Sicubu Setfu</h3>
                <p className="text-muted-foreground">
                  Imvelo yakhiwe sicubu lesitsandza i-Eswatini nekulima. Sihlangene ne-technology ne-agricultural 
                  science kusita balimi betfu. Sisebenta nebongcweti betemnotfo ne-extension officers kusicinisekisa 
                  kutsi lwatiso lwetfu lucondzile futsi lusita.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Values */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-full shrink-0">
                <Heart className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Lokusibalulekile</h3>
                <ul className="text-muted-foreground space-y-2">
                  <li><strong>Kusita:</strong> Silapha kusita balimi, hhayi kutfola imali kuphela</li>
                  <li><strong>Bucotfo:</strong> Siniketa lwatiso lolucondzile nelocwayelwe</li>
                  <li><strong>Kulula:</strong> I-app yetfu ilula kuyisebentisa wonkhe umuntfu</li>
                  <li><strong>Kubambisana:</strong> Sisebenta nebalimi, hhayi sibaphetse</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact CTA */}
        <div className="text-center py-6">
          <p className="text-muted-foreground mb-4">
            Unemibuto noma ufuna kusita? Sitsintse!
          </p>
          <Link to="/contact">
            <Button size="lg">
              Sitsintse
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default About;