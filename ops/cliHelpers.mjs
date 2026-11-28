export const WITNESS_METRICS = [
  {
    name: 'core_set_completed',
    aggregation: 'occurrence',
    direction: 'up',
    expectedDirection: 'increase',
  },
  {
    name: 'challenge1_solved',
    aggregation: 'occurrence',
    direction: 'up',
    expectedDirection: 'increase',
  },
  { name: 'gave_up', aggregation: 'occurrence', direction: 'down', expectedDirection: 'decrease' },
  {
    name: 'transfer_solved',
    aggregation: 'occurrence',
    direction: 'up',
    expectedDirection: 'not_decrease',
  },
  {
    name: 'feedback_render_error',
    aggregation: 'count',
    direction: 'down',
    expectedDirection: 'not_increase',
  },
];

export function parseOpsCliArgs(argv) {
  let env = 'dev';
  let apply = false;
  let start = false;
  let project = 'witness';
  let experimentId = '';
  let aaId = '';

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--env' && next !== undefined) {
      env = next;
      i += 1;
    } else if (arg === '--apply') {
      apply = true;
    } else if (arg === '--start') {
      start = true;
    } else if (arg === '--project' && next !== undefined) {
      project = next;
      i += 1;
    } else if (arg === '--experiment-id' && next !== undefined) {
      experimentId = next;
      i += 1;
    } else if (arg === '--aa-id' && next !== undefined) {
      aaId = next;
      i += 1;
    } else {
      throw new Error(`Unknown CLI argument: ${arg}`);
    }
  }

  if (env !== 'dev' && env !== 'prod') {
    throw new Error(`--env must be "dev" or "prod" (received "${env}")`);
  }
  return { env, apply, start, project, experimentId, aaId };
}

export function formatInterimHealthRow({
  timestampIst,
  controlExposures,
  counterexampleExposures,
  srmPValue,
  srmAlert,
  aaStatus,
}) {
  const alertText = srmAlert ? 'ALERT (p < 0.001)' : 'OK';
  return `| ${timestampIst} | ${String(controlExposures)} | ${String(counterexampleExposures)} | ${String(srmPValue)} | ${alertText} | ${aaStatus} |`;
}

export function extractFeatureAndVariationIds(featureJson, variationKey) {
  const featureId = featureJson?.id ?? featureJson?.feature?.id;
  if (typeof featureId !== 'number') {
    throw new Error('Could not find numeric feature id in Flagsmith JSON output.');
  }
  const options =
    featureJson?.variants ??
    featureJson?.multivariate_options ??
    featureJson?.feature?.variants ??
    featureJson?.feature?.multivariate_options ??
    [];
  const matched = options.find(
    (opt) => opt?.key === variationKey || opt?.string_value === variationKey,
  );
  if (!matched || typeof matched.id !== 'number') {
    throw new Error(`Could not find variation "${variationKey}" with numeric id and key.`);
  }
  if (matched.key !== variationKey) {
    throw new Error(`Variation "${variationKey}" is missing required key attribute.`);
  }
  return { featureId, variationId: matched.id };
}

export function buildExperimentPayload({ featureId, variationId, name, hypothesis, metricPairs }) {
  return {
    feature: featureId,
    name,
    hypothesis,
    metrics: metricPairs.map((m) => ({
      metric: m.id,
      expected_direction: m.expectedDirection,
    })),
    experiment_rollout: {
      enabled: true,
      rollout_percentage: 100,
      feature_state_value: { type: 'string', value: 'control' },
      multivariate_feature_state_values: [
        { multivariate_feature_option: variationId, percentage_allocation: 50 },
      ],
    },
  };
}
