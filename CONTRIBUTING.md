# Contributing to Witness

Thank you for helping improve **Witness** (`shashank814331`, Toggle Wars 2026 Track 01).

## Workflow

1. Create a branch from `main` using Conventional prefixes: `feat/`, `fix/`, `chore/`, `docs/`, or `hardening/`.
2. Never commit secrets, `.env` files, or `FLAGSMITH_API_KEY` values.
3. Run verification locally before opening a pull request:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run format:check`
   - `npm run test:unit`
   - `npm run build`
4. Keep experiment logic (`PREREGISTRATION.md`, `feedback_style`, `aa_canary`) unchanged once Production is running.
