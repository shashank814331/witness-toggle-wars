# Technical Walkthrough & Judge Q&A — Witness

## 1. Module Map

- `src/consent.ts`: Explains anonymous ID (`wit_<uuid>`), lists `$flag_exposure` and the 5 event names, and provides a tracking-free Practice Mode.
- `src/engine/challenges.ts`: Defines Challenge 1 (ISO date with intentional anchoring trap), Challenge 2 (semantic version), and Challenge 3 (transfer checkpoint hex colour).
- `src/engine/evaluate.ts`: Pure `new RegExp(pattern).test(input)` evaluator enforcing a 200-character limit and a 50 ms per-test catastrophic-backtracking guard.
- `src/ui/feedback.ts`: Formats arm-specific output (`control` = pass count only; `counterexample` = pass count + first failing test in fixed order; Challenge 3 = pass count for everyone; unknown variant = `control` + `feedback_render_error`).
- `src/ui/challengeView.ts`: Implements the challenge state machine (`idle -> editing -> submitted -> {solved | feedback_shown} | gave_up`), unlocks `"Show solution"` after 2 non-syntax failures, and disables form submission after completion.
- `src/ui/finish.ts`: Summarizes solved vs. revealed outcomes, discloses the assigned arm, and links to `PREREGISTRATION.md`.
- `src/experiment/{identity,events,flagsmith}.ts`: Manages `localStorage['witness.vid']`, once-per-identity event guards across reloads, `getExperimentFlag` calls (`aa_canary` post-consent, `feedback_style` only on first failed core attempt), `flushEvents()` on `pagehide`/visibility hidden/finish, and offline `control` fallback.
- `ops/*.sh`: Dry-run-by-default Flagsmith CLI v2 scripts requiring `--apply` and enforcing the `prereg-v1` git tag before any Production mutation.
- `sim/simulate.ts`: Headless Playwright calibration runner strictly blocked from Production keys/environments, writing `SIMULATED` CSV ledgers.
- `analysis/verify.py`: Computes 50/50 chi-square SRM tests and 200k-draw Beta(1,1)-Binomial Monte Carlo intervals.

## 2. Why This Architecture

A zero-framework static TypeScript bundle (`~60 kB` uncompressed JS) eliminates server state, keeps PII out of scope, reduces failure modes, and makes every rule of the experiment (trigger timing, ReDoS bounds, offline fallback, arm formatting) deterministically unit- and E2E-testable.

## 3. Reproduction & Common Failure Modes

- **Variation missing `--key`:** Flagsmith ignores exposures for unkeyed multivariate options. `ops/setup-flags.sh` explicitly passes `--key` and verifies via `flagsmith feature get --json`.
- **Events dropped on tab close:** `flagsmith.ts` attaches `pagehide` and `visibilitychange` (`hidden`) handlers calling `flushEvents()`.
- **Network blocked or Flagsmith down:** `WitnessExperimentClient` initializes with `defaultFlags`, catches `identify()` failures cleanly, never emits bogus `$flag_exposure` (since `loadingState.source !== FlagSource.SERVER`), and keeps challenges playable in `control`.

---

## 4. Twelve Judge Questions & Answers

1. **Why is triggered exposure (`getExperimentFlag` only on first failure) unbiased here?**  
   Prior to the first failed submission on Challenge 1 or Challenge 2, both arms have identical HTML, copy, test tables, and behavior. Random assignment is independent of participant skill, so conditioning on reaching the divergence point removes dilution from users who solve everything on attempt 1 without introducing selection bias between arms.

2. **Why call `getExperimentFlag` instead of `getValue` or `hasFeature`?**  
   In `@flagsmith/flagsmith`, `getExperimentFlag` atomically resolves the assigned flag and emits `$flag_exposure` only when `loadingState.source === FlagSource.SERVER` and `flag.experiment?.inExperiment === true`, preventing pre-trigger or fallback exposures.

3. **Why does Flagsmith say Bayesian peeking is safe, yet you still pre-registered a fixed horizon (`29 Nov 14:00 IST`)?**  
   Bayesian posteriors remain coherent under continuous monitoring, unlike unadjusted p-values, _but_ stopping immediately on a lucky early spike still inflates false-positive decisions under small $n$. Fixed-horizon freeze prevents cherry-picking an early fluctuation while retaining SRM as the sole stop-and-investigate trigger.

4. **What are quarantine and SRM in Flagsmith?**  
   If an identity is ever observed under more than one variant, Flagsmith **quarantines** it so corrupted records don't skew lift. **SRM (Sample Ratio Mismatch)** triggers at $p < 0.001$ (once $n \ge 100$) when observed arm counts diverge from the configured 50/50 split—signaling a bug in assignment, caching, or exposure triggers.

5. **Why include an A/A canary (`aa_canary`)?**  
   As noted in Toggle Wars guidance, win probability in small-sample experiments naturally wanders away from 50% even when variants are identical. Running `aa_canary` alongside `feedback_style` calibrates false-positive expectations in the live Production environment.

6. **Why include Challenge 3 as a transfer checkpoint?**  
   If counterexamples help users fix Challenge 1 and 2 via shallow test-fitting ("hard-coding around the shown string") rather than transferable regex comprehension, `core_set_completed` rises while `transfer_solved` (where feedback is count-only for everyone) drops—tripping the guardrail.

7. **Why are simulated results (`sim/`) never cited as evidence for the hypothesis?**  
   Simulations encode assumed parameters ($\theta \sim \text{Beta}(4,4)$, $b$, $\delta$) rather than human cognition. `sim/simulate.ts` exists solely to verify end-to-end exposure attribution, ledger reconciliation, and that $\delta = 0$ correctly reads inconclusive.

8. **What happens if a participant runs a catastrophic backtracking regex (ReDoS)?**  
   `evaluate.ts` rejects patterns exceeding 200 characters upfront and measures per-test execution time; any test exceeding 50 ms immediately aborts with `"Pattern too slow"` identically in both arms.

9. **What happens if a user declines consent or Flagsmith is unreachable?**  
   Declining consent runs Practice Mode with zero `identify`, `getExperimentFlag`, or `trackEvent` calls. Network failure or blocking `edge.api.flagsmith.com` / `events.api.flagsmith.com` safely degrades to `control` with zero uncaught errors.

10. **How do you prevent duplicate conversion inflation across reloads?**  
    Occurrence events (`challenge1_solved`, `core_set_completed`, `transfer_solved`, `gave_up`) are guarded once per identity in `localStorage` (`witness.evt.<vid>.*`) in addition to Flagsmith's server-side occurrence deduplication.

11. **Why keep `analysis/verify.py` when Flagsmith already computes Bayesian statistics?**  
    `analysis/verify.py` provides an independent, transparent Beta(1,1)-Binomial Monte Carlo posterior and chi-square SRM check from raw exported counts, acknowledging that priors may differ from Flagsmith's managed engine.

12. **How do you ship the winning variant without redeploying code?**  
    Because `feedback_style` controls the UI renderer at runtime, rolling out `counterexample` (or reverting to `control`) after the freeze requires only updating the feature rollout in Flagsmith—zero code edits or static site rebuilds.
