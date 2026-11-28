import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseOpsCliArgs } from './cliHelpers.mjs';

const flagsmithBin = path.resolve('node_modules/@flagsmith/cli/index.js');

function main() {
  const opts = parseOpsCliArgs(process.argv.slice(2));
  const envKey =
    opts.env === 'dev'
      ? (process.env.FLAGSMITH_DEV_ENV_KEY ?? '').trim()
      : (process.env.FLAGSMITH_PROD_ENV_KEY ?? '').trim();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const expId = opts.experimentId || '<EXPERIMENT_ID>';
  const outFile = path.resolve('evidence', opts.env, `results-${expId}-${stamp}.json`);

  console.log(
    `=== Witness Export (env=${opts.env}, exp=${expId}, apply=${String(opts.apply)}) ===`,
  );
  if (!opts.apply) {
    console.log(
      `[DRY-RUN] POST api/v1/environments/<${opts.env}_key>/experiments/${expId}/results/refresh/`,
    );
    console.log(
      `[DRY-RUN] GET  api/v1/environments/<${opts.env}_key>/experiments/${expId}/results/ > ${outFile}`,
    );
    console.log(`[DRY-RUN] python analysis/verify.py --results-json ${outFile}`);
    return;
  }

  if (envKey.length === 0 || opts.experimentId.length === 0) {
    throw new Error('Provide --experiment-id and matching environment key in shell env.');
  }

  execFileSync(
    process.execPath,
    [
      flagsmithBin,
      'api',
      `api/v1/environments/${envKey}/experiments/${opts.experimentId}/results/refresh/`,
      '--method',
      'POST',
    ],
    { stdio: 'inherit' },
  );

  const expMetaRaw = execFileSync(
    process.execPath,
    [
      flagsmithBin,
      '--no-input',
      'api',
      `api/v1/environments/${envKey}/experiments/${opts.experimentId}/`,
    ],
    { encoding: 'utf8' },
  );
  const rawJson = execFileSync(
    process.execPath,
    [
      flagsmithBin,
      '--no-input',
      'api',
      `api/v1/environments/${envKey}/experiments/${opts.experimentId}/results/`,
    ],
    { encoding: 'utf8' },
  );

  const expMeta = JSON.parse(expMetaRaw);
  const parsedResults = JSON.parse(rawJson);
  const enrichedPayload = {
    ...parsedResults,
    metric_definitions: expMeta.metrics ?? [],
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(enrichedPayload, null, 2)}\n`, 'utf8');
  console.log(`Saved export to ${outFile}`);

  execFileSync('python', ['analysis/verify.py', '--results-json', outFile], { stdio: 'inherit' });
}

main();
