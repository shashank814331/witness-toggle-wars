from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "ops"))

from make_qr import generate_qr_png


class QrGeneratorTests(unittest.TestCase):
    def test_generates_valid_png_for_vercel_url(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out_path = Path(tmp) / "recruitment-qr.png"
            result = generate_qr_png("https://witness-toggle-wars.vercel.app", out_path)
            self.assertTrue(result.exists())
            header = result.read_bytes()[:8]
            self.assertEqual(header, b"\x89PNG\r\n\x1a\n")


if __name__ == "__main__":
    unittest.main()
