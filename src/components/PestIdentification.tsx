import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bug, Camera } from "lucide-react";

const PestIdentification = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-primary" />
          Pest Identification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button className="w-full" size="lg">
          <Camera className="w-5 h-5 mr-2" />
          Upload Photo
        </Button>
        
        <div>
          <h4 className="font-semibold mb-3 text-sm text-muted-foreground">Recent Identifications</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-start p-3 rounded-lg bg-accent/50">
              <div>
                <p className="font-medium text-sm">African armyworm</p>
                <p className="text-xs text-muted-foreground mt-1">Rodenticide treatment</p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs">
                View
              </Button>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground text-center pt-2">
          For more information, reach out to your local extension officer
        </p>
      </CardContent>
    </Card>
  );
};

export default PestIdentification;
