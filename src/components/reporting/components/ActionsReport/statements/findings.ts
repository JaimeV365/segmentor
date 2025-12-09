import type { Finding } from '../types';
import type { EvaluatorResults } from '../types';
import { getStatementTemplate, renderTemplate } from './statementLoader';

/**
 * Gets display name for quadrant
 */
function getQuadrantDisplayName(quadrant: string, isClassicModel: boolean = false): string {
  const names: Record<string, string> = {
    loyalists: 'Loyalists',
    mercenaries: 'Mercenaries',
    hostages: 'Hostages',
    defectors: 'Defectors',
    apostles: isClassicModel ? 'Apostles' : 'Advocates',
    terrorists: isClassicModel ? 'Terrorists' : 'Trolls',
    near_apostles: isClassicModel ? 'Near-Apostles' : 'Near-Advocates',
    nearApostles: isClassicModel ? 'Near-Apostles' : 'Near-Advocates',
    near_terrorists: isClassicModel ? 'Near-Terrorists' : 'Near-Trolls'
  };
  return names[quadrant] || quadrant;
}

/**
 * Gets display name for proximity relationship
 */
function getProximityDisplayName(relationship: string, isClassicModel: boolean = false): string {
  const names: Record<string, string> = {
    'loyalists_close_to_mercenaries': 'Loyalists close to Mercenaries',
    'loyalists_close_to_defectors': 'Loyalists close to Defectors',
    'mercenaries_close_to_hostages': 'Mercenaries close to Hostages',
    'mercenaries_close_to_loyalists': 'Mercenaries close to Loyalists',
    'hostages_close_to_defectors': 'Hostages close to Defectors',
    'hostages_close_to_mercenaries': 'Hostages close to Mercenaries',
    'defectors_close_to_hostages': 'Defectors close to Hostages',
    'defectors_close_to_loyalists': 'Defectors close to Loyalists',
    'apostles_close_to_loyalists': isClassicModel ? 'Apostles close to Loyalists' : 'Advocates close to Loyalists',
    'apostles_close_to_mercenaries': isClassicModel ? 'Apostles close to Mercenaries' : 'Advocates close to Mercenaries',
    'terrorists_close_to_hostages': isClassicModel ? 'Terrorists close to Hostages' : 'Trolls close to Hostages',
    'terrorists_close_to_defectors': isClassicModel ? 'Terrorists close to Defectors' : 'Trolls close to Defectors',
    'near_apostles_close_to_apostles': isClassicModel ? 'Near-Apostles close to Apostles' : 'Near-Advocates close to Advocates',
    'near_apostles_close_to_loyalists': isClassicModel ? 'Near-Apostles close to Loyalists' : 'Near-Advocates close to Loyalists',
    'near_terrorists_close_to_terrorists': isClassicModel ? 'Near-Terrorists close to Terrorists' : 'Near-Trolls close to Trolls',
    'near_terrorists_close_to_hostages': isClassicModel ? 'Near-Terrorists close to Hostages' : 'Near-Trolls close to Hostages'
  };
  return names[relationship] || relationship.replace(/_/g, ' ');
}

/**
 * Generates Findings statements based on evaluator results
 */
export function generateFindings(evaluators: EvaluatorResults, showNearApostles: boolean = false, isClassicModel: boolean = false): Finding[] {
  const findings: Finding[] = [];
  let priority = 1;

  // ===== DATA OVERVIEW FINDINGS =====
  
  // ===== SAMPLE SIZE FINDINGS =====
  // Using templates from markdown document (source of truth)

  if (evaluators.sampleSize.isLow) {
    const lowTemplate = getStatementTemplate('findings', 'Sample Size - Low');
    if (lowTemplate) {
      findings.push({
        id: 'sample-low',
        category: 'data',
        statement: renderTemplate(lowTemplate.template, { number: evaluators.sampleSize.total }),
        supportingData: { total: evaluators.sampleSize.total },
        priority: priority++
      });
    }

    if (evaluators.sampleSize.hasGoodRepresentation) {
      const goodRepTemplate = getStatementTemplate('findings', 'Sample Size - Good Representation');
      if (goodRepTemplate) {
        findings.push({
          id: 'sample-representation-good',
          category: 'data',
          statement: goodRepTemplate.template, // No placeholders
          supportingData: { total: evaluators.sampleSize.total },
          priority: priority++
        });
      }
    } else if (evaluators.sampleSize.missingQuadrants.length > 0) {
      const poorRepTemplate = getStatementTemplate('findings', 'Sample Size - Poor Representation');
      if (poorRepTemplate) {
        findings.push({
          id: 'sample-representation-poor',
          category: 'data',
          statement: poorRepTemplate.template, // No placeholders
          supportingData: { 
            total: evaluators.sampleSize.total,
            missingQuadrants: evaluators.sampleSize.missingQuadrants
          },
          priority: priority++
        });
      }
    }
  } else if (evaluators.sampleSize.isHigh) {
    const highTemplate = getStatementTemplate('findings', 'Sample Size - High');
    if (highTemplate) {
      findings.push({
        id: 'sample-high',
        category: 'data',
        statement: renderTemplate(highTemplate.template, { number: evaluators.sampleSize.total }),
        supportingData: { total: evaluators.sampleSize.total },
        priority: priority++
      });
    }

    if (evaluators.sampleSize.hasGoodRepresentation) {
      findings.push({
        id: 'sample-high-representation',
        category: 'data',
        statement: 'We seem to have a good representation of customers in all groups, which constitutes a healthy scenario where all possible mindsets and customer types are covered in the analysis.',
        supportingData: { total: evaluators.sampleSize.total },
        priority: priority++
      });
    } else {
      // For high sample with poor representation, use different wording that doesn't assume small sample
      const missingQuadrantsList = evaluators.sampleSize.missingQuadrants.join(', ');
      findings.push({
        id: 'sample-high-poor-representation',
        category: 'data',
        statement: `Despite having a good sample size of ${evaluators.sampleSize.total} customers, it should be noted that not all groups have sufficient representation, with only a few or no customers at all in some quadrants (${missingQuadrantsList}). This might mean that we don't have sufficient representation of customers in these specific segments, and any analysis on these underrepresented groups might be incomplete, if not potentially misleading. You should segment the customer data and determine whether the current distribution is representative enough for the personas, the moments of truth covered, the possible customer journeys covered, and whatever else applies to consider different representations.`,
        supportingData: { 
          total: evaluators.sampleSize.total,
          missingQuadrants: evaluators.sampleSize.missingQuadrants
        },
        priority: priority++
      });
    }
  }

  // ===== DISTRIBUTION FINDINGS =====
  // Using templates from markdown document (source of truth)

  // First, provide descriptions for all quadrants (4 main + apostles + near-apostles)
  // These descriptions help users understand what each quadrant means
  // Group near-apostles and apostles with loyalists, then sort all by percentage
  const allQuadrants = [
    { 
      key: 'loyalists', 
      name: 'Loyalists',
      group: 'loyalists-group',
      description: 'Loyalists are the reason why your business is still alive. They are happy customers who are also willing to come back to you. They\'re the foundation of your business\'s stability and growth. However, loyalty is fragile and competition is fierce, so you should not take their loyalty for granted. Your focus should be to keep them engaged and satisfied, attract more customers from other segments, and work towards upgrading them to apostles.'
    },
    { 
      key: 'apostles', 
      name: 'Apostles',
      group: 'loyalists-group',
      description: 'Apostles are your most valuable customers - they are both highly satisfied and highly loyal, and they actively promote and recommend your brand to others. They are your brand advocates and represent a strong foundation for growth through word-of-mouth and referrals. These customers should be nurtured and given opportunities to become ambassadors, influencers, or part of VIP referral programmes.'
    },
    ...(showNearApostles ? [{
      key: 'nearApostles' as const, 
      name: 'Near-Apostles',
      group: 'loyalists-group' as const,
      description: 'Near-Apostles are Loyalists who are on the verge of becoming full advocates. They love your brand and are loyal, but haven\'t yet actively promoted or recommended you to others. Your priority should be promoting them into full Apostles by activating their advocacy potential, ensuring they don\'t lose their connection with your brand, and giving them the tools and incentives to become your brand ambassadors.'
    }] : []),
    { 
      key: 'mercenaries', 
      name: 'Mercenaries',
      group: 'mercenaries',
      description: 'Mercenaries are satisfied customers who know you, like you, and trust you - but they also shop with competitors. Rather than seeing this as a problem, recognise it as a massive opportunity. These are returning customers who are happy with your offering. Your goal should be to keep your products and services in their top suppliers to buy from as frequently as possible, rather than trying to make them exclusively loyal (which is often unrealistic in today\'s competitive landscape). Most importantly, you need to be present in their minds when they\'re ready to make a purchase decision.'
    },
    { 
      key: 'hostages', 
      name: 'Hostages',
      group: 'hostages',
      description: 'Hostages are customers who continue to buy from you despite being dissatisfied - they\'re staying out of necessity rather than choice. This could be due to legal requirements, contracts, lack of alternatives, or other constraints. They will churn as soon as a better option becomes available, and they could already be damaging your reputation through negative feedback. You need to urgently investigate why they\'re not satisfied and address the underlying issues before competitors provide alternatives.'
    },
    { 
      key: 'defectors', 
      name: 'Defectors',
      group: 'defectors',
      description: 'Defectors are customers who are both dissatisfied and disloyal - they\'ve either already left you or are on the brink of doing so. These customers are likely sharing negative feedback and may be actively harming your reputation. You need to urgently investigate what went wrong, address the root causes, and implement recovery strategies. However, before getting obsessed with this group, consider that some customers may have made one-off purchases or bought from you in error - this isn\'t necessarily a problem depending on your industry.'
    }
  ];

  // Collect all quadrants with customers and their percentages
  const quadrantsWithData = allQuadrants
    .map(quadrant => {
      const count = evaluators.distribution.counts[quadrant.key] || 0;
      if (count > 0) {
        const percent = evaluators.distribution.percentages[quadrant.key] || 0;
        return {
          ...quadrant,
          count,
          percent
        };
      }
      return null;
    })
    .filter((q): q is NonNullable<typeof q> => q !== null);

  // Sort by percentage (highest first)
  quadrantsWithData.sort((a, b) => b.percent - a.percent);

  // Group loyalists-group together (loyalists, apostles, near-apostles)
  // Near-apostles should appear first, then apostles, then loyalists
  const nearApostles: typeof quadrantsWithData = [];
  const apostles: typeof quadrantsWithData = [];
  const loyalists: typeof quadrantsWithData = [];
  const otherQuadrants: typeof quadrantsWithData = [];
  
  quadrantsWithData.forEach(quadrant => {
    if (quadrant.key === 'near_apostles' || quadrant.key === 'nearApostles') {
      nearApostles.push(quadrant);
    } else if (quadrant.key === 'apostles') {
      apostles.push(quadrant);
    } else if (quadrant.key === 'loyalists') {
      loyalists.push(quadrant);
    } else if (quadrant.group === 'loyalists-group') {
      // Other loyalists-group members (shouldn't happen, but just in case)
      loyalists.push(quadrant);
    } else {
      otherQuadrants.push(quadrant);
    }
  });

  // Sort each group by percentage (highest first)
  nearApostles.sort((a, b) => b.percent - a.percent);
  apostles.sort((a, b) => b.percent - a.percent);
  loyalists.sort((a, b) => b.percent - a.percent);
  otherQuadrants.sort((a, b) => b.percent - a.percent);

  // Combine: near-apostles first, then apostles, then loyalists, then others
  const sortedQuadrants = [...nearApostles, ...apostles, ...loyalists, ...otherQuadrants];

  // Add quadrant descriptions in sorted order
  // These are categorized as 'data' since they describe the main visualization chart
  sortedQuadrants.forEach(quadrant => {
    findings.push({
      id: `quadrant-description-${quadrant.key}`,
      category: 'data',
      statement: `${quadrant.name}: ${quadrant.description} You currently have ${quadrant.count} ${quadrant.name.toLowerCase()} (${quadrant.percent.toFixed(1)}% of your customer base).`,
      supportingData: {
        quadrant: quadrant.key,
        count: quadrant.count,
        percentage: quadrant.percent
      },
      priority: priority++,
    });
  });

  // Then add the opening statement for the largest quadrant
  if (evaluators.distribution.largest) {
    const largestQuadrant = evaluators.distribution.largest;
    const largestQuadrantKey = largestQuadrant as string; // Use string for key access
    const largestCount = evaluators.distribution.counts[largestQuadrantKey] || 0;
    const largestPercent = evaluators.distribution.percentages[largestQuadrantKey] || 0;

    // Get opening statement template from markdown based on quadrant
    let openingStatement = '';
    const quadrantForTemplate = largestQuadrantKey === 'nearApostles' ? 'near_apostles' : largestQuadrantKey;
    const openingTemplate = getStatementTemplate('findings', `Opening Statement - ${quadrantForTemplate}`);
    
    if (openingTemplate) {
      // Use template from markdown
      let templateText = openingTemplate.template;
      // Replace terminology if using modern model
      if (!isClassicModel && (quadrantForTemplate === 'terrorists' || quadrantForTemplate === 'near_terrorists')) {
        templateText = templateText.replace(/Terrorists/g, 'Trolls').replace(/Near-Terrorists/g, 'Near-Trolls');
      }
      openingStatement = renderTemplate(templateText, {
        count: largestCount,
        percentage: largestPercent.toFixed(1)
      });
    } else {
      // Fallback to default if template not found
      openingStatement = `${getQuadrantDisplayName(largestQuadrant, isClassicModel)} is the most popular segment with ${largestCount} customers, representing ${largestPercent.toFixed(1)}% of the total.`;
    }

    // Main distribution finding
    findings.push({
      id: `dominant-${largestQuadrant}`,
      category: 'distribution',
      statement: openingStatement,
      supportingData: {
        quadrant: largestQuadrant,
        count: largestCount,
        percentage: largestPercent
      },
      priority: priority++,
    });

    // Closely followed finding - contextual based on quadrant
    if (evaluators.distribution.closelyFollowed.length > 0) {
      const followedNames = evaluators.distribution.closelyFollowed
        .map(q => getQuadrantDisplayName(q, isClassicModel))
        .join(' and ');
      
      let followUpStatement = '';
      if (largestQuadrant === 'hostages') {
        followUpStatement = `The situation is particularly concerning as ${followedNames} ${evaluators.distribution.closelyFollowed.length === 1 ? 'is' : 'are'} not far behind, indicating widespread issues across your customer base.`;
      } else if (largestQuadrant === 'defectors') {
        followUpStatement = `The situation is particularly alarming as ${followedNames} ${evaluators.distribution.closelyFollowed.length === 1 ? 'is' : 'are'} not far behind, suggesting systemic issues affecting a large portion of your customer base.`;
      } else if (largestQuadrantKey === 'near_apostles' || largestQuadrantKey === 'nearApostles') {
        followUpStatement = `However, you shouldn't be tempted to rest on your laurels, as although Near-Apostles is your most popular group, ${followedNames} ${evaluators.distribution.closelyFollowed.length === 1 ? 'is' : 'are'} not far behind. Focus on converting these Near-Apostles into full advocates while maintaining your position.`;
      } else {
        followUpStatement = `However, you shouldn't be tempted to rest on your laurels, as although ${getQuadrantDisplayName(largestQuadrant, isClassicModel)} is your most popular group, ${followedNames} ${evaluators.distribution.closelyFollowed.length === 1 ? 'is' : 'are'} not far behind.`;
      }
      
      findings.push({
        id: 'distribution-close-competition',
        category: 'distribution',
        statement: followUpStatement,
        supportingData: {
          largest: largestQuadrant,
          closelyFollowed: evaluators.distribution.closelyFollowed
        },
        priority: priority++,
      });
    } else if (!evaluators.distribution.isSkewed) {
      let followUpStatement = '';
      if (largestQuadrant === 'hostages') {
        followUpStatement = `This concentration of dissatisfied customers represents a significant risk to your business stability and reputation.`;
      } else if (largestQuadrant === 'defectors') {
        followUpStatement = `This concentration of defectors represents an urgent crisis that requires immediate intervention to prevent further customer loss and reputational damage.`;
      } else if (largestQuadrantKey === 'near_apostles' || largestQuadrantKey === 'nearApostles') {
        followUpStatement = `However, you shouldn't be tempted to rest on your laurels, as these customers might move to other groups if you don't take good care of them. Act now to activate their advocacy potential.`;
      } else {
        followUpStatement = `However, you shouldn't be tempted to rest on your laurels, as these customers might move to other groups if you don't take good care of them.`;
      }
      
      findings.push({
        id: 'distribution-no-close-competition',
        category: 'distribution',
        statement: followUpStatement,
        supportingData: {
          largest: largestQuadrant
        },
        priority: priority++,
      });
    }

    // Skewed distribution finding
    if (evaluators.distribution.isSkewed) {
      findings.push({
        id: 'distribution-skewed',
        category: 'distribution',
        statement: `Your customer base is heavily concentrated in the ${getQuadrantDisplayName(largestQuadrant, isClassicModel)} segment, with ${largestPercent.toFixed(1)}% of customers falling into this category. Whilst this might seem positive, it also indicates a lack of diversity in your customer base, which could pose risks if market conditions change.`,
        supportingData: {
          quadrant: largestQuadrant,
          percentage: largestPercent
        },
        priority: priority++,
      });
    } else if (evaluators.distribution.isBalanced) {
      findings.push({
        id: 'distribution-balanced',
        category: 'distribution',
        statement: 'Your customer base shows a relatively balanced distribution across different segments, which suggests a healthy mix of customer types and reduces the risk of over-reliance on a single segment.',
        supportingData: {},
        priority: priority++,
      });
    }

    // Edge case: Tied quadrants
    if (evaluators.distribution.isTied && evaluators.distribution.tiedQuadrants.length > 0) {
      const tiedNames = evaluators.distribution.tiedQuadrants
        .map(q => getQuadrantDisplayName(q, isClassicModel))
        .join(' and ');
      const tiedCount = evaluators.distribution.counts[evaluators.distribution.tiedQuadrants[0]] || 0;
      const tiedPercent = evaluators.distribution.percentages[evaluators.distribution.tiedQuadrants[0]] || 0;
      
      let interpretation = '';
      const hasPositive = evaluators.distribution.tiedQuadrants.some(q => q === 'loyalists' || q === 'mercenaries' || q === 'apostles' || q === 'nearApostles' || q === 'near_apostles');
      const hasNegative = evaluators.distribution.tiedQuadrants.some(q => q === 'hostages' || q === 'defectors' || q === 'terrorists');
      
      if (hasPositive && hasNegative) {
        interpretation = 'a divided customer base, with equal numbers of satisfied and dissatisfied customers - this represents both opportunity and risk.';
      } else if (hasNegative) {
        interpretation = 'significant challenges with customer satisfaction across your base, requiring urgent attention.';
      } else {
        interpretation = 'a healthy mix of satisfied customers, with some showing strong loyalty and others shopping around - both are positive indicators.';
      }
      
      findings.push({
        id: 'distribution-tied',
        category: 'distribution',
        statement: `Your customer distribution shows ${tiedNames} ${evaluators.distribution.tiedQuadrants.length === 2 ? 'are' : 'are'} equally represented, each with ${tiedCount} customers (${tiedPercent.toFixed(1)}% of the total). This balanced distribution suggests ${interpretation}`,
        supportingData: {
          tiedQuadrants: evaluators.distribution.tiedQuadrants,
          count: tiedCount,
          percentage: tiedPercent
        },
        priority: priority++,
      });
    }

    // Edge case: Too empty quadrants
    // These are categorized as 'data' since they're treated as quadrant descriptions and added after the main chart
    if (evaluators.distribution.tooEmptyQuadrants.length > 0) {
      evaluators.distribution.tooEmptyQuadrants.forEach(quadrant => {
        const count = evaluators.distribution.counts[quadrant] || 0;
        const percent = evaluators.distribution.percentages[quadrant] || 0;
        findings.push({
          id: `distribution-too-empty-${quadrant}`,
          category: 'data',
          statement: `It's worth noting that the ${getQuadrantDisplayName(quadrant, isClassicModel)} segment is significantly underrepresented, with only ${count} customer${count === 1 ? '' : 's'} (${percent.toFixed(1)}% of your base). This could indicate that this customer type is rare in your market, that your data collection might be missing certain customer segments or experiences, or alternatively, it could reflect that your company is performing exceptionally well with minimal ${getQuadrantDisplayName(quadrant, isClassicModel).toLowerCase()}. Consider whether this underrepresentation reflects your actual customer base, suggests gaps in your data collection approach, or indicates strong performance in this area.`,
          supportingData: {
            quadrant,
            count,
            percentage: percent
          },
          priority: priority++,
        });
      });
    }

    // Edge case: Too full quadrants (not skewed)
    if (evaluators.distribution.tooFullQuadrants.length > 0) {
      evaluators.distribution.tooFullQuadrants.forEach(quadrant => {
        const percent = evaluators.distribution.percentages[quadrant] || 0;
        findings.push({
          id: `distribution-too-full-${quadrant}`,
          category: 'distribution',
          statement: `Your customer distribution shows a strong concentration in the ${getQuadrantDisplayName(quadrant, isClassicModel)} segment, with ${percent.toFixed(1)}% of customers. Whilst this might seem positive, it also indicates a lack of diversity in your customer base, which could pose risks if market conditions change or if this segment's needs evolve.`,
          supportingData: {
            quadrant,
            percentage: percent
          },
          priority: priority++,
        });
      });
    }

    // Edge case: Zero customers in main quadrants
    if (evaluators.distribution.zeroQuadrants.length > 0) {
      evaluators.distribution.zeroQuadrants.forEach(quadrant => {
        let contextualExplanation = '';
        if (quadrant === 'defectors') {
          contextualExplanation = 'This is unusual - most businesses have some defectors. This could indicate excellent customer satisfaction, or it might suggest your data collection is missing customers who have already left or are dissatisfied.';
        } else if (quadrant === 'hostages') {
          contextualExplanation = 'This suggests customers aren\'t feeling trapped - they\'re either satisfied or have left. This is generally positive, though it\'s worth ensuring you\'re capturing all customer experiences.';
        } else if (quadrant === 'mercenaries') {
          contextualExplanation = 'This suggests customers are either very loyal or very disloyal, with little in between. This could indicate strong brand loyalty or strong dissatisfaction - check your other segments.';
        } else if (quadrant === 'loyalists') {
          contextualExplanation = 'This is concerning - having no Loyalists suggests significant challenges with customer satisfaction and loyalty. This requires immediate investigation.';
        }
        
        findings.push({
          id: `distribution-zero-${quadrant}`,
          category: 'distribution',
          statement: `It's worth noting that you have no customers in the ${getQuadrantDisplayName(quadrant, isClassicModel)} segment. ${contextualExplanation} This could indicate ${quadrant === 'loyalists' ? 'serious issues' : 'either excellent performance or gaps in data collection'}, or it might suggest that your data collection is missing certain customer types or experiences.`,
          supportingData: {
            quadrant
          },
          priority: priority++,
        });
      });
    }
  }

  // ===== NEUTRAL CUSTOMERS FINDINGS =====
  // Using templates from markdown document (source of truth)

  if (evaluators.distribution.neutralCount > 0) {
    const neutralCount = evaluators.distribution.neutralCount;
    const neutralPercent = evaluators.distribution.neutralPercent;
    
    // Get template from markdown (via JSON)
    const neutralTemplate = getStatementTemplate('findings', 'Neutral Customers Statement');
    if (neutralTemplate) {
      const statement = renderTemplate(neutralTemplate.template, {
        count: neutralCount,
        percentage: neutralPercent.toFixed(1),
        plural: neutralCount === 1 ? '' : 's',
        'is/are': neutralCount === 1 ? 'is' : 'are'
      });
      
      findings.push({
        id: 'neutral-customers',
        category: 'distribution',
        statement: statement,
        supportingData: {
          count: neutralCount,
          percentage: neutralPercent
        },
        priority: priority++,
      });
    }

    // Follow-up based on neutral count - using templates from markdown
    if (neutralPercent > 10) {
      const highTemplate = getStatementTemplate('findings', 'Neutral Customers - High Count');
      if (highTemplate) {
        findings.push({
          id: 'neutral-customers-high',
          category: 'distribution',
          statement: highTemplate.template, // No placeholders in this template
          supportingData: {
            count: neutralCount,
            percentage: neutralPercent
          },
          priority: priority++,
        });
      }
    } else if (neutralPercent < 5) {
      const lowTemplate = getStatementTemplate('findings', 'Neutral Customers - Low Count');
      if (lowTemplate) {
        findings.push({
          id: 'neutral-customers-low',
          category: 'distribution',
          statement: lowTemplate.template, // No placeholders in this template
          supportingData: {
            count: neutralCount,
            percentage: neutralPercent
          },
          priority: priority++,
        });
      }
    }
  }

  // ===== STATISTICS FINDINGS =====

  // Satisfaction statistics - show if above, below, or exactly at midpoint
  if (evaluators.statistics.satisfaction.isAboveAverage) {
    const thresholdText = evaluators.statistics.satisfaction.isCustomThreshold 
      ? 'your current threshold' 
      : 'the midpoint';
    findings.push({
      id: 'satisfaction-above-average',
      category: 'data',
      statement: `Your average satisfaction score of ${evaluators.statistics.satisfaction.average.toFixed(1)} is above ${thresholdText}, indicating that customers are generally satisfied with your products or services.`,
      supportingData: {
        average: evaluators.statistics.satisfaction.average,
        mode: evaluators.statistics.satisfaction.mode
      },
      priority: priority++,
    });
  } else if (evaluators.statistics.satisfaction.isBelowAverage) {
    const thresholdText = evaluators.statistics.satisfaction.isCustomThreshold 
      ? 'your current threshold' 
      : 'the midpoint';
    const demandingNote = evaluators.statistics.satisfaction.isVeryDemanding
      ? ` However, it's worth noting that your threshold (${evaluators.statistics.satisfaction.actualMidpoint.toFixed(1)}) is significantly higher than the scale midpoint (${evaluators.statistics.satisfaction.scaleMidpoint.toFixed(1)}), which may be quite demanding.`
      : '';
    findings.push({
      id: 'satisfaction-below-average',
      category: 'data',
      statement: `Your average satisfaction score of ${evaluators.statistics.satisfaction.average.toFixed(1)} is below ${thresholdText}, which suggests there's room for improvement in how customers perceive your products or services.${demandingNote}`,
      supportingData: {
        average: evaluators.statistics.satisfaction.average,
        mode: evaluators.statistics.satisfaction.mode
      },
      priority: priority++,
    });
  } else {
    // Average exactly equals midpoint - show this case too
    const thresholdText = evaluators.statistics.satisfaction.isCustomThreshold 
      ? 'your current threshold' 
      : 'the midpoint';
    findings.push({
      id: 'satisfaction-at-average',
      category: 'data',
      statement: `Your average satisfaction score of ${evaluators.statistics.satisfaction.average.toFixed(1)} is exactly at ${thresholdText}, indicating a balanced position where customers are neither particularly satisfied nor dissatisfied.`,
      supportingData: {
        average: evaluators.statistics.satisfaction.average,
        mode: evaluators.statistics.satisfaction.mode
      },
      priority: priority++,
    });
  }

  // Loyalty statistics - show if above, below, or exactly at midpoint
  if (evaluators.statistics.loyalty.isAboveAverage) {
    const thresholdText = evaluators.statistics.loyalty.isCustomThreshold 
      ? 'your current threshold' 
      : 'the midpoint';
    findings.push({
      id: 'loyalty-above-average',
      category: 'data',
      statement: `Your average loyalty score of ${evaluators.statistics.loyalty.average.toFixed(1)} is above ${thresholdText}, suggesting that customers are generally loyal to your brand.`,
      supportingData: {
        average: evaluators.statistics.loyalty.average,
        mode: evaluators.statistics.loyalty.mode
      },
      priority: priority++,
    });
  } else if (evaluators.statistics.loyalty.isBelowAverage) {
    const thresholdText = evaluators.statistics.loyalty.isCustomThreshold 
      ? 'your current threshold' 
      : 'the midpoint';
    const demandingNote = evaluators.statistics.loyalty.isVeryDemanding
      ? ` However, it's worth noting that your threshold (${evaluators.statistics.loyalty.actualMidpoint.toFixed(1)}) is significantly higher than the scale midpoint (${evaluators.statistics.loyalty.scaleMidpoint.toFixed(1)}), which may be quite demanding.`
      : '';
    findings.push({
      id: 'loyalty-below-average',
      category: 'data',
      statement: `Your average loyalty score of ${evaluators.statistics.loyalty.average.toFixed(1)} is below ${thresholdText}, indicating that customers may be more likely to switch to competitors.${demandingNote}`,
      supportingData: {
        average: evaluators.statistics.loyalty.average,
        mode: evaluators.statistics.loyalty.mode
      },
      priority: priority++,
    });
  } else {
    // Average exactly equals midpoint - show this case too
    const thresholdText = evaluators.statistics.loyalty.isCustomThreshold 
      ? 'your current threshold' 
      : 'the midpoint';
    findings.push({
      id: 'loyalty-at-average',
      category: 'data',
      statement: `Your average loyalty score of ${evaluators.statistics.loyalty.average.toFixed(1)} is exactly at ${thresholdText}, indicating a balanced position where customers are neither particularly loyal nor disloyal.`,
      supportingData: {
        average: evaluators.statistics.loyalty.average,
        mode: evaluators.statistics.loyalty.mode
      },
      priority: priority++,
    });
  }

  // ===== PROXIMITY ANALYSIS FINDINGS =====

  if (evaluators.proximity.hasRisks || evaluators.proximity.hasOpportunities) {
    // Get distribution context for linking
    const largestQuadrant = evaluators.distribution.largest;
    const largestQuadrantName = largestQuadrant ? getQuadrantDisplayName(largestQuadrant, isClassicModel) : null;
    const largestCount = largestQuadrant ? evaluators.distribution.counts[largestQuadrant] || 0 : 0;
    
    // Calculate total customers at risk and total potential gains
    const totalAtRisk = evaluators.proximity.topRisks.reduce((sum, risk) => sum + risk.count, 0);
    const totalPotentialGains = evaluators.proximity.topOpportunities.reduce((sum, opp) => sum + opp.count, 0);
    
    // Find which quadrant has the most risks (customers leaving)
    const risksByQuadrant: Record<string, number> = {};
    evaluators.proximity.topRisks.forEach(risk => {
      // Parse relationship to find source quadrant (e.g., "loyalists_close_to_mercenaries" -> "loyalists")
      const sourceMatch = risk.type.match(/^(\w+)_close_to/);
      if (sourceMatch) {
        const sourceQuadrant = sourceMatch[1];
        risksByQuadrant[sourceQuadrant] = (risksByQuadrant[sourceQuadrant] || 0) + risk.count;
      }
    });
    
    // Find which quadrant has the most opportunities (customers coming in)
    const opportunitiesByQuadrant: Record<string, number> = {};
    evaluators.proximity.topOpportunities.forEach(opp => {
      // Parse relationship to find target quadrant (e.g., "mercenaries_close_to_loyalists" -> "loyalists")
      const targetMatch = opp.type.match(/close_to_(\w+)$/);
      if (targetMatch) {
        const targetQuadrant = targetMatch[1];
        opportunitiesByQuadrant[targetQuadrant] = (opportunitiesByQuadrant[targetQuadrant] || 0) + opp.count;
      }
    });
    
    const quadrantWithMostRisks = Object.keys(risksByQuadrant).reduce((a, b) => 
      risksByQuadrant[a] > risksByQuadrant[b] ? a : b, Object.keys(risksByQuadrant)[0] || ''
    );
    const quadrantWithMostOpportunities = Object.keys(opportunitiesByQuadrant).reduce((a, b) => 
      opportunitiesByQuadrant[a] > opportunitiesByQuadrant[b] ? a : b, Object.keys(opportunitiesByQuadrant)[0] || ''
    );
    
    const mostRisksCount = quadrantWithMostRisks ? risksByQuadrant[quadrantWithMostRisks] : 0;
    const mostOpportunitiesCount = quadrantWithMostOpportunities ? opportunitiesByQuadrant[quadrantWithMostOpportunities] : 0;
    
    // Overview finding with context from distribution
    let overviewStatement = '';
    if (evaluators.proximity.hasRisks && evaluators.proximity.hasOpportunities) {
      overviewStatement = `The proximity analysis reveals ${evaluators.proximity.highRiskCount} high-risk relationships and ${evaluators.proximity.highOpportunityCount} high-opportunity relationships. `;
      
      // Link to distribution if largest quadrant is mentioned
      if (largestQuadrant && largestQuadrantName && quadrantWithMostRisks === largestQuadrant) {
        overviewStatement += `Notably, ${largestQuadrantName} is your largest segment (${largestCount} customers), and it's also the group with the most customers at risk (${mostRisksCount} customers). `;
        overviewStatement += `This means you need to be particularly careful, as out of your ${largestCount} ${largestQuadrantName.toLowerCase()}, you're at risk of losing ${mostRisksCount} customers to less favourable quadrants. `;
      } else if (largestQuadrant && largestQuadrantName && quadrantWithMostOpportunities === largestQuadrant) {
        overviewStatement += `Notably, ${largestQuadrantName} is your largest segment (${largestCount} customers), and it's also the group with the most potential for growth. `;
        overviewStatement += `You could potentially gain ${mostOpportunitiesCount} more ${largestQuadrantName.toLowerCase()} from other groups, totalling ${largestCount + mostOpportunitiesCount} customers in this segment. `;
      }
      
      if (quadrantWithMostRisks && quadrantWithMostRisks !== largestQuadrant) {
        const riskQuadrantName = getQuadrantDisplayName(quadrantWithMostRisks, isClassicModel);
        overviewStatement += `The ${riskQuadrantName} segment has the most customers at risk of negative movement (${mostRisksCount} customers). `;
      }
      
      if (quadrantWithMostOpportunities && quadrantWithMostOpportunities !== largestQuadrant) {
        const oppQuadrantName = getQuadrantDisplayName(quadrantWithMostOpportunities, isClassicModel);
        overviewStatement += `The ${oppQuadrantName} segment has the most potential for positive movement, with ${mostOpportunitiesCount} customers close to moving into it. `;
      }
      
      overviewStatement += `Customers near quadrant boundaries are particularly important to monitor, as they may be at risk of moving to less desirable quadrants, or have the potential to move to more positive segments with the right engagement.`;
      
      findings.push({
        id: 'proximity-overview',
        category: 'proximity',
        statement: overviewStatement,
        supportingData: {
          highRiskCount: evaluators.proximity.highRiskCount,
          highOpportunityCount: evaluators.proximity.highOpportunityCount,
          hasRisks: evaluators.proximity.hasRisks,
          hasOpportunities: evaluators.proximity.hasOpportunities,
          largestQuadrant,
          quadrantWithMostRisks,
          quadrantWithMostOpportunities,
          mostRisksCount,
          mostOpportunitiesCount
        },
        priority: priority++,
      });
    } else if (evaluators.proximity.hasRisks) {
      let riskStatement = `The proximity analysis identifies ${evaluators.proximity.highRiskCount} high-risk relationships where customers are close to moving to less desirable quadrants. `;
      
      if (largestQuadrant && largestQuadrantName && quadrantWithMostRisks === largestQuadrant) {
        riskStatement += `Notably, ${largestQuadrantName} is your largest segment (${largestCount} customers), and it's also the group with the most customers at risk. `;
        riskStatement += `This means you need to be particularly careful, as out of your ${largestCount} ${largestQuadrantName.toLowerCase()}, you're at risk of losing ${mostRisksCount} customers to less favourable quadrants. `;
      } else if (quadrantWithMostRisks) {
        const riskQuadrantName = getQuadrantDisplayName(quadrantWithMostRisks, isClassicModel);
        riskStatement += `The ${riskQuadrantName} segment has the most customers at risk of negative movement (${mostRisksCount} customers). `;
      }
      
      riskStatement += `These boundary customers require immediate attention to prevent negative movement.`;
      
      findings.push({
        id: 'proximity-risks-only',
        category: 'proximity',
        statement: riskStatement,
        supportingData: {
          highRiskCount: evaluators.proximity.highRiskCount,
          hasRisks: true,
          largestQuadrant,
          quadrantWithMostRisks,
          mostRisksCount
        },
        priority: priority++,
      });
    } else if (evaluators.proximity.hasOpportunities) {
      let oppStatement = `The proximity analysis reveals ${evaluators.proximity.highOpportunityCount} high-opportunity relationships where customers are close to moving to more positive quadrants. `;
      
      if (largestQuadrant && largestQuadrantName && quadrantWithMostOpportunities === largestQuadrant) {
        oppStatement += `Notably, ${largestQuadrantName} is your largest segment (${largestCount} customers), and it's also the group with the most potential for growth. `;
        oppStatement += `You could potentially gain ${mostOpportunitiesCount} more ${largestQuadrantName.toLowerCase()} from other groups, totalling ${largestCount + mostOpportunitiesCount} customers in this segment. `;
      } else if (quadrantWithMostOpportunities) {
        const oppQuadrantName = getQuadrantDisplayName(quadrantWithMostOpportunities, isClassicModel);
        oppStatement += `The ${oppQuadrantName} segment has the most potential for positive movement, with ${mostOpportunitiesCount} customers close to moving into it. `;
      }
      
      oppStatement += `These customers represent potential for growth and should be prioritised for targeted engagement.`;
      
      findings.push({
        id: 'proximity-opportunities-only',
        category: 'proximity',
        statement: oppStatement,
        supportingData: {
          highOpportunityCount: evaluators.proximity.highOpportunityCount,
          hasOpportunities: true,
          largestQuadrant,
          quadrantWithMostOpportunities,
          mostOpportunitiesCount
        },
        priority: priority++,
      });
    }

    // Top risk finding with context
    if (evaluators.proximity.hasRisks && evaluators.proximity.topRisks.length > 0) {
      const topRisk = evaluators.proximity.topRisks[0];
      if (topRisk.count > 0) {
        const riskRelationshipName = getProximityDisplayName(topRisk.type, isClassicModel);
        const sourceMatch = topRisk.type.match(/^(\w+)_close_to/);
        const sourceQuadrant = sourceMatch ? sourceMatch[1] : null;
        const sourceQuadrantName = sourceQuadrant ? getQuadrantDisplayName(sourceQuadrant, isClassicModel) : null;
        
        let riskStatement = `The most significant risk is ${topRisk.count} customers in the ${riskRelationshipName} relationship. `;
        
        if (sourceQuadrantName && largestQuadrant === sourceQuadrant) {
          riskStatement += `Since ${sourceQuadrantName} is your largest segment, this represents a particularly concerning risk to your customer base. `;
        }
        
        riskStatement += `These customers are at risk of moving to a less favourable quadrant and require immediate intervention.`;
        
        findings.push({
          id: 'proximity-top-risk',
          category: 'proximity',
          statement: riskStatement,
          supportingData: {
            relationship: topRisk.type,
            count: topRisk.count,
            severity: topRisk.severity,
            sourceQuadrant
          },
          priority: priority++,
        });
      }
    }

    // Top opportunity finding with context
    if (evaluators.proximity.hasOpportunities && evaluators.proximity.topOpportunities.length > 0) {
      const topOpp = evaluators.proximity.topOpportunities[0];
      if (topOpp.count > 0) {
        const oppRelationshipName = getProximityDisplayName(topOpp.type, isClassicModel);
        const targetMatch = topOpp.type.match(/close_to_(\w+)$/);
        const targetQuadrant = targetMatch ? targetMatch[1] : null;
        const targetQuadrantName = targetQuadrant ? getQuadrantDisplayName(targetQuadrant, isClassicModel) : null;
        
        let oppStatement = `The most significant opportunity is ${topOpp.count} customers in the ${oppRelationshipName} relationship. `;
        
        if (targetQuadrantName && largestQuadrant === targetQuadrant) {
          oppStatement += `Since ${targetQuadrantName} is already your largest segment, this represents a valuable opportunity to further strengthen your position. `;
        }
        
        oppStatement += `These customers are close to moving to a more positive quadrant and represent a high-value opportunity for targeted engagement.`;
        
        findings.push({
          id: 'proximity-top-opportunity',
          category: 'proximity',
          statement: oppStatement,
          supportingData: {
            relationship: topOpp.type,
            count: topOpp.count,
            impact: topOpp.impact,
            targetQuadrant
          },
          priority: priority++,
        });
      }
    }
  } else if (evaluators.sampleSize.total > 0) {
    // No proximity risks or opportunities, but we have data
    // Get distribution context for linking
    const largestQuadrant = evaluators.distribution.largest;
    const largestQuadrantName = largestQuadrant ? getQuadrantDisplayName(largestQuadrant, isClassicModel) : null;
    const largestCount = largestQuadrant ? evaluators.distribution.counts[largestQuadrant] || 0 : 0;
    const largestPercent = largestQuadrant ? evaluators.distribution.percentages[largestQuadrant] || 0 : 0;
    
    let proximityStatement = `The proximity analysis examines customers who are positioned near quadrant boundaries, which helps identify both risks (customers at risk of moving to less favourable quadrants) and opportunities (customers close to moving to more positive segments). `;
    
    if (largestQuadrant && largestQuadrantName) {
      proximityStatement += `In your case, the analysis shows that most customers are well-positioned within their quadrants, with fewer boundary cases requiring immediate attention. `;
      proximityStatement += `This is particularly notable for your largest segment, ${largestQuadrantName}, which represents ${largestCount} customers (${largestPercent.toFixed(1)}% of your base). `;
      proximityStatement += `The fact that these ${largestQuadrantName.toLowerCase()} are not showing significant proximity risks suggests they are stable and well-anchored in their current position, which is a positive indicator of customer relationship strength. `;
    } else {
      proximityStatement += `In your case, the analysis shows that most customers are well-positioned within their quadrants, with fewer boundary cases requiring immediate attention. `;
    }
    
    // Check if distribution is balanced or skewed
    if (evaluators.distribution.isBalanced) {
      proximityStatement += `Combined with your relatively balanced distribution across segments, this suggests stable customer relationships across your entire base. `;
    } else if (evaluators.distribution.isSkewed && largestQuadrantName) {
      proximityStatement += `While your customer base is concentrated in ${largestQuadrantName}, the lack of proximity risks suggests that this concentration is stable rather than fragile. `;
    }
    
    proximityStatement += `However, it's still important to monitor for any shifts over time, as customer relationships can evolve, and early detection of boundary movements can help you take proactive measures to maintain or improve customer positions.`;
    
    findings.push({
      id: 'proximity-no-boundary-cases',
      category: 'proximity',
      statement: proximityStatement,
      supportingData: {
        total: evaluators.sampleSize.total,
        largestQuadrant,
        largestQuadrantName,
        largestCount,
        largestPercent,
        isBalanced: evaluators.distribution.isBalanced,
        isSkewed: evaluators.distribution.isSkewed
      },
      priority: priority++,
    });
  }

  // ===== RECOMMENDATION SCORE FINDINGS =====
  // Using tiered messaging based on score ranges with data balance checks

  if (evaluators.recommendation.score !== 0) {
    const score = evaluators.recommendation.score;
    const rec = evaluators.recommendation;
    
    // Check for unbalanced data (only relevant for scores > 20)
    const hasUnbalancedData = (rec.detractors === 0 || rec.hasIncompleteScale) && score > 20;
    
    let statement = '';
    
    if (score > 30) {
      // Score > 30: Outstanding/Exceptional
      if (hasUnbalancedData) {
        statement = `Your Recommendation Score of ${score.toFixed(1)} appears strong and positive, with significantly more promoters than detractors. However, this result may be conditioned by the fact that your data collection might be somewhat incomplete or biased. `;
        if (rec.detractors === 0) {
          statement += `The absence of Detractors in your data is unusual and may indicate that you're not capturing the full range of customer experiences. `;
        }
        if (rec.hasIncompleteScale) {
          statement += `Not all scale values are represented in your responses, which could suggest that certain customer segments or experiences are missing from your analysis. `;
        }
        statement += `A Recommendation Score is typically more accurate when responses are distributed across the full range of possible values.`;
      } else {
        statement = `Your Recommendation Score of ${score.toFixed(1)} is strong and positive, indicating that you have significantly more promoters than detractors. You may want to consider focusing on maintaining this strong position and investigating specific improvements, rather than obsessing over the number. Consider focusing on the improvements rather than the mark.`;
      }
    } else if (score > 20) {
      // Score 20-30: Strong Position
      if (hasUnbalancedData) {
        statement = `Your Recommendation Score of ${score.toFixed(1)} appears positive, showing that you have more promoters than detractors. However, this result may be conditioned by the fact that your data collection might be somewhat incomplete or biased. `;
        if (rec.detractors === 0) {
          statement += `The absence of Detractors in your data is unusual and may indicate that you're not capturing the full range of customer experiences. `;
        }
        if (rec.hasIncompleteScale) {
          statement += `Not all scale values are represented in your responses, which could suggest that certain customer segments or experiences are missing from your analysis. `;
        }
        statement += `A Recommendation Score is typically more accurate when responses are distributed across the full range of possible values.`;
      } else {
        statement = `Your Recommendation Score of ${score.toFixed(1)} is positive, showing that you have more promoters than detractors. You seem to be in a strong position. You may want to consider focusing on investigating specific improvements and finding quick wins from your Detractors, rather than obsessing over the number. Consider focusing on the improvements rather than the mark.`;
      }
    } else if (score > 10) {
      // Score 10-20: On the Right Track
      statement = `Your Recommendation Score of ${score.toFixed(1)} is positive, showing that you have more promoters than detractors. You seem to be on the right track. You may want to consider continuing to focus on growing your Promoter base and reducing Detractors.`;
    } else if (score > 0) {
      // Score 0-10: Room to Grow
      statement = `Your Recommendation Score of ${score.toFixed(1)} is positive, showing that you have more promoters than detractors. Whilst this may be encouraging, there may still be room to grow the Promoter base and reduce Detractors.`;
    } else {
      // Score ≤ 0: Negative
      statement = `Your Recommendation Score of ${score.toFixed(1)} is negative, indicating that you have more detractors than promoters, which may be a concern that needs addressing.`;
    }

    if (statement) {
      findings.push({
        id: 'recommendation-score',
        category: 'recommendation',
        statement: statement,
        supportingData: {
          score: score,
          promoters: rec.promoters,
          detractors: rec.detractors,
          promotersPercent: rec.promotersPercent,
          detractorsPercent: rec.detractorsPercent
        },
        priority: priority++,
      });
    }

    // Recommendation Score validation: Suspiciously high scores - using templates from markdown
    if (score >= 90) {
      const highTemplate = getStatementTemplate('findings', 'Exceptionally High Score (90+)') || 
                           getStatementTemplate('findings', 'Exceptionally High Score');
      if (highTemplate) {
        findings.push({
          id: 'recommendation-score-exceptionally-high',
          category: 'recommendation',
          statement: renderTemplate(highTemplate.template, { score: score.toFixed(1) }),
          supportingData: {
            score: score,
            promoters: evaluators.recommendation.promoters,
            detractors: evaluators.recommendation.detractors,
            passives: evaluators.recommendation.passives
          },
          priority: priority++,
        });
      }
    } else if (score >= 80) {
      const highTemplate = getStatementTemplate('findings', 'Very High Score (80-89)');
      if (highTemplate) {
        findings.push({
          id: 'recommendation-score-very-high',
          category: 'recommendation',
          statement: renderTemplate(highTemplate.template, { score: score.toFixed(1) }),
          supportingData: {
            score: score,
            promoters: evaluators.recommendation.promoters,
            detractors: evaluators.recommendation.detractors,
            passives: evaluators.recommendation.passives
          },
          priority: priority++,
        });
      }
    } else if (score >= 70) {
      const highTemplate = getStatementTemplate('findings', 'High Score (70-79)');
      if (highTemplate) {
        findings.push({
          id: 'recommendation-score-quite-high',
          category: 'recommendation',
          statement: renderTemplate(highTemplate.template, { score: score.toFixed(1) }),
          supportingData: {
            score: score,
            promoters: evaluators.recommendation.promoters,
            detractors: evaluators.recommendation.detractors,
            passives: evaluators.recommendation.passives
          },
          priority: priority++,
        });
      }
    }

    // Recommendation Score validation: Incomplete scale coverage - using template from markdown
    if (evaluators.recommendation.hasIncompleteScale) {
      const incompleteTemplate = getStatementTemplate('findings', 'Incomplete Scale Coverage');
      if (incompleteTemplate) {
        findings.push({
          id: 'recommendation-score-incomplete-scale',
          category: 'recommendation',
          statement: incompleteTemplate.template, // No placeholders
          supportingData: {
            scaleCoverage: evaluators.recommendation.scaleCoverage,
            hasIncompleteScale: true
          },
          priority: priority++,
        });
      }
    }
  }

  return findings.sort((a, b) => a.priority - b.priority);
}

