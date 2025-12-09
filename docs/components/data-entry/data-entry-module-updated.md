# DataEntryModule

## Overview
The DataEntryModule is a core component of Segmentor that handles all data input functionality. It provides both manual data entry and CSV file import capabilities, with built-in validation and scale management.

## Features
- Manual data entry form with validation
- CSV file import with progress tracking
- Scale management (1-5, 1-7, 1-10)
- Data persistence using local storage
- Upload history tracking
- Error handling and notifications
- Data point editing and deletion
- Duplicate detection for both new entries and edits
- Exclusion management for data points
- Preservation of custom fields across edits

## Interface

### Props
```typescript
interface DataEntryModuleProps {
  /** Callback function when data changes */
  onDataChange: (data: DataPoint[], headerScales?: HeaderScales) => void;
  
  /** Current satisfaction scale format */
  satisfactionScale: ScaleFormat;
  
  /** Current loyalty scale format */
  loyaltyScale: ScaleFormat;
  
  /** Optional external data array */
  data?: DataPoint[];
  
  /** Callback for secret code activation */
  onSecretCode?: (code: string) => void;
}
```

### State
```typescript
interface ModuleState {
  /** Current data points */
  data: DataPoint[];
  
  /** Data point being edited */
  editingData: DataPoint | null;
  
  /** CSV upload history */
  uploadHistory: UploadHistoryItem[];
  
  /** Timestamp of last manual entry */
  lastManualEntryTimestamp: number;
}
```

## Key Workflows

### Manual Entry
1. User fills out the data entry form
2. System validates input on submission
3. System checks for duplicates against existing data
4. If duplicates found, user is presented with resolution options
5. If no duplicates or user chooses to add anyway, data is added
6. Form is reset for next entry

### CSV Import
1. User uploads a CSV file
2. System validates file structure and content
3. System detects scales from headers
4. System validates data against detected scales
5. System checks for duplicates
6. User chooses append or replace mode
7. Data is added to the table
8. Upload history is updated

### Editing
1. User selects an entry to edit
2. Entry data is loaded into the form
3. User modifies data
4. System validates input on submission
5. System checks for duplicates against all other entries
6. If duplicates found, user is presented with resolution options
7. If no duplicates or user chooses to add anyway, entry is updated
8. Form is reset

## Duplicate Detection

The duplicate detection system works for both new entries and edits:

1. For new entries, it checks against all existing data
2. For edits, it excludes the current entry's ID from comparison
3. Duplicate criteria include:
   - Matching satisfaction and loyalty values
   - At least one matching identifier (name, email, date)
   - Fields must either match or be empty in both entries

## Custom Field Preservation

The module preserves custom fields when editing entries:

1. When an entry is edited, all non-standard fields are copied to the new entry
2. This ensures that additional data imported from CSV is not lost during edits
3. Standard fields that can be edited include:
   - ID, name, email, satisfaction, loyalty, date
4. All other fields are preserved automatically

## Scale Management

The module manages scales for satisfaction and loyalty:

1. Scales are locked once data exists
2. CSV imports must use compatible scales with existing data
3. Scale changes are propagated to the parent component
4. Scale information is included with each data point

## Date Format Handling

Date format is managed to ensure consistency:

1. Date format is stored with each entry
2. Format is locked when entries with dates exist
3. When editing, the original date format is preserved
4. New entries use the currently selected format

## Integration with Storage

The module integrates with local storage for persistence:

1. Data is saved to local storage after changes
2. Data is loaded from local storage on initialization
3. Upload history is tracked and persisted

## Path: /docs/components/data-entry/DataEntryModule.md