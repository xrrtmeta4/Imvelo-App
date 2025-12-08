import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Imigomo Nekusebentisa</h1>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-4xl mx-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Kucala kusebenta: December 2024</p>
          
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Kwemukela Imigomo</h2>
            <p className="text-muted-foreground">
              Ngekusebentisa Imvelo, uyavuma kulandzela lemigomo nekusebentisa. Uma ungavumelani nalemigomo, sicela ungayisebentisi i-app.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Incazelo Yelusito</h2>
            <p className="text-muted-foreground">Imvelo iniketa:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Kuhlolwa kwetilokatane nge-AI</li>
              <li>Kuhlolwa kwetifo tetilwane nge-AI</li>
              <li>Kulinganisela sivuno semkhicito</li>
              <li>Lwatiso lwelitulu langempela</li>
              <li>Imakethe yekutsenga nekutsengisa imikhicito yetemnotfo</li>
              <li>Emacebiso ekulima nekuhlanyela</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. I-Akhawunti Yalomsebentisi</h2>
            <p className="text-muted-foreground">
              Kufanele usubhalise i-akhawunti kusebentisa letinye tici. Wena unesibopho sekugcina i-password yakho iyimfihlo nekutsi konkhe lokwenteka nge-akhawunti yakho.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Kusebentisa Lokuvunyelwe</h2>
            <p className="text-muted-foreground">Uyavuma kutsi:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Utosebentisa i-app ngetinjongo temtsetfo kuphela</li>
              <li>Awutokufaka lwatiso lolungemanga</li>
              <li>Awutophula emalungelo alabanye basebentisi</li>
              <li>Awutolinga kudlulela etindzaweni letingakavunyelwa</li>
              <li>Awutoyisebentisa kabi i-app</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Imikhicito Yemakethe</h2>
            <p className="text-muted-foreground">
              Uma utsengisa emakethe yetfu:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Wena unesibopho sekuniketela imikhicito leyiyo</li>
              <li>Intengo nekwenteka kwekutsenga kuphakati kwakho nemtsengi</li>
              <li>Imvelo ayisingeni ekutsengeni nekutsengisa</li>
              <li>Kufanele ulandzele imitsetfo yetemnotfo</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Lusito Lwe-AI</h2>
            <p className="text-muted-foreground">
              Lusito lwetfu lwe-AI lwetilokatane, tifo tetilwane, nekulinganisela sivuno luniketwa njengemacebiso kuphela. Asisiniki siciniseko sekutsi imiphumela ilungile njalo. Sicela ubonane nengcweti uma unesimo lesibi.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Bumnini Belwatiso</h2>
            <p className="text-muted-foreground">
              Ugcina bumnini belwatiso lwakho netiithombe lotifakako. Ngekulifaka ku-Imvelo, usiniketa lilungelo lekutsi silisebentise kukuniketa lusito.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Kuncishiswa Kwesibopho</h2>
            <p className="text-muted-foreground">
              Imvelo ayibophekeleki kulahlekelwa lokuvela ekusebentiseni i-app, lokufaka:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Kulahlekelwa kwemkhicito</li>
              <li>Kulahleka kwemali</li>
              <li>Emacebiso e-AI langakacondziswa</li>
              <li>Kutingela emakethe</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Kumisa I-akhawunti</h2>
            <p className="text-muted-foreground">
              Singayimisa i-akhawunti yakho uma uphula lemigomo, noma nini, ngaphandle kwesaziso.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Kuntjintja Imigomo</h2>
            <p className="text-muted-foreground">
              Singayintjintja lemigomo noma nini. Kuchubeka kusebentisa i-app kusho kutsi uyayemukela imigomo lemisha.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Umtsetfo Lophetse</h2>
            <p className="text-muted-foreground">
              Lemigomo iphetfwe yimitsetfo ye-Kingdom of Eswatini.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">12. Sitsintse</h2>
            <p className="text-muted-foreground">
              Uma unemibuto mayelana nalemigomo, sitsintse ku:
            </p>
            <p className="text-muted-foreground">
              Email: support@imvelo.app<br />
              Indzawo: Mbabane, Eswatini
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;