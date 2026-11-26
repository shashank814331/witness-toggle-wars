import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "analysis"))

from verify import ArmSummary, analyze_counts, evaluate_srm


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


if __name__ == "__main__":
    unittest.main()
