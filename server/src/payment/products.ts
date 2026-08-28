// Server-side product catalog — the authoritative source for product IDs,
// prices and plan mapping used by the Express payment service. This mirrors
// src/lib/products.ts (used by the Vercel function / frontend). Keep the two
// in sync.
//
// The payment provider configured for this project is Dodo Payments. There is
// no alternate provider, so "the provided payment API" is Dodo.

export type PaidPlan = 'premium' | 'commercial' | 'enterprise';

export interface ProductCatalogEntry {
  productId: string;
  plan: PaidPlan;
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

export const PRODUCT_PLAN_MAP: Record<string, string> = Object.fromEntries(
  Object.values(PRODUCT_CATALOG).map((p) => [p.productId, p.plan]),
);

export function getProduct(productId: string): ProductCatalogEntry | undefined {
  return PRODUCT_CATALOG[productId];
}

export function isKnownProduct(productId: string): boolean {
  return productId in PRODUCT_CATALOG;
}
