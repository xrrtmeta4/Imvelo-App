import { CloudSun } from "lucide-react";
import FeatureMarketingPage from "@/components/FeatureMarketingPage";

const WeatherFeature = () => (
  <FeatureMarketingPage
    title="Farm Weather & Early Warnings"
    metaTitle="Farm Weather Forecast & Early Warnings | Imvelo"
    metaDescription="Location-based 7-day farm forecasts, rainfall outlooks and early warning alerts for African farmers. See a sample Imvelo weather briefing."
    path="/features/weather"
    tagline="A 7-day forecast built for field decisions, not city commutes."
    icon={CloudSun}
    intro="Imvelo pulls high-resolution agro-weather data for your exact GPS location and turns it into plain advice: when to plant, when to spray, when to hold off irrigating, and when to protect your crop."
    bullets={[
      "7-day forecast for your GPS location",
      "Rainfall totals and soil moisture outlook",
      "Spray windows based on wind and rain risk",
      "Daily 6 AM weather message so you plan before sunrise",
      "Push and SMS early warnings for storms, frost and heat",
      "Works on low-end phones and low data connections",
    ]}
    preview={{
      heading: "Sample daily briefing — Manzini region",
      rows: [
        { label: "Today", value: "26°C / 14°C, scattered cloud" },
        { label: "Rain next 7 days", value: "38 mm, mostly Thursday–Friday" },
        { label: "Spray window", value: "Tomorrow 06:00–09:00, wind 7 km/h" },
        { label: "Irrigation advice", value: "Skip Wednesday — rain expected" },
        { label: "Alert", value: "Hail risk Friday afternoon" },
      ],
      note: "Illustrative example. Live forecasts are generated for your own coordinates when you sign in.",
    }}
    faqs={[
      { q: "Do I need data all day?", a: "No. The daily briefing is sent once each morning, and forecasts are lightweight to load." },
      { q: "What if I have no smartphone?", a: "Imvelo also delivers advisories over SMS and USSD (*384*51139#) for offline farmers." },
      { q: "How accurate is it?", a: "Forecasts use high-resolution agro-weather models for your coordinates, refreshed daily." },
    ]}
    appPath="/weather"
  />
);

export default WeatherFeature;