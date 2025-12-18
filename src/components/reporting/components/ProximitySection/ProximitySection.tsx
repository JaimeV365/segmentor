// src/components/reporting/components/ProximitySection/ProximitySection.tsx

import React, { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { DataPoint, ScaleFormat } from '../../../../types/base';
import { useQuadrantAssignment } from '../../../visualization/context/QuadrantAssignmentContext';
import { useFilterContextSafe } from '../../../visualization/context/FilterContext';
import { useNotification } from '../../../data-entry/hooks/useNotification';
import FilterPanel from '../../../visualization/filters/FilterPanel';
import { EnhancedProximityClassifier } from '../../services/EnhancedProximityClassifier';
import { DistanceCalculator } from '../../services/DistanceCalculator';
import { LateralProximityCalculator } from '../../services/LateralProximityCalculator';
import { Card } from '../../../ui/card';
import { Users, ArrowRightLeft, MoveDiagonal, Crosshair, MapPin, Menu as MenuIcon, Filter, Link2, Link2Off, X, ChevronDown, ChevronRight } from 'lucide-react';
import ProximityList from '../ProximityList';
import ProximityDisplayMenu, { ProximityDisplaySettings, createDefaultProximityDisplaySettings } from '../ProximityList/ProximityDisplayMenu';
import ProximityPointInfoBox from '../DistributionSection/ProximityPointInfoBox';
import { InfoRibbon } from '../InfoRibbon';
import '../DistributionSection/DistributionSection.css';
import './ProximitySection.css';

interface ProximitySectionProps {
  data: DataPoint[];
  originalData?: DataPoint[];
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  isPremium: boolean;
  isClassicModel?: boolean;
  showSpecialZones?: boolean;
  showNearApostles?: boolean;
}

const ProximitySection: React.FC<ProximitySectionProps> = ({
  data: incomingData,
  originalData,
  satisfactionScale,
  loyaltyScale,
  isPremium,
  isClassicModel = true,
  showSpecialZones = false,
  showNearApostles = false
}) => {
  const resolvedOriginalData = originalData ?? incomingData;
  const filterContext = useFilterContextSafe();
  const { showNotification } = useNotification();
  const [showControlsPanel, setShowControlsPanel] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<'display' | 'filters'>('display');
  const [filterResetTrigger, setFilterResetTrigger] = useState(0);
  const [filteredDataFromPanel, setFilteredDataFromPanel] = useState<DataPoint[] | null>(null);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [isManualReconnecting, setIsManualReconnecting] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const REPORT_ID = useMemo(() => 'proximitySection', []);
  
  useLayoutEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[REPORT_ID]) {
      filterContext.syncReportToMaster(REPORT_ID);
    }
  }, [filterContext, REPORT_ID]);
  
  useEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[REPORT_ID]) {
      filterContext.syncReportToMaster(REPORT_ID);
    }
  }, [filterContext, REPORT_ID]);
  
  const isConnected = useMemo(() => {
    if (!filterContext) {
      return true;
    }
    const reportState = filterContext.reportFilterStates[REPORT_ID];
    if (!reportState) {
      return true;
    }
    return filterContext.compareFilterStates(reportState, filterContext.filterState);
  }, [filterContext, REPORT_ID, filterContext?.reportFilterStates?.[REPORT_ID], filterContext?.filterState]);
  
  const filterCount = useMemo(() => {
    if (!filterContext) return 0;
    const stateToUse = isConnected 
      ? filterContext.filterState 
      : (filterContext.getReportFilterState(REPORT_ID) || filterContext.filterState);
    const hasDateFilter = stateToUse.dateRange?.preset && stateToUse.dateRange.preset !== 'all';
    const attributeFilterCount = stateToUse.attributes?.filter(attr => attr.values && attr.values.size > 0).length || 0;
    return (hasDateFilter ? 1 : 0) + attributeFilterCount;
  }, [filterContext, isConnected, REPORT_ID]);
  
  useEffect(() => {
    if (isConnected && filteredDataFromPanel !== null) {
      setFilteredDataFromPanel(null);
      setHasLocalChanges(false);
    }
  }, [isConnected, filteredDataFromPanel]);
  
  const effectiveData = useMemo(() => {
    if (!filterContext || !resolvedOriginalData) {
      return incomingData;
    }
    if (!isConnected && filteredDataFromPanel) {
      return filteredDataFromPanel;
    }
    return filterContext.getReportFilteredData(REPORT_ID, resolvedOriginalData);
  }, [
    incomingData,
    resolvedOriginalData,
    filterContext,
    REPORT_ID,
    filteredDataFromPanel,
    isConnected
  ]);
  
  const data = effectiveData;

  const handleFilterChange = useCallback((filteredData: DataPoint[], filters: any[], filterState?: any) => {
    setFilteredDataFromPanel(filteredData);
    setHasLocalChanges(true);
  }, []);
  
  const handleFilterReset = useCallback(() => {
    setFilterResetTrigger(prev => prev + 1);
    setFilteredDataFromPanel(null);
    setHasLocalChanges(false);
  }, []);
  
  const handleConnectionToggle = useCallback(() => {
    if (!filterContext) return;
    filterContext.syncReportToMaster(REPORT_ID);
    setFilteredDataFromPanel(null);
    setHasLocalChanges(false);
    if (showNotification) {
      showNotification({
        title: 'Filters Connected',
        message: 'Proximity filters are now synced with the main chart.',
        type: 'success'
      });
    }
  }, [filterContext, REPORT_ID, showNotification]);
  
  // ✅ FIXED: Connect to QuadrantAssignmentContext - single source of truth (same as DistributionSection)
  const { 
    getQuadrantForPoint, 
    distribution: contextDistribution, 
    midpoint,
    getDisplayNameForQuadrant,
    manualAssignments,
    apostlesZoneSize,
    terroristsZoneSize
  } = useQuadrantAssignment();

  console.log('🎯 ProximitySection: Using context distribution:', contextDistribution);

  // ✅ Calculate total customers from context distribution FIRST
  const totalCustomersFromContext = contextDistribution.loyalists + 
                                   contextDistribution.mercenaries + 
                                   contextDistribution.hostages + 
                                   contextDistribution.defectors +
                                   (contextDistribution.apostles || 0) +
                                   (contextDistribution.terrorists || 0) +
                                   (contextDistribution.near_apostles || 0);

  console.log('🔍 Context distribution totals:', {
    loyalists: contextDistribution.loyalists,
    apostles: contextDistribution.apostles,
    total_loyalist_area: contextDistribution.loyalists + (contextDistribution.apostles || 0),
    totalFromContext: totalCustomersFromContext
  });


  // ✅ FIXED: Use EnhancedProximityClassifier (same as DistributionSection)
  const proximityAnalysis = useMemo(() => {
    console.log('🔄 PROXIMITY ANALYSIS USEMEMO RECALCULATING with dependencies:', {
      dataLength: data.length,
      satisfactionScale,
      loyaltyScale,
      midpointSat: midpoint.sat,
      midpointLoy: midpoint.loy,
      contextDistributionTotal: Object.values(contextDistribution).reduce((sum, val) => sum + (val || 0), 0),
      manualAssignmentsSize: manualAssignments.size,
      apostlesZoneSize,
      terroristsZoneSize,
      isPremium,
      showSpecialZones,
      showNearApostles,
      getQuadrantForPointType: typeof getQuadrantForPoint
    });

    console.log('🔍 Proximity analysis recalculating with:', {
      dataLength: data.length,
      midpoint,
      contextDistribution,
      manualAssignments: manualAssignments.size
    });

    // Use EnhancedProximityClassifier (same as DistributionSection)
    console.log('🔍 Creating EnhancedProximityClassifier with:', {
      satisfactionScale,
      loyaltyScale,
      midpoint
    });
    const enhancedClassifier = new EnhancedProximityClassifier(
      satisfactionScale,
      loyaltyScale,
      midpoint,
      apostlesZoneSize,
      terroristsZoneSize
    );

    // Analyze proximity using context assignments as starting point (same as DistributionSection)
    const result = enhancedClassifier.analyzeProximity(
      data,
      getQuadrantForPoint, // Use context's authoritative assignment function
      isPremium,
      undefined, // Use default threshold for now
      showSpecialZones,
      showNearApostles
    );

    console.log('📊 Proximity analysis result:', result);
    console.log('🔍 DETAILED RESULT INSPECTION FROM ENHANCEDPROXIMITY:', {
      resultType: typeof result,
      isAvailable: result.settings.isAvailable,
      totalCustomersInResult: result.summary.totalProximityCustomers,
      unavailabilityReason: result.settings.unavailabilityReason,
      fullSummary: result.summary
    });
    console.log('🔍 DETAILED RESULT INSPECTION:', {
      isAvailable: result.settings.isAvailable,
      totalCustomersInResult: result.summary.totalProximityCustomers,
      unavailabilityReason: result.settings.unavailabilityReason
    });
    console.log('🔍 FINAL RESULT BEING RETURNED FROM USEMEMO:', {
      totalProximityCustomers: result.summary.totalProximityCustomers,
      isAvailable: result.settings.isAvailable,
      objectReference: result
    });
    return result;

  }, [
    data, 
    satisfactionScale, 
    loyaltyScale, 
    midpoint.sat,
    midpoint.loy,
    contextDistribution,
    manualAssignments,
    isPremium, 
    showSpecialZones,
    showNearApostles,
    apostlesZoneSize,
    terroristsZoneSize,
    getQuadrantForPoint
  ]);

  // Tab state - MUST be before any conditional returns
  const [activeTab, setActiveTab] = useState<string>('total');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedTargetSegments, setExpandedTargetSegments] = useState<Set<string>>(new Set());
  const [expandedRiskSegments, setExpandedRiskSegments] = useState<Set<string>>(new Set());
  const [expandedConversions, setExpandedConversions] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set()); // For origin/target perspective groups
  const [expandedCrossroadsCustomers, setExpandedCrossroadsCustomers] = useState<Set<string>>(new Set()); // For crossroads customers
  const [riskSegmentSortColumn, setRiskSegmentSortColumn] = useState<string | null>(null);
  const [riskSegmentSortDirection, setRiskSegmentSortDirection] = useState<'asc' | 'desc'>('asc');
  const [viewPerspective, setViewPerspective] = useState<'origin' | 'target'>('origin');
  
  // State for proximity display settings - try to load from localStorage
  const [proximityDisplaySettings, setProximityDisplaySettings] = useState<ProximityDisplaySettings>(() => {
    try {
      const saved = localStorage.getItem('proximityDisplaySettings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load Proximity display settings from localStorage:', e);
    }
    return createDefaultProximityDisplaySettings();
  });
  
  // Persist proximity display settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('proximityDisplaySettings', JSON.stringify(proximityDisplaySettings));
  }, [proximityDisplaySettings]);
  
  // State for selected proximity points (for info box)
  const [selectedProximityPoints, setSelectedProximityPoints] = useState<{
    points: DataPoint[];
    position: { x: number; y: number };
    quadrant: string;
    proximityType: string;
    secondaryPoints?: DataPoint[];
    secondaryQuadrant?: string;
    secondaryProximityType?: string;
  } | null>(null);
  
  // Calculate movement breakdowns
  const lateralKeys: Array<keyof typeof proximityAnalysis.analysis> = [
    'loyalists_close_to_hostages',
    'loyalists_close_to_mercenaries',
    'hostages_close_to_loyalists',
    'hostages_close_to_defectors',
    'mercenaries_close_to_loyalists',
    'mercenaries_close_to_defectors',
    'defectors_close_to_hostages',
    'defectors_close_to_mercenaries'
  ];
  
  const diagonalKeys: Array<keyof typeof proximityAnalysis.analysis> = [
    'loyalists_close_to_defectors',
    'mercenaries_close_to_hostages',
    'hostages_close_to_mercenaries',
    'defectors_close_to_loyalists'
  ];
  
  // Collect all customers for each tab - MUST be before any conditional returns
  const getAllProximityCustomers = useMemo(() => {
    if (!proximityAnalysis.settings.isAvailable || !proximityAnalysis.analysis) {
      return [];
    }
    const allCustomers: Array<{
      id: string;
      name?: string;
      satisfaction: number;
      loyalty: number;
      currentQuadrant: string;
      targetQuadrant: string;
      relationship: string;
      distanceFromBoundary: number;
      riskScore: number;
      riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
    }> = [];
    
    Object.entries(proximityAnalysis.analysis).forEach(([key, detail]) => {
      if (detail?.customers) {
        const baseQuadrant = key.split('_close_to_')[0];
        const targetQuadrant = key.split('_close_to_')[1];
        detail.customers.forEach(customer => {
          allCustomers.push({
            ...customer,
            currentQuadrant: baseQuadrant,
            targetQuadrant: targetQuadrant,
            relationship: key
          });
        });
      }
    });
    
    // Return all customers - same customer can appear multiple times for different relationships
    return allCustomers;
  }, [proximityAnalysis.analysis, proximityAnalysis.settings.isAvailable]);
  
  const getLateralCustomers = useMemo(() => {
    if (!proximityAnalysis.settings.isAvailable || !proximityAnalysis.analysis) {
      return [];
    }
    const customers: typeof getAllProximityCustomers = [];
    lateralKeys.forEach(key => {
      const detail = proximityAnalysis.analysis[key];
      if (detail?.customers) {
        const baseQuadrant = key.split('_close_to_')[0];
        const targetQuadrant = key.split('_close_to_')[1];
        detail.customers.forEach(customer => {
          customers.push({
            ...customer,
            currentQuadrant: baseQuadrant,
            targetQuadrant: targetQuadrant,
            relationship: key
          });
        });
      }
    });
    return customers;
  }, [proximityAnalysis.analysis, proximityAnalysis.settings.isAvailable, lateralKeys, getAllProximityCustomers]);
  
  const getDiagonalCustomers = useMemo(() => {
    if (!proximityAnalysis.settings.isAvailable || !proximityAnalysis.analysis) {
      return [];
    }
    const customers: typeof getAllProximityCustomers = [];
    diagonalKeys.forEach(key => {
      const detail = proximityAnalysis.analysis[key];
      if (detail?.customers) {
        const baseQuadrant = key.split('_close_to_')[0];
        const targetQuadrant = key.split('_close_to_')[1];
        detail.customers.forEach(customer => {
          customers.push({
            ...customer,
            currentQuadrant: baseQuadrant,
            targetQuadrant: targetQuadrant,
            relationship: key
          });
        });
      }
    });
    return customers;
  }, [proximityAnalysis.analysis, proximityAnalysis.settings.isAvailable, diagonalKeys, getAllProximityCustomers]);
  
  // Get unique positions from all proximity customers - MUST be before conditional return
  const getUniquePositions = useMemo(() => {
    if (!proximityAnalysis.settings.isAvailable || !getAllProximityCustomers.length) {
      return [];
    }
    const positions = new Set<string>();
    getAllProximityCustomers.forEach(customer => {
      positions.add(`(${customer.satisfaction}, ${customer.loyalty})`);
    });
    return Array.from(positions).sort();
  }, [getAllProximityCustomers, proximityAnalysis.settings.isAvailable]);
  
  // Calculate risk breakdown for explanation - MUST be before conditional return
  const riskBreakdown = useMemo(() => {
    const breakdown = {
      low: 0,
      moderate: 0,
      high: 0,
      total: 0,
      sum: 0
    };
    
    if (!proximityAnalysis.settings.isAvailable || !getAllProximityCustomers.length) {
      return breakdown;
    }
    
    getAllProximityCustomers.forEach(customer => {
      breakdown.total++;
      breakdown.sum += customer.riskScore || 0;
      if (customer.riskLevel === 'LOW') breakdown.low++;
      else if (customer.riskLevel === 'MODERATE') breakdown.moderate++;
      else if (customer.riskLevel === 'HIGH') breakdown.high++;
    });
    
    return breakdown;
  }, [getAllProximityCustomers, proximityAnalysis.settings.isAvailable]);
  
  // Helper to get customer display name - MUST be before conditional return
  const getCustomerDisplayName = useCallback((customer: { name?: string; id: string }, index: number): string => {
    if (customer.name && customer.name.trim()) return customer.name.trim();
    return `Customer ${index + 1}`;
  }, []);
  
  // Helper to get quadrant display name - MUST be before conditional return
  const getQuadrantDisplayName = useCallback((quadrant: string): string => {
    return getDisplayNameForQuadrant(quadrant as any);
  }, [getDisplayNameForQuadrant]);

  // Helper to get quadrant badge style
  const getQuadrantBadgeStyle = (quadrant: string, isCard: boolean = false) => {
    // Use lighter/more transparent colors for cards
    const opacity = isCard ? 0.08 : 0.15;
    const textOpacity = isCard ? 0.6 : 1;
    
    const baseColors: Record<string, { bg: string; text: string }> = {
      loyalists: { 
        bg: `rgba(76, 175, 80, ${opacity})`, 
        text: `rgba(22, 101, 52, ${textOpacity})` 
      },
      mercenaries: { 
        bg: `rgba(247, 183, 49, ${opacity})`, 
        text: `rgba(146, 64, 14, ${textOpacity})` 
      },
      hostages: { 
        bg: `rgba(70, 130, 180, ${opacity})`, 
        text: `rgba(30, 64, 175, ${textOpacity})` 
      },
      defectors: { 
        bg: `rgba(220, 38, 38, ${opacity})`, 
        text: `rgba(153, 27, 27, ${textOpacity})` 
      },
      apostles: { 
        bg: `rgba(16, 185, 129, ${opacity})`, 
        text: `rgba(5, 150, 105, ${textOpacity})` 
      },
      near_apostles: { 
        bg: `rgba(16, 185, 129, ${opacity})`, 
        text: `rgba(5, 150, 105, ${textOpacity})` 
      },
      terrorists: { 
        bg: `rgba(239, 68, 68, ${opacity})`, 
        text: `rgba(220, 38, 38, ${textOpacity})` 
      },
    };
    
    const colors = baseColors[quadrant] || { bg: '#f3f4f6', text: '#374151' };
    return {
      backgroundColor: colors.bg,
      color: colors.text
    };
  };

  // Helper to get risk level text (without percentage)
  const getRiskLevelText = (riskLevel: string): string => {
    const level = riskLevel.toLowerCase();
    if (level.includes('high')) return 'Higher';
    if (level.includes('moderate')) return 'Moderate';
    if (level.includes('low')) return 'Lower';
    return riskLevel;
  };

  // Helper to get segment sort order for logical grouping
  const getSegmentSortOrder = (segment: string): number => {
    // Positive group: apostles, near_apostles, loyalists
    if (segment === 'apostles') return 1;
    if (segment === 'near_apostles') return 2;
    if (segment === 'loyalists') return 3;
    
    // Neutral/transitional
    if (segment === 'mercenaries') return 4;
    if (segment === 'hostages') return 5;
    
    // Negative group: terrorists, defectors
    if (segment === 'terrorists') return 6;
    if (segment === 'defectors') return 7;
    
    // Unknown segments go to the end
    return 999;
  };
  
  // Calculate target segments breakdown - MUST be before conditional return
  const targetSegmentsBreakdown = useMemo(() => {
    if (!proximityAnalysis.settings.isAvailable || !getAllProximityCustomers.length) {
      return {};
    }
    
    const breakdown: Record<string, {
      total: number;
      byOrigin: Record<string, number>;
      customers: typeof getAllProximityCustomers;
    }> = {};
    
    getAllProximityCustomers.forEach(customer => {
      const target = customer.targetQuadrant || 'unknown';
      if (!breakdown[target]) {
        breakdown[target] = {
          total: 0,
          byOrigin: {},
          customers: []
        };
      }
      breakdown[target].total++;
      breakdown[target].customers.push(customer);
      
      const origin = customer.currentQuadrant || 'unknown';
      breakdown[target].byOrigin[origin] = (breakdown[target].byOrigin[origin] || 0) + 1;
    });
    
    return breakdown;
  }, [getAllProximityCustomers, proximityAnalysis.settings.isAvailable]);

  // Calculate average risk by segment - MUST be before conditional return
  const riskBySegment = useMemo(() => {
    if (!proximityAnalysis.settings.isAvailable || !getAllProximityCustomers.length) {
      return {};
    }
    
    const segmentRisk: Record<string, {
      total: number;
      sum: number;
      average: number;
      customers: typeof getAllProximityCustomers;
    }> = {};
    
    getAllProximityCustomers.forEach(customer => {
      // Use viewPerspective to determine which segment to group by
      const segment = viewPerspective === 'target' 
        ? (customer.targetQuadrant || 'unknown')
        : (customer.currentQuadrant || 'unknown');
      
      if (!segmentRisk[segment]) {
        segmentRisk[segment] = {
          total: 0,
          sum: 0,
          average: 0,
          customers: []
        };
      }
      segmentRisk[segment].total++;
      segmentRisk[segment].sum += customer.riskScore || 0;
      segmentRisk[segment].customers.push(customer);
    });
    
    // Calculate averages
    Object.keys(segmentRisk).forEach(segment => {
      const data = segmentRisk[segment];
      data.average = data.total > 0 ? data.sum / data.total : 0;
    });
    
    return segmentRisk;
  }, [getAllProximityCustomers, proximityAnalysis.settings.isAvailable, viewPerspective]);

  // Calculate actionable conversions with priority - MUST be before conditional return
  const actionableConversions = useMemo(() => {
    if (!proximityAnalysis.settings.isAvailable || !getAllProximityCustomers.length) {
      return { opportunities: [], warnings: [] };
    }
    
    // Helper to determine if movement is positive (opportunity) or negative (warning)
    const isPositiveMovement = (from: string, to: string): boolean => {
      // Segment hierarchy (best to worst): apostles > near_apostles > loyalists > mercenaries/hostages > defectors > terrorists
      // Opportunities: moving UP the hierarchy (towards better segments)
      // Warnings: moving DOWN the hierarchy (towards worse segments)
      
      // Special case: Loyalists moving to apostles/near-apostles is POSITIVE (promotion)
      if (from === 'loyalists' && (to === 'apostles' || to === 'near_apostles')) {
        return true;
      }
      
      // Special case: Near-apostles moving to apostles is POSITIVE
      if (from === 'near_apostles' && to === 'apostles') {
        return true;
      }
      
      // If moving TO defectors or terrorists, it's always a warning
      if (to === 'defectors' || to === 'terrorists') {
        return false;
      }
      
      // If apostles/near-apostles moving BACK to loyalists, it's a warning (demotion)
      if ((from === 'apostles' || from === 'near_apostles') && to === 'loyalists') {
        return false;
      }
      
      // If moving TO loyalists, apostles, or near-apostles (from lower segments), it's an opportunity
      if (to === 'loyalists' || to === 'apostles' || to === 'near_apostles') {
        return true;
      }
      
      // If moving FROM defectors or terrorists (to anything better), it's an opportunity
      if (from === 'defectors' || from === 'terrorists') {
        return true;
      }
      
      // For other movements, check if moving to a better segment (lower order)
      const fromOrder = getSegmentSortOrder(from);
      const toOrder = getSegmentSortOrder(to);
      return toOrder < fromOrder;
    };
    
    // Group by target segment and calculate average chances
    const conversions: Record<string, {
      from: string;
      to: string;
      total: number;
      averageChances: number;
      customers: typeof getAllProximityCustomers;
      byOrigin: Record<string, number>;
    }> = {};
    
    getAllProximityCustomers.forEach(customer => {
      const target = customer.targetQuadrant || 'unknown';
      const origin = customer.currentQuadrant || 'unknown';
      const key = `${origin}_to_${target}`;
      
      if (!conversions[key]) {
        conversions[key] = {
          from: origin,
          to: target,
          total: 0,
          averageChances: 0,
          customers: [],
          byOrigin: {}
        };
      }
      
      conversions[key].total++;
      conversions[key].customers.push(customer);
      conversions[key].byOrigin[origin] = (conversions[key].byOrigin[origin] || 0) + 1;
    });
    
    // Calculate average chances for each conversion
    Object.keys(conversions).forEach(key => {
      const conv = conversions[key];
      const sum = conv.customers.reduce((acc, c) => acc + (c.riskScore || 0), 0);
      conv.averageChances = conv.total > 0 ? sum / conv.total : 0;
    });
    
    // Separate into opportunities and warnings, sort by average chances (highest first)
    const opportunities = Object.values(conversions)
      .filter(conv => isPositiveMovement(conv.from, conv.to))
      .sort((a, b) => b.averageChances - a.averageChances);
    
    const warnings = Object.values(conversions)
      .filter(conv => !isPositiveMovement(conv.from, conv.to))
      .sort((a, b) => b.averageChances - a.averageChances);
    
    return { opportunities, warnings };
  }, [getAllProximityCustomers, proximityAnalysis.settings.isAvailable]);

  // Get customers for active tab - MUST be before conditional return
  const tabCustomers = useMemo(() => {
    if (!proximityAnalysis.settings.isAvailable) {
      return [];
    }
    switch (activeTab) {
      case 'total':
        return getAllProximityCustomers;
      case 'lateral':
        return getLateralCustomers;
      case 'diagonal':
        return getDiagonalCustomers;
      case 'crossroads':
        // For crossroads, we'll handle display differently - return empty array
        // The actual display will be handled in the render section
        return [];
      case 'risk':
      case 'targets':
        return []; // These tabs show explanations, not customer lists
      default:
        return [];
    }
  }, [activeTab, getAllProximityCustomers, getLateralCustomers, getDiagonalCustomers, proximityAnalysis.settings.isAvailable, proximityAnalysis.crossroads]);
  
  // Get sorted customers - MUST be before conditional return
  const sortedCustomers = useMemo(() => {
    if (!sortColumn) return tabCustomers;
    
    const sorted = [...tabCustomers].sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      switch (sortColumn) {
        case 'customer':
          aVal = getCustomerDisplayName(a, 0).toLowerCase();
          bVal = getCustomerDisplayName(b, 0).toLowerCase();
          break;
        case 'position':
          aVal = `${a.satisfaction},${a.loyalty}`;
          bVal = `${b.satisfaction},${b.loyalty}`;
          break;
        case 'segment':
          aVal = getQuadrantDisplayName(a.currentQuadrant || '').toLowerCase();
          bVal = getQuadrantDisplayName(b.currentQuadrant || '').toLowerCase();
          break;
        case 'near':
          aVal = a.targetQuadrant ? getQuadrantDisplayName(a.targetQuadrant).toLowerCase() : '';
          bVal = b.targetQuadrant ? getQuadrantDisplayName(b.targetQuadrant).toLowerCase() : '';
          break;
        case 'distance':
          aVal = a.distanceFromBoundary ?? Infinity;
          bVal = b.distanceFromBoundary ?? Infinity;
          break;
        case 'chances':
          aVal = a.riskScore ?? 0;
          bVal = b.riskScore ?? 0;
          break;
        default:
          return 0;
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    // If sorting by customer, group consecutive rows with same customer
    if (sortColumn === 'customer') {
      const grouped: Array<typeof tabCustomers[0]> = [];
      const seen = new Set<string>();
      
      sorted.forEach(customer => {
        const customerId = customer.id || '';
        if (!seen.has(customerId)) {
          // Add all rows for this customer
          const customerRows = sorted.filter(c => (c.id || '') === customerId);
          grouped.push(...customerRows);
          seen.add(customerId);
        }
      });
      
      return grouped;
    }
    
    return sorted;
  }, [tabCustomers, sortColumn, sortDirection, getCustomerDisplayName, getQuadrantDisplayName]);
  
  // Handle unavailable proximity analysis - AFTER all hooks
  if (!proximityAnalysis.settings.isAvailable) {
    return (
      <div className="proximity-section">
        <div className="proximity-header">
          <h3 className="proximity-title">Proximity Analysis</h3>
          <p className="proximity-subtitle">Customers near quadrant boundaries</p>
        </div>
        <Card className="proximity-unavailable">
          <h4>Proximity Analysis Unavailable</h4>
          <p className="proximity-unavailable-reason">
            {proximityAnalysis.settings.unavailabilityReason}
          </p>
          <p className="proximity-empty-hint">
            Try using a larger scale (1-5 or above) for proximity analysis.
          </p>
        </Card>
      </div>
    );
  }

  console.log('🔍 ABOUT TO USE proximityAnalysis.summary:', {
    totalProximityCustomers: proximityAnalysis.summary.totalProximityCustomers,
    isAvailable: proximityAnalysis.settings.isAvailable,
    source: 'proximityAnalysis.summary'
  });

  const summary = proximityAnalysis.summary;
  const correctedSummary = summary;
  
  const proximityPercentage = totalCustomersFromContext > 0 
    ? ((correctedSummary.totalProximityCustomers / totalCustomersFromContext) * 100).toFixed(1)
    : '0.0';
  
  // Sorting logic
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Get valid data (non-excluded)
  const validData = data.filter(item => !item.excluded);
  
  // Handle proximity edge clicks
  const handleEdgeClick = (
    event: React.MouseEvent, 
    quadrant: string, 
    proximityType: string,
    options?: { includeNearApostlesToApostles?: boolean }
  ) => {
    event.stopPropagation();
    event.preventDefault();
    
    if (data.length === 0) {
      return;
    }
    
    // Get proximity customers from the analysis
    let proximityCustomers: DataPoint[] = [];
    const proximityKey = `${quadrant}_close_to_${proximityType}`;
    
    if (proximityAnalysis?.analysis && proximityKey in proximityAnalysis.analysis) {
      const proximityDetail = proximityAnalysis.analysis[proximityKey as keyof typeof proximityAnalysis.analysis];
      
      if (proximityDetail && 'customers' in proximityDetail && proximityDetail.customers) {
        proximityCustomers = proximityDetail.customers.map((customer: any) => ({
          id: customer.id,
          name: customer.name,
          email: customer.email || '',
          satisfaction: customer.satisfaction,
          loyalty: customer.loyalty,
          ...customer
        })) as DataPoint[];
      }
    }
    
    // If this is Near-Apostles and we should include Near-Apostles to Apostles
    let nearApostlesToApostlesCustomers: DataPoint[] = [];
    if (options?.includeNearApostlesToApostles) {
      const nearApostlesKey = 'near_apostles_close_to_apostles';
      if (proximityAnalysis?.analysis && nearApostlesKey in proximityAnalysis.analysis) {
        const nearApostlesDetail = proximityAnalysis.analysis[nearApostlesKey as keyof typeof proximityAnalysis.analysis];
        if (nearApostlesDetail && 'customers' in nearApostlesDetail && nearApostlesDetail.customers) {
          nearApostlesToApostlesCustomers = nearApostlesDetail.customers.map((customer: any) => ({
            id: customer.id,
            name: customer.name,
            email: customer.email || '',
            satisfaction: customer.satisfaction,
            loyalty: customer.loyalty,
            ...customer
          })) as DataPoint[];
        }
      }
    }
    
    // Set selected points for info box display
    setSelectedProximityPoints({
      points: proximityCustomers,
      position: {
        x: event.clientX,
        y: event.clientY
      },
      quadrant: quadrant,
      proximityType: proximityType,
      secondaryPoints: nearApostlesToApostlesCustomers.length > 0 ? nearApostlesToApostlesCustomers : undefined,
      secondaryQuadrant: nearApostlesToApostlesCustomers.length > 0 ? 'near_apostles' : undefined,
      secondaryProximityType: nearApostlesToApostlesCustomers.length > 0 ? 'apostles' : undefined
    });
  };
  
  // Handle proximity display settings changes
  const handleProximitySettingsChange = (newSettings: ProximityDisplaySettings) => {
    setProximityDisplaySettings(newSettings);
  };
  
  const handleProximitySettingsReset = () => {
    setProximityDisplaySettings(createDefaultProximityDisplaySettings());
  };
  
  return (
    <div className="proximity-section">
      <div className="proximity-header">
        <div className="proximity-header-info">
        <h3 className="proximity-title">Proximity Analysis</h3>
        <p className="proximity-subtitle">
          Customers near quadrant boundaries with strategic movement potential
        </p>
        </div>
        <div className="proximity-header-controls">
          <button
            ref={filterButtonRef}
            className={`proximity-control-button ${showControlsPanel ? 'active' : ''} ${filterCount > 0 ? 'has-filters' : ''}`}
            onClick={() => setShowControlsPanel(prev => !prev)}
            title="Display and filter options"
          >
            <MenuIcon size={18} />
            {(filterCount > 0 || hasLocalChanges) && (
              <span className="filter-badge small">{filterCount || 0}</span>
            )}
          </button>
        </div>
      </div>

      {/* Introductory information specific to Proximity Analysis */}
      <div className="proximity-info-section">
        <InfoRibbon text="This section identifies customers who are positioned near quadrant boundaries, indicating potential movement between segments. It helps you understand strategic opportunities (positive movements towards better segments) and risk warnings (negative movements towards worse segments), enabling proactive customer relationship management." />
      </div>

      <div className="proximity-content">
        {/* Proximity Distribution and Details Container */}
        <div className="proximity-distribution-details-container">
          {/* Proximity Distribution */}
          <Card className="proximity-distribution-card">
            <div className="proximity-card-header">
              <h3 className="proximity-card-title">Proximity Distribution</h3>
            </div>
            {validData.length > 0 ? (
              <div className="quadrant-grid" style={{ position: 'relative' }}>
                {/* Hostages with proximity information */}
                <div className="proximity-cell hostages">
                  <div className="quadrant-title">{getDisplayNameForQuadrant('hostages')}</div>
                  <div className="quadrant-value">{contextDistribution.hostages}</div>
                  <div className="quadrant-subtext">
                    ({((validData.filter((p: DataPoint) => 
                      p.satisfaction < midpoint.sat && 
                      p.loyalty >= midpoint.loy).length / validData.length) * 100).toFixed(1)}%)
                  </div>
                  
                  {(proximityAnalysis?.analysis?.hostages_close_to_loyalists?.customerCount || 0) > 0 && (
                    <div 
                      className="proximity-edge right"
                      data-target-quadrant="loyalists"
                      onClick={(e) => handleEdgeClick(e, 'hostages', 'loyalists')}
                    >
                      <span className="edge-count">
                        {proximityAnalysis?.analysis?.hostages_close_to_loyalists?.customerCount || 0}
                      </span>
                    </div>
                  )}
                  
                  {(proximityAnalysis?.analysis?.hostages_close_to_defectors?.customerCount || 0) > 0 && (
                    <div 
                      className="proximity-edge bottom"
                      data-target-quadrant="defectors"
                      onClick={(e) => handleEdgeClick(e, 'hostages', 'defectors')}
                    >
                      <span className="edge-count">
                        {proximityAnalysis?.analysis?.hostages_close_to_defectors?.customerCount || 0}
                      </span>
                    </div>
                  )}
                  
                  {((proximityAnalysis?.analysis as any)?.hostages_close_to_mercenaries?.customerCount || 0) > 0 && (
                    <div 
                      className="proximity-edge bottom-right diagonal"
                      data-target-quadrant="mercenaries"
                      onClick={(e) => handleEdgeClick(e, 'hostages', 'mercenaries')}
                    >
                      <span className="edge-count">
                        {(proximityAnalysis?.analysis as any)?.hostages_close_to_mercenaries?.customerCount || 0}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Loyalists with proximity information */}
                <div className="proximity-cell loyalists">
                  <div className="quadrant-title">{getDisplayNameForQuadrant('loyalists')}</div>
                  <div className="quadrant-value">
                    {contextDistribution.loyalists + (contextDistribution.apostles || 0) + (contextDistribution.near_apostles || 0)}
                  </div>
                  <div className="quadrant-subtext">
                    ({((validData.filter((p: DataPoint) => 
                      p.satisfaction >= midpoint.sat && 
                      p.loyalty >= midpoint.loy).length / validData.length) * 100).toFixed(1)}%)
                  </div>
                  
                  {(proximityAnalysis?.analysis?.loyalists_close_to_mercenaries?.customerCount || 0) > 0 && (
                    <div
                      className="proximity-edge bottom"
                      data-target-quadrant="mercenaries"
                      onClick={(e) => handleEdgeClick(e, 'loyalists', 'mercenaries')}
                    >
                      <span className="edge-count">
                        {proximityAnalysis?.analysis?.loyalists_close_to_mercenaries?.customerCount || 0}
                </span>
              </div>
                  )}
                  
                  {(proximityAnalysis?.analysis?.loyalists_close_to_hostages?.customerCount || 0) > 0 && (
                    <div 
                      className="proximity-edge left"
                      data-target-quadrant="hostages"
                      onClick={(e) => handleEdgeClick(e, 'loyalists', 'hostages')}
                    >
                      <span className="edge-count">
                        {proximityAnalysis?.analysis?.loyalists_close_to_hostages?.customerCount || 0}
                </span>
              </div>
                  )}
                  
                  {((proximityAnalysis?.analysis as any)?.loyalists_close_to_defectors?.customerCount || 0) > 0 && (
                    <div 
                      className="proximity-edge bottom-left diagonal"
                      data-target-quadrant="defectors"
                      onClick={(e) => handleEdgeClick(e, 'loyalists', 'defectors')}
                    >
                      <span className="edge-count">
                        {(proximityAnalysis?.analysis as any)?.loyalists_close_to_defectors?.customerCount || 0}
                </span>
              </div>
                  )}
                  
                  {showSpecialZones && !showNearApostles && 
                    (proximityAnalysis?.analysis?.loyalists_close_to_apostles?.customerCount || 0) > 0 && (
                      <div 
                        className="proximity-edge top-right special"
                        onClick={(e) => handleEdgeClick(e, 'loyalists', 'apostles')}
                      >
                        <span className="edge-count">
                          {proximityAnalysis?.analysis?.loyalists_close_to_apostles?.customerCount || 0}
                </span>
              </div>
                  )}
                  
                  {showNearApostles && (() => {
                    const loyalistsToNearApostles = proximityAnalysis?.analysis?.loyalists_close_to_near_apostles?.customerCount || 0;
                    const nearApostlesToApostles = proximityAnalysis?.analysis?.near_apostles_close_to_apostles?.customerCount || 0;
                    const combinedCount = loyalistsToNearApostles + nearApostlesToApostles;
                    
                    return combinedCount > 0 && (
                      <div 
                        className="proximity-edge top-right special"
                        onClick={(e) => handleEdgeClick(e, 'loyalists', 'near_apostles', {
                          includeNearApostlesToApostles: true
                        })}
                      >
                        <span className="edge-count">
                          {combinedCount}
                        </span>
            </div>
                    );
                  })()}
          </div>

                {/* Defectors with proximity information */}
                <div className="proximity-cell defectors">
                  <div className="quadrant-title">{getDisplayNameForQuadrant('defectors')}</div>
                  <div className="quadrant-value">
                    {contextDistribution.defectors + (contextDistribution.terrorists || 0)}
                  </div>
                  <div className="quadrant-subtext">
                    ({((validData.filter((p: DataPoint) => 
                      p.satisfaction < midpoint.sat && 
                      p.loyalty < midpoint.loy).length / validData.length) * 100).toFixed(1)}%)
            </div>
                  
                  {(proximityAnalysis?.analysis?.defectors_close_to_mercenaries?.customerCount || 0) > 0 && (
                    <div 
                      className="proximity-edge right"
                      data-target-quadrant="mercenaries"
                      onClick={(e) => handleEdgeClick(e, 'defectors', 'mercenaries')}
                    >
                      <span className="edge-count">
                        {proximityAnalysis?.analysis?.defectors_close_to_mercenaries?.customerCount || 0}
                </span>
              </div>
                  )}
                  
                  {(proximityAnalysis?.analysis?.defectors_close_to_hostages?.customerCount || 0) > 0 && (
                    <div 
                      className="proximity-edge top"
                      data-target-quadrant="hostages"
                      onClick={(e) => handleEdgeClick(e, 'defectors', 'hostages')}
                    >
                      <span className="edge-count">
                        {proximityAnalysis?.analysis?.defectors_close_to_hostages?.customerCount || 0}
                </span>
              </div>
                  )}
                  
                  {showSpecialZones && 
                    (proximityAnalysis?.analysis?.defectors_close_to_terrorists?.customerCount || 0) > 0 && (
                      <div 
                        className="proximity-edge bottom-left special"
                        onClick={(e) => handleEdgeClick(e, 'defectors', 'terrorists')}
                      >
                        <span className="edge-count">
                          {proximityAnalysis?.analysis?.defectors_close_to_terrorists?.customerCount || 0}
                </span>
              </div>
                  )}
                  
                  {((proximityAnalysis?.analysis as any)?.defectors_close_to_loyalists?.customerCount || 0) > 0 && (
                    <div 
                      className="proximity-edge top-right diagonal"
                      data-target-quadrant="loyalists"
                      onClick={(e) => handleEdgeClick(e, 'defectors', 'loyalists')}
                    >
                      <span className="edge-count">
                        {(proximityAnalysis?.analysis as any)?.defectors_close_to_loyalists?.customerCount || 0}
                </span>
              </div>
                  )}
            </div>
                
                {/* Mercenaries with proximity information */}
                <div className="proximity-cell mercenaries">
                  <div className="quadrant-title">{getDisplayNameForQuadrant('mercenaries')}</div>
                  <div className="quadrant-value">{contextDistribution.mercenaries}</div>
                  <div className="quadrant-subtext">
                    ({((validData.filter((p: DataPoint) => 
                      p.satisfaction >= midpoint.sat && 
                      p.loyalty < midpoint.loy).length / validData.length) * 100).toFixed(1)}%)
          </div>

                  {(proximityAnalysis?.analysis?.mercenaries_close_to_loyalists?.customerCount || 0) > 0 && (
                    <div 
                      className="proximity-edge top"
                      data-target-quadrant="loyalists"
                      onClick={(e) => handleEdgeClick(e, 'mercenaries', 'loyalists')}
                    >
                      <span className="edge-count">
                        {proximityAnalysis?.analysis?.mercenaries_close_to_loyalists?.customerCount || 0}
                      </span>
            </div>
                  )}
                  
                  {(proximityAnalysis?.analysis?.mercenaries_close_to_defectors?.customerCount || 0) > 0 && (
                    <div 
                      className="proximity-edge left"
                      data-target-quadrant="defectors"
                      onClick={(e) => handleEdgeClick(e, 'mercenaries', 'defectors')}
                    >
                      <span className="edge-count">
                        {proximityAnalysis?.analysis?.mercenaries_close_to_defectors?.customerCount || 0}
                </span>
              </div>
                  )}
                  
                  {((proximityAnalysis?.analysis as any)?.mercenaries_close_to_hostages?.customerCount || 0) > 0 && (
                    <div 
                      className="proximity-edge top-left diagonal"
                      data-target-quadrant="hostages"
                      onClick={(e) => handleEdgeClick(e, 'mercenaries', 'hostages')}
                    >
                      <span className="edge-count">
                        {(proximityAnalysis?.analysis as any)?.mercenaries_close_to_hostages?.customerCount || 0}
                </span>
              </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="proximity-empty-state">
                <p>No data available for proximity distribution</p>
              </div>
            )}
          </Card>

          {/* Proximity Details */}
          <Card className="proximity-details-card">
            <div className="proximity-card-header">
              <h3 className="proximity-card-title">Proximity Details</h3>
            </div>
            <div className="proximity-details-container">
              <ProximityList
                proximityAnalysis={proximityAnalysis}
                totalCustomers={totalCustomersFromContext}
                isClassicModel={isClassicModel}
                isPremium={isPremium}
                displaySettings={proximityDisplaySettings}
              />
            </div>
          </Card>
        </div>

        <Card className="proximity-summary-card">
          <div className="proximity-summary-header">
            <h3 className="proximity-summary-title">Proximity Summary</h3>
          </div>

          {/* Horizontal Tabs */}
          <div className="proximity-tabs">
            <button
              className={`proximity-tab ${activeTab === 'total' ? 'active' : ''}`}
              onClick={() => setActiveTab('total')}
            >
              <div className="tab-content">
                <div className="tab-label">Near Boundaries</div>
                <div className="tab-value">{correctedSummary.totalProximityCustomers}</div>
                <div className="tab-subtext">{proximityPercentage}%</div>
            </div>
            </button>
            
            <button
              className={`proximity-tab ${activeTab === 'lateral' ? 'active' : ''}`}
              onClick={() => setActiveTab('lateral')}
            >
              <div className="tab-content">
                <div className="tab-label">Lateral movements</div>
                <div className="tab-value">{getLateralCustomers.length}</div>
                <div className="tab-subtext">Adjacent</div>
              </div>
            </button>
            
            <button
              className={`proximity-tab ${activeTab === 'diagonal' ? 'active' : ''}`}
              onClick={() => setActiveTab('diagonal')}
            >
              <div className="tab-content">
                <div className="tab-label">Diagonal movements</div>
                <div className="tab-value">{getDiagonalCustomers.length}</div>
                <div className="tab-subtext">Crisis/Opp</div>
              </div>
            </button>
            
            {proximityAnalysis.crossroads && proximityAnalysis.crossroads.totalCount > 0 && (
              <button
                className={`proximity-tab ${activeTab === 'crossroads' ? 'active' : ''}`}
                onClick={() => setActiveTab('crossroads')}
              >
                <div className="tab-content">
                  <div className="tab-label">Crossroads</div>
                  <div className="tab-value">{proximityAnalysis.crossroads.totalCount}</div>
                  <div className="tab-subtext">{proximityAnalysis.crossroads.highValueCount} high</div>
                </div>
              </button>
            )}
            
            <button
              className={`proximity-tab ${activeTab === 'risk' ? 'active' : ''}`}
              onClick={() => setActiveTab('risk')}
            >
              <div className="tab-content">
                <div className="tab-label">Chances</div>
                <div className="tab-value">{Object.keys(riskBySegment).length}</div>
                <div className="tab-subtext">Segments</div>
              </div>
            </button>
            
            <button
              className={`proximity-tab ${activeTab === 'conversions' ? 'active' : ''}`}
              onClick={() => setActiveTab('conversions')}
            >
              <div className="tab-content">
                <div className="tab-label">Actionable Conversions</div>
                <div className="tab-value">{actionableConversions.opportunities.length + actionableConversions.warnings.length}</div>
                <div className="tab-subtext">Priorities</div>
              </div>
            </button>
          </div>

          {/* Info boxes under each tab */}
          {activeTab === 'total' && (
            <div className="proximity-tab-info">
              <InfoRibbon text="This table shows all customers who are positioned near quadrant boundaries. These customers have the potential to move between segments, representing both opportunities for improvement and risks of decline. Each customer may appear in multiple rows if they have proximity relationships with multiple target segments." />
            </div>
          )}
          {activeTab === 'lateral' && (
            <div className="proximity-tab-info">
              <InfoRibbon text="This table shows customers with lateral movements - those moving between adjacent segments (e.g., Loyalists to Mercenaries, or Hostages to Defectors). These movements typically represent gradual shifts in customer satisfaction or loyalty." />
            </div>
          )}
          {activeTab === 'diagonal' && (
            <div className="proximity-tab-info">
              <InfoRibbon text="This table shows customers with diagonal movements - those moving between opposite segments (e.g., Defectors to Loyalists, or Mercenaries to Hostages). These movements represent significant strategic opportunities (positive) or crisis situations (negative) requiring immediate attention." />
            </div>
          )}
          {activeTab === 'crossroads' && (
            <div className="proximity-tab-info">
              <InfoRibbon text="This view shows customers at crossroads - those positioned at the intersection of multiple quadrant boundaries, including neutral customers at the exact midpoint. Each customer is grouped with all their possible movements displayed. These customers are at critical decision points and may move in multiple directions, making them high-priority targets for intervention." />
            </div>
          )}
          {activeTab === 'risk' && (
            <div className="proximity-tab-info">
              <InfoRibbon text="This view shows the average chances (risk scores) by segment for customers near quadrant boundaries. Higher scores indicate customers closer to boundaries with greater potential for movement. Click on a segment to see the detailed list of customers." />
            </div>
          )}
          {activeTab === 'targets' && (
            <div className="proximity-tab-info">
              <InfoRibbon text="This view shows customers grouped by their potential destination segments. Understanding where customers are moving helps prioritise intervention strategies and identify opportunities for customer retention or acquisition." />
            </div>
          )}

          {/* Customer List - Shows when tab is selected */}
          {(tabCustomers.length > 0 || activeTab === 'crossroads') && activeTab !== 'conversions' && (
            <div className="proximity-customer-list">
              <div className="customer-list-header">
                <div className="customer-list-title-section">
                <h4 className="customer-list-title">
                  {activeTab === 'total' && 'All Customers Near Boundaries'}
                  {activeTab === 'lateral' && 'Lateral Movement Customers'}
                  {activeTab === 'diagonal' && 'Diagonal Movement Customers'}
                  {activeTab === 'crossroads' && 'Crossroads Customers'}
                </h4>
                  {activeTab !== 'crossroads' && (
                  <div className="perspective-toggle">
                    <button
                      className={`perspective-btn ${viewPerspective === 'origin' ? 'active' : ''}`}
                      onClick={() => setViewPerspective('origin')}
                      title="View by origin segment"
                    >
                      By Origin
                    </button>
                    <button
                      className={`perspective-btn ${viewPerspective === 'target' ? 'active' : ''}`}
                      onClick={() => setViewPerspective('target')}
                      title="View by target segment"
                    >
                      By Target
                    </button>
                  </div>
                  )}
                </div>
                <span className="customer-count">
                  {activeTab === 'crossroads' 
                    ? (() => {
                        const midpointCustomers = data.filter(point => 
                          !point.excluded && 
                          point.satisfaction === midpoint.sat && 
                          point.loyalty === midpoint.loy
                        ).length;
                        const crossroadsCount = proximityAnalysis.crossroads?.totalCount || 0;
                        return crossroadsCount + midpointCustomers;
                      })()
                    : sortedCustomers.length} customers
                </span>
        </div>

              {activeTab === 'crossroads' ? (
                // Special crossroads view: grouped by customer showing all paths
                (() => {
                  // Get midpoint customers (they can move in ANY direction)
                  const midpointCustomers = data.filter(point => 
                    !point.excluded && 
                    point.satisfaction === midpoint.sat && 
                    point.loyalty === midpoint.loy
                  );
                  
                  // Get crossroads customers from proximity analysis
                  const crossroadsCustomerIds = new Set(
                    proximityAnalysis.crossroads?.customers.map(c => c.id) || []
                  );
                  
                  // Add midpoint customer IDs
                  midpointCustomers.forEach(c => crossroadsCustomerIds.add(c.id));
                  
                  // Get all paths for crossroads customers
                  let crossroadsPaths = getAllProximityCustomers.filter(c => crossroadsCustomerIds.has(c.id));
                  
                  // For neutral (midpoint) customers, check all proximity relationships
                  // to see which zones they're actually near using the existing analysis
                  midpointCustomers.forEach(midpointCustomer => {
                    // Check if this neutral customer already has paths from proximity analysis
                    const hasExistingPaths = crossroadsPaths.some(p => p.id === midpointCustomer.id);
                    
                    if (!hasExistingPaths) {
                      // Check all proximity relationships to see if this neutral customer qualifies
                      // Use the same thresholds as regular proximity analysis:
                      // Main quadrants: distance <= 2.0 (from getDefaultThreshold())
                      // Special zones: distance <= 1 (hardcoded in proximity analysis)
                      const mainQuadrants = ['loyalists', 'mercenaries', 'hostages', 'defectors'];
                      
                      mainQuadrants.forEach(targetQuadrant => {
                        // At exact midpoint, distance to all main quadrant boundaries is 0
                        // Since 0 <= 2.0, always include main quadrants for neutral customers
                        crossroadsPaths.push({
                          id: midpointCustomer.id,
                          name: midpointCustomer.name,
                          satisfaction: midpointCustomer.satisfaction,
                          loyalty: midpointCustomer.loyalty,
                          currentQuadrant: 'midpoint',
                          targetQuadrant: targetQuadrant,
                          relationship: `midpoint_to_${targetQuadrant}`,
                          distanceFromBoundary: 0,
                          riskScore: 100,
                          riskLevel: 'HIGH'
                        });
                      });
                      
                      // Check special zones if enabled - use Chebyshev/Maximum distance
                      // Create a temporary classifier to access zone boundaries
                      const tempClassifier = new EnhancedProximityClassifier(
                        satisfactionScale,
                        loyaltyScale,
                        midpoint,
                        apostlesZoneSize,
                        terroristsZoneSize
                      );
                      
                      if (showSpecialZones && isPremium) {
                        // Check apostles - use actual zone boundaries
                        const apostlesBoundaries = tempClassifier['getSpecialZoneBoundaries']('apostles');
                        if (apostlesBoundaries) {
                          // Calculate Chebyshev/Maximum distance to zone
                          const satDist = Math.min(
                            Math.abs(midpointCustomer.satisfaction - apostlesBoundaries.minSat),
                            Math.abs(midpointCustomer.satisfaction - apostlesBoundaries.maxSat)
                          );
                          const loyDist = Math.min(
                            Math.abs(midpointCustomer.loyalty - apostlesBoundaries.minLoy),
                            Math.abs(midpointCustomer.loyalty - apostlesBoundaries.maxLoy)
                          );
                          // Check if inside zone
                          const isInside = midpointCustomer.satisfaction >= apostlesBoundaries.minSat && 
                                         midpointCustomer.satisfaction <= apostlesBoundaries.maxSat &&
                                         midpointCustomer.loyalty >= apostlesBoundaries.minLoy && 
                                         midpointCustomer.loyalty <= apostlesBoundaries.maxLoy;
                          const apostlesDist = isInside ? 0 : Math.max(satDist, loyDist);
                          
                          // Apply same threshold as regular proximity analysis: distance <= 1 for special zones
                          if (apostlesDist <= 1) {
                            const riskScore = apostlesDist === 0 ? 100 : 70;
                            const riskLevel: 'LOW' | 'MODERATE' | 'HIGH' = apostlesDist === 0 ? 'HIGH' : 'MODERATE';
                            
                            crossroadsPaths.push({
                              id: midpointCustomer.id,
                              name: midpointCustomer.name,
                              satisfaction: midpointCustomer.satisfaction,
                              loyalty: midpointCustomer.loyalty,
                              currentQuadrant: 'midpoint',
                              targetQuadrant: 'apostles',
                              relationship: 'midpoint_to_apostles',
                              distanceFromBoundary: apostlesDist,
                              riskScore: riskScore,
                              riskLevel: riskLevel
                            });
                          }
                        }
                        
                        // Check terrorists
                        const terroristsBoundaries = tempClassifier['getSpecialZoneBoundaries']('terrorists');
                        if (terroristsBoundaries) {
                          const satDist = Math.min(
                            Math.abs(midpointCustomer.satisfaction - terroristsBoundaries.minSat),
                            Math.abs(midpointCustomer.satisfaction - terroristsBoundaries.maxSat)
                          );
                          const loyDist = Math.min(
                            Math.abs(midpointCustomer.loyalty - terroristsBoundaries.minLoy),
                            Math.abs(midpointCustomer.loyalty - terroristsBoundaries.maxLoy)
                          );
                          const isInside = midpointCustomer.satisfaction >= terroristsBoundaries.minSat && 
                                         midpointCustomer.satisfaction <= terroristsBoundaries.maxSat &&
                                         midpointCustomer.loyalty >= terroristsBoundaries.minLoy && 
                                         midpointCustomer.loyalty <= terroristsBoundaries.maxLoy;
                          const terroristsDist = isInside ? 0 : Math.max(satDist, loyDist);
                          
                          // Apply same threshold as regular proximity analysis: distance <= 1 for special zones
                          if (terroristsDist <= 1) {
                            const riskScore = terroristsDist === 0 ? 100 : 70;
                            const riskLevel: 'LOW' | 'MODERATE' | 'HIGH' = terroristsDist === 0 ? 'HIGH' : 'MODERATE';
                            
                            crossroadsPaths.push({
                              id: midpointCustomer.id,
                              name: midpointCustomer.name,
                              satisfaction: midpointCustomer.satisfaction,
                              loyalty: midpointCustomer.loyalty,
                              currentQuadrant: 'midpoint',
                              targetQuadrant: 'terrorists',
                              relationship: 'midpoint_to_terrorists',
                              distanceFromBoundary: terroristsDist,
                              riskScore: riskScore,
                              riskLevel: riskLevel
                            });
                          }
                        }
                      }
                      
                      // Check near_apostles if enabled
                      if (showNearApostles && isPremium) {
                        const nearApostlesBoundaries = tempClassifier['getSpecialZoneBoundaries']('near_apostles');
                        if (nearApostlesBoundaries) {
                          const satDist = Math.min(
                            Math.abs(midpointCustomer.satisfaction - nearApostlesBoundaries.minSat),
                            Math.abs(midpointCustomer.satisfaction - nearApostlesBoundaries.maxSat)
                          );
                          const loyDist = Math.min(
                            Math.abs(midpointCustomer.loyalty - nearApostlesBoundaries.minLoy),
                            Math.abs(midpointCustomer.loyalty - nearApostlesBoundaries.maxLoy)
                          );
                          const isInside = midpointCustomer.satisfaction >= nearApostlesBoundaries.minSat && 
                                         midpointCustomer.satisfaction <= nearApostlesBoundaries.maxSat &&
                                         midpointCustomer.loyalty >= nearApostlesBoundaries.minLoy && 
                                         midpointCustomer.loyalty <= nearApostlesBoundaries.maxLoy;
                          const nearApostlesDist = isInside ? 0 : Math.max(satDist, loyDist);
                          
                          // Apply same threshold as regular proximity analysis: distance <= 1 for special zones
                          if (nearApostlesDist <= 1) {
                            const riskScore = nearApostlesDist === 0 ? 100 : 70;
                            const riskLevel: 'LOW' | 'MODERATE' | 'HIGH' = nearApostlesDist === 0 ? 'HIGH' : 'MODERATE';
                            
                            crossroadsPaths.push({
                              id: midpointCustomer.id,
                              name: midpointCustomer.name,
                              satisfaction: midpointCustomer.satisfaction,
                              loyalty: midpointCustomer.loyalty,
                              currentQuadrant: 'midpoint',
                              targetQuadrant: 'near_apostles',
                              relationship: 'midpoint_to_near_apostles',
                              distanceFromBoundary: nearApostlesDist,
                              riskScore: riskScore,
                              riskLevel: riskLevel
                            });
                          }
                        }
                      }
                    }
                  });
                  
                  // If no crossroads customers at all, show message
                  if (crossroadsPaths.length === 0 && midpointCustomers.length === 0) {
                    return <div className="no-data-message">No crossroads customers found.</div>;
                  }
                  
                  // Group by customer ID
                  const groupedByCustomer = new Map<string, {
                    customer: typeof crossroadsPaths[0];
                    paths: typeof crossroadsPaths;
                    isMidpoint: boolean;
                  }>();
                  
                  crossroadsPaths.forEach(path => {
                    const existing = groupedByCustomer.get(path.id);
                    const isMidpoint = midpointCustomers.some(m => m.id === path.id);
                    
                    if (existing) {
                      existing.paths.push(path);
                    } else {
                      groupedByCustomer.set(path.id, {
                        customer: path,
                        paths: [path],
                        isMidpoint: isMidpoint
                      });
                    }
                  });
                  
                  // Convert to array and sort (midpoint customers first, then by name)
                  const customerGroups = Array.from(groupedByCustomer.values()).sort((a, b) => {
                    // Midpoint customers first
                    if (a.isMidpoint && !b.isMidpoint) return -1;
                    if (!a.isMidpoint && b.isMidpoint) return 1;
                    // Then by name
                    const nameA = getCustomerDisplayName(a.customer, 0).toLowerCase();
                    const nameB = getCustomerDisplayName(b.customer, 0).toLowerCase();
                    return nameA.localeCompare(nameB);
                  });
                  
                  return (
                    <div className="crossroads-customers-view">
                      {customerGroups.map((group, groupIndex) => {
                        const customer = group.customer;
                        const isMidpoint = group.isMidpoint;
                        const paths = group.paths.sort((a, b) => {
                          // Sort by risk level (HIGH first), then by distance
                          const riskOrder = { 'HIGH': 0, 'MODERATE': 1, 'LOW': 2 };
                          const riskDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
                          if (riskDiff !== 0) return riskDiff;
                          return a.distanceFromBoundary - b.distanceFromBoundary;
                        });
                        
                        const customerKey = customer.id || `customer-${groupIndex}`;
                        const isExpanded = expandedCrossroadsCustomers.has(customerKey);
                        
                        return (
                          <div key={customerKey} className={`crossroads-customer-group ${isMidpoint ? 'midpoint-customer' : ''}`}>
                            <div 
                              className="crossroads-customer-header"
                              onClick={() => {
                                const newExpanded = new Set(expandedCrossroadsCustomers);
                                if (isExpanded) {
                                  newExpanded.delete(customerKey);
                                } else {
                                  newExpanded.add(customerKey);
                                }
                                setExpandedCrossroadsCustomers(newExpanded);
                              }}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="crossroads-customer-info">
                                <div className="crossroads-customer-name">
                                  {isExpanded ? (
                                    <ChevronDown size={16} className="target-segment-group-icon" />
                                  ) : (
                                    <ChevronRight size={16} className="target-segment-group-icon" />
                                  )}
                                  {getCustomerDisplayName(customer, groupIndex)}
                                  {customer.id && <span className="crossroads-customer-id">ID: {customer.id}</span>}
                                  {isMidpoint && (
                                    <span className="neutral-badge" style={{ 
                                      background: 'rgba(156, 163, 175, 0.15)', 
                                      color: '#6b7280',
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      fontWeight: 600,
                                      marginLeft: '0.5rem'
                                    }}>
                                      Neutral
                                    </span>
                                  )}
                                </div>
                                <div className="crossroads-customer-position">
                                  Position: ({customer.satisfaction}, {customer.loyalty})
                                </div>
                                <div className="crossroads-customer-origin">
                                  <span style={{ fontWeight: 600, marginRight: '0.5rem' }}>Origin:</span>
                                  {isMidpoint ? (
                                    <span style={{ 
                                      fontStyle: 'italic', 
                                      color: '#6b7280',
                                      fontSize: '0.875rem'
                                    }}>
                                      Equidistant from all quadrants
                                    </span>
                                  ) : (
                                    <span className="quadrant-badge" style={getQuadrantBadgeStyle(customer.currentQuadrant || '')}>
                                      {getQuadrantDisplayName(customer.currentQuadrant || '')}
                                    </span>
                                  )}
                                </div>
                                {!isExpanded && (
                                  <div className="crossroads-paths-preview">
                                    <span style={{ fontWeight: 600, marginRight: '0.5rem', fontSize: '0.875rem' }}>Possible movements:</span>
                                    <div className="crossroads-paths-tags">
                                      {paths.map((path, pathIndex) => (
                                        <span 
                                          key={`${path.id}-${path.targetQuadrant}-${pathIndex}`}
                                          className="crossroads-path-tag"
                                        >
                                          <span className="quadrant-badge" style={getQuadrantBadgeStyle(path.targetQuadrant)}>
                                            {getQuadrantDisplayName(path.targetQuadrant)}
                                          </span>
                                          <span className="crossroads-path-tag-chances">
                                            ({getRiskLevelText(path.riskLevel)})
                                          </span>
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="crossroads-paths-count">
                                {paths.length} possible movement{paths.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            {isExpanded && (
                            <div className="crossroads-paths-list">
                              <div className="crossroads-paths-header">
                                <div className="crossroads-path-target">Target Segment</div>
                                <div className="crossroads-path-distance">Distance</div>
                                <div className="crossroads-path-chances">Chances</div>
                              </div>
                              {paths.map((path, pathIndex) => (
                                <div key={`${path.id}-${path.targetQuadrant}-${pathIndex}`} className="crossroads-path-item">
                                  <div className="crossroads-path-target">
                                    <span className="quadrant-badge" style={getQuadrantBadgeStyle(path.targetQuadrant)}>
                                      {getQuadrantDisplayName(path.targetQuadrant)}
                                    </span>
                                  </div>
                                  <div className="crossroads-path-distance">
                                    {path.distanceFromBoundary !== undefined ? path.distanceFromBoundary.toFixed(2) : '—'}
                                  </div>
                                  <div className="crossroads-path-chances">
                                    <span className={`risk-badge risk-${path.riskLevel.toLowerCase()}`}>
                                      {getRiskLevelText(path.riskLevel)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
              <div className="customer-table">
                <div className="customer-table-header">
                  <div className="col-customer sortable" onClick={() => handleSort('customer')}>
                    Customer {sortColumn === 'customer' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                  <div className="col-position sortable" onClick={() => handleSort('position')}>
                    Position {sortColumn === 'position' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                  <div className="col-quadrant sortable" onClick={() => handleSort('segment')}>
                    Origin {sortColumn === 'segment' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                  <div className="col-target sortable" onClick={() => handleSort('near')}>
                    Target {sortColumn === 'near' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                  <div className="col-distance sortable" onClick={() => handleSort('distance')}>
                    Distance {sortColumn === 'distance' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                  <div className="col-risk sortable" onClick={() => handleSort('chances')}>
                    Chances {sortColumn === 'chances' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                </div>
                
                <div className="customer-table-body">
                  {viewPerspective === 'origin' ? (
                    // Origin perspective: grouped by origin segment
                    (() => {
                      const groupedByOrigin: Record<string, typeof sortedCustomers> = {};
                      sortedCustomers.forEach(customer => {
                        const origin = customer.currentQuadrant || 'unknown';
                        if (!groupedByOrigin[origin]) {
                          groupedByOrigin[origin] = [];
                        }
                        groupedByOrigin[origin].push(customer);
                      });
                      
                      // Helper to check if this is the first occurrence of a customer when sorted by customer
                      const isFirstCustomerOccurrence = (customer: typeof sortedCustomers[0], allCustomers: typeof sortedCustomers, currentIndex: number): boolean => {
                        if (sortColumn !== 'customer' || !customer.id) return true;
                        const customerId = customer.id;
                        for (let i = 0; i < currentIndex; i++) {
                          if (allCustomers[i].id === customerId) return false;
                        }
                        return true;
                      };
                      
                      return Object.entries(groupedByOrigin)
                        .sort(([a], [b]) => {
                          const aOrder = getSegmentSortOrder(a);
                          const bOrder = getSegmentSortOrder(b);
                          if (aOrder !== bOrder) return aOrder - bOrder;
                          return a.localeCompare(b);
                        })
                        .map(([originSegment, customers]) => {
                          const groupKey = `origin-${originSegment}`;
                          const isExpanded = expandedGroups.has(groupKey);
                          
                          return (
                          <div key={originSegment} className="target-segment-group">
                            <div 
                              className="target-segment-group-header"
                              onClick={() => {
                                const newExpanded = new Set(expandedGroups);
                                if (isExpanded) {
                                  newExpanded.delete(groupKey);
                                } else {
                                  newExpanded.add(groupKey);
                                }
                                setExpandedGroups(newExpanded);
                              }}
                            >
                              <div className="target-segment-group-title">
                                {isExpanded ? (
                                  <ChevronDown size={16} className="target-segment-group-icon" />
                                ) : (
                                  <ChevronRight size={16} className="target-segment-group-icon" />
                                )}
                                <span style={{ fontWeight: 600, marginRight: '0.5rem' }}>Origin:</span>
                                <span className="quadrant-badge" style={getQuadrantBadgeStyle(originSegment)}>
                                  {getQuadrantDisplayName(originSegment)}
                                </span>
                                <span className="target-segment-group-count">{customers.length} customers</span>
                              </div>
                            </div>
                            {isExpanded && (
                            <div className="target-segment-origin-groups">
                              {customers.map((customer, index) => {
                                const uniqueKey = customer.id 
                                  ? `${customer.id}-${customer.relationship || customer.currentQuadrant}-${customer.targetQuadrant || 'none'}-${index}`
                                  : `customer-${index}`;
                                
                                // Check if this customer appears earlier in the sorted list
                                const customerIndexInSorted = sortedCustomers.findIndex(c => 
                                  c.id === customer.id && 
                                  c.currentQuadrant === customer.currentQuadrant &&
                                  c.targetQuadrant === customer.targetQuadrant &&
                                  c.relationship === customer.relationship
                                );
                                const isFirstOccurrence = customerIndexInSorted === sortedCustomers.findIndex(c => c.id === customer.id);
                                const showConnector = sortColumn === 'customer' && customer.id && !isFirstOccurrence;
                                
                                return (
                                  <div key={uniqueKey} className={`customer-row ${showConnector ? 'customer-continuation' : ''}`}>
                                    <div className="col-customer">
                                      {showConnector ? (
                                        <div className="customer-connector">
                                          <svg width="32" height="20" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}>
                                            <line x1="0" y1="10" x2="24" y2="10" stroke="#9ca3af" strokeWidth="1.5" />
                                            <line x1="0" y1="10" x2="0" y2="2" stroke="#9ca3af" strokeWidth="1.5" />
                                          </svg>
                                          <div style={{ marginLeft: '36px', color: '#9ca3af', fontSize: '0.875rem' }}>
                                            <div className="customer-name" style={{ color: '#9ca3af' }}>{getCustomerDisplayName(customer, index)}</div>
                                            {customer.id && <div className="customer-id" style={{ color: '#9ca3af', fontSize: '0.75rem' }}>ID: {customer.id}</div>}
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="customer-name">{getCustomerDisplayName(customer, index)}</div>
                                          {customer.id && <div className="customer-id">ID: {customer.id}</div>}
                                        </>
                                      )}
                                    </div>
                                    <div className="col-position">
                                      ({customer.satisfaction}, {customer.loyalty})
                                    </div>
                                    <div className="col-quadrant">
                                      <span className="quadrant-badge" style={getQuadrantBadgeStyle(customer.currentQuadrant || '')}>
                                        {getQuadrantDisplayName(customer.currentQuadrant || '')}
                                      </span>
                                    </div>
                                    <div className="col-target">
                                      {customer.targetQuadrant ? (
                                        <span className="quadrant-badge" style={getQuadrantBadgeStyle(customer.targetQuadrant)}>
                                          {getQuadrantDisplayName(customer.targetQuadrant)}
                                        </span>
                                      ) : (
                                        <span className="text-muted">—</span>
                                      )}
                                    </div>
                                    <div className="col-distance">
                                      {customer.distanceFromBoundary !== undefined ? customer.distanceFromBoundary.toFixed(2) : '—'}
                                    </div>
                                    <div className="col-risk">
                                      <span className={`risk-badge risk-${customer.riskLevel.toLowerCase()}`}>
                                        {getRiskLevelText(customer.riskLevel)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            )}
                          </div>
                          );
                        });
                    })()
                  ) : (
                    // Target perspective: grouped by target segment
                    (() => {
                      const groupedByTarget: Record<string, typeof sortedCustomers> = {};
                      sortedCustomers.forEach(customer => {
                        const target = customer.targetQuadrant || 'unknown';
                        if (!groupedByTarget[target]) {
                          groupedByTarget[target] = [];
                        }
                        groupedByTarget[target].push(customer);
                      });
                      
                      return Object.entries(groupedByTarget)
                        .sort(([a], [b]) => {
                          const aOrder = getSegmentSortOrder(a);
                          const bOrder = getSegmentSortOrder(b);
                          if (aOrder !== bOrder) return aOrder - bOrder;
                          return a.localeCompare(b);
                        })
                        .map(([targetSegment, customers]) => {
                          const groupKey = `target-${targetSegment}`;
                          const isExpanded = expandedGroups.has(groupKey);
                          
                          return (
                          <div key={targetSegment} className="target-segment-group">
                            <div 
                              className="target-segment-group-header"
                              onClick={() => {
                                const newExpanded = new Set(expandedGroups);
                                if (isExpanded) {
                                  newExpanded.delete(groupKey);
                                } else {
                                  newExpanded.add(groupKey);
                                }
                                setExpandedGroups(newExpanded);
                              }}
                            >
                              <div className="target-segment-group-title">
                                {isExpanded ? (
                                  <ChevronDown size={16} className="target-segment-group-icon" />
                                ) : (
                                  <ChevronRight size={16} className="target-segment-group-icon" />
                                )}
                                <span style={{ fontWeight: 600, marginRight: '0.5rem' }}>Target:</span>
                                <span className="quadrant-badge" style={getQuadrantBadgeStyle(targetSegment)}>
                                  {getQuadrantDisplayName(targetSegment)}
                                </span>
                                <span className="target-segment-group-count">{customers.length} customers</span>
                </div>
              </div>
                            {isExpanded && (
                            <div className="target-segment-origin-groups">
                              {customers.map((customer, index) => {
                                const uniqueKey = customer.id 
                                  ? `${customer.id}-${customer.relationship || customer.currentQuadrant}-${customer.targetQuadrant || 'none'}-${index}`
                                  : `customer-${index}`;
                                
                                // Check if this customer appears earlier in the sorted list
                                const customerIndexInSorted = sortedCustomers.findIndex(c => 
                                  c.id === customer.id && 
                                  c.currentQuadrant === customer.currentQuadrant &&
                                  c.targetQuadrant === customer.targetQuadrant &&
                                  c.relationship === customer.relationship
                                );
                                const isFirstOccurrence = customerIndexInSorted === sortedCustomers.findIndex(c => c.id === customer.id);
                                const showConnector = sortColumn === 'customer' && customer.id && !isFirstOccurrence;
                                
                                return (
                                  <div key={uniqueKey} className={`customer-row ${showConnector ? 'customer-continuation' : ''}`}>
                                    <div className="col-customer">
                                      {showConnector ? (
                                        <div className="customer-connector">
                                          <svg width="32" height="20" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }}>
                                            <line x1="0" y1="10" x2="24" y2="10" stroke="#9ca3af" strokeWidth="1.5" />
                                            <line x1="0" y1="10" x2="0" y2="2" stroke="#9ca3af" strokeWidth="1.5" />
                                          </svg>
                                          <div style={{ marginLeft: '36px', color: '#9ca3af', fontSize: '0.875rem' }}>
                                            <div className="customer-name" style={{ color: '#9ca3af' }}>{getCustomerDisplayName(customer, index)}</div>
                                            {customer.id && <div className="customer-id" style={{ color: '#9ca3af', fontSize: '0.75rem' }}>ID: {customer.id}</div>}
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="customer-name">{getCustomerDisplayName(customer, index)}</div>
                                          {customer.id && <div className="customer-id">ID: {customer.id}</div>}
                                        </>
                                      )}
                                    </div>
                                    <div className="col-position">
                                      ({customer.satisfaction}, {customer.loyalty})
                                    </div>
                                    <div className="col-quadrant">
                                      <span className="quadrant-badge" style={getQuadrantBadgeStyle(customer.currentQuadrant || '')}>
                                        {getQuadrantDisplayName(customer.currentQuadrant || '')}
                                      </span>
                                    </div>
                                    <div className="col-target">
                                      {customer.targetQuadrant ? (
                                        <span className="quadrant-badge" style={getQuadrantBadgeStyle(customer.targetQuadrant)}>
                                          {getQuadrantDisplayName(customer.targetQuadrant)}
                                        </span>
                                      ) : (
                                        <span className="text-muted">—</span>
                                      )}
                                    </div>
                                    <div className="col-distance">
                                      {customer.distanceFromBoundary !== undefined ? customer.distanceFromBoundary.toFixed(2) : '—'}
                                    </div>
                                    <div className="col-risk">
                                      <span className={`risk-badge risk-${customer.riskLevel.toLowerCase()}`}>
                                        {getRiskLevelText(customer.riskLevel)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            )}
                          </div>
                          );
                        });
                    })()
                  )}
                </div>
              </div>
              )}
                </div>
              )}
          
          {/* Risk by Segment */}
          {activeTab === 'risk' && (
            <div className="risk-by-segment-section">
              <div className="customer-list-header">
                <div className="customer-list-title-section">
                  <h4 className="customer-list-title">Chances by Segment</h4>
                  <div className="perspective-toggle">
                    <button
                      className={`perspective-btn ${viewPerspective === 'origin' ? 'active' : ''}`}
                      onClick={() => setViewPerspective('origin')}
                      title="View by origin segment"
                    >
                      By Origin
                    </button>
                    <button
                      className={`perspective-btn ${viewPerspective === 'target' ? 'active' : ''}`}
                      onClick={() => setViewPerspective('target')}
                      title="View by target segment"
                    >
                      By Target
                    </button>
                  </div>
                </div>
              </div>
              <div className="risk-segments-cards">
                {Object.entries(riskBySegment)
                  .sort(([a], [b]) => {
                    const aOrder = getSegmentSortOrder(a);
                    const bOrder = getSegmentSortOrder(b);
                    if (aOrder !== bOrder) return aOrder - bOrder;
                    // If same order, sort alphabetically
                    const aName = getQuadrantDisplayName(a).toLowerCase();
                    const bName = getQuadrantDisplayName(b).toLowerCase();
                    return aName.localeCompare(bName);
                  })
                  .map(([segment, data]) => {
                    const isExpanded = expandedRiskSegments.has(segment);
                    
                    return (
                      <div key={segment} className="risk-segment-card">
                        <button
                          className="risk-segment-card-header"
                          onClick={() => {
                            const newExpanded = new Set(expandedRiskSegments);
                            if (isExpanded) {
                              newExpanded.delete(segment);
                            } else {
                              newExpanded.add(segment);
                            }
                            setExpandedRiskSegments(newExpanded);
                          }}
                        >
                          <div className="risk-segment-info">
                            <span className="risk-segment-badge" style={getQuadrantBadgeStyle(segment, true)}>
                              {getQuadrantDisplayName(segment)}
                            </span>
                            <div className="risk-segment-stats">
                              <span className="risk-segment-average">{data.average.toFixed(1)}% average chances</span>
                              <span className="risk-segment-level">
                                {data.average >= 70 ? 'Higher' : data.average >= 40 ? 'Moderate' : 'Lower'}
                              </span>
              </div>
                  </div>
                          <span className="risk-segment-count">{data.total} customers</span>
                          <span className="risk-segment-icon">{isExpanded ? '▼' : '▶'}</span>
                        </button>
                        
                        {isExpanded && (() => {
                          // Sort customers for this segment
                          const sortedSegmentCustomers = [...data.customers].sort((a, b) => {
                            if (!riskSegmentSortColumn) return 0;
                            
                            let aVal: any;
                            let bVal: any;
                            
                            switch (riskSegmentSortColumn) {
                              case 'customer':
                                aVal = getCustomerDisplayName(a, 0).toLowerCase();
                                bVal = getCustomerDisplayName(b, 0).toLowerCase();
                                break;
                              case 'position':
                                aVal = `${a.satisfaction},${a.loyalty}`;
                                bVal = `${b.satisfaction},${b.loyalty}`;
                                break;
                              case 'segment':
                                aVal = getQuadrantDisplayName(a.currentQuadrant || '').toLowerCase();
                                bVal = getQuadrantDisplayName(b.currentQuadrant || '').toLowerCase();
                                break;
                              case 'near':
                                aVal = a.targetQuadrant ? getQuadrantDisplayName(a.targetQuadrant).toLowerCase() : '';
                                bVal = b.targetQuadrant ? getQuadrantDisplayName(b.targetQuadrant).toLowerCase() : '';
                                break;
                              case 'distance':
                                aVal = a.distanceFromBoundary ?? Infinity;
                                bVal = b.distanceFromBoundary ?? Infinity;
                                break;
                              case 'chances':
                                aVal = a.riskScore ?? 0;
                                bVal = b.riskScore ?? 0;
                                break;
                              default:
                                return 0;
                            }
                            
                            if (aVal < bVal) return riskSegmentSortDirection === 'asc' ? -1 : 1;
                            if (aVal > bVal) return riskSegmentSortDirection === 'asc' ? 1 : -1;
                            return 0;
                          });
                          
                          const handleRiskSegmentSort = (column: string) => {
                            if (riskSegmentSortColumn === column) {
                              setRiskSegmentSortDirection(riskSegmentSortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setRiskSegmentSortColumn(column);
                              setRiskSegmentSortDirection('asc');
                            }
                          };
                          
                          return (
                            <div className="risk-segment-customers">
                              <div className="customer-table">
                                <div className="customer-table-header">
                                  <div className="col-customer sortable" onClick={() => handleRiskSegmentSort('customer')}>
                                    Customer {riskSegmentSortColumn === 'customer' && (riskSegmentSortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                                  <div className="col-position sortable" onClick={() => handleRiskSegmentSort('position')}>
                                    Position {riskSegmentSortColumn === 'position' && (riskSegmentSortDirection === 'asc' ? '↑' : '↓')}
                  </div>
                                  <div className="col-quadrant sortable" onClick={() => handleRiskSegmentSort('segment')}>
                                    Segment {riskSegmentSortColumn === 'segment' && (riskSegmentSortDirection === 'asc' ? '↑' : '↓')}
                </div>
                                  <div className="col-target sortable" onClick={() => handleRiskSegmentSort('near')}>
                                    Near {riskSegmentSortColumn === 'near' && (riskSegmentSortDirection === 'asc' ? '↑' : '↓')}
            </div>
                                  <div className="col-distance sortable" onClick={() => handleRiskSegmentSort('distance')}>
                                    Distance {riskSegmentSortColumn === 'distance' && (riskSegmentSortDirection === 'asc' ? '↑' : '↓')}
                                  </div>
                                  <div className="col-risk sortable" onClick={() => handleRiskSegmentSort('chances')}>
                                    Chances {riskSegmentSortColumn === 'chances' && (riskSegmentSortDirection === 'asc' ? '↑' : '↓')}
                                  </div>
                                </div>
                                
                              <div className="customer-table-body">
                                {sortedSegmentCustomers.map((customer, index) => {
                                  const uniqueKey = customer.id 
                                    ? `${customer.id}-${customer.relationship || customer.currentQuadrant}-${customer.targetQuadrant || 'none'}-${index}`
                                    : `customer-${index}`;
                                  
                                  // Check if this customer appears earlier in the list
                                  const customerIndexInList = sortedSegmentCustomers.findIndex(c => 
                                    c.id === customer.id && 
                                    c.currentQuadrant === customer.currentQuadrant &&
                                    c.targetQuadrant === customer.targetQuadrant &&
                                    c.relationship === customer.relationship
                                  );
                                  const isFirstOccurrence = customerIndexInList === sortedSegmentCustomers.findIndex(c => c.id === customer.id);
                                  const showConnector = riskSegmentSortColumn === 'customer' && customer.id && !isFirstOccurrence;
                                  
                                  return (
                                    <div key={uniqueKey} className={`customer-row ${showConnector ? 'customer-continuation' : ''}`}>
                                      <div className="col-customer">
                                        {showConnector ? (
                                          <div className="customer-connector">
                                            <svg width="20" height="20" style={{ position: 'absolute', left: '-8px', top: '50%', transform: 'translateY(-50%)' }}>
                                              <line x1="0" y1="10" x2="12" y2="10" stroke="#9ca3af" strokeWidth="1.5" />
                                              <line x1="12" y1="10" x2="12" y2="20" stroke="#9ca3af" strokeWidth="1.5" />
                                            </svg>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="customer-name">{getCustomerDisplayName(customer, index)}</div>
                                            {customer.id && <div className="customer-id">ID: {customer.id}</div>}
                                          </>
                                        )}
                                      </div>
                                      <div className="col-position">
                                        ({customer.satisfaction}, {customer.loyalty})
                                      </div>
                                      <div className="col-quadrant">
                                        <span className="quadrant-badge" style={getQuadrantBadgeStyle(customer.currentQuadrant || '')}>
                                          {getQuadrantDisplayName(customer.currentQuadrant || '')}
                                        </span>
                                      </div>
                                      <div className="col-target">
                                        {customer.targetQuadrant ? (
                                          <span className="quadrant-badge" style={getQuadrantBadgeStyle(customer.targetQuadrant)}>
                                            {getQuadrantDisplayName(customer.targetQuadrant)}
                                          </span>
                                        ) : (
                                          <span className="text-muted">—</span>
                                        )}
                                      </div>
                                      <div className="col-distance">
                                        {customer.distanceFromBoundary !== undefined ? customer.distanceFromBoundary.toFixed(2) : '—'}
                                      </div>
                                      <div className="col-risk">
                                        <span className={`risk-badge risk-${customer.riskLevel.toLowerCase()}`}>
                                          {getRiskLevelText(customer.riskLevel)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          );
                        })()}
                      </div>
                    );
                  })}
              </div>
          </div>
        )}

          {/* Actionable Conversions Display */}
          {activeTab === 'conversions' && (
            <div className="actionable-conversions-section">
              {/* High Priority Opportunities */}
              {actionableConversions.opportunities.length > 0 && (
                <div className="conversions-group opportunity">
                  <div className="conversions-group-header">
                    <h3 className="conversions-group-title">
                      <span className="priority-badge opportunity">High Priority Opportunity</span>
                      Positive movements towards better segments
                    </h3>
                    <span className="conversions-count">{actionableConversions.opportunities.length} conversions</span>
              </div>
                  
                  <div className="conversions-cards">
                    {actionableConversions.opportunities.map((conv, idx) => {
                      const conversionKey = `${conv.from}_to_${conv.to}`;
                      const isExpanded = expandedConversions.has(conversionKey);
                      const chancesLevel = conv.averageChances >= 75 ? 'high' : conv.averageChances >= 50 ? 'moderate' : 'low';
                      
                      return (
                        <div 
                          key={conversionKey}
                          className={`conversion-card opportunity ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedConversions(prev => {
                                const next = new Set(prev);
                                next.delete(conversionKey);
                                return next;
                              });
                            } else {
                              setExpandedConversions(prev => new Set(prev).add(conversionKey));
                            }
                          }}
                        >
                          <div className="conversion-card-header">
                            <div className="conversion-path">
                              <span className="conversion-from" style={getQuadrantBadgeStyle(conv.from)}>
                                {getQuadrantDisplayName(conv.from)}
                              </span>
                              <span className="conversion-arrow">→</span>
                              <span className="conversion-to" style={getQuadrantBadgeStyle(conv.to)}>
                                {getQuadrantDisplayName(conv.to)}
                              </span>
                    </div>
                            <div className="conversion-stats">
                              <span className="conversion-count">{conv.total} customers</span>
                              <span className={`chances-badge ${chancesLevel}`}>
                                {conv.averageChances >= 75 ? 'Higher' : conv.averageChances >= 50 ? 'Moderate' : 'Lower'} chances
                              </span>
            </div>
            </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Expanded customer lists */}
                  {Array.from(expandedConversions).filter(key => {
                    const [from, to] = key.split('_to_');
                    return actionableConversions.opportunities.some(c => c.from === from && c.to === to);
                  }).map(conversionKey => {
                    const [from, to] = conversionKey.split('_to_');
                    const conv = actionableConversions.opportunities.find(c => c.from === from && c.to === to);
                    if (!conv) return null;
                    
                    return (
                      <div key={conversionKey} className="conversion-customers-list">
                        <div className="customer-list-header">
                          <h4 className="customer-list-title">
                            {getQuadrantDisplayName(from)} → {getQuadrantDisplayName(to)}
                          </h4>
                          <span className="customer-count">{conv.total} customers</span>
                        </div>
                        <div className="customer-table">
                          <div className="customer-table-header">
                            <div className="col-customer sortable" onClick={() => handleSort('customer')}>
                              Customer {sortColumn === 'customer' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </div>
                            <div className="col-position sortable" onClick={() => handleSort('position')}>
                              Position {sortColumn === 'position' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </div>
                            <div className="col-distance sortable" onClick={() => handleSort('distance')}>
                              Distance {sortColumn === 'distance' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </div>
                            <div className="col-risk sortable" onClick={() => handleSort('chances')}>
                              Chances {sortColumn === 'chances' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </div>
                          </div>
                          <div className="customer-table-body">
                            {conv.customers.map((customer, index) => {
                              const uniqueKey = customer.id 
                                ? `${customer.id}-${customer.relationship || customer.currentQuadrant}-${customer.targetQuadrant || 'none'}-${index}`
                                : `customer-${index}`;
                              
                              // Check if this customer appears earlier in the list
                              const customerIndexInList = conv.customers.findIndex(c => 
                                c.id === customer.id && 
                                c.currentQuadrant === customer.currentQuadrant &&
                                c.targetQuadrant === customer.targetQuadrant &&
                                c.relationship === customer.relationship
                              );
                              const isFirstOccurrence = customerIndexInList === conv.customers.findIndex(c => c.id === customer.id);
                              const showConnector = sortColumn === 'customer' && customer.id && !isFirstOccurrence;
                              
                              return (
                                <div key={uniqueKey} className={`customer-row ${showConnector ? 'customer-continuation' : ''}`}>
                                  <div className="col-customer">
                                    {showConnector ? (
                                      <div className="customer-connector">
                                        <svg width="20" height="20" style={{ position: 'absolute', left: '-8px', top: '50%', transform: 'translateY(-50%)' }}>
                                          <line x1="0" y1="10" x2="12" y2="10" stroke="#9ca3af" strokeWidth="1.5" />
                                          <line x1="12" y1="10" x2="12" y2="20" stroke="#9ca3af" strokeWidth="1.5" />
                                        </svg>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="customer-name">{getCustomerDisplayName(customer, index)}</div>
                                        {customer.id && <div className="customer-id">ID: {customer.id}</div>}
                                      </>
                                    )}
                                  </div>
                                  <div className="col-position">
                                    ({customer.satisfaction}, {customer.loyalty})
                                  </div>
                                  <div className="col-quadrant">
                                    <span className="quadrant-badge" style={getQuadrantBadgeStyle(customer.currentQuadrant || '')}>
                                      {getQuadrantDisplayName(customer.currentQuadrant || '')}
                                    </span>
                                  </div>
                                  <div className="col-target">
                                    {customer.targetQuadrant ? (
                                      <span className="quadrant-badge" style={getQuadrantBadgeStyle(customer.targetQuadrant)}>
                                        {getQuadrantDisplayName(customer.targetQuadrant)}
                                      </span>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </div>
                                  <div className="col-distance">
                                    {customer.distanceFromBoundary !== undefined ? customer.distanceFromBoundary.toFixed(2) : '—'}
                                  </div>
                                  <div className="col-risk">
                                    <span className={`risk-badge risk-${customer.riskLevel.toLowerCase()}`}>
                                      {getRiskLevelText(customer.riskLevel)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* High Priority Warnings */}
              {actionableConversions.warnings.length > 0 && (
                <div className="conversions-group warning">
                  <div className="conversions-group-header">
                    <h3 className="conversions-group-title">
                      <span className="priority-badge warning">High Priority Warning</span>
                      Negative movements towards worse segments
                    </h3>
                    <span className="conversions-count">{actionableConversions.warnings.length} conversions</span>
                  </div>
                  
                  <div className="conversions-cards">
                    {actionableConversions.warnings.map((conv, idx) => {
                      const conversionKey = `${conv.from}_to_${conv.to}`;
                      const isExpanded = expandedConversions.has(conversionKey);
                      const chancesLevel = conv.averageChances >= 75 ? 'high' : conv.averageChances >= 50 ? 'moderate' : 'low';
                      
                      return (
                        <div 
                          key={conversionKey}
                          className={`conversion-card warning ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => {
                            if (isExpanded) {
                              setExpandedConversions(prev => {
                                const next = new Set(prev);
                                next.delete(conversionKey);
                                return next;
                              });
                            } else {
                              setExpandedConversions(prev => new Set(prev).add(conversionKey));
                            }
                          }}
                        >
                          <div className="conversion-card-header">
                            <div className="conversion-path">
                              <span className="conversion-from" style={getQuadrantBadgeStyle(conv.from)}>
                                {getQuadrantDisplayName(conv.from)}
                              </span>
                              <span className="conversion-arrow">→</span>
                              <span className="conversion-to" style={getQuadrantBadgeStyle(conv.to)}>
                                {getQuadrantDisplayName(conv.to)}
                              </span>
                            </div>
                            <div className="conversion-stats">
                              <span className="conversion-count">{conv.total} customers</span>
                              <span className={`chances-badge ${chancesLevel}`}>
                                {conv.averageChances >= 75 ? 'Higher' : conv.averageChances >= 50 ? 'Moderate' : 'Lower'} chances
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Expanded customer lists */}
                  {Array.from(expandedConversions).filter(key => {
                    const [from, to] = key.split('_to_');
                    return actionableConversions.warnings.some(c => c.from === from && c.to === to);
                  }).map(conversionKey => {
                    const [from, to] = conversionKey.split('_to_');
                    const conv = actionableConversions.warnings.find(c => c.from === from && c.to === to);
                    if (!conv) return null;
                    
                    return (
                      <div key={conversionKey} className="conversion-customers-list">
                        <div className="customer-list-header">
                          <h4 className="customer-list-title">
                            {getQuadrantDisplayName(from)} → {getQuadrantDisplayName(to)}
                          </h4>
                          <span className="customer-count">{conv.total} customers</span>
                        </div>
                        <div className="customer-table">
                          <div className="customer-table-header">
                            <div className="col-customer sortable" onClick={() => handleSort('customer')}>
                              Customer {sortColumn === 'customer' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </div>
                            <div className="col-position sortable" onClick={() => handleSort('position')}>
                              Position {sortColumn === 'position' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </div>
                            <div className="col-distance sortable" onClick={() => handleSort('distance')}>
                              Distance {sortColumn === 'distance' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </div>
                            <div className="col-risk sortable" onClick={() => handleSort('chances')}>
                              Chances {sortColumn === 'chances' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </div>
                          </div>
                          <div className="customer-table-body">
                            {conv.customers.map((customer, index) => {
                              const uniqueKey = customer.id 
                                ? `${customer.id}-${customer.relationship || customer.currentQuadrant}-${customer.targetQuadrant || 'none'}-${index}`
                                : `customer-${index}`;
                              
                              // Check if this customer appears earlier in the list
                              const customerIndexInList = conv.customers.findIndex(c => 
                                c.id === customer.id && 
                                c.currentQuadrant === customer.currentQuadrant &&
                                c.targetQuadrant === customer.targetQuadrant &&
                                c.relationship === customer.relationship
                              );
                              const isFirstOccurrence = customerIndexInList === conv.customers.findIndex(c => c.id === customer.id);
                              const showConnector = sortColumn === 'customer' && customer.id && !isFirstOccurrence;
                              
                              return (
                                <div key={uniqueKey} className={`customer-row ${showConnector ? 'customer-continuation' : ''}`}>
                                  <div className="col-customer">
                                    {showConnector ? (
                                      <div className="customer-connector">
                                        <svg width="20" height="20" style={{ position: 'absolute', left: '-8px', top: '50%', transform: 'translateY(-50%)' }}>
                                          <line x1="0" y1="10" x2="12" y2="10" stroke="#9ca3af" strokeWidth="1.5" />
                                          <line x1="12" y1="10" x2="12" y2="20" stroke="#9ca3af" strokeWidth="1.5" />
                                        </svg>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="customer-name">{getCustomerDisplayName(customer, index)}</div>
                                        {customer.id && <div className="customer-id">ID: {customer.id}</div>}
                                      </>
                                    )}
                                  </div>
                                  <div className="col-position">
                                    ({customer.satisfaction}, {customer.loyalty})
                                  </div>
                                  <div className="col-quadrant">
                                    <span className="quadrant-badge" style={getQuadrantBadgeStyle(customer.currentQuadrant || '')}>
                                      {getQuadrantDisplayName(customer.currentQuadrant || '')}
                                    </span>
                                  </div>
                                  <div className="col-target">
                                    {customer.targetQuadrant ? (
                                      <span className="quadrant-badge" style={getQuadrantBadgeStyle(customer.targetQuadrant)}>
                                        {getQuadrantDisplayName(customer.targetQuadrant)}
                                      </span>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </div>
                                  <div className="col-distance">
                                    {customer.distanceFromBoundary !== undefined ? customer.distanceFromBoundary.toFixed(2) : '—'}
                                  </div>
                                  <div className="col-risk">
                                    <span className={`risk-badge risk-${customer.riskLevel.toLowerCase()}`}>
                                      {getRiskLevelText(customer.riskLevel)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </Card>

        {/* Proximity Point Info Box */}
        {selectedProximityPoints && (
          <ProximityPointInfoBox
            points={selectedProximityPoints.points}
            position={selectedProximityPoints.position}
            quadrant={selectedProximityPoints.quadrant}
            proximityType={selectedProximityPoints.proximityType}
            onClose={() => setSelectedProximityPoints(null)}
            context="proximity"
            isClassicModel={isClassicModel}
            secondaryPoints={selectedProximityPoints.secondaryPoints}
            secondaryQuadrant={selectedProximityPoints.secondaryQuadrant}
            secondaryProximityType={selectedProximityPoints.secondaryProximityType}
          />
        )}


      </div>
      
      {showControlsPanel && (
        <div className="unified-controls-panel proximity-controls-panel" ref={panelRef}>
          <div className="unified-controls-header">
            <div className="unified-controls-tabs">
              <div
                className={`unified-tab ${activePanelTab === 'display' ? 'active' : ''}`}
                onClick={() => setActivePanelTab('display')}
              >
                <MenuIcon size={16} />
                Display
              </div>
              <div
                className={`unified-tab ${activePanelTab === 'filters' ? 'active' : ''}`}
                onClick={() => setActivePanelTab('filters')}
              >
                <Filter size={16} />
                Filters
                <span 
                  className="connection-status-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isConnected) {
                      setShowReconnectModal(true);
                    }
                  }}
                  title={isConnected ? 'Connected to main filters' : 'Click to reconnect to main filters'}
                  style={{ cursor: !isConnected ? 'pointer' : 'default' }}
                >
                  {isConnected ? <Link2 size={14} /> : <Link2Off size={14} />}
                </span>
                {(filterCount > 0 || hasLocalChanges) && (
                  <span className="unified-filter-badge">{filterCount}</span>
                )}
              </div>
            </div>
            <button className="unified-close-button" onClick={() => setShowControlsPanel(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="unified-controls-content">
            {activePanelTab === 'display' ? (
              <div className="unified-tab-content">
                <div className="unified-tab-body proximity-display-settings">
                  <ProximityDisplayMenu
                    settings={proximityDisplaySettings}
                    onSettingsChange={handleProximitySettingsChange}
                    onReset={handleProximitySettingsReset}
                  />
                </div>
                <div className="unified-tab-footer">
                  <button className="unified-reset-button" onClick={handleProximitySettingsReset}>
                    Reset Display
                  </button>
                </div>
              </div>
            ) : (
              <div className="unified-tab-content">
                <div className="unified-tab-body">
                  {filterContext && (
                    <FilterPanel
                      data={resolvedOriginalData || []}
                      onFilterChange={handleFilterChange}
                      onClose={() => {}}
                      isOpen={true}
                      contentOnly={true}
                      resetTrigger={filterResetTrigger}
                      onShowNotification={showNotification}
                      reportId={REPORT_ID}
                      forceLocalState={true}
                    />
                  )}
                </div>
                <div className="unified-tab-footer">
                  <button 
                    className="unified-reset-button" 
                    onClick={handleFilterReset}
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {showReconnectModal && (
        <div className="filter-connection-modal-overlay">
          <div className="filter-connection-modal">
            <div className="modal-header">
              <h3>Connect to Main Filters?</h3>
            </div>
            <div className="modal-content">
              <p>This will discard local Proximity filters and sync with the main chart filters.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="modal-btn cancel-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReconnectModal(false);
                }}
              >
                Cancel
              </button>
              <button 
                className="modal-btn confirm-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReconnectModal(false);
                  handleConnectionToggle();
                }}
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProximitySection;
