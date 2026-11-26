# Recruitment Kit — Witness (Toggle Wars 2026, Track 01)

## Two-Line Invitation (Copy-Paste Ready)

> **Help test autograder feedback in 5 minutes (18+ only):**  
> Solve 3 short regex challenges in an anonymous, no-personal-data Flagsmith experiment — with a consent choice before any tracking starts: **\<LIVE\_VERCEL\_URL\>**

---

## Pre-Share Checklist

- [x] Consent screen states **18+ only** and **no personal data is collected** (`src/consent.ts`).
- [x] Practice Mode (`Practice Without Tracking`) sends zero Flagsmith requests.
- [ ] Replace `<LIVE_VERCEL_URL>` above with your deployed Vercel URL.
- [ ] Generate the QR code PNG locally once the live URL is ready:

```bash
python ops/make_qr.py --url "<LIVE_VERCEL_URL>" --out recruitment-qr.png
```
