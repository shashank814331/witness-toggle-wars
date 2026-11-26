## What

<!-- Brief summary of changes -->

## Why

<!-- Link to module or experiment requirement -->

## How Tested

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test:unit`
- [ ] `npm run build`
- [ ] `npm run test:e2e` (if UI/SDK touched)

## Experiment & Security Checklist

- [ ] No secrets or `FLAGSMITH_API_KEY` values added
- [ ] `Development` vs `Production` env keys kept strictly separate
- [ ] Triggered exposure & case-sensitive event names verified
- [ ] Zero references to unrelated accounts; repo targets `shashank814331` only

## Risks & Rollback

<!-- Revert branch/commit instructions -->
