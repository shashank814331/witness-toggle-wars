# Architectural & Operational Decisions (`DECISIONS.md`)

- **ADR-001 (Zero-Framework Static Architecture):** Built with Vite + Vanilla TypeScript (no React/Next) to minimize bundle size, eliminate backend complexity, and keep CPU/RAM usage light.
- **ADR-002 (Flagsmith Cloud Primary, Docker Fallback):** Use Flagsmith Cloud SaaS to keep local RAM and `C:` disk usage near zero; retain Docker Compose (`localhost:8000`) only as documented fallback if Cloud lacks Experimentation.
- **ADR-003 (Local `@flagsmith/cli` DevDependency):** Installed locally in `devDependencies` instead of global `npm -g` to protect `C:` disk and avoid global system modifications.
- **ADR-004 (Vercel Static Hosting):** Prepared `vercel.json` for static deployment to Vercel upon user approval.
- **ADR-005 (System Chrome Reuse for Playwright):** Configure Playwright E2E/simulation to use installed Chrome (`channel: 'chrome'`) so large browser binaries are not downloaded to `C:`.
- **ADR-006 (Verified SDK Endpoints & `createFlagsmithInstance`):** Verified in `@flagsmith/flagsmith@12.6.0` (`index.js` / `types.d.ts` / `event-processor.d.ts`) that default Flag API is `https://edge.api.flagsmith.com/api/v1/` and default Events API is `https://events.api.flagsmith.com/` (`v1/events`). `getExperimentFlag` records `$flag_exposure` only when `loadingState.source === FlagSource.SERVER` and `flag.experiment?.inExperiment === true`. See `docs/adr/0002-flagsmith-sdk-and-cli-contracts.md`.
