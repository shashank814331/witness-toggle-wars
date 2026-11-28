# Progress Log — Witness

## M0 & Module 1: Environment Discovery & Foundation (`2026-11-26`)

- **OS:** Windows
- **Hardware:** AMD Ryzen AI 7 350 (16 logical CPUs), 16.23 GB RAM (~5.48 GB free at baseline), `D:` ~263.9 GiB free, `C:` ~4.71 GiB free (cache kept on `D:` / system Chrome reused).
- **Tools Verified:** `git 2.52.0`, `node v24.11.0`, `npm 11.6.1`, `pnpm 10.28.0`, `python 3.11.9` (`numpy 2.2.6`, `scipy 1.17.0`, `playwright 1.62.0`), `docker 29.4.3`, Chrome & Edge installed.
- **Installed Packages (`npm --cache .agent/npm-cache install`):** `@flagsmith/flagsmith@12.6.0`, `@flagsmith/cli@2.0.0`, `typescript@5.9.3`, `vitest@3.2.7`, `vite`, `@playwright/test`, `@axe-core/playwright`, `eslint`, `prettier` (`npm audit --omit=dev`: 0 vulnerabilities).
- **GitHub Isolation:** Local git configured strictly for `shashank814331`; global config and other account credentials left untouched.

## Module 2: Flagsmith SDK & CLI Contract Verification (`2026-11-26`)

- Verified `@flagsmith/flagsmith@12.6.0` (`types.d.ts`, `event-processor.d.ts`, `index.js`) and `@flagsmith/cli@2.0.0` (`flagsmith feature create`, `variant add`, `api`).
- Documented endpoints (`edge.api.flagsmith.com`, `events.api.flagsmith.com`), `getExperimentFlag` server-source check, and `flushEvents()` guarantees in `docs/adr/0002-flagsmith-sdk-and-cli-contracts.md` and `DECISIONS.md`.
- Live Flagsmith Cloud `warehouse-connections/` & metric direction enum check parked for user login in `.agent/parked.md`.
- **Next:** Module 3 — Pure regex engine, 3 challenges, consent + Practice Mode, accessible UI, and unit tests.

## Module 3: Pure Regex Engine, Challenges & Accessible UI (`2026-11-26`)

- Implemented `src/engine/{challenges.ts,evaluate.ts}`, `src/consent.ts`, `src/ui/{challengeView.ts,feedback.ts,finish.ts}`, `src/styles.css`, `index.html`, and `src/main.ts`.
- Verified `npm run typecheck`, `npm run lint`, `npm run test:unit` (13/13 tests passing), and `npm run build`.
- **Next:** Module 4 — Flagsmith experiment integration and `ops/*.sh` scripts.

## Module 4: Flagsmith Integration & Ops Tooling (`2026-11-26`)

- Implemented `src/experiment/{identity.ts,events.ts,flagsmith.ts}`, `src/vite-env.d.ts`, updated `src/main.ts` with Dev-only footer, and dry-run-by-default `ops/{lib,setup-flags,create-metrics,create-experiment,start,refresh-and-export}.sh`.
- Verified `tsc --noEmit`, `eslint .`, `vitest run` (19/19 tests), and `vite build`. Live Flagsmith Cloud `--apply` remains parked for user credentials.
- **Next:** Module 5 — Playwright + `@axe-core/playwright` E2E, determinism, trigger timing, and blocked-network fallback tests.

## Module 5: Full E2E, Determinism, Fallback & Accessibility Suite (`2026-11-26`)

- Added `playwright.config.ts` (serial `workers: 1`, Chrome channel locally), `tests/e2e/staticServer.ts`, `scripts/run-e2e.mjs`, and `tests/e2e/witness.spec.ts`.
- Verified **19/19 Vitest unit tests** and **6/6 Playwright + Axe E2E tests** passing (`TEST_REPORT.md`). Tightened CSS contrast tokens (`--danger: #991b1b`, `--success: #166534`) after Axe caught mid-fade contrast.
- **Next:** Module 6 — `PREREGISTRATION.md` & `vercel.json` preparation (Production execution parked for user approval).

## Module 6: Pre-Registration & Vercel Release Config (`2026-11-26`)

- Finalized `PREREGISTRATION.md` (hypothesis, triggered exposure, metrics, power statement, fixed-horizon freeze `29 Nov 14:00 IST`, decision rule) and `vercel.json` (static Vite build + strict CSP/security headers).
- Parked `git tag prereg-v1`, Production `ops/*.sh --apply`, and Vercel public deployment in `.agent/parked.md` per RED rules.
- **Next:** Module 7 — Playwright calibration simulator (`sim/`) and Python SRM + Beta-Binomial verifier (`analysis/verify.py`).

## Module 7: Calibration Simulator & Python Verification (`2026-11-26`)

- Implemented `sim/model.md`, `sim/simulate.ts` (strictly blocks Production env/keys; builds isolated `.tmp-sim-dist`; waits for `#connection-status` settle), `analysis/verify.py` (`scipy.stats.chisquare` SRM + 200k Beta(1,1)-Binomial Monte Carlo), `tests/unit/sim.test.ts`, and `tests/unit/test_verify.py`.
- Verified 21/21 Vitest unit tests, 3/3 Python unit tests, and 6-user `--mock-local` Chrome calibration dry run + `analysis/verify.py` reconciliation (`3` control / `3` counterexample, `srm_p_value = 1.0`).
- **Next:** Module 8 — CI workflow, `README.md`, `WALKTHROUGH.md`, `DEMO_SCRIPT.md`, `RESULTS.md` template, and final audit.

## Module 8: CI, Documentation & Local Verification (`2026-11-26`)

- Added `.github/workflows/ci.yml`, `README.md`, `WALKTHROUGH.md`, `DEMO_SCRIPT.md`, `RESULTS.md`, updated `CHANGELOG.md` and `TEST_REPORT.md`, and cleaned `__pycache__` from git index.
- All local quality gates verified green; Production Flagsmith `--apply`, `prereg-v1` tag, Vercel deployment, and `shashank814331` remote push parked in `.agent/parked.md`.

## Complete Track 01 `.md` Specification Audit Checklist

### Completed Locally & Pushed to GitHub (`2026-11-26 20:31 IST`)

- [x] Consent screen with anonymous `wit_<uuid>` ID, explicit `18+ only` & no-personal-data notice, 5 event names listed, and tracking-free Practice Mode (`src/consent.ts`)
- [x] Core challenges C1 (ISO date + anchoring trap), C2 (Semver), and C3 Checkpoint (Hex colour, count-only for everyone) (`src/engine/challenges.ts`)
- [x] Pure evaluator with `>200` chars rejection and `>50 ms` per-test ReDoS timeout (`src/engine/evaluate.ts`)
- [x] Arm-specific renderers (`control` count-only vs `counterexample` exact phrasing) + `feedback_render_error` fallback (`src/ui/feedback.ts`)
- [x] `"Show solution"` disabled until 2 non-syntax failures, fires `gave_up` once (`src/ui/challengeView.ts`)
- [x] Finish view disclosing outcomes, attempt counts, counterfactual side-by-side comparison, arm, and `PREREGISTRATION.md` link (`src/ui/finish.ts`)
- [x] Triggered exposure (`getExperimentFlag('feedback_style')` ONLY on 1st failed core attempt), `aa_canary` right after consent, once-per-identity guards, `pagehide`/`visibilitychange` `keepalive` flush (`src/experiment/*`)
- [x] Offline/401 fallback to `control` with zero uncaught errors (`tests/e2e/witness.spec.ts`)
- [x] WCAG AA accessibility (light & dark mode) & keyboard operation verified with `@axe-core/playwright` (`tests/e2e/witness.spec.ts`)
- [x] Dry-run-by-default CLI v2 scripts (`ops/*.mjs`, `ops/*.sh`), no-peeking `ops/monitor.mjs`, and `ops/make_qr.py` + `RECRUITMENT.md`
- [x] Calibration simulator (`sim/model.md`, `sim/simulate.ts`, Production key refusal) & Python SRM + 200k Beta-Binomial + reconciliation script (`analysis/verify.py`)
- [x] GitHub isolation (`shashank814331`), public repo `shashank814331/witness-toggle-wars`, `Flagsmith/flagsmith` starred, `main` (`7e4e113`) + `prereg-v1` pushed before Production start

### Completed & Live (`2026-11-28 18:32 IST`)

- [x] Flagsmith CLI auth (`.\node_modules\.bin\flagsmith.cmd login`) & `.env.development.local`
- [x] Live Flagsmith `Development` provisioning (`ops/provision.mjs --env dev --project 56540 --apply --start`, IDs `1429` & `1430`) & `N=100 × 3` calibration (`1,307` events, `matched_exactly: true`, `control_delta: 0`, `counterexample_delta: 0`)
- [x] Deployed `main` (`7e4e113` / `prereg-v1`) to Vercel at `https://witness-toggle-wars.vercel.app/` (0 CSP errors, 0 pre-consent Flagsmith calls)
- [x] Provisioned & started Production experiments (`1672` `witness_feedback_style_prod` at `2026-11-28 18:29:13 IST`, `1673` `witness_aa_canary_prod` at `2026-11-28 18:29:15 IST`)
- [x] Verified both Production arms (`control` + `counterexample`), `$flag_exposure`, and `202 Accepted` events via live incognito Chrome smoke tests, generated `recruitment-qr.png`, and ran initial no-peeking health check (`ops/monitor.mjs --env prod --experiment-id 1672 --aa-id 1673 --apply`)

### Remaining Before Sunday Submission (`29 Nov 2026`)

- [ ] Collect volunteer traffic via `https://witness-toggle-wars.vercel.app/` and `recruitment-qr.png` (run `ops/monitor.mjs` no-peeking check Sunday `09:00 IST`)
- [ ] Sunday `14:00 IST` fixed-horizon freeze & export (`node ops/export.mjs --env prod --experiment-id 1672 --apply` & `--experiment-id 1673 --apply`), finalize `RESULTS.md`, record ≤3 min video (`DEMO_SCRIPT.md`), and submit before `20:00 IST`

## Depth & Reliability Pass (`2026-11-26`)

- Fixed in-flight `identify()` race condition in `src/experiment/flagsmith.ts` (`identifySettled` vs `serverReady`) and added `keepalive: true` `fetch` support for reliable `pagehide` event delivery.
- Added cross-platform `ops/provision.mjs`, `ops/export.mjs`, `ops/cliHelpers.mjs` (`ops/cliHelpers.d.mts`) with automatic ID resolution, dry-run defaults, and `prereg-v1` tag gate.
- Expanded unit/calibration test coverage (`tests/unit/ops.test.ts`, multi-scenario calibration verification in `tests/unit/sim.test.ts`, in-flight `identify` test in `tests/unit/experiment.test.ts`).
