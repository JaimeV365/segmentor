import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { GridDimensions, Position, DataPoint, ScaleFormat } from '@/types/base';
import { calculatePointPosition } from '../../utils/positionCalculator';
import { useQuadrantAssignment, QuadrantType } from '../../context/QuadrantAssignmentContext';

interface CanvasDataPointRendererProps {
  data: DataPoint[];
  dimensions: GridDimensions;
  position: Position;
  frequencyFilterEnabled: boolean;
  frequencyThreshold: number;
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  showNearApostles: boolean;
  apostlesZoneSize: number;
  terroristsZoneSize: number;
  isClassicModel: boolean;
  onPointSelect?: (point: DataPoint & {
    frequency: number;
    quadrant: string;
    normalizedSatisfaction: number;
    normalizedLoyalty: number;
  }) => void;
  selectedPointId?: string;
  labelPositioning?: 'above-dots' | 'below-dots';
}

interface CanvasPoint {
  id: string;
  x: number;
  y: number;
  size: number;
  color: string;
  count: number;
  originalPoint: DataPoint;
}

const getQuadrantDisplayInfo = (quadrantType: QuadrantType, isClassic: boolean) => {
  switch (quadrantType) {
    case 'apostles':
      return { 
        group: isClassic ? 'Apostles' : 'Advocates', 
        color: '#4CAF50' 
      };
    case 'terrorists':
      return { 
        group: isClassic ? 'Terrorists' : 'Trolls', 
        color: '#CC0000' 
      };
    case 'near_apostles':
      return { 
        group: isClassic ? 'Near-Apostles' : 'Near-Advocates', 
        color: '#4CAF50' 
      };
    case 'loyalists':
      return { group: 'Loyalists', color: '#4CAF50' };
    case 'mercenaries':
      return { group: 'Mercenaries', color: '#F7B731' };
    case 'hostages':
      return { group: 'Hostages', color: '#3A6494' };
    case 'defectors':
      return { group: 'Defectors', color: '#CC0000' };
    case 'neutral':
      return { group: 'Neutral', color: '#9E9E9E' };
    default:
      return { group: 'Unknown', color: '#666666' };
  }
};

export const CanvasDataPointRenderer: React.FC<CanvasDataPointRendererProps> = React.memo(({
  data,
  dimensions,
  position,
  frequencyFilterEnabled,
  frequencyThreshold,
  satisfactionScale,
  loyaltyScale,
  showNearApostles,
  apostlesZoneSize,
  terroristsZoneSize,
  isClassicModel,
  onPointSelect,
  selectedPointId,
  labelPositioning = 'above-dots'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { getQuadrantForPoint } = useQuadrantAssignment();

  // 🕐 PERFORMANCE MEASUREMENT: Start canvas rendering
  console.time('Chart Render');
  console.time('📊 CANVAS_RENDERING');

  // Memoize point groups calculation (same as DOM renderer)
  const pointGroups = useMemo(() => {
    const groups = new Map<string, DataPoint[]>();
    data.forEach(point => {
      if (!point.excluded) {
        const key = `${point.satisfaction}-${point.loyalty}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)?.push(point);
      }
    });
    return groups;
  }, [data]);

  // Memoize filtered data (same as DOM renderer)
  const filteredData = useMemo(() => {
    return data.filter(point => {
      if (point.excluded) return false;
      const key = `${point.satisfaction}-${point.loyalty}`;
      const frequency = pointGroups.get(key)?.length || 0;
      return !frequencyFilterEnabled || frequency >= frequencyThreshold;
    });
  }, [data, pointGroups, frequencyFilterEnabled, frequencyThreshold]);

  // Convert data points to canvas points
  const canvasPoints = useMemo((): CanvasPoint[] => {
    return filteredData.map(point => {
      const normalized = calculatePointPosition(
        point.satisfaction,
        point.loyalty,
        satisfactionScale,
        loyaltyScale
      );
      
      const groupKey = `${point.satisfaction}-${point.loyalty}`;
      const samePoints = pointGroups.get(groupKey) || [];
      const count = samePoints.length;
      const size = Math.min(12 + (count - 1) * 3, 60);
      
      const quadrantType = getQuadrantForPoint(point);
      const displayInfo = getQuadrantDisplayInfo(quadrantType, isClassicModel);
      
      return {
        id: point.id,
        x: normalized.normalizedSatisfaction,
        y: normalized.normalizedLoyalty,
        size: size / 2, // Canvas radius
        color: displayInfo.color,
        count,
        originalPoint: point
      };
    });
  }, [filteredData, pointGroups, satisfactionScale, loyaltyScale, getQuadrantForPoint, isClassicModel]);

  // Render points to canvas
  const renderPoints = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Group points by location to render single shadow per location (prevents pixelation)
    const locationGroups = new Map<string, CanvasPoint[]>();
    canvasPoints.forEach(point => {
      // Round to nearest pixel to group nearby points
      const key = `${Math.round(point.x * 10) / 10}-${Math.round(point.y * 10) / 10}`;
      if (!locationGroups.has(key)) {
        locationGroups.set(key, []);
      }
      locationGroups.get(key)!.push(point);
    });

    // Render each location group
    locationGroups.forEach((points, locationKey) => {
      // Get max count for this location to scale shadow
      const maxCount = Math.max(...points.map(p => p.count));
      
      // Render all dots at this location (no shadow - inner ring provides differentiation)
      points.forEach(point => {
        const dotX = (point.x / 100) * canvas.width;
        const dotY = canvas.height - (point.y / 100) * canvas.height;

        // Draw main circle
        ctx.fillStyle = point.color;
        ctx.beginPath();
        ctx.arc(dotX, dotY, point.size, 0, 2 * Math.PI);
        ctx.fill();

        // Draw inner ring based on count (for visual differentiation)
        // Cap inner ring width to 40% of radius to prevent export rendering issues (stars/squares)
        // Reduced from 60% because html2canvas has trouble with large strokes
        const maxRingWidth = point.size * 0.4; // Cap at 40% of radius to ensure proper rendering
        const innerRingWidth = Math.min(maxRingWidth, Math.max(1, 1 + (point.count - 1) * 0.08));
        const innerRingOpacity = Math.min(0.3, 0.1 + (point.count - 1) * 0.003);
        
        // Draw the ring so the entire stroke stays inside the circle
        // Use a more conservative calculation to prevent rendering artifacts
        const arcRadius = Math.max(2, point.size - innerRingWidth);
        ctx.strokeStyle = `rgba(0, 0, 0, ${innerRingOpacity})`;
        ctx.lineWidth = innerRingWidth;
        ctx.beginPath();
        ctx.arc(dotX, dotY, arcRadius, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw modern white border with subtle transparency
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(dotX, dotY, point.size, 0, 2 * Math.PI);
        ctx.stroke();
      });
    });
  }, [canvasPoints]);

  // Handle canvas resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    renderPoints();
  }, [renderPoints]);

  // Initial render and resize handling
  useEffect(() => {
    handleResize();
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvasRef.current?.parentElement || document.body);
    
    return () => resizeObserver.disconnect();
  }, [handleResize]);

  // Re-render when points change
  useEffect(() => {
    renderPoints();
    
    // 🕐 PERFORMANCE MEASUREMENT: Canvas rendering complete
    console.timeEnd('Chart Render');
    console.timeEnd('📊 CANVAS_RENDERING');
    console.log('✅ Canvas Rendering: COMPLETE');
  }, [renderPoints]);

  // Basic click detection (Phase 1 - simple implementation)
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onPointSelect) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert canvas coordinates to percentage
    const clickX = (x / canvas.width) * 100;
    const clickY = 100 - (y / canvas.height) * 100; // Flip Y axis

    // Find closest point (simple distance check for Phase 1)
    let closestPoint: CanvasPoint | null = null;
    let minDistance = Infinity;

    for (const point of canvasPoints) {
      const distance = Math.sqrt(
        Math.pow(point.x - clickX, 2) + Math.pow(point.y - clickY, 2)
      );
      
      if (distance < minDistance && distance < 5) { // 5% tolerance
        minDistance = distance;
        closestPoint = point;
      }
    }

    if (closestPoint && onPointSelect) {
      onPointSelect({
        ...closestPoint.originalPoint,
        frequency: closestPoint.count,
        quadrant: getQuadrantDisplayInfo(getQuadrantForPoint(closestPoint.originalPoint), isClassicModel).group,
        normalizedSatisfaction: closestPoint.x,
        normalizedLoyalty: closestPoint.y
      });
    }
  }, [canvasPoints, onPointSelect, getQuadrantForPoint, isClassicModel]);

  return (
    <canvas
      ref={canvasRef}
      className="canvas-data-points"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: labelPositioning === 'above-dots' ? 20 : 30, // Lower when labels should be above
        pointerEvents: 'auto',
        cursor: 'pointer'
      }}
      onClick={handleClick}
    />
  );
});

export default CanvasDataPointRenderer;
