import { describe, expect, it } from 'vitest';
import {
  assertDevelopmentOnlyConfig,
  createSeededRng,
  sampleBeta44,
  simulateUserInMemory,
} from '../../sim/simulate';

function runScenarioSummary(
  delta: number,
  seed: number,
  n: number,
): { readonly ctrlRate: number; readonly cexRate: number; readonly transferDiff: number } {
  const rng = createSeededRng(seed);
  let ctrlCore = 0;
  let cexCore = 0;
  let ctrlTransfer = 0;
  let cexTransfer = 0;

  for (let i = 0; i < n; i += 1) {
    const theta = sampleBeta44(rng);
    const arm = i % 2 === 0 ? 'control' : 'counterexample';
    const out = simulateUserInMemory(theta, delta, arm, rng);
    if (arm === 'control') {
      if (out.coreSetCompleted) ctrlCore += 1;
      if (out.transferSolved) ctrlTransfer += 1;
    } else {
      if (out.coreSetCompleted) cexCore += 1;
      if (out.transferSolved) cexTransfer += 1;
    }
  }

  const half = n / 2;
  return {
    ctrlRate: ctrlCore / half,
    cexRate: cexCore / half,
    transferDiff: Math.abs(cexTransfer / half - ctrlTransfer / half),
  };
}

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

  it('calibrates null (delta=0), positive (+0.3), and negative (-0.2) lifts with neutral transfer', () => {
    const neutral = runScenarioSummary(0, 101, 400);
    expect(Math.abs(neutral.cexRate - neutral.ctrlRate)).toBeLessThan(0.12);
    expect(neutral.transferDiff).toBeLessThan(0.08);

    const positive = runScenarioSummary(0.3, 202, 400);
    expect(positive.cexRate).toBeGreaterThan(positive.ctrlRate + 0.05);
    expect(positive.transferDiff).toBeLessThan(0.08);

    const negative = runScenarioSummary(-0.2, 303, 400);
    expect(negative.cexRate).toBeLessThan(negative.ctrlRate - 0.03);
    expect(negative.transferDiff).toBeLessThan(0.08);
  });
});
