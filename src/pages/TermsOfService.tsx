import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms of Service — Imvelo"
        description="The rules for using Imvelo's AI farming assistant, weather alerts, and account features across web and mobile."
        path="/terms-of-service"
      />
      <header className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Back to home">
            <Button variant="ghost" size="icon" aria-label="Back to home" className="text-primary-foreground hover:bg-primary/80">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Terms of Service</h1>
        </div>
      </header>

      <main className="p-4 pb-24 max-w-4xl mx-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Effective Date: December 2024</p>
          
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By using Imvelo, you agree to follow these terms and conditions. If you do not agree with these terms, please do not use the app.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Service Description</h2>
            <p className="text-muted-foreground">Imvelo provides:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>AI-powered pest identification</li>
              <li>AI-powered animal disease detection</li>
              <li>Harvest estimation</li>
              <li>Real-time weather information</li>
              <li>Climate change education and safety guides</li>
              <li>Farming and planting guides</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. User Account</h2>
            <p className="text-muted-foreground">
              You must register an account to use certain features. You are responsible for keeping your password confidential and for everything that happens on your account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Permitted Use</h2>
            <p className="text-muted-foreground">You agree that:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>You will use the app for lawful purposes only</li>
              <li>You will not submit false information</li>
              <li>You will not violate the rights of other users</li>
              <li>You will not attempt to access unauthorized areas</li>
              <li>You will not misuse the app</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. AI Services</h2>
            <p className="text-muted-foreground">
              Our AI services for pest identification, animal diseases, and harvest estimation are provided as guidance only. We do not guarantee that results are always correct. Please consult an expert for serious conditions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Data Ownership</h2>
            <p className="text-muted-foreground">
              You retain ownership of your information and photos that you upload. By uploading to Imvelo, you grant us the right to use them to provide our services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              Imvelo is not liable for losses arising from using the app, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Crop losses</li>
              <li>Financial losses</li>
              <li>Incorrect AI guidance</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Account Termination</h2>
            <p className="text-muted-foreground">
              We may terminate your account if you violate these terms, at any time, without notice.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We may change these terms at any time. Continuing to use the app means you accept the new terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Governing Law</h2>
            <p className="text-muted-foreground">
              These terms are governed by the laws of the Kingdom of Eswatini.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Contact Us</h2>
            <p className="text-muted-foreground">
              If you have questions about these terms, contact us at:
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

export default TermsOfService;