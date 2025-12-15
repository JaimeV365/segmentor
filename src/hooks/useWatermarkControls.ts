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
    
    // Scale margin inversely with logo size: larger logos get smaller margin
    // Use same margin calculation as default position (matching Watermark.tsx)
    // Base margin of 100 for default size (90), scales down proportionally
    // Minimum margin of 40 to match default position minimum
    const baseMargin = 100;
    const baseSize = 90;
    const marginX = Math.max(40, baseMargin * (baseSize / logoSize));
    
    // For flat mode, use smaller Y margin since logo is much shorter (0.3x height)
    // Use smaller base margin for flat mode to allow more movement range
    // For vertical mode, use same scaled margin as X
    const marginY = isFlat 
      ? Math.max(20, 50 * (baseSize / logoSize)) // Smaller margin for flat (50px base, min 20px) - allows more range
      : Math.max(40, baseMargin * (baseSize / logoSize)); // Same as X for vertical
    
    // Account for actual visual footprint after rotation
    // For X axis: flat uses full width, vertical uses 0.85x width after rotation
    const effWidth = isFlat ? logoSize : logoSize * 0.85;
    // For Y axis: flat uses 0.3x height, vertical uses full height after rotation
    const effHeight = isFlat ? logoSize * 0.3 : logoSize;
    
    const maxX = Math.max(0, container.width - effWidth - marginX - 10); // -10 for the offset
    const maxY = Math.max(0, container.height - effHeight - marginY - 10); // -10 for the offset
    
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

  // Get current watermark state (calculates default position if not set in effects)
  const getCurrentState = useCallback((): WatermarkState => {
    const size = getEffectValue('LOGO_SIZE:', 45);
    const isFlat = effects.has('LOGO_FLAT');
    
    // Check if position is explicitly set in effects
    const hasXEffect = Array.from(effects).some(e => e.startsWith('LOGO_X:'));
    const hasYEffect = Array.from(effects).some(e => e.startsWith('LOGO_Y:'));
    
    let x: number;
    let y: number;
    
    if (hasXEffect) {
      x = getEffectValue('LOGO_X:', 0);
    } else {
      // Calculate default X position (matching Watermark.tsx logic)
      const container = getContainerDimensions();
      const effWidth = isFlat ? size : size * 0.85; // Visual width after rotation for vertical
      // Scale margin with logo size: larger logos get smaller margin (closer to edge)
      const baseMargin = 100;
      const baseSize = 90;
      const margin = Math.max(40, baseMargin * (baseSize / size)); // Min 40px margin
      x = Math.max(0, container.width - effWidth - margin);
    }
    
    if (hasYEffect) {
      y = getEffectValue('LOGO_Y:', 0);
    } else {
      // Calculate default Y position (matching Watermark.tsx logic)
      const container = getContainerDimensions();
      const effHeight = isFlat ? size * 0.3 : size; // Visual height after rotation for vertical
      y = Math.max(0, container.height - effHeight - 80);
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
    const constrainedSize = Math.max(90, Math.min(400, newSize));
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