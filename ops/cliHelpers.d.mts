export interface WitnessMetricDef {
  readonly name: string;
  readonly aggregation: 'occurrence' | 'count';
  readonly direction: 'up' | 'down' | 'not-decrease' | 'not-increase';
  readonly expectedDirection: 'increase' | 'decrease' | 'not-decrease' | 'not-increase';
}

export const WITNESS_METRICS: readonly WitnessMetricDef[];

export interface OpsCliArgs {
  readonly env: 'dev' | 'prod';
  readonly apply: boolean;
  readonly start: boolean;
  readonly project: string;
  readonly experimentId: string;
  readonly aaId: string;
}

export function parseOpsCliArgs(argv: readonly string[]): OpsCliArgs;

export function formatInterimHealthRow(params: {
  readonly timestampIst: string;
  readonly controlExposures: number;
  readonly counterexampleExposures: number;
  readonly srmPValue: number;
  readonly srmAlert: boolean;
  readonly aaStatus: string;
}): string;

export function extractFeatureAndVariationIds(
  featureJson: unknown,
  variationKey: string,
): { readonly featureId: number; readonly variationId: number };

export function buildExperimentPayload(params: {
  readonly featureId: number;
  readonly variationId: number;
  readonly name: string;
  readonly hypothesis: string;
  readonly metricPairs: readonly { readonly id: number; readonly expectedDirection: string }[];
}): {
  readonly feature: number;
  readonly name: string;
  readonly hypothesis: string;
  readonly metrics: readonly { readonly metric: number; readonly expected_direction: string }[];
  readonly experiment_rollout: {
    readonly enabled: boolean;
    readonly rollout_percentage: number;
    readonly feature_state_value: { readonly type: 'string'; readonly value: 'control' };
    readonly multivariate_feature_state_values: readonly {
      readonly multivariate_feature_option: number;
      readonly percentage_allocation: number;
    }[];
  };
};
