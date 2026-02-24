import type { Opportunity } from '../types';
import type { EvaluatorResults } from '../types';
import { getChartSelectorForStatement } from '../evaluators/chartMapping';
import { getStatementTemplate, renderTemplate } from './statementLoader';

/**
 * Gets display name for proximity relationship
 */
function getProximityDisplayName(relationship: string, isClassicModel: boolean = false): string {
  const terroristsTerm = isClassicModel ? 'Terrorists' : 'Trolls';
  const apostlesTerm = isClassicModel ? 'Apostles' : 'Advocates';
  const nearApostlesTerm = isClassicModel ? 'Near-Apostles' : 'Near-Advocates';
  
  const names: Record<string, string> = {
    'mercenaries_close_to_loyalists': 'Mercenaries close to Loyalists',
    'hostages_close_to_loyalists': 'Hostages close to Loyalists',
    'defectors_close_to_mercenaries': 'Defectors close to Mercenaries',
    'defectors_close_to_hostages': 'Defectors close to Hostages',
    'loyalists_close_to_apostles': `Loyalists close to ${apostlesTerm}`,
    'loyalists_close_to_near_apostles': `Loyalists close to ${nearApostlesTerm}`,
    'near_apostles_close_to_apostles': `${nearApostlesTerm} close to ${apostlesTerm}`,
    'hostages_close_to_mercenaries': 'Hostages close to Mercenaries',
    'defectors_close_to_loyalists': 'Defectors close to Loyalists'
  };
  return names[relationship] || relationship.replace(/_/g, ' ');
}

function getTargetQuadrantFromRelationship(relationship: string): string | null {
  const parts = relationship.split('_close_to_');
  return parts.length === 2 ? parts[1] : null;
}

function isPositiveTargetQuadrant(quadrant: string | null): boolean {
  return quadrant === 'loyalists' || quadrant === 'apostles' || quadrant === 'near_apostles';
}

/**
 * Generates Opportunities statements based on evaluator results
 */
export function generateOpportunities(
  evaluators: EvaluatorResults, 
  isClassicModel: boolean = false,
  proximityAnalysis?: any,
  originalData?: Array<{ id: string; name?: string; email?: string; satisfaction: number; loyalty: number; excluded?: boolean }>,
  getQuadrantForPoint?: (point: { satisfaction: number; loyalty: number }) => string
): Opportunity[] {
  const opportunities: Opportunity[] = [];
  const apostlesTerm = isClassicModel ? 'Apostles' : 'Advocates';

  // ===== PROXIMITY OPPORTUNITIES =====

  if (evaluators.proximity.hasOpportunities && evaluators.proximity.topOpportunities.length > 0) {
    // Top opportunity
    const topOpp = evaluators.proximity.topOpportunities[0];
    if (topOpp.count > 0) {
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
      
      if (proximityAnalysis?.analysis?.[topOpp.type as keyof typeof proximityAnalysis.analysis]?.customers) {
        const detail = proximityAnalysis.analysis[topOpp.type as keyof typeof proximityAnalysis.analysis];
        customers = detail.customers.map((c: any) => {
          const originalCustomer = originalData?.find(d => d.id === c.id);
          return {
            id: c.id,
            name: c.name || originalCustomer?.name || '',
            email: originalCustomer?.email || '',
            satisfaction: c.satisfaction,
            loyalty: c.loyalty,
            position: `(${c.satisfaction}, ${c.loyalty})`,
            distance: c.distanceFromBoundary || 0,
            ...(originalCustomer || {}) // Spread all additional properties from original data
          };
        });
      }
      
      const targetQuadrant = getTargetQuadrantFromRelationship(topOpp.type);
      const targetDescription = isPositiveTargetQuadrant(targetQuadrant) ? 'a stronger segment' : 'a more stable segment';

      opportunities.push({
        id: `opportunity-${topOpp.type}`,
        statement: `You have ${topOpp.count} customers in the ${getProximityDisplayName(topOpp.type, isClassicModel)} relationship, representing a significant opportunity to move these customers into ${targetDescription} through targeted engagement.`,
        source: 'proximity',
        impact: topOpp.impact,
        supportingData: {
          relationship: topOpp.type,
          count: topOpp.count,
          impact: topOpp.impact,
          customers: customers
        },
        chartSelector: getChartSelectorForStatement('proximity-opportunity')
      });
    }

    // Redemption diagonal (defectors → loyalists) - high value opportunity
    const redemptionOpp = evaluators.proximity.topOpportunities.find(
      o => o.type === 'defectors_close_to_loyalists'
    );
    if (redemptionOpp && redemptionOpp.count > 0) {
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
      
      if (proximityAnalysis?.analysis?.defectors_close_to_loyalists?.customers) {
        const detail = proximityAnalysis.analysis.defectors_close_to_loyalists;
        customers = detail.customers.map((c: any) => {
          const originalCustomer = originalData?.find(d => d.id === c.id);
          return {
            id: c.id,
            name: c.name || originalCustomer?.name || '',
            email: originalCustomer?.email || '',
            satisfaction: c.satisfaction,
            loyalty: c.loyalty,
            position: `(${c.satisfaction}, ${c.loyalty})`,
            distance: c.distanceFromBoundary || 0,
            ...(originalCustomer || {}) // Spread all additional properties from original data
          };
        });
      }
      
      opportunities.push({
        id: 'opportunity-redemption',
        statement: `There's a particularly valuable opportunity with ${redemptionOpp.count} Defectors who are close to becoming Loyalists. These customers represent a redemption opportunity - they've been disappointed but are still within reach of becoming your strongest advocates.`,
        source: 'proximity',
        impact: 'high',
        supportingData: {
          count: redemptionOpp.count,
          relationship: 'defectors_close_to_loyalists',
          customers: customers
        },
        chartSelector: getChartSelectorForStatement('proximity-redemption')
      });
    }

    // Apostles promotion opportunities
    const apostlesOpp = evaluators.proximity.topOpportunities.find(
      o => o.type === 'loyalists_close_to_apostles' || o.type === 'near_apostles_close_to_apostles'
    );
    if (apostlesOpp && apostlesOpp.count > 0) {
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
      
      if (proximityAnalysis?.analysis?.[apostlesOpp.type as keyof typeof proximityAnalysis.analysis]?.customers) {
        const detail = proximityAnalysis.analysis[apostlesOpp.type as keyof typeof proximityAnalysis.analysis];
        customers = detail.customers.map((c: any) => {
          const originalCustomer = originalData?.find(d => d.id === c.id);
          return {
            id: c.id,
            name: c.name || originalCustomer?.name || '',
            email: originalCustomer?.email || '',
            satisfaction: c.satisfaction,
            loyalty: c.loyalty,
            position: `(${c.satisfaction}, ${c.loyalty})`,
            distance: c.distanceFromBoundary || 0,
            ...(originalCustomer || {}) // Spread all additional properties from original data
          };
        });
      }
      
      opportunities.push({
        id: 'opportunity-apostles',
        statement: `You have ${apostlesOpp.count} customers who are close to becoming ${apostlesTerm} - your strongest brand advocates. With the right engagement, these customers could become powerful advocates for your brand.`,
        source: 'proximity',
        impact: 'high',
        supportingData: {
          count: apostlesOpp.count,
          relationship: apostlesOpp.type,
          customers: customers
        },
        chartSelector: getChartSelectorForStatement('proximity-opportunity')
      });
    }
  }

  // ===== RECOMMENDATION SCORE OPPORTUNITIES =====
  // Using templates from markdown document (source of truth)

  if (evaluators.recommendation.promoters > 0) {
    const promoterPercent = evaluators.recommendation.promotersPercent;
    if (promoterPercent > 20) {
      const template = getStatementTemplate('opportunities', 'High Promoters Opportunity');
      if (template) {
        opportunities.push({
          id: 'opportunity-promoters',
          statement: renderTemplate(template.template, {
            count: evaluators.recommendation.promoters,
            percentage: promoterPercent.toFixed(1)
          }),
          source: 'recommendation',
          impact: 'high',
          supportingData: {
            promoters: evaluators.recommendation.promoters,
            promotersPercent: promoterPercent
          },
          chartSelector: getChartSelectorForStatement('promoter-opportunity')
        });
      }
    } else if (promoterPercent > 10) {
      const template = getStatementTemplate('opportunities', 'Growing Promoters Opportunity');
      if (template) {
        opportunities.push({
          id: 'opportunity-promoters-growing',
          statement: renderTemplate(template.template, {
            count: evaluators.recommendation.promoters,
            percentage: promoterPercent.toFixed(1)
          }),
          source: 'recommendation',
          impact: 'medium',
          supportingData: {
            promoters: evaluators.recommendation.promoters,
            promotersPercent: promoterPercent
          },
          chartSelector: getChartSelectorForStatement('promoter-opportunity')
        });
      }
    }
  }

  // Opportunity: Passives can be converted - using template from markdown
  if (evaluators.recommendation.passives > 0) {
    const passivesPercent = evaluators.recommendation.passivesPercent;
    if (passivesPercent > 20) {
      const template = getStatementTemplate('opportunities', 'Passives Conversion Opportunity');
      if (template) {
        opportunities.push({
          id: 'opportunity-passives',
          statement: renderTemplate(template.template, {
            count: evaluators.recommendation.passives,
            percentage: passivesPercent.toFixed(1)
          }),
          source: 'recommendation',
          impact: 'medium',
          supportingData: {
            passives: evaluators.recommendation.passives,
            passivesPercent: passivesPercent
          },
          chartSelector: getChartSelectorForStatement('promoter-opportunity')
        });
      }
    }
  }

  // ===== NEUTRAL CUSTOMERS OPPORTUNITIES =====

  if (evaluators.distribution.neutralCount > 0) {
    const neutralCount = evaluators.distribution.neutralCount;
    const neutralPercent = evaluators.distribution.neutralPercent;
    
    opportunities.push({
      id: 'opportunity-neutral-customers',
      statement: `You have ${neutralCount} Neutral customer${neutralCount === 1 ? '' : 's'} (${neutralPercent.toFixed(1)}% of your total) who are at a critical transition point. These customers represent a significant opportunity - they haven't formed strong opinions yet, making them more receptive to positive experiences. With targeted engagement, they could easily become Loyalists or even Apostles. Their neutral position makes them "low-hanging fruit" for conversion, as they're more malleable than customers with strong opinions.`,
      source: 'distribution',
      impact: 'high',
      supportingData: {
        count: neutralCount,
        percentage: neutralPercent
      },
      chartSelector: getChartSelectorForStatement('distribution-details')
    });
  }

  // ===== DISTRIBUTION OPPORTUNITIES =====

  // If Mercenaries is a significant segment
  const mercenariesCount = evaluators.distribution.counts.mercenaries || 0;
  const mercenariesPercent = evaluators.distribution.percentages.mercenaries || 0;
  if (mercenariesCount > 0 && mercenariesPercent > 15) {
    // Get customer list for Mercenaries
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
        .filter(point => !point.excluded && getQuadrantForPoint(point) === 'mercenaries')
        .map(point => ({
          id: point.id,
          name: point.name || '',
          email: point.email || '',
          satisfaction: point.satisfaction,
          loyalty: point.loyalty,
          position: `(${point.satisfaction}, ${point.loyalty})`,
          ...(point as any) // Spread all additional properties from original data
        }));
    }
    
    opportunities.push({
      id: 'opportunity-mercenaries',
      statement: `Your Mercenaries segment represents ${mercenariesPercent.toFixed(1)}% of your customer base. These customers are satisfied but not yet loyal - they represent a significant opportunity to build stronger relationships and increase retention through targeted loyalty programmes.`,
      source: 'distribution',
      impact: 'medium',
      supportingData: {
        count: mercenariesCount,
        percentage: mercenariesPercent,
        quadrant: 'mercenaries',
        customers: customers.length > 0 ? customers : undefined
      },
      chartSelector: getChartSelectorForStatement('distribution-details')
    });
  } else if (mercenariesCount > 0 && mercenariesPercent > 5) {
    opportunities.push({
      id: 'opportunity-mercenaries-growing',
      statement: `You have ${mercenariesCount} Mercenaries (${mercenariesPercent.toFixed(1)}% of your customer base). These satisfied but not yet loyal customers represent an opportunity to strengthen relationships and improve retention.`,
      source: 'distribution',
      impact: 'low',
      supportingData: {
        count: mercenariesCount,
        percentage: mercenariesPercent
      },
      chartSelector: getChartSelectorForStatement('distribution-details')
    });
  }

  // Opportunity: Hostages can be converted to Loyalists
  const hostagesCount = evaluators.distribution.counts.hostages || 0;
  const hostagesPercent = evaluators.distribution.percentages.hostages || 0;
  if (hostagesCount > 0 && hostagesPercent > 10) {
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
          position: `(${point.satisfaction}, ${point.loyalty})`,
          ...(point as any) // Spread all additional properties from original data
        }));
    }
    
    opportunities.push({
      id: 'opportunity-hostages',
      statement: `You have ${hostagesCount} Hostages (${hostagesPercent.toFixed(1)}% of your customers) who are loyal but not satisfied. These customers represent an opportunity to improve their satisfaction and convert them into true Loyalists through better product or service experiences.`,
      source: 'distribution',
      impact: 'high',
      supportingData: {
        count: hostagesCount,
        percentage: hostagesPercent,
        quadrant: 'hostages',
        customers: customers.length > 0 ? customers : undefined
      },
      chartSelector: getChartSelectorForStatement('distribution-details')
    });
  }

  // Opportunity: Balanced distribution is healthy
  if (evaluators.distribution.isBalanced && evaluators.distribution.largest) {
    opportunities.push({
      id: 'opportunity-balanced-distribution',
      statement: `Your customer base shows a relatively balanced distribution across segments, which is a healthy foundation. This diversity reduces risk and provides multiple pathways for growth and engagement.`,
      source: 'distribution',
      impact: 'low',
      supportingData: {},
      chartSelector: getChartSelectorForStatement('distribution-balance')
    });
  }

  // Fallback: If no opportunities were generated but we have customer data, add a generic opportunity
  if (opportunities.length === 0 && evaluators.sampleSize.total > 0) {
    const totalCustomers = evaluators.sampleSize.total;
    const largestQuadrant = evaluators.distribution.largest;
    
    opportunities.push({
      id: 'opportunity-general-growth',
      statement: `With ${totalCustomers} customer${totalCustomers === 1 ? '' : 's'} in your analysis, there are always opportunities for growth and improvement. Focus on understanding your customer segments and identifying areas where you can enhance satisfaction and loyalty.${largestQuadrant ? ` Your largest segment is ${largestQuadrant.charAt(0).toUpperCase() + largestQuadrant.slice(1)}, which represents a key area for strategic focus.` : ''}`,
      source: 'distribution',
      impact: 'medium',
      supportingData: {
        total: totalCustomers,
        largestQuadrant: largestQuadrant || null
      },
      chartSelector: getChartSelectorForStatement('distribution-details')
    });
  }
  
  // Sort by impact (high first), then by count
  const sorted = opportunities.sort((a, b) => {
    const impactOrder = { high: 3, medium: 2, low: 1 };
    const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
    if (impactDiff !== 0) return impactDiff;
    
    const aCount = a.supportingData?.count || 0;
    const bCount = b.supportingData?.count || 0;
    return bCount - aCount;
  });
  
  // Debug logging
  if (sorted.length === 0) {
    console.warn('[generateOpportunities] No opportunities generated. Check evaluator conditions.');
  } else {
    console.log(`[generateOpportunities] Generated ${sorted.length} opportunity/opportunities (${sorted.length === 1 && sorted[0].id === 'opportunity-general-growth' ? 'fallback' : 'specific'})`);
  }
  
  return sorted;
}

