import { PREMIUM_CONFIG } from '../constants/premium';

/**
 * Hook for consistent z-index management
 * Prevents z-index conflicts and ensures proper layering
 */
export const useZIndex = (layer: keyof typeof PREMIUM_CONFIG.Z_INDEX) => {
  return PREMIUM_CONFIG.Z_INDEX[layer];
};

/**
 * Get multiple z-index values at once
 */
export const useZIndexes = (layers: (keyof typeof PREMIUM_CONFIG.Z_INDEX)[]) => {
  return layers.reduce((acc, layer) => {
    acc[layer] = PREMIUM_CONFIG.Z_INDEX[layer];
    return acc;
  }, {} as Record<keyof typeof PREMIUM_CONFIG.Z_INDEX, number>);
};
