// Authoritative product catalog for the payment integration.
//
// This is the SINGLE source of truth for product IDs, prices and plan mapping.
// The backend (Vercel function + Express service) uses it to validate the
// requested product and to determine the authoritative amount/currency. The
// frontend only uses it for display — it must NEVER send an amount to the
// payment API (the backend decides the price).
//
// The payment provider configured for this project is Dodo Payments
// (see DODO_PAYMENTS_API_KEY / DODO_PRODUCT_ID in the environment). There is
// no alternate provider wired up, so "the provided payment API" is Dodo.

export type PlanTier = 'free' | 'starter' | 'premium' | 'commercial' | 'enterprise';

export interface ProductCatalogEntry {
  productId: string;
  plan: Exclude<PlanTier, 'free' | 'starter'>;
  name: string;
  price: number;
  currency: string;
  interval: 'month';
}

export const PRODUCT_CATALOG: Record<string, ProductCatalogEntry> = {
  pdt_0NYZaqcOARihEXXOPIdmC: {
    productId: 'pdt_0NYZaqcOARihEXXOPIdmC',
    plan: 'premium',
    name: 'Premium',
    price: 37,
    currency: 'USD',
    interval: 'month',
  },
  pdt_0NVKhwZKeJCCaRbxoTNno: {
    productId: 'pdt_0NVKhwZKeJCCaRbxoTNno',
    plan: 'commercial',
    name: 'Commercial',
    price: 499,
    currency: 'USD',
    interval: 'month',
  },
  pdt_0NYZb3ccdGubedVQypzZn: {
    productId: 'pdt_0NYZb3ccdGubedVQypzZn',
    plan: 'enterprise',
    name: 'Enterprise',
    price: 999,
    currency: 'USD',
    interval: 'month',
  },
};

// Reverse lookup: product id -> plan tier.
export const PRODUCT_PLAN_MAP: Record<string, string> = Object.fromEntries(
  Object.values(PRODUCT_CATALOG).map((p) => [p.productId, p.plan]),
);

export function getProduct(productId: string): ProductCatalogEntry | undefined {
  return PRODUCT_CATALOG[productId];
}

export function isKnownProduct(productId: string): boolean {
  return productId in PRODUCT_CATALOG;
}
