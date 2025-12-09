// src\components\reporting\services\LateralProximityCalculator.ts

import { DataPoint } from '../../../types/base';

export interface LateralProximityResult {
  isProximity: boolean;
  proximityTargets: string[];
  minDistance: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
}

export class LateralProximityCalculator {
  private satisfactionScale: string;
  private loyaltyScale: string;
  private midpoint: { sat: number; loy: number };

  constructor(
    satisfactionScale: string,
    loyaltyScale: string, 
    midpoint: { sat: number; loy: number }
  ) {
    this.satisfactionScale = satisfactionScale;
    this.loyaltyScale = loyaltyScale;
    this.midpoint = midpoint;
  }

  /**
   * Get scale boundaries from scale strings
   */
  private getScaleBoundaries() {
    const satParts = this.satisfactionScale.split('-');
    const loyParts = this.loyaltyScale.split('-');
    
    return {
      satMin: parseInt(satParts[0]),
      satMax: parseInt(satParts[1]),
      loyMin: parseInt(loyParts[0]),
      loyMax: parseInt(loyParts[1])
    };
  }

  /**
   * Get space cap limit based on available positions (same logic as diagonal)
   */
  private getSpaceCapLimit(availablePositions: number): number {
    if (availablePositions === 0) {
      return 0; // No positions available
    } else if (availablePositions === 1) {
      return 1; // Use the only position available
    } else if (availablePositions === 2) {
      return 1; // 1 out of 2
    } else if (availablePositions === 3) {
      return 1; // 1 out of 3
    } else {
      return 2; // 2 out of 4+
    }
  }

  /**
   * Calculate potential search area for a quadrant (Step 1 of two-step process)
   */
  private getPotentialSearchArea(fromQuadrant: string, toQuadrant: string): { satPositions: number[], loyPositions: number[] } {
    const boundaries = this.getScaleBoundaries();
    
    // Step 1: Calculate potential space for the source quadrant
    let potentialSatRange: number[];
    let potentialLoyRange: number[];

    switch (fromQuadrant) {
      case 'defectors':
        // Defectors potential positions: sat ∈ {1,2,3}, loy ∈ {1,2,3}
        potentialSatRange = Array.from({length: Math.floor(this.midpoint.sat) - boundaries.satMin + 1}, (_, i) => boundaries.satMin + i);
        potentialLoyRange = Array.from({length: Math.floor(this.midpoint.loy) - boundaries.loyMin + 1}, (_, i) => boundaries.loyMin + i);
        break;
      case 'mercenaries':
        // Mercenaries potential positions: sat ∈ {3,4,5}, loy ∈ {1,2,3}
        potentialSatRange = Array.from({length: boundaries.satMax - Math.floor(this.midpoint.sat) + 1}, (_, i) => Math.floor(this.midpoint.sat) + i);
        potentialLoyRange = Array.from({length: Math.floor(this.midpoint.loy) - boundaries.loyMin + 1}, (_, i) => boundaries.loyMin + i);
        break;
      case 'loyalists':
        // Loyalists potential positions: sat ∈ {3,4,5}, loy ∈ {3,4,5}
        potentialSatRange = Array.from({length: boundaries.satMax - Math.floor(this.midpoint.sat) + 1}, (_, i) => Math.floor(this.midpoint.sat) + i);
        potentialLoyRange = Array.from({length: boundaries.loyMax - Math.floor(this.midpoint.loy) + 1}, (_, i) => Math.floor(this.midpoint.loy) + i);
        break;
      case 'hostages':
        // Hostages potential positions: sat ∈ {1,2,3}, loy ∈ {3,4,5}
        potentialSatRange = Array.from({length: Math.floor(this.midpoint.sat) - boundaries.satMin + 1}, (_, i) => boundaries.satMin + i);
        potentialLoyRange = Array.from({length: boundaries.loyMax - Math.floor(this.midpoint.loy) + 1}, (_, i) => Math.floor(this.midpoint.loy) + i);
        break;
      default:
        return { satPositions: [], loyPositions: [] };
    }

    // Step 2: Determine which dimension is relevant for distance calculation
    let relevantDimension: 'sat' | 'loy';
    let relevantRange: number[];
    let irrelevantRange: number[];
    
    switch (fromQuadrant) {
      case 'mercenaries':
        if (toQuadrant === 'defectors') {
          relevantDimension = 'sat'; // Horizontal distance
          relevantRange = potentialSatRange;
          irrelevantRange = potentialLoyRange;
        } else { // loyalists
          relevantDimension = 'loy'; // Vertical distance
          relevantRange = potentialLoyRange;
          irrelevantRange = potentialSatRange;
        }
        break;
      case 'loyalists':
        if (toQuadrant === 'mercenaries') {
          relevantDimension = 'loy'; // Vertical distance
          relevantRange = potentialLoyRange;
          irrelevantRange = potentialSatRange;
        } else { // hostages
          relevantDimension = 'sat'; // Horizontal distance
          relevantRange = potentialSatRange;
          irrelevantRange = potentialLoyRange;
        }
        break;
      case 'hostages':
        if (toQuadrant === 'loyalists') {
          relevantDimension = 'sat'; // Horizontal distance
          relevantRange = potentialSatRange;
          irrelevantRange = potentialLoyRange;
        } else { // defectors
          relevantDimension = 'loy'; // Vertical distance
          relevantRange = potentialLoyRange;
          irrelevantRange = potentialSatRange;
        }
        break;
      case 'defectors':
        if (toQuadrant === 'hostages') {
          relevantDimension = 'loy'; // Vertical distance
          relevantRange = potentialLoyRange;
          irrelevantRange = potentialSatRange;
        } else { // mercenaries
          relevantDimension = 'sat'; // Horizontal distance
          relevantRange = potentialSatRange;
          irrelevantRange = potentialLoyRange;
        }
        break;
      default:
        return { satPositions: [], loyPositions: [] };
    }
    
    // Step 3: Apply space cap only to relevant dimension
    const relevantCap = this.getSpaceCapLimit(relevantRange.length);
    
    if (relevantCap === 0) {
      return { satPositions: [], loyPositions: [] };
    }
    
    // Get positions closest to boundary for relevant dimension
    const relevantPositions = relevantRange
      .map(pos => ({ 
        pos, 
        distance: relevantDimension === 'sat' 
          ? Math.abs(pos - this.midpoint.sat) 
          : Math.abs(pos - this.midpoint.loy) 
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, relevantCap) // Apply space cap to relevant dimension
      .filter(p => p.distance <= 2.0) // Then filter by distance threshold
      .map(p => p.pos);
    
    // Use all positions for irrelevant dimension (no space cap, no distance filter)
    // The irrelevant dimension is only used to define the search area, not filtered by distance
    const irrelevantPositions = irrelevantRange;
    
    // Return in correct order
    const satPositions = relevantDimension === 'sat' ? relevantPositions : irrelevantPositions;
    const loyPositions = relevantDimension === 'loy' ? relevantPositions : irrelevantPositions;

    console.log(`   📏 Lateral potential ranges: sat=[${potentialSatRange.join(',')}], loy=[${potentialLoyRange.join(',')}]`);
    console.log(`   📏 Lateral debug: fromQuadrant=${fromQuadrant}, toQuadrant=${toQuadrant}, relevantDimension=${relevantDimension}`);
    console.log(`   📏 Lateral debug: relevantPositions=[${relevantPositions.join(',')}], irrelevantPositions=[${irrelevantPositions.join(',')}]`);
    console.log(`   📏 Lateral search area: sat=[${satPositions.join(',')}], loy=[${loyPositions.join(',')}]`);

    return { satPositions, loyPositions };
  }

  /**
   * Calculate lateral distance to target quadrant boundary
   */
  private calculateLateralDistanceToQuadrant(customer: DataPoint, targetQuadrant: string): number {
    switch (targetQuadrant) {
      case 'defectors':
        // Distance to defectors boundary (satisfaction boundary for mercenaries, loyalty boundary for hostages)
        if (customer.satisfaction > this.midpoint.sat) {
          // From mercenaries: horizontal distance to satisfaction boundary
          return Math.abs(customer.satisfaction - this.midpoint.sat);
        } else {
          // From hostages: vertical distance to loyalty boundary
          return Math.abs(customer.loyalty - this.midpoint.loy);
        }
      case 'mercenaries':
        // Distance to mercenaries boundary (loyalty boundary for loyalists, satisfaction boundary for defectors)
        if (customer.loyalty > this.midpoint.loy) {
          // From loyalists: vertical distance to loyalty boundary
          return Math.abs(customer.loyalty - this.midpoint.loy);
        } else {
          // From defectors: horizontal distance to satisfaction boundary
          return Math.abs(customer.satisfaction - this.midpoint.sat);
        }
      case 'loyalists':
        // Distance to loyalists boundary (satisfaction boundary for hostages, loyalty boundary for mercenaries)
        if (customer.satisfaction < this.midpoint.sat) {
          // From hostages: horizontal distance to satisfaction boundary
          return Math.abs(customer.satisfaction - this.midpoint.sat);
        } else {
          // From mercenaries: vertical distance to loyalty boundary
          return Math.abs(customer.loyalty - this.midpoint.loy);
        }
      case 'hostages':
        // Distance to hostages boundary (loyalty boundary for defectors, satisfaction boundary for loyalists)
        if (customer.loyalty < this.midpoint.loy) {
          // From defectors: vertical distance to loyalty boundary
          return Math.abs(customer.loyalty - this.midpoint.loy);
        } else {
          // From loyalists: horizontal distance to satisfaction boundary
          return Math.abs(customer.satisfaction - this.midpoint.sat);
        }
      default:
        return Number.MAX_VALUE;
    }
  }

  /**
   * Check if customer is within potential search area for lateral proximity
   */
  private isWithinPotentialSearchArea(customer: DataPoint, fromQuadrant: string, toQuadrant: string): boolean {
    const { satPositions, loyPositions } = this.getPotentialSearchArea(fromQuadrant, toQuadrant);
    
    if (satPositions.length === 0 || loyPositions.length === 0) {
      return false;
    }

    // Check if customer is in the search area
    const isInSatRange = satPositions.includes(customer.satisfaction);
    const isInLoyRange = loyPositions.includes(customer.loyalty);

    if (!isInSatRange || !isInLoyRange) {
      console.log(`   📏 Lateral search area check: ${customer.id} at (${customer.satisfaction},${customer.loyalty}) - sat: ${isInSatRange} (${customer.satisfaction} in [${satPositions.join(',')}]), loy: ${isInLoyRange} (${customer.loyalty} in [${loyPositions.join(',')}])`);
    }

    return isInSatRange && isInLoyRange;
  }

  /**
   * Get lateral proximity classification for a specific quadrant relationship
   */
  getLateralProximityClassification(point: DataPoint, threshold: number, currentQuadrant: string): LateralProximityResult {
    const proximityTargets: string[] = [];
    let minDistance = Number.MAX_VALUE;

    // Determine which adjacent quadrants to check based on current quadrant
    let adjacentQuadrants: string[] = [];
    
    switch (currentQuadrant) {
      case 'loyalists':
        adjacentQuadrants = ['mercenaries', 'hostages'];
        break;
      case 'mercenaries':
        adjacentQuadrants = ['loyalists', 'defectors'];
        break;
      case 'hostages':
        adjacentQuadrants = ['loyalists', 'defectors'];
        break;
      case 'defectors':
        adjacentQuadrants = ['mercenaries', 'hostages'];
        break;
      default:
        return {
          isProximity: false,
          proximityTargets: [],
          minDistance: Number.MAX_VALUE,
          riskLevel: 'LOW'
        };
    }

    // Check each adjacent quadrant
    adjacentQuadrants.forEach(targetQuadrant => {
      // Step 1: Check if customer is in potential search area
      if (this.isWithinPotentialSearchArea(point, currentQuadrant, targetQuadrant)) {
        // Step 2: Calculate lateral distance to target quadrant
        const distance = this.calculateLateralDistanceToQuadrant(point, targetQuadrant);
        
        console.log(`   📏 LATERAL DISTANCE: Customer ${point.id} at (${point.satisfaction},${point.loyalty}) to ${targetQuadrant} boundary = ${distance}`);
        
        // Step 3: Check if within distance threshold
        if (distance <= threshold) {
          proximityTargets.push(targetQuadrant);
          minDistance = Math.min(minDistance, distance);
          console.log(`   ✅ LATERAL PROXIMITY: Customer ${point.id} qualifies for ${targetQuadrant} (distance: ${distance})`);
        } else {
          console.log(`   ❌ LATERAL PROXIMITY: Customer ${point.id} too far from ${targetQuadrant} (distance: ${distance} > threshold: ${threshold})`);
        }
      } else {
        console.log(`   ❌ LATERAL SEARCH AREA: Customer ${point.id} not in potential search area for ${targetQuadrant}`);
      }
    });

    // Determine risk level
    let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' = 'LOW';
    if (proximityTargets.length > 0) {
      if (minDistance <= 0.5) {
        riskLevel = 'HIGH';
      } else if (minDistance <= 1.0) {
        riskLevel = 'MODERATE';
      } else {
        riskLevel = 'LOW';
      }
    }

    return {
      isProximity: proximityTargets.length > 0,
      proximityTargets,
      minDistance: minDistance === Number.MAX_VALUE ? 0 : minDistance,
      riskLevel
    };
  }
}
