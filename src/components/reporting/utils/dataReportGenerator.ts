import type { DataPoint, ScaleFormat } from '../../../types/base';
import type { DataReport, StatisticsData, QuadrantStatistics } from '../types';

const calculateQuadrantStats = (
  data: DataPoint[],
  filter: (point: DataPoint) => boolean
): QuadrantStatistics => {
  const quadrantData = data.filter(filter);
  const count = quadrantData.length;
  
  return {
    satisfaction: {
      average: count > 0 
        ? quadrantData.reduce((sum, d) => sum + d.satisfaction, 0) / count 
        : 0,
      distribution: quadrantData.reduce((acc, d) => {
        acc[d.satisfaction] = (acc[d.satisfaction] || 0) + 1;
        return acc;
      }, {} as Record<number, number>)
    },
    loyalty: {
      average: count > 0 
        ? quadrantData.reduce((sum, d) => sum + d.loyalty, 0) / count 
        : 0,
      distribution: quadrantData.reduce((acc, d) => {
        acc[d.loyalty] = (acc[d.loyalty] || 0) + 1;
        return acc;
      }, {} as Record<number, number>)
    },
    count,
    percentage: count / data.length * 100
  };
};

export const generateDataReport = async (
  data: DataPoint[],
  satisfactionScale: ScaleFormat,
  loyaltyScale: ScaleFormat
): Promise<DataReport> => {
  console.log('🔄 generateDataReport called with:', data.length, 'points');
  console.log('🔄 First 3 points:', data.slice(0, 3));
  // Filter out excluded points for calculations
  const activeData = data.filter(d => !d.excluded);
  const identifiedCount = activeData.filter(d => d.name && d.name.trim() !== '').length;

  // Calculate combinations and their frequencies
  const combinationMap = new Map<string, { count: number, satisfaction: number, loyalty: number }>();
  
  activeData.forEach(d => {
    const key = `${d.satisfaction}-${d.loyalty}`;
    if (!combinationMap.has(key)) {
      combinationMap.set(key, {
        count: 1,
        satisfaction: d.satisfaction,
        loyalty: d.loyalty
      });
    } else {
      const current = combinationMap.get(key)!;
      combinationMap.set(key, {
        ...current,
        count: current.count + 1
      });
    }
  });

  // === DEBUG: Combination Analysis ===
  console.log('=== DEBUG: Combination Analysis ===');
  console.log('Total active data points:', activeData.length);
  console.log('Combination map size:', combinationMap.size);

  // Log all combinations
  console.log('All combinations found:');
  Array.from(combinationMap.entries()).forEach(([key, value]) => {
    console.log(`  ${key}: ${value.count} occurrences`);
  });

  // Log what gets filtered
  const debugMaxCount = Math.max(...Array.from(combinationMap.values()).map(v => v.count));
  console.log('Maximum count found:', debugMaxCount);

  const filteredCombos = Array.from(combinationMap.entries())
    .filter(([_, v]) => v.count === debugMaxCount);
  console.log('Combinations with max count:', filteredCombos.length);
  filteredCombos.forEach(([key, value]) => {
    console.log(`  Max combo: ${key} with ${value.count} occurrences`);
  });

  const midpoint = 2.5; // This should come from visualization settings

  // Calculate quadrant statistics
  const quadrantStats = {
    loyalists: calculateQuadrantStats(
      activeData,
      d => d.satisfaction >= midpoint && d.loyalty >= midpoint
    ),
    defectors: calculateQuadrantStats(
      activeData,
      d => d.satisfaction < midpoint && d.loyalty < midpoint
    ),
    mercenaries: calculateQuadrantStats(
      activeData,
      d => d.satisfaction >= midpoint && d.loyalty < midpoint
    ),
    hostages: calculateQuadrantStats(
      activeData,
      d => d.satisfaction < midpoint && d.loyalty >= midpoint
    )
  };

  // Find most common combinations
  const maxCount = Math.max(...Array.from(combinationMap.values()).map(v => v.count));
  const mostCommonCombos = Array.from(combinationMap.entries())
    .filter(([_, v]) => v.count === maxCount)
    .map(([_, v]) => ({
      satisfaction: v.satisfaction,
      loyalty: v.loyalty,
      count: v.count,
      percentage: (v.count / activeData.length * 100)
    }));

  return {
    date: new Date().toISOString(),
    satisfactionScale,
    loyaltyScale,
    totalEntries: activeData.length,
    excludedEntries: data.length - activeData.length,
    identifiedCount,
    anonymousCount: activeData.length - identifiedCount,
    mostCommonCombos,
    statistics: {
      satisfaction: calculateStatistics(activeData.map(d => d.satisfaction)),
      loyalty: calculateStatistics(activeData.map(d => d.loyalty))
    },
    distribution: calculateDistribution(activeData),
    quadrantStats
  };
};

const calculateStatistics = (values: number[]): StatisticsData => {
  // Calculate frequency distribution
  const distribution = values.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  // Find mode (most common value)
  const maxFreq = Math.max(...Object.values(distribution));
  const mode = Number(Object.keys(distribution).find(key => distribution[Number(key)] === maxFreq));

  // Sort values for median and quartiles
  const sortedValues = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sortedValues.length / 2);

  return {
    average: values.reduce((a, b) => a + b, 0) / values.length,
    median: sortedValues.length % 2 === 0 
      ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
      : sortedValues[mid],
    mode,
    max: Math.max(...values),
    maxCount: distribution[Math.max(...values)] || 0,
    min: Math.min(...values),
    minCount: distribution[Math.min(...values)] || 0,
    distribution
  };
};

const calculateDistribution = (data: DataPoint[]) => {
  const midpoint = 2.5; // This should come from visualization settings
  
  // Count neutrals (exactly at midpoint) separately
  const neutrals = data.filter(d => d.satisfaction === midpoint && d.loyalty === midpoint).length;
  
  // Exclude neutrals from quadrant calculations
  const nonNeutralData = data.filter(d => !(d.satisfaction === midpoint && d.loyalty === midpoint));
  
  return {
    loyalists: nonNeutralData.filter(d => d.satisfaction >= midpoint && d.loyalty >= midpoint).length,
    defectors: nonNeutralData.filter(d => d.satisfaction < midpoint && d.loyalty < midpoint).length,
    mercenaries: nonNeutralData.filter(d => d.satisfaction >= midpoint && d.loyalty < midpoint).length,
    hostages: nonNeutralData.filter(d => d.satisfaction < midpoint && d.loyalty >= midpoint).length,
    apostles: nonNeutralData.filter(d => d.satisfaction >= midpoint + 1 && d.loyalty >= midpoint + 1).length,
    nearApostles: nonNeutralData.filter(d => 
      d.satisfaction >= midpoint && d.loyalty >= midpoint &&
      !(d.satisfaction >= midpoint + 1 && d.loyalty >= midpoint + 1)
    ).length,
    terrorists: nonNeutralData.filter(d => d.satisfaction <= midpoint - 1 && d.loyalty <= midpoint - 1).length,
    neutrals: neutrals
  };
};