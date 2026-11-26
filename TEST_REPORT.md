# Test Report — Witness

## Automated Verification Summary (Local Sandbox — 2026-11-26)

| Suite                        | Command                                                                                | Scope                                                       | Result                                             |
| ---------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| Formatting                   | `npm run format:check`                                                                 | All repo files (excluding `Witness_*.md`)                   | Pass                                               |
| TypeScript (`strict`)        | `npm run typecheck`                                                                    | `src/`, `tests/`, `sim/`, `types/`, configs                 | Pass (0 errors)                                    |
| ESLint (`strictTypeChecked`) | `npm run lint`                                                                         | All TS/JS/MJS files                                         | Pass (0 errors, 0 warnings)                        |
| Unit & Component Tests       | `npm run test:unit`                                                                    | 5 files (`evaluate`, `feedback`, `ui`, `experiment`, `sim`) | **21 / 21 passed**                                 |
| Python Stats Tests           | `python -m unittest discover -s tests/unit -p "test_*.py" -v`                          | `test_verify.py` (null, positive lift, SRM)                 | **3 / 3 passed**                                   |
| Production Build             | `npm run build`                                                                        | `tsc --noEmit && vite build`                                | Pass (`dist/assets/index-*.js` 59.89 kB)           |
| Playwright E2E + Axe         | `npm run test:e2e`                                                                     | 6 E2E scenarios in headless Chrome (`workers: 1`)           | **6 / 6 passed**                                   |
| Simulator Dry Smoke          | `npx tsx sim/simulate.ts --mock-local --delta 0 --seed 1 --n 6` + `analysis/verify.py` | 6 Chrome sessions + CSV/posterior reconciliation            | **Pass (3 control / 3 counterexample, SRM p=1.0)** |

## E2E Scenarios Verified (with Route-Mocked Flagsmith Endpoints)

1. **Consent decline (`Practice Without Tracking`):** Zero HTTP requests to Flagsmith hosts; 0 page errors; completes C1–C3 cleanly.
2. **Triggered exposure & `counterexample` flow:** `aa_canary` fires after consent; zero `$flag_exposure` for `feedback_style` prior to first failure on C1; first C1 failure emits `$flag_exposure` and renders exact counterexample phrasing; C3 checkpoint hides counterexamples; `challenge1_solved`, `core_set_completed`, `transfer_solved` recorded.
3. **`control` arm & `gave_up` unlock:** Control never prints failing test input; `"Show solution"` remains disabled until 2 failures; clicking emits `gave_up` and reveals reference solution.
4. **Blocked-network fallback:** Aborting all Flagsmith requests still allows completing C1–C3 in `control` mode with 0 uncaught `pageerror` exceptions.
5. **Accessibility (`@axe-core/playwright`):** Zero `serious` or `critical` WCAG 2 AA violations on Consent, Challenge (with feedback rendered), and Finish screens; Enter-key form submission verified.
6. **Determinism across reload:** Persisted `witness.vid` sends identical identifier across reload and receives deterministic arm assignment.

## Pending Live Environment Tests (Parked for User Credentials)

- Live Flagsmith `Development` environment integration (`identify` -> `inExperiment: true` -> `results/refresh/` showing exposures in both arms).
- Live calibrated simulation reconciliation (`N = 400 × 3` scenarios in `Development`).
