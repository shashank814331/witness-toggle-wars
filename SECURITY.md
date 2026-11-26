# Security Policy

## Reporting a Vulnerability

Please report security issues privately via GitHub Security Advisories on `https://github.com/shashank814331` rather than opening a public issue.

## Security Boundaries

- **Client keys only in browser bundles:** Only `VITE_FLAGSMITH_ENV_KEY` (client-side Flagsmith environment key) is embedded at build time.
- **No PII collected:** Participant identifiers use random UUIDs (`wit_<uuid>`) stored in `localStorage`. Declining consent runs the app locally with zero Flagsmith calls.
- **ReDoS mitigation:** Regex inputs are capped at 200 characters and checked with a 50 ms per-test timing guard.
- **Admin tokens:** `FLAGSMITH_API_KEY` and Flagsmith CLI credentials must remain strictly in your local shell/CLI credential store and never be committed.
