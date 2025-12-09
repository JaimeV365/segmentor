import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { Menu, X, Info, Settings, Filter, Link2, Link2Off } from 'lucide-react';
import { MiniPlot } from '../MiniPlot';
import CombinationDial from '../CombinationDial';
import ResponseSettings from '../ResponseSettings';
import type { DataReport } from '../../types';
import type { ResponseConcentrationSettings } from '../ResponseSettings/types';
import type { DataPoint } from '@/types/base';
import FilterPanel from '../../../visualization/filters/FilterPanel';
import { getEnhancedCombinations, type CombinationWithTier } from './enhancedCombinations';
import { useFilterContextSafe } from '../../../visualization/context/FilterContext';
import { useNotification } from '../../../data-entry/hooks/useNotification';
import { ReportFilter } from '../../filters/ReportFilterPanel';
// PremiumFeature removed - Response Concentration is public for all users
import '../../../visualization/controls/UnifiedChartControls.css';
import './styles.css';
import './TierToggle.css';
import { useQuadrantAssignment, QuadrantType } from '../../../visualization/context/QuadrantAssignmentContext';

interface Combination {
  satisfaction: number;
  loyalty: number;
  count: number;
  percentage: number;
}

// Define a record type for dynamic properties
interface DynamicDataPoint extends Record<string, any> {
  id: string;
  satisfaction: number;
  loyalty: number;
  count: number;
  percentage: number;
  name: string;
  group: string;
}

interface ResponseConcentrationProps {
  report: DataReport;
  settings: ResponseConcentrationSettings;
  onSettingsChange: (settings: ResponseConcentrationSettings) => void;
  isPremium: boolean;
  originalData?: DataPoint[]; // Add original data prop to access all fields
  hideTitle?: boolean; // Option to hide the title (used when title is rendered at parent level)
  onRenderTitleControls?: (controls: React.ReactNode) => void; // Callback to render controls in title
  // Main chart frequency filter integration
  frequencyFilterEnabled?: boolean;
  frequencyThreshold?: number;
  onFrequencyFilterEnabledChange?: (enabled: boolean) => void;
  onFrequencyThresholdChange?: (threshold: number) => void;
}

export const ResponseConcentrationSection: React.FC<ResponseConcentrationProps> = ({
  report,
  settings,
  onSettingsChange,
  isPremium,
  originalData = [],
  hideTitle = false,
  onRenderTitleControls,
  frequencyFilterEnabled = false,
  frequencyThreshold = 2,
  onFrequencyFilterEnabledChange,
  onFrequencyThresholdChange
}) => {
  console.log("🚨 COMPONENT START - ResponseConcentrationSection is rendering!");
  console.log("🔥 ResponseConcentrationSection ENTRY - originalData length:", originalData.length);
  console.log("🔥 Component is rendering with settings:", settings.miniPlot);
  // Connect to QuadrantAssignmentContext for live color updates
  const { getQuadrantForPoint, midpoint, manualAssignments } = useQuadrantAssignment();
  console.log("🔥 MANUAL ASSIGNMENTS DEBUG:", Array.from(manualAssignments.entries()));
  console.log("🔥 MANUAL ASSIGNMENTS STRING:", Array.from(manualAssignments.entries()).join(','));
  console.log("🔥 CONTEXT CONNECTED - midpoint:", midpoint, "manualAssignments size:", manualAssignments.size);
  console.log("***DEBUG*** isPremium result:", isPremium);
  
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'filters'>('settings');
  const [activeSettingsTab, setActiveSettingsTab] = useState<'distribution' | 'responses' | 'intensity'>('distribution');
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [useMainChartFrequencyFilter, setUseMainChartFrequencyFilter] = useState(false);
  const [filterResetTrigger, setFilterResetTrigger] = useState(0);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [isManualReconnecting, setIsManualReconnecting] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [showExpandedInfo, setShowExpandedInfo] = useState(false);
  // Store filtered data from FilterPanel when report filters are applied (for disconnected reports with segment filters)
  const [filteredDataFromPanel, setFilteredDataFromPanel] = useState<DataPoint[] | null>(null);
  
  // Track connection status changes for notifications
  const prevIsConnected = useRef<boolean | undefined>(undefined);
  const lastNotificationTime = useRef<number>(0);
  const lastNotificationType = useRef<'connected' | 'disconnected' | null>(null);
  const notificationShownForState = useRef<string | null>(null);
  const isShowingNotification = useRef<boolean>(false);
  const notificationPending = useRef<boolean>(false);
  const NOTIFICATION_DEBOUNCE_MS = 2000;
  
  // Add state for info ribbon visibility
  const [showInfoRibbon, setShowInfoRibbon] = useState(true);

  // Filter context for connection system
  const filterContext = useFilterContextSafe();
  const { showNotification } = useNotification();

  // Create unique REPORT_ID for this section
  const REPORT_ID = useMemo(() => 'responseConcentration', []);

  // Initialize report filter state on mount - sync to main filters
  useLayoutEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[REPORT_ID]) {
      console.log('🔌 [ResponseConcentration] LAYOUT EFFECT INIT: Syncing report state to main state');
      filterContext.syncReportToMaster(REPORT_ID);
    }
  }, [filterContext, REPORT_ID]);
  
  // Backup initialization check (runs after first render)
  useEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[REPORT_ID]) {
      console.log('🔌 [ResponseConcentration] Backup init: Syncing report state to main state');
      filterContext.syncReportToMaster(REPORT_ID);
    }
  }, [filterContext, REPORT_ID]);

  // Derive connection status by comparing filter states
  const isConnected = useMemo(() => {
    if (!filterContext) {
      return true; // Default to connected if no context
    }
    
    const reportState = filterContext.reportFilterStates[REPORT_ID];
    const mainState = filterContext.filterState;
    
    // If no report state exists yet, consider connected (will sync from main)
    if (!reportState) {
      return true;
    }
    
    // Compare report state with main state
    return filterContext.compareFilterStates(reportState, mainState);
  }, [filterContext, REPORT_ID, filterContext?.reportFilterStates?.[REPORT_ID], filterContext?.filterState, filterContext?.isSyncingFromMain]);
  
  // Calculate filter count from appropriate state (main if connected, report if disconnected)
  const filterCount = useMemo(() => {
    if (!filterContext) return activeFilters?.length || 0;
    
    const stateToUse = isConnected 
      ? filterContext.filterState 
      : (filterContext.getReportFilterState(REPORT_ID) || filterContext.filterState);
    
    // Count active filters from FilterState
    const hasDateFilter = stateToUse.dateRange?.preset && stateToUse.dateRange.preset !== 'all';
    const attributeFilterCount = stateToUse.attributes?.filter(attr => attr.values && attr.values.size > 0).length || 0;
    const totalCount = (hasDateFilter ? 1 : 0) + attributeFilterCount;
    
    // Fallback to activeFilters array length if available and state count is 0
    return totalCount > 0 ? totalCount : (activeFilters?.length || 0);
  }, [filterContext, isConnected, REPORT_ID, activeFilters]);

  // Clear filteredDataFromPanel when report reconnects (so we use main filteredData)
  useEffect(() => {
    if (isConnected && filteredDataFromPanel !== null) {
      console.log(`🔌 [ResponseConcentration] Report reconnected - clearing filteredDataFromPanel and using main filteredData`);
      setFilteredDataFromPanel(null);
    }
  }, [isConnected, filteredDataFromPanel]);
  
  // Get effective filtered data (uses report filters when connected/disconnected)
  // CRITICAL: When report filters disconnect and have segment filters, FilterPanel filters the data
  // and passes it via onFilterChange. We should use that filtered data instead of getReportFilteredData
  // which can't handle segment filtering without quadrantContext.
  const effectiveData = useMemo(() => {
    if (!originalData || !filterContext) return originalData || [];
    
    // If we have filtered data from FilterPanel (for disconnected reports with segment filters), use it
    if (!isConnected && filteredDataFromPanel !== null) {
      console.log(`🔌 [ResponseConcentration] Using filtered data from FilterPanel (disconnected):`, {
        filteredDataLength: filteredDataFromPanel.length,
        originalDataLength: originalData.length
      });
      return filteredDataFromPanel;
    }
    
    // Otherwise, use report filter system to get filtered data
    return filterContext.getReportFilteredData(REPORT_ID, originalData);
  }, [originalData, filterContext, REPORT_ID, filterContext?.reportFilterStates?.[REPORT_ID], filterContext?.filterState, filteredDataFromPanel, isConnected]);

  // Add refs for click-outside detection (following BarChart pattern)
  const panelRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  
  // Close other panels when this one opens
  const closeOtherPanels = useCallback(() => {
    // Dispatch event to close bar chart panels
    const closeEvent = new CustomEvent('closeBarChartPanel', { 
      detail: { exceptChartId: null } // Close all bar charts
    });
    document.dispatchEvent(closeEvent);
    
    // Dispatch event to close other response concentration panels (if multiple exist)
    const closeResponseEvent = new CustomEvent('closeResponseConcentrationPanel', { 
      detail: {} 
    });
    document.dispatchEvent(closeResponseEvent);
  }, []);

  // Listen for close events from other panels (BarChart and other Response Concentration panels)
  useEffect(() => {
    const handleCloseResponseEvent = () => {
      if (showPanel) {
        console.log('[ResponseConcentration] Closing panel - another panel opened');
        setShowPanel(false);
      }
    };
    
    const handleCloseBarChartEvent = () => {
      // Close this panel when any BarChart panel opens
      if (showPanel) {
        console.log('[ResponseConcentration] Closing panel - BarChart opened');
        setShowPanel(false);
      }
    };
    
    document.addEventListener('closeResponseConcentrationPanel', handleCloseResponseEvent);
    document.addEventListener('closeBarChartPanel', handleCloseBarChartEvent);
    return () => {
      document.removeEventListener('closeResponseConcentrationPanel', handleCloseResponseEvent);
      document.removeEventListener('closeBarChartPanel', handleCloseBarChartEvent);
    };
  }, [showPanel]);

  // Handler for toggle panel - memoized to avoid recreation
  const handleTogglePanel = useCallback(() => {
    console.log('🍔 Hamburger clicked - current showPanel:', showPanel);
    const newShowPanel = !showPanel;
    
    if (newShowPanel) {
      // Close other panels before opening this one
      closeOtherPanels();
      setActiveTab(filterCount > 0 ? 'filters' : 'settings');
    }
    
    setShowPanel(newShowPanel);
    console.log('🍔 Setting showPanel to:', newShowPanel);
  }, [showPanel, filterCount, closeOtherPanels]);

  // Handle filter changes
  const handleFilterChange = useCallback((filteredPoints: DataPoint[], newFilters: any[], filterState?: any) => {
    console.log("***DEBUG*** handleFilterChange called with:", filteredPoints.length, "points");
    console.log("Filter change triggered", newFilters, {
      filteredDataLength: filteredPoints.length,
      originalDataLength: originalData?.length
    });
    
    // CRITICAL: Store filtered data from FilterPanel for disconnected reports with segment filters
    // This ensures we use the correctly filtered data instead of getReportFilteredData which can't handle segments
    setFilteredDataFromPanel(filteredPoints);
    
    // Update active filters for UI display
    setActiveFilters(newFilters);
    
    // If no filter context or manual reconnecting, just update state
    if (!filterContext || !filterState || isManualReconnecting) {
      return;
    }
    
    // Track local changes for connection status
    setHasLocalChanges(true);
    
    // Note: filteredData will be updated automatically via effectiveData useEffect
    // since effectiveData comes from filterContext.getReportFilteredData (or filteredDataFromPanel if disconnected)
  }, [isManualReconnecting, filterContext, originalData]);

  // Handle connection toggle
  const handleConnectionToggle = useCallback((confirmed: boolean) => {
    if (!filterContext) return;
    
    if (confirmed) {
      // Reconnecting - sync report state to main state
      setIsManualReconnecting(true);
      
      // Set notification tracking BEFORE sync to prevent useEffect from showing duplicate
      const now = Date.now();
      isShowingNotification.current = true;
      lastNotificationTime.current = now;
      lastNotificationType.current = 'connected';
      const currentStateId = `${isConnected}_true`;
      notificationShownForState.current = currentStateId;
      
      console.log(`🔔 [ResponseConcentration] Manual reconnect - setting notification tracking for: ${currentStateId}`);
      
      filterContext.syncReportToMaster(REPORT_ID);
      setHasLocalChanges(false);
      
      setShowReconnectModal(false);
      
      // Show notification
      console.log(`🔔 [ResponseConcentration] Manual reconnect - showing notification`);
      showNotification({
        title: 'Filters Connected',
        message: 'Response Concentration filters are now synced with the main chart.',
        type: 'success',
        icon: <Link2 size={18} style={{ color: '#166534' }} />
      });
      
      // Reset flags after a delay
      setTimeout(() => {
        setIsManualReconnecting(false);
        isShowingNotification.current = false;
        setTimeout(() => {
          lastNotificationType.current = null;
          notificationShownForState.current = null;
        }, NOTIFICATION_DEBOUNCE_MS);
      }, 100);
    } else {
      setShowReconnectModal(false);
    }
  }, [filterContext, REPORT_ID, showNotification, isConnected]);
  
  // Track if we're still in the initial setup phase (first few seconds after mount)
  const initialSetupPhaseRef = useRef<boolean>(true);
  const mountTimeRef = useRef<number>(Date.now());
  
  // Notification tracking useEffect
  // Initialize prevIsConnected to match initial isConnected value to prevent false transitions
  // Use useLayoutEffect to ensure this runs synchronously BEFORE the notification effect
  useLayoutEffect(() => {
    if (prevIsConnected.current === undefined && filterContext) {
      prevIsConnected.current = isConnected;
      console.log(`🔔 [ResponseConcentration] Initializing prevIsConnected to ${isConnected} for ${REPORT_ID}`);
    }
    
    // End initial setup phase after 3 seconds or when report state is stable
    const timeSinceMount = Date.now() - mountTimeRef.current;
    if (initialSetupPhaseRef.current && (timeSinceMount > 3000 || filterContext?.reportFilterStates[REPORT_ID])) {
      // Give it a bit more time for sync operations to complete
      setTimeout(() => {
        initialSetupPhaseRef.current = false;
        console.log(`🔔 [ResponseConcentration] Initial setup phase ended for ${REPORT_ID}`);
      }, 1000);
    }
  }, [filterContext, isConnected, REPORT_ID]);

  // Only handles automatic DISCONNECT (user makes changes while connected)
  // Manual RECONNECT is handled by handleConnectionToggle
  useEffect(() => {
    if (!filterContext) return;
    
    // Skip entirely if this is a manual reconnect
    if (isManualReconnecting) {
      prevIsConnected.current = isConnected;
      return;
    }
    
    // Skip if prevIsConnected hasn't been initialized yet (first render)
    if (prevIsConnected.current === undefined) {
      prevIsConnected.current = isConnected;
      return;
    }
    
    // Skip if states haven't actually changed
    if (prevIsConnected.current === isConnected) {
      return;
    }
    
    // Create a stable identifier for this specific state change
    const stateChangeId = `${REPORT_ID}_${prevIsConnected.current}_${isConnected}`;
    
    // Check if we've already shown notification for this exact state change
    const alreadyNotified = notificationShownForState.current === stateChangeId;
    const isCurrentlyShowing = isShowingNotification.current;
    const isPending = notificationPending.current;
    
    if (alreadyNotified || isCurrentlyShowing || isPending) {
      console.log(`🔔 [ResponseConcentration] DUPLICATE PREVENTED: Already shown notification for ${stateChangeId}`);
      prevIsConnected.current = isConnected;
      return;
    }
    
    const reportState = filterContext.reportFilterStates[REPORT_ID];
    const mainState = filterContext.filterState;
    const now = Date.now();
    
    // ONLY automatic disconnect: connected -> disconnected
    // BUT NOT during initial setup phase
    const shouldShowDisconnect = (
      prevIsConnected.current === true && 
      isConnected === false && 
      !isShowingNotification.current &&
      !filterContext.isSyncingFromMain &&
      !initialSetupPhaseRef.current && // Don't show notification during initial setup phase
      (now - lastNotificationTime.current) > NOTIFICATION_DEBOUNCE_MS &&
      lastNotificationType.current !== 'disconnected'
    );
    
    console.log('🔔 [ResponseConcentration] Disconnect check:', {
      REPORT_ID,
      prevIsConnected: prevIsConnected.current,
      isConnected,
      isShowingNotification: isShowingNotification.current,
      isSyncingFromMain: filterContext.isSyncingFromMain,
      timeSinceLastNotification: now - lastNotificationTime.current,
      lastNotificationType: lastNotificationType.current,
      shouldShowDisconnect
    });
    
    if (shouldShowDisconnect) {
      // Only show notification if report state actually differs from main state
      const statesDiffer = reportState && !filterContext.compareFilterStates(reportState, mainState);
      
      if (statesDiffer) {
        // Set ALL flags IMMEDIATELY and SYNCHRONOUSLY before showing notification
        notificationPending.current = true;
        notificationShownForState.current = stateChangeId;
        isShowingNotification.current = true;
        lastNotificationTime.current = now;
        lastNotificationType.current = 'disconnected';
        
        console.log(`🔔 [ResponseConcentration] Showing DISCONNECT notification for state change: ${stateChangeId}`);
        showNotification({
          title: 'Filters Disconnected',
          message: 'Response Concentration filters are now independent from the main chart.',
          type: 'success',
          icon: <Link2Off size={18} style={{ color: '#166534' }} />
        });
        
        // Reset flags after showing notification
        setTimeout(() => {
          isShowingNotification.current = false;
          notificationPending.current = false;
        }, 500);
      }
    }
    
    // NO automatic connect logic - reconnection is only manual via handleConnectionToggle
    // Initial sync on mount is silent (no notification)
    
    prevIsConnected.current = isConnected;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, isManualReconnecting, REPORT_ID, filterContext]);
  
  // Update title controls when state changes
  useEffect(() => {
    if (hideTitle && onRenderTitleControls) {
      const controls = (
        <button 
          ref={settingsButtonRef}
          className={`response-concentration-control-button ${showPanel ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🍔 Button clicked in title wrapper');
            handleTogglePanel();
          }}
          title="Chart settings and filters"
          type="button"
        >
          <Menu size={22} />
        </button>
      );
      onRenderTitleControls(controls);
    }
  }, [hideTitle, onRenderTitleControls, showPanel, handleTogglePanel]);

// Click-outside handler (updated for unified controls panel)
const handleClickOutside = useCallback((event: MouseEvent) => {
  if (!showPanel) return;
  
  const targetElement = event.target as HTMLElement;
  const isPanelClick = targetElement.closest('.unified-controls-panel');
  const isFilterPanelClick = targetElement.closest('.report-filter-panel') || 
                             targetElement.closest('.filter-panel-content');
  const isTabClick = targetElement.closest('.unified-tab') ||
                     targetElement.closest('.filter-tab') ||
                     targetElement.closest('.settings-sub-tab');
  const isControlButtonClick = settingsButtonRef.current?.contains(targetElement);
  const isInfoPopupClick = targetElement.closest('.info-popup-portal') || 
                          targetElement.closest('.info-popup-content') ||
                          targetElement.closest('.info-popup-close');
  const isModalClick = targetElement.closest('.reconnect-modal') ||
                       targetElement.closest('.reconnect-modal-overlay');
  
  // Close panel when clicking outside (but not on tabs, panel, buttons, info popups, or modals)
  if (!isPanelClick && !isControlButtonClick && !isTabClick && !isFilterPanelClick && !isInfoPopupClick && !isModalClick) {
    setShowPanel(false);
  }
}, [showPanel]);

useEffect(() => {
  document.addEventListener('mousedown', handleClickOutside);
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [handleClickOutside]);
  
  // Enhanced combinations that support premium features
  const getEnhancedCombinationsWithSettings = (data: any[]): CombinationWithTier[] => {
    if (!data || data.length === 0) return [];
    
    return getEnhancedCombinations(data, {
      frequencyThreshold: settings.miniPlot.frequencyThreshold || 2,
      showTiers: settings.miniPlot.showTiers || false,
      maxTiers: settings.miniPlot.maxTiers || 2,
      isPremium: true // Always allow tiers (now public feature)
    });
  };

  // Add state for filtered data using enhanced combinations with premium features
  // Use effectiveData (filtered by report filters) instead of originalData
  const [filteredData, setFilteredData] = useState<CombinationWithTier[]>(
    effectiveData.length > 0 ? 
      getEnhancedCombinationsWithSettings(effectiveData) : 
      report.mostCommonCombos.map(combo => ({ ...combo, tier: 1, opacity: 1, size: 1 }))
  );
  
  console.log("***DEBUG*** Initial filteredData:", filteredData);
  console.log("***DEBUG*** Report mostCommonCombos:", report.mostCommonCombos);
  console.log("***DEBUG*** Settings frequencyThreshold:", settings.miniPlot.frequencyThreshold);
  console.log("***DEBUG*** Settings showTiers:", settings.miniPlot.showTiers);
  console.log("***DEBUG*** Settings maxTiers:", settings.miniPlot.maxTiers);
  console.log("***DEBUG*** effectiveData length:", effectiveData.length);
  console.log("***DEBUG*** effectiveData (non-excluded):", effectiveData.filter(d => !d.excluded).length);
  console.log("***DEBUG*** effectiveData combinations breakdown:", 
    Array.from(
      effectiveData.filter(d => !d.excluded).reduce((map, d) => {
        const key = `${d.satisfaction}-${d.loyalty}`;
        map.set(key, (map.get(key) || 0) + 1);
        return map;
      }, new Map<string, number>()).entries()
    ).map(([key, count]) => `${key}: ${count}`)
  );

  // Create a memoized data signature to properly detect actual data changes
  const dataSignature = useMemo(() => {
    if (!effectiveData || effectiveData.length === 0) return '';
    
    return effectiveData
      .filter(d => !d.excluded)
      .map(d => `${d.id || 'no-id'}-${d.satisfaction}-${d.loyalty}`)
      .sort()
      .join('|');
  }, [effectiveData]);

  // Real-time update effect - responds to both data and settings changes
  useEffect(() => {
    console.log("🔥 useEffect TRIGGERED - dependency changed!");
    if (effectiveData && effectiveData.length > 0) {
      console.log("🔥 Data signature:", dataSignature.substring(0, 150) + (dataSignature.length > 150 ? '...' : ''));
      
      const newCombinations = getEnhancedCombinationsWithSettings(effectiveData);
      console.log("🔥 New combinations built:", newCombinations.length);
      console.log("🔥 New combinations details:", newCombinations.map(c => `${c.satisfaction},${c.loyalty} (count: ${c.count}, tier: ${c.tier}, size: ${c.size}, opacity: ${c.opacity})`));
      
      setFilteredData(newCombinations);
      console.log("🔥 useEffect TRIGGERED - rebuilding combinations due to dependency change");
      console.log("🔥 Current context values - midpoint:", midpoint, "manualAssignments:", manualAssignments.size);
    } else if (effectiveData && effectiveData.length === 0) {
      // Clear combinations if no data
      setFilteredData([]);
    }
  }, [
    dataSignature, // Use the memoized signature instead of effectiveData directly
    settings.miniPlot.frequencyThreshold,
    settings.miniPlot.showTiers,
    settings.miniPlot.maxTiers,
    // Listen to context changes for live color updates
    midpoint.sat,
    midpoint.loy,
    Array.from(manualAssignments.entries()).join(',')
  ]);

  // Prepare the filterable data from originalData
  const [filterableData, setFilterableData] = useState<any[]>([]);

  // Determine if we have filterable data (using same logic as main visualization)
  const hasFilterableFields = useMemo(() => {
    if (filterableData.length === 0) return false;
    
    // Check for dates
    const hasDate = filterableData.some(item => item.date);
    
    // Check for custom fields (anything beyond standard fields)
    const hasCustomFields = filterableData.some(item => {
      const standardFields = ['id', 'name', 'satisfaction', 'loyalty', 'excluded', 'date', 'dateFormat', 'group', 'email', 'quadrant', 'count', 'percentage'];
      return Object.keys(item).some(key => !standardFields.includes(key));
    });
    
    // Check for multiple groups
    const uniqueGroups = new Set(filterableData.map(item => item.group));
    const hasMultipleGroups = uniqueGroups.size > 1;
    
    // Check for satisfaction/loyalty distributions
    const hasSatisfactionDistribution = new Set(filterableData.map(item => item.satisfaction)).size > 1;
    const hasLoyaltyDistribution = new Set(filterableData.map(item => item.loyalty)).size > 1;
    
    return hasDate || hasCustomFields || hasMultipleGroups || hasSatisfactionDistribution || hasLoyaltyDistribution;
  }, [filterableData]);
  
  // Set up filterable data on component mount or when effective data changes
  useEffect(() => {
    if (effectiveData && effectiveData.length > 0 && report.mostCommonCombos.length > 0) {
      // Create a map of satisfaction-loyalty pairs for quick lookup
      const comboMap = new Map();
      report.mostCommonCombos.forEach(combo => {
        const key = `${combo.satisfaction}-${combo.loyalty}`;
        comboMap.set(key, combo);
      });
      
      // Filter effective data to only include points that match common combinations
      const filtered = effectiveData.filter(point => {
        const key = `${point.satisfaction}-${point.loyalty}`;
        return comboMap.has(key);
      });
      
      console.log("***DEBUG*** Prepared filterable data:", filtered.length);
      setFilterableData(filtered);
    }
  }, [effectiveData, report.mostCommonCombos]);

 // Get available tiers based on raw combination calculation
  // Get available tiers based on current data and frequency threshold
  const getAvailableTiers = () => {
    if (!effectiveData || effectiveData.length === 0) return [];
    
    // Calculate combinations directly from raw data
    const combinationMap = new Map<string, number>();
    
    effectiveData.filter(d => !d.excluded).forEach(d => {
      const key = `${d.satisfaction}-${d.loyalty}`;
      combinationMap.set(key, (combinationMap.get(key) || 0) + 1);
    });
    
    // Filter by frequency threshold to get valid combinations
    const frequencyThreshold = settings.miniPlot.frequencyThreshold || 2;
    const validCombinations = Array.from(combinationMap.values())
      .filter(count => count >= frequencyThreshold);
    
    const available = [];
    
    // Tier 1: Always available if we have any valid combinations
    if (validCombinations.length > 0) {
      available.push(1);
    }
    
    // Tier 2: Available only if we have combinations with different frequencies
    const uniqueFrequencies = new Set(validCombinations);
    if (uniqueFrequencies.size >= 2) {
      available.push(2);
    }
    
    // Tier 3: Available only if we have 3+ different frequency levels
    if (uniqueFrequencies.size >= 3) {
      available.push(3);
    }
    
    return available;
  };
  
  const availableTiers = getAvailableTiers();
  
  // Calculate maximum combination frequency for slider limit
  const maxCombinationFrequency = useMemo(() => {
    if (!effectiveData || effectiveData.length === 0) return 0;
    
    const combinationMap = new Map<string, number>();
    effectiveData.filter(d => !d.excluded).forEach(d => {
      const key = `${d.satisfaction}-${d.loyalty}`;
      combinationMap.set(key, (combinationMap.get(key) || 0) + 1);
    });
    
    const frequencies = Array.from(combinationMap.values());
    return frequencies.length > 0 ? Math.max(...frequencies) : 0;
  }, [effectiveData]);
  
  // Auto-adjust maxItems if it's lower than available combinations (only increase, never decrease)
useEffect(() => {
  if (filteredData.length > 0 && settings.list.maxItems < filteredData.length && settings.list.maxItems < 10) {
    // Only auto-adjust if the current setting is the old default (5) or very low
    // This prevents overriding user's intentional choices
    onSettingsChange({
      ...settings,
      list: {
        ...settings.list,
        maxItems: Math.min(filteredData.length, 15) // Cap at 15 for performance
      }
    });
  }
}, [filteredData.length, onSettingsChange]);
const getFilteredCombinations = () => {
    const result = filteredData.slice(0, settings.list.maxItems);
    console.log("***DEBUG*** getFilteredCombinations result:", result);
    return result;
  };

  const getColorForQuadrant = (quadrant: QuadrantType): string => {
    switch (quadrant) {
      case 'apostles':
      case 'near_apostles':
      case 'loyalists':
        return '#4CAF50';
      case 'mercenaries':
        return '#F7B731';
      case 'hostages':
        return '#3A6494';  // This will fix your blue issue!
      case 'defectors':
      case 'terrorists':
        return '#CC0000';
      default:
        return '#666666';
    }
  };
  
  const getPointColor = (satisfaction: number, loyalty: number): string => {
    console.log("🔥 getPointColor CALLED for point:", satisfaction, loyalty);
    if (settings.miniPlot.useQuadrantColors) {
      console.log("🔥 Using quadrant colors - creating temp point");
      
      // Find real point at these coordinates to get correct manual assignment
      // Find real point at these coordinates, prioritizing manually assigned points
      // Use effectiveData (filtered data) instead of originalData
const candidatePoints = effectiveData.filter(p => 
  p.satisfaction === satisfaction && p.loyalty === loyalty && !p.excluded
);

const realPoint = candidatePoints.find(p => manualAssignments.has(p.id)) || candidatePoints[0];
      
      let quadrant;
      if (realPoint) {
        // Use real point ID to get correct manual assignment
        quadrant = getQuadrantForPoint(realPoint);
      } else {
        // Fallback: create temp point for coordinates not in originalData
        const tempPoint: DataPoint = {
          id: `temp-${satisfaction}-${loyalty}`,
          name: 'temp',
          satisfaction,
          loyalty,
          group: 'temp',
          date: '',
          email: '',
          excluded: false
        };
        quadrant = getQuadrantForPoint(tempPoint);
      }
      console.log("🔥 Context returned quadrant:", quadrant, "for point:", realPoint ? realPoint.id : `temp-${satisfaction}-${loyalty}`);
      
      // Map to same colors as main chart
      console.log("🔥 Mapping quadrant to color:", quadrant);
      switch (quadrant) {
        case 'loyalists':
        case 'apostles':
        case 'near_apostles':
          return '#4CAF50'; // Green
        case 'mercenaries':
          return '#F7B731'; // Orange
        case 'hostages':
          return '#3A6494'; // Blue
        case 'defectors':
        case 'terrorists':
          return '#CC0000'; // Red
        default:
          return '#4CAF50'; // Fallback
      }
    } else {
      return settings.miniPlot.customColors.default || '#3a863e';
    }
  };


  return (
    <section className="response-concentration-section">
      {!hideTitle && (
        <div className="response-concentration-header">
          <div className="section-title-container">
            <h3>Response Concentration</h3>
            {activeFilters.length > 0 && (
              <span className="filter-indicator">
                {activeFilters.length} filter{activeFilters.length !== 1 ? 's' : ''} active
              </span>
            )}
          </div>
          
          <div className="response-concentration-controls">
            <button 
              ref={settingsButtonRef}
              className={`response-concentration-control-button ${showPanel ? 'active' : ''}`}
              onClick={() => {
                setShowPanel(!showPanel);
                // Start with filters tab if there are active filters, otherwise settings
                setActiveTab(activeFilters && activeFilters.length > 0 ? 'filters' : 'settings');
              }}
              title="Chart settings and filters"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      )}
      
      {/* Render controls in title wrapper via callback */}

      {/* Info Ribbon with expandable "Show more" section */}
      {showInfoRibbon && (
        <div className="info-ribbon">
          <div className="info-ribbon-content">
            <Info size={16} className="info-icon" />
            <div className="info-text-wrapper">
              <p className="info-text">
                This section shows response patterns where multiple participants gave identical satisfaction and loyalty ratings.
                It helps identify patterns in your responses and highlights the most common rating combinations.
              </p>
              {!showExpandedInfo && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowExpandedInfo(true);
                  }}
                  className="info-expand-btn"
                  aria-label="Show more information"
                >
                  Show more
                </button>
              )}
              {showExpandedInfo && (
                <div className="info-expanded">
                  <div className="info-detail-section">
                    <h4 className="info-detail-title">Response Distribution Map (Left Column)</h4>
                    <ul className="info-detail-list">
                      <li>A scatter plot showing the distribution of response combinations</li>
                      <li>Each dot represents a unique satisfaction/loyalty combination</li>
                      <li>Color indicates which segment (quadrant) the combination falls into</li>
                      <li>Dot size and opacity indicate frequency (larger = more frequent). Use "Tier-capped display" in settings to limit shown combinations.</li>
                      <li>Shows an average position reference point (red-bordered white dot) when enabled</li>
                      <li>Grid lines help read exact satisfaction and loyalty values</li>
                    </ul>
                  </div>
                  <div className="info-detail-section">
                    <h4 className="info-detail-title">Frequent Responses List (Middle Column)</h4>
                    <ul className="info-detail-list">
                      <li>Lists the most common satisfaction/loyalty combinations</li>
                      <li>Shows count and percentage for each combination</li>
                      <li>Color-coded markers match the segment (quadrant) colors</li>
                      <li>Automatically filters to prevent overcrowding based on frequency threshold</li>
                      <li>Limited to top results by default (adjustable in settings)</li>
                    </ul>
                  </div>
                  <div className="info-detail-section">
                    <h4 className="info-detail-title">Response Intensity Dial (Right Column)</h4>
                    <ul className="info-detail-list">
                      <li>A gauge showing the intensity of the most common response</li>
                      <li>Displays the specific satisfaction and loyalty values</li>
                      <li>Visual indicator of response concentration strength</li>
                    </ul>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowExpandedInfo(false);
                    }}
                    className="info-collapse-btn"
                    aria-label="Show less information"
                  >
                    Show less
                  </button>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => setShowInfoRibbon(false)} 
            className="info-ribbon-close"
            aria-label="Close information"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="response-concentration-grid">
        {/* Distribution Map */}
        <div className="concentration-column">
          <h5>Response Distribution Map</h5>
          <div className="miniplot-container">
            <MiniPlot 
              key={`miniplot-${midpoint.sat}-${midpoint.loy}-${Array.from(manualAssignments.entries()).join(',')}`}
              combinations={filteredData}
              satisfactionScale={report.satisfactionScale}
              loyaltyScale={report.loyaltyScale}
              useQuadrantColors={settings.miniPlot.useQuadrantColors}
              customColors={settings.miniPlot.customColors}
              averagePoint={{
                satisfaction: report.statistics.satisfaction.average,
                loyalty: report.statistics.loyalty.average
              }}
              showAverageDot={settings.miniPlot.showAverageDot}
              getPointColor={getPointColor}
            />
          </div>
          {(settings.miniPlot.showAverageDot || (isPremium && settings.miniPlot.showTiers)) && (
            <div className="miniplot-legend">
              {settings.miniPlot.showAverageDot && (
                <div className="legend-item">
                  <span className="legend-dot average-dot"></span>
                  <span className="legend-text">Average Position</span>
                </div>
              )}
              {/* Phase 2: Tier legend for premium users */}
              {isPremium && settings.miniPlot.showTiers && (
                <div className="tier-legend">
                  {Array.from({ length: settings.miniPlot.maxTiers || 2 }, (_, i) => (
                    <div key={i} className="legend-item">
                      <span 
                        className="legend-dot tier-dot"
                        style={{
                          opacity: i === 0 ? 1 : i === 1 ? 0.7 : 0.5,
                          transform: `scale(${i === 0 ? 1 : i === 1 ? 0.85 : 0.7})`
                        }}
                      ></span>
                      <span className="legend-text">
                        Tier {i + 1} {i === 0 ? '(High)' : i === 1 ? '(Medium)' : '(Low)'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Combinations List */}
        <div className="concentration-column">
          <h5>Frequent Responses</h5>
          <ul className="combinations-list">
            {getFilteredCombinations().map((combo: CombinationWithTier, index: number) => (
              <li key={index} className="combination-item" style={{ opacity: combo.opacity || 1 }}>
                {settings.list.useColorCoding && (
  <span 
    className="combination-marker"
    style={{ 
      backgroundColor: getPointColor(combo.satisfaction, combo.loyalty),
      transform: `scale(${combo.size || 1})`
    }} 
  />
)}
                <div className="combination-text">
                  <span className="combination-values">
                    {combo.satisfaction}, {combo.loyalty}
                    {/* Phase 2: Show tier indicator for premium users */}
                    {isPremium && settings.miniPlot.showTiers && combo.tier && (
                      <span className={`tier-indicator tier-${combo.tier}`}>
                        T{combo.tier}
                      </span>
                    )}
                  </span>
                  <span className="combination-stats">
                    ({combo.count} responses - {combo.percentage.toFixed(1)}%)
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Response Intensity */}
        <div className="concentration-column">
          <h5>Response Intensity</h5>
          <CombinationDial
            statistics={report.statistics}
            totalEntries={report.totalEntries}
            isPremium={isPremium}
            minValue={settings.dial.minValue}
            maxValue={settings.dial.maxValue}
            customColors={settings.dial.customColors}
          />
        </div>
      </div>

      {/* Unified Controls Panel */}
      {showPanel && (
        <div className="unified-controls-panel" ref={panelRef}>
          <div className="unified-controls-header">
            <div className="bar-chart-panel-title">
              Response Concentration
            </div>
            <div className="unified-controls-tabs">
              <button 
                className={`unified-tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('settings');
                }}
              >
                <Settings size={16} />
                Settings
              </button>
              <button 
                className={`unified-tab ${activeTab === 'filters' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  // Only handle tab click if not clicking the connection icon
                  if (!(e.target as HTMLElement).closest('.connection-status-icon')) {
                    setActiveTab('filters');
                  }
                }}
              >
                <Filter size={16} />
                Filters
                {filterContext && (
                  <span 
                    className="connection-status-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isConnected) {
                        // Show confirmation modal before reconnecting
                        setShowReconnectModal(true);
                      }
                    }}
                    title={isConnected ? 'Connected to main filters (will disconnect automatically when you change filters)' : 'Click to reconnect to main filters'}
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
              </button>
            </div>
            
            <button className="unified-close-button" onClick={() => setShowPanel(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Tab Content */}
          <div className="unified-controls-content">
      
            {activeTab === 'settings' ? (
              <div className="unified-tab-content">
                <div className="unified-tab-body">
                  {/* Settings Sub-tabs */}
                  <div className="settings-sub-tabs">
                    <button 
                      className={`settings-sub-tab ${activeSettingsTab === 'distribution' ? 'active' : ''}`}
                      data-tab="distribution"
                      onClick={() => setActiveSettingsTab('distribution')}
                    >
                      Distribution
                    </button>
                    <button 
                      className={`settings-sub-tab ${activeSettingsTab === 'responses' ? 'active' : ''}`}
                      data-tab="responses"
                      onClick={() => setActiveSettingsTab('responses')}
                    >
                      Responses
                    </button>
                    <button 
                      className={`settings-sub-tab ${activeSettingsTab === 'intensity' ? 'active' : ''}`}
                      data-tab="intensity"
                      onClick={() => setActiveSettingsTab('intensity')}
                    >
                      Intensity
                    </button>
                  </div>
                  
                  {/* Existing ResponseSettings component with conditional sections */}
                  <div className="settings-content">
                    <ResponseSettings
                      settings={settings}
                      onSettingsChange={onSettingsChange}
                      onClose={() => setShowPanel(false)}
                      isPremium={isPremium}
                      activeSection={activeSettingsTab}
                      frequencyFilterEnabled={frequencyFilterEnabled}
                      frequencyThreshold={frequencyThreshold}
                      onFrequencyFilterEnabledChange={onFrequencyFilterEnabledChange}
                      onFrequencyThresholdChange={onFrequencyThresholdChange}
                      availableTiers={availableTiers}
                      availableItemsCount={filteredData.length}
                      maxCombinationFrequency={maxCombinationFrequency}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="unified-tab-content">
                <div className="unified-tab-body">
                  <FilterPanel
                    data={filterableData}
                    onFilterChange={handleFilterChange}
                    onClose={() => {
                      console.log("Filter panel close triggered");
                      setShowPanel(false);
                    }}
                    isOpen={true}
                    showPointCount={true}
                    hideHeader={true}
                    contentOnly={true}
                    reportId={REPORT_ID}
                    forceLocalState={true}
                    resetTrigger={filterResetTrigger}
                  />
                </div>
                
                {/* Footer with Reset Button */}
                <div className="unified-tab-footer">
                  <button 
                    className="unified-reset-button" 
                    onClick={() => {
                      // Reset all filters - this will trigger FilterPanel's resetFilters via resetTrigger
                      setFilterResetTrigger(prev => prev + 1);
                      setActiveFilters([]);
                    }}
                    disabled={filterCount === 0}
                  >
                    Reset All
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reconnection Confirmation Modal */}
      {showReconnectModal && (
        <div className="filter-connection-modal-overlay" onClick={() => setShowReconnectModal(false)}>
          <div className="filter-connection-modal" onClick={(e) => e.stopPropagation()}>
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
    </section>
  );
};

export default ResponseConcentrationSection;