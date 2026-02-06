import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import { BookOpen, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BestPractices = () => {
  const navigate = useNavigate();

  const practices = [
    {
      title: "Seasonal Planting Guide",
      description: "Learn the best time to plant your crops",
      path: "/planting-guide",
      icon: TrendingUp
    },
    {
      title: "Soil Management",
      description: "Keep your soil healthy for better harvests",
      path: "/soil-management",
      icon: TrendingUp
    },
    {
      title: "Water Conservation",
      description: "Tips for efficient water management",
      path: "/water-conservation",
      icon: TrendingUp
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Best Practices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {practices.map((practice) => (
          <div 
            key={practice.path}
            onClick={() => navigate(practice.path)}
            className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors cursor-pointer"
          >
            <practice.icon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">{practice.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{practice.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default BestPractices;
