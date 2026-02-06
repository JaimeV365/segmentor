// src\components\reporting\services\EnhancedProximityClassifier.ts

import { DataPoint } from '../../../types/base';
import type { QuadrantType } from '../../visualization/context/QuadrantAssignmentContext';
import { DistanceCalculator } from './DistanceCalculator';
import { LateralProximityCalculator } from './LateralProximityCalculator';

export interface CustomerProximityDetail {
  id: string;
  name: string;
  satisfaction: number;
  loyalty: number;
  distanceFromBoundary: number;
  currentQuadrant: string;
  proximityTargets: string[];
  riskScore: number; // 0-100 based on distance
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
}

export interface ProximityDetail {
  customerCount: number;
  positionCount: number; 
  averageDistance: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  customers: CustomerProximityDetail[];
}

export interface CrossroadsCustomer {
  id: string;
  name: string;
  satisfaction: number;
  loyalty: number;
  currentQuadrant: string;
  proximityRelationships: string[];
  strategicValue: 'HIGH' | 'MODERATE' | 'LOW';
  riskScore: number;
}

export interface ProximityAnalysisResult {
  // Core quadrant relationships (lateral movements)
  analysis: {
    loyalists_close_to_mercenaries: ProximityDetail;
    loyalists_close_to_hostages: ProximityDetail;
    mercenaries_close_to_loyalists: ProximityDetail;
    mercenaries_close_to_defectors: ProximityDetail;
    hostages_close_to_loyalists: ProximityDetail;
    hostages_close_to_defectors: ProximityDetail;
    defectors_close_to_mercenaries: ProximityDetail;
    defectors_close_to_hostages: ProximityDetail;
    // Diagonal proximity relationships (crisis movements)
    loyalists_close_to_defectors: ProximityDetail;    // "Crisis diagonal" - complete collapse
    mercenaries_close_to_hostages: ProximityDetail;   // "Disappointment diagonal" 
    hostages_close_to_mercenaries: ProximityDetail;   // "Switching diagonal"
    defectors_close_to_loyalists: ProximityDetail;    // "Redemption diagonal"
    // Special zone proximity relationships
    loyalists_close_to_apostles: ProximityDetail;
    loyalists_close_to_near_apostles: ProximityDetail;
    near_apostles_close_to_apostles: ProximityDetail;
    defectors_close_to_terrorists: ProximityDetail;
  };
  
  // Special zones when enabled (legacy support)
  specialZones?: {
    apostles_close_to_loyalists: ProximityDetail;
    near_apostles_close_to_loyalists: ProximityDetail;
    terrorists_close_to_defectors: ProximityDetail;
    // Add near_terrorists when implemented
  };
  
  // Summary metrics
  summary: {
    totalProximityCustomers: number;
    totalProximityPositions: number;
    averageRiskScore: number;
    crisisIndicators: string[];
    opportunityIndicators: string[];
  };
  
  // Crossroads customers (appearing in multiple proximity relationships)
  crossroads: {
    customers: CrossroadsCustomer[];
    totalCount: number;
    highValueCount: number;
  };
  
  // Configuration
  settings: {
    proximityThreshold: number;
    showSpecialZones: boolean;
    totalCustomers: number;
    isAvailable: boolean;
    unavailabilityReason?: string;
  };
}

export class EnhancedProximityClassifier {
  private satisfactionScale: string;
  private loyaltyScale: string;
  private midpoint: { sat: number; loy: number };
  private apostlesZoneSize: number;
  private terroristsZoneSize: number;
  private lateralProximityCalculator: LateralProximityCalculator;

  constructor(
    satisfactionScale: string,
    loyaltyScale: string,
    midpoint: { sat: number; loy: number },
    apostlesZoneSize: number = 1,
    terroristsZoneSize: number = 1
  ) {
    this.satisfactionScale = satisfactionScale;
    this.loyaltyScale = loyaltyScale;
    this.midpoint = midpoint;
    this.apostlesZoneSize = apostlesZoneSize;
    this.terroristsZoneSize = terroristsZoneSize;
    this.lateralProximityCalculator = new LateralProximityCalculator(satisfactionScale, loyaltyScale, midpoint);
  }

  private getDistanceCalculator(): DistanceCalculator {
    return new DistanceCalculator(this.satisfactionScale, this.loyaltyScale, this.midpoint);
  }

  /**
   * Perform comprehensive proximity analysis
   */
  analyzeProximity(
    data: DataPoint[],
    getQuadrantForPoint: (point: DataPoint) => QuadrantType,
    isPremium: boolean = false,
    userThreshold?: number,
    showSpecialZones: boolean = false,
    showNearApostles: boolean = false
  ): ProximityAnalysisResult {
    
    console.log('🔍 EnhancedProximityClassifier: Starting proximity analysis');
    console.log(`   - Data points: ${data.length}, Midpoint: (${this.midpoint.sat}, ${this.midpoint.loy})`);
    
    console.log('🎯 EnhancedProximityClassifier.analyzeProximity called with:', {
      dataLength: data.length,
      isPremium,
      userThreshold,
      showSpecialZones,
      showNearApostles
    });

    // Check if proximity analysis is available for this scale
    const distanceCalculator = this.getDistanceCalculator();
    if (!distanceCalculator.isProximityAvailable()) {
      const reason = distanceCalculator.getUnavailabilityReason();
      console.log('❌ Proximity unavailable:', reason);
      return this.createEmptyResult(data.length, reason || 'Scale too small');
    }

    // Determine proximity threshold
    const threshold = userThreshold || distanceCalculator.getDefaultThreshold();
    
    console.log('🔍 THRESHOLD CALCULATION:', {
      userThreshold,
      defaultThreshold: threshold,
      directionalThresholds: distanceCalculator.getDirectionalThresholds(),
      midpoint: this.midpoint
    });
    
    // Group customers by their context-assigned quadrants
    const groupedCustomers = this.groupCustomersByQuadrant(data, getQuadrantForPoint);
    
    console.log('📊 Grouped customers:', {
      loyalists: groupedCustomers.loyalists.length,
      mercenaries: groupedCustomers.mercenaries.length,
      hostages: groupedCustomers.hostages.length,
      defectors: groupedCustomers.defectors.length,
      apostles: groupedCustomers.apostles?.length || 0,
      near_apostles: groupedCustomers.near_apostles?.length || 0,
      terrorists: groupedCustomers.terrorists?.length || 0
    });

console.log('🚨 About to call analyzeQuadrantProximity methods - threshold:', threshold);
console.log('🚨 Grouped customers available:', {
  loyalists: groupedCustomers.loyalists.length,
  mercenaries: groupedCustomers.mercenaries.length
});

    // Analyze core quadrant relationships
    const analysis = {
      loyalists_close_to_mercenaries: this.analyzeQuadrantProximity(
        groupedCustomers.loyalists, 'loyalists', 'mercenaries', threshold
      ),
      loyalists_close_to_hostages: this.analyzeQuadrantProximity(
        groupedCustomers.loyalists, 'loyalists', 'hostages', threshold
      ),
      mercenaries_close_to_loyalists: this.analyzeQuadrantProximity(
        groupedCustomers.mercenaries, 'mercenaries', 'loyalists', threshold
      ),
      mercenaries_close_to_defectors: this.analyzeQuadrantProximity(
        groupedCustomers.mercenaries, 'mercenaries', 'defectors', threshold
      ),
      hostages_close_to_loyalists: this.analyzeQuadrantProximity(
        groupedCustomers.hostages, 'hostages', 'loyalists', threshold
      ),
      hostages_close_to_defectors: this.analyzeQuadrantProximity(
        groupedCustomers.hostages, 'hostages', 'defectors', threshold
      ),
      defectors_close_to_mercenaries: this.analyzeQuadrantProximity(
        groupedCustomers.defectors, 'defectors', 'mercenaries', threshold
      ),
      defectors_close_to_hostages: this.analyzeQuadrantProximity(
        groupedCustomers.defectors, 'defectors', 'hostages', threshold
      ),
      // Diagonal proximity relationships (crisis movements)
      loyalists_close_to_defectors: (() => {
        console.log('🔥🔥🔥 CALLING analyzeDiagonalProximity: loyalists -> defectors');
        return this.analyzeDiagonalProximity(
          groupedCustomers.loyalists, 'loyalists', 'defectors', threshold, data, getQuadrantForPoint
        );
      })(),
      mercenaries_close_to_hostages: (() => {
        console.log('🔥🔥🔥 CALLING analyzeDiagonalProximity: mercenaries -> hostages');
        return this.analyzeDiagonalProximity(
          groupedCustomers.mercenaries, 'mercenaries', 'hostages', threshold, data, getQuadrantForPoint
        );
      })(),
      hostages_close_to_mercenaries: (() => {
        console.log('🔥🔥🔥 CALLING analyzeDiagonalProximity: hostages -> mercenaries');
        return this.analyzeDiagonalProximity(
          groupedCustomers.hostages, 'hostages', 'mercenaries', threshold, data, getQuadrantForPoint
        );
      })(),
      defectors_close_to_loyalists: (() => {
        console.log('🔥🔥🔥 CALLING analyzeDiagonalProximity: defectors -> loyalists');
        return this.analyzeDiagonalProximity(
          groupedCustomers.defectors, 'defectors', 'loyalists', threshold, data, getQuadrantForPoint
        );
      })(),
      // Special zone proximity relationships - only for special zone to special zone
      loyalists_close_to_apostles: (() => {
        console.log('🔍 CALCULATING loyalists_close_to_apostles:', {
          loyalistsCount: groupedCustomers.loyalists?.length || 0,
          showSpecialZones,
          showNearApostles
        });
        return this.analyzeSpecialZoneProximity(
          groupedCustomers.loyalists, 'loyalists', 'apostles', showSpecialZones, showNearApostles
        );
      })(),
      loyalists_close_to_near_apostles: (() => {
        console.log('🔍 CALCULATING loyalists_close_to_near_apostles:', {
          loyalistsCount: groupedCustomers.loyalists?.length || 0,
          showSpecialZones,
          showNearApostles
        });
        return this.analyzeSpecialZoneProximity(
          groupedCustomers.loyalists, 'loyalists', 'near_apostles', showSpecialZones, showNearApostles
        );
      })(),
      near_apostles_close_to_apostles: (() => {
        console.log('🔍 CALCULATING near_apostles_close_to_apostles:', {
          near_apostlesCount: groupedCustomers.near_apostles?.length || 0,
          showSpecialZones,
          showNearApostles
        });
        return this.analyzeSpecialZoneProximity(
          groupedCustomers.near_apostles, 'near_apostles', 'apostles', showSpecialZones, showNearApostles
        );
      })(),
      defectors_close_to_terrorists: (() => {
        console.log('🔍 CALCULATING defectors_close_to_terrorists:', {
          defectorsCount: groupedCustomers.defectors?.length || 0,
          showSpecialZones,
          showNearApostles
        });
        return this.analyzeSpecialZoneProximity(
          groupedCustomers.defectors, 'defectors', 'terrorists', showSpecialZones, showNearApostles
        );
      })()
    };

    // Analyze special zones if enabled - only for reverse relationships not in main analysis
    let specialZones: ProximityAnalysisResult['specialZones'] | undefined;
    if (showSpecialZones) {
      specialZones = {
        apostles_close_to_loyalists: this.analyzeSpecialZoneProximity(
          groupedCustomers.apostles || [], 'apostles', 'loyalists', showSpecialZones, showNearApostles
        ),
        near_apostles_close_to_loyalists: this.analyzeSpecialZoneProximity(
          groupedCustomers.near_apostles || [], 'near_apostles', 'loyalists', showSpecialZones, showNearApostles
        ),
        terrorists_close_to_defectors: this.analyzeSpecialZoneProximity(
          groupedCustomers.terrorists || [], 'terrorists', 'defectors', showSpecialZones, showNearApostles
        )
      };
    }

    // 🚨 DEBUG: Track exactly what goes into summary calculation
    console.log('🔍 DEBUGGING SUMMARY CALCULATION - About to call calculateSummaryMetrics');
    console.log('🔍 Analysis details:', {
      loyalists_close_to_mercenaries: analysis.loyalists_close_to_mercenaries.customerCount,
      loyalists_close_to_hostages: analysis.loyalists_close_to_hostages.customerCount,
      mercenaries_close_to_loyalists: analysis.mercenaries_close_to_loyalists.customerCount,
      mercenaries_close_to_defectors: analysis.mercenaries_close_to_defectors.customerCount,
      hostages_close_to_loyalists: analysis.hostages_close_to_loyalists.customerCount,
      hostages_close_to_defectors: analysis.hostages_close_to_defectors.customerCount,
      defectors_close_to_mercenaries: analysis.defectors_close_to_mercenaries.customerCount,
      defectors_close_to_hostages: analysis.defectors_close_to_hostages.customerCount,
    });
    
    if (specialZones) {
      console.log('🔍 Special zones details:', {
        apostles_close_to_loyalists: specialZones.apostles_close_to_loyalists?.customerCount || 0,
        near_apostles_close_to_loyalists: specialZones.near_apostles_close_to_loyalists?.customerCount || 0,
        terrorists_close_to_defectors: specialZones.terrorists_close_to_defectors?.customerCount || 0,
      });
    }

    // Calculate summary metrics
    const summary = this.calculateSummaryMetrics(analysis, specialZones);
    
    console.log('🚨 SUMMARY CALCULATION RESULT:', {
      totalProximityCustomers: summary.totalProximityCustomers,
      totalProximityPositions: summary.totalProximityPositions
    });

    // Detect crossroads customers (appearing in multiple proximity relationships)
    const crossroads = this.detectCrossroadsCustomers(analysis, specialZones);
    
    console.log('🚨 CROSSROADS DETECTION RESULT:', {
      totalCrossroads: crossroads.totalCount,
      highValueCrossroads: crossroads.highValueCount
    });

    const result: ProximityAnalysisResult = {
      analysis,
      specialZones,
      summary,
      crossroads,
      settings: {
        proximityThreshold: threshold,
        showSpecialZones,
        totalCustomers: data.length,
        isAvailable: true
      }
    };

    console.log('🚨 ENHANCED PROXIMITY CLASSIFIER FINAL RESULT:', {
      loyalists_close_to_apostles: result.analysis.loyalists_close_to_apostles.customerCount,
      loyalists_close_to_near_apostles: result.analysis.loyalists_close_to_near_apostles.customerCount,
      defectors_close_to_terrorists: result.analysis.defectors_close_to_terrorists.customerCount,
      showSpecialZones: result.settings.showSpecialZones,
      showNearApostles: showNearApostles
    });
    
    console.log(`🚀🚀🚀 ENHANCED PROXIMITY CLASSIFIER - analyzeProximity COMPLETE`);
    console.log(`🚀 FINAL RESULTS:`);
    console.log(`   - Total proximity customers: ${summary.totalProximityCustomers}`);
    console.log(`   - Total proximity positions: ${summary.totalProximityPositions}`);
    console.log(`   - Average risk score: ${summary.averageRiskScore}`);
    console.log(`   - Defectors close to loyalists: ${analysis.defectors_close_to_loyalists.customerCount} customers`);
    console.log(`   - Defectors close to loyalists positions:`, analysis.defectors_close_to_loyalists.customers.map(c => `(${c.satisfaction},${c.loyalty})`));
    
    console.log('🎯 Proximity Analysis Result:', result);
    return result;
  }

  /**
   * Group customers by their quadrant assignments from context
   * NO PROXIMITY FILTERING HERE - just group by context assignments
   */
  private groupCustomersByQuadrant(
    data: DataPoint[],
    getQuadrantForPoint: (point: DataPoint) => QuadrantType
  ): Record<string, DataPoint[]> {
    
    const groups: Record<string, DataPoint[]> = {
      loyalists: [],
      mercenaries: [],
      hostages: [],
      defectors: [],
      apostles: [],
      terrorists: [],
      near_apostles: [],
      near_terrorists: []
    };

    console.log('🔍 EnhancedProximityClassifier.groupCustomersByQuadrant - Starting grouping by context assignments (EXCLUDING midpoint customers)');

    data.forEach(point => {
      if (point.excluded) return;
      
      // CRITICAL FIX: Exclude customers exactly on midpoint from analytical counting
      const isOnMidpoint = point.satisfaction === this.midpoint.sat && point.loyalty === this.midpoint.loy;
      if (isOnMidpoint) {
        console.log(`🚫 EXCLUDING midpoint customer ${point.id} at (${point.satisfaction},${point.loyalty}) from analytical counting`);
        return; // Skip this customer - they're "fence-sitters" who could move in any direction
      }
      
      const quadrant = getQuadrantForPoint(point);
      
      console.log(`🎯 Point ${point.id} at (${point.satisfaction},${point.loyalty}) assigned to: ${quadrant}`);
      
      // Add customers from context (excluding midpoint customers)
      if (groups[quadrant]) {
        groups[quadrant].push(point);
      }
    });

    console.log('📊 Final context-based grouping (EXCLUDES midpoint customers from analytical counting):', {
      loyalists: groups.loyalists.length,
      mercenaries: groups.mercenaries.length,
      hostages: groups.hostages.length,
      defectors: groups.defectors.length,
      apostles: groups.apostles.length,
      near_apostles: groups.near_apostles.length,
      terrorists: groups.terrorists.length
    });

    return groups;
  }

  /**
   * Analyze proximity for a specific quadrant relationship
   */
  private analyzeQuadrantProximity(
  customers: DataPoint[],
  fromQuadrant: string,
  toQuadrant: string,
  threshold: number
): ProximityDetail {
  
  console.log(`🔍 analyzeQuadrantProximity: ${fromQuadrant} -> ${toQuadrant} | customers: ${customers.length} | threshold: ${threshold}`);
  
  if (customers.length === 0) {
    console.log('❌ No customers to analyze');
    return this.createEmptyProximityDetail();
  }

  // Add detailed logging for debugging
  console.log(`🔍 DEBUGGING ${fromQuadrant} -> ${toQuadrant}:`);
  customers.forEach((customer, index) => {
    console.log(`   Customer ${index + 1}: ${customer.id} at (${customer.satisfaction}, ${customer.loyalty})`);
  });

    // Filter customers who are close to the target quadrant
    const proximityCustomers: CustomerProximityDetail[] = [];
    const uniquePositions = new Set<string>();

    customers.forEach(customer => {
      // Use the new lateral proximity calculator for lateral relationships
      const classification = this.lateralProximityCalculator.getLateralProximityClassification(customer, threshold, fromQuadrant);
      
      console.log(`   🔍 Customer ${customer.id}: isProximity=${classification.isProximity}, targets=[${classification.proximityTargets.join(', ')}], looking for ${toQuadrant}`);
      
      // Check if this customer is close to the target quadrant
      if (classification.isProximity && classification.proximityTargets.includes(toQuadrant)) {
        console.log(`   ✅ Customer ${customer.id} matches proximity criteria for ${toQuadrant}`);
        const proximityDetail: CustomerProximityDetail = {
          id: customer.id,
          name: customer.name || '',
          satisfaction: customer.satisfaction,
          loyalty: customer.loyalty,
          distanceFromBoundary: classification.minDistance,
          currentQuadrant: fromQuadrant,
          proximityTargets: classification.proximityTargets,
          riskScore: this.calculateRiskScore(classification.minDistance, threshold),
          riskLevel: classification.riskLevel
        };

        proximityCustomers.push(proximityDetail);
        uniquePositions.add(`${customer.satisfaction},${customer.loyalty}`);
      }
    });

    // Calculate summary metrics
    const customerCount = proximityCustomers.length;
    const positionCount = uniquePositions.size;
    const averageDistance = customerCount > 0 
      ? proximityCustomers.reduce((sum, c) => sum + c.distanceFromBoundary, 0) / customerCount
      : 0;

    console.log(`📊 FINAL RESULT for ${fromQuadrant} -> ${toQuadrant}: ${customerCount} customers, ${positionCount} positions`);

    // Determine overall risk level
    const averageRiskScore = customerCount > 0
      ? proximityCustomers.reduce((sum, c) => sum + c.riskScore, 0) / customerCount
      : 0;

    let riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
    if (averageRiskScore >= 75) {
      riskLevel = 'HIGH';
    } else if (averageRiskScore >= 50) {
      riskLevel = 'MODERATE';
    } else {
      riskLevel = 'LOW';
    }

    return {
      customerCount,
      positionCount,
      averageDistance,
      riskLevel,
      customers: proximityCustomers.sort((a, b) => b.riskScore - a.riskScore) // Sort by highest risk first
    };
  }

  /**
   * Analyze diagonal proximity relationships (crisis movements)
   * Uses diagonal distance (Chebyshev distance) with 2.0 threshold and <50% space cap
   * INCLUDES boundary customers that can be reassigned to the source quadrant
   */
  private analyzeDiagonalProximity(
    customers: DataPoint[],
    fromQuadrant: string,
    toQuadrant: string,
    threshold: number,
    allData: DataPoint[] = [],
    getQuadrantForPoint: (point: DataPoint) => QuadrantType
  ): ProximityDetail {
    
    console.log(`🔍 Diagonal analysis: ${fromQuadrant} -> ${toQuadrant} (${customers.length} customers)`);
    
    // For diagonal proximity, we need to include boundary customers that can be reassigned
    const allCustomers = this.getAllCustomersIncludingBoundaries(fromQuadrant, allData, getQuadrantForPoint);
    
    if (allCustomers.length === 0) {
      return this.createEmptyProximityDetail();
    }

    // Filter customers who are close to the target quadrant using diagonal distance
    const proximityCustomers: CustomerProximityDetail[] = [];
    const uniquePositions = new Set<string>();

    allCustomers.forEach((customer) => {
      // Rule 1: Exclude midpoint customers
      const isOnMidpoint = customer.satisfaction === this.midpoint.sat && customer.loyalty === this.midpoint.loy;
      if (isOnMidpoint) {
        return;
      }

      // Rule 2: Check if customer is in the correct source quadrant
      const customerPosition = { sat: customer.satisfaction, loy: customer.loyalty };
      const isInSourceQuadrant = this.canBoundaryPositionBelongToQuadrant(customerPosition, fromQuadrant);
      
      if (!isInSourceQuadrant) {
        return;
      }

      // Rule 3: Calculate diagonal distance to target quadrant boundary
      const diagonalDistance = this.calculateDiagonalDistanceToQuadrant(customer, toQuadrant);
      
      // Rule 4: Check if this customer is within diagonal proximity threshold (2.0)
      const diagonalThreshold = 2.0;
      const meetsDistanceThreshold = diagonalDistance <= diagonalThreshold;
      
      // Rule 5: Check if customer is within the potential search area
      const isInSearchArea = this.isWithinPotentialSearchArea(customer, fromQuadrant, toQuadrant);
      
      const qualifies = meetsDistanceThreshold && isInSearchArea;
      
      // Debug logging for failing cases
      if (meetsDistanceThreshold && !isInSearchArea) {
        console.log(`   🔍 Customer ${customer.id} at (${customer.satisfaction},${customer.loyalty}) meets distance (${diagonalDistance}) but fails search area`);
      }
      
      if (qualifies) {
        const proximityDetail: CustomerProximityDetail = {
          id: customer.id,
          name: customer.name || '',
          satisfaction: customer.satisfaction,
          loyalty: customer.loyalty,
          distanceFromBoundary: diagonalDistance,
          currentQuadrant: fromQuadrant,
          proximityTargets: [toQuadrant],
          riskScore: this.calculateRiskScore(diagonalDistance, diagonalThreshold),
          riskLevel: this.calculateRiskLevel(diagonalDistance, diagonalThreshold)
        };

        proximityCustomers.push(proximityDetail);
        uniquePositions.add(`${customer.satisfaction},${customer.loyalty}`);
      }
    });

    const customerCount = proximityCustomers.length;
    const positionCount = uniquePositions.size;
    const averageDistance = customerCount > 0 
      ? proximityCustomers.reduce((sum, c) => sum + c.distanceFromBoundary, 0) / customerCount
      : 0;

    const averageRiskScore = customerCount > 0
      ? proximityCustomers.reduce((sum, c) => sum + c.riskScore, 0) / customerCount
      : 0;

    let riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
    if (averageRiskScore >= 75) {
      riskLevel = 'HIGH';
    } else if (averageRiskScore >= 50) {
      riskLevel = 'MODERATE';
    } else {
      riskLevel = 'LOW';
    }

    console.log(`   - Qualifying customers: ${customerCount}`);

    return {
      customerCount,
      positionCount,
      averageDistance,
      riskLevel,
      customers: proximityCustomers.sort((a, b) => b.riskScore - a.riskScore) // Sort by highest risk first
    };
  }

  /**
   * Calculate diagonal distance from customer to target quadrant boundary
   * Uses Chebyshev distance (max of sat_diff, loy_diff) to the midpoint boundary
   */
  private calculateDiagonalDistanceToQuadrant(customer: DataPoint, targetQuadrant: string): number {
    // For diagonal relationships, calculate distance to the midpoint boundary
    // The target quadrant boundary is always the midpoint for diagonal relationships
    const satDiff = Math.abs(customer.satisfaction - this.midpoint.sat);
    const loyDiff = Math.abs(customer.loyalty - this.midpoint.loy);
    
    // Diagonal distance: max(sat_diff, loy_diff) - each diagonal step counts as 1
    const distance = Math.max(satDiff, loyDiff);
    
    console.log(`   📐 DIAGONAL DISTANCE: Customer ${customer.id} at (${customer.satisfaction},${customer.loyalty}) to ${targetQuadrant} boundary (${this.midpoint.sat},${this.midpoint.loy}) = ${distance}`);
    
    return distance;
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
   * Check if a position is on a boundary and can be reassigned to different quadrants
   */
  private isOnBoundary(position: { sat: number; loy: number }): boolean {
    return position.sat === this.midpoint.sat || position.loy === this.midpoint.loy;
  }

  /**
   * Check if a position can belong to a specific quadrant (including boundary reassignment)
   * For diagonal proximity, positions on midpoint lines can be reassigned to adjacent quadrants
   */
  private canBoundaryPositionBelongToQuadrant(position: { sat: number; loy: number }, quadrant: string): boolean {
    // Check if position is on a midpoint line (boundary)
    const isOnSatBoundary = position.sat === this.midpoint.sat;
    const isOnLoyBoundary = position.loy === this.midpoint.loy;
    const isOnMidpoint = isOnSatBoundary && isOnLoyBoundary;
    
    // If on midpoint, exclude it (handled separately)
    if (isOnMidpoint) {
      return false;
    }
    
    switch (quadrant) {
      case 'defectors':
        // Can include positions on the boundary lines that could be reassigned to defectors
        return (position.sat < this.midpoint.sat && position.loy <= this.midpoint.loy) ||
               (position.sat <= this.midpoint.sat && position.loy < this.midpoint.loy);
      case 'mercenaries':
        // Can include positions on the boundary lines that could be reassigned to mercenaries
        return (position.sat >= this.midpoint.sat && position.loy < this.midpoint.loy) ||
               (position.sat > this.midpoint.sat && position.loy <= this.midpoint.loy);
      case 'loyalists':
        // Can include positions on the boundary lines that could be reassigned to loyalists
        return (position.sat >= this.midpoint.sat && position.loy >= this.midpoint.loy) ||
               (position.sat > this.midpoint.sat && position.loy > this.midpoint.loy);
      case 'hostages':
        // Can include positions on the boundary lines that could be reassigned to hostages
        return (position.sat < this.midpoint.sat && position.loy >= this.midpoint.loy) ||
               (position.sat <= this.midpoint.sat && position.loy > this.midpoint.loy);
      default:
        return false;
    }
  }

  /**
   * Get all customers that actually belong to a quadrant (not just "could belong")
   * This is used for diagonal proximity analysis to get customers from the correct source quadrant
   */
  private getAllCustomersIncludingBoundaries(fromQuadrant: string, allData: DataPoint[], getQuadrantForPoint: (point: DataPoint) => QuadrantType): DataPoint[] {
    const customersIncludingBoundaries: DataPoint[] = [];
    
    allData.forEach((customer) => {
      if (customer.excluded) {
        return;
      }
      
      // Exclude midpoint customers
      const isOnMidpoint = customer.satisfaction === this.midpoint.sat && customer.loyalty === this.midpoint.loy;
      if (isOnMidpoint) {
        return;
      }
      
      // 🔧 FIX: Use context's quadrant assignment instead of geometric determination
      const actualQuadrant = getQuadrantForPoint(customer);
      
      if (actualQuadrant === fromQuadrant) {
        customersIncludingBoundaries.push(customer);
        console.log(`✅ DIAGONAL: Customer ${customer.id} at (${customer.satisfaction},${customer.loyalty}) belongs to ${fromQuadrant} (context assignment)`);
      }
    });
    
    return customersIncludingBoundaries;
  }

  /**
   * Check if a position actually belongs to a quadrant (using main quadrant assignment logic)
   * This is different from canBoundaryPositionBelongToQuadrant which checks "could belong"
   */
  private doesPositionActuallyBelongToQuadrant(position: { sat: number; loy: number }, quadrant: string): boolean {
    const sat = position.sat;
    const loy = position.loy;
    
    switch (quadrant) {
      case 'defectors':
        return sat < this.midpoint.sat && loy < this.midpoint.loy;
      case 'mercenaries':
        return sat >= this.midpoint.sat && loy < this.midpoint.loy;
      case 'loyalists':
        return sat >= this.midpoint.sat && loy >= this.midpoint.loy;
      case 'hostages':
        return sat < this.midpoint.sat && loy >= this.midpoint.loy;
      default:
        return false;
    }
  }

  /**
   * Get space cap limit based on available positions
   * Simple rule: 3 positions → 1 qualifies, 4+ positions → 2 qualify
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
   * Check if customer is within the potential search area for diagonal proximity
   * Follows the exact specification: Step 1-3 of the diagonal proximity algorithm
   */
  private isWithinPotentialSearchArea(customer: DataPoint, fromQuadrant: string, toQuadrant: string): boolean {
    const boundaries = this.getScaleBoundaries();
    
    // Step 1: Calculate potential search space for the source quadrant
    let potentialSatRange: number[];
    let potentialLoyRange: number[];
    
    switch (fromQuadrant) {
      case 'defectors':
        // Defectors potential positions: sat ∈ {1,2,3,4}, loy ∈ {0,1,2,3,4,5}
        potentialSatRange = Array.from({length: Math.floor(this.midpoint.sat) - boundaries.satMin + 1}, (_, i) => boundaries.satMin + i);
        // For decimal midpoints, only include positions < midpoint
        if (this.midpoint.loy % 1 !== 0) {
          potentialLoyRange = Array.from({length: Math.floor(this.midpoint.loy) - boundaries.loyMin + 1}, (_, i) => boundaries.loyMin + i);
        } else {
          potentialLoyRange = Array.from({length: Math.floor(this.midpoint.loy) - boundaries.loyMin + 1}, (_, i) => boundaries.loyMin + i);
        }
        break;
      case 'mercenaries':
        // Mercenaries potential positions: sat ∈ {4,5,6,7}, loy ∈ {0,1,2,3,4,5}
        potentialSatRange = Array.from({length: boundaries.satMax - Math.floor(this.midpoint.sat) + 1}, (_, i) => Math.floor(this.midpoint.sat) + i);
        // For decimal midpoints, only include positions < midpoint
        if (this.midpoint.loy % 1 !== 0) {
          potentialLoyRange = Array.from({length: Math.floor(this.midpoint.loy) - boundaries.loyMin + 1}, (_, i) => boundaries.loyMin + i);
        } else {
          potentialLoyRange = Array.from({length: Math.floor(this.midpoint.loy) - boundaries.loyMin + 1}, (_, i) => boundaries.loyMin + i);
        }
        break;
      case 'loyalists':
        // Loyalists potential positions: sat ∈ {4,5,6,7}, loy ∈ {5,6,7,8,9,10}
        potentialSatRange = Array.from({length: boundaries.satMax - Math.floor(this.midpoint.sat) + 1}, (_, i) => Math.floor(this.midpoint.sat) + i);
        // For decimal midpoints, only include positions > midpoint
        if (this.midpoint.loy % 1 !== 0) {
          potentialLoyRange = Array.from({length: boundaries.loyMax - Math.ceil(this.midpoint.loy) + 1}, (_, i) => Math.ceil(this.midpoint.loy) + i);
        } else {
          potentialLoyRange = Array.from({length: boundaries.loyMax - Math.floor(this.midpoint.loy) + 1}, (_, i) => Math.floor(this.midpoint.loy) + i);
        }
        break;
      case 'hostages':
        // Hostages potential positions: sat ∈ {1,2,3,4}, loy ∈ {5,6,7,8,9,10}
        potentialSatRange = Array.from({length: Math.floor(this.midpoint.sat) - boundaries.satMin + 1}, (_, i) => boundaries.satMin + i);
        // For decimal midpoints, only include positions > midpoint
        if (this.midpoint.loy % 1 !== 0) {
          potentialLoyRange = Array.from({length: boundaries.loyMax - Math.ceil(this.midpoint.loy) + 1}, (_, i) => Math.ceil(this.midpoint.loy) + i);
        } else {
          potentialLoyRange = Array.from({length: boundaries.loyMax - Math.floor(this.midpoint.loy) + 1}, (_, i) => Math.floor(this.midpoint.loy) + i);
        }
        break;
      default:
        return false;
    }
    
    // Step 2: Apply space cap to each dimension (closest to boundary)
    const satCap = this.getSpaceCapLimit(potentialSatRange.length);
    const loyCap = this.getSpaceCapLimit(potentialLoyRange.length);
    
    if (satCap === 0 || loyCap === 0) {
      return false;
    }
    
    // Get positions closest to boundary (midpoint) - only integer positions
    // Apply space cap to potential range first, then filter by distance threshold
    const satPositions = potentialSatRange
      .map(sat => ({ sat, distance: Math.abs(sat - this.midpoint.sat) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, satCap) // Apply space cap to potential range first
      .filter(p => p.distance <= 2.0) // Then filter by distance threshold
      .map(p => p.sat);
    
    const loyPositions = potentialLoyRange
      .map(loy => ({ loy, distance: Math.abs(loy - this.midpoint.loy) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, loyCap) // Apply space cap to potential range first
      .filter(p => p.distance <= 2.0) // Then filter by distance threshold
      .map(p => p.loy);
    
    console.log(`   📏 Potential ranges: sat=[${potentialSatRange.join(',')}], loy=[${potentialLoyRange.join(',')}]`);
    console.log(`   📏 Search area: sat=[${satPositions.join(',')}], loy=[${loyPositions.join(',')}]`);
    
    // Step 3: Check if customer is in the search area using range checking (supports decimals)
    const satMin = satPositions.length > 0 ? Math.min(...satPositions) : 0;
    const satMax = satPositions.length > 0 ? Math.max(...satPositions) : 0;
    const loyMin = loyPositions.length > 0 ? Math.min(...loyPositions) : 0;
    const loyMax = loyPositions.length > 0 ? Math.max(...loyPositions) : 0;
    
    const isInSatRange = satPositions.length > 0 && customer.satisfaction >= satMin && customer.satisfaction <= satMax;
    const isInLoyRange = loyPositions.length > 0 && customer.loyalty >= loyMin && customer.loyalty <= loyMax;
    
    if (!isInSatRange || !isInLoyRange) {
      console.log(`   📏 Search area check: ${customer.id} at (${customer.satisfaction},${customer.loyalty}) - sat: ${isInSatRange} (${customer.satisfaction} in [${satMin}-${satMax}]), loy: ${isInLoyRange} (${customer.loyalty} in [${loyMin}-${loyMax}])`);
    }
    
    return isInSatRange && isInLoyRange;
  }

  /**
   * Get boundary coordinates for a quadrant (closest point to midpoint)
   */
  private getQuadrantBoundary(quadrant: string): { sat: number; loy: number } {
    switch (quadrant) {
      case 'loyalists':
        return { sat: this.midpoint.sat, loy: this.midpoint.loy };
      case 'mercenaries':
        return { sat: this.midpoint.sat, loy: this.midpoint.loy - 1 };
      case 'hostages':
        return { sat: this.midpoint.sat - 1, loy: this.midpoint.loy };
      case 'defectors':
        return { sat: this.midpoint.sat - 1, loy: this.midpoint.loy - 1 };
      default:
        return { sat: this.midpoint.sat, loy: this.midpoint.loy };
    }
  }

  /**
   * Get boundary coordinates for diagonal quadrant relationships (opposite quadrant)
   */
  private getDiagonalQuadrantBoundary(targetQuadrant: string): { sat: number; loy: number } {
    switch (targetQuadrant) {
      case 'loyalists':
        // For loyalists_close_to_defectors: distance to defectors boundary
        return { sat: this.midpoint.sat - 1, loy: this.midpoint.loy - 1 };
      case 'mercenaries':
        // For mercenaries_close_to_hostages: distance to hostages boundary
        return { sat: this.midpoint.sat - 1, loy: this.midpoint.loy };
      case 'hostages':
        // For hostages_close_to_mercenaries: distance to mercenaries boundary
        return { sat: this.midpoint.sat, loy: this.midpoint.loy - 1 };
      case 'defectors':
        // For defectors_close_to_loyalists: distance to loyalists boundary
        return { sat: this.midpoint.sat, loy: this.midpoint.loy };
      default:
        return { sat: this.midpoint.sat, loy: this.midpoint.loy };
    }
  }

  /**
   * Calculate risk level based on distance and threshold
   */
  private calculateRiskLevel(distance: number, threshold: number): 'LOW' | 'MODERATE' | 'HIGH' {
    const ratio = distance / threshold;
    if (ratio <= 0.5) return 'HIGH';
    if (ratio <= 0.8) return 'MODERATE';
    return 'LOW';
  }

  /**
   * Analyze proximity for special zone relationships
   * Uses Chebyshev/Maximum distance of 1 position (includes diagonal neighbors)
   */
  private analyzeSpecialZoneProximity(
    customers: DataPoint[],
    fromZone: string,
    toZone: string,
    showSpecialZones: boolean,
    showNearApostles: boolean
  ): ProximityDetail {
    
    console.log(`🔍 analyzeSpecialZoneProximity: ${fromZone} -> ${toZone} | customers: ${customers.length} | showSpecialZones: ${showSpecialZones} | showNearApostles: ${showNearApostles}`);
    
    // Check activation conditions first
    const shouldAnalyze = this.shouldAnalyzeSpecialZoneProximity(fromZone, toZone, showSpecialZones, showNearApostles);
    console.log(`🔍 shouldAnalyzeSpecialZoneProximity result for ${fromZone} -> ${toZone}: ${shouldAnalyze}`);
    
    if (customers.length === 0) {
      return this.createEmptyProximityDetail();
    }

    // Check activation conditions
    if (!this.shouldAnalyzeSpecialZoneProximity(fromZone, toZone, showSpecialZones, showNearApostles)) {
      console.log(`❌ Special zone proximity analysis skipped for ${fromZone} -> ${toZone} (conditions not met)`);
      return this.createEmptyProximityDetail();
    }

    // Get target zone boundaries
    const targetZoneBoundaries = this.getSpecialZoneBoundaries(toZone);
    if (!targetZoneBoundaries) {
      console.log(`❌ No boundaries found for target zone: ${toZone}`);
      return this.createEmptyProximityDetail();
    }

    // RULE 1: EXCLUSION PRIORITY - Exclude customers already in target special zone
    const filteredCustomers = customers.filter(customer => {
      const isInTargetZone = this.isCustomerInSpecialZone(customer, targetZoneBoundaries);
      if (isInTargetZone) {
        console.log(`🚫 EXCLUDING customer ${customer.id} at (${customer.satisfaction},${customer.loyalty}) - already in ${toZone} zone`);
      }
      return !isInTargetZone;
    });

    console.log(`📊 After target zone exclusion: ${filteredCustomers.length} customers (excluded ${customers.length - filteredCustomers.length} already in ${toZone} zone)`);

    // RULE 8 REMOVED: Boundary conflict exclusion removed - customers can appear in both quadrant boundary proximity 
    // and special zone proximity. Summary deduplication will handle overlap by keeping highest risk score relationship.
    const finalFilteredCustomers = filteredCustomers;

    // RULE 3: SIZE-AWARE PROXIMITY ANALYSIS - Skip if target zone is too small
    const zoneSize = this.calculateSpecialZoneSize(targetZoneBoundaries);
    if (zoneSize <= 1) {
      console.log(`❌ Skipping proximity analysis - ${toZone} zone too small (${zoneSize} positions)`);
      return this.createEmptyProximityDetail();
    }

    // Filter customers who are within 1 Chebyshev/Maximum distance of the target zone
    const proximityCustomers: CustomerProximityDetail[] = [];
    const uniquePositions = new Set<string>();

    finalFilteredCustomers.forEach(customer => {
      const distance = this.calculateManhattanDistanceToZone(customer, targetZoneBoundaries);
      
      // Maximum 1 position Chebyshev/Maximum distance (includes diagonal neighbors)
      if (distance <= 1) {
        const proximityDetail: CustomerProximityDetail = {
          id: customer.id,
          name: customer.name || '',
          satisfaction: customer.satisfaction,
          loyalty: customer.loyalty,
          distanceFromBoundary: distance,
          currentQuadrant: fromZone,
          proximityTargets: [toZone],
          riskScore: this.calculateSpecialZoneRiskScore(distance),
          riskLevel: distance === 0 ? 'HIGH' : distance === 1 ? 'MODERATE' : 'LOW'
        };

        proximityCustomers.push(proximityDetail);
        uniquePositions.add(`${customer.satisfaction},${customer.loyalty}`);
        
        console.log(`🎯 ${fromZone} customer ${customer.id} at (${customer.satisfaction},${customer.loyalty}) is ${distance} positions from ${toZone} zone`);
      }
    });

    // Calculate summary metrics
    const customerCount = proximityCustomers.length;
    const positionCount = uniquePositions.size;
    const averageDistance = customerCount > 0 
      ? proximityCustomers.reduce((sum, c) => sum + c.distanceFromBoundary, 0) / customerCount
      : 0;

    // Determine overall risk level
    const averageRiskScore = customerCount > 0
      ? proximityCustomers.reduce((sum, c) => sum + c.riskScore, 0) / customerCount
      : 0;

    let riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
    if (averageRiskScore >= 75) {
      riskLevel = 'HIGH';
    } else if (averageRiskScore >= 50) {
      riskLevel = 'MODERATE';
    } else {
      riskLevel = 'LOW';
    }

    console.log(`📊 Special zone proximity result: ${fromZone} -> ${toZone}: ${customerCount} customers, ${positionCount} positions, avg distance: ${averageDistance.toFixed(2)}`);

    return {
      customerCount,
      positionCount,
      averageDistance,
      riskLevel,
      customers: proximityCustomers.sort((a, b) => b.riskScore - a.riskScore) // Sort by highest risk first
    };
  }

  /**
   * Check if special zone proximity analysis should be performed
   * CORRECTED: Zone Architecture Understanding (Rule 9)
   */
  private shouldAnalyzeSpecialZoneProximity(
    fromZone: string,
    toZone: string,
    showSpecialZones: boolean,
    showNearApostles: boolean
  ): boolean {
    // loyalists_close_to_apostles: When showSpecialZones=true AND showNearApostles=false
    if (fromZone === 'loyalists' && toZone === 'apostles') {
      return showSpecialZones && !showNearApostles;
    }
    
    // apostles_close_to_loyalists: When showSpecialZones=true AND showNearApostles=false
    if (fromZone === 'apostles' && toZone === 'loyalists') {
      return showSpecialZones && !showNearApostles;
    }
    
    // loyalists_close_to_near_apostles: When showNearApostles=true (takes precedence over apostles)
    if (fromZone === 'loyalists' && toZone === 'near_apostles') {
      return showNearApostles; // Near-apostles is always 1 position thick, no size check needed
    }
    
    // near_apostles_close_to_loyalists: When showNearApostles=true
    if (fromZone === 'near_apostles' && toZone === 'loyalists') {
      return showNearApostles; // Near-apostles is always 1 position thick, no size check needed
    }
    
    // near_apostles_close_to_apostles: When showNearApostles=true (represents highest-ROI conversion opportunities)
    if (fromZone === 'near_apostles' && toZone === 'apostles') {
      return showNearApostles; // Only when near-apostles zone is visible
    }
    
    // REMOVED: apostles_close_to_near_apostles (100% redundant - all near-apostles are by definition close to apostles)
    
    // defectors_close_to_terrorists: When showSpecialZones=true
    if (fromZone === 'defectors' && toZone === 'terrorists') {
      return showSpecialZones;
    }
    
    // terrorists_close_to_defectors: When showSpecialZones=true
    if (fromZone === 'terrorists' && toZone === 'defectors') {
      return showSpecialZones;
    }
    
    return false;
  }

  /**
   * Get special zone boundaries based on scale and midpoint
   * Uses the same scale-aware logic as calculateSpecialZoneBoundaries
   */
  private getSpecialZoneBoundaries(zone: string): { minSat: number; maxSat: number; minLoy: number; maxLoy: number } | null {
    // Parse scale ranges to get min/max values (same as calculateSpecialZoneBoundaries)
    const [satMin, satMax] = this.satisfactionScale.split('-').map(Number);
    const [loyMin, loyMax] = this.loyaltyScale.split('-').map(Number);
    
    // Use the zone sizes passed to the constructor
    const apostlesZoneSize = this.apostlesZoneSize;
    const terroristsZoneSize = this.terroristsZoneSize;
    
    switch (zone) {
      case 'apostles':
        // Apostles zone: starts from top-right corner (satMax, loyMax)
        const apostlesEdgeVertixSat = satMax - apostlesZoneSize;
        const apostlesEdgeVertixLoy = loyMax - apostlesZoneSize;
        return {
          minSat: apostlesEdgeVertixSat,
          maxSat: satMax,
          minLoy: apostlesEdgeVertixLoy,
          maxLoy: loyMax
        };
        
      case 'near_apostles':
        // Near apostles zone: L-shaped area around apostles
        const nearApostlesEdgeVertixSat = satMax - apostlesZoneSize - 1;
        const nearApostlesEdgeVertixLoy = loyMax - apostlesZoneSize - 1;
        return {
          minSat: nearApostlesEdgeVertixSat,
          maxSat: satMax - apostlesZoneSize,
          minLoy: nearApostlesEdgeVertixLoy,
          maxLoy: loyMax - apostlesZoneSize
        };
        
      case 'terrorists':
        // Terrorists zone: starts from bottom-left corner (satMin, loyMin)
        const terroristsEdgeVertixSat = satMin + terroristsZoneSize;
        const terroristsEdgeVertixLoy = loyMin + terroristsZoneSize;
        return {
          minSat: satMin,
          maxSat: terroristsEdgeVertixSat,
          minLoy: loyMin,
          maxLoy: terroristsEdgeVertixLoy
        };
        
      default:
        return null;
    }
  }

  /**
   * Calculate Chebyshev/Maximum distance from a customer to a special zone
   * This includes diagonal neighbors as "1 space away" (visually adjacent on grid)
   */
  private calculateManhattanDistanceToZone(
    customer: DataPoint,
    zoneBoundaries: { minSat: number; maxSat: number; minLoy: number; maxLoy: number }
  ): number {
    // Calculate distance to the nearest edge of the zone
    const satDistance = Math.min(
      Math.abs(customer.satisfaction - zoneBoundaries.minSat),
      Math.abs(customer.satisfaction - zoneBoundaries.maxSat)
    );
    
    const loyDistance = Math.min(
      Math.abs(customer.loyalty - zoneBoundaries.minLoy),
      Math.abs(customer.loyalty - zoneBoundaries.maxLoy)
    );
    
    // If customer is inside the zone, distance is 0
    if (customer.satisfaction >= zoneBoundaries.minSat && customer.satisfaction <= zoneBoundaries.maxSat &&
        customer.loyalty >= zoneBoundaries.minLoy && customer.loyalty <= zoneBoundaries.maxLoy) {
      return 0;
    }
    
    // Chebyshev/Maximum distance to the zone (includes diagonal neighbors)
    // Example: Point (5,8) to apostles zone (6,9) = max(1,1) = 1 (INCLUDED)
    // vs Manhattan: |5-6| + |8-9| = 1+1 = 2 (EXCLUDED)
    return Math.max(satDistance, loyDistance);
  }

  /**
   * Calculate risk score for special zone proximity (0-100)
   */
  private calculateSpecialZoneRiskScore(distance: number): number {
    // For special zones: distance 0 = 100% risk, distance 1 = 50% risk, distance 2+ = 0% risk
    if (distance === 0) return 100;
    if (distance === 1) return 50;
    return 0;
  }

  /**
   * Calculate risk score (0-100) based on distance from boundary
   */
  private calculateRiskScore(distance: number, threshold: number): number {
    // Closer distance = higher risk score
    const normalizedDistance = Math.min(distance / threshold, 1); // Normalize to 0-1
    const riskScore = Math.round((1 - normalizedDistance) * 100); // Invert and scale to 0-100
    return Math.max(0, Math.min(100, riskScore)); // Ensure bounds
  }

  /**
   * Check if a customer is already in a special zone
   * RULE 1: EXCLUSION PRIORITY implementation
   */
  private isCustomerInSpecialZone(
    customer: DataPoint, 
    zoneBoundaries: { minSat: number; maxSat: number; minLoy: number; maxLoy: number }
  ): boolean {
    return customer.satisfaction >= zoneBoundaries.minSat && 
           customer.satisfaction <= zoneBoundaries.maxSat &&
           customer.loyalty >= zoneBoundaries.minLoy && 
           customer.loyalty <= zoneBoundaries.maxLoy;
  }

  /**
   * Calculate the size of a special zone in positions
   * RULE 3: SIZE-AWARE PROXIMITY ANALYSIS implementation
   */
  private calculateSpecialZoneSize(
    zoneBoundaries: { minSat: number; maxSat: number; minLoy: number; maxLoy: number }
  ): number {
    const satSize = zoneBoundaries.maxSat - zoneBoundaries.minSat + 1;
    const loySize = zoneBoundaries.maxLoy - zoneBoundaries.minLoy + 1;
    return satSize * loySize;
  }

  /**
   * Check if a customer is on a quadrant boundary
   * RULE 8: BOUNDARY CONFLICT EXCLUSION implementation
   */
  private isCustomerOnQuadrantBoundary(customer: DataPoint): boolean {
    // Get the current midpoint from the scale
    const maxSat = parseInt(this.satisfactionScale.split('-')[1]);
    const maxLoy = parseInt(this.loyaltyScale.split('-')[1]);
    
    // Dynamic boundary detection based on current midpoint:
    // - Hostages boundary: satisfaction = midpoint.sat
    // - Mercenaries boundary: loyalty = midpoint.loy
    
    // Check if customer is on hostages boundary (satisfaction = midpoint satisfaction)
    const isOnHostagesBoundary = customer.satisfaction === this.midpoint.sat;
    
    // Check if customer is on mercenaries boundary (loyalty = midpoint loyalty)  
    const isOnMercenariesBoundary = customer.loyalty === this.midpoint.loy;
    
    const isOnBoundary = isOnHostagesBoundary || isOnMercenariesBoundary;
    
    if (isOnBoundary) {
      console.log(`🔍 Customer ${customer.id} at (${customer.satisfaction},${customer.loyalty}) is on quadrant boundary: hostages=${isOnHostagesBoundary}, mercenaries=${isOnMercenariesBoundary}`);
    }
    
    return isOnBoundary;
  }

  /**
   * Calculate summary metrics across all proximity relationships
   */
  private calculateSummaryMetrics(
    analysis: ProximityAnalysisResult['analysis'],
    specialZones?: ProximityAnalysisResult['specialZones']
  ): ProximityAnalysisResult['summary'] {
    
    // Collect all proximity details
    const allProximityDetails = [
      ...Object.values(analysis),
      ...(specialZones ? Object.values(specialZones) : [])
    ];

    // Calculate totals
    const totalProximityCustomers = allProximityDetails.reduce((sum, detail) => sum + detail.customerCount, 0);
    const totalProximityPositions = allProximityDetails.reduce((sum, detail) => sum + detail.positionCount, 0);
    
    // Calculate average risk score
    const allCustomers = allProximityDetails.flatMap(detail => detail.customers);
    const averageRiskScore = allCustomers.length > 0
      ? allCustomers.reduce((sum, customer) => sum + customer.riskScore, 0) / allCustomers.length
      : 0;

    // Generate crisis indicators (negative movements with high counts)
    const crisisIndicators: string[] = [];
    const opportunityIndicators: string[] = [];

    // Check for crisis patterns (movements toward negative quadrants)
    if (analysis.loyalists_close_to_mercenaries.customerCount >= 3) {
      crisisIndicators.push(`${analysis.loyalists_close_to_mercenaries.customerCount} loyalists at risk of becoming mercenaries`);
    }
    if (analysis.mercenaries_close_to_defectors.customerCount >= 3) {
      crisisIndicators.push(`${analysis.mercenaries_close_to_defectors.customerCount} mercenaries at risk of defection`);
    }
    if (analysis.hostages_close_to_defectors.customerCount >= 3) {
      crisisIndicators.push(`${analysis.hostages_close_to_defectors.customerCount} hostages at risk of defection`);
    }

    // Check for opportunity patterns (movements toward positive quadrants)
    if (analysis.mercenaries_close_to_loyalists.customerCount >= 3) {
      opportunityIndicators.push(`${analysis.mercenaries_close_to_loyalists.customerCount} mercenaries moving toward loyalty`);
    }
    if (analysis.hostages_close_to_loyalists.customerCount >= 3) {
      opportunityIndicators.push(`${analysis.hostages_close_to_loyalists.customerCount} hostages moving toward loyalty`);
    }

    return {
      totalProximityCustomers,
      totalProximityPositions,
      averageRiskScore: Math.round(averageRiskScore),
      crisisIndicators,
      opportunityIndicators
    };
  }

  /**
   * Create empty proximity detail
   */
  private createEmptyProximityDetail(): ProximityDetail {
    return {
      customerCount: 0,
      positionCount: 0,
      averageDistance: 0,
      riskLevel: 'LOW',
      customers: []
    };
  }

  /**
   * Create empty result when proximity analysis is unavailable
   */
  private createEmptyResult(totalCustomers: number, reason: string): ProximityAnalysisResult {
  console.log('🚨 CREATING EMPTY RESULT - Should be 0 customers, 0 positions. Reason:', reason);
  
  const emptyDetail = this.createEmptyProximityDetail();
    
    return {
      analysis: {
        loyalists_close_to_mercenaries: emptyDetail,
        loyalists_close_to_hostages: emptyDetail,
        mercenaries_close_to_loyalists: emptyDetail,
        mercenaries_close_to_defectors: emptyDetail,
        hostages_close_to_loyalists: emptyDetail,
        hostages_close_to_defectors: emptyDetail,
        defectors_close_to_mercenaries: emptyDetail,
        defectors_close_to_hostages: emptyDetail,
        // Diagonal proximity relationships
        loyalists_close_to_defectors: emptyDetail,
        mercenaries_close_to_hostages: emptyDetail,
        hostages_close_to_mercenaries: emptyDetail,
        defectors_close_to_loyalists: emptyDetail,
        // Special zone proximity relationships
        loyalists_close_to_apostles: emptyDetail,
        loyalists_close_to_near_apostles: emptyDetail,
        near_apostles_close_to_apostles: emptyDetail,
        defectors_close_to_terrorists: emptyDetail
      },
      
      summary: {
        totalProximityCustomers: 0,
        totalProximityPositions: 0,
        averageRiskScore: 0,
        crisisIndicators: [],
        opportunityIndicators: []
      },
      crossroads: {
        customers: [],
        totalCount: 0,
        highValueCount: 0
      },
      settings: {
        proximityThreshold: 0,
        showSpecialZones: false,
        totalCustomers,
        isAvailable: false,
        unavailabilityReason: reason
      }
    };
  }

  /**
   * Detect customers who appear in multiple proximity relationships (crossroads customers)
   */
  private detectCrossroadsCustomers(
    analysis: ProximityAnalysisResult['analysis'],
    specialZones?: ProximityAnalysisResult['specialZones']
  ): ProximityAnalysisResult['crossroads'] {
    
    console.log('🔍 Detecting crossroads customers...');
    
    // Collect all proximity details
    const allProximityDetails = [
      ...Object.values(analysis),
      ...(specialZones ? Object.values(specialZones) : [])
    ];
    
    // Create a map to track which customers appear in which relationships
    const customerRelationships = new Map<string, {
      customer: CustomerProximityDetail;
      relationships: string[];
    }>();
    
    // Process each proximity relationship
    allProximityDetails.forEach(proximityDetail => {
      proximityDetail.customers.forEach(customer => {
        const existing = customerRelationships.get(customer.id);
        if (existing) {
          // Customer already exists, add this relationship
          existing.relationships.push(customer.currentQuadrant + '_close_to_' + customer.proximityTargets.join('_'));
        } else {
          // New customer, create entry
          customerRelationships.set(customer.id, {
            customer,
            relationships: [customer.currentQuadrant + '_close_to_' + customer.proximityTargets.join('_')]
          });
        }
      });
    });
    
    // Find customers with multiple relationships (crossroads)
    const crossroadsCustomers: CrossroadsCustomer[] = [];
    
    customerRelationships.forEach(({ customer, relationships }) => {
      if (relationships.length > 1) {
        console.log(`🎯 Crossroads customer ${customer.id} appears in ${relationships.length} relationships: ${relationships.join(', ')}`);
        
        // Calculate strategic value based on number of relationships and risk scores
        const strategicValue = this.calculateStrategicValue(relationships.length, customer.riskScore);
        
        crossroadsCustomers.push({
          id: customer.id,
          name: customer.name,
          satisfaction: customer.satisfaction,
          loyalty: customer.loyalty,
          currentQuadrant: customer.currentQuadrant,
          proximityRelationships: relationships,
          strategicValue,
          riskScore: customer.riskScore
        });
      }
    });
    
    // Sort by strategic value and risk score
    crossroadsCustomers.sort((a, b) => {
      if (a.strategicValue !== b.strategicValue) {
        const valueOrder = { 'HIGH': 3, 'MODERATE': 2, 'LOW': 1 };
        return valueOrder[b.strategicValue] - valueOrder[a.strategicValue];
      }
      return b.riskScore - a.riskScore;
    });
    
    const highValueCount = crossroadsCustomers.filter(c => c.strategicValue === 'HIGH').length;
    
    console.log(`📊 Crossroads detection complete: ${crossroadsCustomers.length} total, ${highValueCount} high-value`);
    
    return {
      customers: crossroadsCustomers,
      totalCount: crossroadsCustomers.length,
      highValueCount
    };
  }
  
  /**
   * Calculate strategic value for crossroads customers
   */
  private calculateStrategicValue(relationshipCount: number, riskScore: number): 'HIGH' | 'MODERATE' | 'LOW' {
    // High value: 3+ relationships OR high risk score with 2+ relationships
    if (relationshipCount >= 3 || (relationshipCount >= 2 && riskScore >= 75)) {
      return 'HIGH';
    }
    // Moderate value: 2 relationships with moderate risk
    if (relationshipCount >= 2 && riskScore >= 50) {
      return 'MODERATE';
    }
    // Low value: 2 relationships with low risk
    return 'LOW';
  }
}