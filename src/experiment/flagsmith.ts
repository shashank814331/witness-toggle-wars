import {
  createFlagsmithInstance,
  FlagSource,
  type IFlagsmith,
  type IInitConfig,
} from '@flagsmith/flagsmith';
import type { ChallengeId } from '../engine/challenges';
import type { SessionClient } from '../main';
import type { FeedbackVariant } from '../ui/feedback';
import { EventRecorder } from './events';
import { getOrCreateIdentity } from './identity';

export const FEEDBACK_FLAG_NAME = 'feedback_style';
export const AA_CANARY_FLAG_NAME = 'aa_canary';

export interface DebugSnapshot {
  readonly env: 'development' | 'production';
  readonly source: FlagSource;
  readonly consented: boolean;
  readonly variant: FeedbackVariant | 'untriggered';
  readonly inExperiment: boolean;
  readonly queuedEvents: number;
}

export interface WitnessClientOptions {
  readonly envKey: string;
  readonly appEnv: 'development' | 'production';
  readonly apiUrl?: string;
  readonly eventsApiUrl?: string;
  readonly storage?: Storage;
  readonly createSdk?: () => IFlagsmith;
  readonly onDebugUpdate?: (snapshot: DebugSnapshot) => void;
}

const DEFAULT_WITNESS_FLAGS: NonNullable<IInitConfig['defaultFlags']> = {
  feedback_style: { enabled: true, value: 'control' },
  aa_canary: { enabled: true, value: 'control' },
};

type KeepaliveFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function buildKeepaliveFetch(): KeepaliveFetch | undefined {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return undefined;
  }
  const nativeFetch = window.fetch.bind(window);
  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = init?.method?.toUpperCase() ?? 'GET';
    const nextInit: RequestInit =
      method === 'POST' ? { ...(init ?? {}), keepalive: true } : (init ?? {});
    return nativeFetch(input, nextInit);
  };
}

/**
 * Coordinates Flagsmith initialization, consent isolation, triggered exposure, and event flushing.
 */
export class WitnessExperimentClient implements SessionClient {
  private readonly options: WitnessClientOptions;
  private sdk: IFlagsmith | null = null;
  private recorder: EventRecorder | null = null;
  private consented = false;
  private identifySettled = false;
  private serverReady = false;
  private cachedVariant: FeedbackVariant | null = null;
  private inExperiment = false;
  private lifecycleBound = false;

  constructor(options: WitnessClientOptions) {
    this.options = options;
  }

  public async startSession(consented: boolean): Promise<void> {
    this.consented = consented;
    if (!consented) {
      this.identifySettled = true;
      this.serverReady = false;
      this.emitDebug();
      return;
    }

    const vid = getOrCreateIdentity(this.options.storage);
    const sdk = (this.options.createSdk ?? createFlagsmithInstance)();
    this.sdk = sdk;
    this.recorder = new EventRecorder(sdk, vid, this.options.storage);
    this.bindFlushLifecycle();

    if (this.options.envKey.trim().length === 0) {
      this.identifySettled = true;
      this.serverReady = false;
      this.emitDebug();
      return;
    }

    try {
      await sdk.init(this.buildInitConfig());
      await sdk.identify(vid);
      this.serverReady = sdk.loadingState?.source === FlagSource.SERVER;
      if (this.serverReady) {
        sdk.getExperimentFlag(AA_CANARY_FLAG_NAME);
      }
    } catch {
      // Offline/network errors must never block play; fallback stays control without exposure.
      this.serverReady = false;
    } finally {
      this.identifySettled = true;
    }
    this.emitDebug();
  }

  public triggerFeedbackStyle(): FeedbackVariant {
    if (!this.consented) {
      return 'control';
    }
    if (this.cachedVariant !== null) {
      return this.cachedVariant;
    }
    if (this.sdk === null || !this.identifySettled) {
      // Do not permanently cache control if identify() is still in-flight; stay non-blocking.
      this.emitDebug();
      return 'control';
    }
    if (!this.serverReady) {
      this.cachedVariant = 'control';
      this.emitDebug();
      return 'control';
    }

    const flag = this.sdk.getExperimentFlag(FEEDBACK_FLAG_NAME);
    this.inExperiment = Boolean(flag?.experiment?.inExperiment);

    const resolved = this.resolveFlagValue(flag?.enabled === true ? flag.value : null);
    this.cachedVariant = resolved;
    this.emitDebug();
    return resolved;
  }

  public recordChallengeSolved(id: ChallengeId): void {
    if (!this.consented || this.recorder === null) {
      return;
    }
    this.recorder.recordSolved(id);
    this.emitDebug();
  }

  public recordGaveUp(): void {
    if (!this.consented || this.recorder === null) {
      return;
    }
    this.recorder.recordGaveUp();
    this.emitDebug();
  }

  public recordRenderError(): void {
    if (!this.consented || this.recorder === null) {
      return;
    }
    this.recorder.recordRenderError();
    this.emitDebug();
  }

  public async finishSession(): Promise<void> {
    if (!this.consented || this.sdk === null || !this.serverReady) {
      return;
    }
    try {
      await this.sdk.flushEvents();
    } catch {
      // Ignore flush failures on completion
    }
    this.emitDebug();
  }

  public getAssignedArm(): FeedbackVariant | null {
    return this.cachedVariant;
  }

  private buildInitConfig(): IInitConfig {
    const keepaliveFetch = buildKeepaliveFetch();
    const config: IInitConfig = {
      environmentID: this.options.envKey.trim(),
      enableEvents: true,
      cacheFlags: false,
      preventFetch: true,
      defaultFlags: DEFAULT_WITNESS_FLAGS,
      ...(keepaliveFetch !== undefined ? { fetch: keepaliveFetch } : {}),
      onError: () => undefined,
    };
    if (this.options.apiUrl !== undefined && this.options.apiUrl.length > 0) {
      config.api = this.options.apiUrl;
    }
    if (this.options.eventsApiUrl !== undefined && this.options.eventsApiUrl.length > 0) {
      config.eventProcessorConfig = { eventsApiUrl: this.options.eventsApiUrl };
    }
    return config;
  }

  private resolveFlagValue(value: unknown): FeedbackVariant {
    if (value === 'counterexample') {
      return 'counterexample';
    }
    if (value === 'control' || value === null || value === undefined) {
      return 'control';
    }
    this.recordRenderError();
    return 'control';
  }

  private bindFlushLifecycle(): void {
    if (this.lifecycleBound || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    this.lifecycleBound = true;
    window.addEventListener('pagehide', () => {
      void this.sdk?.flushEvents();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        void this.sdk?.flushEvents();
      }
    });
  }

  private emitDebug(): void {
    this.options.onDebugUpdate?.({
      env: this.options.appEnv,
      source: this.sdk?.loadingState?.source ?? FlagSource.NONE,
      consented: this.consented,
      variant: this.cachedVariant ?? 'untriggered',
      inExperiment: this.inExperiment,
      queuedEvents: this.recorder?.dispatchedCount ?? 0,
    });
  }
}
