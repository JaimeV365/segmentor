import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Dot } from 'recharts';
import { TrendDataPoint } from '../services/historicalAnalysisService';
import { CustomerTimeline } from '../utils/historicalDataUtils';
import { ScaleFormat, DataPoint } from '@/types/base';
import { ProximityPointInfoBox } from '../../DistributionSection/ProximityPointInfoBox';
import { parseDate } from '../utils/historicalDataUtils';
import { InfoRibbon } from '../../InfoRibbon/InfoRibbon';
import { Menu as MenuIcon, X } from 'lucide-react';
import { ChartColorPicker } from './ChartColorPicker';
import { useAxisLabels } from '../../../../visualization/context/AxisLabelsContext';

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
  const { labels } = useAxisLabels();
  const [clickedPoint, setClickedPoint] = useState<ClickedPoint | null>(null);
  const [showControlsPanel, setShowControlsPanel] = useState(false);
  const [chartColors, setChartColors] = useState<{
    satisfactionColor?: string;
    loyaltyColor?: string;
    averageSatisfactionColor?: string;
    averageLoyaltyColor?: string;
  }>({
    satisfactionColor: '#3a863e',
    loyaltyColor: '#4682B4',
    averageSatisfactionColor: '#3a863e',
    averageLoyaltyColor: '#4682B4'
  });
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Close panel when clicking outside
  useEffect(() => {
    if (!showControlsPanel) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const targetElement = event.target as HTMLElement;
      const isPanelClick = targetElement.closest('.unified-controls-panel');
      const isControlButtonClick = settingsButtonRef.current?.contains(targetElement);
      
      // Close panel when clicking outside (but not on panel or button)
      if (!isPanelClick && !isControlButtonClick && panelRef.current) {
        setShowControlsPanel(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showControlsPanel]);

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
    
    console.log('[TrendChart] Preparing chartDataWithCustomers:', {
      customerLinesDataLength: customerLinesData.length,
      customerLinesDataDates: customerLinesData.map(d => ({ date: d.date, count: d.count })),
      timelinesLength: timelines.length
    });
    
    return customerLinesData.map((chartPoint, idx) => {
      const dataPoint: any = {
        date: chartPoint.date,
        dateIndex: idx, // Add index for easier matching
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
    console.log('[TrendChart] Point clicked:', { data, index, metricType, customerLinesDataLength: customerLinesData.length });
    const pointData = customerLinesData[index];
    if (!pointData) {
      console.log('[TrendChart] No pointData found for index:', index);
      return;
    }

    // Get all customers at this date - use normalized date comparison
    const customersAtDate: DataPoint[] = [];
    const normalizedTargetDate = pointData.date.trim();
    
    console.log('[TrendChart] Looking for customers on date:', normalizedTargetDate);
    timelines.forEach(timeline => {
      timeline.dataPoints.forEach(point => {
        if (point.date && point.date.trim() === normalizedTargetDate) {
          customersAtDate.push(point);
        }
      });
    });

    console.log('[TrendChart] Found customers:', customersAtDate.length);

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
    const { cx, cy, payload, index: dotIndex } = props;
    console.log('[TrendChart] CustomDot render:', { 
      payload, 
      dotIndex, 
      payloadDate: payload?.date,
      payloadDateIndex: payload?.dateIndex,
      cx, 
      cy 
    });
    
    // Try multiple ways to find the data point
    let pointData = null;
    let dataIndex = -1;
    
    // Method 1: Use dateIndex if available
    if (payload?.dateIndex !== undefined) {
      dataIndex = payload.dateIndex;
      pointData = customerLinesData[dataIndex];
    }
    // Method 2: Use dotIndex (Recharts provides this)
    else if (dotIndex !== undefined && dotIndex >= 0 && dotIndex < customerLinesData.length) {
      dataIndex = dotIndex;
      pointData = customerLinesData[dataIndex];
    }
    // Method 3: Match by date string
    else if (payload?.date) {
      const payloadDate = payload.date.trim();
      dataIndex = customerLinesData.findIndex(d => {
        const dataDate = d.date ? d.date.trim() : '';
        return dataDate === payloadDate;
      });
      if (dataIndex >= 0) {
        pointData = customerLinesData[dataIndex];
      }
    }
    
    const customerCount = pointData?.count || 1;
    // Make size more noticeable: base 4, add 1 per customer, max 12
    const radius = Math.min(4 + customerCount * 1, 12);
    
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
          e.preventDefault();
          console.log('[TrendChart] CustomDot onClick:', { 
            payload, 
            dotIndex,
            dataIndex,
            payloadDate: payload?.date,
            payloadDateIndex: payload?.dateIndex,
            customerLinesDataLength: customerLinesData.length,
            found: dataIndex >= 0
          });
          
          if (dataIndex >= 0 && dataIndex < customerLinesData.length) {
            handlePointClick(payload, dataIndex, metricType, e);
          } else {
            console.error('[TrendChart] CustomDot: Could not find matching data point', {
              dataIndex,
              payload,
              dotIndex,
              availableDates: customerLinesData.map((d, idx) => ({ idx, date: d.date }))
            });
          }
        }}
      />
    );
  };

  const infoText = metric === 'both' 
    ? 'This chart shows how average satisfaction and loyalty change over time. Each point is the average of all customers who have data on that date. For example, if 5 customers have data on Jan 1st, the point shows the average of those 5 customers. Click any point to see which customers contributed to that average.'
    : `This chart shows how average ${metric} changes over time. Each point is the average of all customers who have data on that date. For example, if 5 customers have data on Jan 1st, the point shows the average of those 5 customers. Click any point to see which customers contributed to that average.`;

  return (
    <>
      <div className="trend-chart-container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h4 className="trend-chart-title" style={{ margin: 0 }}>{title}</h4>
          <button
            ref={settingsButtonRef}
            className={`trend-chart-settings-button ${showControlsPanel ? 'active' : ''}`}
            onClick={() => setShowControlsPanel(prev => !prev)}
            title="Chart settings"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              background: showControlsPanel ? '#3a863e' : '#ffffff',
              border: '1px solid #e5e7eb',
              cursor: 'pointer',
              color: showControlsPanel ? '#ffffff' : '#3a863e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              if (!showControlsPanel) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showControlsPanel) {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              }
            }}
          >
            <MenuIcon size={22} />
          </button>
        </div>
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
                return [value.toFixed(2), name === 'satisfaction' ? `${labels.satisfaction} (Avg)` : name === 'loyalty' ? `${labels.loyalty} (Avg)` : name];
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
                stroke={chartColors.averageSatisfactionColor || '#3a863e'} 
                strokeWidth={3}
                dot={(props: any) => <CustomDot {...props} fill={chartColors.averageSatisfactionColor || '#3a863e'} stroke={chartColors.averageSatisfactionColor || '#3a863e'} dataKey="averageSatisfaction" metricType="satisfaction" />}
                name={`${labels.satisfaction} (Average)`}
                isAnimationActive={false}
                activeDot={(props: any) => {
                  const { payload, index: dotIndex } = props;
                  console.log('[TrendChart] activeDot render for satisfaction:', { payload, dotIndex });
                  
                  // Try multiple ways to find the index
                  let dataIndex = -1;
                  if (payload?.dateIndex !== undefined) {
                    dataIndex = payload.dateIndex;
                  } else if (dotIndex !== undefined && dotIndex >= 0) {
                    dataIndex = dotIndex;
                  } else if (payload?.date) {
                    const payloadDate = payload.date.trim();
                    dataIndex = customerLinesData.findIndex(d => {
                      const dataDate = d.date ? d.date.trim() : '';
                      return dataDate === payloadDate;
                    });
                  }
                  
                  const satisfactionColor = chartColors.averageSatisfactionColor || '#3a863e';
                  
                  return (
                    <circle
                      {...props}
                      r={8}
                      fill={satisfactionColor}
                      stroke={satisfactionColor}
                      style={{ cursor: 'pointer', pointerEvents: 'all' }}
                      onClick={(e: any) => {
                        console.log('[TrendChart] activeDot clicked for satisfaction:', { 
                          payload, 
                          dotIndex, 
                          dataIndex,
                          found: dataIndex >= 0
                        });
                        e?.stopPropagation();
                        e?.preventDefault();
                        if (dataIndex >= 0 && dataIndex < customerLinesData.length) {
                          handlePointClick(payload, dataIndex, 'satisfaction', e);
                        } else {
                          console.error('[TrendChart] activeDot satisfaction: Could not find matching date', {
                            dataIndex,
                            payload,
                            dotIndex,
                            availableDates: customerLinesData.map((d, idx) => ({ idx, date: d.date }))
                          });
                        }
                      }}
                    />
                  );
                }}
              />
            )}
            {(metric === 'loyalty' || metric === 'both') && (
              <Line 
                type="monotone" 
                dataKey="averageLoyalty" 
                stroke={chartColors.averageLoyaltyColor || '#4682B4'} 
                strokeWidth={3}
                dot={(props: any) => <CustomDot {...props} fill={chartColors.averageLoyaltyColor || '#4682B4'} stroke={chartColors.averageLoyaltyColor || '#4682B4'} dataKey="averageLoyalty" metricType="loyalty" />}
                name={`${labels.loyalty} (Average)`}
                isAnimationActive={false}
                activeDot={(props: any) => {
                  const { payload, index: dotIndex } = props;
                  console.log('[TrendChart] activeDot render for loyalty:', { payload, dotIndex });
                  
                  // Try multiple ways to find the index
                  let dataIndex = -1;
                  if (payload?.dateIndex !== undefined) {
                    dataIndex = payload.dateIndex;
                  } else if (dotIndex !== undefined && dotIndex >= 0) {
                    dataIndex = dotIndex;
                  } else if (payload?.date) {
                    const payloadDate = payload.date.trim();
                    dataIndex = customerLinesData.findIndex(d => {
                      const dataDate = d.date ? d.date.trim() : '';
                      return dataDate === payloadDate;
                    });
                  }
                  
                  const loyaltyColor = chartColors.averageLoyaltyColor || '#4682B4';
                  
                  return (
                    <circle
                      {...props}
                      r={8}
                      fill={loyaltyColor}
                      stroke={loyaltyColor}
                      style={{ cursor: 'pointer', pointerEvents: 'all' }}
                      onClick={(e: any) => {
                        console.log('[TrendChart] activeDot clicked for loyalty:', { 
                          payload, 
                          dotIndex, 
                          dataIndex,
                          found: dataIndex >= 0
                        });
                        e?.stopPropagation();
                        e?.preventDefault();
                        if (dataIndex >= 0 && dataIndex < customerLinesData.length) {
                          handlePointClick(payload, dataIndex, 'loyalty', e);
                        } else {
                          console.error('[TrendChart] activeDot loyalty: Could not find matching date', {
                            dataIndex,
                            payload,
                            dotIndex,
                            availableDates: customerLinesData.map((d, idx) => ({ idx, date: d.date }))
                          });
                        }
                      }}
                    />
                  );
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
          quadrant="loyalists"
          onClose={() => setClickedPoint(null)}
          context="distribution"
          customTitle={`Customers on ${clickedPoint.date} (${clickedPoint.metric}: ${clickedPoint.value.toFixed(2)})`}
        />
      )}
      
      {/* Unified Controls Panel */}
      {showControlsPanel && (
        <div className="unified-controls-panel trend-chart-controls-panel" ref={panelRef}>
          <div className="unified-controls-header">
            <div className="unified-controls-tabs">
              <div className="unified-tab active">
                <MenuIcon size={16} />
                Colors
              </div>
            </div>
            <button className="unified-close-button" onClick={() => setShowControlsPanel(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="unified-controls-content">
            <div className="unified-tab-content">
              <div className="unified-tab-body">
                <div className="chart-settings-content">
                  {(metric === 'satisfaction' || metric === 'both') && (
                    <ChartColorPicker
                      label="Satisfaction Color"
                      currentColor={chartColors.averageSatisfactionColor || '#3a863e'}
                      onColorChange={(color) => setChartColors(prev => ({ ...prev, averageSatisfactionColor: color }))}
                    />
                  )}
                  {(metric === 'loyalty' || metric === 'both') && (
                    <ChartColorPicker
                      label="Loyalty Color"
                      currentColor={chartColors.averageLoyaltyColor || '#4682B4'}
                      onColorChange={(color) => setChartColors(prev => ({ ...prev, averageLoyaltyColor: color }))}
                    />
                  )}
                </div>
              </div>
              <div className="unified-tab-footer">
                <button 
                  className="unified-reset-button" 
                  onClick={() => {
                    setChartColors({
                      satisfactionColor: '#3a863e',
                      loyaltyColor: '#4682B4',
                      averageSatisfactionColor: '#3a863e',
                      averageLoyaltyColor: '#4682B4'
                    });
                  }}
                >
                  Reset to Default
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
