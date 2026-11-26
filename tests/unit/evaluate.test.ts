import { describe, expect, it } from 'vitest';
import { CHALLENGES } from '../../src/engine/challenges';
import { evaluate, MAX_PATTERN_LENGTH } from '../../src/engine/evaluate';

describe('evaluate and challenges', () => {
  it('passes 8/8 checks for every challenge reference solution', () => {
    for (const challenge of CHALLENGES) {
      const result = evaluate(challenge.referenceSolution, challenge.tests);
      expect(result.ok).toBe(true);
      expect(result.passed).toBe(8);
      expect(result.total).toBe(8);
      expect(result.firstFailure).toBeUndefined();
      expect(result.syntaxError).toBeUndefined();
    }
  });

  it('detects the expected anchoring trap firstFailure on Challenge 1', () => {
    const c1 = CHALLENGES[0];
    if (c1 === undefined) throw new Error('Missing c1');

    // Pattern without fixed 2-digit month matches 2026-1-29 (should NOT match)
    const result = evaluate('^\\d{4}-\\d{1,2}-\\d{2}$', c1.tests);
    expect(result.ok).toBe(false);
    expect(result.passed).toBe(7);
    expect(result.total).toBe(8);
    expect(result.firstFailure).toEqual({ input: '2026-1-29', expected: false });
  });

  it('detects first positive failure in fixed order on Challenge 2', () => {
    const c2 = CHALLENGES[1];
    if (c2 === undefined) throw new Error('Missing c2');

    const result = evaluate('^\\d+\\.\\d+\\.\\d+$', c2.tests);
    expect(result.ok).toBe(false);
    expect(result.passed).toBe(7);
    expect(result.firstFailure).toEqual({ input: '1.2.3-beta.3', expected: true });
  });

  it('returns syntaxError for empty and malformed regex patterns', () => {
    const c1 = CHALLENGES[0];
    if (c1 === undefined) throw new Error('Missing c1');

    const emptyRes = evaluate('', c1.tests);
    expect(emptyRes.ok).toBe(false);
    expect(emptyRes.syntaxError).toBe('Please enter a regular expression pattern.');

    const invalidRes = evaluate('([a-z', c1.tests);
    expect(invalidRes.ok).toBe(false);
    expect(invalidRes.syntaxError).toBeTruthy();
  });

  it('rejects patterns longer than 200 characters', () => {
    const c1 = CHALLENGES[0];
    if (c1 === undefined) throw new Error('Missing c1');

    const longPattern = 'a'.repeat(MAX_PATTERN_LENGTH + 1);
    const result = evaluate(longPattern, c1.tests);
    expect(result.ok).toBe(false);
    expect(result.syntaxError).toContain('200');
  });

  it('aborts with "Pattern too slow" when a single test exceeds 50 ms', () => {
    const c1 = CHALLENGES[0];
    if (c1 === undefined) throw new Error('Missing c1');

    let tick = 0;
    const fakeNow = (): number => {
      const value = tick;
      tick += 60;
      return value;
    };

    const result = evaluate('^\\d+$', c1.tests, { now: fakeNow });
    expect(result.ok).toBe(false);
    expect(result.timedOut).toBe(true);
    expect(result.syntaxError).toBe('Pattern too slow');
  });
});
