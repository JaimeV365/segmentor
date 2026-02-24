import type { ProximityEvaluation } from '../types';
import type { ProximityAnalysisResult } from '../../../services/EnhancedProximityClassifier';

/**
 * Evaluates proximity analysis to extract risks and opportunities
 */
export function evaluateProximity(
  proximityAnalysis: ProximityAnalysisResult | null
): ProximityEvaluation {
  if (!proximityAnalysis || !proximityAnalysis.summary) {
    return {
      hasRisks: false,
      hasOpportunities: false,
      highRiskCount: 0,
      highOpportunityCount: 0,
      crisisIndicators: [],
      opportunityIndicators: [],
      topRisks: [],
      topOpportunities: []
    };
  }

  const { analysis, summary } = proximityAnalysis;

  const getUniqueCustomerCount = (detail: any): number => {
    if (Array.isArray(detail?.customers) && detail.customers.length > 0) {
      const uniqueIds = new Set(
        detail.customers
          .map((c: any) => c?.id)
          .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      );
      if (uniqueIds.size > 0) {
        return uniqueIds.size;
      }
    }
    return detail?.customerCount ?? 0;
  };

  // Define warning (risk) relationships
  const warningRelationships = [
    'loyalists_close_to_mercenaries',
    'loyalists_close_to_hostages',
    'mercenaries_close_to_defectors',
    'hostages_close_to_defectors',
    'defectors_close_to_terrorists',
    'loyalists_close_to_defectors', // Crisis diagonal
    'mercenaries_close_to_hostages', // Disappointment diagonal
  ];

  // Define opportunity relationships
  const opportunityRelationships = [
    'mercenaries_close_to_loyalists',
    'hostages_close_to_loyalists',
    'defectors_close_to_mercenaries',
    'defectors_close_to_hostages',
    'loyalists_close_to_apostles',
    'loyalists_close_to_near_apostles',
    'near_apostles_close_to_apostles',
    'hostages_close_to_mercenaries', // Switching diagonal
    'defectors_close_to_loyalists', // Redemption diagonal
  ];

  // Extract risks
  const risks: Array<{ type: string; count: number; severity: 'high' | 'medium' | 'low' }> = [];
  warningRelationships.forEach(rel => {
    const detail = analysis[rel as keyof typeof analysis];
    const uniqueCount = getUniqueCustomerCount(detail);
    if (detail && uniqueCount > 0) {
      const severity = detail.riskLevel === 'HIGH' ? 'high' :
                      detail.riskLevel === 'MODERATE' ? 'medium' : 'low';
      risks.push({
        type: rel,
        count: uniqueCount,
        severity
      });
    }
  });

  // Extract opportunities
  const opportunities: Array<{ type: string; count: number; impact: 'high' | 'medium' | 'low' }> = [];
  opportunityRelationships.forEach(rel => {
    const detail = analysis[rel as keyof typeof analysis];
    const uniqueCount = getUniqueCustomerCount(detail);
    if (detail && uniqueCount > 0) {
      // For opportunities, use risk level as inverse impact indicator
      // Low risk = high opportunity impact
      const impact = detail.riskLevel === 'LOW' ? 'high' :
                     detail.riskLevel === 'MODERATE' ? 'medium' : 'low';
      opportunities.push({
        type: rel,
        count: uniqueCount,
        impact
      });
    }
  });

  // Sort by count (descending)
  risks.sort((a, b) => b.count - a.count);
  opportunities.sort((a, b) => b.count - a.count);

  // Get top 5 risks and opportunities
  const topRisks = risks.slice(0, 5);
  const topOpportunities = opportunities.slice(0, 5);

  // Count high severity/impact
  const highRiskCount = risks.filter(r => r.severity === 'high').length;
  const highOpportunityCount = opportunities.filter(o => o.impact === 'high').length;

  return {
    hasRisks: risks.length > 0,
    hasOpportunities: opportunities.length > 0,
    highRiskCount,
    highOpportunityCount,
    crisisIndicators: summary.crisisIndicators || [],
    opportunityIndicators: summary.opportunityIndicators || [],
    topRisks,
    topOpportunities
  };
}

