# Changelog

All notable changes to **Witness** will be documented in this file.

## [0.2.0] - 2026-11-26

### Added

- Pure regex engine (`src/engine/`), consent + Practice Mode (`src/consent.ts`), accessible challenge/feedback/finish views (`src/ui/`), and WCAG AA styles.
- Flagsmith SDK (`@flagsmith/flagsmith@12.6.0`) triggered exposure wrapper, A/A canary, once-per-identity event guards, `pagehide` flushing, and dry-run-by-default `ops/*.sh`.
- Playwright + `@axe-core/playwright` E2E suite (`6` tests), Vitest unit suite (`21` tests), Python `unittest` (`3` tests), calibration simulator (`sim/`), `analysis/verify.py`, `PREREGISTRATION.md`, `WALKTHROUGH.md`, `DEMO_SCRIPT.md`, `RESULTS.md`, `vercel.json`, and GitHub Actions CI.

## [0.1.0] - 2026-11-26

### Added

- Initial repository foundation, strict TypeScript/ESLint/Prettier configuration, license, and project specifications for Toggle Wars 2026 Track 01.
