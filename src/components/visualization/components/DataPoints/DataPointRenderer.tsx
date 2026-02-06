import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GridDimensions, Position, DataPoint, ScaleFormat, NormalizedPosition } from '@/types/base';
import { calculatePointPosition } from '../../utils/positionCalculator';
import { useQuadrantAssignment, QuadrantType } from '../../context/QuadrantAssignmentContext';
import { useInfoBox } from '../InfoBoxLayer';
import { useReassignmentLoading } from '../../context/ReassignmentLoadingContext';
import { getPointKey } from '../../services';


interface DataPointRendererProps {
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
}

interface ExtendedQuadrantInfo {
  group: string;
  color: string;
  satValue: number;
  loyValue: number;
  midpointSat: number;
  midpointLoy: number;
}

function normalizedToXY(normalized: NormalizedPosition): Position {
  return {
    x: normalized.normalizedSatisfaction,
    y: normalized.normalizedLoyalty
  };
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

export const DataPointRenderer: React.FC<DataPointRendererProps> = React.memo(({
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
  selectedPointId
}) => {
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
  const { getQuadrantForPoint, updateManualAssignment, getBoundaryOptions } = useQuadrantAssignment();
  const { showInfoBox, hideInfoBox } = useInfoBox();
  const { showReassignmentLoading, hideReassignmentLoading } = useReassignmentLoading();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.data-point-info')) {
        setSelectedPoint(null);
        hideInfoBox();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [hideInfoBox]);

  // Memoize quadrant info calculation to prevent recalculation on every render
  const quadrantInfoCache = useMemo(() => {
    const cache = new Map<string, ExtendedQuadrantInfo>();
    
    data.forEach(point => {
      const key = `${point.satisfaction}-${point.loyalty}-${point.id}`;
      if (!cache.has(key)) {
        const normalized = calculatePointPosition(
          point.satisfaction,
          point.loyalty,
          satisfactionScale,
          loyaltyScale
        );
        
        const satValue = point.satisfaction;
        const loyValue = point.loyalty;
        
        const midpointSat = 1 + (position.x / 100) * (dimensions.totalCols - 1);
        const midpointLoy = 1 + (position.y / 100) * (dimensions.totalRows - 1);
        
        const baseInfo = { satValue, loyValue, midpointSat, midpointLoy };
        
        // Get the quadrant from context
        const quadrantType = getQuadrantForPoint(point);
        
        // Map to display info
        const displayInfo = getQuadrantDisplayInfo(quadrantType, isClassicModel);
        
        cache.set(key, { 
          ...displayInfo, 
          ...baseInfo 
        });
      }
    });
    
    return cache;
  }, [data, position, dimensions, getQuadrantForPoint, satisfactionScale, loyaltyScale, isClassicModel]);

  const getQuadrantInfo = useCallback((point: DataPoint): ExtendedQuadrantInfo => {
    const key = `${point.satisfaction}-${point.loyalty}-${point.id}`;
    return quadrantInfoCache.get(key) || { group: 'Unknown', color: '#666666', satValue: point.satisfaction, loyValue: point.loyalty, midpointSat: 0, midpointLoy: 0 };
  }, [quadrantInfoCache]);

  const isOnGridIntersection = useCallback((normalizedX: number, normalizedY: number) => {
    const satValue = 1 + (normalizedX / 100) * (dimensions.totalCols - 1);
    const loyValue = 1 + (normalizedY / 100) * (dimensions.totalRows - 1);
    const midpointSat = 1 + (position.x / 100) * (dimensions.totalCols - 1);
    const midpointLoy = 1 + (position.y / 100) * (dimensions.totalRows - 1);

    return Math.abs(satValue - midpointSat) < 0.1 || Math.abs(loyValue - midpointLoy) < 0.1;
  }, [dimensions, position]);

  // Memoize point groups calculation to prevent recalculation on every render
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

  // Memoize filtered data to prevent recalculation on every render
  const filteredData = useMemo(() => {
    return data.filter(point => {
      if (point.excluded) return false;
      const key = `${point.satisfaction}-${point.loyalty}`;
      const frequency = pointGroups.get(key)?.length || 0;
      return !frequencyFilterEnabled || frequency >= frequencyThreshold;
    });
  }, [data, pointGroups, frequencyFilterEnabled, frequencyThreshold]);

  // Memoize boundary options cache to prevent recalculation on every render
  const boundaryOptionsCache = useMemo(() => {
    const cache = new Map<string, any[]>();
    filteredData.forEach(point => {
      const key = `${point.satisfaction}-${point.loyalty}-${point.id}`;
      if (!cache.has(key)) {
        cache.set(key, getBoundaryOptions(point));
      }
    });
    return cache;
  }, [filteredData, getBoundaryOptions]);

  return (
    <div className="data-points" style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
      {filteredData.map((point, index) => {
        const normalized = calculatePointPosition(
          point.satisfaction,
          point.loyalty,
          satisfactionScale,
          loyaltyScale
        );
        const positionXY = normalizedToXY(normalized);
        
        const groupKey = `${point.satisfaction}-${point.loyalty}`;
        const samePoints = pointGroups.get(groupKey) || [];
        const count = samePoints.length;
        const size = Math.min(12 + (count - 1) * 3, 60);
        
        const quadrantInfo = getQuadrantInfo(point);
        
        const isIntersection = isOnGridIntersection(positionXY.x, positionXY.y);
        const isSelected = selectedPointId === point.id || selectedPoint === point.id;

        // Get cached boundary options
        const boundaryKey = `${point.satisfaction}-${point.loyalty}-${point.id}`;
        const availableOptions = boundaryOptionsCache.get(boundaryKey) || [];

        // Calculate inner ring properties based on count (no shadow - inner ring provides differentiation)
        // Cap inner ring width to 80% of radius to prevent export rendering issues (stars/squares)
        const radius = size / 2;
        const maxRingWidth = radius * 0.8; // Cap at 80% of radius to ensure proper rendering
        const innerRingWidth = Math.min(maxRingWidth, Math.max(1, 1 + (count - 1) * 0.08));
        const innerRingOpacity = Math.min(0.3, 0.1 + (count - 1) * 0.003); // Slightly more visible

        return (
          <div key={`${point.id}-${index}`}>
            <div
              className="data-point"
              style={{
                position: 'absolute',
                left: `${positionXY.x}%`,
                bottom: `${positionXY.y}%`,
                width: `${size}px`,
                height: `${size}px`,
                transform: `translate(-50%, 50%) scale(${count > 1 ? 1.1 : 1})`,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                border: '2px solid rgba(255, 255, 255, 0.9)',
                borderRadius: '50%',
                backgroundColor: quadrantInfo.color,
                boxShadow: `inset 0 0 0 ${innerRingWidth}px rgba(0, 0, 0, ${innerRingOpacity})`,
                zIndex: isSelected ? 35 : count > 1 ? 32 : 30,
                pointerEvents: 'auto'
              }}
              onClick={(e) => {
                e.stopPropagation();
                const newSelectedPoint = selectedPoint === point.id ? null : point.id;
                setSelectedPoint(newSelectedPoint);
                
                if (newSelectedPoint) {
                  // Show InfoBox in the dedicated layer
                  showInfoBox({
                    point,
                    normalized: positionXY,
                    quadrantInfo: {
                      group: quadrantInfo.group,
                      color: quadrantInfo.color
                    },
                    count,
                    samePoints,
                    availableOptions,
                    onClose: () => {
                      setSelectedPoint(null);
                      hideInfoBox();
                    },
                    onGroupChange: (newGroup) => {
                      // Show loading popup IMMEDIATELY - before any calculations
                      showReassignmentLoading();
                      
                      // Use requestAnimationFrame to ensure the popup renders before calculations start
                      requestAnimationFrame(() => {
                        // Map the display name to our QuadrantType
                        let quadrantType: QuadrantType = 'defectors'; // default
                        
                        if (newGroup.group === 'Loyalists') quadrantType = 'loyalists';
                        else if (newGroup.group === 'Mercenaries') quadrantType = 'mercenaries';
                        else if (newGroup.group === 'Hostages') quadrantType = 'hostages';
                        else if (newGroup.group === 'Defectors') quadrantType = 'defectors';
                        else if (newGroup.group === 'Apostles' || newGroup.group === 'Advocates') quadrantType = 'apostles';
                        else if (newGroup.group === 'Terrorists' || newGroup.group === 'Trolls') quadrantType = 'terrorists';
                        else if (newGroup.group === 'Near-Apostles' || newGroup.group === 'Near-Advocates') quadrantType = 'near_apostles';
                        else if (newGroup.group === 'Neutral') quadrantType = 'neutral';
                        
                        // Update ALL customers at this position, not just the clicked one
                        // Use compound key (id + coordinates) to support historical data
                        samePoints.forEach(customer => {
                          updateManualAssignment(getPointKey(customer), quadrantType);
                        });
                        
                        // Hide loading popup after calculations are complete
                        hideReassignmentLoading();
                        
                        // Close the InfoBox after loading is complete
                        setSelectedPoint(null);
                        hideInfoBox();
                      });
                    }
                  });
                } else {
                  hideInfoBox();
                }
                
                if (onPointSelect) {
                  onPointSelect({
                    ...point,
                    frequency: count,
                    quadrant: quadrantInfo.group,
                    normalizedSatisfaction: positionXY.x,
                    normalizedLoyalty: positionXY.y
                  });
                }
              }}
            />
          </div>
        );
      })}
    </div>
  );
});

export default DataPointRenderer;