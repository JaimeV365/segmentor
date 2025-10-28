import React, { useState, useEffect, useRef } from 'react';
import { X, Filter, Crown } from 'lucide-react';
import { DataPoint, GridDimensions } from '@/types/base';
import { FilterPanel } from '../filters';
import { UnifiedWatermarkPanel } from './UnifiedWatermarkPanel';
import { useFilterContextSafe } from '../context/FilterContext';
import './UnifiedChartControls.css';

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

  // Smart tab selection logic - prioritize filters if available, otherwise watermark
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 UnifiedChartControls: Tab selection logic', {
        hasFilterableData,
        isPremium,
        currentTab: activeTab
      });
      if (hasFilterableData) {
        setActiveTab('filters');
      } else if (isPremium) {
        setActiveTab('watermark');
      }
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
      <div className="unified-tab-header">
        <Filter size={16} />
        <h3>Data Filters</h3>
      </div>
      
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

  const renderWatermarkTab = () => {
    // Extract the watermark panel content without the wrapper
    const updateEffects = (updater: (current: Set<string>) => void) => {
      const next = new Set(effects);
      updater(next);
      onEffectsChange(next);
    };

    const getEffectValue = (prefix: string, fallback: number) => {
      const found = Array.from(effects).find(e => e.startsWith(prefix));
      if (!found) return fallback;
      const parsed = parseInt(found.replace(prefix, ''), 10);
      return Number.isNaN(parsed) ? fallback : parsed;
    };

    const size = getEffectValue('LOGO_SIZE:', 90);
    const posX = getEffectValue('LOGO_X:', 0);
    const posY = getEffectValue('LOGO_Y:', 0);
    
    // Calculate grid boundaries for watermark positioning
    const gridWidth = dimensions.totalCols * dimensions.cellWidth;
    const gridHeight = dimensions.totalRows * dimensions.cellHeight;
    
    // Calculate maximum offsets based on grid size and watermark size
    const maxXOffset = Math.max(0, gridWidth - size - 20); // 20px margin
    const maxYOffset = Math.max(0, gridHeight - size - 20); // 20px margin

    return (
      <div className="unified-tab-content">
        <div className="unified-tab-header">
          <Crown size={16} />
          <h3>Watermark Settings</h3>
        </div>
        
        <div className="unified-tab-body">
          {/* Logo Selection */}
          <div className="unified-control-group">
            <label className="unified-control-label">Logo</label>
            <select
              className="unified-control-select"
              value={
                effects.has('SHOW_XP_LOGO') ? 'xp' :
                effects.has('SHOW_TM_LOGO') ? 'tm' :
                effects.has('CUSTOM_LOGO') ? 'custom' : 'default'
              }
              onChange={(e) => {
                updateEffects(next => {
                  next.delete('SHOW_XP_LOGO');
                  next.delete('SHOW_TM_LOGO');
                  next.delete('CUSTOM_LOGO');
                  if (e.target.value === 'tm') next.add('SHOW_TM_LOGO');
                  else if (e.target.value === 'custom') next.add('CUSTOM_LOGO');
                });
              }}
            >
              <option value="default">Segmentor (Default)</option>
              <option value="tm">Teresa Monroe</option>
              <option value="custom">Custom Logo</option>
            </select>
          </div>

          {/* Size Controls */}
          <div className="unified-control-group">
            <label className="unified-control-label">Size</label>
            <div className="unified-size-controls">
              <button
                className="unified-size-button"
                onClick={() => updateEffects(next => {
                  Array.from(next).filter(e => e.startsWith('LOGO_SIZE:')).forEach(e => next.delete(e));
                  const newSize = Math.max(50, size - 10);
                  next.add(`LOGO_SIZE:${newSize}`);
                })}
              >
                -
              </button>
              <div className="unified-size-display">{size}px</div>
              <button
                className="unified-size-button"
                onClick={() => updateEffects(next => {
                  Array.from(next).filter(e => e.startsWith('LOGO_SIZE:')).forEach(e => next.delete(e));
                  const newSize = Math.min(200, Math.max(50, size + 10));
                  next.add(`LOGO_SIZE:${newSize}`);
                })}
              >
                +
              </button>
            </div>
          </div>

          {/* Position Controls */}
          <div className="unified-control-group">
            <label className="unified-control-label">Position</label>
            <div className="unified-size-controls">
              <button className="unified-size-button" onClick={() => updateEffects(next => {
                Array.from(next).filter(e => e.startsWith('LOGO_X:')).forEach(e => next.delete(e));
                const nx = Math.max(-maxXOffset, posX - 10);
                if (nx !== 0) next.add(`LOGO_X:${nx}`);
              })}>←</button>
              <div className="unified-size-display">X</div>
              <button className="unified-size-button" onClick={() => updateEffects(next => {
                Array.from(next).filter(e => e.startsWith('LOGO_X:')).forEach(e => next.delete(e));
                const nx = Math.min(maxXOffset, posX + 10);
                if (nx !== 0) next.add(`LOGO_X:${nx}`);
              })}>→</button>
            </div>
            <div className="unified-size-controls">
              <button className="unified-size-button" onClick={() => updateEffects(next => {
                Array.from(next).filter(e => e.startsWith('LOGO_Y:')).forEach(e => next.delete(e));
                const ny = Math.max(-maxYOffset, posY - 10);
                if (ny !== 0) next.add(`LOGO_Y:${ny}`);
              })}>↑</button>
              <div className="unified-size-display">Y</div>
              <button className="unified-size-button" onClick={() => updateEffects(next => {
                Array.from(next).filter(e => e.startsWith('LOGO_Y:')).forEach(e => next.delete(e));
                const ny = Math.min(maxYOffset, posY + 10);
                if (ny !== 0) next.add(`LOGO_Y:${ny}`);
              })}>↓</button>
            </div>
          </div>

          {/* Rotation Controls */}
          <div className="unified-control-group">
            <label className="unified-control-label">Rotation</label>
            <div className="unified-rotation-controls">
              <button
                className={`unified-rotation-button ${!effects.has('LOGO_FLAT') ? 'active' : ''}`}
                onClick={() => updateEffects(next => next.delete('LOGO_FLAT'))}
              >
                Vertical
              </button>
              <button
                className={`unified-rotation-button ${effects.has('LOGO_FLAT') ? 'active' : ''}`}
                onClick={() => updateEffects(next => next.add('LOGO_FLAT'))}
              >
                Horizontal
              </button>
            </div>
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
              {isPremium && (
                <button 
                  className={`unified-tab ${activeTab === 'watermark' ? 'active' : ''}`}
                  onClick={() => {
                    console.log('🔍 Watermark tab clicked');
                    setActiveTab('watermark');
                  }}
                >
                  <Crown size={16} />
                  Watermark
                </button>
              )}
            </div>
            
            <button className="unified-close-button" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Tab Content */}
          <div className="unified-controls-content">
            {activeTab === 'filters' && renderFiltersTab()}
            {activeTab === 'watermark' && renderWatermarkTab()}
          </div>
        </div>
      )}
    </>
  );
};