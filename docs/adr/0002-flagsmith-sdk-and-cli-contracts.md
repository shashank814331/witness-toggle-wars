# ADR-0002: Verified Flagsmith SDK (`@flagsmith/flagsmith@12.6.0`) and CLI (`v2.0.0`) Contracts

## Status

Accepted (2026-11-26)

## Context

The Track 01 specification required verifying exact `@flagsmith/flagsmith` initialization options, event endpoints, synchronous `getExperimentFlag` behavior, and Flagsmith CLI v2.0.0 subcommands before implementing application code or ops scripts.

## Verified Findings (Inspected from `node_modules/@flagsmith/flagsmith` & `npx flagsmith --help`)

1. **Package & Exports (`@flagsmith/flagsmith@12.6.0`):**
   - `index.d.ts` exports default singleton `flagsmith` and `createFlagsmithInstance<F, T>() => IFlagsmith<F, T>`.
2. **Initialization (`IInitConfig` in `types.d.ts`):**
   - `environmentID`, `api` (defaults to `https://edge.api.flagsmith.com/api/v1/`), `enableEvents: true`, `eventProcessorConfig?: { eventsApiUrl?: string; maxBuffer?: number; flushInterval?: number }` (throws at init if set without `enableEvents: true`), `cacheFlags: false`, `defaultFlags`, `onError`.
   - Default Events API URL: `https://events.api.flagsmith.com/` (`POST v1/events` with `X-Environment-Key`, 3s timeout, automatic retry on 408/429/502/503/504/5xx).
3. **Triggered Exposure (`getExperimentFlag` in `index.js`):**
   - Synchronous (`IFlagsmithFeature | null`).
   - Records `$flag_exposure` via `trackExposureEvent` **only** when `eventProcessor` is active, an identity is set (`identify()`), the flag is enabled, `flag.experiment?.inExperiment === true`, and `loadingState.source === FlagSource.SERVER`.
   - When offline or using `defaultFlags` (`FlagSource.DEFAULT_FLAGS`), zero exposures are emitted.
4. **Events & Flushing:**
   - `trackEvent(name, opts?)` throws if `name.startsWith('$')`; `flushEvents(): Promise<void>` never rejects.
5. **CLI v2.0.0 (`@flagsmith/cli@2.0.0`):**
   - `flagsmith feature create <name> --value control --enabled`
   - `flagsmith feature variant add <feature> --value <v> --key <k> --weight 0` (variation key required for exposure recording)
   - `flagsmith api <path> [--method POST] [--input -]`
   - Accepted guardrail `direction` / `expected_direction` values on live Flagsmith Cloud `experiment-metrics/` and `experiments/` must still be verified with `--dry-run` / `GET` against your authenticated Flagsmith Cloud project (`ops/create-metrics.sh` documents `increase` / `decrease` / `not-increase` / `not-decrease` vs `up` / `down` check).

## Consequences

- CSP headers and offline-blocking tests must cover both `edge.api.flagsmith.com` and `events.api.flagsmith.com`.
- `createFlagsmithInstance()` allows clean isolated unit & integration tests without global singleton leakage.
