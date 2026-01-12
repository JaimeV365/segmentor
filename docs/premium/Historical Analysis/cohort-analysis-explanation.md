# Cohort Analysis Explanation

## What is Cohort Analysis?

Cohort analysis groups customers based on when they first entered your system (or a specific time period) and tracks how their behavior changes over time. It's like following a group of people who started a journey together and seeing where they end up.

## Why It's Valuable for Historical Progress

Cohort analysis helps you understand:
- **Customer retention** - Are customers staying engaged?
- **Customer evolution** - How do customers change over time?
- **Impact of changes** - Did a new initiative affect different customer groups differently?

## Three Types of Cohorts for Historical Progress

### 1. Retained Customers (Most Important)

**Definition:** Customers who appear in both an earlier period AND a later period.

**What it shows:**
- How existing customers are changing
- Are they improving (moving to better quadrants)?
- Are they declining (moving to worse quadrants)?
- Overall health of your customer base

**Example:**
```
Period 1 (January): Customer A is a Mercenary
Period 2 (February): Customer A is still a Mercenary (retained, stable)
Period 3 (March): Customer A is now a Loyalist (retained, improved!)
```

**Value:**
- Shows if your retention efforts are working
- Identifies which customers are improving vs declining
- Helps prioritize which retained customers need attention

### 2. New Customers

**Definition:** Customers who appear in a later period but NOT in an earlier period.

**What it shows:**
- Quality of new customer acquisition
- Are new customers starting in better or worse positions?
- How new customers compare to existing ones

**Example:**
```
Period 1 (January): No Customer B
Period 2 (February): Customer B appears as a Hostage (new customer)
Period 3 (March): Customer B is still a Hostage (new, but not improving)
```

**Value:**
- Understand if acquisition quality is improving
- Identify if new customers need different onboarding
- Compare new vs retained customer trajectories

### 3. Lost Customers

**Definition:** Customers who appear in an earlier period but NOT in a later period.

**What it shows:**
- Customer churn/attrition
- Which customers you're losing
- Patterns in who leaves (which quadrants lose the most?)

**Example:**
```
Period 1 (January): Customer C is a Defector
Period 2 (February): Customer C is still a Defector
Period 3 (March): Customer C is gone (lost customer)
```

**Value:**
- Identify churn patterns
- Understand which customer types you're losing
- Early warning system for customer retention issues

## How It Works in Practice

### Example Scenario:

**January Data:**
- 100 customers total
- 20 Loyalists, 30 Mercenaries, 25 Hostages, 25 Defectors

**February Data:**
- 120 customers total
- **Retained:** 80 customers (from January)
- **New:** 40 customers (not in January)
- **Lost:** 20 customers (in January, not in February)

**Analysis:**
- **Retained Analysis:** Of the 80 retained:
  - 15 improved (moved to better quadrant)
  - 10 declined (moved to worse quadrant)
  - 55 stayed the same
  
- **New Analysis:** Of the 40 new:
  - 5 started as Apostles (great!)
  - 10 started as Defectors (concerning)
  - 25 started as Mercenaries/Hostages (neutral)

- **Lost Analysis:** Of the 20 lost:
  - 12 were Defectors (expected - they were already leaving)
  - 5 were Hostages (concerning - losing unhappy customers)
  - 3 were Mercenaries (concerning - losing price-sensitive customers)

## Visual Representation

### Cohort Comparison Table:

```
                    January    February   Change
Retained (80)       100%       67%       -33% (some left)
  ├─ Improved        0%        19%       +19%
  ├─ Declined        0%        13%       -13%
  └─ Stable         100%       69%       -31%

New (40)             0%        33%       +33%
  ├─ Started Well    0%        13%       +13%
  └─ Started Poor     0%        20%       +20%

Lost (20)           20%         0%       -20%
  ├─ Defectors       12%        0%       -12%
  └─ Others          8%        0%        -8%
```

## Business Value

### For Decision Making:

1. **Retention Strategy:**
   - Focus on retained customers who are declining
   - Celebrate and learn from retained customers who improved

2. **Acquisition Strategy:**
   - If new customers start poorly → improve onboarding
   - If new customers start well → maintain acquisition quality

3. **Churn Prevention:**
   - Identify which customer types are leaving
   - Create targeted retention programs

## Implementation in Historical Progress Report

### What to Show:

1. **Cohort Summary Card:**
   - Total retained, new, lost counts
   - Percentage breakdown
   - Period-over-period comparison

2. **Retained Customer Analysis:**
   - Movement matrix (from quadrant → to quadrant)
   - Improvement rate (% who improved)
   - Decline rate (% who declined)

3. **New Customer Analysis:**
   - Starting quadrant distribution
   - Comparison to previous period's new customers

4. **Lost Customer Analysis:**
   - Which quadrants lost the most
   - Churn rate by quadrant
   - Warning indicators

### When to Show:

- **Minimum requirement:** At least 2 time periods with data
- **Best results:** 3+ time periods for meaningful trends
- **Premium feature:** Full cohort analysis with detailed breakdowns

## Example Use Case

**Scenario:** You launched a new customer service initiative in February.

**Cohort Analysis Shows:**
- **Retained customers:** 15% improvement rate (up from 10% in previous period)
  - ✅ Initiative is working for existing customers!
  
- **New customers:** 20% start as Defectors (up from 15%)
  - ⚠️ Acquisition quality declined - investigate marketing

- **Lost customers:** 5% churn from Hostages (down from 8%)
  - ✅ Initiative reduced churn from unhappy customers

**Action:** Double down on customer service, but review acquisition strategy.

---

**Summary:** Cohort analysis helps you understand not just WHAT changed, but WHO changed and WHY, enabling targeted, data-driven decisions.
