// import { ValidationResult } from '../types';
import { ScaleFormat, DataPoint } from '@/types/base';
import { parseDateString, formatDate, getDateFormatFromHeader } from './dateProcessing';
import { idCounter } from '../../../utils/idCounter';

// The ValidationResult interface seems to be missing the isValid property
// Let's define our own interface for internal use that matches what we need
interface InternalValidationResult {
  data: any[];
  rejectedReport: {
    count: number;
    items: Array<{
      row: number;
      id: string;
      reason: string;
      value: string;
    }>;
  };
  warningReport: {
    count: number;
    items: Array<{
      row: number;
      id: string;
      reason: string;
      value: string;
    }>;
  };
}

// Update the validation functions to match the expected interface
export const validateEmail = (email: string): { isValid: boolean; message?: string } => {
  if (!email) return { isValid: true }; // Optional field
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return {
    isValid: re.test(String(email).toLowerCase()),
    message: 'Please enter a valid email address'
  };
};

export const validateDate = (date: string): { isValid: boolean; message?: string } => {
  if (!date) return { isValid: true }; // Optional field
  const d = new Date(date);
  return {
    isValid: !isNaN(d.getTime()),
    message: 'Please enter a valid date'
  };
};

export const validateScales = (
  satisfaction: number,
  loyalty: number,
  satisfactionScale: ScaleFormat,
  loyaltyScale: ScaleFormat
): { isValid: boolean; message?: string } => {
  const maxSat = parseInt(satisfactionScale.split('-')[1]);
  const maxLoy = parseInt(loyaltyScale.split('-')[1]);

  if (satisfaction < 1 || satisfaction > maxSat) {
    return {
      isValid: false,
      message: `Satisfaction must be between 1 and ${maxSat}`
    };
  }

  if (loyalty < 1 || loyalty > maxLoy) {
    return {
      isValid: false,
      message: `Loyalty must be between 1 and ${maxLoy}`
    };
  }

  return { isValid: true };
};

export const validateDataRows = (
  data: any[], 
  satisfactionHeader: string, 
  loyaltyHeader: string,
  satisfactionScale: string,
  loyaltyScale: string
): InternalValidationResult => {
  console.log('Starting data validation with headers:', { satisfactionHeader, loyaltyHeader });
  if (data.length > 0) {
    console.log('Sample row:', data[0]);
  }
  
  // Track validation issues
  const rejectedRows: Array<{
    row: number;
    id: string;
    reason: string;
    value: string;
  }> = [];
  
  const warningRows: Array<{
    row: number;
    id: string;
    reason: string;
    value: string;
  }> = [];
  
  // Duplicate tracking
  const processedEmails = new Set<string>();
  const emailDuplicates: string[] = [];
  
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
        // Extract all values we'll need
        const satisfaction = Number(row[satisfactionHeader]);
        const loyalty = Number(row[loyaltyHeader]);
        
        // Find date, email, name fields
        let dateValue = '';
        let emailValue = '';
        let nameValue = '';
        
        for (const key of Object.keys(row)) {
          const keyLower = key.toLowerCase();
          
          if (keyLower === 'date' || keyLower.includes('date')) {
            dateValue = row[key];
            console.log(`Found date-containing field "${key}" with value:`, dateValue);
          } else if (keyLower === 'email') {
            emailValue = row[key];
          } else if (keyLower === 'name') {
            nameValue = row[key];
          }
        }
        
        const date = dateValue !== undefined ? String(dateValue).trim() : '';
        const email = emailValue !== undefined ? String(emailValue).trim() : '';
        const name = nameValue !== undefined ? String(nameValue).trim() : '';
        
        // Collection of all validation errors for this row
        const rowErrors: string[] = [];

        // Validate satisfaction
        if (row[satisfactionHeader] === undefined || row[satisfactionHeader] === '') {
          rowErrors.push(`Satisfaction value is empty`);
        } else if (isNaN(satisfaction)) {
          rowErrors.push(`Invalid satisfaction value "${row[satisfactionHeader]}" (not a number)`);
        } else if (satisfaction < 1 || satisfaction > Number(satisfactionScale.split('-')[1])) {
          rowErrors.push(`Invalid satisfaction value ${satisfaction} (should be between 1 and ${satisfactionScale.split('-')[1]})`);
        }
        
        // Validate loyalty
        if (row[loyaltyHeader] === undefined || row[loyaltyHeader] === '') {
          rowErrors.push(`Loyalty value is empty`);
        } else if (isNaN(loyalty)) {
          rowErrors.push(`Invalid loyalty value "${row[loyaltyHeader]}" (not a number)`);
        } else {
  const [minLoy, maxLoy] = loyaltyScale.split('-').map(Number);
  if (loyalty < minLoy || loyalty > maxLoy) {
    rowErrors.push(`Invalid loyalty value ${loyalty} (should be between ${minLoy} and ${maxLoy})`);
  }
}
        
        // Validate email if present
        if (email) {
          const emailValidationResult = validateEmail(email);
          if (!emailValidationResult.isValid) {
            rowErrors.push(`Invalid email format: "${email}"`);
          } else {
            // Track email for duplicate detection
            if (processedEmails.has(email.toLowerCase())) {
              emailDuplicates.push(email.toLowerCase());
            } else {
              processedEmails.add(email.toLowerCase());
            }
          }
        }
        
        // Process the row data
        // HISTORICAL TRACKING: If no ID provided but email exists, reuse ID from existing entry with same email
        let rowId = row.ID || row.id;
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
          email: email || undefined,
          satisfaction,
          loyalty,
        };
        
        // Date validation

if (date) {
  console.log('Processing date:', date);
  
  // Look for date format hints in headers
  const dateHeaders = Object.keys(row).filter(key => key.toLowerCase().includes('date'));
  console.log('Date headers found:', dateHeaders);
  
  // Determine date format using our utility function
  let dateFormat = 'dd/MM/yyyy'; // Default
  if (dateHeaders.length > 0) {
    dateFormat = getDateFormatFromHeader(dateHeaders[0]);
  }
          
          console.log('Using date format:', dateFormat);
          
          // Parse and validate the date
          const parseResult = parseDateString(date, dateFormat);
          console.log('Parse result:', parseResult);
          
          if (!parseResult.isValid) {
            console.warn(`Warning: Invalid date "${date}": ${parseResult.error}`);
            rowErrors.push(`Invalid date: ${parseResult.error}`);
            
          } else {
            // Format date and add to row
            const formattedDate = formatDate(
              parseResult.day!, 
              parseResult.month!, 
              parseResult.year!, 
              dateFormat
            );
            processedRow.date = formattedDate;
            // Also store the format that was used
            processedRow.dateFormat = dateFormat;
            console.log('Added date to row.date:', formattedDate, 'with format:', dateFormat);
            
            // Check for date warnings (valid but suspicious)
            if (parseResult.warning) {
              warningRows.push({
                row: index + 2,
                id: processedRow.id || 'unknown',
                reason: parseResult.warning,
                value: formattedDate
              });
            }
          }
        }
        
        // Add other fields
        for (const key of Object.keys(row)) {
          const value = row[key];
          if (value !== undefined && value !== '') {
            const lowercaseKey = key.toLowerCase();
            // Skip already processed fields
            if (!['id', 'name', 'email', 'satisfaction', 'loyalty', 'date'].includes(lowercaseKey)) {
              processedRow[lowercaseKey] = value;
            }
          }
        }
        
        // If there are errors, add to rejected rows and return null
        if (rowErrors.length > 0) {
          rejectedRows.push({
            row: index + 2, // +2 for header row and 0-index
            id: processedRow.id || 'unknown',
            reason: rowErrors.join('; '),
            // Improved formatting of values without unnecessary JSON.stringify and quotes
            value: Object.entries(row)
              .filter(([key]) => 
                ['ID', satisfactionHeader, loyaltyHeader, 'Date'].some(field => 
                  key.includes(field)
                )
              )
              .map(([key, val]) => {
                // Clean up the key for better readability
                const cleanKey = key.replace(/[:|-]/g, '');
                return `${cleanKey}: ${val}`;
              })
              .join(', ')
          });
          return null; // Skip row with errors
        }
        
        console.log('Final processed row:', processedRow);
        return processedRow;
      } catch (error) {
        // Generic error handling
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        rejectedRows.push({
          row: index + 2,
          id: row.ID || 'unknown',
          reason: errorMessage,
          value: JSON.stringify(row).substring(0, 100) + '...'
        });
        
        return null; // Skip this row
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
  
  console.log('Processed data sample:', processedData.length > 0 ? processedData[0] : 'No data');
  console.log('Total processed rows:', processedData.length);
  console.log('Rejected rows:', rejectedRows.length);
  console.log('Warning rows:', warningRows.length);
  
  // Return both the processed data and the reports
  return {
    data: processedData,
    rejectedReport: {
      count: rejectedRows.length,
      items: rejectedRows
    },
    warningReport: {
      count: warningRows.length,
      items: warningRows
    }
  };
};