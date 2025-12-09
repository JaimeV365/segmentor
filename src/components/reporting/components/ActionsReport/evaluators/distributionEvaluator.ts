import type { DistributionEvaluation } from '../types';

/**
 * Evaluates distribution data to determine:
 * - Largest quadrant
 * - Distribution balance
 * - Closely followed quadrants
 * - Neutral customers
 * - Edge cases (tied, too empty, too full, zero)
 */
export function evaluateDistribution(
  distribution: Record<string, number>,
  total: number
): DistributionEvaluation {
  // Normalize quadrant names (handle both camelCase and snake_case)
  const normalized: Record<string, number> = {
    loyalists: distribution.loyalists || 0,
    mercenaries: distribution.mercenaries || 0,
    hostages: distribution.hostages || 0,
    defectors: distribution.defectors || 0,
    apostles: distribution.apostles || 0,
    terrorists: distribution.terrorists || 0,
    nearApostles: distribution.nearApostles || distribution.near_apostles || 0
  };

  const counts = normalized;
  const neutralCount = distribution.neutrals || 0;
  
  // CRITICAL DEBUG: Log what we receive
  console.log('[DistributionEvaluator] INPUT VALUES:', {
    receivedTotal: total,
    neutralCount,
    loyalistsCount: counts.loyalists,
    allCounts: counts,
    sumOfAllQuadrants: Object.values(counts).reduce((sum, val) => sum + val, 0),
    sumIncludingNeutrals: Object.values(counts).reduce((sum, val) => sum + val, 0) + neutralCount,
    note: 'total should be activeData.length (includes neutrals), counts exclude neutrals'
  });
  
  // CRITICAL: The graph uses totalEntries (including neutrals) for percentage calculations
  // totalEntries = activeData.length (includes neutrals)
  // distribution counts exclude neutrals (they're counted separately)
  // So percentages should be: count / totalEntries (including neutrals)
  const totalIncludingNeutrals = total;
  const totalExcludingNeutrals = total - neutralCount;
  
  // Calculate percentages using total including neutrals to match the graph display
  // This ensures text percentages match what's shown in the DistributionSection graph
  // Graph formula: (value / effectiveTotal) * 100 where effectiveTotal = totalEntries (including neutrals)
  const percentages: Record<string, number> = {};
  Object.entries(counts).forEach(([key, value]) => {
    percentages[key] = totalIncludingNeutrals > 0 ? (value / totalIncludingNeutrals) * 100 : 0;
  });
  const neutralPercent = totalIncludingNeutrals > 0 ? (neutralCount / totalIncludingNeutrals) * 100 : 0;
  
  // CRITICAL DEBUG: Log the calculation
  if (counts.loyalists > 0) {
    console.log('[DistributionEvaluator] PERCENTAGE CALCULATION:', {
      loyalistsCount: counts.loyalists,
      totalIncludingNeutrals,
      calculatedPercent: percentages.loyalists,
      formula: `(${counts.loyalists} / ${totalIncludingNeutrals}) * 100`,
      result: `${percentages.loyalists.toFixed(1)}%`,
      alternativeIfExcludingNeutrals: totalExcludingNeutrals > 0 
        ? `(${counts.loyalists} / ${totalExcludingNeutrals}) * 100 = ${((counts.loyalists / totalExcludingNeutrals) * 100).toFixed(1)}%`
        : 'N/A'
    });
  }

  // Find largest quadrant
  const sorted = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .filter(([, count]) => count > 0); // Only include quadrants with customers

  const largest = sorted.length > 0 ? sorted[0][0] : null;
  const largestCount = largest ? counts[largest] : 0;
  
  // Debug logging to verify calculation matches graph
  if (largest && largestCount > 0) {
    console.log('[DistributionEvaluator] Percentage calculation (should match graph):', {
      quadrant: largest,
      count: largestCount,
      totalIncludingNeutrals,
      totalExcludingNeutrals,
      neutralCount,
      calculatedPercent: percentages[largest],
      formula: `(${largestCount} / ${totalIncludingNeutrals}) * 100 = ${percentages[largest].toFixed(1)}%`,
      note: 'Graph should show same % when no filters are applied. If different, graph may be using filtered data.'
    });
  }

  // Check for tied quadrants (equal counts)
  const tiedQuadrants: string[] = [];
  const isTied = sorted.length > 1 && sorted[0][1] === sorted[1][1];
  if (isTied && largestCount > 0) {
    const tiedCount = largestCount;
    sorted.forEach(([quadrant, count]) => {
      if (count === tiedCount) {
        tiedQuadrants.push(quadrant);
      }
    });
  }

  // Find closely followed quadrants (within 15% of largest)
  const closelyFollowed: string[] = [];
  if (largest && largestCount > 0 && !isTied) {
    sorted.slice(1).forEach(([quadrant, count]) => {
      const diff = largestCount - count;
      const threshold = largestCount * 0.15; // 15% threshold
      if (diff <= threshold) {
        closelyFollowed.push(quadrant);
      }
    });
  }

  // Determine if distribution is balanced (multiple quadrants with similar counts)
  const isBalanced = closelyFollowed.length >= 2;

  // Determine if distribution is skewed (one quadrant dominates > 50%)
  // Use total including neutrals to match percentage calculation and graph display
  const isSkewed = largestCount > totalIncludingNeutrals * 0.5;

  // Find too empty quadrants (< 5% of total)
  const tooEmptyQuadrants: string[] = [];
  Object.entries(counts).forEach(([quadrant, count]) => {
    const percent = percentages[quadrant];
    if (count > 0 && percent < 5) {
      tooEmptyQuadrants.push(quadrant);
    }
  });

  // Find too full quadrants (significantly larger than others, > 10pp difference from second largest)
  const tooFullQuadrants: string[] = [];
  if (sorted.length > 1 && largestCount > 0) {
    const secondLargestCount = sorted[1][1];
    const largestPercent = percentages[largest || ''];
    const secondLargestPercent = percentages[sorted[1][0]];
    const diff = largestPercent - secondLargestPercent;
    if (diff > 10 && !isSkewed) {
      // Only mark as "too full" if not already marked as skewed
      tooFullQuadrants.push(largest || '');
    }
  }

  // Find zero quadrants (main quadrants only)
  const mainQuadrants = ['loyalists', 'mercenaries', 'hostages', 'defectors'];
  const zeroQuadrants: string[] = [];
  mainQuadrants.forEach(quadrant => {
    if (counts[quadrant] === 0) {
      zeroQuadrants.push(quadrant);
    }
  });

  return {
    largest: largest as any,
    counts,
    percentages,
    isBalanced,
    isSkewed,
    closelyFollowed,
    total,
    neutralCount,
    neutralPercent,
    isTied,
    tiedQuadrants,
    tooEmptyQuadrants,
    tooFullQuadrants,
    zeroQuadrants
  };
}

