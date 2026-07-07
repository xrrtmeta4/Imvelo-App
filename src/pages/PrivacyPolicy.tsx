import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy — Imvelo"
        description="How Imvelo collects, uses, and protects the personal data of farmers using our AI pest scanning and weather platform."
        path="/privacy-policy"
      />
      <header className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Back to home">
            <Button variant="ghost" size="icon" aria-label="Back to home" className="text-primary-foreground hover:bg-primary/80">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Privacy Policy</h1>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-4xl mx-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Effective Date: December 2024</p>
          
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Who We Are</h2>
            <p className="text-muted-foreground">
              Imvelo is an agricultural app built to help farmers in Eswatini. We respect your privacy and are committed to protecting your information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
            <p className="text-muted-foreground">We collect the following information:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Your name and email when you register</li>
              <li>Phone number (if provided)</li>
              <li>Your location (if permitted)</li>
              <li>Photos uploaded for pest and disease identification</li>
              <li>Profile information including avatar images</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
            <p className="text-muted-foreground">We use your information to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Provide AI-powered pest and animal disease identification</li>
              <li>Show real-time weather for your location</li>
              <li>Send you weather and climate alerts</li>
              <li>Improve our services</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Information Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell your information to third parties. We only share information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>With your consent</li>
              <li>To comply with the law</li>
              <li>To protect our rights</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Data Security</h2>
            <p className="text-muted-foreground">
              We use strong security measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Data encryption</li>
              <li>Secure authentication</li>
              <li>Regular security audits</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Your Rights</h2>
            <p className="text-muted-foreground">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>View your information</li>
              <li>Correct your information</li>
              <li>Delete your information</li>
              <li>Delete your account</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Cookies</h2>
            <p className="text-muted-foreground">
              We use cookies to maintain your session and make the app work properly. We do not use advertising cookies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Policy Changes</h2>
            <p className="text-muted-foreground">
              We may change this policy at any time. We will notify you of significant changes through the app.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about our privacy policy, contact us at:
            </p>
            <p className="text-muted-foreground">
              Email: imveloapps@gmail.com<br />
              Phone: +268 7921 5621<br />
              Location: Mbabane, Eswatini
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;