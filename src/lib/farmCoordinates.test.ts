import { describe, expect, test } from 'bun:test';
import { farmCoordinatesSchema } from './farmCoordinates';

describe('farm coordinate entry', () => {
  test('accepts decimal coordinates for an Eswatini farm', () => {
    expect(farmCoordinatesSchema.parse({ latitude: ' -26.3054 ', longitude: '31.1367' }))
      .toEqual({ latitude: -26.3054, longitude: 31.1367 });
  });
  test('rejects empty coordinates instead of treating them as zero', () => {
    expect(farmCoordinatesSchema.safeParse({ latitude: '', longitude: '' }).success).toBe(false);
  });
  test('rejects coordinates outside geographic bounds', () => {
    expect(farmCoordinatesSchema.safeParse({ latitude: '91', longitude: '31' }).success).toBe(false);
    expect(farmCoordinatesSchema.safeParse({ latitude: '-26', longitude: '181' }).success).toBe(false);
  });
});