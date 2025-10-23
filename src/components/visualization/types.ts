import { DataPoint, ScaleFormat, SpecialZoneBoundaries } from 'types/base';

export type { ScaleFormat };

export type Scale = '0-10' | '1-5' | '1-7' | '1-10';
export type ResizingZone = 'apostles' | 'terrorists' | null;

export interface Position {
  x: number;
  y: number;
}

export interface Midpoint {
  sat: number;
  loy: number;
}

export interface NormalizedPosition {
  normalizedSatisfaction: number;
  normalizedLoyalty: number;
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

export interface QuadrantOption {
  group: string;
  color: string;
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

export interface QuadrantChartProps {
  data: DataPoint[];
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  isClassicModel: boolean;
  showNearApostles: boolean;
  showSpecialZones?: boolean;
  showLabels: boolean;
  showGrid: boolean;
  hideWatermark: boolean;
  showAdvancedFeatures: boolean;
  activeEffects: Set<string>;
  frequencyFilterEnabled: boolean;
  frequencyThreshold: number;
  isAdjustableMidpoint: boolean;
  apostlesZoneSize: number; 
  terroristsZoneSize: number; 
  onFrequencyFilterEnabledChange: (enabled: boolean) => void;
  onFrequencyThresholdChange: (threshold: number) => void;
  onIsAdjustableMidpointChange: (adjustable: boolean) => void;
  onIsClassicModelChange: (isClassic: boolean) => void;
  onShowNearApostlesChange: (show: boolean) => void;
  onShowSpecialZonesChange?: (show: boolean) => void;
  onShowLabelsChange: (show: boolean) => void;
  onShowGridChange: (show: boolean) => void;
  
  // Filter functionality
  isUnifiedControlsOpen?: boolean;
  setIsUnifiedControlsOpen?: (open: boolean) => void;
  activeFilterCount?: number;
  filteredData?: any[];
  totalData?: any[];
  
  // Effects functionality
  onEffectsChange?: (effects: Set<string>) => void;
  isPremium?: boolean;
  
  specialZoneBoundaries?: SpecialZoneBoundaries;
}

export interface QuadrantConfig {
  backgroundColors: Record<string, string>;
  labels: Record<string, string>;
}

export type QuadrantMapType = Record<string, {
  background: string;
  label: string;
}>;

export interface NormalizedDataPoint extends DataPoint {
  normalizedSatisfaction: number;
  normalizedLoyalty: number;
  quadrant: string;
}