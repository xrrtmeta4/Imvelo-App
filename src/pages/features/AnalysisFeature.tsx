import { LineChart } from "lucide-react";
import FeatureMarketingPage from "@/components/FeatureMarketingPage";

const AnalysisFeature = () => (
  <FeatureMarketingPage
    title="Climate, Irrigation & Carbon Analysis"
    metaTitle="Climate Risk, Irrigation & Carbon Analysis Tools | Imvelo"
    metaDescription="Season outlooks for 2 weeks to 12 months, smart irrigation schedules and farm carbon scoring for African farmers. See a sample Imvelo analysis."
    path="/features/analysis"
    tagline="Look past next week — plan the season with climate, water and carbon insight."
    icon={LineChart}
    intro="The analysis suite combines long-range climate modelling, rainfall-driven irrigation planning and a farm carbon score, so you can choose crops, budget water and prove sustainability."
    bullets={[
      "Climate volatility outlooks for 2 weeks, 3 months, 6 months and 1 year",
      "Suitable crop suggestions for each time horizon",
      "Smart irrigation schedule from 7-day rainfall analysis",
      "Water-saving recommendations sized to your plot",
      "Farm carbon footprint score with improvement actions",
      "Exportable reports for banks, buyers and co-operatives",
    ]}
    preview={{
      heading: "Sample season outlook — 3 months",
      rows: [
        { label: "Rainfall trend", value: "Below average, 15% drier than normal" },
        { label: "Risk level", value: "Moderate drought stress" },
        { label: "Suitable crops", value: "Sorghum, cowpea, drought-tolerant maize" },
        { label: "Irrigation plan", value: "2 sessions/week, 18 mm each" },
        { label: "Carbon score", value: "68/100 — improve with cover cropping" },
      ],
      note: "Illustrative example. Live analysis is generated from your farm location and recorded activities.",
    }}
    faqs={[
      { q: "How far ahead can I plan?", a: "Outlooks cover 2 weeks, 3 months, 6 months and a full year, each with crop guidance." },
      { q: "Is the irrigation planner automatic?", a: "Yes — it reads the 7-day rainfall forecast for your location and adjusts the watering schedule." },
      { q: "Why does carbon scoring matter?", a: "Buyers, lenders and co-operatives increasingly ask for sustainability evidence; the score gives you a documented starting point." },
    ]}
    appPath="/analysis"
  />
);

export default AnalysisFeature;