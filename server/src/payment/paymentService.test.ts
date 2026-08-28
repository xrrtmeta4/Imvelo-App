import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { verifyDodoWebhookSignature, defaultPaymentMethods } from './dodoGateway.js';
import { isKnownProduct, getProduct, PRODUCT_PLAN_MAP } from './products.js';

describe('Dodo webhook signature verification', () => {
  test('accepts a correctly signed payload', () => {
    const secret = 's3cr3t';
    const body = '{"type":"payment.succeeded"}';
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    assert.strictEqual(verifyDodoWebhookSignature(body, sig, secret), true);
  });

  test('rejects a tampered payload', () => {
    const secret = 's3cr3t';
    const body = '{"type":"payment.succeeded"}';
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
    assert.strictEqual(verifyDodoWebhookSignature(body + 'tampered', sig, secret), false);
  });

  test('rejects a wrong secret', () => {
    const body = '{"type":"payment.succeeded"}';
    const sig = crypto.createHmac('sha256', 'a').update(body).digest('hex');
    assert.strictEqual(verifyDodoWebhookSignature(body, sig, 'b'), false);
  });
});

describe('product catalog (authoritative prices/plans)', () => {
  test('known products map to plans and prices', () => {
    assert.strictEqual(isKnownProduct('pdt_0NYZaqcOARihEXXOPIdmC'), true);
    assert.strictEqual(getProduct('pdt_0NYZaqcOARihEXXOPIdmC')?.plan, 'premium');
    assert.strictEqual(getProduct('pdt_0NYZaqcOARihEXXOPIdmC')?.price, 37);
    assert.strictEqual(getProduct('pdt_0NYZaqcOARihEXXOPIdmC')?.currency, 'USD');
    assert.strictEqual(PRODUCT_PLAN_MAP['pdt_0NVKhwZKeJCCaRbxoTNno'], 'commercial');
    assert.strictEqual(PRODUCT_PLAN_MAP['pdt_0NYZb3ccdGubedVQypzZn'], 'enterprise');
  });

  test('rejects unknown products', () => {
    assert.strictEqual(isKnownProduct('bogus_product'), false);
  });
});

describe('default payment methods', () => {
  test('returns a non-empty list', () => {
    assert.ok(defaultPaymentMethods().length > 0);
  });
});
