import { useEffect, useState } from "react";
import { X } from "lucide-react";
import marketplaceImage from "@/assets/imvelo-marketplace-promo.png";
import languagesImage from "@/assets/imvelo-languages-promo.png";

const STORAGE_KEY = "imvelo_marketplace_promo_last_shown";
const SESSION_KEY = "imvelo_marketplace_promo_session_shown";
const ROTATION_KEY = "imvelo_promo_rotation_index";
const INTERVAL_MS = 1000 * 60 * 60 * 24 * 3; // every 3 days max
const FIRST_DELAY_MS = 1000 * 90; // 90s after mount on first eligible visit
const MARKETPLACE_URL = "https://imvelomarketplace.vercel.app";

const ADS = [
  { image: marketplaceImage, url: MARKETPLACE_URL, alt: "Imvelo Marketplace - Sell to customers across Africa" },
  { image: languagesImage, url: "https://imveloappsz.vercel.app", alt: "Imvelo now supports 15 more African languages" },
];

export const MarketplacePromoModal = () => {
  const [open, setOpen] = useState(false);
  const [adIndex, setAdIndex] = useState(0);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const last = Number(localStorage.getItem(STORAGE_KEY) || 0);
    if (Date.now() - last < INTERVAL_MS) return;

    const timer = setTimeout(() => {
      const next = (Number(localStorage.getItem(ROTATION_KEY) || 0) + 1) % ADS.length;
      setAdIndex(next);
      localStorage.setItem(ROTATION_KEY, String(next));
      setOpen(true);
      sessionStorage.setItem(SESSION_KEY, "1");
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }, FIRST_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  if (!open) return null;

  const ad = ADS[adIndex];

  const close = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={close}
    >
      <div
        className="relative max-w-md w-full rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-background/80 hover:bg-background text-foreground shadow"
        >
          <X className="w-4 h-4" />
        </button>
        <a
          href={ad.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          className="block"
        >
          <img
            src={ad.image}
            alt={ad.alt}
            className="w-full h-auto block"
          />
        </a>
      </div>
    </div>
  );
};

export default MarketplacePromoModal;
