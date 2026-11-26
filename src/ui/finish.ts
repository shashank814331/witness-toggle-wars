import type { ChallengeId } from '../engine/challenges';
import type { ChallengeOutcome } from './challengeView';

export const PREREGISTRATION_URL =
  'https://github.com/shashank814331/witness-toggle-wars/blob/main/PREREGISTRATION.md';

export interface FinishSummary {
  readonly outcomes: Record<ChallengeId, ChallengeOutcome>;
  readonly consented: boolean;
  readonly triggeredArm: 'control' | 'counterexample' | null;
}

const CHALLENGE_LABELS: Record<ChallengeId, string> = {
  c1: 'Challenge 1: ISO Date (YYYY-MM-DD)',
  c2: 'Challenge 2: Semantic Version',
  c3: 'Challenge 3 (Checkpoint): Hex Colour',
};

/**
 * Renders the final summary screen disclosing the participant's outcomes, arm assignment, and pre-registration link.
 */
export function renderFinishView(root: HTMLElement, summary: FinishSummary): void {
  const section = document.createElement('section');
  section.className = 'card';

  const heading = document.createElement('h1');
  heading.textContent = 'Session complete';

  const armLine = document.createElement('p');
  armLine.textContent = formatArmDisclosure(summary);

  const list = document.createElement('ul');
  list.className = 'summary-list';
  for (const id of ['c1', 'c2', 'c3'] as const) {
    const li = document.createElement('li');
    const statusText = summary.outcomes[id] === 'solved' ? 'Solved' : 'Revealed solution';
    li.textContent = `${CHALLENGE_LABELS[id]} — ${statusText}`;
    list.appendChild(li);
  }

  const linkPara = document.createElement('p');
  const link = document.createElement('a');
  link.href = PREREGISTRATION_URL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'View public pre-registration (PREREGISTRATION.md)';
  linkPara.appendChild(link);

  section.append(heading, armLine, list, linkPara);
  root.replaceChildren(section);
}

function formatArmDisclosure(summary: FinishSummary): string {
  if (!summary.consented) {
    return 'Mode: Practice Without Tracking (local count-only feedback, zero events recorded).';
  }
  if (summary.triggeredArm === null) {
    return 'Experiment arm: Not triggered (you solved Core Challenges 1 and 2 without a failed attempt).';
  }
  return `Experiment arm assigned on first failure: ${summary.triggeredArm}.`;
}
