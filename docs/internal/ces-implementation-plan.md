# CES (Customer Effort Score) Implementation Plan

**Created:** February 2026  
**Last Updated:** February 7, 2026  
**Status:** Planning  
**Priority:** Medium

---

## Overview

Customer Effort Score (CES) is a customer experience metric that measures how easy it was for customers to interact with a company. This document outlines the plan to support CES data in Segmentor, along with a broader improvement to how field mapping works during CSV import.

---

## What is CES?

CES measures effort/ease of interaction, typically asked as:
- "How easy was it to [resolve your issue / complete your purchase]?"
- "To what extent do you agree: The company made it easy to handle my issue"

### Typical CES Scales

| Scale | Description | Common Usage |
|-------|-------------|--------------|
| **1-5** | Very Difficult → Very Easy | Simple surveys |
| **1-7** | Strongly Disagree → Strongly Agree | CES 2.0 (most common) |
| **1-10** | Low effort → High effort | Less common |

---

## Where CES Fits in Segmentor

### Theoretical Basis

**CES belongs on the Satisfaction axis**, not Loyalty.

There is an important distinction between what a metric *measures* (its construct) and what it *predicts* (its outcome):

| Metric | What it *measures* | What it *predicts* |
|--------|--------------------|--------------------|
| NPS | Recommendation intent (loyalty construct) | Growth, retention |
| CSAT | Overall happiness (satisfaction construct) | Varies |
| CES | Effort/ease (process quality construct) | Loyalty, churn |

CES was introduced by Dixon, Freeman, and Toman (2010, HBR: "Stop Trying to Delight Your Customers") as a **loyalty predictor** — their finding was that reducing effort predicts loyalty better than increasing delight. However, what CES *measures* is experience quality ("How easy was this?"), which is a satisfaction-family construct:

- CES captures something the customer **felt during the experience** (backward-looking)
- NPS captures what the customer **intends to do next** (forward-looking)
- These are genuinely different constructs

**Analogy:** Body temperature predicts infection, but a thermometer isn't measuring infection — it's measuring temperature. CES is a "thermometer" for process quality that happens to predict loyalty well.

### Axis Assignment Rules (No Cross-Axis Interchangeability)

The Apostles Model's diagnostic power comes from crossing two *different* constructs. If both axes measure the same family of construct, data clusters along the diagonal and the quadrants lose meaning.

**Satisfaction axis accepts** (experience quality metrics):
- Satisfaction, CSAT, CES, Effort

**Loyalty axis accepts** (behavioral intention metrics):
- Loyalty, recommendation likelihood, repurchase intent, (and NPS via user's own header)

These are **separate pools**. A metric from one pool cannot be assigned to the other axis. This is not a limitation of Segmentor — it is a requirement of the Apostles Model itself.

### CES Is Not Exactly Satisfaction

CES is a narrower construct than general satisfaction. A customer can find an interaction effortless but still be dissatisfied with the product itself. This is why CES should display as "CES" in the UI, not as "Satisfaction" — it's accurate and respectful of what the data represents.

### Two Ways to Use CES

| Approach | How to Upload | Result |
|----------|---------------|--------|
| **CES as satisfaction metric** | Upload CES with header like `CES:1-7` | CES mapped to the satisfaction axis; all labels display "CES" |
| **CES as additional data only** | Upload CES as an additional column (e.g., `CES` without scale suffix) | CES available in data details, but not used for an axis |

---

## Implementation Phases

### Phase 1: Accept CES Header Terms (Quick Win)
**Complexity:** Low  
**Files to modify:**
- `src/components/data-entry/forms/CSVImport/utils/strictScaleValidator.ts`

**Changes:**
- Add "ces" and "effort" to the satisfaction header search terms
- Currently searches for: `['sat', 'csat', 'satisfaction']`
- New search: `['sat', 'csat', 'satisfaction', 'ces', 'effort']`

**Considerations:**
- "Effort" scale is often inverted (1 = low effort = good, or 1 = high effort = bad)
- Document that Segmentor expects higher values = better (consistent with satisfaction)

---

### Phase 2: Data Mapping Card (Field Assignment UX)
**Complexity:** Medium-High  
**Files to modify:**
- CSV import component
- New mapping card component
- Validation/parsing utilities

**Replaces the old "Phase 3: Conflict Resolution Dialog"** with a more comprehensive approach that handles all scenarios in one unified component.

#### The Problem

Currently, when Segmentor cannot auto-detect a satisfaction or loyalty column, it shows an error and stops. This is the most common point where users abandon the tool — many have valid data but use non-standard column names (e.g., `Q7_rating`, `recommendation_score`, `ease_of_use`).

#### The Solution: Contextual Field Assignment Card

A single, compact dialog that appears **after CSV parsing, before data loads** into the tool. It acts as a "pre-flight check" — the system shows what it found and asks for help where needed.

**Import flow sequence:**
1. User selects/drops CSV file
2. System parses headers and values
3. **Mapping card appears** (auto-filled where possible, asking where needed)
4. User confirms or adjusts
5. Data loads into Segmentor

#### Scenarios Handled

| Scenario | Satisfaction | Loyalty | What user sees |
|----------|-------------|---------|----------------|
| A | Auto-detected | Auto-detected | Brief confirmation (or skip) |
| B | Auto-detected | **Not found** | Prompt for loyalty only |
| C | **Not found** | Auto-detected | Prompt for satisfaction only |
| D | **Not found** | **Not found** | Prompt for both |
| E | **Two candidates** | Auto-detected | Disambiguation for satisfaction |
| F | Auto-detected | **Two candidates** | Disambiguation for loyalty |

All scenarios use the **same component** with different states per row.

#### Row States

**State 1 — Auto-detected (confident):**
Green checkmark, matched column name, detected scale. No action needed.

```
  Satisfaction axis
  ✓  CSAT:1-5  (auto-detected)
```

**State 2 — Multiple candidates (disambiguation):**
Two matches found; user picks one via radio buttons. Non-chosen field becomes additional data.

```
  Satisfaction axis
  ⚠  Multiple matching columns found

     ○  CSAT (values: 1-5)
     ○  CES (values: 1-7)

     The other will appear as additional data.
```

**State 3 — No match (field assignment):**
Dropdown of eligible numeric columns, filtered to those with values in valid scale ranges. Brief explainer of what kind of data the axis expects.

```
  Loyalty axis
  ⚠  No matching column found
     Select the field with recommendation or loyalty data:
     [ dropdown: Q7_rating (values: 0-10), ... ]
```

#### Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  Data Mapping                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Satisfaction axis                                          │
│  ✓  CSAT:1-5  (auto-detected)                              │
│                                                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                             │
│  Loyalty axis                                               │
│  ⚠  No matching column found                               │
│     Select the field with recommendation or loyalty data:   │
│     ┌──────────────────────────────────────────┐            │
│     │  Q7_rating (values: 0-10)            ▾   │            │
│     └──────────────────────────────────────────┘            │
│                                                             │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│                                                             │
│  Remaining columns (4) will be available as additional      │
│  data in your records.                                      │
│                                                             │
│                                    ┌────────────────────┐   │
│                                    │     Continue →      │   │
│                                    └────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### UX Principles

- **Show as confirmation, not error recovery.** The card should feel like a natural import step, not an error screen.
- **One screen, not a wizard.** With only two axes, a step-by-step wizard would be tedious. Two rows on one card is scannable in seconds.
- **Filter dropdowns intelligently.** Only show numeric columns with values within valid scale ranges for that axis. No email addresses or country codes.
- **Show scale alongside column name.** Display detected range (e.g., `ease_of_use (values: 1-7)`) to help users confirm their choice.
- **One confirmation button.** "Continue" at the bottom. Disabled until all required fields are assigned.

---

### Phase 3: Dynamic Labels Based on Source Metric
**Complexity:** Medium-High  
**Files to modify:**
- CSV import utilities (store source metric type)
- Context/state management (propagate metric type)
- Multiple UI components (display dynamic labels)

**Changes needed:**
1. Store the "source metric type" when parsing CSV headers or when user selects a field in the mapping card
2. Propagate this through state/context
3. Update labels throughout the tool:
   - Main visualization axis labels
   - Data Report section headers
   - Statistics section
   - Quadrant descriptions and tooltips
   - Export/PDF labels
   - Actions Report findings

#### Label Strategy: Header Reflection (No Hardcoded Metric Names)

Labels are determined by **reflecting the user's own CSV header term**, not by looking up a hardcoded mapping table. The system extracts the term the user wrote in their column header, cleans it up (capitalizes, strips the scale suffix), and displays that as the axis label. This means the codebase never contains trademarked or third-party metric names as pre-written display strings.

**How it works:**
1. User uploads CSV with header like `CES:1-7` or `Loyalty:1-10`
2. System extracts the term before the scale separator → `CES`, `Loyalty`
3. That extracted term is stored as the source label
4. The extracted term is formatted and displayed as the axis label throughout the tool

**Satisfaction axis behavior:**

| User's Header | Extracted Term | Display Label | Why |
|---------------|----------------|---------------|-----|
| `Satisfaction:1-5`, `Sat:1-5` | Satisfaction / Sat | "Satisfaction" | Default — reflected as-is |
| `CSAT:1-5` | CSAT | "Satisfaction" | **Exception:** CSAT *is* satisfaction, just abbreviated. Override to "Satisfaction" to avoid unnecessary jargon. |
| `CES:1-7`, `Effort:1-5` | CES / Effort | "CES" / "Effort" | Reflected as-is — CES is meaningfully different from general satisfaction and deserves its own label. |
| Manual selection (no auto-detect) | (none) | "Satisfaction" | Default label when user picks a non-standard column from the mapping card. |

**Loyalty axis behavior:**

| User's Header | Extracted Term | Display Label | Why |
|---------------|----------------|---------------|-----|
| `Loyalty:1-10`, `Loy:1-10` | Loyalty / Loy | "Loyalty" | Default — reflected as-is |
| Any other recognized term | (user's term) | (user's term, formatted) | Reflected from user's own data. The codebase never hardcodes any third-party metric name. |
| Manual selection (no auto-detect) | (none) | "Loyalty" | Default label when user picks a non-standard column from the mapping card. |

**Key rules:**
- The only hardcoded override is `CSAT` → "Satisfaction" (because they are the same thing)
- All other labels are reflected from the user's own data header
- If the system cannot extract a meaningful term (e.g., manual field selection from the mapping card), it falls back to the axis default ("Satisfaction" or "Loyalty")
- No trademarked or third-party metric names are ever hardcoded as display strings in the codebase

#### Public-Facing Code Policy

**Requirement:** If anyone inspects the public website source (View Source, browser DevTools, JS bundle inspection) and searches for third-party trademarked metric names, the result must be zero matches. These terms must never appear in:
- HTML files
- JavaScript bundles (as hardcoded display strings)
- CSS files
- FAQ or documentation pages

**Where detection terms exist (acceptable):** The header detection search terms in the source code (e.g., the recognition array used to identify loyalty-family columns) contain short lowercase matching strings for functional pattern-matching purposes. These are buried in minified JS bundles and serve a technical function (recognizing user data), not a display/branding function. This is considered acceptable as it is not user-visible content.

**Where they must NOT exist:** No trademarked metric name may appear as a hardcoded label, heading, option, button text, tooltip, or any other user-visible string authored by us. If such a term appears on screen, it must have flowed in from the user's own CSV header at runtime.

#### CSAT Label Decision

CSAT is literally "Customer Satisfaction Score" — it *is* satisfaction, just abbreviated. When someone uploads CSAT data, the label displays as "Satisfaction." This is the one case where we override the reflected header term, because showing "CSAT" adds jargon without adding clarity.

---

### Phase 4: FAQ and Documentation Updates
**Complexity:** Low  
**Files to modify:**
- `public/faq.html`
- `docs/faq/using-tool.md` (or similar)

**FAQ content to add:**

#### "Can I use Customer Effort Score (CES) data?"

Yes! Segmentor supports CES data in two ways:

**Option 1: CES as your satisfaction measure**
- Name your column header like `CES:1-7` or `CES:1-5`
- CES will be fully integrated into all visualizations and reports
- All "Satisfaction" labels will display as "CES" instead

**Option 2: CES as additional data**
- Include CES as a separate column (just `CES` without a scale)
- Use your regular Satisfaction column for the main analysis
- CES will be available in record details

**Which should I choose?**
- If CES is your primary measure of customer experience quality → Option 1
- If you collect both Satisfaction AND CES separately → Option 2

#### "What if Segmentor doesn't recognize my column names?"

Segmentor auto-detects common column names for satisfaction and loyalty. If your columns use different names, the Data Mapping screen will appear during import, allowing you to manually assign which fields to use for each axis. Only numeric columns with values in valid scale ranges will be shown as options.

---

## Technical Considerations

### Decimal Handling
- CES follows same rules as Satisfaction: max 1 decimal place allowed
- This is already implemented in validation logic

### Scale Compatibility
- CES scales (1-5, 1-7) are already valid satisfaction scales
- 1-10 CES scale is NOT supported for satisfaction (only for loyalty)
- If 1-10 CES needed, would require adding to `VALID_SAT_SCALES`

### Effort Score Direction
- Some CES implementations use "1 = low effort (good)"
- Others use "1 = high effort (bad)"
- **Decision:** Document that Segmentor expects higher values = better (consistent with satisfaction)
- Alternative: Add scale direction detection/configuration (more complex, deferred)

### Dropdown Filtering for Field Assignment
- When showing candidate columns in the mapping card, filter to:
  - Numeric columns only (no text, emails, dates)
  - Values fall within a valid scale range for that axis
  - Satisfaction axis: valid ranges are 1-3, 1-5, 1-7
  - Loyalty axis: valid ranges are 1-5, 1-7, 1-10, 0-10
- Display detected value range next to column name (e.g., `Q7_rating (values: 0-10)`)

### Backward Compatibility
- Existing .seg files and saved data do not include a source metric type; default to "Satisfaction" / "Loyalty" labels when loading legacy files
- New saves should store the source metric type alongside the data

---

## Files Reference

Key files that would need modification:

```
src/components/data-entry/forms/CSVImport/utils/
├── strictScaleValidator.ts    # Header recognition + search terms
├── validation.ts              # Value validation
└── csvImportUtils.ts          # Import processing + field mapping

src/components/data-entry/forms/CSVImport/
└── (new) DataMappingCard.tsx  # Field assignment UI component

src/components/visualization/
├── context/                   # State management for metric types
└── components/                # Dynamic labels

src/components/visualization/grid/
└── AxisLegends.tsx            # Axis label display (currently hardcoded)

src/components/reporting/
├── components/DataReport/     # Report labels
└── components/ActionsReport/  # Findings labels

src/components/data-entry/table/
└── TableComponents.tsx        # Table header labels (Sat/Loy)

public/
└── faq.html                   # FAQ updates
```

---

## Design Principles

1. **The Apostles Model is opinionated.** Segmentor implements a specific model with specific axis semantics. Flexibility means accepting different ways of measuring the same constructs, not letting users redefine what the constructs are.

2. **Accept synonyms, not arbitrary fields.** Expand the vocabulary of accepted metrics (CES, Effort → satisfaction axis), but don't remove the grammar (satisfaction-type on X, loyalty-type on Y).

3. **No cross-axis interchangeability.** CES stays in the satisfaction pool. NPS stays in the loyalty pool. Allowing a satisfaction-proxy on the loyalty axis would collapse the 2D model into effectively 1D.

4. **Graceful fallback over hard errors.** When auto-detection fails, help the user map their fields rather than blocking them. Trust them to know which field is which — they collected the data.

5. **Labels reflect reality.** Show "CES" when the data is CES, not "Satisfaction." But don't change labels for no reason (CSAT stays as "Satisfaction" because it *is* satisfaction).

6. **No trademarked terms in public source.** Axis labels are reflected from the user's own CSV headers at runtime, never hardcoded as display strings. The public-facing codebase (HTML, JS bundles, docs) must contain zero instances of third-party trademarked metric names as authored content.

---

## Open Questions

1. **Should we support 1-10 CES scale?** Currently only 1-5 and 1-7 are valid for satisfaction axis.

2. **Effort direction:** How to handle inverted effort scales where 1 = easy? (Deferred — document expected direction for now.)

3. **Backward compatibility details:** Exact migration path for existing .seg files that don't store source metric type.

4. **Mapping card for Scenario A:** When both axes are auto-detected, should we show the mapping card as a brief confirmation step, or skip it entirely? (Confirmation builds trust; skipping keeps the flow fast.)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Feb 2026 | CES maps to Satisfaction axis | CES measures experience quality (what it measures), not recommendation intent. Its role as a loyalty *predictor* reflects what it correlates with, not what it captures. |
| Feb 2026 | No cross-axis interchangeability | Satisfaction-family and loyalty-family metrics stay in their respective pools. Mixing them would collapse the Apostles Model's 2D diagnostic power. |
| Feb 2026 | Replace conflict dialog with unified Data Mapping Card | One component handles all scenarios: auto-detected, multiple candidates, and no match. Better UX than separate dialogs or hard errors. |
| Feb 2026 | Graceful fallback for zero matches | Instead of erroring when no column is detected, show the mapping card with a dropdown of eligible numeric columns. Most common reason for user abandonment. |
| Feb 2026 | CES gets its own label, CSAT does not | CES is meaningfully different from "Satisfaction" — show "CES." CSAT *is* satisfaction — label stays "Satisfaction." |
| Feb 2026 | Labels use header reflection, not a mapping table | Axis labels are derived from the user's own CSV header at runtime (Option 2, Sub-approach B). No third-party trademarked metric names are hardcoded as display strings anywhere in the public-facing codebase. Only override: CSAT → "Satisfaction." |
| Feb 2026 | Zero trademarked terms in public source | Public website source (HTML, JS bundles, CSS, docs) must contain zero instances of third-party trademarked metric names as authored content. These terms may only appear on screen if they flowed in from the user's own data at runtime. |
| Feb 2026 | Phase 1 first (header terms) | Quick win, low risk, enables basic CES support |

---

## Next Steps

1. [ ] Implement Phase 1 (accept CES header terms)
2. [ ] Test with sample CES data
3. [ ] Design and implement Phase 2 (Data Mapping Card component)
4. [ ] Implement Phase 3 (dynamic labels with label rules)
5. [ ] Update FAQ with CES guidance and field mapping guidance (Phase 4)
6. [ ] Address backward compatibility for .seg files
