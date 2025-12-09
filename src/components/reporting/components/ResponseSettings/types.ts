export interface ResponseConcentrationSettings {
    miniPlot: {
      useQuadrantColors: boolean;
      customColors: Record<string, string>;
      showAverageDot: boolean;
      // Phase 2 Premium Features
      frequencyThreshold?: number; // Premium: Custom frequency threshold
showTiers?: boolean; // Tier-capped display (limits combinations shown)
maxTiers?: number; // Premium: Number of tiers to show (1-3)
applyMainChartFrequencyFilter?: boolean; // Apply main chart frequency filter
    };
    list: {
      useColorCoding: boolean;
      maxItems: number;
    };
    dial: {
      minValue: number;
      maxValue: number;
      customColors: {
        satisfaction: string;
        loyalty: string;
      };
    };
  }
  
  export interface ResponseSettingsProps {
  settings: ResponseConcentrationSettings;
  onSettingsChange: (settings: ResponseConcentrationSettings) => void;
  onClose: () => void;
  isPremium: boolean;
  availableTiers?: number[];
  activeSection?: string;
  // Add new props for frequency filter integration
  frequencyFilterEnabled?: boolean;
  frequencyThreshold?: number;
  onFrequencyFilterEnabledChange?: (enabled: boolean) => void;
  onFrequencyThresholdChange?: (threshold: number) => void;
  // New prop for smart slider functionality
  availableItemsCount?: number;
  // Maximum frequency of any combination in the data
  maxCombinationFrequency?: number;
}
  
  export const DEFAULT_SETTINGS: ResponseConcentrationSettings = {
  miniPlot: {
    useQuadrantColors: true,
    customColors: {},
    showAverageDot: true,
    // Phase 2 Premium defaults
    frequencyThreshold: 2, // Show combinations appearing 2+ times (minimum allowed)
showTiers: false, // Tier-capped display off by default (show all combinations)
maxTiers: 3, // Default to maximum tier (will be adjusted based on available data)
applyMainChartFrequencyFilter: false // Don't apply main chart filter by default
  },
    list: {
    useColorCoding: true,
    maxItems: 10  // Restore higher default, will be auto-adjusted
  },
    dial: {
      minValue: 0,
      maxValue: 100,
      customColors: {
        satisfaction: '#4CAF50',
        loyalty: '#4682B4'
      }
    }
  };