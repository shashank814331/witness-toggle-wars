import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { formatInterimHealthRow, parseOpsCliArgs } from './cliHelpers.mjs';

const flagsmithBin = path.resolve('node_modules/@flagsmith/cli/bin/flagsmith.js');

function fetchAndVerify(env, envKey, expId, stamp) {
  const outFile = path.resolve('evidence', env, `interim-${expId}-${stamp}.json`);
  execFileSync(
    process.execPath,
    [
      flagsmithBin,
      'api',
      `api/v1/environments/${envKey}/experiments/${expId}/results/refresh/`,
      '--method',
      'POST',
    ],
    { stdio: 'inherit' },
  );
  const rawJson = execFileSync(
    process.execPath,
    [flagsmithBin, 'api', `api/v1/environments/${envKey}/experiments/${expId}/results/`],
    { encoding: 'utf8' },
  );
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, rawJson, 'utf8');

  const verifyRaw = execFileSync('python', ['analysis/verify.py', '--results-json', outFile], {
    encoding: 'utf8',
  });
  return JSON.parse(verifyRaw);
}

function formatIstTimestamp(date) {
  return (
    date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }) + ' IST'
  );
}

function appendInterimRow(row) {
  const resultsPath = path.resolve('RESULTS.md');
  const content = fs.readFileSync(resultsPath, 'utf8');
  const marker = '| _Pending launch_ | _—_ | _—_ | _—_ | _—_ | _—_ |';
  if (content.includes(marker)) {
    fs.writeFileSync(resultsPath, content.replace(marker, row), 'utf8');
    return;
  }
  const anchor = '## 3. SIMULATED PIPELINE CALIBRATION';
  const idx = content.indexOf(anchor);
  if (idx === -1) {
    fs.writeFileSync(resultsPath, `${content.trimEnd()}\n${row}\n`, 'utf8');
    return;
  }
  const before = content.slice(0, idx).trimEnd();
  const after = content.slice(idx);
  fs.writeFileSync(resultsPath, `${before}\n${row}\n\n---\n\n${after}`, 'utf8');
}

function main() {
  const opts = parseOpsCliArgs(process.argv.slice(2));
  const envKey =
    opts.env === 'dev'
      ? (process.env.FLAGSMITH_DEV_ENV_KEY ?? '').trim()
      : (process.env.FLAGSMITH_PROD_ENV_KEY ?? '').trim();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const expId = opts.experimentId || '<EXPERIMENT_ID>';
  const aaId = opts.aaId || '<OPTIONAL_AA_ID>';

  console.log(
    `=== Witness Interim Health Check (no peeking, env=${opts.env}, exp=${expId}, apply=${String(opts.apply)}) ===`,
  );

  if (!opts.apply) {
    console.log(
      `[DRY-RUN] Refresh & export ${expId} -> analysis/verify.py (counts + SRM only; lift suppressed)`,
    );
    if (opts.aaId) {
      console.log(`[DRY-RUN] Refresh & export aa_canary (${aaId}) -> SRM/inconclusive check`);
    }
    console.log(
      '[DRY-RUN] Append interim row to RESULTS.md under "Interim health checks — not for decisions"',
    );
    return;
  }

  if (envKey.length === 0 || opts.experimentId.length === 0) {
    throw new Error('Provide --experiment-id and matching environment key in shell env.');
  }

  const mainStats = fetchAndVerify(opts.env, envKey, opts.experimentId, stamp);
  let aaStatus = 'not_checked';
  if (opts.aaId.length > 0) {
    const aaStats = fetchAndVerify(opts.env, envKey, opts.aaId, stamp);
    aaStatus = aaStats.srm_alert ? 'srm_alert' : String(aaStats.verdict);
  }

  const row = formatInterimHealthRow({
    timestampIst: formatIstTimestamp(new Date()),
    controlExposures: mainStats.control.exposures,
    counterexampleExposures: mainStats.counterexample.exposures,
    srmPValue: mainStats.srm_p_value,
    srmAlert: Boolean(mainStats.srm_alert),
    aaStatus,
  });

  appendInterimRow(row);
  console.log('Interim health check recorded in RESULTS.md (lift intentionally omitted):');
  console.log(row);
}

main();
