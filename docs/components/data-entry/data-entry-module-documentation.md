# Data Entry Module Documentation

## Overview

The DataEntryModule is the central component for managing all data input functionality in the Segmentor application. It provides a comprehensive interface for both manual data entry and CSV file import, with built-in validation, scale management, duplicate detection, and persistent storage.

## Component Architecture

### Directory Structure

```
src/components/data-entry/
├── DataEntryModule.tsx          # Main coordinator component
├── NotificationSystem.tsx       # Toast notification system
├── forms/
│   ├── DataInput/               # Manual entry form components
│   │   ├── index.tsx            # Main form component
│   │   ├── components/          # Field-specific components
│   │   ├── hooks/               # Form logic hooks
│   │   └── types.ts             # Type definitions
│   └── CSVImport/               # CSV import components
├── table/
│   ├── DataDisplay.tsx          # Data table component
│   └── TableComponents.tsx      # Table subcomponents
├── components/
│   └── DuplicateHandler.tsx     # Duplicate entry resolution
├── hooks/
│   ├── useDuplicateCheck.ts     # Duplicate detection logic
│   └── useNotification.ts       # Notification hook
├── utils/
│   ├── idCounter.ts             # Unique ID generation
│   ├── scaleManager.ts          # Scale validation and management
│   ├── storageManager.ts        # Local storage persistence
│   └── date/                    # Date handling utilities
└── types/
    └── index.ts                 # Shared type definitions
```

### Component Hierarchy

```
DataEntryModule
├── DataInput                    # Manual data entry form
│   ├── BasicInfoFields          # ID, Name, Email fields
│   ├── SatisfactionField        # Satisfaction with scale
│   ├── LoyaltyField             # Loyalty with scale
│   ├── DateField                # Date with format selection
│   └── FormActions              # Submit/Cancel buttons
├── CSVImport                    # CSV import system
│   ├── FileUploader             # File upload interface
│   ├── ProgressIndicator        # Import progress
│   └── ReportArea               # Validation results
├── DataDisplay                  # Data table display
└── DuplicateHandler             # Duplicate resolution modal
```

## Core Components

### DataEntryModule

**File Path:** `src/components/data-entry/DataEntryModule.tsx`

#### Props Interface

```typescript
interface DataEntryModuleProps {
  onDataChange: (data: DataPoint[], headerScales?: HeaderScales) => void;
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  data?: DataPoint[];
  onSecretCode?: (code: string) => void;
}
```

#### State Management

The component manages several key pieces of state:
- `editingData` - Currently edited data point
- `data` - Array of data points (if not externally provided)
- `uploadHistory` - History of CSV imports

#### Primary Responsibilities

1. **Coordinating Data Flow**
   - Receives scale information from parent
   - Passes data to child components
   - Communicates data changes to parent

2. **Managing Edit Workflow**
   - Handles edit requests from DataDisplay
   - Passes editing data to DataInput
   - Updates data when edit is submitted

3. **Data Persistence**
   - Loads data from local storage
   - Saves data to local storage after changes
   - Manages upload history persistence

4. **Secret Code Handling**
   - Forwards secret codes to parent application

### DataInput

**File Path:** `src/components/data-entry/forms/DataInput/index.tsx`

A comprehensive form for manual data entry with field validation, scale selection, and duplicate detection.

#### Props Interface

```typescript
interface DataInputProps {
  onSubmit: (id: string, name: string, email: string, satisfaction: number, loyalty: number, date: string) => void;
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  existingIds: string[];
  data: Array<{ id: string; date?: string; }>;
  editingData?: { 
    id: string; 
    name: string; 
    email?: string;
    satisfaction: number; 
    loyalty: number;
    date?: string;
  } | null;
  onCancelEdit: () => void;
  scalesLocked: boolean;
  showScales: boolean;
  onDataSubmitted?: () => void;
  onSecretCode?: (code: string) => void;
  onScaleUpdate: (value: ScaleFormat, type: 'satisfaction' | 'loyalty') => void;
}
```

#### Key Components

1. **BasicInfoFields** - ID, Name, and Email input with secret code detection
2. **SatisfactionField** - Scale selection and value input for satisfaction
3. **LoyaltyField** - Scale selection and value input for loyalty
4. **DateField** - Date input with format selection and validation
5. **FormActions** - Submit and Cancel buttons based on edit state

#### Hooks

1. **useDataInput** - Form state management and validation
2. **useDuplicateCheck** - Duplicate entry detection

### CSVImport

**File Path:** `src/components/data-entry/forms/CSVImport/index.tsx`

Handles CSV file importing with validation, parsing, and progress tracking.

#### Props Interface

```typescript
interface CSVImportProps {
  onImport: (
    data: Array<{ 
      id: string; 
      name: string; 
      satisfaction: number; 
      loyalty: number;
      date?: string;
      email?: string;
      [key: string]: any;
    }>, 
    headerScales: HeaderScales,
    overwrite?: boolean
  ) => string[];
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  existingIds: string[];
  scalesLocked: boolean;
  uploadHistory: UploadHistoryItem[];
  onUploadSuccess: (fileName: string, count: number, ids: string[], wasOverwrite?: boolean) => void;
}
```

#### Key Subcomponents

1. **FileUploader** - Drag-and-drop file interface
2. **ProgressIndicator** - Visual progress feedback
3. **ValidationError** - Error message display
4. **ReportArea** - Consolidated validation reports
5. **ImportModeModal** - Selection for append/overwrite

### DuplicateHandler

**File Path:** `src/components/data-entry/components/DuplicateHandler.tsx`

A modal dialog for resolving duplicate data entries.

#### Props Interface

```typescript
interface DuplicateHandlerProps {
  isOpen: boolean;
  onClose: () => void;
  existingEntry: DuplicateEntry;
  newEntry: DuplicateEntry;
  onSkip: () => void;
  onAdd: () => void;
  onEdit: () => void;
}

interface DuplicateEntry {
  id: string;
  name?: string;
  email?: string;
  satisfaction: number;
  loyalty: number;
  date?: string;
}
```

#### Key Features

1. **Side-by-side Comparison** - Shows existing and new data
2. **Multiple Resolution Options** - Skip, Edit, or Add
3. **Contextual Information** - Explains why entries are considered duplicates

## Utility Components

### InputField

**File Path:** `src/components/data-entry/forms/DataInput/components/InputField.tsx`

A versatile form input component used throughout the data entry system.

#### Props Interface

```typescript
interface InputFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: 'text' | 'number' | 'email' | 'date';
  min?: string;
  max?: string;
  onBlur?: (value: string) => void;
  dropdownOptions?: string[];
  onDropdownSelect?: (value: string) => void;
  required?: boolean;
}
```

#### Key Features

1. **Multiple Input Types** - Text, number, email, date
2. **Dropdown Support** - For scale values
3. **Error Display** - Shows validation errors
4. **Consistent Styling** - Maintains UI consistency

### DateField

**File Path:** `src/components/data-entry/forms/DataInput/components/DateField.tsx`

A specialized date input component with format selection and validation.

#### Props Interface

```typescript
interface DateFieldProps {
  formState: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  onInputChange: (field: keyof FormState, value: string) => void;
  isLocked: boolean;
  hasExistingDates: boolean;
}
```

#### Key Features

1. **Multiple Format Support** - DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
2. **Format Conversion** - Handles switching between formats
3. **Progressive Validation** - Real-time input validation
4. **Format Locking** - Prevents format changes if data exists

## Custom Hooks

### useDataInput

**File Path:** `src/components/data-entry/forms/DataInput/hooks/useDataInput.ts`

Manages form state and validation for the DataInput component.

```typescript
export const useDataInput = (props: DataInputProps) => {
  // Form state management
  const [formState, setFormState] = useState<FormState>({...});
  const [errors, setErrors] = useState<{...}>({});

  // Input handlers
  const handleInputChange = (field, value) => {...};
  const handleSubmit = (e, executeSubmit) => {...};
  const resetForm = () => {...};

  return {
    formState,
    errors,
    handleInputChange,
    handleSubmit,
    resetForm
  };
};
```

### useDuplicateCheck

**File Path:** `src/components/data-entry/hooks/useDuplicateCheck.ts`

Handles duplicate detection logic between new entries and existing data.

```typescript
export const useDuplicateCheck = (existingData: DataPoint[]) => {
  const [duplicateData, setDuplicateData] = useState<DuplicateData | null>(null);

  const checkForDuplicates = (newDataPoint: DataPoint): DuplicateCheckResult => {
    // Duplicate detection logic
    // ...
    
    return { isDuplicate, duplicate };
  };

  return {
    duplicateData,
    setDuplicateData,
    checkForDuplicates
  };
};
```

#### Duplicate Detection Algorithm

1. **Value Matching** - Checks if satisfaction and loyalty match
2. **Field Matching** - Examines name, email, and date fields
3. **Substantive Match** - Requires at least one non-empty field match

### useNotification

**File Path:** `src/components/data-entry/hooks/useNotification.ts`

Provides access to the notification system context.

```typescript
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
```

## Utility Services

### idCounter

**File Path:** `src/components/data-entry/utils/idCounter.ts`

Generates unique IDs for new data points.

```typescript
class IdCounter {
  // Singleton implementation
  private static instance: IdCounter;
  private counter: number;
  
  // Generate unique IDs
  public getNextId(): string {
    // Increment counter and format ID
    const id = `autoID-${String(this.counter).padStart(5, '0')}`;
    this.counter++;
    return id;
  }
  
  // Reset counter
  public reset(): void {...}
}

export const idCounter = IdCounter.getInstance();
```

### storageManager

**File Path:** `src/components/data-entry/utils/storageManager.ts`

Manages data persistence to localStorage.

```typescript
class StorageManager {
  // Singleton implementation
  private static instance: StorageManager;
  private storageAvailable: boolean;
  
  // Save state to localStorage
  public saveState(state: Partial<Omit<StorageState, 'lastUpdated'>>): void {...}
  
  // Load state from localStorage
  public loadState(): Partial<StorageState> | null {...}
  
  // Clear state
  public clearState(): void {...}
}

export const storageManager = StorageManager.getInstance();
```

### scaleManager

**File Path:** `src/components/data-entry/utils/scaleManager.ts`

Handles scale validation and management.

```typescript
class ScaleManager {
  // Singleton implementation
  private static instance: ScaleManager;
  
  // Validate scales for compatibility
  public validateScales(
    currentState: ScaleState,
    importedSatisfactionScale: ScaleFormat,
    importedLoyaltyScale: ScaleFormat
  ): { isValid: boolean; error?: string } {...}
  
  // Get default scales
  public getDefaultScales(): ScaleState {...}
  
  // Validate data point against scales
  public validateDataPoint(
    currentState: ScaleState,
    satisfaction: number,
    loyalty: number
  ): { isValid: boolean; error?: string } {...}
}

export const scaleManager = ScaleManager.getInstance();
```

## Date Handling System

**Directory Path:** `src/components/data-entry/utils/date/`

A comprehensive system for date input, validation, and formatting.

### Core Files

1. **dateInputHandler.ts** - Handles real-time date input formatting and validation
2. **blurHandler.ts** - Performs complete validation when input field loses focus
3. **helpers.ts** - Utility functions for date processing
4. **types.ts** - Type definitions

### Format-Specific Handlers

1. **ddmmyyyy.ts** - Day-first format (European style)
2. **mmddyyyy.ts** - Month-first format (US style)
3. **yyyymmdd.ts** - Year-first format (ISO style)

### Key Functions

```typescript
// Process user input for date fields
export const handleDateInput = (
  value: string,
  currentValue: string,
  dateFormat: string
): DateHandlerResult => {...}

// Validate and format date on blur
export const handleDateBlur = (
  value: string,
  dateFormat: string
): DateHandlerResult => {...}

// Helper functions
export const isLeapYear = (year: number): boolean => {...}
export const getDaysInMonth = (month: number, year?: number): number => {...}
export const getFormatSeparator = (dateFormat: string): string => {...}
export const expandTwoDigitYear = (yearStr: string): string => {...}
```

### Date Validation Features

1. **Real-time Formatting** - Auto-inserts separators and handles backspacing
2. **Format-Specific Logic** - Different validation based on format
3. **Leap Year Handling** - Validates February 29th properly
4. **Date Part Validation** - Validates days, months, and years individually
5. **Two-digit Year Expansion** - Intelligently expands years based on current year
6. **Future Date Warning** - Warns about dates in the future
7. **Date Format Locking** - Prevents format changes if data exists

## Workflows and User Interactions

### Manual Data Entry Workflow

1. **Form Filling**
   - User enters data in the form fields
   - Real-time validation provides immediate feedback
   - Scale selection available if no data exists

2. **Form Submission**
   - Data validation occurs on submission
   - Duplicate detection checks for conflicts
   - If duplicates found, DuplicateHandler opens

3. **Duplicate Resolution**
   - User chooses to skip, edit, or add anyway
   - If edit is chosen, form remains populated for changes
   - If add is chosen, entry is saved and form is reset

4. **Data Storage**
   - Data is saved to the application state
   - Data is persisted to localStorage
   - Parent component is notified of changes

### CSV Import Workflow

1. **File Selection**
   - User selects or drags a CSV file
   - File type and size validation occurs

2. **File Processing**
   - CSV parsing with PapaParse
   - Header detection and validation
   - Data validation against scales

3. **Issue Resolution**
   - Validation errors block import
   - Warnings about data issues are displayed
   - User can download reports for issues

4. **Import Confirmation**
   - User chooses to append or overwrite
   - Data is processed and added to the dataset
   - Upload history is updated

### Data Editing Workflow

1. **Edit Initiation**
   - User clicks edit button in data table
   - Edit event is dispatched to DataEntryModule
   - Form scrolls into view and populates with data

2. **Form Modification**
   - User modifies data in the form
   - Validation occurs as with new entries
   - Data is validated before submission

3. **Edit Completion**
   - Form is submitted with updated data
   - Data point is updated in the dataset
   - Edit mode is cleared

## Integration with Parent Application

### Data Flow

1. **Receiving Data**
   - Initial data can be passed from parent via `data` prop
   - Scales are received from parent via `satisfactionScale` and `loyaltyScale` props

2. **Reporting Changes**
   - All data changes are reported via `onDataChange` callback
   - Scale information is included in changes if relevant
   - Changes are propagated to parent application

3. **Secret Code Handling**
   - Secret codes entered in the ID field are captured
   - Codes are forwarded to parent via `onSecretCode` callback
   - Parent handles code activation and effects

## Key Type Definitions

```typescript
// Scale types
type ScaleFormat = '1-3' | '1-5' | '1-7' | '1-10' | '0-10';

// Header scales from CSV
interface HeaderScales {
  satisfaction: ScaleFormat;
  loyalty: ScaleFormat;
}

// Core data structure
interface DataPoint {
  id: string;
  name: string;
  email?: string;
  satisfaction: number;
  loyalty: number;
  date?: string;
  group: string;
  excluded?: boolean;
  [key: string]: any;  // Additional fields
}

// Form state
interface FormState {
  id: string;
  name: string;
  email: string;
  satisfaction: string;
  loyalty: string;
  date: string;
}

// Upload history
interface UploadHistoryItem {
  fileName: string;
  timestamp: Date;
  count: number;
  remainingCount: number;
  associatedIds: string[];
}

// Date handler result
interface DateHandlerResult {
  formattedValue: string;
  error: string;
  warning?: string;
}
```

## Error Handling

### Validation Errors

1. **Field Validation**
   - Required fields: id, name, satisfaction, loyalty
   - Optional fields with format validation: email, date
   - Scale range validation for satisfaction and loyalty

2. **Cross-Field Validation**
   - Duplicate ID detection
   - Date format consistency
   - Scale compatibility

### Error Display

1. **Inline Errors**
   - Field-specific errors appear below inputs
   - Errors clear when field is updated
   - Error styling with red borders and backgrounds

2. **Toast Notifications**
   - Success messages for successful operations
   - Error messages for operation failures
   - Automatically dismiss for success messages
   - Manual dismiss for error messages

### Exception Handling

1. **Try/Catch Blocks**
   - Operations wrapped in try/catch
   - Detailed error messages logged
   - User-friendly error notifications displayed
   - Graceful fallbacks for failures

2. **Data Integrity**
   - Validation before persistence
   - Database constraints enforced client-side
   - Type checking for data conversions

## Performance Considerations

### Optimization Techniques

1. **Memoization**
   - Expensive operations wrapped in useMemo
   - Callback functions memoized with useCallback
   - Dependencies carefully tracked

2. **Efficient State Updates**
   - Batch updates where possible
   - Immutable update patterns
   - State normalization for complex objects

3. **Local Storage Optimization**
   - Minimal, serializable state persisted
   - Storage checks before operations
   - Fallbacks for storage errors or capacity limits

### Large Dataset Handling

1. **CSV Import**
   - Streaming parser for large files
   - Chunked processing with progress updates
   - Optimized validation for large datasets

2. **Data Display**
   - Virtualized rendering with react-window
   - Pagination for extremely large datasets
   - Optimized sorting algorithms

## Accessibility Features

1. **Keyboard Navigation**
   - All interactive elements are keyboard accessible
   - Proper tab order and focus management
   - Focus restoration after modal operations

2. **Screen Reader Support**
   - Semantic HTML structure
   - ARIA attributes for dynamic content
   - Descriptive labels for all inputs

3. **Visual Accessibility**
   - Sufficient color contrast
   - Visual indicators beyond color
   - Consistent focus styles

## Security Considerations

1. **Input Sanitization**
   - All user inputs are sanitized
   - Type validation for all fields
   - Proper escaping for display

2. **Data Protection**
   - Minimal storage of sensitive data
   - Local-only storage for data privacy
   - Secret code obfuscation

## Deployment and Maintenance

### Browser Compatibility

The module is tested and compatible with:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### Dependency Management

Key external dependencies:
- React 18.x
- PapaParse for CSV parsing
- react-window for virtualization

## Integration Examples

### Basic Integration

```tsx
import { DataEntryModule } from './components/data-entry';

function App() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [scales, setScales] = useState({
    satisfactionScale: '1-5',
    loyaltyScale: '1-5'
  });

  const handleDataChange = (newData: DataPoint[], headerScales?: HeaderScales) => {
    setData(newData);
    
    if (headerScales) {
      setScales({
        satisfactionScale: headerScales.satisfaction,
        loyaltyScale: headerScales.loyalty
      });
    }
  };

  return (
    <DataEntryModule
      onDataChange={handleDataChange}
      satisfactionScale={scales.satisfactionScale}
      loyaltyScale={scales.loyaltyScale}
      data={data}
      onSecretCode={handleSecretCode}
    />
  );
}
```

### Advanced Integration with Secret Codes

```tsx
import { DataEntryModule } from './components/data-entry';
import { handleSecretCode } from './utils/secretCodes';

function App() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
  
  const handleSecretCodeActivation = (code: string) => {
    const result = handleSecretCode(code, activeEffects);
    setActiveEffects(result.newEffects);
    
    if (result.notification) {
      showNotification(result.notification);
    }
  };

  return (
    <DataEntryModule
      onDataChange={handleDataChange}
      satisfactionScale={scales.satisfactionScale}
      loyaltyScale={scales.loyaltyScale}
      data={data}
      onSecretCode={handleSecretCodeActivation}
    />
  );
}
```

## Troubleshooting Common Issues

### Issue: Data Not Persisting
- Check if localStorage is available
- Verify data is properly structured
- Ensure saveState is being called

### Issue: Duplicate Detection Not Working
- Confirm data array is being passed correctly
- Check duplicate detection criteria
- Verify DuplicateHandler is being rendered

### Issue: Scale Lock Issues
- Ensure isScalesLocked is set correctly
- Verify scale validation in manual entry
- Check scale detection in CSV import

## Future Enhancements

Potential improvements for the data entry module:

1. **Enhanced Validation**
   - Custom validation rules
   - Field interdependency validation
   - Advanced pattern matching

2. **Improved Data Import**
   - Excel file support
   - Google Sheets integration
   - Template customization

3. **Advanced UI Features**
   - Dark mode support
   - Customizable field ordering
   - Multi-language support

4. **Data Integration**
   - API-based persistence
   - Cloud synchronization
   - Multi-user collaboration