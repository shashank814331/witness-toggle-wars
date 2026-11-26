import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import {
  buildExperimentPayload,
  extractFeatureAndVariationIds,
  parseOpsCliArgs,
  WITNESS_METRICS,
} from './cliHelpers.mjs';

const flagsmithBin = path.resolve('node_modules/@flagsmith/cli/bin/flagsmith.js');

function runCli(args, stdinJson) {
  const cmdArgs = [flagsmithBin, ...args];
  if (process.argv.includes('--verbose')) {
    console.log('[CLI]', cmdArgs.join(' '));
  }
  const output = execFileSync(process.execPath, cmdArgs, {
    encoding: 'utf8',
    input: stdinJson !== undefined ? JSON.stringify(stdinJson) : undefined,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return output.trim();
}

function verifyPreregTagIfProd(env) {
  if (env !== 'prod') return;
  try {
    execFileSync('git', ['rev-parse', '-q', '--verify', 'refs/tags/prereg-v1'], {
      stdio: 'ignore',
    });
  } catch {
    throw new Error('Refusing Production mutation: git tag "prereg-v1" must exist first.');
  }
}

function ensureFeatureWithVariant(name, value, key, apply) {
  if (!apply) {
    console.log(`[DRY-RUN] flagsmith feature create ${name} --value control --enabled`);
    console.log(
      `[DRY-RUN] flagsmith feature variant add ${name} --value ${value} --key ${key} --weight 0`,
    );
    console.log(`[DRY-RUN] flagsmith feature get ${name} --json`);
    return { featureId: 0, variationId: 0 };
  }

  try {
    runCli(['feature', 'create', name, '--value', 'control', '--enabled']);
  } catch {
    // Feature may already exist; verify below via feature get --json
  }

  let parsed = JSON.parse(runCli(['feature', 'get', name, '--json']));
  try {
    return extractFeatureAndVariationIds(parsed, key);
  } catch {
    runCli(['feature', 'variant', 'add', name, '--value', value, '--key', key, '--weight', '0']);
    parsed = JSON.parse(runCli(['feature', 'get', name, '--json']));
    return extractFeatureAndVariationIds(parsed, key);
  }
}

function ensureMetrics(envKey, apply) {
  if (!apply) {
    for (const metric of WITNESS_METRICS) {
      console.log(
        `[DRY-RUN] POST api/v1/environments/<${envKey ? 'key' : 'env'}>/experiment-metrics/ (${metric.name})`,
      );
    }
    return WITNESS_METRICS.map((m, idx) => ({ ...m, id: idx + 1 }));
  }

  const existingRaw = runCli(['api', `api/v1/environments/${envKey}/experiment-metrics/`]);
  const existingList = JSON.parse(existingRaw);
  const byName = new Map(
    (Array.isArray(existingList) ? existingList : (existingList?.results ?? [])).map((m) => [
      m.name,
      m.id,
    ]),
  );

  const resolved = [];
  for (const metric of WITNESS_METRICS) {
    let id = byName.get(metric.name);
    if (typeof id !== 'number') {
      const created = JSON.parse(
        runCli(
          [
            'api',
            `api/v1/environments/${envKey}/experiment-metrics/`,
            '--method',
            'POST',
            '--input',
            '-',
          ],
          {
            name: metric.name,
            aggregation: metric.aggregation,
            direction: metric.direction,
            definition: { version: 1, event: metric.name },
          },
        ),
      );
      id = created.id;
    }
    resolved.push({ ...metric, id });
  }
  return resolved;
}

function main() {
  const opts = parseOpsCliArgs(process.argv.slice(2));
  verifyPreregTagIfProd(opts.env);

  const envKey =
    opts.env === 'dev'
      ? (process.env.FLAGSMITH_DEV_ENV_KEY ?? '').trim()
      : (process.env.FLAGSMITH_PROD_ENV_KEY ?? '').trim();

  if (opts.apply && envKey.length === 0) {
    throw new Error(
      `Missing ${opts.env === 'dev' ? 'FLAGSMITH_DEV_ENV_KEY' : 'FLAGSMITH_PROD_ENV_KEY'} in shell environment.`,
    );
  }

  console.log(`=== Witness Provisioning (env=${opts.env}, apply=${String(opts.apply)}) ===`);
  if (!opts.apply) {
    console.log(
      `[DRY-RUN] flagsmith init --project ${opts.project} --environment <${opts.env}_key>`,
    );
    console.log(`[DRY-RUN] GET api/v1/environments/<${opts.env}_key>/warehouse-connections/`);
  } else {
    runCli(['init', '--project', opts.project, '--environment', envKey]);
    const warehouse = JSON.parse(
      runCli(['api', `api/v1/environments/${envKey}/warehouse-connections/`]),
    );
    if (!Array.isArray(warehouse) || warehouse.length === 0) {
      throw new Error(
        'STOP: warehouse-connections/ is empty. Enable Experimentation/Warehouse first.',
      );
    }
  }

  const fb = ensureFeatureWithVariant(
    'feedback_style',
    'counterexample',
    'counterexample',
    opts.apply,
  );
  const aa = ensureFeatureWithVariant('aa_canary', 'control_copy', 'aa_b', opts.apply);
  const metrics = ensureMetrics(opts.env, opts.apply);
  const primary = metrics.find((m) => m.name === 'core_set_completed');
  if (!primary) throw new Error('Primary metric missing');

  const mainPayload = buildExperimentPayload({
    featureId: fb.featureId,
    variationId: fb.variationId,
    name: `witness_feedback_style_${opts.env}`,
    hypothesis:
      'Showing one concrete failing case increases core_set_completed by >=10% relative without lowering transfer_solved.',
    metricPairs: metrics,
  });
  const aaPayload = buildExperimentPayload({
    featureId: aa.featureId,
    variationId: aa.variationId,
    name: `witness_aa_canary_${opts.env}`,
    hypothesis: 'Identical control copy shows no systematic lift (A/A sanity check).',
    metricPairs: [primary],
  });

  if (!opts.apply) {
    console.log(`[DRY-RUN] POST experiments/ -> ${mainPayload.name} (5 metrics, 50/50 split)`);
    console.log(`[DRY-RUN] POST experiments/ -> ${aaPayload.name} (1 metric, 50/50 split)`);
    if (opts.start) {
      console.log('[DRY-RUN] POST experiments/<id>/start/ for both experiments');
    }
    return;
  }

  const createdMain = JSON.parse(
    runCli(
      ['api', `api/v1/environments/${envKey}/experiments/`, '--method', 'POST', '--input', '-'],
      mainPayload,
    ),
  );
  const createdAa = JSON.parse(
    runCli(
      ['api', `api/v1/environments/${envKey}/experiments/`, '--method', 'POST', '--input', '-'],
      aaPayload,
    ),
  );
  console.log(`Created experiments: main=${String(createdMain.id)}, aa=${String(createdAa.id)}`);

  if (opts.start) {
    for (const expId of [createdMain.id, createdAa.id]) {
      runCli([
        'api',
        `api/v1/environments/${envKey}/experiments/${String(expId)}/start/`,
        '--method',
        'POST',
      ]);
      const status = JSON.parse(
        runCli(['api', `api/v1/environments/${envKey}/experiments/${String(expId)}/`]),
      );
      console.log(`Experiment ${String(expId)} status: ${String(status.status)}`);
    }
  }
}

main();
