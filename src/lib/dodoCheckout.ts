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
      resolve(true);
      return;
    }

    if (document.getElementById(DODO_SCRIPT_ID)) {
      const existing = document.getElementById(DODO_SCRIPT_ID) as HTMLScriptElement | null;
      if (existing) {
        const onLoad = () => resolve(!!window.DodoPaymentsCheckout?.DodoPayments);
        const onError = () => resolve(false);
        existing.addEventListener('load', onLoad);
        existing.addEventListener('error', onError);
      }
      return;
    }

    let attempts = 0;

    const tryLoad = (url: string) => {
      const script = document.createElement('script');
      script.id = DODO_SCRIPT_ID;
      script.src = url;
      script.async = true;
      script.onload = () => resolve(!!window.DodoPaymentsCheckout?.DodoPayments);
      script.onerror = () => {
        attempts++;
        if (attempts < CDN_URLS.length) {
          tryLoad(CDN_URLS[attempts]);
        } else {
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

export const openDodoOverlay = async (checkoutUrl: string, onOpened?: () => void) => {
  const mode = getDodoMode();
  const ready = await loadDodoSdk();

  if (!ready || !window.DodoPaymentsCheckout?.DodoPayments) {
    // Full-screen redirect so the user always sees the full payment method UI
    // (cards, Google Pay, Apple Pay, Amazon Pay as available in their region).
    window.location.href = checkoutUrl;
    onOpened?.();
    return;
  }

  window.DodoPaymentsCheckout.DodoPayments.Initialize({
    mode,
    displayType: 'overlay',
    onEvent: (event) => {
      if (event.event_type === 'checkout.closed') {
        // User closed overlay, stay on page
      }
      if (event.event_type === 'checkout.redirect') {
        const redirectTo = event.data?.message?.redirect_to || event.data?.redirect_to;
        if (redirectTo) {
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

  try {
    await window.DodoPaymentsCheckout.DodoPayments.Checkout.open({
      checkoutUrl,
      options: {
        showTimer: true,
        showSecurityBadge: true,
        manualRedirect: true,
      },
    });
    onOpened?.();
  } catch (error) {
    console.error('[dodoCheckout] Failed to open overlay:', error);
    window.location.href = checkoutUrl;
    onOpened?.();
  }
};
