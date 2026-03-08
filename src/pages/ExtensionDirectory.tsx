import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Phone, Mail, MapPin, Search, Users, Building2, Loader2, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocation } from "@/hooks/useLocation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AFRICAN_COUNTRIES = [
  { name: "Algeria", code: "DZ" }, { name: "Angola", code: "AO" }, { name: "Benin", code: "BJ" },
  { name: "Botswana", code: "BW" }, { name: "Burkina Faso", code: "BF" }, { name: "Burundi", code: "BI" },
  { name: "Cameroon", code: "CM" }, { name: "Central African Republic", code: "CF" }, { name: "Chad", code: "TD" },
  { name: "Congo", code: "CG" }, { name: "DR Congo", code: "CD" }, { name: "Côte d'Ivoire", code: "CI" },
  { name: "Egypt", code: "EG" }, { name: "Eswatini", code: "SZ" }, { name: "Ethiopia", code: "ET" },
  { name: "Gabon", code: "GA" }, { name: "Gambia", code: "GM" }, { name: "Ghana", code: "GH" },
  { name: "Guinea", code: "GN" }, { name: "Kenya", code: "KE" }, { name: "Lesotho", code: "LS" },
  { name: "Liberia", code: "LR" }, { name: "Libya", code: "LY" }, { name: "Madagascar", code: "MG" },
  { name: "Malawi", code: "MW" }, { name: "Mali", code: "ML" }, { name: "Mauritania", code: "MR" },
  { name: "Mauritius", code: "MU" }, { name: "Morocco", code: "MA" }, { name: "Mozambique", code: "MZ" },
  { name: "Namibia", code: "NA" }, { name: "Niger", code: "NE" }, { name: "Nigeria", code: "NG" },
  { name: "Rwanda", code: "RW" }, { name: "Senegal", code: "SN" }, { name: "Sierra Leone", code: "SL" },
  { name: "Somalia", code: "SO" }, { name: "South Africa", code: "ZA" }, { name: "South Sudan", code: "SS" },
  { name: "Sudan", code: "SD" }, { name: "Tanzania", code: "TZ" }, { name: "Togo", code: "TG" },
  { name: "Tunisia", code: "TN" }, { name: "Uganda", code: "UG" }, { name: "Zambia", code: "ZM" },
  { name: "Zimbabwe", code: "ZW" },
];

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

const ExtensionDirectory = () => {
  const navigate = useNavigate();
  const { location, loading: locationLoading, getLocation } = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [officers, setOfficers] = useState<ExtensionOfficer[]>([]);
  const [regions, setRegions] = useState<string[]>(["All Regions"]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [countryName, setCountryName] = useState("");

  useEffect(() => {
    const init = async () => {
      const loc = await getLocation();
      await fetchContacts(loc.country_name, loc.country_code);
    };
    init();
  }, []);

  const fetchContacts = async (country_name: string, country_code: string) => {
    setLoadingContacts(true);
    setCountryName(country_name);
    try {
      const { data, error } = await supabase.functions.invoke('get-extension-contacts', {
        body: { country_name, country_code }
      });

      if (error) throw error;

      setOfficers(data.contacts || []);
      setRegions(data.regions || ["All Regions"]);
      setSelectedRegion("All Regions");
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
      toast.error("Failed to load extension contacts");
    } finally {
      setLoadingContacts(false);
    }
  };

  const filteredOfficers = officers.filter((officer) => {
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
          <div className="flex-1">
            <h1 className="text-xl font-bold">Extension Directory</h1>
            <p className="text-sm opacity-90">
              {countryName ? `${countryName} Agricultural Support` : "Loading..."}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Country Selector */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <Select
            value={countryName}
            onValueChange={(val) => {
              const country = AFRICAN_COUNTRIES.find(c => c.name === val);
              if (country) fetchContacts(country.name, country.code);
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              {AFRICAN_COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {loadingContacts ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">
              Finding extension services in {countryName || "your country"}...
            </p>
          </div>
        ) : (
          <>
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

            <Card className="bg-primary/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{countryName} Agricultural Services</p>
                    <p className="text-xs text-muted-foreground">
                      Contact agricultural extension services in {countryName} for advisory on farming systems, technologies, and improved productivity.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Extension Services ({filteredOfficers.length})
              </h2>

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
                      <Button variant="default" size="sm" className="flex-1" onClick={() => handleCall(officer.phone)}>
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEmail(officer.email)}>
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
          </>
        )}
      </div>
    </div>
  );
};

export default ExtensionDirectory;
