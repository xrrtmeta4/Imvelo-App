import { Button } from "@/components/ui/button";
import { Sprout } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary to-primary/80">
      <div className="max-w-7xl mx-auto text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-primary-foreground/10 p-4 rounded-full">
            <Sprout className="w-12 h-12 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6">
          Imvelo
        </h1>
        <p className="text-xl sm:text-2xl text-primary-foreground/90 mb-8 max-w-3xl mx-auto">
          Empowering farmers with knowledge and resources
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="secondary" className="text-lg">
            Sign Up
          </Button>
          <Button size="lg" variant="outline" className="text-lg bg-primary-foreground/10 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
            Log In
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
