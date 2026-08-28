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
          open: (opts: { checkoutUrl: string; options?: { showTimer?: boolean; showSecurityBadge?: boolean; manualRedirect?: boolean } }) => Promise<void> | void;
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

export interface DodoOverlayCallbacks {
  onOpened?: () => void;
  // Fired when the checkout flow completes (success, cancel or redirect).
  // The caller should poll the backend for the authoritative status — we
  // NEVER activate anything here based on the client event.
  onCompleted?: () => void;
  onError?: (error: unknown) => void;
}

/**
 * Open the Dodo checkout IN-APP as an overlay.
 *
 * Security note: this function must never navigate the browser away to a
 * hosted checkout URL (`window.location.href = ...`). The user pays inside
 * the app; subscription activation is performed only by the verified backend
 * webhook (or, as a fallback, by a server-side status check), never by the
 * client. If the checkout SDK cannot be loaded, we throw so the caller can
 * surface a retryable error instead of silently falling back to a redirect.
 */
export const openDodoCheckout = async (checkoutUrl: string, callbacks?: DodoOverlayCallbacks): Promise<void> => {
  const mode = getDodoMode();
  const ready = await loadDodoSdk();

  if (!ready || !window.DodoPaymentsCheckout?.DodoPayments) {
    const err = new Error('Payment checkout could not be loaded. Please check your connection and try again.');
    callbacks?.onError?.(err);
    throw err;
  }

  window.DodoPaymentsCheckout.DodoPayments.Initialize({
    mode,
    displayType: 'overlay',
    onEvent: (event) => {
      if (event.event_type === 'checkout.completed' || event.event_type === 'checkout.redirect') {
        // Do not navigate. Just let the caller re-check backend status.
        callbacks?.onCompleted?.();
      }
      if (event.event_type === 'checkout.error') {
        console.error('[dodoCheckout] Checkout error:', event.data);
        callbacks?.onError?.(event.data);
      }
      // checkout.closed: user dismissed — stay on the page, no action.
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
    callbacks?.onOpened?.();
  } catch (error) {
    console.error('[dodoCheckout] Failed to open overlay:', error);
    callbacks?.onError?.(error);
    throw error;
  }
};
