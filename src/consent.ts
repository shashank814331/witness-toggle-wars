export interface ConsentOptions {
  readonly onDecision: (consented: boolean) => void;
}

const COLLECTED_ITEMS: readonly string[] = [
  'An anonymous random session identifier (wit_<uuid>) stored in localStorage — no name, email, or personal data.',
  'Experiment exposure events ($flag_exposure) when flags are evaluated.',
  'Five anonymous task events: challenge1_solved, core_set_completed, transfer_solved, gave_up, and feedback_render_error.',
];

/**
 * Renders the initial consent screen with an anonymous experiment start option and a tracking-free practice mode.
 */
export function renderConsentView(root: HTMLElement, options: ConsentOptions): void {
  const section = document.createElement('section');
  section.className = 'card';
  section.setAttribute('aria-labelledby', 'consent-heading');

  const heading = document.createElement('h1');
  heading.id = 'consent-heading';
  heading.textContent = 'Help test autograder feedback (5 minutes)';

  const intro = document.createElement('p');
  intro.textContent =
    'You will solve three short regular-expression debugging challenges. This site runs a controlled Flagsmith experiment to study which style of feedback helps developers most. Eligibility: 18+ only. No personal data is collected.';

  const dataLead = document.createElement('p');
  dataLead.className = 'muted-text';
  dataLead.textContent =
    'If you choose Start Experiment, only the following anonymous data is sent:';

  const list = document.createElement('ul');
  list.className = 'consent-list';
  for (const item of COLLECTED_ITEMS) {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  }

  const declineNote = document.createElement('p');
  declineNote.className = 'muted-text';
  declineNote.textContent =
    'If you choose Practice Without Tracking, no ID is stored and zero Flagsmith requests are sent.';

  const actions = document.createElement('div');
  actions.className = 'button-row';

  const startBtn = createActionButton('Start Experiment', 'btn-primary', () => {
    options.onDecision(true);
  });
  const practiceBtn = createActionButton('Practice Without Tracking', 'btn-secondary', () => {
    options.onDecision(false);
  });

  actions.append(startBtn, practiceBtn);
  section.append(heading, intro, dataLead, list, declineNote, actions);
  root.replaceChildren(section);
}

function createActionButton(
  label: string,
  className: string,
  onClick: () => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}
