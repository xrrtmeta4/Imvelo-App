import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Phone } from "lucide-react";

const ExtensionServices = () => {
  return (
    <Card className="bg-accent border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Bocwephesha Betekulima
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Chumana nabocwephesha
        </p>
        <Button className="w-full" variant="default">
          <Phone className="w-4 h-4 mr-2" />
          Chumana Nehhhovisi
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExtensionServices;
