import { useState, useEffect, useCallback } from 'react';
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
  { name: "Cabbage", price: 6.5, currency: "SZL", change: 0, unit: "/kg" },
  { name: "Tomato", price: 14.0, currency: "SZL", change: 0, unit: "/kg" },
  { name: "Potato", price: 9.0, currency: "SZL", change: 0, unit: "/kg" },
  { name: "Onion", price: 11.0, currency: "SZL", change: 0, unit: "/kg" },
  { name: "Green Pepper", price: 16.0, currency: "SZL", change: 0, unit: "/kg" },
  { name: "Carrot", price: 8.5, currency: "SZL", change: 0, unit: "/kg" },
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
  const [, setLastUpdated] = useState<string>("");
  const [index, setIndex] = useState(0);
  const { selectedCurrency } = useCurrency();

  const fetchPrices = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('commodity-prices', {
        body: { currency: selectedCurrency.code },
      });
      if (!error && data?.prices?.length) {
        setPrices(data.prices);
        setLastUpdated(data.updated_at);
        return;
      }
    } catch {
      // Keep fallback prices
    }
  }, [selectedCurrency]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(() => {
      fetchPrices();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const displayPrices = prices;

  useEffect(() => {
    if (displayPrices.length === 0) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % displayPrices.length);
    }, 3000);
    return () => clearInterval(id);
  }, [displayPrices.length]);

  const visible = displayPrices.slice(index, index + 3).concat(
    displayPrices.slice(0, Math.max(0, index + 3 - displayPrices.length))
  );

  return (
    <div className="bg-primary/10 border-b border-primary/20 py-2 px-3">
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-none">
        {visible.map((commodity, i) => (
          <div key={`${commodity.name}-${i}`} className="flex items-center gap-1.5 text-sm shrink-0">
            <span className="font-medium text-foreground">{commodity.name}</span>
            <span className="text-foreground">{selectedCurrency.symbol}{formatPrice(commodity.price)}</span>
            <span className="text-xs text-muted-foreground">{commodity.unit}</span>
            {commodity.change !== 0 && (
              <>
                {getChangeIcon(commodity.change)}
                <span className={`text-xs font-medium ${getChangeColor(commodity.change)}`}>
                  {commodity.change > 0 ? "+" : ""}{commodity.change.toFixed(1)}%
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MarketTicker;
