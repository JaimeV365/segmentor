import React, { useState, useEffect, useRef } from 'react';
import { X, Filter, Crown, RotateCw } from 'lucide-react';
import { DataPoint, GridDimensions } from '@/types/base';
import { FilterPanel } from '../filters';
import { UnifiedWatermarkPanel } from './UnifiedWatermarkPanel';
import { useFilterContextSafe } from '../context/FilterContext';
import './UnifiedChartControls.css';
import { useWatermarkControls } from '../../../hooks/useWatermarkControls';

interface UnifiedChartControlsProps {
  // Filter-related props
  hasFilterableData: boolean;
  activeFilterCount: number;
  data: DataPoint[];
  onFilterChange: (filteredData: DataPoint[], activeFilters?: any[]) => void;
  
  // Watermark-related props
  effects: Set<string>;
  onEffectsChange: (effects: Set<string>) => void;
  dimensions: GridDimensions;
  isPremium: boolean;
  
  // Frequency controls
  frequencyFilterEnabled?: boolean;
  frequencyThreshold?: number;
  onFrequencyFilterEnabledChange?: (enabled: boolean) => void;
  onFrequencyThresholdChange?: (threshold: number) => void;
  frequencyData?: {
    maxFrequency: number;
    hasOverlaps: boolean;
  };
  
  // Panel state
  isOpen: boolean;
  onClose: () => void;
  
  // Notification callback
  onShowNotification?: (notification: { title: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }) => void;
}

type TabType = 'filters' | 'watermark';

export const UnifiedChartControls: React.FC<UnifiedChartControlsProps> = ({
  hasFilterableData,
  activeFilterCount,
  data,
  onFilterChange,
  effects,
  onEffectsChange,
  dimensions,
  isPremium,
  frequencyFilterEnabled,
  frequencyThreshold,
  onFrequencyFilterEnabledChange,
  onFrequencyThresholdChange,
  frequencyData,
  isOpen,
  onClose,
  onShowNotification
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('filters');
  const [filterResetTrigger, setFilterResetTrigger] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  // Watermark controls (used in watermark tab)
  const { currentState, nudgePosition, setLogoSize, toggleFlat, updateEffects } = useWatermarkControls({
    effects,
    onEffectsChange,
    dimensions
  });
  
  // Access filter context
  const filterContext = useFilterContextSafe();
  
  // Handle filter changes by updating the FilterContext
  const handleFilterChange = (filteredData: DataPoint[], activeFilters?: any[]) => {
    console.log('🔄 UnifiedChartControls: Filter change received', {
      filteredDataLength: filteredData.length,
      activeFiltersLength: activeFilters?.length || 0,
      hasFilterContext: !!filterContext
    });
    
    // The FilterPanel will handle updating the FilterContext through its internal logic
    // We don't need to do anything here since FilterPanel uses the context directly
    // when forceLocalState is false (which is the default)
  };

  // Smart tab selection logic - only filters tab is available here
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 UnifiedChartControls: Tab selection logic', {
        hasFilterableData,
        isPremium,
        currentTab: activeTab
      });
      setActiveTab('filters');
    }
  }, [isOpen, hasFilterableData, isPremium]);

  // Handle click outside to close panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Add/remove body class when panel is open/closed
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('unified-controls-open');
    } else {
      document.body.classList.remove('unified-controls-open');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('unified-controls-open');
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  const renderFiltersTab = () => (
    <div className="unified-tab-content">
      {/* Header removed per request to avoid redundancy */}
      
      <div className="unified-tab-body">
        <FilterPanel
          data={data}
          onFilterChange={handleFilterChange}
          onClose={() => {}} // We handle closing at the panel level
          isOpen={true}
          contentOnly={true} // Render only content without panel wrapper
          frequencyFilterEnabled={frequencyFilterEnabled}
          frequencyThreshold={frequencyThreshold}
          onFrequencyFilterEnabledChange={onFrequencyFilterEnabledChange}
          onFrequencyThresholdChange={onFrequencyThresholdChange}
          frequencyData={frequencyData}
          resetTrigger={filterResetTrigger}
          onShowNotification={onShowNotification}
        />
      </div>
      
      {/* Footer with Reset Button */}
      <div className="unified-tab-footer">
        <button 
          className="unified-reset-button" 
          onClick={() => {
            // Reset all filters
            setFilterResetTrigger(prev => prev + 1);
            onFilterChange(data, []);
          }}
          disabled={activeFilterCount === 0}
        >
          Reset All
        </button>
      </div>
    </div>
  );

  // Watermark tab removed from this panel; watermark is accessible via its own control button

  return (
    <>
      {/* Side Panel */}
      {isOpen && (
        <div className="unified-controls-panel" ref={panelRef}>
          <div className="unified-controls-header">
            <div className="unified-controls-tabs">
              {hasFilterableData && (
                <button 
                  className={`unified-tab ${activeTab === 'filters' ? 'active' : ''}`}
                  onClick={() => setActiveTab('filters')}
                >
                  <Filter size={16} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="unified-filter-badge">{activeFilterCount}</span>
                  )}
                </button>
              )}
              {/* Watermark tab removed to avoid mixing with Filters */}
            </div>
            
            <button className="unified-close-button" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Tab Content */}
          <div className="unified-controls-content">
            {activeTab === 'filters' && renderFiltersTab()}
          </div>
        </div>
      )}
    </>
  );
};