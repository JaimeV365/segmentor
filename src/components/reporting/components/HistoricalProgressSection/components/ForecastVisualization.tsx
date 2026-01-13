import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ForecastResult, ForecastPoint } from '../services/forecastService';
import { TrendDataPoint } from '../services/historicalAnalysisService';
import { ScaleFormat } from '@/types/base';
import { AlertCircle } from 'lucide-react';

interface ForecastVisualizationProps {
  forecast: ForecastResult;
  historicalData: TrendDataPoint[];
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
}

export const ForecastVisualization: React.FC<ForecastVisualizationProps> = ({
  forecast,
  historicalData,
  satisfactionScale,
  loyaltyScale
}) => {
  // Prepare data for charts - mark forecast points
  const historicalChartData = historicalData.map(point => ({
    date: point.date,
    satisfaction: point.averageSatisfaction,
    loyalty: point.averageLoyalty,
    isForecast: false
  }));

  const forecastChartData = forecast.satisfactionForecast.map((point) => ({
    date: point.date,
    satisfaction: point.forecastedSatisfaction,
    loyalty: point.forecastedLoyalty,
    confidence: point.confidence,
    isForecast: true
  }));

  // Combine data - add last historical point to connect to forecast smoothly
  const lastHistorical = historicalChartData[historicalChartData.length - 1];
  const combinedData = [
    ...historicalChartData,
    ...(lastHistorical ? [{
      ...lastHistorical,
      date: lastHistorical.date // Keep same date to connect
    }] : []),
    ...forecastChartData
  ];

  // Determine Y-axis domain
  const getYAxisDomain = (scale: ScaleFormat): [number, number] => {
    if (scale === '1-10' || scale === '0-10') {
      return [0, 10];
    } else if (scale === '1-7') {
      return [0, 7];
    } else {
      return [0, 5];
    }
  };

  const [satYMin, satYMax] = getYAxisDomain(satisfactionScale);
  const [loyYMin, loyYMax] = getYAxisDomain(loyaltyScale);

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low'): string => {
    switch (confidence) {
      case 'high': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'low': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const avgConfidence = forecast.satisfactionForecast.length > 0
    ? forecast.satisfactionForecast[0].confidence
    : 'low';

  return (
    <div className="forecast-visualization">
      <div className="forecast-header">
        <h4 className="forecast-title">Forecast: If Trend Continues</h4>
        <div className="forecast-warning">
          <AlertCircle size={16} />
          <span>Forecast based on linear trend projection. Actual results may vary.</span>
        </div>
      </div>

      <div className="forecast-charts">
        <div className="forecast-chart-item">
          <h5 className="forecast-chart-title">Satisfaction Forecast</h5>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={combinedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                domain={[satYMin, satYMax]}
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
                formatter={(value: number, name: string, props: any) => {
                  const isForecast = props.payload?.isForecast;
                  return [
                    value.toFixed(2), 
                    isForecast ? 'Satisfaction (Forecast)' : 'Satisfaction (Historical)'
                  ];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              {/* Reference line to mark where forecast starts */}
              {lastHistorical && (
                <ReferenceLine 
                  x={lastHistorical.date} 
                  stroke="#f59e0b" 
                  strokeDasharray="3 3"
                  label={{ value: "Forecast", position: "top", fill: "#f59e0b", fontSize: 10 }}
                />
              )}
              {/* Combined line - will show as continuous */}
              <Line 
                type="monotone" 
                dataKey="satisfaction" 
                stroke="#3a863e" 
                strokeWidth={2}
                dot={(props: any) => {
                  const isForecast = props.payload?.isForecast;
                  return (
                    <circle 
                      cx={props.cx} 
                      cy={props.cy} 
                      r={isForecast ? 5 : 4} 
                      fill="#3a863e"
                      stroke={isForecast ? "#f59e0b" : "#3a863e"}
                      strokeWidth={isForecast ? 2 : 1}
                    />
                  );
                }}
                name="Satisfaction"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="forecast-metrics">
            <span className="forecast-metric">
              Trend: {forecast.trendSlope.satisfaction > 0 ? '+' : ''}
              {forecast.trendSlope.satisfaction.toFixed(3)} per day
            </span>
            <span className="forecast-metric">
              R²: {(forecast.rSquared.satisfaction * 100).toFixed(1)}%
            </span>
            <span 
              className="forecast-confidence"
              style={{ color: getConfidenceColor(avgConfidence) }}
            >
              Confidence: {avgConfidence}
            </span>
          </div>
        </div>

        <div className="forecast-chart-item">
          <h5 className="forecast-chart-title">Loyalty Forecast</h5>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={combinedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                domain={[loyYMin, loyYMax]}
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
                formatter={(value: number, name: string, props: any) => {
                  const isForecast = props.payload?.isForecast;
                  return [
                    value.toFixed(2), 
                    isForecast ? 'Loyalty (Forecast)' : 'Loyalty (Historical)'
                  ];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              {/* Reference line to mark where forecast starts */}
              {lastHistorical && (
                <ReferenceLine 
                  x={lastHistorical.date} 
                  stroke="#f59e0b" 
                  strokeDasharray="3 3"
                  label={{ value: "Forecast", position: "top", fill: "#f59e0b", fontSize: 10 }}
                />
              )}
              {/* Combined line - will show as continuous */}
              <Line 
                type="monotone" 
                dataKey="loyalty" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={(props: any) => {
                  const isForecast = props.payload?.isForecast;
                  return (
                    <circle 
                      cx={props.cx} 
                      cy={props.cy} 
                      r={isForecast ? 5 : 4} 
                      fill="#2563eb"
                      stroke={isForecast ? "#f59e0b" : "#2563eb"}
                      strokeWidth={isForecast ? 2 : 1}
                    />
                  );
                }}
                name="Loyalty"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="forecast-metrics">
            <span className="forecast-metric">
              Trend: {forecast.trendSlope.loyalty > 0 ? '+' : ''}
              {forecast.trendSlope.loyalty.toFixed(3)} per day
            </span>
            <span className="forecast-metric">
              R²: {(forecast.rSquared.loyalty * 100).toFixed(1)}%
            </span>
            <span 
              className="forecast-confidence"
              style={{ color: getConfidenceColor(avgConfidence) }}
            >
              Confidence: {avgConfidence}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
