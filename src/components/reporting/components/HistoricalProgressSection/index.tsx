import React, { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { DataPoint, ScaleFormat } from '@/types/base';
import { hasHistoricalData, groupByCustomer } from './utils/historicalDataUtils';
import { useQuadrantAssignment } from '../../../visualization/context/QuadrantAssignmentContext';
import { useFilterContextSafe } from '../../../visualization/context/FilterContext';
import { useNotification } from '../../../data-entry/hooks/useNotification';
import FilterPanel from '../../../visualization/filters/FilterPanel';
import { 
  calculateTrendData, 
  calculateQuadrantMovements, 
  calculatePeriodComparison 
} from './services/historicalAnalysisService';
import { generateForecast } from './services/forecastService';
import { TrendChart } from './components/TrendChart';
import { QuadrantMovementFlow } from './components/QuadrantMovementFlow';
import { ForecastVisualization } from './components/ForecastVisualization';
import { Filter, X, Link2, Link2Off } from 'lucide-react';
import './HistoricalProgressSection.css';

interface HistoricalProgressSectionProps {
  data: DataPoint[];
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  isPremium?: boolean;
}

export const HistoricalProgressSection: React.FC<HistoricalProgressSectionProps> = ({
  data,
  satisfactionScale,
  loyaltyScale,
  isPremium = false
}) => {
  // Get quadrant assignment function from context
  const { getQuadrantForPoint } = useQuadrantAssignment();
  const filterContext = useFilterContextSafe();
  const { showNotification } = useNotification();
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterResetTrigger, setFilterResetTrigger] = useState(0);
  const [filteredDataFromPanel, setFilteredDataFromPanel] = useState<DataPoint[] | null>(null);
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  const [isManualReconnecting, setIsManualReconnecting] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const REPORT_ID = useMemo(() => 'historicalProgressSection', []);
  
  // Initialize filter state
  useLayoutEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[REPORT_ID]) {
      filterContext.syncReportToMaster(REPORT_ID);
    }
  }, [filterContext, REPORT_ID]);
  
  useEffect(() => {
    if (filterContext && !filterContext.reportFilterStates[REPORT_ID]) {
      filterContext.syncReportToMaster(REPORT_ID);
    }
  }, [filterContext, REPORT_ID]);
  
  // Check if filters are connected to main chart
  const isConnected = useMemo(() => {
    if (!filterContext) {
      return true;
    }
    const reportState = filterContext.reportFilterStates[REPORT_ID];
    if (!reportState) {
      return true;
    }
    return filterContext.compareFilterStates(reportState, filterContext.filterState);
  }, [filterContext, REPORT_ID, filterContext?.reportFilterStates?.[REPORT_ID], filterContext?.filterState]);
  
  // Count active filters
  const filterCount = useMemo(() => {
    if (!filterContext) return 0;
    const stateToUse = isConnected 
      ? filterContext.filterState 
      : (filterContext.getReportFilterState(REPORT_ID) || filterContext.filterState);
    const hasDateFilter = stateToUse.dateRange?.preset && stateToUse.dateRange.preset !== 'all';
    const attributeFilterCount = stateToUse.attributes?.filter(attr => attr.values && attr.values.size > 0).length || 0;
    return (hasDateFilter ? 1 : 0) + attributeFilterCount;
  }, [filterContext, isConnected, REPORT_ID]);
  
  // Get effective filtered data
  const effectiveData = useMemo(() => {
    if (!filterContext || !data) {
      return data;
    }
    if (!isConnected && filteredDataFromPanel) {
      return filteredDataFromPanel;
    }
    return filterContext.getReportFilteredData(REPORT_ID, data);
  }, [data, filterContext, REPORT_ID, filteredDataFromPanel, isConnected]);
  
  // Handle filter changes
  const handleFilterChange = useCallback((filteredData: DataPoint[], filters: any[], filterState?: any) => {
    setFilteredDataFromPanel(filteredData);
    setHasLocalChanges(true);
  }, []);
  
  // Handle filter reset
  const handleFilterReset = useCallback(() => {
    setFilterResetTrigger(prev => prev + 1);
    setFilteredDataFromPanel(null);
    setHasLocalChanges(false);
  }, []);
  
  // Handle connection toggle
  const handleConnectionToggle = useCallback(() => {
    if (!filterContext) return;
    
    if (isConnected) {
      // Disconnect: sync current main state to report, then disconnect
      filterContext.syncReportToMaster(REPORT_ID);
      setIsManualReconnecting(true);
      // The disconnect happens automatically when user changes filters
    } else {
      // Connect: sync report to main
      filterContext.syncReportToMaster(REPORT_ID);
      setFilteredDataFromPanel(null);
      setHasLocalChanges(false);
      setIsManualReconnecting(false);
    }
  }, [filterContext, REPORT_ID, isConnected]);
  
  // Clear local changes when connected
  useEffect(() => {
    if (isConnected && filteredDataFromPanel !== null) {
      setFilteredDataFromPanel(null);
      setHasLocalChanges(false);
    }
  }, [isConnected, filteredDataFromPanel]);
  
  // Extract date format from first data point with date (if available)
  const dateFormat = useMemo(() => {
    const firstPointWithDate = effectiveData.find(p => p.date && p.dateFormat);
    return firstPointWithDate?.dateFormat;
  }, [effectiveData]);
  
  // Group data by customer (always calculate, even if we won't show)
  // Use effectiveData (filtered) for calculations
  const timelines = useMemo(() => {
    return groupByCustomer(effectiveData);
  }, [effectiveData]);
  
  // Calculate trend data
  const trendData = useMemo(() => {
    return calculateTrendData(timelines, dateFormat);
  }, [timelines, dateFormat]);
  
  // Calculate quadrant movements
  const movementStats = useMemo(() => {
    return calculateQuadrantMovements(timelines, getQuadrantForPoint);
  }, [timelines, getQuadrantForPoint]);
  
  // Calculate period comparison
  const periodComparison = useMemo(() => {
    return calculatePeriodComparison(trendData);
  }, [trendData]);
  
  // Generate forecast
  const forecast = useMemo(() => {
    return generateForecast(trendData);
  }, [trendData]);
  
  // Check if we have historical data to show (after all hooks)
  if (!hasHistoricalData(data)) {
    console.log('[HistoricalProgress] No historical data, not rendering. Data length:', data.length);
    return null; // Don't render if no historical data
  }
  
  console.log('[HistoricalProgress] Rendering section. Data length:', data.length, 'Timelines:', timelines.length);
  
  return (
    <div className="report-card" data-section-id="report-historical-progress">
      <div className="report-title-wrapper">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <h3 className="report-title">Historical Progress</h3>
          <div className="historical-progress-header-controls">
            <button
              ref={filterButtonRef}
              className={`historical-progress-filter-button ${showFilterPanel ? 'active' : ''} ${filterCount > 0 ? 'has-filters' : ''}`}
              onClick={() => setShowFilterPanel(prev => !prev)}
              title="Filter data for this section"
            >
              <Filter size={18} />
              {filterCount > 0 && (
                <span className="filter-badge small">{filterCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="report-content">
        <div className="report-section">
          <p className="report-section-description">
            Track customer satisfaction and loyalty changes over time, analyze quadrant movements, and forecast future trends.
          </p>
          
          <div className="historical-progress-stats">
            <div className="report-stat-item">
              <span className="report-stat-label">Customers Tracked</span>
              <span className="report-stat-value">{timelines.length}</span>
            </div>
            <div className="report-stat-item">
              <span className="report-stat-label">Total Data Points</span>
              <span className="report-stat-value">
                {timelines.reduce((sum, t) => sum + t.dataPoints.length, 0)}
              </span>
            </div>
            {periodComparison && (
              <>
                <div className="report-stat-item">
                  <span className="report-stat-label">Satisfaction Change</span>
                  <span className={`report-stat-value ${periodComparison.satisfactionChange >= 0 ? 'positive' : 'negative'}`}>
                    {periodComparison.satisfactionChange >= 0 ? '+' : ''}{periodComparison.satisfactionChange}
                  </span>
                </div>
                <div className="report-stat-item">
                  <span className="report-stat-label">Loyalty Change</span>
                  <span className={`report-stat-value ${periodComparison.loyaltyChange >= 0 ? 'positive' : 'negative'}`}>
                    {periodComparison.loyaltyChange >= 0 ? '+' : ''}{periodComparison.loyaltyChange}
                  </span>
                </div>
              </>
            )}
          </div>
          
          {/* Trend Charts */}
          {trendData.length > 0 && (
            <div className="historical-progress-charts">
              <div className="trend-charts-grid">
                <TrendChart
                  data={trendData}
                  timelines={timelines}
                  scale={satisfactionScale}
                  metric="satisfaction"
                  title="Satisfaction Trend Over Time"
                  dateFormat={dateFormat}
                />
                <TrendChart
                  data={trendData}
                  timelines={timelines}
                  scale={loyaltyScale}
                  metric="loyalty"
                  title="Loyalty Trend Over Time"
                  dateFormat={dateFormat}
                />
              </div>
              
              <TrendChart
                data={trendData}
                timelines={timelines}
                scale={satisfactionScale}
                metric="both"
                title="Combined Satisfaction & Loyalty Trends"
                dateFormat={dateFormat}
              />
            </div>
          )}
          
          {/* Quadrant Movement Analysis */}
          {movementStats.totalMovements > 0 && (
            <div className="historical-progress-movements">
              <h4 className="report-subtitle">Quadrant Movements</h4>
              <QuadrantMovementFlow 
                movementStats={movementStats}
                timelines={timelines}
                data={data}
              />
            </div>
          )}
          
          {/* Forecast Visualization */}
          {forecast && trendData.length >= 3 && (
            <div className="historical-progress-forecast">
              <ForecastVisualization
                forecast={forecast}
                historicalData={trendData}
                satisfactionScale={satisfactionScale}
                loyaltyScale={loyaltyScale}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="unified-controls-panel proximity-controls-panel" ref={panelRef}>
          <div className="unified-controls-header">
            <div className="unified-controls-tabs">
              <div className="unified-tab active">
                <Filter size={16} />
                Filters
                <span 
                  className="connection-status-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isConnected) {
                      setShowReconnectModal(true);
                    }
                  }}
                  title={isConnected ? 'Connected to main filters' : 'Click to reconnect to main filters'}
                  style={{ cursor: !isConnected ? 'pointer' : 'default' }}
                >
                  {isConnected ? <Link2 size={14} /> : <Link2Off size={14} />}
                </span>
                {filterCount > 0 && (
                  <span className="unified-filter-badge">{filterCount}</span>
                )}
              </div>
            </div>
            <button className="unified-close-button" onClick={() => setShowFilterPanel(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="unified-controls-content">
            <div className="unified-tab-content">
              <div className="unified-tab-body">
                {filterContext && (
                  <FilterPanel
                    data={data || []}
                    onFilterChange={handleFilterChange}
                    onClose={() => {}}
                    isOpen={true}
                    contentOnly={true}
                    resetTrigger={filterResetTrigger}
                    onShowNotification={showNotification}
                    reportId={REPORT_ID}
                    forceLocalState={true}
                  />
                )}
              </div>
              <div className="unified-tab-footer">
                <button 
                  className="unified-reset-button" 
                  onClick={handleFilterReset}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Reconnect Modal */}
      {showReconnectModal && (
        <div className="filter-connection-modal-overlay">
          <div className="filter-connection-modal">
            <div className="modal-header">
              <h3>Connect to Main Filters?</h3>
            </div>
            <div className="modal-content">
              <p>This will discard local Historical Progress filters and sync with the main chart filters.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="modal-btn cancel-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReconnectModal(false);
                }}
              >
                Cancel
              </button>
              <button 
                className="modal-btn confirm-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReconnectModal(false);
                  handleConnectionToggle();
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

export default HistoricalProgressSection;
