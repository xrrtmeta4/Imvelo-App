import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BestPractices = () => {
  const navigate = useNavigate();

  const practices = [
    {
      title: "Sicuketfo Sekutjala Ngekuhamba Kweminyaka",
      description: "Fundza sikhatsi lesihle sekutjala tijalo takho",
      path: "/planting-guide"
    },
    {
      title: "Emacebiso Ekuphata Umhlabatsi",
      description: "Gcina umhlabatsi uphilile kusita kuvuna lokukhulu",
      path: "/soil-management"
    },
    {
      title: "Kulondvolota Emanti",
      description: "Emasu ekumisela emanti ngendlela lefanele",
      path: "/water-conservation"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Tindlela Letinhle
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {practices.map((practice) => (
          <div 
            key={practice.path}
            onClick={() => navigate(practice.path)}
            className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors cursor-pointer"
          >
            <TrendingUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
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
