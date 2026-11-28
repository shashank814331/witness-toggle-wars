# Witness — Counterexample Feedback Experiment (Toggle Wars 2026, Track 01)

> _"Does showing one concrete failing test case help developers fix buggy code—or just help them game the tests?"_

**Witness** is a pre-registered Flagsmith Experimentation lab built for **Toggle Wars 2026 — Track 01 ("Test Something Real")** (`github.com/shashank814331`). It tests a contested question in programming-education research inside a 5-minute regex-debugging app, measuring core completion alongside an unaided transfer checkpoint guardrail.

- **Live Experiment:** https://witness-toggle-wars.vercel.app/ (QR: [recruitment-qr.png](./recruitment-qr.png) · Production Flagsmith Exp IDs: `1672` `witness_feedback_style_prod`, `1673` `witness_aa_canary_prod`)
- **Pre-registration:** [PREREGISTRATION.md](./PREREGISTRATION.md) (`prereg-v1` tag at `7e4e113` before Production launch)
- **Results (Real vs. Simulated strictly separated):** [RESULTS.md](./RESULTS.md)
- **Architecture & 12 Judge Q&As:** [WALKTHROUGH.md](./WALKTHROUGH.md)
- **Demo Video & Script:** [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) _(recording in progress after Production launch)_

---

## 1. Research Question & Hypothesis

Empirical studies on autograder error-message enhancement disagree: Becker (SIGCSE 2016) observed reduced error rates, while Denny et al. (2014), Pettit et al. (SIGCSE 2017), and Santos & Becker (UKICER 2024; arXiv 2409.18661) found weak to inconsistent gains on time-to-fix. Moreover, Koedinger & Aleven (2007) framed disclosing vs. withholding assistance as a fundamental open problem: disclosure can boost immediate completion while hurting unaided transfer.

**Hypothesis:** Among consenting participants who submit at least one incorrect regex pattern on Core Challenges 1 or 2, displaying **one concrete failing case** (`counterexample`) rather than a **pass count alone** (`control`) increases `core_set_completed` by **≥10% relative** during 26–29 Nov 2026 without lowering the unaided transfer checkpoint solve rate (`transfer_solved`).

---

## 2. Experiment Design

| Component              | Configuration                                                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary Flag           | `feedback_style` (multivariate string, 50/50 split, 100% rollout of triggered identities)                                                                                    |
| Arms                   | `control` (`"5 of 8 checks passed."`) vs. `counterexample` (key `"counterexample"`, count + first failing case in fixed order)                                               |
| Triggered Exposure     | `flagsmith.getExperimentFlag('feedback_style')` called **only** on first failed submission in C1 or C2                                                                       |
| A/A Canary             | `aa_canary` (`"control"` vs. `"control_copy"`, key `"aa_b"`, identical UI), evaluated right after consent                                                                    |
| Primary Metric         | `core_set_completed` (`occurrence`, `up`)                                                                                                                                    |
| Secondary Metrics      | `challenge1_solved` (`occurrence`, `up`), `gave_up` (`occurrence`, `down`)                                                                                                   |
| Guardrails             | `transfer_solved` on C3 (`occurrence`, `not-decrease`), `feedback_render_error` (`count`, `not-increase`)                                                                    |
| Freeze & Decision Rule | Fixed horizon **29 Nov 2026, 14:00 IST**; ship `counterexample` only if `P(beat) >= 95%`, `transfer_solved` not losing, no SRM ($p \ge 0.001$), and `aa_canary` inconclusive |

---

## 3. How Flagsmith Is Used

1. **SDK Integration (`src/experiment/flagsmith.ts`):** Uses `@flagsmith/flagsmith@12.6.0` with `enableEvents: true`, `cacheFlags: false`, `preventFetch: true`, and `defaultFlags` fallback.
2. **Consent & Identity (`src/consent.ts`, `src/experiment/identity.ts`):** Generates anonymous `wit_<uuid>` in `localStorage['witness.vid']`, then calls `flagsmith.identify(vid)` once. Declining consent runs Practice Mode with zero Flagsmith requests.
3. **Triggered Exposure (`src/ui/challengeView.ts`):** Both arms share identical UI prior to failure. `getExperimentFlag('feedback_style')` fires `$flag_exposure` only at the first failed attempt on C1 or C2 (when `flag.experiment?.inExperiment` and `FlagSource.SERVER`).
4. **Once-Per-Identity Events & Flushing (`src/experiment/events.ts`):** Occurrence metrics are guarded per identity in `localStorage` across reloads and flushed via `flushEvents()` on `pagehide`, `visibilitychange` (`hidden`), and Finish.
5. **CLI v2 Operations (`ops/*.sh`):** Automates flag creation with mandatory variation keys (`--key counterexample`, `--key aa_b`), warehouse check, metrics, experiments, start, and timestamped exports (dry-run by default; requires `--apply`).
6. **Environment Separation:** `Development` is used exclusively for dev testing and Playwright calibration runs; `Production` is isolated strictly for consenting volunteers.

---

## 4. Architecture

```text
Browser (Static Vite + TypeScript, zero UI framework)
 ├── src/consent.ts                  Consent gate + tracking-free Practice Mode
 ├── src/engine/{challenges,evaluate} Pure regex runner + 200-char & 50ms ReDoS guards
 ├── src/ui/{challengeView,feedback,finish} Accessible views + control/counterexample renderers
 └── src/experiment/{identity,events,flagsmith} @flagsmith/flagsmith@12.6.0
        │ identify(vid) once after consent
        │ getExperimentFlag('aa_canary')       → post-consent A/A exposure
        │ getExperimentFlag('feedback_style')  → triggered at 1st failed core attempt
        │ trackEvent(...) + flushEvents()      → 5 case-sensitive metrics
        ▼
Flagsmith Cloud (edge.api.flagsmith.com + events.api.flagsmith.com)
 ├── Development Env  ← local testing & sim/simulate.ts calibration (SIMULATED)
 └── Production Env   ← real consenting volunteers only
```

---

## 5. Setup & Reproduction (5 Steps)

### Prerequisites

- Node.js 20+ (tested on v24.11.0), Python 3.11+, Chrome/Chromium

### Steps

1. **Install dependencies:**
   ```bash
   npm ci
   pip install -r analysis/requirements.txt
   ```
2. **Configure Development environment key:**
   ```bash
   cp .env.example .env.development.local
   # Set VITE_FLAGSMITH_ENV_KEY=<your Flagsmith Development client key>
   ```
3. **Run local quality gates & E2E verification:**
   ```bash
   npm test
   python -m unittest discover -s tests/unit -p "test_*.py" -v
   npm run test:e2e
   npm run build
   ```
4. **Provision Flagsmith Development environment (dry-run first, then `--apply`):**
   - Cross-platform turnkey Node script (Windows PowerShell / macOS / Linux):
     ```bash
     npx @flagsmith/cli@2.0.0 login
     # (or `npx --no-install flagsmith login` after `npm ci`)
     # Set FLAGSMITH_DEV_ENV_KEY in your shell
     node ops/provision.mjs --env dev          # dry-run
     node ops/provision.mjs --env dev --apply  # creates flags, 5 metrics & experiments
     ```
   - Equivalent Bash scripts (`ops/setup-flags.sh`, `ops/create-metrics.sh`, `ops/create-experiment.sh`, `ops/start.sh`, `ops/refresh-and-export.sh`) are also included.
5. **Run Development calibration simulation & independent verification:**
   ```bash
   npx tsx sim/simulate.ts --delta 0 --seed 1 --n 400
   python analysis/verify.py --ledger-csv evidence/dev/SIMULATED-ledger-d0-s1-n400.csv
   ```

---

## 6. Calibration Model & Evidence Separation

- **SIMULATED (Development):** Documented in [sim/model.md](./sim/model.md) ($\theta \sim \text{Beta}(4,4)$, $b_{\text{control}} = 0.35$, $b_{\text{counterexample}} = 0.35(1+\delta)$, give-up hazard $0.15$ after 2 failures, transfer $\theta \cdot 0.50$). Used solely to validate the pipeline and never mixed into human results.
- **REAL USERS (Production):** Tracked separately under `Production` after tag `prereg-v1` and reported in [RESULTS.md](./RESULTS.md).

---

## 7. Limitations, License & Attributions

- **Limitations:** Web-only, English-only, short 4-day window, self-selected volunteers, small sample size, and single domain (regex).
- **License:** [MIT](./LICENSE) (`2026 shashank814331`).
- **Attributions:** Built with `@flagsmith/flagsmith` (BSD-3-Clause), Vite, Vitest, Playwright, and `@axe-core/playwright`.
