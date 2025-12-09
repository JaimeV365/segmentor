import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { DataPoint } from '@/types/base';
import { useQuadrantAssignmentSafe } from './UnifiedQuadrantContext';
import { parseDateString } from '../../../utils/dateFilterUtils';

// Filter state interfaces
export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  preset?: string;
}

export interface AttributeFilter {
  field: string;
  values: Set<string | number>;
  availableValues?: Array<{
    value: string | number;
    count: number;
  }>;
  expanded?: boolean;
}

export interface FilterState {
  dateRange: DateRange;
  attributes: AttributeFilter[];
  isActive: boolean;
  // Frequency filter shared across views
  frequencyFilterEnabled?: boolean;
  frequencyThreshold?: number;
}

export interface FilterContextType {
  // Current filter state
  filterState: FilterState;
  
  // Filter actions
  setFilterState: (state: FilterState) => void;
  updateDateRange: (dateRange: Partial<DateRange>) => void;
  updateAttributeFilter: (field: string, values: Set<string | number>) => void;
  updateFrequencySettings: (enabled: boolean, threshold: number) => void;
  resetFilters: () => void;
  
  // Filtered data
  filteredData: DataPoint[];
  setFilteredData: (data: DataPoint[]) => void;
  
  // Active filter count
  activeFilterCount: number;
  setActiveFilterCount: (count: number) => void;
  
  // Data source
  data: DataPoint[];
  setData: (data: DataPoint[]) => void;
  
  // Report filter connection system
  reportFilterStates: Record<string, FilterState>; // e.g., { "barChart": FilterState }
  reportActiveFilterCounts: Record<string, number>; // e.g., { "barChart": 3 }
  // Note: Connection status is derived from state comparison, not stored separately
  
  // Report filter methods
  setReportConnection: (reportId: string, connected: boolean) => void; // Deprecated: use syncReportToMaster instead
  syncReportToMaster: (reportId: string) => void; // Copy main → report
  getReportFilterState: (reportId: string) => FilterState;
  setReportFilterState: (reportId: string, state: FilterState) => void;
  getReportActiveFilterCount: (reportId: string) => number; // Get badge count for a report
  getReportFilteredData: (reportId: string, data: DataPoint[]) => DataPoint[];
  compareFilterStates: (state1: FilterState, state2: FilterState) => boolean; // Compare two filter states
  isSyncingFromMain: boolean; // Flag to prevent false disconnect notifications during sync
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

interface FilterProviderProps {
  children: ReactNode;
  initialData?: DataPoint[];
  data?: DataPoint[]; // Current data that gets updated
  initialFilterState?: FilterState;
  onShowNotification?: (notification: { title: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }) => void;
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ 
  children, 
  initialData = [],
  data: currentData,
  initialFilterState,
  onShowNotification
}) => {
  // CRITICAL: Log FilterProvider initialization
  console.warn('🔄 [FilterContext] FilterProvider INITIALIZED', {
    timestamp: Date.now(),
    initialDataLength: initialData.length,
    currentDataLength: currentData?.length || 0
  });

  const [data, setData] = useState<DataPoint[]>(initialData);
  const [filteredData, setFilteredData] = useState<DataPoint[]>(initialData);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  
  const [filterState, setFilterState] = useState<FilterState>(
    initialFilterState || {
      dateRange: {
        startDate: null,
        endDate: null,
        preset: 'all'
      },
      attributes: [],
      isActive: false,
      frequencyFilterEnabled: false,
      frequencyThreshold: 1
    }
  );

  // Report filter connection system state
  // Note: Connection status is derived from comparing filter states, not stored separately
  const [reportFilterStates, setReportFilterStates] = useState<Record<string, FilterState>>({});
  const [reportActiveFilterCounts, setReportActiveFilterCounts] = useState<Record<string, number>>({});
  
  // Flag to track when main filter changes are syncing to reports
  // This prevents false disconnect notifications during sync
  const [isSyncingFromMain, setIsSyncingFromMain] = useState(false);
  
  // Helper function to calculate active filter count from a filter state
  const calculateActiveFilterCount = useCallback((state: FilterState): number => {
    // CRITICAL: Respect isActive flag - if explicitly false (e.g., after reset), count should be 0
    if (state.isActive === false) {
      return 0;
    }
    
    let count = 0;
    
    // Date range counts as one filter if active (preset must not be 'all')
    if (state.dateRange.preset && 
        state.dateRange.preset !== 'all' && 
        state.dateRange.preset !== 'custom' &&
        (state.dateRange.startDate || state.dateRange.endDate)) {
      count += 1;
    } else if (state.dateRange.preset === 'custom' && 
               (state.dateRange.startDate || state.dateRange.endDate)) {
      // Custom date range is active
      count += 1;
    }
    
    // Count selected attribute values
    state.attributes.forEach(attr => {
      count += attr.values.size;
    });
    
    return count;
  }, []);

  // Note: We can't access quadrantContext here because FilterProvider wraps QuadrantAssignmentProvider
  // Segment filtering will be handled by FilterPanel which has access to quadrantContext
  // This function will only handle segment filtering if a getQuadrantForPoint function is provided
  // via the filter state or if we can access it through a different mechanism
  
  // Try to access quadrant context (may be null if providers aren't in right order)
  const quadrantContext = useQuadrantAssignmentSafe();
  
  // Log quadrant context availability
  console.warn('🔄 [FilterContext] Quadrant context check:', {
    hasQuadrantContext: !!quadrantContext,
    hasMidpoint: !!quadrantContext?.midpoint,
    midpoint: quadrantContext?.midpoint,
    hasGetQuadrantForPoint: !!quadrantContext?.getQuadrantForPoint,
    apostlesZoneSize: quadrantContext?.apostlesZoneSize,
    terroristsZoneSize: quadrantContext?.terroristsZoneSize
  });

  // Apply filters to data with memoization
  const applyFilters = useCallback((dataToFilter: DataPoint[], currentFilterState: FilterState) => {
    console.log('🔄 FilterContext: Applying filters to data...', { 
      dataLength: dataToFilter.length, 
      hasDateFilter: currentFilterState.dateRange.preset !== 'all',
      hasAttributeFilters: currentFilterState.attributes.some(attr => attr.values.size > 0)
    });

    // Create a signature for the filter state to enable memoization
    const filterSignature = JSON.stringify({
      datePreset: currentFilterState.dateRange.preset,
      startDate: currentFilterState.dateRange.startDate?.toISOString(),
      endDate: currentFilterState.dateRange.endDate?.toISOString(),
      attributes: currentFilterState.attributes.map(attr => ({
        field: attr.field,
        values: Array.from(attr.values).sort()
      }))
    });

    // Create a signature for the data
    const dataSignature = dataToFilter.map(item => `${item.id}-${item.excluded}-${item.date}`).join('|');

    // Check if we can use cached result (this is a simple optimization)
    // In a real app, you might want to use a proper memoization library
    let filtered = [...dataToFilter];

    // FIRST: Always exclude items marked as excluded
    filtered = filtered.filter(item => !item.excluded);

    // Apply date filter (works for both presets and custom date ranges)
    const { startDate, endDate, preset } = currentFilterState.dateRange;
    // Apply filter if dates are set (either through preset or custom range)
    // Skip if preset is 'all' and no dates are set
    if ((preset && preset !== 'all') || startDate || endDate) {
      if (startDate || endDate) {
        filtered = filtered.filter(item => {
          if (!item.date) return false;
          
          // Parse the date using the proper parser that handles dd/mm/yyyy format
          const itemDate = parseDateString(item.date);
          if (!itemDate) return false;
          
          // Compare dates (normalize to start of day for accurate comparison)
          const itemDateStart = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
          
          if (startDate) {
            const startDateStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
            if (itemDateStart < startDateStart) return false;
          }
          
          if (endDate) {
            const endDateStart = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            // For endDate, we want to include the entire end date, so compare with <= instead of <
            if (itemDateStart > endDateStart) return false;
          }
          
          return true;
        });
      }
    }

    // Apply frequency filter (by satisfaction-loyalty coordinate grouping)
    if (currentFilterState.frequencyFilterEnabled && (currentFilterState.frequencyThreshold || 1) > 1) {
      const threshold = currentFilterState.frequencyThreshold || 1;
      const groups = new Map<string, number>();
      filtered.forEach(p => {
        const key = `${(p as any).satisfaction}-${(p as any).loyalty}`;
        groups.set(key, (groups.get(key) || 0) + 1);
      });
      filtered = filtered.filter(p => {
        const key = `${(p as any).satisfaction}-${(p as any).loyalty}`;
        return (groups.get(key) || 0) >= threshold;
      });
    }

    // Track items processed for debug logging
    let segmentFilterDebugCount = 0;
    const MAX_DEBUG_ITEMS = 5;
    
    // Apply attribute filters
    currentFilterState.attributes.forEach(attr => {
      if (attr.values.size > 0) {
        // Skip segment filtering in FilterContext if quadrantContext is not available
        // FilterPanel (which has access to quadrantContext) already handles segment filtering
        if (attr.field === 'segment' && !quadrantContext?.getQuadrantForPoint) {
          console.warn(`🔍 [FilterContext] Segment filter: quadrantContext not available - skipping segment filter. FilterPanel should have already filtered by segment.`);
          // Skip this attribute filter - FilterPanel already applied it
          return; // Skip to next attribute
        }
        
        filtered = filtered.filter(item => {
          // Handle computed segment field differently
          let itemValue: any;
          if (attr.field === 'segment') {
            // Segment is a computed field, get it from quadrant context
            if (quadrantContext?.getQuadrantForPoint) {
              itemValue = quadrantContext.getQuadrantForPoint(item);
              
              // Debug logging for first few items
              if (segmentFilterDebugCount < MAX_DEBUG_ITEMS) {
                console.log(`🔍 [FilterContext] Segment filter: Point ${item.id} (${item.satisfaction},${item.loyalty}) -> segment: "${itemValue}"`);
                segmentFilterDebugCount++;
              }
            } else {
              // This shouldn't happen since we checked above, but handle gracefully
              console.error(`🔍 [FilterContext] Segment filter: quadrantContext not available for item ${item.id}`);
              return false;
            }
            
            if (itemValue === undefined || itemValue === null) {
              console.warn(`🔍 [FilterContext] Segment filter: No segment found for point ${item.id}, excluding`);
              // If segment can't be determined, exclude the item
              return false;
            }
          } else {
            // Standard field from data
            itemValue = (item as any)[attr.field];
          }
          
          // Convert both values to strings for comparison to handle type mismatches
          const itemValueStr = String(itemValue);
          const selectedValues = Array.from(attr.values).map(v => String(v));
          const hasMatch = selectedValues.includes(itemValueStr);
          
          // Debug logging for segment filter (first few items only)
          if (attr.field === 'segment' && segmentFilterDebugCount <= MAX_DEBUG_ITEMS) {
            console.log(`🔍 [FilterContext] Segment filter: Comparing "${itemValueStr}" with selected:`, selectedValues, '-> match:', hasMatch);
          }
          
          if (!hasMatch) {
            return false;
          }
          
          return true;
        });
      }
    });

    // Log segment filtering results for debugging
    const segmentFilter = currentFilterState.attributes.find(attr => attr.field === 'segment' && attr.values.size > 0);
    if (segmentFilter) {
      console.log(`🔍 [FilterContext] Segment filter applied:`, {
        selectedSegments: Array.from(segmentFilter.values),
        originalCount: dataToFilter.filter(item => !item.excluded).length,
        filteredCount: filtered.length,
        hasQuadrantContext: !!quadrantContext,
        hasGetQuadrantForPoint: !!quadrantContext?.getQuadrantForPoint
      });
      
      // If filter resulted in 0 items, log sample segments from actual data
      if (filtered.length === 0) {
        const sampleData = dataToFilter.filter(item => !item.excluded).slice(0, 10);
        const sampleSegments = sampleData.map(item => {
          if (quadrantContext?.getQuadrantForPoint) {
            return { id: item.id, segment: quadrantContext.getQuadrantForPoint(item) };
          }
          return { id: item.id, segment: 'unknown' };
        });
        console.warn(`🔍 [FilterContext] Segment filter: No items matched! Sample segments from data:`, sampleSegments);
        console.warn(`🔍 [FilterContext] Selected segments were:`, Array.from(segmentFilter.values));
      }
    }

    console.log('🔄 FilterContext: Filter applied', { 
      originalLength: dataToFilter.length, 
      filteredLength: filtered.length,
      filterSignature: filterSignature.substring(0, 50) + '...'
    });

    return filtered;
  }, [quadrantContext]);

  // Track previous quadrant assignments to detect changes
  const prevQuadrantDepsRef = React.useRef<{
    midpointSat: number | null;
    midpointLoy: number | null;
    apostlesZoneSize: number | null;
    terroristsZoneSize: number | null;
    manualAssignmentsSize: number | null;
  }>({
    midpointSat: null,
    midpointLoy: null,
    apostlesZoneSize: null,
    terroristsZoneSize: null,
    manualAssignmentsSize: null
  });

  // Re-apply segment filters when quadrant assignments change (midpoint moved, zones resized, points reassigned)
  // This MUST be in FilterContext (not FilterPanel) because FilterContext is always mounted,
  // while FilterPanel unmounts when the controls panel is closed
  useEffect(() => {
    // ALWAYS log entry - this is critical
    console.warn('🔄 [FilterContext] useEffect for quadrant changes - ENTRY', {
      timestamp: Date.now(),
      hasQuadrantContext: !!quadrantContext,
      hasMidpoint: !!quadrantContext?.midpoint,
      currentMidpoint: quadrantContext?.midpoint,
      filterStateAttributes: filterState.attributes.map(a => ({ field: a.field, valuesSize: a.values.size }))
    });

    const prevDeps = prevQuadrantDepsRef.current;
    const currentMidpoint = quadrantContext?.midpoint;
    const currentDeps = {
      midpointSat: currentMidpoint?.sat ?? null,
      midpointLoy: currentMidpoint?.loy ?? null,
      apostlesZoneSize: quadrantContext?.apostlesZoneSize ?? null,
      terroristsZoneSize: quadrantContext?.terroristsZoneSize ?? null,
      manualAssignmentsSize: quadrantContext?.manualAssignments?.size ?? null
    };

    console.warn('🔄 [FilterContext] Dependency check:', {
      prevDeps,
      currentDeps,
      midpointChanged: prevDeps.midpointSat !== currentDeps.midpointSat || prevDeps.midpointLoy !== currentDeps.midpointLoy,
      apostlesZoneChanged: prevDeps.apostlesZoneSize !== currentDeps.apostlesZoneSize,
      terroristsZoneChanged: prevDeps.terroristsZoneSize !== currentDeps.terroristsZoneSize,
      manualAssignmentsChanged: prevDeps.manualAssignmentsSize !== currentDeps.manualAssignmentsSize
    });

    // Detect if any quadrant-related dependency changed
    const changed = 
      prevDeps.midpointSat !== currentDeps.midpointSat ||
      prevDeps.midpointLoy !== currentDeps.midpointLoy ||
      prevDeps.apostlesZoneSize !== currentDeps.apostlesZoneSize ||
      prevDeps.terroristsZoneSize !== currentDeps.terroristsZoneSize ||
      prevDeps.manualAssignmentsSize !== currentDeps.manualAssignmentsSize;

    if (!changed) {
      console.warn('🔄 [FilterContext] No quadrant changes detected, skipping');
      prevQuadrantDepsRef.current = currentDeps;
      return;
    }

    // Check if there's an active segment filter
    const hasSegmentFilter = filterState.attributes.some(
      attr => attr.field === 'segment' && attr.values.size > 0
    );

    console.warn('🔄 [FilterContext] Checking segment filter:', {
      hasSegmentFilter,
      hasGetQuadrantForPoint: !!quadrantContext?.getQuadrantForPoint,
      segmentFilterAttributes: filterState.attributes.filter(a => a.field === 'segment').map(a => ({
        field: a.field,
        values: Array.from(a.values),
        valuesSize: a.values.size
      }))
    });

    if (!hasSegmentFilter || !quadrantContext?.getQuadrantForPoint) {
      console.warn('🔄 [FilterContext] EARLY RETURN:', {
        reason: !hasSegmentFilter ? 'No segment filter active' : 'No getQuadrantForPoint function',
        hasSegmentFilter,
        hasGetQuadrantForPoint: !!quadrantContext?.getQuadrantForPoint
      });
      prevQuadrantDepsRef.current = currentDeps;
      return;
    }

    console.warn('🔄 [FilterContext] Quadrant assignments changed, re-applying segment filter', {
      changedDeps: {
        midpointSat: prevDeps.midpointSat !== currentDeps.midpointSat,
        midpointLoy: prevDeps.midpointLoy !== currentDeps.midpointLoy,
        apostlesZoneSize: prevDeps.apostlesZoneSize !== currentDeps.apostlesZoneSize,
        terroristsZoneSize: prevDeps.terroristsZoneSize !== currentDeps.terroristsZoneSize,
        manualAssignmentsSize: prevDeps.manualAssignmentsSize !== currentDeps.manualAssignmentsSize
      },
      currentMidpoint: currentMidpoint,
      selectedSegments: Array.from(
        filterState.attributes.find(attr => attr.field === 'segment')?.values || []
      )
    });

    // STEP 1: Reset to unfiltered state
    const unfilteredData = data.filter(item => !item.excluded);
    setFilteredData(unfilteredData);

    console.warn('🔄 [FilterContext] Reset filteredData to unfiltered state:', {
      unfilteredCount: unfilteredData.length,
      originalCount: data.length
    });

    // STEP 2: Re-apply filters with current state (this will use the new quadrant assignments)
    // The applyFilters function will recalculate segments using getQuadrantForPoint
    const recalculatedFilteredData = applyFilters(unfilteredData, filterState);
    setFilteredData(recalculatedFilteredData);

    console.warn('🔄 [FilterContext] Re-applied segment filter after quadrant change:', {
      filteredCount: recalculatedFilteredData.length,
      originalCount: unfilteredData.length
    });

    prevQuadrantDepsRef.current = currentDeps;
  }, [
    quadrantContext?.midpoint?.sat,
    quadrantContext?.midpoint?.loy,
    quadrantContext?.apostlesZoneSize,
    quadrantContext?.terroristsZoneSize,
    quadrantContext?.manualAssignments,
    filterState,
    data,
    applyFilters
  ]);

  // Update date range
  const updateDateRange = useCallback((dateRangeUpdate: Partial<DateRange>) => {
    // Use handleSetFilterState instead of setFilterState to get sync logic
    const newState = {
      ...filterState,
      dateRange: {
        ...filterState.dateRange,
        ...dateRangeUpdate
      }
    };
    
    // Recalculate isActive based on new date range
    // Always recalculate when date range changes (don't preserve false from previous state)
    // This ensures that when a new preset is selected, isActive is recalculated correctly
    const hasDateFilter = newState.dateRange.preset && newState.dateRange.preset !== 'all' && 
                          (newState.dateRange.startDate !== null || newState.dateRange.endDate !== null);
    const hasAttributeFilters = newState.attributes.some(attr => attr.values.size > 0);
    newState.isActive = hasDateFilter || hasAttributeFilters;
    
    // Automatically recalculate filtered data when date range changes
    const newFilteredData = applyFilters(data, newState);
    setFilteredData(newFilteredData);
    
    // Update active filter count
    // CRITICAL: Respect isActive flag - if explicitly false (e.g., after reset), count should be 0
    let newActiveFilterCount = 0;
    if (newState.isActive !== false) {
      const hasDateFilter = newState.dateRange.preset && newState.dateRange.preset !== 'all';
      const hasAttributeFilters = newState.attributes.some(attr => attr.values.size > 0);
      newActiveFilterCount = (hasDateFilter ? 1 : 0) + newState.attributes.filter(attr => attr.values.size > 0).length;
    }
    setActiveFilterCount(newActiveFilterCount);
    
    // Use handleSetFilterState to get sync logic
    handleSetFilterState(newState);
    // NOTE: handleSetFilterState is not in dependencies because it's declared later
    // and is stable (doesn't change between renders)
  }, [data, applyFilters, filterState]);

  // Update attribute filter
  const updateAttributeFilter = useCallback((field: string, values: Set<string | number>) => {
    // Use handleSetFilterState instead of setFilterState to get sync logic
    const newState = {
      ...filterState,
      attributes: filterState.attributes.map(attr => 
        attr.field === field 
          ? { ...attr, values }
          : attr
      )
    };
    
    // Automatically recalculate filtered data when attribute filter changes
    const newFilteredData = applyFilters(data, newState);
    setFilteredData(newFilteredData);
    
    // Update active filter count
    const hasDateFilter = newState.dateRange.preset && newState.dateRange.preset !== 'all';
    const hasAttributeFilters = newState.attributes.some(attr => attr.values.size > 0);
    const newActiveFilterCount = (hasDateFilter ? 1 : 0) + newState.attributes.filter(attr => attr.values.size > 0).length;
    setActiveFilterCount(newActiveFilterCount);
    
    // Use handleSetFilterState to get sync logic
    handleSetFilterState(newState);
  }, [data, applyFilters, filterState]);

  // Update frequency settings (moved below handleSetFilterState to avoid hoist issues)

  // Reset all filters
  const resetFilters = useCallback(() => {
    const newState = {
      dateRange: {
        startDate: null,
        endDate: null,
        preset: 'all'
      },
      attributes: filterState.attributes.map(attr => ({
        ...attr,
        values: new Set<string | number>()
      })),
      isActive: false
    };
    
    // Set active filter count to 0 (all filters cleared)
    setActiveFilterCount(0);
    
    // Use handleSetFilterState to get sync logic - this prevents false disconnect notifications
    // by syncing connected reports BEFORE updating main state
    // eslint-disable-next-line react-hooks/exhaustive-deps
    handleSetFilterState(newState);
    
    console.log('🔄 FilterContext: Filters reset, showing all data', { 
      dataLength: data.length
    });
  }, [filterState.attributes]);

  // Update data and recalculate using existing filters (do not clear)
  const handleSetData = useCallback((newData: DataPoint[]) => {
    console.log('🔄 FilterContext: Data updated, recalculating with existing filters...', { 
      newDataLength: newData.length,
      currentFilterState: filterState
    });
    
    setData(newData);

    const newFilteredData = applyFilters(newData, filterState);
    setFilteredData(newFilteredData);

    const hasDateFilter = filterState.dateRange.preset && filterState.dateRange.preset !== 'all';
    const newActiveFilterCount = (hasDateFilter ? 1 : 0) + filterState.attributes.filter(attr => attr.values.size > 0).length;
    setActiveFilterCount(newActiveFilterCount);
  }, [filterState, applyFilters]);

  // Watch for changes in currentData prop and update context data
  useEffect(() => {
    if (currentData && (currentData.length !== data.length || 
        currentData.some((item, index) => !data[index] || item.id !== data[index].id || 
        item.satisfaction !== data[index].satisfaction || item.loyalty !== data[index].loyalty ||
        item.excluded !== data[index].excluded))) {
      console.log('🔄 FilterContext: Current data changed, updating context data...', {
        currentDataLength: currentData.length,
        contextDataLength: data.length
      });
      handleSetData(currentData);
    }
  }, [currentData, data, handleSetData]);

  // Listen for explicit clear-filters requests (from delete/exclude actions)
  useEffect(() => {
    const handler = () => {
      // Check if there were active filters before clearing
      const hadActiveFilters = (filterState.dateRange.preset && filterState.dateRange.preset !== 'all') || 
                              filterState.attributes.some(attr => attr.values.size > 0);
      
      resetFilters();
      
      // Only show notification if there were actually active filters
      if (hadActiveFilters && onShowNotification) {
        onShowNotification({
          title: 'Filters Cleared',
          message: 'All filters were cleared due to data deletion/exclusion.',
          type: 'success'
        });
      }
    };
    document.addEventListener('clear-filters-due-to-data-change', handler);
    return () => document.removeEventListener('clear-filters-due-to-data-change', handler);
  }, [resetFilters, onShowNotification, filterState]);

  // Initialize attributes based on data
  useEffect(() => {
    if (data.length > 0) {
      const fields = new Map<string, Set<string | number>>();
      
      // Add standard fields
      fields.set('group', new Set());
      fields.set('satisfaction', new Set());
      fields.set('loyalty', new Set());
      
      // Only process active data (exclude deleted and excluded items)
      const activeData = data.filter(item => !item.excluded);
      
      activeData.forEach(item => {
        // Add group values
        if (item.group) {
          fields.get('group')?.add(item.group);
        }
        
        // Add satisfaction and loyalty values
        if (item.satisfaction) {
          fields.get('satisfaction')?.add(item.satisfaction);
        }
        
        if (item.loyalty) {
          fields.get('loyalty')?.add(item.loyalty);
        }
        
        // Collect unique values for each field
        Object.entries(item).forEach(([key, value]) => {
          if (
            // Skip base fields
            !['id', 'name', 'satisfaction', 'loyalty', 'excluded', 'date', 'dateFormat'].includes(key) &&
            // Skip empty values
            value !== undefined && value !== null && value !== '' &&
            // Skip function values
            typeof value !== 'function'
          ) {
            if (!fields.has(key)) {
              fields.set(key, new Set());
            }
            fields.get(key)?.add(value);
          }
        });
      });
      
      // Convert to array format with counts
      const availableFields = Array.from(fields.entries())
        .map(([field, valuesSet]) => ({
            field,
          counts: Array.from(valuesSet).map(value => ({
              value,
              count: activeData.filter(item => (item as any)[field] === value || ((item as any).additionalAttributes && (item as any).additionalAttributes[field] === value)).length
            }))
        }))
        .sort((a, b) => {
          const priorityFields = ['satisfaction', 'loyalty', 'group', 'name', 'email'];
          const aIndex = priorityFields.indexOf(a.field);
          const bIndex = priorityFields.indexOf(b.field);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.field.localeCompare(b.field);
        });
      
      // Update attributes with new available values
      setFilterState(prev => ({
        ...prev,
        attributes: availableFields.map(field => {
          // Find existing attribute to preserve selected values
          const existingAttr = prev.attributes.find(attr => attr.field === field.field);
          return {
            field: field.field,
            values: existingAttr ? existingAttr.values : new Set(),
            availableValues: field.counts,
            expanded: existingAttr ? existingAttr.expanded : false
          };
        })
      }));
    }
  }, [data]);

  // Helper function to compare two filter states
  /**
   * Compare two filter states to determine if they are equivalent
   * Used to determine connection status - if report state matches main state,
   * the report is considered "connected". Compares date ranges and attributes
   * (order-independent comparison).
   */
  const compareFilterStates = useCallback((state1: FilterState, state2: FilterState): boolean => {
    // Compare dateRange
    const dateRangeMatches = (
      state1.dateRange.preset === state2.dateRange.preset &&
      state1.dateRange.startDate?.getTime() === state2.dateRange.startDate?.getTime() &&
      state1.dateRange.endDate?.getTime() === state2.dateRange.endDate?.getTime()
    );
    // Compare frequency settings
    const freqMatches = (
      (state1.frequencyFilterEnabled || false) === (state2.frequencyFilterEnabled || false) &&
      (state1.frequencyThreshold || 1) === (state2.frequencyThreshold || 1)
    );
    
    // Compare attributes (order-independent, lenient comparison)
    // Create maps for easy lookup
    const state1AttrMap = new Map(state1.attributes.map(a => [a.field, Array.from(a.values).sort()]));
    const state2AttrMap = new Map(state2.attributes.map(a => [a.field, Array.from(a.values).sort()]));
    
    // Get all unique attribute fields from both states
    const allFields = new Set([...state1.attributes.map(a => a.field), ...state2.attributes.map(a => a.field)]);
    
    // Compare only attributes that have values selected OR exist in both states
    // If an attribute exists in one state but not the other AND has no values, ignore it
    const attributesMatch = Array.from(allFields).every(field => {
      const state1Values = state1AttrMap.get(field) || [];
      const state2Values = state2AttrMap.get(field) || [];
      
      // If attribute doesn't exist in one state, it's OK as long as the other has no values
      const existsInState1 = state1AttrMap.has(field);
      const existsInState2 = state2AttrMap.has(field);
      
      if (!existsInState1 && existsInState2) {
        // Only in state2 - OK if state2 has no values
        const match = state2Values.length === 0;
        if (!match) {
          console.log(`🔍 [FilterContext] compareFilterStates: Field "${field}" only in state2 with values:`, state2Values);
        }
        return match;
      }
      if (existsInState1 && !existsInState2) {
        // Only in state1 - OK if state1 has no values
        const match = state1Values.length === 0;
        if (!match) {
          console.log(`🔍 [FilterContext] compareFilterStates: Field "${field}" only in state1 with values:`, state1Values);
        }
        return match;
      }
      
      // Exists in both - values must match
      const match = JSON.stringify(state1Values) === JSON.stringify(state2Values);
      if (!match) {
        console.log(`🔍 [FilterContext] compareFilterStates: Field "${field}" values differ:`, {
          state1Values,
          state2Values
        });
      }
      return match;
    });
    
    const result = dateRangeMatches && freqMatches && attributesMatch;
    if (!result) {
      console.log(`🔍 [FilterContext] compareFilterStates: States don't match:`, {
        dateRangeMatches,
        freqMatches,
        attributesMatch,
        state1AttributeCount: state1.attributes.length,
        state2AttributeCount: state2.attributes.length,
        state1Fields: state1.attributes.map(a => a.field),
        state2Fields: state2.attributes.map(a => a.field)
      });
    }
    
    return result;
  }, []);

  /**
   * Enhanced setFilterState that automatically recalculates filtered data
   * IMPORTANT: Syncs connected reports BEFORE updating main state to prevent
   * false disconnect notifications. Connected reports are those whose filter
   * states match the current main filter state.
   */
  const handleSetFilterState = useCallback((newFilterState: FilterState) => {
    console.log('🔄 FilterContext: Filter state updated, recalculating...', { 
      newFilterState,
      dataLength: data.length
    });
    
    // Check if this filter state includes segment filtering
    const hasSegmentFilter = newFilterState.attributes.some(attr => attr.field === 'segment' && attr.values.size > 0);
    const canHandleSegmentFilter = quadrantContext?.getQuadrantForPoint !== undefined;
    
    // If we have segment filter but can't handle it, skip recalculation
    // FilterPanel will set the filtered data directly via setFilteredData
    if (hasSegmentFilter && !canHandleSegmentFilter) {
      console.log('🔄 FilterContext: Segment filter detected but quadrantContext unavailable - skipping recalculation. FilterPanel will set filteredData directly.');
    }
    
    // Set sync flag to prevent false disconnect notifications
    console.log('🔄 FilterContext: Setting isSyncingFromMain to true');
    setIsSyncingFromMain(true);
    
    // Sync connected reports BEFORE updating main state
    // This prevents the BarChart from seeing a temporary disconnect state
    setReportFilterStates(prevStates => {
      const updatedStates = { ...prevStates };
      
      // Sync all reports whose states match the OLD main state (connected reports)
      Object.keys(prevStates).forEach(reportId => {
        const reportState = prevStates[reportId];
        const isConnected = compareFilterStates(reportState, filterState); // Compare with OLD main state
        
        if (isConnected) {
          // Report is connected - sync to NEW main filters
          updatedStates[reportId] = {
            ...newFilterState,
            dateRange: {
              ...newFilterState.dateRange,
              startDate: newFilterState.dateRange.startDate ? new Date(newFilterState.dateRange.startDate) : null,
              endDate: newFilterState.dateRange.endDate ? new Date(newFilterState.dateRange.endDate) : null
            },
            attributes: newFilterState.attributes.map(attr => ({
              ...attr,
              values: new Set(attr.values)
            }))
          };
        }
      });
      
      return updatedStates;
    });
    
    // Update report filter counts for connected reports (they now match main)
    const mainCount = calculateActiveFilterCount(newFilterState);
    setReportActiveFilterCounts(prevCounts => {
      const updatedCounts = { ...prevCounts };
      
      // Update counts for all connected reports
      Object.keys(reportFilterStates).forEach(reportId => {
        const reportState = reportFilterStates[reportId];
        const isConnected = compareFilterStates(reportState, filterState); // Compare with OLD main state
        
        if (isConnected) {
          updatedCounts[reportId] = mainCount;
        }
      });
      
      return updatedCounts;
    });
    
    // NOW update main state (after syncing reports)
    setFilterState(newFilterState);
    
    // Clear sync flag after a brief delay
    setTimeout(() => {
      console.log('🔄 FilterContext: Setting isSyncingFromMain to false');
      setIsSyncingFromMain(false);
    }, 100);
    
    // Automatically recalculate filtered data UNLESS segment filter is present and we can't handle it
    let newFilteredData: DataPoint[] | undefined;
    if (!hasSegmentFilter || canHandleSegmentFilter) {
      newFilteredData = applyFilters(data, newFilterState);
      setFilteredData(newFilteredData);
    } else {
      console.log('🔄 FilterContext: Skipping filteredData recalculation - FilterPanel will set it directly');
      // Don't recalculate - FilterPanel will set filteredData directly via setFilteredData
    }
    
    // Update active filter count using the same calculation as reports
    // CRITICAL: Use calculateActiveFilterCount for consistency with report filters
    const newActiveFilterCount = calculateActiveFilterCount(newFilterState);
    setActiveFilterCount(newActiveFilterCount);
    
    console.log('🔄 [FilterContext] Main filter count updated:', {
      activeFilterCount: newActiveFilterCount,
      isActive: newFilterState.isActive,
      datePreset: newFilterState.dateRange.preset,
      hasDates: !!(newFilterState.dateRange.startDate || newFilterState.dateRange.endDate),
      attributesWithValues: newFilterState.attributes
        .filter(attr => attr.values.size > 0)
        .map(attr => ({ field: attr.field, count: attr.values.size }))
    });
    
    if (!hasSegmentFilter || canHandleSegmentFilter) {
      console.log('🔄 FilterContext: Filter state update complete', { 
        filteredDataLength: newFilteredData?.length || 0,
        activeFilterCount: newActiveFilterCount
      });
    } else {
      console.log('🔄 FilterContext: Filter state update complete (segment filter - FilterPanel will set filteredData)', { 
        activeFilterCount: newActiveFilterCount
      });
    }
  }, [data, applyFilters, compareFilterStates, filterState, quadrantContext, reportFilterStates, calculateActiveFilterCount]);

  // Report filter connection system methods
  
  /**
   * Sync report filters to main filters (used when reconnecting)
   * Creates a deep copy of the main filter state and assigns it to the report.
   * This makes the report's state match the main state, effectively reconnecting it.
   */
  const syncReportToMaster = useCallback((reportId: string) => {
    console.log(`🔌 [FilterContext] syncReportToMaster called for ${reportId}`);
    // Create deep copy of main filter state
    const mainStateCopy: FilterState = {
      ...filterState,
      dateRange: {
        ...filterState.dateRange,
        startDate: filterState.dateRange.startDate ? new Date(filterState.dateRange.startDate) : null,
        endDate: filterState.dateRange.endDate ? new Date(filterState.dateRange.endDate) : null
      },
      attributes: filterState.attributes.map(attr => ({
        ...attr,
        values: new Set(attr.values)
      }))
    };
    
    setReportFilterStates(prev => {
      console.log(`🔌 [FilterContext] syncReportToMaster updating reportFilterStates for ${reportId}`);
      return {
        ...prev,
        [reportId]: mainStateCopy
      };
    });
    
    // Calculate and store the active filter count for this report (same as main)
    const count = calculateActiveFilterCount(mainStateCopy);
    setReportActiveFilterCounts(prev => ({
      ...prev,
      [reportId]: count
    }));
    
    console.log(`🔌 [FilterContext] syncReportToMaster updated report filter count:`, {
      reportId,
      activeFilterCount: count
    });
  }, [filterState, calculateActiveFilterCount]);
  
  // Set connection status for a report (deprecated - maintained for backward compatibility)
  // Connection is now derived from state comparison, use syncReportToMaster directly instead
  const setReportConnection = useCallback((reportId: string, connected: boolean) => {
    console.warn(`🔌 [FilterContext] setReportConnection is deprecated, use syncReportToMaster instead`);
    if (connected) {
      syncReportToMaster(reportId);
    }
    // Note: Disconnection happens automatically when filter states differ
  }, [syncReportToMaster]);
  
  // Get filter state for a report (returns local state if exists, otherwise main state)
  const getReportFilterState = useCallback((reportId: string): FilterState => {
    // Return local filter state if exists, otherwise return main state (default to connected)
    const localState = reportFilterStates[reportId];
    if (localState) {
      return localState;
    }
    
    // No local state exists - return main state (connected by default)
    return filterState;
  }, [filterState, reportFilterStates]);
  
  /**
   * Set filter state for a report (only updates local state, never touches main)
   * ARCHITECTURAL RULE: This method ONLY updates report local state.
   * It NEVER writes to main filters - this ensures proper separation.
   * Connection status is derived by comparing this state with main filter state,
   * not stored as a separate boolean.
   */
  const setReportFilterState = useCallback((reportId: string, state: FilterState) => {
    console.log(`🔌 [FilterContext] setReportFilterState called:`, {
      reportId,
      state: {
        hasSegmentFilter: state.attributes.some(attr => attr.field === 'segment' && attr.values.size > 0),
        selectedSegments: state.attributes.find(attr => attr.field === 'segment')?.values ? Array.from(state.attributes.find(attr => attr.field === 'segment')!.values) : []
      }
    });
    
    // CRITICAL ARCHITECTURAL RULE: This method ONLY updates report local state
    // It NEVER writes to main filters or main filteredData - this is the architectural rule
    // Connection status will be derived by comparing this state with main filter state
    // Main filteredData MUST remain unchanged when report filters change
    setReportFilterStates(prev => ({
      ...prev,
      [reportId]: {
        ...state,
        dateRange: {
          ...state.dateRange,
          startDate: state.dateRange.startDate ? new Date(state.dateRange.startDate) : null,
          endDate: state.dateRange.endDate ? new Date(state.dateRange.endDate) : null
        },
        attributes: state.attributes.map(attr => ({
          ...attr,
          values: new Set(attr.values)
        }))
      }
    }));
    
    // Calculate and store the active filter count for this report
    const count = calculateActiveFilterCount(state);
    
    // CRITICAL DEBUG: Log detailed count calculation
    const dateCount = (state.dateRange.preset && 
                       state.dateRange.preset !== 'all' && 
                       state.dateRange.preset !== 'custom' &&
                       (state.dateRange.startDate || state.dateRange.endDate)) ? 1 :
                      (state.dateRange.preset === 'custom' && 
                       (state.dateRange.startDate || state.dateRange.endDate)) ? 1 : 0;
    const attributeCount = state.attributes.reduce((sum, attr) => sum + attr.values.size, 0);
    
    console.log(`🔌 [FilterContext] Report filter count updated:`, {
      reportId,
      activeFilterCount: count,
      isActive: state.isActive,
      dateCount,
      attributeCount,
      datePreset: state.dateRange.preset,
      hasDates: !!(state.dateRange.startDate || state.dateRange.endDate),
      attributesWithValues: state.attributes
        .filter(attr => attr.values.size > 0)
        .map(attr => ({ field: attr.field, count: attr.values.size }))
    });
    
    setReportActiveFilterCounts(prev => ({
      ...prev,
      [reportId]: count
    }));
  }, [calculateActiveFilterCount]);
  
  // Get active filter count for a report (returns 0 if report doesn't exist)
  const getReportActiveFilterCount = useCallback((reportId: string): number => {
    return reportActiveFilterCounts[reportId] ?? 0;
  }, [reportActiveFilterCounts]);
  
  // Define updateFrequencySettings here after handleSetFilterState is declared
  const updateFrequencySettings = useCallback((enabled: boolean, threshold: number) => {
    const newState: FilterState = {
      ...filterState,
      frequencyFilterEnabled: enabled,
      frequencyThreshold: threshold
    };
    handleSetFilterState(newState);
  }, [filterState, handleSetFilterState]);
  
  // Get filtered data for a report (uses appropriate filter state)
  // CRITICAL: When connected, use main filteredData directly (already filtered)
  // When disconnected, filter from original data using report filter state
  const getReportFilteredData = useCallback((reportId: string, dataToFilter: DataPoint[]): DataPoint[] => {
    const reportFilterState = getReportFilterState(reportId);
    const mainState = filterState;
    
    // Check if report is connected (states match)
    const isConnected = compareFilterStates(reportFilterState, mainState);
    
    if (isConnected) {
      // Connected: Use main filteredData directly (already filtered by main filters)
      // This ensures bar charts show the same filtered data as main visualization
      console.log(`🔌 [FilterContext] getReportFilteredData: Report ${reportId} is connected - using main filteredData`, {
        filteredDataLength: filteredData.length,
        originalDataLength: dataToFilter.length
      });
      return filteredData;
    } else {
      // Disconnected: Filter from original data using report filter state
      const hasSegmentFilter = reportFilterState.attributes.some(attr => attr.field === 'segment' && attr.values.size > 0);
      const canHandleSegmentFilter = quadrantContext?.getQuadrantForPoint !== undefined;
      
      console.log(`🔌 [FilterContext] getReportFilteredData: Report ${reportId} is disconnected - applying report filters`, {
        reportFilterState: {
          hasSegmentFilter,
          canHandleSegmentFilter,
          attributeFilters: reportFilterState.attributes.filter(attr => attr.values.size > 0).map(attr => ({
            field: attr.field,
            values: Array.from(attr.values)
          }))
        },
        originalDataLength: dataToFilter.length
      });
      
      // CRITICAL: If we have a segment filter but can't handle it (no quadrantContext),
      // we MUST return original data and let FilterPanel handle the filtering
      // FilterPanel has access to quadrantContext and will filter correctly
      // The filtered result will be passed to BarChart via onFilterChange callback
      if (hasSegmentFilter && !canHandleSegmentFilter) {
        console.warn(`🚨 [FilterContext] getReportFilteredData: Report ${reportId} has segment filter but quadrantContext unavailable - returning original data. FilterPanel will handle filtering.`, {
          selectedSegments: Array.from(reportFilterState.attributes.find(attr => attr.field === 'segment')?.values || [])
        });
        // Return original data - FilterPanel will filter it correctly with its quadrantContext
        // BarChart should use the filtered data from FilterPanel's onFilterChange callback
        return dataToFilter.filter(item => !item.excluded);
      }
      
      return applyFilters(dataToFilter, reportFilterState);
    }
  }, [getReportFilterState, applyFilters, filterState, filteredData, compareFilterStates, quadrantContext]);

  const contextValue: FilterContextType = {
    filterState,
    setFilterState: handleSetFilterState,
    updateDateRange,
    updateAttributeFilter,
    updateFrequencySettings,
    resetFilters,
    filteredData,
    setFilteredData,
    activeFilterCount,
    setActiveFilterCount,
    data,
    setData: handleSetData,
    // Report filter connection system
    reportFilterStates,
    reportActiveFilterCounts,
    setReportConnection, // Deprecated but kept for backward compatibility
    syncReportToMaster,
    getReportFilterState,
    setReportFilterState,
    getReportActiveFilterCount,
    getReportFilteredData,
    compareFilterStates,
    isSyncingFromMain
  };

  // Restore report filter states from localStorage on mount (if saved from .seg file)
  // This runs after all the functions are defined
  useEffect(() => {
    try {
      const savedReportFilterStates = localStorage.getItem('savedReportFilterStates');
      if (savedReportFilterStates) {
        const parsed = JSON.parse(savedReportFilterStates);
        const restoredStates: Record<string, FilterState> = {};
        const restoredCounts: Record<string, number> = {};
        
        Object.entries(parsed).forEach(([reportId, savedState]: [string, any]) => {
          const filterState: FilterState = {
            dateRange: {
              startDate: savedState.dateRange.startDate ? new Date(savedState.dateRange.startDate) : null,
              endDate: savedState.dateRange.endDate ? new Date(savedState.dateRange.endDate) : null,
              preset: savedState.dateRange.preset || 'all'
            },
            attributes: savedState.attributes.map((attr: any) => ({
              field: attr.field,
              values: new Set(attr.values),
              availableValues: attr.availableValues,
              expanded: attr.expanded
            })),
            isActive: savedState.isActive,
            frequencyFilterEnabled: savedState.frequencyFilterEnabled,
            frequencyThreshold: savedState.frequencyThreshold
          };
          restoredStates[reportId] = filterState;
          restoredCounts[reportId] = calculateActiveFilterCount(filterState);
        });
        
        // Restore all states at once
        setReportFilterStates(restoredStates);
        setReportActiveFilterCounts(restoredCounts);
        
        // Clear the saved states from localStorage after restoring
        localStorage.removeItem('savedReportFilterStates');
      }
    } catch (e) {
      console.warn('Failed to restore report filter states from localStorage:', e);
    }
  }, [calculateActiveFilterCount]); // Run once on mount, but include calculateActiveFilterCount for completeness

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
};

// Hook to use filter context
export const useFilterContext = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
};

// Hook to safely use filter context (returns null if not available)
export const useFilterContextSafe = (): FilterContextType | null => {
  const context = useContext(FilterContext);
  return context || null;
};
