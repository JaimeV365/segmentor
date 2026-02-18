import { GridDimensions, Midpoint, ScaleFormat, getScaleMinValue } from '../../../types/base';

export interface Position {
  x: number;
  y: number;
}

// Value normalization functions
export function normalizeToPercentage(value: number, scale: ScaleFormat): number {
  const minValue = getScaleMinValue(scale);
  const maxValue = parseInt(scale.split('-')[1]);
  return ((value - minValue) / (maxValue - minValue)) * 100;
}

export function denormalizeFromPercentage(percentage: number, scale: ScaleFormat): number {
  const minValue = getScaleMinValue(scale);
  const maxValue = parseInt(scale.split('-')[1]);
  return minValue + (percentage / 100) * (maxValue - minValue);
}

// Position calculation functions
export function calculateHandlePositions(
  dimensions: GridDimensions,
  apostlesZoneSize: number,
  terroristsZoneSize: number
): { apostles: Position; terrorists: Position } {
  const { cellWidth, cellHeight, totalCols, totalRows } = dimensions;
  
  return {
    apostles: {
      // Bottom-left of apostles zone (top-right corner)
      x: totalCols - apostlesZoneSize * cellWidth,
      y: totalRows - apostlesZoneSize * cellHeight
    },
    terrorists: {
      // Top-right of terrorists zone (bottom-left corner)
      x: terroristsZoneSize * cellWidth,
      y: terroristsZoneSize * cellHeight
    }
  };
}

export function calculateZonePositions(
  dimensions: GridDimensions,
  apostlesZoneSize: number,
  terroristsZoneSize: number
): { apostles: Position; terrorists: Position } {
  const { cellWidth, cellHeight, totalCols, totalRows } = dimensions;

  return {
    apostles: {
      x: 0,
      y: 100 - (apostlesZoneSize * cellHeight)
    },
    terrorists: {
      x: 0,
      y: 0
    }
  };
}

export function calculateNearApostlesPositions(
  dimensions: GridDimensions,
  apostlesZoneSize: number
): {bottom: string, right: string}[] {
  const { cellWidth, cellHeight, totalRows } = dimensions;
  // const { cellWidth, cellHeight, totalCols, totalRows } = dimensions;
  
  if (apostlesZoneSize === 1) {
    return [
      {
        bottom: `${(totalRows - 2) * cellHeight}%`,
        right: `${cellWidth}%`
      },
      {
        bottom: `${(totalRows - 3) * cellHeight}%`,
        right: '0%'
      },
      {
        bottom: `${(totalRows - 3) * cellHeight}%`,
        right: `${cellWidth}%`
      }
    ];
  }
  return [];
}

export function calculateMidpointPosition(
  midpoint: Midpoint,
  dimensions: GridDimensions
): Position {
  const satMin = dimensions.scaleRanges.satisfaction.min;
  const loyMin = dimensions.scaleRanges.loyalty.min;
  return {
    x: ((midpoint.sat - satMin) / (dimensions.totalCols - 1)) * 100,
    y: ((midpoint.loy - loyMin) / (dimensions.totalRows - 1)) * 100
  };
}

export function calculatePointPosition(
  satisfaction: number,
  loyalty: number,
  satisfactionScale: ScaleFormat,
  loyaltyScale: ScaleFormat
): { normalizedSatisfaction: number; normalizedLoyalty: number } {
  return {
    normalizedSatisfaction: normalizeToPercentage(satisfaction, satisfactionScale),
    normalizedLoyalty: normalizeToPercentage(loyalty, loyaltyScale)
  };
}

export function calculateScaleMarkers(
  scale: ScaleFormat,
  isHorizontal: boolean = true
): Array<{ position: string; value: number }> {
  const minValue = getScaleMinValue(scale);
  const maxValue = parseInt(scale.split('-')[1]);
  const totalMarkers = maxValue - minValue + 1;
  
  return Array.from({ length: totalMarkers }, (_, i) => {
    const value = minValue + i;
    const position = i * (100 / (maxValue - minValue));
    
    return {
      position: `${isHorizontal ? position : 100 - position}%`,
      value: isHorizontal ? value : maxValue - i
    };
  });
}

export function getValidMidpoint(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  satisfactionScale: ScaleFormat,
  loyaltyScale: ScaleFormat
): Midpoint {
  console.log(`🕵️ getValidMidpoint CALLED - File: positionCalculator`);
  console.log(`🕵️ Call stack:`, new Error().stack);
  const maxSat = parseInt(satisfactionScale.split('-')[1]);
  const maxLoy = parseInt(loyaltyScale.split('-')[1]);
  
  const x = clientX - containerRect.left;
  const y = containerRect.bottom - clientY;
  
  const minSat = getScaleMinValue(satisfactionScale);
  const minLoy = getScaleMinValue(loyaltyScale);
  let newSat = minSat + ((x / containerRect.width) * (maxSat - minSat));
  let newLoy = minLoy + ((y / containerRect.height) * (maxLoy - minLoy));
  
  newSat = Math.max(2, Math.min(maxSat - 1, newSat));
  newLoy = Math.max(2, Math.min(maxLoy - 1, newLoy));
  
  newSat = Math.round(newSat * 2) / 2;
  newLoy = Math.round(newLoy * 2) / 2;
  
  console.log(`🚨 POSITIONCALCULATOR: FINAL RETURN - sat=${newSat}, loy=${newLoy}`);
  
  return { sat: newSat, loy: newLoy };
}

export function isDraggingNearHalfCell(
  position: Position,
  dimensions: GridDimensions
): boolean {
  const cellX = position.x / dimensions.cellWidth;
  const cellY = position.y / dimensions.cellHeight;
  
  const fracX = Math.abs(cellX - Math.round(cellX));
  const fracY = Math.abs(cellY - Math.round(cellY));
  
  return fracX > 0.4 || fracY > 0.4;
}