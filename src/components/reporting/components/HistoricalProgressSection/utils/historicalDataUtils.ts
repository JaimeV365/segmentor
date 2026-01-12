import { DataPoint } from '@/types/base';

export interface CustomerTimeline {
  identifier: string; // email or id
  identifierType: 'email' | 'id';
  dataPoints: DataPoint[];
  dates: string[];
}

/**
 * Check if there's enough historical data to show the Historical Progress report
 * Requires at least one customer with 2+ data points (different dates)
 */
export const hasHistoricalData = (data: DataPoint[]): boolean => {
  if (!data || data.length === 0) return false;
  
  // Group data points by customer identifier (email or id)
  const customerMap = new Map<string, DataPoint[]>();
  
  data.forEach(point => {
    // Use email if available, otherwise use id
    const identifier = point.email?.trim().toLowerCase() || point.id;
    if (!identifier) return;
    
    if (!customerMap.has(identifier)) {
      customerMap.set(identifier, []);
    }
    customerMap.get(identifier)!.push(point);
  });
  
  // Check if any customer has 2+ data points with different dates
  const customerEntries = Array.from(customerMap.values());
  for (const points of customerEntries) {
    const dates = new Set(
      points
        .filter(p => p.date)
        .map(p => p.date!.trim())
    );
    
    if (dates.size >= 2) {
      return true;
    }
  }
  
  return false;
};

/**
 * Group data points by customer (email or id) and create timelines
 */
export const groupByCustomer = (data: DataPoint[]): CustomerTimeline[] => {
  const customerMap = new Map<string, CustomerTimeline>();
  
  data.forEach(point => {
    // Use email if available, otherwise use id
    const identifier = point.email?.trim().toLowerCase() || point.id;
    const identifierType = point.email ? 'email' : 'id';
    
    if (!identifier) return;
    
    if (!customerMap.has(identifier)) {
      customerMap.set(identifier, {
        identifier,
        identifierType,
        dataPoints: [],
        dates: []
      });
    }
    
    const timeline = customerMap.get(identifier)!;
    timeline.dataPoints.push(point);
    
    if (point.date) {
      const normalizedDate = point.date.trim();
      if (!timeline.dates.includes(normalizedDate)) {
        timeline.dates.push(normalizedDate);
      }
    }
  });
  
  // Sort data points by date within each timeline
  const timelines = Array.from(customerMap.values());
  timelines.forEach(timeline => {
    timeline.dataPoints.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
    timeline.dates.sort();
  });
  
  // Filter to only include customers with 2+ data points with dates
  return timelines.filter(timeline => {
    const datesWithData = new Set(
      timeline.dataPoints
        .filter(p => p.date)
        .map(p => p.date!.trim())
    );
    return datesWithData.size >= 2;
  });
};

/**
 * Parse date string to Date object
 * Handles common date formats: dd/MM/yyyy, MM/dd/yyyy, yyyy-MM-dd
 */
export const parseDate = (dateStr: string, dateFormat?: string): Date | null => {
  if (!dateStr) return null;
  
  const normalized = dateStr.trim();
  if (!normalized) return null;
  
  // Try to parse based on format hint
  if (dateFormat) {
    if (dateFormat.includes('dd/MM') || dateFormat.includes('DD/MM')) {
      const parts = normalized.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
    } else if (dateFormat.includes('MM/dd') || dateFormat.includes('MM/DD')) {
      const parts = normalized.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10) - 1;
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
    } else if (dateFormat.includes('yyyy-MM') || dateFormat.includes('YYYY-MM')) {
      const date = new Date(normalized);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  // Fallback: try standard Date parsing
  const date = new Date(normalized);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
};
