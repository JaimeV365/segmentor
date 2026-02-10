import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Filter, X, Calendar, ChevronDown, Check, Sliders } from 'lucide-react';
import { DataPoint, ScaleFormat } from '@/types/base';
import { FrequencySlider } from '../controls/FrequencyControl/FrequencySlider';
import { Switch } from '../../ui/Switch/Switch';
import { useFilterContextSafe } from '../context/FilterContext';
import { useQuadrantAssignmentSafe } from '../context/QuadrantAssignmentContext';
import { getRelevantDatePresets, getDateRangeDescription, parseDateString } from '../../../utils/dateFilterUtils';
import { categorizeLoyaltyValue } from '../../../utils/recommendationScore';
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
  onFilterChange: (filteredData: DataPoint[], filters: any[], filterState?: FilterState) => void;
  onClose: () => void;
  isOpen: boolean;
  showPointCount?: boolean;
  onTogglePointCount?: (show: boolean) => void;
  hideHeader?: boolean;
  contentOnly?: boolean;
  // Report filter connection system
  reportId?: string; // e.g., "barChart" - used for report filter state management
  forceLocalState?: boolean; // If true, uses report filter state instead of main filter state
  // Recommendation Score specific
  loyaltyScale?: ScaleFormat; // Required for recommendationCategory filter
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
  reportId,
  forceLocalState = false,
  loyaltyScale,
  frequencyFilterEnabled = false,
  frequencyThreshold = 1,
  onFrequencyFilterEnabledChange,
  onFrequencyThresholdChange,
  frequencyData,
  resetTrigger,
  onShowNotification
}) => {
  console.log('🎛️ FilterPanel component mounted/rendered', { reportId, forceLocalState });
  // Try to access filter context if available
  const filterContext = useFilterContextSafe();
  
  // Access quadrant assignment context to get segment information
  const quadrantContext = useQuadrantAssignmentSafe();
  
  // Log quadrant context state on every render to track midpoint changes
  // FORCE this log to appear - use console.warn for visibility
  console.warn('🎛️ [FilterPanel] Render - quadrant context state:', {
    hasQuadrantContext: !!quadrantContext,
    midpoint: quadrantContext?.midpoint,
    midpointSat: quadrantContext?.midpoint?.sat,
    midpointLoy: quadrantContext?.midpoint?.loy,
    apostlesZoneSize: quadrantContext?.apostlesZoneSize,
    terroristsZoneSize: quadrantContext?.terroristsZoneSize,
    manualAssignmentsSize: quadrantContext?.manualAssignments?.size || 0,
    isOpen,
    renderCount: Math.random() // Force unique log to ensure it's not deduplicated
  });
  
  // Track if user has made changes (for auto-disconnect detection)
  const [hasUserMadeChanges, setHasUserMadeChanges] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Track when we're updating the state ourselves to prevent infinite loops
  const isUpdatingStateRef = useRef(false);
  // Track the last state we set to prevent unnecessary updates
  const lastSetStateRef = useRef<FilterState | null>(null);
  // Track the last processed reset trigger to prevent loops
  const lastProcessedResetTriggerRef = useRef<number>(0);
  // Track which preset we've already shown a notification for to prevent duplicates
  const lastNotifiedPresetRef = useRef<string | null>(null);
  // Track if validation is currently running to prevent concurrent executions
  const isValidatingRef = useRef<boolean>(false);
  
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
  
  // Get the appropriate filter state based on forceLocalState
  const getEffectiveFilterState = useCallback((): FilterState => {
    if (forceLocalState && reportId && filterContext) {
      // Use report filter state
      return filterContext.getReportFilterState(reportId);
    } else if (filterContext) {
      // Use main filter state
      return filterContext.filterState;
    } else {
      // Fallback to local state
      return localFilterState;
    }
  }, [forceLocalState, reportId, filterContext, localFilterState]);
  
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

  // Map quadrant types to display names using context if available
  const getSegmentDisplayName = useCallback((quadrantType: string): string => {
    // Use context display name function if available (respects isClassicModel)
    if (quadrantContext?.getDisplayNameForQuadrant) {
      return quadrantContext.getDisplayNameForQuadrant(quadrantType as any);
    }
    
    // Fallback to default names
    const segmentMap: Record<string, string> = {
      'hostages': 'Hostages',
      'loyalists': 'Loyalists',
      'mercenaries': 'Mercenaries',
      'defectors': 'Defectors',
      'apostles': 'Apostles',
      'advocates': 'Advocates',
      'near_apostles': 'Near-Apostles',
      'near_advocates': 'Near-Advocates',
      'near-apostles': 'Near-Apostles',
      'near-advocates': 'Near-Advocates',
      'terrorists': 'Terrorists',
      'trolls': 'Trolls',
      'neutral': 'Neutral'
    };
    return segmentMap[quadrantType.toLowerCase()] || quadrantType;
  }, [quadrantContext?.getDisplayNameForQuadrant]);

  // Track previous segmentData for comparison
  const prevSegmentDataRef = useRef<Map<string, string> | null>(null);
  
  // Compute segment values for each data point dynamically
  // This updates when data changes or when quadrant assignments change (midpoint, zones, manual assignments)
  // IMPORTANT: Use original unfiltered data from filterContext to ensure ALL points are considered,
  // not just the currently filtered/visible ones. This ensures segment calculations are complete
  // and accurate even when filters are active.
  const segmentData = useMemo(() => {
    console.log('🔍 [FilterPanel] segmentData useMemo TRIGGERED - dependencies changed', {
      hasFilterContext: !!filterContext,
      hasData: !!data,
      hasQuadrantContext: !!quadrantContext,
      hasGetQuadrantForPoint: !!quadrantContext?.getQuadrantForPoint,
      midpoint: quadrantContext?.midpoint,
      apostlesZoneSize: quadrantContext?.apostlesZoneSize,
      terroristsZoneSize: quadrantContext?.terroristsZoneSize,
      manualAssignmentsSize: quadrantContext?.manualAssignments?.size || 0,
      prevSegmentDataSize: prevSegmentDataRef.current?.size || 0
    });
    
    if (!quadrantContext?.getQuadrantForPoint) {
      console.log('🔍 [FilterPanel] Segment filter: quadrantContext not available');
      return new Map<string, string>(); // Return empty map if context not available
    }
    
    const segmentMap = new Map<string, string>();
    // IMPORTANT: Use original unfiltered data, not the filtered data prop
    // This ensures segment calculations are based on ALL points, not just visible ones
    // SPECIAL CASE: When forceLocalState is true (report filters), always use data prop
    // because filterContext.data might not be initialized yet when report is opened first
    // CRITICAL: If data prop is empty, fall back to filterContext.data as safety net
    const originalData = (forceLocalState && reportId)
      ? ((data && data.length > 0) ? data : (filterContext?.data || []))
      : (filterContext?.data || data);
    const activeData = originalData.filter(item => !item.excluded);
    const getQuadrantForPoint = quadrantContext.getQuadrantForPoint;
    
    activeData.forEach(item => {
      const quadrant = getQuadrantForPoint(item);
      segmentMap.set(item.id, quadrant);
    });
    
    // Compare with previous to detect actual changes
    const prevMap = prevSegmentDataRef.current;
    let hasChanges = !prevMap || prevMap.size !== segmentMap.size;
    if (!hasChanges && prevMap) {
      // Check if any entries changed
      const entries = Array.from(segmentMap.entries());
      for (const [id, segment] of entries) {
        if (prevMap.get(id) !== segment) {
          hasChanges = true;
          console.log(`🔍 [FilterPanel] Segment changed for ${id}: ${prevMap.get(id)} → ${segment}`);
          break;
        }
      }
    }
    
    console.log('🔍 [FilterPanel] Segment filter: computed', segmentMap.size, 'segments from', activeData.length, 'original points', {
      hasChanges,
      mapReferenceChanged: prevMap !== segmentMap,
      segmentDataReference: segmentMap
    });
    
    // Log segment distribution for debugging
    const segmentCounts: Record<string, number> = {};
    segmentMap.forEach((segment) => {
      segmentCounts[segment] = (segmentCounts[segment] || 0) + 1;
    });
    console.log('🔍 [FilterPanel] Segment distribution (ALL segments computed):', segmentCounts);
    console.log('🔍 [FilterPanel] Segment map entries:', Array.from(segmentMap.entries()));
    console.log('🔍 [FilterPanel] Has near_apostles in segmentData?', {
      hasNearApostles: 'near_apostles' in segmentCounts,
      nearApostlesCount: segmentCounts['near_apostles'] || 0,
      allSegmentKeys: Object.keys(segmentCounts)
    });
    
    // Store for next comparison
    prevSegmentDataRef.current = segmentMap;
    
    return segmentMap;
  }, [
    filterContext?.data, // Use original data from context
    data, // Fallback to prop if context not available (CRITICAL for report filters when opened first)
    quadrantContext?.getQuadrantForPoint, 
    quadrantContext?.midpoint?.sat, // Watch individual values, not object reference
    quadrantContext?.midpoint?.loy, // Watch individual values, not object reference
    quadrantContext?.apostlesZoneSize, 
    quadrantContext?.terroristsZoneSize, 
    quadrantContext?.manualAssignments,
    forceLocalState, // Include to ensure recalculation when switching between main/report filters
    reportId // Include to ensure recalculation when reportId changes
    // NOTE: showSpecialZones and showNearApostles are NOT included here because they only affect
    // visibility/filtering, not the actual segment assignments. Including them causes unnecessary
    // recalculations and potential infinite loops.
  ]);
  
  // Compute recommendation category data (Detractors/Passives/Promoters) for Recommendation Score section
  // Similar to segmentData, but computed from loyalty values and scale
  const categoryData = useMemo(() => {
    // Only compute if we're in Recommendation Score context and have loyalty scale
    if (reportId !== 'recommendationScoreSection' || !loyaltyScale) {
      return new Map<string | number, string>();
    }
    
    // Get data source (same logic as segmentData)
    const dataToUse = (forceLocalState && reportId)
      ? ((data && data.length > 0) ? data : (filterContext?.data || []))
      : (filterContext?.data || data);
    
    const activeData = dataToUse.filter(item => !item.excluded);
    
    if (activeData.length === 0) {
      return new Map<string | number, string>();
    }
    
    const categoryMap = new Map<string | number, string>();
    
    activeData.forEach(item => {
      try {
        const category = categorizeLoyaltyValue(item.loyalty, loyaltyScale);
        categoryMap.set(item.id, category);
      } catch (error) {
        console.warn(`🔍 [FilterPanel] Failed to categorize loyalty value ${item.loyalty} for item ${item.id}:`, error);
      }
    });
    
    return categoryMap;
  }, [
    reportId,
    loyaltyScale,
    filterContext?.data,
    data,
    forceLocalState
  ]);
  
  // Get available fields for attribute filtering (excluding excluded items)
  // CRITICAL: Always use original unfiltered data from context for availableFields
  // This ensures fields are available even when filters are applied
  // SPECIAL CASE: When forceLocalState is true (report filters), always use data prop
  // because filterContext.data might not be initialized yet when report is opened first
  const availableFields = useMemo(() => {
    // ROBUST DATA SOURCE: Always ensure we have data
    // Priority: 1) data prop, 2) filterContext.data, 3) empty array (last resort)
    let dataToUse: DataPoint[];
    if (forceLocalState && reportId) {
      // For report filters, prefer data prop (originalData), but ALWAYS fall back to filterContext.data
      dataToUse = (data && data.length > 0) 
        ? data 
        : (filterContext?.data && filterContext.data.length > 0 
            ? filterContext.data 
            : []);
    } else {
      // For main filters, use filterContext.data (original unfiltered data) as primary source
      dataToUse = (filterContext?.data && filterContext.data.length > 0) 
        ? filterContext.data 
        : (data && data.length > 0 ? data : []);
    }
    
    const activeData = dataToUse.filter(item => !item.excluded);
    
    console.log('🔍 [FilterPanel] availableFields calculation:', {
      hasFilterContext: !!filterContext,
      filterContextDataLength: filterContext?.data?.length || 0,
      dataPropLength: data?.length || 0,
      dataToUseLength: dataToUse?.length || 0,
      activeDataLength: activeData.length,
      reportId,
      forceLocalState,
      usingDataProp: forceLocalState && reportId && data && data.length > 0,
      usingFilterContextData: (forceLocalState && reportId && (!data || data.length === 0) && !!filterContext?.data) ||
                              (!forceLocalState && !!filterContext?.data)
    });
    
    // CRITICAL: Only return empty if we truly have no data at all
    // This prevents filter structure from breaking when data prop is temporarily empty
    if (activeData.length === 0) {
      console.warn('🔍 [FilterPanel] availableFields: No active data available', {
        dataToUseLength: dataToUse.length,
        activeDataLength: activeData.length,
        reportId,
        forceLocalState,
        dataPropLength: data?.length || 0,
        filterContextDataLength: filterContext?.data?.length || 0,
        note: 'Filter structure will be preserved from existing state'
      });
      // Return empty array - filter structure will be preserved from existing state
      return [];
    }
    
    const fields = new Set<string>();
    const counts: Record<string, Record<string | number, number>> = {};
    
    // First, add standard fields from data
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
    
    // Add computed recommendationCategory field if in Recommendation Score context
    // Only include categories that are actually present in the data
    if (categoryData.size > 0) {
      fields.add('recommendationCategory');
      const categoryCounts: Record<string | number, number> = {};
      
      categoryData.forEach((category) => {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
      
      // Store category counts for this field
      counts['recommendationCategory'] = categoryCounts;
      
      console.log('🔍 [FilterPanel] RecommendationCategory filter: added to availableFields', {
        categoryCounts,
        totalCategories: Object.keys(categoryCounts).length
      });
    }
    
    // Add computed segment field if quadrant context is available
    // Only include segments that are actually present in the data
    if (segmentData.size > 0) {
      fields.add('segment');
      const segmentCounts: Record<string | number, number> = {};
      const availableSegments = new Set<string>();
      
      segmentData.forEach((segment) => {
        segmentCounts[segment] = (segmentCounts[segment] || 0) + 1;
        availableSegments.add(segment);
      });
      
      // Get Areas mode directly from context (just like isClassicModel)
      const showSpecialZones = quadrantContext?.showSpecialZones ?? false;
      const showNearApostles = quadrantContext?.showNearApostles ?? false;
      
      // Filter segment counts based on display mode
      const filteredSegmentCounts: Record<string | number, number> = {};
      const mainSegments = ['hostages', 'loyalists', 'mercenaries', 'defectors'];
      const specialZoneSegments = ['apostles', 'advocates', 'terrorists', 'trolls'];
      const nearApostlesSegments = ['near_apostles', 'near_advocates', 'near-apostles', 'near-advocates'];
      
      console.log('🔍 [FilterPanel] Filtering segments - Input:', {
        segmentCounts,
        showSpecialZones,
        showNearApostles,
        allSegmentKeys: Object.keys(segmentCounts)
      });
      
      // Always include main segments (if they exist in data)
      mainSegments.forEach(segment => {
        if (segmentCounts[segment]) {
          filteredSegmentCounts[segment] = segmentCounts[segment];
          console.log(`🔍 [FilterPanel] Added main segment: ${segment} = ${segmentCounts[segment]}`);
        }
      });
      
      // Include apostles/advocates/terrorists/trolls ONLY when "Main Areas" or "All Areas" is active
      if (showSpecialZones) {
        console.log('🔍 [FilterPanel] showSpecialZones is TRUE - checking for special zone segments');
        // Check all segments in segmentCounts and include any that match special zone names
        Object.keys(segmentCounts).forEach(segmentKey => {
          const segmentKeyLower = String(segmentKey).toLowerCase();
          const isSpecialZone = specialZoneSegments.some(s => s.toLowerCase() === segmentKeyLower);
          console.log(`🔍 [FilterPanel] Checking segment "${segmentKey}" (lowercase: "${segmentKeyLower}") - isSpecialZone: ${isSpecialZone}`);
          if (isSpecialZone) {
            filteredSegmentCounts[segmentKey] = segmentCounts[segmentKey];
            console.log(`🔍 [FilterPanel] ✅ Added special zone segment: ${segmentKey} = ${segmentCounts[segmentKey]}`);
          } else {
            console.log(`🔍 [FilterPanel] ❌ Skipped segment "${segmentKey}" - not in specialZoneSegments list`);
          }
        });
      } else {
        console.log('🔍 [FilterPanel] showSpecialZones is FALSE - skipping special zone segments');
      }
      
      // Include near_apostles/near_advocates ONLY when "All Areas" is active
      if (showNearApostles) {
        // First, check all segments in segmentCounts and include any that match near-apostles names
        let foundNearApostlesCount = 0;
        let foundNearApostlesKey: string | number | null = null;
        
        // Debug: Check what's in segmentCounts before filtering
        console.log('🔍 [FilterPanel] Checking for near-apostles in segmentCounts:', {
          segmentCountsKeys: Object.keys(segmentCounts),
          segmentCounts: segmentCounts,
          nearApostlesSegmentsToMatch: nearApostlesSegments
        });
        
        Object.keys(segmentCounts).forEach(segmentKey => {
          const segmentKeyLower = String(segmentKey).toLowerCase();
          if (nearApostlesSegments.some(s => s.toLowerCase() === segmentKeyLower)) {
            const count = segmentCounts[segmentKey];
            // Use the actual key from segmentCounts (might be near_apostles, near-apostles, etc.)
            filteredSegmentCounts[segmentKey] = count;
            foundNearApostlesCount = count;
            foundNearApostlesKey = segmentKey;
            console.log('🔍 [FilterPanel] Found near-apostles segment in data:', { 
              segmentKey, 
              count,
              usingKey: segmentKey,
              addedToFiltered: filteredSegmentCounts[segmentKey]
            });
          }
        });
        
        // Also, if no near-apostles segments exist in data yet, include them with count 0
        // This ensures the filter option appears even when there are no points assigned to it
        const hasNearApostlesInData = foundNearApostlesKey !== null;
        
        console.log('🔍 [FilterPanel] Near-apostles check result:', {
          hasNearApostlesInData,
          foundNearApostlesKey,
          foundNearApostlesCount,
          segmentCountsKeys: Object.keys(segmentCounts),
          filteredSegmentCountsKeys: Object.keys(filteredSegmentCounts),
          filteredSegmentCounts: filteredSegmentCounts
        });
        
        if (!hasNearApostlesInData) {
          // Always use 'near_apostles' internally (QuadrantType)
          // getDisplayNameForQuadrant will convert it to "Near-Apostles" or "Near-Advocates" based on isClassicModel
          filteredSegmentCounts['near_apostles'] = 0;
          console.log('🔍 [FilterPanel] Added near_apostles with count 0 (no data found). Final filteredSegmentCounts:', filteredSegmentCounts);
        } else {
          // Make sure we're using the correct key - if we found it with a different key name,
          // we should also ensure 'near_apostles' is in the map for consistency
          if (foundNearApostlesKey !== 'near_apostles') {
            // Also add it with the standard name for consistency
            filteredSegmentCounts['near_apostles'] = foundNearApostlesCount;
            console.log('🔍 [FilterPanel] Also added near_apostles with standard name, count:', foundNearApostlesCount);
          }
        }
      }
      
      counts['segment'] = filteredSegmentCounts;
      
      console.log('🔍 [FilterPanel] Segment filter: FINAL RESULT - added to availableFields', {
        originalCounts: segmentCounts,
        filteredCounts: filteredSegmentCounts,
        filteredCountsKeys: Object.keys(filteredSegmentCounts),
        filteredCountsEntries: Object.entries(filteredSegmentCounts),
        showSpecialZones,
        showNearApostles,
        mode: showSpecialZones && showNearApostles ? 'All Areas' : showSpecialZones ? 'Main Areas' : 'No Areas',
        availableSegments: Array.from(availableSegments),
        willHaveSegmentField: Object.keys(filteredSegmentCounts).length > 0
      });
    } else {
      console.log('🔍 [FilterPanel] Segment filter: segmentData is empty, not adding segment field');
    }
    
    const fieldsList = Array.from(fields).map(field => ({
      field,
      values: Object.keys(counts[field] || {}),
      counts: counts[field] || {}
    }));
    
    console.log('🔍 [FilterPanel] Available fields:', fieldsList.map(f => f.field));
    return fieldsList;
  }, [
    filterContext?.data, // Use original data from context - this ensures fields are always available
    data, // Fallback to prop if context not available (CRITICAL for report filters when opened first)
    data?.length, // CRITICAL: Include length to ensure recalculation when data changes from empty to populated
    segmentData,
    categoryData,
    loyaltyScale,
    quadrantContext?.showSpecialZones, 
    quadrantContext?.showNearApostles,
    forceLocalState, // Include to ensure recalculation when switching between main/report filters
    reportId // Include to ensure recalculation when reportId changes
  ]); // Include Areas mode to recalculate when it changes

  // Get filter state - ensure it's reactive to context changes
  // Access filterState directly from context - React Context will trigger re-renders automatically
  const filterState = forceLocalState && reportId && filterContext
    ? filterContext.getReportFilterState(reportId)
    : (filterContext?.filterState || localFilterState);
  
  // Note: filterState is reactive - React Context will trigger re-renders when it changes
  
  // Create type-safe setter functions
  const setFilterState = (newState: FilterState | ((prev: FilterState) => FilterState)) => {
    const stateToSet = typeof newState === 'function' ? newState(filterState) : newState;
    
    console.log('🔴 [FilterPanel] setFilterState called:', {
      forceLocalState,
      reportId,
      isUpdating: isUpdatingStateRef.current,
      hasLastState: !!lastSetStateRef.current
    });
    
    // Prevent infinite loops - if we're already updating, skip
    if (isUpdatingStateRef.current) {
      console.log('🔍 [FilterPanel] setFilterState: Already updating, skipping to prevent loop');
      return;
    }
    
    // Check if state actually changed (compare attributes properly to avoid unnecessary updates)
    // NOTE: This is a safety check - if the state truly hasn't changed, we can skip
    // But we need to be careful not to block legitimate user actions
    const lastState = lastSetStateRef.current;
    if (lastState) {
      // Compare attributes - find matching attributes by field name (not by index, in case order changes)
      const attributesChanged = stateToSet.attributes.length !== lastState.attributes.length ||
        stateToSet.attributes.some((attr) => {
          const lastAttr = lastState.attributes.find(a => a.field === attr.field);
          if (!lastAttr) return true; // New attribute added
          // Compare Sets by size and content
          if (attr.values.size !== lastAttr.values.size) return true;
          // Convert Sets to arrays for iteration
          const attrValues = Array.from(attr.values);
          for (const val of attrValues) {
            if (!lastAttr.values.has(val)) return true;
          }
          return false;
        }) ||
        // Also check if any attributes were removed
        lastState.attributes.some((lastAttr) => {
          return !stateToSet.attributes.some(attr => attr.field === lastAttr.field);
        });
      
      const stateChanged = 
        attributesChanged ||
        stateToSet.dateRange.startDate !== lastState.dateRange.startDate ||
        stateToSet.dateRange.endDate !== lastState.dateRange.endDate ||
        stateToSet.isActive !== lastState.isActive;
      
      if (!stateChanged) {
        console.log('🔍 [FilterPanel] setFilterState: State unchanged, skipping (this is normal for re-renders)');
        return;
      } else {
        console.log('🔍 [FilterPanel] setFilterState: State changed, proceeding with update');
      }
    }
    
    // Mark initialization as complete if this is a user action
    if (isInitializing) {
      setIsInitializing(false);
    }
    
    // Track user changes
    setHasUserMadeChanges(true);
    
    // Store the state we're setting
    lastSetStateRef.current = stateToSet;
    
    // Set flag to prevent re-entry
    isUpdatingStateRef.current = true;
    
    try {
      // IMPORTANT: Apply filters FIRST (before updating context state)
      // This ensures we have the correct filtered data ready
      applyFiltersWithState(stateToSet);
      
      // THEN update context state (which will trigger re-renders)
      if (forceLocalState && reportId && filterContext) {
        console.log('🔴 [FilterPanel] setFilterState - About to call setReportFilterState:', {
          reportId,
          attributeCount: stateToSet.attributes.filter(a => a.values.size > 0).length,
          totalSelectedValues: stateToSet.attributes.reduce((sum, a) => sum + a.values.size, 0),
          datePreset: stateToSet.dateRange.preset,
          isActive: stateToSet.isActive
        });
        // For report filters, update report state
        filterContext.setReportFilterState(reportId, stateToSet);
        console.log('🔴 [FilterPanel] setFilterState - setReportFilterState called successfully');
      } else if (filterContext) {
        // For main filters, update main state
        // Note: handleSetFilterState will skip recalculation for segment filters
        filterContext.setFilterState(stateToSet);
      } else {
        // Fallback to local state
        setLocalFilterState(stateToSet);
      }
    } finally {
      // Reset flag after a brief delay to allow state updates to propagate
      setTimeout(() => {
        isUpdatingStateRef.current = false;
      }, 100);
    }
  };

  // Apply filters with a specific state (for reactive updates)
  const applyFiltersWithState = useCallback((stateToUse: FilterState) => {
    const { dateRange, attributes } = stateToUse;
    
    // IMPORTANT: Always filter from the original unfiltered data, not from already-filtered data
    // Use filterContext.data if available (original data), otherwise fall back to data prop
    // SPECIAL CASE: When forceLocalState is true (report filters), always use data prop
    // because filterContext.data might not be initialized yet when report is opened first
    // CRITICAL: If data prop is empty, fall back to filterContext.data as safety net
    const originalData = (forceLocalState && reportId)
      ? ((data && data.length > 0) ? data : (filterContext?.data || []))
      : (filterContext?.data || data);
    
    const filteredData = originalData.filter(item => {
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
        
        // Handle computed fields differently
        let itemValue: any;
        if (attr.field === 'recommendationCategory') {
          // RecommendationCategory is a computed field, get it from categoryData map
          // IMPORTANT: Recompute category for this item if categoryData is not available
          // This ensures filtering works even if categoryData hasn't been computed yet
          if (categoryData.size === 0 && loyaltyScale) {
            // Fallback: compute category on the fly
            try {
              itemValue = categorizeLoyaltyValue(item.loyalty, loyaltyScale);
            } catch (error) {
              console.warn(`🔍 [FilterPanel] RecommendationCategory filter: Failed to compute category for ${item.id}:`, error);
              return false;
            }
          } else {
            itemValue = categoryData.get(item.id);
            
            // If not in categoryData map, try computing on the fly as fallback
            if (itemValue === undefined && loyaltyScale) {
              try {
                itemValue = categorizeLoyaltyValue(item.loyalty, loyaltyScale);
              } catch (error) {
                console.warn(`🔍 [FilterPanel] RecommendationCategory filter: Failed to compute category for ${item.id}:`, error);
                return false;
              }
            }
          }
          
          if (itemValue === undefined || itemValue === null) {
            console.warn(`🔍 [FilterPanel] RecommendationCategory filter: No category found for point ${item.id}, excluding`);
            return false; // If category can't be determined, exclude the item
          }
        } else if (attr.field === 'segment') {
          // Segment is a computed field, get it from segmentData map
          // IMPORTANT: Recompute segment for this item if segmentData is not available
          // This ensures filtering works even if segmentData hasn't been computed yet
          if (segmentData.size === 0 && quadrantContext?.getQuadrantForPoint) {
            // Fallback: compute segment on the fly
            itemValue = quadrantContext.getQuadrantForPoint(item);
            console.log(`🔍 [FilterPanel] Segment filter: Computed segment on-the-fly for ${item.id}: ${itemValue}`);
          } else {
            itemValue = segmentData.get(item.id);
            
            // If not in segmentData map, try computing on the fly as fallback
            if (itemValue === undefined && quadrantContext?.getQuadrantForPoint) {
              itemValue = quadrantContext.getQuadrantForPoint(item);
              console.log(`🔍 [FilterPanel] Segment filter: Item ${item.id} not in segmentData map, computed on-the-fly: ${itemValue}`);
            }
          }
          
          if (itemValue === undefined || itemValue === null) {
            console.warn(`🔍 [FilterPanel] Segment filter: No segment found for point ${item.id}, excluding`);
            return false; // If segment can't be determined, exclude the item
          }
        } else {
          // Standard field from data
          itemValue = (item as any)[attr.field];
        }
        
        // Convert both values to strings for comparison to handle type mismatches
        const itemValueStr = String(itemValue);
        const selectedValues = Array.from(attr.values).map(v => String(v));
        const hasMatch = selectedValues.includes(itemValueStr);
        
        if (!hasMatch) {
          // Only log if debugging (remove in production)
          // console.log(`🔍 [FilterPanel] Segment filter: Item ${item.id} segment "${itemValueStr}" not in selected values:`, selectedValues);
          return false;
        }
      }
      
      return true;
    });
    
    // Log filtering results for debugging
    const segmentFilter = attributes.find(attr => attr.field === 'segment' && attr.values.size > 0);
    if (segmentFilter) {
      const loyaltyRange = filteredData.length > 0 ? {
        min: Math.min(...filteredData.map(item => item.loyalty)),
        max: Math.max(...filteredData.map(item => item.loyalty))
      } : null;
      const satisfactionRange = filteredData.length > 0 ? {
        min: Math.min(...filteredData.map(item => item.satisfaction)),
        max: Math.max(...filteredData.map(item => item.satisfaction))
      } : null;
      
      console.log(`🔍 [FilterPanel] Segment filter applied:`, {
        selectedSegments: Array.from(segmentFilter.values),
        originalCount: originalData.filter(item => !item.excluded).length,
        filteredCount: filteredData.length,
        segmentDataSize: segmentData.size,
        hasQuadrantContext: !!quadrantContext,
        hasGetQuadrantForPoint: !!quadrantContext?.getQuadrantForPoint,
        usingOriginalData: originalData === filterContext?.data,
        loyaltyRange,
        satisfactionRange,
        sampleFilteredData: filteredData.slice(0, 5).map(item => ({ 
          id: item.id, 
          name: item.name,
          sat: item.satisfaction,
          loy: item.loyalty,
          segment: segmentData.get(item.id) || (quadrantContext?.getQuadrantForPoint ? quadrantContext.getQuadrantForPoint(item) : 'unknown')
        }))
      });
      
      // If no items matched, log sample segments from original data
      if (filteredData.length === 0) {
        const sampleData = originalData.filter(item => !item.excluded).slice(0, 10);
        const sampleSegments = sampleData.map(item => {
          const segment = segmentData.get(item.id) || (quadrantContext?.getQuadrantForPoint ? quadrantContext.getQuadrantForPoint(item) : 'unknown');
          return { id: item.id, segment };
        });
        console.warn(`🔍 [FilterPanel] Segment filter: No items matched! Sample segments from data:`, sampleSegments);
        console.warn(`🔍 [FilterPanel] Selected segments were:`, Array.from(segmentFilter.values));
      }
    }
    
    // Check if filters are active
    // Respect explicit isActive=false from state (e.g., when filter is reset)
    // Otherwise calculate based on dateRange and attributes
    let isActive: boolean;
    const wasExplicitlyFalse = stateToUse.isActive === false;
    
    if (wasExplicitlyFalse) {
      // Explicitly set to false - respect it (e.g., after a reset)
      isActive = false;
    } else {
      // Calculate based on actual filter state
      // For date filters, only count if preset is not 'all' and dates are set
      const hasDateFilter = dateRange.preset && 
                            dateRange.preset !== 'all' && 
                            (dateRange.startDate !== null || dateRange.endDate !== null);
      const hasAttributeFilters = attributes.some(attr => attr.values.size > 0);
      isActive = hasDateFilter || hasAttributeFilters;
      
      // Update state with calculated isActive if it changed (but don't override explicit false)
      // CRITICAL: Never update state if isActive was explicitly set to false (e.g., during reset)
      // Also skip if we're currently validating to prevent infinite loops
      const isCurrentlyValidating = isValidatingRef.current;
      if (stateToUse.isActive !== isActive && 
          !wasExplicitlyFalse && 
          !isCurrentlyValidating) {
        const updatedState = { ...stateToUse, isActive };
        // Update state asynchronously to avoid state update during render
        setTimeout(() => {
          setFilterState(updatedState);
        }, 0);
      }
    }
    
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
        // For segment field, use display names
        let displayValue = Array.from(attr.values).join(', ');
        if (attr.field === 'segment') {
          displayValue = Array.from(attr.values)
            .map(v => getSegmentDisplayName(String(v)))
            .join(', ');
        }
        activeFilters.push({
          type: 'attribute',
          label: attr.field === 'segment' ? 'Segment' : attr.field === 'recommendationCategory' ? 'Category' : getFieldDisplayName(attr.field),
          value: displayValue
        });
      }
    });
    
    // Update filtered data in FilterContext
    // CRITICAL: Only update main filteredData if this is NOT a report filter (forceLocalState=false)
    // Report filters (forceLocalState=true) should NEVER update main filteredData
    // They only affect report-specific data via getReportFilteredData
    if (filterContext && !forceLocalState) {
      const hasSegmentFilter = attributes.some(attr => attr.field === 'segment' && attr.values.size > 0);
      
      if (hasSegmentFilter) {
        // For segment filters, FilterContext can't filter correctly (no access to quadrantContext)
        // So we set the filtered data directly and IMMEDIATELY (synchronously)
        console.log(`🔍 [FilterPanel] Setting filteredData for segment filter (SYNC):`, {
          filteredDataLength: filteredData.length,
          originalDataLength: originalData.filter(item => !item.excluded).length,
          selectedSegments: Array.from(attributes.find(attr => attr.field === 'segment')?.values || []),
          sampleFilteredIds: filteredData.slice(0, 5).map(item => item.id)
        });
        
        // Set filtered data SYNCHRONOUSLY - don't use requestAnimationFrame
        // This ensures it's set before any re-renders happen
        filterContext.setFilteredData(filteredData);
        
        console.log(`🔍 [FilterPanel] Set filteredData for segment filter (SYNC):`, {
          filteredDataLength: filteredData.length,
          contextFilteredDataLength: filterContext.filteredData?.length
        });
      } else {
        // For non-segment filters, also set filteredData directly to ensure it's updated immediately
        // FilterContext will recalculate in handleSetFilterState, but we want consistency
        filterContext.setFilteredData(filteredData);
        console.log(`🔍 [FilterPanel] Set filteredData for non-segment filter:`, {
          filteredDataLength: filteredData.length,
          originalDataLength: originalData.filter(item => !item.excluded).length,
          activeFilters: attributes.filter(attr => attr.values.size > 0).map(attr => ({
            field: attr.field,
            values: Array.from(attr.values)
          }))
        });
      }
    } else if (forceLocalState) {
      // Report filter - do NOT update main filteredData
      // Report filters only affect report-specific data via getReportFilteredData
      console.log(`🔍 [FilterPanel] Report filter (forceLocalState=true) - NOT updating main filteredData`, {
        filteredDataLength: filteredData.length,
        reportId,
        note: 'Report filters only affect report data via getReportFilteredData'
      });
    }
    
    // Call onFilterChange callback with filterState for notifications
    onFilterChange(filteredData, activeFilters, stateToUse);
    
    // Mark initialization complete after first apply
    if (isInitializing) {
      console.log(`🔌 [FilterPanel] Marking initialization complete`);
      setIsInitializing(false);
    }
  }, [filterContext, forceLocalState, reportId, data, onFilterChange, isInitializing, segmentData, categoryData, loyaltyScale, quadrantContext?.getQuadrantForPoint, filterContext?.data]);

  // Track previous values to detect which dependency changed
  const prevDepsRef = useRef<{
    segmentData: Map<string, string> | null;
    midpoint: { sat: number; loy: number } | null;
    apostlesZoneSize: number | null;
    terroristsZoneSize: number | null;
    manualAssignmentsSize: number | null;
  }>({
    segmentData: null,
    midpoint: null,
    apostlesZoneSize: null,
    terroristsZoneSize: null,
    manualAssignmentsSize: null
  });

  // Re-apply filters when segmentData changes (e.g., midpoint moved, zones resized, points reassigned)
  // This ensures segment filters stay up-to-date when quadrant assignments change
  // Strategy: Reset to unfiltered state first, then immediately re-apply the segment filter
  // IMPORTANT: This effect runs even when the panel is closed - filters must stay in sync
  // CRITICAL: This effect should ONLY run for main filters (forceLocalState=false)
  // Report filters should NEVER trigger this effect as they don't affect main filteredData
  useEffect(() => {
    // CRITICAL: Skip entirely if this is a report filter (forceLocalState=true)
    // Report filters should never reset or re-apply main filteredData
    if (forceLocalState) {
      console.log('🔍 [FilterPanel] Segment data change effect SKIPPED for report filter', {
        reportId,
        note: 'Report filters should not affect main filteredData'
      });
      return;
    }
    
    // ALWAYS log when this effect runs - this is critical for debugging
    // Use console.warn to ensure it appears in logs
    console.warn('🔍 [FilterPanel] useEffect for quadrant changes - ENTRY POINT (MAIN FILTER ONLY)', {
      timestamp: Date.now(),
      isOpen,
      isInitializing,
      hasSegmentData: !!segmentData,
      segmentDataSize: segmentData?.size || 0,
      effectRunId: Math.random() // Force unique log
    });
    
    const prevDeps = prevDepsRef.current;
    const currentDeps = {
      segmentData,
      midpoint: quadrantContext?.midpoint ?? null,
      apostlesZoneSize: quadrantContext?.apostlesZoneSize ?? null,
      terroristsZoneSize: quadrantContext?.terroristsZoneSize ?? null,
      manualAssignmentsSize: quadrantContext?.manualAssignments?.size ?? null
    };
    
    // Detect which dependency changed
    const changedDeps: string[] = [];
    if (prevDeps.segmentData !== currentDeps.segmentData) changedDeps.push('segmentData');
    if (prevDeps.midpoint?.sat !== currentDeps.midpoint?.sat || prevDeps.midpoint?.loy !== currentDeps.midpoint?.loy) changedDeps.push('midpoint');
    if (prevDeps.apostlesZoneSize !== currentDeps.apostlesZoneSize) changedDeps.push('apostlesZoneSize');
    if (prevDeps.terroristsZoneSize !== currentDeps.terroristsZoneSize) changedDeps.push('terroristsZoneSize');
    if (prevDeps.manualAssignmentsSize !== currentDeps.manualAssignmentsSize) changedDeps.push('manualAssignments');
    
    console.log('🔍 [FilterPanel] useEffect for quadrant changes RUNNING', {
      changedDeps,
      isInitializing,
      hasSegmentData: !!segmentData,
      segmentDataSize: segmentData?.size || 0,
      hasFilterContext: !!filterContext,
      prevDeps,
      currentDeps
    });
    
    // Only re-apply if:
    // 1. Not initializing
    // 2. A segment filter is active
    // NOTE: We don't check isUpdatingStateRef here because quadrant changes should ALWAYS trigger
    // a re-application, even during filter state updates. This ensures filters stay in sync.
    if (isInitializing) {
      console.log('🔍 [FilterPanel] useEffect EARLY RETURN: isInitializing=true');
      prevDepsRef.current = currentDeps;
      return;
    }

    const currentState = getEffectiveFilterState();
    const hasSegmentFilter = currentState.attributes.some(
      attr => attr.field === 'segment' && attr.values.size > 0
    );
    
    console.log('🔍 [FilterPanel] useEffect check results:', {
      hasSegmentFilter,
      hasFilterContext: !!filterContext,
      currentStateAttributes: currentState.attributes.map(a => ({ field: a.field, valuesSize: a.values.size }))
    });

    if (!hasSegmentFilter) {
      console.log('🔍 [FilterPanel] useEffect EARLY RETURN: No active segment filter');
      prevDepsRef.current = currentDeps;
      return;
    }

    if (!filterContext) {
      console.log('🔍 [FilterPanel] useEffect EARLY RETURN: No filterContext');
      prevDepsRef.current = currentDeps;
      return;
    }

    if (hasSegmentFilter && filterContext) {
      const selectedSegments = Array.from(
        currentState.attributes.find(attr => attr.field === 'segment')?.values || []
      );
      
      console.log('🔍 [FilterPanel] Segment data changed, resetting and re-applying segment filter', {
        segmentDataSize: segmentData.size,
        selectedSegments,
        quadrantChanges: {
          midpoint: quadrantContext?.midpoint,
          apostlesZoneSize: quadrantContext?.apostlesZoneSize,
          terroristsZoneSize: quadrantContext?.terroristsZoneSize,
          manualAssignmentsSize: quadrantContext?.manualAssignments?.size || 0
        }
      });

      // Temporarily set flag to prevent recursive calls, but allow this quadrant-change re-application
      const wasUpdating = isUpdatingStateRef.current;
      isUpdatingStateRef.current = true;

      try {
        // STEP 1: Reset filtered data to original unfiltered data (clear the filter)
        // This ensures we start from a clean slate - recalculate from unfiltered position
        // CRITICAL: Only reset main filteredData if this is NOT a report filter (forceLocalState=false)
        // Report filters should NEVER reset main filteredData
        const originalData = filterContext.data || data;
        const unfilteredData = originalData.filter(item => !item.excluded);
        
        // Only reset main filteredData if this is the main filter panel (not a report filter)
        if (!forceLocalState && filterContext) {
          // Set the unfiltered data synchronously
          filterContext.setFilteredData(unfilteredData);
          
          console.log('🔍 [FilterPanel] Reset filteredData to unfiltered state (main filter):', {
            unfilteredCount: unfilteredData.length,
            originalCount: originalData.length
          });
        } else if (forceLocalState) {
          console.log('🔍 [FilterPanel] Segment data changed for report filter - NOT resetting main filteredData', {
            reportId,
            unfilteredCount: unfilteredData.length,
            note: 'Report filters should not affect main filteredData'
          });
        }

        // STEP 2: Immediately re-apply the segment filter with the new segment assignments
        // This happens synchronously right after the reset, so it's "in a blink of an eye"
        // The filter will recalculate based on the NEW segment assignments from the updated segmentData
        applyFiltersWithState(currentState);
        
        console.log('🔍 [FilterPanel] Re-applied segment filter after reset');
      } finally {
        // Restore the previous flag state (don't reset to false if it was already true)
        // This prevents interfering with ongoing filter state updates
        isUpdatingStateRef.current = wasUpdating;
      }
    }
    
    // Update previous deps for next comparison
    prevDepsRef.current = currentDeps;
  }, [
    segmentData, 
    isInitializing, 
    filterContext, 
    data,
    // Also watch quadrant-related changes that affect segment assignments
    // Watch individual midpoint values, not object reference
    quadrantContext?.midpoint?.sat,
    quadrantContext?.midpoint?.loy,
    quadrantContext?.apostlesZoneSize,
    quadrantContext?.terroristsZoneSize,
    quadrantContext?.manualAssignments
    // NOTE: getEffectiveFilterState and applyFiltersWithState are NOT in dependencies
    // because they are useCallback hooks that might change frequently. Instead, we call them
    // directly inside the effect when needed.
  ]);

  // Reactive filtering: validate and reset filters when data changes
  const validateAndResetFilters = useCallback(() => {
    // Prevent concurrent executions
    if (isValidatingRef.current) {
      console.log('🔍 [FilterPanel] validateAndResetFilters: Already validating, skipping to prevent concurrent execution');
      return;
    }
    
    isValidatingRef.current = true;
    try {
      const currentState = filterState;
      let needsReset = false;
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
          newFilterState.isActive = false; // Ensure isActive is false when resetting
          needsReset = true;
          
          // Show notification to user (only once per reset for this preset)
          // Set the ref IMMEDIATELY (synchronously) before showing notification to prevent race conditions
          const presetKey = currentState.dateRange.preset || '';
          if (onShowNotification && lastNotifiedPresetRef.current !== presetKey) {
            // Set ref FIRST to prevent duplicate notifications from concurrent calls
            lastNotifiedPresetRef.current = presetKey;
            const presetLabel = relevantDatePresets.find(p => p.key === currentState.dateRange.preset)?.label || 'filter';
            onShowNotification({
              title: 'Filter Reset',
              message: `"${presetLabel}" filter was automatically reset because this option is no longer available.`,
              type: 'warning'
            });
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
            newFilterState.isActive = false; // Ensure isActive is false when resetting
            needsReset = true;
            
            // Show notification to user (only once per reset for this preset)
            // Set the ref IMMEDIATELY (synchronously) before showing notification to prevent race conditions
            const presetKey = currentState.dateRange.preset || '';
            if (onShowNotification && lastNotifiedPresetRef.current !== presetKey) {
              // Set ref FIRST to prevent duplicate notifications from concurrent calls
              lastNotifiedPresetRef.current = presetKey;
              const presetLabel = relevantDatePresets.find(p => p.key === currentState.dateRange.preset)?.label || 'filter';
              onShowNotification({
                title: 'Filter Reset',
                message: `"${presetLabel}" filter was automatically reset because no data matches this criteria.`,
                type: 'warning'
              });
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
        // Update state first, then apply filters
        // This ensures isActive=false persists
        // CRITICAL: Set isActive to false BEFORE updating state to prevent loops
        newFilterState.isActive = false;
        
        // If using FilterContext, update through context to ensure filteredData is updated
        if (filterContext && !forceLocalState) {
          // Update state through context which will also update filteredData
          filterContext.setFilterState(newFilterState);
          // Apply filters to ensure filteredData is set correctly (shows all data when reset)
          setTimeout(() => {
            applyFiltersWithState(newFilterState);
          }, 0);
        } else {
          // Fallback: update local state and apply filters
          setFilterState(newFilterState);
          setTimeout(() => {
            applyFiltersWithState(newFilterState);
          }, 0);
        }
      }
    } finally {
      isValidatingRef.current = false;
    }
    // NOTE: filterState is NOT in dependencies - we read it directly inside the function
    // to avoid infinite loops when setFilterState is called
  }, [relevantDatePresets, availableFields, setFilterState, applyFiltersWithState, filterContext, localFilterState, data, onShowNotification]);

  // Create a data signature to detect changes
  const dataSignature = useMemo(() => {
    return data.map(item => `${item.id}-${item.date}-${item.excluded}`).join('|');
  }, [data]);

  // Create a stable signature of availableFields to prevent infinite loops
  const availableFieldsSignature = useMemo(() => {
    return availableFields.map(f => `${f.field}:${Object.keys(f.counts).length}`).join('|');
  }, [availableFields]);

  // Watch for data changes and validate filters
  useEffect(() => {
    // Skip if currently validating to prevent loops
    if (isValidatingRef.current) {
      return;
    }
    // Only validate if we have an active filter that might need resetting
    // Don't skip based on isActive - we need to validate even if isActive is false
    // because the preset might have changed and we need to check if it's still valid
    if (filterState.dateRange.preset && filterState.dateRange.preset !== 'all') {
      validateAndResetFilters();
    }
  }, [dataSignature, relevantDatePresets, availableFieldsSignature, validateAndResetFilters, filterState.dateRange.preset]);

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
          values: new Set<string | number>(),
          availableValues: Object.entries(field.counts).map(([value, count]) => ({
            value: isNaN(Number(value)) ? value : Number(value),
            count
          })),
          expanded: false
        }))
      }));
    }
  }, [availableFields, filterState.attributes.length, filterContext]);

  // Initialize filter state from context when panel opens
  // CRITICAL: Only sync if report state doesn't exist (initial mount), not on every state mismatch
  // Otherwise, user's filter changes will be immediately overwritten
  useEffect(() => {
    if (isOpen && filterContext) {
      // CRITICAL: For report filters, only sync if report state doesn't exist (initial mount)
      // Don't sync if states don't match - that means user has made changes
      if (forceLocalState && reportId) {
        const reportState = filterContext.reportFilterStates[reportId];
        
        // Only sync if report state doesn't exist (first time opening)
        if (!reportState) {
          console.log(`🔌 [FilterPanel] Initializing report filter ${reportId}: syncing to master state (first time)`);
          filterContext.syncReportToMaster(reportId);
          // After syncing, get the synced state
          const syncedState = filterContext.getReportFilterState(reportId);
          
          // Now ensure attributes are initialized from availableFields
          // But preserve any existing values from the synced state
          const missingFields = availableFields.filter(f => 
            !syncedState.attributes.some(a => a.field === f.field)
          );
          
          if (missingFields.length > 0) {
            const stateWithAttributes: FilterState = {
              ...syncedState,
              attributes: [
                ...syncedState.attributes, // Preserve existing attributes and their values
                ...missingFields.map(field => ({
                  field: field.field,
                  values: new Set<string | number>(), // New fields start empty
                  availableValues: Object.entries(field.counts).map(([value, count]) => ({
                    value: isNaN(Number(value)) ? value : Number(value),
                    count
                  })),
                  expanded: false
                }))
              ]
            };
            // Update report state with new attributes, preserving main state values
            isUpdatingStateRef.current = true;
            try {
              filterContext.setReportFilterState(reportId, stateWithAttributes);
            } finally {
              setTimeout(() => {
                isUpdatingStateRef.current = false;
              }, 0);
            }
          }
          setIsInitializing(true);
          setHasUserMadeChanges(false);
          return; // Early return after syncing
        }
      }
      
      const effectiveState = getEffectiveFilterState();
      
      // If using report filters and attributes are empty, initialize them from availableFields
      if (forceLocalState && reportId && effectiveState.attributes.length === 0 && availableFields.length > 0) {
        const stateWithAttributes: FilterState = {
          ...effectiveState,
          attributes: availableFields.map(field => ({
            field: field.field,
            values: new Set<string | number>(),
            availableValues: Object.entries(field.counts).map(([value, count]) => ({
              value: isNaN(Number(value)) ? value : Number(value),
              count
            })),
            expanded: false
          }))
        };
        // Initialize report state with attributes
        const reportState = filterContext.getReportFilterState(reportId);
        const shouldSync = !filterContext.compareFilterStates(reportState, stateWithAttributes);
        if (shouldSync) {
          isUpdatingStateRef.current = true;
          try {
            filterContext.setReportFilterState(reportId, stateWithAttributes);
          } finally {
            setTimeout(() => {
              isUpdatingStateRef.current = false;
            }, 0);
          }
        }
      } else {
        // Ensure all availableFields are in the state, including segment
        const updatedState = { ...effectiveState };
        const missingFields = availableFields.filter(f => 
          !updatedState.attributes.some(a => a.field === f.field)
        );
        
        // Also update existing attributes' availableValues if they've changed
        // This is important when "All Areas" is enabled after filters are opened
        let needsUpdate = missingFields.length > 0;
        updatedState.attributes = updatedState.attributes.map(attr => {
          const matchingField = availableFields.find(f => f.field === attr.field);
          if (matchingField) {
            // Update availableValues from current availableFields
            const newAvailableValues = Object.entries(matchingField.counts).map(([value, count]) => ({
              value: isNaN(Number(value)) ? value : Number(value),
              count
            }));
            
            // Check if availableValues actually changed
            const currentValuesStr = JSON.stringify(attr.availableValues?.sort((a, b) => String(a.value).localeCompare(String(b.value))));
            const newValuesStr = JSON.stringify(newAvailableValues.sort((a, b) => String(a.value).localeCompare(String(b.value))));
            
            if (currentValuesStr !== newValuesStr) {
              needsUpdate = true;
              console.log('🔍 [FilterPanel] Updating availableValues for', attr.field, {
                old: attr.availableValues,
                new: newAvailableValues
              });
              return {
                ...attr,
                availableValues: newAvailableValues
              };
            }
          }
          return attr;
        });
        
        if (missingFields.length > 0) {
          updatedState.attributes = [
            ...updatedState.attributes,
            ...missingFields.map(field => ({
              field: field.field,
              values: new Set<string | number>(),
              availableValues: Object.entries(field.counts).map(([value, count]) => ({
                value: isNaN(Number(value)) ? value : Number(value),
                count
              })),
              expanded: false
            }))
          ];
        }
        
        // Update the state if we added missing fields or updated availableValues
        if (needsUpdate) {
          const reportState = forceLocalState && reportId
            ? filterContext.getReportFilterState(reportId)
            : filterContext.filterState;
          
          // Check if attributes differ (not just values, but presence of attributes)
          // This is important because compareFilterStates is lenient about missing attributes with no values
          const currentFields = new Set(reportState.attributes.map(a => a.field));
          const updatedFields = new Set(updatedState.attributes.map(a => a.field));
          const fieldsMatch = currentFields.size === updatedFields.size && 
            Array.from(currentFields).every(f => updatedFields.has(f));
          
          // Update if fields don't match OR if values differ (using compareFilterStates)
          const shouldSync = !fieldsMatch || !filterContext.compareFilterStates(reportState, updatedState);
          if (shouldSync) {
            console.log('🔍 [FilterPanel] Updating filter state with missing fields:', {
              missingFields: missingFields.map(f => f.field),
              needsUpdate,
              fieldsMatch,
              currentFields: Array.from(currentFields),
              updatedFields: Array.from(updatedFields)
            });
            isUpdatingStateRef.current = true;
            try {
              if (forceLocalState && reportId) {
                filterContext.setReportFilterState(reportId, updatedState);
              } else {
                filterContext.setFilterState(updatedState);
              }
            } finally {
              setTimeout(() => {
                isUpdatingStateRef.current = false;
              }, 0);
            }
          }
        }
      }
      
      setIsInitializing(true);
      setHasUserMadeChanges(false);
    }
  }, [isOpen, filterContext, getEffectiveFilterState, forceLocalState, reportId, availableFieldsSignature]);

  // DECOUPLED RECONNECTION LOGIC: Split into two separate effects to prevent loops
  // Effect 1: Sync filter VALUES when connection status changes (does NOT depend on availableFields)
  useEffect(() => {
    // Skip if we're in the middle of updating state ourselves
    if (isUpdatingStateRef.current) {
      return;
    }
    
    if (forceLocalState && reportId && filterContext) {
      const reportState = filterContext.getReportFilterState(reportId);
      const mainState = filterContext.filterState;
      const isConnected = filterContext.compareFilterStates(reportState, mainState);
      
      // CRITICAL DEBUG: Log when reconnection effect runs
      const reportFields = reportState.attributes.map(attr => attr.field);
      const mainFields = mainState.attributes.map(attr => attr.field);
      const fieldsOnlyInReport = reportFields.filter(f => !mainFields.includes(f));
      const fieldsOnlyInMain = mainFields.filter(f => !reportFields.includes(f));
      const fieldsInBoth = reportFields.filter(f => mainFields.includes(f));
      
      console.log('🔌 [FilterPanel] Effect 1: Reconnection check:', {
        reportId,
        isOpen,
        isConnected,
        reportStatePreset: reportState.dateRange.preset,
        reportStateHasDates: !!(reportState.dateRange.startDate || reportState.dateRange.endDate),
        reportStateAttributeCount: reportState.attributes.length,
        reportStateFields: reportFields.join(', '), // String for log visibility
        reportStateFieldsArray: reportFields, // Keep array for inspection
        reportStateAttributeDetails: reportState.attributes.map(attr => ({ 
          field: attr.field, 
          valuesSize: attr.values.size,
          values: Array.from(attr.values)
        })),
        mainStatePreset: mainState.dateRange.preset,
        mainStateHasDates: !!(mainState.dateRange.startDate || mainState.dateRange.endDate),
        mainStateAttributeCount: mainState.attributes.length,
        mainStateFields: mainFields.join(', '), // String for log visibility
        mainStateFieldsArray: mainFields, // Keep array for inspection
        mainStateAttributeDetails: mainState.attributes.map(attr => ({ 
          field: attr.field, 
          valuesSize: attr.values.size,
          values: Array.from(attr.values)
        })),
        fieldsOnlyInReport: fieldsOnlyInReport.join(', '), // String for log visibility
        fieldsOnlyInReportArray: fieldsOnlyInReport, // Keep array for inspection
        fieldsOnlyInMain: fieldsOnlyInMain.join(', '), // String for log visibility
        fieldsOnlyInMainArray: fieldsOnlyInMain, // Keep array for inspection
        fieldsInBoth: fieldsInBoth.join(', '), // String for log visibility
        fieldsInBothArray: fieldsInBoth, // Keep array for inspection
        timestamp: Date.now()
      });
      
      if (isConnected && isOpen) {
        // Check if main state is actually empty (no active filters)
        // CRITICAL: This check must match the badge count logic exactly
        const mainHasDateFilter = (
          (mainState.dateRange.preset && 
           mainState.dateRange.preset !== 'all' && 
           mainState.dateRange.preset !== 'custom' &&
           (mainState.dateRange.startDate || mainState.dateRange.endDate)) ||
          (mainState.dateRange.preset === 'custom' && 
           (mainState.dateRange.startDate || mainState.dateRange.endDate))
        );
        const mainHasAttributeFilters = mainState.attributes.some(attr => attr.values.size > 0);
        const mainHasActiveFilters = mainHasDateFilter || mainHasAttributeFilters;
        
        // Sync filter VALUES from main state (preserve existing availableValues if availableFields is empty)
        // CRITICAL: If main state is empty, ensure all values are cleared and dateRange is reset
        // CRITICAL: Sync attributes from main state, but preserve report-specific attributes
        // Report-specific attributes (like 'segment') should be preserved if they exist in availableFields
        // This ensures report filters have access to fields they need even if main doesn't use them
        
        // First, map main state attributes
        const mainAttributes = mainState.attributes.map(attr => {
          // Try to find corresponding availableField, but preserve existing if not found
          const availableField = availableFields.length > 0 
            ? availableFields.find(f => f.field === attr.field)
            : null;
          return {
            ...attr,
            // CRITICAL: If main state is empty, ensure values Set is empty
            // Otherwise, copy values from main state
            values: mainHasActiveFilters 
              ? new Set<string | number>(attr.values)
              : new Set<string | number>(), // Clear values if main is empty
            // Preserve availableValues: use availableField if found, otherwise keep existing
            availableValues: availableField 
              ? Object.entries(availableField.counts).map(([value, count]) => ({
                  value: isNaN(Number(value)) ? value : Number(value),
                  count
                }))
              : (attr.availableValues || []) // Preserve existing if availableFields is empty
          };
        });
        
        // Preserve report-specific attributes that exist in availableFields but not in main state
        // These are attributes the report needs (like 'segment') that main filters don't use
        const reportSpecificAttributes = reportState.attributes
          .filter(attr => {
            // Keep if: exists in availableFields AND doesn't exist in main state
            const existsInMain = mainState.attributes.some(a => a.field === attr.field);
            const existsInAvailableFields = availableFields.some(f => f.field === attr.field);
            return !existsInMain && existsInAvailableFields;
          })
          .map(attr => {
            // Find corresponding availableField to update availableValues
            const availableField = availableFields.find(f => f.field === attr.field);
            return {
              ...attr,
              // CRITICAL: If main state is empty, ensure values Set is empty
              // Otherwise, preserve existing values (report-specific filters)
              values: mainHasActiveFilters 
                ? new Set<string | number>(attr.values) // Preserve report-specific filter values
                : new Set<string | number>(), // Clear values if main is empty
              // Update availableValues from availableField if found
              availableValues: availableField 
                ? Object.entries(availableField.counts).map(([value, count]) => ({
                    value: isNaN(Number(value)) ? value : Number(value),
                    count
                  }))
                : (attr.availableValues || [])
            };
          });
        
        const mainStateWithPreservedAttributes: FilterState = {
          ...mainState,
          // If main is empty, reset dateRange to 'all' and clear dates
          dateRange: mainHasActiveFilters 
            ? mainState.dateRange
            : {
                startDate: null,
                endDate: null,
                preset: 'all'
              },
          // If main is empty, ensure isActive is false
          isActive: mainHasActiveFilters ? mainState.isActive : false,
          // Combine main attributes with report-specific attributes
          attributes: [...mainAttributes, ...reportSpecificAttributes]
          // Note: This preserves report-specific attributes (like 'segment') that exist in availableFields
          // but removes attributes that don't exist in either main state or availableFields
        };
        
        // CRITICAL: Force sync if attribute structure differs (different number of attributes)
        // This ensures extra attributes in report are removed even if values match
        // compareFilterStates only checks VALUES, not STRUCTURE
        const structureDiffers = reportState.attributes.length !== mainStateWithPreservedAttributes.attributes.length;
        const valuesMatch = filterContext.compareFilterStates(reportState, mainStateWithPreservedAttributes);
        const shouldSync = !valuesMatch || structureDiffers;
        
        // Add logging to verify sync decision - ALWAYS log when connected to see what's happening
        const reportFieldsAfter = reportState.attributes.map(a => a.field);
        const mainFieldsAfter = mainStateWithPreservedAttributes.attributes.map(a => a.field);
        const mainAttributesFields = mainAttributes.map(a => a.field);
        const reportSpecificFields = reportSpecificAttributes.map(a => a.field);
        const fieldsOnlyInReportAfter = reportFieldsAfter.filter(f => !mainFieldsAfter.includes(f));
        const fieldsOnlyInMainAfter = mainFieldsAfter.filter(f => !reportFieldsAfter.includes(f));
        const fieldsInBothAfter = reportFieldsAfter.filter(f => mainFieldsAfter.includes(f));
        
        // Calculate reportHasValues for logging
        const reportHasValues = reportState.attributes.some(attr => attr.values.size > 0) || 
          (reportState.dateRange.preset && reportState.dateRange.preset !== 'all' && 
           (reportState.dateRange.startDate || reportState.dateRange.endDate));
        
        // CRITICAL: Log key values separately so they're visible even when object is collapsed
        console.log('🔌 [FilterPanel] Effect 1: Sync decision - KEY VALUES:', {
          reportId,
          'REPORT FIELDS (8)': reportFieldsAfter.join(', '),
          'MAIN FIELDS (5)': mainAttributesFields.join(', '),
          'REPORT-SPECIFIC FIELDS (3)': reportSpecificFields.join(', '),
          'SYNCED FIELDS (8)': mainFieldsAfter.join(', '),
          structureDiffers: structureDiffers ? 'YES' : 'NO',
          valuesMatch: valuesMatch ? 'YES' : 'NO',
          shouldSync: shouldSync ? 'YES' : 'NO',
          mainHasActiveFilters: mainHasActiveFilters ? 'YES' : 'NO',
          reportHasValues: reportHasValues ? 'YES' : 'NO'
        });
        
        // Also log full details
        console.log('🔌 [FilterPanel] Effect 1: Sync decision (FULL DETAILS):', {
          reportId,
          reportAttributeCount: reportState.attributes.length,
          reportFields: reportFieldsAfter.join(', '), // String for log visibility
          reportFieldsArray: reportFieldsAfter, // Keep array for inspection
          mainAttributeCount: mainStateWithPreservedAttributes.attributes.length,
          mainFields: mainFieldsAfter.join(', '), // String for log visibility
          mainFieldsArray: mainFieldsAfter, // Keep array for inspection
          mainAttributesCount: mainAttributes.length,
          mainAttributesFields: mainAttributesFields.join(', '), // String for log visibility
          mainAttributesFieldsArray: mainAttributesFields, // Keep array for inspection
          reportSpecificAttributesCount: reportSpecificAttributes.length,
          reportSpecificFields: reportSpecificFields.join(', '), // String for log visibility
          reportSpecificFieldsArray: reportSpecificFields, // Keep array for inspection
          structureDiffers,
          valuesMatch,
          shouldSync,
          mainHasActiveFilters,
          reportHasValues,
          fieldsOnlyInReport: fieldsOnlyInReportAfter.join(', '), // String for log visibility
          fieldsOnlyInReportArray: fieldsOnlyInReportAfter, // Keep array for inspection
          fieldsOnlyInMainAfter: fieldsOnlyInMainAfter.join(', '), // String for log visibility
          fieldsOnlyInMainAfterArray: fieldsOnlyInMainAfter, // Keep array for inspection
          fieldsInBothAfter: fieldsInBothAfter.join(', '), // String for log visibility
          fieldsInBothAfterArray: fieldsInBothAfter, // Keep array for inspection
          // CRITICAL: Show which attributes have values
          reportAttributesWithValues: reportState.attributes
            .filter(attr => attr.values.size > 0)
            .map(attr => ({ field: attr.field, values: Array.from(attr.values) })),
          syncedAttributesWithValues: mainStateWithPreservedAttributes.attributes
            .filter(attr => attr.values.size > 0)
            .map(attr => ({ field: attr.field, values: Array.from(attr.values) }))
        });
        
        if (shouldSync) {
          // Calculate what will be counted after sync using EXACT badge count logic
          let syncDateCount = 0;
          if (mainStateWithPreservedAttributes.dateRange.preset && 
              mainStateWithPreservedAttributes.dateRange.preset !== 'all' && 
              mainStateWithPreservedAttributes.dateRange.preset !== 'custom' &&
              (mainStateWithPreservedAttributes.dateRange.startDate || mainStateWithPreservedAttributes.dateRange.endDate)) {
            syncDateCount = 1;
          } else if (mainStateWithPreservedAttributes.dateRange.preset === 'custom' && 
                     (mainStateWithPreservedAttributes.dateRange.startDate || mainStateWithPreservedAttributes.dateRange.endDate)) {
            syncDateCount = 1;
          }
          let syncAttributeCount = 0;
          mainStateWithPreservedAttributes.attributes.forEach(attr => {
            syncAttributeCount += attr.values.size;
          });
          const syncTotalCount = syncDateCount + syncAttributeCount;
          
          // CRITICAL DEBUG: Log main state to see what we're syncing from
          console.log('🔌 [FilterPanel] Effect 1: Syncing filter VALUES on reconnection:', {
            reportId,
            mainHasActiveFilters, // This should be false if main is empty
            mainStateDatePreset: mainState.dateRange.preset,
            mainStateHasDates: !!(mainState.dateRange.startDate || mainState.dateRange.endDate),
            mainStateStartDate: mainState.dateRange.startDate,
            mainStateEndDate: mainState.dateRange.endDate,
            mainStateIsActive: mainState.isActive,
            mainStateAttributeCounts: mainState.attributes.map(attr => ({
              field: attr.field,
              valuesSize: attr.values.size,
              values: Array.from(attr.values)
            })),
            availableFieldsLength: availableFields.length,
            preservingStructure: availableFields.length === 0,
            // What we're syncing TO:
            syncedDatePreset: mainStateWithPreservedAttributes.dateRange.preset,
            syncedHasDates: !!(mainStateWithPreservedAttributes.dateRange.startDate || mainStateWithPreservedAttributes.dateRange.endDate),
            syncedAttributeCounts: mainStateWithPreservedAttributes.attributes.map(attr => ({
              field: attr.field,
              valuesSize: attr.values.size,
              values: Array.from(attr.values)
            })),
            syncDateCount,
            syncAttributeCount,
            syncTotalCount,
            willShowBadge: syncTotalCount > 0,
            syncedStateSnapshot: JSON.stringify({
              preset: mainStateWithPreservedAttributes.dateRange.preset,
              hasStartDate: !!mainStateWithPreservedAttributes.dateRange.startDate,
              hasEndDate: !!mainStateWithPreservedAttributes.dateRange.endDate,
              attributes: mainStateWithPreservedAttributes.attributes.map(a => ({ 
                field: a.field, 
                valuesSize: a.values.size,
                values: Array.from(a.values)
              }))
            })
          });
          isUpdatingStateRef.current = true;
          try {
            filterContext.setReportFilterState(reportId, mainStateWithPreservedAttributes);
            // CRITICAL DEBUG: Verify state was set correctly
            const verifyState = filterContext.getReportFilterState(reportId);
            console.log('🔌 [FilterPanel] Effect 1: State SET - verifying:', {
              reportId,
              syncedAttributeCount: mainStateWithPreservedAttributes.attributes.length,
              verifiedAttributeCount: verifyState.attributes.length,
              syncedAttributeFields: mainStateWithPreservedAttributes.attributes.map(a => a.field),
              verifiedAttributeFields: verifyState.attributes.map(a => a.field),
              syncedTotalValues: mainStateWithPreservedAttributes.attributes.reduce((sum, a) => sum + a.values.size, 0),
              verifiedTotalValues: verifyState.attributes.reduce((sum, a) => sum + a.values.size, 0),
              timestamp: Date.now()
            });
          } finally {
            setTimeout(() => {
              isUpdatingStateRef.current = false;
            }, 0);
          }
          setIsInitializing(true); // Set to true to prevent auto-disconnect during sync
          setHasUserMadeChanges(false);
        }
      }
    }
    // CRITICAL: This effect does NOT depend on availableFields to prevent loops
    // It only syncs VALUES, not STRUCTURE
  }, [forceLocalState, reportId, filterContext, filterContext?.filterState, filterContext?.reportFilterStates, isOpen]);
  
  // Effect 2: Sync filter STRUCTURE when availableFields becomes available
  // This only runs when availableFields changes and has data, and only adds missing fields
  // SAFEGUARD: This effect is safe from loops because it only ADDS fields, never modifies existing ones
  useEffect(() => {
    // Skip if we're in the middle of updating state ourselves or if availableFields is empty
    if (isUpdatingStateRef.current || !forceLocalState || !reportId || !filterContext || availableFields.length === 0) {
      return;
    }
    
    if (isOpen) {
      const reportState = filterContext.getReportFilterState(reportId);
      const mainState = filterContext.filterState;
      const isConnected = filterContext.compareFilterStates(reportState, mainState);
      
      // Only sync structure if connected (we're syncing to main) or if report state is missing fields
      if (isConnected || reportState.attributes.length === 0) {
        // Check if report state is missing any fields from availableFields
        const missingFields = availableFields.filter(f => 
          !reportState.attributes.some(a => a.field === f.field)
        );
        
        // SAFEGUARD: Only update if there are actually missing fields
        if (missingFields.length > 0) {
          console.log('🔌 [FilterPanel] Effect 2: Syncing filter STRUCTURE - adding missing fields:', {
            reportId,
            missingFields: missingFields.map(f => f.field),
            currentFields: reportState.attributes.map(a => a.field),
            isConnected,
            availableFieldsCount: availableFields.length
          });
          
          isUpdatingStateRef.current = true;
          try {
            const updatedState: FilterState = {
              ...reportState,
              attributes: [
                ...reportState.attributes,
                ...missingFields.map(field => ({
                  field: field.field,
                  values: new Set<string | number>(),
                  availableValues: Object.entries(field.counts).map(([value, count]) => ({
                    value: isNaN(Number(value)) ? value : Number(value),
                    count
                  })),
                  expanded: false
                }))
              ]
            };
            filterContext.setReportFilterState(reportId, updatedState);
          } finally {
            setTimeout(() => {
              isUpdatingStateRef.current = false;
            }, 0);
          }
        }
      }
    }
    // SAFEGUARD: This effect depends on availableFields, but:
    // 1. Only runs when availableFields has data (length > 0 check)
    // 2. Only ADDS missing fields, never modifies existing ones
    // 3. Uses isUpdatingStateRef guard to prevent concurrent updates
    // 4. Won't cause loops because adding fields doesn't change existing filter values
  }, [forceLocalState, reportId, filterContext, isOpen, availableFields]);

  // Effect 3: Add missing fields to MAIN filters when availableFields changes
  // This ensures main filters have all fields that exist in availableFields
  // CRITICAL: This runs for BOTH main filters AND report filters (when report is open)
  // because report filters need main filters to have all fields for proper syncing
  useEffect(() => {
    // Skip if we're in the middle of updating state ourselves, if no context, or if availableFields is empty
    if (isUpdatingStateRef.current || !filterContext || availableFields.length === 0 || !isOpen) {
      // Log why Effect 3 is skipping
      if (isOpen && filterContext && availableFields.length > 0 && isUpdatingStateRef.current) {
        console.log('🔌 [FilterPanel] Effect 3: Skipping (isUpdatingStateRef.current = true)');
      }
      return;
    }
    
    const mainState = filterContext.filterState;
    
    // Check if main state is missing any fields from availableFields
    const missingFields = availableFields.filter(f => 
      !mainState.attributes.some(a => a.field === f.field)
    );
    
    // SAFEGUARD: Only update if there are actually missing fields
    if (missingFields.length > 0) {
      console.log('🔌 [FilterPanel] Effect 3: Adding missing fields to MAIN filters:', {
        reportId: reportId || 'main',
        forceLocalState,
        missingFields: missingFields.map(f => f.field),
        currentMainFields: mainState.attributes.map(a => a.field),
        currentMainFieldCount: mainState.attributes.length,
        availableFieldsCount: availableFields.length,
        allAvailableFields: availableFields.map(f => f.field).join(', ')
      });
      
      isUpdatingStateRef.current = true;
      try {
        const updatedState: FilterState = {
          ...mainState,
          attributes: [
            ...mainState.attributes,
            ...missingFields.map(field => ({
              field: field.field,
              values: new Set<string | number>(),
              availableValues: Object.entries(field.counts).map(([value, count]) => ({
                value: isNaN(Number(value)) ? value : Number(value),
                count
              })),
              expanded: false
            }))
          ]
        };
        filterContext.setFilterState(updatedState);
        console.log('🔌 [FilterPanel] Effect 3: Successfully added fields to MAIN filters:', {
          beforeFieldCount: mainState.attributes.length,
          afterFieldCount: updatedState.attributes.length,
          addedFields: missingFields.map(f => f.field).join(', ')
        });
      } finally {
        setTimeout(() => {
          isUpdatingStateRef.current = false;
        }, 0);
      }
    } else {
      // Log when Effect 3 runs but finds no missing fields
      console.log('🔌 [FilterPanel] Effect 3: No missing fields (main filters already have all fields):', {
        reportId: reportId || 'main',
        forceLocalState,
        mainFieldCount: mainState.attributes.length,
        mainFields: mainState.attributes.map(a => a.field).join(', '),
        availableFieldsCount: availableFields.length,
        availableFields: availableFields.map(f => f.field).join(', ')
      });
    }
    // SAFEGUARD: This effect depends on availableFields, but:
    // 1. Only runs when availableFields has data (length > 0 check)
    // 2. Only ADDS missing fields, never modifies existing ones
    // 3. Uses isUpdatingStateRef guard to prevent concurrent updates
    // 4. Won't cause loops because adding fields doesn't change existing filter values
  }, [forceLocalState, filterContext, isOpen, availableFields, reportId]);

  // REMOVED: Reactive useEffect that watches filterState changes
  // This was causing infinite loops because:
  // 1. User changes filter -> setFilterState -> updates context -> filterState changes -> useEffect triggers -> loop
  // Instead, filters are applied directly in setFilterState when user makes changes
  // External state changes (e.g., from other components) should be handled by those components

  // Handle external reset trigger
  useEffect(() => {
    if (
      resetTrigger !== undefined &&
      resetTrigger > 0 &&
      resetTrigger !== lastProcessedResetTriggerRef.current
    ) {
      lastProcessedResetTriggerRef.current = resetTrigger;
      const emptyState: FilterState = {
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
      };
      
      if (filterContext) {
        if (forceLocalState && reportId) {
          // Check if report is connected to main filters
          const reportState = filterContext.getReportFilterState(reportId);
          const mainState = filterContext.filterState;
          const isConnected = filterContext.compareFilterStates(reportState, mainState);
          
          if (isConnected) {
            // Report is connected - reset main filters (which will sync to all connected reports)
            // handleSetFilterState in resetFilters already syncs connected reports, so no need to sync manually
            console.log(`🔌 [FilterPanel] Resetting connected report ${reportId} - resetting main filters`);
            filterContext.resetFilters();
          } else {
            // Report is disconnected - reset only report filters
            console.log(`🔌 [FilterPanel] Resetting disconnected report ${reportId} - resetting report filters only`);
            // Preserve availableFields for attributes
            const resetStateWithAttributes: FilterState = {
              ...emptyState,
              attributes: availableFields.map(field => ({
                field: field.field,
                values: new Set<string | number>(),
                availableValues: Object.entries(field.counts).map(([value, count]) => ({
                  value: isNaN(Number(value)) ? value : Number(value),
                  count
                })),
                expanded: false
              }))
            };
            filterContext.setReportFilterState(reportId, resetStateWithAttributes);
            setLocalFilterState(resetStateWithAttributes);
          }
        } else {
          // Reset main filter state
          filterContext.resetFilters();
        }
      } else {
        // Fallback to local state reset
        const resetStateWithAttributes: FilterState = {
          ...emptyState,
          attributes: availableFields.map(field => ({
            field: field.field,
            values: new Set<string | number>(),
            availableValues: Object.entries(field.counts).map(([value, count]) => ({
              value: isNaN(Number(value)) ? value : Number(value),
              count
            })),
            expanded: false
          }))
        };
        setFilterState(resetStateWithAttributes);
      }
      setDatePickerVisible(false);
      setCustomStartDate('');
      setCustomEndDate('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTrigger, filterContext, forceLocalState, reportId, availableFields]);

  // Check if date is in range
  const isDateInRange = (dateStr: string | undefined, range: DateRange): boolean => {
    if (!dateStr) return true;
    
    // Parse the date using the proper parser that handles dd/mm/yyyy format
    const dateValue = parseDateString(dateStr);
    if (!dateValue) return false;
    
    // Normalize dates to start of day for accurate comparison
    const dateValueStart = new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
    
    // Check range
    if (range.startDate) {
      const startDateStart = new Date(range.startDate.getFullYear(), range.startDate.getMonth(), range.startDate.getDate());
      if (dateValueStart < startDateStart) return false;
    }
    
    if (range.endDate) {
      const endDateStart = new Date(range.endDate.getFullYear(), range.endDate.getMonth(), range.endDate.getDate());
      // Include the entire end date
      if (dateValueStart > endDateStart) return false;
    }
    
    return true;
  };

  // Apply current filters to data
  const applyFilters = () => {
    // IMPORTANT: Always use applyFiltersWithState to ensure segment filtering works correctly
    // applyFiltersWithState handles both filtering logic AND state updates
    applyFiltersWithState(filterState);
  };

  // Convert preset to date range
  const applyDatePreset = (preset: string) => {
    // Reset notification tracker when user manually selects ANY preset
    // This allows showing a notification if this preset gets auto-reset
    // The ref will prevent duplicate notifications for the same reset event
    lastNotifiedPresetRef.current = null;
    
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
    
    // Apply to the correct state container
    if (forceLocalState && reportId && filterContext) {
      // Update report-local state ONLY (do not touch main filters)
      const currentState = filterContext.getReportFilterState(reportId);
      const newState = {
        ...currentState,
        dateRange: {
          ...currentState.dateRange,
          startDate,
          endDate,
          preset
        },
        // Don't set isActive here - preserve current value
        // It will be recalculated by applyFiltersWithState or reset by validateAndResetFilters
      };
      // Mark initialization complete if this is a user action
      if (isInitializing) {
        setIsInitializing(false);
      }
      filterContext.setReportFilterState(reportId, newState);
    } else if (filterContext) {
      // Update main filters (only when not in local/report mode)
      // Use updateDateRange which handles filtering and state updates correctly
      // This prevents infinite loops from calling setFilterState + applyFiltersWithState
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
        },
        // Don't set isActive here - preserve current value
        // It will be recalculated by applyFiltersWithState or reset by validateAndResetFilters
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

  // Toggle attribute filter value
  // This should always update state, but only trigger auto-disconnect if not initializing
  const toggleAttributeValue = (field: string, value: string | number) => {
    console.log('🔴 [FilterPanel] toggleAttributeValue called:', {
      field,
      value,
      forceLocalState,
      reportId,
      hasFilterContext: !!filterContext
    });
    
    // Always update state - this is a user action
    if (forceLocalState && reportId && filterContext) {
      // Update report filter state
      const currentState = filterContext.getReportFilterState(reportId);
      const updatedAttributes = currentState.attributes.map(attr => {
        if (attr.field === field) {
          const newValues = new Set(attr.values);
          const hadValue = newValues.has(value);
          if (newValues.has(value)) {
            newValues.delete(value);
          } else {
            newValues.add(value);
          }
          console.log('🔴 [FilterPanel] toggleAttributeValue - attribute updated:', {
            field,
            value,
            hadValue,
            nowHasValue: newValues.has(value),
            totalValues: newValues.size
          });
          return { ...attr, values: newValues };
        }
        return attr;
      });
      
      const newState = {
        ...currentState,
        attributes: updatedAttributes
      };
      
      console.log('🔴 [FilterPanel] toggleAttributeValue - calling setFilterState:', {
        reportId,
        attributeCount: updatedAttributes.filter(a => a.values.size > 0).length,
        totalSelectedValues: updatedAttributes.reduce((sum, a) => sum + a.values.size, 0)
      });
      
      // IMPORTANT: Use setFilterState instead of filterContext.setReportFilterState directly
      // This ensures applyFiltersWithState is called, which handles segment filtering
      // But we need to mark initialization as complete if this is a user action
      if (isInitializing) {
        setIsInitializing(false);
      }
      setFilterState(newState);
    } else if (filterContext) {
      // Update main filter state
      const currentState = filterContext.filterState;
      const updatedAttributes = currentState.attributes.map(attr => {
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
      });
      
      const newState = {
        ...currentState,
        attributes: updatedAttributes
      };
      
      // IMPORTANT: Use setFilterState instead of filterContext.setFilterState directly
      // This ensures applyFiltersWithState is called, which handles segment filtering
      setFilterState(newState);
    } else {
      // Fallback to local state - always update
      setLocalFilterState(prev => ({
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
    }
  };

  // Toggle attribute section expand/collapse
  // NOTE: Expanded state is UI-only and should always update, even during initialization
  const toggleAttributeExpanded = (field: string) => {
    // Always update state - expanded is UI state, not filter logic
    if (forceLocalState && reportId && filterContext) {
      // Update report filter state (expanded property is UI-only)
      const currentState = filterContext.getReportFilterState(reportId);
      filterContext.setReportFilterState(reportId, {
        ...currentState,
        attributes: currentState.attributes.map(attr => {
          if (attr.field === field) {
            return { ...attr, expanded: !(attr.expanded ?? false) };
          }
          return attr;
        })
      });
    } else if (filterContext) {
      // Update main filter state
      const currentState = filterContext.filterState;
      filterContext.setFilterState({
        ...currentState,
        attributes: currentState.attributes.map(attr => {
          if (attr.field === field) {
            return { ...attr, expanded: !(attr.expanded ?? false) };
          }
          return attr;
        })
      });
    } else {
      // Fallback to local state - always update regardless of initialization
      setLocalFilterState(prev => ({
        ...prev,
        attributes: prev.attributes.map(attr => {
          if (attr.field === field) {
            return { ...attr, expanded: !(attr.expanded ?? false) };
          }
          return attr;
        })
      }));
    }
  };

  // Reset all filters
  const resetFilters = () => {
    const emptyState: FilterState = {
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
    };
    
    if (filterContext) {
      if (forceLocalState && reportId) {
        // Reset report filter state (not main filters)
        filterContext.setReportFilterState(reportId, emptyState);
      } else {
        // Reset main filter state
        filterContext.resetFilters();
      }
    } else {
      // Fallback to local state reset
      setFilterState(emptyState);
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

  // Get active filter count from storage (no calculation needed!)
  // For main filters: use filterContext.activeFilterCount
  // For report filters: use filterContext.getReportActiveFilterCount(reportId)
  // CRITICAL: This must be reactive to context changes, so we use useMemo with proper dependencies
  const getActiveFilterCount = React.useMemo(() => {
    if (forceLocalState && reportId && filterContext) {
      return filterContext.getReportActiveFilterCount(reportId);
    }
    return filterContext?.activeFilterCount ?? 0;
  }, [
    forceLocalState,
    reportId,
    filterContext?.activeFilterCount,
    filterContext?.reportActiveFilterCounts,
    // Include reportActiveFilterCounts object reference to trigger recalculation
    filterContext?.reportActiveFilterCounts?.[reportId ?? '']
  ]);

  // Get display name for a field
  const getFieldDisplayName = (field: string): string => {
    // Special cases for field names that need specific formatting
    const specialFieldMap: Record<string, string> = {
      'id': 'ID',
      'satisfaction': 'Satisfaction',
      'loyalty': 'Loyalty',
      'segment': 'Segment',
      'ces': 'CES',
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

  // Sort filter values: numbers in ascending order, words alphabetically
  // Special handling for segment values to show them in logical order
  const sortFilterValues = (values: Array<{value: string | number, count: number}>, field?: string): Array<{value: string | number, count: number}> => {
    // Special ordering for segment field
    if (field === 'segment') {
      const segmentOrder: Record<string, number> = {
        'hostages': 1,
        'loyalists': 2,
        'mercenaries': 3,
        'defectors': 4,
        'apostles': 5,
        'near_apostles': 6,
        'terrorists': 7,
        'neutral': 8
      };
      
      return [...values].sort((a, b) => {
        const aOrder = segmentOrder[String(a.value)] || 999;
        const bOrder = segmentOrder[String(b.value)] || 999;
        return aOrder - bOrder;
      });
    }
    
    // Standard sorting for other fields
    return [...values].sort((a, b) => {
      const aVal = a.value;
      const bVal = b.value;
      
      // Check if both are numbers
      const aIsNum = typeof aVal === 'number' || !isNaN(Number(aVal));
      const bIsNum = typeof bVal === 'number' || !isNaN(Number(bVal));
      
      if (aIsNum && bIsNum) {
        // Both are numbers - sort numerically in increasing order
        return Number(aVal) - Number(bVal);
      } else if (aIsNum && !bIsNum) {
        // Numbers come before words
        return -1;
      } else if (!aIsNum && bIsNum) {
        // Words come after numbers
        return 1;
      } else {
        // Both are words - sort alphabetically
        return String(aVal).localeCompare(String(bVal));
      }
    });
  };

  // hasDateData is already defined above

  // Frequency handlers that respect connection mode
  const handleFrequencyEnabledChange = useCallback((enabled: boolean) => {
    if (forceLocalState && reportId && filterContext) {
      const currentState = filterContext.getReportFilterState(reportId);
      const newState = {
        ...currentState,
        frequencyFilterEnabled: enabled,
        frequencyThreshold: currentState.frequencyThreshold || frequencyThreshold
      };
      if (isInitializing) setIsInitializing(false);
      filterContext.setReportFilterState(reportId, newState);
    } else if (filterContext) {
      filterContext.updateFrequencySettings(
        enabled,
        filterContext.filterState.frequencyThreshold || frequencyThreshold
      );
    }
    if (onFrequencyFilterEnabledChange) onFrequencyFilterEnabledChange(enabled);
  }, [forceLocalState, reportId, filterContext, frequencyThreshold, isInitializing, onFrequencyFilterEnabledChange]);

  const handleFrequencyThresholdChange = useCallback((threshold: number) => {
    if (forceLocalState && reportId && filterContext) {
      const currentState = filterContext.getReportFilterState(reportId);
      const newState = {
        ...currentState,
        frequencyThreshold: threshold,
        frequencyFilterEnabled: currentState.frequencyFilterEnabled ?? true
      };
      if (isInitializing) setIsInitializing(false);
      filterContext.setReportFilterState(reportId, newState);
    } else if (filterContext) {
      filterContext.updateFrequencySettings(
        filterContext.filterState.frequencyFilterEnabled || true,
        threshold
      );
    }
    if (onFrequencyThresholdChange) onFrequencyThresholdChange(threshold);
  }, [forceLocalState, reportId, filterContext, isInitializing, onFrequencyThresholdChange]);

  const content = (
    <>
      {/* Header - conditionally rendered */}
      {!hideHeader && !contentOnly && (
        <div className="filter-panel-header">
          <div className="filter-panel-title">
            <Filter size={18} />
            <h3>Filters</h3>
            {(() => {
              // ALWAYS log to verify badge code is executing
              console.warn('🔴 [FilterPanel] Badge render code EXECUTING:', {
                hasFilterContext: !!filterContext,
                forceLocalState,
                reportId: reportId || 'main',
                hideHeader,
                contentOnly
              });
              
              const badgeCount = getActiveFilterCount;
              
              // Calculate actual count from state as fallback (same logic as DistributionSection)
              let actualCount = badgeCount;
              if (badgeCount === 0 && filterContext) {
                const stateToCheck = forceLocalState && reportId
                  ? filterContext.getReportFilterState(reportId)
                  : filterContext.filterState;
                
                const actualDateCount = (stateToCheck.dateRange.preset && 
                                        stateToCheck.dateRange.preset !== 'all' && 
                                        stateToCheck.dateRange.preset !== 'custom' &&
                                        (stateToCheck.dateRange.startDate || stateToCheck.dateRange.endDate)) ? 1 :
                                       (stateToCheck.dateRange.preset === 'custom' && 
                                        (stateToCheck.dateRange.startDate || stateToCheck.dateRange.endDate)) ? 1 : 0;
                const actualAttributeCount = stateToCheck.attributes.reduce((sum, attr) => sum + attr.values.size, 0);
                const actualTotalCount = actualDateCount + actualAttributeCount;
                
                // Use actual count if centralized count is 0 but filters exist
                if (actualTotalCount > 0) {
                  actualCount = actualTotalCount;
                }
              }
              
              // Log for debugging (both main and report filters) - ALWAYS log
              console.log('🏷️ [FilterPanel] Badge RENDER:', {
                isMainFilter: !forceLocalState || !reportId,
                reportId: reportId || 'main',
                badgeCount,
                actualCount,
                willShowBadge: actualCount > 0,
                hasFilterContext: !!filterContext,
                centralizedCount: filterContext 
                  ? (forceLocalState && reportId 
                      ? filterContext.getReportActiveFilterCount(reportId) ?? 0
                      : filterContext.activeFilterCount ?? 0)
                  : 'NO CONTEXT'
              });
              
              return actualCount > 0 ? <span className="filter-badge">{actualCount}</span> : null;
            })()}
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
        
        {/* Segment Filter */}
        {filterState.attributes
          .filter(attr => attr.field === 'segment')
          .length > 0 && (
            <>
              <div className="filter-section-category">Segment</div>
              {filterState.attributes
                .filter(attr => attr.field === 'segment')
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
                        {attr.field === 'segment' ? (() => {
                          // Create a lookup map for quick access
                          const valueMap = new Map<string | number, number>();
                          (attr.availableValues || []).forEach(({value, count}) => {
                            valueMap.set(value, count);
                          });
                          
                          // Debug: Log what's in availableValues vs what should be there
                          console.log('🔍 [FilterPanel] Rendering segment filter - availableValues:', {
                            availableValuesCount: attr.availableValues?.length || 0,
                            availableValues: attr.availableValues?.map(v => ({ value: v.value, count: v.count })),
                            valueMapKeys: Array.from(valueMap.keys()),
                            valueMapEntries: Array.from(valueMap.entries()),
                            valueMapSize: valueMap.size,
                            hasNearApostles: valueMap.has('near_apostles') || valueMap.has('near_advocates'),
                            hasApostles: valueMap.has('apostles') || valueMap.has('advocates'),
                            attrField: attr.field,
                            attrAvailableValuesLength: attr.availableValues?.length,
                            countsObject: attr.availableValues
                          });
                          
                          // Get Areas mode directly from context (just like Classic/Modern)
                          const showSpecialZones = quadrantContext?.showSpecialZones ?? false;
                          const showNearApostles = quadrantContext?.showNearApostles ?? false;
                          const isMainAreas = showSpecialZones && !showNearApostles;
                          const isAllAreas = showSpecialZones && showNearApostles;
                          
                          // Helper to get value by segment name (case-insensitive, handles variants)
                          const getValueByName = (names: string[]): {value: string | number, count: number} | null => {
                            for (const [val, count] of Array.from(valueMap.entries())) {
                              const valStr = String(val).toLowerCase();
                              if (names.some(name => name.toLowerCase() === valStr)) {
                                return {value: val, count};
                              }
                            }
                            return null;
                          };
                          
                          // Helper to render a segment item
                          const renderItem = (value: string | number, count: number, indent: boolean = false) => {
                            const displayValue = getSegmentDisplayName(String(value));
                            return (
                              <div 
                                key={`${attr.field}-${value}`}
                                className={`attribute-value-item ${indent ? 'attribute-value-item-indented' : ''} ${attr.values.has(value) ? 'selected' : ''}`}
                                onClick={() => toggleAttributeValue(attr.field, value)}
                                style={indent ? { paddingLeft: '24px' } : {}}
                              >
                                <div className="checkbox">
                                  {attr.values.has(value) && <Check size={14} />}
                                </div>
                                <div className="attribute-label" translate="no">{displayValue}</div>
                                <div className="attribute-count">{count}</div>
                              </div>
                            );
                          };
                          
                          const items: React.ReactNode[] = [];
                          
                          // 1. Loyalists
                          const loyalists = getValueByName(['loyalists']);
                          if (loyalists) {
                            items.push(renderItem(loyalists.value, loyalists.count));
                            
                            // Advocates under Loyalists (Main Areas or All Areas)
                            if (isMainAreas || isAllAreas) {
                              const advocates = getValueByName(['apostles', 'advocates']);
                              if (advocates) {
                                items.push(renderItem(advocates.value, advocates.count, true));
                              }
                            }
                            
                            // Near-Advocates under Loyalists (All Areas only)
                            if (isAllAreas) {
                              const nearAdvocates = getValueByName(['near_apostles', 'near_advocates', 'near-apostles', 'near-advocates']);
                              // Always show near-advocates when All Areas is active, even if count is 0
                              if (nearAdvocates) {
                                console.log('🔍 [FilterPanel] Rendering near-advocates from valueMap:', { value: nearAdvocates.value, count: nearAdvocates.count });
                                items.push(renderItem(nearAdvocates.value, nearAdvocates.count, true));
                              } else {
                                // If it's not in valueMap but All Areas is active, add it with count 0
                                // Always use 'near_apostles' internally (QuadrantType)
                                // getDisplayNameForQuadrant will convert it to "Near-Apostles" or "Near-Advocates" based on isClassicModel
                                console.log('🔍 [FilterPanel] Rendering near-advocates with count 0 (not in valueMap). valueMap keys:', Array.from(valueMap.keys()));
                                items.push(renderItem('near_apostles', 0, true));
                              }
                            }
                          } else {
                            // If no loyalists, still show Advocates if they exist (Main Areas or All Areas)
                            if (isMainAreas || isAllAreas) {
                              const advocates = getValueByName(['apostles', 'advocates']);
                              if (advocates) {
                                console.log('🔍 [FilterPanel] Rendering advocates without loyalists:', { value: advocates.value, count: advocates.count });
                                items.push(renderItem(advocates.value, advocates.count));
                              }
                              
                              // Near-Advocates (All Areas only) - show even without loyalists
                              if (isAllAreas) {
                                const nearAdvocates = getValueByName(['near_apostles', 'near_advocates', 'near-apostles', 'near-advocates']);
                                if (nearAdvocates) {
                                  console.log('🔍 [FilterPanel] Rendering near-advocates without loyalists:', { value: nearAdvocates.value, count: nearAdvocates.count });
                                  items.push(renderItem(nearAdvocates.value, nearAdvocates.count, true));
                                } else {
                                  console.log('🔍 [FilterPanel] Rendering near-advocates with count 0 (no loyalists, not in valueMap)');
                                  items.push(renderItem('near_apostles', 0, true));
                                }
                              }
                            }
                          }
                          
                          // 2. Hostages
                          const hostages = getValueByName(['hostages']);
                          if (hostages) {
                            items.push(renderItem(hostages.value, hostages.count));
                          }
                          
                          // 3. Mercenaries
                          const mercenaries = getValueByName(['mercenaries']);
                          if (mercenaries) {
                            items.push(renderItem(mercenaries.value, mercenaries.count));
                          }
                          
                          // 4. Defectors
                          const defectors = getValueByName(['defectors']);
                          if (defectors) {
                            items.push(renderItem(defectors.value, defectors.count));
                            
                            // Trolls under Defectors (Main Areas or All Areas)
                            if (isMainAreas || isAllAreas) {
                              const trolls = getValueByName(['terrorists', 'trolls']);
                              if (trolls) {
                                items.push(renderItem(trolls.value, trolls.count, true));
                              }
                            }
                          }
                          
                          return <>{items}</>;
                        })() : sortFilterValues(attr.availableValues || [], attr.field).map(({value, count}) => {
                          const displayValue = attr.field === 'segment' 
                            ? getSegmentDisplayName(String(value))
                            : value.toString();
                          return (
                            <div 
                              key={`${attr.field}-${value}`}
                              className={`attribute-value-item ${attr.values.has(value) ? 'selected' : ''}`}
                              onClick={() => toggleAttributeValue(attr.field, value)}
                            >
                              <div className="checkbox">
                                {attr.values.has(value) && <Check size={14} />}
                              </div>
                              <div className="attribute-label" translate="no">{displayValue}</div>
                              <div className="attribute-count">{count}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
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
                  {sortFilterValues(attr.availableValues || []).map(({value, count}) => (
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
                  {sortFilterValues(attr.availableValues || []).map(({value, count}) => (
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
            return !['satisfaction', 'loyalty', 'segment', 'group', 'name', 'email'].includes(field) &&
                   !field.includes('sat') && 
                   !field.includes('loy');
          })
          .length > 0 && (
            <>
              <div className="filter-section-category">Additional Attributes</div>
              {filterState.attributes
                .filter(attr => {
                  const field = attr.field.toLowerCase();
                  return !['satisfaction', 'loyalty', 'segment', 'group', 'name', 'email'].includes(field) &&
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
                        {sortFilterValues(attr.availableValues || []).map(({value, count}) => (
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
            {(onFrequencyFilterEnabledChange || filterContext) && (
              <Switch
                checked={forceLocalState && reportId && filterContext
                  ? !!filterContext.getReportFilterState(reportId).frequencyFilterEnabled
                  : (filterContext ? !!filterContext.filterState.frequencyFilterEnabled : frequencyFilterEnabled)}
                onChange={handleFrequencyEnabledChange}
                leftLabel="Filter Points"
              />
            )}
            {((forceLocalState && reportId && filterContext
               ? !!filterContext.getReportFilterState(reportId).frequencyFilterEnabled
               : (filterContext ? !!filterContext.filterState.frequencyFilterEnabled : frequencyFilterEnabled))
               && (onFrequencyThresholdChange || filterContext) && frequencyData) && (
              <FrequencySlider
                maxFrequency={frequencyData.maxFrequency}
                currentThreshold={forceLocalState && reportId && filterContext
                  ? (filterContext.getReportFilterState(reportId).frequencyThreshold || 1)
                  : (filterContext ? (filterContext.filterState.frequencyThreshold || 1) : frequencyThreshold)}
                onThresholdChange={handleFrequencyThresholdChange}
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