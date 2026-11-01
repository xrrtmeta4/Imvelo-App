import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { guides } from "@/data/guides";

const SITE = "https://imveloapp.xyz";

const Header = ({ title, back }: { title: string; back: string }) => (
  <header className="hero-forest text-primary-foreground px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6 rounded-b-3xl">
    <div className="flex items-center gap-3 max-w-3xl mx-auto">
      <Link to={back} aria-label="Back">
        <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10"><ArrowLeft className="h-5 w-5" /></Button>
      </Link>
      <p className="text-lg font-semibold">{title}</p>
    </div>
  </header>
);

export const GuidesIndex = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Free Farming Guides for African Farmers | Imvelo"
      description="Free practical farming guides: fall armyworm control, maize planting in Eswatini, tomato blight, drought farming and soil health."
      path="/guides"
    />
    <Header title="Farming Guides" back="/about" />
    <main className="p-4 pb-24 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Free farming guides</h1>
      {guides.map((g) => (
        <Link key={g.slug} to={`/guides/${g.slug}`} className="block">
          <Card className="rounded-2xl hover:border-primary transition-colors">
            <CardContent className="p-4 flex gap-3">
              <BookOpen className="h-5 w-5 text-primary shrink-0 mt-1" />
              <div>
                <h2 className="font-semibold text-foreground">{g.title}</h2>
                <p className="text-sm text-muted-foreground">{g.description}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </main>
  </div>
);

export const GuideArticle = () => {
  const { slug } = useParams();
  const g = guides.find((x) => x.slug === slug);
  if (!g) return <Navigate to="/guides" replace />;
  const url = `${SITE}/guides/${g.slug}`;
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${g.title} | Imvelo`}
        description={g.description}
        path={`/guides/${g.slug}`}
        jsonLd={[
          { "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.description, url, publisher: { "@type": "Organization", name: "Imvelo" } },
          { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Guides", item: `${SITE}/guides` },
            { "@type": "ListItem", position: 2, name: g.title, item: url },
          ]},
        ]}
      />
      <Header title="Farming Guide" back="/guides" />
      <main className="p-4 pb-24 max-w-3xl mx-auto">
        <article className="space-y-6">
          <h1 className="text-2xl font-bold text-foreground leading-tight">{g.title}</h1>
          <p className="text-muted-foreground">{g.intro}</p>
          {g.sections.map((s) => (
            <section key={s.heading} className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">{s.heading}</h2>
              <ul className="list-disc pl-5 space-y-1 text-foreground">
                {s.points.map((p) => <li key={p}>{p}</li>)}
              </ul>
            </section>
          ))}
          <Card className="rounded-2xl bg-primary/10 border-primary/30">
            <CardContent className="p-4 space-y-3">
              <p className="font-semibold text-foreground">Get instant advice for your own farm</p>
              <Link to="/auth"><Button className="w-full">Try Imvelo free</Button></Link>
            </CardContent>
          </Card>
          <Link to="/guides" className="text-primary underline text-sm">More farming guides</Link>
        </article>
      </main>
    </div>
  );
};
