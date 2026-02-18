import { ParsedDateResult } from '../types';

// Check if a year is a leap year
export const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
};

// Get the number of days in a month
export const getDaysInMonth = (month: number, year?: number): number => {
  if (month === 2) {
    return year && isLeapYear(year) ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

// Get the separator from a date format
export const getFormatSeparator = (dateFormat: string): string => {
  return dateFormat.includes('/') ? '/' : 
         dateFormat.includes('-') ? '-' : '.';
};

// Convert two-digit years to four digits
export const expandTwoDigitYear = (yearStr: string): string => {
  const currentYear = new Date().getFullYear();
  const century = currentYear.toString().substring(0, 2);
  const enteredYear = parseInt(yearStr);
  const twoDigitCurrentYear = currentYear % 100;
  
  // Use current century if year is ≤ current two-digit year, otherwise use previous century
  return enteredYear <= twoDigitCurrentYear 
    ? `${century}${yearStr.padStart(2, '0')}` 
    : `${parseInt(century) - 1}${yearStr.padStart(2, '0')}`;
};

// Extract the proper date format from the header name
export const getDateFormatFromHeader = (header: string): string => {
  const headerLower = header.toLowerCase();
  
  console.log(`Detecting format from header: "${header}"`);
  
  // First check for format in parentheses
  const parenthesesMatch = headerLower.match(/\((.*?)\)/);
  if (parenthesesMatch && parenthesesMatch[1]) {
    const formatInParentheses = parenthesesMatch[1].toLowerCase();
    
    // Check for yyyy-mm-dd format in parentheses - check this first!
    if (formatInParentheses.includes('yyyy') && 
        formatInParentheses.includes('mm') && 
        formatInParentheses.indexOf('yyyy') < formatInParentheses.indexOf('mm')) {
      console.log(`Detected yyyy-MM-dd format from parentheses: "${header}"`);
      return 'yyyy-MM-dd';
    }
    
    // Check for mm/dd/yyyy format in parentheses
    if (formatInParentheses.includes('mm') && 
        formatInParentheses.includes('dd') && 
        formatInParentheses.indexOf('mm') < formatInParentheses.indexOf('dd')) {
      console.log(`Detected MM/dd/yyyy format from parentheses: "${header}"`);
      return 'MM/dd/yyyy';
    }
    
    // Check for dd/mm/yyyy format in parentheses
    if (formatInParentheses.includes('dd') && 
        formatInParentheses.includes('mm') && 
        formatInParentheses.indexOf('dd') < formatInParentheses.indexOf('mm')) {
      console.log(`Detected dd/MM/yyyy format from parentheses: "${header}"`);
      return 'dd/MM/yyyy';
    }
  }
  
  // Check for explicit format names in the header
  if (headerLower.includes('yyyy-mm-dd') || 
      headerLower.includes('yyyy/mm/dd') || 
      headerLower.includes('yyyymmdd')) {
    console.log(`Detected yyyy-MM-dd format from explicit mention: "${header}"`);
    return 'yyyy-MM-dd';
  }
  
  if (headerLower.includes('mm/dd/yyyy') || 
      headerLower.includes('mm-dd-yyyy') || 
      headerLower.includes('mmddyyyy')) {
    console.log(`Detected MM/dd/yyyy format from explicit mention: "${header}"`);
    return 'MM/dd/yyyy';
  }
  
  if (headerLower.includes('dd/mm/yyyy') || 
      headerLower.includes('dd-mm-yyyy') || 
      headerLower.includes('ddmmyyyy')) {
    console.log(`Detected dd/MM/yyyy format from explicit mention: "${header}"`);
    return 'dd/MM/yyyy';
  }
  
  // Check for pattern indicators in the header
  if (headerLower.includes('yyyy') && !headerLower.includes('dd/mm') && !headerLower.includes('mm/dd')) {
    console.log(`Detected yyyy-MM-dd format from pattern: "${header}"`);
    return 'yyyy-MM-dd';
  }
  
  if (headerLower.includes('mm/dd') || headerLower.includes('mm-dd')) {
    console.log(`Detected MM/dd/yyyy format from pattern: "${header}"`);
    return 'MM/dd/yyyy';
  }
  
  if (headerLower.includes('dd/mm') || headerLower.includes('dd-mm')) {
    console.log(`Detected dd/MM/yyyy format from pattern: "${header}"`);
    return 'dd/MM/yyyy';
  }
  
  // Default to dd/MM/yyyy if no indicators are found
  console.log(`No specific format detected, defaulting to dd/MM/yyyy for: "${header}"`);
  return 'dd/MM/yyyy';
};

/**
 * Try to interpret a pure number as an Excel serial date.
 * Excel epoch: 1 = Jan 1 1900, with the Lotus-1-2-3 leap-year bug (day 60 = Feb 29 1900).
 */
const tryExcelSerialDate = (value: string): ParsedDateResult | null => {
  const trimmed = value.trim();
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 1 || num > 100000) return null;
  if (String(Math.floor(num)) !== trimmed && trimmed !== String(num)) return null;

  const excelEpoch = Date.UTC(1899, 11, 30); // Dec 30 1899
  const ms = excelEpoch + Math.floor(num) * 86_400_000;
  const d = new Date(ms);
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();

  if (year < 1900 || year > 2100) return null;
  return { isValid: true, day, month, year };
};

// Parse and validate a date string
export const parseDateString = (dateStr: string, format: string): ParsedDateResult => {
  // Normalize separators to '/'
  const normalizedDate = dateStr.replace(/[-/.]/g, '/');
  const parts = normalizedDate.split('/');
  
  if (parts.length !== 3) {
    // Before failing, check if this is an Excel serial date number
    const excelResult = tryExcelSerialDate(dateStr);
    if (excelResult) return excelResult;

    return { 
      isValid: false, 
      error: `Date "${dateStr}" does not have three parts (day, month, year)` 
    };
  }
  
  let day, month, year;
  
  // Extract values based on format
  if (format.toLowerCase().startsWith('dd')) {
    [day, month, year] = parts.map(p => parseInt(p.trim()));
    
    // Early format-specific validation for dd/mm/yyyy
    if (day > 31 || day < 1) {
      return { 
        isValid: false, 
        error: `Day value ${day} is invalid for format ${format}` 
      };
    }
  } else if (format.toLowerCase().startsWith('mm')) {
    [month, day, year] = parts.map(p => parseInt(p.trim()));
    
    // Early format-specific validation for mm/dd/yyyy
    if (month > 12 || month < 1) {
      return { 
        isValid: false, 
        error: `Month value ${month} is invalid for format ${format}` 
      };
    }
  } else if (format.toLowerCase().startsWith('yyyy')) {
    [year, month, day] = parts.map(p => parseInt(p.trim()));
    
    // Early format-specific validation for yyyy-mm-dd
    if (year < 1000 || year > 3000) {
      return { 
        isValid: false, 
        error: `Year value ${year} appears invalid for format ${format}` 
      };
    }
  } else {
    // Default to dd/mm/yyyy if format is unknown
    [day, month, year] = parts.map(p => parseInt(p.trim()));
  }
  
  // Console log to help with debugging
  console.log(`Parsing date "${dateStr}" with format "${format}":`, { day, month, year });
  
  // Basic validation
  if (isNaN(day) || day < 1 || day > 31) {
    return { isValid: false, error: `Invalid day ${day}` };
  }
  
  if (isNaN(month) || month < 1 || month > 12) {
    return { isValid: false, error: `Invalid month ${month}` };
  }
  
  if (isNaN(year)) {
    return { isValid: false, error: `Invalid year ${year}` };
  }
  
  // Warning checks
  let warning: string | undefined;
  
  // Check year range
  const currentYear = new Date().getFullYear();
  
  if (year < currentYear - 100) {
    warning = `Year ${year} is very far in the past`;
  } else if (year > currentYear + 100) {
    warning = `Year ${year} is very far in the future`;
  }
  
  // Check valid days in month
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  // Adjust February for leap years
  if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
    daysInMonth[2] = 29;
  }
  
  if (day > daysInMonth[month]) {
    console.log(`Date validation failed: ${day}/${month}/${year} - Day ${day} > ${daysInMonth[month]} days allowed for month ${month}`);
    return { isValid: false, error: `Invalid day ${day} for month ${month}` };
  }
  
  // Check if date is in the future
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison
  
  const enteredDate = new Date(year, month - 1, day);
  
  // Any future date should be flagged
  if (enteredDate > currentDate) {
    warning = 'Date is in the future';
  }
  
  return { isValid: true, day, month, year, warning };
};

// Format date based on format
export const formatDate = (day: number, month: number, year: number, format: string): string => {
  const paddedDay = String(day).padStart(2, '0');
  const paddedMonth = String(month).padStart(2, '0');
  
  if (format.toLowerCase().startsWith('dd')) {
    return `${paddedDay}/${paddedMonth}/${year}`;
  } else if (format.toLowerCase().startsWith('mm')) {
    return `${paddedMonth}/${paddedDay}/${year}`;
  } else if (format.toLowerCase().startsWith('yyyy')) {
    return `${year}-${paddedMonth}-${paddedDay}`;
  }
  
  // Default format
  return `${paddedDay}/${paddedMonth}/${year}`;
};