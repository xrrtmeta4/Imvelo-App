import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary/80">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Inqubomgomo Yobumfihlo</h1>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-4xl mx-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Kucala kusebenta: December 2024</p>
          
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Singobanini</h2>
            <p className="text-muted-foreground">
              Imvelo yi-app yetemnotfo letakhiwe kucedza balimi be-Eswatini. Siyayihlonipha imfihlo yakho futsi sitimisele kuvikela lwatiso lwakho.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Lwatiso Lesilicokelako</h2>
            <p className="text-muted-foreground">Sicokelela lolwatiso lolandelako:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Ligama lakho ne-email uma usubhalisa</li>
              <li>Inombolo yefoni (uma uyinikile)</li>
              <li>Indzawo yakho (uma uvumile)</li>
              <li>Titfombe letifakiwe tekuhlola tifo netilokatane</li>
              <li>Imikhicito yemakethe nekulinganisela kwetintsengo</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Silisebentisa Kanjani Lwatiso Lwakho</h2>
            <p className="text-muted-foreground">Sisebentisa lwatiso lwakho ku:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Kukuniketa lusito lwe-AI lwetilokatane netifo tetilwane</li>
              <li>Kukubonisa litulu langempela nendzawo yakho</li>
              <li>Kukuvumela kutsenga nekutsengisa emakethe</li>
              <li>Kukutfumela tetfiso telilumo lelibi</li>
              <li>Kuthuthukisa lusito lwetfu</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Kwabelana Ngelwatiso</h2>
            <p className="text-muted-foreground">
              Asilitsengiselani lwatiso lwakho nebangaphandle. Singabelana ngelwatiso kuphela:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Uma uvumile</li>
              <li>Kufeza umtsetfo</li>
              <li>Kuvikela emalungelo etfu</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Kuvikeleka Kwelwatiso</h2>
            <p className="text-muted-foreground">
              Sisebentisa tindlela tekuvikeleka letinamandla kuvikela lwatiso lwakho, lokufaka ekhatsi:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Kufihla lwatiso (encryption)</li>
              <li>Kutovulela lokuvikelekile</li>
              <li>Kuhlola kuvikeleka njalo</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Emalungelo Akho</h2>
            <p className="text-muted-foreground">Unelilungelo le:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Kubona lwatiso lwakho</li>
              <li>Kucondzisa lwatiso lwakho</li>
              <li>Kususa lwatiso lwakho</li>
              <li>Kukhipha i-akhawunti yakho</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Ama-Cookies</h2>
            <p className="text-muted-foreground">
              Sisebentisa ama-cookies kugcina i-session yakho nekwenta i-app isebente kahle. Awekho ama-cookies ekukhangisa.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Kuntjintja Inqubomgomo</h2>
            <p className="text-muted-foreground">
              Singayintjintja lenqubomgomo noma nini. Sitokwatisa ngetintjintjo letibalulekile nge-app.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Sitsintse</h2>
            <p className="text-muted-foreground">
              Uma unemibuto mayelana nenqubomgomo yetfu yobumfihlo, sitsintse ku:
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

export default PrivacyPolicy;