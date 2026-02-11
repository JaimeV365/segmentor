import React from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { useAxisLabels } from '../../../visualization/context/AxisLabelsContext';
import './styles.css';

interface CombinationDialProps {
  statistics: {
    satisfaction: {
      distribution: Record<number, number>;
      average: number;
      mode: number;
    };
    loyalty: {
      distribution: Record<number, number>;
      average: number;
      mode: number;
    };
  };
  totalEntries: number;
  isPremium?: boolean;
  minValue?: number;
  maxValue?: number;
  customColors?: {
    satisfaction: string;
    loyalty: string;
  };
}

const CombinationDial: React.FC<CombinationDialProps> = ({ 
  statistics,
  totalEntries,
  isPremium = false,
  minValue = 0,
  maxValue = 100,
  customColors
}) => {
  const { labels } = useAxisLabels();
  const calculateMaxValues = () => {
    const satEntries = Object.entries(statistics.satisfaction.distribution);
    const maxSat = satEntries.reduce((max, [value, count]) => 
      count > max.count ? { value: Number(value), count } : max
    , { value: 0, count: 0 });

    const loyEntries = Object.entries(statistics.loyalty.distribution);
    const maxLoy = loyEntries.reduce((max, [value, count]) => 
      count > max.count ? { value: Number(value), count } : max
    , { value: 0, count: 0 });

    const satPercentage = totalEntries > 0 ? maxSat.count / totalEntries : 0;
    const loyPercentage = totalEntries > 0 ? maxLoy.count / totalEntries : 0;

    return {
      satisfaction: {
        value: maxSat.value,
        percentage: satPercentage
      },
      loyalty: {
        value: maxLoy.value,
        percentage: loyPercentage
      }
    };
  };

  const calculateAdjustedPercentage = (rawPercentage: number) => {
    const range = maxValue - minValue;
    const adjusted = ((rawPercentage * 100) - minValue) / range;
    return Math.max(0, Math.min(1, adjusted));
  };

  const getValueColor = (value: number) => {
    const percentage = value * 100;
    if (minValue > 0 && percentage < minValue) return '#dc2626';
    if (maxValue < 100 && percentage > maxValue) return '#dc2626';
    return '#6B7280'; // Default gray
  };

  const maxValues = calculateMaxValues();

  const createDialData = (percentage: number) => [
    { value: percentage },
    { value: 1 - percentage }
  ];

  const satisfactionData = createDialData(calculateAdjustedPercentage(maxValues.satisfaction.percentage));
  const loyaltyData = createDialData(calculateAdjustedPercentage(maxValues.loyalty.percentage));

  const satisfactionColor = customColors?.satisfaction || '#4CAF50';
  const loyaltyColor = customColors?.loyalty || '#4682B4';

  return (
    <div className="combination-dial">
      <div className="dial-container">
        <PieChart width={200} height={120}>
          <Pie
            data={satisfactionData}
            dataKey="value"
            cx={100}
            cy={80}
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            cornerRadius={5}
          >
            <Cell fill={satisfactionColor} />
            <Cell fill="#e5e7eb" />
          </Pie>

          <Pie
            data={loyaltyData}
            dataKey="value"
            cx={100}
            cy={80}
            startAngle={180}
            endAngle={0}
            innerRadius={35}
            outerRadius={55}
            cornerRadius={5}
          >
            <Cell fill={loyaltyColor} />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>

        <div className="dial-scale">
  <div className="scale-mark text-sm" style={{ 
    color: minValue > Math.min(maxValues.loyalty.percentage * 100, maxValues.satisfaction.percentage * 100) ? '#dc2626' : '#6B7280'
  }}>{minValue}%</div>
  <div className="scale-mark text-sm">
    {Math.round((maxValue - minValue) / 2 + minValue)}%
  </div>
  <div className="scale-mark text-sm" style={{ 
    color: maxValue < Math.max(maxValues.loyalty.percentage * 100, maxValues.satisfaction.percentage * 100) ? '#dc2626' : '#6B7280'
  }}>{maxValue}%</div>
</div>
      </div>

      <div className="dial-scores">
        <div className="dial-legend">
          <span className="legend-dot satisfaction" style={{ backgroundColor: satisfactionColor }} />
          <div className="dial-score">
            <div className="dial-label text-sm">Most Common {labels.satisfaction}: {maxValues.satisfaction.value}</div>
            <div className="dial-percentage text-sm" style={{ 
              color: getValueColor(maxValues.satisfaction.percentage)
            }}>
              {(maxValues.satisfaction.percentage * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        <div className="dial-legend">
          <span className="legend-dot loyalty" style={{ backgroundColor: loyaltyColor }} />
          <div className="dial-score">
            <div className="dial-label text-sm">Most Common {labels.loyalty}: {maxValues.loyalty.value}</div>
            <div className="dial-percentage text-sm" style={{ 
              color: getValueColor(maxValues.loyalty.percentage)
            }}>
              {(maxValues.loyalty.percentage * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CombinationDial;