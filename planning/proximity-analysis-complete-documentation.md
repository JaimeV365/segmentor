# Proximity Analysis Section - Complete Technical Documentation

**Status:** Private Documentation - Not for Public Repository  
**Last Updated:** 2025  
**Purpose:** Comprehensive reference for maintenance, updates, and future development

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Component Structure](#component-structure)
4. [Dependencies & Hooks](#dependencies--hooks)
5. [Filter Integration](#filter-integration)
6. [Data Flow](#data-flow)
7. [State Management](#state-management)
8. [Key Features](#key-features)
9. [Proximity Thresholds & Rules](#proximity-thresholds--rules)
10. [File Structure](#file-structure)
11. [Maintenance Guide](#maintenance-guide)
12. [Recent Changes & Rationale](#recent-changes--rationale)

---

## Overview

The Proximity Analysis section identifies customers positioned near quadrant boundaries, indicating potential movement between segments. It provides strategic insights into:
- **Opportunities**: Positive movements towards better segments (e.g., Defectors → Loyalists)
- **Warnings**: Negative movements towards worse segments (e.g., Loyalists → Defectors)

### Key Capabilities

- Real-time proximity detection using distance calculations
- Multiple viewing perspectives (Origin/Target)
- Actionable conversions prioritized by chances
- Comprehensive filtering with connection/disconnection support
- Interactive customer lists with grouping and sorting
- Visual indicators for customer relationships
- Crossroads customers grouped by customer showing all possible movements
- Neutral customers (at exact midpoint) included in crossroads analysis

---

## Architecture

### High-Level Architecture

```
ReportingSection
  └── ProximitySection (Main Container)
      ├── Proximity Analysis Header
      │   ├── Title & Subtitle
      │   └── Controls Button (Menu Icon with Filter Badge)
      ├── Info Ribbon (Introductory explanation)
      ├── Proximity Distribution Widget
      │   └── ProximityList Component
      ├── Proximity Details Card
      │   └── ProximityList Component (with display settings)
      ├── Proximity Summary Card
      │   ├── Tab Navigation
      │   │   ├── Near Boundaries
      │   │   ├── Lateral movements
      │   │   ├── Diagonal movements
      │   │   ├── Crossroads (conditional)
      │   │   ├── Chances
      │   │   └── Actionable Conversions
      │   ├── Info Ribbon (tab-specific)
      │   └── Tab Content
      │       ├── Customer Tables (with Origin/Target perspective toggle)
      │       ├── Actionable Conversions Cards
      │       ├── Chances by Segment Cards
      │       └── Crossroads Customer Groups
      └── Unified Controls Panel
          ├── Display Tab (ProximityDisplayMenu)
          └── Filters Tab (FilterPanel)
```

### Data Processing Pipeline

```
Raw Data (DataPoint[])
  ↓
FilterContext (Global Filters)
  ↓
ProximitySection (Local Filters if disconnected)
  ↓
EnhancedProximityClassifier
  ├── DistanceCalculator (threshold calculations)
  ├── LateralProximityCalculator (lateral movements)
  └── Special Zone Proximity (apostles, terrorists, near_apostles)
  ↓
ProximityAnalysisResult
  ├── analysis: { [relationship]: ProximityDetail }
  ├── crossroads: CrossroadsData
  ├── specialZones: SpecialZoneData (if enabled)
  └── summary: SummaryMetrics
  ↓
Component State & Memoization
  ├── getAllProximityCustomers (flattened list)
  ├── getLateralCustomers (filtered)
  ├── getDiagonalCustomers (filtered)
  ├── targetSegmentsBreakdown (grouped by target)
  ├── riskBySegment (average chances by segment)
  └── actionableConversions (opportunities & warnings)
  ↓
UI Rendering
```

---

## Component Structure

### Main Component: `ProximitySection`

**Location:** `src/components/reporting/components/ProximitySection/ProximitySection.tsx`

**Props:**
```typescript
interface ProximitySectionProps {
  data: DataPoint[];                    // Filtered data from parent
  originalData?: DataPoint[];           // Complete dataset for filtering
  satisfactionScale: ScaleFormat;       // Satisfaction scale configuration
  loyaltyScale: ScaleFormat;            // Loyalty scale configuration
  isPremium: boolean;                   // Premium feature flag
  isClassicModel?: boolean;            // Classic model flag (default: true)
  showSpecialZones?: boolean;          // Show special zones flag
  showNearApostles?: boolean;          // Show near-apostles flag
}
```

**Key Responsibilities:**
- Manages filter state and connection status
- Orchestrates proximity analysis calculation
- Handles tab navigation and view perspectives
- Coordinates display settings and filter panel
- Renders summary cards and customer tables
- Manages crossroads customer grouping and neutral customer inclusion

### Sub-Components

#### 1. `ProximityList`
**Location:** `src/components/reporting/components/ProximityList/ProximityList.tsx`

**Purpose:** Displays the detailed list of customers with proximity relationships

**Features:**
- Grouping by segment, strategic priority, distance/difficulty
- Strategic grouping (Opportunities, Warnings, Neutral)
- Expandable group items
- Explanation ribbons for context

**Props:**
```typescript
{
  data: DataPoint[];
  proximityAnalysis: ProximityAnalysisResult;
  displaySettings: ProximityDisplaySettings;
  totalCustomers: number;
  onItemClick?: (item: any) => void;
}
```

#### 2. `ProximityDisplayMenu`
**Location:** `src/components/reporting/components/ProximityList/ProximityDisplayMenu.tsx`

**Purpose:** Display settings configuration (grouping, sorting, etc.)

**Note:** This component is now a pure content component, rendered inside the unified controls panel. It no longer manages its own overlay/panel.

**Settings Interface:**
```typescript
interface ProximityDisplaySettings {
  grouping: 'bySourceRegion' | 'byStrategicPriority' | 'byDistance' | 'flat';
  sortBy: 'customer' | 'distance' | 'risk' | 'segment';
  sortDirection: 'asc' | 'desc';
  showEveryBoundary: boolean;
  groupByCustomer: boolean;
  highlightHighImpact: boolean;
  highImpactMethod: 'smart' | 'highBar' | 'standard' | 'sensitive';
  showOpportunities: boolean;
  showWarnings: boolean;
  showEmptyCategories: boolean;
}
```

#### 3. `FilterPanel`
**Location:** `src/components/visualization/filters/FilterPanel.tsx`

**Purpose:** Unified filter panel used across all reporting sections

**Integration:** ProximitySection uses FilterPanel with:
- `reportId: 'proximitySection'`
- `forceLocalState: true` (for disconnected mode)
- `contentOnly: true` (renders inside unified panel)

#### 4. `InfoRibbon`
**Location:** `src/components/reporting/components/InfoRibbon.tsx`

**Purpose:** Displays informational messages to users

**Usage:** Used under each tab to explain what users are looking at

---

## Dependencies & Hooks

### External Dependencies

```typescript
import React, { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { DataPoint, ScaleFormat } from '../../../../types/base';
import { useQuadrantAssignment } from '../../../visualization/context/QuadrantAssignmentContext';
import { useFilterContextSafe } from '../../../visualization/context/FilterContext';
import { useNotification } from '../../../data-entry/hooks/useNotification';
import FilterPanel from '../../../visualization/filters/FilterPanel';
import { EnhancedProximityClassifier } from '../../services/EnhancedProximityClassifier';
import { DistanceCalculator } from '../../services/DistanceCalculator';
import { LateralProximityCalculator } from '../../services/LateralProximityCalculator';
```

### Context Hooks

#### `useQuadrantAssignment()`
**Purpose:** Provides quadrant data and display names

**Used For:**
- Getting quadrant display names (`getQuadrantDisplayName`)
- Quadrant badge styling (`getQuadrantBadgeStyle`)
- Segment sorting order (`getSegmentSortOrder`)
- Midpoint coordinates (`midpoint.sat`, `midpoint.loy`)
- Zone sizes (`apostlesZoneSize`, `terroristsZoneSize`)
- Context distribution data

**Key Properties:**
```typescript
{
  getQuadrantForPoint: (point: DataPoint) => QuadrantType;
  distribution: ContextDistribution;
  midpoint: { sat: number; loy: number };
  getDisplayNameForQuadrant: (quadrant: string) => string;
  apostlesZoneSize: number;
  terroristsZoneSize: number;
}
```

#### `useFilterContextSafe()`
**Purpose:** Provides filter context with safe access (handles null)

**Key Methods Used:**
- `filterState` - Current global filter state
- `reportFilterStates[REPORT_ID]` - Report-specific filter state
- `syncReportToMaster(reportId)` - Sync report filters to global
- `compareFilterStates(state1, state2)` - Compare filter states
- `getReportFilterState(reportId)` - Get report filter state
- `setReportFilterState(reportId, state)` - Set report filter state
- `getReportFilteredData(reportId, data)` - Get filtered data for report

#### `useNotification()`
**Purpose:** Shows notification banners

**Usage:**
```typescript
const { showNotification } = useNotification();
showNotification({
  title: 'Filters Connected',
  message: 'Proximity filters are now synced with the main chart.',
  type: 'success'
});
```

### Service Classes

#### `EnhancedProximityClassifier`
**Location:** `src/components/reporting/services/EnhancedProximityClassifier.ts`

**Purpose:** Core proximity analysis engine

**Key Methods:**
- `analyzeProximity(customers, getQuadrantForPoint, isPremium, userThreshold, showSpecialZones, showNearApostles)` - Main analysis method
- Returns `ProximityAnalysisResult` with:
  - `analysis`: Object with proximity relationships
  - `crossroads`: Customers at multiple boundaries
  - `specialZones`: Special zone relationships (if enabled)
  - `settings`: Analysis configuration

**Dependencies:**
- `DistanceCalculator` - Calculates distances to boundaries
- `LateralProximityCalculator` - Handles lateral proximity detection

**Private Methods (accessed via bracket notation for neutral customers):**
- `getSpecialZoneBoundaries(zone: string)` - Gets zone boundaries based on scale and midpoint

#### `DistanceCalculator`
**Location:** `src/components/reporting/services/DistanceCalculator.ts`

**Purpose:** Calculates distances and proximity thresholds

**Key Methods:**
- `getDefaultThreshold()` - Returns 2.0 (used for main quadrants)
- `getProximityThresholds()` - Returns conservative, moderate, sensitive thresholds
- `getScaleBoundaries()` - Gets min/max values from scale strings

#### `LateralProximityCalculator`
**Location:** `src/components/reporting/services/LateralProximityCalculator.ts`

**Purpose:** Handles lateral proximity detection and distance calculations

---

## Filter Integration

### Filter Architecture

ProximitySection implements a **"child filter set"** pattern, similar to BarChart and DataReport sections.

### Report ID

```typescript
const REPORT_ID = useMemo(() => 'proximitySection', []);
```

This unique identifier allows ProximitySection to maintain its own filter state while optionally connecting to global filters.

### Connection States

#### Connected Mode (Default)
- ProximitySection uses global filters from `FilterContext`
- Changes to global filters automatically update ProximitySection
- Connection indicator shows linked icon (🔗)
- Filter badge shows count from global filters

#### Disconnected Mode
- ProximitySection maintains local filter state
- Filters are independent from global filters
- Connection indicator shows unlinked icon (🔗❌)
- Filter badge shows count from local filters
- User can reconnect to sync local filters to global

### Filter State Management

```typescript
// Connection status
const isConnected = useMemo(() => {
  if (!filterContext) return true;
  const reportState = filterContext.reportFilterStates[REPORT_ID];
  if (!reportState) return true;
  return filterContext.compareFilterStates(reportState, filterContext.filterState);
}, [filterContext, REPORT_ID, filterContext?.reportFilterStates?.[REPORT_ID], filterContext?.filterState]);

// Filter count
const filterCount = useMemo(() => {
  if (!filterContext) return 0;
  const stateToUse = isConnected 
    ? filterContext.filterState 
    : (filterContext.getReportFilterState(REPORT_ID) || filterContext.filterState);
  const hasDateFilter = stateToUse.dateRange?.preset && stateToUse.dateRange.preset !== 'all';
  const attributeFilterCount = stateToUse.attributes?.filter(attr => attr.values && attr.values.size > 0).length || 0;
  return (hasDateFilter ? 1 : 0) + attributeFilterCount;
}, [filterContext, isConnected, REPORT_ID]);

// Effective data (global or local)
const effectiveData = useMemo(() => {
  if (!filterContext || !resolvedOriginalData) {
    return incomingData;
  }
  if (!isConnected && filteredDataFromPanel) {
    return filteredDataFromPanel;
  }
  return filterContext.getReportFilteredData(REPORT_ID, resolvedOriginalData);
}, [incomingData, resolvedOriginalData, filterContext, REPORT_ID, filteredDataFromPanel, isConnected]);
```

### Filter Callbacks

#### `handleFilterChange`
```typescript
const handleFilterChange = useCallback((filteredData: DataPoint[], filters: any, filterState: any) => {
  setFilteredDataFromPanel(filteredData);
  setHasLocalChanges(true);
  if (filterContext) {
    filterContext.setReportFilterState(REPORT_ID, filterState);
  }
}, [filterContext, REPORT_ID]);
```

**Purpose:** Updates local filter state when filters change in disconnected mode

#### `handleFilterReset`
```typescript
const handleFilterReset = useCallback(() => {
  setFilteredDataFromPanel(null);
  setHasLocalChanges(false);
  setFilterResetTrigger(prev => prev + 1);
  if (filterContext) {
    filterContext.setReportFilterState(REPORT_ID, null);
  }
  showNotification({
    title: 'Filters reset',
    message: 'All filters have been cleared.',
    type: 'success'
  });
}, [filterContext, REPORT_ID, showNotification]);
```

**Purpose:** Clears local filters and resets to global filters

#### `handleConnectionToggle`
```typescript
const handleConnectionToggle = useCallback(() => {
  if (!filterContext) return;
  
  if (isConnected) {
    // Disconnect: Keep current state as local
    setHasLocalChanges(true);
    showNotification({
      title: 'Filters disconnected',
      message: 'Proximity filters are now independent from the main chart.',
      type: 'info'
    });
  } else {
    // Reconnect: Sync local to global
    const localState = filterContext.getReportFilterState(REPORT_ID);
    if (localState) {
      filterContext.setFilterState(localState);
    }
    filterContext.syncReportToMaster(REPORT_ID);
    setFilteredDataFromPanel(null);
    setHasLocalChanges(false);
    showNotification({
      title: 'Filters Connected',
      message: 'Proximity filters are now synced with the main chart.',
      type: 'success'
    });
  }
}, [filterContext, isConnected, REPORT_ID, showNotification]);
```

**Purpose:** Toggles connection between local and global filters

### Filter Panel Integration

```typescript
<FilterPanel
  data={resolvedOriginalData || []}        // Complete dataset for filtering
  onFilterChange={handleFilterChange}      // Callback for filter changes
  onClose={() => {}}                       // No-op (handled by panel)
  isOpen={true}                            // Always open in panel
  contentOnly={true}                        // Render only content, no overlay
  resetTrigger={filterResetTrigger}        // Trigger for reset
  onShowNotification={showNotification}     // Notification callback
  reportId={REPORT_ID}                      // Report identifier
  forceLocalState={true}                    // Force local state management
/>
```

---

## Data Flow

### 1. Data Entry

```
ReportingSection
  ├── data (filteredData) → ProximitySection.data
  └── originalData → ProximitySection.originalData
```

### 2. Filter Processing

```
incomingData (from props)
  ↓
effectiveData (useMemo)
  ├── If disconnected: filteredDataFromPanel
  └── If connected: filterContext.getReportFilteredData(REPORT_ID, resolvedOriginalData)
```

### 3. Proximity Analysis

```
effectiveData
  ↓
EnhancedProximityClassifier.analyzeProximity()
  ├── Uses getQuadrantForPoint from context
  ├── Calculates distances using DistanceCalculator
  ├── Detects lateral movements using LateralProximityCalculator
  ├── Detects special zone proximity (if enabled)
  └── Detects crossroads customers (multiple relationships)
  ↓
proximityAnalysis (useMemo)
  ├── analysis: { [relationship]: ProximityDetail }
  ├── crossroads: CrossroadsData
  ├── specialZones: SpecialZoneData (if enabled)
  └── settings: AnalysisSettings
```

### 4. Customer Collection

```
proximityAnalysis.analysis
  ↓
getAllProximityCustomers (useMemo)
  ├── Flattens all relationship customers
  ├── Adds currentQuadrant, targetQuadrant, relationship
  └── Returns: CustomerProximityDetail[]
  (Note: Same customer can appear multiple times for different relationships)
```

### 5. Tab-Specific Processing

```
getAllProximityCustomers
  ↓
Tab-specific filtering (useMemo)
  ├── getLateralCustomers (lateral movements only)
  ├── getDiagonalCustomers (diagonal movements only)
  ├── targetSegmentsBreakdown (grouped by target segment)
  ├── riskBySegment (average chances by origin segment)
  └── actionableConversions (opportunities/warnings)
```

### 6. Crossroads Processing

```
proximityAnalysis.crossroads.customers
  ↓
getAllProximityCustomers (filter by crossroads customer IDs)
  ↓
Group by customer ID
  ↓
For each customer: Show all paths with distances and chances
```

### 7. Neutral Customer Processing

```
data.filter(point => 
  point.satisfaction === midpoint.sat && 
  point.loyalty === midpoint.loy
)
  ↓
For each neutral customer:
  ├── Check if already in crossroadsPaths
  ├── If not, calculate paths to:
  │   ├── Main quadrants (always included, distance = 0)
  │   └── Special zones (if distance <= 1, using Chebyshev distance)
  └── Add to crossroadsPaths
```

### 8. Sorting & Grouping

```
Tab customers
  ↓
sortedCustomers (useMemo)
  ├── Applies sortColumn & sortDirection
  └── Returns sorted array
  ↓
View perspective grouping
  ├── By Origin: Groups by currentQuadrant
  └── By Target: Groups by targetQuadrant
```

---

## State Management

### Component State

```typescript
// UI State
const [showControlsPanel, setShowControlsPanel] = useState(false);
const [activePanelTab, setActivePanelTab] = useState<'display' | 'filters'>('display');
const [activeTab, setActiveTab] = useState<string>('total');
const [viewPerspective, setViewPerspective] = useState<'origin' | 'target'>('origin');

// Filter State
const [filterResetTrigger, setFilterResetTrigger] = useState(0);
const [filteredDataFromPanel, setFilteredDataFromPanel] = useState<DataPoint[] | null>(null);
const [hasLocalChanges, setHasLocalChanges] = useState(false);
const [isManualReconnecting, setIsManualReconnecting] = useState(false);
const [showReconnectModal, setShowReconnectModal] = useState(false);

// Display Settings
const [proximityDisplaySettings, setProximityDisplaySettings] = useState<ProximityDisplaySettings>(
  createDefaultProximityDisplaySettings()
);

// Sorting State
const [sortColumn, setSortColumn] = useState<string | null>(null);
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
const [riskSegmentSortColumn, setRiskSegmentSortColumn] = useState<string | null>(null);
const [riskSegmentSortDirection, setRiskSegmentSortDirection] = useState<'asc' | 'desc'>('asc');

// Expansion State
const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set()); // For origin/target perspective groups
const [expandedCrossroadsCustomers, setExpandedCrossroadsCustomers] = useState<Set<string>>(new Set()); // For crossroads customers
const [expandedTargetSegments, setExpandedTargetSegments] = useState<Set<string>>(new Set()); // For target segments in actionable conversions
const [expandedRiskSegments, setExpandedRiskSegments] = useState<Set<string>>(new Set()); // For risk segments
const [expandedConversions, setExpandedConversions] = useState<Set<string>>(new Set()); // For actionable conversions

// Selected Points
const [selectedProximityPoints, setSelectedProximityPoints] = useState<{
  quadrant: string;
  proximityType: string;
  points: DataPoint[];
} | null>(null);
```

### Memoized Computations

All expensive computations are memoized with `useMemo`:

1. **`REPORT_ID`** - Report identifier (memoized for stability)
2. **`isConnected`** - Connection status
3. **`filterCount`** - Active filter count
4. **`effectiveData`** - Filtered data (global or local)
5. **`proximityAnalysis`** - Main analysis result
6. **`getAllProximityCustomers`** - Flattened customer list
7. **`getLateralCustomers`** - Lateral movement customers
8. **`getDiagonalCustomers`** - Diagonal movement customers
9. **`targetSegmentsBreakdown`** - Target segments grouped data
10. **`riskBySegment`** - Risk scores by segment
11. **`actionableConversions`** - Opportunities and warnings
12. **`tabCustomers`** - Customers for active tab
13. **`sortedCustomers`** - Sorted customer list
14. **`correctedSummary`** - Summary with corrections
15. **`proximityPercentage`** - Percentage calculation

---

## Key Features

### 1. Proximity Summary Tabs

#### Near Boundaries Tab
- Shows all customers near boundaries
- Supports Origin/Target perspective toggle
- Sortable columns: Customer, Position, Origin, Target, Distance, Chances
- Collapsible segment groups (collapsed by default)
- Visual connectors for repeated customers when sorted by customer

#### Lateral Movements Tab
- Customers moving to adjacent quadrants
- Same features as Near Boundaries tab
- Info box explains lateral movements

#### Diagonal Movements Tab
- Customers moving diagonally (crisis/opportunity movements)
- Same features as Near Boundaries tab
- Info box explains diagonal movements

#### Crossroads Tab ⭐
**Most Complex Feature**

**Purpose:** Shows customers at multiple boundaries (including neutral customers at exact midpoint)

**Features:**
- **Grouped by Customer**: Each customer shown once with all their possible movements
- **Collapsible by Default**: Groups start collapsed, showing path tags
- **Path Tags**: When collapsed, shows all possible target segments with chances
- **Full Details When Expanded**: Shows table with Target Segment, Distance, Chances
- **Neutral Customers**: Included and shown first, with "Neutral" badge
- **No Perspective Toggle**: Not applicable (shows all paths per customer)
- **Consistent Thresholds**: Uses same rules as other tabs (distance <= 2.0 for main, <= 1 for special zones)

**Data Structure:**
```typescript
// For each crossroads customer:
{
  customer: CustomerProximityDetail;
  paths: Array<{
    targetQuadrant: string;
    distanceFromBoundary: number;
    riskScore: number;
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  }>;
  isMidpoint: boolean; // true for neutral customers
}
```

**Neutral Customer Logic:**
- Identified: `point.satisfaction === midpoint.sat && point.loyalty === midpoint.loy`
- Main quadrants: Always included (distance = 0, always <= 2.0)
- Special zones: Only if Chebyshev distance <= 1
- Uses actual zone boundaries from `getSpecialZoneBoundaries()`

#### Chances Tab
- Average chances (risk scores) by segment
- Supports Origin/Target perspective toggle
- Expandable segment cards (collapsed by default)
- Shows detailed customer lists when expanded
- Sortable customer tables within expanded cards
- Info box explains chances by segment

#### Actionable Conversions Tab ⭐
**Most Important Feature**

Groups conversions by priority:
- **High Priority Opportunity**: Positive movements
  - From Defectors/Terrorists to anything better
  - From anything to Loyalists/Apostles/Near-Apostles
- **High Priority Warning**: Negative movements
  - Anything towards Defectors/Terrorists
  - Anything from Loyalists/Apostles/Near-Apostles

**Features:**
- Sorted by average chances (highest first)
- Expandable conversion cards
- Shows customer lists with Origin/Target columns
- Visual priority badges (green for opportunities, red for warnings)
- Origin breakdown shows all relevant origins

### 2. View Perspectives

**By Origin**: Groups customers by their current segment (where they are)
**By Target**: Groups customers by their target segment (where they're moving)

Both perspectives show:
- Segment header with badge and count (e.g., "Origin: Loyalists 5 customers")
- Grouped customer rows
- Collapsible groups (collapsed by default)
- Visual consistency

**Implementation:**
- Groups are keyed as `origin-${segment}` or `target-${segment}`
- Expansion state tracked in `expandedGroups` Set
- Chevron icons indicate expand/collapse state

### 3. Customer Grouping (When Sorted by Customer)

When sorting by customer name, customers appearing multiple times (in different relationships) are visually grouped:

- **First occurrence**: Shows customer name and ID normally
- **Subsequent occurrences**: Shows L-shaped connector (└) with grey customer name/ID
- Connector indicates it's the same customer as above

**Implementation:**
```typescript
const isFirstOccurrence = customerIndexInList === customers.findIndex(c => c.id === customer.id);
const showConnector = sortColumn === 'customer' && customer.id && !isFirstOccurrence;
```

**Connector Design:**
- SVG path creating L-shape
- 90° angle at bottom-left
- Longer horizontal line, shorter vertical
- Positioned 8px from left
- Grey color (#9ca3af)

### 4. Unified Controls Panel

Single panel with two tabs:
- **Display Tab**: ProximityDisplayMenu content
- **Filters Tab**: FilterPanel content

**Features:**
- Connection status indicator (link/unlink icon)
- Filter badge showing active filter count
- Reset buttons for each tab
- Modal for reconnection confirmation

### 5. Proximity List Grouping

**Grouping Options:**
- `bySourceRegion`: By origin segment
- `byStrategicPriority`: By opportunity/warning/neutral
- `byDistance`: By distance from boundary
- `flat`: No grouping

**Strategic Grouping:**
Within each group, items are further organized:
- **Opportunity**: Positive movements (green accent)
- **Warning**: Negative movements (red accent)
- **Neutral**: Other movements (grey accent)

---

## Proximity Thresholds & Rules

### Consistent Threshold Rules (Applied Everywhere)

**Main Quadrants** (Loyalists, Mercenaries, Hostages, Defectors):
- **Threshold**: Distance <= 2.0 (from `DistanceCalculator.getDefaultThreshold()`)
- **Applied to**: All tabs, all customer types (including neutral)

**Special Zones** (Apostles, Terrorists, Near-Apostles):
- **Threshold**: Distance <= 1 (Chebyshev/Maximum distance)
- **Applied to**: All tabs, all customer types (including neutral)
- **Calculation**: Uses `calculateManhattanDistanceToZone()` which actually calculates Chebyshev distance

### Why These Thresholds?

1. **Main Quadrants (2.0)**: 
   - Provides reasonable coverage of customers near boundaries
   - Not too sensitive (avoids noise)
   - Not too conservative (captures meaningful proximity)

2. **Special Zones (1.0)**:
   - Special zones are smaller and at corners
   - Distance 1 includes diagonal neighbors (Chebyshev distance)
   - Prevents showing customers too far from special zones

### Neutral Customer Special Handling

Neutral customers (at exact midpoint) follow the same rules:
- **Main quadrants**: Always included (distance = 0, which is <= 2.0)
- **Special zones**: Only if Chebyshev distance <= 1
- **Calculation**: Uses actual zone boundaries from context, not hardcoded values
- **Zone boundaries**: Calculated using `getSpecialZoneBoundaries()` which considers:
  - Scale ranges (from satisfactionScale and loyaltyScale)
  - Midpoint position
  - Zone sizes (apostlesZoneSize, terroristsZoneSize)

### Distance Calculation Methods

**Main Quadrants:**
- Uses `LateralProximityCalculator` for lateral movements
- Uses diagonal proximity calculation for diagonal movements
- Distance measured to quadrant boundaries

**Special Zones:**
- Uses Chebyshev/Maximum distance (not Manhattan)
- Formula: `max(|sat - zoneSat|, |loy - zoneLoy|)`
- Includes diagonal neighbors as distance 1

---

## File Structure

```
src/components/reporting/
├── components/
│   ├── ProximitySection/
│   │   ├── ProximitySection.tsx          # Main component (~2600 lines)
│   │   └── ProximitySection.css          # Component styles
│   ├── ProximityList/
│   │   ├── ProximityList.tsx             # Customer list component
│   │   ├── ProximityList.css             # List styles
│   │   ├── ProximityDisplayMenu.tsx      # Display settings
│   │   ├── ProximityDisplayMenu.css      # Display menu styles
│   │   └── index.ts                      # Exports
│   ├── DistributionSection/
│   │   └── ProximityPointInfoBox.tsx     # Info box component (shared)
│   └── InfoRibbon.tsx                    # Info ribbon component (shared)
├── services/
│   ├── EnhancedProximityClassifier.ts    # Core analysis engine
│   ├── DistanceCalculator.ts             # Distance calculations
│   └── LateralProximityCalculator.ts     # Lateral proximity logic
└── ReportingSection.tsx                  # Parent component
```

### CSS Files

**ProximitySection.css** - Main section styles:
- Layout and grid systems
- Tab navigation (`.proximity-tab.active` uses `rgba(76, 175, 80, 0.15)`)
- Customer tables
- Conversion cards
- Perspective toggle
- Customer connector styles (L-shaped SVG)
- Crossroads customer groups
- Collapsible group headers
- Path tags styling

**ProximityList.css** - List component styles:
- Group items
- Strategic grouping columns
- Explanation ribbons
- Group headers

**ProximityDisplayMenu.css** - Display menu styles:
- Settings controls
- Panel content layout

---

## Maintenance Guide

### Adding a New Tab

1. Add tab button in tab navigation:
```typescript
<button
  className={`proximity-tab ${activeTab === 'newTab' ? 'active' : ''}`}
  onClick={() => setActiveTab('newTab')}
>
  <div className="tab-content">
    <div className="tab-label">New Tab</div>
    <div className="tab-value">{count}</div>
  </div>
</button>
```

2. Add info ribbon (optional):
```typescript
{activeTab === 'newTab' && (
  <div className="proximity-tab-info">
    <InfoRibbon text="Explanation text" />
  </div>
)}
```

3. Add tab content:
```typescript
{activeTab === 'newTab' && (
  <div className="new-tab-content">
    {/* Content */}
  </div>
)}
```

4. Add data processing (if needed):
```typescript
const newTabCustomers = useMemo(() => {
  // Filter/process getAllProximityCustomers
}, [getAllProximityCustomers, ...dependencies]);
```

5. Update `tabCustomers` useMemo:
```typescript
case 'newTab':
  return newTabCustomers;
```

### Modifying Filter Logic

**To change filter behavior:**

1. Update `handleFilterChange` callback
2. Modify `effectiveData` useMemo dependencies
3. Update `filterCount` calculation if needed
4. Test connection/disconnection flow

**To add new filter types:**

1. FilterPanel already supports date range and attributes
2. For custom filters, add to FilterPanel or create local controls
3. Update `handleFilterChange` to process new filter type

### Modifying Opportunity/Warning Logic

**Location:** `actionableConversions` useMemo

**Current Logic:**
```typescript
const isPositiveMovement = (from: string, to: string): boolean => {
  // Opportunities:
  // 1. From defectors/terrorists to anything better
  // 2. From anything to loyalists/near-apostles/apostles
  // Warnings:
  // 1. Anything towards defectors/terrorists
  // 2. Anything from loyalists/apostles/near-apostles
  
  if (to === 'defectors' || to === 'terrorists') return false;
  if (from === 'loyalists' || from === 'apostles' || from === 'near_apostles') return false;
  if (to === 'loyalists' || to === 'apostles' || to === 'near_apostles') return true;
  if (from === 'defectors' || from === 'terrorists') return true;
  
  // For other movements, check if moving to better segment
  const fromOrder = getSegmentSortOrder(from);
  const toOrder = getSegmentSortOrder(to);
  return toOrder < fromOrder;
};
```

**To modify:** Update the conditions in `isPositiveMovement` function.

### Adding New Columns to Tables

1. Add column header:
```typescript
<div className="col-newColumn sortable" onClick={() => handleSort('newColumn')}>
  New Column {sortColumn === 'newColumn' && (sortDirection === 'asc' ? '↑' : '↓')}
</div>
```

2. Add column data:
```typescript
<div className="col-newColumn">
  {customer.newColumnValue}
</div>
```

3. Add sorting logic:
```typescript
case 'newColumn':
  aVal = a.newColumnValue;
  bVal = b.newColumnValue;
  break;
```

4. Update CSS grid:
```css
.customer-row {
  grid-template-columns: 2fr 1fr 1fr 1fr 0.8fr 1fr 1fr; /* Add new column */
}
```

### Modifying Crossroads Display

**To change how crossroads customers are displayed:**

1. **Grouping logic**: Located in crossroads tab rendering (around line 1343)
2. **Collapse/expand**: Uses `expandedCrossroadsCustomers` Set
3. **Path tags**: Rendered when collapsed (around line 1490)
4. **Full table**: Rendered when expanded (around line 1515)

**To modify neutral customer inclusion:**

1. **Identification**: `point.satisfaction === midpoint.sat && point.loyalty === midpoint.loy`
2. **Path calculation**: Uses `getSpecialZoneBoundaries()` for special zones
3. **Threshold application**: Main quadrants (<= 2.0), Special zones (<= 1)

### Debugging Tips

**Filter Issues:**
- Check `isConnected` state
- Verify `filterContext.reportFilterStates[REPORT_ID]`
- Check `effectiveData` to see which data source is used
- Use browser DevTools to inspect filter state

**Performance Issues:**
- Check memoization dependencies
- Verify `useMemo` is used for expensive computations
- Profile with React DevTools Profiler
- Check if unnecessary re-renders occur

**Data Issues:**
- Verify `proximityAnalysis.settings.isAvailable`
- Check `getAllProximityCustomers` length
- Inspect `proximityAnalysis.analysis` object
- Verify quadrant assignment context
- Check midpoint coordinates match expectations

**Crossroads Issues:**
- Verify neutral customers are identified correctly
- Check zone boundaries calculation
- Verify Chebyshev distance calculation for special zones
- Check threshold application (2.0 for main, 1 for special)

### Common Patterns

**Conditional Rendering:**
```typescript
{condition && (
  <Component />
)}
```

**Memoized Computations:**
```typescript
const result = useMemo(() => {
  // Expensive computation
  return computedValue;
}, [dependencies]);
```

**State Updates (Sets):**
```typescript
setState(prev => {
  const next = new Set(prev);
  next.add(value);
  return next;
});
```

**State Updates (Sets - Remove):**
```typescript
setState(prev => {
  const next = new Set(prev);
  next.delete(value);
  return next;
});
```

**Event Handlers:**
```typescript
const handleAction = useCallback((param: Type) => {
  // Handler logic
}, [dependencies]);
```

**Accessing Private Methods (for neutral customers):**
```typescript
const tempClassifier = new EnhancedProximityClassifier(...);
const boundaries = tempClassifier['getSpecialZoneBoundaries']('apostles');
```

---

## Recent Changes & Rationale

### Removed Sections

1. **CRISIS/OPPORTUNITY Indicators Section**
   - **Reason**: Incorrect logic (showed proximity, not actual movement direction)
   - **Replacement**: Actionable Conversions tab provides accurate, detailed information
   - **Removed**: Lines 2160-2191

2. **Crossroads Report Section**
   - **Reason**: Redundant with Crossroads tab which provides better, interactive view
   - **Replacement**: Crossroads tab shows grouped customers with all paths
   - **Removed**: Lines 2178-2213

3. **Midpoint Customers Section**
   - **Reason**: Redundant - neutral customers now shown in Crossroads tab with full details
   - **Replacement**: Crossroads tab shows neutral customers with all possible movements
   - **Removed**: Lines 2537-2571

4. **Debug Section**
   - **Reason**: Development-only, not needed in production
   - **Removed**: Lines 2574-2598

### Added Features

1. **Crossroads Tab - Grouped Customer View**
   - Shows customers grouped by customer ID
   - Displays all possible movements for each customer
   - Collapsible groups with path tags when collapsed
   - Full table when expanded

2. **Neutral Customer Inclusion**
   - Neutral customers (at exact midpoint) included in Crossroads tab
   - Shown first in list with "Neutral" badge
   - Uses actual zone boundaries from context
   - Applies consistent threshold rules

3. **Collapsible Segment Groups**
   - Origin/Target perspective groups are collapsible
   - Collapsed by default
   - Shows "Origin: [Segment]" or "Target: [Segment]" prefix
   - Chevron icons indicate state

4. **Customer Connectors**
   - L-shaped SVG connector for repeated customers
   - Shows when sorted by customer
   - 90° angle at bottom-left
   - Grey customer name/ID after connector

5. **Consistent Threshold Rules**
   - Main quadrants: distance <= 2.0 (everywhere)
   - Special zones: distance <= 1 (everywhere)
   - Applied to neutral customers as well

### Terminology Changes

1. **"Current" → "Origin"**: More descriptive
2. **"Target" → "Near"**: Changed back to "Target" in actionable conversions
3. **"Risk" → "Chances"**: More accurate (includes both positive and negative)
4. **"High/Low" → "Higher/Lower"**: More prudent terminology
5. **"Midpoint" → "Neutral"**: Matches main visualization terminology
6. **"Possible paths" → "Possible movements"**: Consistent with other tabs

### Styling Changes

1. **Tab Background**: `rgba(76, 175, 80, 0.15)` for active tab
2. **Quadrant Badges**: Fixed Apostles and Near-Apostles styling (were appearing grey)
3. **Card Colors**: Lighter, more subtle colors for segment cards (`isCard` parameter)
4. **British English**: "prioritise" instead of "prioritize", "towards" instead of "toward"
5. **Neutral Badge**: Grey color (`#6b7280`) matching main visualization

---

## Important Notes

### ⚠️ Critical Dependencies

1. **FilterContext**: Must be available in parent component tree
2. **QuadrantAssignmentContext**: Required for quadrant names, styling, midpoint, zone sizes
3. **EnhancedProximityClassifier**: Core analysis engine, must be initialized correctly
4. **DataPoint[]**: Input data must be valid and filtered appropriately

### 🔄 State Synchronization

- Filter state syncs on mount via `useLayoutEffect`
- Connection status updates when filter states change
- Local changes are tracked with `hasLocalChanges` flag

### 🎨 Styling Conventions

- Use CSS variables for colors (e.g., `var(--proximity-opportunity-accent)`)
- Follow existing grid/flexbox patterns
- Maintain consistent spacing (1rem, 0.75rem, 0.5rem)
- Use subtle colors for backgrounds (rgba with low opacity)
- Active tab: `rgba(76, 175, 80, 0.15)`

### 📊 Data Structures

**CustomerProximityDetail:**
```typescript
{
  id: string;
  name?: string;
  satisfaction: number;
  loyalty: number;
  distanceFromBoundary: number;
  currentQuadrant: string;
  targetQuadrant: string;
  relationship: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
}
```

**ProximityDetail:**
```typescript
{
  customerCount: number;
  positionCount: number;
  averageDistance: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  customers: CustomerProximityDetail[];
}
```

**CrossroadsCustomer:**
```typescript
{
  id: string;
  name: string;
  satisfaction: number;
  loyalty: number;
  currentQuadrant: string;
  proximityRelationships: string[];
  strategicValue: 'HIGH' | 'MODERATE' | 'LOW';
  riskScore: number;
}
```

### 🎯 Key Design Decisions

1. **Neutral Customers in Crossroads**: They're the ultimate crossroads customers (can move anywhere)
2. **Consistent Thresholds**: Same rules everywhere for predictability
3. **Collapsible by Default**: Reduces visual clutter, users expand what they need
4. **Grouped Customer View**: Makes it clear which customers need careful handling
5. **Path Tags When Collapsed**: Quick overview without expanding
6. **No Perspective Toggle for Crossroads**: Not applicable (shows all paths per customer)

---

## Future Considerations

### Potential Enhancements

1. **Export Functionality**: Export actionable conversions to CSV
2. **Bulk Actions**: Select multiple customers for actions
3. **Custom Filters**: Additional filter types specific to proximity
4. **Historical Tracking**: Track proximity changes over time
5. **Notifications**: Alert when high-priority conversions detected
6. **Threshold Customization**: Allow users to adjust proximity thresholds

### Performance Optimizations

1. Virtual scrolling for large customer lists
2. Lazy loading of tab content
3. Debouncing for filter changes
4. Web Workers for heavy calculations
5. Memoization of zone boundary calculations

### Testing Recommendations

1. Unit tests for `isPositiveMovement` logic
2. Integration tests for filter connection/disconnection
3. E2E tests for tab navigation
4. Performance tests for large datasets
5. Tests for neutral customer path calculation
6. Tests for threshold consistency

---

## Troubleshooting Guide

### Common Issues

**Issue: Neutral customers not showing in Crossroads**
- Check: `point.satisfaction === midpoint.sat && point.loyalty === midpoint.loy`
- Verify: Midpoint coordinates from context
- Check: Neutral customers are not excluded from data

**Issue: Special zones not showing for neutral customers**
- Check: `showSpecialZones && isPremium` flags
- Verify: Distance calculation (should be Chebyshev, not Manhattan)
- Check: Zone boundaries from `getSpecialZoneBoundaries()`
- Verify: Distance <= 1 threshold

**Issue: Inconsistent distances between tabs**
- Check: All tabs use same threshold rules
- Verify: `getDefaultThreshold()` returns 2.0
- Check: Special zones use distance <= 1 everywhere

**Issue: Customer connector not showing**
- Check: `sortColumn === 'customer'`
- Verify: Customer ID exists
- Check: Not first occurrence of customer

**Issue: Groups not collapsing/expanding**
- Check: `expandedGroups` or `expandedCrossroadsCustomers` state
- Verify: Group keys are unique (`origin-${segment}` or `target-${segment}`)
- Check: Click handler is attached to header

---

## Contact & Support

For questions or issues related to Proximity Analysis:
1. Review this documentation
2. Check component code comments
3. Review related documentation in `docs/components/reporting/`
4. Consult with development team

---

**Document Version:** 2.0  
**Last Reviewed:** 2025  
**Maintained By:** Development Team
