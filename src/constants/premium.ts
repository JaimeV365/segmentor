/**
 * Centralized premium configuration
 * Follows the rule: Premium = Personalization
 */

export const PREMIUM_CONFIG = {
  Z_INDEX: {
    MAIN_RIBBON: 1000,
    FILTER_PANEL: 999,
    FILTER_OVERLAY: 998,
    FILTER_HEADER: 1001, // Standard z-index since panel is positioned below ribbon
    FILTER_TABS: 1001,   // Standard z-index since panel is positioned below ribbon
    FILTER_CONTENT: 1001,
  },
  POSITION: {
    FILTER_PANEL_TOP_OFFSET: 100, // Position below main ribbon
  },
  COLORS: {
    PALETTE: [
      '#3a863e', // Brand green
      '#CC0000', // Red
      '#F7B731', // Yellow
      '#3A6494', // Blue
      '#8b5cf6', // Purple
      '#ec4899', // Pink
      '#78716c', // Warm gray
    ],
    HIGHLIGHT: {
      GREEN: 'green',
      YELLOW: 'yellow', 
      RED: 'red'
    }
  },
  FEATURES: {
    // Standard features - available to all users (analysis)
    ANALYSIS: ['filtering', 'barSelection', 'hamburgerMenu'] as const,
    // Premium features - personalization only
    PERSONALIZATION: ['colorCustomization', 'multiColorHighlight'] as const
  }
} as const;

export type AnalysisFeature = typeof PREMIUM_CONFIG.FEATURES.ANALYSIS[number];
export type PersonalizationFeature = typeof PREMIUM_CONFIG.FEATURES.PERSONALIZATION[number];
export type PremiumFeature = AnalysisFeature | PersonalizationFeature;
