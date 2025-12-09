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

  // Check for unsaved changes
  useEffect(() => {
    // If there's no data at all, never mark as unsaved (user is just on the loader page)
    if (!options.data || options.data.length === 0) {
      setHasUnsavedChanges(false);
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
  }, [getStateHash, options.data?.length, options.data]);

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

