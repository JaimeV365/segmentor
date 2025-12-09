# CSV Import Documentation

## Overview

The CSV Import system provides a robust mechanism for importing customer data from CSV files into the Segmentor data entry system. It handles file validation, data processing, duplicate detection, scale compatibility checks, and intelligent scale detection with user confirmation when needed.

## Key Features

- **File Validation**: Verifies file type, size, and structure
- **Header Detection**: Automatically identifies relevant column headers for satisfaction and loyalty
- **Intelligent Scale Detection**: Analyzes headers and data to determine scale formats, with user confirmation for ambiguous cases
- **Data Validation**: Validates data types, ranges, and formats
- **Duplicate Detection**: Identifies potential duplicates within the file and against existing data
- **Date Handling**: Processes dates with format detection and validation
- **Error Reporting**: Provides detailed error and warning reports
- **Import Modes**: Supports append and replace modes for existing data

## Import Process

### 1. File Selection

The user selects a CSV file through the FileUploader component, which provides:
- Drag and drop functionality
- File type validation (CSV, Excel)
- Size limit enforcement (10MB)
- Template download option

### 2. File Parsing

The file is parsed using the Papa Parse library:
- Headers are extracted and normalized
- Metadata rows (containing "REQUIRED"/"OPTIONAL") are filtered out
- Initial file structure validation is performed

### 3. Scale Detection and Confirmation

**Enhanced Scale Detection Process:**

The system performs intelligent scale detection in two phases:

#### Phase 1: Basic Header Processing
```typescript
const basicResult = processHeaders(headers);
```
- Extracts scale information from headers (e.g., "Satisfaction:1-5", "Loy-10")
- Supports formats: `Sat:1-5`, `Loy:1-10`, `CSAT(1-5)`, `NPS` (defaults to 0-10)
- Handles hyphen formats: `Sat-5` (inferred as 1-5)

#### Phase 2: Enhanced Data Analysis
```typescript
const headerResult = processHeadersWithDataAnalysis(headers, cleanedData);
```
- Analyzes actual data values to resolve ambiguous scales
- **Key Detection Logic:**
  - Data contains 0 → Definitely 0-X scale
  - Data starts at 1, max=10 → Could be either 1-10 or 0-10 (needs confirmation)
  - Data starts above 1, max=10 → Likely 1-10 but ask user to confirm
  - Data consistent with header → Use detected scale

#### Scale Confirmation Modal
When ambiguity is detected (`needsUserConfirmation = true`):
- Modal displays possible scale interpretations
- Shows actual data range found (e.g., "Data range: 3 - 10")
- User selects appropriate scale format
- Terminology uses simple descriptions: "(1=lowest)" vs "(0=lowest)"
- Continue button disabled until all required selections are made

**Supported Scale Formats:**
- **Satisfaction**: 1-3, 1-5, 1-7
- **Loyalty**: 1-5, 1-7, 1-10, 0-10

### 4. Data Validation

Each row undergoes comprehensive validation:
- Satisfaction and loyalty values are checked against confirmed scales
- Dates are validated and formatted according to detected format
- Email addresses are validated for proper format
- Required fields are checked for presence
- Row-level validation errors are collected

### 5. Duplicate Detection

Two types of duplicate checks are performed:

#### Internal Duplicates
- Checks for duplicate IDs within the imported file
- Prevents import if internal duplicates found
- Shows detailed error with duplicate IDs listed

#### External Duplicates
- Checks for duplicates against existing data
- Uses matching criteria:
  - Matching satisfaction and loyalty values
  - At least one matching identifier field (name, email, or date)
  - Fields must either match or be empty in both entries

### 6. Scale Compatibility

If existing data is present, scales are checked for compatibility:
- Imported scales must match current scales if data exists and scales are locked
- If no existing data, scales can be set based on imported data
- Scale mismatches result in clear error messages with suggested fixes

### 7. Import Mode Selection

If existing data is detected, the user is prompted to choose an import mode:
- **Append**: Add new data alongside existing data
- **Replace**: Remove all existing data and replace with imported data

### 8. Final Processing

After all checks, the data is processed:
- Custom fields are preserved
- Dates are formatted according to detected format
- Data is added to the storage
- Upload history is updated
- Success notification is displayed

## Error Handling

The system provides comprehensive error handling:

### Critical Errors (Prevent Import)
- **File Format Errors**: Invalid file type or corrupted files
- **Validation Errors**: Missing required columns, invalid data formats
- **Internal Duplicates**: Duplicate IDs within the same file
- **Scale Mismatches**: Incompatible scales with existing locked data
- **Scale Confirmation Errors**: Issues during scale confirmation processing

### Warnings (Allow Import with Reports)
- **Date Issues**: Invalid dates that were skipped during import
- **Date Warnings**: Unusual dates (far past/future) that may need review
- **External Duplicates**: Potential duplicates found against existing data

### Error Recovery
- Clear error messages with specific fix suggestions
- Downloadable error reports for detailed analysis
- State cleanup on errors to allow retry
- Progress indication during error handling

## Component Structure

### Main Components

- **CSVImport**: Orchestrates the overall import process
- **FileUploader**: Handles file selection and drag-drop
- **ProgressIndicator**: Shows import progress with stage-specific feedback
- **ScaleConfirmationModal**: Handles scale selection for ambiguous cases
- **ReportArea**: Displays errors and warnings
- **ImportModeModal**: Selection for append/replace modes
- **ValidationError**: Displays validation errors
- **DuplicateReport**: Shows potential duplicates
- **DateIssuesReport**: Shows date-related issues
- **UploadHistory**: Displays previous imports

### Key Hooks

- **useCSVParser**: Manages the CSV parsing, scale detection, and validation process
- **useCSVValidation**: Manages validation state and error reporting

## Scale Detection Implementation

### Detection Function
```typescript
export const detectPossibleScales = (
  header: string, 
  columnData: number[]
): ScaleDetectionResult => {
  // Extract potential max value from header
  const hyphenNumberMatch = header.match(/[-](\d+)$/);
  const maxFromHeader = parseInt(hyphenNumberMatch[1]);
  const actualMin = Math.min(...columnData);
  const actualMax = Math.max(...columnData);
  
  // Case 1: Data contains 0 → definitely 0-X scale
  if (actualMin === 0) {
    return { 
      definitive: `0-${maxFromHeader}`,
      possibleScales: [], 
      needsUserInput: false,
      dataRange: { min: actualMin, max: actualMax }
    };
  }
  
  // Case 2: Ambiguous for 10-scales
  if (actualMin >= 1 && maxFromHeader === 10) {
    return {
      definitive: null,
      possibleScales: [`1-${maxFromHeader}`, `0-${maxFromHeader}`],
      needsUserInput: true,
      dataRange: { min: actualMin, max: actualMax }
    };
  }
  
  // Default: use traditional 1-X scale
  return { 
    definitive: `1-${maxFromHeader}`,
    possibleScales: [], 
    needsUserInput: false,
    dataRange: { min: actualMin, max: actualMax }
  };
};
```

### Scale Confirmation Process
```typescript
const handleScaleConfirmation = (confirmedScales) => {
  // Apply confirmed scales without re-triggering detection
  const finalHeaderScales = applyConfirmedScales(pendingFileData.headerResult, confirmedScales);
  
  // Close modal and continue processing
  setShowScaleConfirmationModal(false);
  
  // Process with confirmed scales (NO infinite loop)
  continueWithConfirmedScales(finalHeaderScales);
};
```

## Integration with Data Entry Module

The CSV Import component is fully integrated with the DataEntryModule:
- Shares data state with manual entry forms
- Uses the same validation rules and scale formats
- Updates the same data storage mechanisms
- Tracks upload history with detailed metadata
- Clears validation warnings when manual entries are made

## Special Handling for Additional Fields

The system preserves all columns from the CSV, not just the standard fields:
- **Standard fields** (id, name, email, satisfaction, loyalty, date) are processed with special validation
- **Additional fields** are preserved as custom properties on data points
- **Special fields** like Country, TrueLoyalist, NumPurchases are preserved with original case
- **Metadata preservation** maintains data integrity across import/export cycles

## Date Format Handling

Comprehensive date processing includes:
- **Format detection** from headers (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
- **Intelligent parsing** with multiple format attempts
- **Validation** for logical correctness (valid month/day combinations, leap years)
- **Warning detection** for unusual dates (future dates >1 year, very old dates <1970)
- **Format storage** with the entry for consistent display
- **Error reporting** with downloadable reports for rejected dates

## Template Generation

The system generates intelligent templates based on current scale settings:

```csv
ID,Name,Email,Satisfaction:1-5,Loyalty:1-5,Date(dd/mm/yyyy),Country,TrueLoyalist,NumPurchases,NumComplaints
ABC123,John Smith,john@example.com,5,5,01/01/2024,United Kingdom,Yes,5,0
optional,optional,optional,REQUIRED (1-5),REQUIRED (1-5),optional,optional,optional,optional,optional
```

Features:
- Scale formats embedded in headers
- Metadata row indicating required vs optional fields
- Example data for clarity
- Current date format preferences
- Extensible for custom fields

## Performance Considerations

### Large File Handling
- Streaming parser for files up to 10MB
- Progress indication during processing
- Memory-efficient data processing
- Chunked validation for large datasets

### Optimization Features
- Early validation failure to prevent unnecessary processing
- Efficient duplicate detection algorithms
- Minimal re-parsing during scale confirmation
- State cleanup to prevent memory leaks

## Recent Improvements

### Scale Detection Fixes (January 2025)
1. **Infinite Loop Prevention**: Fixed issue where scale confirmation re-triggered detection
2. **Terminology Updates**: Removed trademarked terms, simplified scale descriptions
3. **UX Improvements**: Added button state validation, improved modal clarity
4. **Error Handling**: Enhanced error recovery during scale confirmation process

### Implementation Changes
- Direct Papa.parse calls during scale confirmation to prevent loops
- State cleanup improvements to prevent modal re-triggering
- Enhanced error messages with specific fix suggestions
- Improved progress tracking during scale confirmation

## Best Practices for Integration

### 1. Scale Management
- Initialize scales based on first data import
- Lock scales once data exists to maintain consistency
- Ensure compatibility between manual and imported data
- Provide clear templates with embedded scale information

### 2. Error Handling
- Provide clear feedback for validation errors
- Allow users to download detailed error reports
- Show progress during import with stage-specific messages
- Implement graceful error recovery with state cleanup

### 3. UX Considerations
- Intuitive drag-and-drop file interface
- Clear progress indicators for all processing stages
- Comprehensive validation feedback with suggested fixes
- Template download option with current scale settings
- Modal confirmations for destructive operations (replace mode)

### 4. Data Persistence
- Store comprehensive upload history with metadata
- Track imported IDs for relationship management
- Handle duplicate resolution with user choice
- Maintain data integrity across import/export cycles

## Troubleshooting

### Common Issues

**Scale Detection Problems**
- Ensure headers include scale information (e.g., "Loy:1-10")
- Check data values align with intended scale
- Verify no conflicting scale formats in the same file

**Import Failures**
- Check file format (CSV, Excel supported)
- Verify required columns are present
- Ensure no internal duplicate IDs
- Check scale compatibility with existing data

**Performance Issues**
- Keep files under 10MB for optimal performance
- Ensure stable internet connection for large uploads
- Close other resource-intensive applications during import

### Debug Information

The system provides extensive console logging:
```
🔍 Detecting scales for header: "Loy-10"
📊 Column data: [3, 5, 7, 8, 9, 10]
📈 Analysis: header max=10, data min=3, data max=10
Scale confirmation needed, storing pending data
```

This helps diagnose scale detection issues and processing flow problems.

---

*Document Path: `/docs/components/data-entry/csv-import.md`*  
*Last Updated: January 2025*  
*Version: 2.0*  
*Status: Production Ready ✅*