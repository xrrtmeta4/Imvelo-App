import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Wind } from "lucide-react";

const WeatherWidget = () => {
  return (
    <Card className="bg-sky/10 border-sky/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Cloud className="w-5 h-5" />
          Weather
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Today's Forecast</span>
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-harvest" />
              <span className="font-semibold">24°</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Scattered Clouds</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
