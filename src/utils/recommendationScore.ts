import type { DataPoint, ScaleFormat } from '@/types/base';

/**
 * Category mapping result for a scale
 */
export interface CategoryMapping {
  detractors: number[];
  passives: number[];
  promoters: number[];
}

/**
 * Recommendation Score calculation result
 */
export interface RecommendationScoreResult {
  score: number; // -100 to +100
  detractors: number;
  passives: number;
  promoters: number;
  detractorsPercent: number;
  passivesPercent: number;
  promotersPercent: number;
  distribution: Record<number, number>; // Original scale distribution
}

/**
 * Get category mapping for a given scale
 * Preserves proportional distribution from 0-10 baseline (64%/18%/18%)
 * 
 * Baseline 0-10 scale distribution:
 * - Detractors: 0-6 = 7 values = 63.64%
 * - Passives: 7-8 = 2 values = 18.18%
 * - Promoters: 9-10 = 2 values = 18.18%
 */
export function getCategoryMapping(scale: ScaleFormat): CategoryMapping {
  const [min, max] = scale.split('-').map(Number);
  const totalValues = max - min + 1;
  
  // Calculate proportional counts preserving 64%/18%/18% ratio
  const detractorsCount = Math.round(totalValues * 0.6364);
  const passivesCount = Math.round(totalValues * 0.1818);
  const promotersCount = totalValues - detractorsCount - passivesCount; // Ensure total matches
  
  // Build arrays
  const detractors = Array.from({ length: detractorsCount }, (_, i) => min + i);
  const passives = Array.from({ length: passivesCount }, (_, i) => min + detractorsCount + i);
  const promoters = Array.from({ length: promotersCount }, (_, i) => min + detractorsCount + passivesCount + i);
  
  return { detractors, passives, promoters };
}

/**
 * Categorize a loyalty value based on scale
 */
export function categorizeLoyaltyValue(
  value: number, 
  scale: ScaleFormat
): 'detractor' | 'passive' | 'promoter' {
  const mapping = getCategoryMapping(scale);
  
  if (mapping.detractors.includes(value)) return 'detractor';
  if (mapping.passives.includes(value)) return 'passive';
  if (mapping.promoters.includes(value)) return 'promoter';
  
  // Fallback (shouldn't happen if value is within scale range)
  return 'detractor';
}

/**
 * Calculate Recommendation Score from data
 * Formula: (% Promoters - % Detractors) × 100
 * Range: -100 to +100
 * 
 * @param data - Array of data points to analyze
 * @param loyaltyScale - The loyalty scale format (e.g., '1-5', '1-7', '1-10', '0-10')
 * @returns Recommendation score result with counts, percentages, and distribution
 */
export function calculateRecommendationScore(
  data: DataPoint[],
  loyaltyScale: ScaleFormat
): RecommendationScoreResult {
  const mapping = getCategoryMapping(loyaltyScale);
  
  // Categorize all data points
  let detractors = 0;
  let passives = 0;
  let promoters = 0;
  
  const distribution: Record<number, number> = {};
  
  data.forEach(d => {
    // Count original scale distribution
    distribution[d.loyalty] = (distribution[d.loyalty] || 0) + 1;
    
    // Categorize
    if (mapping.detractors.includes(d.loyalty)) {
      detractors++;
    } else if (mapping.passives.includes(d.loyalty)) {
      passives++;
    } else if (mapping.promoters.includes(d.loyalty)) {
      promoters++;
    }
  });
  
  const total = data.length;
  
  // Standard NPS calculation:
  // Percentages are calculated from TOTAL responses (including Passives)
  // Even though Passives don't appear in the formula, they ARE included in the denominator
  // This is the official NPS methodology
  const detractorsPercent = total > 0 ? (detractors / total) * 100 : 0;
  const passivesPercent = total > 0 ? (passives / total) * 100 : 0;
  const promotersPercent = total > 0 ? (promoters / total) * 100 : 0;
  
  // Calculate score: % Promoters - % Detractors
  // Standard NPS formula - Passives are included in total for percentage calculation
  const score = promotersPercent - detractorsPercent;
  
  return {
    score,
    detractors,
    passives,
    promoters,
    detractorsPercent,
    passivesPercent,
    promotersPercent,
    distribution
  };
}

