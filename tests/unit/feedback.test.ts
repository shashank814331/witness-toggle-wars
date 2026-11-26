import { describe, expect, it, vi } from 'vitest';
import { CHALLENGES } from '../../src/engine/challenges';
import { formatFeedback } from '../../src/ui/feedback';

describe('formatFeedback', () => {
  it('never leaks test input strings in control mode', () => {
    const c1 = CHALLENGES[0];
    if (c1 === undefined) throw new Error('Missing c1');

    const out = formatFeedback(
      {
        ok: false,
        passed: 5,
        total: 8,
        firstFailure: { input: '2026-1-29', expected: false },
      },
      'control',
      false,
    );

    expect(out.kind).toBe('failure');
    expect(out.summary).toBe('5 of 8 checks passed.');
    expect(out.detail).toBeUndefined();
    for (const tc of c1.tests) {
      expect(out.summary).not.toContain(tc.input);
    }
  });

  it('shows exactly one failing case with exact wording in counterexample mode', () => {
    const falseMatch = formatFeedback(
      {
        ok: false,
        passed: 7,
        total: 8,
        firstFailure: { input: '2026-1-29', expected: false },
      },
      'counterexample',
      false,
    );
    expect(falseMatch.detail).toBe('`2026-1-29` should NOT match, but your pattern matched it.');

    const missedMatch = formatFeedback(
      {
        ok: false,
        passed: 7,
        total: 8,
        firstFailure: { input: '1.2.3-beta.3', expected: true },
      },
      'counterexample',
      false,
    );
    expect(missedMatch.detail).toBe(
      '`1.2.3-beta.3` should match, but your pattern did not match it.',
    );
  });

  it('always hides counterexamples on transfer checkpoint C3', () => {
    const out = formatFeedback(
      {
        ok: false,
        passed: 6,
        total: 8,
        firstFailure: { input: '#GGGGGG', expected: false },
      },
      'counterexample',
      true,
    );

    expect(out.summary).toBe('6 of 8 checks passed.');
    expect(out.detail).toBeUndefined();
  });

  it('renders identical raw syntax/timeout error in both arms', () => {
    const ctrl = formatFeedback(
      { ok: false, syntaxError: 'Pattern too slow', timedOut: true, passed: 0, total: 8 },
      'control',
      false,
    );
    const cex = formatFeedback(
      { ok: false, syntaxError: 'Pattern too slow', timedOut: true, passed: 0, total: 8 },
      'counterexample',
      false,
    );
    expect(ctrl).toEqual(cex);
  });

  it('falls back to control and emits render error on unknown variant', () => {
    const onRenderError = vi.fn();
    const out = formatFeedback(
      {
        ok: false,
        passed: 5,
        total: 8,
        firstFailure: { input: '2026-1-29', expected: false },
      },
      'unexpected_value',
      false,
      onRenderError,
    );

    expect(onRenderError).toHaveBeenCalledTimes(1);
    expect(out.detail).toBeUndefined();
    expect(out.summary).toBe('5 of 8 checks passed.');
  });
});
