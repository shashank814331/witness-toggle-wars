# Toggle Wars 2026: P2 Package (Track 01, "Test Something Real")

P2 should build **Witness**. It is a small regex-debugging lab that runs one pre-registered Flagsmith experiment on a question programming-education research has not settled: does showing a developer *one concrete failing case* ("`2026-1-29` should not match, but your pattern matched it") help more than the usual autograder message ("5 of 8 checks passed")? A transfer-task guardrail checks whether that help makes people dependent on it. The design produces a useful finding whichever way the result goes.

## TL;DR
- **The project:** Witness, a two-arm experiment (`control` = count-only feedback vs `counterexample` = one failing case shown). It uses a keyed multivariate flag, *triggered* exposure through `getExperimentFlag` at the user's first failed attempt, a primary metric `core_set_completed` (occurrence), a transfer guardrail and a technical guardrail. Real consenting volunteers go in Production and documented simulated traffic goes in Development, kept fully separate. Flagsmith's Bayesian engine reads the results, and an A/A canary plus an independent posterior check back them up.
- **Deadline:** the official deadline is **29 Nov 2026, 8:00 PM IST**. The rules and schedule pages both say so, and the rules add "Late submissions are not accepted". One WeMakeDevs X post says 11:59 PM; treat it as superseded.\[1\] The internal target is 6:00 PM IST. The Production experiment should start by **Thursday 26 Nov, 20:00 IST**, because real traffic is the one input that cannot be added at the last minute.
- **Risks, stated up front:** Experimentation is in **beta**. The project-submission page currently says registrations only. Real-user sample sizes will probably give an inconclusive result. The package treats all three openly: verify the plan and submission channel in hour 0, pre-register the decision rules, and present "inconclusive, with a quantified interval" as a legitimate result.

---

## SECTION A: Participant identification and track requirements

| Item | Verified detail |
|---|---|
| Participant | P2 (solo, independent competitor) |
| Track | 01, Test Something Real. Prize **$2,000 cash** (main page FAQ)\[2\] |
| Track brief | "Build an app and run a real A/B test on it with Flagsmith Experimentation. The experiment is what counts, not the size of the app. You don't need real users: simulated traffic is fine."\[2\] |
| Track judging bullets | "One experiment done well beats many features · A clear hypothesis to test · Versions behind a flag · A metric from real events · Results you can explain"\[2\] |
| General scorecard (all tracks) | Use of Flagsmith · Impact · Creativity · Demo video\[1\]\[2\] |
| Organiser tip | "You only have four days of data, so pick a metric that fires early in a visit… share the app widely enough that both versions get real traffic before Sunday."\[2\] |
| Timing | Hacking runs from 8:00 AM IST on 26 Nov to 8:00 PM IST on 29 Nov. A head start is explicitly allowed (rule 04)\[3\] |
| Deliverables (rule 08) | Public GitHub repo, a README with setup steps and how Flagsmith was used, and a short demo video of the working project\[3\] |
| Other rules | Teams of 1–4, one track per project, Flagsmith must be core,\[3\] AI coding assistants allowed ("You still need to understand and explain what you built"). Plagiarism or tampering with judging leads to disqualification. The WeMakeDevs Code of Conduct applies\[2\]\[3\] |
| Open items to verify | (1) **Submission channel:** `/hackathons/flagsmith/submit` currently says "takes registrations only, so there is no project to file here".\[4\] Ask in the Flagsmith Discord how to submit. (2) **Centralised planning:** the organisers have not said whether one advisor may plan for four independent solo entrants. Get written clarification in Discord. P2 must review, adapt and approve this brief personally |

## SECTION B: Verified research findings

**V = verified from a primary source, I = reasonable inference, A = assumption.**

| # | Finding | Status | Source |
|---|---|---|---|
| 1 | Experimentation is **in beta**. It serves variations through a multivariate flag, collects events into a warehouse (managed, or your own ClickHouse/Databricks) and uses a built-in Bayesian engine\[5\] | V | docs.flagsmith.com/experimentation |
| 2 | Only multivariate flags can be experimented on. The flag's current value is the control. A flag can be in only one active experiment at a time.\[6\] Experiments are scoped to an environment\[5\]\[6\]\[7\] | V | Create an Experiment docs; WeMakeDevs A/B blog |
| 3 | The wizard asks for name, hypothesis, flag, **rollout %** (share of identities that enter), **variation split**, primary metric and expected direction. The experiment starts immediately once created in the wizard. Flag config and variations are **locked** while it runs. Ending it freezes the results, and an ended experiment cannot be restarted\[6\] | V | Create an Experiment docs |
| 4 | Bucketing is deterministic on the identity key.\[6\] Changing weights mid-test can re-bucket users. Bucketing is independent per environment\[6\]\[8\] | V | Create an Experiment; Basic Flag Management docs |
| 5 | Statistics: lift, 95% credible interval, chance to beat control. Above 95% is "winning", below 5% "losing", anything between "inconclusive".\[9\] The docs say peeking is safe under the Bayesian engine\[9\] | V | Statistics Glossary |
| 6 | Exposures: each identity is counted once, in the variant it saw first, so duplicates cannot inflate counts. Identities seen in more than one variant are **quarantined**. The SRM warning fires at p<0.001 once there are 100 or more identities. A "collecting data" floor applies until each arm has **50 identities** and, for conversion metrics, **5 conversions**\[9\] | V | Statistics Glossary |
| 7 | Metric aggregations: occurrence, count, sum, mean. Directions: up, down, not-increase, not-decrease. These sort metrics into goals and guardrails. Risk (expected loss) is "not currently planned" and a frequentist engine is "deferred"\[9\] | V | Statistics Glossary |
| 8 | SDKs with events: JS/React `@flagsmith/flagsmith` ≥12.4.0, Python `flagsmith` ≥6.3.0, Node `@flagsmith/nodejs` ≥9.1.0 (the old `flagsmith-nodejs` package cannot), plus Java, Go and Flutter\[10\] | V | Set Up with a Coding Agent docs |
| 9 | Official agent prompt flow: `flagsmith feature create <flag> --value control --enabled`, then `flagsmith feature variant add <flag> --value <v> --key <k> --weight 0`. "Every variation needs a key: one without a key records no exposures." Metric creation: `POST api/v1/environments/<env>/experiment-metrics/`. Experiment creation: `POST …/experiments/`.\[10\] Start: `…/experiments/<id>/start/`. Results refresh: `POST …/results/refresh/` (once every 5 minutes), then `GET …/results/`. The MCP server "can't start experiments"\[10\] | V | Set Up with a Coding Agent docs |
| 10 | Common failures: a variation with no key, a user not identified before the experiment flag is requested, the process exiting before events flush, an event name that differs from the metric's event (names are case-sensitive), or a different identifier used for exposure and conversion\[10\] | V | Same page |
| 11 | JS `getExperimentFlag(featureName)` appears to be **synchronous** and returns the flag or null. Exposure is recorded only when `flag.experiment.inExperiment` is true.\[11\] Events are opt-in with `enableEvents: true`.\[12\]\[13\] Flush with `await flushEvents()` | V (behaviour across SDKs) / I (exact JS typing, from a types.d.ts snippet) | Subagent: SDK PRs and pub.dev; agent prompt |
| 12 | Node SDK: events are buffered, exposures deduplicated per flush window, and batches posted to `{eventsApiUrl}v1/events` every 10 s or at 1,000 events. A failed batch is retried once and then dropped\[13\] | V | flagsmith-nodejs-client PR #301 |
| 13 | Flagsmith CLI **v2.0.0** (21 Aug 2026) has `flagsmith api <path>`, `feature get --json`, `eval` with reason/variant, and `flag update --weight`. The `@flagsmith/cli` npm package is at 2.0.0\[14\]\[15\]\[16\] | V | flagsmith-cli releases; npm |
| 14 | Self-host fallback: Docker Compose, then **Environment Settings > Warehouse > "Flagsmith database"** ("only meant for trying out experimentation").\[17\] Events go to `http://localhost:8000/api/v1/events/` \[17\] | V | Docker hosting docs |
| 15 | Plan availability: Flagsmith's product page says Experimentation and the managed warehouse are on "all Flagsmith SaaS plans", priced by monthly tracked users in experiments. A third-party comparison claims it is "Enterprise beta".\[18\] Flagsmith's pricing page lists the Free plan as "Up to 50,000 Requests Per Month", with extra calls starting "at $50 per million". An unfetched pricing-page snippet also lists Free as "Up to 100,000 Users in Experiments", which supports the vendor's side of the conflict | Conflict. Treat the vendor statement as primary, **but verify in the account at hour 0** | flagsmith.com experimentation page (via subagent); flagsmith.com/pricing; featureflip.io |
| 16 | Official reference experiment (Overlap): 502 enrolled, Variant_1 "winner at 84%", lift 14.9% with a 95% CI of −14.1% to 44.0%. The author kept it running and disclosed the traffic was pushed through the demo\[7\] | V | WeMakeDevs A/B blog |
| 17 | Organiser guidance: use a stable identifier (a new random value per request "reassigns everybody"), make the flag multivariate from day one,\[19\] run an A/A ("identical variations… the win probability still wanders away from 50%")\[19\] | V | WeMakeDevs "Project Ideas" blog |
| 18 | Research landscape: Santos & Becker (UKICER 2024) summarise error-message enhancement as having "weak… to insignificant" effects on student outcomes. Becker ("An Effective Approach to Enhancing Compiler Error Messages", SIGCSE '16, pp. 126–131) found "a reduced frequency of overall errors and errors per student". Denny, Luxton-Reilly & Carpenter (2014) found enhancement "appears ineffectual". Pettit, Homer & Gee (SIGCSE '17) found enhancement "shows no measurable benefit to students". Santos & Becker (arXiv 2409.18661, n=106 CS1 students) found GPT-4-generated messages beat conventional ones "in only 1 of the 6 tasks, measured by students' time-to-fix" | V | ResearchGate/ACM/arXiv/Semantic Scholar records |
| 19 | Public Track 01 repos found in search snippets (not inspected): a quiz start-screen test, a checkout-button test, a plan-builder test, a preflight test.\[20\]\[21\]\[22\]\[23\] All are UI-copy or entry-point tests | V (existence only) | GitHub search results |
| 20 | Not obtained: the verbatim "four wiring mistakes" from *How to Win Toggle Wars* (20 Nov 2026), and the exact JS events-URL option name\[24\] | Gap | Recorded as a to-verify item in the master prompt |

**Webinar:** the 23 Nov webinar\[25\] (YouTube ID `wm2mKxQDpHQ`) was **not watched**. P2 should watch it on Day 1.

## SECTION C: Fifteen distinct concepts (compact)

| # | Concept (control vs treatment) | Problem / user | Flagsmith role | Evidence potential | Solo risk | Fit |
|---|---|---|---|---|---|---|
| 1 | **Witness**: count-only vs one-counterexample autograder feedback, with transfer guardrail | Autograder/CI feedback design; ed-tech and platform devs | Triggered exposure, locked variants, Bayesian, SRM | High (contested literature, an A/A, calibration) | Low–Med | Strong |
| 2 | Raw vs plain-language regex/JSON syntax errors | Error-message DX | Same | High, but syntax errors are rare in short tasks | Med | Strong |
| 3 | Exact vs fuzzy ranking in a docs search box | Docs findability | Backend-algorithm flag | Med (needs a corpus and query traffic) | Med–High | Good |
| 4 | Empty first screen vs sample data\[2\] | Onboarding | Standard | Low novelty (it is an official example) | Low | Weak creativity |
| 5 | Upfront "~2 min" estimate vs none on a 3-step form | Form completion | Standard | Med | Very low | OK (cosmetic-adjacent) |
| 6 | Live password checklist vs post-submit error | Signup friction | Guardrail: weak-password rate | Med | Low | Good |
| 7 | Auto-retry with visible backoff vs manual retry on a flaky API | Resilience UX | Guardrail: duplicate submits | Med; flakiness is simulated | Med | OK |
| 8 | Skeleton vs spinner at equal latency | Perceived performance | Standard | Low (cosmetic) | Low | Weak |
| 9 | Worked example first vs problem first | Learning design | Standard | Med | Med | Good |
| 10 | Hint available immediately vs after 2 failures | Assistance dilemma | Transfer guardrail | High | Med | Strong |
| 11 | Copy button vs typed CLI commands in a tutorial | Docs DX | Standard | Low (success is unobservable in a browser) | High | Weak |
| 12 | Jargon vs plain-language labels on a bug-report form | Accessibility | Standard | Med (needs quality grading) | Med | OK |
| 13 | Structured vs freeform bug template | Report quality | Standard | Low (needs human grading) | High | Weak |
| 14 | Default-on vs opt-in digest | Notifications | Standard | Rejected: dark-pattern ethics | n/a | Rejected |
| 15 | 429 message with "retry after N s" countdown vs generic text in an API playground | API DX | Guardrail: request volume | Med–High | Med | Good |

## SECTION D: Weighted evaluation and top-five shortlist

**Weight adjustment.** This is a single-experiment track, so evidence quality was raised from 10% to 15% and novelty lowered from 20% to 15%. Final weights: judging alignment 25, novelty 15, impact 15, feasibility 15, evidence 15, demo 10, reuse 5. These are internal weights, not the judges' weightings.

| Concept | Align | Novel | Impact | Feasible | Evidence | Demo | Reuse | **Total /10** |
|---|---|---|---|---|---|---|---|---|
| 1 Witness | 9 | 8 | 7 | 8 | 9 | 8 | 7 | **8.2** |
| 10 Hint timing | 9 | 7 | 7 | 7 | 8 | 7 | 6 | 7.5 |
| 2 Syntax errors | 8 | 7 | 7 | 7 | 6 | 7 | 6 | 7.0 |
| 15 429 countdown | 8 | 7 | 6 | 6 | 7 | 7 | 6 | 6.8 |
| 6 Password checklist | 8 | 5 | 7 | 9 | 6 | 6 | 5 | 6.7 |

**Top-five audit (compact):**
- **1 Witness.** Weakest assumption: enough real volunteers fail at least once. Easy to satisfy, since challenge 1 is designed with an anchoring trap. Blocker: plan or beta availability. Critical path: flag, metric, experiment, triggered exposure. Minimum demo: one challenge plus both feedback arms with live exposures. MVP likelihood: high.
- **10 Hint timing.** Weakest assumption: users actually click hints. Blocker: hint content quality. MVP likelihood: medium-high.
- **2 Syntax errors.** Weakest assumption: users make enough syntax errors, but most regex failures are semantic. That gives a low trigger rate and therefore low power.
- **15 429 countdown.** Needs a rate-limited backend and a realistic reason for users to hit 429. Real traffic is unlikely to trigger it.
- **6 Password checklist.** Easy, but well trodden and close to the official example list.

## SECTION E: Deep comparison of the top three (adversarial)

| Flagsmith engineer's question | Witness | Hint timing | Syntax errors |
|---|---|---|---|
| Why should it exist? | Hidden vs disclosed failing tests is a live design choice for autograders and CI, and the literature disagrees: Santos & Becker (UKICER 2024) summarise enhancement results as "weak… to insignificant" | Assistance-dilemma tuning | Same debate, but narrower |
| Why Flagsmith? | Persistent per-identity bucketing across sessions, **triggered** exposure at the decision point, quarantine and SRM, locked variants, ship via the same flag | Same | Same |
| Already available? | Regex tutors exist (regex101, RegexOne). None is a controlled test of failing-case disclosure | Common in ITS research, rare as a flag-driven A/B | Studied academically |
| Does it work end to end? | Pure-function engine, so testable | Hint UX is fiddlier | Trigger is rare |
| Evidence | Primary + transfer guardrail + A/A + simulated calibration | Similar | Weak power |
| Better than an ordinary entry? | Not a button-copy test. It is a pre-registered, falsifiable test with a meaningful outcome either way | Yes | Partly |

**Verdict:** Witness. Hint timing is the closest rival, but it depends on voluntary hint clicks, which adds a second behavioural step and reduces power.

## SECTION F: Final selected concept and fallback

**Selected: Witness. *"Show me the failing case": a pre-registered Flagsmith experiment on autograder feedback.***

- **Hypothesis (falsifiable):** Among identities who submit at least one incorrect pattern, showing one concrete failing test case (`counterexample`) instead of a pass count (`control`) increases the share who solve both core challenges (`core_set_completed`). The predicted relative lift is at least 10% during the 26–29 Nov window, and the treatment should not lower the unaided transfer-challenge solve rate.
- **What a loss teaches:** If the treatment does not win, or wins while tripping the transfer guardrail, that is evidence for the "assistance dilemma" side of the debate: disclosure helps short-term completion but not unaided skill. Koedinger & Aleven (Educational Psychology Review, 2007) describe how to balance giving and withholding information as "a fundamental open problem in instructional science". Either way the finding bears on whether CI and autograders should reveal failing cases.

**Fallback (simpler concept): Witness-Lite.** One challenge only. Primary metric `challenge1_solved`, no transfer challenge, simulated traffic in Development, real traffic optional.
**Infrastructure fallback:** if Cloud Experimentation is unavailable on P2's plan, use self-hosted Docker with the "Flagsmith database" warehouse at `localhost:8000`.\[17\] Data would be simulated plus locally recruited volunteers (same Wi-Fi or a tunnel), and the change is declared in the README.

## SECTION G: Novelty verification and differentiation

- **Inside Flagsmith:** Flagsmith has no feedback-design experiment of this kind. Its documented example is a PayPal button.\[9\]\[26\]
- **In this hackathon:** the public Track 01 repos found are UI-copy or entry-point tests (Section B #19). Witness differs on four counts: (a) a **behavioural-learning outcome** with a **transfer guardrail**; (b) **triggered exposure**, which counts only identities who reach the moment the variants differ and so avoids diluting the result with users who never see feedback; (c) a **pre-registration** committed and tagged before the Production start; (d) **A/A plus simulated calibration** (null, positive and negative effect scenarios) showing the pipeline reports "inconclusive" when it should.
- **Externally:** regex tools teach regex but do not test feedback policy. The academic studies are classroom-scale and not flag-driven.
- **Honest limit:** the app itself is not novel. The novelty is the experiment design and its rigour.

**Why it could not be run the same way without Flagsmith's core:** stable bucketing per identity that survives reloads and return visits; exposure recorded by the same call that resolves the variant, at the trigger point; first-exposure attribution and quarantine of identities that flicker between variants; automatic SRM and collecting-data floors; variation lock during the run; environment-scoped experiments that keep simulated data out of Production; and rolling out the winner with no redeploy.\[7\]\[9\]\[27\] Rebuilding this would take an assignment service, an event pipeline, a warehouse and a stats engine.

## SECTION H: Technical and product architecture

**Name:** Witness. **Positioning:** a 5-minute regex lab that tests, with a controlled experiment, whether seeing the failing case helps you fix your code.
**User journey:** open link → consent screen (anonymous ID, events listed) → challenge 1 (ISO dates) → submit → feedback (arm-specific) → challenge 2 (semver) → challenge 3 "checkpoint" (hex colours, identical minimal feedback for everyone) → finish screen that names the arm and links to the public pre-registration.

```
Browser (static site: Vite + TypeScript, no framework)
 ├─ consent.ts ─┐
 ├─ engine/ (pure: run tests, pick first failing case)  ← unit tested
 ├─ ui/ (challenge view, feedback renderer: control | counterexample)
 └─ experiment/flagsmith.ts ── @flagsmith/flagsmith ≥12.4.0 (enableEvents)
        │ identify(vid) once after consent
        │ getExperimentFlag('feedback_style')  ← only at 1st failed core attempt (exposure)
        │ getExperimentFlag('aa_canary')       ← right after consent (A/A exposure)
        │ trackEvent(...)                      ← conversions, once-per-identity guards
        ▼
Flagsmith Cloud (Production env = real users | Development env = simulated)
 └─ managed warehouse → Bayesian results, SRM, exposures
Local operator tooling (never shipped):
 ops/*.sh  → flagsmith CLI v2 `flagsmith api …` (create/start/refresh/export, --dry-run default)
 sim/      → Playwright drives the real built app with documented behaviour model (Dev key only)
 analysis/ → Python: SRM chi-square + Beta-Binomial cross-check from exported counts
 evidence/ → exported JSON + screenshots, each with a timestamp + env label
```

**State machine (per challenge):** `idle → editing → submitted → {passed → solved | failed → feedback_shown → editing} | gave_up`. The **trigger** is the first `failed` on challenge 1 or 2. That is the only place `feedback_style` is read, so pre-trigger experience is identical in both arms and the triggered analysis stays unbiased.

**Data contracts (event names are case-sensitive and must equal the metric definitions):**

| Event | Fired when | Guard | Used by |
|---|---|---|---|
| `$flag_exposure` (SDK) | `getExperimentFlag` at the trigger | SDK and Flagsmith dedupe | Enrolment |
| `challenge1_solved` | C1 passes all tests | once per identity (localStorage) | Secondary (up) |
| `core_set_completed` | C1 and C2 both solved | once | **Primary (occurrence, up)** |
| `transfer_solved` | C3 solved | once | **Guardrail (not-decrease)** |
| `gave_up` | "Show solution" pressed on any core challenge | once | Secondary (down) |
| `feedback_render_error` | renderer throws or sees an unknown variant value | count | **Technical guardrail (not-increase)** |

**Flags:** `feedback_style` (control value `control`, variation value `counterexample`, key `counterexample`); `aa_canary` (control `control`, variation value `control_copy`, key `aa_b`, identical behaviour).
**Identity:** `wit_` + `crypto.randomUUID()` in `localStorage['witness.vid']`. No PII. Testers use the Development build only.
**Failure handling:** if Flagsmith is unreachable or the key is invalid, the default is `control` rendering, with no exposure and the app still usable. Events flush on `pagehide`.
**Security:** client-side environment key only in the bundle. Admin credentials stay in the CLI's own store or the shell environment and are never committed. CSP limits network calls to Flagsmith hosts.
**Observability:** a debug footer (Development only) shows the env, variant, inExperiment flag and queued event count. Evidence exports are timestamped.
**Limitations:** web-only, English-only, self-selected volunteers, small n, and no measure of longer-term retention.

## SECTION I: Priorities, schedule and critical path

**P0 (must work):** consent; identify; engine and 3 challenges; both feedback arms; triggered exposure; 5 events; Dev and Prod experiments created and running; simulator in Dev; README; video; results captured honestly.
**P1:** A/A canary in Prod; 3 calibration runs in Dev (δ = 0, +, −); allocation reconciliation; independent posterior and SRM script; pre-registration tag; CI; axe a11y tests.
**P2 (stretch):** dark mode; results page in the app; per-challenge attempt histograms.

| When (IST) | Work | Exit check |
|---|---|---|
| Wed 25, 21:00–23:30 | Ask organisers about submission channel and planning; Flagsmith Cloud account; **confirm the Experiments menu and managed warehouse on the plan**; CLI v2 login; scaffold repo; draft PREREGISTRATION.md | Warehouse connection exists, or switch to the self-host fallback |
| Wed 23:30 – Thu 07:00 | Sleep | — |
| Thu 26, 07:30–12:30 | **Vertical slice:** C1 + both arms + consent + identify + trigger + events against Development; Dev flag, metric and experiment; 50 simulated users | Exposures visible for both arms |
| Thu 13:30–18:00 | C2 and C3, a11y, error states, static deploy | E2E green on the deployed URL |
| Thu 18:00–20:00 | Prod metrics and experiments (`feedback_style`, `aa_canary`); **tag `prereg-v1`**; start | Status `running` |
| Thu 20:00–23:00 | Recruit volunteers (class groups and permitted community channels) | First real exposures |
| Fri 27 | Calibration runs, reconciliation, analysis script, CI, health checks (SRM only, no decisions) | TEST_REPORT.md populated |
| Sat 28 | README, evidence capture, judge Q&A, second recruitment wave, storyboard | Fresh-clone reproduction passes |
| Sun 29, 14:00 | **Data freeze:** refresh results, export, screenshots; end experiments | Evidence committed |
| Sun 14:00–17:30 | RESULTS.md, record and review video | Video under 3 min |
| Sun 17:30–18:00 | Final audit → **internal target 18:00** | Checklist complete |
| Sun 18:00–20:00 | Buffer and submission | Submitted before 20:00 |

**Critical path:** plan verification → keyed variation → trigger wiring → Prod start by Thursday evening. **Hard blockers and contingencies:** no Experimentation on the plan → self-host fallback; no submission form → Discord or organisers' instructions; low real traffic → report as inconclusive and lean on simulation for pipeline validity only.

## SECTION J: Benchmarking and testing strategy

- **Baseline comparison:** control arm (status-quo autograder feedback). For the pipeline, the simulator's ground-truth ledger compared with Flagsmith's counts.
- **Power, stated honestly:** with about 150 triggered identities per arm and a baseline near 55%, the 95% interval on the absolute difference is about ±11 percentage points. The minimum detectable effect at 80% power is about 16 points, so real-user results will likely be inconclusive unless the effect is large.
- **Stopping rule:** fixed-horizon freeze at 29 Nov 14:00 IST. No early stopping on a "win". SRM is the only stop-and-investigate trigger.
- **Decision rule (pre-registered):** roll out `counterexample` only if chance-to-beat on the primary is ≥95%, the transfer guardrail is not "losing" (≤5%), there is no SRM, and the A/A canary is inconclusive. Otherwise keep control and report.
- **Simulation model (Development only):** skill θ ~ Beta(4,4). Per-attempt fix probability p = θ·b_c, with b_count = 0.35 and b_cex = 0.35·(1+δ). Give-up hazard is 0.15 per failure. Transfer probability = θ·0.5 independent of arm, which tests that the guardrail stays neutral. Scenarios are δ ∈ {0, +0.3, −0.2} with seeds published. These parameters are **assumptions** for pipeline calibration, not behavioural claims.
- **Tests:** unit (engine, failing-case selection, invalid regex); component (both renderers); integration (Dev env: identify → `inExperiment` true → events accepted → exposures after refresh); E2E Playwright; determinism (same vid twice gives the same variant); network failure (Flagsmith hosts blocked gives control, no crash, no exposure); invalid key; axe a11y; fresh-clone build; CI.

**Traceability matrix**

| Criterion | Implementation | Evidence | Demo step |
|---|---|---|---|
| Clear hypothesis | PREREGISTRATION.md + `prereg-v1` tag | Git tag timestamp before start | Scene 2 |
| Versions behind a flag | `feedback_style` keyed MV flag | `flagsmith feature get --json` | Scene 3 |
| Metric from real events | 5 tracked events | Metric definitions, exposure panel | Scene 4 |
| Results you can explain | Prod results + interval + A/A | Screenshots, exported JSON | Scene 5 |
| Use of Flagsmith | Trigger, quarantine, SRM, lock | Dashboard plus code | Scenes 3–5 |
| Impact / Creativity | Autograder policy question | README and literature | Scenes 1, 6 |

## SECTION K: Adversarial review

| # | Weakness / failure mode | Reviewer | Correction |
|---|---|---|---|
| 1 | Experimentation is beta and plan availability is unclear | Flagsmith eng | Verify at hour 0; self-host fallback |
| 2 | Real n too small, so inconclusive | Judge | Pre-registered power statement; frame the interval as the finding |
| 3 | Triggered exposure misunderstood as bias | Flagsmith eng | Explain identical pre-trigger experience; integration test |
| 4 | Variation without a key records no exposures | Flagsmith eng | Create with `--key`; verify via `feature get --json` |
| 5 | Simulated data mistaken for evidence | Judge / user | Separate environments, labels on every artefact, README section |
| 6 | Self-testing pollutes Prod | Reliability | Dev-only build for testers; Prod key only in the release build |
| 7 | Transfer guardrail correlated with the primary | Senior eng | Report it unconditionally (pre-registered) plus a conditional descriptive analysis |
| 8 | Volunteer selection bias (CS students) | User | State the population clearly; no generalisation claims |
| 9 | Events lost on tab close | Reliability | `flushEvents` on `pagehide`; reconciliation test |
| 10 | Showing a failing case lets people overfit by hard-coding | User | C3 transfer checkpoint; held-out tests per challenge |
| 11 | Duplicate conversions | Reliability | Once-per-identity guards; occurrence metrics |
| 12 | Planning of this project by an outside advisor | Judge | Get clarification; P2 owns every decision and can explain every line |
| 13 | 50k free-plan request cap\[28\] | Reliability | Budget: ~3 requests per user; keep simulator runs under 2,000 users |

**Residual limitations:** short horizon, self-selected participants, a single task domain (regex), and a beta stats engine whose priors are not documented. The independent posterior check therefore validates the interpretation, not identical numbers.

## SECTION L: Antigravity master implementation prompt

````text
# WITNESS — MASTER IMPLEMENTATION BRIEF (Toggle Wars 2026, Track 01 "Test Something Real")

## 1. ROLE AND MISSION
You are a senior full-stack engineer and experimentation engineer working inside my (P2's) workspace in Google Antigravity. Build, verify and document "Witness": a small static web app (a regex-debugging lab) that runs ONE rigorous, pre-registered A/B experiment with Flagsmith Experimentation (beta). The experiment, not the app's size, is the product. I am a solo participant and must understand and explain everything; write code I can read.

## 2. TRACK AND OFFICIAL REQUIREMENTS (treat official pages as authoritative; re-check them)
- Hackathon: Toggle Wars (WeMakeDevs x Flagsmith). Hacking 26 Nov 2026 08:00 IST → submissions close 29 Nov 2026 20:00 IST (rules page; "Late submissions are not accepted"). My internal target: 29 Nov 18:00 IST.
- Track 01 judges want: "One experiment done well beats many features · A clear hypothesis to test · Versions behind a flag · A metric from real events · Results you can explain". General scorecard: Use of Flagsmith, Impact, Creativity, Demo video.
- Submission needs: public GitHub repo, README with setup steps and how Flagsmith is used, short demo video. Simulated traffic is allowed by the organisers.
- Sources: https://www.wemakedevs.org/hackathons/flagsmith (+ /rules, /resources, /schedule), https://www.wemakedevs.org/blogs/how-to-run-a-real-ab-test-with-flagsmith-experimentation, https://docs.flagsmith.com/experimentation (Create an Experiment, Run an Experiment, Analyse an Experiment, Statistics Glossary, Set Up with a Coding Agent), https://github.com/Flagsmith/flagsmith-cli
- OPEN ITEMS I (the human) will resolve: submission channel (the /submit page currently says registrations only) and organiser clarification on AI/centralised planning. Do not block on these.

## 3. THE EXPERIMENT (do not change without asking me)
Hypothesis: Among identities who submit at least one incorrect pattern, showing ONE concrete failing test case ("counterexample") instead of only a pass count ("control") increases the share who solve both core challenges (core_set_completed) by ≥10% relative, during 26–29 Nov 2026, without lowering the unaided transfer-challenge solve rate.
- Flag: feedback_style (multivariate). Control value "control" = count-only feedback ("5 of 8 checks passed."). Variation value "counterexample", key "counterexample" = same count line PLUS exactly one failing case: the first failing test in fixed order, phrased "`<input>` should match, but your pattern did not match it." or "`<input>` should NOT match, but your pattern matched it." Syntax errors: identical raw engine message in both arms.
- Split 50/50, rollout 100% of identities that reach the trigger.
- TRIGGERED EXPOSURE: call getExperimentFlag('feedback_style') ONLY at the first failed submission on challenge 1 or 2. Never read feedback_style any other way (no getValue/hasFeature on it). Before the trigger both arms see identical UI. Cache the returned variant in memory for the session; on later page loads call getExperimentFlag again at the next failure (deterministic bucketing returns the same variant).
- A/A canary: flag aa_canary (control "control"; variation value "control_copy", key "aa_b"; identical behaviour). Call getExperimentFlag('aa_canary') right after consent. Its experiment uses primary metric core_set_completed.
- Metrics (create per environment; names case-sensitive and identical to code):
  core_set_completed  occurrence, direction up          PRIMARY
  challenge1_solved   occurrence, up                     secondary
  gave_up             occurrence, down                   secondary
  transfer_solved     occurrence, should not decrease    GUARDRAIL
  feedback_render_error count, should not increase       TECHNICAL GUARDRAIL
- Pre-registered decision rule: roll out counterexample only if chance-to-beat-control on the primary ≥95% AND transfer_solved is not "losing" AND no SRM warning AND aa_canary is inconclusive. Otherwise keep control. Fixed-horizon freeze 29 Nov 14:00 IST; no early stop on a win; SRM = stop and investigate.
- Environments: Production = real consenting volunteers only (release build). Development = all my own testing + simulated traffic. Never send simulated traffic with the Production key.

## 4. PRODUCT SPEC
Screens: (1) Consent: what is collected (random ID in localStorage, the 5 event names, no personal data), "Start" button; declining shows the app in practice mode with NO identify, NO flag calls, NO events. (2) Challenge view ×3: title, task text, test table (input, should match yes/no), pattern input (monospace, label, aria-describedby to help), Submit (Enter key), "Show solution" (enabled after 2 failed attempts on that challenge; fires gave_up once, marks challenge unsolved, moves on), feedback region (aria-live="polite"). (3) Finish: what you solved, which arm you were in, link to the repo PREREGISTRATION.md.
Challenges (tests evaluated with new RegExp(userPattern).test(input), no flags; 8 visible tests each):
- C1 ISO date YYYY-MM-DD. Match: 2026-11-29, 1999-01-01, 2000-12-31, 2026-02-28, 2010-10-10. No match: 2026-1-29, 20261129, x2026-11-29y. (Anchoring trap is intentional.)
- C2 semantic version. Match: 2.0.0, 12.4.0, 0.1.0, 1.2.3-beta.3, 10.20.30. No match: 1.2, v1.2.3, 1.2.3.4.
- C3 CHECKPOINT (transfer), hex colour. Match: #fff, #A1B2C3, #000000, #abc. No match: #ff, #GGGGGG, fff, #abcd. Feedback here is count-only for EVERYONE.
Engine is pure TypeScript: evaluate(pattern, tests) → {ok:boolean, syntaxError?:string, passed:number, total:number, firstFailure?:{input, expected}}. Guard against catastrophic backtracking: reject patterns > 200 chars and run evaluation with a per-test timing check (if any test takes >50 ms, show "Pattern too slow" identically in both arms).
Design: system font stack for UI, ui-monospace for patterns; 8-pt spacing scale; tokens in CSS variables (--fg, --bg, --muted, --accent, --danger, --success) with WCAG AA contrast; single column max-width 720px; visible focus rings; no gradients, no animations except a 150 ms feedback fade (respect prefers-reduced-motion); empty, loading ("Connecting…" never blocks play) and error states defined; footer in Development shows env, variant, inExperiment, queued events.

## 5. ARCHITECTURE AND STACK
Static site, no backend, no database. Node.js 20+ LTS, Vite + TypeScript (vanilla), @flagsmith/flagsmith >=12.4.0 (verify latest on npm), Vitest, Playwright + @axe-core/playwright, Python 3.11+ with numpy and scipy for analysis only, Flagsmith CLI v2 (curl -fsSL https://get.flagsmith.com | sh; fallback npm i -g @flagsmith/cli). Deploy to a free static host (GitHub Pages, Netlify or Vercel) — ASK ME before any public deploy.
Repo layout:
  src/main.ts, src/consent.ts, src/engine/{evaluate.ts,challenges.ts}, src/ui/{challengeView.ts,feedback.ts,finish.ts}, src/experiment/{flagsmith.ts,events.ts,identity.ts}, src/styles.css
  ops/{lib.sh,setup-flags.sh,create-metrics.sh,create-experiment.sh,start.sh,refresh-and-export.sh} (every mutating script prints the plan and requires --apply; default is dry-run)
  sim/{model.md,simulate.ts} (Playwright drives the built app; Development key only; refuses to run if key equals PROD key)
  analysis/{verify.py,requirements.txt}
  tests/{unit,e2e}, evidence/{dev,prod}/ (timestamped JSON + PNG)
  PROJECT_SPEC.md IMPLEMENTATION_PLAN.md PROGRESS.md DECISIONS.md TEST_REPORT.md DEMO_SCRIPT.md PREREGISTRATION.md RESULTS.md README.md LICENSE (MIT) .env.example .github/workflows/ci.yml
Config: VITE_FLAGSMITH_ENV_KEY (client-side key; safe in bundle), VITE_APP_ENV (development|production). Admin API credentials only via `flagsmith login` or FLAGSMITH_API_KEY in my shell — never in the repo, never printed.

## 6. FLAGSMITH INTEGRATION (verify each signature in current docs/types before coding)
- Init: flagsmith.init({ environmentID: KEY, enableEvents: true, cacheFlags: false, ...}) — VERIFY exact option names (events URL option, defaultFlags) in the "Run an Experiment" JavaScript tab and node_modules/@flagsmith/flagsmith types. Identify once after consent: flagsmith.identify(vid).
- getExperimentFlag(featureName) is expected to be synchronous and return the flag or null, recording a $flag_exposure only when flag.experiment.inExperiment is true — VERIFY in types.d.ts. If the variant/value is missing or unknown, render control and trackEvent('feedback_render_error').
- trackEvent(name[, opts]) for the five events; VERIFY opts shape. Once-per-identity guards in localStorage for occurrence events. Call flushEvents() on pagehide/visibilitychange-hidden and on the finish screen.
- Flag/experiment setup (per environment), via CLI v2 + Admin API exactly as the official agent prompt does:
  flagsmith init --project <project> --environment <env key>
  flagsmith api api/v1/environments/<env key>/warehouse-connections/   (must not be empty; else STOP and tell me)
  flagsmith feature create feedback_style --value control --enabled
  flagsmith feature variant add feedback_style --value counterexample --key counterexample --weight 0
  flagsmith feature get feedback_style --json        (confirm the key exists — a variation without a key records no exposures)
  POST api/v1/environments/<env>/experiment-metrics/  {"name":...,"aggregation":"occurrence|count","direction":"up|down|...","definition":{"version":1,"event":"<event>"}}  (VERIFY accepted direction strings for guardrails)
  POST api/v1/environments/<env>/experiments/ {"feature":<id>,"name":...,"hypothesis":...,"metrics":[{"metric":<id>,"expected_direction":"increase"}, ...],"experiment_rollout":{"enabled":true,"rollout_percentage":100,"feature_state_value":{"type":"string","value":"control"},"multivariate_feature_state_values":[{"multivariate_feature_option":<variation id>,"percentage_allocation":50}]}}
  POST .../experiments/<id>/start/  → check status "running"
  POST .../experiments/<id>/results/refresh/ (max once per 5 min) then GET .../experiments/<id>/results/ ; save raw JSON to evidence/<env>/
  Use `flagsmith api <path> --input -` for JSON bodies. Do NOT use the MCP server to start experiments (docs: it can't).
- Locked during run: never edit feedback_style variations or weights after start. Ending an experiment freezes results permanently — only I end it, at the freeze.
- Self-host fallback (only if I say Cloud lacks Experimentation): Docker Compose from the official docs, Environment Settings > Warehouse > "Flagsmith database", API http://localhost:8000/api/v1/, events to http://localhost:8000/api/ ; document the switch in DECISIONS.md and README.

## 7. SIMULATION (Development only; documented, not tuned to win)
sim/model.md must state: skill θ~Beta(4,4); per-attempt fix probability θ·b with b_control=0.35, b_counterexample=0.35·(1+δ); give-up hazard 0.15 per failure (only after 2 failures); transfer success θ·0.5 independent of arm; scenarios δ∈{0,+0.3,−0.2}, seeds 1,2,3; N=400 users per scenario; each scenario uses a fresh experiment on the Development flag (end previous one first, with my approval) and a fresh id prefix (sim-s<δ>-<seed>-<n>). Simulated users drive the real UI through Playwright (typing pre-defined correct/incorrect patterns chosen by the model). Write a ground-truth ledger (CSV: id, arm observed in UI, events fired). Every artefact is labelled SIMULATED. The purpose is pipeline validation and calibration (does δ=0 read inconclusive?), never behavioural evidence.

## 8. MILESTONES (vertical slice first; update PROGRESS.md after each)
M0 Environment discovery: OS, git, node, npm, python, browsers, flagsmith --version (v2+), Playwright install. Record in PROGRESS.md.
M1 Vertical slice (Development): consent → identify → C1 → failing submit → trigger → both renderers → challenge1_solved event; Dev flag/metrics/experiment created and started; run 50 simulated users; refresh results; both arms show exposures. STOP and show me evidence.
M2 C2, C3, gave_up, transfer, render-error guard, flush handling, a11y, error/empty states; unit + e2e green.
M3 Production setup (dry-run first, I approve --apply), PREREGISTRATION.md finalised and git tag prereg-v1 BEFORE start; release build with Prod key; deploy after my approval; start feedback_style and aa_canary experiments.
M4 Calibration runs (3 scenarios), reconciliation (ledger counts vs Flagsmith exposures per arm must match exactly or explain why), analysis/verify.py: SRM chi-square on exposures; Beta(1,1)-Binomial Monte Carlo (200k draws) of P(B>A) and 95% interval of relative lift from Flagsmith-reported counts — labelled "independent cross-check; priors may differ from Flagsmith's".
M5 CI (lint, typecheck, vitest, build, playwright against local preview with network to Flagsmith blocked — asserts control fallback and no crash), README, RESULTS.md template, DEMO_SCRIPT.md, judge Q&A.
M6 Freeze (29 Nov 14:00 IST, I trigger): refresh, export JSON, screenshots of exposures panel, results scorecard, SRM status, A/A; fill RESULTS.md truthfully (including inconclusive/unfavourable outcomes); final audit.

## 9. TESTS AND ACCEPTANCE CRITERIA (P0 = all must pass)
- Engine unit tests: every challenge's reference solution passes 8/8; known wrong patterns yield the expected firstFailure; invalid regex returns syntaxError; >200 chars rejected.
- Renderer: control never shows an input string; counterexample shows exactly one; C3 identical for both.
- Determinism: same vid twice → same variant (integration, Development).
- Trigger: no $flag_exposure for feedback_style before first failure (inspect network requests in browser devtools/Playwright; assert payloads).
- Consent decline → zero Flagsmith network calls.
- Network blocked → app playable, control rendering, no uncaught errors in console.
- Dev experiment shows exposures in both arms and conversions after refresh; reconciliation matches ledger.
- Prod experiments running with keyed variation; prereg-v1 tag predates start time.
- axe: zero serious/critical violations on all screens; full keyboard operation.
- Fresh clone: README steps reproduce the Development pipeline end to end.
- No secrets in git history (run a secret scan, e.g. gitleaks, if available).

## 10. DOCUMENTATION
README: title; problem (autograder/CI feedback disclosure; contested research — Becker 2016 vs Denny et al. 2014; Santos & Becker 2024 LLM messages); hypothesis; design table (arms, trigger, metrics, guardrails, decision rule); exactly how Flagsmith is used (flag, keyed variation, getExperimentFlag at trigger, trackEvent, environments, results); architecture diagram; setup (prereqs, .env, ops scripts dry-run/--apply); simulation model and its limits; results split into "REAL USERS (Production)" and "SIMULATED (Development)"; A/A; screenshots; limitations; licence; third-party attribution; video link. Never mix simulated and real numbers in one figure.

## 11. DEMO (≤3 min unless rules say otherwise)
Scenes: (1) problem, 20 s; (2) hypothesis + prereg tag, 20 s; (3) live: fail C1 in each arm side by side, show feedback_style flag + exposure, 40 s; (4) metrics + exposures panel, SRM ok, 25 s; (5) results: lift, credible interval, chance to beat, A/A, honest verdict, 45 s; (6) what it means for autograders/CI + how the same flag ships the decision, 20 s. Backup: pre-recorded screen capture of scenes 3–5 and exported JSON if Flagsmith is down.

## 12. OPERATING PROTOCOL (mandatory)
A. Discover the environment; never assume installs or permissions; touch only this repo.
B. Read current official docs/types before using any API; never invent methods, flags or endpoints; when unsure, run `flagsmith <cmd> --help` or inspect node_modules types and record the finding in DECISIONS.md.
C. Maintain PROJECT_SPEC.md, IMPLEMENTATION_PLAN.md, PROGRESS.md, DECISIONS.md, TEST_REPORT.md, DEMO_SCRIPT.md — concise, factual.
D. Build incrementally; smallest vertical slice first; run build/tests after meaningful changes; fix errors, never hide them; real Flagsmith for core functionality; mocks only in clearly labelled unit tests.
E. Ask me before: public deploys, publishing, account actions, starting/ending Production experiments, any --apply against Production, deleting anything, paid services. Never submit the entry or accept terms for me. Keep secrets out of code, logs and git; provide .env.example.
F. Verify in the browser and terminal: console errors, network payloads, button behaviour, Flagsmith state before/after operations (feature get --json, experiment status). Capture truthful evidence only.
G. At each milestone record: implemented, verified, commands run, remaining work, blockers, next action. If context resets, resume from these files.
H. Do not stop at scaffolding; do not claim completion until all P0 criteria pass; if blocked by credentials or a missing capability, state the exact human action needed and continue with unblocked work. Never fabricate logs, screenshots, statistics or results.
I. Produce WALKTHROUGH.md: what each module does, why this architecture, how Flagsmith is integrated, how to reproduce, what could fail, and 12 likely judge questions with accurate answers (e.g. why triggered exposure is unbiased; why Bayesian peeking is acceptable here but the stop rule is still fixed; what quarantine and SRM mean; why simulated results are not evidence of behaviour).

## 13. FINAL AUDIT CHECKLIST
[ ] All P0 tests pass and are recorded in TEST_REPORT.md  [ ] Both Prod experiments ran with keyed variations  [ ] prereg-v1 predates start  [ ] Results exported + screenshots dated  [ ] Real vs simulated clearly separated  [ ] README complete with setup and Flagsmith usage  [ ] No secrets in repo  [ ] Licence + attributions  [ ] Video recorded, reviewed, linked  [ ] I can explain every module.
````

## SECTION M: Models, setup and participant actions

- **Models:** I could not independently verify the "Gemini 4 Hydrogen" naming; this package treats it as the user's description of their Antigravity access. Use the highest-reasoning tier for M0–M1 and for reviewing the statistics and PREREGISTRATION.md. Use the standard high tier for UI and test work. If outputs on Flagsmith APIs disagree, re-check against the docs instead of switching models.
- **P2's manual actions:** register on WeMakeDevs; create a Flagsmith Cloud account and project with Development and Production environments; confirm the Experiments menu and managed warehouse; install CLI v2 and run `flagsmith login`; supply the client-side keys; approve Production `--apply`, the deploy and experiment start/end; recruit volunteers ethically (with consent, without spamming); record the video; submit.
- **Credentials needed:** Flagsmith account (OAuth via CLI), two client-side environment keys, GitHub, static-host account.

## SECTION N: Progression status

| Participant | Track | Status |
|---|---|---|
| **P2** | 01 Test Something Real | **Complete (this response)** |
| P4 | 03 Build on Open Source Flagsmith | Next, on PROCEED |
| P3 | 02 AI Agents and Feature Flags | After P4 |
| P1 | 04 Flagsmith Agent Skills | Last |

Constraints carried forward: official rules override the brief; deadline 29 Nov 20:00 IST, internal target 18:00; independent ownership; organiser clarification on centralised planning still pending; no cross-participant code sharing. Note for P1: the official WeMakeDevs page lists only **three** tracks (01–03).\[29\] Track 04 "Flagsmith Agent Skills" was not found on the official pages and must be verified before P1's package.

## Sources

1. [WeMakeDevs on X: "What makes a winning Toggle Wars project? 🏆 Whichever track you pick, every project is judged on the same four things: 🚩 Use of Flagsmith: your flags and experiments should do real work in the project 🎯 Impact: it solves a real problem that a developer or team would use 💡 Cr… / X](https://x.com/WeMakeDevs/status/2121832660742148424)
2. [Toggle Wars: The Flagsmith Experimentation Hackathon | WeMakeDevs](https://www.wemakedevs.org/hackathons/flagsmith)
3. [Rules](https://www.wemakedevs.org/hackathons/flagsmith/rules)
4. [Submit a project](https://www.wemakedevs.org/hackathons/flagsmith/submit)
5. [Experimentation](https://docs.flagsmith.com/experimentation)
6. [Create an Experiment](https://docs.flagsmith.com/experimentation/create-an-experiment)
7. [How to Run a Real A/B Test With Flagsmith Experimentation](https://www.wemakedevs.org/blogs/how-to-run-a-real-ab-test-with-flagsmith-experimentation)
8. [Basic Flag Management](https://docs.flagsmith.com/managing-flags/core-management)
9. [Statistics Glossary](https://docs.flagsmith.com/experimentation/statistics)
10. [Set Up an Experiment with a Coding Agent](https://docs.flagsmith.com/experimentation/set-up-with-a-coding-agent)
11. [deps: update dependency flagsmith/sdk-spec to v0.7.0 by renovate\[bot\] · Pull Request #93 · Flagsmith/flagsmith-kotlin-android-client · GitHub](https://github.com/Flagsmith/flagsmith-kotlin-android-client/pull/93)
12. [flagsmith](https://pub.dev/packages/flagsmith)
13. [feat: experimentation support by Zaimwa9 · Pull Request #301 · Flagsmith/flagsmith-nodejs-client · GitHub](https://github.com/Flagsmith/flagsmith-nodejs-client/pull/301)
14. [Releases · Flagsmith/flagsmith-cli · GitHub](https://github.com/Flagsmith/flagsmith-cli/releases)
15. [flagsmith-cli command - github.com/Flagsmith/flagsmith-cli/v2 - Go Packages](https://pkg.go.dev/github.com/Flagsmith/flagsmith-cli/v2)
16. [flagsmith/cli](https://www.npmjs.com/package/@flagsmith/cli)
17. [Docker](https://docs.flagsmith.com/deployment-self-hosting/hosting-guides/docker)
18. [Flagsmith Pricing 2026: What API Metering Actually Costs](https://featureflip.io/compare/featureflip-vs-flagsmith/)
19. [Toggle Wars: Project Ideas, and Getting Flagsmith Running Today](https://www.wemakedevs.org/blogs/toggle-wars-project-ideas-and-getting-started)
20. [GitHub - Your-high-lord/asir-infra-flagsmith-experiment: ASIR.INFRA Remote Linux Preflight Flagsmith Experiment · GitHub](https://github.com/Your-high-lord/asir-infra-flagsmith-experiment)
21. [GitHub - mitulkheni/guess-the-output: A JavaScript quiz that A/B tests its own start screen with Flagsmith Experimentation. Toggle Wars hackathon, Track 01. · GitHub](https://github.com/mitulkheni/guess-the-output)
22. [GitHub - vineeta07/flagsmith · GitHub](https://github.com/vineeta07/flagsmith)
23. [GitHub - TUMO-MOGAME/heirloom-toggle-wars: Heirloom x Flagsmith: a real A/B test on a family inheritance planner (Toggle Wars, WeMakeDevs, Track 01) · GitHub](https://github.com/TUMO-MOGAME/heirloom-toggle-wars)
24. [post: how to win toggle wars by aayush-wemakedevs · Pull Request #7 · WeMakeDevs/blogs · GitHub](https://github.com/WeMakeDevs/blogs/pull/7)
25. [Schedule](https://www.wemakedevs.org/hackathons/flagsmith/schedule)
26. [A/B Testing with Integrations](https://docs.flagsmith.com/experimentation-ab-testing)
27. [Feature Flag A/B Testing & Experimentation Platform](https://www.flagsmith.com/feature/experimentation-platform)
28. [Flagsmith vs GrowthBook: A Detailed Comparison](https://www.flagsmith.com/compare/flagsmith-vs-growthbook)
29. [WeMakeDevs on X: "This month, your next side project could win you a PS5 + GTA 6 bundle! 🎮 Toggle Wars is a four-day online hackathon happening from November 26–29, where you’ll build with @GetFlagsmith and put your ideas to the test. Choose your track: 💰 Test Something Real: \$2,000 🤖 AI Agent… / X](https://x.com/WeMakeDevs/status/2119681905851547859)
