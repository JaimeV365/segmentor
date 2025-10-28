# Filter Connection Architecture Documentation

## Overview

This document explains the filter connection system that allows reports (like bar charts) to either use the main visualization's filters or maintain their own independent local filters.

## Core Components

### 1. FilterContext (`src/components/visualization/context/FilterContext.tsx`)

The central state manager for all filter operations.

**Key Properties:**
- `isReportsConnected`: Boolean indicating if report filters are synced with main filters
- `reportsFilterState`: Local filter state for reports when disconnected
- `filteredData`: The globally filtered dataset
- `setReportsConnection()`: Function to connect/disconnect reports
- `getReportsFilteredData()`: Returns appropriate filtered data based on connection status

**Critical Function:**
```typescript
const getReportsFilteredData = useCallback(() => {
  if (isReportsConnected || !reportsFilterState) {
    // Use master filtered data
    return filteredData;
  } else {
    // Apply Reports-specific filters
    return applyFilters(data, reportsFilterState);
  }
}, [isReportsConnected, reportsFilterState, filteredData, data, applyFilters]);
```

### 2. FilterPanel (`src/components/visualization/filters/FilterPanel.tsx`)

The generic filter UI component that can operate in two modes:

**Main Mode (`forceLocalState: false`):**
- Updates the global `FilterContext`
- Used by main visualization components
- Can sync changes to connected reports

**Local Mode (`forceLocalState: true`):**
- Manages its own local state
- Used by report components (bar charts, etc.)
- NEVER updates the main `FilterContext`

**Critical Architecture Rule:**
```typescript
// Only update main context if NOT in forceLocalState mode AND connected
if (!forceLocalState && filterContext && filterContext.isReportsConnected && !isInitializing) {
  filterContext.setFilterState(updatedLocalState);
} else if (forceLocalState) {
  // Local FilterPanel: NOT updating main context (forceLocalState prevents this)
}
```

### 3. BarChart (`src/components/reporting/components/BarChart/index.tsx`)

Report component that integrates with the filter system.

**Key Features:**
- Uses `FilterPanel` with `forceLocalState: true`
- Auto-disconnects when user makes local changes
- Supports manual reconnection
- Uses `effectiveData` for proper data flow

## Data Flow Architecture

### Connected State (Default)
```
Main Visualization FilterPanel (forceLocalState: false)
    ↓ Updates FilterContext
    ↓ filteredData updated
    ↓ getReportsFilteredData() returns filteredData
    ↓ BarChart displays filtered data
```

### Disconnected State (After Local Changes)
```
Main Visualization FilterPanel (forceLocalState: false)
    ↓ Updates FilterContext
    ↓ filteredData updated (but reports ignore this)

BarChart FilterPanel (forceLocalState: true)
    ↓ Updates local state only
    ↓ getReportsFilteredData() returns applyFilters(data, reportsFilterState)
    ↓ BarChart displays locally filtered data
```

## Key Principles

### 1. Architectural Separation
- **Main FilterPanels** (`forceLocalState: false`) → Can update `FilterContext`
- **Local FilterPanels** (`forceLocalState: true`) → CANNOT update `FilterContext`

### 2. Connection Rules
- Reports start connected by default
- Making local changes automatically disconnects
- Manual reconnection requires user confirmation
- Reconnection discards local changes and syncs to main filters

### 3. State Management
- `isInitializing` flag prevents premature `hasUserMadeChanges` setting
- Immediate filter application avoids race conditions
- `onFilterChange` is disabled during initialization to prevent triple notifications

## Common Pitfalls to Avoid

### 1. Direct State Updates
❌ **Wrong:**
```typescript
setLocalFilterState(newState); // Bypasses controlled logic
```

✅ **Correct:**
```typescript
setFilterState(newState); // Uses controlled logic with proper checks
```

### 2. Missing forceLocalState Checks
❌ **Wrong:**
```typescript
if (filterContext && filterContext.isReportsConnected && !isInitializing) {
  filterContext.setFilterState(updatedLocalState); // Local filters can overwrite main!
}
```

✅ **Correct:**
```typescript
if (!forceLocalState && filterContext && filterContext.isReportsConnected && !isInitializing) {
  filterContext.setFilterState(updatedLocalState); // Only main filters can update context
}
```

### 3. Race Conditions
❌ **Wrong:**
```typescript
// applyFilters called with stale state during initialization
```

✅ **Correct:**
```typescript
// Immediate filter application with correct state
useEffect(() => {
  if (isOpen && !isInitializing) {
    const result = applyFiltersWithState(data, localFilterState);
    // Apply filters immediately with correct state
  }
}, [isOpen, localFilterState, isInitializing]);
```

## Implementation Guide for New Report Components

### Step 1: Use FilterPanel with forceLocalState
```typescript
<FilterPanel
  data={originalData || []} // Always use original data
  forceLocalState={true}     // Enable local mode
  onFilterChange={handleFilterChange}
  isOpen={showSidePanel && activePanelTab === 'filters'}
/>
```

### Step 2: Implement Auto-Disconnect Logic
```typescript
const handleFilterChange = (filteredData: DataPoint[], newFilters: any[]) => {
  // Auto-disconnect if user makes changes while connected
  if (filterContext && filterContext.isReportsConnected && newFilters.length > 0 && !isManualReconnecting) {
    filterContext.setReportsConnection(false);
    showNotification('Bar chart filters are now independent from the main chart');
  }
};
```

### Step 3: Use Effective Data
```typescript
const effectiveData = useMemo(() => {
  if (filterContext?.isReportsConnected) {
    return filterContext.getReportsFilteredData();
  } else {
    return originalData || [];
  }
}, [filterContext, originalData]);
```

### Step 4: Add Connection Toggle
```typescript
<FilterConnectionToggle
  isConnected={filterContext?.isReportsConnected || false}
  onToggle={handleConnectionToggle}
/>
```

## Debugging Tips

### Essential Logs to Keep
- `🔗 Local FilterPanel: NOT updating main context (forceLocalState prevents this)`
- `🔗 Main FilterPanel: updating main context state (user made changes)`
- `🎯 Skipping immediate onFilterChange to prevent triple notifications`

### Logs to Remove
- All `🎯🎯🎯` verbose debugging logs
- Detailed state dumps during normal operation
- Repetitive initialization logs

### Debug Mode
Consider adding a `DEBUG_FILTERS` environment variable to enable/disable verbose logging.

## Testing Checklist

When implementing filter connections for new report components:

- [ ] Filters start connected and show main visualization data
- [ ] Making local changes disconnects and shows notification
- [ ] Local changes don't affect main visualization filters
- [ ] Reconnection discards local changes and syncs to main
- [ ] No triple notifications during initialization
- [ ] No main filter overwrites from local filters
- [ ] Filter panel opening doesn't reset bar chart display
- [ ] Connection icon shows correct state

## File Locations

- **Core Logic**: `src/components/visualization/context/FilterContext.tsx`
- **Filter UI**: `src/components/visualization/filters/FilterPanel.tsx`
- **Example Implementation**: `src/components/reporting/components/BarChart/index.tsx`
- **Connection Toggle**: `src/components/ui/FilterConnectionToggle/FilterConnectionToggle.tsx`
- **Disconnection Prompt**: `src/components/ui/FilterDisconnectionPrompt/FilterDisconnectionPrompt.tsx`

## Version History

- **v1.0**: Initial implementation with basic connection
- **v2.0**: Fixed triple notifications and main filter overwrites
- **v2.1**: Added comprehensive debugging and race condition fixes
- **v2.2**: Final architectural fix with proper forceLocalState handling
