import { DataPoint } from '../types/base';

export interface DatePreset {
  label: string;
  key: string;
}

export const DATE_PRESETS: DatePreset[] = [
  { label: 'All Time', key: 'all' },
  { label: 'Today', key: 'today' },
  { label: 'Yesterday', key: 'yesterday' },
  { label: 'Last 7 Days', key: 'last7days' },
  { label: 'Last 30 Days', key: 'last30days' },
  { label: 'This Month', key: 'thisMonth' },
  { label: 'Last Month', key: 'lastMonth' },
  { label: 'This Year', key: 'thisYear' },
  { label: 'Last Year', key: 'lastYear' },
  { label: 'Custom Range', key: 'custom' },
];

/**
 * Parse a date string into a Date object, handling various formats
 */
export function parseDateString(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  // Try different date formats
  const formats = [
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // MM/DD/YYYY  
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year: number, month: number, day: number;
      
      if (format.source.includes('\\d{4}') && format.source.startsWith('^\\d{4}')) {
        // YYYY-MM-DD format
        [, year, month, day] = match.map(Number);
      } else {
        // DD/MM/YYYY or MM/DD/YYYY - assume DD/MM/YYYY for now
        [, day, month, year] = match.map(Number);
      }
      
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
}

/**
 * Get relevant date presets based on the actual data
 */
export function getRelevantDatePresets(data: DataPoint[]): DatePreset[] {
  // Filter out excluded items
  const activeData = data.filter(item => !item.excluded);
  
  // Extract and parse dates
  const dates: Date[] = [];
  activeData.forEach(item => {
    if (item.date) {
      const parsedDate = parseDateString(item.date);
      if (parsedDate) {
        dates.push(parsedDate);
      }
    }
  });
  
  if (dates.length === 0) {
    // No dates available, only show "All Time" and "Custom Range"
    return [
      { label: 'All Time', key: 'all' },
      { label: 'Custom Range', key: 'custom' }
    ];
  }
  
  // Find date range
  const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
  const earliestDate = sortedDates[0];
  const latestDate = sortedDates[sortedDates.length - 1];
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const relevantPresets: DatePreset[] = [
    { label: 'All Time', key: 'all' }
  ];
  
  // Check if we have data for each preset
  const presetChecks = [
    { key: 'today', check: () => dates.some(d => d.getTime() >= today.getTime()) },
    { key: 'yesterday', check: () => dates.some(d => {
      const dayStart = new Date(yesterday);
      const dayEnd = new Date(yesterday);
      dayEnd.setDate(dayEnd.getDate() + 1);
      return d.getTime() >= dayStart.getTime() && d.getTime() < dayEnd.getTime();
    })},
    { key: 'last7days', check: () => {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return dates.some(d => d.getTime() >= weekAgo.getTime());
    }},
    { key: 'last30days', check: () => {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return dates.some(d => d.getTime() >= monthAgo.getTime());
    }},
    { key: 'thisMonth', check: () => {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return dates.some(d => d.getTime() >= monthStart.getTime());
    }},
    { key: 'lastMonth', check: () => {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return dates.some(d => d.getTime() >= lastMonthStart.getTime() && d.getTime() < thisMonthStart.getTime());
    }},
    { key: 'thisYear', check: () => {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return dates.some(d => d.getTime() >= yearStart.getTime());
    }},
    { key: 'lastYear', check: () => {
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const thisYearStart = new Date(now.getFullYear(), 0, 1);
      return dates.some(d => d.getTime() >= lastYearStart.getTime() && d.getTime() < thisYearStart.getTime());
    }}
  ];
  
  // Add relevant presets
  presetChecks.forEach(({ key, check }) => {
    if (check()) {
      const preset = DATE_PRESETS.find(p => p.key === key);
      if (preset) {
        relevantPresets.push(preset);
      }
    }
  });
  
  // Always include Custom Range
  relevantPresets.push({ label: 'Custom Range', key: 'custom' });
  
  return relevantPresets;
}

/**
 * Get a description of the date range in the data
 */
export function getDateRangeDescription(data: DataPoint[]): string {
  // Filter out excluded items
  const activeData = data.filter(item => !item.excluded);
  
  const dates: Date[] = [];
  activeData.forEach(item => {
    if (item.date) {
      const parsedDate = parseDateString(item.date);
      if (parsedDate) {
        dates.push(parsedDate);
      }
    }
  });
  
  if (dates.length === 0) {
    return 'No date data available';
  }
  
  const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
  const earliest = sortedDates[0];
  const latest = sortedDates[sortedDates.length - 1];
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  if (dates.length === 1) {
    return `Data from ${formatDate(earliest)} (1 entry)`;
  }
  
  return `Data from ${formatDate(earliest)} to ${formatDate(latest)} (${dates.length} entries)`;
}
