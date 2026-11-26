# Demo Script — Witness (≤ 3 Minutes)

1. **Scene 1 — The Problem (0:00–0:20):** Show a classic `"5 of 8 checks passed."` autograder failure vs. revealing one concrete failing case (`2026-1-29`). Explain the open research debate (Becker 2016 vs. Denny et al. 2014 / Santos & Becker 2024).
2. **Scene 2 — Hypothesis & Pre-Registration (0:20–0:40):** Show `PREREGISTRATION.md`, the `prereg-v1` git tag timestamp predating Production start, and Challenge 3's transfer guardrail.
3. **Scene 3 — Side-by-Side Live Triggered Exposure (0:40–1:20):** Open two fresh incognito sessions (`control` vs `counterexample`). Show consent screen, Network tab proving zero `feedback_style` exposure before failure, submit `^\d{4}-\d{1,2}-\d{2}$` on Challenge 1, and compare both feedback boxes alongside Flagsmith flag config (`feature get --json`).
4. **Scene 4 — Metrics, Exposures & SRM Health (1:20–1:45):** Show Flagsmith's 5 case-sensitive metrics, exposure panel, and SRM check (`analysis/verify.py`).
5. **Scene 5 — Results & Honest Verdict (1:45–2:30):** Walk through Production lift, 95% credible interval, chance-to-beat, `transfer_solved` guardrail, `aa_canary` status, and pre-registered decision rule outcome (separated cleanly from Development `SIMULATED` calibration runs).
6. **Scene 6 — Autograder Policy & Zero-Redeploy Rollout (2:30–2:55):** Explain what the finding implies for CI/ed-tech feedback design and show how toggling `feedback_style` in Flagsmith ships the decision immediately.

_Backup Plan:_ Keep timestamped JSON exports (`evidence/prod/`) and screenshots of Scenes 3–5 ready locally in case of live network latency during recording.
