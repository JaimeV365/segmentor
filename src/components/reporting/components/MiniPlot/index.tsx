import React from 'react';
import { useAxisLabels } from '../../../visualization/context/AxisLabelsContext';
import './MiniPlot.css';

interface MiniPlotProps {
  combinations: Array<{
    satisfaction: number;
    loyalty: number;
    count: number;
    percentage: number;
    tier?: number;
    opacity?: number;
    size?: number;
  }>;
  satisfactionScale: string;
  loyaltyScale: string;
  useQuadrantColors?: boolean;
  customColors?: Record<string, string>;
  averagePoint?: {
    satisfaction: number;
    loyalty: number;
  };
  showAverageDot?: boolean;
  getPointColor?: (satisfaction: number, loyalty: number) => string;
}

export const MiniPlot: React.FC<MiniPlotProps> = ({
  combinations,
  satisfactionScale,
  loyaltyScale,
  useQuadrantColors = true,
  customColors,
  averagePoint,
  showAverageDot = true,
  getPointColor
}) => {
  const { labels } = useAxisLabels();
 // Calculate scales
  const [satisfactionMin, satisfactionMax] = satisfactionScale.split('-').map(Number);
  const [loyaltyMin, loyaltyMax] = loyaltyScale.split('-').map(Number);

  // Helper to determine point color - use prop function or fallback
  const getPointColorFinal = (satisfaction: number, loyalty: number) => {
    if (getPointColor) {
      return getPointColor(satisfaction, loyalty);
    }
    
    // Fallback logic if no prop function provided
    if (!useQuadrantColors && customColors?.default) {
      return customColors.default;
    }
    
    const midpoint = 2.5;
    if (satisfaction >= midpoint && loyalty >= midpoint) return '#4CAF50';
if (satisfaction >= midpoint && loyalty < midpoint) return '#F7B731';
if (satisfaction < midpoint && loyalty >= midpoint) return '#3A6494';
return '#CC0000';
  };

  // Calculate max count for dot sizing
  const maxCount = Math.max(...combinations.map(c => c.count));

  return (
    <div className="mini-plot">
      {/* Y-Axis */}
      <div className="mini-plot-y-axis">
      <div className="mini-plot-y-label text-sm text-gray-600">{labels.loyalty}</div>
        <div className="mini-plot-y-ticks">
          {[...Array(loyaltyMax - loyaltyMin + 1)].map((_, i) => (
            <div key={i} className="mini-plot-tick text-sm">
              {loyaltyMin + i}
            </div>
          ))}
        </div>
      </div>

      {/* Plot Area */}
      <div className="mini-plot-area">
        {/* Reference Grid */}
        <div className="mini-plot-grid">
          {/* Horizontal lines */}
          {[...Array(loyaltyMax - loyaltyMin)].map((_, i) => (
            <div key={`h-${i}`} className="mini-plot-grid-line horizontal" 
                 style={{ bottom: `${((i + 1) / (loyaltyMax - loyaltyMin + 1)) * 100}%` }} />
          ))}
          {/* Vertical lines */}
          {[...Array(satisfactionMax - satisfactionMin)].map((_, i) => (
            <div key={`v-${i}`} className="mini-plot-grid-line vertical" 
                 style={{ left: `${((i + 1) / (satisfactionMax - satisfactionMin + 1)) * 100}%` }} />
          ))}
        </div>

{/* Average Point */}
        {averagePoint && showAverageDot && (
          <div
            className="mini-plot-point mini-plot-point--average"
            style={{
              left: `${((averagePoint.satisfaction - satisfactionMin) / (satisfactionMax - satisfactionMin)) * 100}%`,
              bottom: `${((averagePoint.loyalty - loyaltyMin) / (loyaltyMax - loyaltyMin)) * 100}%`,
            }}
            title={`Average: ${averagePoint.satisfaction.toFixed(1)}, ${averagePoint.loyalty.toFixed(1)}`}
          />
        )}

        {/* Points */}
        {combinations.map((combo, index) => {
          const x = (combo.satisfaction - satisfactionMin) / (satisfactionMax - satisfactionMin) * 100;
          const y = (combo.loyalty - loyaltyMin) / (loyaltyMax - loyaltyMin) * 100;
          const color = getPointColorFinal(combo.satisfaction, combo.loyalty);

          // Build CSS classes - include tier class if combo has tier property
          const pointClasses = [
            'mini-plot-point',
            combo.tier ? `mini-plot-point--tier${combo.tier}` : ''
          ].filter(Boolean).join(' ');

          // Use combo.size and combo.opacity if provided (for multi-tier visualization)
          // Default size scale: 1 = 100%, tier2 = 0.9 = 90%, tier3 = 0.85 = 85%
          const pointSize = combo.size !== undefined ? combo.size : 1;
          const pointOpacity = combo.opacity !== undefined ? combo.opacity : 1;
          
          // Calculate actual width/height in pixels (base size is 16px for better visibility)
          const baseSize = 16;
          const actualSize = baseSize * pointSize;

          return (
            <div
              key={index}
              className={pointClasses}
              style={{
                left: `${x}%`,
                bottom: `${y}%`,
                backgroundColor: color,
                width: `${actualSize}px`,
                height: `${actualSize}px`,
                opacity: pointOpacity,
                transform: 'translate(-50%, 50%)' // Center the point on coordinates
              }}
              title={`${labels.satisfaction}: ${combo.satisfaction}, ${labels.loyalty}: ${combo.loyalty} (${combo.count} responses)`}
            />
          );
        })}
      </div>

      {/* X-Axis */}
      <div className="mini-plot-x-axis">
        <div className="mini-plot-x-ticks">
          {[...Array(satisfactionMax - satisfactionMin + 1)].map((_, i) => (
            <div key={i} className="mini-plot-tick text-sm">
              {satisfactionMin + i}
            </div>
          ))}
        </div>
        <div className="mini-plot-x-label text-sm text-gray-600">{labels.satisfaction}</div>
      </div>
    </div>
  );
};