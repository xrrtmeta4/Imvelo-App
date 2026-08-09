import { ArrowLeft, Check, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SEO from "@/components/SEO";

export interface FeatureMarketingPageProps {
  title: string;
  metaTitle: string;
  metaDescription: string;
  path: string;
  tagline: string;
  icon: LucideIcon;
  intro: string;
  bullets: string[];
  preview: { heading: string; rows: { label: string; value: string }[]; note: string };
  faqs: { q: string; a: string }[];
  appPath: string;
}

const FeatureMarketingPage = ({
  title,
  metaTitle,
  metaDescription,
  path,
  tagline,
  icon: Icon,
  intro,
  bullets,
  preview,
  faqs,
  appPath,
}: FeatureMarketingPageProps) => (
  <div className="min-h-screen bg-background">
    <SEO
      title={metaTitle}
      description={metaDescription}
      path={path}
      jsonLd={[
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: metaTitle,
          description: metaDescription,
          url: `https://imveloapp.xyz${path}`,
        },
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
      ]}
    />

    <header className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        <Link to="/about" aria-label="Back">
          <Button variant="ghost" size="icon" aria-label="Back" className="text-primary-foreground hover:bg-primary/80">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <span className="text-lg font-semibold">Imvelo</span>
      </div>
    </header>

    <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
      <section className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{tagline}</p>
        <p className="text-muted-foreground max-w-2xl mx-auto">{intro}</p>
        <Link to={appPath}>
          <Button size="lg">Open in the app</Button>
        </Link>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">What you get</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {bullets.map((b) => (
            <li key={b} className="flex gap-3 items-start">
              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-muted-foreground">{b}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Sample output</h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{preview.heading}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {preview.rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-4 border-b border-border/60 pb-2 last:border-0">
                <span className="text-sm text-muted-foreground">{r.label}</span>
                <span className="text-sm font-medium text-right">{r.value}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">{preview.note}</p>
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Questions farmers ask</h2>
        <div className="space-y-4">
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="font-semibold text-foreground">{f.q}</h3>
              <p className="text-muted-foreground text-sm mt-1">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="text-center py-6">
        <p className="text-muted-foreground mb-4">Create a free Imvelo account to use {title.toLowerCase()} on your own farm.</p>
        <Link to="/auth">
          <Button size="lg">Get started free</Button>
        </Link>
      </section>
    </main>
  </div>
);

export default FeatureMarketingPage;