# Project Specification — Witness (Toggle Wars 2026 Track 01)

## Problem & Hypothesis

Autograders and CI pipelines frequently display only aggregate pass counts (e.g., `5 of 8 checks passed.`). Education research is divided on whether disclosing concrete failing examples improves learning or induces shallow trial-and-error.

**Hypothesis:** Among consenting identities who submit at least one incorrect regex pattern on Core Challenges 1 or 2, displaying **one concrete failing case** (`counterexample`) rather than a pass count alone (`control`) increases the proportion completing both core challenges (`core_set_completed`) by at least 10% relative during 26–29 Nov 2026 without lowering the unaided transfer challenge solve rate (`transfer_solved`).

## Experiment Arms & Trigger

- **Flag:** `feedback_style` (multivariate, 50/50 split, 100% rollout of triggered identities)
  - `control` (value `"control"`): pass count line only (`N of 8 checks passed.`).
  - `counterexample` (value `"counterexample"`, key `"counterexample"`): pass count line plus the first failing test case in fixed order.
- **Triggered Exposure:** `getExperimentFlag('feedback_style')` is invoked **only** on the first failed submission on Challenge 1 or Challenge 2. Pre-trigger screens are identical across arms.
- **A/A Canary:** `aa_canary` (`control` vs `control_copy`, key `aa_b`), identical UI, evaluated right after consent.

## Metrics (Case-Sensitive)

- `core_set_completed` (`occurrence`, `up`) — **Primary**
- `challenge1_solved` (`occurrence`, `up`) — Secondary
- `gave_up` (`occurrence`, `down`) — Secondary
- `transfer_solved` (`occurrence`, `not-decrease`) — **Guardrail**
- `feedback_render_error` (`count`, `not-increase`) — **Technical Guardrail**

## Challenges (8 Visible Tests Each, `new RegExp(pattern).test(input)`)

1. **C1 — ISO Date (`YYYY-MM-DD`):** Match `2026-11-29`, `1999-01-01`, `2000-12-31`, `2026-02-28`, `2010-10-10`; No match `2026-1-29`, `20261129`, `x2026-11-29y`.
2. **C2 — Semantic Version:** Match `2.0.0`, `12.4.0`, `0.1.0`, `1.2.3-beta.3`, `10.20.30`; No match `1.2`, `v1.2.3`, `1.2.3.4`.
3. **C3 — Checkpoint Transfer (Hex Color):** Match `#fff`, `#A1B2C3`, `#000000`, `#abc`; No match `#ff`, `#GGGGGG`, `fff`, `#abcd`. Count-only feedback for everyone.
