import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Check } from 'lucide-react';
import { useSaveLoad } from '../../../hooks/useSaveLoad';
import { comprehensiveSaveLoadService } from '../../../services/ComprehensiveSaveLoadService';
import { useNotification } from '../../data-entry/NotificationSystem';
import { useUnsavedChanges } from '../../../hooks/useUnsavedChanges';
import { useChartConfigSafe } from '../../visualization/context/ChartConfigContext';
import { useQuadrantAssignmentSafe } from '../../visualization/context/UnifiedQuadrantContext';
import './DrawerSaveButton.css';

interface DrawerSaveButtonProps {
  // Data to save
  data: any[];
  
  // Scales
  satisfactionScale: string;
  loyaltyScale: string;
  
  // UI State
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
  
  // Filter State
  filterState?: any;
  
  // Premium
  isPremium?: boolean;
  effects?: Set<string>;
}

export const DrawerSaveButton: React.FC<DrawerSaveButtonProps> = ({
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
  isPremium = false,
  effects = new Set()
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showNotification } = useNotification();
  
  // Get context values for unsaved changes tracking
  const chartConfig = useChartConfigSafe();
  const quadrantContext = useQuadrantAssignmentSafe();
  
  // Track unsaved changes
  const { hasUnsavedChanges, lastSavedText, markAsSaved } = useUnsavedChanges({
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
    isPremium,
    effects,
    midpoint: chartConfig?.midpoint,
    apostlesZoneSize: chartConfig?.apostlesZoneSize,
    terroristsZoneSize: chartConfig?.terroristsZoneSize,
    isClassicModel: chartConfig?.isClassicModel
  });
  
  // Try to use the context-based save, but fallback to basic save if context is not available
  let saveProgress: (() => Promise<void>) | null = null;
  let contextIsSaving = false;
  
  try {
    const saveLoadHook = useSaveLoad({
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
      isPremium,
      effects
    });
    saveProgress = saveLoadHook.saveProgress;
    contextIsSaving = saveLoadHook.isSaving;
  } catch (error) {
    // Context is not available, we'll use the fallback save
    console.log('Context not available, using fallback save');
  }

  // Count only non-excluded data points
  const activeDataPoints = data ? data.filter((point: any) => !point.excluded) : [];
  const hasData = activeDataPoints.length > 0;

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      if (saveProgress) {
        // Use context-based save (this will show its own notification)
        await saveProgress();
        setShowSuccess(true);
        markAsSaved();
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        // Fallback save without context data
        // Use only non-excluded data points for saving
        const dataToSave = data.filter((point: any) => !point.excluded);
        const saveData = comprehensiveSaveLoadService.createSaveData({
          data: dataToSave,
          manualAssignments: new Map(), // No manual assignments available
          satisfactionScale, // Use actual scale from props
          loyaltyScale, // Use actual scale from props
          midpoint: { sat: 3, loy: 3 }, // Default midpoint
          apostlesZoneSize: 1, // Default zone size
          terroristsZoneSize: 1, // Default zone size
          isClassicModel: false, // Default model
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
          isPremium,
          effects
        });
        
        await comprehensiveSaveLoadService.saveComprehensiveProgress(saveData);
        
        // Only show notification for fallback save
        setShowSuccess(true);
        markAsSaved();
        showNotification({
          title: 'Success',
          message: 'Progress saved successfully! The file has been downloaded to your Downloads folder.',
          type: 'success'
        });
        
        setTimeout(() => setShowSuccess(false), 2000);
      }
      
    } catch (error) {
      console.error('Failed to save progress:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to save progress. Please try again.',
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, saveProgress, data, satisfactionScale, loyaltyScale, showGrid, showScaleNumbers, showLegends, showNearApostles, showSpecialZones, isAdjustableMidpoint, labelMode, labelPositioning, areasDisplayMode, frequencyFilterEnabled, frequencyThreshold, filterState, isPremium, effects, markAsSaved, showNotification]);

  // Keyboard shortcut (Option 5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isSaving && !contextIsSaving && hasData) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSaving, contextIsSaving, hasData, handleSave]);

  return (
    <div className="drawer-save-button-container">
      <button
        className={`drawer-save-button ${(isSaving || contextIsSaving) ? 'saving' : ''} ${showSuccess ? 'success' : ''} ${!hasData ? 'disabled' : ''} ${hasUnsavedChanges ? 'has-unsaved' : ''}`}
        onClick={handleSave}
        disabled={isSaving || contextIsSaving || !hasData}
        title={hasUnsavedChanges 
          ? 'You have unsaved changes. Press Cmd+S (Mac) or Ctrl+S (Windows/Linux) to save. On tablets/phones, use the button.' 
          : 'Press Cmd+S (Mac) or Ctrl+S (Windows/Linux) to save. On tablets/phones, use the button.'}
      >
        <div className="drawer-save-button__icon">
          {showSuccess ? (
            <Check size={18} />
          ) : (isSaving || contextIsSaving) ? (
            <div className="drawer-save-button__spinner" />
          ) : (
            <Save size={18} />
          )}
        </div>
        
        <div className="drawer-save-button__content">
          <div className="drawer-save-button__title">
            {showSuccess ? 'Saved!' : (isSaving || contextIsSaving) ? 'Saving...' : 'Save Progress'}
          </div>
        </div>
        
        {/* Keyboard shortcut hint (Option 5) - Platform-aware */}
        {!isSaving && !contextIsSaving && hasData && (() => {
          // Detect platform for correct keyboard hint
          const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
                        navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
          const modifierKey = isMac ? 'Cmd' : 'Ctrl';
          
          return (
            <div className="drawer-save-button__keyboard-hint">
              <span className="keyboard-key">{modifierKey}</span>
              <span className="keyboard-key">S</span>
            </div>
          );
        })()}
      </button>
      
      {/* Status indicator (Option 6) */}
      {hasData && (
        <div className="drawer-save-button__status">
          <span className={`status-dot ${hasUnsavedChanges ? 'status-dot--unsaved' : 'status-dot--saved'}`}></span>
          <span className="status-text">
            {hasUnsavedChanges ? 'Unsaved changes' : `Last saved: ${lastSavedText}`}
          </span>
        </div>
      )}
    </div>
  );
};

export default DrawerSaveButton;

