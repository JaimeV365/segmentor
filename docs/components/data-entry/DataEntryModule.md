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
- Exclusion management for data points

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
}
```

## Usage

### Basic Usage
```tsx
function MyComponent() {
  const handleDataChange = (newData: DataPoint[]) => {
    // Handle data updates
  };

  return (
    <DataEntryModule
      onDataChange={handleDataChange}
      satisfactionScale="1-5"
      loyaltyScale="1-5"
    />
  );
}
```

### With Scale Management
```tsx
function MyComponent() {
  const [scales, setScales] = useState<ScaleState>({
    satisfactionScale: '1-5',
    loyaltyScale: '1-5',
    isLocked: false
  });

  const handleDataChange = (newData: DataPoint[], headerScales?: HeaderScales) => {
    if (headerScales) {
      setScales({
        satisfactionScale: headerScales.satisfaction,
        loyaltyScale: headerScales.loyalty,
        isLocked: true
      });
    }
  };

  return (
    <DataEntryModule
      onDataChange={handleDataChange}
      satisfactionScale={scales.satisfactionScale}
      loyaltyScale={scales.loyaltyScale}
    />
  );
}
```

## Dependencies
- CSVImport - Handles CSV file importing
- DataInput - Manual data entry form
- DataDisplay - Data table display
- NotificationSystem - User notifications
- StorageManager - Local storage management
- ScaleManager - Scale validation and management

## Events and Callbacks

| Event Name | Parameters | Description |
|------------|------------|-------------|
| onDataChange | (data: DataPoint[], headerScales?: HeaderScales) | Fires when data is added, updated, or deleted |
| onSecretCode | (code: string) | Fires when a secret code is entered |
| onDeleteDataPoint | (id: string) | Fires when a data point is deleted |
| onEditDataPoint | (id: string) | Fires when editing a data point begins |
| onToggleExclude | (id: string) | Fires when a data point's exclusion status changes |

## State Management

### Initial State
- Empty data array
- No editing data
- Empty upload history
- Unlocked scales

### State Updates
1. Data Entry:
   - Validates input
   - Updates data array
   - Updates local storage
   - Locks scales if first entry

2. CSV Import:
   - Validates file
   - Processes data
   - Updates upload history
   - Locks scales if first import

3. Data Editing:
   - Sets editing state
   - Updates data on save
   - Clears editing state

### Side Effects
- Local storage synchronization
- Scale locking management
- Upload history tracking

## Edge Cases and Error Handling

### Data Validation
- Invalid scale values
- Missing required fields
- Duplicate IDs
- Scale mismatches in CSV

### CSV Import
- Invalid file format
- Missing columns
- Data type mismatches
- Scale conflicts

### Scale Management
- Scale locking conditions
- Scale transition handling
- Mixed scale handling

## Performance Considerations
- Virtualized data table for large datasets
- Memoized callback functions
- Optimized CSV parsing
- Efficient local storage management

## Accessibility
- ARIA labels for form inputs
- Keyboard navigation
- Error announcements
- Focus management

## Related Components
- [CSVImport](./CSVImport.md)
- [DataInput](./DataInput.md)
- [DataDisplay](./DataDisplay.md)

## Examples

### Complete Implementation
```tsx
import React from 'react';
import DataEntryModule from './components/data-entry/DataEntryModule';
import { ScaleState, DataPoint } from './types';

function App() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [scales, setScales] = useState<ScaleState>({
    satisfactionScale: '1-5',
    loyaltyScale: '1-5',
    isLocked: false
  });

  const handleDataChange = (newData: DataPoint[], headerScales?: HeaderScales) => {
    setData(newData);
    if (headerScales && !scales.isLocked) {
      setScales({
        satisfactionScale: headerScales.satisfaction,
        loyaltyScale: headerScales.loyalty,
        isLocked: true
      });
    }
  };

  return (
    <div className="app">
      <DataEntryModule
        onDataChange={handleDataChange}
        satisfactionScale={scales.satisfactionScale}
        loyaltyScale={scales.loyaltyScale}
        data={data}
        onSecretCode={handleSecretCode}
      />
    </div>
  );
}
```

## Changelog
| Version | Changes |
|---------|---------|
| 1.0.0   | Initial implementation |
| 1.1.0   | Added scale locking |
| 1.2.0   | Added data exclusion |
| 1.3.0   | Added CSV import history |

## Notes
- Scale locking is permanent until all data is deleted
- Upload history persists across sessions
- Secret codes are case-sensitive
- Manual entry and CSV import use the same validation rules
