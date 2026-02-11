import React, { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from 'react';
import type { DataReport as DataReportType } from '../../types';
import { HighlightableKPI } from '../HighlightableKPI';
import StatisticsSection from './StatisticsSection';
import { RecommendationScoreSection } from './RecommendationScoreSection';
import { DataPoint } from '@/types/base';
import type { QuadrantType } from '../../types';
import { InfoRibbon } from '../InfoRibbon';
import { Menu, X, Settings, Filter, Link2, Link2Off } from 'lucide-react';
import FilterPanel from '../../../visualization/filters/FilterPanel';
import { useFilterContextSafe } from '../../../visualization/context/FilterContext';
import { ReportFilter } from '../../filters/ReportFilterPanel';
import { useNotification } from '../../../data-entry/hooks/useNotification';
import { useAxisLabels } from '../../../visualization/context/AxisLabelsContext';
import '../../../visualization/controls/UnifiedChartControls.css';

interface DataReportProps {
  report: DataReportType | null;
  onCustomize: (reportType: 'data') => void;
  onExport: (reportType: 'data') => void;
  onShare: (reportType: 'data') => void;
  isClassicModel: boolean;
  isPremium?: boolean;
  originalData?: DataPoint[];
}

export const DataReport: React.FC<DataReportProps> = ({
  report,
  onCustomize,
  onExport,
  onShare,
  isClassicModel = true,
  isPremium = false,
  originalData = []
}) => {
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantType | null>(null);
  
  // Type guard to ensure only basic quadrants are used for quadrantStats
  const isBasicQuadrant = (quadrant: string | null): quadrant is QuadrantType => {
    return quadrant === 'loyalists' || quadrant === 'hostages' || quadrant === 'mercenaries' || quadrant === 'defectors';
  };
  const [showRecommendationScore, setShowRecommendationScore] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'filters'>('settings');
  const [autoOpenRecommendationScorePanel, setAutoOpenRecommendationScorePanel] = useState(false);
  const settingsPanelRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const recommendationScoreSectionRef = useRef<HTMLDivElement>(null);

  // Filter system state
  const filterContext = useFilterContextSafe();
  const { showNotification } = useNotification();
  const { labels } = useAxisLabels();
  const REPORT_ID = useMemo(() => 'dataReportStatistics', []);
  const [activeFilters, setActiveFilters] = useState<ReportFilter[]>([]);
  const [filteredDataFromPanel, setFilteredDataFromPanel] = useState<DataPoint[] | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [isManualReconnecting, setIsManualReconnecting] = useState(false);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  
  // Initialize showRecommendationScore from localStorage on mount (for seg file loading)
  useEffect(() => {
    const saved = localStorage.getItem('showRecommendationScore');
    if (saved === 'true') {
      setShowRecommendationScore(true);
    }
  }, []); // Only run on mount
  
  // Listen for seg file load events to update state
  useEffect(() => {
    const handleSegFileLoaded = () => {
      const saved = localStorage.getItem('showRecommendationScore');
      setShowRecommendationScore(saved === 'true');
    };
    
    // Listen for custom event when seg file is loaded
    document.addEventListener('segFileLoaded', handleSegFileLoaded);
    
    // Also listen for storage events (for cross-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'showRecommendationScore') {
        setShowRecommendationScore(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      document.removeEventListener('segFileLoaded', handleSegFileLoaded);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Persist showRecommendationScore to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('showRecommendationScore', showRecommendationScore.toString());
  }, [showRecommendationScore]);

  // Initialize report filter state - sync to main filters by default
  useLayoutEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[REPORT_ID]) {
      console.log('🔌 [DataReport] LAYOUT EFFECT INIT: Syncing report state to main state');
      filterContext.syncReportToMaster(REPORT_ID);
    }
  }, [filterContext, REPORT_ID]);

  // Backup initialization check (runs after first render)
  useEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[REPORT_ID]) {
      console.log('🔌 [DataReport] Backup init: Syncing report state to main state');
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
    const attributeFilterCount = stateToUse.attributes?.filter((attr: any) => attr.values && attr.values.size > 0).length || 0;
    const totalCount = (hasDateFilter ? 1 : 0) + attributeFilterCount;
    
    // Fallback to activeFilters array length if available and state count is 0
    return totalCount > 0 ? totalCount : (activeFilters?.length || 0);
  }, [filterContext, isConnected, REPORT_ID, activeFilters]);

  // Clear filteredDataFromPanel when report reconnects
  useEffect(() => {
    if (isConnected && filteredDataFromPanel !== null) {
      console.log(`🔌 [DataReport] Report reconnected - clearing filteredDataFromPanel and using main filteredData`);
      setFilteredDataFromPanel(null);
    }
  }, [isConnected, filteredDataFromPanel]);

  // Get effective filtered data for statistics
  const effectiveDataForStatistics = useMemo(() => {
    if (!filterContext) return originalData.filter(d => !d.excluded);
    
    // If disconnected and we have filtered data from panel, use it
    if (!isConnected && filteredDataFromPanel !== null) {
      return filteredDataFromPanel;
    }
    
    // Otherwise, use report filter system
    return filterContext.getReportFilteredData(REPORT_ID, originalData);
  }, [originalData, filterContext, REPORT_ID, isConnected, filteredDataFromPanel]);

  // Calculate filtered statistics
  const filteredStatistics = useMemo(() => {
    const activeData = effectiveDataForStatistics.filter((d: DataPoint) => !d.excluded);
    if (activeData.length === 0) {
      return report?.statistics || null;
    }

    // Calculate statistics from filtered data
    const calculateStatistics = (values: number[]) => {
      if (values.length === 0) {
        return {
          distribution: {} as Record<number, number>,
          average: 0,
          mode: 0,
          max: 0,
          min: 0
        };
      }

      const distribution = values.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const distributionValues = Object.values(distribution);
      const maxFreq = distributionValues.length > 0 ? Math.max(...distributionValues) : 0;
      const mode = maxFreq > 0 
        ? Number(Object.keys(distribution).find(key => distribution[Number(key)] === maxFreq))
        : 0;

      return {
        distribution,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        mode,
        max: Math.max(...values),
        min: Math.min(...values)
      };
    };

    return {
      satisfaction: calculateStatistics(activeData.map((d: DataPoint) => d.satisfaction)),
      loyalty: calculateStatistics(activeData.map((d: DataPoint) => d.loyalty))
    };
  }, [effectiveDataForStatistics, report?.statistics]);

  // Handle filter changes from FilterPanel
  const handleFilterChange = (filteredData: DataPoint[], newFilters: ReportFilter[]) => {
    setFilteredDataFromPanel(filteredData);
    setActiveFilters(newFilters || []);
    
    // Track local changes for connection status
    if (!isManualReconnecting && filterContext) {
      setHasLocalChanges(true);
    }
  };

  // Handle connection toggle
  const handleConnectionToggle = useCallback((confirmed: boolean) => {
    if (!filterContext) return;
    
    if (confirmed) {
      setIsManualReconnecting(true);
      
      console.log(`🔔 [DataReport] Manual reconnect - syncing to main state`);
      
      filterContext.syncReportToMaster(REPORT_ID);
      setHasLocalChanges(false);
      
      setShowReconnectModal(false);
      
      // Show notification
      console.log(`🔔 [DataReport] Showing notification`);
      try {
        showNotification({
          title: 'Filters Connected',
          message: 'Data Report statistics filters are now synced with the main chart.',
          type: 'success',
          icon: <Link2 size={18} style={{ color: '#166534' }} />
        });
      } catch (error) {
        console.error('🔔 [DataReport] Error showing notification:', error);
      }
      
      setTimeout(() => {
        setIsManualReconnecting(false);
      }, 100);
    } else {
      setShowReconnectModal(false);
    }
  }, [filterContext, REPORT_ID, showNotification]);
  
  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        settingsPanelRef.current &&
        !settingsPanelRef.current.contains(event.target as Node) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(event.target as Node)
      ) {
        setShowSettingsPanel(false);
      }
    };
    
    if (showSettingsPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSettingsPanel]);

  // Handle escape key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showSettingsPanel) {
        setShowSettingsPanel(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showSettingsPanel]);

  // Add/remove body class when panel is open/closed
  useEffect(() => {
    if (showSettingsPanel) {
      document.body.classList.add('unified-controls-open');
    } else {
      document.body.classList.remove('unified-controls-open');
    }

    return () => {
      document.body.classList.remove('unified-controls-open');
    };
  }, [showSettingsPanel]);

  // Scroll to recommendation score section only when the user manually ticks the box (not on data load)
  useEffect(() => {
    if (showRecommendationScore && autoOpenRecommendationScorePanel && recommendationScoreSectionRef.current) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          recommendationScoreSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          setTimeout(() => {
            setAutoOpenRecommendationScorePanel(false);
          }, 100);
        }, 150);
      });
    }
  }, [showRecommendationScore, autoOpenRecommendationScorePanel]);
   
  if (!report) return null;

  const handleQuadrantMove = (fromIndex: number, toIndex: number) => {
    // This would handle reordering of quadrants in a premium version
    if (!isPremium) return;
  };

  const handleQuadrantSelect = (quadrant: QuadrantType) => {
    setSelectedQuadrant(prev => prev === quadrant ? null : quadrant);
  };
  
  return (
    <div className="report-card" onClick={(e) => e.stopPropagation()}>
      <div className="report-title-wrapper">
        <h3 className="report-title">Data Report</h3>
        <div className="data-report-controls">
          <button
            ref={settingsButtonRef}
            className={`data-report-settings-button ${showSettingsPanel ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              const newState = !showSettingsPanel;
              setShowSettingsPanel(newState);
              if (newState) {
                setActiveTab('settings'); // Default to settings tab
              }
            }}
            title="Data Report settings"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>
      {/* Introductory information specific to Data Report */}
      <div className="report-content" style={{ paddingTop: 0 }}>
        <InfoRibbon text={`This Data Report provides an overview of your dataset with key statistics and distributions. Use it to identify overall response trends and the most common ${labels.satisfaction.toLowerCase()}–${labels.loyalty.toLowerCase()} combinations to help you analyse and segment customer data.`} />
      </div>
      <div className="report-content">
        {/* Basic Information section */}
        <div className="report-section">
          <h4 className="report-section-title">Basic Information</h4>
          <div className="report-data-grid">
            <HighlightableKPI id="date" isPremium={isPremium}>
              <div className="report-stat-item flex justify-between w-full">
                <span className="report-stat-label">Date:</span>
                <span className="report-stat-value">
                  {new Date(report.date).toLocaleDateString()}
                </span>
              </div>
            </HighlightableKPI>
            <HighlightableKPI id="satisfaction-scale" isPremium={isPremium}>
              <div className="report-stat-item">
                <span className="report-stat-label">{labels.satisfaction} Scale:</span>
                <span className="report-stat-value">{report.satisfactionScale}</span>
              </div>
            </HighlightableKPI>
            <HighlightableKPI id="loyalty-scale" isPremium={isPremium}>
              <div className="report-stat-item flex justify-between w-full">
                <span className="report-stat-label">{labels.loyalty} Scale:</span>
                <span className="report-stat-value">{report.loyaltyScale}</span>
              </div>
            </HighlightableKPI>
          </div>
        </div>

        {/* Respondent Information section */}
        <div className="report-section">
          <h4 className="report-section-title">Respondent Information</h4>
          <div className="report-data-grid">
            <HighlightableKPI id="total-entries" isPremium={isPremium}>
              <div className="report-stat-item flex justify-between w-full">
                <span className="report-stat-label">Total Entries:</span>
                <span className="report-stat-value">{report.totalEntries}</span>
              </div>
            </HighlightableKPI>
            <HighlightableKPI id="excluded-entries" isPremium={isPremium}>
              <div className="report-stat-item flex justify-between w-full">
                <span className="report-stat-label">Excluded:</span>
                <span className="report-stat-value">{report.excludedEntries}</span>
              </div>
            </HighlightableKPI>
            <HighlightableKPI id="identified-entries" isPremium={isPremium}>
              <div className="report-stat-item flex justify-between w-full">
                <span className="report-stat-label">Identified:</span>
                <span className="report-stat-value">{report.identifiedCount}</span>
              </div>
            </HighlightableKPI>
            <HighlightableKPI id="anonymous-entries" isPremium={isPremium}>
              <div className="report-stat-item flex justify-between w-full">
                <span className="report-stat-label">Anonymous:</span>
                <span className="report-stat-value">{report.anonymousCount}</span>
              </div>
            </HighlightableKPI>
          </div>
        </div>

        {/* Statistics section */}
        <StatisticsSection 
          statistics={filteredStatistics || report.statistics}
          scales={{
            satisfaction: report.satisfactionScale,
            loyalty: report.loyaltyScale
          }}
          totalEntries={effectiveDataForStatistics.filter((d: DataPoint) => !d.excluded).length || report.totalEntries}
          isPremium={isPremium}
          originalData={originalData}
        />

        {/* Recommendation Score section */}
        {showRecommendationScore && (
          <div ref={recommendationScoreSectionRef} id="recommendation-score-section" data-section-id="report-recommendation-score">
            <RecommendationScoreSection
              data={originalData.filter(d => !d.excluded)}
              loyaltyScale={report.loyaltyScale}
              isPremium={isPremium}
              autoOpenPanel={autoOpenRecommendationScorePanel}
              onPanelOpen={() => {
                // Panel is now open, reset the flag
                setAutoOpenRecommendationScorePanel(false);
              }}
            />
          </div>
        )}

        {/* Selected Quadrant Details (if any) - only show for basic quadrants */}
        {selectedQuadrant && 
         isBasicQuadrant(selectedQuadrant) &&
         report.quadrantStats && 
         report.quadrantStats[selectedQuadrant] && (
          <div className="report-section">
            <h4 className="report-section-title">{selectedQuadrant.charAt(0).toUpperCase() + selectedQuadrant.slice(1)} Details</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded border">
                  <h5 className="font-medium text-gray-700">Statistics</h5>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-sm text-gray-600">Count</p>
                      <p className="font-semibold">{report.quadrantStats[selectedQuadrant].count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Percentage</p>
                      <p className="font-semibold">{report.quadrantStats[selectedQuadrant].percentage.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg. {labels.satisfaction}</p>
                      <p className="font-semibold">{report.quadrantStats[selectedQuadrant].satisfaction.average.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg. {labels.loyalty}</p>
                      <p className="font-semibold">{report.quadrantStats[selectedQuadrant].loyalty.average.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-white rounded border">
                  <h5 className="font-medium text-gray-700">Key Findings</h5>
                  <ul className="mt-2 text-sm space-y-1">
                    <li>• Most common {labels.satisfaction.toLowerCase()}: {Object.entries(report.quadrantStats[selectedQuadrant].satisfaction.distribution)
                      .sort((a, b) => b[1] - a[1])[0][0]}</li>
                    <li>• Most common {labels.loyalty.toLowerCase()}: {Object.entries(report.quadrantStats[selectedQuadrant].loyalty.distribution)
                      .sort((a, b) => b[1] - a[1])[0][0]}</li>
                    {isPremium && (
                      <li>• Significance: {report.quadrantStats[selectedQuadrant].count > (report.totalEntries * 0.25) 
                        ? 'High' : report.quadrantStats[selectedQuadrant].count > (report.totalEntries * 0.1) 
                        ? 'Medium' : 'Low'}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        
      </div>

      {/* Contextual Menu Panel */}
      {showSettingsPanel && (
        <div className="unified-controls-panel data-report-panel" ref={settingsPanelRef}>
          <div className="unified-controls-header">
            <div className="bar-chart-panel-title">
              Data Report
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
            <button className="unified-close-button" onClick={() => setShowSettingsPanel(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="unified-controls-content">
            {activeTab === 'settings' && (
              <div className="unified-tab-content">
                <div className="unified-tab-body">
                  <label className="data-report-settings-item">
                    <input
                      type="checkbox"
                      checked={showRecommendationScore}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setShowRecommendationScore(isChecked);
                        // Close Data Report panel and auto-open Recommendation Score panel
                        if (isChecked) {
                          setShowSettingsPanel(false);
                          setAutoOpenRecommendationScorePanel(true);
                        }
                      }}
                    />
                    <span>Show Recommendation Score</span>
                  </label>
                  <div style={{ marginTop: '0.5rem', marginLeft: '1rem', marginRight: '1rem' }}>
                    <InfoRibbon text={`The Recommendation Score is based on the classic "How likely are you to recommend (...)" question.\n\nThis score segments your loyalty data into three groups:\n• Detractors (unlikely to recommend)\n• Passives (neutral)\n• Promoters (likely to recommend)`} />
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'filters' && (
              <div className="unified-tab-content">
                <div className="unified-tab-body">
                  {filterContext && (
                    <FilterPanel
                      data={originalData.filter(d => !d.excluded)}
                      onFilterChange={handleFilterChange}
                      onClose={() => {}}
                      isOpen={true}
                      contentOnly={true}
                      reportId={REPORT_ID}
                      forceLocalState={true}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reconnection Confirmation Modal */}
      {showReconnectModal && (
        <div className="filter-connection-modal-overlay" onClick={() => setShowReconnectModal(false)}>
          <div className="filter-connection-modal reconnect-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Connect to Main Chart Filters?</h3>
            </div>
            <div className="modal-content">
              <p>This will sync the Data Report statistics filters with the main chart filters. Any local filter changes will be lost.</p>
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

export default DataReport;