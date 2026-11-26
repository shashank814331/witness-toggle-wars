import { renderConsentView } from './consent';
import { CHALLENGES, type ChallengeId } from './engine/challenges';
import { renderChallengeView, type ChallengeOutcome } from './ui/challengeView';
import type { FeedbackVariant } from './ui/feedback';
import { renderFinishView } from './ui/finish';

export interface SessionClient {
  startSession(consented: boolean): Promise<void>;
  triggerFeedbackStyle(): FeedbackVariant;
  recordChallengeSolved(id: ChallengeId): void;
  recordGaveUp(): void;
  recordRenderError(): void;
  finishSession(): Promise<void>;
  getAssignedArm(): FeedbackVariant | null;
}

const DEFAULT_LOCAL_CLIENT: SessionClient = {
  startSession: () => Promise.resolve(),
  triggerFeedbackStyle: () => 'control',
  recordChallengeSolved: () => undefined,
  recordGaveUp: () => undefined,
  recordRenderError: () => undefined,
  finishSession: () => Promise.resolve(),
  getAssignedArm: () => null,
};

/**
 * Mounts the Witness application into the provided root element.
 */
export function mountWitnessApp(
  root: HTMLElement,
  client: SessionClient = DEFAULT_LOCAL_CLIENT,
  statusEl?: HTMLElement | null,
): void {
  const outcomes: Record<ChallengeId, ChallengeOutcome> = {
    c1: 'gave_up',
    c2: 'gave_up',
    c3: 'gave_up',
  };
  let consented = false;
  let challengeIdx = 0;

  const showChallenge = (): void => {
    const spec = CHALLENGES[challengeIdx];
    if (spec === undefined) {
      void client.finishSession();
      renderFinishView(root, {
        outcomes,
        consented,
        triggeredArm: client.getAssignedArm(),
      });
      return;
    }

    renderChallengeView(root, spec, {
      totalChallenges: CHALLENGES.length,
      onCoreFailureTrigger: () => client.triggerFeedbackStyle(),
      onSolved: (id) => {
        outcomes[id] = 'solved';
        client.recordChallengeSolved(id);
      },
      onGaveUp: (id) => {
        outcomes[id] = 'gave_up';
        client.recordGaveUp();
      },
      onRenderError: () => {
        client.recordRenderError();
      },
      onAdvance: () => {
        challengeIdx += 1;
        showChallenge();
      },
    });
  };

  renderConsentView(root, {
    onDecision: (accepted) => {
      consented = accepted;
      if (accepted && statusEl !== undefined && statusEl !== null) {
        statusEl.hidden = false;
        statusEl.textContent = 'Connecting…';
      }
      void client.startSession(accepted).finally(() => {
        if (statusEl !== undefined && statusEl !== null) {
          statusEl.hidden = true;
        }
      });
      showChallenge();
    },
  });
}

if (typeof document !== 'undefined') {
  const appRoot = document.getElementById('app');
  if (appRoot !== null) {
    mountWitnessApp(appRoot, DEFAULT_LOCAL_CLIENT, document.getElementById('connection-status'));
  }
}
