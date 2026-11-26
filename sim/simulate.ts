import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { Browser, Page } from 'playwright';
import { CHALLENGES } from '../src/engine/challenges';

export interface SimCliConfig {
  readonly delta: number;
  readonly seed: number;
  readonly count: number;
  readonly mockLocal: boolean;
  readonly devKey: string;
  readonly prodKey: string;
  readonly appEnv: string;
}

export interface LedgerRow {
  readonly id: string;
  readonly scenario: string;
  readonly seed: number;
  readonly theta: number;
  readonly armObserved: 'control' | 'counterexample' | 'unknown';
  readonly c1Solved: boolean;
  readonly c2Solved: boolean;
  readonly coreSetCompleted: boolean;
  readonly transferSolved: boolean;
  readonly gaveUp: boolean;
  readonly label: 'SIMULATED';
}

export const B_CONTROL = 0.35;
const GIVE_UP_HAZARD = 0.15;
const MAX_ATTEMPTS = 12;

export interface InMemorySimOutcome {
  readonly arm: 'control' | 'counterexample';
  readonly coreSetCompleted: boolean;
  readonly transferSolved: boolean;
}

/**
 * Pure simulation helper used for calibrated generative model verification.
 */
export function simulateUserInMemory(
  theta: number,
  delta: number,
  arm: 'control' | 'counterexample',
  rng: () => number,
): InMemorySimOutcome {
  const coreProb = arm === 'counterexample' ? theta * B_CONTROL * (1 + delta) : theta * B_CONTROL;
  const playCore = (): boolean => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      if (attempt > 1 && rng() < coreProb) {
        return true;
      }
      if (attempt >= 2 && rng() < GIVE_UP_HAZARD) {
        return false;
      }
    }
    return false;
  };

  const c1 = playCore();
  const c2 = playCore();
  let transferSolved = false;
  const transferProb = theta * 0.5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (rng() < transferProb) {
      transferSolved = true;
      break;
    }
  }
  return { arm, coreSetCompleted: c1 && c2, transferSolved };
}

/**
 * Refuses simulation if environment configuration risks contaminating Production.
 */
export function assertDevelopmentOnlyConfig(
  devKey: string,
  prodKey: string,
  appEnv: string,
  mockLocal: boolean,
): void {
  if (appEnv === 'production') {
    throw new Error('Refusing simulation: VITE_APP_ENV cannot be "production".');
  }
  if (prodKey.trim().length > 0 && devKey.trim() === prodKey.trim()) {
    throw new Error('Refusing simulation: Development key matches Production key.');
  }
  if (!mockLocal && devKey.trim().length === 0) {
    throw new Error(
      'Missing FLAGSMITH_DEV_ENV_KEY (pass --mock-local for offline pipeline dry run).',
    );
  }
}

/**
 * Deterministic 32-bit seeded PRNG (Mulberry32).
 */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleStandardNormal(rng: () => number): number {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function sampleGammaInt(shape: number, rng: () => number): number {
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    const x = sampleStandardNormal(rng);
    const v = (1 + c * x) ** 3;
    if (v <= 0) {
      continue;
    }
    const u = Math.max(1e-12, rng());
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

/**
 * Draws participant skill theta ~ Beta(4, 4).
 */
export function sampleBeta44(rng: () => number): number {
  const x = sampleGammaInt(4, rng);
  const y = sampleGammaInt(4, rng);
  return x / (x + y);
}

function parseSimArgs(argv: readonly string[]): SimCliConfig {
  let delta = 0;
  let seed = 1;
  let count = 50;
  let mockLocal = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--delta' && next !== undefined) {
      delta = Number(next);
      i += 1;
    } else if (arg === '--seed' && next !== undefined) {
      seed = Number(next);
      i += 1;
    } else if (arg === '--n' && next !== undefined) {
      count = Number(next);
      i += 1;
    } else if (arg === '--mock-local') {
      mockLocal = true;
    }
  }

  return {
    delta,
    seed,
    count,
    mockLocal,
    devKey: process.env.FLAGSMITH_DEV_ENV_KEY ?? '',
    prodKey: process.env.FLAGSMITH_PROD_ENV_KEY ?? '',
    appEnv: process.env.VITE_APP_ENV ?? 'development',
  };
}

function deterministicArmFromId(id: string): 'control' | 'counterexample' {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 2 === 0 ? 'control' : 'counterexample';
}

async function attachMockRoutes(page: Page): Promise<void> {
  await page.route('https://edge.api.flagsmith.com/**', async (route) => {
    const url = new URL(route.request().url());
    const id = url.searchParams.get('identifier') ?? 'sim';
    const arm = deterministicArmFromId(id);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        identifier: id,
        traits: [],
        flags: [
          {
            enabled: true,
            feature_state_value: arm,
            variant: arm,
            feature: { id: 1, name: 'feedback_style' },
            metadata: { experiment: { id: 1, name: 'sim_feedback', in_experiment: true } },
          },
          {
            enabled: true,
            feature_state_value: 'control',
            variant: 'control',
            feature: { id: 2, name: 'aa_canary' },
            metadata: { experiment: { id: 2, name: 'sim_aa', in_experiment: true } },
          },
        ],
      }),
    });
  });

  await page.route('https://events.api.flagsmith.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"status":"ok"}' });
  });
}

async function playSingleChallenge(
  page: Page,
  solution: string,
  wrongPattern: string,
  solveProbControl: number,
  solveProbCex: number,
  rng: () => number,
  isTransfer: boolean,
  observedArm: { value: 'control' | 'counterexample' | 'unknown' },
): Promise<{ readonly solved: boolean; readonly gaveUp: boolean }> {
  const input = page.getByLabel('Regular expression pattern');
  const submitBtn = page.getByRole('button', { name: 'Check pattern' });
  const showSolBtn = page.getByRole('button', { name: 'Show solution' });

  // Force first failure on C1 to trigger feedback_style exposure cleanly
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const activeProb =
      isTransfer || observedArm.value !== 'counterexample' ? solveProbControl : solveProbCex;
    const willSolve = attempt > 1 && rng() < activeProb;

    await input.fill(willSolve ? solution : wrongPattern);
    await submitBtn.click();

    if (attempt === 1 && !isTransfer && observedArm.value === 'unknown') {
      const statusText = (await page.getByRole('status').textContent()) ?? '';
      observedArm.value = statusText.includes('should') ? 'counterexample' : 'control';
    }

    if (willSolve) {
      await page.getByRole('button', { name: 'Continue' }).click();
      return { solved: true, gaveUp: false };
    }

    if (attempt >= 2 && rng() < GIVE_UP_HAZARD) {
      await showSolBtn.click();
      await page.getByRole('button', { name: 'Next challenge' }).click();
      return { solved: false, gaveUp: true };
    }
  }

  await showSolBtn.click();
  await page.getByRole('button', { name: 'Next challenge' }).click();
  return { solved: false, gaveUp: true };
}

async function simulateUser(
  browser: Browser,
  baseUrl: string,
  config: SimCliConfig,
  index: number,
  rng: () => number,
): Promise<LedgerRow> {
  const simId = `sim-s${String(config.delta)}-${String(config.seed)}-${String(index).padStart(3, '0')}`;
  const theta = sampleBeta44(rng);
  const context = await browser.newContext();
  const page = await context.newPage();

  if (config.mockLocal) {
    await attachMockRoutes(page);
  }

  await page.goto(baseUrl);
  await page.evaluate((vid) => {
    window.localStorage.setItem('witness.vid', vid);
  }, simId);
  await page.getByRole('button', { name: 'Start Experiment' }).click();
  await page.locator('#connection-status').waitFor({ state: 'hidden' });

  const observedArm: { value: 'control' | 'counterexample' | 'unknown' } = { value: 'unknown' };
  const c1ProbCtrl = theta * B_CONTROL;
  const c1ProbCex = theta * B_CONTROL * (1 + config.delta);
  const c3Prob = theta * 0.5;

  const c1 = CHALLENGES[0];
  const c2 = CHALLENGES[1];
  const c3 = CHALLENGES[2];
  if (c1 === undefined || c2 === undefined || c3 === undefined) {
    throw new Error('Missing challenges');
  }

  const r1 = await playSingleChallenge(
    page,
    c1.referenceSolution,
    '^\\d{4}-\\d{1,2}-\\d{2}$',
    c1ProbCtrl,
    c1ProbCex,
    rng,
    false,
    observedArm,
  );
  const r2 = await playSingleChallenge(
    page,
    c2.referenceSolution,
    '^\\d+\\.\\d+\\.\\d+$',
    c1ProbCtrl,
    c1ProbCex,
    rng,
    false,
    observedArm,
  );
  const r3 = await playSingleChallenge(
    page,
    c3.referenceSolution,
    '^#[0-9A-Fa-f]+$',
    c3Prob,
    c3Prob,
    rng,
    true,
    observedArm,
  );

  await context.close();

  return {
    id: simId,
    scenario: `delta=${String(config.delta)}`,
    seed: config.seed,
    theta: Number(theta.toFixed(4)),
    armObserved: observedArm.value,
    c1Solved: r1.solved,
    c2Solved: r2.solved,
    coreSetCompleted: r1.solved && r2.solved,
    transferSolved: r3.solved,
    gaveUp: r1.gaveUp || r2.gaveUp,
    label: 'SIMULATED',
  };
}

function writeLedgerCsv(outPath: string, rows: readonly LedgerRow[]): void {
  const header =
    'id,scenario,seed,theta,arm_observed,c1_solved,c2_solved,core_set_completed,transfer_solved,gave_up,label';
  const lines = rows.map((r) =>
    [
      r.id,
      r.scenario,
      String(r.seed),
      String(r.theta),
      r.armObserved,
      String(r.c1Solved),
      String(r.c2Solved),
      String(r.coreSetCompleted),
      String(r.transferSolved),
      String(r.gaveUp),
      r.label,
    ].join(','),
  );
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${header}\n${lines.join('\n')}\n`, 'utf8');
}

async function main(): Promise<void> {
  const config = parseSimArgs(process.argv.slice(2));
  assertDevelopmentOnlyConfig(config.devKey, config.prodKey, config.appEnv, config.mockLocal);

  const simDistDir = path.resolve('.tmp-sim-dist');
  const viteBin = path.resolve('node_modules/vite/bin/vite.js');
  const effectiveKey = config.mockLocal ? 'ser.sim_local_mock_key' : config.devKey.trim();
  execFileSync(process.execPath, [viteBin, 'build'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      WITNESS_OUT_DIR: '.tmp-sim-dist',
      VITE_FLAGSMITH_ENV_KEY: effectiveKey,
      VITE_APP_ENV: 'development',
    },
  });

  const { chromium } = await import('playwright');
  const { startStaticServer } = await import('../tests/e2e/staticServer');
  const server = await startStaticServer(simDistDir);
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const rng = createSeededRng(Math.round(config.delta * 1000) + config.seed * 10007);
  const rows: LedgerRow[] = [];

  try {
    for (let i = 1; i <= config.count; i += 1) {
      rows.push(await simulateUser(browser, server.url, config, i, rng));
    }
  } finally {
    await browser.close();
    await server.close();
    fs.rmSync(simDistDir, { recursive: true, force: true });
  }

  const outFile = path.resolve(
    'evidence',
    'dev',
    `SIMULATED-ledger-d${String(config.delta)}-s${String(config.seed)}-n${String(config.count)}.csv`,
  );
  writeLedgerCsv(outFile, rows);
  console.log(`Wrote ${String(rows.length)} SIMULATED ledger rows to ${outFile}`);
}

const isCliEntry = process.argv[1]?.endsWith('simulate.ts') ?? false;
if (isCliEntry) {
  void main();
}
