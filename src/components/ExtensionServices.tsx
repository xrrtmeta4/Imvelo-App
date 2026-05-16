import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";

const ExtensionServices = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <Card className="bg-accent border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {t('extensionServices')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          className="w-full" 
          variant="default"
          onClick={() => navigate("/extension-directory")}
        >
          <Phone className="w-4 h-4 mr-2" />
          {t('callExtensionOfficers')}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ExtensionServices;
