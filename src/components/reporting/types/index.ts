import type { ScaleFormat } from '../../../types/base';

export interface QuadrantStatistics {
  satisfaction: {
    average: number;
    distribution: Record<number, number>;
  };
  loyalty: {
    average: number;
    distribution: Record<number, number>;
  };
  count: number;
  percentage: number;
}

export interface DataReport {
  date: string;
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  totalEntries: number;
  excludedEntries: number;
  identifiedCount: number;
  anonymousCount: number;
  mostCommonCombos: Array<{
    satisfaction: number;
    loyalty: number;
    count: number;
    percentage: number;
  }>;
  statistics: {
    satisfaction: StatisticsData;
    loyalty: StatisticsData;
  };
  distribution: {
    loyalists: number;
    defectors: number;
    mercenaries: number;
    hostages: number;
    apostles: number;
    nearApostles: number;
    terrorists: number;
    neutrals?: number;
  };
  quadrantStats: {
    loyalists: QuadrantStatistics;
    defectors: QuadrantStatistics;
    mercenaries: QuadrantStatistics;
    hostages: QuadrantStatistics;
  };
}

export interface StatisticsData {
  average: number;
  median: number;
  mode: number;
  max: number;
  maxCount: number;
  min: number;
  minCount: number;
  distribution: Record<number, number>;
}

export interface ActionsReport {
  date: string;
  recommendations: RecommendationSection[];
  insights: string[];
  priorityActions: string[];
  isPremium: boolean;
  actionPlan?: any; // Optional: Full Action Plan report structure
}

export interface RecommendationSection {
  category: string;
  meaning: string;
  actions: string[];
  priority: number;
}

// Chart-specific types
// Only the 4 basic quadrants for reporting (special zones are handled separately)
export type QuadrantType = 'loyalists' | 'hostages' | 'mercenaries' | 'defectors';