# Experiment Results — Witness

> **Reporting Policy:** Real human volunteer results (`Production`) and synthetic pipeline calibration runs (`Development` — `SIMULATED`) are kept in strictly separate sections and are never combined into a single chart or statistic.

---

## 1. REAL USERS (`Production` Environment)

- **Status:** **Pending Production Launch & Freeze (`29 Nov 2026, 14:00 IST`)**
- **Pre-registration tag:** `prereg-v1` (to be tagged before Production experiments start)

| Arm (`feedback_style`) | Triggered Exposures | `core_set_completed` | `challenge1_solved` | `transfer_solved` (Guardrail) | `gave_up` | `feedback_render_error` |
| ---------------------- | ------------------- | -------------------- | ------------------- | ----------------------------- | --------- | ----------------------- |
| `control`              | _TBD at freeze_     | _TBD_                | _TBD_               | _TBD_                         | _TBD_     | _TBD_                   |
| `counterexample`       | _TBD at freeze_     | _TBD_                | _TBD_               | _TBD_                         | _TBD_     | _TBD_                   |

- **Flagsmith Bayesian Engine Summary:** _Pending freeze export (`evidence/prod/`)._
- **A/A Canary (`aa_canary`):** _Pending freeze export._
- **Independent Check (`analysis/verify.py`):** _Pending freeze export._
- **Pre-Registered Verdict:** _Pending freeze._

---

## 2. SIMULATED PIPELINE CALIBRATION (`Development` Environment — `SIMULATED`)

> All values below come from synthetic browser bots (`sim/simulate.ts`) and are **not behavioral evidence**.

- **Local Pipeline Dry Verification (`--mock-local --delta 0 --seed 1 --n 6`):**
  - 6 headless Chrome sessions reconciled cleanly: `3` `control` / `3` `counterexample` (`srm_chi2 = 0.0`, `srm_p_value = 1.0`, `verdict = inconclusive`).
- **Full Flagsmith Development Calibration Runs ($\delta \in \{0, +0.3, -0.2\}$, $N = 400$ per scenario):**
  - _Pending Flagsmith Cloud Development key & `ops/*.sh --apply`._
