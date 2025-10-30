import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { DataPoint } from '@/types/base';

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
}

export interface FilterContextType {
  // Current filter state
  filterState: FilterState;
  
  // Filter actions
  setFilterState: (state: FilterState) => void;
  updateDateRange: (dateRange: Partial<DateRange>) => void;
  updateAttributeFilter: (field: string, values: Set<string | number>) => void;
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
  // Note: Connection status is derived from state comparison, not stored separately
  
  // Report filter methods
  setReportConnection: (reportId: string, connected: boolean) => void; // Deprecated: use syncReportToMaster instead
  syncReportToMaster: (reportId: string) => void; // Copy main → report
  getReportFilterState: (reportId: string) => FilterState;
  setReportFilterState: (reportId: string, state: FilterState) => void;
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
      isActive: false
    }
  );

  // Report filter connection system state
  // Note: Connection status is derived from comparing filter states, not stored separately
  const [reportFilterStates, setReportFilterStates] = useState<Record<string, FilterState>>({});
  
  // Flag to track when main filter changes are syncing to reports
  // This prevents false disconnect notifications during sync
  const [isSyncingFromMain, setIsSyncingFromMain] = useState(false);

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

    // Apply date filter
    if (currentFilterState.dateRange.preset && currentFilterState.dateRange.preset !== 'all') {
      const { startDate, endDate } = currentFilterState.dateRange;
      if (startDate || endDate) {
        filtered = filtered.filter(item => {
          if (!item.date) return false;
          
          // Parse the date
          const itemDate = new Date(item.date);
          if (isNaN(itemDate.getTime())) return false;
          
          if (startDate && itemDate < startDate) return false;
          if (endDate && itemDate > endDate) return false;
          
          return true;
        });
      }
    }

    // Apply attribute filters
    currentFilterState.attributes.forEach(attr => {
      if (attr.values.size > 0) {
        filtered = filtered.filter(item => {
          const value = (item as any)[attr.field];
          return attr.values.has(value);
        });
      }
    });

    console.log('🔄 FilterContext: Filter applied', { 
      originalLength: dataToFilter.length, 
      filteredLength: filtered.length,
      filterSignature: filterSignature.substring(0, 50) + '...'
    });

    return filtered;
  }, []);

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
    
    // Automatically recalculate filtered data when date range changes
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
    
    setFilterState(newState);
    
    // Automatically recalculate filtered data (should be all data since filters are reset)
    const newFilteredData = applyFilters(data, newState);
    setFilteredData(newFilteredData);
    setActiveFilterCount(0);
    
    console.log('🔄 FilterContext: Filters reset, showing all data', { 
      dataLength: data.length,
      filteredDataLength: newFilteredData.length
    });
  }, [data, filterState.attributes, applyFilters]);

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
    
    // Compare attributes (order-independent)
    const state1AttrMap = new Map(state1.attributes.map(a => [a.field, Array.from(a.values).sort()]));
    const state2AttrMap = new Map(state2.attributes.map(a => [a.field, Array.from(a.values).sort()]));
    const attributesMatch = (
      state1.attributes.length === state2.attributes.length &&
      state1.attributes.every(attr => {
        const state2Values = state2AttrMap.get(attr.field);
        const state1Values = state1AttrMap.get(attr.field);
        return JSON.stringify(state1Values) === JSON.stringify(state2Values);
      })
    );
    
    return dateRangeMatches && attributesMatch;
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
    
    // NOW update main state (after syncing reports)
    setFilterState(newFilterState);
    
    // Clear sync flag after a brief delay
    setTimeout(() => {
      console.log('🔄 FilterContext: Setting isSyncingFromMain to false');
      setIsSyncingFromMain(false);
    }, 100);
    
    // Automatically recalculate filtered data
    const newFilteredData = applyFilters(data, newFilterState);
    setFilteredData(newFilteredData);
    
    // Update active filter count
    const hasDateFilter = newFilterState.dateRange.preset && newFilterState.dateRange.preset !== 'all';
    const hasAttributeFilters = newFilterState.attributes.some(attr => attr.values.size > 0);
    const newActiveFilterCount = (hasDateFilter ? 1 : 0) + newFilterState.attributes.filter(attr => attr.values.size > 0).length;
    setActiveFilterCount(newActiveFilterCount);
    
    console.log('🔄 FilterContext: Filter state update complete', { 
      filteredDataLength: newFilteredData.length,
      activeFilterCount: newActiveFilterCount
    });
  }, [data, applyFilters, compareFilterStates, filterState]);

  // Report filter connection system methods
  
  /**
   * Sync report filters to main filters (used when reconnecting)
   * Creates a deep copy of the main filter state and assigns it to the report.
   * This makes the report's state match the main state, effectively reconnecting it.
   */
  const syncReportToMaster = useCallback((reportId: string) => {
    console.log(`🔌 [FilterContext] syncReportToMaster called for ${reportId}`);
    setReportFilterStates(prev => {
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
      
      console.log(`🔌 [FilterContext] syncReportToMaster updating reportFilterStates for ${reportId}`);
      return {
        ...prev,
        [reportId]: mainStateCopy
      };
    });
  }, [filterState]);
  
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
      reportId
    });
    
    // IMPORTANT: This method ONLY updates report local state
    // It NEVER writes to main filters - this is the architectural rule
    // Connection status will be derived by comparing this state with main filter state
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
  }, []);
  
  // Get filtered data for a report (uses appropriate filter state)
  const getReportFilteredData = useCallback((reportId: string, dataToFilter: DataPoint[]): DataPoint[] => {
    const reportFilterState = getReportFilterState(reportId);
    return applyFilters(dataToFilter, reportFilterState);
  }, [getReportFilterState, applyFilters]);

  const contextValue: FilterContextType = {
    filterState,
    setFilterState: handleSetFilterState,
    updateDateRange,
    updateAttributeFilter,
    resetFilters,
    filteredData,
    setFilteredData,
    activeFilterCount,
    setActiveFilterCount,
    data,
    setData: handleSetData,
    // Report filter connection system
    reportFilterStates,
    setReportConnection, // Deprecated but kept for backward compatibility
    syncReportToMaster,
    getReportFilterState,
    setReportFilterState,
    getReportFilteredData,
    compareFilterStates,
    isSyncingFromMain
  };

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
