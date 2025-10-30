import { useCallback, useRef, useState, useEffect } from 'react';

interface GridDimensions {
  totalCols: number;
  totalRows: number;
  cellWidth: number;
  cellHeight: number;
  midpointCol: number;
  midpointRow: number;
  hasNearApostles: boolean;
  scaleRanges: {
    satisfaction: { min: number; max: number };
    loyalty: { min: number; max: number };
  };
}

interface GridBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

interface WatermarkState {
  position: { x: number; y: number };
  size: number;
  isFlat: boolean;
  logoType: 'default' | 'tm' | 'custom';
  customUrl: string;
  isVisible: boolean;
}

interface UseWatermarkControlsProps {
  effects: Set<string>;
  onEffectsChange: (effects: Set<string>) => void;
  dimensions?: GridDimensions;
}

export const useWatermarkControls = ({
  effects,
  onEffectsChange,
  dimensions
}: UseWatermarkControlsProps) => {
  // Cache container dimensions to avoid DOM queries
  const containerDimensionsRef = useRef<{ width: number; height: number } | null>(null);
  
  // Helper function to get effect value
  const getEffectValue = useCallback((prefix: string, fallback: number): number => {
    const found = Array.from(effects).find(e => e.startsWith(prefix));
    if (!found) return fallback;
    const parsed = parseInt(found.replace(prefix, ''), 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }, [effects]);

  // Get cached container dimensions (only query DOM once)
  const getContainerDimensions = useCallback((): { width: number; height: number } => {
    if (containerDimensionsRef.current) {
      return containerDimensionsRef.current;
    }
    
    const chartElement = document.querySelector('.chart-container');
    if (chartElement) {
      const rect = chartElement.getBoundingClientRect();
      const dimensions = {
        width: rect.width,
        height: rect.height
      };
      containerDimensionsRef.current = dimensions;
      return dimensions;
    }
    
    // Fallback to default dimensions
    const fallback = { width: 800, height: 600 };
    containerDimensionsRef.current = fallback;
    return fallback;
  }, []);

  // Calculate grid bounds using cached dimensions
  const getGridBounds = useCallback((logoSize: number, isFlat: boolean): GridBounds => {
    const container = getContainerDimensions();
    
    // Use square footprint for clamping to ensure no overflow regardless of rotation
    const logoWidth = logoSize;
    const logoHeight = logoSize;
    
    // Use conservative boundaries to ensure logo stays within grid
    const margin = 60; // Better visual spacing from edges
    const maxX = Math.max(0, container.width - logoWidth - margin - 10); // -10 for the offset
    const maxY = Math.max(0, container.height - logoHeight - margin - 10); // -10 for the offset
    
    return {
      minX: 0, // Start from 0 since Watermark adds 10px offset
      maxX,
      minY: 0, // Start from 0 since Watermark adds 10px offset
      maxY,
      width: container.width,
      height: container.height
    };
  }, [getContainerDimensions]);

  // Get smart default position (bottom-right)
  const getDefaultPosition = useCallback((logoSize: number, isFlat: boolean) => {
    const bounds = getGridBounds(logoSize, isFlat);
    return {
      x: bounds.maxX, // Right side - use maximum X position
      y: bounds.maxY  // Bottom side - use maximum Y position
    };
  }, [getGridBounds]);

  // Update effects helper
  const updateEffects = useCallback((updater: (effects: Set<string>) => void) => {
    const newEffects = new Set(effects);
    updater(newEffects);
    onEffectsChange(newEffects);
  }, [effects, onEffectsChange]);

  // Get current watermark state (simplified, no DOM queries)
  const getCurrentState = useCallback((): WatermarkState => {
    const size = getEffectValue('LOGO_SIZE:', 90);
    const isFlat = effects.has('LOGO_FLAT');
    
    // Get current position from effects
    const x = getEffectValue('LOGO_X:', 0);
    const y = getEffectValue('LOGO_Y:', 0);
    
    let logoType: 'default' | 'tm' | 'custom' = 'default';
    if (effects.has('SHOW_TM_LOGO')) logoType = 'tm';
    else if (effects.has('CUSTOM_LOGO')) logoType = 'custom';
    
    const customUrl = Array.from(effects)
      .find(e => e.startsWith('CUSTOM_LOGO_URL:'))
      ?.replace('CUSTOM_LOGO_URL:', '') || '';
    
    return {
      position: { x, y },
      size,
      isFlat: effects.has('LOGO_FLAT'),
      logoType,
      customUrl,
      isVisible: !effects.has('HIDE_WATERMARK')
    };
  }, [effects, getEffectValue]);

  // Constrain position to grid bounds
  const constrainPosition = useCallback((x: number, y: number, logoSize: number, isFlat: boolean) => {
    const bounds = getGridBounds(logoSize, isFlat);
    return {
      x: Math.max(bounds.minX, Math.min(bounds.maxX, x)),
      y: Math.max(bounds.minY, Math.min(bounds.maxY, y))
    };
  }, [getGridBounds]);

  // Handle position change (simplified, no DOM queries)
  const handlePositionChange = useCallback((axis: 'x' | 'y', value: number) => {
    const state = getCurrentState();
    const constrained = constrainPosition(
      axis === 'x' ? value : state.position.x,
      axis === 'y' ? value : state.position.y,
      state.size,
      state.isFlat
    );

    updateEffects(effects => {
      // Remove existing position effect
      const posEffect = Array.from(effects).find(e => e.startsWith(`LOGO_${axis.toUpperCase()}:`));
      if (posEffect) effects.delete(posEffect);
      // Add new position effect
      effects.add(`LOGO_${axis.toUpperCase()}:${constrained[axis]}`);
    });
  }, [getCurrentState, constrainPosition, updateEffects]);

  // Nudge/move by delta and clamp
  const nudgePosition = useCallback((dx: number, dy: number) => {
    const state = getCurrentState();
    const nextX = state.position.x + dx;
    const nextY = state.position.y + dy;
    const constrained = constrainPosition(nextX, nextY, state.size, state.isFlat);

    updateEffects(effects => {
      const xEffect = Array.from(effects).find(e => e.startsWith('LOGO_X:'));
      const yEffect = Array.from(effects).find(e => e.startsWith('LOGO_Y:'));
      if (xEffect) effects.delete(xEffect);
      if (yEffect) effects.delete(yEffect);
      effects.add(`LOGO_X:${constrained.x}`);
      effects.add(`LOGO_Y:${constrained.y}`);
    });
  }, [getCurrentState, constrainPosition, updateEffects]);

  // Set size (with clamping of position so logo remains within bounds)
  const setLogoSize = useCallback((newSize: number) => {
    const state = getCurrentState();
    const constrainedSize = Math.max(100, Math.min(400, newSize));
    const constrainedPos = constrainPosition(state.position.x, state.position.y, constrainedSize, state.isFlat);

    updateEffects(effects => {
      const sizeEffect = Array.from(effects).find(e => e.startsWith('LOGO_SIZE:'));
      const xEffect = Array.from(effects).find(e => e.startsWith('LOGO_X:'));
      const yEffect = Array.from(effects).find(e => e.startsWith('LOGO_Y:'));
      if (sizeEffect) effects.delete(sizeEffect);
      if (xEffect) effects.delete(xEffect);
      if (yEffect) effects.delete(yEffect);
      effects.add(`LOGO_SIZE:${constrainedSize}`);
      effects.add(`LOGO_X:${constrainedPos.x}`);
      effects.add(`LOGO_Y:${constrainedPos.y}`);
    });
  }, [getCurrentState, constrainPosition, updateEffects]);

  // Toggle flat/vertical and clamp current position for new rotation
  const toggleFlat = useCallback((isFlat: boolean) => {
    const state = getCurrentState();
    const constrainedPos = constrainPosition(state.position.x, state.position.y, state.size, isFlat);

    updateEffects(effects => {
      // Rotation flag
      if (isFlat) effects.add('LOGO_FLAT');
      else effects.delete('LOGO_FLAT');

      // Clamp current position under new rotation
      const xEffect = Array.from(effects).find(e => e.startsWith('LOGO_X:'));
      const yEffect = Array.from(effects).find(e => e.startsWith('LOGO_Y:'));
      if (xEffect) effects.delete(xEffect);
      if (yEffect) effects.delete(yEffect);
      effects.add(`LOGO_X:${constrainedPos.x}`);
      effects.add(`LOGO_Y:${constrainedPos.y}`);
    });
  }, [getCurrentState, constrainPosition, updateEffects]);

  // Reset to default position
  const resetToDefault = useCallback(() => {
    const state = getCurrentState();
    const defaultPos = getDefaultPosition(state.size, state.isFlat);
    
    updateEffects(effects => {
      // Remove existing position effects
      const xEffect = Array.from(effects).find(e => e.startsWith('LOGO_X:'));
      const yEffect = Array.from(effects).find(e => e.startsWith('LOGO_Y:'));
      if (xEffect) effects.delete(xEffect);
      if (yEffect) effects.delete(yEffect);
      
      // Add default position
      effects.add(`LOGO_X:${defaultPos.x}`);
      effects.add(`LOGO_Y:${defaultPos.y}`);
    });
  }, [getCurrentState, getDefaultPosition, updateEffects]);

  // Auto-scroll to chart (accounting for page layout)
  const scrollToChart = useCallback(() => {
    const chartElement = document.querySelector('.chart-container');
    if (chartElement) {
      const rect = chartElement.getBoundingClientRect();
      const headerHeight = 80; // Approximate header height
      const scrollTop = window.pageYOffset + rect.top - headerHeight;
      
      window.scrollTo({
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
      });
    }
  }, []);

  return {
    // State
    currentState: getCurrentState(),
    
    // Actions
    handlePositionChange,
    nudgePosition,
    setLogoSize,
    toggleFlat,
    resetToDefault,
    scrollToChart,
    
    // Utilities
    getGridBounds,
    getDefaultPosition,
    constrainPosition,
    updateEffects
  };
};