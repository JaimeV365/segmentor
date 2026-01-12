import { DataPoint } from '@/types/base';
import { DuplicateReport } from '../types';

export const detectDuplicates = (newData: any[], existingData: DataPoint[]): DuplicateReport => {
  console.log('Running duplicate detection on', newData.length, 'rows');
  
  if (newData.length === 0) {
    return { count: 0, items: [] };
  }
  
  // Extract just the IDs for ID-based duplicate detection
  const existingIds = existingData.map(item => item.id);
  
  // Create a map to track all reasons for each row by ID
  const duplicateMap = new Map<string, { item: any, reasons: Set<string> }>();
  
  // Check for duplicate IDs within the file
  const idsInFile = newData.filter(row => row.id).map(row => row.id);
  const uniqueIds = new Set<string>();
  const duplicateIds = new Set<string>();
  
  // Find duplicated IDs within this import
  idsInFile.forEach(id => {
    if (uniqueIds.has(id)) {
      duplicateIds.add(id);
    } else {
      uniqueIds.add(id);
    }
  });
  
  console.log('Found duplicate IDs within file:', Array.from(duplicateIds));
  
  // Add all instances of duplicated IDs to the map
  duplicateIds.forEach(dupId => {
    const items = newData.filter(row => row.id === dupId);
    items.forEach(item => {
      const id = item.id || `noID-${Math.random().toString(36).substring(2, 9)}`;
      if (!duplicateMap.has(id)) {
        duplicateMap.set(id, { item, reasons: new Set() });
      }
      duplicateMap.get(id)?.reasons.add('Duplicate ID within imported file');
    });
  });
  
  // HISTORICAL TRACKING: Check for IDs that already exist in the system
  // ID must always be unique (even with different dates)
  // But we should check if it's the same ID + same date (true duplicate) vs same ID + different date (might be intentional)
  if (existingIds.length > 0) {
    // Get the count of matching IDs between this file and existing data
    const matchingIds = idsInFile.filter(id => existingIds.includes(id));
    console.log('Found existing IDs:', matchingIds.length);
    
    // Check each matching ID to see if it's a true duplicate (same ID + same date)
    matchingIds.forEach(id => {
      const newItem = newData.find(row => row.id === id);
      if (newItem) {
        const normalizedNewDate = (newItem.date || '').trim();
        
        // Find existing item with same ID
        const existingItem = existingData.find(item => item.id === id);
        if (existingItem) {
          const normalizedExistingDate = (existingItem.date || '').trim();
          
          // Flag as duplicate if:
          // 1. Same ID AND same date (true duplicate)
          // 2. Same ID AND no dates provided (assume duplicate to be safe)
          // 3. Same ID AND one has date, one doesn't (flag to be safe)
          if ((normalizedExistingDate !== '' && normalizedNewDate !== '' && normalizedExistingDate === normalizedNewDate) ||
              (normalizedExistingDate === '' && normalizedNewDate === '') ||
              (normalizedExistingDate !== '' && normalizedNewDate === '') ||
              (normalizedExistingDate === '' && normalizedNewDate !== '')) {
            const itemId = newItem.id || `noID-${Math.random().toString(36).substring(2, 9)}`;
            if (!duplicateMap.has(itemId)) {
              duplicateMap.set(itemId, { item: newItem, reasons: new Set() });
            }
            if (normalizedExistingDate === normalizedNewDate && normalizedExistingDate !== '') {
              duplicateMap.get(itemId)?.reasons.add(`ID already exists with same date (${id}, ${newItem.date})`);
            } else {
              duplicateMap.get(itemId)?.reasons.add(`ID already exists in system (${id})`);
            }
          }
          // If same ID but different dates, it's NOT flagged (allows historical tracking with ID)
        }
      }
    });
  }
  
  // Add email duplicate detection
  // Create a map of all emails for quick lookup within this file
  const emailMap = new Map<string, any[]>();
  
  // First gather all emails in this import
  newData.forEach(row => {
    if (row.email) {
      const email = row.email.toLowerCase().trim();
      if (!emailMap.has(email)) {
        emailMap.set(email, []);
      }
      emailMap.get(email)?.push(row);
    }
  });
  
  // Check for duplicate emails
  emailMap.forEach((rows, email) => {
    if (rows.length > 1) {
      // Duplicates within this import
      rows.forEach(row => {
        const itemId = row.id || `noID-${Math.random().toString(36).substring(2, 9)}`;
        if (!duplicateMap.has(itemId)) {
          duplicateMap.set(itemId, { item: row, reasons: new Set() });
        }
        duplicateMap.get(itemId)?.reasons.add(`Duplicate email (${email})`);
      });
    }
  });
  
  // Add name duplicate detection
  // Create a map of all names for quick lookup within this file
  const nameMap = new Map<string, any[]>();
  
  // First gather all names in this import
  newData.forEach(row => {
    if (row.name) {
      const name = row.name.toLowerCase().trim();
      if (!nameMap.has(name)) {
        nameMap.set(name, []);
      }
      nameMap.get(name)?.push(row);
    }
  });
  
  // Check for duplicate names
  nameMap.forEach((rows, name) => {
    if (rows.length > 1) {
      // Duplicates within this import
      rows.forEach(row => {
        const itemId = row.id || `noID-${Math.random().toString(36).substring(2, 9)}`;
        if (!duplicateMap.has(itemId)) {
          duplicateMap.set(itemId, { item: row, reasons: new Set() });
        }
        duplicateMap.get(itemId)?.reasons.add(`Duplicate name (${name})`);
      });
    }
  });
  
  // Add NEW CODE: Check for name duplicates against existing data
  // Check new data against existing names
  newData.forEach(newItem => {
    if (newItem.name) {
      const normalizedName = newItem.name.toLowerCase().trim();
      
      // Check against existing data names
      existingData.forEach(existingItem => {
        if (existingItem.name && 
            existingItem.name.toLowerCase().trim() === normalizedName) {
          // It's a duplicate name with existing data
          const itemId = newItem.id || `noID-${Math.random().toString(36).substring(2, 9)}`;
          if (!duplicateMap.has(itemId)) {
            duplicateMap.set(itemId, { item: newItem, reasons: new Set() });
          }
          duplicateMap.get(itemId)?.reasons.add(`Duplicate name (${newItem.name})`);
        }
      });
    }
  });
  
  // HISTORICAL TRACKING: Check for email duplicates against existing data
  // Only flag as duplicate if same email AND same date (allows historical tracking)
  newData.forEach(newItem => {
    if (newItem.email) {
      const normalizedEmail = newItem.email.toLowerCase().trim();
      const normalizedNewDate = (newItem.date || '').trim();
      
      // Check against existing data emails
      existingData.forEach(existingItem => {
        if (existingItem.email && 
            existingItem.email.toLowerCase().trim() === normalizedEmail) {
          const normalizedExistingDate = (existingItem.date || '').trim();
          
          // Only flag as duplicate if same email AND same date
          // This allows historical tracking: same customer, different dates = NOT duplicate
          if (normalizedExistingDate !== '' && normalizedNewDate !== '' && 
              normalizedExistingDate === normalizedNewDate) {
            // Same customer, same time period = duplicate
            const itemId = newItem.id || `noID-${Math.random().toString(36).substring(2, 9)}`;
            if (!duplicateMap.has(itemId)) {
              duplicateMap.set(itemId, { item: newItem, reasons: new Set() });
            }
            duplicateMap.get(itemId)?.reasons.add(`Duplicate email and date (${newItem.email}, ${newItem.date})`);
          }
          // If dates are different, it's NOT a duplicate (historical data for same customer)
        }
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
  
  const result = {
    count: duplicates.length,
    items: duplicates
  };
  
  console.log('Final duplicate report:', result);
  return result;
};

export const generateDuplicateCSV = (duplicates: DuplicateReport): void => {
  // Enhanced CSV with more fields
  const header = 'ID,Name,Email,Reason\n';
  const rows = duplicates.items.map(item => {
    // Get email from the reason if it contains an email
    const emailMatch = item.reason.match(/Duplicate email \((.*?)\)/);
    const email = emailMatch ? emailMatch[1] : '';
    
    return `"${item.id}","${item.name}","${email}","${item.reason}"`;
  }).join('\n');
  
  const content = header + rows;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'segmentor_duplicate_records.csv');  // With segmentor prefix
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating duplicate CSV:', error);
  }
};