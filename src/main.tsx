import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Self-heal: if a stale service worker serves an old index.html that references
// chunks no longer on the server, the dynamic import throws. Unregister all
// service workers, clear caches, and reload once so the user never sees a
// blank white screen.
if (typeof window !== "undefined") {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    });
  }

  const STORAGE_KEY = "__imvelo_sw_recovery";
  const tryRecover = async (reason: unknown) => {
    if (sessionStorage.getItem(STORAGE_KEY)) return; // already attempted
    const msg = String((reason as { message?: string })?.message ?? reason ?? "");
    if (!/dynamically imported module|Failed to fetch dynamically|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed/i.test(msg)) return;
    sessionStorage.setItem(STORAGE_KEY, "1");
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } finally {
      location.reload();
    }
  };
  window.addEventListener("error", (e) => void tryRecover(e.error ?? e.message));
  window.addEventListener("unhandledrejection", (e) => void tryRecover(e.reason));
}

createRoot(document.getElementById("root")!).render(<App />);
