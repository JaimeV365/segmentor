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

type AudienceContext = 'b2c' | 'b2b';

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
  isPremium: boolean = false, // For Brand+ users, hide watermark in main chart capture
  axisLabels?: { satisfaction: string; loyalty: string },
  audienceContext: AudienceContext = 'b2c'
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
            // Keep more than 5 so we can reliably pick top positive/negative flows later in Ops/Risks/Actions.
            topTransitions: movementStats.movements.slice(0, 15).map(m => ({ from: m.from, to: m.to, count: m.count })),
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
  const textFindings = generateFindings(evaluators, showNearApostles, isClassicModel, axisLabels);
  const chartFindings = generateChartFindings(evaluators, isClassicModel, aggregated, axisLabels);
  
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
  
  // Build interleaved findings: Data → Recommendation → Concentration → Distribution → Proximity → Historical Progress
  // Recommendation comes right after Data (since it's part of the Data Report section in the UI)
  const categoryOrder: Array<keyof typeof findingsByCategory> = ['data', 'recommendation', 'concentration', 'distribution', 'proximity', 'historical'];
  
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
  
  const actions = generateActions(
    evaluators,
    isClassicModel,
    actionableConversions,
    proximityAnalysis,
    dataForConversions,
    getQuadrantForPoint,
    audienceContext
  );

  // ===== HISTORICAL PROGRESS (Ops & Risks + Actions) =====
  // Add cadence-aware statements derived from Historical Progress insights (per internal guide).
  const historicalProgress = (aggregated as AggregatedReportData).historicalProgress;
  if (historicalProgress && historicalProgress.trackedCustomers > 0 && historicalProgress.totalTransitions > 0) {
    const trackedCustomers = historicalProgress.trackedCustomers;
    const totalTransitions = historicalProgress.totalTransitions;
    const betweenQuadrantTransitions = historicalProgress.betweenQuadrantTransitions;
    const positiveTransitions = historicalProgress.positiveTransitions;
    const negativeTransitions = historicalProgress.negativeTransitions;
    const noChangeTransitions = historicalProgress.noChangeTransitions;
    const multiMove2PlusCustomers = historicalProgress.multiMove2PlusCustomers;
    const multiMove3PlusCustomers = historicalProgress.multiMove3PlusCustomers;

    const multiMove2PlusPct = trackedCustomers > 0 ? multiMove2PlusCustomers / trackedCustomers : 0;
    const multiMove3PlusPct = trackedCustomers > 0 ? multiMove3PlusCustomers / trackedCustomers : 0;

    const hasQuantConfidence = trackedCustomers >= 10 && totalTransitions >= 20;
    const hasPctConfidence = trackedCustomers >= 30 && totalTransitions >= 50;

    const formatPct = (numerator: number, denominator: number) => {
      if (denominator <= 0) return '0%';
      const pct = (numerator / denominator) * 100;
      return `${pct.toFixed(1)}%`;
    };

    const mainQuadrantRank: Record<string, number> = {
      defectors: 0,
      hostages: 1,
      mercenaries: 2,
      loyalists: 3
    };
    const isMainQuadrant = (q: string) => Object.prototype.hasOwnProperty.call(mainQuadrantRank, q);
    const formatTransitionName = (from: string, to: string) => `${from} → ${to}`;

    const topTransitions = (historicalProgress.topTransitions || []).filter(
      t => t.from && t.to && t.from !== t.to && isMainQuadrant(t.from) && isMainQuadrant(t.to)
    );
    const topPositive = topTransitions.find(t => (mainQuadrantRank[t.to] ?? 0) > (mainQuadrantRank[t.from] ?? 0));
    const topNegative = topTransitions.find(t => (mainQuadrantRank[t.to] ?? 0) < (mainQuadrantRank[t.from] ?? 0));

    const topPositiveMoveName = topPositive ? formatTransitionName(topPositive.from, topPositive.to) : null;
    const topNegativeMoveName = topNegative ? formatTransitionName(topNegative.from, topNegative.to) : null;
    const topPositiveMovePct =
      topPositive && betweenQuadrantTransitions > 0 ? topPositive.count / betweenQuadrantTransitions : 0;
    const topNegativeMovePct =
      topNegative && betweenQuadrantTransitions > 0 ? topNegative.count / betweenQuadrantTransitions : 0;

    // We capture the diagram in Findings; for Ops/Risks we reference it (no extra screenshot duplication).
    const chartSelector = '[data-section-id="report-historical-progress"] .movement-diagram-container';

    // Always include at least one Historical Progress reference (light language if sample is small).
    // Put these at the top so they’re easy to find in the UI.
    if (!hasQuantConfidence) {
      risks.unshift({
        id: 'risk-historical-small-sample',
        source: 'historical',
        severity: 'low',
        statement: `Historical Progress is available, but the amount of historical data is limited (${trackedCustomers} customers with 2+ dated records). Treat movement signals as directional and prioritise collecting more consistent check-ins before drawing strong conclusions.`,
        supportingData: { trackedCustomers, totalTransitions },
        chartSelector
      });

      actions.push({
        id: 'action-historical-improve-checkins',
        statement:
          'Improve the consistency of historical check-ins: standardise when you measure satisfaction/loyalty (and for which customer cohorts) so Historical Progress movement can be interpreted with higher confidence.',
        quadrant: undefined,
        priority: 2,
        actionability: 'medium',
        expectedImpact: 'medium',
        roi: 4,
        supportingData: { trackedCustomers, totalTransitions }
      });
    }

    // OR1 — Negative movement pressure
    if (negativeTransitions >= 10 && negativeTransitions > positiveTransitions) {
      risks.unshift({
        id: 'risk-historical-negative-pressure',
        source: 'historical',
        severity: 'high',
        statement: hasPctConfidence
          ? `Historical Progress risk: negative transitions outweigh positive ones. Across consecutive check-ins, ${formatPct(negativeTransitions, totalTransitions)} of transitions were negative vs ${formatPct(positiveTransitions, totalTransitions)} positive, indicating downward movement pressure to investigate and mitigate.`
          : 'Historical Progress risk: negative transitions outweigh positive ones in the observed period, indicating downward movement pressure that should be investigated and mitigated.',
        supportingData: { trackedCustomers, totalTransitions, positiveTransitions, negativeTransitions, noChangeTransitions },
        chartSelector
      });
    }

    // OR2 — Positive momentum
    if (positiveTransitions >= 10 && positiveTransitions > negativeTransitions) {
      opportunities.unshift({
        id: 'opportunity-historical-positive-momentum',
        source: 'historical',
        impact: 'medium',
        statement: hasPctConfidence
          ? `Historical Progress opportunity: positive transitions outweigh negative ones. Across consecutive check-ins, ${formatPct(positiveTransitions, totalTransitions)} of transitions were positive vs ${formatPct(negativeTransitions, totalTransitions)} negative, suggesting improvement momentum that can be reinforced and scaled.`
          : 'Historical Progress opportunity: positive transitions outweigh negative ones, suggesting improvement momentum that can be reinforced and scaled.',
        supportingData: { trackedCustomers, totalTransitions, positiveTransitions, negativeTransitions, noChangeTransitions },
        chartSelector
      });
    }

    // OR3 — Largest negative flow
    if (topNegative && negativeTransitions >= 10 && topNegativeMovePct >= 0.15) {
      risks.unshift({
        id: 'risk-historical-top-negative-flow',
        source: 'historical',
        severity: 'high',
        statement: `Historical Progress risk: the largest negative flow is ${topNegativeMoveName}, representing ${formatPct(topNegative.count, betweenQuadrantTransitions)} of between‑quadrant movement—this is the clearest leak to address.`,
        supportingData: {
          trackedCustomers,
          betweenQuadrantTransitions,
          topNegativeMove: { ...topNegative, pct: topNegativeMovePct }
        },
        chartSelector
      });
    }

    // OR4 — Stability risk (multi-movement)
    if (multiMove3PlusCustomers >= 5 || multiMove3PlusPct >= 0.1) {
      risks.unshift({
        id: 'risk-historical-stability-multi-movement',
        source: 'historical',
        severity: 'medium',
        statement:
          'Historical Progress stability risk: a subset of customers change segments three or more times, which may indicate inconsistent delivery, inconsistent expectations, or a threshold‑sensitive experience that requires operational tightening.',
        supportingData: {
          trackedCustomers,
          multiMove3PlusCustomers,
          multiMove3PlusPct
        },
        chartSelector
      });
    }

    // OR5 — Rapid negative movement (cadence-aware, only with confidence)
    if (historicalProgress.cadence?.hasConfidence && historicalProgress.cadence.rapidNegativeMovesCount >= 10) {
      const typicalGapDays = historicalProgress.cadence.typicalGapDays;
      risks.unshift({
        id: 'risk-historical-rapid-negative',
        source: 'historical',
        severity: 'high',
        statement: `Historical Progress risk: rapid negative movement within one typical time between check‑ins (cadence) may indicate incidents or complaints; prioritise investigation of the experience drivers behind these fast deteriorations.${typeof typicalGapDays === 'number' ? ` (Typical time between check‑ins (cadence): ~${Math.round(typicalGapDays)} days.)` : ''}`,
        supportingData: {
          typicalGapDays,
          cadenceLabel: historicalProgress.cadence.cadenceLabel,
          rapidNegativeMovesCount: historicalProgress.cadence.rapidNegativeMovesCount
        },
        chartSelector
      });

      actions.push({
        id: 'action-historical-early-warning',
        statement:
          'Create an early‑warning loop for rapid negative movement: monitor leading indicators between check-ins (complaints, incidents, product failures), trigger proactive outreach within one typical time between check‑ins (cadence), and verify recovery at the next measurement.',
        quadrant: undefined,
        priority: 2,
        actionability: 'medium',
        expectedImpact: 'high',
        roi: 6,
        supportingData: {
          typicalGapDays,
          rapidNegativeMovesCount: historicalProgress.cadence.rapidNegativeMovesCount
        }
      });
    }

    // A1 — Stabilise multi-movement cohort
    if (trackedCustomers >= 30 && multiMove2PlusPct >= 0.15) {
      actions.push({
        id: 'action-historical-stabilise-multi-movers',
        statement:
          'Create a stabilisation initiative for multi‑movement customers: identify common friction points, apply targeted improvements, and follow up to confirm they settle into a stronger segment.',
        quadrant: undefined,
        priority: 2,
        actionability: 'hard',
        expectedImpact: 'high',
        roi: 3,
        supportingData: { trackedCustomers, multiMove2PlusCustomers, multiMove2PlusPct }
      });
    }

    // A2 — Reduce top negative transition
    if (topNegative && negativeTransitions >= 10 && topNegativeMovePct >= 0.15) {
      actions.push({
        id: 'action-historical-reduce-top-negative',
        statement: `Prioritise interventions that reduce the top negative transition (${topNegativeMoveName}) via root‑cause analysis, service recovery, and process fixes.`,
        quadrant: undefined,
        priority: 2,
        actionability: 'medium',
        expectedImpact: 'high',
        roi: 6,
        supportingData: {
          trackedCustomers,
          betweenQuadrantTransitions,
          topNegativeMove: { ...topNegative, pct: topNegativeMovePct }
        }
      });
    }

    // A3 — Scale top positive transition
    if (topPositive && positiveTransitions >= 10 && topPositiveMovePct >= 0.15) {
      actions.push({
        id: 'action-historical-scale-top-positive',
        statement: `Scale the behaviours/processes associated with the top positive transition (${topPositiveMoveName}) and institutionalise them as standard practice.`,
        quadrant: undefined,
        priority: 2,
        actionability: 'easy',
        expectedImpact: 'high',
        roi: 9,
        supportingData: {
          trackedCustomers,
          betweenQuadrantTransitions,
          topPositiveMove: { ...topPositive, pct: topPositiveMovePct }
        }
      });
    }

    // If we have historical data but no between-quadrant changes, call out stability explicitly.
    if (betweenQuadrantTransitions === 0) {
      opportunities.unshift({
        id: 'opportunity-historical-stability',
        source: 'historical',
        impact: 'low',
        statement:
          'Historical Progress suggests stability: customers with historical records did not change quadrant between consecutive check-ins. This can be a strength, but it also means shifting segment distribution will likely require deliberate interventions rather than organic drift.',
        supportingData: { trackedCustomers, totalTransitions, noChangeTransitions },
        chartSelector
      });
    }

    // Fallback (important for demo / small-but-valid historical datasets):
    // If Historical Progress exists but none of the higher-threshold OR/A triggers fired,
    // add a light, non-quantitative reference so the user always sees it reflected in Ops/Risks and Actions.
    const hasHistoricalOpp = opportunities.some(o => (o as any).source === 'historical');
    const hasHistoricalRisk = risks.some(r => (r as any).source === 'historical');
    const hasHistoricalAction = actions.some(a => a.id && a.id.startsWith('action-historical-'));

    if (!hasHistoricalOpp && !hasHistoricalRisk && betweenQuadrantTransitions > 0) {
      const directionLabel =
        positiveTransitions > 0 && negativeTransitions > 0
          ? 'both positive and negative'
          : positiveTransitions > 0
            ? 'positive'
            : 'negative';

      // Prefer a risk framing if there is any negative movement; otherwise an opportunity framing.
      if (negativeTransitions > 0) {
        risks.unshift({
          id: 'risk-historical-movement-present',
          source: 'historical',
          severity: 'low',
          statement: `Historical Progress shows ${directionLabel} between‑quadrant movement over time. Even with a modest sample, this is a useful operational signal—review the Movement Flow diagram to identify the main “leaks” and stabilise the drivers behind them.`,
          supportingData: { trackedCustomers, totalTransitions, betweenQuadrantTransitions, positiveTransitions, negativeTransitions },
          chartSelector
        });
      } else {
        opportunities.unshift({
          id: 'opportunity-historical-movement-present',
          source: 'historical',
          impact: 'low',
          statement: `Historical Progress shows ${directionLabel} between‑quadrant movement over time. Even with a modest sample, this is a useful operational signal—review the Movement Flow diagram to identify what’s working and reinforce the drivers behind these improvements.`,
          supportingData: { trackedCustomers, totalTransitions, betweenQuadrantTransitions, positiveTransitions, negativeTransitions },
          chartSelector
        });
      }
    }

    if (!hasHistoricalAction) {
      actions.push({
        id: 'action-historical-review-top-transitions',
        statement:
          'Review the Movement Flow diagram and pick 1–2 top transitions to act on: investigate the experience drivers behind them, design targeted interventions, and re-measure at the next check-in to confirm movement stabilises in the desired direction.',
        quadrant: undefined,
        priority: 2,
        actionability: 'medium',
        expectedImpact: 'medium',
        roi: 4,
        supportingData: { trackedCustomers, totalTransitions, betweenQuadrantTransitions }
      });
    }
  }

  // Ensure terminology matches the model toggle across all report statements (Classic vs Modern).
  const applyModelTerminology = (text: string): string => {
    const direction = isClassicModel ? 'toClassic' : 'toModern';
    const replacements: Array<[RegExp, string]> =
      direction === 'toModern'
        ? [
            [/\bNear-Apostles\b/g, 'Near-Advocates'],
            [/\bNear Apostles\b/g, 'Near Advocates'],
            [/\bNear-Apostle\b/g, 'Near-Advocate'],
            [/\bNear Apostle\b/g, 'Near Advocate'],
            [/\bApostles\b/g, 'Advocates'],
            [/\bApostle\b/g, 'Advocate'],
            [/\bapostles\b/g, 'advocates'],
            [/\bapostle\b/g, 'advocate'],
            [/\bNear-Terrorists\b/g, 'Near-Trolls'],
            [/\bNear Terrorists\b/g, 'Near Trolls'],
            [/\bNear-Terrorist\b/g, 'Near-Troll'],
            [/\bNear Terrorist\b/g, 'Near Troll'],
            [/\bTerrorists\b/g, 'Trolls'],
            [/\bTerrorist\b/g, 'Troll'],
            [/\bterrorists\b/g, 'trolls'],
            [/\bterrorist\b/g, 'troll']
          ]
        : [
            [/\bNear-Advocates\b/g, 'Near-Apostles'],
            [/\bNear Advocates\b/g, 'Near Apostles'],
            [/\bNear-Advocate\b/g, 'Near-Apostle'],
            [/\bNear Advocate\b/g, 'Near Apostle'],
            [/\bAdvocates\b/g, 'Apostles'],
            [/\bAdvocate\b/g, 'Apostle'],
            [/\badvocates\b/g, 'apostles'],
            [/\badvocate\b/g, 'apostle'],
            [/\bNear-Trolls\b/g, 'Near-Terrorists'],
            [/\bNear Trolls\b/g, 'Near Terrorists'],
            [/\bNear-Troll\b/g, 'Near-Terrorist'],
            [/\bNear Troll\b/g, 'Near Terrorist'],
            [/\bTrolls\b/g, 'Terrorists'],
            [/\bTroll\b/g, 'Terrorist'],
            [/\btrolls\b/g, 'terrorists'],
            [/\btroll\b/g, 'terrorist']
          ];

    return replacements.reduce((acc, [pattern, replace]) => acc.replace(pattern, replace), text);
  };

  const normaliseStatements = <T extends { statement: string }>(items: T[]): T[] =>
    items.map(item => ({ ...item, statement: applyModelTerminology(item.statement) }));

  const normalisedFindings = findings.map(f => ({
    ...f,
    statement: applyModelTerminology(f.statement),
    ...(f.chartCommentary ? { chartCommentary: applyModelTerminology(f.chartCommentary) } : {})
  }));

  // Apply to all non-editable statements (findings are handled below; opps/risks/actions here).
  const normalisedOpportunities = normaliseStatements(opportunities);
  const normalisedRisks = normaliseStatements(risks);
  const normalisedActions = normaliseStatements(actions);

  // Detect and handle duplicate customer lists
  const { detectDuplicateCustomerLists } = require('./utils/detectDuplicateCustomerLists');
  const allStatements = [
    ...normalisedRisks.map(r => ({ id: r.id, supportingData: r.supportingData })),
    ...normalisedOpportunities.map(o => ({ id: o.id, supportingData: o.supportingData })),
    ...normalisedActions.map(a => ({ id: a.id, supportingData: a.supportingData }))
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
    },
    audienceContext
  };

  return {
    date: new Date().toISOString(),
    findings: normalisedFindings,
    opportunities: normalisedOpportunities,
    risks: normalisedRisks,
    actions: normalisedActions,
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
  const seenCustomerMoves = new Set<string>();

  Object.entries(proximityAnalysis.analysis).forEach(([key, detail]: [string, any]) => {
    if (detail?.customers && Array.isArray(detail.customers) && detail.customers.length > 0) {
      const baseQuadrant = key.split('_close_to_')[0];
      const targetQuadrant = key.split('_close_to_')[1];
      console.log(`[calculateActionableConversions] Processing ${key}: ${detail.customers.length} customers`);
      detail.customers.forEach((customer: any) => {
        const uniqueMoveKey = `${customer.id}::${baseQuadrant}::${targetQuadrant}`;
        if (seenCustomerMoves.has(uniqueMoveKey)) return;
        seenCustomerMoves.add(uniqueMoveKey);
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

