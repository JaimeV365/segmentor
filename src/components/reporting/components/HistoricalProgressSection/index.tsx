import React, { useMemo } from 'react';
import { DataPoint, ScaleFormat } from '@/types/base';
import { hasHistoricalData, groupByCustomer } from './utils/historicalDataUtils';
import { useQuadrantAssignment } from '../../../visualization/context/QuadrantAssignmentContext';
import { 
  calculateTrendData, 
  calculateQuadrantMovements, 
  calculatePeriodComparison 
} from './services/historicalAnalysisService';
import { generateForecast } from './services/forecastService';
import { TrendChart } from './components/TrendChart';
import { QuadrantMovementFlow } from './components/QuadrantMovementFlow';
import { ForecastVisualization } from './components/ForecastVisualization';
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
  
  // Extract date format from first data point with date (if available)
  const dateFormat = useMemo(() => {
    const firstPointWithDate = data.find(p => p.date && p.dateFormat);
    return firstPointWithDate?.dateFormat;
  }, [data]);
  
  // Group data by customer (always calculate, even if we won't show)
  const timelines = useMemo(() => {
    return groupByCustomer(data);
  }, [data]);
  
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
    return null; // Don't render if no historical data
  }
  
  return (
    <div className="report-card" data-section-id="report-historical-progress">
      <div className="report-title-wrapper">
        <h3 className="report-title">Historical Progress</h3>
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
              <QuadrantMovementFlow movementStats={movementStats} />
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
    </div>
  );
};

export default HistoricalProgressSection;
