import React from 'react';
import { DataPoint, ScaleFormat } from '@/types/base';
import { hasHistoricalData, groupByCustomer } from './utils/historicalDataUtils';
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
  // Check if we have historical data to show
  if (!hasHistoricalData(data)) {
    return null; // Don't render if no historical data
  }
  
  const timelines = groupByCustomer(data);
  
  return (
    <div className="report-card">
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
          </div>
          
          {/* Placeholder for future components */}
          <div className="historical-progress-placeholder">
            <p>Historical analysis components coming soon...</p>
            <p className="text-sm text-gray-500">
              This will include:
            </p>
            <ul className="text-sm text-gray-500 mt-2">
              <li>• Satisfaction and Loyalty trend charts</li>
              <li>• Quadrant movement analysis</li>
              <li>• Basic forecasting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoricalProgressSection;
