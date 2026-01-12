# Historical Analysis Feature Specification

## Overview
The Historical Analysis feature enhances the Apostles Model by introducing temporal dimension analysis, enabling tracking of customer satisfaction and loyalty changes over time, along with behavioral validation capabilities.

## Core Features

### 1. Temporal Data Tracking
- Track satisfaction and loyalty scores over time
- Associate multiple data points with single customer via email
- Handle anonymous entries appropriately
- Support variable time periods (monthly, quarterly, yearly)

### 2. Behavioral Validation
- Track stated intentions vs actual behavior
- Compare NPS/loyalty scores against actual recommendations/purchases
- Analyze discrepancies between intended and actual behavior

### 3. Movement Analysis
- Track customer movement between quadrants
- Analyze individual vs population changes
- Support cohort analysis
  - Retained customers analysis
  - New customer analysis
  - Lost customer analysis

### 4. Significance Testing
- Identify meaningful changes vs normal variations
- Provide confidence indicators for changes
- Support statistical analysis of movements

### 5. Trend Forecasting
- Project future satisfaction and loyalty trends based on historical patterns
- Forecast quadrant movements if current tendencies continue
- Provide confidence intervals for predictions
- Support multiple forecasting methods:
  - Linear regression for trend projection
  - Moving average for smoothing
  - Exponential smoothing for weighted predictions
  - Seasonal adjustment (if applicable)
- Forecast time horizons (1 month, 3 months, 6 months, 1 year)
- Visualize "if tendency continues" scenarios

## User Experience

### Data Entry
1. Enhanced CSV Import
   - Support for dates
   - Email field parsing
   - Behavioral data columns

2. Manual Entry Additions
   - Date field (required for historical tracking)
   - Email field (optional but recommended)
   - Actual behavior fields (optional)

### Visualization
1. Time-Based Filters
   - Period selection
   - Date range filters
   - Cohort selection

2. Historical Views
   - Movement flow diagrams
   - Trend charts
   - Comparison views

### Reporting
1. Historical Report (New)
   - Individual customer timelines
   - Population trend analysis
   - Cohort comparisons
   - Behavioral validation analysis

2. Progress Report (New)
   - **Historical Movements in Satisfaction and Loyalty**
     - Separate trend lines for satisfaction over time
     - Separate trend lines for loyalty over time
     - Combined view showing both metrics together
     - Period-over-period comparisons
   - **Quadrant Movement Analysis**
     - Positive movements (improving quadrants)
     - Negative movements (declining quadrants)
     - Movement flow diagrams showing transitions
     - Net movement statistics per quadrant
   - **Forecast Visualizations**
     - "If tendency continues" projections
     - Forecasted satisfaction and loyalty scores
     - Predicted quadrant assignments
     - Confidence bands around forecasts
     - Multiple scenario projections (best case, worst case, most likely)

3. Enhanced Data Report
   - Time period snapshots
   - Filter controls for date ranges
   - Aggregate statistics

4. Enhanced Action Report
   - Time-based recommendations
   - Trend-based insights
   - Movement-specific actions
   - Forecast-based proactive recommendations

## Technical Requirements

### Data Structure Updates
```typescript
interface DataPoint {
  id: string;
  name: string;
  email?: string;           // New field
  timestamp: Date;          // New field
  satisfaction: number;
  loyalty: number;
  group: string;
  excluded?: boolean;
  actualBehavior?: {        // New field
    didRecommend?: boolean;
    didRepurchase?: boolean;
    date?: Date;
  }
}

interface HistoricalAnalysis {
  customerChanges: {
    email: string;
    timeline: DataPoint[];
    movements: QuadrantMovement[];
    significance: SignificanceLevel;
  }[];
  populationChanges: {
    period: DateRange;
    retained: CohortAnalysis;
    new: CohortAnalysis;
    lost: CohortAnalysis;
  }[];
  forecasts?: {
    satisfaction: TrendForecast;
    loyalty: TrendForecast;
    quadrantDistribution: QuadrantForecast[];
    confidence: ConfidenceLevel;
  };
}

interface TrendForecast {
  currentValue: number;
  projectedValue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  rateOfChange: number; // per time period
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  projectionDate: Date;
  method: 'linear' | 'movingAverage' | 'exponential' | 'seasonal';
}

interface QuadrantForecast {
  quadrant: QuadrantType;
  currentCount: number;
  projectedCount: number;
  change: number;
  changePercentage: number;
  confidence: ConfidenceLevel;
}

type ConfidenceLevel = 'high' | 'medium' | 'low';
```

### Storage Considerations
- Efficient data structures for temporal analysis
- Optimized query patterns for historical data
- Cache strategies for computed analyses

## Premium Features
All historical analysis features will be premium-only:
- Historical tracking
- Behavioral validation
- Cohort analysis
- Significance testing
- Trend forecasting and projections
- Progress Report
- Enhanced reporting

## Implementation Phases

### Phase 1: Data Structure Enhancement
- Add timestamp support
- Implement email validation
- Update CSV import/export
- Modify storage system

### Phase 2: Historical Tracking
- Implement basic timeline tracking
- Add time-based filters
- Create historical visualizations
- Build movement analysis

### Phase 3: Advanced Analytics
- Implement cohort analysis
- Add significance testing
- Create behavioral validation
- Enhance reporting system

### Phase 3.5: Forecasting Implementation
- Implement trend analysis algorithms
- Create forecasting service with multiple methods
- Build forecast visualization components
- Add confidence interval calculations
- Integrate forecasts into Progress Report

### Phase 4: Premium Integration
- Implement premium checks
- Add premium UI elements
- Create premium reporting
- Enhance documentation

## Testing Requirements

### Data Validation
- Email format validation
- Date format handling
- Duplicate detection
- Anonymous data handling

### Performance Testing
- Large dataset handling
- Complex query performance
- Visualization rendering
- Report generation
- Forecast calculation performance
- Real-time trend updates

### Premium Feature Testing
- Feature access control
- Premium UI elements
- Enhanced functionality
- Upgrade flow

## Documentation Requirements

### User Documentation
- Feature guides
- Best practices
- Example analyses
- Premium features guide

### Technical Documentation
- API documentation
- Data structure documentation
- Implementation guides
- Testing guidelines

## Success Metrics
- Historical data usage rates
- Premium conversion rates
- User engagement metrics
- Performance benchmarks

## Risks and Mitigations

### Data Quality
- Risk: Inconsistent email formats
- Mitigation: Robust email validation and normalization

### Performance
- Risk: Large dataset performance issues
- Mitigation: Efficient data structures and caching

### User Adoption
- Risk: Complex feature confusion
- Mitigation: Clear documentation and UI guidance

### Forecasting Accuracy
- Risk: Forecasts may be inaccurate with limited data
- Mitigation: 
  - Require minimum data points for forecasts (e.g., 3+ periods)
  - Display confidence levels prominently
  - Provide disclaimers about forecast limitations
  - Allow users to adjust forecast parameters
  - Show historical forecast accuracy when available