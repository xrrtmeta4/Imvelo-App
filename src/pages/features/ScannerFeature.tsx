import { ScanLine } from "lucide-react";
import FeatureMarketingPage from "@/components/FeatureMarketingPage";

const ScannerFeature = () => (
  <FeatureMarketingPage
    title="AI Crop & Pest Scanner"
    metaTitle="AI Pest & Crop Scanner for African Farmers | Imvelo"
    metaDescription="Photograph a leaf, pest, animal or soil sample and get an AI diagnosis with treatment steps in seconds. See a sample Imvelo scan report."
    path="/features/scanner"
    tagline="Photograph a pest, leaf, animal or soil sample and get a diagnosis in seconds."
    icon={ScanLine}
    intro="Imvelo's Chloe AI analyses your photo against agricultural vision datasets and returns the likely pest or disease, a confidence score, and practical treatment steps using inputs available locally."
    bullets={[
      "Pest and insect identification from a single photo",
      "Crop leaf disease detection with severity rating",
      "Livestock disease screening from visible symptoms",
      "Soil type, pH estimate, texture and drainage analysis",
      "Downloadable PDF report for records or extension officers",
      "Works from the camera or an uploaded photo",
    ]}
    preview={{
      heading: "Sample scan report — maize leaf",
      rows: [
        { label: "Diagnosis", value: "Fall armyworm (Spodoptera frugiperda)" },
        { label: "Confidence", value: "92%" },
        { label: "Severity", value: "Moderate — early whorl damage" },
        { label: "Recommended action", value: "Scout weekly; apply approved biopesticide at dusk" },
        { label: "Prevention", value: "Rotate with legumes; encourage natural predators" },
      ],
      note: "Illustrative example. Real results depend on your photo and are advisory only — confirm with an extension officer before applying chemicals.",
    }}
    faqs={[
      { q: "How many scans do I get for free?", a: "Free accounts include 4 scans per week. Premium removes the weekly limit." },
      { q: "Does it work for livestock?", a: "Yes — the scanner includes an animal disease mode for visible symptoms on cattle, goats and poultry." },
      { q: "Can I keep a record of my scans?", a: "Every scan is saved to your history and can be exported as a PDF report." },
    ]}
    appPath="/scanner"
  />
);

export default ScannerFeature;