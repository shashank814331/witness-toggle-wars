import { describe, expect, it, vi } from 'vitest';
import { CHALLENGES } from '../../src/engine/challenges';
import { mountWitnessApp, type SessionClient } from '../../src/main';

interface StubHarness {
  readonly client: SessionClient;
  readonly startSession: ReturnType<typeof vi.fn>;
  readonly triggerFeedbackStyle: ReturnType<typeof vi.fn>;
  readonly recordGaveUp: ReturnType<typeof vi.fn>;
}

function createStubClient(arm: 'control' | 'counterexample' = 'counterexample'): StubHarness {
  let assigned: 'control' | 'counterexample' | null = null;
  const startSession = vi.fn().mockResolvedValue(undefined);
  const triggerFeedbackStyle = vi.fn(() => {
    assigned = arm;
    return arm;
  });
  const recordChallengeSolved = vi.fn();
  const recordGaveUp = vi.fn();
  const recordRenderError = vi.fn();
  const finishSession = vi.fn().mockResolvedValue(undefined);

  return {
    client: {
      startSession,
      triggerFeedbackStyle,
      recordChallengeSolved,
      recordGaveUp,
      recordRenderError,
      finishSession,
      getAssignedArm: () => assigned,
    },
    startSession,
    triggerFeedbackStyle,
    recordGaveUp,
  };
}

describe('Witness UI flow', () => {
  it('supports Practice Without Tracking with zero experiment triggers', () => {
    document.body.innerHTML = '<main id="app"></main>';
    const root = document.getElementById('app');
    if (root === null) throw new Error('Missing root');

    const { client, startSession } = createStubClient();
    mountWitnessApp(root, client);

    const practiceBtn = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Practice Without Tracking'),
    );
    expect(root.textContent).toContain('18+ only');
    expect(root.textContent).toContain('No personal data is collected');
    practiceBtn?.click();

    expect(startSession).toHaveBeenCalledWith(false);
    expect(root.querySelector('h1')?.textContent).toContain('Challenge 1');
  });

  it('unlocks Show solution only after 2 failed attempts and triggers arm on first failure', () => {
    document.body.innerHTML = '<main id="app"></main>';
    const root = document.getElementById('app');
    if (root === null) throw new Error('Missing root');

    const { client, triggerFeedbackStyle, recordGaveUp } = createStubClient('counterexample');
    mountWitnessApp(root, client);

    const startBtn = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Start Experiment'),
    );
    startBtn?.click();

    const input = root.querySelector<HTMLInputElement>('#pattern-input');
    const form = root.querySelector<HTMLFormElement>('form');
    const showSolBtn = Array.from(root.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Show solution'),
    );
    if (input === null || form === null || showSolBtn === undefined) {
      throw new Error('Missing form controls');
    }

    expect(showSolBtn.disabled).toBe(true);

    // Empty submit does not count as failure or trigger exposure
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(triggerFeedbackStyle).not.toHaveBeenCalled();
    expect(showSolBtn.disabled).toBe(true);

    // 1st real failure -> triggers arm, solution still disabled
    input.value = '^\\d{4}-\\d{1,2}-\\d{2}$';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(triggerFeedbackStyle).toHaveBeenCalledTimes(1);
    expect(showSolBtn.disabled).toBe(true);
    expect(root.textContent).toContain('`2026-1-29` should NOT match');

    // 2nd real failure -> unlocks Show solution
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(showSolBtn.disabled).toBe(false);

    // Clicking Show solution calls gave_up and advances cleanly
    showSolBtn.click();
    expect(recordGaveUp).toHaveBeenCalledTimes(1);
    const c1 = CHALLENGES[0];
    if (c1 === undefined) throw new Error('Missing c1');
    expect(root.textContent).toContain(c1.referenceSolution);
  });
});
