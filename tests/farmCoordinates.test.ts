import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { farmCoordinatesSchema } from '../src/lib/farmCoordinates';

describe('farm coordinate entry', () => {
  test('accepts decimal coordinates for an Eswatini farm', () => {
    assert.deepEqual(farmCoordinatesSchema.parse({ latitude: ' -26.3054 ', longitude: '31.1367' }),
      { latitude: -26.3054, longitude: 31.1367 });
  });
  test('rejects empty coordinates instead of treating them as zero', () => {
    assert.equal(farmCoordinatesSchema.safeParse({ latitude: '', longitude: '' }).success, false);
  });
  test('rejects coordinates outside geographic bounds', () => {
    assert.equal(farmCoordinatesSchema.safeParse({ latitude: '91', longitude: '31' }).success, false);
    assert.equal(farmCoordinatesSchema.safeParse({ latitude: '-26', longitude: '181' }).success, false);
  });
});