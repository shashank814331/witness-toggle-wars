# ADR-0001: Zero-Framework Static Site, Flagsmith Cloud, and Isolated Repository Auth

## Status

Accepted (2026-11-26)

## Context

Witness is a Track 01 Toggle Wars 2026 experiment testing counterexample vs count-only feedback in a 5-minute regex-debugging lab. The workstation has 16.23 GB RAM (~5.48 GB free at baseline), ~4.71 GiB free on `C:`, ~263.9 GiB free on `D:`, and two separate GitHub accounts (`shashank814331` assigned to this repository and another account assigned to a separate session).

## Decision

1. **Static Client Architecture:** Use Vite + Vanilla TypeScript (`strict: true`, no React/Next) with pure TypeScript evaluation logic (`src/engine/`).
2. **Flagsmith Cloud Primary:** Use Flagsmith Cloud (`@flagsmith/flagsmith@12.6.0` with `enableEvents: true`, `edge.api.flagsmith.com`, `events.api.flagsmith.com`) rather than local Docker containers to avoid RAM pressure and `C:` disk growth. Keep Docker Compose (`localhost:8000`) documented only as a fallback if Cloud lacks Experimentation.
3. **Local Dev Tooling & `D:` Cache:** Install `@flagsmith/cli@2.0.0` in `devDependencies` (not globally) and configure Playwright to reuse installed Chrome (`channel: 'chrome'`).
4. **Repository Auth Isolation:** Use repo-local `git config --local` (`shashank814331`) and `credential.https://github.com.useHttpPath = true` / dedicated SSH host alias so global `.gitconfig` and Windows Credential Manager remain untouched.

## Consequences

- Positive: Fast builds, minimal RAM/disk footprint, zero cross-account credential interference, reproducible fresh-clone setup.
- Negative: Local Development live Flagsmith tests and Vercel deployment require human credentials/approval once `Development` and `Production` keys are provided.
