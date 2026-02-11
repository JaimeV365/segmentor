import React, { createContext, useContext, useMemo } from 'react';

/**
 * Axis label state derived from the user's CSV headers.
 * 
 * Label rules (from implementation plan):
 * - Satisfaction/Sat/CSAT → "Satisfaction" (CSAT is just an abbreviation)
 * - CES/Effort → reflected as-is ("CES" / "Effort")
 * - Loyalty/Loy → "Loyalty"
 * - Any other term → reflected from user's own header
 * - No source header → default axis name
 */
export interface AxisLabels {
  /** Display label for the satisfaction axis (e.g. "Satisfaction", "CES", "Effort") */
  satisfaction: string;
  /** Display label for the loyalty axis (e.g. "Loyalty") */
  loyalty: string;
}

interface AxisLabelsContextValue {
  labels: AxisLabels;
  /** The raw CSV header name for satisfaction (before label rules), if available */
  satisfactionHeaderName?: string;
  /** The raw CSV header name for loyalty (before label rules), if available */
  loyaltyHeaderName?: string;
}

const defaultLabels: AxisLabels = {
  satisfaction: 'Satisfaction',
  loyalty: 'Loyalty'
};

const AxisLabelsContext = createContext<AxisLabelsContextValue>({
  labels: defaultLabels
});

/**
 * Derive a display label from the raw CSV header name.
 * Strips any scale suffix (e.g. ":1-5", "-1-7") and applies label rules.
 */
export const deriveAxisLabel = (
  headerName: string | undefined | null,
  axis: 'satisfaction' | 'loyalty'
): string => {
  if (!headerName) {
    return axis === 'satisfaction' ? 'Satisfaction' : 'Loyalty';
  }

  // Strip scale suffix: "CES:1-7" → "CES", "Sat-1-5" → "Sat", "Loy10" → "Loy" (if ending with digits after removing separator+scale)
  const name = headerName
    .replace(/[:|-]\d+[-]\d+$/, '')   // Strip ":1-5", "-1-7", etc.
    .replace(/[:|-]\d+$/, '')          // Strip ":5", "-10", etc.
    .replace(/\d+[-]\d+$/, '')         // Strip bare "1-5" suffix (e.g. "Sat1-5")
    .replace(/\d+$/, '')               // Strip bare number suffix (e.g. "Sat5")
    .trim();

  const normalized = name.toLowerCase();

  if (axis === 'satisfaction') {
    // CSAT / Sat / Satisfaction → "Satisfaction" (CSAT is satisfaction, just abbreviated)
    if (['satisfaction', 'sat', 'csat'].includes(normalized)) {
      return 'Satisfaction';
    }
    // CES / Effort → reflect as-is (these are meaningfully different)
    if (normalized === 'ces') return 'CES';
    if (normalized === 'effort') return 'Effort';
    // Anything else → reflect the user's term, title-cased
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  if (axis === 'loyalty') {
    // Loyalty / Loy → "Loyalty"
    if (['loyalty', 'loy'].includes(normalized)) {
      return 'Loyalty';
    }
    // Anything else → reflect the user's term, title-cased
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  return name;
};

interface AxisLabelsProviderProps {
  satisfactionHeaderName?: string;
  loyaltyHeaderName?: string;
  children: React.ReactNode;
}

export const AxisLabelsProvider: React.FC<AxisLabelsProviderProps> = ({
  satisfactionHeaderName,
  loyaltyHeaderName,
  children
}) => {
  const value = useMemo<AxisLabelsContextValue>(() => ({
    labels: {
      satisfaction: deriveAxisLabel(satisfactionHeaderName, 'satisfaction'),
      loyalty: deriveAxisLabel(loyaltyHeaderName, 'loyalty')
    },
    satisfactionHeaderName,
    loyaltyHeaderName
  }), [satisfactionHeaderName, loyaltyHeaderName]);

  return (
    <AxisLabelsContext.Provider value={value}>
      {children}
    </AxisLabelsContext.Provider>
  );
};

/**
 * Hook to access dynamic axis labels throughout the component tree.
 * Returns { labels: { satisfaction, loyalty }, satisfactionHeaderName, loyaltyHeaderName }
 */
export const useAxisLabels = (): AxisLabelsContextValue => {
  return useContext(AxisLabelsContext);
};

export default AxisLabelsContext;
