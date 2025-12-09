import { getTierSize, type TierNumber } from './tierSizes';
// Enhanced combinations that support custom frequency thresholds and tier-capped display
interface Combination {
  satisfaction: number;
  loyalty: number;
  count: number;
  percentage: number;
}

interface CombinationWithTier extends Combination {
  tier?: number; // 1 = highest frequency, 2 = secondary, 3 = tertiary
  opacity?: number; // For visual differentiation between tiers
  size?: number; // For visual size differentiation
}

interface EnhancedCombinationOptions {
  frequencyThreshold?: number; // Custom minimum frequency
  showTiers?: boolean; // Enable tier-capped display (limits combinations shown)
  maxTiers?: number; // Number of tiers to show (1-3)
  isPremium?: boolean; // Premium feature access
}

const getEnhancedCombinations = (
  data: any[], 
  options: EnhancedCombinationOptions = {}
): CombinationWithTier[] => {
  if (!data || data.length === 0) return [];
  
  const {
    frequencyThreshold = 2,
    showTiers = false,
    maxTiers = 2,
    isPremium = false
  } = options;
  
  const combinationMap = new Map<string, { count: number, satisfaction: number, loyalty: number }>();
  
  // Count combinations
  data.filter(d => !d.excluded).forEach(d => {
    const key = `${d.satisfaction}-${d.loyalty}`;
    if (!combinationMap.has(key)) {
      combinationMap.set(key, {
        count: 1,
        satisfaction: d.satisfaction,
        loyalty: d.loyalty
      });
    } else {
      const current = combinationMap.get(key)!;
      current.count++;
    }
  });

  // Convert to combinations array
  const totalFilteredData = data.filter(d => !d.excluded).length;
  const allCombinations: CombinationWithTier[] = Array.from(combinationMap.values())
    .map(combo => ({
      satisfaction: combo.satisfaction,
      loyalty: combo.loyalty,
      count: combo.count,
      percentage: (combo.count / totalFilteredData) * 100
    }))
    .sort((a, b) => b.count - a.count); // Sort by frequency

  if (allCombinations.length === 0) return [];

  const maxCount = allCombinations[0].count;
  
  // Apply frequency threshold filter
  let filteredCombinations = allCombinations.filter(combo => 
    combo.count >= frequencyThreshold
  );

  if (filteredCombinations.length === 0) {
    return [];
  }

  // Always apply tier-based size differences (makes visualization easier to see)
  // Size differences are always based on frequency, regardless of showTiers toggle
  const tieredCombinations = applyTierLogic(filteredCombinations, maxCount, maxTiers);
  
  // When showTiers is OFF, show ALL combinations (no tier-based limiting)
  // When showTiers is ON, use the tier-based results (which may be limited)
  if (!showTiers) {
    // Apply tier visual properties to ALL combinations, but don't limit the count
    return applyTierVisualsToAll(filteredCombinations, maxTiers);
  }
  
  // When showTiers is ON, use the tier-limited results
  return tieredCombinations;
};

const applyTierLogic = (
  combinations: CombinationWithTier[], 
  maxCount: number, 
  maxTiers: number
): CombinationWithTier[] => {
  const result: CombinationWithTier[] = [];
  
 // Get unique frequency levels and sort them descending
  const uniqueFrequencies = Array.from(new Set(combinations.map(c => c.count))).sort((a, b) => b - a);
  
  // Use actual frequency levels as tier thresholds instead of percentages
  const tierThresholds = uniqueFrequencies.slice(0, 3); // Take up to 3 unique frequencies

  // Assign tiers and visual properties
  for (let tier = 1; tier <= maxTiers && tier <= tierThresholds.length; tier++) {
    const currentFrequency = tierThresholds[tier - 1];
    const tierCombinations = combinations.filter(combo => combo.count === currentFrequency);

   

    // Add visual properties for each tier
    // Always apply size differences (makes it easier to see frequency variations)
    // Opacity differences also always applied for better visual distinction
    const tierWithVisuals = tierCombinations.map(combo => ({
      ...combo,
      tier,
      opacity: tier === 1 ? 1 : tier === 2 ? 0.7 : 0.5,
      size: getTierSize(tier as TierNumber)
    }));

    result.push(...tierWithVisuals);

    // Limit combinations per tier to avoid clutter
    const maxPerTier = tier === 1 ? 6 : tier === 2 ? 4 : 3;
    if (result.length >= maxPerTier * tier) {
      break;
    }
  }

  return result.slice(0, Math.min(15, combinations.length)); // Overall limit
};

// Apply tier-based visual properties (size, opacity, tier) to ALL combinations
// without limiting the count - used when showTiers is OFF but we still want size differences
const applyTierVisualsToAll = (
  combinations: CombinationWithTier[],
  maxTiers: number
): CombinationWithTier[] => {
  if (combinations.length === 0) return [];
  
  // Get unique frequency levels and sort them descending
  const uniqueFrequencies = Array.from(new Set(combinations.map(c => c.count))).sort((a, b) => b - a);
  
  // Use actual frequency levels as tier thresholds (up to maxTiers)
  const tierThresholds = uniqueFrequencies.slice(0, Math.min(maxTiers, 3));
  
  // Assign tiers and visual properties to ALL combinations
  const result: CombinationWithTier[] = [];
  
  for (let tier = 1; tier <= tierThresholds.length; tier++) {
    const currentFrequency = tierThresholds[tier - 1];
    const tierCombinations = combinations.filter(combo => combo.count === currentFrequency);
    
    // Add visual properties for each tier
    const tierWithVisuals = tierCombinations.map(combo => ({
      ...combo,
      tier,
      opacity: tier === 1 ? 1 : tier === 2 ? 0.7 : 0.5,
      size: getTierSize(tier as TierNumber)
    }));
    
    result.push(...tierWithVisuals);
  }
  
  // For any remaining combinations that don't fit into the top tiers,
  // assign them the lowest tier visual properties
  const assignedFrequencies = new Set(tierThresholds);
  const remainingCombinations = combinations.filter(combo => !assignedFrequencies.has(combo.count));
  
  if (remainingCombinations.length > 0 && tierThresholds.length > 0) {
    const lowestTier = Math.min(tierThresholds.length, maxTiers);
    const remainingWithVisuals = remainingCombinations.map(combo => ({
      ...combo,
      tier: lowestTier,
      opacity: lowestTier === 1 ? 1 : lowestTier === 2 ? 0.7 : 0.5,
      size: getTierSize(lowestTier as TierNumber)
    }));
    result.push(...remainingWithVisuals);
  }
  
  return result;
};

export { getEnhancedCombinations, type CombinationWithTier, type EnhancedCombinationOptions };