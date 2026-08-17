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
        existing.addEventListener('load', () => resolve(!!window.DodoPaymentsCheckout?.DodoPayments));
        existing.addEventListener('error', () => resolve(false));
      }
      return;
    }

    const script = document.createElement('script');
    script.id = DODO_SCRIPT_ID;
    script.src = 'https://cdn.jsdelivr.net/npm/dodopayments-checkout@latest/dist/index.js';
    script.async = true;
    script.onload = () => resolve(!!window.DodoPaymentsCheckout?.DodoPayments);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
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
  const mode = getDodoMode();
  const ready = await loadDodoSdk();

  if (!ready || !window.DodoPaymentsCheckout?.DodoPayments) {
    window.location.href = checkoutUrl;
    return;
  }

  window.DodoPaymentsCheckout.DodoPayments.Initialize({
    mode,
    displayType: 'overlay',
    onEvent: (event) => {
      if (event.event_type === 'checkout.closed' || event.event_type === 'checkout.redirect') {
        const url = new URL(window.location.href);
        url.searchParams.set('success', 'true');
        window.location.href = url.toString();
      }
      if (event.event_type === 'checkout.error') {
        console.error('Dodo checkout error:', event.data);
      }
    },
  });

  try {
    await window.DodoPaymentsCheckout.DodoPayments.Checkout.open({
      checkoutUrl,
      options: {
        showTimer: true,
        showSecurityBadge: true,
      },
    });
  } catch (error) {
    console.error('Failed to open Dodo overlay checkout:', error);
    window.location.href = checkoutUrl;
  }
};
