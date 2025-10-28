import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DataPoint } from '@/types/base';
import { ReportFilterPanel, ReportFilter } from '../../filters/ReportFilterPanel';
import { Settings, X, Filter, Menu } from 'lucide-react';
import { scaleLinear } from 'd3-scale';
import FilterPanel from '../../../visualization/filters/FilterPanel';
import FilterToggle from '../../../visualization/filters/FilterToggle';
import PremiumFeature from '../../../ui/PremiumFeature';
import { ColorPalette } from '../../../ui/ColorPalette';
import { FilterConnectionToggle } from '../../../ui/FilterConnectionToggle';
import { useFilterContext } from '../../../visualization/context/FilterContext';
import { useNotification } from '../../../data-entry/NotificationSystem';
import { useZIndex } from '../../../../hooks/useZIndex';
import './styles.css';

export interface BarChartData {
  value: number;
  count: number;
}

interface BarChartProps {
  data: BarChartData[];
  showGrid?: boolean;
  showLabels?: boolean;
  interactive?: boolean;
  customColors?: Record<number, string>;
  onColorChange?: (value: number, color: string) => void;
  onGridChange?: (showGrid: boolean) => void;
  className?: string;
  chartType?: 'bar' | 'mini';
  chartId?: string;
  title?: string;
  showLegend?: boolean;
  // Props for filtering
  originalData?: DataPoint[]; // Original data for filtering
  onFilterChange?: (filters: ReportFilter[]) => void;
  activeFilters?: ReportFilter[];
  isPremium?: boolean;
}

const BarChart: React.FC<BarChartProps> = ({
  data,
  showGrid = true,
  showLabels = true,
  interactive = false,
  customColors = {},
  onColorChange,
  onGridChange,
  className = '',
  chartId = '',
  title,
  showLegend = true,
  chartType = 'bar',
  originalData,
  onFilterChange,
  activeFilters = [],
  isPremium = false
}) => {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [selectedBar] = useState<number | null>(null);
  const [showValues, setShowValues] = useState(true);
  const [internalShowGrid, setInternalShowGrid] = useState(showGrid);
  const [customHexInput, setCustomHexInput] = useState('');
  const [applyToAll, setApplyToAll] = useState(false);
  const [showChartLegend, setShowChartLegend] = useState(showLegend);
  const [selectedBars, setSelectedBars] = useState<Set<number>>(new Set());
  const [lastTabClicked, setLastTabClicked] = useState<string | null>(null);
  
  // Replace separate panel states with unified panel
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [activePanelTab, setActivePanelTab] = useState<'settings' | 'filters'>('settings');
  const [isManualReconnecting, setIsManualReconnecting] = useState(false);
  
  // Use centralized z-index management
  const filterPanelZIndex = useZIndex('FILTER_PANEL');
  const filterOverlayZIndex = useZIndex('FILTER_OVERLAY');
  const filterHeaderZIndex = useZIndex('FILTER_HEADER');
  const filterTabsZIndex = useZIndex('FILTER_TABS');
  
  // Update ref to point to the side panel
  const sidePanelRef = useRef<HTMLDivElement>(null);
const cogwheelRef = useRef<HTMLButtonElement>(null);
const settingsTabRef = useRef<HTMLButtonElement>(null);
const filtersTabRef = useRef<HTMLButtonElement>(null);

// Get filter context for connection management
const filterContext = useFilterContext();
const { showNotification } = useNotification();

// Determine which data to use based on connection status
const effectiveData = useMemo(() => {
  console.log('📊 effectiveData calculation:', {
    isReportsConnected: filterContext?.isReportsConnected,
    hasFilterContext: !!filterContext,
    originalDataLength: originalData?.length || 0,
    contextFilteredDataLength: filterContext?.filteredData?.length || 0,
    reportsFilteredDataLength: filterContext?.getReportsFilteredData?.()?.length || 0
  });
  
  if (filterContext?.isReportsConnected) {
    // When connected, use the filtered data from context
    const reportsData = filterContext.getReportsFilteredData();
    console.log('📊 Using reports filtered data:', {
      reportsDataLength: reportsData.length,
      isReportsConnected: filterContext.isReportsConnected
    });
    return reportsData;
  } else {
    // When disconnected, use the original data passed as prop
    console.log('📊 Using original data:', {
      originalDataLength: originalData?.length || 0,
      isReportsConnected: filterContext?.isReportsConnected
    });
    return originalData || [];
  }
}, [filterContext?.isReportsConnected, filterContext?.getReportsFilteredData, originalData]);

// Recalculate chart data when effective data changes
const effectiveChartData = useMemo(() => {
  // When connected, we should use the data prop as it's already calculated from filtered data
  // When disconnected, we should also use the data prop as it's calculated from the local filters
  // The key is that the data prop should always reflect the current filter state
  console.log('📊 effectiveChartData recalculating:', {
    dataLength: data.length,
    effectiveDataLength: effectiveData.length,
    isReportsConnected: filterContext?.isReportsConnected
  });
  return data;
}, [data, effectiveData, filterContext?.isReportsConnected]);

// Listen for manual reconnect events
useEffect(() => {
  const handleManualReconnect = () => {
    setIsManualReconnecting(true);
  };

  window.addEventListener('manual-reconnect-start', handleManualReconnect);
  
  return () => {
    window.removeEventListener('manual-reconnect-start', handleManualReconnect);
  };
}, []);

// Reset manual reconnecting flag when connection status changes
useEffect(() => {
  console.log('🔄 Connection status effect triggered:', {
    isReportsConnected: filterContext?.isReportsConnected,
    isManualReconnecting
  });
  
  // Reset manual reconnecting flag when connection status changes
  if (isManualReconnecting) {
    console.log('🔄 Resetting manual reconnecting flag');
    setIsManualReconnecting(false);
  }
}, [filterContext?.isReportsConnected, isManualReconnecting]);

// Force re-render when effective data changes
useEffect(() => {
  console.log('📊 Effective data changed:', {
    dataLength: effectiveData.length,
    isReportsConnected: filterContext?.isReportsConnected
  });
}, [effectiveData, filterContext?.isReportsConnected]);
  
const handleClickOutside = useCallback((event: MouseEvent) => {
  // Only run this logic if the panel is showing
  if (!showSidePanel) return;
  
  const targetElement = event.target as HTMLElement;
  const isBarClick = targetElement.closest('.bar-chart-bar');
  const isPanelClick = targetElement.closest('.filter-panel');
  const isFilterPanelClick = targetElement.closest('.report-filter-panel') || 
                             targetElement.closest('.filter-panel-content');
  const isTabClick = targetElement.closest('.filter-tab');
  const isControlButtonClick = cogwheelRef.current?.contains(targetElement);
  
  console.log('Click outside handler triggered');
  console.log('isPanelClick:', isPanelClick);
  console.log('isFilterPanelClick:', isFilterPanelClick);
  console.log('isTabClick:', isTabClick);
  console.log('Target element:', targetElement);
  console.log('Target classList:', targetElement.classList);
  console.log('Current panel tab:', activePanelTab);
  
  // Close side panel when clicking outside (but not on tabs or bars)
  if (!isPanelClick && !isControlButtonClick && !isTabClick && !isFilterPanelClick && !isBarClick) {
    console.log('Closing panel!');
    setShowSidePanel(false);
  }
  
  // Clear selection only if clicking outside bars and panel
  if (!isBarClick && !isPanelClick && !isFilterPanelClick && !isTabClick) {
    setSelectedBars(new Set());
    setApplyToAll(false);
  }
}, [showSidePanel, activePanelTab]);
  
useEffect(() => {
  document.addEventListener('mouseup', handleClickOutside);
  return () => {
    document.removeEventListener('mouseup', handleClickOutside);
  };
}, [handleClickOutside]);

useEffect(() => {
  console.log("Panel state changed:", { showSidePanel, activePanelTab, lastTabClicked });
}, [showSidePanel, activePanelTab, lastTabClicked]);

useEffect(() => {
  const logAllClicks = (e: MouseEvent) => {
    console.log("Document click:", e.target);
  };
  
  document.body.addEventListener('click', logAllClicks, true);
  
  return () => {
    document.body.removeEventListener('click', logAllClicks, true);
  };
}, []);

  useEffect(() => {
    setInternalShowGrid(showGrid);
  }, [showGrid]);

  useEffect(() => {
    // Update applyToAll based on whether all bars are selected
    setApplyToAll(areAllBarsSelected());
  }, [selectedBars, effectiveChartData.length]);

  const getNiceScale = (maxValue: number): number[] => {
    // Round up maxValue to next nice number
    let step: number;
    let niceMax: number;
    
    if (maxValue <= 5) {
      step = 1;
      niceMax = Math.ceil(maxValue);
    } else if (maxValue <= 20) {
      step = 5;
      niceMax = Math.ceil(maxValue / 5) * 5;
    } else if (maxValue <= 100) {
      step = 10;
      niceMax = Math.ceil(maxValue / 10) * 10;
    } else {
      step = 20;
      niceMax = Math.ceil(maxValue / 20) * 20;
    }
  
    // Create array from 0 to niceMax by step
    return Array.from(
      { length: (niceMax / step) + 1 }, 
      (_, i) => i * step
    );
  };
  
  const maxCount = Math.max(...effectiveChartData.map(d => d.count), 1);
  const yScale = scaleLinear()
    .domain([0, maxCount])
    .nice()
    .range([0, 100]);

  const scaleMarkers = yScale.ticks(5)
    .map(value => ({
      value,
      position: yScale(value)
    }));

  const areAllBarsSelected = () => {
    return selectedBars.size === effectiveChartData.length;
  };

  const handleBarClick = (value: number, event: React.MouseEvent) => {
    if (!interactive) return;
  
    let newSelection: Set<number>;
    
    if (event.ctrlKey) {
      // Multi-selection with Ctrl key
      newSelection = new Set(selectedBars);
      if (newSelection.has(value)) {
        newSelection.delete(value);
      } else {
        newSelection.add(value);
      }
    } else {
      // Single selection/deselection
      if (selectedBars.has(value) && selectedBars.size === 1) {
        newSelection = new Set();
      } else {
        newSelection = new Set([value]);
      }
    }
    
    setSelectedBars(newSelection);
    
    // Auto-open contextual menu when bars are selected (but not when deselecting all)
    if (newSelection.size > 0) {
      setShowSidePanel(true);
      setActivePanelTab('settings');
    }
  };
  
  // Format operator for display
  const formatOperator = (operator: string): string => {
    switch (operator) {
      case 'equals': return '=';
      case 'notEquals': return '≠';
      case 'contains': return 'contains';
      case 'greaterThan': return '>';
      case 'lessThan': return '<';
      case 'between': return 'between';
      default: return operator;
    }
  };
  
  // Handle filter changes
  const handleApplyFilters = (filters: ReportFilter[]) => {
    onFilterChange?.(filters);
    setShowSidePanel(false);
  };
  
  // Function to open panel with specific tab
  const handleOpenPanel = (tab: 'settings' | 'filters') => {
    setActivePanelTab(tab);
    setShowSidePanel(true);
  };
  
  return (
    <div className={`bar-chart-container ${showChartLegend ? 'show-legend' : ''} ${className}`} data-chart-id={chartId}>
      {showChartLegend && title && (
        <div className="bar-chart-legend">
          <h4 className="bar-chart-title">{title}</h4>
        </div>
      )}
      
      {/* Always show hamburger menu - analysis feature */}
      <PremiumFeature isPremium={true} featureType="hamburgerMenu">
        <div className="bar-chart-controls">
          <button
            ref={cogwheelRef}
            className={`bar-chart-control-button ${showSidePanel ? 'active' : ''} ${activeFilters && activeFilters.length > 0 ? 'has-filters' : ''}`}
            onClick={() => {
              setShowSidePanel(!showSidePanel);
              // Start with filters tab if there are active filters, otherwise settings
              setActivePanelTab(activeFilters && activeFilters.length > 0 ? 'filters' : 'settings');
            }}
            title="Chart settings and filters"
          >
            <Menu size={22} />
            {activeFilters && activeFilters.length > 0 && (
              <span className="filter-badge small">{activeFilters.length}</span>
            )}
          </button>
        </div>
      </PremiumFeature>


      {/* Unified side panel using ReportFilterPanel */}
      {showSidePanel && (
        <div 
          className="filter-overlay" 
          onMouseDown={() => console.log("Overlay mousedown")}
        >
          <div 
            className="filter-panel open"
            onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling up
          >
            <div 
              className="filter-panel-header"
            >
              <div 
                className="filter-panel-tabs"
              >
                <button 
                  ref={settingsTabRef}
                  className={`filter-tab ${activePanelTab === 'settings' ? 'active' : ''}`}
                  onClick={(e) => {
                    console.log("Settings tab clicked");
                    e.stopPropagation();
                    setActivePanelTab('settings');
                  }}
                >
                  Settings
                </button>
                <PremiumFeature isPremium={isPremium} featureType="filtering">
                  <button 
                    ref={filtersTabRef}
                    className={`filter-tab ${activePanelTab === 'filters' ? 'active' : ''}`}
                    onClick={(e) => {
                      console.log("🎯🎯🎯 FILTERS TAB CLICKED - This should trigger forceLocalState: true");
                      console.log("🎯 Current state before click:", { 
                        showSidePanel, 
                        activePanelTab, 
                        isReportsConnected: filterContext?.isReportsConnected 
                      });
                      e.stopPropagation();
                      setLastTabClicked('filters');
                      setActivePanelTab('filters');
                      console.log("🎯 State after setting filters tab:", { 
                        showSidePanel, 
                        activePanelTab: 'filters', 
                        isReportsConnected: filterContext?.isReportsConnected 
                      });
                    }}
                    onMouseDown={(e) => {
                      console.log("Filters tab mousedown");
                      e.preventDefault(); 
                      e.stopPropagation();
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>Filters</span>
                      {filterContext && (
                        <FilterConnectionToggle showLabel={false} />
                      )}
                    </div>
                    {activeFilters && activeFilters.length > 0 && (
                      <span className="filter-badge small">{activeFilters.length}</span>
                    )}
                  </button>
                </PremiumFeature>
              </div>
              <button className="filter-panel-close" onClick={() => setShowSidePanel(false)}>
                <X size={20} />
              </button>
            </div>
      
      {activePanelTab === 'settings' ? (
        <div className="filter-panel-content">
          <div className="settings-group">
            <div className="settings-title">Display Settings</div>
            <div className="settings-option">
              <input
                type="checkbox"
                id={`show-values-${chartId}`}
                checked={showValues}
                onChange={(e) => setShowValues(e.target.checked)}
              />
              <label htmlFor={`show-values-${chartId}`}>
                Show values
              </label>
            </div>
            <div className="settings-option">
              <input
                type="checkbox"
                id={`show-grid-${chartId}`}
                checked={internalShowGrid}
                onChange={(e) => {
                  setInternalShowGrid(e.target.checked);
                  onGridChange?.(e.target.checked);
                }}
              />
              <label htmlFor={`show-grid-${chartId}`}>
                Show grid
              </label>
            </div>
            <div className="settings-option">
              <input
                type="checkbox"
                id={`show-legend-${chartId}`}
                checked={showChartLegend}
                onChange={(e) => setShowChartLegend(e.target.checked)}
              />
              <label htmlFor={`show-legend-${chartId}`}>
                Show legend
              </label>
            </div>
          </div>
          <div className="divider"></div>
          {isPremium && originalData && activeFilters && activeFilters.length > 0 && (
            <>
              <div className="settings-group">
                <div className="settings-title">Active Filters</div>
                <div className="filters-list">
                  {activeFilters.map((filter, index) => (
                    <div key={index} className="filter-item">
                      <span>{filter.field} {formatOperator(filter.operator)} {filter.value}</span>
                    </div>
                  ))}
                  <button
                    className="filter-manage-button"
                    onClick={() => setActivePanelTab('filters')}
                  >
                    Manage Filters
                  </button>
                </div>
              </div>
              <div className="divider"></div>
            </>
          )}
          {/* Selected Bars Analysis - Available to all users */}
          {selectedBars.size > 0 && (
            <div className="settings-group">
              <div className="settings-title">Selected Bars Analysis</div>
              <div className="selected-bars-summary">
                <div className="summary-item">
                  <span className="summary-label">Selected:</span>
                  <span className="summary-value">{selectedBars.size} bar{selectedBars.size > 1 ? 's' : ''}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Total Count:</span>
                  <span className="summary-value">
                    {Array.from(selectedBars).reduce((sum, value) => {
                      const barData = data.find(d => d.value === value);
                      return sum + (barData?.count || 0);
                    }, 0)}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Percentage:</span>
                  <span className="summary-value">
                    {((Array.from(selectedBars).reduce((sum, value) => {
                      const barData = data.find(d => d.value === value);
                      return sum + (barData?.count || 0);
                    }, 0) / data.reduce((sum, d) => sum + d.count, 0)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Values:</span>
                  <span className="summary-value">
                    {Array.from(selectedBars).sort((a, b) => a - b).join(', ')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="settings-group">
            <div className="settings-title">Bar Colours</div>
            {isPremium ? (
              <>
                <ColorPalette
                  selectedColor={customColors[selectedBar || 0]}
                  onColorSelect={(color: string) => {
                    if (selectedBars.size === 0) return;
                    selectedBars.forEach(barValue => {
                      onColorChange?.(barValue, color);
                    });
                    setCustomHexInput(color.replace('#', ''));
                  }}
                  isPremium={isPremium}
                  disabled={selectedBars.size === 0}
                  showCustomInput={true}
                  customHexValue={customHexInput}
                  onCustomHexChange={(value: string) => {
                    setCustomHexInput(value);
                    if (value.length === 6) {
                      onColorChange?.(selectedBar || 0, '#' + value);
                    }
                  }}
                />
                <div className="settings-option">
                  <input
                    type="checkbox"
                    id={`apply-all-${chartId}`}
                    checked={applyToAll}
                    style={{ 
                      cursor: 'pointer',
                      opacity: selectedBars.size === 0 ? 0.5 : 1
                    }}
                    onChange={(e) => {
                      setApplyToAll(e.target.checked);
                      if (e.target.checked) {
                        setSelectedBars(new Set(effectiveChartData.map(d => d.value)));
                      } else {
                        setSelectedBars(new Set());
                      }
                    }}
                  />
                  <label htmlFor={`apply-all-${chartId}`}>
                    Apply to all bars
                  </label>
                </div>
              </>
            ) : (
              <div className="premium-feature-placeholder">
                <div className="premium-placeholder-content">
                  <div className="premium-placeholder-title-row">
                    <span className="premium-placeholder-title">Premium Feature</span>
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="12" 
                      height="12" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="lucide lucide-crown-icon lucide-crown premium-crown"
                    >
                      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/>
                      <path d="M5 21h14"/>
                    </svg>
                  </div>
                  <div className="premium-placeholder-description">
                    Customise bar colours to match your brand
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div onClick={(e) => {
          e.stopPropagation();
        }} style={{ width: '100%', height: '100%' }}>
          <FilterPanel
            data={effectiveData}
            onFilterChange={(filteredData, newFilters) => {
              console.log('🎯🎯🎯 BARCHART FILTERPANEL onFilterChange triggered:', {
                newFiltersLength: newFilters.length,
                filteredDataLength: filteredData.length,
                isReportsConnected: filterContext?.isReportsConnected,
                isManualReconnecting,
                forceLocalState: true, // This should always be true for bar chart
                shouldAutoDisconnect: filterContext && filterContext.isReportsConnected && newFilters.length > 0 && !isManualReconnecting,
                effectiveDataLength: effectiveData.length,
                effectiveDataSample: effectiveData.slice(0, 2)
              });

              // Only auto-disconnect if currently connected and there are actual active filters
              // This prevents auto-disconnect on initial load when no user changes are made
              // Also skip if we're manually reconnecting to avoid duplicate notifications
              if (filterContext && filterContext.isReportsConnected && newFilters.length > 0 && !isManualReconnecting) {
                console.log('📊 Auto-disconnecting reports filters');
                filterContext.setReportsConnection(false);
                
                // Show notification about auto-disconnect (only once)
                showNotification({
                  title: 'Filter Connection',
                  type: 'success',
                  message: 'Bar chart filters are now independent from the main chart'
                });
              }
              
              // Don't show any notifications during manual reconnection
              if (isManualReconnecting) {
                console.log('📊 Manual reconnection in progress, skipping notifications');
                return;
              }
              
              // Update the local activeFilters state
              if (onFilterChange) {
                console.log('📊 Calling parent onFilterChange with:', newFilters);
                onFilterChange(newFilters); // Pass the new filters to the parent
              }
            }}
            onClose={() => {
              setShowSidePanel(false);
            }}
            isOpen={true}
            showPointCount={true}
            hideHeader={true}
            contentOnly={true}
            // Force local state mode to prevent direct master updates
            forceLocalState={true}
          />
        </div>
      )}
    </div>
  </div>
)}
      
      <div className="bar-chart-wrapper">
        <div className="bar-chart-scale">
          {scaleMarkers.map(marker => (
            <div
              key={marker.value}
              className="bar-chart-scale-marker"
              style={{ 
                '--position': marker.position
              } as React.CSSProperties}
            >
              {marker.value}
            </div>
          ))}
        </div>

        {internalShowGrid && (
          <div className="bar-chart-grid">
            {scaleMarkers.map(marker => (
              <div
                key={marker.value}
                className="bar-chart-grid-line"
                style={{ bottom: `${marker.position}%` }}
              />
            ))}
          </div>
        )}

        <div className="bar-chart-bars">
          {effectiveChartData.map(({ value, count }) => {
            const heightPercent = yScale(count);
            const showValueForBar = showValues || hoveredBar === value;
            
            return (
              <div 
                key={value} 
                className={`bar-chart-bar-container ${showValueForBar ? 'show-value' : ''}`}
              >
                <PremiumFeature isPremium={true} featureType="barSelection">
                  <div
                    className={`bar-chart-bar premium ${
                      selectedBars.has(value) ? 'selected-bar' : ''
                    }`}
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: customColors[value] || '#3a863e'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBarClick(value, e);
                    }}
                    onMouseEnter={() => setHoveredBar(value)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {count > 0 && showValues && (
                      <div className="bar-chart-value">
                        {count}
                      </div>
                    )}
                  </div>
                </PremiumFeature>

                {showLabels && (
                  <div className="bar-chart-label">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                  </div>
                )}

                {hoveredBar === value && (
                  <div className="bar-chart-tooltip">
                    <div className="bar-chart-tooltip-value">
                      Value: {value}
                    </div>
                    <div className="bar-chart-tooltip-count">
                      Count: {count}
                    </div>
                    <div className="bar-chart-tooltip-hint">
                      {selectedBars.size > 0 ? 
                        'Ctrl+Click to select multiple bars' : 
                        'Click to select bar for analysis'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BarChart;