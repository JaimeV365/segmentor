import { getCategoryMapping, categorizeLoyaltyValue, calculateRecommendationScore } from '../recommendationScore';
import type { ScaleFormat, DataPoint } from '@/types/base';

describe('recommendationScore utilities', () => {
  describe('getCategoryMapping', () => {
    it('should map 1-5 scale correctly', () => {
      const mapping = getCategoryMapping('1-5');
      expect(mapping.detractors).toEqual([1, 2, 3]);
      expect(mapping.passives).toEqual([4]);
      expect(mapping.promoters).toEqual([5]);
    });

    it('should map 1-7 scale correctly', () => {
      const mapping = getCategoryMapping('1-7');
      expect(mapping.detractors).toEqual([1, 2, 3, 4]);
      expect(mapping.passives).toEqual([5]);
      expect(mapping.promoters).toEqual([6, 7]);
    });

    it('should map 1-10 scale correctly', () => {
      const mapping = getCategoryMapping('1-10');
      expect(mapping.detractors).toEqual([1, 2, 3, 4, 5, 6]);
      expect(mapping.passives).toEqual([7, 8]);
      expect(mapping.promoters).toEqual([9, 10]);
    });

    it('should map 0-10 scale correctly', () => {
      const mapping = getCategoryMapping('0-10');
      expect(mapping.detractors).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(mapping.passives).toEqual([7, 8]);
      expect(mapping.promoters).toEqual([9, 10]);
    });

    it('should preserve total count', () => {
      const scales: ScaleFormat[] = ['1-5', '1-7', '1-10', '0-10'];
      scales.forEach(scale => {
        const mapping = getCategoryMapping(scale);
        const [min, max] = scale.split('-').map(Number);
        const totalExpected = max - min + 1;
        const totalActual = mapping.detractors.length + mapping.passives.length + mapping.promoters.length;
        expect(totalActual).toBe(totalExpected);
      });
    });
  });

  describe('categorizeLoyaltyValue', () => {
    it('should categorize 1-5 scale values correctly', () => {
      expect(categorizeLoyaltyValue(1, '1-5')).toBe('detractor');
      expect(categorizeLoyaltyValue(2, '1-5')).toBe('detractor');
      expect(categorizeLoyaltyValue(3, '1-5')).toBe('detractor');
      expect(categorizeLoyaltyValue(4, '1-5')).toBe('passive');
      expect(categorizeLoyaltyValue(5, '1-5')).toBe('promoter');
    });

    it('should categorize 0-10 scale values correctly', () => {
      expect(categorizeLoyaltyValue(0, '0-10')).toBe('detractor');
      expect(categorizeLoyaltyValue(6, '0-10')).toBe('detractor');
      expect(categorizeLoyaltyValue(7, '0-10')).toBe('passive');
      expect(categorizeLoyaltyValue(8, '0-10')).toBe('passive');
      expect(categorizeLoyaltyValue(9, '0-10')).toBe('promoter');
      expect(categorizeLoyaltyValue(10, '0-10')).toBe('promoter');
    });
  });

  describe('calculateRecommendationScore', () => {
    const createDataPoint = (loyalty: number): DataPoint => ({
      id: `test-${loyalty}`,
      name: `Test ${loyalty}`,
      satisfaction: 3,
      loyalty,
      group: 'test',
      excluded: false
    });

    it('should calculate score for 0-10 scale with all promoters', () => {
      const data: DataPoint[] = [
        createDataPoint(9),
        createDataPoint(10),
        createDataPoint(10)
      ];
      const result = calculateRecommendationScore(data, '0-10');
      expect(result.promoters).toBe(3);
      expect(result.detractors).toBe(0);
      expect(result.score).toBe(100); // 100% promoters - 0% detractors
    });

    it('should calculate score for 0-10 scale with all detractors', () => {
      const data: DataPoint[] = [
        createDataPoint(0),
        createDataPoint(1),
        createDataPoint(6)
      ];
      const result = calculateRecommendationScore(data, '0-10');
      expect(result.promoters).toBe(0);
      expect(result.detractors).toBe(3);
      expect(result.score).toBe(-100); // 0% promoters - 100% detractors
    });

    it('should calculate score for 0-10 scale with balanced distribution', () => {
      const data: DataPoint[] = [
        createDataPoint(0), // detractor
        createDataPoint(5), // detractor
        createDataPoint(7), // passive
        createDataPoint(9), // promoter
        createDataPoint(10) // promoter
      ];
      const result = calculateRecommendationScore(data, '0-10');
      expect(result.detractors).toBe(2);
      expect(result.passives).toBe(1);
      expect(result.promoters).toBe(2);
      expect(result.score).toBe(0); // 40% promoters - 40% detractors = 0
    });

    it('should calculate score for 1-5 scale', () => {
      const data: DataPoint[] = [
        createDataPoint(1), // detractor
        createDataPoint(2), // detractor
        createDataPoint(3), // detractor
        createDataPoint(4), // passive
        createDataPoint(5)  // promoter
      ];
      const result = calculateRecommendationScore(data, '1-5');
      expect(result.detractors).toBe(3);
      expect(result.passives).toBe(1);
      expect(result.promoters).toBe(1);
      // 20% promoters - 60% detractors = -40
      expect(result.score).toBe(-40);
    });

    it('should handle empty data', () => {
      const result = calculateRecommendationScore([], '0-10');
      expect(result.score).toBe(0);
      expect(result.detractors).toBe(0);
      expect(result.passives).toBe(0);
      expect(result.promoters).toBe(0);
    });

    it('should calculate distribution correctly', () => {
      const data: DataPoint[] = [
        createDataPoint(1),
        createDataPoint(1),
        createDataPoint(5),
        createDataPoint(5),
        createDataPoint(5)
      ];
      const result = calculateRecommendationScore(data, '1-5');
      expect(result.distribution[1]).toBe(2);
      expect(result.distribution[5]).toBe(3);
    });
  });
});

