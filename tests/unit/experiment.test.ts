import { FlagSource, type IFlagsmith } from '@flagsmith/flagsmith';
import { describe, expect, it, vi } from 'vitest';
import { WitnessExperimentClient } from '../../src/experiment/flagsmith';
import { getOrCreateIdentity, IDENTITY_STORAGE_KEY } from '../../src/experiment/identity';

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    get length(): number {
      return store.size;
    },
    clear: (): void => {
      store.clear();
    },
    getItem: (key: string): string | null => store.get(key) ?? null,
    key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string): void => {
      store.delete(key);
    },
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
  };
}

interface MockSdkHarness {
  readonly sdk: IFlagsmith;
  readonly init: ReturnType<typeof vi.fn>;
  readonly identify: ReturnType<typeof vi.fn>;
  readonly getExperimentFlag: ReturnType<typeof vi.fn>;
  readonly trackEvent: ReturnType<typeof vi.fn>;
  readonly flushEvents: ReturnType<typeof vi.fn>;
}

function createMockSdk(options: {
  source?: FlagSource;
  feedbackValue?: unknown;
  inExperiment?: boolean;
  failIdentify?: boolean;
}): MockSdkHarness {
  const init = vi.fn().mockResolvedValue(undefined);
  const identify = options.failIdentify
    ? vi.fn().mockRejectedValue(new Error('network down'))
    : vi.fn().mockResolvedValue(undefined);
  const getExperimentFlag = vi.fn((featureName: string) => {
    if (featureName === 'aa_canary') {
      return {
        enabled: true,
        value: 'control',
        experiment: { id: 1, name: 'aa', inExperiment: true },
      };
    }
    return {
      enabled: true,
      value: (options.feedbackValue ?? 'control') as string,
      experiment: { id: 2, name: 'exp', inExperiment: options.inExperiment ?? true },
    };
  });
  const trackEvent = vi.fn();
  const flushEvents = vi.fn().mockResolvedValue(undefined);

  const sdk = {
    init,
    identify,
    getExperimentFlag,
    trackEvent,
    flushEvents,
    loadingState: {
      error: null,
      isFetching: false,
      isLoading: false,
      source: options.source ?? FlagSource.SERVER,
    },
  } as unknown as IFlagsmith;

  return { sdk, init, identify, getExperimentFlag, trackEvent, flushEvents };
}

describe('identity and experiment orchestration', () => {
  it('generates wit_ UUID when missing and preserves simulator prefixes', () => {
    const emptyStorage = createMemoryStorage();
    const generated = getOrCreateIdentity(emptyStorage);
    expect(generated.startsWith('wit_')).toBe(true);
    expect(getOrCreateIdentity(emptyStorage)).toBe(generated);

    const simStorage = createMemoryStorage({ [IDENTITY_STORAGE_KEY]: 'sim-s0-1-007' });
    expect(getOrCreateIdentity(simStorage)).toBe('sim-s0-1-007');
  });

  it('makes zero Flagsmith SDK calls when consent is declined', async () => {
    const storage = createMemoryStorage();
    const mock = createMockSdk({});
    const client = new WitnessExperimentClient({
      envKey: 'ser.dev_test_key',
      appEnv: 'development',
      storage,
      createSdk: (): IFlagsmith => mock.sdk,
    });

    await client.startSession(false);
    expect(mock.init).not.toHaveBeenCalled();
    expect(mock.identify).not.toHaveBeenCalled();
    expect(mock.getExperimentFlag).not.toHaveBeenCalled();
    expect(client.triggerFeedbackStyle()).toBe('control');
    client.recordChallengeSolved('c1');
    client.recordGaveUp();
    await client.finishSession();
    expect(mock.trackEvent).not.toHaveBeenCalled();
    expect(mock.flushEvents).not.toHaveBeenCalled();
  });

  it('triggers feedback_style only on first failure, caches variant, and evaluates aa_canary after consent', async () => {
    const storage = createMemoryStorage();
    const mock = createMockSdk({ feedbackValue: 'counterexample', inExperiment: true });
    const client = new WitnessExperimentClient({
      envKey: 'ser.dev_test_key',
      appEnv: 'development',
      storage,
      createSdk: (): IFlagsmith => mock.sdk,
    });

    await client.startSession(true);
    expect(mock.init).toHaveBeenCalledWith(
      expect.objectContaining({
        environmentID: 'ser.dev_test_key',
        enableEvents: true,
        cacheFlags: false,
        preventFetch: true,
      }),
    );
    expect(mock.identify).toHaveBeenCalledTimes(1);
    expect(mock.getExperimentFlag).toHaveBeenCalledTimes(1);
    expect(mock.getExperimentFlag).toHaveBeenCalledWith('aa_canary');

    // First failure triggers feedback_style; second failure reuses cached session variant
    expect(client.triggerFeedbackStyle()).toBe('counterexample');
    expect(client.triggerFeedbackStyle()).toBe('counterexample');
    expect(mock.getExperimentFlag).toHaveBeenCalledTimes(2);
    expect(mock.getExperimentFlag).toHaveBeenLastCalledWith('feedback_style');
  });

  it('guards occurrence events once per identity across reloads and fires core_set_completed after C1 + C2', async () => {
    const storage = createMemoryStorage({ [IDENTITY_STORAGE_KEY]: 'wit_shared_user' });
    const mock1 = createMockSdk({});
    const client1 = new WitnessExperimentClient({
      envKey: 'ser.dev_test_key',
      appEnv: 'development',
      storage,
      createSdk: (): IFlagsmith => mock1.sdk,
    });

    await client1.startSession(true);
    client1.recordChallengeSolved('c1');
    client1.recordChallengeSolved('c1');
    expect(mock1.trackEvent).toHaveBeenCalledTimes(1);
    expect(mock1.trackEvent).toHaveBeenCalledWith('challenge1_solved');

    // Simulate reload on same identity solving C2 and C3
    const mock2 = createMockSdk({});
    const client2 = new WitnessExperimentClient({
      envKey: 'ser.dev_test_key',
      appEnv: 'development',
      storage,
      createSdk: (): IFlagsmith => mock2.sdk,
    });
    await client2.startSession(true);
    client2.recordChallengeSolved('c2');
    client2.recordChallengeSolved('c3');
    client2.recordGaveUp();
    client2.recordGaveUp();
    await client2.finishSession();

    expect(mock2.trackEvent).toHaveBeenCalledWith('core_set_completed');
    expect(mock2.trackEvent).toHaveBeenCalledWith('transfer_solved');
    expect(mock2.trackEvent).toHaveBeenCalledWith('gave_up');
    expect(mock2.trackEvent).toHaveBeenCalledTimes(3);
    expect(mock2.flushEvents).toHaveBeenCalledTimes(1);
  });

  it('degrades to control and emits feedback_render_error on unknown flag value', async () => {
    const storage = createMemoryStorage();
    const mock = createMockSdk({ feedbackValue: 'unknown_variant', inExperiment: true });
    const client = new WitnessExperimentClient({
      envKey: 'ser.dev_test_key',
      appEnv: 'development',
      storage,
      createSdk: (): IFlagsmith => mock.sdk,
    });

    await client.startSession(true);
    expect(client.triggerFeedbackStyle()).toBe('control');
    expect(mock.trackEvent).toHaveBeenCalledWith('feedback_render_error');
  });

  it('falls back safely to control when network fails during identify', async () => {
    const storage = createMemoryStorage();
    const mock = createMockSdk({ failIdentify: true });
    const client = new WitnessExperimentClient({
      envKey: 'ser.dev_test_key',
      appEnv: 'development',
      storage,
      createSdk: (): IFlagsmith => mock.sdk,
    });

    await expect(client.startSession(true)).resolves.toBeUndefined();
    expect(client.triggerFeedbackStyle()).toBe('control');
    expect(mock.getExperimentFlag).not.toHaveBeenCalled();
  });

  it('does not lock cachedVariant to control while identify() is still in flight', async () => {
    const storage = createMemoryStorage();
    let resolveIdentify: (() => void) | undefined;
    const identifyPromise = new Promise<void>((res) => {
      resolveIdentify = res;
    });

    const init = vi.fn().mockResolvedValue(undefined);
    const identify = vi.fn().mockReturnValue(identifyPromise);
    const getExperimentFlag = vi.fn().mockReturnValue({
      enabled: true,
      value: 'counterexample',
      experiment: { id: 2, name: 'exp', inExperiment: true },
    });
    const sdk = {
      init,
      identify,
      getExperimentFlag,
      trackEvent: vi.fn(),
      flushEvents: vi.fn().mockResolvedValue(undefined),
      loadingState: {
        error: null,
        isFetching: false,
        isLoading: false,
        source: FlagSource.DEFAULT_FLAGS,
      },
    } as unknown as IFlagsmith;

    const client = new WitnessExperimentClient({
      envKey: 'ser.dev_test_key',
      appEnv: 'development',
      storage,
      createSdk: (): IFlagsmith => sdk,
    });

    const startPromise = client.startSession(true);
    // Failure submitted before identify resolves -> returns control safely without poisoning cache
    expect(client.triggerFeedbackStyle()).toBe('control');

    // Now identify settles with SERVER source
    sdk.loadingState = {
      error: null,
      isFetching: false,
      isLoading: false,
      source: FlagSource.SERVER,
    };
    resolveIdentify?.();
    await startPromise;

    expect(client.triggerFeedbackStyle()).toBe('counterexample');
    expect(getExperimentFlag).toHaveBeenCalledWith('feedback_style');
  });
});
