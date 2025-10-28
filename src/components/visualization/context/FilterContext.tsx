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
  
  // Connection management for Reports section
  isReportsConnected: boolean;
  reportsFilterState: FilterState | null;
  setReportsConnection: (connected: boolean) => void;
  updateReportsFilterState: (state: FilterState) => void;
  syncReportsToMaster: () => void;
  getReportsFilteredData: () => DataPoint[];
  
  // Notification function
  onShowNotification?: (notification: { title: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }) => void;
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

  // Connection management for Reports section
  const [isReportsConnected, setIsReportsConnected] = useState(true);
  const [reportsFilterState, setReportsFilterState] = useState<FilterState | null>(null);

  // Apply filters to data with memoization
  const applyFilters = useCallback((dataToFilter: DataPoint[], currentFilterState: FilterState) => {
    console.log('🔄 FilterContext: Applying filters to data...', { 
      dataLength: dataToFilter.length, 
      hasDateFilter: currentFilterState.dateRange.preset !== 'all',
      hasAttributeFilters: currentFilterState.attributes.some(attr => attr.values.size > 0),
      filterState: currentFilterState
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
    console.log('🔄 After excluding items:', { 
      filteredLength: filtered.length,
      excludedCount: dataToFilter.length - filtered.length
    });

    // Apply date filter
    if (currentFilterState.dateRange.preset && currentFilterState.dateRange.preset !== 'all') {
      console.log('🔄 Applying date filter:', {
        preset: currentFilterState.dateRange.preset,
        startDate: currentFilterState.dateRange.startDate,
        endDate: currentFilterState.dateRange.endDate
      });
      const { startDate, endDate } = currentFilterState.dateRange;
      if (startDate || endDate) {
        const beforeDateFilter = filtered.length;
        filtered = filtered.filter(item => {
          if (!item.date) return false;
          
          // Parse the date
          const itemDate = new Date(item.date);
          if (isNaN(itemDate.getTime())) return false;
          
          if (startDate && itemDate < startDate) return false;
          if (endDate && itemDate > endDate) return false;
          
          return true;
        });
        console.log('🔄 After date filter:', {
          beforeDateFilter,
          afterDateFilter: filtered.length,
          dateFilteredCount: beforeDateFilter - filtered.length
        });
      }
    } else {
      console.log('🔄 No date filter applied (preset is "all")');
    }

    // Apply attribute filters
    currentFilterState.attributes.forEach((attr, index) => {
      if (attr.values.size > 0) {
        console.log(`🔄 Applying attribute filter ${index + 1}:`, {
          field: attr.field,
          values: Array.from(attr.values),
          valuesSize: attr.values.size
        });
        const beforeAttributeFilter = filtered.length;
        filtered = filtered.filter(item => {
          const value = (item as any)[attr.field];
          const matches = attr.values.has(value);
          console.log(`🔄 Checking item ${item.id}:`, {
            field: attr.field,
            value: value,
            matches: matches,
            availableValues: Array.from(attr.values)
          });
          return matches;
        });
        console.log(`🔄 After attribute filter ${index + 1}:`, {
          beforeAttributeFilter,
          afterAttributeFilter: filtered.length,
          attributeFilteredCount: beforeAttributeFilter - filtered.length
        });
      } else {
        console.log(`🔄 Skipping attribute filter ${index + 1} (no values):`, {
          field: attr.field,
          valuesSize: attr.values.size
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
    setFilterState(prev => {
      const newState = {
        ...prev,
        dateRange: {
          ...prev.dateRange,
          ...dateRangeUpdate
        }
      };
      
      // Automatically recalculate filtered data when date range changes
      console.log('🔄 updateDateRange: About to apply filters with new state:', newState);
      const newFilteredData = applyFilters(data, newState);
      console.log('🔄 updateDateRange: Got filtered data:', {
        dataLength: data.length,
        filteredDataLength: newFilteredData.length
      });
      setFilteredData(newFilteredData);
      
      // Update active filter count
      const hasDateFilter = newState.dateRange.preset && newState.dateRange.preset !== 'all';
      const hasAttributeFilters = newState.attributes.some(attr => attr.values.size > 0);
      const newActiveFilterCount = (hasDateFilter ? 1 : 0) + newState.attributes.filter(attr => attr.values.size > 0).length;
      setActiveFilterCount(newActiveFilterCount);
      
      return newState;
    });
  }, [data, applyFilters]);

  // Update attribute filter
  const updateAttributeFilter = useCallback((field: string, values: Set<string | number>) => {
    setFilterState(prev => {
      const newState = {
        ...prev,
        attributes: prev.attributes.map(attr => 
          attr.field === field 
            ? { ...attr, values }
            : attr
        )
      };
      
      // Automatically recalculate filtered data when attribute filter changes
      console.log('🔄 updateAttributeFilter: About to apply filters with new state:', newState);
      const newFilteredData = applyFilters(data, newState);
      console.log('🔄 updateAttributeFilter: Got filtered data:', {
        dataLength: data.length,
        filteredDataLength: newFilteredData.length
      });
      setFilteredData(newFilteredData);
      
      // Update active filter count
      const hasDateFilter = newState.dateRange.preset && newState.dateRange.preset !== 'all';
      const hasAttributeFilters = newState.attributes.some(attr => attr.values.size > 0);
      const newActiveFilterCount = (hasDateFilter ? 1 : 0) + newState.attributes.filter(attr => attr.values.size > 0).length;
      setActiveFilterCount(newActiveFilterCount);
      
      return newState;
    });
  }, [data, applyFilters]);

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
        .map(([field, valuesSet]) => {
          // Sort values: numbers first (ascending), then strings (alphabetical)
          const sortedValues = Array.from(valuesSet).sort((a, b) => {
            const aNum = Number(a);
            const bNum = Number(b);
            
            // If both are valid numbers, sort numerically
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return aNum - bNum;
            }
            
            // If one is a number and one is a string, number comes first
            if (!isNaN(aNum) && isNaN(bNum)) return -1;
            if (isNaN(aNum) && !isNaN(bNum)) return 1;
            
            // Both are strings, sort alphabetically
            return String(a).localeCompare(String(b));
          });
          
          return {
            field,
            counts: sortedValues.map(value => ({
              value,
              count: activeData.filter(item => (item as any)[field] === value || ((item as any).additionalAttributes && (item as any).additionalAttributes[field] === value)).length
            }))
          };
        })
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

  // Enhanced setFilterState that automatically recalculates
  const handleSetFilterState = useCallback((newFilterState: FilterState) => {
    console.log('🔄 FilterContext: Filter state updated, recalculating...', { 
      newFilterState,
      dataLength: data.length
    });
    
    setFilterState(newFilterState);
    
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
  }, [data, applyFilters]);

  // Connection management functions
  const setReportsConnection = useCallback((connected: boolean) => {
    console.log('🔗 FilterContext: Setting Reports connection:', connected);
    setIsReportsConnected(connected);
    
    if (connected) {
      // When reconnecting, sync to master and clear local state
      setReportsFilterState(null);
      console.log('🔗 FilterContext: Synced Reports to master filters');
    }
  }, []);

  const updateReportsFilterState = useCallback((state: FilterState) => {
    console.log('🔗 FilterContext: Updating Reports filter state');
    setReportsFilterState(state);
  }, []);

  const syncReportsToMaster = useCallback(() => {
    console.log('🔗 FilterContext: Syncing Reports to master');
    setReportsFilterState(null);
    setIsReportsConnected(true);
  }, []);

  const getReportsFilteredData = useCallback(() => {
    console.log('🔄 getReportsFilteredData called:', {
      isReportsConnected,
      hasReportsFilterState: !!reportsFilterState,
      filteredDataLength: filteredData.length,
      dataLength: data.length
    });
    
    if (isReportsConnected || !reportsFilterState) {
      // Use master filtered data
      console.log('🔄 Using master filtered data:', {
        filteredDataLength: filteredData.length
      });
      return filteredData;
    } else {
      // Apply Reports-specific filters
      console.log('🔄 Applying reports-specific filters:', {
        reportsFilterState
      });
      return applyFilters(data, reportsFilterState);
    }
  }, [isReportsConnected, reportsFilterState, filteredData, data, applyFilters]);

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
    // Connection management
    isReportsConnected,
    reportsFilterState,
    setReportsConnection,
    updateReportsFilterState,
    syncReportsToMaster,
    getReportsFilteredData,
    
    // Notification function
    onShowNotification
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
