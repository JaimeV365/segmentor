import { ScaleFormat, GridDimensions, Midpoint, getScaleMinValue } from '../../../types/base';

// Helper functions for zero-based scale support (0-5, 0-7, 0-10, etc.)
function getScaleMin(scale: ScaleFormat): number {
  return getScaleMinValue(scale);
}

function getScaleMax(scale: ScaleFormat): number {
  return parseInt(scale.split('-')[1]);
}

export function normalizeToPercentage(
  value: number,
  scale: ScaleFormat
): number {
  const minValue = getScaleMin(scale);
  const maxValue = getScaleMax(scale);
  const normalized = ((value - minValue) / (maxValue - minValue)) * 100;
  return Math.max(0, Math.min(100, normalized));
}

export function denormalizeFromPercentage(
  percentage: number,
  scale: ScaleFormat
): number {
  const minValue = getScaleMin(scale);
  const maxValue = getScaleMax(scale);
  return minValue + (percentage / 100) * (maxValue - minValue);
}

export function calculateMidpointPosition(
  midpoint: Midpoint,
  dimensions: GridDimensions
): { left: string; bottom: string } {
  const satMin = dimensions.scaleRanges.satisfaction.min;
  const loyMin = dimensions.scaleRanges.loyalty.min;
  const left = ((midpoint.sat - satMin) / (dimensions.totalCols - 1)) * 100;
  const bottom = ((midpoint.loy - loyMin) / (dimensions.totalRows - 1)) * 100;
  
  return {
    left: `${left}%`,
    bottom: `${bottom}%`
  };
}

export function getValidMidpoint(
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  satisfactionScale: ScaleFormat,
  loyaltyScale: ScaleFormat
): Midpoint {
  console.log(`🕵️ getValidMidpoint CALLED - File: positionNormalizer`);
  console.log(`🕵️ Call stack:`, new Error().stack);
  const maxSat = parseInt(satisfactionScale.split('-')[1]);
  const maxLoy = parseInt(loyaltyScale.split('-')[1]);
  
  const x = clientX - containerRect.left;
  const y = containerRect.bottom - clientY;
  
  // Convert to scale values
  const minSat = getScaleMin(satisfactionScale);
  const minLoy = getScaleMin(loyaltyScale);
  let newSat = minSat + ((x / containerRect.width) * (maxSat - minSat));
  let newLoy = minLoy + ((y / containerRect.height) * (maxLoy - minLoy));
  
  // Keep within bounds
  newSat = Math.max(2, Math.min(maxSat - 1, newSat));
  newLoy = Math.max(2, Math.min(maxLoy - 1, newLoy));
  
  // Snap to half grid positions
  newSat = Math.round(newSat * 2) / 2;
  newLoy = Math.round(newLoy * 2) / 2;
  
  console.log(`🚨 POSITIONNORMALIZER: FINAL RETURN - sat=${newSat}, loy=${newLoy}`);
  
  return { sat: newSat, loy: newLoy };
}

export function calculateScaleMarkers(
  scale: ScaleFormat,
  isHorizontal: boolean = true
): Array<{ position: string; value: number }> {
  const minValue = getScaleMin(scale);
  const maxValue = getScaleMax(scale);
  const totalMarkers = maxValue - minValue + 1;
  
  return Array.from({ length: totalMarkers }, (_, i) => {
    const value = minValue + i;
    const position = normalizeToPercentage(value, scale);
    
    return {
      position: `${isHorizontal ? position : 100 - position}%`,
      value: isHorizontal ? value : maxValue - i
    };
  });
}

export interface PointPosition {
  normalizedSatisfaction: number;
  normalizedLoyalty: number;
}

export function normalizePointPosition(
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

export function calculatePosition(params: {
  x: number;
  y: number;
  dimensions: GridDimensions;
}): { x: number; y: number } {
  const { x, y, dimensions } = params;
  return {
    x: (x * dimensions.cellWidth),
    y: (y * dimensions.cellHeight)
  };
}