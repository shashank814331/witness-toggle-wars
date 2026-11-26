import type { ChallengeId, ChallengeSpec } from '../engine/challenges';
import { evaluate, type EvaluationResult } from '../engine/evaluate';
import { formatFeedback, renderFeedbackElement, type FeedbackVariant } from './feedback';

export type ChallengeOutcome = 'solved' | 'gave_up';

export type ChallengeMachineState =
  'idle' | 'editing' | 'submitted' | 'feedback_shown' | 'solved' | 'gave_up';

export interface ChallengeViewCallbacks {
  readonly totalChallenges: number;
  readonly onCoreFailureTrigger: () => FeedbackVariant;
  readonly onSolved: (challengeId: ChallengeId) => void;
  readonly onGaveUp: (challengeId: ChallengeId) => void;
  readonly onRenderError: () => void;
  readonly onAdvance: (outcome: ChallengeOutcome) => void;
}

interface ViewElements {
  readonly form: HTMLFormElement;
  readonly input: HTMLInputElement;
  readonly submitBtn: HTMLButtonElement;
  readonly showSolutionBtn: HTMLButtonElement;
  readonly feedbackBox: HTMLDivElement;
  readonly solutionBox: HTMLDivElement;
}

/**
 * Renders an interactive challenge view and manages its attempt/feedback/solution state machine.
 */
export function renderChallengeView(
  root: HTMLElement,
  challenge: ChallengeSpec,
  callbacks: ChallengeViewCallbacks,
): void {
  let state: ChallengeMachineState = 'idle';
  let failureCount = 0;

  const section = document.createElement('section');
  section.className = 'card';
  section.dataset.state = state;

  const progress = document.createElement('p');
  progress.className = 'progress-label';
  progress.textContent = `Challenge ${String(challenge.index)} of ${String(callbacks.totalChallenges)}`;

  const heading = document.createElement('h1');
  heading.textContent = challenge.title;

  const prompt = document.createElement('p');
  prompt.textContent = challenge.prompt;

  const table = buildTestTable(challenge);
  const elements = buildFormElements(challenge);

  const updateState = (next: ChallengeMachineState): void => {
    state = next;
    section.dataset.state = state;
  };

  elements.input.addEventListener('input', () => {
    if (state === 'idle' || state === 'feedback_shown') {
      updateState('editing');
    }
  });

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (state === 'solved' || state === 'gave_up') {
      return;
    }
    updateState('submitted');
    const result = evaluate(elements.input.value, challenge.tests);
    handleSubmission(result);
  });

  elements.showSolutionBtn.addEventListener('click', () => {
    if (failureCount < 2 || state === 'solved' || state === 'gave_up') {
      return;
    }
    updateState('gave_up');
    callbacks.onGaveUp(challenge.id);
    showSolutionPanel(elements, challenge, () => {
      callbacks.onAdvance('gave_up');
    });
  });

  function handleSubmission(result: EvaluationResult): void {
    const isInputReject =
      elements.input.value.length === 0 ||
      result.syntaxError !== undefined ||
      result.timedOut === true;

    if (result.ok) {
      updateState('solved');
      const formatted = formatFeedback(result, 'control', challenge.isTransferCheckpoint);
      renderFeedbackElement(elements.feedbackBox, formatted);
      callbacks.onSolved(challenge.id);
      lockForNext(elements, 'Continue', () => {
        callbacks.onAdvance('solved');
      });
      return;
    }

    if (!isInputReject) {
      failureCount += 1;
      if (failureCount >= 2) {
        elements.showSolutionBtn.disabled = false;
      }
    }

    const variant: FeedbackVariant =
      !isInputReject && !challenge.isTransferCheckpoint
        ? callbacks.onCoreFailureTrigger()
        : 'control';

    const formatted = formatFeedback(
      result,
      variant,
      challenge.isTransferCheckpoint,
      callbacks.onRenderError,
    );
    renderFeedbackElement(elements.feedbackBox, formatted);
    updateState('feedback_shown');
  }

  section.append(
    progress,
    heading,
    prompt,
    table,
    elements.form,
    elements.feedbackBox,
    elements.solutionBox,
  );
  root.replaceChildren(section);
  elements.input.focus();
}

function buildTestTable(challenge: ChallengeSpec): HTMLTableElement {
  const table = document.createElement('table');
  table.className = 'test-table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  const thInput = document.createElement('th');
  thInput.scope = 'col';
  thInput.textContent = 'Test input';
  const thExpected = document.createElement('th');
  thExpected.scope = 'col';
  thExpected.textContent = 'Should match';
  headRow.append(thInput, thExpected);
  thead.appendChild(headRow);

  const tbody = document.createElement('tbody');
  for (const tc of challenge.tests) {
    const row = document.createElement('tr');
    const tdInput = document.createElement('td');
    tdInput.className = 'mono';
    tdInput.textContent = tc.input;
    const tdExpected = document.createElement('td');
    tdExpected.textContent = tc.expected ? 'Yes' : 'No';
    row.append(tdInput, tdExpected);
    tbody.appendChild(row);
  }

  table.append(thead, tbody);
  return table;
}

function buildFormElements(challenge: ChallengeSpec): ViewElements {
  const form = document.createElement('form');
  form.noValidate = true;

  const group = document.createElement('div');
  group.className = 'input-group';

  const label = document.createElement('label');
  label.className = 'input-label';
  label.htmlFor = 'pattern-input';
  label.textContent = 'Regular expression pattern';

  const input = document.createElement('input');
  input.id = 'pattern-input';
  input.name = 'pattern';
  input.type = 'text';
  input.className = 'pattern-input';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.maxLength = 500;
  input.setAttribute('aria-describedby', 'pattern-help');

  const help = document.createElement('p');
  help.id = 'pattern-help';
  help.className = 'help-text';
  help.textContent = challenge.helpText;

  group.append(label, input, help);

  const buttonRow = document.createElement('div');
  buttonRow.className = 'button-row';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.className = 'btn-primary';
  submitBtn.textContent = 'Check pattern';

  const showSolutionBtn = document.createElement('button');
  showSolutionBtn.type = 'button';
  showSolutionBtn.className = 'btn-secondary';
  showSolutionBtn.textContent = 'Show solution';
  showSolutionBtn.disabled = true;

  buttonRow.append(submitBtn, showSolutionBtn);
  form.append(group, buttonRow);

  const feedbackBox = document.createElement('div');
  feedbackBox.className = 'feedback-box';
  feedbackBox.setAttribute('role', 'status');
  feedbackBox.setAttribute('aria-live', 'polite');
  feedbackBox.hidden = true;

  const solutionBox = document.createElement('div');
  solutionBox.className = 'solution-box';
  solutionBox.hidden = true;

  return { form, input, submitBtn, showSolutionBtn, feedbackBox, solutionBox };
}

function lockForNext(elements: ViewElements, label: string, onNext: () => void): void {
  elements.input.readOnly = true;
  elements.submitBtn.disabled = true;
  elements.showSolutionBtn.disabled = true;

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'btn-primary';
  nextBtn.textContent = label;
  nextBtn.addEventListener('click', onNext);

  elements.solutionBox.replaceChildren(nextBtn);
  elements.solutionBox.hidden = false;
  nextBtn.focus();
}

function showSolutionPanel(
  elements: ViewElements,
  challenge: ChallengeSpec,
  onContinue: () => void,
): void {
  elements.input.readOnly = true;
  elements.submitBtn.disabled = true;
  elements.showSolutionBtn.disabled = true;

  const title = document.createElement('p');
  title.className = 'feedback-summary';
  title.textContent = 'Reference solution (challenge marked unsolved):';

  const code = document.createElement('p');
  code.className = 'mono';
  code.textContent = challenge.referenceSolution;

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'btn-primary';
  nextBtn.textContent = 'Next challenge';
  nextBtn.addEventListener('click', onContinue);

  elements.solutionBox.replaceChildren(title, code, nextBtn);
  elements.solutionBox.hidden = false;
  nextBtn.focus();
}
