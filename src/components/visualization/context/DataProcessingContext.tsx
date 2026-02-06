import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { DataPoint, ScaleFormat } from '../../../types/base';
import type { QuadrantOption } from '../components/DataPoints/DataPointInfoBox';
import { useChartConfig } from './ChartConfigContext';
import { DataProcessingService, BoundaryDetectionService, getPointKey } from '../services';
import { calculateSpecialZoneBoundaries } from '../utils/zoneCalculator';

// Define quadrant types
export type QuadrantType = 'loyalists' | 'mercenaries' | 'hostages' | 'defectors' | 'apostles' | 'terrorists' | 'near_apostles' | 'neutral';

// Define the shape of our data processing context
interface DataProcessingContextType {
  // Manual assignments management
  manualAssignments: Map<string, QuadrantType>;
  updateManualAssignment: (pointId: string, quadrant: QuadrantType) => void;
  clearManualAssignment: (pointId: string) => void;
  
  // Quadrant determination
  getQuadrantForPoint: (point: DataPoint) => QuadrantType;
  
  // Distribution statistics
  distribution: Record<QuadrantType, number>;
  
  // Enhanced classification functions
  getDisplayNameForQuadrant: (quadrantType: QuadrantType) => string;
  getBoundaryOptions: (point: DataPoint) => QuadrantOption[];
  isPointInSpecialZone: (point: DataPoint) => boolean;
  getHierarchicalClassification: (
    point: DataPoint
  ) => {
    baseQuadrant: QuadrantType;
    specificZone: QuadrantType | null;
  };
  
  // Auto-reassignment functions
  autoReassignPointsOnMidpointChange: () => void;
  clearAllManualAssignments: () => void;
  
  // Areas mode (for filter options)
  showSpecialZones: boolean;
  showNearApostles: boolean;
}

const DataProcessingContext = createContext<DataProcessingContextType | undefined>(undefined);

interface DataProcessingProviderProps {
  children: React.ReactNode;
  data: DataPoint[];
  showNearApostles?: boolean;
  showSpecialZones?: boolean;
  initialManualAssignments?: Map<string, QuadrantType>;
}

export const DataProcessingProvider: React.FC<DataProcessingProviderProps> = ({
  children,
  data,
  showNearApostles = false,
  showSpecialZones = true,
  initialManualAssignments,
}) => {
  // Get chart config from parent context
  const { 
    midpoint, 
    apostlesZoneSize, 
    terroristsZoneSize, 
    satisfactionScale, 
    loyaltyScale, 
    isClassicModel 
  } = useChartConfig();

  // State
  const [manualAssignments, setManualAssignments] = useState<Map<string, QuadrantType>>(
    initialManualAssignments || new Map()
  );

  // Natural classification function (bypasses manual assignments) - used for boundary detection
  const getNaturalQuadrantForPoint = useCallback((point: DataPoint): QuadrantType => {
    const maxSat = parseInt(satisfactionScale.split('-')[1]);
    const maxLoy = parseInt(loyaltyScale.split('-')[1]);
    
    // NOTE: This function intentionally SKIPS manual assignment check
    // It's used for boundary detection which needs natural zone classification
    
    // Use the corrected boundary calculation
    const boundaries = calculateSpecialZoneBoundaries(
      apostlesZoneSize,
      terroristsZoneSize,
      satisfactionScale,
      loyaltyScale
    );
    
    
    // Skip special zones entirely if disabled
    if (showSpecialZones) {
      // NEAR-ZONES CHECK FIRST (higher priority)
      if (showNearApostles) {
        // Simplified space check - if we have room for at least 1 more cell beyond the apostles zone
        const apostlesMinSat = boundaries.apostles.edgeVertixSat;
        const apostlesMinLoy = boundaries.apostles.edgeVertixLoy;
        const hasSpaceForNearApostles = apostlesMinSat > 1 && apostlesMinLoy > 1;
        
        if (hasSpaceForNearApostles) {
          // NEAR-APOSTLES: L-shaped area around apostles zone
          const apostlesMinSat = boundaries.apostles.edgeVertixSat;
          const apostlesMinLoy = boundaries.apostles.edgeVertixLoy;
          const nearApostlesMinSat = apostlesMinSat - 1;
          const nearApostlesMinLoy = apostlesMinLoy - 1;
          
          // Left edge of L-shape: satisfaction in range [nearApostlesMinSat, apostlesMinSat), loyalty >= apostlesMinLoy
          if (point.satisfaction >= nearApostlesMinSat && point.satisfaction < apostlesMinSat && point.loyalty >= apostlesMinLoy) {
            return 'near_apostles';
          }
          
          // Bottom edge of L-shape: satisfaction >= apostlesMinSat, loyalty in [nearApostlesMinLoy, apostlesMinLoy)
          if (point.satisfaction >= apostlesMinSat && point.loyalty >= nearApostlesMinLoy && point.loyalty < apostlesMinLoy) {
            return 'near_apostles';
          }
          
          // Corner of L-shape: satisfaction = nearApostlesMinSat, loyalty = nearApostlesMinLoy
          if (point.satisfaction === nearApostlesMinSat && point.loyalty === nearApostlesMinLoy) {
            return 'near_apostles';
          }

          // Interior of L-shape: covers the area inside the L-shape that's not on the exact edges
          if (point.satisfaction >= nearApostlesMinSat && point.satisfaction < apostlesMinSat &&
              point.loyalty >= nearApostlesMinLoy && point.loyalty < apostlesMinLoy) {
            return 'near_apostles';
          }
        }
        
      }
      
      // APOSTLES ZONE CHECK
      if (point.satisfaction >= boundaries.apostles.edgeVertixSat && point.loyalty >= boundaries.apostles.edgeVertixLoy) {
        return 'apostles';
      }
      
      // TERRORISTS ZONE CHECK
      if (point.satisfaction <= boundaries.terrorists.edgeVertixSat && point.loyalty <= boundaries.terrorists.edgeVertixLoy) {
        return 'terrorists';
      }
    }
    
    // STANDARD QUADRANT CLASSIFICATION
    if (point.satisfaction >= midpoint.sat && point.loyalty >= midpoint.loy) {
      return 'loyalists';
    }
    
    if (point.satisfaction >= midpoint.sat && point.loyalty < midpoint.loy) {
      return 'mercenaries';
    }
    
    if (point.satisfaction < midpoint.sat && point.loyalty >= midpoint.loy) {
      return 'hostages';
    }
    
    // Default case: point.satisfaction < midpoint.sat && point.loyalty < midpoint.loy
    return 'defectors';
  }, [
    satisfactionScale,
    loyaltyScale,
    midpoint,
    apostlesZoneSize,
    terroristsZoneSize,
    showNearApostles
  ]);

  // CLASSIFICATION FUNCTION
  const getQuadrantForPoint = useCallback((point: DataPoint): QuadrantType => {
    const config = {
      satisfactionScale,
      loyaltyScale,
      midpoint,
      apostlesZoneSize,
      terroristsZoneSize,
      showNearApostles,
      showSpecialZones
    };
    
    return DataProcessingService.getQuadrantForPoint(point, manualAssignments, config);
  }, [manualAssignments, satisfactionScale, loyaltyScale, midpoint, apostlesZoneSize, terroristsZoneSize, showNearApostles, showSpecialZones]);

  // Update manual assignment
  // Note: pointKey should be a compound key (id_sat_loy) from getPointKey()
  // This ensures assignments are position-specific for historical data support
  const updateManualAssignment = (pointKey: string, quadrant: QuadrantType) => {
    setManualAssignments(prev => {
      const updated = new Map(prev);
      updated.set(pointKey, quadrant);
      console.log(`📌 Set manual assignment for ${pointKey}: ${quadrant}`);
      return updated;
    });
  };

  // Clear a manual assignment
  // Note: pointKey should be a compound key (id_sat_loy) from getPointKey()
  const clearManualAssignment = (pointKey: string) => {
    setManualAssignments(prev => {
      const updated = new Map(prev);
      updated.delete(pointKey);
      console.log(`🧹 Cleared manual assignment for point ${pointKey}`);
      return updated;
    });
  };

  // Clear all manual assignments (for debugging)
  const clearAllManualAssignments = () => {
    setManualAssignments(new Map());
    console.log(`🧹 Cleared ALL manual assignments`);
  };



  // Calculate distribution based on assignments - optimized for large datasets
  const distribution = useMemo(() => {
    const result: Record<QuadrantType, number> = {
      loyalists: 0,
      mercenaries: 0,
      hostages: 0,
      defectors: 0,
      apostles: 0,
      terrorists: 0,
      near_apostles: 0,
      neutral: 0,
    };
    
    // Use a more efficient approach for large datasets
    const excludedPoints = new Set(data.filter(p => p.excluded).map(p => p.id));
    const midpointKey = `${midpoint.sat}-${midpoint.loy}`;
    
    data.forEach(point => {
      if (excludedPoints.has(point.id)) return;
      
      // Exclude customers exactly on midpoint from distribution counting
      const pointKey = `${point.satisfaction}-${point.loyalty}`;
      if (pointKey === midpointKey) return;
      
      const quadrant = getQuadrantForPoint(point);
      result[quadrant]++;
    });
    
    return result;
  }, [data, getQuadrantForPoint, midpoint]);
  
  // Display name function - simple implementation
  const getDisplayNameForQuadrant = (quadrantType: QuadrantType): string => {
    return DataProcessingService.getDisplayNameForQuadrant(quadrantType, isClassicModel);
  };

  // Check if a point is in a special zone (apostles, terrorists, or near-apostles)
  const isPointInSpecialZone = (point: DataPoint): boolean => {
    const config = {
      satisfactionScale,
      loyaltyScale,
      midpoint,
      apostlesZoneSize,
      terroristsZoneSize,
      showNearApostles,
      showSpecialZones
    };
    
    return DataProcessingService.isPointInSpecialZone(point, config);
  };

  // Get hierarchical classification - returns both base quadrant and specific zone
  const getHierarchicalClassification = (
    point: DataPoint
  ): {
    baseQuadrant: QuadrantType;
    specificZone: QuadrantType | null;
  } => {
    const config = {
      satisfactionScale,
      loyaltyScale,
      midpoint,
      apostlesZoneSize,
      terroristsZoneSize,
      showNearApostles,
      showSpecialZones
    };
    
    return DataProcessingService.getHierarchicalClassification(point, manualAssignments, config);
  };

  // Get boundary options for reassignment - reactive to zone changes
  const getBoundaryOptions = useCallback((point: DataPoint): QuadrantOption[] => {
    const config = {
      satisfactionScale,
      loyaltyScale,
      midpoint,
      apostlesZoneSize,
      terroristsZoneSize,
      showNearApostles,
      showSpecialZones
    };
    
    return BoundaryDetectionService.getBoundaryOptions(
      point,
      config,
      getQuadrantForPoint,
      getNaturalQuadrantForPoint,
      getDisplayNameForQuadrant,
      isPointInSpecialZone
    );
  }, [
    satisfactionScale,
    loyaltyScale,
    midpoint,
    apostlesZoneSize,
    terroristsZoneSize,
    getDisplayNameForQuadrant,
    showNearApostles,
    showSpecialZones,
    getQuadrantForPoint,
    getNaturalQuadrantForPoint,
    isPointInSpecialZone
  ]);

  // Check if a quadrant is still adjacent to a point's current position
  const isQuadrantAdjacentToPoint = useCallback((point: DataPoint, quadrant: QuadrantType): boolean => {
    const config = {
      satisfactionScale,
      loyaltyScale,
      midpoint,
      apostlesZoneSize,
      terroristsZoneSize,
      showNearApostles,
      showSpecialZones
    };
    
    return BoundaryDetectionService.isQuadrantAdjacentToPoint(
      point,
      quadrant,
      config,
      getQuadrantForPoint,
      getNaturalQuadrantForPoint,
      getDisplayNameForQuadrant,
      isPointInSpecialZone
    );
  }, [
    satisfactionScale,
    loyaltyScale,
    midpoint,
    apostlesZoneSize,
    terroristsZoneSize,
    showNearApostles,
    showSpecialZones,
    getQuadrantForPoint,
    getNaturalQuadrantForPoint,
    getDisplayNameForQuadrant,
    isPointInSpecialZone
  ]);

  // Determine if a point should be auto-reassigned
  const shouldAutoReassignPoint = useCallback((point: DataPoint, manualQuadrant: QuadrantType, naturalQuadrant: QuadrantType): boolean => {
    const config = {
      satisfactionScale,
      loyaltyScale,
      midpoint,
      apostlesZoneSize,
      terroristsZoneSize,
      showNearApostles,
      showSpecialZones
    };
    
    return BoundaryDetectionService.shouldAutoReassignPoint(
      point,
      manualQuadrant,
      naturalQuadrant,
      config,
      getQuadrantForPoint,
      getNaturalQuadrantForPoint,
      getDisplayNameForQuadrant,
      isPointInSpecialZone
    );
  }, [
    satisfactionScale,
    loyaltyScale,
    midpoint,
    apostlesZoneSize,
    terroristsZoneSize,
    showNearApostles,
    showSpecialZones,
    getQuadrantForPoint,
    getNaturalQuadrantForPoint,
    getDisplayNameForQuadrant,
    isPointInSpecialZone
  ]);

  // Auto-reassign points when midpoint changes
  const autoReassignPointsOnMidpointChange = useCallback(() => {
    if (manualAssignments.size === 0) return;

    const config = {
      satisfactionScale,
      loyaltyScale,
      midpoint,
      apostlesZoneSize,
      terroristsZoneSize,
      showNearApostles,
      showSpecialZones
    };
    
    const updatedAssignments = DataProcessingService.autoReassignPointsOnMidpointChange(
      data,
      manualAssignments,
      config,
      getQuadrantForPoint,
      getNaturalQuadrantForPoint,
      getDisplayNameForQuadrant,
      isPointInSpecialZone,
      shouldAutoReassignPoint
    );

    if (updatedAssignments.size !== manualAssignments.size) {
      setManualAssignments(updatedAssignments);
    }
  }, [manualAssignments, data, getNaturalQuadrantForPoint, shouldAutoReassignPoint, midpoint, satisfactionScale, loyaltyScale, apostlesZoneSize, terroristsZoneSize, showNearApostles, showSpecialZones, getQuadrantForPoint, getDisplayNameForQuadrant, isPointInSpecialZone]);

  // Track previous midpoint to detect actual changes
  const prevMidpointRef = useRef<{ sat: number; loy: number }>({ sat: midpoint.sat, loy: midpoint.loy });

  // Auto-reassign points when midpoint changes
  useEffect(() => {
    const prevMidpoint = prevMidpointRef.current;
    const currentMidpoint = { sat: midpoint.sat, loy: midpoint.loy };
    
    // Check if midpoint actually changed
    const midpointChanged = prevMidpoint.sat !== currentMidpoint.sat || prevMidpoint.loy !== currentMidpoint.loy;
    
    if (midpointChanged && manualAssignments.size > 0) {
      console.log(`🔄 Midpoint changed from (${prevMidpoint.sat},${prevMidpoint.loy}) to (${currentMidpoint.sat},${currentMidpoint.loy}), checking ${manualAssignments.size} manual assignments`);
      autoReassignPointsOnMidpointChange();
    }
    
    // Update the ref for next comparison
    prevMidpointRef.current = currentMidpoint;
  }, [midpoint.sat, midpoint.loy, manualAssignments.size, autoReassignPointsOnMidpointChange]);

  const contextValue = useMemo(() => ({
    manualAssignments,
    updateManualAssignment,
    clearManualAssignment,
    getQuadrantForPoint,
    distribution,
    getDisplayNameForQuadrant,
    isPointInSpecialZone,
    getHierarchicalClassification,
    getBoundaryOptions,
    autoReassignPointsOnMidpointChange,
    clearAllManualAssignments,
    showSpecialZones,
    showNearApostles
  }), [
    manualAssignments,
    getQuadrantForPoint,
    distribution,
    getDisplayNameForQuadrant,
    isPointInSpecialZone,
    getHierarchicalClassification,
    getBoundaryOptions,
    autoReassignPointsOnMidpointChange,
    clearAllManualAssignments,
    showSpecialZones,
    showNearApostles
  ]);

  return (
    <DataProcessingContext.Provider value={contextValue}>
      {children}
    </DataProcessingContext.Provider>
  );
};

// Hook for using the context
export const useDataProcessing = (): DataProcessingContextType => {
  const context = useContext(DataProcessingContext);
  if (context === undefined) {
    throw new Error('useDataProcessing must be used within a DataProcessingProvider');
  }
  return context;
};
