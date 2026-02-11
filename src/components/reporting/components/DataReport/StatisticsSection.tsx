import React, { useState } from 'react';
import BarChart from '../BarChart';
import { HighlightableKPI } from '../HighlightableKPI';
import type { BarChartData } from '../BarChart';
import { DataPoint } from '@/types/base';
import { ReportFilter } from '../../filters/ReportFilterPanel';
import { useAxisLabels } from '../../../visualization/context/AxisLabelsContext';

interface StatisticsSectionProps {
  statistics: {
    satisfaction: {
      distribution: Record<number, number>;
      average: number;
      mode: number;
      max: number;
      min: number;
    };
    loyalty: {
      distribution: Record<number, number>;
      average: number;
      mode: number;
      max: number;
      min: number;
    };
  };
  scales: {
    satisfaction: string;
    loyalty: string;
  };
  totalEntries: number;
  isPremium: boolean;
  // Add these props for the original data needed for filtering
  originalData?: DataPoint[];
}

export const StatisticsSection: React.FC<StatisticsSectionProps> = ({
  statistics,
  scales,
  totalEntries,
  isPremium,
  originalData = []
}) => {
  const { labels } = useAxisLabels();
  const [satisfactionColors, setSatisfactionColors] = useState<Record<number, string>>({});
  const [loyaltyColors, setLoyaltyColors] = useState<Record<number, string>>({});
  
  // Add state for filters
  const [satisfactionFilters, setSatisfactionFilters] = useState<ReportFilter[]>([]);
  const [loyaltyFilters, setLoyaltyFilters] = useState<ReportFilter[]>([]);

  // Transform data for loyalty (integers only)
  const transformLoyaltyData = (distribution: Record<number, number>, scale: string): BarChartData[] => {
    const [min, max] = scale.split('-').map(Number);
    const barCount = max - min + 1;
    return Array.from({ length: barCount }, (_, i) => {
      const value = min + i;
      return {
        value: value,
        count: distribution[value] || 0
      };
    });
  };

  // Transform data for satisfaction (supports decimals)
  const transformSatisfactionData = (distribution: Record<number, number>, scale: string): BarChartData[] => {
    const [min, max] = scale.split('-').map(Number);
    
    // Get all unique values from the distribution (including decimals)
    const distributionKeys = Object.keys(distribution).map(Number);
    
    // Check if there are any decimal values
    const hasDecimals = distributionKeys.some(key => !Number.isInteger(key));
    
    if (!hasDecimals) {
      // No decimals - use integer bars only
      const barCount = max - min + 1;
      return Array.from({ length: barCount }, (_, i) => {
        const value = min + i;
        return {
          value: value,
          count: distribution[value] || 0
        };
      });
    }
    
    // Has decimals - create bars for all values that exist in the distribution
    // First, create a set of all values we want to show (integers + any decimals with data)
    const valuesToShow = new Set<number>();
    
    // Always include all integers in the scale range
    for (let i = min; i <= max; i++) {
      valuesToShow.add(i);
    }
    
    // Add any decimal values that have data
    distributionKeys.forEach(key => {
      if (key >= min && key <= max) {
        valuesToShow.add(key);
      }
    });
    
    // Sort and create bars
    const sortedValues = Array.from(valuesToShow).sort((a, b) => a - b);
    
    return sortedValues.map(value => ({
      value: value,
      count: distribution[value] || 0
    }));
  };

  return (
    <div className="report-section">
      <h4 className="report-section-title">Statistics</h4>
      <div className="report-stats-comparison">
        <div className="report-stats-column">
          <h5 className="report-column-title">{labels.satisfaction} ({scales.satisfaction})</h5>
          <HighlightableKPI id="satisfaction-average" isPremium={isPremium}>
            <div className="report-stat-item">
              <span className="report-stat-label">Average:</span>
              <span className="report-stat-value">
                {statistics.satisfaction.average.toFixed(2)}
              </span>
            </div>
          </HighlightableKPI>

          <HighlightableKPI id="satisfaction-mode" isPremium={isPremium}>
            <div className="report-stat-item">
              <span className="report-stat-label">Most Common:</span>
              <span className="report-stat-value">
                {statistics.satisfaction.mode}
                <span className="report-stat-subtext">
                  ({((statistics.satisfaction.distribution[statistics.satisfaction.mode] || 0) / totalEntries * 100).toFixed(1)}%)
                </span>
              </span>
            </div>
          </HighlightableKPI>

          <HighlightableKPI id="satisfaction-max" isPremium={isPremium}>
            <div className="report-stat-item">
              <span className="report-stat-label">Maximum:</span>
              <span className="report-stat-value">{statistics.satisfaction.max}</span>
            </div>
          </HighlightableKPI>

          <HighlightableKPI id="satisfaction-min" isPremium={isPremium}>
            <div className="report-stat-item">
              <span className="report-stat-label">Minimum:</span>
              <span className="report-stat-value">{statistics.satisfaction.min}</span>
            </div>
          </HighlightableKPI>
        </div>

        <div className="report-stats-column">
          <h5 className="report-column-title">{labels.loyalty} ({scales.loyalty})</h5>
          <HighlightableKPI id="loyalty-average" isPremium={isPremium}>
            <div className="report-stat-item">
              <span className="report-stat-label">Average:</span>
              <span className="report-stat-value">
                {statistics.loyalty.average.toFixed(2)}
              </span>
            </div>
          </HighlightableKPI>

          <HighlightableKPI id="loyalty-mode" isPremium={isPremium}>
            <div className="report-stat-item">
              <span className="report-stat-label">Most Common:</span>
              <span className="report-stat-value">
                {statistics.loyalty.mode}
                <span className="report-stat-subtext">
                  ({((statistics.loyalty.distribution[statistics.loyalty.mode] || 0) / totalEntries * 100).toFixed(1)}%)
                </span>
              </span>
            </div>
          </HighlightableKPI>

          <HighlightableKPI id="loyalty-max" isPremium={isPremium}>
            <div className="report-stat-item">
              <span className="report-stat-label">Maximum:</span>
              <span className="report-stat-value">{statistics.loyalty.max}</span>
            </div>
          </HighlightableKPI>

          <HighlightableKPI id="loyalty-min" isPremium={isPremium}>
            <div className="report-stat-item">
              <span className="report-stat-label">Minimum:</span>
              <span className="report-stat-value">{statistics.loyalty.min}</span>
            </div>
          </HighlightableKPI>
        </div>
      </div>

      <div className="report-stats-comparison mt-8">
        <div className="report-stats-column">
          <BarChart 
            data={transformSatisfactionData(
              statistics.satisfaction.distribution,
              scales.satisfaction
            )}
            showGrid={true}
            showLabels={true}
            interactive={true}
            customColors={satisfactionColors}
            onColorChange={(value, color) => {
              console.log('[StatisticsSection] onColorChange called - satisfaction bar:', value, 'color:', color);
              setSatisfactionColors(prev => {
                const newColors = {
                  ...prev,
                  [value]: color
                };
                console.log('[StatisticsSection] Updating satisfactionColors:', newColors);
                return newColors;
              });
            }}
            title={`${labels.satisfaction} (${scales.satisfaction})`}
            showLegend={true}
            chartId="satisfaction"
            // Add these new props for filtering
            originalData={originalData}
            onFilterChange={setSatisfactionFilters}
            activeFilters={satisfactionFilters}
            isPremium={isPremium}
          />
        </div>

        <div className="report-stats-column">
          <BarChart 
            data={transformLoyaltyData(
              statistics.loyalty.distribution,
              scales.loyalty
            )}
            showGrid={true}
            showLabels={true}
            interactive={true}
            customColors={loyaltyColors}
            onColorChange={(value, color) => {
              console.log('[StatisticsSection] onColorChange called - loyalty bar:', value, 'color:', color);
              setLoyaltyColors(prev => {
                const newColors = {
                  ...prev,
                  [value]: color
                };
                console.log('[StatisticsSection] Updating loyaltyColors:', newColors);
                return newColors;
              });
            }}
            title={`${labels.loyalty} (${scales.loyalty})`}
            showLegend={true}
            chartId="loyalty"
            // Add these new props for filtering
            originalData={originalData}
            onFilterChange={setLoyaltyFilters}
            activeFilters={loyaltyFilters}
            isPremium={isPremium}
          />
        </div>
      </div>
    </div>
  );
};

export default StatisticsSection;