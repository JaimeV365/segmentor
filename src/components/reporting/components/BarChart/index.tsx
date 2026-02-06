import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { DataPoint } from '@/types/base';
import { Settings, Filter, Menu, Link2, Link2Off, X } from 'lucide-react';
import { scaleLinear } from 'd3-scale';
import FilterPanel from '../../../visualization/filters/FilterPanel';
import PremiumFeature from '../../../ui/PremiumFeature';
import { ColorPalette } from '../../../ui/ColorPalette';
import { useFilterContextSafe } from '../../../visualization/context/FilterContext';
import { useNotification } from '../../../data-entry/hooks/useNotification';
import { ReportFilter } from '../../filters/ReportFilterPanel';
import './styles.css';

export interface BarChartData {
  value: number;
  count: number;
}

interface BarChartProps {
  data: BarChartData[];
  showGrid?: boolean;
  showLabels?: boolean;
  interactive?: boolean;
  customColors?: Record<number, string>;
  onColorChange?: (value: number, color: string) => void;
  onGridChange?: (showGrid: boolean) => void;
  className?: string;
  chartType?: 'bar' | 'mini';
  chartId?: string;
  title?: string;
  showLegend?: boolean;
  // Props for filtering
  originalData?: DataPoint[]; // Original data for filtering
  onFilterChange?: (filters: ReportFilter[]) => void;
  activeFilters?: ReportFilter[];
  isPremium?: boolean;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  showGrid = true,
  showLabels = true,
  interactive = false,
  customColors = {},
  onColorChange,
  onGridChange,
  className = '',
  chartId = '',
  title,
  showLegend = true,
  chartType = 'bar',
  originalData,
  onFilterChange,
  activeFilters = [],
  isPremium = false
}) => {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [showValues, setShowValues] = useState(true);
  const [internalShowGrid, setInternalShowGrid] = useState(showGrid);
  const [customHexInput, setCustomHexInput] = useState('');
  const [applyToAll, setApplyToAll] = useState(false);
  const [showChartLegend, setShowChartLegend] = useState(showLegend);
  const [selectedBars, setSelectedBars] = useState<Set<number>>(new Set());
  const [lastTabClicked, setLastTabClicked] = useState<string | null>(null);
  const [filterResetTrigger, setFilterResetTrigger] = useState(0);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [isManualReconnecting, setIsManualReconnecting] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  // Store filtered data from FilterPanel when report filters are applied
  const [filteredDataFromPanel, setFilteredDataFromPanel] = useState<DataPoint[] | null>(null);
  
  // Unified panel state
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<'settings' | 'filters'>('settings');
  
  // Filter context for connection system
  const filterContext = useFilterContextSafe();
const { showNotification } = useNotification();

  // Create unique REPORT_ID based on chartId to ensure each chart has its own filter state
  // This prevents duplicate notifications when multiple charts share filter state
  const REPORT_ID = useMemo(() => `barChart_${chartId || 'default'}`, [chartId]);

  // Initialize report filter state on mount - sync to main filters
  // This ensures report state exists and matches main state (connected by default)
  useLayoutEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[REPORT_ID]) {
      console.log('🔌 [BarChart] LAYOUT EFFECT INIT: Syncing report state to main state');
      filterContext.syncReportToMaster(REPORT_ID);
    }
  }, [filterContext, REPORT_ID]);
  
  // Backup initialization check (runs after first render)
useEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[REPORT_ID]) {
      console.log('🔌 [BarChart] Backup init: Syncing report state to main state');
      filterContext.syncReportToMaster(REPORT_ID);
    }
  }, [filterContext, REPORT_ID]);

  // Close bar chart panel when main unified controls panel opens
  useEffect(() => {
    const checkMainPanel = () => {
      // Check if main unified controls panel is open (not inside bar chart)
      const mainPanel = document.querySelector('.unified-controls-panel');
      if (mainPanel && !mainPanel.closest('.bar-chart-container')) {
        // Main panel is open, close bar chart panel
        if (showSidePanel) {
          setShowSidePanel(false);
        }
      }
    };

    // Check periodically and on mutations
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
  
  // Derive connection status by comparing filter states
  // Connected = report state matches main state (or no report state exists yet)
  const isConnected = useMemo(() => {
    if (!filterContext) {
      console.log('🔌 [BarChart] No filterContext, defaulting to connected');
      return true; // Default to connected if no context
    }
    
    const reportState = filterContext.reportFilterStates[REPORT_ID];
    const mainState = filterContext.filterState;
    
    // If no report state exists yet, consider connected (will sync from main)
    if (!reportState) {
      console.log('🔌 [BarChart] No report state exists, defaulting to connected');
      return true;
    }
    
    // Compare report state with main state
    const connected = filterContext.compareFilterStates(reportState, mainState);
    console.log('🔌 [BarChart] isConnected calculated from state comparison:', {
      REPORT_ID,
      connected,
      reportState,
      mainState
    });
    
    return connected;
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
      console.log(`🔌 [BarChart] Report reconnected - clearing filteredDataFromPanel and using main filteredData`);
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
      console.log(`🔌 [BarChart] Using filtered data from FilterPanel (disconnected):`, {
        filteredDataLength: filteredDataFromPanel.length,
        originalDataLength: originalData.length
      });
      return filteredDataFromPanel;
    }
    
    // Otherwise, use report filter system to get filtered data
    return filterContext.getReportFilteredData(REPORT_ID, originalData);
  }, [originalData, filterContext, REPORT_ID, filterContext?.reportFilterStates?.[REPORT_ID], filterContext?.filterState, filteredDataFromPanel, isConnected]);
  
  // Calculate filtered bar chart data from effectiveData
  // This recreates the distribution based on filtered data points
  const filteredBarChartData = useMemo(() => {
    if (!originalData || !effectiveData || !chartId) return data;
    
    // Determine which field to aggregate by (satisfaction or loyalty)
    const field = chartId === 'satisfaction' ? 'satisfaction' : 'loyalty';
    
    // Find min and max values from original data to maintain scale
    // Use the actual min/max from the data, not a default
    const values = data.map(d => d.value);
    if (values.length === 0) return data; // Safety check
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    
    // Count occurrences of each value in filtered data
    const distribution: Record<number, number> = {};
    effectiveData.forEach(point => {
      const value = (point as any)[field];
      if (value !== undefined && value !== null) {
        distribution[value] = (distribution[value] || 0) + 1;
      }
    });
    
    // For satisfaction, handle decimals; for loyalty, use integers only
    if (field === 'satisfaction') {
      // Check if there are any decimal values
      const distributionKeys = Object.keys(distribution).map(Number);
      const hasDecimals = distributionKeys.some(key => !Number.isInteger(key));
      
      if (hasDecimals) {
        // Create bars for all values that exist (integers + decimals)
        const valuesToShow = new Set<number>();
        
        // Always include all integers in the scale range
        for (let i = minValue; i <= maxValue; i++) {
          valuesToShow.add(i);
        }
        
        // Add any decimal values that have data
        distributionKeys.forEach(key => {
          if (key >= minValue && key <= maxValue) {
            valuesToShow.add(key);
          }
        });
        
        // Sort and create bars
        const sortedValues = Array.from(valuesToShow).sort((a, b) => a - b);
        
        return sortedValues.map(value => ({
          value: value,
          count: distribution[value] || 0
        }));
      }
    }
    
    // Default: integer bars only (for loyalty or satisfaction without decimals)
    const barCount = maxValue - minValue + 1;
    return Array.from({ length: barCount }, (_, i) => {
      const value = minValue + i;
      return {
        value: value,
        count: distribution[value] || 0
      };
    });
  }, [effectiveData, data, chartId, originalData]);
  
  // Use filtered data if available, otherwise fall back to original data
  const displayData = filteredBarChartData;
  
  const panelRef = useRef<HTMLDivElement>(null);
  const cogwheelRef = useRef<HTMLButtonElement>(null);
  
  // Function to close other bar chart panels when this one opens
  const closeOtherBarChartPanels = useCallback((currentChartId: string) => {
    // Dispatch event to close other panels
    const closeEvent = new CustomEvent('closeBarChartPanel', { 
      detail: { exceptChartId: currentChartId } 
    });
    document.dispatchEvent(closeEvent);
    
    // Also close Response Concentration panel when opening BarChart panel
    const closeResponseEvent = new CustomEvent('closeResponseConcentrationPanel', { 
      detail: {} 
    });
    document.dispatchEvent(closeResponseEvent);
  }, []);
  
  // Handle click outside for bar selection clearing (panel closing handled by UnifiedFilterTabPanel)
const handleClickOutside = useCallback((event: MouseEvent) => {
  const targetElement = event.target as HTMLElement;
  // Check if click is within THIS chart's container (using chartId)
  const isThisChartClick = targetElement.closest(`[data-chart-id="${chartId}"]`);
  const isBarClick = targetElement.closest('.bar-chart-bar');
  // Check if click is within THIS chart's panel (not another chart's panel)
  const isThisChartPanel = panelRef.current?.contains(targetElement);
  // Check if click is within ANY chart panel (to prevent cross-chart interference)
  const isAnyChartPanel = targetElement.closest('.unified-controls-panel');
  // Check if click is on color palette buttons (they should not clear selection)
  const isColorPaletteClick = targetElement.closest('.color-palette') || targetElement.closest('.color-swatch');
  const isControlButtonClick = cogwheelRef.current?.contains(targetElement);
  
  // Only clear selection if clicking outside THIS chart's bars, panel, container, and color palette
  // AND not clicking on any other chart's panel (to allow both charts to have selections)
  if (!isBarClick && !isThisChartPanel && !isControlButtonClick && !isThisChartClick && !isAnyChartPanel && !isColorPaletteClick) {
    console.log(`[BarChart ${chartId}] Clearing selection - click outside chart (not in any panel or color palette)`);
    setSelectedBars(new Set());
    setApplyToAll(false);
  }
  }, [chartId]);
  
useEffect(() => {
  document.addEventListener('mouseup', handleClickOutside);
  return () => {
    document.removeEventListener('mouseup', handleClickOutside);
  };
}, [handleClickOutside]);

useEffect(() => {
  console.log("Panel state changed:", { showSidePanel, activePanelTab, lastTabClicked });
}, [showSidePanel, activePanelTab, lastTabClicked]);

useEffect(() => {
  const logAllClicks = (e: MouseEvent) => {
    console.log("Document click:", e.target);
  };
  
  document.body.addEventListener('click', logAllClicks, true);
  
  return () => {
    document.body.removeEventListener('click', logAllClicks, true);
  };
}, []);

  // Handle filter changes
  // Connection status is now derived from state comparison, so we detect changes here
  const handleFilterChange = useCallback((filteredData: DataPoint[], newFilters: any[], filterState?: any) => {
    console.log("Filter change triggered", newFilters, {
      filteredDataLength: filteredData.length,
      originalDataLength: originalData?.length
    });
    
    // CRITICAL: Store filtered data from FilterPanel for disconnected reports with segment filters
    // This ensures we use the correctly filtered data instead of getReportFilteredData which can't handle segments
    setFilteredDataFromPanel(filteredData);
    
    if (!filterContext || !filterState || isManualReconnecting) {
      // Notify parent component
      if (onFilterChange) {
        onFilterChange(newFilters);
      }
      return;
    }
    
    // Check if we were connected before this change
    const reportStateBefore = filterContext.reportFilterStates[REPORT_ID];
    const wasConnected = reportStateBefore 
      ? filterContext.compareFilterStates(reportStateBefore, filterContext.filterState)
      : true; // Default to connected if no state exists
    
    // After setReportFilterState is called (in FilterPanel), the state will be updated
    // We use a useEffect to detect the connection status change after the state update
    
    // Track local changes
    setHasLocalChanges(true);
    
    // Notify parent component
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  }, [isManualReconnecting, onFilterChange, filterContext, REPORT_ID]);
  
  // Track connection status changes for notifications
  const prevIsConnected = useRef<boolean | undefined>(undefined);
  const lastNotificationTime = useRef<number>(0);
  const lastNotificationType = useRef<'connected' | 'disconnected' | null>(null);
  const notificationShownForState = useRef<string | null>(null); // Track exact state change that triggered notification
  const isShowingNotification = useRef<boolean>(false); // Prevent concurrent notification calls
  const notificationPending = useRef<boolean>(false); // Track if notification is in the process of being shown
  const NOTIFICATION_DEBOUNCE_MS = 2000; // Increased to 2 seconds to prevent duplicates
  
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
      // Use the actual state transition ID to prevent useEffect from showing duplicate
      // When manually reconnecting, isConnected is currently false, will become true
      const currentStateId = `${isConnected}_true`; // false_true when reconnecting
      notificationShownForState.current = currentStateId; // Mark this state change IMMEDIATELY
      
      console.log(`🔔 [BarChart] Manual reconnect - setting notification tracking for: ${currentStateId}`);
      
      filterContext.syncReportToMaster(REPORT_ID);
      setHasLocalChanges(false);
      
      // Show notification (green/success)
      console.log(`🔔 [BarChart] Manual reconnect - showing notification`);
      showNotification({
        title: 'Filters Connected',
        message: 'Bar chart filters are now connected to the main chart.',
        type: 'success',
        icon: <Link2 size={18} style={{ color: '#166534' }} />
      });
      
      // Reset flag after a delay - but keep notification type set longer to prevent duplicate
      setTimeout(() => {
        setIsManualReconnecting(false);
        isShowingNotification.current = false;
        // Keep notification type set for a bit longer to prevent useEffect from triggering
        setTimeout(() => {
          lastNotificationType.current = null;
          notificationShownForState.current = null;
        }, NOTIFICATION_DEBOUNCE_MS);
      }, 100);
    } else {
      // Disconnecting - user wants to make independent changes
      // This is handled automatically when user makes changes (states will differ)
      // Don't show notification here - it will be shown by the useEffect watching isConnected
    }
  }, [filterContext, REPORT_ID, showNotification]);
  
  // Track if we're still in the initial setup phase (first few seconds after mount)
  const initialSetupPhaseRef = useRef<boolean>(true);
  const mountTimeRef = useRef<number>(Date.now());
  
  // Notification tracking useEffect
  // Initialize prevIsConnected to match initial isConnected value to prevent false transitions
  // Use useLayoutEffect to ensure this runs synchronously BEFORE the notification effect
  useLayoutEffect(() => {
    if (prevIsConnected.current === undefined && filterContext) {
      prevIsConnected.current = isConnected;
      console.log(`🔔 [BarChart] Initializing prevIsConnected to ${isConnected} for ${REPORT_ID}`);
    }
    
    // End initial setup phase after 3 seconds or when report state is stable
    const timeSinceMount = Date.now() - mountTimeRef.current;
    if (initialSetupPhaseRef.current && (timeSinceMount > 3000 || filterContext?.reportFilterStates[REPORT_ID])) {
      // Give it a bit more time for sync operations to complete
      setTimeout(() => {
        initialSetupPhaseRef.current = false;
        console.log(`🔔 [BarChart] Initial setup phase ended for ${REPORT_ID}`);
      }, 1000);
    }
  }, [filterContext, isConnected, REPORT_ID]);

  // Only handles automatic DISCONNECT (user makes changes while connected)
  // Manual RECONNECT is handled by handleConnectionToggle (no notification from useEffect)
  // Initial sync on mount is silent (no notification)
  useEffect(() => {
    if (!filterContext) return;
    
    // Skip entirely if this is a manual reconnect
    // Manual reconnect handles its own notification in handleConnectionToggle
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
    
    // CRITICAL: Check if we've already shown notification for this exact state change
    // This MUST be checked BEFORE any other logic to prevent race conditions
    const alreadyNotified = notificationShownForState.current === stateChangeId;
    const isCurrentlyShowing = isShowingNotification.current;
    const isPending = notificationPending.current;
    
    if (alreadyNotified || isCurrentlyShowing || isPending) {
      console.log(`🔔 [BarChart] DUPLICATE PREVENTED: Already shown notification for ${stateChangeId} (alreadyNotified: ${alreadyNotified}, isCurrentlyShowing: ${isCurrentlyShowing}, isPending: ${isPending})`);
      prevIsConnected.current = isConnected;
      return;
    }
    
    const reportState = filterContext.reportFilterStates[REPORT_ID];
    const mainState = filterContext.filterState;
    const now = Date.now();
    
    // ONLY automatic disconnect: connected -> disconnected
    // This happens when user makes changes in bar chart filters while connected
    // BUT NOT when main filters are syncing to reports OR during initial setup phase
    const shouldShowDisconnect = (
      prevIsConnected.current === true && 
      isConnected === false && 
      !isShowingNotification.current &&
      !filterContext.isSyncingFromMain && // Don't show notification during main filter sync
      !initialSetupPhaseRef.current && // Don't show notification during initial setup phase
      (now - lastNotificationTime.current) > NOTIFICATION_DEBOUNCE_MS &&
      lastNotificationType.current !== 'disconnected'
    );
    
    console.log('🔔 [BarChart] Disconnect check:', {
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
        // CRITICAL: Set ALL flags IMMEDIATELY and SYNCHRONOUSLY before showing notification
        // This MUST happen before any async operations to prevent race conditions
        notificationPending.current = true; // Mark as pending FIRST
        notificationShownForState.current = stateChangeId; // Mark this state change as notified
        isShowingNotification.current = true;
        lastNotificationTime.current = now;
        lastNotificationType.current = 'disconnected';
        
        console.log(`🔔 [BarChart] Showing DISCONNECT notification for state change: ${stateChangeId}`);
        showNotification({
          title: 'Filters Disconnected',
          message: 'Bar chart filters are now independent from the main chart.',
          type: 'success',
          icon: <Link2Off size={18} style={{ color: '#166534' }} />
        });
        
        // Reset flags after showing notification
        setTimeout(() => {
          isShowingNotification.current = false;
          notificationPending.current = false;
        }, 500); // Increased timeout to ensure flags stay set longer
      }
    }
    
    // NO automatic connect logic - reconnection is only manual via handleConnectionToggle
    // Initial sync on mount is silent (no notification)
    
    prevIsConnected.current = isConnected;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, isManualReconnecting, REPORT_ID]); // Added REPORT_ID to dependency array

  useEffect(() => {
    setInternalShowGrid(showGrid);
  }, [showGrid]);

  useEffect(() => {
    // Update applyToAll based on whether all bars are selected
    setApplyToAll(areAllBarsSelected());
  }, [selectedBars, displayData.length]);

  const getNiceScale = (maxValue: number): number[] => {
    // Round up maxValue to next nice number
    let step: number;
    let niceMax: number;
    
    if (maxValue <= 5) {
      step = 1;
      niceMax = Math.ceil(maxValue);
    } else if (maxValue <= 20) {
      step = 5;
      niceMax = Math.ceil(maxValue / 5) * 5;
    } else if (maxValue <= 100) {
      step = 10;
      niceMax = Math.ceil(maxValue / 10) * 10;
    } else {
      step = 20;
      niceMax = Math.ceil(maxValue / 20) * 20;
    }
  
    // Create array from 0 to niceMax by step
    return Array.from(
      { length: (niceMax / step) + 1 }, 
      (_, i) => i * step
    );
  };
  
  const maxCount = Math.max(...displayData.map(d => d.count), 1);
  const yScale = scaleLinear()
    .domain([0, maxCount])
    .nice()
    .range([0, 100]);

  // Generate integer-only ticks for the Y-axis (counts must be whole numbers)
  const scaleMarkers = (() => {
    const ticks = yScale.ticks(5);
    // Filter to only include integers
    const integerTicks = ticks.filter(t => Number.isInteger(t));
    
    // If we ended up with no ticks or just 0, create sensible integer ticks
    if (integerTicks.length <= 1) {
      const niceMax = Math.ceil(maxCount);
      if (niceMax <= 5) {
        // For small counts, show 0 to niceMax
        return Array.from({ length: niceMax + 1 }, (_, i) => ({
          value: i,
          position: yScale(i)
        }));
      } else {
        // For larger counts, show evenly spaced integers
        const step = Math.ceil(niceMax / 5);
        const tickValues = [];
        for (let i = 0; i <= niceMax; i += step) {
          tickValues.push(i);
        }
        if (tickValues[tickValues.length - 1] !== niceMax) {
          tickValues.push(niceMax);
        }
        return tickValues.map(value => ({
          value,
          position: yScale(value)
        }));
      }
    }
    
    return integerTicks.map(value => ({
      value,
      position: yScale(value)
    }));
  })();

  const areAllBarsSelected = () => {
    return selectedBars.size === displayData.length;
  };

  const handleBarClick = (value: number, event: React.MouseEvent) => {
    console.log(`[BarChart ${chartId}] handleBarClick called - value:`, value, 'interactive:', interactive);
    if (!interactive) {
      console.log(`[BarChart ${chartId}] Bar click ignored - not interactive`);
      return;
    }
  
    let newSelection: Set<number>;
    
    if (event.ctrlKey) {
      // Multi-selection with Ctrl key
      newSelection = new Set(selectedBars);
      if (newSelection.has(value)) {
        newSelection.delete(value);
      } else {
        newSelection.add(value);
      }
    } else {
      // Single selection/deselection
      if (selectedBars.has(value) && selectedBars.size === 1) {
        newSelection = new Set();
      } else {
        newSelection = new Set([value]);
      }
    }
    
    console.log(`[BarChart ${chartId}] Setting selectedBars to:`, Array.from(newSelection));
    setSelectedBars(newSelection);
    
    // Auto-open contextual menu when bars are selected (but not when deselecting all)
    if (newSelection.size > 0) {
      console.log(`[BarChart ${chartId}] Opening side panel with ${newSelection.size} selected bars`);
      // Close other bar chart panels first
      closeOtherBarChartPanels(chartId);
      setShowSidePanel(true);
      setActivePanelTab('settings');
    }
  };
  
  // Listen for close events from other charts and Response Concentration
  useEffect(() => {
    const handleCloseBarChartEvent = (event: CustomEvent) => {
      const exceptChartId = event.detail?.exceptChartId;
      // If exceptChartId is null, close all charts (called from Response Concentration)
      // If exceptChartId is set but doesn't match this chart, close this one
      if ((exceptChartId === null || (exceptChartId && exceptChartId !== chartId)) && showSidePanel) {
        console.log(`[BarChart ${chartId}] Closing panel - another panel opened`);
        setShowSidePanel(false);
      }
    };
    
    const handleCloseResponseConcentrationEvent = () => {
      // Close this panel when Response Concentration panel opens
      if (showSidePanel) {
        console.log(`[BarChart ${chartId}] Closing panel - Response Concentration opened`);
        setShowSidePanel(false);
      }
    };
    
    document.addEventListener('closeBarChartPanel', handleCloseBarChartEvent as EventListener);
    document.addEventListener('closeResponseConcentrationPanel', handleCloseResponseConcentrationEvent as EventListener);
    return () => {
      document.removeEventListener('closeBarChartPanel', handleCloseBarChartEvent as EventListener);
      document.removeEventListener('closeResponseConcentrationPanel', handleCloseResponseConcentrationEvent as EventListener);
    };
  }, [chartId, showSidePanel]);
  
  // Format operator for display
  const formatOperator = (operator: string): string => {
    switch (operator) {
      case 'equals': return '=';
      case 'notEquals': return '≠';
      case 'contains': return 'contains';
      case 'greaterThan': return '>';
      case 'lessThan': return '<';
      case 'between': return 'between';
      default: return operator;
    }
  };
  
  // Render Settings Tab Content
  const renderSettingsTab = () => (
        <div className="filter-panel-content">
          <div className="settings-group">
            <div className="settings-title">Display Settings</div>
            <div className="settings-option">
              <input
                type="checkbox"
                id={`show-values-${chartId}`}
                checked={showValues}
                onChange={(e) => setShowValues(e.target.checked)}
              />
              <label htmlFor={`show-values-${chartId}`}>
                Show values
              </label>
            </div>
            <div className="settings-option">
              <input
                type="checkbox"
                id={`show-grid-${chartId}`}
                checked={internalShowGrid}
                onChange={(e) => {
                  setInternalShowGrid(e.target.checked);
                  onGridChange?.(e.target.checked);
                }}
              />
              <label htmlFor={`show-grid-${chartId}`}>
                Show grid
              </label>
            </div>
            <div className="settings-option">
              <input
                type="checkbox"
                id={`show-legend-${chartId}`}
                checked={showChartLegend}
                onChange={(e) => setShowChartLegend(e.target.checked)}
              />
              <label htmlFor={`show-legend-${chartId}`}>
                Show legend
              </label>
            </div>
          </div>
          <div className="divider"></div>
          {isPremium && originalData && activeFilters && activeFilters.length > 0 && (
            <>
              <div className="settings-group">
                <div className="settings-title">Active Filters</div>
                <div className="filters-list">
                  {activeFilters.map((filter, index) => (
                    <div key={index} className="filter-item">
                      <span>{filter.field} {formatOperator(filter.operator)} {filter.value}</span>
                    </div>
                  ))}
                  <button
                    className="filter-manage-button"
                    onClick={() => setActivePanelTab('filters')}
                  >
                    Manage Filters
                  </button>
                </div>
              </div>
              <div className="divider"></div>
            </>
          )}
          {/* Selected Bars Analysis - Available to all users */}
          {selectedBars.size > 0 && (() => {
            console.log(`[BarChart ${chartId}] Rendering Selected Bars Analysis - selectedBars.size:`, selectedBars.size);
            return (
              <div className="settings-group">
                <div className="settings-title">Selected Bars Analysis</div>
                <div className="selected-bars-summary">
                  <div className="summary-item">
                    <span className="summary-label">Selected:</span>
                    <span className="summary-value">{selectedBars.size} bar{selectedBars.size > 1 ? 's' : ''}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Total Count:</span>
                    <span className="summary-value">
                      {Array.from(selectedBars).reduce((sum, value) => {
                        const barData = displayData.find(d => d.value === value);
                        return sum + (barData?.count || 0);
                      }, 0)}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Percentage:</span>
                    <span className="summary-value">
                      {((Array.from(selectedBars).reduce((sum, value) => {
                        const barData = displayData.find(d => d.value === value);
                        return sum + (barData?.count || 0);
                      }, 0) / displayData.reduce((sum, d) => sum + d.count, 0)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Values:</span>
                    <span className="summary-value">
                      {Array.from(selectedBars).sort((a, b) => a - b).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {isPremium && (() => {
            console.log('[BarChart] Rendering ColorPalette - isPremium:', isPremium, 'selectedBars.size:', selectedBars.size, 'disabled:', selectedBars.size === 0);
            return (
              <div className="settings-group">
                <div className="settings-title">Bar Colours</div>
                <ColorPalette
                selectedColor={selectedBars.size > 0 ? customColors[Array.from(selectedBars)[0]] : undefined}
                onColorSelect={(color: string) => {
                  console.log('[BarChart] onColorSelect called with color:', color, 'selectedBars:', Array.from(selectedBars));
                  if (selectedBars.size === 0) {
                    console.log('[BarChart] No bars selected, returning early');
                    return;
                  }
                  selectedBars.forEach(barValue => {
                    console.log('[BarChart] Calling onColorChange for bar:', barValue, 'with color:', color);
                    onColorChange?.(barValue, color);
                  });
                  setCustomHexInput(color.replace('#', ''));
                }}
                isPremium={isPremium}
                disabled={selectedBars.size === 0}
                showCustomInput={true}
                customHexValue={customHexInput}
                onCustomHexChange={(value: string) => {
                  setCustomHexInput(value);
                  if (value.length === 6 && selectedBars.size > 0) {
                    selectedBars.forEach(barValue => {
                      onColorChange?.(barValue, '#' + value);
                    });
                  }
                }}
              />
              <div className="settings-option">
                <input
                  type="checkbox"
                  id={`apply-all-${chartId}`}
                  checked={applyToAll}
                  style={{ 
                    cursor: 'pointer',
                    opacity: selectedBars.size === 0 ? 0.5 : 1
                  }}
                  onChange={(e) => {
                    setApplyToAll(e.target.checked);
                    if (e.target.checked) {
                  setSelectedBars(new Set(displayData.map(d => d.value)));
                    } else {
                      setSelectedBars(new Set());
                    }
                  }}
                />
                <label htmlFor={`apply-all-${chartId}`}>
                  Apply to all bars
                </label>
              </div>
              </div>
            );
          })()}
        </div>
  );
  
  // Render Filters Tab Content
  const renderFiltersTab = () => (
    <PremiumFeature isPremium={isPremium} featureType="filtering">
      <div className="unified-tab-content">
        
        <div className="unified-tab-body">
          <FilterPanel
            data={originalData || []}
            onFilterChange={handleFilterChange}
            onClose={() => {
              console.log("Filter panel close triggered");
              setShowSidePanel(false);
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
              // Reset all filters
              setFilterResetTrigger(prev => prev + 1);
              if (onFilterChange) {
                onFilterChange([]);
              }
            }}
            disabled={filterCount === 0}
          >
            Reset All
          </button>
    </div>
      </div>
    </PremiumFeature>
  );
  
  // Prepare tab content
  const tabContent: Record<string, React.ReactNode> = {
    settings: renderSettingsTab(),
    filters: renderFiltersTab()
  };
  
  return (
    <div className={`bar-chart-container ${showChartLegend ? 'show-legend' : ''} ${className}`} data-chart-id={chartId}>
      {showChartLegend && title && (
        <div className="bar-chart-legend">
          <h4 className="bar-chart-title">{title}</h4>
  </div>
)}
      
      {/* Always show hamburger menu - analysis feature */}
      <PremiumFeature isPremium={true} featureType="hamburgerMenu">
        <div className="bar-chart-controls">
          <button
            ref={cogwheelRef}
            className={`bar-chart-control-button ${showSidePanel ? 'active' : ''} ${activeFilters && activeFilters.length > 0 ? 'has-filters' : ''}`}
            onClick={() => {
              const newState = !showSidePanel;
              if (newState) {
                // Close other panels when opening this one
                closeOtherBarChartPanels(chartId);
              }
              setShowSidePanel(newState);
              // Start with filters tab if there are active filters, otherwise settings
              if (newState) {
                setActivePanelTab(activeFilters && activeFilters.length > 0 ? 'filters' : 'settings');
              }
            }}
            title="Chart settings and filters"
          >
            <Menu size={22} />
            {activeFilters && activeFilters.length > 0 && (
              <span className="filter-badge small">{activeFilters.length}</span>
            )}
          </button>
        </div>
      </PremiumFeature>


      {/* Side Panel with Tabs */}
      {showSidePanel && (
        <div className="unified-controls-panel" ref={panelRef}>
          <div className="unified-controls-header">
            <div className="bar-chart-panel-title">
              {title || `Chart Settings${chartId ? ` - ${chartId.charAt(0).toUpperCase() + chartId.slice(1)}` : ''}`}
            </div>
            <div className="unified-controls-tabs">
              <button 
                className={`unified-tab ${activePanelTab === 'settings' ? 'active' : ''}`}
                onClick={() => {
                  setActivePanelTab('settings');
                }}
              >
                <Settings size={16} />
                Settings
              </button>
              <button 
                className={`unified-tab ${activePanelTab === 'filters' ? 'active' : ''}`}
                onClick={() => {
                  setActivePanelTab('filters');
                  setLastTabClicked('filters');
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
            
            <button className="unified-close-button" onClick={() => setShowSidePanel(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Tab Content */}
          <div className="unified-controls-content">
            {tabContent[activePanelTab]}
          </div>
        </div>
      )}
      
      <div className="bar-chart-wrapper">
        <div className="bar-chart-scale">
          {scaleMarkers.map(marker => (
            <div
              key={marker.value}
              className="bar-chart-scale-marker"
              style={{ 
                '--position': marker.position
              } as React.CSSProperties}
            >
              {marker.value}
            </div>
          ))}
        </div>

        {internalShowGrid && (
          <div className="bar-chart-grid">
            {scaleMarkers.map(marker => (
              <div
                key={marker.value}
                className="bar-chart-grid-line"
                style={{ bottom: `${marker.position}%` }}
              />
            ))}
          </div>
        )}

        <div className="bar-chart-bars">
          {displayData.map(({ value, count }) => {
            const heightPercent = yScale(count);
            const showValueForBar = showValues || hoveredBar === value;
            const barColor = customColors[value] || '#3a863e';
            if (value === 1) { // Log first bar as sample
              console.log('[BarChart] Rendering bar value:', value, 'customColors:', customColors, 'barColor:', barColor);
            }
            
            return (
              <div 
                key={value} 
                className={`bar-chart-bar-container ${showValueForBar ? 'show-value' : ''}`}
              >
                <PremiumFeature isPremium={true} featureType="barSelection">
                  <div
                    className={`bar-chart-bar premium ${
                      selectedBars.has(value) ? 'selected-bar' : ''
                    }`}
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: barColor
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBarClick(value, e);
                    }}
                    onMouseEnter={() => setHoveredBar(value)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {count > 0 && showValues && (
                      <div className="bar-chart-value">
                        {count}
                      </div>
                    )}
                  </div>
                </PremiumFeature>

                {showLabels && (
                  <div className="bar-chart-label">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </div>
                )}

                {hoveredBar === value && count > 0 && (
                  <div className="bar-chart-tooltip">
                    <div className="bar-chart-tooltip-value">
                      Value: {value}
                    </div>
                    <div className="bar-chart-tooltip-count">
                      Count: {count}
                    </div>
                    <div className="bar-chart-tooltip-hint">
                      {selectedBars.size > 0 ? 
                        'Ctrl+Click to select multiple bars' : 
                        'Click to select bar for analysis'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
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

export default BarChart;