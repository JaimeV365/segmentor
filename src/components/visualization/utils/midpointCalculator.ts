import { GridDimensions, Scale, Position, getScaleMinValue } from '../../../types/base';

interface MidpointConfig {
  scale: {
    satisfaction: Scale;
    loyalty: Scale;
  };
  dimensions: GridDimensions;
}

export function calculateMidpointSnaps(config: MidpointConfig) {
  const { scale, dimensions } = config;
  const satMax = parseInt(scale.satisfaction.split('-')[1]);
  const loyMax = parseInt(scale.loyalty.split('-')[1]);
  
  // Generate valid snap positions based on scale asymmetry
  const xSnaps = [];
  const ySnaps = [];

  if (satMax === loyMax) {
    // Symmetric scales only snap to grid intersections
    const satMin = getScaleMinValue(scale.satisfaction);
    const loyMin = getScaleMinValue(scale.loyalty);
    for (let i = Math.max(satMin, loyMin) + 1; i < Math.min(satMax, loyMax); i++) {
      xSnaps.push(i * dimensions.cellWidth);
      ySnaps.push(i * dimensions.cellHeight);
    }
  } else {
    // Asymmetric scales allow mid-segment stops
    for (let i = 1; i <= satMax; i++) {
      xSnaps.push(i * dimensions.cellWidth);
      if (i < satMax) {
        xSnaps.push((i * dimensions.cellWidth) + (dimensions.cellWidth / 2));
      }
    }
    const loyMin2 = getScaleMinValue(scale.loyalty);
    for (let i = loyMin2 + 1; i < loyMax; i++) {
      ySnaps.push(i * dimensions.cellHeight);
      if (i < loyMax - 1) {
        ySnaps.push((i * dimensions.cellHeight) + (dimensions.cellHeight / 2));
      }
    }
  }

  return { xSnaps, ySnaps };
}

export function snapToNearestValidPosition(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  config: MidpointConfig
): Position {
  // Convert mouse coordinates to percentages
  const mouseX = ((clientX - containerRect.left) / containerRect.width) * 100;
  const mouseY = ((containerRect.bottom - clientY) / containerRect.height) * 100;

  // Get valid snap positions
  const { xSnaps, ySnaps } = calculateMidpointSnaps(config);

  // Find nearest snap positions
  const snapX = xSnaps.reduce((prev, curr) => 
    Math.abs(curr - mouseX) < Math.abs(prev - mouseX) ? curr : prev
  );
  
  const snapY = ySnaps.reduce((prev, curr) => 
    Math.abs(curr - mouseY) < Math.abs(prev - mouseY) ? curr : prev
  );

  return {
    x: snapX,
    y: snapY
  };
}