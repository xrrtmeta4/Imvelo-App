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

const COUNTRIES = [
  // Africa
  { name: "Algeria", code: "DZ", region: "Africa" }, { name: "Angola", code: "AO", region: "Africa" },
  { name: "Benin", code: "BJ", region: "Africa" }, { name: "Botswana", code: "BW", region: "Africa" },
  { name: "Burkina Faso", code: "BF", region: "Africa" }, { name: "Burundi", code: "BI", region: "Africa" },
  { name: "Cameroon", code: "CM", region: "Africa" }, { name: "Central African Republic", code: "CF", region: "Africa" },
  { name: "Chad", code: "TD", region: "Africa" }, { name: "Congo", code: "CG", region: "Africa" },
  { name: "Côte d'Ivoire", code: "CI", region: "Africa" }, { name: "DR Congo", code: "CD", region: "Africa" },
  { name: "Egypt", code: "EG", region: "Africa" }, { name: "Eswatini", code: "SZ", region: "Africa" },
  { name: "Ethiopia", code: "ET", region: "Africa" }, { name: "Gabon", code: "GA", region: "Africa" },
  { name: "Gambia", code: "GM", region: "Africa" }, { name: "Ghana", code: "GH", region: "Africa" },
  { name: "Guinea", code: "GN", region: "Africa" }, { name: "Kenya", code: "KE", region: "Africa" },
  { name: "Lesotho", code: "LS", region: "Africa" }, { name: "Liberia", code: "LR", region: "Africa" },
  { name: "Libya", code: "LY", region: "Africa" }, { name: "Madagascar", code: "MG", region: "Africa" },
  { name: "Malawi", code: "MW", region: "Africa" }, { name: "Mali", code: "ML", region: "Africa" },
  { name: "Mauritania", code: "MR", region: "Africa" }, { name: "Mauritius", code: "MU", region: "Africa" },
  { name: "Morocco", code: "MA", region: "Africa" }, { name: "Mozambique", code: "MZ", region: "Africa" },
  { name: "Namibia", code: "NA", region: "Africa" }, { name: "Niger", code: "NE", region: "Africa" },
  { name: "Nigeria", code: "NG", region: "Africa" }, { name: "Rwanda", code: "RW", region: "Africa" },
  { name: "Senegal", code: "SN", region: "Africa" }, { name: "Sierra Leone", code: "SL", region: "Africa" },
  { name: "Somalia", code: "SO", region: "Africa" }, { name: "South Africa", code: "ZA", region: "Africa" },
  { name: "South Sudan", code: "SS", region: "Africa" }, { name: "Sudan", code: "SD", region: "Africa" },
  { name: "Tanzania", code: "TZ", region: "Africa" }, { name: "Togo", code: "TG", region: "Africa" },
  { name: "Tunisia", code: "TN", region: "Africa" }, { name: "Uganda", code: "UG", region: "Africa" },
  { name: "Zambia", code: "ZM", region: "Africa" }, { name: "Zimbabwe", code: "ZW", region: "Africa" },
  // Asia
  { name: "Afghanistan", code: "AF", region: "Asia" }, { name: "Bangladesh", code: "BD", region: "Asia" },
  { name: "Cambodia", code: "KH", region: "Asia" }, { name: "China", code: "CN", region: "Asia" },
  { name: "India", code: "IN", region: "Asia" }, { name: "Indonesia", code: "ID", region: "Asia" },
  { name: "Iran", code: "IR", region: "Asia" }, { name: "Iraq", code: "IQ", region: "Asia" },
  { name: "Israel", code: "IL", region: "Asia" }, { name: "Japan", code: "JP", region: "Asia" },
  { name: "Malaysia", code: "MY", region: "Asia" }, { name: "Myanmar", code: "MM", region: "Asia" },
  { name: "Nepal", code: "NP", region: "Asia" }, { name: "Pakistan", code: "PK", region: "Asia" },
  { name: "Philippines", code: "PH", region: "Asia" }, { name: "South Korea", code: "KR", region: "Asia" },
  { name: "Sri Lanka", code: "LK", region: "Asia" }, { name: "Thailand", code: "TH", region: "Asia" },
  { name: "Turkey", code: "TR", region: "Asia" }, { name: "Vietnam", code: "VN", region: "Asia" },
  // Europe
  { name: "France", code: "FR", region: "Europe" }, { name: "Germany", code: "DE", region: "Europe" },
  { name: "Italy", code: "IT", region: "Europe" }, { name: "Netherlands", code: "NL", region: "Europe" },
  { name: "Poland", code: "PL", region: "Europe" }, { name: "Romania", code: "RO", region: "Europe" },
  { name: "Spain", code: "ES", region: "Europe" }, { name: "Ukraine", code: "UA", region: "Europe" },
  { name: "United Kingdom", code: "GB", region: "Europe" },
  // Americas
  { name: "Argentina", code: "AR", region: "Americas" }, { name: "Bolivia", code: "BO", region: "Americas" },
  { name: "Brazil", code: "BR", region: "Americas" }, { name: "Canada", code: "CA", region: "Americas" },
  { name: "Chile", code: "CL", region: "Americas" }, { name: "Colombia", code: "CO", region: "Americas" },
  { name: "Cuba", code: "CU", region: "Americas" }, { name: "Ecuador", code: "EC", region: "Americas" },
  { name: "Guatemala", code: "GT", region: "Americas" }, { name: "Haiti", code: "HT", region: "Americas" },
  { name: "Mexico", code: "MX", region: "Americas" }, { name: "Paraguay", code: "PY", region: "Americas" },
  { name: "Peru", code: "PE", region: "Americas" }, { name: "United States", code: "US", region: "Americas" },
  { name: "Uruguay", code: "UY", region: "Americas" }, { name: "Venezuela", code: "VE", region: "Americas" },
  // Oceania
  { name: "Australia", code: "AU", region: "Oceania" }, { name: "Fiji", code: "FJ", region: "Oceania" },
  { name: "New Zealand", code: "NZ", region: "Oceania" }, { name: "Papua New Guinea", code: "PG", region: "Oceania" },
];

const CONTINENT_GROUPS = ["Africa", "Asia", "Europe", "Americas", "Oceania"];

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
              const country = COUNTRIES.find(c => c.name === val);
              if (country) fetchContacts(country.name, country.code);
            }}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {CONTINENT_GROUPS.map((continent) => (
                <div key={continent}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{continent}</div>
                  {COUNTRIES.filter(c => c.region === continent).map((c) => (
                    <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                  ))}
                </div>
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
