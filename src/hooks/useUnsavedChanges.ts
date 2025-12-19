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
  isPremium?: boolean;
  effects?: Set<string>;
  midpoint?: { sat: number; loy: number };
  apostlesZoneSize?: number;
  terroristsZoneSize?: number;
  isClassicModel?: boolean;
}

const STORAGE_KEY = 'apostles-model-last-saved-state';
const STORAGE_TIMESTAMP_KEY = 'apostles-model-last-saved-time';

export const useUnsavedChanges = (options: UseUnsavedChangesOptions) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const lastSavedStateRef = useRef<string | null>(null);
  const isInitialMount = useRef(true);
  const [editableTextChangeTrigger, setEditableTextChangeTrigger] = useState(0);

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
      editableTextHash: getEditableTextHash(), // Include editable text content
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
    getEditableTextHash,
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

  // Listen for localStorage changes (editable text edits)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only react to editable-text-* changes
      if (e.key && e.key.startsWith('editable-text-')) {
        // Trigger a re-check by updating the trigger state
        setEditableTextChangeTrigger(prev => prev + 1);
      }
    };

    // Listen to storage events (fires when localStorage changes in other tabs/windows)
    window.addEventListener('storage', handleStorageChange);
    
    // Also create a custom event listener for same-tab localStorage changes
    // (storage event only fires for changes in OTHER tabs)
    const handleCustomStorageChange = () => {
      setEditableTextChangeTrigger(prev => prev + 1);
    };
    
    // Use a MutationObserver-like approach: poll for changes
    // Since we can't directly listen to same-tab localStorage changes,
    // we'll check periodically when the component is active
    const intervalId = setInterval(() => {
      // This will trigger the useEffect below to re-check
      setEditableTextChangeTrigger(prev => prev + 1);
    }, 2000); // Check every 2 seconds

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
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
  }, [getStateHash, getEditableTextHash, options.data?.length, options.data, editableTextChangeTrigger]);

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

