# Implementation Plan — Witness

1. **Module 1 (`chore/repo-foundation`):** Local git (`shashank814331`), Vite + TypeScript strict config, ESLint/Prettier, `@flagsmith/flagsmith` + `@flagsmith/cli`, repo hygiene.
2. **Module 2 (`chore/flagsmith-verify`):** Inspect `@flagsmith/flagsmith` `.d.ts` and Flagsmith CLI schema; write ADRs (`docs/adr/`, `DECISIONS.md`).
3. **Module 3 (`feat/engine-and-ui`):** Pure regex evaluator (200-char & 50 ms guards), 3 challenges, consent + Practice Mode, UI views, WCAG AA tokens, unit tests.
4. **Module 4 (`feat/experiment-vertical-slice`):** Flagsmith client wrapper, triggered exposure, `aa_canary`, 5 events with once-per-identity guards, `pagehide` flush, offline fallback, `ops/*.sh` (dry-run default).
5. **Module 5 (`feat/e2e-and-a11y`):** Playwright + `@axe-core/playwright` suite (consent decline, trigger timing, determinism, blocked-network fallback, keyboard navigation), `TEST_REPORT.md`.
6. **Module 6 (`chore/prereg-and-prod`):** `PREREGISTRATION.md` (tagged `prereg-v1` before Prod start), `vercel.json`, user-gated Production `--apply` & Vercel deploy.
7. **Module 7 (`feat/sim-and-analysis`):** `sim/model.md`, `sim/simulate.ts` (Dev-only, refuses Prod key), `analysis/verify.py` (SRM chi-square + Beta-Binomial 200k MC cross-check).
8. **Module 8 (`chore/ci-and-docs`):** GitHub Actions CI, `README.md`, `WALKTHROUGH.md`, `DEMO_SCRIPT.md`, `RESULTS.md` template.
9. **Module 9 (`docs/freeze-and-audit`):** Production data freeze (`29 Nov 14:00 IST`), evidence export, final audit & submission readiness.
