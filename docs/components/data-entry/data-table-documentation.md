# Data Table System Documentation

## Overview

The Data Display component is a core part of the Segmentor application that presents entered data in a tabular format with advanced features including sorting, filtering, row editing, data deletion, row exclusion, and average calculation, all within a virtualized list for optimal performance.

## Architecture

### Core Components

The data table system is composed of these key components:

1. **DataDisplay** (`DataDisplay.tsx`) - Main component that renders the virtualized table
2. **TableComponents** (`TableComponents.tsx`) - Modular table elements (header, row, footer)
3. **DetailsModal** (`DetailsModal.tsx`) - Modal dialog for viewing detailed data point information
4. **DateUtils** (`DateUtils.ts`) - Utilities for date handling and sorting

### Dependencies

- **react-window** - For virtualized rendering of large datasets
- **react-virtualized-auto-sizer** - For responsive virtualized components
- **lucide-react** - For UI icons

## Component Details

### DataDisplay

**File Path:** `src/components/data-entry/table/DataDisplay.tsx`

#### Props Interface

```typescript
interface DataDisplayProps {
  data: DataPoint[];                              // Data array to display
  onDelete: (id: string) => void;                 // Row deletion handler
  onEdit: (id: string) => void;                   // Edit row handler
  onDeleteAll: () => void;                        // Delete all handler
  onToggleExclude: (id: string) => void;          // Row exclusion toggle
  satisfactionScale: string;                      // Current satisfaction scale
  loyaltyScale: string;                           // Current loyalty scale
}
```

#### State Management

The component manages several pieces of state:
- `sortField` - Current column being sorted
- `sortDirection` - Direction of sorting ('asc', 'desc', or null)
- `detailsModalData` - State for the details modal

#### Sorting System

```typescript
type SortField = 'id' | 'name' | 'email' | 'satisfaction' | 'loyalty' | 'date';
type SortDirection = 'asc' | 'desc' | null;
```

The sorting system supports:
1. Column-based sorting with direction toggling
2. Special handling for date fields using `parseDateForSorting` utility
3. Null-value handling in all field types
4. Case-insensitive sorting for text fields

#### Row Virtualization

For optimal performance with large datasets, rows are rendered using React Window's virtualization:

```typescript
<List
  height={height - HEADER_HEIGHT - FOOTER_HEIGHT}
  width={width}
  itemCount={sortedData.length}
  itemSize={ROW_HEIGHT}
>
  {rowRenderer}
</List>
```

#### Statistics Calculation

The component calculates averages for satisfaction and loyalty values:

```typescript
const totals = sortedData.reduce((acc, curr) => ({
  satisfaction: acc.satisfaction + (curr.excluded ? 0 : curr.satisfaction),
  loyalty: acc.loyalty + (curr.excluded ? 0 : curr.loyalty),
  count: acc.count + (curr.excluded ? 0 : 1)
}), { satisfaction: 0, loyalty: 0, count: 0 });
```

Key features:
- Automatically excludes rows marked as `excluded`
- Provides real-time average calculations

### TableComponents

**File Path:** `src/components/data-entry/table/TableComponents.tsx`

This file contains modular table components:

1. **SortableHeader** - Clickable header with sorting indicators
2. **TableHeader** - Complete table header row with all columns
3. **TableRow** - Individual data row with data cells and action buttons
4. **TableFooter** - Table footer with summary statistics

#### TableHeader Props

```typescript
interface TableHeaderProps {
  satisfactionScale: string;
  loyaltyScale: string;
  sortField: string | null;
  sortDirection: 'asc' | 'desc' | null;
  handleSort: (field: string) => void;
  headerHeight: number;
}
```

#### TableRow Props

```typescript
interface RowProps {
  index: number;
  style: React.CSSProperties;  // Required by react-window
  data: DataPoint;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleExclude: (id: string) => void;
  onViewDetails: (data: DataPoint) => void;
}
```

#### TableFooter Props

```typescript
interface TableFooterProps {
  totals: {
    satisfaction: number;
    loyalty: number;
    count: number;
  };
  footerHeight: number;
}
```

### DetailsModal

**File Path:** `src/components/data-entry/table/DetailsModal.tsx`

A modal dialog for displaying all properties of a selected data point, including custom fields.

#### Props

```typescript
interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DataPoint;
}
```

#### Key Features

1. **Field Filtering** - Filters out standard fields and shows only relevant data
2. **Intelligent Field Display** - Handles alternate date fields and satisfaction/loyalty fields intelligently
3. **Portal Implementation** - Uses ReactDOM.createPortal for proper modal rendering

### DateUtils

**File Path:** `src/components/data-entry/table/DateUtils.ts`

Provides robust date handling for sorting and display.

```typescript
export const parseDateForSorting = (dateStr: string): Date | null => {
  // Handles multiple date formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
  // Returns null for invalid dates
}
```

## Workflows and User Interactions

### Data Row Handling

1. **Viewing Details**
   - When additional fields are detected, a view details button appears
   - Clicking opens the DetailsModal with all data point properties

2. **Editing**
   - Clicking the edit button dispatches an event to DataEntryModule
   - DataEntryModule scrolls to the input form and loads data for editing

3. **Exclusion Toggle**
   - Toggling exclusion updates the data point's `excluded` property
   - Excluded rows appear with strikethrough and gray styling
   - Excluded rows are omitted from statistical calculations

4. **Deletion**
   - Individual row deletion removes the data point
   - "Delete All Rows" button provides a confirmation prompt before bulk deletion

### Sorting Workflow

1. First click on a column header: Sort ascending
2. Second click: Sort descending
3. Third click: Clear sorting

The sort indicators visually show the current state:
- No sorting: Up/down arrows in gray
- Ascending sort: Up arrow in blue
- Descending sort: Down arrow in blue

### Statistics Calculation

The footer displays real-time statistics:
- Total count of non-excluded data points
- Average satisfaction and loyalty scores

## Style Implementation

### Visual Hierarchy

The table uses a clear visual hierarchy:
- Header with darker background and bold text
- Alternating row colors for readability
- Footer with summary information
- Consistent padding and alignment

### Status Indication

- **Excluded rows**: Gray with strikethrough text
- **Sort indicators**: Blue for active sorting column
- **Action buttons**: Color-coded for different actions (edit, toggle, delete)

### Responsive Design

The component adapts to container size using:
- Auto-sizer for container dimensions
- Percentage-based column widths
- Fixed row heights for consistent rendering

## Integration with Data Entry Module

The DataDisplay component integrates with the DataEntryModule through these interactions:

1. **Data Flow**
   - Receives data array from parent component
   - Updates display when data changes
   - Calculates statistics based on received data

2. **Action Callbacks**
   - `onEdit` - Initiates editing workflow for a specific data point
   - `onDelete` - Removes data point
   - `onToggleExclude` - Toggles exclusion status
   - `onDeleteAll` - Triggers bulk deletion

3. **Scale Integration**
   - Receives current satisfaction and loyalty scales
   - Displays scales in column headers

## Performance Considerations

### Optimization Techniques

1. **Row Virtualization**
   - Only renders visible rows
   - Maintains smooth scrolling for large datasets
   - Uses fixed row heights for optimal performance

2. **Memoized Calculations**
   - Uses `useMemo` for expensive operations:
     - Sorting data
     - Calculating statistics

3. **Conditional Rendering**
   - Only renders details button when additional fields exist
   - Modal is only mounted when open

4. **Efficient Updates**
   - Uses callbacks for specific row actions
   - Delegates state management to parent component

## Accessibility Features

The component implements these accessibility features:

1. **Keyboard Navigation**
   - All interactive elements are focusable
   - Proper tab order

2. **Screen Reader Support**
   - Descriptive button labels
   - ARIA attributes for interactive elements

3. **Visual Indicators**
   - Clear contrast for all text elements
   - Visual feedback for interactive elements

## Edge Cases and Error Handling

1. **Empty Dataset**
   - Displays "No data entered yet" message
   - Prevents errors when no data is available

2. **Sorting Edge Cases**
   - Handles null values in sort comparisons
   - Special handling for date fields and string fields

3. **Additional Fields Detection**
   - Intelligently detects non-standard fields
   - Filters duplicated or system fields from display

## Type Definitions

```typescript
// Core data point type
interface DataPoint {
  id: string;
  name: string;
  email?: string;
  satisfaction: number;
  loyalty: number;
  date?: string;
  group: string;
  excluded?: boolean;
  [key: string]: any;  // Additional custom fields
}

// Sort configuration
type SortField = 'id' | 'name' | 'email' | 'satisfaction' | 'loyalty' | 'date';
type SortDirection = 'asc' | 'desc' | null;

// Display dimensions
interface Size {
  width: number;
  height: number;
}
```

## Integration Examples

### Basic Integration

```tsx
<DataDisplay 
  data={dataPoints}
  satisfactionScale="1-5"
  loyaltyScale="1-5"
  onDelete={handleDelete}
  onEdit={handleEdit}
  onDeleteAll={handleDeleteAll}
  onToggleExclude={handleExclude}
/>
```

### Advanced Integration with Event Handling

```tsx
// In parent component
const handleEditDataPoint = (id: string) => {
  // Scroll to the data entry section
  if (dataEntryRef.current) {
    dataEntryRef.current.scrollIntoView({ behavior: 'smooth' });
    
    // Dispatch a custom event to tell the DataEntryModule to start editing
    const editEvent = new CustomEvent('edit-data-point', { detail: { id } });
    document.dispatchEvent(editEvent);
  }
};

// In DataEntryModule
useEffect(() => {
  const handleEditEvent = (event: Event) => {
    const customEvent = event as CustomEvent<{id: string}>;
    if (customEvent.detail && customEvent.detail.id) {
      startEditing(customEvent.detail.id);
    }
  };

  document.addEventListener('edit-data-point', handleEditEvent);
  
  return () => {
    document.removeEventListener('edit-data-point', handleEditEvent);
  };
}, [data]);
```

## Future Enhancements

Potential improvements for the data table system:

1. **Column Resizing** - Allow users to resize columns
2. **Column Visibility Toggle** - Let users show/hide specific columns
3. **Multi-Select** - Enable selection of multiple rows for bulk actions
4. **Advanced Filtering** - Add filter controls for each column
5. **Row Expansion** - Expandable rows to show additional data in-place
6. **CSV Export** - Add export functionality for table data
7. **Row Context Menu** - Right-click menu for additional actions
8. **Row Highlighting** - Highlight rows based on values or conditions

## Troubleshooting Common Issues

### Issue: Table Not Rendering Properly
- Check if data array is properly formatted
- Verify that container has sufficient height and width
- Ensure row height is properly set

### Issue: Sorting Not Working Correctly
- Verify data types are consistent
- Check for null or undefined values
- Inspect date string formats if sorting by date

### Issue: Performance Issues with Large Datasets
- Confirm virtualization is working properly
- Check for expensive calculations outside of memoization
- Verify that components aren't re-rendering unnecessarily
