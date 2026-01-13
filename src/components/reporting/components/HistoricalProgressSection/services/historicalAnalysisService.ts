import { DataPoint } from '@/types/base';
import { CustomerTimeline, parseDate } from '../utils/historicalDataUtils';
import type { QuadrantType } from '../../../../visualization/context/QuadrantAssignmentContext';

export interface TrendDataPoint {
  date: string;
  dateObj: Date;
  averageSatisfaction: number;
  averageLoyalty: number;
  count: number;
}

export interface QuadrantMovement {
  from: QuadrantType;
  to: QuadrantType;
  count: number;
  customers: Array<{
    identifier: string;
    identifierType: 'email' | 'id';
    fromDate: string;
    toDate: string;
  }>;
}

export interface MovementStats {
  positiveMovements: number;
  negativeMovements: number;
  neutralMovements: number;
  totalMovements: number;
  movements: QuadrantMovement[];
}

export interface PeriodComparison {
  period1: {
    date: string;
    averageSatisfaction: number;
    averageLoyalty: number;
    count: number;
  };
  period2: {
    date: string;
    averageSatisfaction: number;
    averageLoyalty: number;
    count: number;
  };
  satisfactionChange: number;
  loyaltyChange: number;
}

/**
 * Calculate trend data points grouped by date
 */
export const calculateTrendData = (
  timelines: CustomerTimeline[],
  dateFormat?: string
): TrendDataPoint[] => {
  // Collect all data points with dates
  const dateMap = new Map<string, { satisfaction: number[]; loyalty: number[] }>();
  
  timelines.forEach(timeline => {
    timeline.dataPoints.forEach(point => {
      if (point.date) {
        const normalizedDate = point.date.trim();
        if (!dateMap.has(normalizedDate)) {
          dateMap.set(normalizedDate, { satisfaction: [], loyalty: [] });
        }
        const dateData = dateMap.get(normalizedDate)!;
        dateData.satisfaction.push(point.satisfaction);
        dateData.loyalty.push(point.loyalty);
      }
    });
  });
  
  // Convert to trend data points
  const trendData: TrendDataPoint[] = [];
  dateMap.forEach((values, dateStr) => {
    const dateObj = parseDate(dateStr, dateFormat);
    if (dateObj) {
      const avgSat = values.satisfaction.reduce((a, b) => a + b, 0) / values.satisfaction.length;
      const avgLoy = values.loyalty.reduce((a, b) => a + b, 0) / values.loyalty.length;
      
      trendData.push({
        date: dateStr,
        dateObj,
        averageSatisfaction: Math.round(avgSat * 100) / 100,
        averageLoyalty: Math.round(avgLoy * 100) / 100,
        count: values.satisfaction.length
      });
    }
  });
  
  // Sort by date
  trendData.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  
  return trendData;
};

/**
 * Calculate quadrant movements for customers over time
 */
export const calculateQuadrantMovements = (
  timelines: CustomerTimeline[],
  getQuadrantForPoint: (point: DataPoint) => QuadrantType
): MovementStats => {
  const movements: QuadrantMovement[] = [];
  let positiveMovements = 0;
  let negativeMovements = 0;
  let neutralMovements = 0;
  
  // Quadrant hierarchy for determining positive/negative movements
  const quadrantHierarchy: Record<QuadrantType, number> = {
    'apostles': 8,
    'near_apostles': 7,
    'loyalists': 6,
    'mercenaries': 5,
    'hostages': 4,
    'neutral': 3,
    'defectors': 2,
    'terrorists': 0
  };
  
  timelines.forEach(timeline => {
    // Need at least 2 data points to have a movement
    if (timeline.dataPoints.length < 2) return;
    
    // Sort by date to ensure chronological order
    const sortedPoints = [...timeline.dataPoints].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
    
    // Compare consecutive data points
    for (let i = 0; i < sortedPoints.length - 1; i++) {
      const fromPoint = sortedPoints[i];
      const toPoint = sortedPoints[i + 1];
      
      if (!fromPoint.date || !toPoint.date) continue;
      
      const fromQuadrant = getQuadrantForPoint(fromPoint);
      const toQuadrant = getQuadrantForPoint(toPoint);
      
      if (fromQuadrant === toQuadrant) {
        neutralMovements++;
        continue;
      }
      
      // Find or create movement entry
      let movement = movements.find(m => m.from === fromQuadrant && m.to === toQuadrant);
      if (!movement) {
        movement = {
          from: fromQuadrant,
          to: toQuadrant,
          count: 0,
          customers: []
        };
        movements.push(movement);
      }
      
      movement.count++;
      movement.customers.push({
        identifier: timeline.identifier,
        identifierType: timeline.identifierType,
        fromDate: fromPoint.date,
        toDate: toPoint.date
      });
      
      // Determine if positive or negative
      const fromRank = quadrantHierarchy[fromQuadrant] || 0;
      const toRank = quadrantHierarchy[toQuadrant] || 0;
      
      if (toRank > fromRank) {
        positiveMovements++;
      } else if (toRank < fromRank) {
        negativeMovements++;
      } else {
        neutralMovements++;
      }
    }
  });
  
  return {
    positiveMovements,
    negativeMovements,
    neutralMovements,
    totalMovements: positiveMovements + negativeMovements + neutralMovements,
    movements: movements.sort((a, b) => b.count - a.count) // Sort by count descending
  };
};

/**
 * Calculate period-over-period comparison
 */
export const calculatePeriodComparison = (
  trendData: TrendDataPoint[]
): PeriodComparison | null => {
  if (trendData.length < 2) return null;
  
  const period1 = trendData[0];
  const period2 = trendData[trendData.length - 1];
  
  return {
    period1: {
      date: period1.date,
      averageSatisfaction: period1.averageSatisfaction,
      averageLoyalty: period1.averageLoyalty,
      count: period1.count
    },
    period2: {
      date: period2.date,
      averageSatisfaction: period2.averageSatisfaction,
      averageLoyalty: period2.averageLoyalty,
      count: period2.count
    },
    satisfactionChange: Math.round((period2.averageSatisfaction - period1.averageSatisfaction) * 100) / 100,
    loyaltyChange: Math.round((period2.averageLoyalty - period1.averageLoyalty) * 100) / 100
  };
};
