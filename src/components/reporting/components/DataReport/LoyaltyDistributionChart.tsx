import React, { useState, useEffect, useRef } from 'react';
import type { ScaleFormat } from '@/types/base';
import { categorizeLoyaltyValue } from '../../../../utils/recommendationScore';

interface LoyaltyDistributionChartProps {
  distribution: Record<number, number>;
  loyaltyScale: ScaleFormat;
  displayFormat?: 'count' | 'percentage' | 'both';
  useCategoryColors?: boolean;
}

const CATEGORY_COLORS = {
  detractor: '#DC2626',
  passive: '#F97316',
  promoter: '#16A34A'
};

export const LoyaltyDistributionChart: React.FC<LoyaltyDistributionChartProps> = ({
  distribution,
  loyaltyScale,
  displayFormat = 'both',
  useCategoryColors = false
}) => {
  const [min, max] = loyaltyScale.split('-').map(Number);
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  const maxCount = Math.max(...Object.values(distribution), 1);
  const barCount = max - min + 1;
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldRotateLabels, setShouldRotateLabels] = useState(false);
  
  // Determine if labels should be rotated vertically
  // Rotate if there are many bars OR if container is narrow
  useEffect(() => {
    const checkRotation = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const minWidthPerBar = 40; // Minimum width needed per bar for horizontal labels
        const neededWidth = barCount * minWidthPerBar;
        // Rotate if too many bars OR container is too narrow
        setShouldRotateLabels(barCount > 7 || containerWidth < neededWidth);
      }
    };
    
    checkRotation();
    window.addEventListener('resize', checkRotation);
    return () => window.removeEventListener('resize', checkRotation);
  }, [barCount]);

  return (
    <div className="loyalty-distribution-chart" ref={containerRef}>
      <h5 className="chart-title">Loyalty Distribution ({loyaltyScale})</h5>
      <div className="chart-bars">
        {Array.from({ length: barCount }, (_, i) => {
          const value = min + i;
          const count = distribution[value] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          const barHeight = maxCount > 0 ? (count / maxCount) * 100 : 0;
          
          // Get category color if enabled
          const category = useCategoryColors ? categorizeLoyaltyValue(value, loyaltyScale) : null;
          const barColor = category ? CATEGORY_COLORS[category] : '#3a863e';

          return (
            <div key={value} className="chart-bar-container">
              <div className="chart-bar-wrapper">
                <div
                  className="chart-bar"
                  style={{ 
                    height: `${barHeight}%`,
                    backgroundColor: barColor
                  }}
                  title={`Value ${value}: ${count} responses (${percentage.toFixed(1)}%)`}
                >
                  {displayFormat !== 'percentage' && count > 0 && (
                    <span className="chart-bar-count">{count}</span>
                  )}
                </div>
              </div>
              <div className="chart-bar-label">
                {value}
              </div>
              {displayFormat !== 'count' && (
                <div className={`chart-bar-percentage ${shouldRotateLabels ? 'rotated' : ''}`}>
                  {percentage.toFixed(1)}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

