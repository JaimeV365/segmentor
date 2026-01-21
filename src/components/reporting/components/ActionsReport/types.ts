import type { QuadrantType } from '../../types';
import type { DataReport } from '../../types';
import type { ProximityAnalysisResult } from '../../services/EnhancedProximityClassifier';
import type { RecommendationScoreResult } from '../../../../utils/recommendationScore';

/**
 * Main Action Plan Report structure
 */
export interface ActionPlanReport {
  date: string;
  findings: Finding[];
  opportunities: Opportunity[];
  risks: Risk[];
  actions: Action[];
  supportingImages: ChartImage[];
  metadata: ReportMetadata;
}

/**
 * Finding - A fact or observation from the reports
 * Can be either a text finding or a chart finding with commentary
 */
export interface Finding {
  id: string;
  category: 'data' | 'concentration' | 'distribution' | 'historical' | 'proximity' | 'recommendation';
  statement: string;
  supportingData?: Record<string, any>;
  priority: number; // Lower = higher priority (display order)
  chartSelector?: string; // CSS selector for supporting chart
  isChartItem?: boolean; // If true, this is a chart with commentary (not a text finding)
  chartCommentary?: string; // Expert commentary on what the chart shows
}

/**
 * Opportunity - A positive potential or growth area
 */
export interface Opportunity {
  id: string;
  statement: string;
  source: 'proximity' | 'distribution' | 'statistics' | 'recommendation';
  impact: 'high' | 'medium' | 'low';
  supportingData?: Record<string, any>;
  chartSelector?: string;
}

/**
 * Risk - A concern or potential problem
 */
export interface Risk {
  id: string;
  statement: string;
  source: 'proximity' | 'distribution' | 'statistics' | 'recommendation';
  severity: 'high' | 'medium' | 'low';
  supportingData?: Record<string, any>;
  chartSelector?: string;
}

/**
 * Action - A specific recommendation or strategy
 */
export interface Action {
  id: string;
  statement: string;
  quadrant?: QuadrantType | 'apostles' | 'terrorists' | 'near_apostles';
  priority: number; // Lower = higher priority
  actionability: 'easy' | 'medium' | 'hard';
  expectedImpact: 'high' | 'medium' | 'low';
  roi: number; // Calculated: impact × actionability (1-9 scale)
  supportingData?: Record<string, any>;
  chartSelector?: string; // CSS selector for supporting chart
}

/**
 * Chart Image - Captured screenshot of a chart
 */
export interface ChartImage {
  id: string;
  chartType: 'main' | 'distribution' | 'historical' | 'concentration' | 'proximity' | 'recommendation';
  dataUrl: string; // Base64 data URL
  caption: string;
  selector: string; // Original CSS selector used
}

/**
 * Report Metadata
 */
export interface ReportMetadata {
  totalCustomers: number;
  reportDate: string;
  scales: {
    satisfaction: string;
    loyalty: string;
  };
}

/**
 * Aggregated report data from all sections
 */
export interface AggregatedReportData {
  dataReport: DataReport | null;
  distribution: {
    loyalists: number;
    mercenaries: number;
    hostages: number;
    defectors: number;
    apostles: number;
    terrorists: number;
    nearApostles: number;
    neutrals?: number; // Customers exactly at midpoint
  };
  total: number;
  proximity: ProximityAnalysisResult | null;
  recommendationScore: RecommendationScoreResult | null;
  responseConcentration: {
    mostCommonCombos: Array<{
      satisfaction: number;
      loyalty: number;
      count: number;
      percentage: number;
    }>;
  } | null;
  statistics: {
    satisfaction: {
      average: number;
      mode: number;
      distribution: Record<number, number>;
    };
    loyalty: {
      average: number;
      mode: number;
      distribution: Record<number, number>;
    };
  };
  historicalProgress?: HistoricalProgressInsights | null;
}

export interface HistoricalProgressInsights {
  trackedCustomers: number;
  totalTransitions: number; // includes "no change"
  positiveTransitions: number;
  negativeTransitions: number;
  noChangeTransitions: number;
  betweenQuadrantTransitions: number;
  topTransitions: Array<{
    from: string;
    to: string;
    count: number;
  }>;
  multiMove2PlusCustomers: number;
  multiMove3PlusCustomers: number;
  cadence?: {
    hasConfidence: boolean;
    typicalGapDays: number | null;
    cadenceLabel?: 'monthly' | 'quarterly' | 'annual';
    gapsCount: number;
    customersWith2Dates: number;
    rapidNegativeMovesCount: number;
  };
}

/**
 * Evaluator Results - All condition evaluations
 */
export interface EvaluatorResults {
  distribution: DistributionEvaluation;
  sampleSize: SampleSizeEvaluation;
  proximity: ProximityEvaluation;
  statistics: StatisticsEvaluation;
  recommendation: RecommendationEvaluation;
}

/**
 * Distribution Evaluation Results
 */
export interface DistributionEvaluation {
  largest: QuadrantType | 'apostles' | 'terrorists' | 'near_apostles' | 'nearApostles' | null;
  counts: Record<string, number>;
  percentages: Record<string, number>;
  isBalanced: boolean;
  isSkewed: boolean;
  closelyFollowed: string[]; // Quadrants within 15% of largest
  total: number;
  neutralCount: number; // Customers exactly at midpoint
  neutralPercent: number; // Percentage of total (including neutrals)
  isTied: boolean; // True if two or more quadrants have equal counts
  tiedQuadrants: string[]; // Quadrants that are tied for largest
  tooEmptyQuadrants: string[]; // Quadrants with < 5% of total
  tooFullQuadrants: string[]; // Quadrants significantly larger than others (> 10pp difference)
  zeroQuadrants: string[]; // Main quadrants with zero customers
}

/**
 * Sample Size Evaluation Results
 */
export interface SampleSizeEvaluation {
  total: number;
  isLow: boolean; // < 30 customers
  isHigh: boolean; // >= 100 customers
  isMedium: boolean; // 30-99 customers
  hasGoodRepresentation: boolean; // All quadrants have some representation
  missingQuadrants: string[]; // Quadrants with 0 or very few customers
}

/**
 * Proximity Evaluation Results
 */
export interface ProximityEvaluation {
  hasRisks: boolean;
  hasOpportunities: boolean;
  highRiskCount: number;
  highOpportunityCount: number;
  crisisIndicators: string[];
  opportunityIndicators: string[];
  topRisks: Array<{
    type: string;
    count: number;
    severity: 'high' | 'medium' | 'low';
  }>;
  topOpportunities: Array<{
    type: string;
    count: number;
    impact: 'high' | 'medium' | 'low';
  }>;
}

/**
 * Statistics Evaluation Results
 */
export interface StatisticsEvaluation {
  satisfaction: {
    average: number;
    mode: number;
    isAboveAverage: boolean; // Compared to actual midpoint (user-adjusted or scale)
    isBelowAverage: boolean;
    actualMidpoint: number; // The midpoint used for comparison
    scaleMidpoint: number; // The mathematical scale midpoint
    isCustomThreshold: boolean; // True if midpoint differs from scale midpoint
    isVeryDemanding: boolean; // True if threshold is significantly higher than scale midpoint (>1.5 points difference)
  };
  loyalty: {
    average: number;
    mode: number;
    isAboveAverage: boolean;
    isBelowAverage: boolean;
    actualMidpoint: number; // The midpoint used for comparison
    scaleMidpoint: number; // The mathematical scale midpoint
    isCustomThreshold: boolean; // True if midpoint differs from scale midpoint
    isVeryDemanding: boolean; // True if threshold is significantly higher than scale midpoint (>1.5 points difference)
  };
}

/**
 * Recommendation Score Evaluation Results
 */
export interface RecommendationEvaluation {
  score: number;
  detractors: number;
  passives: number;
  promoters: number;
  detractorsPercent: number;
  passivesPercent: number;
  promotersPercent: number;
  isPositive: boolean; // Score > 0
  isStrong: boolean; // Score > 50
  isWeak: boolean; // Score < 0
  hasIncompleteScale: boolean; // Not all scale values have responses
  scaleCoverage: Record<number, number>; // Distribution of responses across scale values
}

