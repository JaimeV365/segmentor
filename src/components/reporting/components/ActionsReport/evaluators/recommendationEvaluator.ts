import type { RecommendationEvaluation } from '../types';
import type { RecommendationScoreResult } from '../../../../../utils/recommendationScore';

/**
 * Evaluates recommendation score (NPS) data
 */
export function evaluateRecommendation(
  recommendationScore: RecommendationScoreResult | null,
  loyaltyScale?: string
): RecommendationEvaluation {
  if (!recommendationScore) {
    return {
      score: 0,
      detractors: 0,
      passives: 0,
      promoters: 0,
      detractorsPercent: 0,
      passivesPercent: 0,
      promotersPercent: 0,
      isPositive: false,
      isStrong: false,
      isWeak: true,
      hasIncompleteScale: false,
      scaleCoverage: {}
    };
  }

  // Check for incomplete scale coverage
  let hasIncompleteScale = false;
  const scaleCoverage = recommendationScore.distribution || {};
  
  if (loyaltyScale) {
    // Parse scale to get min and max values
    const [min, max] = loyaltyScale.split('-').map(Number);
    const expectedValues = max - min + 1;
    const actualValues = Object.keys(scaleCoverage).length;
    
    // If not all scale values have responses, scale is incomplete
    hasIncompleteScale = actualValues < expectedValues;
  } else {
    // If we can't determine the scale, check if distribution seems incomplete
    // (e.g., if there are gaps in the values)
    const values = Object.keys(scaleCoverage).map(Number).sort((a, b) => a - b);
    if (values.length > 0) {
      const min = values[0];
      const max = values[values.length - 1];
      const expectedCount = max - min + 1;
      hasIncompleteScale = values.length < expectedCount;
    }
  }

  return {
    score: recommendationScore.score,
    detractors: recommendationScore.detractors,
    passives: recommendationScore.passives,
    promoters: recommendationScore.promoters,
    detractorsPercent: recommendationScore.detractorsPercent,
    passivesPercent: recommendationScore.passivesPercent,
    promotersPercent: recommendationScore.promotersPercent,
    isPositive: recommendationScore.score > 0,
    isStrong: recommendationScore.score > 50,
    isWeak: recommendationScore.score < 0,
    hasIncompleteScale,
    scaleCoverage
  };
}

