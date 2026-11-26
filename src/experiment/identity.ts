export const IDENTITY_STORAGE_KEY = 'witness.vid';

const EVENT_KEY_PREFIX = 'witness.evt.';
const CORE_SOLVED_PREFIX = 'witness.core.';

const memoryFallbackStorage = new Map<string, string>();

function readStorage(storage: Storage | undefined, key: string): string | null {
  if (storage !== undefined) {
    try {
      return storage.getItem(key);
    } catch {
      return memoryFallbackStorage.get(key) ?? null;
    }
  }
  return memoryFallbackStorage.get(key) ?? null;
}

function writeStorage(storage: Storage | undefined, key: string, value: string): void {
  memoryFallbackStorage.set(key, value);
  if (storage !== undefined) {
    try {
      storage.setItem(key, value);
    } catch {
      // Keep in-memory fallback when localStorage is blocked (e.g. strict privacy mode)
    }
  }
}

function getDefaultStorage(): Storage | undefined {
  return typeof window !== 'undefined' ? window.localStorage : undefined;
}

function createRandomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Reads an existing participant ID from localStorage (preserving test/sim prefixes)
 * or generates and persists a new anonymous wit_<uuid> identifier.
 */
export function getOrCreateIdentity(storage: Storage | undefined = getDefaultStorage()): string {
  const existing = readStorage(storage, IDENTITY_STORAGE_KEY);
  if (existing !== null && existing.trim().length > 0) {
    return existing.trim();
  }
  const created = `wit_${createRandomUuid()}`;
  writeStorage(storage, IDENTITY_STORAGE_KEY, created);
  return created;
}

/**
 * Checks whether an occurrence event has already been recorded for this identity.
 */
export function hasFiredEvent(
  vid: string,
  eventName: string,
  storage: Storage | undefined = getDefaultStorage(),
): boolean {
  return readStorage(storage, `${EVENT_KEY_PREFIX}${vid}.${eventName}`) === '1';
}

/**
 * Marks an occurrence event as recorded for this identity.
 */
export function markEventFired(
  vid: string,
  eventName: string,
  storage: Storage | undefined = getDefaultStorage(),
): void {
  writeStorage(storage, `${EVENT_KEY_PREFIX}${vid}.${eventName}`, '1');
}

/**
 * Tracks core challenge completion per identity across reloads to fire core_set_completed once.
 */
export function markCoreChallengeSolved(
  vid: string,
  challengeId: 'c1' | 'c2',
  storage: Storage | undefined = getDefaultStorage(),
): { readonly c1: boolean; readonly c2: boolean } {
  writeStorage(storage, `${CORE_SOLVED_PREFIX}${vid}.${challengeId}`, '1');
  return {
    c1: readStorage(storage, `${CORE_SOLVED_PREFIX}${vid}.c1`) === '1',
    c2: readStorage(storage, `${CORE_SOLVED_PREFIX}${vid}.c2`) === '1',
  };
}
