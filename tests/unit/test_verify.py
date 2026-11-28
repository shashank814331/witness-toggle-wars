import json
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "analysis"))

from verify import (
    ArmSummary,
    analyze_counts,
    evaluate_srm,
    extract_counts_from_flagsmith_json,
    reconcile_exposures,
)


class VerifyStatsTests(unittest.TestCase):
    def test_null_effect_reads_inconclusive_without_srm(self) -> None:
        report = analyze_counts(
            control=ArmSummary(exposures=150, conversions=82),
            treatment=ArmSummary(exposures=150, conversions=82),
            draws=50_000,
        )
        self.assertFalse(report.srm_alert)
        self.assertGreater(report.srm_p_value, 0.99)
        self.assertEqual(report.verdict, "inconclusive")

    def test_positive_lift_reads_winning(self) -> None:
        report = analyze_counts(
            control=ArmSummary(exposures=150, conversions=60),
            treatment=ArmSummary(exposures=150, conversions=105),
            draws=50_000,
        )
        self.assertGreaterEqual(report.prob_b_beats_a, 0.95)
        self.assertEqual(report.verdict, "winning")

    def test_srm_triggers_on_imbalanced_exposures(self) -> None:
        _, p_val, alert = evaluate_srm(200, 100)
        self.assertTrue(alert)
        self.assertLess(p_val, 0.001)

    def test_extracts_flagsmith_json_and_reconciles_ledger(self) -> None:
        sample = {
            "variants": [
                {
                    "variant": "control",
                    "exposures": 200,
                    "metrics": {"core_set_completed": {"conversions": 110}},
                },
                {
                    "variant": "counterexample",
                    "exposures": 200,
                    "metrics": {"core_set_completed": {"conversions": 124}},
                },
            ]
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            json_path = Path(tmp_dir) / "results.json"
            json_path.write_text(json.dumps(sample), encoding="utf-8")
            parsed = extract_counts_from_flagsmith_json(json_path)

        ledger = {
            "control": ArmSummary(exposures=200, conversions=110),
            "counterexample": ArmSummary(exposures=199, conversions=124),
        }
        rec = reconcile_exposures(ledger, parsed)
        self.assertFalse(rec["matched_exactly"])
        self.assertEqual(rec["control_delta"], 0)
        self.assertEqual(rec["counterexample_delta"], 1)

    def test_extracts_live_flagsmith_cloud_nested_payload(self) -> None:
        cloud_sample = {
            "metric_definitions": [
                {"metric": 1482, "metric_name": "core_set_completed"},
                {"metric": 1483, "metric_name": "challenge1_solved"},
            ],
            "results": {
                "payload": {
                    "metrics": [
                        {
                            "metric_id": 1482,
                            "variants": {
                                "control": {"n": 48, "sum": 14.0},
                                "counterexample": {"n": 52, "sum": 22.0},
                            },
                        },
                        {
                            "metric_id": 1483,
                            "variants": {
                                "control": {"n": 48, "sum": 30.0},
                                "counterexample": {"n": 52, "sum": 38.0},
                            },
                        },
                    ],
                    "exposures_timeseries": {"points": []},
                }
            },
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            json_path = Path(tmp_dir) / "cloud_results.json"
            json_path.write_text(json.dumps(cloud_sample), encoding="utf-8")
            parsed = extract_counts_from_flagsmith_json(json_path, "core_set_completed")

        self.assertEqual(parsed["control"], ArmSummary(exposures=48, conversions=14))
        self.assertEqual(parsed["counterexample"], ArmSummary(exposures=52, conversions=22))

    def test_cloud_payload_defaults_unpopulated_arm_to_zero(self) -> None:
        cloud_single = {
            "metric_definitions": [{"metric": 1714, "metric_name": "core_set_completed"}],
            "results": {
                "payload": {
                    "metrics": [
                        {
                            "metric_id": 1714,
                            "variants": {"counterexample": {"n": 3, "sum": 3.0}},
                        }
                    ],
                    "exposures_timeseries": {"points": []},
                }
            },
        }
        with tempfile.TemporaryDirectory() as tmp_dir:
            json_path = Path(tmp_dir) / "single_arm.json"
            json_path.write_text(json.dumps(cloud_single), encoding="utf-8")
            parsed = extract_counts_from_flagsmith_json(json_path, "core_set_completed")

        self.assertEqual(parsed["control"], ArmSummary(exposures=0, conversions=0))
        self.assertEqual(parsed["counterexample"], ArmSummary(exposures=3, conversions=3))


if __name__ == "__main__":
    unittest.main()
