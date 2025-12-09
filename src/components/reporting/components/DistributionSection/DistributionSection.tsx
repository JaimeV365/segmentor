import React, { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { DataPoint, ScaleFormat } from '../../../../types/base';
import type { QuadrantType } from '../../types';
import { useQuadrantAssignment } from '../../../visualization/context/QuadrantAssignmentContext';
import { Card } from '../../../ui/card';
import { Filter, X, Link2, Link2Off, ChevronDown, ChevronUp } from 'lucide-react';
import FilterPanel from '../../../visualization/filters/FilterPanel';
import PremiumFeature from '../../../ui/PremiumFeature';
import { useFilterContextSafe } from '../../../visualization/context/FilterContext';
import { useNotification } from '../../../data-entry/hooks/useNotification';
import { ReportFilter } from '../../filters/ReportFilterPanel';

import ProximityPointInfoBox from './ProximityPointInfoBox';
import QuadrantInfoBox from './QuadrantInfoBox';
import ProximityList from '../ProximityList';
import ProximityDisplayMenu, { ProximityDisplaySettings } from '../ProximityList/ProximityDisplayMenu';
import { EnhancedProximityClassifier } from '../../services/EnhancedProximityClassifier';
import { InfoRibbon } from '../InfoRibbon';
import './DistributionSection.css';

interface InsightCardProps {
  label: string;
  value: string | number;
  description?: string;
}

// Component for insight cards
const InsightCard: React.FC<InsightCardProps> = ({ label, value, description }) => (
  <div className="insight-card">
    <div className="insight-card-label">{label}</div>
    <div className="insight-card-value">{value}</div>
    {description && <div className="insight-card-description">{description}</div>}
  </div>
);

interface EdgeClickData {
  points: DataPoint[];
  position: { x: number; y: number };
  quadrant: string;
  proximityType: string;
}

interface DistributionSectionProps {
  distribution: Record<string, number>;
  total: number;
  isPremium: boolean;
  onQuadrantSelect?: (quadrant: QuadrantType) => void;
  onQuadrantMove: (fromIndex: number, toIndex: number) => void;
  data?: DataPoint[];
  originalData?: DataPoint[]; // Original unfiltered data for filter panel
  satisfactionScale?: ScaleFormat;
  loyaltyScale?: ScaleFormat;
  isClassicModel?: boolean;
  showSpecialZones?: boolean;
  showNearApostles?: boolean;
  midpoint?: { sat: number; loy: number };
}

const DistributionSection: React.FC<DistributionSectionProps> = ({
  distribution,
  total,
  isPremium,
  onQuadrantSelect,
  onQuadrantMove,
  data = [],
  originalData,
  satisfactionScale = '1-5',
  loyaltyScale = '1-5',
  isClassicModel = true,
  showSpecialZones = false,
  showNearApostles = false,
  midpoint: externalMidpoint // Accept external midpoint
}) => {
  
  // DEBUG LOG:
  console.log('🎯 DistributionSection initialized:', {
  dataLength: data?.length,
    originalDataLength: originalData?.length,
  showSpecialZones,
  showNearApostles
});

  // Use authoritative midpoint from context to ensure consistency across sections
  // externalMidpoint is ignored to keep a single source of truth

  // State for selected points in main quadrant grid
  const [selectedQuadrantPoints, setSelectedQuadrantPoints] = useState<EdgeClickData | null>(null);
  // State for selected points in proximity chart
  
  // State for proximity display settings
  const [proximityDisplaySettings, setProximityDisplaySettings] = useState<ProximityDisplaySettings>({
    grouping: 'flat',
    showOpportunities: true,
    showWarnings: true,
    showEmptyCategories: false,
    highlightHighImpact: false,
    highImpactMethod: 'smart',
    sortBy: 'customerCount'
  });
  
  // Filter system state
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ReportFilter[]>([]);
  const [filterResetTrigger, setFilterResetTrigger] = useState(0);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [isManualReconnecting, setIsManualReconnecting] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  
  // CRITICAL: Store filtered data from FilterPanel when report filters are applied (for disconnected reports with segment filters)
  // This is needed because getReportFilteredData can't handle segment filtering without quadrantContext
  const [filteredDataFromPanel, setFilteredDataFromPanel] = useState<DataPoint[] | null>(null);
  
  // State for managing Special Groups expanded/collapsed state when all zeros
  const [isSpecialGroupsExpanded, setIsSpecialGroupsExpanded] = useState(false);
  
  // Filter context for connection system
  const filterContext = useFilterContextSafe();
  const { showNotification } = useNotification();
  
  // Create unique REPORT_ID for this section
  const REPORT_ID = useMemo(() => 'distributionSection', []);
  
  // Initialize report filter state on mount - sync to main filters
  // This ensures report state exists and matches main state (connected by default)
  // Use the same simple pattern as BarChart and ResponseConcentrationSection
  useLayoutEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[REPORT_ID]) {
      console.log('🔌 [DistributionSection] LAYOUT EFFECT INIT: Syncing report state to main state');
      filterContext.syncReportToMaster(REPORT_ID);
    }
  }, [filterContext, REPORT_ID]);
  
  // Backup initialization check (runs after first render)
  useEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[REPORT_ID]) {
      console.log('🔌 [DistributionSection] Backup init: Syncing report state to main state');
      filterContext.syncReportToMaster(REPORT_ID);
    }
  }, [filterContext, REPORT_ID]);
  
  // Watch for main filter state changes and sync if connected
  // This handles the case where main filters are applied after DistributionSection mounts
  // FilterContext.handleSetFilterState only syncs reports that already match the old main state,
  // so if DistributionSection synced to an empty state, it won't get synced when main filters are applied
  useEffect(() => {
    if (!filterContext) return;
    
    const reportState = filterContext.reportFilterStates[REPORT_ID];
    const mainState = filterContext.filterState;
    
    // If report state exists and matches main state (connected), we're good
    if (reportState && filterContext.compareFilterStates(reportState, mainState)) {
      return; // Already connected and in sync
    }
    
    // If main filters are active and report state doesn't match, sync to main
    const hasMainFilters = mainState.attributes.some(attr => attr.values.size > 0) || 
                          (mainState.dateRange?.preset && mainState.dateRange.preset !== 'all');
    
    if (hasMainFilters) {
      // Check if report state exists but is empty/initial (synced to empty main state)
      const reportStateIsEmpty = !reportState || 
        (reportState.attributes.every(attr => attr.values.size === 0) && 
         (!reportState.dateRange?.preset || reportState.dateRange.preset === 'all'));
      
      // If report state is empty but main has filters, sync to main
      if (reportStateIsEmpty) {
        console.log('🔌 [DistributionSection] Main filters active but report state is empty - syncing to main state');
        filterContext.syncReportToMaster(REPORT_ID);
      } else if (reportState && !filterContext.compareFilterStates(reportState, mainState)) {
        // Report state exists but doesn't match - only sync if we're not disconnected by user action
        // Check if this is a user-initiated disconnect (has local changes) or just out of sync
        if (!hasLocalChanges) {
          console.log('🔌 [DistributionSection] Report state out of sync with main filters - syncing to main state');
          filterContext.syncReportToMaster(REPORT_ID);
        }
      }
    }
  }, [filterContext, filterContext?.filterState, REPORT_ID, hasLocalChanges]);
  
  // Close side panel when main unified controls panel opens
  useEffect(() => {
    const checkMainPanel = () => {
      const mainPanel = document.querySelector('.unified-controls-panel');
      if (mainPanel && !mainPanel.closest('.distribution-section')) {
        if (showSidePanel) {
          setShowSidePanel(false);
        }
      }
    };

    const interval = setInterval(checkMainPanel, 200);
    const observer = new MutationObserver(checkMainPanel);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, [showSidePanel]);

  // Listen for close events from other panels
  useEffect(() => {
    const handleCloseBarChartPanel = () => {
      // Keep distribution panel open when bar chart panels close
    };

    const handleCloseResponseConcentrationPanel = () => {
      // Keep distribution panel open when response concentration panels close
    };

    const handleCloseDistributionPanel = () => {
      if (showSidePanel) {
        setShowSidePanel(false);
      }
    };

    document.addEventListener('closeBarChartPanel', handleCloseBarChartPanel);
    document.addEventListener('closeResponseConcentrationPanel', handleCloseResponseConcentrationPanel);
    document.addEventListener('closeDistributionPanel', handleCloseDistributionPanel);

    return () => {
      document.removeEventListener('closeBarChartPanel', handleCloseBarChartPanel);
      document.removeEventListener('closeResponseConcentrationPanel', handleCloseResponseConcentrationPanel);
      document.removeEventListener('closeDistributionPanel', handleCloseDistributionPanel);
    };
  }, [showSidePanel]);
  
  // Derive connection status by comparing filter states
  // CRITICAL: If report state doesn't exist, consider it connected (default behavior)
  // This ensures reports are connected by default until they're explicitly disconnected
  const isConnected = useMemo(() => {
    if (!filterContext) {
      console.log('🔔 [DistributionSection] isConnected calculation: No filterContext, returning true', {
        reportId: REPORT_ID
      });
      return true;
    }
    
    const reportState = filterContext.reportFilterStates[REPORT_ID];
    const mainState = filterContext.filterState;
    
    // If report state doesn't exist, it's connected by default (uses main state)
    if (!reportState) {
      console.log('🔔 [DistributionSection] isConnected calculation: No reportState, returning true', {
        reportId: REPORT_ID,
        hasMainState: !!mainState
      });
      return true;
    }
    
    // Compare states - if they match, it's connected
    const connected = filterContext.compareFilterStates(reportState, mainState);
    
    console.log('🔔 [DistributionSection] isConnected calculation:', {
      reportId: REPORT_ID,
      hasReportState: !!reportState,
      hasMainState: !!mainState,
      connected,
      reportStatePreset: reportState?.dateRange?.preset,
      mainStatePreset: mainState?.dateRange?.preset,
      reportStateAttributeCount: reportState?.attributes?.length,
      mainStateAttributeCount: mainState?.attributes?.length
    });
    
    return connected;
  }, [filterContext, REPORT_ID, filterContext?.reportFilterStates?.[REPORT_ID], filterContext?.filterState]);
  
  // Track connection status changes for notifications
  const prevIsConnected = useRef<boolean | undefined>(undefined);
  const lastNotificationTime = useRef<number>(0);
  const lastNotificationType = useRef<'connected' | 'disconnected' | null>(null);
  const notificationShownForState = useRef<string | null>(null);
  const isShowingNotification = useRef<boolean>(false);
  const notificationPending = useRef<boolean>(false);
  const NOTIFICATION_DEBOUNCE_MS = 2000;
  
  // Track if we're still in the initial setup phase (first few seconds after mount)
  const initialSetupPhaseRef = useRef<boolean>(true);
  const mountTimeRef = useRef<number>(Date.now());
  
  // Initialize prevIsConnected to match initial isConnected value to prevent false transitions
  // Use useLayoutEffect to ensure this runs synchronously BEFORE the notification effect
  useLayoutEffect(() => {
    if (prevIsConnected.current === undefined && filterContext) {
      prevIsConnected.current = isConnected;
      console.log(`🔔 [DistributionSection] Initializing prevIsConnected to ${isConnected} for ${REPORT_ID}`);
    }
    
    // End initial setup phase after 3 seconds or when report state is stable
    const timeSinceMount = Date.now() - mountTimeRef.current;
    if (initialSetupPhaseRef.current && (timeSinceMount > 3000 || filterContext?.reportFilterStates[REPORT_ID])) {
      // Give it a bit more time for sync operations to complete
      setTimeout(() => {
        initialSetupPhaseRef.current = false;
        console.log(`🔔 [DistributionSection] Initial setup phase ended for ${REPORT_ID}`);
      }, 1000);
    }
  }, [filterContext, isConnected, REPORT_ID]);

  // Notification tracking useEffect - only handles automatic DISCONNECT
  useEffect(() => {
    if (!filterContext) return;
    
    // DEBUG: Log notification effect execution
    console.log('🔔 [DistributionSection] Notification effect RUNNING:', {
      reportId: REPORT_ID,
      isConnected,
      prevIsConnected: prevIsConnected.current,
      isManualReconnecting,
      isSyncingFromMain: filterContext.isSyncingFromMain,
      initialSetupPhase: initialSetupPhaseRef.current,
      showSidePanel,
      hasLocalChanges,
      notificationShownForState: notificationShownForState.current,
      lastNotificationType: lastNotificationType.current,
      lastNotificationTime: lastNotificationTime.current,
      timeSinceLastNotification: Date.now() - lastNotificationTime.current
    });
    
    // Skip if manual reconnect is in progress
    if (isManualReconnecting) {
      console.log('🔔 [DistributionSection] Notification effect SKIPPED: Manual reconnect in progress', {
        reportId: REPORT_ID,
        prevIsConnected: prevIsConnected.current,
        isConnected,
        'NOTE': 'prevIsConnected already set to true in handleConnectionToggle, not overwriting'
      });
      // Don't update prevIsConnected here - it's already set to true in handleConnectionToggle
      // This prevents overwriting it with a potentially stale isConnected value
      return;
    }
    
    // Skip if prevIsConnected hasn't been initialized yet (first render)
    if (prevIsConnected.current === undefined) {
      console.log('🔔 [DistributionSection] Notification effect SKIPPED: prevIsConnected not initialized', {
        reportId: REPORT_ID,
        'INITIALIZING prevIsConnected TO': isConnected
      });
      prevIsConnected.current = isConnected;
      return;
    }
    
    // Skip if states haven't actually changed
    if (prevIsConnected.current === isConnected) {
      console.log('🔔 [DistributionSection] Notification effect SKIPPED: No state change', {
        reportId: REPORT_ID,
        prevIsConnected: prevIsConnected.current,
        isConnected
      });
      return;
    }
    
    // Skip if syncing from main (data upload, initialization, etc.)
    if (filterContext.isSyncingFromMain) {
      console.log('🔔 [DistributionSection] Notification effect SKIPPED: Syncing from main', {
        reportId: REPORT_ID,
        prevIsConnected: prevIsConnected.current,
        isConnected,
        'SETTING prevIsConnected TO': isConnected
      });
      prevIsConnected.current = isConnected;
      return;
    }
    
    // Create a stable identifier for this specific state change
    const stateChangeId = `${REPORT_ID}_${prevIsConnected.current}_${isConnected}`;
    
    // CRITICAL: Check if we've already shown notification for this exact state change
    const alreadyNotified = notificationShownForState.current === stateChangeId;
    const isCurrentlyShowing = isShowingNotification.current;
    const isPending = notificationPending.current;
    
    console.log('🔔 [DistributionSection] Notification effect CHECKING conditions:', {
      reportId: REPORT_ID,
      stateChangeId,
      prevIsConnected: prevIsConnected.current,
      isConnected,
      alreadyNotified,
      isCurrentlyShowing,
      isPending,
      notificationShownForState: notificationShownForState.current
    });
    
    if (alreadyNotified || isCurrentlyShowing || isPending) {
      console.log('🔔 [DistributionSection] Notification effect SKIPPED: Already notified or pending', {
        reportId: REPORT_ID,
        alreadyNotified,
        isCurrentlyShowing,
        isPending,
        'SETTING prevIsConnected TO': isConnected
      });
      prevIsConnected.current = isConnected;
      return;
    }
    
    const reportState = filterContext.reportFilterStates[REPORT_ID];
    const mainState = filterContext.filterState;
    const now = Date.now();
    
    // ONLY automatic disconnect: connected -> disconnected
    // AND only if user has opened the panel (has interacted with filters)
    // BUT NOT during initial setup phase
    const shouldShowDisconnect = (
      prevIsConnected.current === true && 
      isConnected === false && 
      !isShowingNotification.current &&
      !filterContext.isSyncingFromMain &&
      !initialSetupPhaseRef.current && // Don't show notification during initial setup phase
      (now - lastNotificationTime.current) > NOTIFICATION_DEBOUNCE_MS &&
      lastNotificationType.current !== 'disconnected' &&
      (showSidePanel || hasLocalChanges) // Only show if panel was opened or user made changes
    );
    
    console.log('🔔 [DistributionSection] Notification effect shouldShowDisconnect calculation:', {
      reportId: REPORT_ID,
      'prevIsConnected === true': prevIsConnected.current === true,
      'isConnected === false': isConnected === false,
      '!isShowingNotification': !isShowingNotification.current,
      '!isSyncingFromMain': !filterContext.isSyncingFromMain,
      '!initialSetupPhase': !initialSetupPhaseRef.current,
      'debouncePassed': (now - lastNotificationTime.current) > NOTIFICATION_DEBOUNCE_MS,
      'lastNotificationType !== disconnected': lastNotificationType.current !== 'disconnected',
      'showSidePanel || hasLocalChanges': showSidePanel || hasLocalChanges,
      shouldShowDisconnect,
      timeSinceLastNotification: now - lastNotificationTime.current,
      NOTIFICATION_DEBOUNCE_MS
    });
    
    if (shouldShowDisconnect) {
      // Only show notification if report state actually differs from main state
      const statesDiffer = reportState && !filterContext.compareFilterStates(reportState, mainState);
      
      console.log('🔔 [DistributionSection] Notification effect statesDiffer check:', {
        reportId: REPORT_ID,
        hasReportState: !!reportState,
        statesDiffer,
        willShowNotification: statesDiffer
      });
      
      if (statesDiffer) {
        // Set flags before showing notification
        notificationPending.current = true;
        notificationShownForState.current = stateChangeId;
        isShowingNotification.current = true;
        lastNotificationTime.current = now;
        lastNotificationType.current = 'disconnected';
        
        console.log('🔔 [DistributionSection] ✅ SHOWING DISCONNECT NOTIFICATION:', {
          reportId: REPORT_ID,
          stateChangeId,
          prevIsConnected: prevIsConnected.current,
          isConnected
        });
        
        showNotification({
          title: 'Filters Disconnected',
          message: 'Distribution section filters are now independent from the main chart.',
          type: 'success',
          icon: <Link2Off size={18} style={{ color: '#166534' }} />
        });
        
        setTimeout(() => {
          isShowingNotification.current = false;
          notificationPending.current = false;
        }, 500);
      } else {
        console.log('🔔 [DistributionSection] Notification effect SKIPPED: States match (no actual disconnect)', {
          reportId: REPORT_ID
        });
      }
    } else {
      console.log('🔔 [DistributionSection] Notification effect SKIPPED: shouldShowDisconnect is false', {
        reportId: REPORT_ID,
        reason: prevIsConnected.current !== true ? 'prevIsConnected !== true' :
                isConnected !== false ? 'isConnected !== false' :
                isShowingNotification.current ? 'isShowingNotification' :
                filterContext.isSyncingFromMain ? 'isSyncingFromMain' :
                initialSetupPhaseRef.current ? 'initialSetupPhase' :
                (now - lastNotificationTime.current) <= NOTIFICATION_DEBOUNCE_MS ? 'debounce' :
                lastNotificationType.current === 'disconnected' ? 'lastNotificationType === disconnected' :
                !(showSidePanel || hasLocalChanges) ? 'no panel or changes' :
                'unknown'
      });
    }
    
    console.log('🔔 [DistributionSection] Notification effect ENDING: Setting prevIsConnected', {
      reportId: REPORT_ID,
      'FROM': prevIsConnected.current,
      'TO': isConnected
    });
    prevIsConnected.current = isConnected;
  }, [isConnected, isManualReconnecting, REPORT_ID, filterContext, showNotification, showSidePanel, hasLocalChanges]);
  
  // Calculate filter count from appropriate state
  // Use centralized count from FilterContext for consistency
  // CRITICAL: Access reportActiveFilterCounts directly to ensure reactivity
  const mainFilterCount = filterContext?.activeFilterCount ?? 0;
  // Access the count directly from the state object, not via callback, to ensure reactivity
  const reportFilterCount = filterContext?.reportActiveFilterCounts?.[REPORT_ID] ?? 0;
  
  const filterCount = useMemo(() => {
    if (!filterContext) return 0;
    
    // Use centralized count from FilterContext - this is the single source of truth
    const count = isConnected ? mainFilterCount : reportFilterCount;
    
    // TEMPORARY DEBUG: Also check the actual report state to see if filters exist
    const reportState = filterContext.getReportFilterState(REPORT_ID);
    const actualDateCount = (reportState.dateRange.preset && 
                            reportState.dateRange.preset !== 'all' && 
                            reportState.dateRange.preset !== 'custom' &&
                            (reportState.dateRange.startDate || reportState.dateRange.endDate)) ? 1 :
                           (reportState.dateRange.preset === 'custom' && 
                            (reportState.dateRange.startDate || reportState.dateRange.endDate)) ? 1 : 0;
    const actualAttributeCount = reportState.attributes.reduce((sum, attr) => sum + attr.values.size, 0);
    const actualTotalCount = actualDateCount + actualAttributeCount;
    
    console.log('🏷️ [DistributionSection] filterCount calculation:', {
      reportId: REPORT_ID,
      isConnected,
      mainFilterCount,
      reportFilterCount,
      centralizedCount: count,
      'ACTUAL STATE COUNT': actualTotalCount,
      'actualDateCount': actualDateCount,
      'actualAttributeCount': actualAttributeCount,
      'attributesWithValues': reportState.attributes.filter(a => a.values.size > 0).map(a => ({ field: a.field, count: a.values.size })),
      'reportActiveFilterCounts object': filterContext.reportActiveFilterCounts,
      'USING CENTRALIZED COUNT ONLY': true
    });
    
    // TEMPORARY: Use actual count if centralized count is wrong
    // This will help us see if the issue is with count storage or count reading
    return count > 0 ? count : (actualTotalCount > 0 ? actualTotalCount : 0);
  }, [filterContext, isConnected, REPORT_ID, mainFilterCount, reportFilterCount, filterContext?.reportActiveFilterCounts]);
  
  // Clear filteredDataFromPanel when report reconnects (so we use main filteredData)
  useEffect(() => {
    if (isConnected && filteredDataFromPanel !== null) {
      console.log(`🔌 [DistributionSection] Report reconnected - clearing filteredDataFromPanel and using main filteredData`);
      setFilteredDataFromPanel(null);
    }
  }, [isConnected, filteredDataFromPanel]);
  
  // Get effective filtered data (uses report filters when connected/disconnected)
  // CRITICAL: When report filters disconnect and have segment filters, FilterPanel filters the data
  // and passes it via onFilterChange. We should use that filtered data instead of getReportFilteredData
  // which can't handle segment filtering without quadrantContext.
  const effectiveData = useMemo(() => {
    const dataToFilter = originalData || data || [];
    if (!dataToFilter || !filterContext) return dataToFilter;
    
    // If we have filtered data from FilterPanel (for disconnected reports with segment filters), use it
    if (!isConnected && filteredDataFromPanel !== null) {
      console.log(`🔌 [DistributionSection] Using filtered data from FilterPanel (disconnected):`, {
        filteredDataLength: filteredDataFromPanel.length,
        originalDataLength: dataToFilter.length
      });
      return filteredDataFromPanel;
    }
    
    // Otherwise, use report filter system to get filtered data
    return filterContext.getReportFilteredData(REPORT_ID, dataToFilter);
  }, [originalData, data, filterContext, REPORT_ID, filterContext?.reportFilterStates?.[REPORT_ID], filterContext?.filterState, filteredDataFromPanel, isConnected]);
  
  // Calculate quadrant distribution and get authoritative midpoint from context
  const { distribution: contextDistribution, getQuadrantForPoint, manualAssignments, midpoint, apostlesZoneSize, terroristsZoneSize } = useQuadrantAssignment();

  // Use context distribution directly - it already handles all layering correctly
const calculatedDistribution = useMemo(() => {
  return {
    loyalists: contextDistribution.loyalists || 0,
    mercenaries: contextDistribution.mercenaries || 0,
    hostages: contextDistribution.hostages || 0,
    defectors: contextDistribution.defectors || 0,
    apostles: contextDistribution.apostles || 0,
    terrorists: contextDistribution.terrorists || 0,
    nearApostles: contextDistribution.near_apostles || 0
  };
}, [contextDistribution]);
  
  // Recalculate distribution from effectiveData (filtered data)
  // This ensures the distribution reflects the applied filters
  const filteredDistribution = useMemo(() => {
    if (!effectiveData || effectiveData.length === 0) {
      return calculatedDistribution;
    }
    
    // Recalculate distribution from filtered data
    const dist: Record<string, number> = {
      loyalists: 0,
      mercenaries: 0,
      hostages: 0,
      defectors: 0,
      apostles: 0,
      terrorists: 0,
      nearApostles: 0
    };
    
    // Map quadrant names from getQuadrantForPoint to dist keys
    const quadrantMap: Record<string, string> = {
      'loyalists': 'loyalists',
      'mercenaries': 'mercenaries',
      'hostages': 'hostages',
      'defectors': 'defectors',
      'apostles': 'apostles',
      'terrorists': 'terrorists',
      'near_apostles': 'nearApostles' // Map underscore to camelCase
    };
    
    effectiveData.forEach(point => {
      if (point.excluded) return;
      const quadrant = getQuadrantForPoint(point);
      const mappedQuadrant = quadrantMap[quadrant] || quadrant;
      if (dist.hasOwnProperty(mappedQuadrant)) {
        dist[mappedQuadrant] = (dist[mappedQuadrant] || 0) + 1;
      }
    });
    
    return dist;
  }, [effectiveData, getQuadrantForPoint, calculatedDistribution]);
  
  // Use filtered distribution when filters are active, otherwise use context distribution
  const finalDistribution = useMemo(() => {
    // Check if filters are active (either connected to main or disconnected with local filters)
    if (filterContext) {
      const reportState = filterContext.reportFilterStates[REPORT_ID];
      const mainState = filterContext.filterState;
      
      // Determine which state to check based on connection status
      const stateToCheck = isConnected ? mainState : (reportState || mainState);
      
      // Check if any filters are active
      const hasActiveFilters = stateToCheck && (
        (stateToCheck.dateRange?.preset && stateToCheck.dateRange.preset !== 'all') ||
        (stateToCheck.attributes?.some(attr => attr.values && attr.values.size > 0))
      );
      
      // If filters are active, use filtered distribution
      if (hasActiveFilters) {
        return {
          loyalists: filteredDistribution.loyalists || 0,
          mercenaries: filteredDistribution.mercenaries || 0,
          hostages: filteredDistribution.hostages || 0,
          defectors: filteredDistribution.defectors || 0,
          apostles: filteredDistribution.apostles || 0,
          terrorists: filteredDistribution.terrorists || 0,
          nearApostles: filteredDistribution.nearApostles || 0
        };
      }
    }
    return calculatedDistribution;
  }, [filteredDistribution, calculatedDistribution, filterContext, REPORT_ID, isConnected]);

// DEBUG: Check what getQuadrantForPoint returns for each customer
const customerAssignments = effectiveData.map(p => ({
  id: p.id || `${p.satisfaction}-${p.loyalty}`,
  satisfaction: p.satisfaction,
  loyalty: p.loyalty,
  assignedQuadrant: getQuadrantForPoint(p)
}));
console.log('🔍 DISTRIBUTION SECTION - Customer quadrant assignments:');
customerAssignments.forEach(customer => {
  console.log(`  Customer ${customer.id} (${customer.satisfaction},${customer.loyalty}) → ${customer.assignedQuadrant}`);
});

  // Use EnhancedProximityClassifier (same as ProximitySection)
console.log('🚨🚨🚨 DISTRIBUTION SECTION COMPONENT LOADED - THIS SHOULD APPEAR');
// FORCE CALCULATION - Remove useMemo to ensure execution
console.log('🔥🔥🔥 FORCING PROXIMITY ANALYSIS CALCULATION WITHOUT USEMEMO');
const proximityAnalysis = (() => {
  const timestamp = Date.now();
  console.log(`🚨🚨🚨🚨🚨 USEMEMO START - THIS MUST APPEAR - TIMESTAMP: ${timestamp}`);
  console.log('🚨🚨🚨 USEMEMO EXECUTING - COMPONENT IS RUNNING');
  console.log('🚨🚨🚨 DISTRIBUTION SECTION USEMEMO TRIGGERED - THIS SHOULD APPEAR IN LOGS:', {
    dataLength: effectiveData.length,
    satisfactionScale,
    loyaltyScale,
    midpoint,
    apostlesZoneSize,
    terroristsZoneSize,
    showSpecialZones,
    showNearApostles,
    mode: showNearApostles ? 'ALL_AREAS' : 'MAIN_AREAS',
    timestamp
  });
  
  // FORCE FRESH CALCULATION - Clear any potential cache
  console.log('🚨🚨🚨 FORCING FRESH PROXIMITY ANALYSIS CALCULATION');
  
  // Add dependency debugging
  console.log('🔍 USEMEMO DEPENDENCIES DEBUG:', {
    data: data.length,
    satisfactionScale,
    loyaltyScale,
    midpointSat: midpoint.sat,
    midpointLoy: midpoint.loy,
    getQuadrantForPoint: typeof getQuadrantForPoint,
    isPremium,
    showSpecialZones,
    showNearApostles,
    apostlesZoneSize,
    terroristsZoneSize,
    manualAssignments: manualAssignments.size
  });
  
  try {
  
  console.log('🔍 DISTRIBUTION SECTION: Creating EnhancedProximityClassifier with:', {
    dataLength: effectiveData.length,
    satisfactionScale,
    loyaltyScale,
    midpoint,
    apostlesZoneSize,
    terroristsZoneSize,
    showSpecialZones,
    showNearApostles
  });

  const enhancedClassifier = new EnhancedProximityClassifier(
    satisfactionScale,
    loyaltyScale,
    midpoint,
    apostlesZoneSize,
    terroristsZoneSize
  );

  console.log('🔥🔥🔥 DISTRIBUTION SECTION: About to call analyzeProximity...');
  console.log('🔥 THIS LOG SHOULD APPEAR BEFORE CALLING ENHANCED CLASSIFIER');
  console.log('🔥 USEMEMO IS DEFINITELY EXECUTING - TESTING');
  
  const result = enhancedClassifier.analyzeProximity(
    effectiveData,
    getQuadrantForPoint,
    isPremium,
    undefined,
    showSpecialZones,
    showNearApostles
  );
  
  console.log('🔍 DISTRIBUTION SECTION: EnhancedProximityClassifier result:', {
    loyalists_close_to_apostles: result.analysis.loyalists_close_to_apostles.customerCount,
    loyalists_close_to_near_apostles: result.analysis.loyalists_close_to_near_apostles.customerCount,
    defectors_close_to_terrorists: result.analysis.defectors_close_to_terrorists.customerCount,
    showSpecialZones: result.settings.showSpecialZones,
    mode: showNearApostles ? 'ALL_AREAS' : 'MAIN_AREAS'
  });
  
  console.log('🚨 DISTRIBUTION SECTION RETURNING RESULT:', result);
  
  return result;
  
  } catch (error) {
    console.error('🚨 ERROR in DistributionSection proximityAnalysis useMemo:', error);
    console.error('🚨 Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      dataLength: data.length,
      satisfactionScale,
      loyaltyScale,
      midpoint
    });
    
    // Return a fallback result to prevent the component from breaking
    return {
      analysis: {
        loyalists_close_to_mercenaries: { customerCount: 0, positionCount: 0, averageDistance: 0, riskLevel: 'LOW' as const, customers: [] },
        loyalists_close_to_hostages: { customerCount: 0, positionCount: 0, averageDistance: 0, riskLevel: 'LOW' as const, customers: [] },
        hostages_close_to_loyalists: { customerCount: 0, positionCount: 0, averageDistance: 0, riskLevel: 'LOW' as const, customers: [] },
        hostages_close_to_defectors: { customerCount: 0, positionCount: 0, averageDistance: 0, riskLevel: 'LOW' as const, customers: [] },
        defectors_close_to_mercenaries: { customerCount: 0, positionCount: 0, averageDistance: 0, riskLevel: 'LOW' as const, customers: [] },
        defectors_close_to_hostages: { customerCount: 0, positionCount: 0, averageDistance: 0, riskLevel: 'LOW' as const, customers: [] },
        mercenaries_close_to_loyalists: { customerCount: 0, positionCount: 0, averageDistance: 0, riskLevel: 'LOW' as const, customers: [] },
        mercenaries_close_to_defectors: { customerCount: 0, positionCount: 0, averageDistance: 0, riskLevel: 'LOW' as const, customers: [] },
        loyalists_close_to_apostles: { customerCount: 0, positionCount: 0, averageDistance: 0, riskLevel: 'LOW' as const, customers: [] },
        loyalists_close_to_near_apostles: { customerCount: 0, positionCount: 0, averageDistance: 0, riskLevel: 'LOW' as const, customers: [] },
        defectors_close_to_terrorists: { customerCount: 0, positionCount: 0, averageDistance: 0, riskLevel: 'LOW' as const, customers: [] }
      },
      summary: { totalCustomers: 0, totalProximityCustomers: 0, totalProximityPositions: 0 },
      settings: { isAvailable: false, totalCustomers: 0 }
    };
  }
})(); // Execute immediately without useMemo

console.log('🔍 DISTRIBUTION SECTION proximityAnalysis result:', {
  loyalists_close_to_mercenaries: proximityAnalysis?.analysis?.loyalists_close_to_mercenaries?.customerCount,
  isAvailable: proximityAnalysis?.settings?.isAvailable,
  totalCustomers: proximityAnalysis?.settings?.totalCustomers
});

// Extra diagnostics: log full proximity analysis counts used by edges
// (debug) edge counts available from service; keep commented for future diagnostics
// console.log('EDGE COUNTS (service-based):', proximityAnalysis?.analysis);

  // Handle edge clicks - simple implementation
  const handleEdgeClick = (event: React.MouseEvent, quadrant: string, proximityType: string) => {
  event.stopPropagation();
  event.preventDefault(); // Prevent any default behavior
  
  if (validData.length === 0) {
    console.log('🚫 Edge click blocked: no data available');
    return;
  }
  
  console.log('🔍 Edge clicked:', { quadrant, proximityType });
  
  // Get proximity customers from the analysis
  let proximityCustomers: DataPoint[] = [];
  const proximityKey = `${quadrant}_close_to_${proximityType}`;
  
  console.log(`🔍 Looking for proximity key: ${proximityKey}`);
  console.log(`🔍 Available proximity keys:`, Object.keys(proximityAnalysis?.analysis || {}));
  
  if (proximityAnalysis?.analysis && proximityKey in proximityAnalysis.analysis) {
    const proximityDetail = proximityAnalysis.analysis[proximityKey as keyof typeof proximityAnalysis.analysis];
    
    console.log(`🔍 Found proximity detail for ${proximityKey}:`, proximityDetail);
    
    if (proximityDetail && 'customers' in proximityDetail && proximityDetail.customers) {
      // Convert CustomerProximityDetail objects directly to DataPoint objects
      // instead of trying to look them up in the original data array
      proximityCustomers = proximityDetail.customers.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email || '',
        satisfaction: customer.satisfaction,
        loyalty: customer.loyalty,
        // Include any additional properties that might be needed
        ...customer
      })) as DataPoint[];
      
      console.log(`🔍 Retrieved ${proximityCustomers.length} customers for ${proximityKey}:`, 
        proximityCustomers.map(c => `${c.id} at (${c.satisfaction},${c.loyalty})`));
    } else {
      console.log(`🔍 No customers found in proximity detail for ${proximityKey}`);
    }
  } else {
    console.log(`🔍 Proximity key ${proximityKey} not found in analysis`);
  }
  
  console.log('🔍 Found proximity customers:', proximityCustomers.length);
  
  // Set selected points for info box display (using main quadrant state)
  setSelectedQuadrantPoints({
    points: proximityCustomers,
    position: {
      x: event.clientX,
      y: event.clientY
    },
    quadrant: quadrant,
    proximityType: proximityType
  });
};

  console.log('🚨 DISTRIBUTION SECTION PROXIMITY CALCULATIONS:', {
  loyalists_near_mercenaries: proximityAnalysis?.analysis?.loyalists_close_to_mercenaries?.customerCount || 0,
  loyalists_near_hostages: proximityAnalysis?.analysis?.loyalists_close_to_hostages?.customerCount || 0,
  hostages_near_loyalists: proximityAnalysis?.analysis?.hostages_close_to_loyalists?.customerCount || 0,
  hostages_near_defectors: proximityAnalysis?.analysis?.hostages_close_to_defectors?.customerCount || 0
});

// DEBUG: Log the context distribution (should now be used directly)
console.log('🔍 DISTRIBUTION USING CONTEXT DIRECTLY:', {
  showSpecialZones,
  showNearApostles,
  contextDistribution: {
    loyalists: contextDistribution.loyalists,
    apostles: contextDistribution.apostles,
    near_apostles: contextDistribution.near_apostles,
    terrorists: contextDistribution.terrorists,
    mercenaries: contextDistribution.mercenaries,
    hostages: contextDistribution.hostages,
    defectors: contextDistribution.defectors
  },
  finalDistribution: {
    loyalists: finalDistribution.loyalists,
    apostles: finalDistribution.apostles,
    nearApostles: finalDistribution.nearApostles,
    terrorists: finalDistribution.terrorists
  }
});
  
  // Total count of points in all quadrants (excluding special zones)
  const calculatedTotal = useMemo(() => {
    if (!effectiveData || effectiveData.length === 0) {
      return total; // Use provided total if no data
    }
    
    return effectiveData.filter(point => !point.excluded).length;
  }, [effectiveData, total]);
  
  // Use filtered distribution when filters are active, otherwise use context distribution
const effectiveDistribution = finalDistribution;
  const effectiveTotal = effectiveData && effectiveData.length > 0 ? calculatedTotal : total;

  // Calculate percentages for each quadrant
  const calculatePercentage = (value: number): string => {
    return ((value / Math.max(1, effectiveTotal)) * 100).toFixed(1);
  };

  // Intelligence data based on distribution
  const insightsData = useMemo(() => {
    const quadrantValues = [
      { type: 'loyalists', value: effectiveDistribution.loyalists || 0 },
      { type: 'hostages', value: effectiveDistribution.hostages || 0 },
      { type: 'mercenaries', value: effectiveDistribution.mercenaries || 0 },
      { type: 'defectors', value: effectiveDistribution.defectors || 0 }
    ];
    
    // Sort quadrants by value (descending)
    const sortedQuadrants = [...quadrantValues].sort((a, b) => b.value - a.value);
    
    // Find largest group(s) - handle ties by collecting all with the max value
    const maxValue = sortedQuadrants[0].value;
    const largestGroups = quadrantValues.filter(q => q.value === maxValue);
    const largestGroupNames = largestGroups.map(g => 
      g.type.charAt(0).toUpperCase() + g.type.slice(1)
    ).join(', ');
    
    // Get second largest if it exists and is different from largest
    const secondLargest = sortedQuadrants.length > 1 && sortedQuadrants[1].value < maxValue && sortedQuadrants[1].value > 0
      ? sortedQuadrants[1] 
      : null;
    
    // Create description for largest group
    let largestGroupDesc = `${maxValue} respondents`;
    if (secondLargest) {
      largestGroupDesc += ` (${secondLargest.type.charAt(0).toUpperCase() + secondLargest.type.slice(1)}: ${secondLargest.value})`;
    }
    
    // Calculate balance (even distribution vs concentrated)
    const totalQuadrantPoints = quadrantValues.reduce((sum, current) => sum + current.value, 0);
    if (totalQuadrantPoints === 0) {
      return [
        { label: 'Largest Group', value: 'N/A', description: 'No data available' },
        { label: 'Distribution Balance', value: 'N/A', description: 'No data available' },
        { label: 'Satisfaction Trend', value: 'N/A', description: 'No data available' },
        { label: 'Loyalty Trend', value: 'N/A', description: 'No data available' }
      ];
    }
    
    const evenDistribution = totalQuadrantPoints / 4;
    const distributionDifference = quadrantValues.reduce(
      (sum, current) => sum + Math.abs(current.value - evenDistribution), 
      0
    );
    
    // Use coefficient of variation approach: if variance exceeds 40% of total, consider unbalanced
    // This is more statistically meaningful than arbitrary threshold
    const variancePercent = (distributionDifference / totalQuadrantPoints) * 100;
    const distributionBalance = variancePercent > 40 
      ? 'Unbalanced' 
      : 'Balanced';
    
    // Create description for distribution balance
    const balanceDesc = distributionBalance === 'Unbalanced'
      ? `${variancePercent.toFixed(1)}% variance from even distribution`
      : 'Responses are evenly distributed across segments';
    
    // Calculate satisfaction and loyalty trends
    const satisfactionWeight = (effectiveDistribution.loyalists || 0) + (effectiveDistribution.mercenaries || 0);
    const loyaltyWeight = (effectiveDistribution.loyalists || 0) + (effectiveDistribution.hostages || 0);
    
    const satisfactionTrend = satisfactionWeight > totalQuadrantPoints / 2 ? 'Positive' : 'Negative';
    const loyaltyTrend = loyaltyWeight > totalQuadrantPoints / 2 ? 'Strong' : 'Weak';
    
    // Create descriptions for trends
    const satPercent = totalQuadrantPoints > 0 
      ? Math.round((satisfactionWeight / totalQuadrantPoints) * 100) 
      : 0;
    const loyPercent = totalQuadrantPoints > 0 
      ? Math.round((loyaltyWeight / totalQuadrantPoints) * 100) 
      : 0;
    
    const satDesc = `${satPercent}% of responses have high satisfaction`;
    const loyDesc = `${loyPercent}% of responses have high loyalty`;
    
    return [
      { 
        label: 'Largest Group', 
        value: largestGroupNames, 
        description: largestGroupDesc 
      },
      { 
        label: 'Distribution Balance', 
        value: distributionBalance, 
        description: balanceDesc 
      },
      { 
        label: 'Satisfaction Trend', 
        value: satisfactionTrend, 
        description: satDesc 
      },
      { 
        label: 'Loyalty Trend', 
        value: loyaltyTrend, 
        description: loyDesc 
      }
    ];
  }, [effectiveDistribution, effectiveTotal]);

  // Data for special groups section
  const specialGroupsData = [
  { 
    title: isClassicModel ? 'Apostles' : 'Advocates', 
    value: effectiveDistribution.apostles || 0,
    percentage: calculatePercentage(effectiveDistribution.apostles || 0),
    type: 'apostles'
  },
  { 
    title: isClassicModel ? 'Terrorists' : 'Trolls', 
    value: effectiveDistribution.terrorists || 0,
    percentage: calculatePercentage(effectiveDistribution.terrorists || 0),
    type: 'terrorists'
  }
];

// near-apostles if enabled (show even if 0 count)
if (showNearApostles) {
  specialGroupsData.splice(1, 0, {
    title: isClassicModel ? 'Near-Apostles' : 'Near-Advocates', 
    value: effectiveDistribution.nearApostles || 0,
    percentage: calculatePercentage(effectiveDistribution.nearApostles || 0),
    type: 'near_apostles'
  });
}

// Calculate total special groups count from filtered data
const totalSpecialGroups = (effectiveDistribution.apostles || 0) + 
  (showNearApostles ? (effectiveDistribution.nearApostles || 0) : 0) + 
  (effectiveDistribution.terrorists || 0);

// Calculate special groups from original/unfiltered data to determine if they exist in the dataset
const originalSpecialGroups = useMemo(() => {
  const originalDataToCheck = originalData || data || [];
  if (!originalDataToCheck || originalDataToCheck.length === 0) return 0;
  
  let apostles = 0;
  let nearApostles = 0;
  let terrorists = 0;
  
  originalDataToCheck.forEach(point => {
    if (point.excluded) return;
    const quadrant = getQuadrantForPoint(point);
    if (quadrant === 'apostles') apostles++;
    if (quadrant === 'near_apostles') nearApostles++;
    if (quadrant === 'terrorists') terrorists++;
  });
  
  return apostles + (showNearApostles ? nearApostles : 0) + terrorists;
}, [originalData, data, getQuadrantForPoint, showNearApostles]);

// Determine if filters are active
const hasActiveFilters = useMemo(() => {
  return filterCount > 0;
}, [filterCount]);

// Determine the appropriate message based on whether filters are active and if original data has special groups
const emptyStateMessage = useMemo(() => {
  if (hasActiveFilters && originalSpecialGroups > 0) {
    return "No special groups in filtered data";
  } else {
    return "No special groups available";
  }
}, [hasActiveFilters, originalSpecialGroups]);

// Reset expanded state when special groups become available (transition from 0 to > 0)
useEffect(() => {
  if (totalSpecialGroups > 0 && isSpecialGroupsExpanded) {
    setIsSpecialGroupsExpanded(false);
  }
}, [totalSpecialGroups]);

console.log('🔍 Special Groups Debug:', {
  showNearApostles,
  apostles: effectiveDistribution.apostles,
  near_apostles: effectiveDistribution.nearApostles,
  terrorists: effectiveDistribution.terrorists,
  totalSpecial: totalSpecialGroups
});
console.log('🔍 Full Distribution Object:', distribution);
console.log('🔍 Effective Distribution:', effectiveDistribution);

  // Filter out any excluded data points from effectiveData
  const validData = useMemo(() => {
    return effectiveData.filter(point => !point.excluded);
  }, [effectiveData]);

  // Get quadrant for a point based on coordinates
  // Note: getQuadrantForPoint is already available from the context above

// We're now using the context's getQuadrantForPoint function
const getPointQuadrant = (point: DataPoint): string => {
  return getQuadrantForPoint(point);
};

  // Handle quadrant clicks in quadrant distribution
  const handleQuadrantClick = (quadrant: string, value: number, event: React.MouseEvent) => {
    if (value === 0) return; // Don't do anything if quadrant is empty
    
    // Get the exact click coordinates for positioning
    const clickX = event.clientX;
    const clickY = event.clientY;
    
    // Filter data points belonging to this quadrant
    const pointsInQuadrant = validData.filter(point => {
      return getPointQuadrant(point) === quadrant;
    });
    
    console.log(`Quadrant ${quadrant} clicked, found ${pointsInQuadrant.length} points, value is ${value}`);
    
    // Set selectedQuadrantPoints even if the array is empty
    setSelectedQuadrantPoints({
      points: pointsInQuadrant,
      position: {
        x: clickX,
        y: clickY
      },
      quadrant,
      proximityType: ''
    });
    
    // Still call the onQuadrantSelect callback if provided
    if (onQuadrantSelect && quadrant as QuadrantType) {
      onQuadrantSelect(quadrant as QuadrantType);
    }
  };

  // Handle proximity display settings changes
  const handleProximitySettingsChange = (newSettings: ProximityDisplaySettings) => {
    setProximityDisplaySettings(newSettings);
  };

  const handleProximitySettingsReset = () => {
    setProximityDisplaySettings({
      grouping: 'flat',
      showOpportunities: true,
      showWarnings: true,
      showEmptyCategories: false,
      highlightHighImpact: false,
      highImpactMethod: 'smart',
      sortBy: 'customerCount'
    });
  };

  // Handle filter changes
  const handleFilterChange = useCallback((filteredData: DataPoint[], newFilters: any[], filterState?: any) => {
    console.log("🔌 [DistributionSection] Filter change triggered", newFilters, {
      filteredDataLength: filteredData?.length,
      originalDataLength: (originalData || data)?.length
    });
    
    // CRITICAL: Store filtered data from FilterPanel for disconnected reports with segment filters
    // This ensures we use the correctly filtered data instead of getReportFilteredData which can't handle segments
    setFilteredDataFromPanel(filteredData);
    
    if (!filterContext || !filterState || isManualReconnecting) {
      setActiveFilters(newFilters || []);
      return;
    }
    
    setHasLocalChanges(true);
    setActiveFilters(newFilters || []);
  }, [isManualReconnecting, filterContext, originalData, data]);
  
  // Handle connection toggle
  const handleConnectionToggle = useCallback((confirmed: boolean) => {
    if (!filterContext) return;
    
    console.log('🔔 [DistributionSection] handleConnectionToggle called:', {
      reportId: REPORT_ID,
      confirmed,
      currentIsConnected: isConnected,
      prevIsConnected: prevIsConnected.current,
      notificationShownForState: notificationShownForState.current,
      lastNotificationType: lastNotificationType.current,
      lastNotificationTime: lastNotificationTime.current
    });
    
    if (confirmed) {
      console.log('🔔 [DistributionSection] handleConnectionToggle: Starting reconnect process', {
        reportId: REPORT_ID,
        'BEFORE sync - prevIsConnected': prevIsConnected.current,
        'BEFORE sync - isConnected': isConnected
      });
      
      setIsManualReconnecting(true);
      filterContext.syncReportToMaster(REPORT_ID);
      setHasLocalChanges(false);
      // Clear activeFilters when reconnecting to ensure badge count is accurate
      setActiveFilters([]);
      
      // CRITICAL: Clear notification tracking when reconnecting
      // This allows disconnection notifications to show again after reconnecting
      console.log('🔔 [DistributionSection] handleConnectionToggle: Clearing notification tracking', {
        reportId: REPORT_ID,
        'BEFORE CLEAR - notificationShownForState': notificationShownForState.current,
        'BEFORE CLEAR - lastNotificationType': lastNotificationType.current,
        'BEFORE CLEAR - lastNotificationTime': lastNotificationTime.current,
        'BEFORE CLEAR - prevIsConnected': prevIsConnected.current
      });
      
      notificationShownForState.current = null;
      lastNotificationType.current = null;
      lastNotificationTime.current = 0;
      
      // CRITICAL: Set prevIsConnected to true immediately after sync
      // This ensures the notification effect correctly tracks the reconnection
      // We know the state will be connected after syncReportToMaster completes
      // This prevents the race condition where isConnected is still false when
      // the notification effect runs during isManualReconnecting
      prevIsConnected.current = true;
      
      console.log('🔔 [DistributionSection] handleConnectionToggle: After clearing and setting prevIsConnected', {
        reportId: REPORT_ID,
        'SET prevIsConnected TO': prevIsConnected.current,
        'CURRENT isConnected': isConnected,
        'NOTE': 'prevIsConnected set to true to track reconnection correctly'
      });
      
      showNotification({
        title: 'Filters Connected',
        message: 'Distribution section filters are now connected to the main chart.',
        type: 'success',
        icon: <Link2 size={18} style={{ color: '#166534' }} />
      });
      
      setTimeout(() => {
        console.log('🔔 [DistributionSection] handleConnectionToggle: Ending manual reconnect flag', {
          reportId: REPORT_ID,
          'AFTER 100ms - prevIsConnected': prevIsConnected.current,
          'AFTER 100ms - isConnected': isConnected,
          'NOTE': 'isManualReconnecting will be set to false, notification effect should run'
        });
        setIsManualReconnecting(false);
      }, 100);
    }
  }, [filterContext, REPORT_ID, showNotification, isConnected]);

  // Refs for panel
  const panelRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="report-card distribution-section" onClick={(e) => e.stopPropagation()}>
      <div className="report-title-wrapper">
        <h3 className="report-title">Segment Distribution</h3>
        {/* Filter button */}
        <PremiumFeature isPremium={true} featureType="hamburgerMenu">
          <button
            ref={filterButtonRef}
            className={`distribution-control-button ${showSidePanel ? 'active' : ''} ${filterCount > 0 ? 'has-filters' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              const newState = !showSidePanel;
              if (newState) {
                // Close other panels when opening this one
                document.dispatchEvent(new CustomEvent('closeBarChartPanel', { 
                  detail: { exceptChartId: null } 
                }));
                document.dispatchEvent(new CustomEvent('closeResponseConcentrationPanel', { 
                  detail: {} 
                }));
              }
              setShowSidePanel(newState);
            }}
            title="Filter data"
          >
            <Filter size={22} />
            {filterCount > 0 && (
              <span className="filter-badge small">{filterCount}</span>
            )}
          </button>
        </PremiumFeature>
      </div>
      {/* Introductory information specific to Segment Distribution */}
      <div className="report-content" style={{ paddingTop: 0 }}>
        <InfoRibbon text="This section displays how your data points are distributed across the four segments. It helps you understand the proportion of customers in each category (Loyalists, Defectors, Mercenaries, and Hostages) and provides insights into customer behaviour patterns and segmentation." />
      </div>
      <div className="report-content">
        <div className="distribution-container">
          <div className="distribution-grid">
          {/* First Pair: Segment Distribution + Distribution Insights */}
          <div className="distribution-pair">
            {/* Segment Distribution */}
            <div className="pair-item">
              <Card className="distribution-card">
                <h3 className="card-title">Segment Distribution</h3>
                <div className="quadrant-grid" style={{ position: 'relative' }}>
                  <div 
  className={`draggable-quadrant hostages`}
  onClick={(e: React.MouseEvent) => handleQuadrantClick('hostages', effectiveDistribution.hostages || 0, e)}
  data-clickable={effectiveDistribution.hostages > 0 ? "true" : "false"}
>
  <div className="quadrant-title">Hostages</div>
  <div className="quadrant-value">{effectiveDistribution.hostages || 0}</div>
  <div className="quadrant-subtext">({(((effectiveDistribution.hostages || 0) / Math.max(1, effectiveTotal)) * 100).toFixed(1)}%)</div>
  {(effectiveDistribution.hostages || 0) > 0 && (
    <div className="premium-hint">Click for details</div>
  )}
</div>
                  <div 
  className={`draggable-quadrant loyalists`}
  onClick={(e: React.MouseEvent) => handleQuadrantClick('loyalists', effectiveDistribution.loyalists, e)}
  data-clickable={effectiveDistribution.loyalists > 0 ? "true" : "false"}
>
  <div className="quadrant-title">Loyalists</div>
  <div className="quadrant-value">{effectiveDistribution.loyalists}</div>
  <div className="quadrant-subtext">({calculatePercentage(effectiveDistribution.loyalists)}%)</div>
  {effectiveDistribution.loyalists > 0 && (
    <div className="premium-hint">Click for details</div>
  )}
</div>

<div 
  className={`draggable-quadrant defectors`}
  onClick={(e: React.MouseEvent) => handleQuadrantClick('defectors', effectiveDistribution.defectors, e)}
  data-clickable={effectiveDistribution.defectors > 0 ? "true" : "false"}
>
  <div className="quadrant-title">Defectors</div>
  <div className="quadrant-value">{effectiveDistribution.defectors}</div>
  <div className="quadrant-subtext">({calculatePercentage(effectiveDistribution.defectors)}%)</div>
  {effectiveDistribution.defectors > 0 && (
    <div className="premium-hint">Click for details</div>
  )}
</div>
                  <div 
  className={`draggable-quadrant mercenaries`}
  onClick={(e: React.MouseEvent) => handleQuadrantClick('mercenaries', effectiveDistribution.mercenaries || 0, e)}
  data-clickable={effectiveDistribution.mercenaries > 0 ? "true" : "false"}
>
  <div className="quadrant-title">Mercenaries</div>
  <div className="quadrant-value">{effectiveDistribution.mercenaries || 0}</div>
  <div className="quadrant-subtext">({(((effectiveDistribution.mercenaries || 0) / Math.max(1, effectiveTotal)) * 100).toFixed(1)}%)</div>
  {(effectiveDistribution.mercenaries || 0) > 0 && (
    <div className="premium-hint">Click for details</div>
  )}
</div>
                  
                  {selectedQuadrantPoints && (
                    <ProximityPointInfoBox
                      points={selectedQuadrantPoints.points}
                      position={selectedQuadrantPoints.position}
                      quadrant={selectedQuadrantPoints.quadrant}
                      proximityType={selectedQuadrantPoints.proximityType}
                      onClose={() => setSelectedQuadrantPoints(null)}
                      isClassicModel={isClassicModel}
                    />
                  )}
                </div>
              </Card>
            </div>

            {/* Distribution Insights */}
            <div className="pair-item">
              <Card className="distribution-card">
                <h3 className="card-title">Distribution Insights</h3>
                <div className="insights-grid">
                  {insightsData.map((insight, index) => (
                    <InsightCard 
                      key={index} 
                      label={insight.label} 
                      value={insight.value}
                      description={insight.description}
                    />
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* Second Pair: Special Groups + Special Groups Insights */}
          {showSpecialZones && (
            <div className="distribution-pair">
              {/* Special Groups */}
              <div className="pair-item">
                <Card className={`distribution-card ${totalSpecialGroups === 0 ? 'special-groups-empty' : ''}`}>
                  <div className="card-header-with-toggle">
                    <div className="card-title-wrapper">
                      <h3 className="card-title">Segment Distribution: Special Groups</h3>
                      {totalSpecialGroups === 0 && !isSpecialGroupsExpanded && (
                        <span className="empty-state-indicator">{emptyStateMessage}</span>
                      )}
                    </div>
                    {totalSpecialGroups === 0 && (
                      <button 
                        className="expand-toggle-btn"
                        onClick={() => setIsSpecialGroupsExpanded(!isSpecialGroupsExpanded)}
                        aria-label={isSpecialGroupsExpanded ? "Collapse" : "Expand"}
                        type="button"
                      >
                        {isSpecialGroupsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    )}
                  </div>
                  
                  {totalSpecialGroups === 0 ? (
                    <>
                      {isSpecialGroupsExpanded ? (
                        <div className="special-groups-container">
                          <div className="special-groups-spatial-layout">
                            {/* Top row: Near-Apostles (if exists) and Advocates */}
                            <div className="special-groups-top-row">
                              {/* Near-Advocates - Smaller, positioned next to Advocates */}
                              {specialGroupsData.find(g => g.type === 'near_apostles') && (() => {
                                const group = specialGroupsData.find(g => g.type === 'near_apostles')!;
                                return (
                                  <div 
                                    className="special-group near_apostles spatial-position spatial-top-left"
                                    onClick={(e: React.MouseEvent) => {
                                      handleQuadrantClick('near_apostles', group.value, e);
                                    }}
                                    data-clickable={group.value > 0 ? "true" : "false"}
                                  >
                                    <h4 className="special-group-title">{group.title}</h4>
                                    <div className="special-group-value">{group.value}</div>
                                    <div className="special-group-percentage">{group.percentage}%</div>
                                    {group.value > 0 && (
                                      <div className="premium-hint">Click for details</div>
                                    )}
                                  </div>
                                );
                              })()}
                              
                              {/* Advocates - Top Right, larger */}
                              {specialGroupsData.find(g => g.type === 'apostles') && (() => {
                                const group = specialGroupsData.find(g => g.type === 'apostles')!;
                                return (
                                  <div 
                                    className="special-group apostles spatial-position spatial-top-right"
                                    onClick={(e: React.MouseEvent) => {
                                      handleQuadrantClick('apostles', group.value, e);
                                    }}
                                    data-clickable={group.value > 0 ? "true" : "false"}
                                  >
                                    <h4 className="special-group-title">{group.title}</h4>
                                    <div className="special-group-value">{group.value}</div>
                                    <div className="special-group-percentage">{group.percentage}%</div>
                                    {group.value > 0 && (
                                      <div className="premium-hint">Click for details</div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            
                            {/* Bottom: Trolls - Bottom Left */}
                            {specialGroupsData.find(g => g.type === 'terrorists') && (() => {
                              const group = specialGroupsData.find(g => g.type === 'terrorists')!;
                              return (
                                <div 
                                  className="special-group terrorists spatial-position spatial-bottom-left"
                                  onClick={(e: React.MouseEvent) => {
                                    handleQuadrantClick('terrorists', group.value, e);
                                  }}
                                  data-clickable={group.value > 0 ? "true" : "false"}
                                >
                                  <h4 className="special-group-title">{group.title}</h4>
                                  <div className="special-group-value">{group.value}</div>
                                  <div className="special-group-percentage">{group.percentage}%</div>
                                  {group.value > 0 && (
                                    <div className="premium-hint">Click for details</div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="special-groups-container">
                      <div className="special-groups-spatial-layout">
                        {/* Top row: Near-Apostles (if exists) and Advocates */}
                        <div className="special-groups-top-row">
                          {/* Near-Advocates - Smaller, positioned next to Advocates */}
                          {specialGroupsData.find(g => g.type === 'near_apostles') && (() => {
                            const group = specialGroupsData.find(g => g.type === 'near_apostles')!;
                            return (
                              <div 
                                className="special-group near_apostles spatial-position spatial-top-left"
                                onClick={(e: React.MouseEvent) => {
                                  handleQuadrantClick('near_apostles', group.value, e);
                                }}
                                data-clickable={group.value > 0 ? "true" : "false"}
                              >
                                <h4 className="special-group-title">{group.title}</h4>
                                <div className="special-group-value">{group.value}</div>
                                <div className="special-group-percentage">{group.percentage}%</div>
                                {group.value > 0 && (
                                  <div className="premium-hint">Click for details</div>
                                )}
                              </div>
                            );
                          })()}
                          
                          {/* Advocates - Top Right, larger */}
                          {specialGroupsData.find(g => g.type === 'apostles') && (() => {
                            const group = specialGroupsData.find(g => g.type === 'apostles')!;
                            return (
                              <div 
                                className="special-group apostles spatial-position spatial-top-right"
                                onClick={(e: React.MouseEvent) => {
                                  handleQuadrantClick('apostles', group.value, e);
                                }}
                                data-clickable={group.value > 0 ? "true" : "false"}
                              >
                                <h4 className="special-group-title">{group.title}</h4>
                                <div className="special-group-value">{group.value}</div>
                                <div className="special-group-percentage">{group.percentage}%</div>
                                {group.value > 0 && (
                                  <div className="premium-hint">Click for details</div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        
                        {/* Bottom: Trolls - Bottom Left */}
                        {specialGroupsData.find(g => g.type === 'terrorists') && (() => {
                          const group = specialGroupsData.find(g => g.type === 'terrorists')!;
                          return (
                            <div 
                              className="special-group terrorists spatial-position spatial-bottom-left"
                              onClick={(e: React.MouseEvent) => {
                                handleQuadrantClick('terrorists', group.value, e);
                              }}
                              data-clickable={group.value > 0 ? "true" : "false"}
                            >
                              <h4 className="special-group-title">{group.title}</h4>
                              <div className="special-group-value">{group.value}</div>
                              <div className="special-group-percentage">{group.percentage}%</div>
                              {group.value > 0 && (
                                <div className="premium-hint">Click for details</div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Special Groups Insights */}
              <div className="pair-item">
                <Card className={`distribution-card ${totalSpecialGroups === 0 ? 'special-groups-empty' : ''}`}>
                  <div className="card-header-with-toggle">
                    <div className="card-title-wrapper">
                      <h3 className="card-title">Segment Distribution: Special Groups Insights</h3>
                      {totalSpecialGroups === 0 && !isSpecialGroupsExpanded && (
                        <span className="empty-state-indicator">{emptyStateMessage}</span>
                      )}
                    </div>
                    {totalSpecialGroups === 0 && (
                      <button 
                        className="expand-toggle-btn"
                        onClick={() => setIsSpecialGroupsExpanded(!isSpecialGroupsExpanded)}
                        aria-label={isSpecialGroupsExpanded ? "Collapse" : "Expand"}
                        type="button"
                      >
                        {isSpecialGroupsExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    )}
                  </div>
                  
                  {totalSpecialGroups === 0 ? (
                    <>
                      {isSpecialGroupsExpanded ? (
                        <div className="insights-grid">
                    <div className="insight-card">
                      <div className="insight-card-label">Total Special</div>
                      <div className="insight-card-value">
            {((effectiveDistribution.apostles || 0) + (showNearApostles ? (effectiveDistribution.nearApostles || 0) : 0)) + (effectiveDistribution.terrorists || 0)}
          </div>
          <div className="insight-card-description">
            {(((((effectiveDistribution.apostles || 0) + (showNearApostles ? (effectiveDistribution.nearApostles || 0) : 0)) + (effectiveDistribution.terrorists || 0)) / effectiveTotal * 100).toFixed(1))}% of total responses
          </div>
                    </div>
                    
                    <div className="insight-card">
                      <div className="insight-card-label">Dominant Special</div>
                      <div className="insight-card-value">
                        {(() => {
                          const apostlesCount = effectiveDistribution.apostles || 0;
                          const nearApostlesCount = showNearApostles ? (effectiveDistribution.nearApostles || 0) : 0;
                          const terroristsCount = effectiveDistribution.terrorists || 0;
                          const positiveCount = apostlesCount + nearApostlesCount;
                          const negativeCount = terroristsCount;
                          
                          if (positiveCount > negativeCount) {
                            return showNearApostles && nearApostlesCount > apostlesCount
                              ? (isClassicModel ? 'Near-Apostles' : 'Near-Advocates')
                              : (isClassicModel ? 'Apostles' : 'Advocates');
                          } else if (negativeCount > positiveCount) {
                            return (isClassicModel ? 'Terrorists' : 'Trolls');
                          } else {
                            return 'Equal';
                          }
                        })()}
                      </div>
                      <div className="insight-card-description">
                        Larger special group
                      </div>
                    </div>
                    
                    <div className="insight-card">
                      <div className="insight-card-label">Special Balance</div>
                      <div className="insight-card-value">
                        {(() => {
                          const apostlesCount = effectiveDistribution.apostles || 0;
                          const nearApostlesCount = showNearApostles ? (effectiveDistribution.nearApostles || 0) : 0;
                          const terroristsCount = effectiveDistribution.terrorists || 0;
                          const positiveTotal = apostlesCount + nearApostlesCount;
                          const negativeTotal = terroristsCount;
                          
                          // Consider balanced if difference is within 10% of total special groups or <= 1
                          const totalSpecial = positiveTotal + negativeTotal;
                          if (totalSpecial === 0) return 'N/A';
                          
                          const difference = Math.abs(positiveTotal - negativeTotal);
                          const isWithinTolerance = difference <= 1 || (difference / totalSpecial) <= 0.1;
                          
                          return isWithinTolerance ? 'Balanced' : 'Unbalanced';
                        })()}
                      </div>
                      <div className="insight-card-description">
                        Special groups distribution
                      </div>
                    </div>
                    
                    <div className="insight-card">
                      <div className="insight-card-label">Special Significance</div>
                      <div className="insight-card-value">
            {totalSpecialGroups > (effectiveTotal * 0.1)
              ? 'High'
              : 'Low'
            }
          </div>
          <div className="insight-card-description">
            {totalSpecialGroups > (effectiveTotal * 0.1)
              ? 'Special zones are significant'
              : 'Special zones are minimal'
            }
          </div>
                    </div>
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <div className="insights-grid">
                      <div className="insight-card">
                        <div className="insight-card-label">Total Special</div>
                        <div className="insight-card-value">
              {totalSpecialGroups}
            </div>
            <div className="insight-card-description">
              {((totalSpecialGroups / effectiveTotal * 100).toFixed(1))}% of total responses
            </div>
                      </div>
                      
                      <div className="insight-card">
                        <div className="insight-card-label">Dominant Special</div>
                        <div className="insight-card-value">
                          {(() => {
                            const apostlesCount = effectiveDistribution.apostles || 0;
                            const nearApostlesCount = showNearApostles ? (effectiveDistribution.nearApostles || 0) : 0;
                            const terroristsCount = effectiveDistribution.terrorists || 0;
                            const positiveCount = apostlesCount + nearApostlesCount;
                            const negativeCount = terroristsCount;
                            
                            if (positiveCount > negativeCount) {
                              return showNearApostles && nearApostlesCount > apostlesCount
                                ? (isClassicModel ? 'Near-Apostles' : 'Near-Advocates')
                                : (isClassicModel ? 'Apostles' : 'Advocates');
                            } else if (negativeCount > positiveCount) {
                              return (isClassicModel ? 'Terrorists' : 'Trolls');
                            } else {
                              return 'Equal';
                            }
                          })()}
                        </div>
                        <div className="insight-card-description">
                          Larger special group
                        </div>
                      </div>
                      
                      <div className="insight-card">
                        <div className="insight-card-label">Special Balance</div>
                        <div className="insight-card-value">
                          {(() => {
                            const apostlesCount = effectiveDistribution.apostles || 0;
                            const nearApostlesCount = showNearApostles ? (effectiveDistribution.nearApostles || 0) : 0;
                            const terroristsCount = effectiveDistribution.terrorists || 0;
                            const positiveTotal = apostlesCount + nearApostlesCount;
                            const negativeTotal = terroristsCount;
                            
                            // Consider balanced if difference is within 10% of total special groups or <= 1
                            const totalSpecial = positiveTotal + negativeTotal;
                            if (totalSpecial === 0) return 'N/A';
                            
                            const difference = Math.abs(positiveTotal - negativeTotal);
                            const isWithinTolerance = difference <= 1 || (difference / totalSpecial) <= 0.1;
                            
                            return isWithinTolerance ? 'Balanced' : 'Unbalanced';
                          })()}
                        </div>
                        <div className="insight-card-description">
                          Special groups distribution
                        </div>
                      </div>
                      
                      <div className="insight-card">
                        <div className="insight-card-label">Special Significance</div>
                        <div className="insight-card-value">
              {totalSpecialGroups > (effectiveTotal * 0.1)
                ? 'High'
                : 'Low'
              }
            </div>
            <div className="insight-card-description">
              {totalSpecialGroups > (effectiveTotal * 0.1)
                ? 'Special zones are significant'
                : 'Special zones are minimal'
              }
            </div>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
      
      {/* Unified Controls Panel */}
      {showSidePanel && (
        <div className="unified-controls-panel" ref={panelRef}>
          <div className="unified-controls-header">
            <div className="unified-controls-tabs">
              <div className="unified-tab active">
                <Filter size={16} />
                Filters
                {filterContext && (
                  <span 
                    className="connection-status-icon"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isConnected) {
                        setShowReconnectModal(true);
                      }
                    }}
                    title={isConnected ? 'Connected to main filters (will disconnect automatically when you change filters)' : 'Click to reconnect to main filters'}
                    style={{ cursor: !isConnected ? 'pointer' : 'default' }}
                  >
                    {isConnected ? (
                      <Link2 size={14} />
                    ) : (
                      <Link2Off size={14} />
                    )}
                  </span>
                )}
                {filterCount > 0 && (
                  <span className="unified-filter-badge">{filterCount}</span>
                )}
              </div>
            </div>
            
            <button className="unified-close-button" onClick={() => setShowSidePanel(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Filter Content */}
          <div className="unified-controls-content">
            <div className="unified-tab-content">
              <div className="unified-tab-body">
                {filterContext && (
                  <FilterPanel
                    data={originalData || data || []}
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
                  onClick={() => {
                    setFilterResetTrigger(prev => prev + 1);
                    setActiveFilters([]);
                  }}
                  disabled={filterCount === 0}
                >
                  Reset All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Reconnection Confirmation Modal */}
      {showReconnectModal && (
        <div className="filter-connection-modal-overlay">
          <div className="filter-connection-modal">
            <div className="modal-header">
              <h3>Connect to Main Chart Filters?</h3>
            </div>
            <div className="modal-content">
              <p>This will discard your local changes and sync to the main chart filters.</p>
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
                  handleConnectionToggle(true);
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
  
  export default DistributionSection;