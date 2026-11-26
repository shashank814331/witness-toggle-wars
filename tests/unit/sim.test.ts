import { describe, expect, it } from 'vitest';
import { assertDevelopmentOnlyConfig, createSeededRng, sampleBeta44 } from '../../sim/simulate';

describe('calibration simulator safety and generative model', () => {
  it('refuses to run against production env or matching prod key', () => {
    expect(() => {
      assertDevelopmentOnlyConfig('ser.dev_key', 'ser.prod_key', 'production', false);
    }).toThrow(/production/i);

    expect(() => {
      assertDevelopmentOnlyConfig('ser.same_key', 'ser.same_key', 'development', false);
    }).toThrow(/matches Production/i);

    expect(() => {
      assertDevelopmentOnlyConfig('', '', 'development', false);
    }).toThrow(/Missing FLAGSMITH_DEV_ENV_KEY/i);

    expect(() => {
      assertDevelopmentOnlyConfig('', '', 'development', true);
    }).not.toThrow();
  });

  it('produces deterministic Beta(4, 4) samples in (0, 1) centered near 0.5', () => {
    const rng1 = createSeededRng(42);
    const rng2 = createSeededRng(42);
    const samples1 = Array.from({ length: 200 }, () => sampleBeta44(rng1));
    const samples2 = Array.from({ length: 200 }, () => sampleBeta44(rng2));

    expect(samples1).toEqual(samples2);
    for (const v of samples1) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
    const mean = samples1.reduce((acc, v) => acc + v, 0) / samples1.length;
    expect(mean).toBeGreaterThan(0.4);
    expect(mean).toBeLessThan(0.6);
  });
});
