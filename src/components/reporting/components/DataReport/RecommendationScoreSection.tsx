import React, { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { calculateRecommendationScore } from '../../../../utils/recommendationScore';
import type { DataPoint, ScaleFormat } from '@/types/base';
import { ScoreGauge } from './ScoreGauge';
import { LoyaltyDistributionChart } from './LoyaltyDistributionChart';
import { CategoryDistributionChart } from './CategoryDistributionChart';
import { RecommendationScoreSimulator } from './RecommendationScoreSimulator';
import { Menu, X, Settings, Filter, AlertCircle, Link2, Link2Off } from 'lucide-react';
import { getCategoryMapping } from '../../../../utils/recommendationScore';
import FilterPanel from '../../../visualization/filters/FilterPanel';
import { useFilterContextSafe } from '../../../visualization/context/FilterContext';
import { ReportFilter } from '../../filters/ReportFilterPanel';
import { useNotification } from '../../../data-entry/hooks/useNotification';
import { InfoRibbon } from '../InfoRibbon';
import '../../../visualization/controls/UnifiedChartControls.css';
import './RecommendationScoreSection.css';

interface RecommendationScoreSectionProps {
  data: DataPoint[];
  loyaltyScale: ScaleFormat;
  isPremium?: boolean;
  // Customization options
  gaugeColors?: {
    red: string;
    orange: string;
    green: string;
  };
  decimalPrecision?: 0 | 1 | 2;
  categoryChartType?: 'bar' | 'pie';
  displayFormat?: 'count' | 'percentage' | 'both';
  // Panel control
  autoOpenPanel?: boolean;
  onPanelOpen?: () => void;
}

// Scale Conversion Modal Component
interface ScaleConversionModalProps {
  loyaltyScale: ScaleFormat;
  onClose: () => void;
}

const ScaleConversionModal: React.FC<ScaleConversionModalProps> = ({ loyaltyScale, onClose }) => {
  const categoryMapping = useMemo(() => getCategoryMapping(loyaltyScale), [loyaltyScale]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="scale-conversion-modal-overlay" onClick={onClose}>
      <div className="scale-conversion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="scale-conversion-modal-header">
          <h3>Scale Conversion Information</h3>
          <button className="scale-conversion-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="scale-conversion-modal-content">
          <p className="scale-conversion-modal-intro">
            The Recommendation Score calculation is typically based on a <strong>0-10 scale</strong>. 
            Your data uses a <strong>{loyaltyScale} scale</strong>, so we've converted the values 
            proportionally to maintain the same distribution ratios.
          </p>

          <div className="scale-conversion-mapping">
            <h4>Category Mapping for {loyaltyScale} Scale:</h4>
            <div className="scale-conversion-categories">
              <div className="scale-conversion-category detractors">
                <div className="category-header">
                  <span className="category-color" style={{ background: '#ef4444' }}></span>
                  <strong>Detractors</strong>
                </div>
                <div className="category-values">
                  {categoryMapping.detractors.join(', ')}
                </div>
              </div>
              
              <div className="scale-conversion-category passives">
                <div className="category-header">
                  <span className="category-color" style={{ background: '#f59e0b' }}></span>
                  <strong>Passives</strong>
                </div>
                <div className="category-values">
                  {categoryMapping.passives.join(', ')}
                </div>
              </div>
              
              <div className="scale-conversion-category promoters">
                <div className="category-header">
                  <span className="category-color" style={{ background: '#10b981' }}></span>
                  <strong>Promoters</strong>
                </div>
                <div className="category-values">
                  {categoryMapping.promoters.join(', ')}
                </div>
              </div>
            </div>
          </div>

          <div className="scale-conversion-note">
            <p>
              <strong>Note:</strong> This conversion preserves the proportional distribution from the 
              standard 0-10 scale (approximately 64% Detractors, 18% Passives, 18% Promoters), 
              ensuring your Recommendation Score calculation remains accurate and comparable.
            </p>
          </div>
        </div>

        <div className="scale-conversion-modal-actions">
          <button className="scale-conversion-modal-btn" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export const RecommendationScoreSection: React.FC<RecommendationScoreSectionProps> = ({
  data,
  loyaltyScale,
  isPremium = false,
  gaugeColors,
  decimalPrecision: initialDecimalPrecision = 0,
  categoryChartType: initialCategoryChartType = 'bar',
  displayFormat: initialDisplayFormat = 'both',
  autoOpenPanel = false,
  onPanelOpen
}) => {
  // Panel state
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'filters'>('settings');
  const [showScaleModal, setShowScaleModal] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  // Local settings state - try to load from localStorage
  const [decimalPrecision, setDecimalPrecision] = useState<0 | 1 | 2>(() => {
    try {
      const saved = localStorage.getItem('recommendationScoreSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.decimalPrecision ?? initialDecimalPrecision;
      }
    } catch (e) {
      console.warn('Failed to load Recommendation Score settings from localStorage:', e);
    }
    return initialDecimalPrecision;
  });
  
  const [categoryChartType, setCategoryChartType] = useState<'bar' | 'pie'>(() => {
    try {
      const saved = localStorage.getItem('recommendationScoreSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.categoryChartType ?? initialCategoryChartType;
      }
    } catch (e) {
      // Ignore
    }
    return initialCategoryChartType;
  });
  
  const [displayFormat, setDisplayFormat] = useState<'count' | 'percentage' | 'both'>(() => {
    try {
      const saved = localStorage.getItem('recommendationScoreSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.displayFormat ?? initialDisplayFormat;
      }
    } catch (e) {
      // Ignore
    }
    return initialDisplayFormat;
  });
  
  const [useCategoryColors, setUseCategoryColors] = useState(() => {
    try {
      const saved = localStorage.getItem('recommendationScoreSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.useCategoryColors ?? false;
      }
    } catch (e) {
      // Ignore
    }
    return false;
  });
  
  // Persist Recommendation Score settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('recommendationScoreSettings', JSON.stringify({
      decimalPrecision,
      categoryChartType,
      displayFormat,
      useCategoryColors
    }));
  }, [decimalPrecision, categoryChartType, displayFormat, useCategoryColors]);

  // Filter system state
  const filterContext = useFilterContextSafe();
  const { showNotification } = useNotification();
  const REPORT_ID = useMemo(() => 'recommendationScoreSection', []);
  const [activeFilters, setActiveFilters] = useState<ReportFilter[]>([]);
  const [filteredDataFromPanel, setFilteredDataFromPanel] = useState<DataPoint[] | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [isManualReconnecting, setIsManualReconnecting] = useState(false);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // Initialize report filter state - sync to main filters by default
  // Use useLayoutEffect to ensure sync happens before FilterPanel checks connection status
  useLayoutEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[REPORT_ID]) {
      console.log('🔌 [RecommendationScoreSection] LAYOUT EFFECT INIT: Syncing report state to main state');
      filterContext.syncReportToMaster(REPORT_ID);
    }
  }, [filterContext, REPORT_ID]);

  // Backup initialization check (runs after first render)
  useEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[REPORT_ID]) {
      console.log('🔌 [RecommendationScoreSection] Backup init: Syncing report state to main state');
      filterContext.syncReportToMaster(REPORT_ID);
    }
  }, [filterContext, REPORT_ID]);

  // Derive connection status
  const connectionStatus = useMemo(() => {
    if (!filterContext) return true;
    const reportState = filterContext.reportFilterStates[REPORT_ID];
    const mainState = filterContext.filterState;
    
    // If report state doesn't exist, it's connected by default (uses main state)
    if (!reportState) {
      return true;
    }
    
    // Compare states to determine if connected
    return filterContext.compareFilterStates(reportState, mainState);
  }, [filterContext, REPORT_ID, filterContext?.reportFilterStates?.[REPORT_ID], filterContext?.filterState]);

  useEffect(() => {
    setIsConnected(connectionStatus);
  }, [connectionStatus]);

  // Calculate filter count from appropriate state (main if connected, report if disconnected)
  const filterCount = useMemo(() => {
    if (!filterContext) return activeFilters?.length || 0;
    
    const stateToUse = isConnected 
      ? filterContext.filterState 
      : (filterContext.getReportFilterState(REPORT_ID) || filterContext.filterState);
    
    // Count active filters from FilterState
    const hasDateFilter = stateToUse.dateRange?.preset && stateToUse.dateRange.preset !== 'all';
    const attributeFilterCount = stateToUse.attributes?.filter(attr => attr.values && attr.values.size > 0).length || 0;
    const totalCount = (hasDateFilter ? 1 : 0) + attributeFilterCount;
    
    // Fallback to activeFilters array length if available and state count is 0
    return totalCount > 0 ? totalCount : (activeFilters?.length || 0);
  }, [filterContext, isConnected, REPORT_ID, activeFilters]);

  // Clear filteredDataFromPanel when report reconnects (so we use main filteredData)
  useEffect(() => {
    if (isConnected && filteredDataFromPanel !== null) {
      console.log(`🔌 [RecommendationScoreSection] Report reconnected - clearing filteredDataFromPanel and using main filteredData`);
      setFilteredDataFromPanel(null);
    }
  }, [isConnected, filteredDataFromPanel]);

  // Handle connection toggle
  const handleConnectionToggle = useCallback((confirmed: boolean) => {
    if (!filterContext) return;
    
    if (confirmed) {
      // Reconnecting - sync report state to main state
      setIsManualReconnecting(true);
      
      console.log(`🔔 [RecommendationScoreSection] Manual reconnect - syncing to main state`);
      
      filterContext.syncReportToMaster(REPORT_ID);
      setHasLocalChanges(false);
      
      setShowReconnectModal(false);
      
      // Show notification
      console.log(`🔔 [RecommendationScoreSection] Manual reconnect - showing notification`);
      try {
        showNotification({
          title: 'Filters Connected',
          message: 'Recommendation Score filters are now synced with the main chart.',
          type: 'success',
          icon: <Link2 size={18} style={{ color: '#166534' }} />
        });
      } catch (error) {
        console.error('🔔 [RecommendationScoreSection] Error showing notification:', error);
      }
      
      // Reset flag after a delay
      setTimeout(() => {
        setIsManualReconnecting(false);
      }, 100);
    } else {
      setShowReconnectModal(false);
    }
  }, [filterContext, REPORT_ID, showNotification]);

  // Get effective filtered data
  const effectiveData = useMemo(() => {
    if (!filterContext) return data;
    
    // If disconnected and we have filtered data from panel, use it
    if (!isConnected && filteredDataFromPanel !== null) {
      return filteredDataFromPanel;
    }
    
    // Otherwise, use report filter system
    return filterContext.getReportFilteredData(REPORT_ID, data);
  }, [data, filterContext, REPORT_ID, isConnected, filteredDataFromPanel]);

  // Handle filter changes from FilterPanel
  const handleFilterChange = (filteredData: DataPoint[], newFilters: ReportFilter[]) => {
    setFilteredDataFromPanel(filteredData);
    setActiveFilters(newFilters || []);
    
    // Track local changes for connection status
    if (!isManualReconnecting && filterContext) {
      setHasLocalChanges(true);
    }
  };

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(event.target as Node)
      ) {
        setShowSidePanel(false);
      }
    };
    
    if (showSidePanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSidePanel]);

  // Handle escape key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showSidePanel) {
        setShowSidePanel(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showSidePanel]);

  // Add/remove body class when panel is open/closed
  useEffect(() => {
    if (showSidePanel) {
      document.body.classList.add('unified-controls-open');
    } else {
      document.body.classList.remove('unified-controls-open');
    }

    return () => {
      document.body.classList.remove('unified-controls-open');
    };
  }, [showSidePanel]);

  // Auto-open panel when requested
  useEffect(() => {
    if (autoOpenPanel && !showSidePanel) {
      // Use a small delay to ensure the section is fully rendered
      const timer = setTimeout(() => {
        setShowSidePanel(true);
        setActiveTab('settings');
        if (onPanelOpen) {
          onPanelOpen();
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [autoOpenPanel, showSidePanel, onPanelOpen]);

  // Calculate recommendation score with filtered data
  const scoreResult = useMemo(() => {
    return calculateRecommendationScore(effectiveData, loyaltyScale);
  }, [effectiveData, loyaltyScale]);

  return (
    <div className="report-section recommendation-score-section">
      <div className="recommendation-score-header">
        <h4 className="report-section-title">Recommendation Score</h4>
        <div className="recommendation-score-controls">
          {loyaltyScale !== '0-10' && (
            <button
              className="recommendation-score-scale-warning-button"
              onClick={(e) => {
                e.stopPropagation();
                setShowScaleModal(true);
              }}
              title="Scale conversion information"
            >
              <AlertCircle size={20} />
            </button>
          )}
          <button
            ref={settingsButtonRef}
            className={`recommendation-score-settings-button ${showSidePanel ? 'active' : ''} ${filterCount > 0 ? 'has-filters' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              const newState = !showSidePanel;
              setShowSidePanel(newState);
              if (newState) {
                setActiveTab('settings'); // Default to settings tab
              }
            }}
            title="Recommendation Score settings"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>
      
      <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
        <InfoRibbon text={`The Recommendation Score is based on the classic "How likely are you to recommend (...)" question.\n\nThis score segments your loyalty data into three groups:\n• Detractors (unlikely to recommend)\n• Passives (neutral)\n• Promoters (likely to recommend)`} />
      </div>
      
      <div className="recommendation-score-widgets">
        {/* Widget 1: Score Gauge */}
        <div className="recommendation-score-widget">
          <ScoreGauge
            score={scoreResult.score}
            isPremium={isPremium}
            customColors={gaugeColors}
            decimalPrecision={decimalPrecision}
          />
        </div>

        {/* Widget 2: Loyalty Distribution Bar Chart */}
        <div className="recommendation-score-widget">
          <LoyaltyDistributionChart
            distribution={scoreResult.distribution}
            loyaltyScale={loyaltyScale}
            displayFormat={displayFormat}
            useCategoryColors={useCategoryColors}
          />
        </div>

        {/* Widget 3: Category Distribution Chart */}
        <div className="recommendation-score-widget">
          <CategoryDistributionChart
            detractors={scoreResult.detractors}
            passives={scoreResult.passives}
            promoters={scoreResult.promoters}
            detractorsPercent={scoreResult.detractorsPercent}
            passivesPercent={scoreResult.passivesPercent}
            promotersPercent={scoreResult.promotersPercent}
            chartType={categoryChartType}
            displayFormat={displayFormat}
          />
        </div>
      </div>

      {/* Widget 4: Recommendation Score Simulator */}
      <RecommendationScoreSimulator
        currentDetractors={scoreResult.detractors}
        currentPassives={scoreResult.passives}
        currentPromoters={scoreResult.promoters}
        currentScore={scoreResult.score}
        totalEntries={effectiveData.length}
      />

      {/* Contextual Menu Panel */}
      {showSidePanel && (
        <div className="unified-controls-panel recommendation-score-panel" ref={panelRef}>
          <div className="unified-controls-header">
            <div className="bar-chart-panel-title">
              Recommendation Score
            </div>
            <div className="unified-controls-tabs">
              <button 
                className={`unified-tab ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <Settings size={16} />
                Settings
              </button>
              <button 
                className={`unified-tab ${activeTab === 'filters' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  // Only handle tab click if not clicking the connection icon
                  if (!(e.target as HTMLElement).closest('.connection-status-icon')) {
                    setActiveTab('filters');
                  }
                }}
              >
                <Filter size={16} />
                Filters
                {filterContext && (
                  <span 
                    className="connection-status-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isConnected) {
                        // Show confirmation modal before reconnecting
                        setShowReconnectModal(true);
                      }
                    }}
                    title={isConnected ? 'Connected to main filters (will disconnect automatically when you change filters)' : 'Click to reconnect to main filters'}
                    style={{ cursor: !isConnected ? 'pointer' : 'default' }}
                  >
                    {isConnected ? (
                      <Link2 size={14} />
                    ) : (
                      <Link2Off size={14} />
                    )}
                  </span>
                )}
                {filterCount > 0 && (
                  <span className="unified-filter-badge">{filterCount}</span>
                )}
              </button>
            </div>
            <button className="unified-close-button" onClick={() => setShowSidePanel(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="unified-controls-content">
            {activeTab === 'settings' && (
              <div className="unified-tab-content">
                <div className="unified-tab-body">
                  {isPremium && (
                    <div className="recommendation-score-settings-group">
                      <label className="recommendation-score-settings-label">Decimal Precision</label>
                      <select
                        className="recommendation-score-settings-select"
                        value={decimalPrecision}
                        onChange={(e) => setDecimalPrecision(Number(e.target.value) as 0 | 1 | 2)}
                      >
                        <option value={0}>Whole numbers</option>
                        <option value={1}>1 decimal</option>
                        <option value={2}>2 decimals</option>
                      </select>
                    </div>
                  )}
                  
                  <div className="recommendation-score-settings-group">
                    <label className="recommendation-score-settings-label">Display Format</label>
                    <div className="recommendation-score-settings-radio">
                      <label className="recommendation-score-settings-item">
                        <input
                          type="radio"
                          name="displayFormat"
                          value="count"
                          checked={displayFormat === 'count'}
                          onChange={() => setDisplayFormat('count')}
                        />
                        <span>Count</span>
                      </label>
                      <label className="recommendation-score-settings-item">
                        <input
                          type="radio"
                          name="displayFormat"
                          value="percentage"
                          checked={displayFormat === 'percentage'}
                          onChange={() => setDisplayFormat('percentage')}
                        />
                        <span>Percentage</span>
                      </label>
                      <label className="recommendation-score-settings-item">
                        <input
                          type="radio"
                          name="displayFormat"
                          value="both"
                          checked={displayFormat === 'both'}
                          onChange={() => setDisplayFormat('both')}
                        />
                        <span>Both</span>
                      </label>
                    </div>
                  </div>

                  <div className="recommendation-score-settings-group">
                    <label className="recommendation-score-settings-label">Category Chart Type</label>
                    <div className="recommendation-score-settings-radio">
                      <label className="recommendation-score-settings-item">
                        <input
                          type="radio"
                          name="categoryChartType"
                          value="bar"
                          checked={categoryChartType === 'bar'}
                          onChange={() => setCategoryChartType('bar')}
                        />
                        <span>Bar Chart</span>
                      </label>
                      <label className="recommendation-score-settings-item">
                        <input
                          type="radio"
                          name="categoryChartType"
                          value="pie"
                          checked={categoryChartType === 'pie'}
                          onChange={() => setCategoryChartType('pie')}
                        />
                        <span>Pie Chart</span>
                      </label>
                    </div>
                  </div>

                  <div className="recommendation-score-settings-group">
                    <label className="recommendation-score-settings-label">Loyalty Distribution Colors</label>
                    <div className="recommendation-score-settings-checkbox">
                      <label className="recommendation-score-settings-item">
                        <input
                          type="checkbox"
                          checked={useCategoryColors}
                          onChange={(e) => setUseCategoryColors(e.target.checked)}
                        />
                        <span>Use category colors (Detractors/Passives/Promoters)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'filters' && (
              <div className="unified-tab-content">
                <div className="unified-tab-body">
                  {filterContext && (
                    <FilterPanel
                      data={data}
                      onFilterChange={handleFilterChange}
                      onClose={() => {}}
                      isOpen={true}
                      contentOnly={true}
                      reportId={REPORT_ID}
                      forceLocalState={true}
                      loyaltyScale={loyaltyScale}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scale Conversion Modal */}
      {showScaleModal && (
        <ScaleConversionModal
          loyaltyScale={loyaltyScale}
          onClose={() => setShowScaleModal(false)}
        />
      )}

      {/* Reconnection Confirmation Modal */}
      {showReconnectModal && (
        <div className="filter-connection-modal-overlay" onClick={() => setShowReconnectModal(false)}>
          <div className="filter-connection-modal reconnect-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Connect to Main Chart Filters?</h3>
            </div>
            <div className="modal-content">
              <p>This will sync the Recommendation Score filters with the main chart filters. Any local filter changes will be lost.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="modal-button secondary"
                onClick={() => setShowReconnectModal(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-button primary"
                onClick={() => {
                  setShowReconnectModal(false);
                  handleConnectionToggle(true);
                }}
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

