# Response Concentration Troubleshooting Guide

## Overview

This document provides **comprehensive troubleshooting guidance** for the Response Concentration section, with special focus on the **color synchronization system**. This guide is essential for diagnosing and fixing issues with the real-time color updates between the MiniPlot and main visualization chart.

## Critical System Components

### 1. Color Synchronization Chain
```
QuadrantAssignmentContext → ResponseConcentrationSection → MiniPlot
        ↓                           ↓                        ↓
   Color decisions            Color function           Color rendering
```

### 2. Key Files to Check
- `ResponseConcentrationSection/index.tsx` - Context integration and color function
- `MiniPlot/index.tsx` - Color prop usage and rendering
- `QuadrantAssignmentContext.tsx` - Source of truth (DO NOT MODIFY)

## Common Issues and Solutions

### Issue 1: Colors Not Synchronizing Between Main Chart and MiniPlot

**Symptoms:**
- MiniPlot shows different colors than main visualization
- Manual reassignments work in main chart but not reflected in MiniPlot
- Midpoint changes don't update MiniPlot colors

**Root Causes & Solutions:**

#### Cause A: Missing Context Integration
**Check:** Is `useQuadrantAssignment()` imported and used?

```typescript
// WRONG - No context integration
import React, { useState, useEffect } from 'react';

// CORRECT - Context integration
import { useQuadrantAssignment } from '../../../visualization/context/QuadrantAssignmentContext';

const { getQuadrantForPoint, midpoint, manualAssignments } = useQuadrantAssignment();
```

**Debug Steps:**
1. Check browser console for context connection logs:
   ```
   🔥 CONTEXT CONNECTED - midpoint: Object { sat: 4, loy: 5 }
   ```
2. If missing, verify import path and context provider wrapping

#### Cause B: Missing Color Function Prop
**Check:** Is `getPointColor` prop passed to MiniPlot?

```typescript
// WRONG - No color function prop
<MiniPlot 
  combinations={filteredData}
  satisfactionScale={report.satisfactionScale}
  loyaltyScale={report.loyaltyScale}
/>

// CORRECT - Color function prop provided
<MiniPlot 
  combinations={filteredData}
  satisfactionScale={report.satisfactionScale}
  loyaltyScale={report.loyaltyScale}
  getPointColor={getPointColor}  // ← CRITICAL
/>
```

**Debug Steps:**
1. Check MiniPlot component for color function usage:
   ```typescript
   console.log("Color function provided:", !!getPointColor);
   ```
2. Verify the function is being called:
   ```
   🔥 getPointColor CALLED for point: 4 6
   ```

#### Cause C: Incorrect useEffect Dependencies
**Check:** Are the dependency arrays watching the right values?

```typescript
// WRONG - Size-based dependency misses reassignments
}, [manualAssignments.size]);

// CORRECT - Content-based dependency catches all changes
}, [Array.from(manualAssignments.entries()).join(',')]);
```

**Debug Steps:**
1. Check for useEffect trigger logs:
   ```
   🔥 useEffect TRIGGERED - dependency changed!
   ```
2. Verify complete dependency array:
   ```typescript
   }, [
     originalData,
     settings.miniPlot.frequencyThreshold,
     settings.miniPlot.showTiers,
     settings.miniPlot.maxTiers,
     midpoint.sat,                                    // ✓ Midpoint changes
     midpoint.loy,                                    // ✓ Midpoint changes
     Array.from(manualAssignments.entries()).join(',') // ✓ Manual assignments
   ]);
   ```

### Issue 2: Manual Assignments Not Working

**Symptoms:**
- Manual reassignments in main chart don't affect MiniPlot
- Context logs show manual assignments exist but MiniPlot ignores them
- Midpoint changes work but manual assignments don't

**Root Causes & Solutions:**

#### Cause A: Using Temp Points Instead of Real Points
**Check:** Is the color function using real point IDs?

```typescript
// WRONG - Always creates temp points
const getPointColor = (satisfaction: number, loyalty: number) => {
  const tempPoint = { id: `temp-${satisfaction}-${loyalty}`, ... };
  return getQuadrantForPoint(tempPoint); // Context can't find manual assignments
};

// CORRECT - Prioritizes real points
const getPointColor = (satisfaction: number, loyalty: number) => {
  const candidatePoints = originalData.filter(p => 
    p.satisfaction === satisfaction && p.loyalty === loyalty && !p.excluded
  );
  
  const realPoint = candidatePoints.find(p => manualAssignments.has(p.id)) || candidatePoints[0];
  
  if (realPoint) {
    return getQuadrantForPoint(realPoint); // Context finds manual assignments
  }
  // Fallback to temp point only if no real points exist
};
```

**Debug Steps:**
1. Check what point ID is being used:
   ```
   🔥 Context returned quadrant: mercenaries for point: segmentorID-00008
   ```
2. Verify manual assignment lookup in context:
   ```
   🔍 About to check manual assignments - map has segmentorID-00008: true
   ```

#### Cause B: ID Mismatch
**Check:** Do the point IDs match between manual assignments and queries?

**Debug Steps:**
1. Log manual assignments content:
   ```typescript
   console.log("Manual assignments:", Array.from(manualAssignments.entries()));
   // Should show: [["segmentorID-00008", "mercenaries"]]
   ```
2. Log point being queried:
   ```typescript
   console.log("Querying point:", realPoint?.id);
   // Should show: segmentorID-00008 (not temp-4-6)
   ```

### Issue 3: Performance Problems

**Symptoms:**
- Slow updates when making changes
- UI lag during midpoint dragging
- Memory usage growing over time

**Root Causes & Solutions:**

#### Cause A: Missing Memoization
**Check:** Are expensive calculations properly memoized?

```typescript
// Add memoization for color function if needed
const getPointColor = useCallback((satisfaction: number, loyalty: number) => {
  // Color logic here
}, [manualAssignments, midpoint.sat, midpoint.loy, originalData]);
```

#### Cause B: Too Many Re-renders
**Check:** Are dependencies causing unnecessary re-renders?

**Debug Steps:**
1. Add render logging:
   ```typescript
   console.log("🔄 ResponseConcentrationSection render");
   ```
2. Check if renders match actual changes

#### Cause C: Large Dataset Issues
**Check:** Is the dataset size causing performance problems?

**Solutions:**
1. **Debounce updates** for large datasets:
   ```typescript
   const debouncedUpdate = useMemo(
     () => debounce((data) => {
       const combinations = getEnhancedCombinations(data);
       setFilteredData(combinations);
     }, 300),
     []
   );
   ```

2. **Limit combination count**:
   ```typescript
   const limitedCombinations = filteredData.slice(0, 50);
   ```

### Issue 4: Scale and Positioning Problems

**Symptoms:**
- Points positioned incorrectly
- Scale ticks don't match data range
- Average position appears in wrong location

**Root Causes & Solutions:**

#### Cause A: Invalid Scale Format
**Check:** Are scale props in correct "min-max" format?

```typescript
// CORRECT formats
satisfactionScale="1-5"
loyaltyScale="0-10"

// WRONG formats
satisfactionScale="1 to 5"
satisfactionScale="1,2,3,4,5"
```

#### Cause B: Position Calculation Errors
**Check:** Is the position calculation handling scale ranges correctly?

```typescript
// Verify position calculation
const [satisfactionMin, satisfactionMax] = satisfactionScale.split('-').map(Number);
const [loyaltyMin, loyaltyMax] = loyaltyScale.split('-').map(Number);

const x = (combo.satisfaction - satisfactionMin) / (satisfactionMax - satisfactionMin) * 100;
const y = (combo.loyalty - loyaltyMin) / (loyaltyMax - loyaltyMin) * 100;
```

### Issue 5: Missing or Incorrect Visual Elements

**Symptoms:**
- Average position dot not showing
- Tier styling not applied
- Grid lines missing or misaligned

**Root Causes & Solutions:**

#### Cause A: Premium Feature Access
**Check:** Is premium status correctly passed for premium features?

```typescript
// Verify premium status
console.log("Premium status:", isPremium);
console.log("Show average dot setting:", settings.miniPlot.showAverageDot);
```

#### Cause B: CSS Class Issues
**Check:** Are tier classes being applied correctly?

```typescript
// Debug tier class application
const pointClasses = [
  'mini-plot-point',
  combo.tier ? `mini-plot-point--tier${combo.tier}` : ''
].filter(Boolean).join(' ');

console.log("Point classes:", pointClasses);
```

## Debugging Workflow

### Step 1: Verify Context Connection
```typescript
// Add to ResponseConcentrationSection
console.log("🔍 Context status:", {
  connected: !!getQuadrantForPoint,
  midpoint: midpoint,
  manualAssignmentsCount: manualAssignments.size
});
```

**Expected Output:**
```
🔍 Context status: {
  connected: true,
  midpoint: { sat: 4, loy: 5 },
  manualAssignmentsCount: 1
}
```

### Step 2: Verify Color Function Flow
```typescript
// Add to getPointColor function
const getPointColor = (satisfaction: number, loyalty: number): string => {
  console.log("🎨 Color request for:", satisfaction, loyalty);
  
  const candidatePoints = originalData.filter(p => 
    p.satisfaction === satisfaction && p.loyalty === loyalty && !p.excluded
  );
  console.log("🎨 Candidate points:", candidatePoints.length);
  
  const realPoint = candidatePoints.find(p => manualAssignments.has(p.id)) || candidatePoints[0];
  console.log("🎨 Using point:", realPoint?.id || "temp");
  
  if (realPoint) {
    const quadrant = getQuadrantForPoint(realPoint);
    console.log("🎨 Quadrant result:", quadrant);
    return mapQuadrantToColor(quadrant);
  }
  
  // Fallback logic...
};
```

### Step 3: Verify MiniPlot Integration
```typescript
// Add to MiniPlot component
const getPointColorFinal = (satisfaction: number, loyalty: number) => {
  console.log("🖼️ MiniPlot color request:", satisfaction, loyalty);
  
  if (getPointColor) {
    const color = getPointColor(satisfaction, loyalty);
    console.log("🖼️ Received color:", color);
    return color;
  }
  
  console.log("🖼️ Using fallback color");
  return fallbackLogic();
};
```

### Step 4: Verify Effect Triggering
```typescript
// Add to useEffect
useEffect(() => {
  console.log("🔄 Effect triggered by dependency change");
  console.log("🔄 Current dependencies:", {
    dataLength: originalData.length,
    midpoint: `${midpoint.sat},${midpoint.loy}`,
    manualAssignments: Array.from(manualAssignments.entries()).join(',')
  });
  
  // Rest of effect logic...
}, [
  originalData,
  // ... other dependencies
  midpoint.sat,
  midpoint.loy,
  Array.from(manualAssignments.entries()).join(',')
]);
```

## Diagnostic Tools

### Console Log Patterns

**Successful Color Sync Pattern:**
```
🔥 CONTEXT CONNECTED - midpoint: Object { sat: 4, loy: 5 }
🔥 useEffect TRIGGERED - dependency changed!
🔥 getPointColor CALLED for point: 4 6
🎨 Candidate points: 2
🎨 Using point: segmentorID-00008
🔍 About to check manual assignments - map has segmentorID-00008: true
🔧 MANUAL ASSIGNMENT: Point segmentorID-00008 (4,6) manually assigned to mercenaries
🎨 Quadrant result: mercenaries
🖼️ Received color: #FF9800
```

**Failed Color Sync Pattern:**
```
🔥 CONTEXT CONNECTED - midpoint: Object { sat: 4, loy: 5 }
❌ useEffect TRIGGERED - dependency changed! (Missing)
❌ getPointColor CALLED for point: 4 6 (Missing)
🖼️ Using fallback color
```

### Browser DevTools Checklist

1. **Console Tab:**
   - Look for debug logs matching patterns above
   - Check for React warnings or errors
   - Verify context connection messages

2. **React DevTools:**
   - Check QuadrantAssignmentProvider is wrapping components
   - Verify context values are updating
   - Monitor component re-renders

3. **Elements Tab:**
   - Inspect MiniPlot point elements for correct colors
   - Verify CSS classes are applied correctly
   - Check style attributes for expected values

### Code Review Checklist

**ResponseConcentrationSection/index.tsx:**
- [ ] Context import present
- [ ] `useQuadrantAssignment()` hook used
- [ ] Color function implements real point logic
- [ ] `getPointColor` prop passed to MiniPlot
- [ ] useEffect dependencies include all context values

**MiniPlot/index.tsx:**
- [ ] `getPointColor` prop type defined
- [ ] Color function used in `getPointColorFinal`
- [ ] Fallback logic present but not primary
- [ ] Point rendering uses color function result

## Emergency Fixes

### Quick Fix 1: Force Re-render
If colors are stuck, force component re-render:

```typescript
// Add to ResponseConcentrationSection
const [, forceUpdate] = useReducer(x => x + 1, 0);

// Call when needed
const handleForceUpdate = () => {
  console.log("🔄 Forcing update");
  forceUpdate();
};
```

### Quick Fix 2: Reset Context Connection
If context seems disconnected:

```typescript
// Add key prop to force re-mount
<ResponseConcentrationSection 
  key={`${midpoint.sat}-${midpoint.loy}-${manualAssignments.size}`}
  {...props}
/>
```

### Quick Fix 3: Verify Data Integrity
If color lookups fail:

```typescript
// Add data validation
const validateData = () => {
  console.log("🔍 Data validation:", {
    originalDataCount: originalData.length,
    filteredDataCount: filteredData.length,
    manualAssignmentsCount: manualAssignments.size,
    samplePoint: originalData[0]
  });
};
```

## Prevention Strategies

### Code Quality Guidelines

**1. Always Use TypeScript**
```typescript
// Enforce proper types to prevent runtime errors
interface ColorFunction {
  (satisfaction: number, loyalty: number): string;
}

const getPointColor: ColorFunction = (satisfaction, loyalty) => {
  // Implementation with type safety
};
```

**2. Implement Proper Error Boundaries**
```typescript
class ColorSyncErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Color sync error:", error, errorInfo);
    // Log to monitoring service
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Color synchronization error. Please refresh.</div>;
    }
    
    return this.props.children;
  }
}
```

**3. Add Comprehensive Logging**
```typescript
const createDebugLogger = (component: string) => ({
  log: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${component}] ${message}`, data);
    }
  },
  error: (message: string, error?: any) => {
    console.error(`[${component}] ERROR: ${message}`, error);
  }
});
```

### Testing Strategies

**1. Unit Tests for Color Function**
```typescript
describe('getPointColor', () => {
  it('uses real point when available', () => {
    const mockOriginalData = [
      { id: 'real-1', satisfaction: 4, loyalty: 6, excluded: false }
    ];
    const mockManualAssignments = new Map([['real-1', 'mercenaries']]);
    
    const color = getPointColor(4, 6);
    
    expect(mockGetQuadrantForPoint).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'real-1' })
    );
  });
  
  it('falls back to temp point when no real point exists', () => {
    const mockOriginalData = [];
    
    const color = getPointColor(4, 6);
    
    expect(mockGetQuadrantForPoint).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'temp-4-6' })
    );
  });
});
```

**2. Integration Tests**
```typescript
describe('Color Synchronization Integration', () => {
  it('updates MiniPlot when midpoint changes', async () => {
    render(<TestWrapper />);
    
    // Change midpoint
    fireEvent.dragEnd(screen.getByTestId('midpoint-handle'), {
      clientX: 100,
      clientY: 100
    });
    
    // Wait for updates
    await waitFor(() => {
      expect(screen.getByTestId('miniplot-point-4-6')).toHaveStyle({
        backgroundColor: '#FF9800'
      });
    });
  });
  
  it('updates MiniPlot when manual assignment changes', async () => {
    render(<TestWrapper />);
    
    // Manual reassignment
    fireEvent.rightClick(screen.getByTestId('chart-point-4-6'));
    fireEvent.click(screen.getByText('Assign to Mercenaries'));
    
    await waitFor(() => {
      expect(screen.getByTestId('miniplot-point-4-6')).toHaveStyle({
        backgroundColor: '#FF9800'
      });
    });
  });
});
```

**3. End-to-End Tests**
```typescript
// Cypress/Playwright test
describe('Color Synchronization E2E', () => {
  it('maintains color consistency across all visualizations', () => {
    cy.visit('/segmentor');
    
    // Change midpoint
    cy.get('[data-testid="midpoint-handle"]').drag(100, 100);
    
    // Verify main chart color
    cy.get('[data-testid="chart-point-4-6"]')
      .should('have.css', 'background-color', 'rgb(255, 152, 0)');
    
    // Verify MiniPlot color
    cy.get('[data-testid="miniplot-point-4-6"]')
      .should('have.css', 'background-color', 'rgb(255, 152, 0)');
    
    // Verify frequent responses list color
    cy.get('[data-testid="frequent-response-4-6"]')
      .should('have.css', 'background-color', 'rgb(255, 152, 0)');
  });
});
```

## Monitoring and Alerts

### Production Monitoring

**1. Error Tracking**
```typescript
// Add to production code
const trackColorSyncError = (error: Error, context: any) => {
  // Log to monitoring service (e.g., Sentry, LogRocket)
  console.error('Color sync error:', {
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};
```

**2. Performance Monitoring**
```typescript
// Monitor color function performance
const measureColorFunction = (fn: Function, name: string) => {
  return (...args: any[]) => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    
    if (end - start > 10) { // Warn if takes more than 10ms
      console.warn(`${name} took ${end - start}ms`);
    }
    
    return result;
  };
};

const getPointColor = measureColorFunction(originalGetPointColor, 'getPointColor');
```

**3. Health Checks**
```typescript
// Regular health check for color system
const performColorSyncHealthCheck = () => {
  const healthMetrics = {
    contextConnected: !!getQuadrantForPoint,
    manualAssignmentsCount: manualAssignments.size,
    midpointValid: !isNaN(midpoint.sat) && !isNaN(midpoint.loy),
    dataValid: originalData.length > 0,
    timestamp: Date.now()
  };
  
  // Send to monitoring service
  return healthMetrics;
};
```

## Documentation Requirements

### Change Documentation Template

When making changes to the color system, document:

```markdown
## Color System Change

**Date:** [YYYY-MM-DD]
**Author:** [Name]
**Change Type:** [Bug Fix / Enhancement / Refactor]

### What Changed
- Specific files modified
- Functions/components affected
- Dependencies updated

### Why Changed
- Problem being solved
- Requirements driving change
- Performance considerations

### Testing Performed
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing scenarios completed
- [ ] Performance testing done

### Rollback Plan
- How to revert changes
- Dependencies to consider
- Backup procedures

### Monitoring Plan
- Metrics to watch
- Error conditions to monitor
- Success criteria
```

### Code Comments Requirements

```typescript
/**
 * CRITICAL: Color synchronization function
 * 
 * This function ensures MiniPlot colors stay synchronized with the main chart
 * by using real point IDs when available to properly lookup manual assignments.
 * 
 * @param satisfaction - X coordinate value
 * @param loyalty - Y coordinate value
 * @returns Color string for the point at these coordinates
 * 
 * MAINTENANCE NOTES:
 * - Always prioritize real points over temp points
 * - Manual assignments are keyed by real point IDs
 * - Context changes trigger automatic re-evaluation
 * - Do NOT modify without testing all three scenarios:
 *   1. Midpoint changes
 *   2. Manual reassignments  
 *   3. Data additions
 */
const getPointColor = (satisfaction: number, loyalty: number): string => {
  // Implementation...
};
```

## Escalation Procedures

### When to Escalate

**Level 1 (Minor):** Self-resolvable issues
- Single user report
- Workaround available
- Non-critical functionality

**Level 2 (Major):** Requires team attention
- Multiple user reports
- No workaround available
- Affects core functionality

**Level 3 (Critical):** Immediate response required
- System-wide color sync failure
- Data corruption risk
- Production outage

### Escalation Steps

1. **Immediate Assessment** (5 minutes)
   - Reproduce the issue
   - Check monitoring dashboards
   - Verify system health

2. **Quick Fixes** (15 minutes)
   - Try emergency fixes listed above
   - Check for recent deployments
   - Rollback if necessary

3. **Deep Investigation** (1 hour)
   - Full debugging workflow
   - Code review of recent changes
   - Log analysis

4. **Resolution Planning** (4 hours)
   - Root cause analysis
   - Permanent fix development
   - Testing plan creation

## Conclusion

The color synchronization system is a **critical component** that requires careful attention to detail and thorough testing. This troubleshooting guide provides the tools and procedures necessary to diagnose and resolve issues quickly and effectively.

**Key Reminders:**
- **Context integration is mandatory** for color synchronization
- **Real point IDs must be prioritized** over temp points
- **Dependency arrays must include content-based tracking** for manual assignments
- **Comprehensive testing is essential** for all change scenarios

When in doubt, follow the debugging workflow systematically and don't hesitate to use the emergency fixes to restore functionality while investigating root causes.

**Remember:** The color synchronization system represents months of development work and provides critical user experience consistency. Treat it with the care and attention it deserves.