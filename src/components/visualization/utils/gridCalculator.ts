import { 
  GridDimensions, 
  GridConfig, 
  QuadrantLayout, 
  Midpoint, 
  ScaleFormat,
  getScaleMinValue
} from '../../../types/base';

export interface GridStyle {
  left?: string;
  bottom?: string;
  width: string;
  height: string;
}

export interface GridLinePosition {
  position: string;
  isHorizontal: boolean;
}

export function validateMidpoint(
  midpoint: Midpoint, 
  satScale: ScaleFormat, 
  loyScale: ScaleFormat
): boolean {
  const satMax = parseInt(satScale.split('-')[1]);
  const loyMax = parseInt(loyScale.split('-')[1]);
  
  return (
    midpoint.sat > 1 && 
    midpoint.sat < satMax &&
    midpoint.loy > 1 && 
    midpoint.loy < loyMax
  );
}

export function calculateGrid(config: GridConfig): GridDimensions {
  const satMin = getScaleMinValue(config.satisfactionScale);
  const loyMin = getScaleMinValue(config.loyaltyScale);
  const satMax = parseInt(config.satisfactionScale.split('-')[1]);
  const loyMax = parseInt(config.loyaltyScale.split('-')[1]);
  
  const midCol = config.midpoint.sat - satMin;
  const midRow = config.midpoint.loy - loyMin;
  
  const availableSatCells = satMax - config.midpoint.sat;
  const availableLoyaltyCells = loyMax - config.midpoint.loy;
  
  const hasNearApostles = (
    availableSatCells >= 2 &&
    availableLoyaltyCells >= 1
  );
  
  return {
    cellWidth: 100 / (satMax - satMin),
    cellHeight: 100 / (loyMax - loyMin),
    totalCols: satMax - satMin + 1,
    totalRows: loyMax - loyMin + 1,
    midpointCol: midCol,
    midpointRow: midRow,
    hasNearApostles,
    scaleRanges: {
      satisfaction: { min: satMin, max: satMax },
      loyalty: { min: loyMin, max: loyMax }
    }
  };
}

export function calculateLayout(dimensions: GridDimensions): QuadrantLayout {
  const { cellWidth, cellHeight, totalCols, totalRows, midpointCol, midpointRow } = dimensions;
  
  const toPercent = (n: number) => `${n}%`;
  const midpointLeftPos = midpointCol * cellWidth;

  return {
    apostles: {
      left: toPercent(cellWidth * (totalCols - 2)),
      bottom: toPercent(cellHeight * (totalRows - 2)),
      width: toPercent(cellWidth),
      height: toPercent(cellHeight),
      size: 1
    },
    terrorists: {
      left: toPercent(0),
      bottom: toPercent(0),
      width: toPercent(cellWidth),
      height: toPercent(cellHeight),
      size: 1
    },
    nearApostles: dimensions.hasNearApostles ? [
      {
        left: toPercent(cellWidth * (totalCols - 3)),
        bottom: toPercent(cellHeight * (totalRows - 2)),
        width: toPercent(cellWidth),
        height: toPercent(cellHeight),
        size: 1
      },
      {
        left: toPercent(cellWidth * (totalCols - 3)),
        bottom: toPercent(cellHeight * (totalRows - 3)),
        width: toPercent(cellWidth),
        height: toPercent(cellHeight),
        size: 1
      },
      {
        left: toPercent(cellWidth * (totalCols - 2)),
        bottom: toPercent(cellHeight * (totalRows - 3)),
        width: toPercent(cellWidth),
        height: toPercent(cellHeight),
        size: 1
      }
    ] : null,
    quadrants: {
      loyalists: {
        left: toPercent(midpointLeftPos),
        bottom: toPercent(midpointRow * cellHeight),
        width: toPercent(cellWidth * (totalCols - 1 - midpointCol)),
        height: toPercent(cellHeight * (totalRows - 1 - midpointRow))
      },
      mercenaries: {
        left: toPercent(midpointLeftPos),
        bottom: toPercent(0),
        width: toPercent(cellWidth * (totalCols - 1 - midpointCol)),
        height: toPercent(cellHeight * midpointRow)
      },
      hostages: {
        left: toPercent(0),
        bottom: toPercent(midpointRow * cellHeight),
        width: toPercent(midpointLeftPos),
        height: toPercent(cellHeight * (totalRows - 1 - midpointRow))
      },
      defectors: {
        left: toPercent(0),
        bottom: toPercent(0),
        width: toPercent(midpointLeftPos),
        height: toPercent(cellHeight * midpointRow)
      }
    }
  };
}

export function calculateGridLines(dimensions: GridDimensions): GridLinePosition[] {
  const lines: GridLinePosition[] = [];
  
  // Vertical lines
  for (let i = 1; i < dimensions.totalCols; i++) {
    lines.push({
      position: `${i * dimensions.cellWidth}%`,
      isHorizontal: false
    });
  }
  
  // Horizontal lines
  for (let i = 1; i < dimensions.totalRows; i++) {
    lines.push({
      position: `${i * dimensions.cellHeight}%`,
      isHorizontal: true
    });
  }
  
  return lines;
}

export function determineQuadrant(
  satisfaction: number,
  loyalty: number,
  dimensions: GridDimensions
): 'apostles' | 'mercenaries' | 'hostages' | 'defectors' {
  // Special cases for corners
  if (satisfaction === dimensions.totalCols && loyalty === dimensions.totalRows) {
    return 'apostles';
  }
  if (satisfaction === 1 && loyalty === 1) {
    return 'defectors';
  }

  // Convert to 0-based grid positions
  const satPosition = satisfaction - 1;
  const loyPosition = loyalty - 1;

  if (satPosition >= dimensions.midpointCol && loyPosition >= dimensions.midpointRow) return 'apostles';
  if (satPosition >= dimensions.midpointCol) return 'mercenaries';
  if (loyPosition >= dimensions.midpointRow) return 'hostages';
  return 'defectors';
}