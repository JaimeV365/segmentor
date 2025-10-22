import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Filter, X, Calendar, ChevronDown, Check, Sliders } from 'lucide-react';
import { DataPoint } from '@/types/base';
import { FrequencySlider } from '../controls/FrequencyControl/FrequencySlider';
import { Switch } from '../../ui/Switch/Switch';
import { useFilterContextSafe } from '../context/FilterContext';
import { getRelevantDatePresets, getDateRangeDescription, parseDateString } from '../../../utils/dateFilterUtils';
import './FilterPanel.css';

// Types for filter state
interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  preset?: string;
}

interface AttributeFilter {
  field: string;
  values: Set<string | number>;
  availableValues?: Array<{value: string | number, count: number}>;
  expanded?: boolean;
}

interface FilterState {
  dateRange: DateRange;
  attributes: AttributeFilter[];
  isActive: boolean;
}

interface FilterPanelProps {
  data: DataPoint[];
  onFilterChange: (filteredData: DataPoint[], filters: any[]) => void;
  onClose: () => void;
  isOpen: boolean;
  showPointCount?: boolean;
  onTogglePointCount?: (show: boolean) => void;
  hideHeader?: boolean;
  contentOnly?: boolean;
  // Frequency controls
  frequencyFilterEnabled?: boolean;
  frequencyThreshold?: number;
  onFrequencyFilterEnabledChange?: (enabled: boolean) => void;
  onFrequencyThresholdChange?: (threshold: number) => void;
  frequencyData?: {
    maxFrequency: number;
    hasOverlaps: boolean;
  };
  // Reset trigger
  resetTrigger?: number;
  // Notification callback
  onShowNotification?: (notification: { title: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }) => void;
}

// DATE_PRESETS is now imported from dateFilterUtils

const FilterPanel: React.FC<FilterPanelProps> = ({
  data,
  onFilterChange,
  onClose,
  isOpen,
  showPointCount = true,
  onTogglePointCount,
  hideHeader = false,
  contentOnly = false,
  frequencyFilterEnabled = false,
  frequencyThreshold = 1,
  onFrequencyFilterEnabledChange,
  onFrequencyThresholdChange,
  frequencyData,
  resetTrigger,
  onShowNotification
}) => {
  console.log('🎛️ FilterPanel component mounted/rendered');
  // Try to access filter context if available
  const filterContext = useFilterContextSafe();
  
  // Use context state if available, otherwise use local state
  const [localFilterState, setLocalFilterState] = useState<FilterState>({
    dateRange: {
      startDate: null,
      endDate: null,
      preset: 'all'
    },
    attributes: [],
    isActive: false,
  });

  // Calculate relevant date presets based on actual data
  const relevantDatePresets = useMemo(() => {
    return getRelevantDatePresets(data);
  }, [data]);

  // Get date range description for display
  const dateRangeDescription = useMemo(() => {
    return getDateRangeDescription(data);
  }, [data]);

  // Check if we have any date data
  const hasDateData = useMemo(() => {
    return data.some(item => !item.excluded && item.date);
  }, [data]);

  // Get available fields for attribute filtering (excluding excluded items)
  const availableFields = useMemo(() => {
    const activeData = data.filter(item => !item.excluded);
    
    if (activeData.length === 0) return [];
    
    const fields = new Set<string>();
    const counts: Record<string, Record<string | number, number>> = {};
    
    activeData.forEach(item => {
      Object.keys(item).forEach(key => {
        if (key !== 'id' && key !== 'excluded') {
          fields.add(key);
          const value = (item as any)[key];
          if (value !== null && value !== undefined && value !== '') {
            if (!counts[key]) counts[key] = {};
            counts[key][value] = (counts[key][value] || 0) + 1;
          }
        }
      });
    });
    
    return Array.from(fields).map(field => ({
      field,
      values: Object.keys(counts[field] || {}),
      counts: counts[field] || {}
    }));
  }, [data]);

  const filterState = filterContext?.filterState || localFilterState;
  
  // Create type-safe setter functions
  const setFilterState = (newState: FilterState | ((prev: FilterState) => FilterState)) => {
    if (filterContext) {
      if (typeof newState === 'function') {
        filterContext.setFilterState(newState(filterContext.filterState));
      } else {
        filterContext.setFilterState(newState);
      }
    } else {
      setLocalFilterState(newState);
    }
  };

  // Apply filters with a specific state (for reactive updates)
  const applyFiltersWithState = useCallback((stateToUse: FilterState) => {
    const { dateRange, attributes } = stateToUse;
    
    const filteredData = data.filter(item => {
      // Don't include excluded items
      if (item.excluded) return false;
      
      // Check date range if applicable
      if (dateRange.startDate || dateRange.endDate) {
        if (!isDateInRange(item.date, dateRange)) return false;
      }
      
      // Check attribute filters
      for (const attr of attributes) {
        // Skip if no values selected (include all)
        if (attr.values.size === 0) continue;
        
        // Check if this item matches any selected value for this attribute
        const itemValue = (item as any)[attr.field];
        
        // Convert both values to strings for comparison to handle type mismatches
        const itemValueStr = String(itemValue);
        const hasMatch = Array.from(attr.values).some(selectedValue => 
          String(selectedValue) === itemValueStr
        );
        
        if (!hasMatch) return false;
      }
      
      return true;
    });
    
    // Check if filters are active
    const isActive = (
      (dateRange.startDate !== null || dateRange.endDate !== null) ||
      attributes.some(attr => attr.values.size > 0)
    );
    
    // Extract active filters for callback
    const activeFilters: Array<{type: string, label: string, value: any}> = [];
    
    // Add date filter if active
    if (dateRange.startDate || dateRange.endDate) {
      activeFilters.push({
        type: 'date',
        label: 'Date Range',
        value: `${dateRange.startDate ? formatDateForDisplay(dateRange.startDate) : 'All past'} - ${dateRange.endDate ? formatDateForDisplay(dateRange.endDate) : 'All future'}`
      });
    }
    
    // Add attribute filters
    attributes.forEach(attr => {
      if (attr.values.size > 0) {
        activeFilters.push({
          type: 'attribute',
          label: attr.field,
          value: Array.from(attr.values).join(', ')
        });
      }
    });
    
    // No longer need to call onFilterChange - the context handles this automatically
    // Just update the filter state in the context
    if (filterContext) {
      filterContext.setFilterState(stateToUse);
    } else {
      // Fallback for when context is not available
      setFilterState(stateToUse);
    }
  }, [filterContext]);

  // Reactive filtering: validate and reset filters when data changes
  const validateAndResetFilters = useCallback(() => {
    const currentState = filterState;
    let needsReset = false;
    let notificationShown = false;
    const newFilterState = { ...currentState };

    // Check if current date preset is still available AND has matching data
    if (currentState.dateRange.preset && currentState.dateRange.preset !== 'all' && currentState.dateRange.preset !== 'custom') {
      const isPresetAvailable = relevantDatePresets.some(preset => preset.key === currentState.dateRange.preset);
      
      if (!isPresetAvailable) {
        // Preset is no longer available, reset to 'all'
        newFilterState.dateRange = {
          startDate: null,
          endDate: null,
          preset: 'all'
        };
        needsReset = true;
        
        // Show notification to user (only once per reset)
        if (onShowNotification && !notificationShown) {
          const presetLabel = relevantDatePresets.find(p => p.key === currentState.dateRange.preset)?.label || 'filter';
          onShowNotification({
            title: 'Filter Reset',
            message: `"${presetLabel}" filter was automatically reset because this option is no longer available.`,
            type: 'info'
          });
          notificationShown = true;
        }
      } else {
        // Preset is available, but check if it actually has matching data
        const tempDateRange = { ...currentState.dateRange };
        
        // Apply the preset to get the actual date range
        const now = new Date();
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        
        switch (currentState.dateRange.preset) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
          case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'last7days':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
          case 'last30days':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
          case 'thisMonth':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            break;
          case 'lastMonth':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'thisYear':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear() + 1, 0, 1);
            break;
          case 'lastYear':
            startDate = new Date(now.getFullYear() - 1, 0, 1);
            endDate = new Date(now.getFullYear(), 0, 1);
            break;
        }
        
        // Check if there's any data in this date range
        const hasMatchingData = data.some(item => {
          if (item.excluded) return false;
          if (!item.date) return false;
          
          const itemDate = parseDateString(item.date);
          if (!itemDate) return false;
          
          if (startDate && itemDate < startDate) return false;
          if (endDate && itemDate >= endDate) return false;
          
          return true;
        });
        
        if (!hasMatchingData) {
          // No data matches this preset, reset to 'all'
          newFilterState.dateRange = {
            startDate: null,
            endDate: null,
            preset: 'all'
          };
          needsReset = true;
          
          // Show notification to user (only once per reset)
          if (onShowNotification && !notificationShown) {
            const presetLabel = relevantDatePresets.find(p => p.key === currentState.dateRange.preset)?.label || 'filter';
            onShowNotification({
              title: 'Filter Reset',
              message: `"${presetLabel}" filter was automatically reset because no data matches this criteria.`,
              type: 'info'
            });
            notificationShown = true;
          }
        }
      }
    }

    // Check if selected attribute values are still available
    const updatedAttributes = currentState.attributes.map(attr => {
      const fieldData = availableFields.find(f => f.field === attr.field);
      if (!fieldData) {
        return { ...attr, values: new Set() };
      }

      const validValues = new Set<string | number>();
      attr.values.forEach(value => {
        if (fieldData.values.includes(String(value))) {
          validValues.add(value as string | number);
        }
      });

      if (validValues.size !== attr.values.size) {
        needsReset = true;
        return { ...attr, values: validValues };
      }

      return attr;
    });

    newFilterState.attributes = updatedAttributes as AttributeFilter[];

    if (needsReset) {
      setFilterState(newFilterState);
      // Apply the new filters immediately
      setTimeout(() => {
        applyFiltersWithState(newFilterState);
      }, 0);
    }
  }, [filterState, relevantDatePresets, availableFields, setFilterState, applyFiltersWithState]);

  // Create a data signature to detect changes
  const dataSignature = useMemo(() => {
    return data.map(item => `${item.id}-${item.date}-${item.excluded}`).join('|');
  }, [data]);

  // Watch for data changes and validate filters
  useEffect(() => {
    // Only validate if we have an active filter that might need resetting
    if (filterState.dateRange.preset && filterState.dateRange.preset !== 'all') {
      validateAndResetFilters();
    }
  }, [dataSignature, relevantDatePresets, availableFields, validateAndResetFilters, filterState.dateRange.preset]);

  // Listen for manual filter validation triggers (from delete/exclude actions)
  useEffect(() => {
    console.log('🎧 FilterPanel: Setting up event listener for reset-filters-if-needed');
    
    const handleResetFilters = () => {
      console.log('🎯 FilterPanel: Reset filters event received!', { 
        currentPreset: filterState.dateRange.preset,
        hasActiveFilter: filterState.dateRange.preset && filterState.dateRange.preset !== 'all'
      });
      // Only validate if we have an active filter that might need resetting
      if (filterState.dateRange.preset && filterState.dateRange.preset !== 'all') {
        console.log('✅ FilterPanel: Running filter validation...');
        validateAndResetFilters();
      } else {
        console.log('⏭️ FilterPanel: Skipping validation - no active filter');
      }
    };

    const handleForceReset = () => {
      console.log('🎯 FilterPanel: Force reset event received!');
      console.log('✅ FilterPanel: Running filter validation...');
      validateAndResetFilters();
    };

    document.addEventListener('reset-filters-if-needed', handleResetFilters);
    document.addEventListener('force-reset-filters', handleForceReset);
    console.log('🎧 FilterPanel: Event listeners added successfully');
    
    return () => {
      console.log('🎧 FilterPanel: Removing event listeners');
      document.removeEventListener('reset-filters-if-needed', handleResetFilters);
      document.removeEventListener('force-reset-filters', handleForceReset);
    };
  }, [filterState.dateRange.preset, validateAndResetFilters]);
  
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // availableFields is already defined above

  // Initialize attributes on first render
  useEffect(() => {
    if (!filterContext && availableFields.length > 0 && filterState.attributes.length === 0) {
      setFilterState(prev => ({
        ...prev,
        attributes: availableFields.map(field => ({
          field: field.field,
          values: new Set(),
          availableValues: Object.entries(field.counts).map(([value, count]) => ({
            value,
            count
          })),
          expanded: false
        }))
      }));
    }
  }, [availableFields, filterState.attributes.length, filterContext]);

  // Apply filters when filterState changes
  useEffect(() => {
    applyFilters();
  }, [filterState.dateRange.startDate, filterState.dateRange.endDate, filterState.dateRange.preset, 
      // Use a stringified version of attributes values to avoid infinite loops
      // This will only trigger when the actual selected values change
      JSON.stringify(filterState.attributes.map(a => ({
        field: a.field,
        values: Array.from(a.values)
      })))
  ]);

  // Handle external reset trigger
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger > 0) {
      resetFilters();
    }
  }, [resetTrigger]);

  // Check if date is in range
  const isDateInRange = (dateStr: string | undefined, range: DateRange): boolean => {
    if (!dateStr || !range.startDate) return true;
    
    // Parse the date string based on format
    let dateValue: Date;
    try {
      dateValue = new Date(dateStr);
      if (isNaN(dateValue.getTime())) {
        // Try parsing in different formats if standard parsing fails
        const parts = dateStr.split(/\/|-/);
        if (parts.length === 3) {
          // Try to detect format
          if (parts[0].length === 4) {
            // yyyy-mm-dd
            dateValue = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
          } else if (parts[2].length === 4) {
            // dd/mm/yyyy or mm/dd/yyyy
            dateValue = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          }
        }
      }
    } catch (e) {
      console.error('Error parsing date:', dateStr, e);
      return false;
    }
    
    // Check range
    if (range.startDate && dateValue < range.startDate) return false;
    if (range.endDate && dateValue > range.endDate) return false;
    
    return true;
  };

  // Apply current filters to data
  const applyFilters = () => {
    // No longer need to manually apply filters - the context handles this automatically
    // Just update the filter state in the context
    if (filterContext) {
      filterContext.setFilterState(filterState);
    } else {
      // Fallback for when context is not available
      applyFiltersWithState(filterState);
    }
  };

  // Convert preset to date range
  const applyDatePreset = (preset: string) => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    switch (preset) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        break;
      case 'last7days':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'last30days':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        break;
      case 'custom':
        // Don't change dates, just show picker
        setDatePickerVisible(true);
        break;
      case 'all':
      default:
        // Reset dates
        startDate = null;
        endDate = null;
        break;
    }
    
    if (preset !== 'custom') {
      setDatePickerVisible(false);
    }
    
    // Use context's updateDateRange method if available
    if (filterContext) {
      filterContext.updateDateRange({
        startDate,
        endDate,
        preset
      });
    } else {
      // Fallback for when context is not available
      setFilterState(prev => ({
        ...prev,
        dateRange: {
          ...prev.dateRange,
          startDate,
          endDate,
          preset
        }
      }));
    }
    
    // Update custom date inputs
    if (startDate) {
      setCustomStartDate(formatDateForInput(startDate));
    }
    if (endDate) {
      setCustomEndDate(formatDateForInput(endDate));
    }
  };

  // Toggle attribute filter
  const toggleAttributeValue = (field: string, value: string | number) => {
    setFilterState(prev => ({
      ...prev,
      attributes: prev.attributes.map(attr => {
        if (attr.field === field) {
          const newValues = new Set(attr.values);
          if (newValues.has(value)) {
            newValues.delete(value);
          } else {
            newValues.add(value);
          }
          return { ...attr, values: newValues };
        }
        return attr;
      })
    }));
  };

  // Toggle attribute section expand/collapse
  const toggleAttributeExpanded = (field: string) => {
    setFilterState(prev => ({
      ...prev,
      attributes: prev.attributes.map(attr => {
        if (attr.field === field) {
          return { ...attr, expanded: !attr.expanded };
        }
        return attr;
      })
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    if (filterContext) {
      // Use context reset if available
      filterContext.resetFilters();
    } else {
      // Fallback to local state reset
      setFilterState({
        dateRange: {
          startDate: null,
          endDate: null,
          preset: 'all'
        },
        attributes: filterState.attributes.map(attr => ({
          ...attr,
          values: new Set()
        })),
        isActive: false,
      });
    }
    setDatePickerVisible(false);
    setCustomStartDate('');
    setCustomEndDate('');
  };

  // Apply custom date range
  const applyCustomDateRange = () => {
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    if (customStartDate) {
      startDate = new Date(customStartDate);
    }
    
    if (customEndDate) {
      endDate = new Date(customEndDate);
      // Set to end of day
      endDate.setHours(23, 59, 59);
    }
    
    setFilterState(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        startDate,
        endDate,
        preset: 'custom'
      }
    }));
  };

  // Format date for input field
  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Get active filter count
  const getActiveFilterCount = (): number => {
    let count = 0;
    
    // Date range counts as one filter if active
    if (filterState.dateRange.startDate || filterState.dateRange.endDate) {
      count += 1;
    }
    
    // Count selected attribute values
    filterState.attributes.forEach(attr => {
      count += attr.values.size;
    });
    
    return count;
  };

  // Get display name for a field
  const getFieldDisplayName = (field: string): string => {
    // Special cases for field names that need specific formatting
    const specialFieldMap: Record<string, string> = {
      'id': 'ID',
      'satisfaction': 'Satisfaction',
      'loyalty': 'Loyalty',
      'ces': 'CES',
      'nps': 'NPS',
      'csat': 'CSAT',
      'email': 'Email',
      'date': 'Date',
      'name': 'Name',
      'group': 'Group',
      'country': 'Country'
    };
    
    // Check case-insensitive match for special fields
    for (const [fieldKey, display] of Object.entries(specialFieldMap)) {
      if (field.toLowerCase() === fieldKey.toLowerCase()) {
        return display;
      }
    }
    
    // For other fields, just capitalize first letter
    return field.charAt(0).toUpperCase() + field.slice(1);
  };

  // Format date for display
  const formatDateForDisplay = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // hasDateData is already defined above

  const content = (
    <>
      {/* Header - conditionally rendered */}
      {!hideHeader && !contentOnly && (
        <div className="filter-panel-header">
          <div className="filter-panel-title">
            <Filter size={18} />
            <h3>Filters</h3>
            {filterState.isActive && (
              <span className="filter-badge">{getActiveFilterCount()}</span>
            )}
          </div>
          <button className="filter-panel-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      )}

      <div className="filter-panel-content">
        {/* Date Filters - only show if we have date data */}
        {hasDateData && (
          <>
            <div className="filter-section-category">Date Filters</div>
            <div className="filter-section">
              <div className="filter-section-header">
                <h4>Date Range</h4>
                {filterState.dateRange.startDate && (
                  <button 
                    className="filter-clear-button" 
                    onClick={() => applyDatePreset('all')}
                  >
                    Clear
                  </button>
                )}
              </div>
              
              {/* Date range information */}
              <div className="date-range-info">
                <div className="date-range-description">{dateRangeDescription}</div>
              </div>
              
              <div className="date-preset-buttons">
                {relevantDatePresets.map(preset => (
                  <button
                    key={preset.key}
                    className={`date-preset-button ${filterState.dateRange.preset === preset.key ? 'active' : ''}`}
                    onClick={() => applyDatePreset(preset.key)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              
              {/* Custom date picker */}
              {datePickerVisible && (
                <div className="custom-date-picker">
                  <div className="date-inputs">
                    <div className="date-input-group">
                      <label>Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={e => setCustomStartDate(e.target.value)}
                      />
                    </div>
                    <div className="date-input-group">
                      <label>End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={e => setCustomEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <button 
                    className="apply-date-button"
                    onClick={applyCustomDateRange}
                  >
                    Apply
                  </button>
                </div>
              )}
              
              {/* Active date range display */}
              {(filterState.dateRange.startDate || filterState.dateRange.endDate) && (
                <div className="active-date-range">
                  <Calendar size={14} />
                  <span>
                    {filterState.dateRange.startDate ? formatDateForDisplay(filterState.dateRange.startDate) : 'All past'} 
                    {' - '} 
                    {filterState.dateRange.endDate ? formatDateForDisplay(filterState.dateRange.endDate) : 'All future'}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Scale Filters */}
        <div className="filter-section-category">Scales</div>
        {filterState.attributes
          .filter(attr => ['satisfaction', 'loyalty'].includes(attr.field))
          .map(attr => (
            <div className="filter-section" key={attr.field}>
              <div 
                className="filter-section-header clickable" 
                onClick={() => toggleAttributeExpanded(attr.field)}
              >
                <h4>{getFieldDisplayName(attr.field)}</h4>
                <div className="filter-section-header-right">
                  {attr.values.size > 0 && (
                    <button 
                      className="filter-clear-button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterState(prev => ({
                          ...prev,
                          attributes: prev.attributes.map(a => 
                            a.field === attr.field ? {...a, values: new Set()} : a
                          )
                        }));
                      }}
                    >
                      Clear
                    </button>
                  )}
                  <ChevronDown 
                    size={16} 
                    className={`chevron-icon ${attr.expanded ? 'expanded' : ''}`} 
                  />
                </div>
              </div>
              
              {attr.expanded && (
                <div className="attribute-value-list">
                  {attr.availableValues?.map(({value, count}) => (
                    <div 
                      key={`${attr.field}-${value}`}
                      className={`attribute-value-item ${attr.values.has(value) ? 'selected' : ''}`}
                      onClick={() => toggleAttributeValue(attr.field, value)}
                    >
                      <div className="checkbox">
                        {attr.values.has(value) && <Check size={14} />}
                      </div>
                      <div className="attribute-label">{value.toString()}</div>
                      <div className="attribute-count">{count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

        {/* Basic Information Filters */}
        <div className="filter-section-category">Basic Information</div>
        {filterState.attributes
          .filter(attr => ['group', 'name', 'email'].includes(attr.field))
          .map(attr => (
            <div className="filter-section" key={attr.field}>
              <div 
                className="filter-section-header clickable" 
                onClick={() => toggleAttributeExpanded(attr.field)}
              >
                <h4>{getFieldDisplayName(attr.field)}</h4>
                <div className="filter-section-header-right">
                  {attr.values.size > 0 && (
                    <button 
                      className="filter-clear-button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterState(prev => ({
                          ...prev,
                          attributes: prev.attributes.map(a => 
                            a.field === attr.field ? {...a, values: new Set()} : a
                          )
                        }));
                      }}
                    >
                      Clear
                    </button>
                  )}
                  <ChevronDown 
                    size={16} 
                    className={`chevron-icon ${attr.expanded ? 'expanded' : ''}`} 
                  />
                </div>
              </div>
              
              {attr.expanded && (
                <div className="attribute-value-list">
                  {attr.availableValues?.map(({value, count}) => (
                    <div 
                      key={`${attr.field}-${value}`}
                      className={`attribute-value-item ${attr.values.has(value) ? 'selected' : ''}`}
                      onClick={() => toggleAttributeValue(attr.field, value)}
                    >
                      <div className="checkbox">
                        {attr.values.has(value) && <Check size={14} />}
                      </div>
                      <div className="attribute-label">{value.toString()}</div>
                      <div className="attribute-count">{count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

        {/* Additional Attributes */}
        {filterState.attributes
          .filter(attr => {
            const field = attr.field.toLowerCase();
            return !['satisfaction', 'loyalty', 'group', 'name', 'email'].includes(field) &&
                   !field.includes('sat') && 
                   !field.includes('loy');
          })
          .length > 0 && (
            <>
              <div className="filter-section-category">Additional Attributes</div>
              {filterState.attributes
                .filter(attr => {
                  const field = attr.field.toLowerCase();
                  return !['satisfaction', 'loyalty', 'group', 'name', 'email'].includes(field) &&
                         !field.includes('sat') && 
                         !field.includes('loy');
                })
                .map(attr => (
                  <div className="filter-section" key={attr.field}>
                    <div 
                      className="filter-section-header clickable" 
                      onClick={() => toggleAttributeExpanded(attr.field)}
                    >
                      <h4>{getFieldDisplayName(attr.field)}</h4>
                      <div className="filter-section-header-right">
                        {attr.values.size > 0 && (
                          <button 
                            className="filter-clear-button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilterState(prev => ({
                                ...prev,
                                attributes: prev.attributes.map(a => 
                                  a.field === attr.field ? {...a, values: new Set()} : a
                                )
                              }));
                            }}
                          >
                            Clear
                          </button>
                        )}
                        <ChevronDown 
                          size={16} 
                          className={`chevron-icon ${attr.expanded ? 'expanded' : ''}`} 
                        />
                      </div>
                    </div>
                    
                    {attr.expanded && (
                      <div className="attribute-value-list">
                        {attr.availableValues?.map(({value, count}) => (
                          <div 
                            key={`${attr.field}-${value}`}
                            className={`attribute-value-item ${attr.values.has(value) ? 'selected' : ''}`}
                            onClick={() => toggleAttributeValue(attr.field, value)}
                          >
                            <div className="checkbox">
                              {attr.values.has(value) && <Check size={14} />}
                            </div>
                            <div className="attribute-label">{value.toString()}</div>
                            <div className="attribute-count">{count}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </>
          )}
      </div>
      
      {/* Frequency Controls */}
      {frequencyData?.hasOverlaps && (
        <>
          <div className="filter-section-category">Frequency</div>
          <div className="filter-section">
          <div className="filter-section-header">
            <h4>Point Frequency</h4>
          </div>
          <div className="filter-section-content">
            {onFrequencyFilterEnabledChange && (
              <Switch
                checked={frequencyFilterEnabled}
                onChange={onFrequencyFilterEnabledChange}
                leftLabel="Filter Points"
              />
            )}
            {frequencyFilterEnabled && onFrequencyThresholdChange && frequencyData && (
              <FrequencySlider
                maxFrequency={frequencyData.maxFrequency}
                currentThreshold={frequencyThreshold}
                onThresholdChange={onFrequencyThresholdChange}
              />
            )}
          </div>
        </div>
        </>
      )}
      
      {/* Footer */}
      {!contentOnly && (
        <div className="filter-panel-footer">
          {/* Point count toggle */}
          {onTogglePointCount && (
            <div className="filter-panel-options" style={{ marginBottom: '16px' }}>
              <label className="filter-option" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: 'pointer',
                userSelect: 'none'
              }}>
                <input 
                  type="checkbox" 
                  checked={showPointCount} 
                  onChange={(e) => onTogglePointCount(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: '#3a863e'
                  }}
                />
                <span>Show point count</span>
              </label>
            </div>
          )}
          
          <button 
            className="filter-reset-button" 
            onClick={resetFilters}
            disabled={!filterState.isActive}
          >
            Reset All
          </button>
        </div>
      )}
    </>
  );

  // Return content with or without wrapper based on contentOnly prop
  if (contentOnly) {
    return content;
  }

  return (
    <div 
      className={`filter-panel ${isOpen ? 'open' : ''}`} 
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </div>
  );
};

export { FilterPanel as default };
export { FilterPanel };