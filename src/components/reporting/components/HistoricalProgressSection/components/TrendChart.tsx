import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Dot } from 'recharts';
import { TrendDataPoint } from '../services/historicalAnalysisService';
import { CustomerTimeline } from '../utils/historicalDataUtils';
import { ScaleFormat, DataPoint } from '@/types/base';
import { ProximityPointInfoBox } from '../../DistributionSection/ProximityPointInfoBox';
import { parseDate } from '../utils/historicalDataUtils';
import { InfoRibbon } from '../../InfoRibbon/InfoRibbon';

interface TrendChartProps {
  data: TrendDataPoint[];
  timelines: CustomerTimeline[];
  scale: ScaleFormat;
  metric: 'satisfaction' | 'loyalty' | 'both';
  title: string;
  dateFormat?: string;
}

interface ClickedPoint {
  date: string;
  points: DataPoint[];
  metric: 'satisfaction' | 'loyalty';
  value: number;
  position: { x: number; y: number };
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  timelines,
  scale,
  metric,
  title,
  dateFormat
}) => {
  const [clickedPoint, setClickedPoint] = useState<ClickedPoint | null>(null);

  // Prepare individual customer lines data
  const customerLinesData = useMemo(() => {
    const dateMap = new Map<string, Map<string, { satisfaction: number; loyalty: number }>>();
    
    // Collect all customer data points by date
    timelines.forEach(timeline => {
      timeline.dataPoints.forEach(point => {
        if (point.date) {
          const normalizedDate = point.date.trim();
          if (!dateMap.has(normalizedDate)) {
            dateMap.set(normalizedDate, new Map());
          }
          const customerMap = dateMap.get(normalizedDate)!;
          customerMap.set(timeline.identifier, {
            satisfaction: point.satisfaction,
            loyalty: point.loyalty
          });
        }
      });
    });

    // Convert to array format for Recharts
    const chartData: Array<{
      date: string;
      dateObj: Date;
      averageSatisfaction: number;
      averageLoyalty: number;
      count: number;
      customers: Map<string, { satisfaction: number; loyalty: number }>;
    }> = [];

    dateMap.forEach((customers, dateStr) => {
      const dateObj = parseDate(dateStr, dateFormat);
      if (dateObj) {
        const satisfactionValues = Array.from(customers.values()).map(c => c.satisfaction);
        const loyaltyValues = Array.from(customers.values()).map(c => c.loyalty);
        
        chartData.push({
          date: dateStr,
          dateObj,
          averageSatisfaction: satisfactionValues.reduce((a, b) => a + b, 0) / satisfactionValues.length,
          averageLoyalty: loyaltyValues.reduce((a, b) => a + b, 0) / loyaltyValues.length,
          count: customers.size,
          customers
        });
      }
    });

    chartData.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    return chartData;
  }, [timelines, dateFormat]);

  // Prepare chart data with individual customer values as additional keys
  const chartDataWithCustomers = useMemo(() => {
    // Limit to 20 customers for performance
    const limitedTimelines = timelines.slice(0, 20);
    
    return customerLinesData.map(chartPoint => {
      const dataPoint: any = {
        date: chartPoint.date,
        averageSatisfaction: chartPoint.averageSatisfaction,
        averageLoyalty: chartPoint.averageLoyalty,
        count: chartPoint.count
      };
      
      // Add individual customer values as separate keys
      limitedTimelines.forEach((timeline, idx) => {
        const customerPoint = timeline.dataPoints.find(p => p.date && p.date.trim() === chartPoint.date);
        if (customerPoint) {
          dataPoint[`customer_${idx}_satisfaction`] = customerPoint.satisfaction;
          dataPoint[`customer_${idx}_loyalty`] = customerPoint.loyalty;
        } else {
          dataPoint[`customer_${idx}_satisfaction`] = null;
          dataPoint[`customer_${idx}_loyalty`] = null;
        }
      });
      
      return dataPoint;
    });
  }, [customerLinesData, timelines]);
  
  const showIndividualLines = timelines.length <= 20;

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

  // Handle point click
  const handlePointClick = (data: any, index: number, metricType: 'satisfaction' | 'loyalty', event?: React.MouseEvent) => {
    const pointData = customerLinesData[index];
    if (!pointData) return;

    // Get all customers at this date - use normalized date comparison
    const customersAtDate: DataPoint[] = [];
    const normalizedTargetDate = pointData.date.trim();
    
    timelines.forEach(timeline => {
      timeline.dataPoints.forEach(point => {
        if (point.date && point.date.trim() === normalizedTargetDate) {
          customersAtDate.push(point);
        }
      });
    });

    if (customersAtDate.length > 0) {
      // Use event position if available, otherwise center of chart
      let position = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      if (event) {
        position = { x: event.clientX, y: event.clientY };
      } else {
        const chartElement = document.querySelector('.trend-chart-container');
        const rect = chartElement?.getBoundingClientRect();
        if (rect) {
          position = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
          };
        }
      }
      
      setClickedPoint({
        date: pointData.date,
        points: customersAtDate,
        metric: metricType,
        value: metricType === 'satisfaction' ? pointData.averageSatisfaction : pointData.averageLoyalty,
        position
      });
    }
  };

  // Custom dot component that shows size based on customer count
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const pointData = customerLinesData.find(d => d.date === payload.date);
    const customerCount = pointData?.count || 1;
    const radius = Math.min(4 + customerCount * 0.5, 8); // Scale from 4 to 8 based on count
    
    // Determine metric type from the line's dataKey or from props
    const metricType = props.metricType || (props.dataKey?.includes('satisfaction') ? 'satisfaction' : 'loyalty');
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={props.fill}
        stroke={props.stroke}
        strokeWidth={2}
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
        onClick={(e) => {
          e.stopPropagation();
          const index = customerLinesData.findIndex(d => d.date === payload.date);
          if (index >= 0) {
            handlePointClick(payload, index, metricType, e);
          }
        }}
      />
    );
  };

  const infoText = metric === 'both' 
    ? 'This chart shows average satisfaction and loyalty scores by date. Click any data point to see individual customers and their values.'
    : `This chart shows average ${metric} scores by date. Click any data point to see individual customers and their values.`;

  return (
    <>
      <div className="trend-chart-container">
        <h4 className="trend-chart-title">{title}</h4>
        <InfoRibbon text={infoText} />
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartDataWithCustomers} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                return [value.toFixed(2), name === 'satisfaction' ? 'Satisfaction (Avg)' : name === 'loyalty' ? 'Loyalty (Avg)' : name];
              }}
              labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            />
            
            {/* Individual customer lines - only show if not too many (performance) */}
            {showIndividualLines && timelines.slice(0, 20).map((timeline, idx) => {
              if (metric === 'satisfaction' || metric === 'both') {
                return (
                  <Line
                    key={`customer-${idx}-sat`}
                    type="monotone"
                    dataKey={`customer_${idx}_satisfaction`}
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    dot={false}
                    connectNulls={true}
                    hide={true}
                    isAnimationActive={false}
                    legendType="none"
                  />
                );
              }
              if (metric === 'loyalty' || metric === 'both') {
                return (
                  <Line
                    key={`customer-${idx}-loy`}
                    type="monotone"
                    dataKey={`customer_${idx}_loyalty`}
                    stroke="#cbd5e1"
                    strokeWidth={1}
                    dot={false}
                    connectNulls={true}
                    hide={true}
                    isAnimationActive={false}
                    legendType="none"
                  />
                );
              }
              return null;
            })}
            
            {/* Average lines - prominent */}
            {(metric === 'satisfaction' || metric === 'both') && (
              <Line 
                type="monotone" 
                dataKey="averageSatisfaction" 
                stroke="#3a863e" 
                strokeWidth={3}
                dot={<CustomDot fill="#3a863e" stroke="#3a863e" dataKey="averageSatisfaction" metricType="satisfaction" />}
                name="Satisfaction (Average)"
                isAnimationActive={false}
                activeDot={{ 
                  r: 6,
                  style: { cursor: 'pointer', pointerEvents: 'all' },
                  onClick: (e: any, payload: any) => {
                    e?.stopPropagation();
                    const index = customerLinesData.findIndex(d => d.date === payload.date);
                    if (index >= 0) {
                      handlePointClick(payload, index, 'satisfaction', e);
                    }
                  }
                }}
              />
            )}
            {(metric === 'loyalty' || metric === 'both') && (
              <Line 
                type="monotone" 
                dataKey="averageLoyalty" 
                stroke="#4682B4" 
                strokeWidth={3}
                dot={<CustomDot fill="#4682B4" stroke="#4682B4" dataKey="loyalty" />}
                name="Loyalty (Average)"
                isAnimationActive={false}
                activeDot={{ 
                  r: 6,
                  style: { cursor: 'pointer', pointerEvents: 'all' },
                  onClick: (e: any, payload: any) => {
                    e?.stopPropagation();
                    const index = customerLinesData.findIndex(d => d.date === payload.date);
                    if (index >= 0) {
                      handlePointClick(payload, index, 'loyalty', e);
                    }
                  }
                }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
        {!showIndividualLines && (
          <p className="trend-chart-note" style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
            Note: Showing average only (too many customers to display individual lines)
          </p>
        )}
      </div>

      {/* Customer list modal */}
      {clickedPoint && (
        <ProximityPointInfoBox
          points={clickedPoint.points}
          position={clickedPoint.position}
          quadrant=""
          onClose={() => setClickedPoint(null)}
          context="distribution"
        />
      )}
    </>
  );
};
