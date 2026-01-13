# Progress Report (Historical Progress) Implementation Plan

## Overview

The Progress Report will track historical movements in customer satisfaction and loyalty over time, showing trends, quadrant movements, and forecasts. This is a premium feature that requires date-based data tracking.

## Naming Decision

**Recommendation: "Historical Progress"** ✅
- More descriptive than just "Progress"
- Clearly indicates it's about historical/temporal analysis
- Aligns with existing "Historical Analysis" documentation
- Professional and clear

## Current Issues to Fix First

### 1. Duplicate Validation Logic

**Problem:** Current duplicate check flags same email as duplicate even with different dates.

**Current Logic (DuplicateCheckService.ts):**
- Flags duplicate if: same email OR same name OR same date
- This prevents tracking same customer over time

**Required Fix:**
- Allow same email + different date = NOT duplicate (historical tracking)
- Allow same ID + different date = NOT duplicate (historical tracking with ID)
- Only flag as duplicate if: (same email AND same date) OR (same ID AND same date) OR (same ID regardless of date - ID must be unique)
- Logic: `isDuplicate = (sameEmail && sameDate) || (sameId && sameDate) || sameId`
- Note: Email is optional, ID is mandatory - both can be used for historical tracking

**Files to Update:**
- `src/components/data-entry/services/DuplicateCheckService.ts`
- `src/components/data-entry/forms/CSVImport/utils/duplicates.ts`
- `src/components/data-entry/forms/CSVImport/utils/validation.ts`

## Report Structure & Placement

### Current Order (ReportingSection.tsx):
1. Data Report
2. Response Concentration
3. Distribution
4. **Proximity** ← Insert here
5. **Historical Progress** ← NEW (between Proximity and Actions)
6. Actions Report

### Component Structure

```
HistoricalProgressSection/
├── index.tsx (main component)
├── HistoricalProgressSection.css
├── components/
│   ├── SatisfactionTrendChart.tsx
│   ├── LoyaltyTrendChart.tsx
│   ├── QuadrantMovementFlow.tsx
│   ├── ForecastVisualization.tsx
│   └── ProgressSummary.tsx
└── services/
    ├── historicalAnalysisService.ts
    └── forecastService.ts
```

## Features to Implement

### Core Features (Phase 1)

1. **Historical Movements - Satisfaction & Loyalty**
   - Separate trend lines for satisfaction over time
   - Separate trend lines for loyalty over time
   - Combined view option
   - Period-over-period comparisons

2. **Quadrant Movement Analysis**
   - Positive movements (improving quadrants)
   - Negative movements (declining quadrants)
   - Movement flow diagrams
   - Net movement statistics per quadrant

3. **Basic Forecast**
   - "If tendency continues" projections
   - Simple linear trend projection
   - Basic confidence indicators
   - Forecast horizons: 1 month, 3 months, 6 months

### Advanced Features (Phase 2 - Premium)

4. **Cohort Analysis**
   - Retained customers (appear in both periods - track their evolution)
   - New customers (appear in later period only - acquisition quality)
   - Lost customers (appear in earlier period only - churn analysis)
   - See: `docs/premium/Historical Analysis/cohort-analysis-explanation.md`

**Note:** Individual customer timelines will be available through existing filter system - users can filter by email/ID to see specific customer progress.

## Data Requirements

### Minimum Data Needed:
- **Date field** - Required for all entries (for historical tracking)
- **Email OR ID** - At least one needed for customer tracking
  - Email: Optional but recommended (better for customer identification)
  - ID: Always present (can be used if email not available)
- **Multiple entries per customer** - Same email/ID, different dates

### Data Validation:
- Must have at least 2 data points with dates to show trends
- Email OR ID can be used to track individual customer progress
- Anonymous entries (no email/ID) can still show population trends
- Filter system allows viewing individual customer progress by filtering

## Styling Standards

### Use Existing Report Styles:
- `report-card` - Main container
- `report-title` - Section title (h3)
- `report-content` - Content wrapper
- `report-section` - Sub-sections
- Montserrat font for titles
- Standard spacing and colors

### Color Scheme:
- Primary: Branded green (#3a863e)
- Text: Standard report colors
- Charts: Match existing chart colors

## Implementation Phases

### Phase 1: Fix Duplicate Validation (CRITICAL - Do First)
**Goal:** Allow same email with different dates

**Steps:**
1. Update `DuplicateCheckService.ts` to check email + date combination
2. Update CSV import duplicate detection
3. Test with sample data (same email, different dates)
4. Verify no breaking changes

### Phase 2: Create Basic Historical Progress Component
**Goal:** Basic structure and data processing

**Steps:**
1. Create component folder structure
2. Create main `HistoricalProgressSection` component
3. Add to `ReportingSection.tsx` between Proximity and Actions
4. Create basic data processing service
5. Add InfoRibbon with explanation

### Phase 3: Implement Trend Charts
**Goal:** Show satisfaction and loyalty trends

**Steps:**
1. Create `SatisfactionTrendChart` component
2. Create `LoyaltyTrendChart` component
3. Group data by date periods
4. Calculate trends
5. Render with Recharts

### Phase 4: Implement Quadrant Movements
**Goal:** Show customer movements between quadrants

**Steps:**
1. Track quadrant assignments over time
2. Calculate movements (from → to)
3. Create movement flow visualization
4. Show positive/negative movement statistics

### Phase 5: Implement Basic Forecasting
**Goal:** "If tendency continues" projections using linear regression

**Steps:**
1. Create forecast service with linear regression
2. Calculate simple trend lines (satisfaction and loyalty separately)
3. Project future values based on trend
4. Add basic confidence indicators (high/medium/low based on data quality)
5. Visualize forecasts with trend lines extending into future
6. Show "if tendency continues" message

**Note:** Keeping it simple - linear regression only. Advanced methods (moving average, exponential smoothing, scenarios) can be added later if needed.

## Technical Considerations

### Data Processing:
- Group data by email (if available) for customer timelines
- Group data by date periods for population trends
- Handle missing dates gracefully
- Support anonymous entries (no email)

### Performance:
- Memoize calculations
- Lazy load charts
- Cache analysis results
- Handle large datasets efficiently

### Premium Features:
- All historical analysis = Premium only
- Show upgrade prompt for free users
- Graceful degradation

## Safety Measures

### Before Implementation:
- ✅ Work in feature branch (`test-preview-deployment` or new branch)
- ✅ Test on preview URL first
- ✅ Don't modify existing working components
- ✅ Add new component without breaking existing ones

### Testing Checklist:
- [ ] Duplicate validation allows same email + different date
- [ ] Component renders correctly
- [ ] No console errors
- [ ] Works with existing filters
- [ ] Handles missing dates gracefully
- [ ] Premium features show upgrade prompt
- [ ] Export functionality works (if applicable)

## Next Steps

1. **Fix duplicate validation** (Critical - enables historical tracking)
2. **Create component structure** (Basic shell)
3. **Implement data processing** (Group by date/email)
4. **Add trend visualizations** (Charts)
5. **Add movement analysis** (Quadrant transitions)
6. **Add forecasting** (Projections)

---

**Ready to start?** Let's begin with Phase 1: Fixing duplicate validation to allow historical tracking.
