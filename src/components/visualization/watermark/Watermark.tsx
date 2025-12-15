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

  // Determine rotation - default is -90deg (vertical) unless LOGO_FLAT is set
  const rotation = effects?.has('LOGO_FLAT') ? '0deg' : '-90deg';
  const isFlat = effects?.has('LOGO_FLAT');

  // Base size (default) - smaller for vertical (rotated), larger for flat
  // Vertical appears larger visually after rotation, so use smaller base size
  let logoSize = isFlat ? 110 : 50;

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
      // When flat, move 5 units to the right (decrease logoX by 5) even if LOGO_X is set
      if (isFlatCalc) {
        logoX = Math.max(0, logoX - 5);
      }
    }
  } else {
    const container = document.querySelector('.chart-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      // For vertical: after rotation, visual height = containerWidth (2.8x logoSize)
      // Visual width = containerHeight (0.85 * logoSize)
      // Account for the visual footprint after rotation
      const effWidth = isFlatCalc ? logoSize : logoSize * 0.85; // Visual width after rotation
      // Scale margin with logo size: larger logos get smaller margin (closer to edge)
      const baseMargin = 100;
      const baseSize = 90;
      const margin = Math.max(40, baseMargin * (baseSize / logoSize)); // Min 40px margin
      logoX = Math.max(0, rect.width - effWidth - margin);
      // When flat, move 5 units to the right (decrease logoX by 5)
      if (isFlatCalc) {
        logoX = Math.max(0, logoX - 5);
      }
    }
  }
  
  const yModifier = Array.from(effects).find(e => e.startsWith('LOGO_Y:'));
  if (yModifier) {
    const yValue = parseInt(yModifier.replace('LOGO_Y:', ''), 10);
    if (!isNaN(yValue)) {
      logoY = yValue;
    }
  } else {
    const container = document.querySelector('.chart-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      const isFlatCalc = effects?.has('LOGO_FLAT');
      // For vertical: the container is square (logoSize x logoSize), after rotation it's still logoSize visually
      // For flat: much smaller height
      const effHeight = isFlatCalc ? logoSize * 0.3 : logoSize; // Visual height after rotation
      // Position with larger margin to place logo higher
      logoY = Math.max(0, rect.height - effHeight - 80);
    }
  }

  // Position within the chart area with adjustable offset
  const isFlat = effects?.has('LOGO_FLAT');
  // Opacity from effects with default and clamp
  const opacityEffect = Array.from(effects).find(e => e.startsWith('LOGO_OPACITY:'));
  const parsedOpacity = opacityEffect ? parseFloat(opacityEffect.replace('LOGO_OPACITY:', '')) : 0.6;
  const logoOpacity = Math.max(0.4, Math.min(1, isNaN(parsedOpacity) ? 0.6 : parsedOpacity));

  // Drag enabled flag (Premium interaction): tied to WM_DRAG_ENABLED effect
  const dragEnabled = effects?.has('WM_DRAG_ENABLED') === true;

  const styles: React.CSSProperties = {
    position: 'absolute',
    left: `${10 + logoX}px`,
    top: `${10 + logoY}px`, // Changed from bottom to top for better control
    width: `${logoSize}px`,
    height: `${logoSize}px`,
    opacity: logoOpacity,
    transition: 'opacity 0.15s ease, transform 0.15s ease',
    zIndex: 3000,
    transform: `rotate(${rotation})`,
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
      
      // For drag, use MUCH more permissive bounds - allow movement across most of the grid
      // Remove the restrictive margins that prevent movement
      // Push maxX further right by reducing the margin even more
      const logoWidth = state.isFlat ? state.size : state.size * 0.85;
      const logoHeight = state.isFlat ? state.size * 0.3 : state.size;
      
      const dragBounds = {
        ...bounds,
        minX: 0,
        minY: 40,  // Increase top margin to prevent logo from going too high (40px gap from top)
        maxX: bounds.width - logoWidth + 100,  // Push 100px further right than normal bounds
        maxY: bounds.height - logoHeight + 50  // Also push 50px further down
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
          width: isFlat ? '100%' : 'auto',
          height: isFlat ? 'auto' : '100%',
          objectFit: 'contain',
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