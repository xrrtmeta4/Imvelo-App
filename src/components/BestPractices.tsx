import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, TrendingUp } from "lucide-react";

const BestPractices = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Best Practices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors cursor-pointer">
          <TrendingUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Seasonal Planting Guide</p>
            <p className="text-xs text-muted-foreground mt-1">Learn the best times to plant your crops</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors cursor-pointer">
          <TrendingUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Soil Management Tips</p>
            <p className="text-xs text-muted-foreground mt-1">Maintain healthy soil for better yields</p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors cursor-pointer">
          <TrendingUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Water Conservation</p>
            <p className="text-xs text-muted-foreground mt-1">Efficient irrigation techniques</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BestPractices;
