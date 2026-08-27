const ADSENSE_CLIENT_ID = 'ca-pub-8798490201756955';
const ADSENSE_SCRIPT_SRC =
  'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

let injected = false;

export const loadAdSense = (): Promise<void> => {
  if (injected) return Promise.resolve();
  if (typeof window === 'undefined') return Promise.resolve();
  injected = true;

  return new Promise((resolve) => {
    const meta = document.createElement('meta');
    meta.name = 'google-adsense-account';
    meta.content = `ca-${ADSENSE_CLIENT_ID.split('-')[1]}`;
    document.head.appendChild(meta);

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `${ADSENSE_SCRIPT_SRC}?client=${ADSENSE_CLIENT_ID}`;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);

    // AdSense auto-ads init (defensive; the script tag alone also works).
    const init = () => {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    };
    if ((window as any).adsbygoogle) {
      init();
    } else {
      script.onload = () => { init(); resolve(); };
    }
  });
};

export const unloadAdSense = () => {
  if (!injected) return;
  const script = document.querySelector(
    `script[src^="${ADSENSE_SCRIPT_SRC}"]`
  );
  script?.parentNode?.removeChild(script);
  const meta = document.querySelector('meta[name="google-adsense-account"]');
  meta?.parentNode?.removeChild(meta);
  (window as any).adsbygoogle = [];
  injected = false;
};
