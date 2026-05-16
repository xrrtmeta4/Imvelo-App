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
          <h1 className="text-xl font-bold">About Us</h1>
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
            Helping Eswatini farmers with modern technology and AI intelligence
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
                <h3 className="text-lg font-semibold mb-2">Our Mission</h3>
                <p className="text-muted-foreground">
                  Our mission is to help Eswatini farmers produce better yields and earn more income. 
                  We use modern technology and AI to assist with pest identification, animal disease detection, 
                  and harvest estimation. We want every farmer to have access to quality assistance, regardless 
                  of farm size.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What We Offer */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">What We Offer</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">🔍 Pest Identification</h4>
                <p className="text-sm text-muted-foreground">
                  Take a photo of your plant or crop, and our AI will tell you what pest it is and how to treat it.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">🐄 Animal Disease Detection</h4>
                <p className="text-sm text-muted-foreground">
                  Take a photo of your animal, and we will tell you if it is sick and what to do.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">📊 Harvest Estimation</h4>
                <p className="text-sm text-muted-foreground">
                  Take a photo of your crop, and we will estimate how much you will harvest.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">🌤️ Real-time Weather</h4>
                <p className="text-sm text-muted-foreground">
                  Get weather information for your location, along with alerts for severe weather conditions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">🌍 Climate Education</h4>
                <p className="text-sm text-muted-foreground">
                  Learn about climate change impacts and safety measures for various weather events.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">📚 Farming Guides</h4>
                <p className="text-sm text-muted-foreground">
                  Learn about best farming practices, planting schedules, and soil management.
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
                <h3 className="text-lg font-semibold mb-2">Our Team</h3>
                <p className="text-muted-foreground">
                  Imvelo was built by a team that loves Eswatini and farming. We combine technology and agricultural 
                  science to help our farmers. We work with agricultural experts and extension officers to ensure 
                  our information is accurate and helpful.
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
                <h3 className="text-lg font-semibold mb-2">Our Values</h3>
                <ul className="text-muted-foreground space-y-2">
                  <li><strong>Service:</strong> We are here to help farmers, not just to make money</li>
                  <li><strong>Accuracy:</strong> We provide accurate and verified information</li>
                  <li><strong>Simplicity:</strong> Our app is easy to use for everyone</li>
                  <li><strong>Partnership:</strong> We work with farmers, not above them</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact CTA */}
        <div className="text-center py-6">
          <p className="text-muted-foreground mb-4">
            Have questions or want to help? Contact us!
          </p>
          <Link to="/contact">
            <Button size="lg">
              Contact Us
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default About;