export type ChallengeId = 'c1' | 'c2' | 'c3';

export interface ChallengeTestCase {
  readonly input: string;
  readonly expected: boolean;
}

export interface ChallengeSpec {
  readonly id: ChallengeId;
  readonly index: number;
  readonly title: string;
  readonly prompt: string;
  readonly helpText: string;
  readonly isTransferCheckpoint: boolean;
  readonly tests: readonly ChallengeTestCase[];
  readonly referenceSolution: string;
}

/**
 * Fixed ordered regex challenges for Witness (two core challenges plus one transfer checkpoint).
 */
export const CHALLENGES: readonly ChallengeSpec[] = [
  {
    id: 'c1',
    index: 1,
    title: 'Challenge 1: ISO Date (YYYY-MM-DD)',
    prompt: 'Write a regular expression that matches exact four-digit-year ISO dates (YYYY-MM-DD).',
    helpText: 'Evaluated via new RegExp(pattern).test(input) with no flags.',
    isTransferCheckpoint: false,
    tests: [
      { input: '2026-11-29', expected: true },
      { input: '1999-01-01', expected: true },
      { input: '2000-12-31', expected: true },
      { input: '2026-02-28', expected: true },
      { input: '2010-10-10', expected: true },
      { input: '2026-1-29', expected: false },
      { input: '20261129', expected: false },
      { input: 'x2026-11-29y', expected: false },
    ],
    referenceSolution: '^\\d{4}-\\d{2}-\\d{2}$',
  },
  {
    id: 'c2',
    index: 2,
    title: 'Challenge 2: Semantic Version',
    prompt:
      'Write a regular expression that matches semantic version strings (MAJOR.MINOR.PATCH with optional prerelease tag).',
    helpText: 'Evaluated via new RegExp(pattern).test(input) with no flags.',
    isTransferCheckpoint: false,
    tests: [
      { input: '2.0.0', expected: true },
      { input: '12.4.0', expected: true },
      { input: '0.1.0', expected: true },
      { input: '1.2.3-beta.3', expected: true },
      { input: '10.20.30', expected: true },
      { input: '1.2', expected: false },
      { input: 'v1.2.3', expected: false },
      { input: '1.2.3.4', expected: false },
    ],
    referenceSolution: '^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$',
  },
  {
    id: 'c3',
    index: 3,
    title: 'Challenge 3 (Checkpoint): Hex Colour',
    prompt:
      'Write a regular expression that matches 3-digit or 6-digit CSS hex colour strings starting with #.',
    helpText:
      'Checkpoint task: feedback shows pass counts only for all participants. Evaluated via new RegExp(pattern).test(input).',
    isTransferCheckpoint: true,
    tests: [
      { input: '#fff', expected: true },
      { input: '#A1B2C3', expected: true },
      { input: '#000000', expected: true },
      { input: '#abc', expected: true },
      { input: '#ff', expected: false },
      { input: '#GGGGGG', expected: false },
      { input: 'fff', expected: false },
      { input: '#abcd', expected: false },
    ],
    referenceSolution: '^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$',
  },
];
