# Experiment Results — Witness

> **Reporting Policy:** Real human volunteer results (`Production`) and synthetic pipeline calibration runs (`Development` — `SIMULATED`) are kept in strictly separate sections and are never combined into a single chart or statistic.

---

## 1. REAL USERS (`Production` Environment)

- **Status:** **LIVE in Production** (Started `2026-11-28 18:29:13 IST` / `2026-11-28T12:59:13Z`; fixed-horizon freeze **`29 Nov 2026, 14:00 IST`**)
- **Live URL:** https://witness-toggle-wars.vercel.app/ (QR: [recruitment-qr.png](./recruitment-qr.png))
- **Pre-registration tag:** `prereg-v1` (commit `7e4e11379d4495c9093993016beb4ce43868da94`, pushed `2026-11-26 20:31 IST` before Production experiments started)
- **Production Experiments (Flagsmith Project `56540`):**
  - Primary (`feedback_style`): **`1672`** (`witness_feedback_style_prod`, `status: running`, `started_at: 2026-11-28T12:59:13.899946Z`)
  - A/A Canary (`aa_canary`): **`1673`** (`witness_aa_canary_prod`, `status: running`, `started_at: 2026-11-28T12:59:15.149526Z`)
- **2-Browser Live Production Smoke Test (`2026-11-28 18:31 IST`):** **PASS** — Verified both `counterexample` and `control` arms in isolated headless Chrome incognito sessions on `https://witness-toggle-wars.vercel.app/` (`in_experiment: true`, no fallback-to-control, `0` CSP errors, `0` pre-consent calls, `$flag_exposure` + events returned HTTP `202 Accepted`; Production warehouse `12937` ingested `21` events across `5` unique types).

| Arm (`feedback_style`) | Triggered Exposures | `core_set_completed` | `challenge1_solved` | `transfer_solved` (Guardrail) | `gave_up` | `feedback_render_error` |
| ---------------------- | ------------------- | -------------------- | ------------------- | ----------------------------- | --------- | ----------------------- |
| `control`              | _TBD at freeze_     | _TBD_                | _TBD_               | _TBD_                         | _TBD_     | _TBD_                   |
| `counterexample`       | _TBD at freeze_     | _TBD_                | _TBD_               | _TBD_                         | _TBD_     | _TBD_                   |

- **Flagsmith Bayesian Engine Summary:** _Pending freeze export (`evidence/prod/`)._
- **A/A Canary (`aa_canary`):** _Pending freeze export._
- **Independent Check (`analysis/verify.py`):** _Pending freeze export._
- **Pre-Registered Verdict:** _Pending freeze._

---

## 2. Interim health checks — not for decisions

> Updated by `node ops/monitor.mjs --env prod --experiment-id 1672 --aa-id 1673 --apply` before Sunday `14:00 IST`. Reports arm counts, SRM check, and `aa_canary` status only — **no treatment lift or win probability** until the Sunday `14:00 IST` freeze.

| Timestamp (IST)        | `control` exposures | `counterexample` exposures | SRM $p$-value | SRM Alert | `aa_canary` status |
| ---------------------- | ------------------- | -------------------------- | ------------- | --------- | ------------------ |
| 28 Nov 2026, 18:32 IST | 1                   | 3                          | 0.317311      | OK        | inconclusive       |

---

## 3. SIMULATED PIPELINE CALIBRATION (`Development` Environment — `SIMULATED`)

> All values below come from synthetic browser bots (`sim/simulate.ts`) and are **not behavioral evidence**.

- **Local Pipeline Dry Verification (`--mock-local --delta 0 --seed 1 --n 6`):**
  - 6 headless Chrome sessions reconciled cleanly: `3` `control` / `3` `counterexample` (`srm_chi2 = 0.0`, `srm_p_value = 1.0`, `verdict = inconclusive`).
- **Live Flagsmith Development Calibration Runs ($\delta \in \{0, +0.3, -0.2\}$, $N = 100$ per scenario, `300` total Chrome sessions against `1429` & `1430`):**
  - **Warehouse & Exact Reconciliation:** Flagsmith Dev warehouse (`12936`) received **`1,307`** events across **`6`** unique event types (`$flag_exposure` + 5 metrics). Cumulative export ([results-1429-2026-11-27T13-29-18-255Z.json](./evidence/dev/results-1429-2026-11-27T13-29-18-255Z.json)) recorded **`152`** `control` (`49` `core_set_completed`) vs **`148`** `counterexample` (`51` `core_set_completed`), `srm_chi2 = 0.0533`, `srm_p_value = 0.817361`, `srm_alert = false`, **`reconciliation = { matched_exactly: true, control_delta: 0, counterexample_delta: 0 }`**.
  - **Scenario $\delta = 0$ (`seed=1, n=100`):** `57` `control` (`17` conv) vs `43` `counterexample` (`18` conv), `srm_p_value = 0.161513`, `verdict = inconclusive`.
  - **Scenario $\delta = +0.3$ (`seed=2, n=100`):** `50` `control` (`13` conv, `26.0%`) vs `50` `counterexample` (`19` conv, `38.0%`), `srm_p_value = 1.0`, `prob_b_beats_a = 0.8981`, `rel_lift_median = +0.4357`.
  - **Scenario $\delta = -0.2$ (`seed=3, n=100`):** `45` `control` (`19` conv, `42.2%`) vs `55` `counterexample` (`14` conv, `25.5%`), `srm_p_value = 0.317311`, `prob_b_beats_a = 0.0392`, `verdict = losing`.
  - **Guardrails & Dev A/A Canary (`1430`):** `transfer_solved` remained neutral (`104/152` vs `101/148`, `rel_lift_median = -0.0024`, `verdict = inconclusive`); `feedback_render_error = 0` in both arms; Dev `aa_canary` (`1430`) stayed balanced (`155` vs `145`, `srm_p_value = 0.563703`, `verdict = inconclusive`).
