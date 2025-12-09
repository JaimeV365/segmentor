import type { DataReport } from '../../../types';
import type { ProximityAnalysisResult } from '../../../services/EnhancedProximityClassifier';
import type { RecommendationScoreResult } from '../../../../../utils/recommendationScore';
import type { AggregatedReportData } from '../types';

/**
 * Aggregates data from all report sections into a single structure
 * for Action Plan generation
 */
export function aggregateReportData(
  dataReport: DataReport | null,
  proximityAnalysis: ProximityAnalysisResult | null,
  recommendationScore: RecommendationScoreResult | null,
  contextDistribution?: Record<string, number> | null
): AggregatedReportData {
  // Extract distribution data
  let distribution = dataReport?.distribution || {
    loyalists: 0,
    mercenaries: 0,
    hostages: 0,
    defectors: 0,
    apostles: 0,
    terrorists: 0,
    nearApostles: 0,
    neutrals: 0
  };

  // CRITICAL FIX: The graph uses contextDistribution which separates special zones from base quadrants
  // when showSpecialZones is true. dataReport.distribution includes apostles in loyalists.
  // We need to use contextDistribution if provided to match what the graph shows.
  if (contextDistribution) {
    distribution = {
      loyalists: contextDistribution.loyalists || 0,
      mercenaries: contextDistribution.mercenaries || 0,
      hostages: contextDistribution.hostages || 0,
      defectors: contextDistribution.defectors || 0,
      apostles: contextDistribution.apostles || 0,
      terrorists: contextDistribution.terrorists || 0,
      nearApostles: contextDistribution.near_apostles || 0,
      neutrals: distribution.neutrals || 0 // Keep neutrals from dataReport
    };
    console.log('[aggregateReportData] Using context distribution to match graph display:', distribution);
  } else {
    const showSpecialZones = proximityAnalysis?.settings?.showSpecialZones || false;
    if (showSpecialZones && distribution.apostles > 0) {
      console.warn('[aggregateReportData] WARNING: No contextDistribution provided. Distribution may not match graph display when showSpecialZones is true.', {
        dataReportLoyalists: distribution.loyalists,
        dataReportApostles: distribution.apostles,
        note: 'The evaluator may calculate percentages differently than the graph. Consider passing contextDistribution parameter.'
      });
    }
  }

  // Calculate total - use totalEntries directly from dataReport as the source of truth
  // This ensures consistency with what's shown in the Data Report section
  // NOTE: totalEntries includes neutrals (it's activeData.length)
  // The DistributionSection graph uses effectiveTotal which may be different if filters are applied
  // But for the Action Plan, we use totalEntries to match the base data report
  const total = dataReport?.totalEntries || 0;
  
  // Debug: Log the values to verify calculation
  console.log('[aggregateReportData] Distribution totals:', {
    totalEntries: total,
    neutrals: distribution.neutrals || 0,
    loyalists: distribution.loyalists || 0,
    apostles: distribution.apostles || 0,
    expectedPercentIfIncludingNeutrals: total > 0 ? ((distribution.loyalists || 0) / total * 100).toFixed(1) : '0',
    expectedPercentIfExcludingNeutrals: (total - (distribution.neutrals || 0)) > 0 
      ? ((distribution.loyalists || 0) / (total - (distribution.neutrals || 0)) * 100).toFixed(1) 
      : '0',
    note: 'Using context distribution if available from proximity analysis to match graph display'
  });

  // Extract response concentration data
  const responseConcentration = dataReport?.mostCommonCombos ? {
    mostCommonCombos: dataReport.mostCommonCombos
  } : null;

  // Extract statistics
  const statistics = dataReport?.statistics ? {
    satisfaction: {
      average: dataReport.statistics.satisfaction.average,
      mode: dataReport.statistics.satisfaction.mode,
      distribution: dataReport.statistics.satisfaction.distribution
    },
    loyalty: {
      average: dataReport.statistics.loyalty.average,
      mode: dataReport.statistics.loyalty.mode,
      distribution: dataReport.statistics.loyalty.distribution
    }
  } : {
    satisfaction: {
      average: 0,
      mode: 0,
      distribution: {}
    },
    loyalty: {
      average: 0,
      mode: 0,
      distribution: {}
    }
  };

  return {
    dataReport,
    distribution,
    total,
    proximity: proximityAnalysis,
    recommendationScore: recommendationScore || null,
    responseConcentration,
    statistics
  };
}

