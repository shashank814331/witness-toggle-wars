# Test Report — Witness

## Automated Verification Summary (Local Sandbox — 2026-11-26)

| Suite                        | Command                                                                                | Scope                                                              | Result                                             |
| ---------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| Formatting                   | `npm run format:check`                                                                 | All repo files (excluding `Witness_*.md`)                          | Pass                                               |
| TypeScript (`strict`)        | `npm run typecheck`                                                                    | `src/`, `tests/`, `sim/`, `types/`, configs                        | Pass (0 errors)                                    |
| ESLint (`strictTypeChecked`) | `npm run lint`                                                                         | All TS/JS/MJS files                                                | Pass (0 errors, 0 warnings)                        |
| Unit & Component Tests       | `npm run test:unit`                                                                    | 6 files (`evaluate`, `feedback`, `ui`, `experiment`, `sim`, `ops`) | **27 / 27 passed**                                 |
| Ops CLI Dry-Run              | `node ops/provision.mjs --env dev`, `export.mjs --env dev`, `monitor.mjs --env prod`   | Cross-platform provisioning, export & no-peeking monitor dry-runs  | Pass                                               |
| Python Stats & QR Tests      | `python -m unittest discover -s tests/unit -p "test_*.py" -v`                          | `test_verify.py` (4) + `test_qr.py` (1)                            | **5 / 5 passed**                                   |
| Production Build             | `npm run build`                                                                        | `tsc --noEmit && vite build`                                       | Pass (`dist/assets/index-*.js` 62.01 kB)           |
| Playwright E2E + Axe         | `npm run test:e2e`                                                                     | 7 E2E scenarios in headless Chrome (`workers: 1`)                  | **7 / 7 passed**                                   |
| Simulator Dry Smoke          | `npx tsx sim/simulate.ts --mock-local --delta 0 --seed 1 --n 6` + `analysis/verify.py` | 6 Chrome sessions + CSV/posterior reconciliation                   | **Pass (3 control / 3 counterexample, SRM p=1.0)** |

## E2E Scenarios Verified (with Route-Mocked Flagsmith Endpoints)

1. **Consent decline (`Practice Without Tracking`):** Zero HTTP requests to Flagsmith hosts; 0 page errors; completes C1–C3 cleanly.
2. **Triggered exposure & `counterexample` flow:** `aa_canary` fires after consent; zero `$flag_exposure` for `feedback_style` prior to first failure on C1; first C1 failure emits `$flag_exposure` and renders exact counterexample phrasing; C3 checkpoint hides counterexamples; `challenge1_solved`, `core_set_completed`, `transfer_solved` recorded.
3. **`control` arm & `gave_up` unlock:** Control never prints failing test input; `"Show solution"` remains disabled until 2 failures; clicking emits `gave_up` and reveals reference solution.
4. **Blocked-network fallback:** Aborting all Flagsmith requests still allows completing C1–C3 in `control` mode with 0 uncaught `pageerror` exceptions.
5. **Accessibility (`@axe-core/playwright`):** Zero `serious` or `critical` WCAG 2 AA violations on Consent, Challenge (with feedback rendered), and Finish screens; Enter-key form submission verified.
6. **Determinism across reload:** Persisted `witness.vid` sends identical identifier across reload and receives deterministic arm assignment.
7. **200-char input guard & HTTP 401 invalid-key fallback:** Submitting 205 characters displays the length error cleanly, and HTTP 401 from Flagsmith degrades safely to `control` with 0 uncaught errors.

## Live Cloud Environment Verification (`2026-11-27` – `2026-11-28`)

| Check                                       | Scope & Command                                                                                                                                                      | Result                                                                                                                                        |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Flagsmith Dev Provision & Calibration       | `ops/provision.mjs --env dev --project 56540 --apply --start` (`1429`, `1430`) + `sim/simulate.ts` (`N=100 × 3`) + `analysis/verify.py`                              | **Pass (`1,307` events across `6` types; `152` control / `148` counterexample; `control_delta=0`, `counterexample_delta=0`, SRM `p=0.8174`)** |
| Vercel Production CSP & Pre-Consent         | `https://witness-toggle-wars.vercel.app/` (`main` @ `7e4e113` / `prereg-v1`)                                                                                         | **Pass (`0` CSP errors, `0` pre-consent Flagsmith calls)**                                                                                    |
| Flagsmith Prod Launch & Live Arm Smoke Test | `ops/provision.mjs --env prod --project 56540 --apply --start` (`1672`, `1673`) + isolated Chrome incognito tests (`control` + `counterexample`) + `ops/monitor.mjs` | **Pass (`in_experiment: true`, both arms rendered distinctly, `$flag_exposure` + events `202 Accepted`, `21` Prod events)**                   |
