import { validateEmail, validateDate } from '../../../utils/validation';
import { ScaleFormat, DataPoint } from '@/types/base';
import { idCounter } from '../../../utils/idCounter';

export interface DuplicateReport {
  count: number;
  items: Array<{ id: string; name: string; reason: string }>;
}

export interface ValidationErrorData {
  title: string;
  message: string;
  details?: string;
  fix?: string;
}

export interface DateIssueReport {
  count: number;
  items: Array<{
    row: number;
    id: string;
    reason: string;
    value: string;
  }>;
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateFile = (file: File): { isValid: boolean; error: ValidationErrorData | null } => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
    
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: {
        title: 'File too large',
        message: `File size (${formatFileSize(file.size)}) exceeds maximum limit of ${formatFileSize(MAX_FILE_SIZE)}`,
        fix: 'Please reduce your file size or split it into smaller files'
      }
    };
  }

  if (file.type && !['text/csv', 'application/vnd.ms-excel'].includes(file.type)) {
    return {
      isValid: false,
      error: {
        title: 'Invalid file type',
        message: 'Only CSV files are supported',
        details: `Received file of type: ${file.type}`,
        fix: 'Please save your file as a CSV and try again'
      }
    };
  }

  return { isValid: true, error: null };
};

export const detectDuplicates = (newData: any[], existingData: DataPoint[]): DuplicateReport => {
  const duplicateMap = new Map<string, { item: any, reasons: Set<string> }>();
  
  // Check for duplicate IDs within the file (same ID + same date = true duplicate)
  const idDateSeen = new Map<string, Set<string>>(); // id -> set of dates
  const internalDupIds = new Set<string>();
  
  newData.forEach(row => {
    if (!row.id) return;
    const date = (row.date || '').trim();
    if (!idDateSeen.has(row.id)) {
      idDateSeen.set(row.id, new Set());
    }
    const dateSet = idDateSeen.get(row.id)!;
    if (dateSet.has(date)) {
      internalDupIds.add(row.id);
    } else {
      dateSet.add(date);
    }
  });
  
  internalDupIds.forEach(dupId => {
    const items = newData.filter(row => row.id === dupId);
    items.forEach(item => {
      const id = item.id || `noID-${Math.random().toString(36).substring(2, 9)}`;
      if (!duplicateMap.has(id)) {
        duplicateMap.set(id, { item, reasons: new Set() });
      }
      duplicateMap.get(id)?.reasons.add('Duplicate ID + same date within imported file');
    });
  });
  
  // Check for entries that match existing data on BOTH id AND date (true duplicates)
  const existingIdDateKeys = new Set<string>();
  existingData.forEach(item => {
    existingIdDateKeys.add(`${item.id}|${(item.date || '').trim()}`);
  });
  
  newData.forEach(item => {
    if (!item.id) return;
    const key = `${item.id}|${(item.date || '').trim()}`;
    if (existingIdDateKeys.has(key)) {
      const itemId = item.id || `noID-${Math.random().toString(36).substring(2, 9)}`;
      if (!duplicateMap.has(itemId)) {
        duplicateMap.set(itemId, { item, reasons: new Set() });
      }
      duplicateMap.get(itemId)?.reasons.add('Same ID and date already exists in system');
    }
  });
  
  // Check for potential duplicates by name
  const namesMap = new Map<string, number[]>();
  newData.forEach((row, index) => {
    const name = (row.name || '').toLowerCase().trim();
    if (name) {
      if (!namesMap.has(name)) {
        namesMap.set(name, []);
      }
      namesMap.get(name)?.push(index);
    }
  });

  // Add name duplicates
  namesMap.forEach((indices, name) => {
    if (indices.length > 1) {
      indices.forEach(index => {
        const item = newData[index];
        const itemId = item.id || `noID-${Math.random().toString(36).substring(2, 9)}`;
        if (!duplicateMap.has(itemId)) {
          duplicateMap.set(itemId, { item, reasons: new Set() });
        }
        duplicateMap.get(itemId)?.reasons.add('Duplicate name');
      });
    }
  });

  // Check for potential duplicates by email
  const emailsMap = new Map<string, number[]>();
  newData.forEach((row, index) => {
    const email = (row.email || '').toLowerCase().trim();
    if (email) {
      if (!emailsMap.has(email)) {
        emailsMap.set(email, []);
      }
      emailsMap.get(email)?.push(index);
    }
  });

  // Add email duplicates
  emailsMap.forEach((indices, email) => {
    if (indices.length > 1) {
      indices.forEach(index => {
        const item = newData[index];
        const itemId = item.id || `noID-${Math.random().toString(36).substring(2, 9)}`;
        if (!duplicateMap.has(itemId)) {
          duplicateMap.set(itemId, { item, reasons: new Set() });
        }
        duplicateMap.get(itemId)?.reasons.add('Duplicate email');
      });
    }
  });
  
  // Convert the map to the expected output format
  const duplicates: Array<{ id: string; name: string; reason: string }> = [];
  duplicateMap.forEach((entry, id) => {
    duplicates.push({
      id,
      name: entry.item.name || 'Unnamed',
      reason: Array.from(entry.reasons).join(', ')
    });
  });
  
  return {
    count: duplicates.length,
    items: duplicates
  };
};

export const generateDuplicateCSV = (duplicates: DuplicateReport): void => {
  const header = 'ID,Name,Reason\n';
  const rows = duplicates.items.map(item => 
    `"${item.id}","${item.name}","${item.reason}"`
  ).join('\n');
  
  const content = header + rows;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'duplicate_records.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating duplicate CSV:', error);
  }
};



// Utility function to parse and validate a date string
const parseDateString = (dateStr: string, format: string): { 
  isValid: boolean; 
  error?: string; 
  day?: number; 
  month?: number; 
  year?: number; 
} => {
  // Normalize separators to '/'
  const normalizedDate = dateStr.replace(/[-\.]/g, '/');
  const parts = normalizedDate.split('/');
  
  if (parts.length !== 3) {
    return { 
      isValid: false, 
      error: `Date "${dateStr}" does not have three parts (day, month, year)` 
    };
  }
  
  let day, month, year;
  
  // Extract values based on format
  if (format === 'dd/mm/yyyy') {
    [day, month, year] = parts.map(p => parseInt(p.trim()));
  } else if (format === 'mm/dd/yyyy') {
    [month, day, year] = parts.map(p => parseInt(p.trim()));
  } else if (format === 'yyyy-mm-dd') {
    [year, month, day] = parts.map(p => parseInt(p.trim()));
  } else {
    // Default to dd/mm/yyyy if format is unknown
    [day, month, year] = parts.map(p => parseInt(p.trim()));
  }
  
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
  
  // Check year range
  if (year < 1900) {
    return { isValid: false, error: `Year ${year} is too far in the past` };
  }
  
  if (year > 2100) {
    return { isValid: false, error: `Year ${year} is too far in the future` };
  }
  
  // Check valid days in month
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  // Adjust February for leap years
  if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
    daysInMonth[2] = 29;
  }
  
  if (day > daysInMonth[month]) {
    return { isValid: false, error: `Invalid day ${day} for month ${month}` };
  }
  
  return { isValid: true, day, month, year };
};

// Helper to format date based on format
const formatDate = (day: number, month: number, year: number, format: string): string => {
  const paddedDay = String(day).padStart(2, '0');
  const paddedMonth = String(month).padStart(2, '0');
  
  if (format === 'dd/mm/yyyy') {
    return `${paddedDay}/${paddedMonth}/${year}`;
  } else if (format === 'mm/dd/yyyy') {
    return `${paddedMonth}/${paddedDay}/${year}`;
  } else if (format === 'yyyy-mm-dd') {
    return `${year}-${paddedMonth}-${paddedDay}`;
  }
  
  // Default format
  return `${paddedDay}/${paddedMonth}/${year}`;
};

export const validateDataRows = (
  data: any[], 
  satisfactionHeader: string, 
  loyaltyHeader: string,
  satisfactionScale: string,
  loyaltyScale: string,
  existingData?: DataPoint[] // Optional: existing data for ID reuse (historical tracking)
) => {
  console.log('Starting data validation with headers:', { satisfactionHeader, loyaltyHeader });
  if (data.length > 0) {
    console.log('Sample row:', data[0]);
  }
  
  const processedData = data
    .filter(row => Object.values(row).some(value => value))
    // Filter out metadata rows like OPTIONAL/REQUIRED
    .filter(row => {
      // Check if row appears to be metadata
      const values = Object.values(row).map(v => String(v || '').trim().toUpperCase());
      const metadataTerms = ['OPTIONAL', 'REQUIRED'];
      // If all values are either empty or metadata terms, skip the row
      return !values.every(v => v === '' || metadataTerms.includes(v));
    })
    .map((row, index) => {
      try {
        // Parse satisfaction and loyalty values
        const satisfaction = Number(row[satisfactionHeader]);
        const loyalty = Number(row[loyaltyHeader]);
        
        // Case-insensitive search for date, email, and name fields
        let dateValue = '';
        let emailValue = '';
        let nameValue = '';
        
        // First look for exact fields
        for (const key of Object.keys(row)) {
          const keyLower = key.toLowerCase();
          
          if (keyLower === 'date') {
            dateValue = row[key];
            console.log(`Found exact date field "${key}" with value:`, dateValue);
          } else if (keyLower === 'email') {
            emailValue = row[key];
          } else if (keyLower === 'name') {
            nameValue = row[key];
          }
        }
        
        // If date not found, look for fields containing "date"
        if (!dateValue) {
          for (const key of Object.keys(row)) {
            const keyLower = key.toLowerCase();
            if (keyLower.includes('date')) {
              dateValue = row[key];
              console.log(`Found date-containing field "${key}" with value:`, dateValue);
              break;
            }
          }
        }
        
        const date = dateValue !== undefined ? String(dateValue).trim() : '';
        const email = emailValue !== undefined ? String(emailValue).trim() : '';
        const name = nameValue !== undefined ? String(nameValue).trim() : '';
        
        // Helper function for decimal precision check
        const hasValidDecimalPrecision = (value: number): boolean => {
          const multiplied = value * 10;
          return Math.abs(multiplied - Math.round(multiplied)) < 0.0001;
        };
        
        // Validate satisfaction (decimals allowed, max 1 decimal place)
        if (row[satisfactionHeader] === undefined || row[satisfactionHeader] === '') {
          throw new Error(`Satisfaction value is empty`);
        } else if (isNaN(satisfaction)) {
          throw new Error(`Invalid satisfaction value "${row[satisfactionHeader]}" (not a number)`);
        } else {
          const [minSat, maxSat] = satisfactionScale.split('-').map(Number);
          if (satisfaction < minSat || satisfaction > maxSat) {
            throw new Error(`Invalid satisfaction value ${satisfaction} (should be between ${minSat} and ${maxSat})`);
          } else if (!Number.isInteger(satisfaction) && !hasValidDecimalPrecision(satisfaction)) {
            throw new Error(`Satisfaction value ${satisfaction} has too many decimal places (maximum 1 allowed)`);
          }
        }
        
        // Validate loyalty (integers only)
        if (row[loyaltyHeader] === undefined || row[loyaltyHeader] === '') {
          throw new Error(`Loyalty value is empty`);
        } else if (isNaN(loyalty)) {
          throw new Error(`Invalid loyalty value "${row[loyaltyHeader]}" (not a number)`);
        } else {
          const [minLoy, maxLoy] = loyaltyScale.split('-').map(Number);
          if (loyalty < minLoy || loyalty > maxLoy) {
            throw new Error(`Invalid loyalty value ${loyalty} (should be between ${minLoy} and ${maxLoy})`);
          } else if (!Number.isInteger(loyalty)) {
            throw new Error(`Loyalty value ${loyalty} must be a whole number (no decimals allowed)`);
          }
        }
        
        // Validate email if present
        if (email && !validateEmail(email).isValid) {
          throw new Error(`Invalid email format: "${email}"`);
        }
        
        // Process optional columns
        // HISTORICAL TRACKING: If no ID provided but email exists, reuse ID from existing entry with same email
        let rowId = row.ID || '';
        if (!rowId && email && existingData) {
          const normalizedEmail = email.trim().toLowerCase();
          const existingEntryWithEmail = existingData.find(
            item => item.email && item.email.trim().toLowerCase() === normalizedEmail
          );
          if (existingEntryWithEmail) {
            rowId = existingEntryWithEmail.id;
            console.log(`Reusing ID ${rowId} for existing email ${email} (historical tracking)`);
          }
        }
        if (!rowId) {
          rowId = idCounter.getNextId();
        }
        
        let processedRow: any = {
          id: rowId,
          name: name,
          email: email || undefined,  // Use undefined instead of empty string
          satisfaction,
          loyalty,
        };
        
        // Detect and handle date format
        if (date) {
          console.log('Processing date:', date);
          // Default to DD/MM/YYYY
          let dateFormat = 'dd/mm/yyyy';
          
          // Look for date format hints in headers
          const dateHeaders = Object.keys(row).filter(key => key.toLowerCase().includes('date'));
          console.log('Date headers found:', dateHeaders);
          
          // Check headers for format indicators
          for (const header of dateHeaders) {
            const headerLower = header.toLowerCase();
            if (headerLower.includes('mm/dd') || headerLower.includes('(mm')) {
              dateFormat = 'mm/dd/yyyy';
              break;
            } else if (headerLower.includes('yyyy') && (headerLower.includes('-mm') || headerLower.includes('yyyy-'))) {
              dateFormat = 'yyyy-mm-dd';
              break;
            }
          }
          console.log('Using date format:', dateFormat);
          
          // Parse and validate the date
const parseResult = parseDateString(date, dateFormat);
if (!parseResult.isValid) {
  console.warn(`Warning: Invalid date "${date}": ${parseResult.error}`);
  
  // Show a notification to the user about the invalid date
  try {
    const errorMessage = `Row with ID "${processedRow.id || 'unknown'}": ${parseResult.error}`;
    // Add an appropriate warning mechanism here - depends on your app structure
    
    // Still add the date field but mark it as invalid
    processedRow.date = `INVALID: ${date}`;
    console.log('Added invalid date to row.date:', processedRow.date);
  } catch (e) {
    console.error('Error creating date warning:', e);
  }
} else {
  // Format date according to the detected format
  const formattedDate = formatDate(
    parseResult.day!, 
    parseResult.month!, 
    parseResult.year!, 
    dateFormat
  );
  
  // Add formatted date to processed row
  processedRow.date = formattedDate;
  console.log('Added date to row.date:', formattedDate);
}
        }
        
        // Add other optional fields if present
        ['Country', 'TrueLoyalist', 'NumPurchases', 'NumComplaints'].forEach(field => {
          const value = row[field];
          if (value !== undefined && value !== '') {
            processedRow[field.toLowerCase()] = value;
          }
        });

        // Add any other custom fields
        Object.keys(row).forEach(key => {
          const lowercaseKey = key.toLowerCase();
          const standardFields = ['id', 'name', 'email', 'satisfaction', 'loyalty', 'date', 'country', 'trueloyalist', 'numpurchases', 'numcomplaints'];
          
          if (!standardFields.includes(lowercaseKey) && row[key] !== undefined && row[key] !== '') {
            processedRow[lowercaseKey] = row[key];
          }
        });
        
        // Delete any lowercase equivalents of standard field names except the proper ones
        for (const standardField of ['id', 'name', 'email', 'satisfaction', 'loyalty', 'date', 'country', 'trueloyalist', 'numpurchases', 'numcomplaints']) {
          for (const key of Object.keys(processedRow)) {
            if (key.toLowerCase() === standardField && key !== standardField) {
              delete processedRow[key];
            }
          }
        }
        
        console.log('Final processed row:', processedRow);
        return processedRow;
      } catch (error) {
        // Add row information to error message
        const errorMessage = error instanceof Error 
          ? error.message 
          : String(error);
        throw new Error(`Row ${index + 2}: ${errorMessage}`);
      }
    })
    .filter((data): data is NonNullable<typeof data> => data !== null);
    
  console.log('Processed data sample:', processedData.length > 0 ? processedData[0] : 'No data');
  console.log('Total processed rows:', processedData.length);
  return processedData;
};