import { describe, expect, it } from 'vitest';
import {
  buildExperimentPayload,
  extractFeatureAndVariationIds,
  parseOpsCliArgs,
  WITNESS_METRICS,
} from '../../ops/cliHelpers.mjs';

describe('ops provisioning helpers', () => {
  it('enforces safe defaults (dev, dry-run) and rejects invalid env', () => {
    expect(parseOpsCliArgs([])).toEqual({
      env: 'dev',
      apply: false,
      start: false,
      project: 'witness',
      experimentId: '',
    });

    expect(parseOpsCliArgs(['--env', 'prod', '--apply', '--start'])).toEqual({
      env: 'prod',
      apply: true,
      start: true,
      project: 'witness',
      experimentId: '',
    });

    expect(() => parseOpsCliArgs(['--env', 'staging'])).toThrow(/dev.*prod/i);
  });

  it('requires keyed variation id and extracts feature/variation ids cleanly', () => {
    const sample = {
      id: 42,
      name: 'feedback_style',
      multivariate_options: [{ id: 99, key: 'counterexample', string_value: 'counterexample' }],
    };
    expect(extractFeatureAndVariationIds(sample, 'counterexample')).toEqual({
      featureId: 42,
      variationId: 99,
    });

    expect(() =>
      extractFeatureAndVariationIds(
        { id: 42, multivariate_options: [{ id: 99, string_value: 'counterexample' }] },
        'counterexample',
      ),
    ).toThrow(/missing required key/i);
  });

  it('constructs 50/50 100%-rollout experiment payload with all 5 case-sensitive metrics', () => {
    expect(WITNESS_METRICS.map((m) => m.name)).toEqual([
      'core_set_completed',
      'challenge1_solved',
      'gave_up',
      'transfer_solved',
      'feedback_render_error',
    ]);

    const payload = buildExperimentPayload({
      featureId: 42,
      variationId: 99,
      name: 'witness_feedback_style_dev',
      hypothesis: 'test',
      metricPairs: WITNESS_METRICS.map((m, idx) => ({
        id: idx + 10,
        expectedDirection: m.expectedDirection,
      })),
    });

    expect(payload.experiment_rollout.rollout_percentage).toBe(100);
    expect(payload.experiment_rollout.multivariate_feature_state_values).toEqual([
      { multivariate_feature_option: 99, percentage_allocation: 50 },
    ]);
    expect(payload.metrics).toHaveLength(5);
  });
});
