import type { ChallengeTestCase } from './challenges';

export const MAX_PATTERN_LENGTH = 200;
export const MAX_TEST_DURATION_MS = 50;

export interface FailingCase {
  readonly input: string;
  readonly expected: boolean;
}

export interface EvaluationResult {
  readonly ok: boolean;
  readonly syntaxError?: string;
  readonly timedOut?: boolean;
  readonly passed: number;
  readonly total: number;
  readonly firstFailure?: FailingCase;
}

export interface EvaluateOptions {
  readonly now?: () => number;
  readonly maxDurationMs?: number;
}

/**
 * Evaluates a user regex pattern against an ordered list of test cases.
 * Enforces max pattern length (200) and per-test execution timeout (50 ms).
 */
export function evaluate(
  pattern: string,
  tests: readonly ChallengeTestCase[],
  options: EvaluateOptions = {},
): EvaluationResult {
  const total = tests.length;
  const validationError = validatePatternInput(pattern);
  if (validationError !== null) {
    return { ok: false, syntaxError: validationError, passed: 0, total };
  }

  const compiled = compileRegex(pattern);
  if (typeof compiled === 'string') {
    return { ok: false, syntaxError: compiled, passed: 0, total };
  }

  return runTests(compiled, tests, options);
}

function validatePatternInput(pattern: string): string | null {
  if (pattern.length === 0) {
    return 'Please enter a regular expression pattern.';
  }
  if (pattern.length > MAX_PATTERN_LENGTH) {
    return `Pattern exceeds maximum length of ${String(MAX_PATTERN_LENGTH)} characters.`;
  }
  return null;
}

function compileRegex(pattern: string): RegExp | string {
  try {
    return new RegExp(pattern);
  } catch (err: unknown) {
    return err instanceof Error ? err.message : String(err);
  }
}

function runTests(
  compiled: RegExp,
  tests: readonly ChallengeTestCase[],
  options: EvaluateOptions,
): EvaluationResult {
  const now = options.now ?? ((): number => performance.now());
  const limitMs = options.maxDurationMs ?? MAX_TEST_DURATION_MS;
  let passed = 0;
  let firstFailure: FailingCase | undefined;

  for (const tc of tests) {
    const start = now();
    const matched = compiled.test(tc.input);
    const elapsed = now() - start;

    if (elapsed > limitMs) {
      return {
        ok: false,
        timedOut: true,
        syntaxError: 'Pattern too slow',
        passed: 0,
        total: tests.length,
      };
    }

    if (matched === tc.expected) {
      passed += 1;
    } else if (firstFailure === undefined) {
      firstFailure = { input: tc.input, expected: tc.expected };
    }
  }

  if (firstFailure !== undefined) {
    return { ok: false, passed, total: tests.length, firstFailure };
  }
  return { ok: passed === tests.length, passed, total: tests.length };
}
