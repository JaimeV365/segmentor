# Recommendation Score Feature - Complete Implementation Plan

**Document Status:** Active Planning Document  
**Last Updated:** 2024  
**Purpose:** Comprehensive reference for implementing the Recommendation Score (NPS-alternative) feature in Data Report  
**Note:** This document is PRIVATE and should NOT be committed to GitHub

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Legal Compliance](#legal-compliance)
3. [Terminology & Branding](#terminology--branding)
4. [Scale Conversion Strategy](#scale-conversion-strategy)
5. [Feature Specifications](#feature-specifications)
6. [Filter Architecture](#filter-architecture)
7. [UI/UX Design](#uiux-design)
8. [Technical Implementation](#technical-implementation)
9. [Risks & Mitigation](#risks--mitigation)
10. [Limitations & Considerations](#limitations--considerations)
11. [Implementation Phases](#implementation-phases)
12. [Testing Strategy](#testing-strategy)

---

## Executive Summary

### Objective
Implement a "Recommendation Score" feature in the Data Report that calculates and displays customer recommendation metrics using the NPS methodology, without using trademarked terms.

### Key Decisions Made
- **Terminology:** Use "Recommendation Score" (not "Loyalty Score" or "NPS")
- **Visibility:** Hidden by default, user-enabled via toggle
- **Availability:** Available for all users (Standard + Premium)
- **Filter Architecture:** Three independent filter sets (Bar Charts, Recommendation Score, Data Report Main)
- **Scale Conversion:** Proportional mapping preserving 64%/18%/18% ratio
- **Decimal Precision:** Whole numbers by default (industry standard)
- **Gauge Library:** Custom SVG (for export compatibility)

---

## Legal Compliance

### ✅ What We CAN Do
- Calculate score using exact NPS formula (% Promoters - % Detractors)
- Use "Promoters, Passives, Detractors" terminology (NOT trademarked)
- Group responses exactly as NPS does (0-6, 7-8, 9-10 for 0-10 scale)
- Display score prominently as a KPI
- Use "Recommendation Score" terminology
- Explain it's based on "recommendation methodology"

### ❌ What We CANNOT Do (without license)
- Use "NPS" or "Net Promoter Score" anywhere in the interface
- Market it as "NPS calculation" on website
- Use ® or ℠ symbols with NPS terms

### Exception: Field Detection
- **KEEP:** NPS field detection in CSV import (`headerProcessing.ts`)
- **REASON:** Technical/internal use only, not user-facing

### Files Requiring NPS Term Removal
1. `public/index.html` - Meta descriptions/keywords
2. `public/about.html` - Meta descriptions
3. `public/tool/about.html` - Meta descriptions/keywords
4. `public/faq.html` - FAQ content
5. `public/tool/faq.html` - FAQ content
6. `docs/components/reporting/MiniPlot/miniplot-api.md` - Documentation
7. `docs/components/data-entry/csv-import-documentation-updated.md` - Documentation
8. `docs/components/data-entry/csv-import-scale-detection.md` - Documentation

**Action:** Replace "NPS" with "recommendation score" or "loyalty score" in user-facing content.

---

## Terminology & Branding

### Primary Terminology
- **Feature Name:** "Recommendation Score"
- **Display Label:** "Recommendation Score" or just "Loyalty" with numerical value
- **Categories:** Promoters, Passives, Detractors (use these exact terms)

### Explanation Text (for tooltips/help)
- "Based on the recommendation methodology"
- "Calculated from responses to the recommendation question"
- "Measures likelihood of customers recommending your product/service"

### What NOT to Say
- ❌ "NPS calculation"
- ❌ "Net Promoter Score"
- ❌ "NPS methodology"
- ❌ Any reference to NPS as a branded term

---

## Scale Conversion Strategy

### Baseline: 0-10 Scale Distribution
- **Detractors:** 0-6 = 7 values = **63.64%** of scale
- **Passives:** 7-8 = 2 values = **18.18%** of scale
- **Promoters:** 9-10 = 2 values = **18.18%** of scale

### Conversion Principle
**Preserve proportional ratios** across all scales to maintain statistical consistency.

### Proportional Mapping by Scale

#### 1-5 Scale (5 values: 1, 2, 3, 4, 5)
- **Detractors:** 5 × 0.6364 = 3.18 ≈ **3 values** → **1, 2, 3**
- **Passives:** 5 × 0.1818 = 0.91 ≈ **1 value** → **4**
- **Promoters:** 5 × 0.1818 = 0.91 ≈ **1 value** → **5**
- **Distribution:** 60% / 20% / 20%

#### 1-7 Scale (7 values: 1, 2, 3, 4, 5, 6, 7)
- **Detractors:** 7 × 0.6364 = 4.45 ≈ **4 values** → **1, 2, 3, 4**
- **Passives:** 7 × 0.1818 = 1.27 ≈ **1 value** → **5**
- **Promoters:** 7 × 0.1818 = 1.27 ≈ **2 values** → **6, 7**
- **Distribution:** 57.1% / 14.3% / 28.6%

#### 1-10 Scale (10 values: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
- **Detractors:** 10 × 0.6364 = 6.36 ≈ **6 values** → **1, 2, 3, 4, 5, 6**
- **Passives:** 10 × 0.1818 = 1.82 ≈ **2 values** → **7, 8**
- **Promoters:** 10 × 0.1818 = 1.82 ≈ **2 values** → **9, 10**
- **Distribution:** 60% / 20% / 20%

#### 0-10 Scale (11 values: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10)
- **Detractors:** 0-6 = **7 values** → **0, 1, 2, 3, 4, 5, 6**
- **Passives:** 7-8 = **2 values** → **7, 8**
- **Promoters:** 9-10 = **2 values** → **9, 10**
- **Distribution:** 63.64% / 18.18% / 18.18% (baseline)

### Implementation Function

```typescript
/**
 * Get category mapping for a given scale
 * Preserves proportional distribution from 0-10 baseline
 */
function getCategoryMapping(scale: ScaleFormat): {
  detractors: number[];
  passives: number[];
  promoters: number[];
} {
  const [min, max] = scale.split('-').map(Number);
  const totalValues = max - min + 1;
  
  // Calculate proportional counts preserving 64%/18%/18% ratio
  const detractorsCount = Math.round(totalValues * 0.6364);
  const passivesCount = Math.round(totalValues * 0.1818);
  const promotersCount = totalValues - detractorsCount - passivesCount; // Ensure total matches
  
  // Build arrays
  const detractors = Array.from({ length: detractorsCount }, (_, i) => min + i);
  const passives = Array.from({ length: passivesCount }, (_, i) => min + detractorsCount + i);
  const promoters = Array.from({ length: promotersCount }, (_, i) => min + detractorsCount + passivesCount + i);
  
  return { detractors, passives, promoters };
}

/**
 * Categorize a loyalty value based on scale
 */
function categorizeLoyaltyValue(value: number, scale: ScaleFormat): 'detractor' | 'passive' | 'promoter' {
  const mapping = getCategoryMapping(scale);
  
  if (mapping.detractors.includes(value)) return 'detractor';
  if (mapping.passives.includes(value)) return 'passive';
  if (mapping.promoters.includes(value)) return 'promoter';
  
  // Fallback (shouldn't happen)
  return 'detractor';
}
```

### Score Calculation

```typescript
/**
 * Calculate Recommendation Score from data
 * Formula: (% Promoters - % Detractors) × 100
 * Range: -100 to +100
 */
function calculateRecommendationScore(
  data: DataPoint[],
  loyaltyScale: ScaleFormat
): {
  score: number; // -100 to +100
  detractors: number;
  passives: number;
  promoters: number;
  detractorsPercent: number;
  passivesPercent: number;
  promotersPercent: number;
  distribution: Record<number, number>; // Original scale distribution
} {
  const mapping = getCategoryMapping(loyaltyScale);
  
  // Categorize all data points
  let detractors = 0;
  let passives = 0;
  let promoters = 0;
  
  const distribution: Record<number, number> = {};
  
  data.forEach(d => {
    // Count original scale distribution
    distribution[d.loyalty] = (distribution[d.loyalty] || 0) + 1;
    
    // Categorize
    if (mapping.detractors.includes(d.loyalty)) detractors++;
    else if (mapping.passives.includes(d.loyalty)) passives++;
    else if (mapping.promoters.includes(d.loyalty)) promoters++;
  });
  
  const total = data.length;
  const detractorsPercent = total > 0 ? (detractors / total) * 100 : 0;
  const passivesPercent = total > 0 ? (passives / total) * 100 : 0;
  const promotersPercent = total > 0 ? (promoters / total) * 100 : 0;
  
  // Calculate score: % Promoters - % Detractors
  const score = promotersPercent - detractorsPercent;
  
  return {
    score,
    detractors,
    passives,
    promoters,
    detractorsPercent,
    passivesPercent,
    promotersPercent,
    distribution
  };
}
```

---

## Feature Specifications

### Core Feature
- **Name:** Recommendation Score
- **Location:** Data Report section
- **Visibility:** Hidden by default, user-enabled via toggle
- **Availability:** All users (Standard + Premium)

### Three Widgets

#### Widget 1: Score Gauge
- **Type:** Custom SVG circular/semi-circular gauge
- **Range:** -100 to +100
- **Display:** Large score number prominently displayed
- **Color Zones:**
  - Red: < 0 (more detractors)
  - Orange: = 0 (balanced)
  - Green: > 0 (more promoters)
- **Customization (Premium):**
  - Custom color picker for zones
  - Decimal precision: 0, 1, or 2 decimals (default: 0)
- **Export:** Must export cleanly as PNG/PDF (SVG ensures this)

#### Widget 2: Loyalty Distribution Bar Chart
- **Type:** Bar chart
- **X-axis:** Loyalty scale values (original scale, e.g., 1-5, 1-7, 1-10, 0-10)
- **Y-axis:** Count (or percentage toggle)
- **Display Options:**
  - Show counts only
  - Show percentages only
  - Show both (count + percentage)
- **Tooltip:** Count and percentage on hover
- **Styling:** Match existing bar chart design

#### Widget 3: Category Distribution Chart
- **Type:** Bar chart OR Pie chart (user toggle)
- **Categories:** Detractors, Passives, Promoters
- **Display:** Count and percentage for each category
- **Color Coding:**
  - Detractors: Red
  - Passives: Orange/Yellow
  - Promoters: Green
- **Chart Type Toggle:** Bar chart (default) or Pie chart
- **Export:** Must export cleanly

### Customization Options (Premium)
1. **Gauge Colors:** Custom color picker for red/orange/green zones
2. **Decimal Precision:** 0, 1, or 2 decimals (default: 0)
3. **Chart Type:** Bar chart or Pie chart for Widget 3
4. **Display Format:** Count/Percentage/Both for Widget 2

---

## Filter Architecture

### Current State
- **Bar Charts:** Each has independent filter set
  - `barChart_satisfaction` - Satisfaction bar chart
  - `barChart_loyalty` - Loyalty bar chart
- **Status:** Already implemented and working

### Proposed Architecture: 3 Independent Filter Sets

#### Filter Set 1: Bar Charts (Keep as-is)
- **Report IDs:**
  - `barChart_satisfaction`
  - `barChart_loyalty`
- **Status:** ✅ Already implemented
- **Can connect/disconnect:** Yes, independently

#### Filter Set 2: Recommendation Score Section (New)
- **Report ID:** `dataReport_recommendationScore`
- **Status:** ⏳ Needs implementation
- **Scope:** Recommendation Score widgets only
- **Can connect/disconnect:** Yes, independently

#### Filter Set 3: Rest of Data Report (New)
- **Report ID:** `dataReport_main`
- **Status:** ⏳ Needs implementation
- **Scope:** Basic Information, Respondent Information, Quadrant Details, etc.
- **Can connect/disconnect:** Yes, independently

### Filter Architecture Pattern (DRY)

All filter sets follow the same pattern:

```typescript
// 1. Define REPORT_ID
const REPORT_ID = useMemo(() => `unique_report_id`, []);

// 2. Initialize on mount (one-time)
useLayoutEffect(() => {
  if (filterContext && !filterContext.reportFilterStates[REPORT_ID]) {
    filterContext.syncReportToMaster(REPORT_ID);
  }
}, [filterContext, REPORT_ID]);

// 3. Get filtered data
const effectiveData = useMemo(() => {
  return filterContext.getReportFilteredData(REPORT_ID, originalData);
}, [filterContext, REPORT_ID, originalData]);

// 4. Use FilterPanel
<FilterPanel
  reportId={REPORT_ID}
  forceLocalState={true}
  data={originalData}
  onFilterChange={handleFilterChange}
  // ... other props
/>
```

### FilterContext Storage

```typescript
reportFilterStates: {
  "barChart_satisfaction": FilterState,
  "barChart_loyalty": FilterState,
  "dataReport_recommendationScore": FilterState,  // NEW
  "dataReport_main": FilterState,  // NEW
  // ... can add infinite more
}
```

### Connection Status
- **Connected (Default):** Report state matches main state → Uses main `filteredData`
- **Disconnected:** Report state differs → Filters independently using own state
- **Visual Indicator:** Connection/disconnection badge per section

---

## UI/UX Design

### Toggle Mechanism
- **Location:** Data Report header (next to title)
- **Icon:** Cog (Settings) icon
- **Type:** Context menu (not dropdown)
- **Initial State:** "Show Recommendation Score" toggle (unchecked by default)

### Contextual Menu Structure

#### When Recommendation Score is Hidden:
```
[Settings Icon] →
  └─ ☐ Show Recommendation Score
```

#### When Recommendation Score is Visible:
```
[Settings Icon] →
  ├─ ☑ Show Recommendation Score
  ├─ ────────────────
  ├─ Customize Colors (Premium)
  ├─ Decimal Precision: [0] [1] [2]
  ├─ Chart Type: [Bar] [Pie]
  └─ Display Format: [Count] [Percentage] [Both]
```

### Filter Panel Placement
- **Option:** Each section has its own filter toggle/panel
- **Pattern:** Match existing bar chart pattern
- **Visual:** Connection/disconnection indicator badge per section
- **Labels:** Clear labels ("Bar Charts Filters", "Recommendation Score Filters", "Data Report Filters")

### Widget Layout
```
[Statistics Section - Bar Charts]
    ↓
[Recommendation Score Section] ← NEW
    ├─ Widget 1: Score Gauge (large, prominent)
    ├─ Widget 2: Loyalty Distribution Bar Chart
    └─ Widget 3: Category Distribution (Bar/Pie toggle)
    ↓
[Quadrant Details Section]
```

### Color Scheme

#### Standard Colors (All Users)
- **Red (Detractors):** `#DC2626` (red-600) or `#EF4444` (red-500)
- **Orange (Passives):** `#F97316` (orange-500) or `#FB923C` (orange-400)
- **Green (Promoters):** `#16A34A` (green-600) or `#22C55E` (green-500)

#### Gauge Score Colors
- **Red:** < 0 (more detractors than promoters)
- **Orange:** = 0 (balanced)
- **Green:** > 0 (more promoters than detractors)

#### Premium Customization
- Custom color picker for each zone
- Save preferences (localStorage)

---

## Technical Implementation

### Component Structure

```
DataReport/
├── index.tsx (main component)
├── StatisticsSection.tsx (existing)
├── RecommendationScoreSection.tsx (NEW)
│   ├── ScoreGauge.tsx (NEW - Custom SVG)
│   ├── LoyaltyDistributionChart.tsx (NEW)
│   └── CategoryDistributionChart.tsx (NEW - Bar/Pie toggle)
└── styles.css
```

### Key Utilities

#### File: `src/utils/recommendationScore.ts`
```typescript
// Scale conversion utilities
export function getCategoryMapping(scale: ScaleFormat): {...}
export function categorizeLoyaltyValue(value: number, scale: ScaleFormat): 'detractor' | 'passive' | 'promoter'
export function calculateRecommendationScore(data: DataPoint[], loyaltyScale: ScaleFormat): {...}
```

### Data Flow

```
FilterContext (dataReport_recommendationScore)
    ↓
getReportFilteredData(reportId, originalData)
    ↓
RecommendationScoreSection (calculates score from filtered data)
    ↓
Three widgets display results
```

### Export Compatibility

- **Gauge:** Custom SVG → Exports cleanly with `html2canvas`
- **Charts:** Use existing chart components (already export-compatible)
- **Test:** Export as PNG and PDF, verify no distortion

### Performance Optimization

- Use `useMemo` for score calculations
- Debounce filter changes if needed
- Cache converted values if data doesn't change

---

## Risks & Mitigation

### Risk 1: Scale Conversion Accuracy
- **Risk:** Proportional mapping may not perfectly match user expectations
- **Mitigation:** 
  - Document conversion methodology clearly
  - Show tooltip explaining how scale was converted
  - Consider showing original scale values alongside converted categories

### Risk 2: Filter Complexity
- **Risk:** Users confused by multiple filter sets
- **Mitigation:**
  - Clear visual indicators (connection badges)
  - Clear labels ("Filters for Bar Charts", etc.)
  - Tooltips explaining which filters affect what
  - Close other panels when one opens (optional)

### Risk 3: Export Quality
- **Risk:** SVG gauge may not export correctly
- **Mitigation:**
  - Test export early in development
  - Use `html2canvas` (already in use)
  - Fallback to canvas rendering if needed

### Risk 4: Performance with Large Datasets
- **Risk:** Recalculating score on every filter change
- **Mitigation:**
  - Use `useMemo` for calculations
  - Debounce filter changes
  - Show loading state during recalculation

### Risk 5: Legal Compliance
- **Risk:** Accidental use of trademarked terms
- **Mitigation:**
  - Code review checklist
  - Search codebase for "NPS" before release
  - Keep field detection exception documented

### Risk 6: User Confusion
- **Risk:** Users don't understand Recommendation Score
- **Mitigation:**
  - Clear tooltips/help text
  - Explain methodology in contextual menu
  - Link to documentation

---

## Limitations & Considerations

### Scale Conversion Limitations
- **Not Perfect:** Proportional mapping is approximation, not exact
- **Documentation:** Must clearly explain conversion methodology
- **User Education:** Users may need to understand why scores differ from "true NPS"

### Filter Limitations
- **Multiple Panels:** Users may see 3+ filter panels open simultaneously
- **State Management:** More filter states = more complexity
- **Performance:** Multiple filter calculations may impact performance

### Export Limitations
- **SVG Complexity:** Complex SVG gauges may not export perfectly
- **Chart Libraries:** Must ensure chart libraries support export
- **File Size:** High-quality exports may be large files

### Data Limitations
- **Empty Data:** Handle gracefully when no data available
- **Single Value:** Handle edge case where all values are same category
- **Filtered Out:** Show message when filters exclude all data

### Browser Compatibility
- **SVG Support:** Ensure SVG gauge works in all target browsers
- **Export:** Test `html2canvas` in all browsers
- **Performance:** Test with large datasets in slower browsers

---

## Implementation Phases

### Phase 1: Legal Cleanup (1-2 hours)
**Tasks:**
- [ ] Remove NPS mentions from `public/index.html`
- [ ] Remove NPS mentions from `public/about.html`
- [ ] Remove NPS mentions from `public/tool/about.html`
- [ ] Remove NPS mentions from `public/faq.html`
- [ ] Remove NPS mentions from `public/tool/faq.html`
- [ ] Update documentation files
- [ ] Keep field detection code intact
- [ ] Verify no NPS terms remain (except field detection)

**Deliverable:** Clean codebase with no trademarked terms

---

### Phase 2: Core Utilities (2-3 hours)
**Tasks:**
- [ ] Create `src/utils/recommendationScore.ts`
- [ ] Implement `getCategoryMapping()` function
- [ ] Implement `categorizeLoyaltyValue()` function
- [ ] Implement `calculateRecommendationScore()` function
- [ ] Add unit tests for scale conversions
- [ ] Test with all scale formats (1-5, 1-7, 1-10, 0-10)
- [ ] Verify proportional ratios are preserved

**Deliverable:** Working utility functions with tests

---

### Phase 3: UI Components (5-7 hours)
**Tasks:**
- [ ] Create `RecommendationScoreSection.tsx` component
- [ ] Create `ScoreGauge.tsx` (custom SVG component)
- [ ] Create `LoyaltyDistributionChart.tsx` component
- [ ] Create `CategoryDistributionChart.tsx` (with Bar/Pie toggle)
- [ ] Add contextual menu with Settings icon
- [ ] Implement toggle for showing/hiding section
- [ ] Add localStorage persistence for visibility state
- [ ] Style components to match existing design
- [ ] Test export (PNG/PDF) for all widgets

**Deliverable:** Complete UI with all three widgets

---

### Phase 4: Filter Integration (2-3 hours)
**Tasks:**
- [ ] Add `dataReport_recommendationScore` reportId to RecommendationScoreSection
- [ ] Implement filter initialization pattern
- [ ] Integrate with FilterContext
- [ ] Add filter panel/toggle to Data Report header
- [ ] Add connection/disconnection indicator
- [ ] Test filter interactions
- [ ] Verify filtered data updates score correctly

**Deliverable:** Recommendation Score section with working filters

---

### Phase 5: Data Report Main Filters (2-3 hours)
**Tasks:**
- [ ] Add `dataReport_main` reportId to DataReport component
- [ ] Implement filter initialization pattern
- [ ] Integrate with FilterContext
- [ ] Apply filters to Basic Information, Respondent Information, Quadrant Details
- [ ] Add filter panel/toggle
- [ ] Test filter interactions
- [ ] Verify all sections update correctly

**Deliverable:** Data Report main sections with working filters

---

### Phase 6: Customization Features (2-3 hours)
**Tasks:**
- [ ] Add color customization (Premium)
- [ ] Add decimal precision toggle (Premium, default: 0)
- [ ] Add chart type toggle (Bar/Pie for Widget 3)
- [ ] Add display format toggle (Count/Percentage/Both for Widget 2)
- [ ] Save preferences to localStorage
- [ ] Test all customization options

**Deliverable:** Full customization features

---

### Phase 7: Testing & Polish (2-3 hours)
**Tasks:**
- [ ] Test all scale formats (1-5, 1-7, 1-10, 0-10)
- [ ] Test filter combinations (date + attributes + segment)
- [ ] Test export (PNG/PDF) for all widgets
- [ ] Test with empty data
- [ ] Test with single category (all detractors, etc.)
- [ ] Test performance with large datasets
- [ ] UI/UX refinements
- [ ] Documentation updates

**Deliverable:** Fully tested and polished feature

---

## Testing Strategy

### Unit Tests
- [ ] `getCategoryMapping()` - All scale formats
- [ ] `categorizeLoyaltyValue()` - All values in each scale
- [ ] `calculateRecommendationScore()` - Various data scenarios

### Integration Tests
- [ ] Filter integration with FilterContext
- [ ] Score calculation with filtered data
- [ ] Widget updates when filters change

### Manual Tests
- [ ] All scale formats (1-5, 1-7, 1-10, 0-10)
- [ ] Filter combinations (date, attributes, segment)
- [ ] Export (PNG/PDF) quality
- [ ] Empty data handling
- [ ] Edge cases (all same category, etc.)
- [ ] Performance with large datasets
- [ ] Browser compatibility

### User Acceptance Tests
- [ ] Toggle visibility works
- [ ] Filters work independently
- [ ] Export produces clean images
- [ ] Customization options work
- [ ] UI is intuitive

---

## Decimal Precision Best Practice

### Industry Standard
- **NPS/CX Industry:** Whole numbers (integers)
- **Academic Sources:** Confirm integer reporting
- **Reason:** Clarity and simplicity

### Implementation
- **Default:** Whole numbers (0 decimals)
- **Premium Option:** Allow 1 decimal for precision
- **Display:** Format based on user preference

---

## Color Scheme Best Practice

### Standard Colors (Industry Standard)
- **Red (Detractors):** Negative sentiment
- **Yellow/Orange (Passives):** Neutral sentiment
- **Green (Promoters):** Positive sentiment

### Gauge Score Colors
- **Red:** < 0 (more detractors)
- **Orange:** = 0 (balanced)
- **Green:** > 0 (more promoters)

### Specific Color Values
- **Red:** `#DC2626` (red-600) or `#EF4444` (red-500)
- **Orange:** `#F97316` (orange-500) or `#FB923C` (orange-400)
- **Green:** `#16A34A` (green-600) or `#22C55E` (green-500)

---

## Export Considerations

### Gauge Library Choice: Custom SVG
**Decision:** Build custom SVG gauge (not recharts)

**Reasons:**
- ✅ Exports cleanly with `html2canvas` (already in use)
- ✅ Scales without quality loss
- ✅ Full control over appearance
- ✅ No library dependencies
- ✅ Matches existing export flow

**Implementation:**
- Use SVG `<path>` elements for arcs
- Score displayed as text
- Color zones based on score value
- Test export early in development

### Export Testing
- [ ] PNG export produces clean image
- [ ] PDF export produces clean image
- [ ] No distortion or blur
- [ ] Colors render correctly
- [ ] Text is readable
- [ ] File size is reasonable

---

## Success Criteria

### Functional Requirements
- ✅ Recommendation Score calculates correctly for all scales
- ✅ Three widgets display correctly
- ✅ Filters work independently for each section
- ✅ Export produces clean images
- ✅ Customization options work (Premium)

### Non-Functional Requirements
- ✅ No trademarked terms in codebase (except field detection)
- ✅ Performance acceptable with large datasets
- ✅ UI is intuitive and matches existing design
- ✅ Works in all target browsers

### User Experience
- ✅ Feature is discoverable (Settings icon)
- ✅ Toggle visibility works smoothly
- ✅ Filters are clear and understandable
- ✅ Export quality is high

---

## Notes & Decisions Log

### Key Decisions Made
1. **Terminology:** "Recommendation Score" (not "Loyalty Score")
2. **Visibility:** Hidden by default
3. **Filter Architecture:** 3 independent filter sets
4. **Scale Conversion:** Proportional mapping preserving ratios
5. **Decimal Precision:** Whole numbers by default
6. **Gauge Library:** Custom SVG
7. **Icon:** Cog (Settings) icon

### Open Questions
- None currently

### Future Considerations
- Consider adding trend analysis (score over time)
- Consider adding benchmark comparisons
- Consider adding export of score data (CSV)

---

## References

### Internal Documentation
- Filter System: `docs/components/visualization/filters/FILTER_SYSTEM_COMPLETE_GUIDE.md`
- Data Report: `docs/components/reporting/data-report-docs.txt`
- Export System: `src/components/common/ExportButton.tsx`

### External References
- NPS Methodology (for calculation reference only, not branding)
- CX Industry Best Practices
- SVG Export Best Practices

---

**End of Document**

