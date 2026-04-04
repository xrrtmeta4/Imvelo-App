import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCurrency } from '@/hooks/useCurrency';

interface CommodityPrice {
  name: string;
  price: number;
  currency: string;
  change: number;
  unit: string;
}

const FALLBACK: CommodityPrice[] = [
  { name: "Maize", price: 215.5, currency: "USD", change: 1.8, unit: "/ton" },
  { name: "Wheat", price: 248.3, currency: "USD", change: -0.6, unit: "/ton" },
  { name: "Soybeans", price: 382.4, currency: "USD", change: 2.1, unit: "/ton" },
  { name: "Rice", price: 518.0, currency: "USD", change: 0.3, unit: "/ton" },
  { name: "Sugar", price: 0.224, currency: "USD", change: -1.2, unit: "/lb" },
  { name: "Coffee", price: 4.82, currency: "USD", change: 3.4, unit: "/lb" },
  { name: "Cotton", price: 0.72, currency: "USD", change: -0.4, unit: "/lb" },
  { name: "Cattle", price: 198.5, currency: "USD", change: 0.9, unit: "/cwt" },
  { name: "Palm Oil", price: 892.0, currency: "USD", change: -1.7, unit: "/ton" },
  { name: "Cocoa", price: 8420, currency: "USD", change: 5.2, unit: "/ton" },
];

const getChangeIcon = (change: number) => {
  if (change > 0) return <TrendingUp className="w-3 h-3 text-green-500" />;
  if (change < 0) return <TrendingDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
};

const getChangeColor = (change: number) => {
  if (change > 0) return "text-green-500";
  if (change < 0) return "text-red-500";
  return "text-muted-foreground";
};

const formatPrice = (price: number) => {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  return price.toFixed(3);
};

const MarketTicker = () => {
  const [prices, setPrices] = useState<CommodityPrice[]>(FALLBACK);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    fetchPrices();
    // Refresh every 10 minutes
    const interval = setInterval(fetchPrices, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchPrices = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('commodity-prices');
      if (!error && data?.prices?.length) {
        setPrices(data.prices);
        setLastUpdated(data.updated_at);
      }
    } catch {
      // Keep fallback prices
    }
  };

  return (
    <div className="bg-primary/10 border-b border-primary/20 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap py-2 flex items-center gap-6">
        {[...prices, ...prices].map((commodity, i) => (
          <div key={`${commodity.name}-${i}`} className="flex items-center gap-1.5 text-sm">
            <span className="font-medium text-foreground">{commodity.name}</span>
            <span className="text-foreground">${formatPrice(commodity.price)}</span>
            <span className="text-xs text-muted-foreground">{commodity.unit}</span>
            {getChangeIcon(commodity.change)}
            <span className={`text-xs font-medium ${getChangeColor(commodity.change)}`}>
              {commodity.change > 0 ? "+" : ""}{commodity.change.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketTicker;
