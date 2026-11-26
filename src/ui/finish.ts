import type { ChallengeId } from '../engine/challenges';
import type { ChallengeOutcome } from './challengeView';

export const PREREGISTRATION_URL =
  'https://github.com/shashank814331/witness-toggle-wars/blob/main/PREREGISTRATION.md';

export interface CounterfactualSample {
  readonly countSummary: string;
  readonly counterexampleDetail: string;
}

export interface FinishSummary {
  readonly outcomes: Record<ChallengeId, ChallengeOutcome>;
  readonly attempts?: Record<ChallengeId, number>;
  readonly consented: boolean;
  readonly triggeredArm: 'control' | 'counterexample' | null;
  readonly firstFailureSample?: CounterfactualSample | null;
}

const CHALLENGE_LABELS: Record<ChallengeId, string> = {
  c1: 'Challenge 1: ISO Date (YYYY-MM-DD)',
  c2: 'Challenge 2: Semantic Version',
  c3: 'Challenge 3 (Checkpoint): Hex Colour',
};

/**
 * Renders the final summary screen disclosing outcomes, attempt counts,
 * arm assignment, post-session counterfactual comparison, and pre-registration link.
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
    const count = summary.attempts?.[id];
    const attemptLabel =
      count !== undefined ? ` (${String(count)} ${count === 1 ? 'attempt' : 'attempts'})` : '';
    li.textContent = `${CHALLENGE_LABELS[id]} — ${statusText}${attemptLabel}`;
    list.appendChild(li);
  }

  section.append(heading, armLine, list);

  if (summary.triggeredArm !== null && summary.firstFailureSample != null) {
    section.appendChild(buildCounterfactualCard(summary.triggeredArm, summary.firstFailureSample));
  }

  const linkPara = document.createElement('p');
  const link = document.createElement('a');
  link.href = PREREGISTRATION_URL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'View public pre-registration (PREREGISTRATION.md)';
  linkPara.appendChild(link);

  section.appendChild(linkPara);
  root.replaceChildren(section);
}

function buildCounterfactualCard(
  assignedArm: 'control' | 'counterexample',
  sample: CounterfactualSample,
): HTMLElement {
  const box = document.createElement('div');
  box.className = 'counterfactual-box';

  const title = document.createElement('h2');
  title.textContent = 'Behind the experiment (what both arms saw)';

  const grid = document.createElement('div');
  grid.className = 'counterfactual-grid';

  grid.append(
    buildArmPreview(
      `Control arm${assignedArm === 'control' ? ' (your arm)' : ''}`,
      sample.countSummary,
      undefined,
    ),
    buildArmPreview(
      `Counterexample arm${assignedArm === 'counterexample' ? ' (your arm)' : ''}`,
      sample.countSummary,
      sample.counterexampleDetail,
    ),
  );

  box.append(title, grid);
  return box;
}

function buildArmPreview(label: string, summary: string, detail?: string): HTMLElement {
  const card = document.createElement('div');
  card.className = 'counterfactual-arm';

  const heading = document.createElement('p');
  heading.className = 'feedback-summary';
  heading.textContent = label;

  const line = document.createElement('p');
  line.className = 'muted-text';
  line.textContent = summary;

  card.append(heading, line);
  if (detail !== undefined) {
    const extra = document.createElement('p');
    extra.className = 'feedback-detail';
    extra.textContent = detail;
    card.appendChild(extra);
  }
  return card;
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
