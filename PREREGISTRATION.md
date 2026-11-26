# Experiment Pre-Registration — Witness (Toggle Wars 2026, Track 01)

- **Repository Owner:** `shashank814331` (`https://github.com/shashank814331/witness-toggle-wars`)
- **Pre-Registration Version:** `prereg-v1` (tagged on commit `7e4e11379d4495c9093993016beb4ce43868da94`, pushed `2026-11-26 20:31 IST` before Production experiments start)
- **Window:** `26 Nov 2026` (Production start) → **`29 Nov 2026, 14:00 IST`** (fixed-horizon data freeze)

---

## 1. Research Question & Hypothesis

Programming-education research is divided on whether showing concrete failing test cases improves debugging skill or encourages trial-and-error overfitting (Becker 2016 vs. Denny et al. 2014; Santos & Becker 2024).

**Falsifiable Hypothesis:**  
Among consenting participants (`wit_<uuid>`) who submit at least one incorrect pattern on Core Challenge 1 or Challenge 2, showing **one concrete failing test case** (`counterexample`) rather than **pass counts alone** (`control`) increases `core_set_completed` by **≥10% relative** during 26–29 Nov 2026 without decreasing the unaided transfer-challenge solve rate (`transfer_solved`).

---

## 2. Experimental Design & Triggered Exposure

- **Primary Flag:** `feedback_style` (multivariate string flag, 50/50 split, 100% rollout of triggered identities)
  - `control` (default value `"control"`): displays `"N of 8 checks passed."` only.
  - `counterexample` (value `"counterexample"`, variation key `"counterexample"`): displays `"N of 8 checks passed."` plus the first failing test case in fixed order.
- **Triggered Exposure Rule:** `getExperimentFlag('feedback_style')` is invoked **only** at the participant's first failed non-syntax, non-empty submission on Challenge 1 or Challenge 2. Participants who solve both core challenges on the first try never trigger `feedback_style` and experience identical UI across arms.
- **A/A Canary Flag:** `aa_canary` (`"control"` vs `"control_copy"`, variation key `"aa_b"`, identical UI), triggered once immediately after consent and identification.
- **Transfer Checkpoint (Challenge 3):** All consenting users receive count-only feedback on Challenge 3 regardless of arm, providing an unaided transfer guardrail.

---

## 3. Metrics (Case-Sensitive)

| Metric                     | Event Name              | Aggregation | Polarity       | Role                    |
| -------------------------- | ----------------------- | ----------- | -------------- | ----------------------- |
| Core set completed         | `core_set_completed`    | Occurrence  | `up`           | **Primary**             |
| Challenge 1 solved         | `challenge1_solved`     | Occurrence  | `up`           | Secondary               |
| Gave up                    | `gave_up`               | Occurrence  | `down`         | Secondary               |
| Transfer checkpoint solved | `transfer_solved`       | Occurrence  | `not-decrease` | **Guardrail**           |
| Feedback render errors     | `feedback_render_error` | Count       | `not-increase` | **Technical Guardrail** |

---

## 4. Statistical Power, Stopping Rule & Decision Rule

- **Power (stated upfront):** With ~150 triggered identities per arm and a ~55% baseline completion rate, the 95% credible interval width on absolute difference is roughly ±11 percentage points (minimum detectable effect at 80% power ~16 pp). Inconclusive results with a quantified credible interval are explicitly treated as valid outcomes.
- **Stopping Rule:** Fixed-horizon freeze at **29 Nov 2026, 14:00 IST**. No early stopping for a positive lift. The sole stop-and-investigate condition is a Sample Ratio Mismatch (`SRM`, $p < 0.001$).
- **Pre-Registered Decision Rule:** Roll out `counterexample` only if **all four** hold at freeze:
  1. Flagsmith Bayesian chance-to-beat-control on `core_set_completed` is **≥95%**.
  2. `transfer_solved` guardrail is **not "losing"** (chance-to-beat >5%).
  3. No **SRM** warning ($p \ge 0.001$ on chi-square check of triggered exposures).
  4. `aa_canary` remains **inconclusive**.
     Otherwise, retain `control` and publish the interval and guardrail analysis honestly.

---

## 5. Environment Separation

- **Production:** Real consenting volunteers only; tagged `prereg-v1` before start.
- **Development:** All manual testing and Playwright calibration simulations (`sim/simulate.ts`, explicitly labelled `SIMULATED`, refuses Production key).
