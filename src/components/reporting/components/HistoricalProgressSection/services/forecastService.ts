import { TrendDataPoint } from './historicalAnalysisService';

export interface ForecastPoint {
  date: string;
  dateObj: Date;
  forecastedSatisfaction: number;
  forecastedLoyalty: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface ForecastResult {
  satisfactionForecast: ForecastPoint[];
  loyaltyForecast: ForecastPoint[];
  trendSlope: {
    satisfaction: number;
    loyalty: number;
  };
  rSquared: {
    satisfaction: number;
    loyalty: number;
  };
}

/**
 * Simple linear regression to calculate trend line
 */
const linearRegression = (points: Array<{ x: number; y: number }>): {
  slope: number;
  intercept: number;
  rSquared: number;
} => {
  const n = points.length;
  if (n < 2) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }
  
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
  const sumYY = points.reduce((sum, p) => sum + p.y * p.y, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared
  const yMean = sumY / n;
  const ssRes = points.reduce((sum, p) => {
    const predicted = slope * p.x + intercept;
    return sum + Math.pow(p.y - predicted, 2);
  }, 0);
  const ssTot = points.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
  
  return { slope, intercept, rSquared: Math.max(0, Math.min(1, rSquared)) };
};

/**
 * Calculate confidence level based on R-squared and data points
 */
const calculateConfidence = (rSquared: number, dataPoints: number): 'high' | 'medium' | 'low' => {
  if (dataPoints < 3) return 'low';
  if (rSquared >= 0.7 && dataPoints >= 5) return 'high';
  if (rSquared >= 0.4 && dataPoints >= 4) return 'medium';
  return 'low';
};

/**
 * Generate forecast based on linear trend
 * Forecasts 1, 3, and 6 months ahead
 */
export const generateForecast = (
  trendData: TrendDataPoint[],
  monthsAhead: number = 6
): ForecastResult | null => {
  if (trendData.length < 2) return null;
  
  // Convert dates to numeric values (days since first date)
  const firstDate = trendData[0].dateObj;
  const satisfactionPoints = trendData.map((point, index) => ({
    x: (point.dateObj.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24), // days
    y: point.averageSatisfaction
  }));
  
  const loyaltyPoints = trendData.map((point, index) => ({
    x: (point.dateObj.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24), // days
    y: point.averageLoyalty
  }));
  
  // Calculate regression for satisfaction
  const satRegression = linearRegression(satisfactionPoints);
  
  // Calculate regression for loyalty
  const loyRegression = linearRegression(loyaltyPoints);
  
  // Generate forecast points
  const lastDate = trendData[trendData.length - 1].dateObj;
  const forecastPoints: ForecastPoint[] = [];
  
  // Forecast for 1, 3, and 6 months (or up to monthsAhead)
  const forecastMonths = [1, 3, monthsAhead].filter(m => m <= monthsAhead);
  
  forecastMonths.forEach(months => {
    const forecastDate = new Date(lastDate);
    forecastDate.setMonth(forecastDate.getMonth() + months);
    
    const daysFromFirst = (forecastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
    
    const forecastedSat = satRegression.slope * daysFromFirst + satRegression.intercept;
    const forecastedLoy = loyRegression.slope * daysFromFirst + loyRegression.intercept;
    
    const satConfidence = calculateConfidence(satRegression.rSquared, trendData.length);
    const loyConfidence = calculateConfidence(loyRegression.rSquared, trendData.length);
    
    // Use lower confidence of the two
    const confidence = satConfidence === 'low' || loyConfidence === 'low' 
      ? 'low' 
      : satConfidence === 'medium' || loyConfidence === 'medium' 
        ? 'medium' 
        : 'high';
    
    forecastPoints.push({
      date: forecastDate.toLocaleDateString('en-GB'), // dd/mm/yyyy format
      dateObj: forecastDate,
      forecastedSatisfaction: Math.round(forecastedSat * 100) / 100,
      forecastedLoyalty: Math.round(forecastedLoy * 100) / 100,
      confidence
    });
  });
  
  return {
    satisfactionForecast: forecastPoints,
    loyaltyForecast: forecastPoints, // Same dates, different values
    trendSlope: {
      satisfaction: satRegression.slope,
      loyalty: loyRegression.slope
    },
    rSquared: {
      satisfaction: satRegression.rSquared,
      loyalty: loyRegression.rSquared
    }
  };
};
