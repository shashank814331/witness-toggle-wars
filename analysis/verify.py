"""Independent Bayesian Beta(1,1)-Binomial, SRM & ledger reconciliation for Witness.

NOTE: Independent cross-check; priors may differ from Flagsmith's built-in
Bayesian engine. Never mix SIMULATED Development data with Production data.
"""

from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
from scipy.stats import chisquare


@dataclass(frozen=True)
class ArmSummary:
    exposures: int
    conversions: int


@dataclass(frozen=True)
class AnalysisReport:
    srm_chi2: float
    srm_p_value: float
    srm_alert: bool
    prob_b_beats_a: float
    rel_lift_median: float
    rel_lift_ci95: tuple[float, float]
    verdict: str
    note: str = "independent cross-check; priors may differ from Flagsmith's"


def evaluate_srm(n_control: int, n_treatment: int) -> tuple[float, float, bool]:
    """Run a 50/50 chi-square SRM test on triggered exposures."""
    total = n_control + n_treatment
    if total == 0:
        return 0.0, 1.0, False
    expected = total / 2.0
    stat, p_val = chisquare([n_control, n_treatment], f_exp=[expected, expected])
    alert = total >= 100 and float(p_val) < 0.001
    return float(stat), float(p_val), alert


def beta_binomial_posterior(
    control: ArmSummary,
    treatment: ArmSummary,
    draws: int = 200_000,
    seed: int = 20261126,
) -> tuple[float, float, tuple[float, float]]:
    """Compute P(B > A) and 95% relative-lift CI via Beta(1,1) Monte Carlo."""
    rng = np.random.default_rng(seed)
    alpha_a = 1 + control.conversions
    beta_a = 1 + max(0, control.exposures - control.conversions)
    alpha_b = 1 + treatment.conversions
    beta_b = 1 + max(0, treatment.exposures - treatment.conversions)

    samples_a = rng.beta(alpha_a, beta_a, size=draws)
    samples_b = rng.beta(alpha_b, beta_b, size=draws)

    prob_b_beats_a = float(np.mean(samples_b > samples_a))
    rel_lift = (samples_b - samples_a) / np.maximum(samples_a, 1e-12)
    median_lift = float(np.median(rel_lift))
    ci_low, ci_high = np.percentile(rel_lift, [2.5, 97.5])
    return prob_b_beats_a, median_lift, (float(ci_low), float(ci_high))


def analyze_counts(
    control: ArmSummary,
    treatment: ArmSummary,
    draws: int = 200_000,
    seed: int = 20261126,
) -> AnalysisReport:
    """Run SRM + Beta-Binomial posterior analysis on arm counts."""
    chi2, p_val, alert = evaluate_srm(control.exposures, treatment.exposures)
    prob_b, med_lift, ci95 = beta_binomial_posterior(
        control, treatment, draws=draws, seed=seed
    )

    if alert:
        verdict = "stop_and_investigate_srm"
    elif prob_b >= 0.95:
        verdict = "winning"
    elif prob_b <= 0.05:
        verdict = "losing"
    else:
        verdict = "inconclusive"

    return AnalysisReport(
        srm_chi2=chi2,
        srm_p_value=p_val,
        srm_alert=alert,
        prob_b_beats_a=prob_b,
        rel_lift_median=med_lift,
        rel_lift_ci95=ci95,
        verdict=verdict,
    )


def summarize_ledger(csv_path: Path) -> dict[str, ArmSummary]:
    """Summarize simulated ledger CSV counts by observed arm."""
    counts = {"control": [0, 0], "counterexample": [0, 0]}
    with csv_path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            arm = row.get("arm_observed", "")
            if arm not in counts:
                continue
            counts[arm][0] += 1
            if row.get("core_set_completed") == "true":
                counts[arm][1] += 1
    return {
        arm: ArmSummary(exposures=vals[0], conversions=vals[1])
        for arm, vals in counts.items()
    }


def extract_counts_from_flagsmith_json(
    json_path: Path,
    metric_name: str = "core_set_completed",
) -> dict[str, ArmSummary]:
    """Extract control vs treatment exposures and metric conversions from Flagsmith results JSON."""
    data = json.loads(json_path.read_text(encoding="utf-8"))
    arms: dict[str, ArmSummary] = {}

    variants = data.get("variants") or data.get("results") or []
    for entry in variants:
        key = str(entry.get("variant") or entry.get("name") or "").lower()
        exposures = int(entry.get("exposures") or entry.get("sample_size") or 0)
        conversions = int(entry.get("conversions") or 0)

        metrics = entry.get("metrics")
        if isinstance(metrics, dict) and metric_name in metrics:
            conversions = int(metrics[metric_name].get("conversions") or conversions)
        elif isinstance(metrics, list):
            for item in metrics:
                if item.get("name") == metric_name:
                    conversions = int(item.get("conversions") or conversions)

        label = "control" if "control" in key and "copy" not in key else "counterexample"
        arms[label] = ArmSummary(exposures=exposures, conversions=conversions)

    if "control" not in arms or "counterexample" not in arms:
        raise ValueError(f"Could not parse both arms from {json_path}")
    return arms


def reconcile_exposures(
    ledger: dict[str, ArmSummary],
    flagsmith: dict[str, ArmSummary],
) -> dict[str, Any]:
    """Compare simulated ledger exposures against Flagsmith reported exposures."""
    ctrl_diff = flagsmith["control"].exposures - ledger["control"].exposures
    treat_diff = flagsmith["counterexample"].exposures - ledger["counterexample"].exposures
    return {
        "matched_exactly": ctrl_diff == 0 and treat_diff == 0,
        "control_delta": ctrl_diff,
        "counterexample_delta": treat_diff,
    }


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Witness independent stats check")
    parser.add_argument("--control-n", type=int)
    parser.add_argument("--control-conv", type=int)
    parser.add_argument("--treat-n", type=int)
    parser.add_argument("--treat-conv", type=int)
    parser.add_argument("--ledger-csv", type=Path)
    parser.add_argument("--results-json", type=Path)
    parser.add_argument("--metric-name", default="core_set_completed")
    parser.add_argument("--draws", type=int, default=200_000)
    return parser


def main() -> None:
    args = _build_parser().parse_args()
    ledger_summary = summarize_ledger(args.ledger_csv) if args.ledger_csv is not None else None
    json_summary = (
        extract_counts_from_flagsmith_json(args.results_json, args.metric_name)
        if args.results_json is not None
        else None
    )

    if json_summary is not None:
        ctrl = json_summary["control"]
        treat = json_summary["counterexample"]
        source = f"Flagsmith export ({args.results_json})"
    elif ledger_summary is not None:
        ctrl = ledger_summary["control"]
        treat = ledger_summary["counterexample"]
        source = f"SIMULATED ledger ({args.ledger_csv})"
    elif (
        args.control_n is not None
        and args.control_conv is not None
        and args.treat_n is not None
        and args.treat_conv is not None
    ):
        ctrl = ArmSummary(exposures=args.control_n, conversions=args.control_conv)
        treat = ArmSummary(exposures=args.treat_n, conversions=args.treat_conv)
        source = "explicit counts"
    else:
        raise SystemExit(
            "Provide --results-json, --ledger-csv, or all four count flags."
        )

    report = analyze_counts(ctrl, treat, draws=args.draws)
    payload: dict[str, Any] = {
        "source": source,
        "control": {"exposures": ctrl.exposures, "conversions": ctrl.conversions},
        "counterexample": {"exposures": treat.exposures, "conversions": treat.conversions},
        "srm_chi2": round(report.srm_chi2, 4),
        "srm_p_value": round(report.srm_p_value, 6),
        "srm_alert": report.srm_alert,
        "prob_b_beats_a": round(report.prob_b_beats_a, 4),
        "rel_lift_median": round(report.rel_lift_median, 4),
        "rel_lift_ci95": [round(report.rel_lift_ci95[0], 4), round(report.rel_lift_ci95[1], 4)],
        "verdict": report.verdict,
        "note": report.note,
    }
    if ledger_summary is not None and json_summary is not None:
        payload["reconciliation"] = reconcile_exposures(ledger_summary, json_summary)
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
