import { useEffect, useRef, useState, useCallback } from 'react';

interface UseUnsavedChangesOptions {
  data: any[];
  satisfactionScale: string;
  loyaltyScale: string;
  showGrid: boolean;
  showScaleNumbers: boolean;
  showLegends: boolean;
  showNearApostles: boolean;
  showSpecialZones: boolean;
  isAdjustableMidpoint: boolean;
  labelMode: number;
  labelPositioning: 'above-dots' | 'below-dots';
  areasDisplayMode: number;
  frequencyFilterEnabled: boolean;
  frequencyThreshold: number;
  filterState?: any;
  reportFilterStates?: Record<string, any>;
  manualAssignments?: Map<string, any> | null;
  isPremium?: boolean;
  effects?: Set<string>;
  midpoint?: { sat: number; loy: number };
  apostlesZoneSize?: number;
  terroristsZoneSize?: number;
  isClassicModel?: boolean;
}

const STORAGE_KEY = 'apostles-model-last-saved-state';
const STORAGE_TIMESTAMP_KEY = 'apostles-model-last-saved-time';

// Helper function to serialize filterState (handles Sets and Dates)
const serializeFilterState = (filterState: any): string => {
  if (!filterState) return '';
  try {
    return JSON.stringify({
      dateRange: {
        startDate: filterState.dateRange?.startDate instanceof Date 
          ? filterState.dateRange.startDate.toISOString() 
          : (typeof filterState.dateRange?.startDate === 'string' 
              ? filterState.dateRange.startDate 
              : null),
        endDate: filterState.dateRange?.endDate instanceof Date 
          ? filterState.dateRange.endDate.toISOString() 
          : (typeof filterState.dateRange?.endDate === 'string' 
              ? filterState.dateRange.endDate 
              : null),
        preset: filterState.dateRange?.preset || 'all'
      },
      attributes: (filterState.attributes || []).map((attr: any) => ({
        field: attr.field,
        values: attr.values instanceof Set ? Array.from(attr.values).sort() : (Array.isArray(attr.values) ? attr.values.sort() : [])
      })).sort((a: any, b: any) => a.field.localeCompare(b.field)),
      isActive: filterState.isActive || false,
      frequencyFilterEnabled: filterState.frequencyFilterEnabled,
      frequencyThreshold: filterState.frequencyThreshold
    });
  } catch (error) {
    console.warn('Failed to serialize filterState:', error);
    return '';
  }
};

// Helper function to serialize reportFilterStates
const serializeReportFilterStates = (reportFilterStates: Record<string, any> | undefined): string => {
  if (!reportFilterStates || Object.keys(reportFilterStates).length === 0) return '';
  try {
    const serialized: Record<string, any> = {};
    Object.entries(reportFilterStates).sort().forEach(([reportId, state]) => {
      serialized[reportId] = serializeFilterState(state);
    });
    return JSON.stringify(serialized);
  } catch (error) {
    console.warn('Failed to serialize reportFilterStates:', error);
    return '';
  }
};

// Helper function to serialize manual assignments
const serializeManualAssignments = (manualAssignments: Map<string, any> | null | undefined): string => {
  if (!manualAssignments || manualAssignments.size === 0) return '';
  try {
    const entries = Array.from(manualAssignments.entries()).sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(entries);
  } catch (error) {
    console.warn('Failed to serialize manualAssignments:', error);
    return '';
  }
};

export const useUnsavedChanges = (options: UseUnsavedChangesOptions) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const lastSavedStateRef = useRef<string | null>(null);
  const isInitialMount = useRef(true);
  const [editableTextChangeTrigger, setEditableTextChangeTrigger] = useState(0);
  const [reportSettingsChangeTrigger, setReportSettingsChangeTrigger] = useState(0);

  // Helper function to get all report settings from localStorage
  const getReportSettingsHash = useCallback(() => {
    try {
      const settings: Record<string, any> = {};
      
      // Report visibility
      const showRecommendationScore = localStorage.getItem('showRecommendationScore');
      const responseConcentrationExpanded = localStorage.getItem('responseConcentrationExpanded');
      if (showRecommendationScore !== null) settings.showRecommendationScore = showRecommendationScore === 'true';
      if (responseConcentrationExpanded !== null) settings.responseConcentrationExpanded = responseConcentrationExpanded === 'true';
      
      // Recommendation Score settings
      const recommendationScoreSettings = localStorage.getItem('recommendationScoreSettings');
      if (recommendationScoreSettings) {
        try {
          settings.recommendationScore = JSON.parse(recommendationScoreSettings);
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // Response Concentration settings
      const responseConcentrationSettings = localStorage.getItem('responseConcentrationSettings');
      if (responseConcentrationSettings) {
        try {
          settings.responseConcentration = JSON.parse(responseConcentrationSettings);
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // Report customizations
      const reportCustomization = localStorage.getItem('report-customization');
      if (reportCustomization) {
        try {
          settings.customizations = JSON.parse(reportCustomization);
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // Proximity Display settings
      const proximityDisplaySettings = localStorage.getItem('proximityDisplaySettings');
      if (proximityDisplaySettings) {
        try {
          settings.proximityDisplay = JSON.parse(proximityDisplaySettings);
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // Action Reports settings
      const actionReportsExpandedSections = localStorage.getItem('actionReportsExpandedSections');
      const actionReportsPdfExportOptions = localStorage.getItem('actionReportsPdfExportOptions');
      if (actionReportsExpandedSections || actionReportsPdfExportOptions) {
        settings.actionReports = {};
        if (actionReportsExpandedSections) {
          try {
            settings.actionReports.expandedSections = JSON.parse(actionReportsExpandedSections);
          } catch (e) {
            // Ignore parse errors
          }
        }
        if (actionReportsPdfExportOptions) {
          try {
            settings.actionReports.pdfExportOptions = JSON.parse(actionReportsPdfExportOptions);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      
      // Historical Progress settings
      const historicalProgressDiagramSettings = localStorage.getItem('historicalProgressDiagramSettings');
      const historicalProgressJourneysSettings = localStorage.getItem('historicalProgressJourneysSettings');
      if (historicalProgressDiagramSettings || historicalProgressJourneysSettings) {
        settings.historicalProgress = {};
        if (historicalProgressDiagramSettings) {
          try {
            settings.historicalProgress.diagram = JSON.parse(historicalProgressDiagramSettings);
          } catch (e) {
            // Ignore parse errors
          }
        }
        if (historicalProgressJourneysSettings) {
          try {
            settings.historicalProgress.journeys = JSON.parse(historicalProgressJourneysSettings);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      
      return JSON.stringify(settings);
    } catch (error) {
      console.warn('Failed to get report settings hash:', error);
      return '';
    }
  }, []);

  // Get hash of all editable text content from localStorage
  const getEditableTextHash = useCallback(() => {
    try {
      const editableTextItems: Record<string, string> = {};
      // Collect all editable-text-* items from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('editable-text-')) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              const parsed = JSON.parse(value);
              // Include both content and backgroundColor in the hash
              editableTextItems[key] = JSON.stringify({
                content: parsed.content || '',
                backgroundColor: parsed.backgroundColor || ''
              });
            } catch (e) {
              // If parsing fails, just use the raw value
              editableTextItems[key] = value;
            }
          }
        }
      }
      // Return a sorted JSON string for consistent hashing
      const sortedKeys = Object.keys(editableTextItems).sort();
      return JSON.stringify(sortedKeys.map(key => ({ key, value: editableTextItems[key] })));
    } catch (error) {
      console.warn('Failed to get editable text hash:', error);
      return '';
    }
  }, []);

  // Create a hash of current state for comparison
  const getStateHash = useCallback(() => {
    return JSON.stringify({
      dataLength: options.data?.length || 0,
      satisfactionScale: options.satisfactionScale,
      loyaltyScale: options.loyaltyScale,
      showGrid: options.showGrid,
      showScaleNumbers: options.showScaleNumbers,
      showLegends: options.showLegends,
      showNearApostles: options.showNearApostles,
      showSpecialZones: options.showSpecialZones,
      isAdjustableMidpoint: options.isAdjustableMidpoint,
      labelMode: options.labelMode,
      labelPositioning: options.labelPositioning,
      areasDisplayMode: options.areasDisplayMode,
      frequencyFilterEnabled: options.frequencyFilterEnabled,
      frequencyThreshold: options.frequencyThreshold,
      midpoint: options.midpoint,
      apostlesZoneSize: options.apostlesZoneSize,
      terroristsZoneSize: options.terroristsZoneSize,
      isClassicModel: options.isClassicModel,
      isPremium: options.isPremium,
      effects: Array.from(options.effects || []).sort(),
      filterState: serializeFilterState(options.filterState), // Include main filter state
      reportFilterStates: serializeReportFilterStates(options.reportFilterStates), // Include all report filter states
      manualAssignments: serializeManualAssignments(options.manualAssignments), // Include manual quadrant assignments
      editableTextHash: getEditableTextHash(), // Include editable text content
      reportSettingsHash: getReportSettingsHash(), // Include all report settings
    });
  }, [
    options.data?.length,
    options.satisfactionScale,
    options.loyaltyScale,
    options.showGrid,
    options.showScaleNumbers,
    options.showLegends,
    options.showNearApostles,
    options.showSpecialZones,
    options.isAdjustableMidpoint,
    options.labelMode,
    options.labelPositioning,
    options.areasDisplayMode,
    options.frequencyFilterEnabled,
    options.frequencyThreshold,
    options.midpoint,
    options.apostlesZoneSize,
    options.terroristsZoneSize,
    options.isClassicModel,
    options.isPremium,
    options.effects,
    options.filterState,
    options.reportFilterStates,
    options.manualAssignments,
    getEditableTextHash,
    getReportSettingsHash,
  ]);

  // Load last saved state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      const savedTimestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
      
      if (savedState) {
        lastSavedStateRef.current = savedState;
      }
      
      if (savedTimestamp) {
        setLastSavedTime(new Date(savedTimestamp));
      }
    } catch (error) {
      console.warn('Failed to load saved state from localStorage:', error);
    }
  }, []);

  // Listen for localStorage changes (editable text edits and report settings)
  useEffect(() => {
    const reportSettingsKeys = [
      'showRecommendationScore',
      'responseConcentrationExpanded',
      'recommendationScoreSettings',
      'responseConcentrationSettings',
      'report-customization',
      'proximityDisplaySettings',
      'actionReportsExpandedSections',
      'actionReportsPdfExportOptions',
      'historicalProgressDiagramSettings',
      'historicalProgressJourneysSettings'
    ];
    
    const handleStorageChange = (e: StorageEvent) => {
      // React to editable-text-* changes
      if (e.key && e.key.startsWith('editable-text-')) {
        setEditableTextChangeTrigger(prev => prev + 1);
      }
      // React to report settings changes
      if (e.key && reportSettingsKeys.includes(e.key)) {
        setReportSettingsChangeTrigger(prev => prev + 1);
      }
    };

    // Listen to storage events (fires when localStorage changes in other tabs/windows)
    window.addEventListener('storage', handleStorageChange);
    
    // Use a MutationObserver-like approach: poll for changes
    // Since we can't directly listen to same-tab localStorage changes,
    // we'll check periodically when the page is visible
    let intervalId: NodeJS.Timeout | null = null;
    
    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        // Only check if page is visible
        if (!document.hidden) {
          // Check for editable text changes
          setEditableTextChangeTrigger(prev => prev + 1);
          // Check for report settings changes
          setReportSettingsChangeTrigger(prev => prev + 1);
        }
      }, 3000); // Check every 3 seconds when visible
    };
    
    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
    
    // Start polling when page is visible
    if (!document.hidden) {
      startPolling();
    }
    
    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopPolling();
    };
  }, []);

  // Check for unsaved changes
  useEffect(() => {
    // If there's no data at all, never mark as unsaved (user is just on the loader page)
    // UNLESS there are editable text changes (user might have edited report text)
    const hasEditableTextChanges = getEditableTextHash() !== '';
    
    if (!options.data || options.data.length === 0) {
      // Even if no data, check if there are editable text changes
      // This handles the case where user edits report text but hasn't loaded data yet
      if (hasEditableTextChanges && lastSavedStateRef.current !== null) {
        const currentHash = getStateHash();
        setHasUnsavedChanges(currentHash !== lastSavedStateRef.current);
      } else {
        setHasUnsavedChanges(false);
      }
      return;
    }

    // Skip check on initial mount - don't mark as unsaved on first load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // On initial mount, if there's a saved state, compare it
      // If no saved state exists, don't mark as unsaved (user hasn't made changes yet)
      if (lastSavedStateRef.current === null) {
        setHasUnsavedChanges(false);
        return;
      }
    }

    const currentHash = getStateHash();
    
    // Only mark as unsaved if we have a saved state to compare against
    // and the current state differs from the saved state
    if (lastSavedStateRef.current === null) {
      // No saved state yet - user hasn't saved, but also hasn't made changes from a loaded state
      setHasUnsavedChanges(false);
    } else {
      // Compare current state with saved state
      setHasUnsavedChanges(currentHash !== lastSavedStateRef.current);
    }
  }, [getStateHash, getEditableTextHash, options.data?.length, options.data, editableTextChangeTrigger, reportSettingsChangeTrigger]);

  // Mark as saved
  const markAsSaved = useCallback(() => {
    const currentHash = getStateHash();
    lastSavedStateRef.current = currentHash;
    const now = new Date();
    setLastSavedTime(now);
    setHasUnsavedChanges(false);
    
    // Store in localStorage
    try {
      localStorage.setItem(STORAGE_KEY, currentHash);
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, now.toISOString());
    } catch (error) {
      console.warn('Failed to save state to localStorage:', error);
    }
  }, [getStateHash]);

  // Format last saved time
  const getLastSavedText = useCallback(() => {
    if (!lastSavedTime) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSavedTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }, [lastSavedTime]);

  return {
    hasUnsavedChanges,
    lastSavedTime,
    lastSavedText: getLastSavedText(),
    markAsSaved
  };
};

