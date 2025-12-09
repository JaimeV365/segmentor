

## Integration with Data Input Form

The duplicate detection system is integrated with the data entry form to provide a seamless user experience.

### Form Submission Workflow

```typescript
// In DataInput/index.tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  // First do standard validation
  const validationResult = originalSubmit(e, false);
  
  if (validationResult?.isValid) {
    // Create data point from form state
    const newDataPoint: DataPoint = {
      id: formState.id || '',
      name: formState.name,
      email: formState.email || undefined,
      satisfaction: Number(formState.satisfaction),
      loyalty: Number(formState.loyalty),
      date: formState.date || undefined,
      group: 'default'
    };
    
    // Skip duplicate check if we're editing or if flag is set
    if (props.editingData || skipNextDuplicateCheck) {
      // Reset the flag if it was set
      if (skipNextDuplicateCheck) {
        setSkipNextDuplicateCheck(false);
      }
      
      // Submit directly without duplicate check
      props.onSubmit(/* ... */);
      return;
    }
    
    // Check for duplicates
    const { isDuplicate, duplicate } = checkForDuplicates(newDataPoint);
    
    if (isDuplicate && duplicate) {
      // Show duplicate handler
      setDuplicateData({
        existing: duplicate,
        new: newDataPoint
      });
    } else {
      // Not a duplicate, submit normally
      props.onSubmit(/* ... */);
      
      // Reset form after submission
      if (!props.editingData) {
        resetForm();
      }
    }
  }
};
```

### Duplicate Resolution Handlers

```typescript
// In DataInput/index.tsx

// Skip - discard the new entry
const handleDuplicateSkip = () => {
  setDuplicateData(null);
};

// Add Anyway - force save despite duplicate
const handleDuplicateAdd = () => {
  if (duplicateData) {
    props.onSubmit(
      duplicateData.new.id,
      duplicateData.new.name,
      duplicateData.new.email || '',
      duplicateData.new.satisfaction,
      duplicateData.new.loyalty,
      duplicateData.new.date || ''
    );
    setDuplicateData(null);
    
    // Reset form
    if (!props.editingData) {
      resetForm();
    }
  }
};

// Edit - return to form to modify values
const handleDuplicateEdit = () => {
  // Keep the form data but close the modal
  setDuplicateData(null);
};
```

## User Interface

The DuplicateHandler component provides a user-friendly interface for resolving duplicates:

```tsx
// DuplicateHandler.tsx simplified rendering
return (
  <div className="duplicate-handler-overlay">
    <div className="duplicate-handler-modal">
      <div className="duplicate-handler-header">
        <h2>Duplicate Entry Found</h2>
        <button onClick={onClose}>×</button>
      </div>
      
      <div className="duplicate-handler-content">
        <div className="duplicate-handler-description">
          ⚠️ An entry with matching information already exists:
        </div>
        
        <div className="duplicate-handler-comparison">
          <div className="duplicate-handler-entry duplicate-handler-entry-existing">
            <h3>Existing Entry:</h3>
            {/* Existing entry details */}
          </div>

          <div className="duplicate-handler-entry duplicate-handler-entry-new">
            <h3>New Entry:</h3>
            {/* New entry details */}
          </div>
        </div>

        <div className="duplicate-handler-message">
          <strong>What would you like to do?</strong>
        </div>
      </div>

      <div className="duplicate-handler-footer">
        <button onClick={onSkip} className="duplicate-handler-button duplicate-handler-button--secondary">
          Skip New Entry
        </button>
        <button onClick={onEdit} className="duplicate-handler-button duplicate-handler-button--warning">
          Edit Before Adding
        </button>
        <button onClick={onAdd} className="duplicate-handler-button duplicate-handler-button--primary">
          Add as New Entry
        </button>
      </div>
    </div>
  </div>
);
```

## Styling

### Modal Styling

```css
.duplicate-handler-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.duplicate-handler-modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000;
}
```

### Entry Comparison Styling

```css
.duplicate-handler-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.duplicate-handler-entry {
  background-color: #f9fafb;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.duplicate-handler-entry-existing {
  border-left: 4px solid #6B7280; /* Grey for existing */
}

.duplicate-handler-entry-new {
  border-left: 4px solid #3a863e; /* Green for new */
}
```

### Button Styling

```css
.duplicate-handler-button {
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: background-color 0.2s, transform 0.1s;
}

.duplicate-handler-button--secondary {
  background-color: #f3f4f6;
  color: #4b5563;
}

.duplicate-handler-button--warning {
  background-color: #D97706;
  color: white;
}

.duplicate-handler-button--primary {
  background-color: #3a863e;
  color: white;
}
```

## Common Scenarios

### Scenario 1: Same Satisfaction/Loyalty Values, Different Name/Email

If a user enters the same numerical values (satisfaction and loyalty) but with different identifying information (name, email, date), the system will not flag it as a duplicate since there's no substantive match on identifying fields.

### Scenario 2: Same Name with Different Satisfaction/Loyalty

If a user enters the same name but different satisfaction/loyalty values, the system will not flag it as a duplicate since the numerical values don't match. This allows recording different ratings from the same person at different times.

### Scenario 3: Matching Email and Values

If a user enters an entry with the same email address and identical satisfaction/loyalty values as an existing entry, the system will detect a duplicate since there's a substantive match on the email field and the numerical values match.

### Scenario 4: Partial Information Match

If both the existing and new entries have missing fields (e.g., no email in one, no date in the other), the system will still detect duplicates if the available fields match and at least one identifying field has a substantive match.

## Edge Cases and Solutions

### ID Handling

The system skips duplicate checking if the ID matches an existing entry, as this indicates an edit operation rather than a new entry.

```typescript
if (existing.id === newDataPoint.id) return false;
```

### Empty Field Handling

Empty fields are normalized to empty strings and are considered to "match" only if both fields are empty:

```typescript
const nameMatch = (normalizedExistingName === '' && normalizedNewName === '') || 
                 (normalizedExistingName !== '' && normalizedNewName !== '' && 
                  normalizedExistingName === normalizedNewName);
```

### Substantive Match Requirement

A match is only considered a duplicate if at least one identifying field (name, email, date) has a substantive match, meaning both entries have non-empty values that match:

```typescript
const hasSubstantiveNameMatch = normalizedExistingName !== '' && 
                               normalizedNewName !== '' && 
                               normalizedExistingName === normalizedNewName;
```

### Case Sensitivity

Email comparisons are case-insensitive to avoid false negatives due to capitalization differences:

```typescript
const normalizedNewEmail = newDataPoint.email?.trim().toLowerCase() || '';
```

## Performance Considerations

### Optimization Techniques

1. **Early Exit Strategy**
   - Checks value match first to quickly filter non-duplicates
   - Skips further processing if values don't match
   - Efficient field normalization

2. **Efficient State Management**
   - Modal state only set when duplicates found
   - Duplicate data cleared after resolution
   - Skip flag to avoid redundant checks

3. **Minimized Re-renders**
   - State updates batched where possible
   - Modal only rendered when duplicate found
   - Component hierarchy designed to minimize cascading renders

## Accessibility Considerations

1. **Keyboard Navigation**
   - Modal fully navigable via keyboard
   - Focus trapped within modal when open
   - Logical tab order for action buttons

2. **Screen Reader Support**
   - Clear headings and structure
   - Descriptive button labels
   - Explanatory text for duplicate state

3. **Visual Clarity**
   - Distinct color coding for existing vs. new entries
   - Clear action button labeling and grouping
   - High contrast for readability

## Future Enhancements

Potential improvements for the duplicate detection system:

1. **Enhanced Matching Algorithm**
   - Fuzzy matching for names
   - Partial email matching
   - Phonetic name matching
   - Configurable match threshold

2. **Improved User Interface**
   - Field-by-field comparison highlighting
   - Merge capability for combining entries
   - Batch duplicate resolution
   - History of duplicate decisions

3. **Advanced Configuration**
   - Customizable matching rules
   - Field-specific matching weights
   - Match sensitivity settings
   - Domain-specific matching logic

4. **Performance Optimizations**
   - Indexed lookups for larger datasets
   - Caching of normalization results
   - Batch processing for multiple entries
   - Background duplicate detection

## Troubleshooting Guide

### Common Issues

1. **False Positives**
   - Check normalization logic for over-aggressive matching
   - Review the substantive match requirements
   - Verify case-insensitive comparison appropriateness

2. **False Negatives**
   - Ensure proper string normalization (whitespace, case)
   - Check for unexpected field formats (e.g., emails with spaces)
   - Verify all match conditions are working together correctly

3. **Modal Display Issues**
   - Check z-index values for proper layering
   - Ensure proper state management for modal visibility
   - Verify portal rendering for modal content

## Conclusion

The duplicate detection system provides a robust, user-friendly solution for preventing duplicate entries while giving users control over resolution. Its sophisticated matching algorithm balances sensitivity with specificity, and the clear interface ensures users understand why entries are flagged and what options they have for resolution.
# Duplicate Detection System Documentation

## Overview

The duplicate detection system prevents users from inadvertently creating duplicate entries in the Segmentor application. It provides sophisticated matching algorithms to identify potential duplicates and a user-friendly interface for resolving conflicts.

## Core Components

### Architecture

```
src/components/data-entry/
├── hooks/
│   └── useDuplicateCheck.ts       # Core duplicate detection logic
├── components/
│   └── DuplicateHandler.tsx       # Duplicate resolution UI
└── forms/
    └── DataInput/
        └── index.tsx              # Integration with data entry form
```

### useDuplicateCheck Hook

**File Path:** `src/components/data-entry/hooks/useDuplicateCheck.ts`

The primary logic for detecting duplicates between new entries and existing data.

#### Interface

```typescript
export interface DuplicateData {
  existing: DataPoint;
  new: DataPoint;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicate?: DataPoint;
  reason?: string;
}

export const useDuplicateCheck = (existingData: DataPoint[]) => {
  const [duplicateData, setDuplicateData] = useState<DuplicateData | null>(null);

  const checkForDuplicates = (newDataPoint: DataPoint): DuplicateCheckResult => {
    // Duplicate detection algorithm
    // ...
    return { isDuplicate, duplicate, reason };
  };

  return {
    duplicateData,
    setDuplicateData,
    checkForDuplicates
  };
};
```

#### Key Features

1. **Multi-field Matching**
   - Examines name, email, date, and numeric fields
   - Detects matches even with partial data
   - Identifies specific fields causing the match

2. **Match Requirements**
   - Requires satisfaction and loyalty values to match exactly
   - Requires at least one identifying field to match substantively
   - Treats empty fields as non-matching

3. **Normalization**
   - Case-insensitive comparison for text fields
   - Whitespace normalization
   - Consistent empty value handling

### DuplicateHandler Component

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

1. **Side-by-side Comparison**
   - Clear display of existing and new entries
   - Visual distinction between entries
   - Highlighting of matching fields

2. **Multiple Resolution Options**
   - Skip (discard new entry)
   - Edit (modify before adding)
   - Add Anyway (force save despite duplicate)

3. **Contextual Information**
   - Explains why entries are considered duplicates
   - Provides guidance on appropriate action
   - Clear labeling of existing vs. new data

## Duplicate Detection Algorithm

### Core Matching Logic

```typescript
const checkForDuplicates = (newDataPoint: DataPoint): DuplicateCheckResult => {
  // Normalize new data point values
  const normalizedNewName = newDataPoint.name?.trim() || '';
  const normalizedNewEmail = newDataPoint.email?.trim().toLowerCase() || '';
  const normalizedNewDate = newDataPoint.date?.trim() || '';
  
  const duplicate = existingData.find(existing => {
    // Different ID check (if same ID, it's an edit not duplicate)
    if (existing.id === newDataPoint.id) return false;
    
    // Normalize existing values
    const normalizedExistingName = existing.name?.trim() || '';
    const normalizedExistingEmail = existing.email?.trim().toLowerCase() || '';
    const normalizedExistingDate = existing.date?.trim() || '';

    // 1. First condition: Satisfaction and loyalty values must match
    const valueMatch = existing.satisfaction === newDataPoint.satisfaction && 
                      existing.loyalty === newDataPoint.loyalty;
    
    if (!valueMatch) return false;  // If values don't match, it's not a duplicate

    // 2. Field matching logic
    // A field matches if either both are empty OR both have the same non-empty value
    const nameMatch = (normalizedExistingName === '' && normalizedNewName === '') || 
                     (normalizedExistingName !== '' && normalizedNewName !== '' && 
                      normalizedExistingName === normalizedNewName);
    
    const emailMatch = (normalizedExistingEmail === '' && normalizedNewEmail === '') || 
                      (normalizedExistingEmail !== '' && normalizedNewEmail !== '' && 
                       normalizedExistingEmail === normalizedNewEmail);
    
    const dateMatch = (normalizedExistingDate === '' && normalizedNewDate === '') || 
                     (normalizedExistingDate !== '' && normalizedNewDate !== '' && 
                      normalizedExistingDate === normalizedNewDate);
    
    // 3. Substantive match detection
    // At least one field must have matching non-empty values
    const hasSubstantiveNameMatch = normalizedExistingName !== '' && 
                                   normalizedNewName !== '' && 
                                   normalizedExistingName === normalizedNewName;
                                
    const hasSubstantiveEmailMatch = normalizedExistingEmail !== '' && 
                                    normalizedNewEmail !== '' && 
                                    normalizedExistingEmail === normalizedNewEmail;
                                
    const hasSubstantiveDateMatch = normalizedExistingDate !== '' && 
                                   normalizedNewDate !== '' && 
                                   normalizedExistingDate === normalizedNewDate;
    
    const hasAnySubstantiveMatch = hasSubstantiveNameMatch || 
                                  hasSubstantiveEmailMatch || 
                                  hasSubstantiveDateMatch;
    
    // It's a duplicate if there's at least one substantive match AND all fields match our criteria
    return hasAnySubstantiveMatch && nameMatch && emailMatch && dateMatch;
  });

  if (duplicate) {
    // Determine duplicate reason for user feedback
    let reason = '';
    
    // Find which field caused the match
    if (duplicate.email && newDataPoint.email && 
        duplicate.email.trim().toLowerCase() === newDataPoint.email.trim().toLowerCase()) {
      reason = 'email';
    } else if (duplicate.name && newDataPoint.name && 
               duplicate.name.trim() === newDataPoint.name.trim()) {
      reason = 'name';
    } else if (duplicate.date && newDataPoint.date && 
               duplicate.date.trim() === newDataPoint.date.trim()) {
      reason = 'date';
    } else {
      reason = 'data values';
    }
    
    return {
      isDuplicate: true,
      duplicate,
      reason
    };
  }

  return { isDuplicate: false };
};