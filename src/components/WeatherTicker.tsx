import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Wheat, Bean, Milk, Beef, Citrus, Coffee } from 'lucide-react';

interface CommodityPrice {
  name: string;
  price: string;
  currency: string;
  change: number;
  unit: string;
}

const COMMODITIES: CommodityPrice[] = [
  { name: "Maize", price: "215.50", currency: "USD", change: 1.8, unit: "/ton" },
  { name: "Wheat", price: "248.30", currency: "USD", change: -0.6, unit: "/ton" },
  { name: "Soybeans", price: "382.40", currency: "USD", change: 2.1, unit: "/ton" },
  { name: "Rice", price: "518.00", currency: "USD", change: 0.3, unit: "/ton" },
  { name: "Sugar", price: "0.224", currency: "USD", change: -1.2, unit: "/lb" },
  { name: "Coffee", price: "4.82", currency: "USD", change: 3.4, unit: "/lb" },
  { name: "Cotton", price: "0.72", currency: "USD", change: -0.4, unit: "/lb" },
  { name: "Cattle", price: "198.50", currency: "USD", change: 0.9, unit: "/cwt" },
  { name: "Palm Oil", price: "892.00", currency: "USD", change: -1.7, unit: "/ton" },
  { name: "Cocoa", price: "8,420", currency: "USD", change: 5.2, unit: "/ton" },
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

const MarketTicker = () => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    // Simulate small random price fluctuations every 30s
    const interval = setInterval(() => {
      setOffset(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-primary/10 border-b border-primary/20 overflow-hidden">
      <div className="animate-marquee whitespace-nowrap py-2 flex items-center gap-6">
        {[...COMMODITIES, ...COMMODITIES].map((commodity, i) => (
          <div key={`${commodity.name}-${i}`} className="flex items-center gap-1.5 text-sm">
            <span className="font-medium text-foreground">{commodity.name}</span>
            <span className="text-foreground">${commodity.price}</span>
            <span className="text-xs text-muted-foreground">{commodity.unit}</span>
            {getChangeIcon(commodity.change)}
            <span className={`text-xs font-medium ${getChangeColor(commodity.change)}`}>
              {commodity.change > 0 ? "+" : ""}{commodity.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketTicker;
