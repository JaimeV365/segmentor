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
  const EDGE_PADDING_X = Math.max(4, (dimensions?.cellWidth ?? 24) / 2);  // half a cell, fallback 12
  const EDGE_PADDING_Y = Math.max(4, (dimensions?.cellHeight ?? 24) / 2); // half a cell, fallback 12
  const OFFSET = 10; // matches Watermark.tsx positioning offset
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
    
    // Half-cell padding on all sides
    const marginX = EDGE_PADDING_X;
    const marginY = EDGE_PADDING_Y;
    
    // Visual footprint is the same for both orientations: width = size, height = size * 0.3
    const effWidth = logoSize;
    const effHeight = logoSize * 0.3;
    
    // Symmetric padding on all sides (half a cell) accounting for render offset
    const minX = Math.max(0, marginX);
    const minY = Math.max(0, marginY);
    const maxX = Math.max(0, container.width - effWidth - marginX - OFFSET);
    const maxY = Math.max(0, container.height - effHeight - marginY - OFFSET);
    
    return {
      minX,
      maxX,
      minY,
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

  // Get current watermark state (calculates default position if not set in effects)
  const getCurrentState = useCallback((): WatermarkState => {
    const isFlat = effects.has('LOGO_FLAT');
    // Default size is the same for both orientations to keep visual parity
    const defaultSize = 90;
    const size = getEffectValue('LOGO_SIZE:', defaultSize);
    
    // Check if position is explicitly set in effects
    const hasXEffect = Array.from(effects).some(e => e.startsWith('LOGO_X:'));
    const hasYEffect = Array.from(effects).some(e => e.startsWith('LOGO_Y:'));
    
    let x: number;
    let y: number;
    
    if (hasXEffect) {
      x = getEffectValue('LOGO_X:', 0);
    } else {
      const bounds = getGridBounds(size, isFlat);
      x = bounds.maxX;
    }
    
    if (hasYEffect) {
      y = getEffectValue('LOGO_Y:', 0);
    } else {
      const bounds = getGridBounds(size, isFlat);
      y = bounds.maxY;
    }
    
    let logoType: 'default' | 'custom' = 'default';
    if (effects.has('CUSTOM_LOGO')) logoType = 'custom';
    
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
  }, [effects, getEffectValue, getContainerDimensions]);

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
    const constrainedSize = Math.max(50, Math.min(400, newSize));
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

  // Toggle flat/vertical and preserve visual position when switching
  const toggleFlat = useCallback((isFlat: boolean) => {
    const state = getCurrentState();
    const wasFlat = state.isFlat;
    
    // If switching modes and we have a position, preserve the visual bottom edge
    let newY = state.position.y;
    if (wasFlat !== isFlat) {
      // Calculate current visual height
      const currentVisualHeight = wasFlat ? state.size * 0.3 : state.size;
      // Calculate current visual bottom edge
      const visualBottom = state.position.y + currentVisualHeight;
      // Calculate new visual height for the new mode
      const newVisualHeight = isFlat ? state.size * 0.3 : state.size;
      // Calculate new Y position to preserve visual bottom edge
      newY = visualBottom - newVisualHeight;
    }
    
    // Constrain both X and Y positions for the new rotation
    const constrainedPos = constrainPosition(state.position.x, newY, state.size, isFlat);

    updateEffects(effects => {
      // Rotation flag
      if (isFlat) effects.add('LOGO_FLAT');
      else effects.delete('LOGO_FLAT');

      // Update position to preserve visual placement
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
    getCurrentState,
    constrainPosition,
    updateEffects
  };
};