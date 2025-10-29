import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { DataPoint } from '@/types/base';
import { Settings, Filter, Menu, Link2, Link2Off } from 'lucide-react';
import { scaleLinear } from 'd3-scale';
import FilterPanel from '../../../visualization/filters/FilterPanel';
import PremiumFeature from '../../../ui/PremiumFeature';
import { ColorPalette } from '../../../ui/ColorPalette';
import { UnifiedFilterTabPanel, FilterTabConfig } from '../../../ui/UnifiedFilterTabPanel';
import { FilterConnectionToggle } from '../../../ui/FilterConnectionToggle';
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
  const [selectedBar] = useState<number | null>(null);
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
  }, [filterContext, REPORT_ID, filterContext?.reportFilterStates?.[REPORT_ID], filterContext?.filterState]);
  
  
  // Get effective filtered data (uses report filters when connected/disconnected)
  const effectiveData = useMemo(() => {
    if (!originalData || !filterContext) return originalData || [];
    
    // Use report filter system to get filtered data
    return filterContext.getReportFilteredData(REPORT_ID, originalData);
  }, [originalData, filterContext, REPORT_ID, filterContext?.reportConnections?.[REPORT_ID], filterContext?.reportFilterStates?.[REPORT_ID]]);
  
  // Calculate filtered bar chart data from effectiveData
  // This recreates the distribution based on filtered data points
  const filteredBarChartData = useMemo(() => {
    if (!originalData || !effectiveData || !chartId) return data;
    
    // Determine which field to aggregate by (satisfaction or loyalty)
    const field = chartId === 'satisfaction' ? 'satisfaction' : 'loyalty';
    
    // Find max value from original data to maintain scale
    const maxValue = Math.max(...data.map(d => d.value), 1);
    
    // Count occurrences of each value in filtered data
    const distribution: Record<number, number> = {};
    effectiveData.forEach(point => {
      const value = (point as any)[field];
      if (value !== undefined && value !== null) {
        distribution[value] = (distribution[value] || 0) + 1;
      }
    });
    
    // Transform to BarChartData format matching the original data structure
    return Array.from({ length: maxValue }, (_, i) => ({
      value: i + 1,
      count: distribution[i + 1] || 0
    }));
  }, [effectiveData, data, chartId, originalData]);
  
  // Use filtered data if available, otherwise fall back to original data
  const displayData = filteredBarChartData;
  
  const panelRef = useRef<HTMLDivElement>(null);
  const cogwheelRef = useRef<HTMLButtonElement>(null);
  
  // Handle click outside for bar selection clearing (panel closing handled by UnifiedFilterTabPanel)
const handleClickOutside = useCallback((event: MouseEvent) => {
  const targetElement = event.target as HTMLElement;
  const isBarClick = targetElement.closest('.bar-chart-bar');
    const isPanelClick = targetElement.closest('.unified-filter-tab-panel');
  const isControlButtonClick = cogwheelRef.current?.contains(targetElement);
  
  // Clear selection only if clicking outside bars and panel
    if (!isBarClick && !isPanelClick && !isControlButtonClick) {
    setSelectedBars(new Set());
    setApplyToAll(false);
  }
  }, []);
  
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
    console.log("Filter change triggered", newFilters);
    
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
  
  // Notification tracking useEffect
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
    
    // Skip if states haven't actually changed
    if (prevIsConnected.current === isConnected) {
      return;
    }
    
    // Create a stable identifier for this specific state change
    const stateChangeId = `${prevIsConnected.current}_${isConnected}`;
    
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
    const shouldShowDisconnect = (
      prevIsConnected.current === true && 
      isConnected === false && 
      !isShowingNotification.current &&
      (now - lastNotificationTime.current) > NOTIFICATION_DEBOUNCE_MS &&
      lastNotificationType.current !== 'disconnected'
    );
    
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
  }, [isConnected, isManualReconnecting]); // Removed filterContext and showNotification - accessed via closure to prevent unnecessary re-runs

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

  const scaleMarkers = yScale.ticks(5)
    .map(value => ({
      value,
      position: yScale(value)
    }));

  const areAllBarsSelected = () => {
    return selectedBars.size === displayData.length;
  };

  const handleBarClick = (value: number, event: React.MouseEvent) => {
    if (!interactive) return;
  
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
    
    setSelectedBars(newSelection);
    
    // Auto-open contextual menu when bars are selected (but not when deselecting all)
    if (newSelection.size > 0) {
      setShowSidePanel(true);
      setActivePanelTab('settings');
    }
  };
  
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
          {selectedBars.size > 0 && (
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
          )}

          <div className="settings-group">
            <div className="settings-title">Bar Colours</div>
            {isPremium ? (
              <>
                <ColorPalette
                  selectedColor={customColors[selectedBar || 0]}
                  onColorSelect={(color: string) => {
                    if (selectedBars.size === 0) return;
                    selectedBars.forEach(barValue => {
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
                    if (value.length === 6) {
                      onColorChange?.(selectedBar || 0, '#' + value);
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
              </>
            ) : (
              <div className="premium-feature-placeholder">
                <div className="premium-placeholder-content">
                  <div className="premium-placeholder-title-row">
                    <span className="premium-placeholder-title">Premium Feature</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="12" 
                      height="12" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="lucide lucide-crown-icon lucide-crown premium-crown"
                    >
                      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/>
                      <path d="M5 21h14"/>
                    </svg>
                  </div>
                  <div className="premium-placeholder-description">
                    Customise bar colours to match your brand
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
  );
  
  // Render Filters Tab Content
  const renderFiltersTab = () => (
    <PremiumFeature isPremium={isPremium} featureType="filtering">
      <div className="unified-tab-content">
        {/* Connection Toggle Header - show if has context */}
        {filterContext && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <FilterConnectionToggle
              reportId={REPORT_ID}
              isConnected={isConnected}
              onToggle={handleConnectionToggle}
              hasLocalChanges={hasLocalChanges}
            />
          </div>
        )}
        
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
            disabled={!activeFilters || activeFilters.length === 0}
          >
            Reset All
          </button>
    </div>
      </div>
    </PremiumFeature>
  );
  
  // Prepare tabs configuration
  const tabs: FilterTabConfig[] = [
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={16} />
    },
    {
      id: 'filters',
      label: 'Filters',
      icon: <Filter size={16} />,
      badge: activeFilters && activeFilters.length > 0 ? activeFilters.length : undefined
      // Premium check is now in renderFiltersTab content, not on tab button
    }
  ];
  
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


      {/* Unified Filter Tab Panel */}
      <UnifiedFilterTabPanel
        isOpen={showSidePanel}
        onClose={() => setShowSidePanel(false)}
        tabs={tabs}
        activeTab={activePanelTab}
        onTabChange={(tabId) => {
          setActivePanelTab(tabId as 'settings' | 'filters');
          if (tabId === 'filters') {
            setLastTabClicked('filters');
          }
        }}
        tabContent={tabContent}
        panelRef={panelRef}
        isPremium={isPremium}
      />
      
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
                      backgroundColor: customColors[value] || '#3a863e'
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
    </div>
  );
};

export default BarChart;