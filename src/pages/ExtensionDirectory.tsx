import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Phone, Mail, MapPin, Search, Users, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ExtensionOfficer {
  id: string;
  name: string;
  title: string;
  region: string;
  office: string;
  phone: string;
  email: string;
  specialization: string;
}

const extensionOfficers: ExtensionOfficer[] = [
  {
    id: "1",
    name: "Ministry of Agriculture HQ",
    title: "Agricultural Extension Services",
    region: "Mbabane",
    office: "Ministry of Agriculture Main Office",
    phone: "+268 2404 2731",
    email: "agriculture@gov.sz",
    specialization: "General Agricultural Support"
  },
  {
    id: "2",
    name: "Hhohho Regional Office",
    title: "Regional Extension Coordinator",
    region: "Hhohho",
    office: "Mbabane Regional Agricultural Office",
    phone: "+268 2404 6512",
    email: "hhohho.agric@gov.sz",
    specialization: "Crop Production & Livestock"
  },
  {
    id: "3",
    name: "Manzini Regional Office",
    title: "Regional Extension Coordinator",
    region: "Manzini",
    office: "Manzini Regional Agricultural Office",
    phone: "+268 2505 2847",
    email: "manzini.agric@gov.sz",
    specialization: "Irrigation & Field Crops"
  },
  {
    id: "4",
    name: "Lubombo Regional Office",
    title: "Regional Extension Coordinator",
    region: "Lubombo",
    office: "Siteki Regional Agricultural Office",
    phone: "+268 2343 4127",
    email: "lubombo.agric@gov.sz",
    specialization: "Dryland Farming & Livestock"
  },
  {
    id: "5",
    name: "Shiselweni Regional Office",
    title: "Regional Extension Coordinator",
    region: "Shiselweni",
    office: "Nhlangano Regional Agricultural Office",
    phone: "+268 2207 8234",
    email: "shiselweni.agric@gov.sz",
    specialization: "Smallholder Support & Training"
  },
  {
    id: "6",
    name: "National Maize Corporation (NMC)",
    title: "Maize Support Services",
    region: "Nationwide",
    office: "Matsapha Industrial Site",
    phone: "+268 2518 4011",
    email: "info@nmc.co.sz",
    specialization: "Maize Production & Marketing"
  },
  {
    id: "7",
    name: "Eswatini Cotton Board",
    title: "Cotton Extension Services",
    region: "Nationwide",
    office: "Big Bend Office",
    phone: "+268 2363 6221",
    email: "cotton@cottonboard.sz",
    specialization: "Cotton Production & Marketing"
  },
  {
    id: "8",
    name: "Eswatini Dairy Board",
    title: "Dairy Extension Services",
    region: "Nationwide",
    office: "Manzini",
    phone: "+268 2505 5678",
    email: "info@dairyboard.sz",
    specialization: "Dairy Farming & Production"
  },
  {
    id: "9",
    name: "FAO Eswatini Office",
    title: "Food and Agriculture Organization",
    region: "Mbabane",
    office: "UN House, Mbabane",
    phone: "+268 2404 2687",
    email: "fao-sz@fao.org",
    specialization: "Agricultural Development & Food Security"
  },
  {
    id: "10",
    name: "Eswatini National Agricultural Union (SNAU)",
    title: "Farmers Union Support",
    region: "Nationwide",
    office: "Manzini",
    phone: "+268 2505 4300",
    email: "info@snau.co.sz",
    specialization: "Farmer Organization & Advocacy"
  },
  {
    id: "11",
    name: "Veterinary Services Department",
    title: "Animal Health Extension",
    region: "Nationwide",
    office: "Manzini Veterinary Office",
    phone: "+268 2505 2093",
    email: "vetservices@gov.sz",
    specialization: "Animal Health & Disease Control"
  },
  {
    id: "12",
    name: "Eswatini Environment Authority",
    title: "Environmental Conservation",
    region: "Nationwide",
    office: "Mbabane",
    phone: "+268 2404 6420",
    email: "info@sea.org.sz",
    specialization: "Sustainable Agriculture & Conservation"
  }
];

const regions = ["All Regions", "Hhohho", "Manzini", "Lubombo", "Shiselweni", "Nationwide", "Mbabane"];

const ExtensionDirectory = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");

  const filteredOfficers = extensionOfficers.filter((officer) => {
    const matchesSearch = 
      officer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      officer.office.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRegion = selectedRegion === "All Regions" || officer.region === selectedRegion;
    
    return matchesSearch && matchesRegion;
  });

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-primary-foreground hover:bg-primary/80"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Extension Officers Directory</h1>
            <p className="text-sm opacity-90">Eswatini Agricultural Support Services</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, office, or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            {regions.map((region) => (
              <Button
                key={region}
                variant={selectedRegion === region ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRegion(region)}
                className="whitespace-nowrap"
              >
                {region}
              </Button>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Ministry of Agriculture</p>
                <p className="text-xs text-muted-foreground">
                  The Department of Agricultural Extension Services provides advisory services to farmers 
                  on improved farming systems and technologies for increased productivity.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Officers List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Extension Services ({filteredOfficers.length})
            </h2>
          </div>

          {filteredOfficers.map((officer) => (
            <Card key={officer.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{officer.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{officer.title}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{officer.office}, {officer.region}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {officer.specialization}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleCall(officer.phone)}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEmail(officer.email)}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredOfficers.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No extension services found matching your search.</p>
            </Card>
          )}
        </div>

        {/* Emergency Contact */}
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-4">
            <h3 className="font-semibold text-destructive mb-2">Emergency Agricultural Hotline</h3>
            <p className="text-sm text-muted-foreground mb-3">
              For urgent agricultural emergencies including disease outbreaks and pest invasions.
            </p>
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={() => handleCall("+268 2404 2731")}
            >
              <Phone className="w-4 h-4 mr-2" />
              Call Emergency Line
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExtensionDirectory;
