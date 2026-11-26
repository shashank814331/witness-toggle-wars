import type { EvaluationResult, FailingCase } from '../engine/evaluate';

export type FeedbackVariant = 'control' | 'counterexample';

export interface FormattedFeedback {
  readonly kind: 'success' | 'failure' | 'error';
  readonly summary: string;
  readonly detail?: string;
}

/**
 * Formats evaluation feedback for the active arm without exposing test inputs in control or checkpoint modes.
 */
export function formatFeedback(
  result: EvaluationResult,
  variant: string,
  isTransferCheckpoint: boolean,
  onRenderError?: () => void,
): FormattedFeedback {
  if (result.syntaxError !== undefined || result.timedOut === true) {
    return {
      kind: 'error',
      summary: result.syntaxError ?? 'Pattern too slow',
    };
  }

  const summary = `${String(result.passed)} of ${String(result.total)} checks passed.`;
  if (result.ok) {
    return { kind: 'success', summary };
  }

  if (isTransferCheckpoint) {
    return { kind: 'failure', summary };
  }

  const normalizedVariant = resolveVariant(variant, onRenderError);
  if (normalizedVariant === 'counterexample' && result.firstFailure !== undefined) {
    return {
      kind: 'failure',
      summary,
      detail: formatCounterexample(result.firstFailure),
    };
  }

  return { kind: 'failure', summary };
}

function resolveVariant(variant: string, onRenderError?: () => void): FeedbackVariant {
  if (variant === 'control' || variant === 'counterexample') {
    return variant;
  }
  onRenderError?.();
  return 'control';
}

function formatCounterexample(failure: FailingCase): string {
  if (failure.expected) {
    return `\`${failure.input}\` should match, but your pattern did not match it.`;
  }
  return `\`${failure.input}\` should NOT match, but your pattern matched it.`;
}

/**
 * Renders formatted feedback safely using text nodes (no HTML injection).
 */
export function renderFeedbackElement(container: HTMLElement, formatted: FormattedFeedback): void {
  container.replaceChildren();
  container.hidden = false;
  container.className = `feedback-box is-${formatted.kind}`;

  const summaryEl = document.createElement('p');
  summaryEl.className = 'feedback-summary';
  summaryEl.textContent = formatted.summary;
  container.appendChild(summaryEl);

  if (formatted.detail !== undefined) {
    const detailEl = document.createElement('p');
    detailEl.className = 'feedback-detail';
    detailEl.textContent = formatted.detail;
    container.appendChild(detailEl);
  }
}
