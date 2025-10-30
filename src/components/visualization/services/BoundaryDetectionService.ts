import { DataPoint, Midpoint, ScaleFormat } from '@/types/base';
import { QuadrantType } from '../context/DataProcessingContext';
import { calculateSpecialZoneBoundaries } from '../utils/zoneCalculator';
import type { QuadrantOption } from '../components/DataPoints/DataPointInfoBox';

export interface BoundaryDetectionConfig {
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  midpoint: Midpoint;
  apostlesZoneSize: number;
  terroristsZoneSize: number;
  showNearApostles: boolean;
  showSpecialZones: boolean;
}

export class BoundaryDetectionService {
  /**
   * Check if a point is on the boundary of a special zone
   */
  static isPointOnSpecialZoneBoundary(
    point: DataPoint,
    specialZone: 'apostles' | 'terrorists',
    config: BoundaryDetectionConfig
  ): boolean {
    const boundaries = calculateSpecialZoneBoundaries(
      config.apostlesZoneSize,
      config.terroristsZoneSize,
      config.satisfactionScale,
      config.loyaltyScale
    );
    
    if (specialZone === 'apostles') {
      const apostlesMinSat = boundaries.apostles.edgeVertixSat;
      const apostlesMinLoy = boundaries.apostles.edgeVertixLoy;
      
      // Point is on apostles boundary if it's exactly at the apostles zone edge
      return (point.satisfaction === apostlesMinSat && point.loyalty >= apostlesMinLoy) ||
             (point.satisfaction >= apostlesMinSat && point.loyalty === apostlesMinLoy);
    } else if (specialZone === 'terrorists') {
      const terroristsMaxSat = boundaries.terrorists.edgeVertixSat;
      const terroristsMaxLoy = boundaries.terrorists.edgeVertixLoy;
      
      // Point is on terrorists boundary if it's exactly at the terrorists zone edge
      return (point.satisfaction === terroristsMaxSat && point.loyalty <= terroristsMaxLoy) ||
             (point.satisfaction <= terroristsMaxSat && point.loyalty === terroristsMaxLoy);
    }
    
    return false;
  }

  /**
   * Get boundary options for reassignment - reactive to zone changes
   * This is the most complex logic in the system, handling precise boundary detection
   */
  static getBoundaryOptions(
    point: DataPoint,
    config: BoundaryDetectionConfig,
    getQuadrantForPoint: (point: DataPoint) => QuadrantType,
    getNaturalQuadrantForPoint: (point: DataPoint) => QuadrantType,
    getDisplayNameForQuadrant: (quadrant: QuadrantType) => string,
    isPointInSpecialZone: (point: DataPoint) => boolean
  ): QuadrantOption[] {
    const options: QuadrantOption[] = [];
    const currentQuadrant = getQuadrantForPoint(point);
    const maxSat = parseInt(config.satisfactionScale.split('-')[1]);
    const maxLoy = parseInt(config.loyaltyScale.split('-')[1]);
    
    
    // Helper function to add option
    const addOption = (quadrant: QuadrantType) => {
      const displayName = getDisplayNameForQuadrant(quadrant);
      let color = '#666666'; // default
      
      // Color mapping based on DataPointRenderer
      switch (quadrant) {
        case 'apostles':
        case 'near_apostles':
        case 'loyalists':
          color = '#4CAF50';
          break;
        case 'terrorists':
        case 'defectors':
          color = '#CC0000';
          break;
        case 'mercenaries':
          color = '#F7B731';
          break;
        case 'hostages':
          color = '#3A6494';
          break;
        case 'neutral':
          color = '#9E9E9E'; // Gray color for neutral
          break;
      }
      
      options.push({ group: displayName, color });
    };
    
        // PRIORITY 1: Midpoint intersection (highest priority)
        if (point.satisfaction === config.midpoint.sat && point.loyalty === config.midpoint.loy) {
          addOption('neutral');
          addOption('loyalists');
          addOption('mercenaries');
          addOption('hostages');
          addOption('defectors');
          return options;
        }
    
    // PRIORITY 2: Special zone boundaries with early return
    if (currentQuadrant === 'near_apostles') {
      const neighbors = new Set<QuadrantType>();
      
      if (config.showSpecialZones) {
        const boundaries = calculateSpecialZoneBoundaries(
          config.apostlesZoneSize,
          config.terroristsZoneSize,
          config.satisfactionScale,
          config.loyaltyScale
        );
        
        if (currentQuadrant === 'near_apostles') {
          // Near-apostles: use same simple boundary detection
          neighbors.add('near_apostles'); // Keep current
          
          // Test 4 half-segment positions to see what quadrants are adjacent
          const testPositions = [
            { sat: point.satisfaction + 0.25, loy: point.loyalty },     // right
            { sat: point.satisfaction - 0.25, loy: point.loyalty },     // left
            { sat: point.satisfaction, loy: point.loyalty + 0.25 },     // up
            { sat: point.satisfaction, loy: point.loyalty - 0.25 }      // down
          ];
          
          testPositions.forEach(testPos => {
            // Only test if position is within grid bounds
            if (testPos.sat >= 1 && testPos.sat <= maxSat && 
                testPos.loy >= 1 && testPos.loy <= maxLoy) {
              
              const testPoint: DataPoint = {
                ...point,
                id: `test_${Math.random()}`,
                satisfaction: testPos.sat,
                loyalty: testPos.loy
              };
              
              const neighborQuadrant = getNaturalQuadrantForPoint(testPoint);
              
              // If adjacent position is in a different quadrant, point is on boundary
              if (neighborQuadrant !== 'near_apostles') {
                neighbors.add(neighborQuadrant);
              }
            }
          });
        }
      }
      
          // Early return prevents standard logic interference
          Array.from(neighbors).forEach(quadrant => addOption(quadrant));
          return options;
    }
    
    // PRIORITY 3: Simple boundary detection - test 4 adjacent positions
    const standardNeighbors = new Set<QuadrantType>();
    standardNeighbors.add(currentQuadrant); // Always include current quadrant
    
    // Test 4 half-segment positions to see if point is on a boundary
    const testPositions = [
      { sat: point.satisfaction + 0.25, loy: point.loyalty },     // right
      { sat: point.satisfaction - 0.25, loy: point.loyalty },     // left
      { sat: point.satisfaction, loy: point.loyalty + 0.25 },     // up
      { sat: point.satisfaction, loy: point.loyalty - 0.25 }      // down
    ];
    
    testPositions.forEach(testPos => {
      // Only test if position is within grid bounds
      if (testPos.sat >= 1 && testPos.sat <= maxSat && 
          testPos.loy >= 1 && testPos.loy <= maxLoy) {
        
        const testPoint: DataPoint = {
          ...point,
          id: `test_${Math.random()}`,
          satisfaction: testPos.sat,
          loyalty: testPos.loy
        };
        
        const neighborQuadrant = getNaturalQuadrantForPoint(testPoint);
        
        // If adjacent position is in a different quadrant, point is on boundary
        if (neighborQuadrant !== currentQuadrant) {
          standardNeighbors.add(neighborQuadrant);
        }
      }
    });
    
        // PRIORITY 4: Grid edge logic (only for standard quadrant points)
        const isOnGridEdge = point.satisfaction === 1 || point.satisfaction === maxSat ||
                            point.loyalty === 1 || point.loyalty === maxLoy;
        
        if (isOnGridEdge && !isPointInSpecialZone(point)) {
      
      // Test inward from edge to find adjacent zones
      const inwardDirections = [];
      if (point.satisfaction === 1) inwardDirections.push({ sat: 0.1, loy: 0 });
      if (point.satisfaction === maxSat) inwardDirections.push({ sat: -0.1, loy: 0 });
      if (point.loyalty === 1) inwardDirections.push({ sat: 0, loy: 0.1 });
      if (point.loyalty === maxLoy) inwardDirections.push({ sat: 0, loy: -0.1 });
      
      inwardDirections.forEach(direction => {
        const testPoint: DataPoint = {
          ...point,
          id: `test_edge_${Math.random()}`,
          satisfaction: point.satisfaction + direction.sat,
          loyalty: point.loyalty + direction.loy
        };
        
        const neighborQuadrant = getNaturalQuadrantForPoint(testPoint);
        if (neighborQuadrant !== currentQuadrant) {
          standardNeighbors.add(neighborQuadrant);
        }
      });
    }
    
        // Convert neighbors to options
        Array.from(standardNeighbors).forEach(quadrant => addOption(quadrant));
        
        return options;
  }


  /**
   * Check if a point is on the boundary between standard quadrants
   */
  static isPointOnStandardQuadrantBoundary(
    point: DataPoint,
    config: BoundaryDetectionConfig,
    getNaturalQuadrantForPoint: (point: DataPoint) => QuadrantType
  ): boolean {
    const { midpoint } = config;
    
    // Check if point is exactly on the midpoint (intersection of all quadrants)
    if (point.satisfaction === midpoint.sat && point.loyalty === midpoint.loy) {
      return true;
    }
    
    // Check if point is on the horizontal boundary (same satisfaction as midpoint)
    if (point.satisfaction === midpoint.sat) {
      return true;
    }
    
    // Check if point is on the vertical boundary (same loyalty as midpoint)
    if (point.loyalty === midpoint.loy) {
      return true;
    }
    
    // Check if point is on the diagonal boundary (equal distance from midpoint)
    const satDistance = Math.abs(point.satisfaction - midpoint.sat);
    const loyDistance = Math.abs(point.loyalty - midpoint.loy);
    
    // If the point is exactly 1 unit away from midpoint in both directions, it's on a diagonal boundary
    if (satDistance === 1 && loyDistance === 1) {
      return true;
    }
    
    // Check if point is on the edge of the grid (boundary with grid edges)
    const maxSat = parseInt(config.satisfactionScale.split('-')[1]);
    const maxLoy = parseInt(config.loyaltyScale.split('-')[1]);
    
    if (point.satisfaction === 1 || point.satisfaction === maxSat ||
        point.loyalty === 1 || point.loyalty === maxLoy) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a quadrant is still adjacent to a point's current position
   */
  static isQuadrantAdjacentToPoint(
    point: DataPoint,
    quadrant: QuadrantType,
    config: BoundaryDetectionConfig,
    getQuadrantForPoint: (point: DataPoint) => QuadrantType,
    getNaturalQuadrantForPoint: (point: DataPoint) => QuadrantType,
    getDisplayNameForQuadrant: (quadrant: QuadrantType) => string,
    isPointInSpecialZone: (point: DataPoint) => boolean
  ): boolean {
    // Get boundary options for this point to see what quadrants are adjacent
    const boundaryOptions = this.getBoundaryOptions(
      point,
      config,
      getQuadrantForPoint,
      getNaturalQuadrantForPoint,
      getDisplayNameForQuadrant,
      isPointInSpecialZone
    );
    const adjacentQuadrants = boundaryOptions.map(option => option.group);
    
    // Check if the manually assigned quadrant is in the list of adjacent quadrants
    const isAdjacent = adjacentQuadrants.includes(quadrant);
    
    console.log(`🔍 Point (${point.satisfaction},${point.loyalty}) adjacent quadrants: [${adjacentQuadrants.join(', ')}], manual=${quadrant}, isAdjacent=${isAdjacent}`);
    
    return isAdjacent;
  }

  /**
   * Determine if a point should be auto-reassigned
   */
  static shouldAutoReassignPoint(
    point: DataPoint,
    manualQuadrant: QuadrantType,
    naturalQuadrant: QuadrantType,
    config: BoundaryDetectionConfig,
    getQuadrantForPoint: (point: DataPoint) => QuadrantType,
    getNaturalQuadrantForPoint: (point: DataPoint) => QuadrantType,
    getDisplayNameForQuadrant: (quadrant: QuadrantType) => string,
    isPointInSpecialZone: (point: DataPoint) => boolean
  ): boolean {
    // Don't reassign if natural and manual are the same
    if (manualQuadrant === naturalQuadrant) return false;

    // Calculate distance from midpoint to determine if point is "clearly" in a quadrant
    const distanceFromMidpoint = Math.sqrt(
      Math.pow(point.satisfaction - config.midpoint.sat, 2) + 
      Math.pow(point.loyalty - config.midpoint.loy, 2)
    );

    // Check if the manually assigned quadrant is still adjacent to this point
    const isManualQuadrantStillAdjacent = this.isQuadrantAdjacentToPoint(
      point,
      manualQuadrant,
      config,
      getQuadrantForPoint,
      getNaturalQuadrantForPoint,
      getDisplayNameForQuadrant,
      isPointInSpecialZone
    );
    
    // Check if the point is now clearly in its natural quadrant (not on boundaries)
    const isInMiddleOfNaturalQuadrant = distanceFromMidpoint > 1.5; // Slightly more aggressive threshold
    
    // Auto-reassign if:
    // 1. The manually assigned quadrant is no longer adjacent to the point, OR
    // 2. The point is clearly in the middle of its natural quadrant
    const shouldReassign = !isManualQuadrantStillAdjacent || isInMiddleOfNaturalQuadrant;
    
    console.log(`🔍 Point (${point.satisfaction},${point.loyalty}): manual=${manualQuadrant}, natural=${naturalQuadrant}, distance=${distanceFromMidpoint.toFixed(2)}`);
    console.log(`🔍 Manual quadrant still adjacent: ${isManualQuadrantStillAdjacent}, In middle of natural: ${isInMiddleOfNaturalQuadrant}, shouldReassign: ${shouldReassign}`);
    
    return shouldReassign;
  }
}
