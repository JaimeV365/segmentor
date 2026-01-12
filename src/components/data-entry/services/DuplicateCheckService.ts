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
      
      // Normalize existing values
      const normalizedExistingName = existing.name?.trim() || '';
      const normalizedExistingEmail = existing.email?.trim().toLowerCase() || '';
      const normalizedExistingDate = existing.date?.trim() || '';

      // HISTORICAL TRACKING LOGIC:
      // Allow same email/ID with different dates for historical tracking
      // Only flag as duplicate if same customer (email/ID) AND same date
      
      const hasEmailMatch = normalizedExistingEmail !== '' && 
                           normalizedNewEmail !== '' && 
                           normalizedExistingEmail === normalizedNewEmail;
      
      const hasIdMatch = existing.id === newDataPoint.id;
      
      const hasDateMatch = normalizedExistingDate !== '' && 
                          normalizedNewDate !== '' && 
                          normalizedExistingDate === normalizedNewDate;
      
      const hasNameMatch = normalizedExistingName !== '' && 
                          normalizedNewName !== '' && 
                          normalizedExistingName === normalizedNewName;
      
      const bothHaveDates = normalizedExistingDate !== '' && normalizedNewDate !== '';
      const neitherHasDates = normalizedExistingDate === '' && normalizedNewDate === '';
      
      // CASE 1: Same ID
      if (hasIdMatch) {
        if (bothHaveDates) {
          // With dates: Only duplicate if same date (allows historical tracking)
          return hasDateMatch;
        } else {
          // Without dates: Same ID = always duplicate (can't differentiate time periods)
          return true;
        }
      }
      
      // CASE 2: Same Email
      if (hasEmailMatch) {
        if (bothHaveDates) {
          // With dates: Only duplicate if same date (allows historical tracking)
          return hasDateMatch;
        } else {
          // Without dates: Same email = duplicate (can't track history)
          return true;
        }
      }
      
      // CASE 3: Same Name (only if no email/ID to identify customer)
      if (hasNameMatch && normalizedNewEmail === '' && normalizedExistingEmail === '' && !hasIdMatch) {
        if (bothHaveDates) {
          // With dates: Only duplicate if same date
          return hasDateMatch;
        } else {
          // Without dates: Same name = duplicate (no other identifiers)
          return true;
        }
      }
      
      // Not a duplicate
      return false;
    });

    if (duplicate) {
      let reason = '';
      
      // Find the reason for duplication (which field actually had non-empty matching values)
      const normalizedExistingName = duplicate.name?.trim() || '';
      const normalizedExistingEmail = duplicate.email?.trim().toLowerCase() || '';
      const normalizedExistingDate = duplicate.date?.trim() || '';
      
      const bothHaveDates = normalizedExistingDate !== '' && normalizedNewDate !== '';
      
      if (duplicate.id === newDataPoint.id) {
        if (bothHaveDates) {
          reason = 'id and date';
        } else {
          reason = 'id';
        }
      } else if (normalizedExistingEmail !== '' && normalizedNewEmail !== '' && 
          normalizedExistingEmail === normalizedNewEmail) {
        if (bothHaveDates) {
          reason = 'email and date';
        } else {
          reason = 'email';
        }
      } else if (normalizedExistingName !== '' && normalizedNewName !== '' && 
                normalizedExistingName === normalizedNewName) {
        if (bothHaveDates) {
          reason = 'name and date';
        } else {
          reason = 'name';
        }
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