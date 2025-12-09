import type { Risk } from '../types';
import type { EvaluatorResults } from '../types';
import { getChartSelectorForStatement } from '../evaluators/chartMapping';

/**
 * Gets display name for proximity relationship
 */
function getProximityDisplayName(relationship: string, isClassicModel: boolean = false): string {
  const terroristsTerm = isClassicModel ? 'Terrorists' : 'Trolls';
  const apostlesTerm = isClassicModel ? 'Apostles' : 'Advocates';
  const nearApostlesTerm = isClassicModel ? 'Near-Apostles' : 'Near-Advocates';
  
  const names: Record<string, string> = {
    'loyalists_close_to_mercenaries': 'Loyalists close to Mercenaries',
    'loyalists_close_to_hostages': 'Hostages close to Loyalists',
    'mercenaries_close_to_defectors': 'Mercenaries close to Defectors',
    'hostages_close_to_defectors': 'Hostages close to Defectors',
    'defectors_close_to_terrorists': `Defectors close to ${terroristsTerm}`,
    'loyalists_close_to_defectors': 'Loyalists close to Defectors',
    'mercenaries_close_to_hostages': 'Mercenaries close to Hostages',
    'loyalists_close_to_apostles': `Loyalists close to ${apostlesTerm}`,
    'loyalists_close_to_near_apostles': `Loyalists close to ${nearApostlesTerm}`,
    'near_apostles_close_to_apostles': `${nearApostlesTerm} close to ${apostlesTerm}`
  };
  return names[relationship] || relationship.replace(/_/g, ' ');
}

/**
 * Generates Risks statements based on evaluator results
 */
export function generateRisks(
  evaluators: EvaluatorResults, 
  isClassicModel: boolean = false,
  proximityAnalysis?: any,
  originalData?: Array<{ id: string; name?: string; email?: string; satisfaction: number; loyalty: number; excluded?: boolean }>,
  getQuadrantForPoint?: (point: { satisfaction: number; loyalty: number }) => string,
  loyaltyScale?: string
): Risk[] {
  const risks: Risk[] = [];

  // ===== PROXIMITY RISKS =====

  if (evaluators.proximity.hasRisks && evaluators.proximity.topRisks.length > 0) {
    // Top risk
    const topRisk = evaluators.proximity.topRisks[0];
    if (topRisk.count > 0) {
      // Get customer list from proximity analysis
      let customers: Array<{
        id: string;
        name?: string;
        email?: string;
        satisfaction: number;
        loyalty: number;
        position: string;
        distance: number;
      }> = [];
      
      if (proximityAnalysis?.analysis?.[topRisk.type as keyof typeof proximityAnalysis.analysis]?.customers) {
        const detail = proximityAnalysis.analysis[topRisk.type as keyof typeof proximityAnalysis.analysis];
        customers = detail.customers.map((c: any) => {
          const originalCustomer = originalData?.find(d => d.id === c.id);
          return {
            id: c.id,
            name: c.name || originalCustomer?.name || '',
            email: originalCustomer?.email || '',
            satisfaction: c.satisfaction,
            loyalty: c.loyalty,
            position: `(${c.satisfaction}, ${c.loyalty})`,
            distance: c.distanceFromBoundary || 0
          };
        });
      }
      
      risks.push({
        id: `risk-${topRisk.type}`,
        statement: `You have ${topRisk.count} customers in the ${getProximityDisplayName(topRisk.type, isClassicModel)} relationship, which represents a significant risk of these customers moving to a less favourable quadrant.`,
        source: 'proximity',
        severity: topRisk.severity,
        supportingData: {
          relationship: topRisk.type,
          count: topRisk.count,
          severity: topRisk.severity,
          customers: customers
        },
        chartSelector: getChartSelectorForStatement('proximity-risk')
      });
    }

    // Crisis diagonal (loyalists → defectors) - highest risk
    const crisisRisk = evaluators.proximity.topRisks.find(
      r => r.type === 'loyalists_close_to_defectors'
    );
    if (crisisRisk && crisisRisk.count > 0) {
      // Get customer list from proximity analysis
      let customers: Array<{
        id: string;
        name?: string;
        email?: string;
        satisfaction: number;
        loyalty: number;
        position: string;
        distance: number;
      }> = [];
      
      if (proximityAnalysis?.analysis?.loyalists_close_to_defectors?.customers) {
        const detail = proximityAnalysis.analysis.loyalists_close_to_defectors;
        customers = detail.customers.map((c: any) => {
          const originalCustomer = originalData?.find(d => d.id === c.id);
          return {
            id: c.id,
            name: c.name || originalCustomer?.name || '',
            email: originalCustomer?.email || '',
            satisfaction: c.satisfaction,
            loyalty: c.loyalty,
            position: `(${c.satisfaction}, ${c.loyalty})`,
            distance: c.distanceFromBoundary || 0
          };
        });
      }
      
      risks.push({
        id: 'risk-crisis',
        statement: `There's a critical risk with ${crisisRisk.count} Loyalists who are close to becoming Defectors. This represents a crisis situation - your best customers are at risk of becoming your worst. Immediate action is required to prevent this catastrophic shift.`,
        source: 'proximity',
        severity: 'high',
        supportingData: {
          count: crisisRisk.count,
          relationship: 'loyalists_close_to_defectors',
          customers: customers
        },
        chartSelector: getChartSelectorForStatement('proximity-crisis')
      });
    }

    // Loyalists losing loyalty
    const loyalistsRisk = evaluators.proximity.topRisks.find(
      r => r.type === 'loyalists_close_to_mercenaries'
    );
    if (loyalistsRisk && loyalistsRisk.count > 0) {
      // Get customer list from proximity analysis
      let customers: Array<{
        id: string;
        name?: string;
        email?: string;
        satisfaction: number;
        loyalty: number;
        position: string;
        distance: number;
      }> = [];
      
      if (proximityAnalysis?.analysis?.loyalists_close_to_mercenaries?.customers) {
        const detail = proximityAnalysis.analysis.loyalists_close_to_mercenaries;
        customers = detail.customers.map((c: any) => {
          const originalCustomer = originalData?.find(d => d.id === c.id);
          return {
            id: c.id,
            name: c.name || originalCustomer?.name || '',
            email: originalCustomer?.email || '',
            satisfaction: c.satisfaction,
            loyalty: c.loyalty,
            position: `(${c.satisfaction}, ${c.loyalty})`,
            distance: c.distanceFromBoundary || 0
          };
        });
      }
      
      risks.push({
        id: 'risk-loyalists-losing-loyalty',
        statement: `You have ${loyalistsRisk.count} Loyalists who are close to becoming Mercenaries. These customers are satisfied but their loyalty is wavering - they're at risk of becoming price-sensitive and switching to competitors.`,
        source: 'proximity',
        severity: 'high',
        supportingData: {
          count: loyalistsRisk.count,
          relationship: 'loyalists_close_to_mercenaries',
          customers: customers
        },
        chartSelector: getChartSelectorForStatement('proximity-risk')
      });
    }
  }

  // Crisis indicators from proximity summary
  if (evaluators.proximity.crisisIndicators.length > 0) {
    // Get all customers from crisis indicator proximity relationships
    let customers: Array<{
      id: string;
      name?: string;
      email?: string;
      satisfaction: number;
      loyalty: number;
      position: string;
      distance?: number;
      riskScore?: number;
    }> = [];
    
    if (proximityAnalysis?.analysis && originalData) {
      const customerIds = new Set<string>();
      // Collect all unique customers from all crisis indicator relationships
      evaluators.proximity.crisisIndicators.forEach((indicator: string) => {
        const detail = proximityAnalysis.analysis[indicator as keyof typeof proximityAnalysis.analysis];
        if (detail?.customers && Array.isArray(detail.customers)) {
          detail.customers.forEach((c: any) => {
            if (!customerIds.has(c.id)) {
              customerIds.add(c.id);
              const originalCustomer = originalData.find(d => d.id === c.id);
              customers.push({
                id: c.id,
                name: c.name || originalCustomer?.name || '',
                email: originalCustomer?.email || '',
                satisfaction: c.satisfaction,
                loyalty: c.loyalty,
                position: `(${c.satisfaction}, ${c.loyalty})`,
                distance: c.distanceFromBoundary,
                riskScore: c.riskScore,
                ...(originalCustomer || {}) // Spread all additional properties from original data
              });
            }
          });
        }
      });
    }
    
    risks.push({
      id: 'risk-crisis-indicators',
      statement: `The proximity analysis has identified ${evaluators.proximity.crisisIndicators.length} crisis indicator${evaluators.proximity.crisisIndicators.length > 1 ? 's' : ''}, suggesting that a significant portion of your customer base is at risk of negative movement.`,
      source: 'proximity',
      severity: 'high',
      supportingData: {
        indicators: evaluators.proximity.crisisIndicators,
        customers: customers.length > 0 ? customers : undefined
      },
      chartSelector: getChartSelectorForStatement('proximity-crisis')
    });
  }

  // ===== RECOMMENDATION SCORE RISKS =====

  // Helper function to get detractors from original data
  const getDetractors = (): Array<{
    id: string;
    name?: string;
    email?: string;
    satisfaction: number;
    loyalty: number;
    position: string;
  }> => {
    if (!originalData || !loyaltyScale) return [];
    
    // Import the function to identify detractors
    const { getCategoryMapping } = require('../../../../../utils/recommendationScore');
    const mapping = getCategoryMapping(loyaltyScale as any);
    
    return originalData
      .filter(point => !point.excluded && mapping.detractors.includes(point.loyalty))
      .map(point => ({
        id: point.id,
        name: point.name || '',
        email: point.email || '',
        satisfaction: point.satisfaction,
        loyalty: point.loyalty,
        position: `(${point.satisfaction}, ${point.loyalty})`,
        ...(point as any) // Spread all additional properties from original data
      }));
  };

  if (evaluators.recommendation.detractors > 0) {
    const detractorPercent = evaluators.recommendation.detractorsPercent;
    if (detractorPercent > 20) {
      const detractorsCustomers = getDetractors();
      
      risks.push({
        id: 'risk-detractors',
        statement: `You have ${evaluators.recommendation.detractors} Detractors (${detractorPercent.toFixed(1)}% of your customers), who are unlikely to recommend your brand and may actively discourage others. This represents a significant risk to your reputation and growth.`,
        source: 'recommendation',
        severity: detractorPercent > 30 ? 'high' : 'medium',
        supportingData: {
          detractors: evaluators.recommendation.detractors,
          detractorsPercent: detractorPercent,
          customers: detractorsCustomers.length > 0 ? detractorsCustomers : undefined
        },
        chartSelector: getChartSelectorForStatement('detractor-concern')
      });
    }
  }

  if (evaluators.recommendation.isWeak) {
    // Note: We don't include customer list here because it would be identical to 'risk-detractors'
    // The Detractors risk already shows the full list of detractors
    risks.push({
      id: 'risk-negative-nps',
      statement: `Your Recommendation Score of ${evaluators.recommendation.score.toFixed(1)} is negative, meaning you have more Detractors than Promoters. This is a serious concern that requires immediate attention to prevent further customer loss and reputational damage.`,
      source: 'recommendation',
      severity: 'high',
      supportingData: {
        score: evaluators.recommendation.score,
        detractors: evaluators.recommendation.detractors,
        promoters: evaluators.recommendation.promoters
        // Intentionally omitting customers list - see 'risk-detractors' for the full list
      },
      chartSelector: getChartSelectorForStatement('nps-analysis')
    });
  }

  // ===== DISTRIBUTION RISKS =====

  // If Defectors is a significant segment
  const defectorsCount = evaluators.distribution.counts.defectors || 0;
  const defectorsPercent = evaluators.distribution.percentages.defectors || 0;
  if (defectorsCount > 0 && defectorsPercent > 20) {
    // Get customer list for Defectors
    let customers: Array<{
      id: string;
      name?: string;
      email?: string;
      satisfaction: number;
      loyalty: number;
      position: string;
    }> = [];
    
    if (originalData && getQuadrantForPoint) {
      customers = originalData
        .filter(point => !point.excluded && getQuadrantForPoint(point) === 'defectors')
        .map(point => ({
          id: point.id,
          name: point.name || '',
          email: point.email || '',
          satisfaction: point.satisfaction,
          loyalty: point.loyalty,
          position: `(${point.satisfaction}, ${point.loyalty})`
        }));
    }
    
    risks.push({
      id: 'risk-defectors',
      statement: `Your Defectors segment represents ${defectorsPercent.toFixed(1)}% of your customer base. These customers are both dissatisfied and disloyal, representing a significant risk of churn and negative word-of-mouth.`,
      source: 'distribution',
      severity: defectorsPercent > 30 ? 'high' : 'medium',
      supportingData: {
        count: defectorsCount,
        percentage: defectorsPercent,
        quadrant: 'defectors',
        customers: customers.length > 0 ? customers : undefined
      },
      chartSelector: getChartSelectorForStatement('distribution-details')
    });
  }

  // If Hostages is a significant segment
  const hostagesCount = evaluators.distribution.counts.hostages || 0;
  const hostagesPercent = evaluators.distribution.percentages.hostages || 0;
  if (hostagesCount > 0 && hostagesPercent > 20) {
    // Get customer list for Hostages
    let customers: Array<{
      id: string;
      name?: string;
      email?: string;
      satisfaction: number;
      loyalty: number;
      position: string;
    }> = [];
    
    if (originalData && getQuadrantForPoint) {
      customers = originalData
        .filter(point => !point.excluded && getQuadrantForPoint(point) === 'hostages')
        .map(point => ({
          id: point.id,
          name: point.name || '',
          email: point.email || '',
          satisfaction: point.satisfaction,
          loyalty: point.loyalty,
          position: `(${point.satisfaction}, ${point.loyalty})`
        }));
    }
    
    risks.push({
      id: 'risk-hostages',
      statement: `Your Hostages segment represents ${hostagesPercent.toFixed(1)}% of your customer base. These customers are loyal but dissatisfied - they're staying with you out of necessity rather than choice, which makes them highly vulnerable to churn if alternatives become available.`,
      source: 'distribution',
      severity: 'medium',
      supportingData: {
        count: hostagesCount,
        percentage: hostagesPercent,
        quadrant: 'hostages',
        customers: customers.length > 0 ? customers : undefined
      },
      chartSelector: getChartSelectorForStatement('distribution-details')
    });
  }

  // Sort by severity (high first), then by count
  return risks.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
    if (severityDiff !== 0) return severityDiff;
    
    const aCount = a.supportingData?.count || 0;
    const bCount = b.supportingData?.count || 0;
    return bCount - aCount;
  });
}

