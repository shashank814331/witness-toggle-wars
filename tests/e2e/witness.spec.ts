import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { CHALLENGES } from '../../src/engine/challenges';
import { startStaticServer, type StaticServerHandle } from './staticServer';

let server: StaticServerHandle;

test.beforeAll(async () => {
  server = await startStaticServer('.tmp-e2e-dist');
});

test.afterAll(async () => {
  await server.close();
});

interface RecordedEvent {
  readonly event: string;
  readonly feature_name: string | null;
  readonly identifier: string | null;
  readonly value: string | null;
}

async function mockFlagsmith(
  page: Page,
  variant: 'control' | 'counterexample',
): Promise<{
  readonly flagRequests: string[];
  readonly events: RecordedEvent[];
}> {
  const flagRequests: string[] = [];
  const events: RecordedEvent[] = [];

  await page.route('https://edge.api.flagsmith.com/**', async (route) => {
    const url = route.request().url();
    flagRequests.push(url);
    const parsed = new URL(url);
    const identifier = parsed.searchParams.get('identifier') ?? 'anonymous';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        identifier,
        traits: [],
        flags: [
          {
            enabled: true,
            feature_state_value: variant,
            variant,
            feature: { id: 10, name: 'feedback_style' },
            metadata: {
              experiment: { id: 101, name: 'witness_feedback_style_dev', in_experiment: true },
            },
          },
          {
            enabled: true,
            feature_state_value: 'control',
            variant: 'control',
            feature: { id: 11, name: 'aa_canary' },
            metadata: {
              experiment: { id: 102, name: 'witness_aa_canary_dev', in_experiment: true },
            },
          },
        ],
      }),
    });
  });

  await page.route('https://events.api.flagsmith.com/**', async (route) => {
    const postData = route.request().postData();
    if (postData !== null) {
      const body = JSON.parse(postData) as { events?: RecordedEvent[] };
      if (Array.isArray(body.events)) {
        events.push(...body.events);
      }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' });
  });

  return { flagRequests, events };
}

test.describe('Witness E2E, Flagsmith Triggers & Accessibility', () => {
  test('Practice Without Tracking makes zero Flagsmith requests', async ({ page }) => {
    let flagsmithHits = 0;
    await page.route('**/*flagsmith.com/**', async (route) => {
      flagsmithHits += 1;
      await route.abort();
    });

    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.goto(server.url);
    await page.getByRole('button', { name: 'Practice Without Tracking' }).click();

    await page.getByLabel('Regular expression pattern').fill('^\\d{4}-\\d{1,2}-\\d{2}$');
    await page.getByRole('button', { name: 'Check pattern' }).click();
    await expect(page.getByRole('status')).toContainText('7 of 8 checks passed.');
    await expect(page.getByRole('status')).not.toContainText('2026-1-29');

    for (const challenge of CHALLENGES) {
      await page.getByLabel('Regular expression pattern').fill(challenge.referenceSolution);
      await page.getByRole('button', { name: 'Check pattern' }).click();
      await page.getByRole('button', { name: 'Continue' }).click();
    }

    await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
    await expect(page.locator('#app')).toContainText('Practice Without Tracking');
    expect(flagsmithHits).toBe(0);
    expect(pageErrors).toHaveLength(0);
  });

  test('triggers feedback_style only on first failure and sends exact events in counterexample arm', async ({
    page,
  }) => {
    const recorded = await mockFlagsmith(page, 'counterexample');

    await page.goto(server.url);
    await page.getByRole('button', { name: 'Start Experiment' }).click();
    await expect(page.getByRole('heading', { name: /Challenge 1/ })).toBeVisible();

    // Wait briefly for initial identify + aa_canary fetch
    await expect.poll(() => recorded.flagRequests.length).toBeGreaterThanOrEqual(1);

    // Confirm feedback_style has NOT been exposed before the first failed submit
    await page.evaluate(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await expect
      .poll(() =>
        recorded.events.some((e) => e.event === '$flag_exposure' && e.feature_name === 'aa_canary'),
      )
      .toBe(true);
    expect(
      recorded.events.some(
        (e) => e.event === '$flag_exposure' && e.feature_name === 'feedback_style',
      ),
    ).toBe(false);

    // Fail C1 once -> triggers feedback_style exposure and shows counterexample
    await page.getByLabel('Regular expression pattern').fill('^\\d{4}-\\d{1,2}-\\d{2}$');
    await page.getByLabel('Regular expression pattern').press('Enter');
    await expect(page.getByRole('status')).toContainText('7 of 8 checks passed.');
    await expect(page.getByRole('status')).toContainText('`2026-1-29` should NOT match');

    // Solve C1 & C2
    const c1 = CHALLENGES[0];
    const c2 = CHALLENGES[1];
    const c3 = CHALLENGES[2];
    if (c1 === undefined || c2 === undefined || c3 === undefined) {
      throw new Error('Challenges missing');
    }

    await page.getByLabel('Regular expression pattern').fill(c1.referenceSolution);
    await page.getByRole('button', { name: 'Check pattern' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByLabel('Regular expression pattern').fill(c2.referenceSolution);
    await page.getByRole('button', { name: 'Check pattern' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Fail C3 checkpoint -> must show count-only even in counterexample arm
    await page.getByLabel('Regular expression pattern').fill('^#[0-9A-Fa-f]+$');
    await page.getByRole('button', { name: 'Check pattern' }).click();
    await expect(page.getByRole('status')).toContainText('6 of 8 checks passed.');
    await expect(page.getByRole('status')).not.toContainText('#ff');
    await expect(page.getByRole('status')).not.toContainText('#abcd');

    await page.getByLabel('Regular expression pattern').fill(c3.referenceSolution);
    await page.getByRole('button', { name: 'Check pattern' }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
    await expect(page.locator('#app')).toContainText('counterexample');

    await expect.poll(() => recorded.events.map((e) => e.event)).toContain('transfer_solved');
    const eventNames = recorded.events.map((e) => e.event);
    expect(eventNames).toContain('challenge1_solved');
    expect(eventNames).toContain('core_set_completed');
    expect(eventNames).toContain('transfer_solved');
    expect(
      recorded.events.some(
        (e) => e.event === '$flag_exposure' && e.feature_name === 'feedback_style',
      ),
    ).toBe(true);
  });

  test('control arm hides failing case and Show solution unlocks after 2 failures', async ({
    page,
  }) => {
    const recorded = await mockFlagsmith(page, 'control');

    await page.goto(server.url);
    await page.getByRole('button', { name: 'Start Experiment' }).click();

    const showSolution = page.getByRole('button', { name: 'Show solution' });
    await expect(showSolution).toBeDisabled();

    await page.getByLabel('Regular expression pattern').fill('^\\d{4}-\\d{1,2}-\\d{2}$');
    await page.getByRole('button', { name: 'Check pattern' }).click();
    await expect(page.getByRole('status')).toContainText('7 of 8 checks passed.');
    await expect(page.getByRole('status')).not.toContainText('2026-1-29');
    await expect(showSolution).toBeDisabled();

    await page.getByRole('button', { name: 'Check pattern' }).click();
    await expect(showSolution).toBeEnabled();
    await showSolution.click();

    await expect(page.locator('#app')).toContainText('Reference solution');
    await page.getByRole('button', { name: 'Next challenge' }).click();
    await expect(page.getByRole('heading', { name: /Challenge 2/ })).toBeVisible();

    await page.evaluate(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    await expect.poll(() => recorded.events.map((e) => e.event)).toContain('gave_up');
  });

  test('remains playable in control fallback when Flagsmith hosts are blocked', async ({
    page,
  }) => {
    await page.route('**/*flagsmith.com/**', async (route) => {
      await route.abort();
    });

    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.goto(server.url);
    await page.getByRole('button', { name: 'Start Experiment' }).click();
    await page.getByLabel('Regular expression pattern').fill('^\\d{4}-\\d{1,2}-\\d{2}$');
    await page.getByRole('button', { name: 'Check pattern' }).click();
    await expect(page.getByRole('status')).toContainText('7 of 8 checks passed.');
    await expect(page.getByRole('status')).not.toContainText('2026-1-29');

    for (const challenge of CHALLENGES) {
      await page.getByLabel('Regular expression pattern').fill(challenge.referenceSolution);
      await page.getByRole('button', { name: 'Check pattern' }).click();
      await page.getByRole('button', { name: 'Continue' }).click();
    }

    await expect(page.getByRole('heading', { name: 'Session complete' })).toBeVisible();
    expect(pageErrors).toHaveLength(0);
  });

  test('passes axe WCAG accessibility checks with zero serious/critical violations', async ({
    page,
  }) => {
    await mockFlagsmith(page, 'counterexample');
    await page.goto(server.url);

    const consentResults = await new AxeBuilder({ page }).analyze();
    const seriousConsent = consentResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(seriousConsent).toEqual([]);

    await page.getByRole('button', { name: 'Start Experiment' }).click();
    await page.getByLabel('Regular expression pattern').fill('^\\d{4}-\\d{1,2}-\\d{2}$');
    await page.getByRole('button', { name: 'Check pattern' }).click();
    await expect(page.locator('.feedback-box')).toHaveCSS('opacity', '1');

    const challengeResults = await new AxeBuilder({ page }).analyze();
    const seriousChallenge = challengeResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(seriousChallenge).toEqual([]);

    for (const challenge of CHALLENGES) {
      await page.getByLabel('Regular expression pattern').fill(challenge.referenceSolution);
      await page.getByRole('button', { name: 'Check pattern' }).click();
      await page.getByRole('button', { name: 'Continue' }).click();
    }

    const finishResults = await new AxeBuilder({ page }).analyze();
    const seriousFinish = finishResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(seriousFinish).toEqual([]);
  });

  test('preserves deterministic identity and variant across reload', async ({ page }) => {
    const recorded = await mockFlagsmith(page, 'counterexample');

    await page.goto(server.url);
    await page.evaluate(() => {
      window.localStorage.setItem('witness.vid', 'wit_determinism_test_1');
    });
    await page.getByRole('button', { name: 'Start Experiment' }).click();
    await expect.poll(() => recorded.flagRequests.length).toBeGreaterThanOrEqual(1);
    await page.getByLabel('Regular expression pattern').fill('^\\d{4}-\\d{1,2}-\\d{2}$');
    await page.getByRole('button', { name: 'Check pattern' }).click();
    await expect(page.getByRole('status')).toContainText('`2026-1-29` should NOT match');

    await page.reload();
    await page.getByRole('button', { name: 'Start Experiment' }).click();
    await page.getByLabel('Regular expression pattern').fill('^\\d{4}-\\d{1,2}-\\d{2}$');
    await page.getByRole('button', { name: 'Check pattern' }).click();
    await expect(page.getByRole('status')).toContainText('`2026-1-29` should NOT match');

    const requestedIds = recorded.flagRequests.map((u) =>
      new URL(u).searchParams.get('identifier'),
    );
    expect(requestedIds.every((id) => id === 'wit_determinism_test_1')).toBe(true);
  });

  test('rejects >200-char pattern cleanly and handles 401 invalid key in control fallback', async ({
    page,
  }) => {
    await page.route('**/*flagsmith.com/**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: '{"detail":"Invalid environment key"}',
      });
    });

    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err);
    });

    await page.goto(server.url);
    await page.getByRole('button', { name: 'Start Experiment' }).click();

    await page.getByLabel('Regular expression pattern').fill('a'.repeat(205));
    await page.getByRole('button', { name: 'Check pattern' }).click();
    await expect(page.getByRole('status')).toContainText('maximum length of 200');

    await page.getByLabel('Regular expression pattern').fill('^\\d{4}-\\d{1,2}-\\d{2}$');
    await page.getByRole('button', { name: 'Check pattern' }).click();
    await expect(page.getByRole('status')).toContainText('7 of 8 checks passed.');
    await expect(page.getByRole('status')).not.toContainText('2026-1-29');
    expect(pageErrors).toHaveLength(0);
  });
});
