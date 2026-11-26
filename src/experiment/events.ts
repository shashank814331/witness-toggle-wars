import type { IFlagsmith } from '@flagsmith/flagsmith';
import { hasFiredEvent, markCoreChallengeSolved, markEventFired } from './identity';

export const WITNESS_EVENTS = {
  CHALLENGE1_SOLVED: 'challenge1_solved',
  CORE_SET_COMPLETED: 'core_set_completed',
  TRANSFER_SOLVED: 'transfer_solved',
  GAVE_UP: 'gave_up',
  FEEDBACK_RENDER_ERROR: 'feedback_render_error',
} as const;

export type WitnessEventName = (typeof WITNESS_EVENTS)[keyof typeof WITNESS_EVENTS];

/**
 * Dispatches case-sensitive experiment events with once-per-identity guards on occurrence metrics.
 */
export class EventRecorder {
  private readonly client: IFlagsmith;
  private readonly vid: string;
  private readonly storage: Storage | undefined;
  private sentCount = 0;

  constructor(client: IFlagsmith, vid: string, storage?: Storage) {
    this.client = client;
    this.vid = vid;
    this.storage = storage;
  }

  public get dispatchedCount(): number {
    return this.sentCount;
  }

  public recordSolved(challengeId: 'c1' | 'c2' | 'c3'): void {
    if (challengeId === 'c1') {
      this.emitOnce(WITNESS_EVENTS.CHALLENGE1_SOLVED);
      const core = markCoreChallengeSolved(this.vid, 'c1', this.storage);
      if (core.c1 && core.c2) {
        this.emitOnce(WITNESS_EVENTS.CORE_SET_COMPLETED);
      }
      return;
    }
    if (challengeId === 'c2') {
      const core = markCoreChallengeSolved(this.vid, 'c2', this.storage);
      if (core.c1 && core.c2) {
        this.emitOnce(WITNESS_EVENTS.CORE_SET_COMPLETED);
      }
      return;
    }
    this.emitOnce(WITNESS_EVENTS.TRANSFER_SOLVED);
  }

  public recordGaveUp(): void {
    this.emitOnce(WITNESS_EVENTS.GAVE_UP);
  }

  public recordRenderError(): void {
    this.client.trackEvent(WITNESS_EVENTS.FEEDBACK_RENDER_ERROR);
    this.sentCount += 1;
  }

  private emitOnce(eventName: WitnessEventName): void {
    if (hasFiredEvent(this.vid, eventName, this.storage)) {
      return;
    }
    markEventFired(this.vid, eventName, this.storage);
    this.client.trackEvent(eventName);
    this.sentCount += 1;
  }
}
