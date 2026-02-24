import type { Finding } from '../types';
import type { EvaluatorResults } from '../types';

/**
 * Generates chart findings - charts with expert commentary
 * These are interleaved with text findings in report order
 */
export function generateChartFindings(evaluators: EvaluatorResults, isClassicModel: boolean = false, aggregatedData?: any, axisLabels?: { satisfaction: string; loyalty: string }): Finding[] {
  const chartFindings: Finding[] = [];
  let priority = 1000; // Start high so text findings come first, then charts
  const satLabel = (axisLabels?.satisfaction || 'satisfaction').toLowerCase();
  const loyLabel = (axisLabels?.loyalty || 'loyalty').toLowerCase();

  // ===== MAIN VISUALISATION CHART =====
  // Always show the main chart first with commentary
  const mainChartCommentary = generateMainChartCommentary(evaluators, isClassicModel, satLabel, loyLabel);
  chartFindings.push({
    id: 'chart-main-visualisation',
    category: 'data',
    statement: mainChartCommentary,
    isChartItem: true,
    chartCommentary: mainChartCommentary,
    chartSelector: '.chart-container',
    priority: priority++,
    supportingData: {
      total: evaluators.sampleSize.total,
      distribution: evaluators.distribution.counts
    }
  });

  // ===== DISTRIBUTION SECTION CHART =====
  // Show distribution details if we have meaningful data
  if (evaluators.distribution.largest) {
    const distributionCommentary = generateDistributionChartCommentary(evaluators, isClassicModel);
    chartFindings.push({
      id: 'chart-distribution',
      category: 'distribution',
      statement: distributionCommentary,
      isChartItem: true,
      chartCommentary: distributionCommentary,
      chartSelector: '[data-section-id="report-distribution"] .quadrant-grid:not(.proximity-quadrant-grid)',
      priority: priority++,
      supportingData: {
        distribution: evaluators.distribution.counts,
        percentages: evaluators.distribution.percentages
      }
    });
  }

  // ===== HISTORICAL PROGRESS (MOVEMENT FLOW) =====
  // Show if we have historical progress insights (customers with 2+ dated records)
  const historical = aggregatedData?.historicalProgress;
  if (historical && historical.trackedCustomers > 0 && historical.totalTransitions > 0) {
    const historicalCommentary = generateHistoricalProgressMovementFlowCommentary(historical, isClassicModel, satLabel, loyLabel);
    chartFindings.push({
      id: 'chart-historical-movement-flow',
      category: 'historical',
      statement: historicalCommentary,
      isChartItem: true,
      chartCommentary: historicalCommentary,
      // Capture only the diagram (exclude title + info ribbon)
      chartSelector: '[data-section-id="report-historical-progress"] .movement-diagram-container',
      priority: priority++,
      supportingData: {
        trackedCustomers: historical.trackedCustomers,
        totalTransitions: historical.totalTransitions
      }
    });
  }

  // ===== RESPONSE CONCENTRATION CHART =====
  // Show if we have concentration data
  if (evaluators.sampleSize.total > 0) {
    const concentrationCommentary = generateConcentrationChartCommentary(evaluators, aggregatedData, satLabel, loyLabel);
    chartFindings.push({
      id: 'chart-concentration',
      category: 'concentration',
      statement: concentrationCommentary,
      isChartItem: true,
      chartCommentary: concentrationCommentary,
      chartSelector: '[data-section-id="report-response-concentration"] .miniplot-container, [data-section-id="report-response-concentration"] .response-concentration-visualization', // Capture only charts, no title/infobox
      priority: priority++,
      supportingData: {
        total: evaluators.sampleSize.total,
        note: 'To see the Response Concentration visualisation, please expand the Response Concentration section in the reports above.'
      }
    });
  }

  // ===== PROXIMITY ANALYSIS CHART =====
  // Always show proximity chart if we have data (even if no risks/opportunities detected)
  // This ensures the chart is available to support proximity findings
  // The rendering logic will hide it if proximity analysis is unavailable
  const proximityAnalysis = aggregatedData?.proximity;
  const isProximityAvailable = proximityAnalysis?.settings?.isAvailable !== false;
  
  if (evaluators.sampleSize.total > 0 && isProximityAvailable) {
    const proximityCommentary = evaluators.proximity.hasRisks || evaluators.proximity.hasOpportunities
      ? generateProximityChartCommentary(evaluators)
      : 'The proximity analysis visualisation shows customers positioned near quadrant boundaries. This helps identify both risks (customers at risk of moving to less strategic quadrants for retention) and opportunities (customers close to moving to stronger segments).';
    
    chartFindings.push({
      id: 'chart-proximity',
      category: 'proximity',
      statement: proximityCommentary,
      isChartItem: true,
      chartCommentary: proximityCommentary,
      chartSelector: '[data-section-id="report-proximity"] .proximity-distribution-card',
      priority: priority++,
      supportingData: {
        risks: evaluators.proximity.highRiskCount,
        opportunities: evaluators.proximity.highOpportunityCount,
        hasRisks: evaluators.proximity.hasRisks,
        hasOpportunities: evaluators.proximity.hasOpportunities
      }
    });
    
    // Add Actionable Conversions chart if proximity analysis is available
    // This will automatically switch to the conversions tab during capture
    const actionableConversionsCommentary = 'The Actionable Conversions view shows high-priority customer movements grouped by conversion type. Opportunities represent movements towards stronger segments, while warnings indicate risks of customers moving to less strategic segments for retention. Each conversion shows the number of customers, average chances of movement, and specific customer details when expanded.';
    
    chartFindings.push({
      id: 'chart-proximity-actionable-conversions',
      category: 'proximity',
      statement: actionableConversionsCommentary,
      isChartItem: true,
      chartCommentary: actionableConversionsCommentary,
      chartSelector: '[data-section-id="report-proximity"] .actionable-conversions-section',
      priority: priority++,
      supportingData: {
        note: 'This chart shows the Actionable Conversions tab from the Proximity Analysis section, which groups customers by conversion type (opportunities and warnings) for easier prioritization.'
      }
    });
  }

  // ===== RECOMMENDATION SCORE CHART =====
  // Show if we have recommendation score
  if (evaluators.recommendation.score !== 0) {
    const recommendationCommentary = generateRecommendationChartCommentary(evaluators);
    chartFindings.push({
      id: 'chart-recommendation',
      category: 'recommendation',
      statement: recommendationCommentary,
      isChartItem: true,
      chartCommentary: recommendationCommentary,
      chartSelector: '#recommendation-score-section .recommendation-score-widgets, [data-section-id="report-recommendation-score"] .recommendation-score-widgets', // Capture only charts, no title/infobox
      priority: priority++,
      supportingData: {
        score: evaluators.recommendation.score,
        promoters: evaluators.recommendation.promoters,
        detractors: evaluators.recommendation.detractors,
        note: 'To see the Recommendation Score visualisation, please ensure the Recommendation Score section is enabled in the Data Report settings above.'
      }
    });
    
    // Add Recommendation Score Simulator as separate chart finding (if it has been used)
    // We'll check if simulator has changes when capturing
    chartFindings.push({
      id: 'chart-recommendation-simulator',
      category: 'recommendation',
      statement: '', // Will be generated dynamically based on simulator state
      isChartItem: true,
      chartCommentary: '', // Will be generated dynamically
      chartSelector: '.recommendation-score-simulator', // Capture the simulator
      priority: priority++,
      supportingData: {
        currentScore: evaluators.recommendation.score,
        note: 'The Recommendation Score Simulator shows hypothetical scenarios. If you have adjusted the sliders, the image will show your simulation and we will explain what changes would achieve the simulated score.'
      }
    });
  }

  return chartFindings;
}

function formatPct(numerator: number, denominator: number): string {
  if (!denominator || denominator <= 0) return '0%';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function formatTransitionName(from: string, to: string, isClassicModel: boolean): string {
  return `${getQuadrantDisplayName(from, isClassicModel)} to ${getQuadrantDisplayName(to, isClassicModel)}`;
}

function generateHistoricalProgressMovementFlowCommentary(hp: any, isClassicModel: boolean, satLabel: string = 'satisfaction', loyLabel: string = 'loyalty'): string {
  const trackedCustomers = hp.trackedCustomers || 0;
  const totalTransitions = hp.totalTransitions || 0;
  const positiveTransitions = hp.positiveTransitions || 0;
  const negativeTransitions = hp.negativeTransitions || 0;
  const noChangeTransitions = hp.noChangeTransitions || 0;
  const betweenQuadrantTransitions = hp.betweenQuadrantTransitions || (positiveTransitions + negativeTransitions);

  const multiMove2PlusCustomers = hp.multiMove2PlusCustomers || 0;
  const multiMove3PlusCustomers = hp.multiMove3PlusCustomers || 0;
  const multiMove2PlusPct = trackedCustomers > 0 ? (multiMove2PlusCustomers / trackedCustomers) : 0;

  const topTransitions: Array<{ from: string; to: string; count: number }> = hp.topTransitions || [];
  const topMove = topTransitions[0];
  const topMovePct = topMove && betweenQuadrantTransitions > 0 ? (topMove.count / betweenQuadrantTransitions) : 0;

  const cadence = hp.cadence;
  const cadenceHasConfidence = !!cadence?.hasConfidence;
  const cadenceLabel: string | undefined = cadence?.cadenceLabel;
  const rapidNegativeMovesCount: number = cadence?.rapidNegativeMovesCount || 0;

  const parts: string[] = [];

  // Core framing (always)
  parts.push(
    'The Movement Flow Visualization summarises step-by-step movements between segments from one dated check-in to the next (customers can contribute to multiple movements if they change segment multiple times).'
  );

  // Movement exists (light opener)
  if (trackedCustomers >= 10 && totalTransitions >= 20) {
    parts.push(`We observed measurable customer movement over time across ${trackedCustomers} customers with historical records.`);
  }

  // Direction mix
  if (totalTransitions >= 50) {
    parts.push(
      `Across consecutive check-ins, ${formatPct(positiveTransitions, totalTransitions)} of transitions were positive, ${formatPct(negativeTransitions, totalTransitions)} negative, and ${formatPct(noChangeTransitions, totalTransitions)} showed no quadrant change.`
    );
  }

  // Concentration vs spread
  if (betweenQuadrantTransitions >= 20 && topMove) {
    if (topMovePct >= 0.35) {
      parts.push(
        `Movement is concentrated: the single largest transition (${formatTransitionName(topMove.from, topMove.to, isClassicModel)}) accounts for ${formatPct(topMove.count, betweenQuadrantTransitions)} of all between-quadrant movements.`
      );
    } else {
      parts.push('Movement is spread across multiple transitions rather than dominated by a single flow.');
    }
  }

  // Multi-movement
  if (trackedCustomers >= 30 && multiMove2PlusCustomers >= 10) {
    if (multiMove2PlusPct >= 0.15) {
      parts.push(
        `A material share of customers (${formatPct(multiMove2PlusCustomers, trackedCustomers)}) changed segments two or more times, suggesting a stability opportunity: some customers have not yet settled into a consistent segment.`
      );
    } else {
      parts.push(
        `A smaller cohort (${multiMove2PlusCustomers} customers) changed segments multiple times; these customers are worth monitoring as a stability segment.`
      );
    }

    if (multiMove2PlusPct >= 0.15) {
      parts.push(
        `Repeated segment changes may indicate boundary sensitivity—customers whose experience is close to the threshold and therefore more likely to switch classification as ${satLabel} or ${loyLabel} fluctuates.`
      );
    }
  } else if (trackedCustomers >= 10 && multiMove2PlusCustomers === 0) {
    parts.push('Most customers remained stable or moved at most once between segments during the period.');
  }

  // Rapid negative movement (cadence-aware)
  if (cadenceHasConfidence && rapidNegativeMovesCount >= 10) {
    const cadencePhrase = cadenceLabel ? ` (the typical time between check-ins appears approximately ${cadenceLabel})` : '';
    parts.push(
      `A notable share of negative movements occurred within one typical time between check-ins (cadence)${cadencePhrase}, which may indicate discrete bad experiences or complaints causing rapid deterioration.`
    );
  }

  // Midpoint governance note (optional)
  if (trackedCustomers >= 30 && multiMove2PlusPct >= 0.20) {
    parts.push(
      'If your operational definition of “good” differs from the mathematical midpoint, adjusting the midpoint can align segmentation to business standards and make borderline classifications more consistent.'
    );
  }

  // Optional mention of 3+ movers as a stronger stability signal
  if (trackedCustomers >= 30 && (multiMove3PlusCustomers >= 5 || (multiMove3PlusCustomers / trackedCustomers) >= 0.10)) {
    parts.push(
      `Stability risk: a subset of customers changed segments three or more times (${formatPct(multiMove3PlusCustomers, trackedCustomers)}), which may indicate inconsistent delivery, inconsistent expectations, or a threshold-sensitive experience that requires operational tightening.`
    );
  }

  return parts.join(' ');
}

/**
 * Generates commentary for the main visualisation chart
 */
function generateMainChartCommentary(evaluators: EvaluatorResults, isClassicModel: boolean = false, satLabel: string = 'satisfaction', loyLabel: string = 'loyalty'): string {
  const total = evaluators.sampleSize.total;
  const largest = evaluators.distribution.largest;
  
  if (!largest) {
    return `This visualisation shows the distribution of your ${total} customers across the ${satLabel}-${loyLabel} matrix. Each point represents a customer, positioned based on their ${satLabel} and ${loyLabel} scores.`;
  }

  const largestName = getQuadrantDisplayName(largest, isClassicModel);
  const largestCount = evaluators.distribution.counts[largest] || 0;
  const largestPercent = evaluators.distribution.percentages[largest] || 0;

  let commentary = `This visualisation shows the distribution of your ${total} customers across the ${satLabel}-${loyLabel} matrix. `;
  
  if (largestPercent > 40) {
    commentary += `The chart reveals a strong concentration in the ${largestName} quadrant, with ${largestCount} customers (${largestPercent.toFixed(1)}%) falling into this category. `;
  } else {
    commentary += `The chart shows that ${largestName} is your most common segment, with ${largestCount} customers (${largestPercent.toFixed(1)}%). `;
  }

  if (evaluators.distribution.isBalanced) {
    commentary += `The distribution appears relatively balanced across segments, which suggests a healthy mix of customer types.`;
  } else if (evaluators.distribution.isSkewed) {
    commentary += `However, the distribution is heavily skewed towards ${largestName}, which may indicate a lack of diversity in your customer base.`;
  }

  return commentary;
}

/**
 * Generates commentary for the distribution chart
 */
function generateDistributionChartCommentary(evaluators: EvaluatorResults, isClassicModel: boolean = false): string {
  const distribution = evaluators.distribution;
  
  if (!distribution.largest) {
    return 'The distribution breakdown provides detailed statistics for each customer segment.';
  }

  const largestName = getQuadrantDisplayName(distribution.largest, isClassicModel);
  const largestPercent = distribution.percentages[distribution.largest] || 0;

  let commentary = `This breakdown shows the detailed distribution across all customer segments. `;
  commentary += `${largestName} represents ${largestPercent.toFixed(1)}% of your customer base. `;

  // Mention other significant segments
  const segments = ['loyalists', 'mercenaries', 'hostages', 'defectors'] as const;
  const otherSegments = segments
    .filter(s => s !== distribution.largest && (distribution.counts[s] || 0) > 0)
    .map(s => ({
      name: getQuadrantDisplayName(s, isClassicModel),
      percent: distribution.percentages[s] || 0,
      count: distribution.counts[s] || 0
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 2);

  if (otherSegments.length > 0) {
    commentary += `Other notable segments include ${otherSegments.map(s => `${s.name} (${s.percent.toFixed(1)}%)`).join(' and ')}. `;
  }

  if (distribution.isBalanced) {
    commentary += `The relatively balanced distribution across segments is a positive indicator of customer diversity.`;
  }

  return commentary;
}

/**
 * Generates commentary for the response concentration chart
 */
function generateConcentrationChartCommentary(evaluators: EvaluatorResults, aggregatedData?: any, satLabel: string = 'satisfaction', loyLabel: string = 'loyalty'): string {
  const total = evaluators.sampleSize.total;
  
  let commentary = `The response concentration analysis reveals how customers cluster around specific ${satLabel}-${loyLabel} combinations. `;
  
  // Get the most repeated position from responseConcentration data
  const mostCommonCombo = aggregatedData?.responseConcentration?.mostCommonCombos?.[0];
  const avgSatisfaction = aggregatedData?.statistics?.satisfaction?.average;
  const avgLoyalty = aggregatedData?.statistics?.loyalty?.average;
  
  if (mostCommonCombo && avgSatisfaction !== undefined && avgLoyalty !== undefined) {
    const mostSat = mostCommonCombo.satisfaction;
    const mostLoy = mostCommonCombo.loyalty;
    const mostCount = mostCommonCombo.count;
    const mostPercent = mostCommonCombo.percentage;
    
    // Check if average has decimals (meaning no customer is actually at the average)
    const avgHasDecimals = (avgSatisfaction % 1 !== 0) || (avgLoyalty % 1 !== 0);
    
    // Add introduction explaining that average may not represent anyone
    if (avgHasDecimals) {
      commentary += `It's important to note that your average ${satLabel} (${avgSatisfaction.toFixed(1)}) and ${loyLabel} (${avgLoyalty.toFixed(1)}) are calculated values that may not represent any actual customer, since these averages include decimal values. This is why it's valuable to look at where your real customers are actually positioned. `;
    }
    
    // Determine if most repeated position is positive or negative relative to average
    const satDiff = mostSat - avgSatisfaction;
    const loyDiff = mostLoy - avgLoyalty;
    const isPositive = satDiff > 0 && loyDiff > 0;
    const isNegative = satDiff < 0 && loyDiff < 0;
    const isMixed = (satDiff > 0 && loyDiff < 0) || (satDiff < 0 && loyDiff > 0);
    
    // Calculate distance from average (Euclidean distance)
    const distanceFromAvg = Math.sqrt(Math.pow(satDiff, 2) + Math.pow(loyDiff, 2));
    const isFar = distanceFromAvg > 1.5; // Threshold for "far"
    const isClose = distanceFromAvg < 0.5; // Threshold for "close"
    
    commentary += `The most repeated position is ${satLabel} ${mostSat} and ${loyLabel} ${mostLoy}, with ${mostCount} customers (${mostPercent.toFixed(1)}% of your base). `;
    
    if (isPositive) {
      commentary += `This position is more positive than your average (${satLabel} ${avgSatisfaction.toFixed(1)}, ${loyLabel} ${avgLoyalty.toFixed(1)}), `;
    } else if (isNegative) {
      commentary += `This position is more negative than your average (${satLabel} ${avgSatisfaction.toFixed(1)}, ${loyLabel} ${avgLoyalty.toFixed(1)}), `;
    } else if (isMixed) {
      commentary += `This position shows a mixed pattern compared to your average (${satLabel} ${avgSatisfaction.toFixed(1)}, ${loyLabel} ${avgLoyalty.toFixed(1)}), `;
    } else {
      commentary += `This position is close to your average (${satLabel} ${avgSatisfaction.toFixed(1)}, ${loyLabel} ${avgLoyalty.toFixed(1)}), `;
    }
    
    if (isFar) {
      commentary += `and it's positioned far from the average, indicating a distinct customer segment with specific characteristics. `;
    } else if (isClose) {
      commentary += `and it's positioned close to the average, suggesting this represents your typical customer experience. `;
    } else {
      commentary += `showing moderate deviation from the average. `;
    }
  }
  
  if (total < 50) {
    commentary += `With ${total} customers, the concentration patterns may be less pronounced, but they still reveal important insights about where your customers tend to fall on the ${satLabel}-${loyLabel} spectrum.`;
  } else {
    commentary += `With ${total} customers, clear concentration patterns emerge, showing where the majority of your customer base is positioned. These clusters can help identify common customer experiences and potential areas for targeted interventions.`;
  }

  return commentary;
}

/**
 * Generates commentary for the proximity analysis chart
 */
function generateProximityChartCommentary(evaluators: EvaluatorResults): string {
  const proximity = evaluators.proximity;
  
  let commentary = `The proximity analysis identifies customers who are close to quadrant boundaries, revealing both risks and opportunities. `;

  if (proximity.hasRisks && proximity.hasOpportunities) {
    commentary += `The analysis shows ${proximity.highRiskCount} high-risk relationships and ${proximity.topOpportunities.length} opportunity relationships (${proximity.highOpportunityCount} high-opportunity). `;
    commentary += `Customers near boundaries are particularly important to monitor, as they may be at risk of moving to less strategic quadrants for retention, or have the potential to move to stronger segments with the right engagement.`;
  } else if (proximity.hasRisks) {
    commentary += `The analysis identifies ${proximity.highRiskCount} high-risk relationships where customers are close to moving to less strategic quadrants for retention. `;
    commentary += `These boundary customers require immediate attention to prevent negative movement.`;
  } else if (proximity.hasOpportunities) {
    commentary += `The analysis reveals ${proximity.topOpportunities.length} opportunity relationships (${proximity.highOpportunityCount} high-opportunity) where customers are close to moving across nearby segment boundaries. `;
    commentary += `These customers represent targeted movement potential and should be prioritised for focused engagement.`;
  } else {
    commentary += `The analysis shows that most customers are well-positioned within their quadrants, with fewer boundary cases requiring immediate attention.`;
  }

  return commentary;
}

/**
 * Generates commentary for the recommendation score chart
 * Uses tiered messaging based on score ranges with data balance checks
 */
function generateRecommendationChartCommentary(evaluators: EvaluatorResults): string {
  const rec = evaluators.recommendation;
  const score = rec.score;
  
  let commentary = `The Recommendation Score analysis shows how likely your customers are to recommend your brand. `;
  
  // Check for unbalanced data (only relevant for scores > 20)
  const hasUnbalancedData = (rec.detractors === 0 || rec.hasIncompleteScale) && score > 20;
  
  if (score > 30) {
    // Score > 30: Outstanding/Exceptional
    if (hasUnbalancedData) {
      commentary += `Your score of ${score.toFixed(1)} appears outstanding, with ${rec.promoters} Promoters (${rec.promotersPercent.toFixed(1)}%) and ${rec.detractors} Detractors (${rec.detractorsPercent.toFixed(1)}%). `;
      commentary += `However, this result may be conditioned by the fact that your data collection might be somewhat incomplete or biased. `;
      if (rec.detractors === 0) {
        commentary += `The absence of Detractors in your data is unusual and may indicate that you're not capturing the full range of customer experiences. `;
      }
      if (rec.hasIncompleteScale) {
        commentary += `Not all scale values are represented in your responses, which could suggest that certain customer segments or experiences are missing from your analysis. `;
      }
      commentary += `A Recommendation Score is typically more accurate when responses are distributed across the full range of possible values, including moments when customers might be frustrated or disappointed.`;
    } else {
      commentary += `Your score of ${score.toFixed(1)} is outstanding, with ${rec.promoters} Promoters (${rec.promotersPercent.toFixed(1)}%) significantly outweighing ${rec.detractors} Detractors (${rec.detractorsPercent.toFixed(1)}%). `;
      commentary += `This may indicate a healthy customer base that actively advocates for your brand. You may want to consider focusing on maintaining this strong position and investigating specific improvements, rather than obsessing over the number. Consider focusing on the improvements rather than the mark.`;
    }
  } else if (score > 20) {
    // Score 20-30: Strong Position
    if (hasUnbalancedData) {
      commentary += `Your score of ${score.toFixed(1)} appears positive, with ${rec.promoters} Promoters (${rec.promotersPercent.toFixed(1)}%) and ${rec.detractors} Detractors (${rec.detractorsPercent.toFixed(1)}%). `;
      commentary += `However, this result may be conditioned by the fact that your data collection might be somewhat incomplete or biased. `;
      if (rec.detractors === 0) {
        commentary += `The absence of Detractors in your data is unusual and may indicate that you're not capturing the full range of customer experiences. `;
      }
      if (rec.hasIncompleteScale) {
        commentary += `Not all scale values are represented in your responses, which could suggest that certain customer segments or experiences are missing from your analysis. `;
      }
      commentary += `A Recommendation Score is typically more accurate when responses are distributed across the full range of possible values.`;
    } else {
      commentary += `Your score of ${score.toFixed(1)} is positive, with ${rec.promoters} Promoters (${rec.promotersPercent.toFixed(1)}%) outnumbering ${rec.detractors} Detractors (${rec.detractorsPercent.toFixed(1)}%). `;
      commentary += `You seem to be in a strong position. You may want to consider focusing on investigating specific improvements and finding quick wins from your Detractors, rather than obsessing over the number. Consider focusing on the improvements rather than the mark.`;
    }
  } else if (score > 10) {
    // Score 10-20: On the Right Track
    commentary += `Your score of ${score.toFixed(1)} is positive, with ${rec.promoters} Promoters (${rec.promotersPercent.toFixed(1)}%) outnumbering ${rec.detractors} Detractors (${rec.detractorsPercent.toFixed(1)}%). `;
    commentary += `You seem to be on the right track. You may want to consider continuing to focus on growing your Promoter base and reducing Detractors.`;
  } else if (score > 0) {
    // Score 0-10: Room to Grow
    commentary += `Your score of ${score.toFixed(1)} is positive, with ${rec.promoters} Promoters (${rec.promotersPercent.toFixed(1)}%) outnumbering ${rec.detractors} Detractors (${rec.detractorsPercent.toFixed(1)}%). `;
    commentary += `Whilst this may be encouraging, there may still be room to grow the Promoter base and reduce Detractors.`;
  } else {
    // Score ≤ 0: Negative
    commentary += `Your score of ${score.toFixed(1)} is negative, with ${rec.detractors} Detractors (${rec.detractorsPercent.toFixed(1)}%) outnumbering ${rec.promoters} Promoters (${rec.promotersPercent.toFixed(1)}%). `;
    commentary += `This may be a significant concern that could require attention to address customer dissatisfaction and prevent negative word-of-mouth.`;
  }

  return commentary;
}

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

