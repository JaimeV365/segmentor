import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { X, Filter, Crown, RotateCw } from 'lucide-react';
import { DataPoint, GridDimensions } from '@/types/base';
import { FilterPanel } from '../filters';
import { UnifiedWatermarkPanel } from './UnifiedWatermarkPanel';
import { useFilterContextSafe } from '../context/FilterContext';
import './UnifiedChartControls.css';
import { useWatermarkControls } from '../../../hooks/useWatermarkControls';
import { exportCapture } from '../../common/exportCapture';
import { exportCsv } from '../../common/exportCsv';

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

type TabType = 'filters' | 'export';

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
  // Initialize tab state - always start with filters, will be updated by useEffect when panel opens
  const [activeTab, setActiveTab] = useState<TabType>('filters');
  const [exportOnly, setExportOnly] = useState(false);
  const [filterResetTrigger, setFilterResetTrigger] = useState(0);
  const [exportFormat, setExportFormat] = useState<'png' | 'pdf' | 'csv'>('png');
  const [isExporting, setIsExporting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  // Watermark controls (used in watermark tab)
  const { currentState, nudgePosition, setLogoSize, toggleFlat, updateEffects } = useWatermarkControls({
    effects,
    onEffectsChange,
    dimensions
  });
  
  // Access filter context
  const filterContext = useFilterContextSafe();
  
  // Calculate filter count with fallback (same logic as DistributionSection)
  // Use centralized count from FilterContext, but fallback to actual state if needed
  const mainFilterCount = filterContext?.activeFilterCount ?? 0;
  const actualFilterCount = useMemo(() => {
    if (!filterContext || mainFilterCount > 0) return mainFilterCount;
    
    // Fallback: calculate from actual filter state if centralized count is 0
    const mainState = filterContext.filterState;
    const actualDateCount = (mainState.dateRange.preset && 
                            mainState.dateRange.preset !== 'all' && 
                            mainState.dateRange.preset !== 'custom' &&
                            (mainState.dateRange.startDate || mainState.dateRange.endDate)) ? 1 :
                           (mainState.dateRange.preset === 'custom' && 
                            (mainState.dateRange.startDate || mainState.dateRange.endDate)) ? 1 : 0;
    const actualAttributeCount = mainState.attributes.reduce((sum, attr) => sum + attr.values.size, 0);
    const actualTotalCount = actualDateCount + actualAttributeCount;
    
    return actualTotalCount > 0 ? actualTotalCount : mainFilterCount;
  }, [filterContext, mainFilterCount, filterContext?.filterState]);
  
  // Use the calculated count (with fallback) instead of the prop
  const effectiveFilterCount = actualFilterCount > 0 ? actualFilterCount : activeFilterCount;
  
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

  // Smart tab selection logic - pick initial tab from body data attribute
  // Use useLayoutEffect to run synchronously before browser paint, ensuring tab is set before first render
  useLayoutEffect(() => {
    if (isOpen) {
      // Read the attribute synchronously (before paint)
      const desiredAttr = document.body.getAttribute('data-unified-initial-tab') as TabType | null;
      const desired = desiredAttr || 'filters';
      
      console.log('🔍 UnifiedChartControls: Panel opened, setting tab to', desired, 'from attribute:', desiredAttr, 'current activeTab:', activeTab, 'current exportOnly:', exportOnly);
      
      // Update state synchronously (useLayoutEffect runs before paint, so this will be applied immediately)
      if (desired !== activeTab || (desired === 'export' && !exportOnly) || (desired === 'filters' && exportOnly)) {
        setActiveTab(desired);
        setExportOnly(desired === 'export');
        console.log('✅ UnifiedChartControls: Tab state updated to', desired, 'exportOnly:', desired === 'export');
      }
      
      // Clean up attribute after reading
      if (desiredAttr) {
        document.body.removeAttribute('data-unified-initial-tab');
      }
    } else {
      // When panel closes, reset to filters for next open
      setActiveTab('filters');
      setExportOnly(false);
    }
  }, [isOpen]); // Only depend on isOpen to run when panel opens/closes

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

  const renderExportTab = () => {
    console.log('📋 renderExportTab called, exportFormat:', exportFormat);
    return (
    <div className="unified-tab-content">
      <div className="unified-tab-body">
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ fontWeight: 600 }}>Export format</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input 
              type="radio" 
              name="export-format" 
              checked={exportFormat === 'png'}
              onChange={() => setExportFormat('png')}
              style={{ accentColor: '#3a863e', cursor: 'pointer' }} 
            /> PNG (image)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input 
              type="radio" 
              name="export-format" 
              checked={exportFormat === 'pdf'}
              onChange={() => setExportFormat('pdf')}
              style={{ accentColor: '#3a863e', cursor: 'pointer' }} 
            /> PDF (document)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input 
              type="radio" 
              name="export-format" 
              checked={exportFormat === 'csv'}
              onChange={() => setExportFormat('csv')}
              style={{ accentColor: '#3a863e', cursor: 'pointer' }} 
            /> CSV (raw data)
          </label>
          <button
            className={`date-preset-button ${isExporting ? 'active' : ''}`}
            style={{
              background: isExporting ? '#3a863e' : 'white',
              border: '1px solid #d1d5db',
              color: isExporting ? 'white' : '#374151',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isExporting ? 'wait' : 'pointer',
              width: '100%',
              marginTop: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isExporting) {
                e.currentTarget.style.backgroundColor = '#f0f9f0';
                e.currentTarget.style.borderColor = '#3a863e';
              }
            }}
            onMouseLeave={(e) => {
              if (!isExporting) {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#d1d5db';
              }
            }}
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isExporting) return;
              
              console.log('🔘 Export button clicked, format:', exportFormat);
              setIsExporting(true);
              try {
                if (exportFormat === 'csv') {
                  // For CSV, dispatch event to FilteredChart which has quadrant context
                  const event = new CustomEvent('segmentor-export', { 
                    detail: { format: 'csv' },
                    bubbles: true,
                    cancelable: true
                  });
                  window.dispatchEvent(event);
                } else {
                  console.log('📤 Calling exportCapture for', exportFormat);
                  // For PNG/PDF, call exportCapture directly
                  await exportCapture({
                    targetSelector: '.chart-container',
                    format: exportFormat,
                    padding: 92,
                    background: '#ffffff'
                  });
                  console.log('✅ exportCapture completed');
                }
              } catch (error) {
                console.error('❌ Export failed:', error);
                alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
              } finally {
                setIsExporting(false);
              }
            }}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
    </div>
    );
  };

  return (
    <>
      {/* Side Panel */}
      {isOpen && (
        <div className="unified-controls-panel" ref={panelRef}>
          <div className="unified-controls-header">
            {!exportOnly && (
              <div className="unified-controls-tabs">
                {hasFilterableData && (
                  <button 
                    className={`unified-tab active`}
                    onClick={() => setActiveTab('filters')}
                  >
                    <Filter size={16} />
                    Filters
                    {effectiveFilterCount > 0 && (
                      <span className="unified-filter-badge">{effectiveFilterCount}</span>
                    )}
                  </button>
                )}
              </div>
            )}
            {/* Dynamic panel title reflecting the active tab */}
            {exportOnly && (
              <div
                className="unified-controls-title"
                aria-live="polite"
                style={{ color: '#3a863e', fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
              >
                Main Chart Export
              </div>
            )}
            
            <button className="unified-close-button" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Tab Content */}
          <div className="unified-controls-content">
            {/* Always render FilterPanel to keep it mounted (for quadrant change detection)
                but hide it visually when export tab is active */}
            <div style={{ display: exportOnly ? 'none' : 'block' }}>
              {renderFiltersTab()}
            </div>
            
            {/* Export tab - always rendered but hidden when filters tab is active */}
            <div style={{ display: exportOnly ? 'block' : 'none' }}>
              {renderExportTab()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};