import type { StatisticsEvaluation } from '../types';
import type { ScaleFormat } from '../../../../../types/base';

/**
 * Gets the midpoint of a scale
 */
function getScaleMidpoint(scale: ScaleFormat): number {
  // Parse scale like "1-5", "1-10", "0-10"
  const parts = scale.split('-').map(Number);
  if (parts.length === 2) {
    return (parts[0] + parts[1]) / 2;
  }
  // Default fallback
  return 3;
}

/**
 * Evaluates statistics to determine if values are above/below average
 * Uses the actual user-adjusted midpoint if provided, otherwise falls back to scale midpoint
 */
export function evaluateStatistics(
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
  },
  satisfactionScale: ScaleFormat,
  loyaltyScale: ScaleFormat,
  midpoint?: { sat: number; loy: number }
): StatisticsEvaluation {
  // Calculate scale midpoints for comparison
  const satScaleMidpoint = getScaleMidpoint(satisfactionScale);
  const loyScaleMidpoint = getScaleMidpoint(loyaltyScale);
  
  // Use actual midpoint if provided, otherwise use scale midpoint
  const satMidpoint = midpoint?.sat ?? satScaleMidpoint;
  const loyMidpoint = midpoint?.loy ?? loyScaleMidpoint;
  
  // Detect if midpoint has been moved from scale midpoint
  const satIsCustom = midpoint !== undefined && Math.abs(midpoint.sat - satScaleMidpoint) > 0.01;
  const loyIsCustom = midpoint !== undefined && Math.abs(midpoint.loy - loyScaleMidpoint) > 0.01;
  
  // Detect if threshold is very demanding (significantly higher than scale midpoint)
  const satIsVeryDemanding = satIsCustom && (satMidpoint - satScaleMidpoint) > 1.5;
  const loyIsVeryDemanding = loyIsCustom && (loyMidpoint - loyScaleMidpoint) > 1.5;

  return {
    satisfaction: {
      average: statistics.satisfaction.average,
      mode: statistics.satisfaction.mode,
      isAboveAverage: statistics.satisfaction.average > satMidpoint,
      isBelowAverage: statistics.satisfaction.average < satMidpoint,
      actualMidpoint: satMidpoint,
      scaleMidpoint: satScaleMidpoint,
      isCustomThreshold: satIsCustom,
      isVeryDemanding: satIsVeryDemanding
    },
    loyalty: {
      average: statistics.loyalty.average,
      mode: statistics.loyalty.mode,
      isAboveAverage: statistics.loyalty.average > loyMidpoint,
      isBelowAverage: statistics.loyalty.average < loyMidpoint,
      actualMidpoint: loyMidpoint,
      scaleMidpoint: loyScaleMidpoint,
      isCustomThreshold: loyIsCustom,
      isVeryDemanding: loyIsVeryDemanding
    }
  };
}

