import { DataPoint } from '@/types/base';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicate?: DataPoint;
  reason?: string;
}

export interface DuplicateCheckOptions {
  existingData: DataPoint[];
  excludedId?: string; // ID to exclude from comparison (e.g., currently editing)
}

export const DuplicateCheckService = {
  checkForDuplicates: (
    newDataPoint: DataPoint,
    options: DuplicateCheckOptions
  ): DuplicateCheckResult => {
    const { existingData, excludedId } = options;
    
    // Normalize new data point values
    const normalizedNewName = newDataPoint.name?.trim() || '';
    const normalizedNewEmail = newDataPoint.email?.trim().toLowerCase() || '';
    const normalizedNewDate = newDataPoint.date?.trim() || '';
    
    const duplicate = existingData.find(existing => {
      // Skip comparing to self when editing (using ID)
      if (excludedId && existing.id === excludedId) return false;
      
      // CRITICAL: Same ID is always a duplicate (ID must be unique)
      if (existing.id === newDataPoint.id) return true;
      
      // Normalize existing values
      const normalizedExistingName = existing.name?.trim() || '';
      const normalizedExistingEmail = existing.email?.trim().toLowerCase() || '';
      const normalizedExistingDate = existing.date?.trim() || '';

      // HISTORICAL TRACKING: Allow same email/ID with different dates
      // Only flag as duplicate if:
      // 1. Same email AND same date (same customer, same time = duplicate)
      // 2. Same ID (ID must always be unique)
      // 3. Same name AND same date (if no email/ID provided)
      
      const hasEmailMatch = normalizedExistingEmail !== '' && 
                           normalizedNewEmail !== '' && 
                           normalizedExistingEmail === normalizedNewEmail;
      
      const hasDateMatch = normalizedExistingDate !== '' && 
                          normalizedNewDate !== '' && 
                          normalizedExistingDate === normalizedNewDate;
      
      const hasNameMatch = normalizedExistingName !== '' && 
                          normalizedNewName !== '' && 
                          normalizedExistingName === normalizedNewName;
      
      // Duplicate if: (same email AND same date) OR (same name AND same date)
      // This allows historical tracking: same customer (email/ID) with different dates = NOT duplicate
      if (hasEmailMatch && hasDateMatch) return true; // Same customer, same time period
      if (hasNameMatch && hasDateMatch && normalizedNewEmail === '' && normalizedExistingEmail === '') {
        // Only flag name+date if no email exists (name is the only identifier)
        return true;
      }
      
      // Not a duplicate (different date = different time period = historical data)
      return false;
    });

    if (duplicate) {
      let reason = '';
      
      // Find the reason for duplication (which field actually had non-empty matching values)
      const normalizedExistingName = duplicate.name?.trim() || '';
      const normalizedExistingEmail = duplicate.email?.trim().toLowerCase() || '';
      const normalizedExistingDate = duplicate.date?.trim() || '';
      
      if (duplicate.id === newDataPoint.id) {
        reason = 'id';
      } else if (normalizedExistingEmail !== '' && normalizedNewEmail !== '' && 
          normalizedExistingEmail === normalizedNewEmail && 
          normalizedExistingDate !== '' && normalizedNewDate !== '' && 
          normalizedExistingDate === normalizedNewDate) {
        reason = 'email and date';
      } else if (normalizedExistingName !== '' && normalizedNewName !== '' && 
                normalizedExistingName === normalizedNewName &&
                normalizedExistingDate !== '' && normalizedNewDate !== '' && 
                normalizedExistingDate === normalizedNewDate) {
        reason = 'name and date';
      } else {
        // Fallback
        reason = 'matching data values'; 
      }
      
      return {
        isDuplicate: true,
        duplicate,
        reason
      };
    }

    return { isDuplicate: false };
  }
};

export default DuplicateCheckService;