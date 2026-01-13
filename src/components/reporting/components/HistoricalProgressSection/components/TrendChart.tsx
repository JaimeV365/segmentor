import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendDataPoint } from '../services/historicalAnalysisService';
import { ScaleFormat } from '@/types/base';

interface TrendChartProps {
  data: TrendDataPoint[];
  scale: ScaleFormat;
  metric: 'satisfaction' | 'loyalty' | 'both';
  title: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  scale,
  metric,
  title
}) => {
  // Format data for Recharts
  const chartData = data.map(point => ({
    date: point.date,
    satisfaction: point.averageSatisfaction,
    loyalty: point.averageLoyalty,
    count: point.count
  }));

  // Determine Y-axis domain based on scale
  const getYAxisDomain = (scale: ScaleFormat): [number, number] => {
    if (scale === '1-10' || scale === '0-10') {
      return [0, 10];
    } else if (scale === '1-7') {
      return [0, 7];
    } else {
      return [0, 5];
    }
  };

  const [yMin, yMax] = getYAxisDomain(scale);

  return (
    <div className="trend-chart-container">
      <h4 className="trend-chart-title">{title}</h4>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis 
            domain={[yMin, yMax]}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '12px'
            }}
            formatter={(value: number, name: string) => {
              return [value.toFixed(2), name === 'satisfaction' ? 'Satisfaction' : 'Loyalty'];
            }}
            labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
          />
          {(metric === 'satisfaction' || metric === 'both') && (
            <Line 
              type="monotone" 
              dataKey="satisfaction" 
              stroke="#3a863e" 
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Satisfaction"
            />
          )}
          {(metric === 'loyalty' || metric === 'both') && (
            <Line 
              type="monotone" 
              dataKey="loyalty" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Loyalty"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
