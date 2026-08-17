type DodoCheckoutMode = 'test' | 'live';

declare global {
  interface Window {
    DodoPaymentsCheckout?: {
      DodoPayments: {
        Initialize: (opts: {
          mode: DodoCheckoutMode;
          displayType?: 'overlay' | 'inline';
          onEvent: (event: { event_type: string; data?: any }) => void;
        }) => void;
        Checkout: {
          open: (opts: { checkoutUrl: string; options?: { showTimer?: boolean; showSecurityBadge?: boolean } }) => Promise<void> | void;
          close: () => void;
          isOpen: () => boolean;
        };
      };
    };
  }
}

const DODO_SCRIPT_ID = 'dodo-checkout-sdk';

const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/dodopayments-checkout@latest/dist/index.js',
  'https://unpkg.com/dodopayments-checkout@latest/dist/index.js',
];

export const loadDodoSdk = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.DodoPaymentsCheckout?.DodoPayments) {
      console.log('[dodoCheckout] SDK already loaded');
      resolve(true);
      return;
    }

    if (document.getElementById(DODO_SCRIPT_ID)) {
      const existing = document.getElementById(DODO_SCRIPT_ID) as HTMLScriptElement | null;
      if (existing) {
        console.log('[dodoCheckout] SDK script already in DOM, waiting for load...');
        const onLoad = () => resolve(!!window.DodoPaymentsCheckout?.DodoPayments);
        const onError = () => resolve(false);
        existing.addEventListener('load', onLoad);
        existing.addEventListener('error', onError);
      }
      return;
    }

    let attempts = 0;

    const tryLoad = (url: string) => {
      console.log(`[dodoCheckout] Attempting to load SDK from: ${url}`);
      const script = document.createElement('script');
      script.id = DODO_SCRIPT_ID;
      script.src = url;
      script.async = true;
      script.onload = () => {
        console.log(`[dodoCheckout] SDK script loaded from: ${url}`);
        resolve(!!window.DodoPaymentsCheckout?.DodoPayments);
      };
      script.onerror = () => {
        console.warn(`[dodoCheckout] Failed to load SDK from: ${url}`);
        attempts++;
        if (attempts < CDN_URLS.length) {
          console.log(`[dodoCheckout] Trying next CDN...`);
          tryLoad(CDN_URLS[attempts]);
        } else {
          console.error('[dodoCheckout] All CDN attempts failed');
          resolve(false);
        }
      };
      document.body.appendChild(script);
    };

    tryLoad(CDN_URLS[attempts]);
  });
};

export const getDodoMode = (): DodoCheckoutMode => {
  if (typeof window === 'undefined') return 'live';
  const params = new URLSearchParams(window.location.search);
  const qs = params.get('dodo_mode');
  if (qs === 'test') return 'test';
  return 'live';
};

export const openDodoOverlay = async (checkoutUrl: string) => {
  console.log('[dodoCheckout] Opening Dodo overlay with URL:', checkoutUrl);
  const mode = getDodoMode();
  console.log('[dodoCheckout] Dodo mode:', mode);

  const ready = await loadDodoSdk();
  console.log('[dodoCheckout] SDK ready:', ready);

  if (!ready || !window.DodoPaymentsCheckout?.DodoPayments) {
    console.error('[dodoCheckout] SDK not available, cannot open overlay checkout');
    throw new Error('Payment SDK not loaded. Please check your internet connection and try again.');
  }

  try {
    console.log('[dodoCheckout] Initializing Dodo Payments SDK...');
    window.DodoPaymentsCheckout.DodoPayments.Initialize({
      mode,
      displayType: 'overlay',
      onEvent: (event) => {
        console.log('[dodoCheckout] Event:', event.event_type, event.data || '');
        if (event.event_type === 'checkout.closed') {
          console.log('[dodoCheckout] Checkout closed by user');
        }
        if (event.event_type === 'checkout.redirect') {
          const redirectTo = event.data?.message?.redirect_to || event.data?.redirect_to;
          if (redirectTo) {
            console.log('[dodoCheckout] Redirecting to:', redirectTo);
            window.location.href = redirectTo;
          } else {
            const url = new URL(window.location.href);
            url.searchParams.set('success', 'true');
            window.location.href = url.toString();
          }
        }
        if (event.event_type === 'checkout.error') {
          console.error('[dodoCheckout] Checkout error:', event.data);
        }
      },
    });

    console.log('[dodoCheckout] Opening checkout overlay...');
    await window.DodoPaymentsCheckout.DodoPayments.Checkout.open({
      checkoutUrl,
      options: {
        showTimer: true,
        showSecurityBadge: true,
      },
    });
    console.log('[dodoCheckout] Checkout overlay opened successfully');
  } catch (error) {
    console.error('[dodoCheckout] Failed to open overlay:', error);
    throw error;
  }
};
