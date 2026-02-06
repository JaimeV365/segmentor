import React, { useEffect, useRef } from 'react';
import { useFilterContextSafe } from '../../visualization/context/FilterContext';
import { useQuadrantAssignmentSafe } from '../../visualization/context/UnifiedQuadrantContext';
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';

interface UnsavedChangesTrackerProps {
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
  isPremium: boolean;
  effects: Set<string>;
  midpoint?: { sat: number; loy: number };
  apostlesZoneSize: number;
  terroristsZoneSize: number;
  isClassicModel: boolean;
  onHasUnsavedChangesChange: (hasUnsavedChanges: boolean) => void;
  onReloadRequested?: () => void; // Callback when Ctrl+R is pressed with unsaved changes
}

/**
 * Component that tracks unsaved changes with access to FilterContext and QuadrantAssignmentContext
 * This component must be rendered inside FilterProvider and QuadrantAssignmentProvider
 */
export const UnsavedChangesTracker: React.FC<UnsavedChangesTrackerProps> = ({
  data,
  satisfactionScale,
  loyaltyScale,
  showGrid,
  showScaleNumbers,
  showLegends,
  showNearApostles,
  showSpecialZones,
  isAdjustableMidpoint,
  labelMode,
  labelPositioning,
  areasDisplayMode,
  frequencyFilterEnabled,
  frequencyThreshold,
  isPremium,
  effects,
  midpoint,
  apostlesZoneSize,
  terroristsZoneSize,
  isClassicModel,
  onHasUnsavedChangesChange,
  onReloadRequested
}) => {
  const filterContext = useFilterContextSafe();
  const quadrantContext = useQuadrantAssignmentSafe();
  
  // Get filterState and reportFilterStates from FilterContext
  const filterState = filterContext?.filterState;
  const reportFilterStates = filterContext?.reportFilterStates;
  
  // Get manualAssignments from QuadrantAssignmentContext
  const manualAssignments = quadrantContext?.manualAssignments;
  
  // Track unsaved changes with all state
  const { hasUnsavedChanges } = useUnsavedChanges({
    data,
    satisfactionScale,
    loyaltyScale,
    showGrid,
    showScaleNumbers,
    showLegends,
    showNearApostles,
    showSpecialZones,
    isAdjustableMidpoint,
    labelMode,
    labelPositioning,
    areasDisplayMode,
    frequencyFilterEnabled,
    frequencyThreshold,
    filterState,
    reportFilterStates,
    manualAssignments,
    isPremium,
    effects,
    midpoint,
    apostlesZoneSize,
    terroristsZoneSize,
    isClassicModel
  });
  
  // Notify parent component of changes
  const prevHasUnsavedChangesRef = useRef(hasUnsavedChanges);
  useEffect(() => {
    if (prevHasUnsavedChangesRef.current !== hasUnsavedChanges) {
      prevHasUnsavedChangesRef.current = hasUnsavedChanges;
      onHasUnsavedChangesChange(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onHasUnsavedChangesChange]);
  
  // Set up beforeunload handler for tab close/navigate away
  useEffect(() => {
    // Only show browser warning if:
    // 1. There are actual unsaved changes AND
    // 2. There's actual data loaded (no warning if just on the loader page with no data)
    if (!hasUnsavedChanges || !data || data.length === 0) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // This shows the browser's native dialog (cannot be styled)
      // It only appears when user tries to close tab/window
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome - shows browser's native dialog
      return ''; // Required for some browsers
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, data]);

  // Intercept Ctrl+R / Cmd+R / F5 to show custom reload modal
  useEffect(() => {
    if (!hasUnsavedChanges || !data || data.length === 0 || !onReloadRequested) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+R (Windows/Linux) or Cmd+R (Mac) or F5
      const isReloadShortcut = 
        (e.key === 'r' && (e.ctrlKey || e.metaKey)) ||
        e.key === 'F5';

      if (isReloadShortcut) {
        e.preventDefault();
        e.stopPropagation();
        onReloadRequested();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [hasUnsavedChanges, data, onReloadRequested]);
  
  // This component doesn't render anything
  return null;
};
