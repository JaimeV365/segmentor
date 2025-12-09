import type { SampleSizeEvaluation } from '../types';

/**
 * Evaluates sample size adequacy and representation across quadrants
 */
export function evaluateSampleSize(
  total: number,
  distribution: Record<string, number>
): SampleSizeEvaluation {
  const isLow = total < 30;
  const isHigh = total >= 100;
  const isMedium = total >= 30 && total < 100;

  // Check representation across all main quadrants
  const mainQuadrants = ['loyalists', 'mercenaries', 'hostages', 'defectors'];
  const missingQuadrants: string[] = [];
  
  mainQuadrants.forEach(quadrant => {
    const count = distribution[quadrant] || 0;
    // Consider a quadrant "missing" if it has less than 5% representation
    if (count < total * 0.05 && count < 3) {
      missingQuadrants.push(quadrant);
    }
  });

  // Has good representation if all main quadrants have at least some customers
  const hasGoodRepresentation = missingQuadrants.length === 0;

  return {
    total,
    isLow,
    isHigh,
    isMedium,
    hasGoodRepresentation,
    missingQuadrants
  };
}

