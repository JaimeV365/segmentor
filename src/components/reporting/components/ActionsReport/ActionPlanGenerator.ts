import type { ActionPlanReport, AggregatedReportData, EvaluatorResults } from './types';
import { aggregateReportData } from './aggregators/reportDataAggregator';
import { evaluateDistribution } from './evaluators/distributionEvaluator';
import { evaluateSampleSize } from './evaluators/sampleSizeEvaluator';
import { evaluateStatistics } from './evaluators/statisticsEvaluator';
import { evaluateProximity } from './evaluators/proximityEvaluator';
import { evaluateRecommendation } from './evaluators/recommendationEvaluator';
import { generateFindings } from './statements/findings';
import { generateChartFindings } from './statements/chartFindings';
import { generateOpportunities } from './statements/opportunities';
import { generateRisks } from './statements/risks';
import { generateActions } from './statements/actions';
import { captureMultipleCharts } from './imageCapture/chartImageCapture';
import type { DataPoint } from '../../../../types/base';
import { groupByCustomer, parseDate } from '../HistoricalProgressSection/utils/historicalDataUtils';
import { calculateQuadrantMovements } from '../HistoricalProgressSection/services/historicalAnalysisService';

/**
 * Conversion type for actionable conversions
 */
interface Conversion {
  from: string;
  to: string;
  total: number;
  averageChances: number;
  customers: Array<{
    id: string;
    name?: string;
    email?: string;
    satisfaction: number;
    loyalty: number;
    currentQuadrant: string;
    targetQuadrant: string;
    distanceFromBoundary: number;
    riskScore: number;
  }>;
}

/**
 * Generates a complete Action Plan report
 */
export async function generateActionPlan(
  dataReport: any, // DataReport type
  proximityAnalysis: any, // ProximityAnalysisResult type
  recommendationScore: any, // RecommendationScoreResult type
  satisfactionScale: string,
  loyaltyScale: string,
  captureCharts: boolean = true,
  showNearApostles: boolean = false,
  isClassicModel: boolean = false,
  contextDistribution?: Record<string, number> | null,
  midpoint?: { sat: number; loy: number },
  originalData?: DataPoint[], // Original data with all fields including email
  isPremium: boolean = false // For Brand+ users, hide watermark in main chart capture
): Promise<ActionPlanReport> {
  // 1. Aggregate all report data
  const aggregated = aggregateReportData(dataReport, proximityAnalysis, recommendationScore, contextDistribution);

  // 2. Run all evaluators
  const evaluators: EvaluatorResults = {
    distribution: evaluateDistribution(aggregated.distribution, aggregated.total),
    sampleSize: evaluateSampleSize(aggregated.total, aggregated.distribution),
    proximity: evaluateProximity(aggregated.proximity),
    statistics: evaluateStatistics(
      aggregated.statistics,
      satisfactionScale as any,
      loyaltyScale as any,
      midpoint
    ),
    recommendation: evaluateRecommendation(aggregated.recommendationScore, loyaltyScale)
  };

  // Create getQuadrantForPoint function if we have midpoint (used by opportunities/risks/actions and historical movements)
  const getQuadrantForPoint = midpoint ? (point: { satisfaction: number; loyalty: number }) => {
    if (point.satisfaction >= midpoint.sat && point.loyalty >= midpoint.loy) return 'loyalists';
    if (point.satisfaction >= midpoint.sat && point.loyalty < midpoint.loy) return 'mercenaries';
    if (point.satisfaction < midpoint.sat && point.loyalty >= midpoint.loy) return 'hostages';
    return 'defectors';
  } : undefined;

  // Attach Historical Progress insights if we have enough dated data
  try {
    if (originalData && originalData.length > 0 && getQuadrantForPoint) {
      const datedData = originalData.filter(p => !p.excluded && !!p.date);
      if (datedData.length > 0) {
        const dateFormat = datedData.find(p => p.date && (p as any).dateFormat)?.dateFormat as string | undefined;

        // Timelines are already filtered to customers with 2+ distinct dates.
        const timelines = groupByCustomer(datedData as any);
        if (timelines.length > 0) {
          const movementStats = calculateQuadrantMovements(
            timelines as any,
            (p: any) => getQuadrantForPoint({ satisfaction: p.satisfaction, loyalty: p.loyalty }) as any
          );

          // Journey (multi-movement) rollups
          let multiMove2PlusCustomers = 0;
          let multiMove3PlusCustomers = 0;

          // Cadence / rapid negative movement
          const deltasDays: number[] = [];
          let customersWith2Dates = 0;
          let rapidNegativeMovesCount = 0;

          const mainQuadrantRank: Record<string, number> = {
            defectors: 1,
            hostages: 2,
            mercenaries: 3,
            loyalists: 4
          };

          // First pass: compute moves counts and date-gap distribution
          const perTimelineParsed: Array<{
            quadrants: string[];
            dates: string[];
            dateObjs: Date[];
          }> = [];

          timelines.forEach((t: any) => {
            // Use unique dates from timeline, sorted
            const uniqueDates: string[] = (t.dates || [])
              .filter((d: any) => typeof d === 'string' && d.trim().length > 0)
              .map((d: string) => d.trim())
              .sort((a: string, b: string) => a.localeCompare(b));

            // Build date->point map (last wins)
            const pointByDate = new Map<string, any>();
            (t.dataPoints || []).forEach((p: any) => {
              if (!p.date) return;
              pointByDate.set(String(p.date).trim(), p);
            });

            const quadrantsByDate: string[] = [];
            const parsedDates: Date[] = [];
            const parsedDateStrings: string[] = [];

            uniqueDates.forEach((d: string) => {
              const point = pointByDate.get(d);
              if (!point) return;
              const q = getQuadrantForPoint({ satisfaction: point.satisfaction, loyalty: point.loyalty });
              quadrantsByDate.push(q);
              const dt = parseDate(d, dateFormat);
              if (dt) {
                parsedDates.push(dt);
                parsedDateStrings.push(d);
              }
            });

            // Moves count (compress consecutive duplicates)
            const compressed: string[] = [];
            quadrantsByDate.forEach(q => {
              const last = compressed[compressed.length - 1];
              if (!last || last !== q) compressed.push(q);
            });
            const movesCount = Math.max(0, compressed.length - 1);
            if (movesCount >= 2) multiMove2PlusCustomers += 1;
            if (movesCount >= 3) multiMove3PlusCustomers += 1;

            // Cadence gaps
            if (parsedDates.length >= 2) {
              customersWith2Dates += 1;
              for (let i = 0; i < parsedDates.length - 1; i += 1) {
                const diffMs = parsedDates[i + 1].getTime() - parsedDates[i].getTime();
                const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
                if (!Number.isNaN(diffDays) && Number.isFinite(diffDays)) {
                  deltasDays.push(diffDays);
                }
              }
              perTimelineParsed.push({
                quadrants: quadrantsByDate,
                dates: parsedDateStrings,
                dateObjs: parsedDates
              });
            } else {
              perTimelineParsed.push({
                quadrants: quadrantsByDate,
                dates: [],
                dateObjs: []
              });
            }
          });

          // Cadence estimate (median)
          const gapsCount = deltasDays.length;
          const hasCadenceConfidence = gapsCount >= 30 && customersWith2Dates >= 15;
          let typicalGapDays: number | null = null;
          let cadenceLabel: 'monthly' | 'quarterly' | 'annual' | undefined;
          if (hasCadenceConfidence) {
            const sorted = [...deltasDays].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            typicalGapDays = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

            if (typicalGapDays >= 25 && typicalGapDays <= 45) cadenceLabel = 'monthly';
            else if (typicalGapDays >= 70 && typicalGapDays <= 110) cadenceLabel = 'quarterly';
            else if (typicalGapDays >= 300 && typicalGapDays <= 430) cadenceLabel = 'annual';
          }

          // Rapid negative movement count (only if cadence is confident)
          if (hasCadenceConfidence && typicalGapDays !== null) {
            const rapidThresholdDays = typicalGapDays;
            perTimelineParsed.forEach(t => {
              if (t.dateObjs.length < 2) return;
              // Determine quadrant per parsed date order (same order as parsedDates)
              // NOTE: quadrants array may include entries for unparseable dates; we align by parsed date strings.
              const qByIdx: string[] = [];
              t.dates.forEach((d, idx) => {
                // Find the original point's quadrant for this date string by re-evaluating from originalData map isn't available here.
                // We approximate using the already-computed quadrants list if lengths align; otherwise skip.
                if (idx < t.quadrants.length) qByIdx.push(t.quadrants[idx]);
              });
              if (qByIdx.length < 2) return;

              for (let i = 0; i < t.dateObjs.length - 1; i += 1) {
                const fromQ = qByIdx[i];
                const toQ = qByIdx[i + 1];
                if (!fromQ || !toQ || fromQ === toQ) continue;
                const fromRank = mainQuadrantRank[fromQ] ?? 0;
                const toRank = mainQuadrantRank[toQ] ?? 0;
                const isNegative = toRank < fromRank;
                if (!isNegative) continue;
                const diffMs = t.dateObjs[i + 1].getTime() - t.dateObjs[i].getTime();
                const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
                if (diffDays <= rapidThresholdDays) {
                  rapidNegativeMovesCount += 1;
                }
              }
            });
          }

          (aggregated as AggregatedReportData).historicalProgress = {
            trackedCustomers: timelines.length,
            totalTransitions: movementStats.totalMovements,
            positiveTransitions: movementStats.positiveMovements,
            negativeTransitions: movementStats.negativeMovements,
            noChangeTransitions: movementStats.neutralMovements,
            betweenQuadrantTransitions: movementStats.positiveMovements + movementStats.negativeMovements,
            topTransitions: movementStats.movements.slice(0, 5).map(m => ({ from: m.from, to: m.to, count: m.count })),
            multiMove2PlusCustomers,
            multiMove3PlusCustomers,
            cadence: {
              hasConfidence: hasCadenceConfidence,
              typicalGapDays,
              cadenceLabel,
              gapsCount,
              customersWith2Dates,
              rapidNegativeMovesCount
            }
          };
        }
      }
    }
  } catch (e) {
    console.warn('[ActionPlanGenerator] Failed to compute Historical Progress insights:', e);
  }

  // 3. Generate statements
  const textFindings = generateFindings(evaluators, showNearApostles, isClassicModel);
  const chartFindings = generateChartFindings(evaluators, isClassicModel, aggregated);
  
  // Interleave findings: text findings first (by priority), then chart findings (by report order)
  // Charts are inserted after their corresponding text findings based on category
  const findings: typeof textFindings = [];
  
  // Group text findings by category
  const findingsByCategory: Record<string, typeof textFindings> = {
    data: [],
    concentration: [],
    distribution: [],
    historical: [],
    proximity: [],
    recommendation: []
  };
  
  textFindings.forEach(f => {
    if (!findingsByCategory[f.category]) findingsByCategory[f.category] = [];
    findingsByCategory[f.category].push(f);
  });
  
  // Build interleaved findings: Data → Concentration → Distribution → Historical Progress → Proximity → Recommendation
  const categoryOrder: Array<keyof typeof findingsByCategory> = ['data', 'concentration', 'distribution', 'historical', 'proximity', 'recommendation'];
  
  // Find main visualization chart and quadrant descriptions
  const mainVisualizationChart = chartFindings.find(cf => cf.id === 'chart-main-visualisation');
  // Quadrant descriptions include both the description findings and the "too empty" findings
  const quadrantDescriptions = textFindings.filter(f => 
    f.id?.startsWith('quadrant-description-') || f.id?.startsWith('distribution-too-empty-')
  );
  const otherTextFindings = textFindings.filter(f => 
    !f.id?.startsWith('quadrant-description-') && !f.id?.startsWith('distribution-too-empty-')
  );
  
  categoryOrder.forEach(category => {
    // Add text findings for this category (excluding quadrant descriptions)
    const categoryFindings = otherTextFindings.filter(f => f.category === category);
    findings.push(...categoryFindings.sort((a, b) => a.priority - b.priority));
    
    // Add ALL chart findings for this category (not just the first one)
    // This allows multiple charts per category (e.g., proximity distribution + actionable conversions)
    const categoryChartFindings = chartFindings
      .filter(cf => cf.category === category)
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
    
    categoryChartFindings.forEach(chartFinding => {
      findings.push(chartFinding);
      
      // If this is the main visualization chart, add quadrant descriptions right after it
      if (chartFinding.id === 'chart-main-visualisation' && quadrantDescriptions.length > 0) {
        findings.push(...quadrantDescriptions.sort((a, b) => a.priority - b.priority));
      }
    });
  });
  
  // Calculate actionable conversions from proximity analysis
  // Use passed originalData, or fallback to empty array if not provided
  const dataForConversions = originalData || [];
  
  // Debug: Log to verify emails are present in originalData
  if (dataForConversions.length > 0) {
    const sampleWithEmail = dataForConversions.find(d => d.email);
    console.log('[ActionPlanGenerator] Original data sample:', {
      total: dataForConversions.length,
      hasEmails: dataForConversions.filter(d => d.email).length,
      sampleId: sampleWithEmail?.id,
      sampleEmail: sampleWithEmail?.email,
      firstThree: dataForConversions.slice(0, 3).map(d => ({ id: d.id, email: d.email }))
    });
  }
  
  const actionableConversions = calculateActionableConversions(
    proximityAnalysis,
    dataForConversions
  );

  // Debug logging for actionable conversions
  console.log('[ActionPlanGenerator] Actionable Conversions:', {
    opportunitiesCount: actionableConversions.opportunities.length,
    warningsCount: actionableConversions.warnings.length,
    opportunities: actionableConversions.opportunities.map(conv => ({
      from: conv.from,
      to: conv.to,
      total: conv.total,
      averageChances: conv.averageChances.toFixed(1)
    })),
    proximityAvailable: proximityAnalysis?.settings?.isAvailable
  });

  const opportunities = generateOpportunities(evaluators, isClassicModel, proximityAnalysis, dataForConversions, getQuadrantForPoint);
  const risks = generateRisks(evaluators, isClassicModel, proximityAnalysis, dataForConversions, getQuadrantForPoint, loyaltyScale);
  
  const actions = generateActions(evaluators, isClassicModel, actionableConversions, proximityAnalysis, dataForConversions, getQuadrantForPoint);

  // Detect and handle duplicate customer lists
  const { detectDuplicateCustomerLists } = require('./utils/detectDuplicateCustomerLists');
  const allStatements = [
    ...risks.map(r => ({ id: r.id, supportingData: r.supportingData })),
    ...opportunities.map(o => ({ id: o.id, supportingData: o.supportingData })),
    ...actions.map(a => ({ id: a.id, supportingData: a.supportingData }))
  ];
  const duplicates = detectDuplicateCustomerLists(allStatements);
  
  // Log duplicates for debugging
  if (duplicates.size > 0) {
    const duplicateEntries: Array<[string, string[]]> = Array.from(duplicates.entries()) as Array<[string, string[]]>;
    console.log('[ActionPlanGenerator] Found duplicate customer lists:', duplicateEntries.map(([sig, ids]) => ({
      signature: sig.substring(0, 50) + '...',
      statementIds: ids,
      customerCount: sig.split(',').length
    })));
  }
  
  // Debug logging for actions
  const conversionActions = actions.filter(a => a.supportingData?.conversionType === 'opportunity');
  console.log('[ActionPlanGenerator] Conversion Actions Generated:', conversionActions.length);
  if (conversionActions.length > 0) {
    console.log('[ActionPlanGenerator] Conversion Actions:', conversionActions.map(a => ({
      id: a.id,
      from: a.supportingData?.from,
      to: a.supportingData?.to,
      customerCount: a.supportingData?.customerCount
    })));
  }
  
  // Debug logging
  console.log('[ActionPlanGenerator] Generated opportunities:', opportunities.length);
  console.log('[ActionPlanGenerator] Generated risks:', risks.length);
  if (opportunities.length === 0) {
    console.warn('[ActionPlanGenerator] No opportunities generated. Evaluator state:', {
      hasOpportunities: evaluators.proximity.hasOpportunities,
      topOpportunitiesCount: evaluators.proximity.topOpportunities.length,
      neutralCount: evaluators.distribution.neutralCount,
      mercenariesCount: evaluators.distribution.counts.mercenaries,
      hostagesCount: evaluators.distribution.counts.hostages,
      promoters: evaluators.recommendation.promoters
    });
  }

  // 4. Capture chart images (if requested)
  let supportingImages: any[] = [];
  console.log('🔍 ActionPlanGenerator: captureCharts =', captureCharts, 'isPremium =', isPremium);
  if (captureCharts) {
    // Collect unique chart selectors from chart findings only
    const chartSelectors = new Set<string>();
    
    chartFindings.forEach(cf => {
      if (cf.chartSelector) {
        chartSelectors.add(cf.chartSelector);
        // Debug logging for actionable conversions
        if (cf.id === 'chart-proximity-actionable-conversions') {
          console.log('📊 Actionable Conversions chart finding detected:', {
            id: cf.id,
            selector: cf.chartSelector,
            category: cf.category
          });
        }
      }
    });

    console.log('📸 Total chart selectors to capture:', chartSelectors.size);
    console.log('📸 Chart selectors:', Array.from(chartSelectors));

    // Create capture requests
    const captureRequests = Array.from(chartSelectors).map(selector => {
      const chartFinding = chartFindings.find(cf => cf.chartSelector === selector);
      return {
        selector,
        caption: chartFinding?.chartCommentary || getCaptionForSelector(selector)
      };
    });

    // Capture charts
    console.log('📸 Starting chart capture for', captureRequests.length, 'charts');
    // Always hide watermark when capturing main chart (for both premium and non-premium)
    // Watermark will be added correctly in export process if needed
    supportingImages = await captureMultipleCharts(captureRequests, { 
      hideWatermarkForMainChart: true // Always true - watermark added in export
    });
    console.log('📸 Chart capture completed. Captured', supportingImages.length, 'charts');
    
    // Log which charts were captured
    supportingImages.forEach(img => {
      if (img.selector?.includes('actionable-conversions')) {
        console.log('✅ Actionable Conversions chart captured successfully:', img.id);
      }
    });
  }

  // 5. Build metadata
  const metadata = {
    totalCustomers: aggregated.total,
    reportDate: new Date().toISOString(),
    scales: {
      satisfaction: satisfactionScale,
      loyalty: loyaltyScale
    }
  };

  return {
    date: new Date().toISOString(),
    findings,
    opportunities,
    risks,
    actions,
    supportingImages,
    metadata
  };
}

/**
 * Calculate actionable conversions from proximity analysis
 * Returns opportunities (positive movements) sorted by average chances
 */
function calculateActionableConversions(
  proximityAnalysis: any,
  originalData: DataPoint[]
): { opportunities: Conversion[]; warnings: Conversion[] } {
  console.log('[calculateActionableConversions] Starting with:', {
    hasProximityAnalysis: !!proximityAnalysis,
    isAvailable: proximityAnalysis?.settings?.isAvailable,
    hasAnalysis: !!proximityAnalysis?.analysis,
    analysisKeys: proximityAnalysis?.analysis ? Object.keys(proximityAnalysis.analysis) : [],
    analysisSample: proximityAnalysis?.analysis ? Object.entries(proximityAnalysis.analysis).slice(0, 3).map(([key, detail]: [string, any]) => ({
      key,
      hasCustomers: !!detail?.customers,
      customerCount: detail?.customerCount,
      customersLength: Array.isArray(detail?.customers) ? detail.customers.length : 'not array'
    })) : []
  });

  if (!proximityAnalysis?.settings?.isAvailable || !proximityAnalysis?.analysis) {
    console.log('[calculateActionableConversions] Early return - not available or no analysis');
    return { opportunities: [], warnings: [] };
  }

  // Get all proximity customers (same logic as ProximitySection)
  const getAllProximityCustomers: Array<{
    id: string;
    name?: string;
    email?: string;
    satisfaction: number;
    loyalty: number;
    currentQuadrant: string;
    targetQuadrant: string;
    relationship: string;
    distanceFromBoundary: number;
    riskScore: number;
  }> = [];

  Object.entries(proximityAnalysis.analysis).forEach(([key, detail]: [string, any]) => {
    if (detail?.customers && Array.isArray(detail.customers) && detail.customers.length > 0) {
      const baseQuadrant = key.split('_close_to_')[0];
      const targetQuadrant = key.split('_close_to_')[1];
      console.log(`[calculateActionableConversions] Processing ${key}: ${detail.customers.length} customers`);
      detail.customers.forEach((customer: any) => {
        // Get email from original data if available
        const originalCustomer = originalData.find(d => d.id === customer.id);
        getAllProximityCustomers.push({
          ...customer,
          email: originalCustomer?.email,
          currentQuadrant: baseQuadrant,
          targetQuadrant: targetQuadrant,
          relationship: key
        });
      });
    }
  });

  // Helper to determine if movement is positive
  const isPositiveMovement = (from: string, to: string): boolean => {
    if (to === 'defectors' || to === 'terrorists') return false;
    if (from === 'loyalists' || from === 'apostles' || from === 'near_apostles') return false;
    if (to === 'loyalists' || to === 'apostles' || to === 'near_apostles') return true;
    if (from === 'defectors' || from === 'terrorists') return true;
    // For other movements, check segment order
    const segmentOrder: Record<string, number> = {
      'apostles': 1,
      'near_apostles': 2,
      'loyalists': 3,
      'mercenaries': 4,
      'hostages': 5,
      'defectors': 6,
      'terrorists': 7
    };
    return (segmentOrder[to] || 99) < (segmentOrder[from] || 99);
  };

  // Group by conversion type
  const conversions: Record<string, Conversion> = {};

  getAllProximityCustomers.forEach(customer => {
    const key = `${customer.currentQuadrant}_to_${customer.targetQuadrant}`;
    if (!conversions[key]) {
      conversions[key] = {
        from: customer.currentQuadrant,
        to: customer.targetQuadrant,
        total: 0,
        averageChances: 0,
        customers: []
      };
    }
    conversions[key].total++;
    conversions[key].customers.push(customer);
  });

  console.log(`[calculateActionableConversions] Found ${getAllProximityCustomers.length} total proximity customers`);
  console.log(`[calculateActionableConversions] Grouped into ${Object.keys(conversions).length} conversion types:`, Object.keys(conversions));

  // Calculate average chances
  Object.keys(conversions).forEach(key => {
    const conv = conversions[key];
    const sum = conv.customers.reduce((acc, c) => acc + (c.riskScore || 0), 0);
    conv.averageChances = conv.total > 0 ? sum / conv.total : 0;
  });

  // Separate and sort
  const opportunities = Object.values(conversions)
    .filter(conv => isPositiveMovement(conv.from, conv.to))
    .sort((a, b) => b.averageChances - a.averageChances);
  
  console.log(`[calculateActionableConversions] Found ${opportunities.length} opportunities:`, opportunities.map(conv => ({
    from: conv.from,
    to: conv.to,
    total: conv.total,
    averageChances: conv.averageChances.toFixed(1)
  })));

  const warnings = Object.values(conversions)
    .filter(conv => !isPositiveMovement(conv.from, conv.to))
    .sort((a, b) => b.averageChances - a.averageChances);

  return { opportunities, warnings };
}

/**
 * Gets a caption for a chart selector
 */
function getCaptionForSelector(selector: string): string {
  if (selector.includes('chart-container') || selector === '.chart-container') {
    return 'Main Customer Segmentation Chart';
  }
  if (selector.includes('distribution')) {
    return 'Distribution Analysis';
  }
  if (selector.includes('concentration')) {
    return 'Response Concentration';
  }
  if (selector.includes('proximity')) {
    return 'Proximity Analysis';
  }
  if (selector.includes('recommendation')) {
    return 'Recommendation Score';
  }
  return 'Chart';
}

