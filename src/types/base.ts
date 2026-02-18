// Satisfaction scale options
export const STANDARD_SAT_OPTIONS = ['1-5', '1-7'] as const;
export const PREMIUM_SAT_OPTIONS = ['1-5', '1-7', '1-10'] as const;

// Loyalty scale options
export const STANDARD_LOY_OPTIONS = ['1-5', '1-7', '1-10'] as const;
export const PREMIUM_LOY_OPTIONS = ['1-5', '1-7', '1-10', '0-10'] as const;

// Combined type for all possible scale formats
export type ScaleFormat = '1-3' | '1-5' | '1-7' | '1-10' | '0-5' | '0-7' | '0-10';

// Helper to detect any zero-based scale (0-5, 0-7, 0-10, etc.)
export function isZeroBasedScale(scale: ScaleFormat | string): boolean {
  return scale.startsWith('0-');
}

// Helper to get the minimum value of a scale
export function getScaleMinValue(scale: ScaleFormat | string): number {
  return scale.startsWith('0-') ? 0 : 1;
}

// Helper to get the maximum value of a scale
export function getScaleMaxValue(scale: ScaleFormat | string): number {
  return parseInt(scale.split('-')[1]);
}
export type Scale = ScaleFormat; // Alias for compatibility

export interface ScaleState {
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  isLocked: boolean;
}

export interface DataPoint {
  id: string;
  name: string;
  email?: string;
  satisfaction: number;
  loyalty: number;
  date?: string;
  dateFormat?: string;
  group: string;
  excluded?: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export interface GridDimensions {
  cellWidth: number;
  cellHeight: number;
  totalCols: number;
  totalRows: number;
  midpointCol: number;
  midpointRow: number;
  hasNearApostles: boolean;
  scaleRanges: {
    satisfaction: { min: number; max: number };
    loyalty: { min: number; max: number };
  };
}

export interface Midpoint {
  sat: number;
  loy: number;
}

export interface GridConfig {
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  midpoint: Midpoint;
  apostlesZoneSize: number;
  terroristsZoneSize: number;
}

export interface ZoneSizes {
  apostles: number;
  terrorists: number;
}

export interface QuadrantLayout {
  apostles: SpecialCell;
  terrorists: SpecialCell;
  nearApostles: Array<SpecialCell> | null;
  quadrants: {
    loyalists: QuadrantCell;
    mercenaries: QuadrantCell;
    hostages: QuadrantCell;
    defectors: QuadrantCell;
  };
}

export interface QuadrantCell {
  left: string;
  bottom: string;
  width: string;
  height: string;
}

export interface SpecialCell extends QuadrantCell {
  size: number;
}

export interface NormalizedPosition {
  normalizedSatisfaction: number;
  normalizedLoyalty: number;
}

export interface SpecialZoneBoundaries {
  apostles: {
    edgeVertixSat: number;  
    edgeVertixLoy: number;  
  };
  terrorists: {
    edgeVertixSat: number;  
    edgeVertixLoy: number;  
  };
}