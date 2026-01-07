# Proximity Analysis Rules - Complete Reference Guide (Updated 2025)

## Overview
This document provides the authoritative reference for proximity analysis calculations in the customer segmentation tool, incorporating all recent system updates including terminology changes, visual improvements, and enhanced high-impact detection methods.

---

## Core Proximity Rules

### Rule 1: Lateral Proximity Thresholds
- **1-3 scales**: ❌ No proximity analysis (scale too small for meaningful boundaries)
- **All other scales**: ✅ **Fixed threshold of 2.0** for all lateral proximity relationships
- **Distance calculation**: Single-dimension absolute distance to quadrant boundaries (measures distance in one direction only: either satisfaction OR loyalty, not both)
- **Threshold application**: Customers within 2.0 distance qualify for proximity

### Rule 2: Two-Step Process for Lateral Proximity
- **Step 1**: Calculate potential search area using space cap rules
- **Step 2**: Apply distance threshold (2.0) and other qualification filters
- **Space cap rules**: ≤3 positions available → 1 position qualifies, >3 positions → 2 positions qualify
- **Distance metric**: Single-dimension absolute distance to quadrant boundaries

### Rule 2.5: Space Cap Application for Lateral Proximity
- **Space cap applied only to relevant dimension** (the dimension used for distance calculation)
- **Irrelevant dimension**: All available positions included (no space cap)
- **Examples**:
  - **Mercenaries → Defectors**: Space cap applied to satisfaction dimension only
  - **Mercenaries → Loyalists**: Space cap applied to loyalty dimension only
- **Reasoning**: Lateral proximity measures distance in one direction only

### Rule 3: Special Zone Constraint  
- **Stop at any other area boundary** (apostles, near-apostles, terrorists)
- **Special zones take precedence** - if you hit a special zone before reaching threshold, the special zone wins

### Rule 4: Multiple Classifications Allowed for Quadrant Boundaries
- ✅ **A customer can be close to multiple quadrant boundaries simultaneously** 
- Example: Loyalist at (3.0, 6.0) can be both "nearly hostages" AND "nearly mercenaries"
- **Corner customers = highest strategic value** (flagged for multiple proximity types)

### Rule 5: Subset Relationship
- **"Nearly" customers are always a subset of their main quadrant**
- Example: "Loyalists nearly mercenaries" are still loyalists, just at risk of moving

---

## Special Zone Proximity Rules

### Rule 6: Special Zone Distance Calculation
- **Maximum distance**: 1 position Chebyshev distance only
- **Example**: If apostles zone is at (4,4), proximity includes positions (3,3), (3,4), (3,5), (4,3), (4,5), (5,3), (5,4), (5,5)
- **Scale constraints**: No proximity analysis for scales 1-3 (too small)

### Rule 7: Special Zone Exclusion Logic
- **CRITICAL**: Exclude customers already in the target special zone
- **Example**: For "loyalists_nearly_apostles", exclude customers already classified as apostles
- **Reason**: Apostles cannot be "loyalists nearly apostles" - they ARE apostles

### Rule 8: Boundary Conflict Exclusion
- **Customers cannot be in multiple special zone proximity relationships simultaneously**
- **Exclusion priority order**:
  1. **Quadrant boundary proximity** (loyalists near mercenaries/hostages) - HIGHEST PRIORITY
  2. **Special zone proximity** (loyalists near apostles/terrorists) - LOWER PRIORITY
  3. **Near-special-zone proximity** (loyalists near near-apostles) - LOWEST PRIORITY

### Rule 9: Size-Aware Special Zone Analysis
- **Variable zone sizes supported**: 1x1, 2x2, 3x3, etc.
- **Proximity definition**: 1 Chebyshev distance from zone perimeter (not center)
- **Example**: 2x2 apostles zone at (4,4)-(5,5) has proximity boundary around entire perimeter

### Rule 10: Activation Conditions
- **showSpecialZones**: Must be true to calculate any special zone proximity
- **showNearApostles**: Must be true to calculate near-apostles proximity
- **Scale requirements**: Same as quadrant proximity (≥4 scales)

---

## Enhanced High-Impact Detection

### Rule 11: High-Impact Customer Identification
- **Crossroads customers**: Multiple proximity relationships (highest priority)
- **Strategic threshold**: Configurable percentage for strategic indicator display
- **Visual priority**: Corner/edge customers get enhanced visual indicators
- **Business value**: Focus attention on customers with highest movement risk/opportunity

### Rule 12: Detection Method Selection
- **Method 1: Conservative** - Only customers very close to boundaries
- **Method 2: Moderate** - Balanced approach for general analysis  
- **Method 3: Sensitive** - Broader net for early warning detection
- **Premium feature**: Method selection available in settings

---

## Terminology Updates (2025)

### Updated Language
- **"Near" → "Nearly"** in all proximity descriptions
- **"Close to" → "Nearly"** for consistency
- **"At risk" → "Nearly [boundary]"** for specific positioning

### Visual Indicators
- **Color coding**: Yellow/orange for proximity warnings
- **Icon system**: ⚠️ for high-impact, 📍 for standard proximity
- **Grouping**: Proximity customers grouped separately in reports

---

## Processing Flow

### Step-by-Step Implementation
1. **Context assignment**: QuadrantAssignmentContext assigns customers to quadrants/zones
2. **Proximity filtering**: Apply geometric proximity rules to assigned groups
3. **High-impact detection**: Apply selected detection method to identify significant relationships
4. **Display formatting**: Present results with appropriate visual indicators and grouping

---

## Testing and Validation

### Expected Behavior Validation
- [ ] Proximity numbers ≤ main quadrant totals (subset relationship maintained)
- [ ] Numbers change appropriately when moving midpoint significantly  
- [ ] Scale changes update thresholds correctly
- [ ] Manual customer reassignments affect proximity calculations
- [ ] Special zones affect proximity calculations when enabled
- [ ] Area mode changes show correct conditional relationships

### Edge Case Handling
- [ ] Empty quadrants show 0 proximity relationships
- [ ] Very small scales (1-3) show "proximity unavailable"
- [ ] Mid-position midpoints (like 3.5) work correctly
- [ ] Maximum distance caps apply consistently
- [ ] Boundary conflicts resolve according to priority rules

### Red Flags (Indicate Implementation Issues)
- ❌ Proximity numbers > main quadrant totals
- ❌ Numbers unchanged when moving midpoint significantly
- ❌ All customers marked as "nearly boundary" (threshold too high)
- ❌ Numbers unchanged when manually reassigning customers
- ❌ Multiple special zone proximity relationships for same customer
- ❌ Both loyalists_nearly_apostles AND loyalists_nearly_near_apostles displaying simultaneously

### Success Indicators
- ✅ Clean conditional display (one relationship type per customer per context)
- ✅ Proximity calculations adapt automatically to zone size changes
- ✅ Strategic customer intelligence without UI clutter or logical contradictions
- ✅ Meaningful business insights that guide actionable decisions
- ✅ Professional, scannable interface that supports decision-making

---

## Business Value and Strategic Application

### Strategic Intelligence Provided
1. **Risk Identification**: Customers at risk of negative movement (warnings)
2. **Opportunity Recognition**: Customers positioned for positive advancement (opportunities)  
3. **Priority Targeting**: High-impact relationships deserving immediate attention
4. **Resource Allocation**: Focus limited resources on customers with highest movement potential
5. **Preventive Action**: Early warning system for customer satisfaction/loyalty issues

### Practical Business Actions
- **Nearly Mercenaries**: Implement loyalty programs, increase switching costs
- **Nearly Hostages**: Address satisfaction issues, improve service delivery
- **Nearly Apostles**: Nurture advocacy potential, leverage for referrals
- **Nearly Terrorists**: Damage control, prevent negative word-of-mouth

### ROI Through Strategic Focus
- **Targeted interventions** vs. broad-brush approaches
- **Preventive measures** vs. reactive damage control  
- **Resource efficiency** through priority-driven action planning
- **Measurable outcomes** through proximity trend tracking over time