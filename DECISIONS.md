# Architectural & Operational Decisions (`DECISIONS.md`)

- **ADR-001 (Zero-Framework Static Architecture):** Built with Vite + Vanilla TypeScript (no React/Next) to minimize bundle size, eliminate backend complexity, and keep CPU/RAM usage light.
- **ADR-002 (Flagsmith Cloud Primary, Docker Fallback):** Use Flagsmith Cloud SaaS to keep local RAM and `C:` disk usage near zero; retain Docker Compose (`localhost:8000`) only as documented fallback if Cloud lacks Experimentation.
- **ADR-003 (Local `@flagsmith/cli` DevDependency):** Installed locally in `devDependencies` instead of global `npm -g` to protect `C:` disk and avoid global system modifications.
- **ADR-004 (Vercel Static Hosting):** Prepared `vercel.json` for static deployment to Vercel upon user approval.
- **ADR-005 (System Chrome Reuse for Playwright):** Configure Playwright E2E/simulation to use installed Chrome (`channel: 'chrome'`) so large browser binaries are not downloaded to `C:`.
