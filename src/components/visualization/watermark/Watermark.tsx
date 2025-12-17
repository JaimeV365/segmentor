// Watermark.tsx
import React from 'react';
import { GridDimensions } from '@/types/base';
import { useWatermarkControls } from '../../../hooks/useWatermarkControls';

interface WatermarkProps {
  hide: boolean;
  customLogo?: string;
  effects?: Set<string>;
  dimensions: GridDimensions;
  onEffectsChange?: (effects: Set<string>) => void;
}

const DEFAULT_LOGO = '/segmentor-logo.png';

export const Watermark: React.FC<WatermarkProps> = ({ 
  hide, 
  customLogo, 
  effects = new Set(),
  dimensions,
  onEffectsChange
}) => {
  // Hook for clamping and updating effects
  const { constrainPosition, updateEffects, getCurrentState, getGridBounds } = useWatermarkControls({
    effects,
    onEffectsChange: onEffectsChange || (() => {}),
    dimensions
  });

  const shouldHide = hide || effects?.has('HIDE_WATERMARK');

  // Choose logo based on effects
  let logoUrl = DEFAULT_LOGO; // segmentor.app default logo
  
  if (effects?.has('CUSTOM_LOGO')) {
    // Get custom logo URL from effects
    const customUrlFromEffects = Array.from(effects).find(e => e.startsWith('CUSTOM_LOGO_URL:'));
    console.log('Custom logo effect found, effects:', Array.from(effects));
    if (customUrlFromEffects) {
      logoUrl = customUrlFromEffects.replace('CUSTOM_LOGO_URL:', '');
      console.log('Using custom logo URL from effects:', logoUrl);
    } else {
      console.log('CUSTOM_LOGO effect found but no URL in effects');
    }
  } 

  // Use custom logo from props if provided (overrides other settings)
  if (customLogo) {
    logoUrl = customLogo;
  }

  // Determine rotation - apply to image only for consistent footprint
  const rotation = effects?.has('LOGO_FLAT') ? 'none' : 'rotate(-90deg)';
  const isFlat = effects?.has('LOGO_FLAT');

  // Base size (default) - same for both orientations to keep visual parity
  let logoSize = 90;

  // Check for size modifiers in effects
  const sizeModifier = Array.from(effects).find(e => e.startsWith('LOGO_SIZE:'));
  if (sizeModifier) {
    const sizeValue = parseInt(sizeModifier.replace('LOGO_SIZE:', ''), 10);
    if (!isNaN(sizeValue) && sizeValue > 0) {
      logoSize = sizeValue;
    }
  }

  // Check for position modifiers in effects
  let logoX = 0;
  let logoY = 0;
  
  const xModifier = Array.from(effects).find(e => e.startsWith('LOGO_X:'));
  const isFlatCalc = effects?.has('LOGO_FLAT');
  if (xModifier) {
    const xValue = parseInt(xModifier.replace('LOGO_X:', ''), 10);
    if (!isNaN(xValue)) {
      logoX = xValue;
    }
  } else {
    const bounds = getGridBounds(logoSize, isFlatCalc);
    logoX = bounds.maxX;
  }
  
  const yModifier = Array.from(effects).find(e => e.startsWith('LOGO_Y:'));
  if (yModifier) {
    const yValue = parseInt(yModifier.replace('LOGO_Y:', ''), 10);
    if (!isNaN(yValue)) {
      logoY = yValue;
    }
  } else {
    const bounds = getGridBounds(logoSize, isFlatCalc);
    logoY = bounds.maxY;
  }

  // Position within the chart area with adjustable offset
  // Opacity from effects with default and clamp
  const opacityEffect = Array.from(effects).find(e => e.startsWith('LOGO_OPACITY:'));
  const parsedOpacity = opacityEffect ? parseFloat(opacityEffect.replace('LOGO_OPACITY:', '')) : 0.6;
  const logoOpacity = Math.max(0.4, Math.min(1, isNaN(parsedOpacity) ? 0.6 : parsedOpacity));

  // Drag enabled flag (Premium interaction): tied to WM_DRAG_ENABLED effect
  const dragEnabled = effects?.has('WM_DRAG_ENABLED') === true;

  // Keep container footprint the same for both orientations
  // Footprint: width = size, height = size * 0.3; rotation applied to image only
  const containerWidth = logoSize;
  const containerHeight = logoSize * 0.3;

  const styles: React.CSSProperties = {
    position: 'absolute',
    left: `${logoX}px`,
    top: `${logoY}px`,
    width: `${containerWidth}px`,
    height: `${containerHeight}px`,
    opacity: logoOpacity,
    transition: 'opacity 0.15s ease, transform 0.15s ease',
    zIndex: 3000,
    transform: 'none',
    pointerEvents: 'auto',
    cursor: dragEnabled ? 'move' : 'default',
    userSelect: 'none',
    touchAction: 'none',
    willChange: 'left, top, transform'
  };

  const hoverStyles = {
    opacity: 1
  };

  // Drag handling using Pointer Events
  const isDraggingRef = React.useRef(false);
  const startRef = React.useRef<{ x: number; y: number; posX: number; posY: number; offsetX?: number; offsetY?: number } | null>(null);
  const rafRef = React.useRef<number>(0);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!effects?.has('WM_DRAG_ENABLED')) return;
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    
    // Get current state to get the actual logoX/logoY position from effects/default
    const state = getCurrentState();
    
    const container = document.querySelector('.chart-container');
    const containerRect = container?.getBoundingClientRect();
    
    if (containerRect) {
      // Get mouse position relative to container
      const containerX = e.clientX - containerRect.left;
      const containerY = e.clientY - containerRect.top;
      // Store the current logoX/logoY from state (this is what the logo position actually is)
      startRef.current = { 
        x: containerX, 
        y: containerY, 
        posX: state.position.x, 
        posY: state.position.y
      };
    } else {
      // Fallback to screen coordinates if container not found
      startRef.current = { 
        x: e.clientX, 
        y: e.clientY, 
        posX: state.position.x, 
        posY: state.position.y
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !startRef.current) return;
    cancelAnimationFrame(rafRef.current);
    const { x: startX, y: startY, posX, posY } = startRef.current;
    
    // Get container position to convert screen coordinates to container-relative coordinates
    const container = document.querySelector('.chart-container');
    const containerRect = container?.getBoundingClientRect();
    
    if (!containerRect) return;
    
    // Convert current mouse position to container-relative coordinates
    const currentContainerX = e.clientX - containerRect.left;
    const currentContainerY = e.clientY - containerRect.top;
    
    // Calculate delta from mouse movement
    const dx = currentContainerX - startX;
    const dy = currentContainerY - startY;
    
    rafRef.current = requestAnimationFrame(() => {
      // Get size and isFlat from state (but NOT position, as it recalculates defaults)
      const state = getCurrentState();
      
      // CRITICAL: Use the starting position we captured, not getCurrentState().position
      // because getCurrentState() recalculates defaults if no explicit effect exists
      // Calculate new position by adding delta to the STARTING position
      const newX = posX + dx;
      const newY = posY + dy;
      
      // Get bounds - remove the restrictive margins for drag
      const bounds = getGridBounds(state.size, state.isFlat);
      
      // Use the same footprint for both orientations and keep movement within the grid
      const logoWidth = state.size;
      const logoHeight = state.size * 0.3;
      
      const dragBounds = {
        ...bounds,
        minX: bounds.minX,
        minY: bounds.minY,
        maxX: bounds.maxX,
        maxY: bounds.maxY
      };
      
      // Constrain with permissive drag bounds
      const constrainedX = Math.max(dragBounds.minX, Math.min(dragBounds.maxX, newX));
      const constrainedY = Math.max(dragBounds.minY, Math.min(dragBounds.maxY, newY));
      
      // ALWAYS set explicit position effects during drag to prevent recalculation
      updateEffects(nextSet => {
        // Remove old position effects
        Array.from(nextSet).filter(s => s.startsWith('LOGO_X:') || s.startsWith('LOGO_Y:')).forEach(s => nextSet.delete(s));
        // Always add explicit position, even if it's the same, to prevent default recalculation
        nextSet.add(`LOGO_X:${constrainedX}`);
        nextSet.add(`LOGO_Y:${constrainedY}`);
      });
    });
  };

  const onPointerUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      startRef.current = null;
    }
  };

  if (shouldHide) return null;

  return (
    <div 
      className="watermark-layer"
      style={styles} 
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img 
        src={logoUrl} 
        alt="Logo" 
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          transform: rotation,
          transformOrigin: 'center center',
          display: 'block',
          pointerEvents: 'none'
        }} 
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onError={(e) => {
          console.error('Error loading logo from URL:', logoUrl);
          // Use local fallback to prevent infinite loop
          const fallbackLogo = '/segmentor-logo.png';
          if (e.currentTarget.src !== fallbackLogo && !e.currentTarget.src.includes(fallbackLogo)) {
            e.currentTarget.src = fallbackLogo;
          } else {
            // If fallback also fails, hide the image to stop the loop
            e.currentTarget.style.display = 'none';
          }
        }}
      />
    </div>
  );
};

export default Watermark;