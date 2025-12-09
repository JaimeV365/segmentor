import React, { useMemo, useCallback, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { Link2 } from 'lucide-react';
import { useFilterContextSafe } from '../../visualization/context/FilterContext';
import { useNotification } from '../../data-entry/hooks/useNotification';
import { DataPoint } from '@/types/base';
import { ReportFilter } from '../filters/ReportFilterPanel';

interface UseReportFiltersOptions {
  reportId: string;
  originalData?: DataPoint[];
  onFilterChange?: (filters: ReportFilter[]) => void;
}

interface UseReportFiltersReturn {
  // Filter count for badges
  filterCount: number;
  
  // Connection status
  isConnected: boolean;
  
  // Filtered data
  effectiveData: DataPoint[];
  
  // State management
  hasLocalChanges: boolean;
  showReconnectModal: boolean;
  setShowReconnectModal: (show: boolean) => void;
  
  // Filter state
  activeFilters: ReportFilter[];
  setActiveFilters: (filters: ReportFilter[]) => void;
  filteredDataFromPanel: DataPoint[] | null;
  setFilteredDataFromPanel: (data: DataPoint[] | null) => void;
  filterResetTrigger: number;
  
  // Actions
  handleConnectionToggle: (confirmed: boolean) => void;
  handleFilterChange: (filteredData: DataPoint[], newFilters: ReportFilter[], filterState?: any) => void;
  handleFilterReset: () => void;
}

/**
 * Centralized hook for managing report filters with connection/disconnection logic,
 * notifications, and badge counts. Use this hook in any report section that needs filters.
 * 
 * @example
 * ```tsx
 * const {
 *   filterCount,
 *   isConnected,
 *   effectiveData,
 *   handleConnectionToggle,
 *   showReconnectModal,
 *   setShowReconnectModal
 * } = useReportFilters({
 *   reportId: 'proximitySection',
 *   originalData: data,
 *   onFilterChange: handleFilterChange
 * });
 * ```
 */
export const useReportFilters = ({
  reportId,
  originalData,
  onFilterChange
}: UseReportFiltersOptions): UseReportFiltersReturn => {
  const filterContext = useFilterContextSafe();
  const { showNotification } = useNotification();
  
  // State
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [isManualReconnecting, setIsManualReconnecting] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [filteredDataFromPanel, setFilteredDataFromPanel] = useState<DataPoint[] | null>(null);
  const [activeFilters, setActiveFilters] = useState<ReportFilter[]>([]);
  const [filterResetTrigger, setFilterResetTrigger] = useState(0);
  
  // Notification tracking refs (prevent duplicate notifications)
  const prevIsConnected = useRef<boolean | undefined>(undefined);
  const lastNotificationTime = useRef<number>(0);
  const lastNotificationType = useRef<'connected' | 'disconnected' | null>(null);
  const notificationShownForState = useRef<string | null>(null);
  const isShowingNotification = useRef<boolean>(false);
  const notificationPending = useRef<boolean>(false);
  const initialSetupPhaseRef = useRef<boolean>(true);
  const mountTimeRef = useRef<number>(Date.now());
  
  const NOTIFICATION_DEBOUNCE_MS = 2000;
  
  // Initialize report filter state on mount - sync to main filters
  useLayoutEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[reportId]) {
      filterContext.syncReportToMaster(reportId);
    }
  }, [filterContext, reportId]);
  
  // Backup initialization check (runs after first render)
  useEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[reportId]) {
      filterContext.syncReportToMaster(reportId);
    }
  }, [filterContext, reportId]);
  
  // Calculate connection status by comparing filter states
  const isConnected = useMemo(() => {
    if (!filterContext) return true;
    
    const mainState = filterContext.filterState;
    const reportState = filterContext.getReportFilterState(reportId);
    
    // Compare states - if they match, we're connected
    return filterContext.compareFilterStates(mainState, reportState);
  }, [filterContext, reportId, filterContext?.filterState, filterContext?.reportFilterStates?.[reportId]]);
  
  // Calculate filter count using centralized FilterContext method
  const filterCount = useMemo(() => {
    if (!filterContext) return 0;
    
    // Use the centralized method from FilterContext - this is the single source of truth
    const count = isConnected 
      ? filterContext.activeFilterCount 
      : filterContext.getReportActiveFilterCount(reportId);
    
    return count;
  }, [filterContext, isConnected, reportId, filterContext?.activeFilterCount, filterContext?.reportActiveFilterCounts]);
  
  // Initialize prevIsConnected to match initial isConnected value
  useLayoutEffect(() => {
    if (prevIsConnected.current === undefined && filterContext) {
      prevIsConnected.current = isConnected;
      initialSetupPhaseRef.current = true;
      mountTimeRef.current = Date.now();
    }
  }, [filterContext, isConnected]);
  
  // Track connection changes and show notifications (automatic disconnect only)
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
    
    // Skip if connection status hasn't changed
    if (prevIsConnected.current === isConnected) {
      return;
    }
    
    // Skip during initial setup phase (first 2 seconds after mount)
    const timeSinceMount = Date.now() - mountTimeRef.current;
    if (initialSetupPhaseRef.current && timeSinceMount < 2000) {
      prevIsConnected.current = isConnected;
      initialSetupPhaseRef.current = false;
      return;
    }
    
    // Only show notification for automatic disconnection (not manual reconnect)
    if (prevIsConnected.current === true && isConnected === false) {
      // Automatic disconnect - show notification
      const now = Date.now();
      const stateId = `${prevIsConnected.current}_${isConnected}`;
      
      // Debounce: don't show if we just showed a notification
      if (now - lastNotificationTime.current < NOTIFICATION_DEBOUNCE_MS) {
        prevIsConnected.current = isConnected;
        return;
      }
      
      // Don't show duplicate for same state transition
      if (notificationShownForState.current === stateId) {
        prevIsConnected.current = isConnected;
        return;
      }
      
      // Show notification
      notificationShownForState.current = stateId;
      lastNotificationTime.current = now;
      lastNotificationType.current = 'disconnected';
      
      showNotification({
        title: 'Filters Disconnected',
        message: `Report filters have been disconnected from the main chart. You can reconnect anytime.`,
        type: 'info',
        icon: <Link2 size={18} style={{ color: '#6b7280' }} />
      });
    }
    
    prevIsConnected.current = isConnected;
  }, [isConnected, isManualReconnecting, reportId, filterContext, showNotification]);
  
  // Handle connection toggle (reconnection)
  const handleConnectionToggle = useCallback((confirmed: boolean) => {
    if (!filterContext) return;
    
    if (confirmed) {
      // Reconnecting - sync report state to main state
      setIsManualReconnecting(true);
      
      // Set prevIsConnected to true BEFORE syncing to prevent false disconnect notification
      prevIsConnected.current = true;
      
      filterContext.syncReportToMaster(reportId);
      setHasLocalChanges(false);
      setFilteredDataFromPanel(null);
      setActiveFilters([]);
      
      // Show notification (green/success)
      showNotification({
        title: 'Filters Connected',
        message: `Report filters are now connected to the main chart.`,
        type: 'success',
        icon: <Link2 size={18} style={{ color: '#166534' }} />
      });
      
      // Reset flag after a delay
      setTimeout(() => {
        setIsManualReconnecting(false);
      }, 100);
    }
  }, [filterContext, reportId, showNotification]);
  
  // Handle filter changes from FilterPanel
  // FilterPanel signature: (filteredData: DataPoint[], newFilters: ReportFilter[], filterState?: any)
  const handleFilterChange = useCallback((filteredData: DataPoint[], newFilters: ReportFilter[], filterState?: any) => {
    // CRITICAL: Store filtered data from FilterPanel for disconnected reports with segment filters
    // This ensures we use the correctly filtered data instead of getReportFilteredData which can't handle segments
    setFilteredDataFromPanel(filteredData);
    setActiveFilters(newFilters);
    setHasLocalChanges(true);
    
    // If connected, disconnect automatically when filters change
    // This will trigger automatic disconnect notification via useEffect
    // No need to manually disconnect here - the state change will be detected
    
    // Call parent's onFilterChange if provided
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  }, [filterContext, isConnected, onFilterChange]);
  
  // Handle filter reset
  const handleFilterReset = useCallback(() => {
    setFilterResetTrigger(prev => prev + 1);
    setActiveFilters([]);
    setFilteredDataFromPanel(null);
    setHasLocalChanges(false);
    
    if (filterContext) {
      filterContext.setReportFilterState(reportId, {
        dateRange: {
          startDate: null,
          endDate: null,
          preset: 'all'
        },
        attributes: [],
        frequencyThreshold: undefined,
        isActive: false
      });
    }
  }, [filterContext, reportId]);
  
  // Calculate effective data (filtered data)
  const effectiveData = useMemo(() => {
    if (!originalData || !filterContext) return originalData || [];
    
    // If we have locally filtered data from panel, use that
    if (filteredDataFromPanel) {
      return filteredDataFromPanel;
    }
    
    // If connected, use main filtered data
    if (isConnected) {
      return filterContext.filteredData;
    }
    
    // Otherwise, use report filter system to get filtered data
    return filterContext.getReportFilteredData(reportId, originalData);
  }, [originalData, filterContext, reportId, filteredDataFromPanel, isConnected, filterContext?.filteredData, filterContext?.reportFilterStates?.[reportId]]);
  
  return {
    filterCount,
    isConnected,
    effectiveData,
    hasLocalChanges,
    showReconnectModal,
    setShowReconnectModal,
    activeFilters,
    setActiveFilters,
    filteredDataFromPanel,
    setFilteredDataFromPanel,
    filterResetTrigger,
    handleConnectionToggle,
    handleFilterChange,
    handleFilterReset
  };
};

