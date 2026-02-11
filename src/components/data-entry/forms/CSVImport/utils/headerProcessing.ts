import { ScaleFormat } from '@/types/base';
import { HeaderScales } from '../types';

export interface HeaderProcessingResult {
  satisfactionHeader: string | null;
  loyaltyHeader: string | null;
  scales: HeaderScales;
  isValid: boolean;
  errors: string[];
}

export interface ScaleDetectionResult {
  definitive: ScaleFormat | null;
  possibleScales: ScaleFormat[];
  needsUserInput: boolean;
  dataRange: { min: number; max: number };
  headerName?: string; // Original CSV header name (e.g. "CES", "Loy") for display in UI
}

export interface EnhancedHeaderProcessingResult extends HeaderProcessingResult {
  scaleDetection?: {
    satisfaction?: ScaleDetectionResult;
    loyalty?: ScaleDetectionResult;
  };
  needsUserConfirmation: boolean;
}

/**
 * Normalizes a header string for comparison
 * Removes special characters, trims whitespace, and converts to lowercase
 */
export const normalizeHeader = (header: string): string => {
  return header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
};

/**
 * Identifies satisfaction header variants
 */
export const isSatisfactionHeader = (header: string): boolean => {
  // First check the most common pattern directly on the original header
  if (header.match(/^Satisfaction[:|-]/i) || header === 'Satisfaction' || 
      header.match(/^Sat[:|-]/i) || header === 'Sat' || 
      header.match(/^CSAT[:|-]/i) || header === 'CSAT' ||
      header.match(/^CES[:|-]/i) || header === 'CES' ||
      header.match(/^Effort[:|-]/i) || header === 'Effort' ||
      header.match(/^Sat\d/i) || // Handle "Sat1-5", "Sat5", "Sat7", etc. (no separator)
      header.match(/^CSAT\d/i) || // Handle "CSAT1-5", etc. (no separator)
      header.match(/^CES\d/i)) { // Handle "CES1-7", etc. (no separator)
    return true;
  }
  
  // Fall back to the normalized check for other cases
  const normalized = normalizeHeader(header);
  return normalized.startsWith('satisfaction') || 
         normalized.startsWith('sat') || 
         normalized.startsWith('csat') ||
         normalized.startsWith('ces') ||
         normalized.startsWith('effort');
};

/**
 * Identifies loyalty header variants
 */
export const isLoyaltyHeader = (header: string): boolean => {
  // First check the most common pattern directly on the original header
  if (header.match(/^Loyalty[:|-]/i) || header === 'Loyalty' ||
      header.match(/^Loy[:|-]/i) || header === 'Loy' ||
      header.match(/^Loy\d/i) || // Handle "Loy1-10", "Loy10", etc. (no separator)
      header.toLowerCase() === 'nps') { // Case-insensitive match for loyalty-family terms
    return true;
  }
  
  // Fall back to the normalized check for other cases
  const normalized = normalizeHeader(header);
  return normalized.startsWith('loyalty') || 
         normalized.startsWith('loy') || 
         normalized === 'nps';
};

/**
 * Extracts scale from header
 * Supports formats like "Satisfaction:1-5", "Satisfaction-1-5", "Sat(1-5)", etc.
 */
export const extractScaleFromHeader = (header: string): ScaleFormat | null => {
  // Try to find scale pattern with colon (Satisfaction:1-5)
  const colonMatch = header.match(/[:](\d+[-]\d+)/);
  if (colonMatch && colonMatch[1]) {
    return colonMatch[1] as ScaleFormat;
  }
  
  // Try to find scale pattern with hyphen (Satisfaction-1-5)
  const hyphenMatch = header.match(/[-](\d+[-]\d+)/);
  if (hyphenMatch && hyphenMatch[1]) {
    return hyphenMatch[1] as ScaleFormat;
  }
  
  // Try to match pattern like "Sat1-5", "Sat1-7", "Loy1-10", "CES1-7" (no separator - number directly after term)
  const noSeparatorMatch = header.match(/^(?:Sat|CSAT|Satisfaction|Loy|Loyalty|CES|Effort)(\d+[-]\d+)/i);
  if (noSeparatorMatch && noSeparatorMatch[1]) {
    return noSeparatorMatch[1] as ScaleFormat;
  }
  
  // Try to match just a number after colon (Satisfaction:5)
  const colonNumberMatch = header.match(/[:](\d+)$/);
  if (colonNumberMatch && colonNumberMatch[1]) {
    return `1-${colonNumberMatch[1]}` as ScaleFormat;
  }
  
  // Try to match just a number after hyphen (Satisfaction-5, Sat-7, Loy-7)
  const hyphenNumberMatch = header.match(/[-](\d+)$/);
  if (hyphenNumberMatch && hyphenNumberMatch[1]) {
    // Special handling for loyalty scale with -10 suffix
    const maxValue = parseInt(hyphenNumberMatch[1]);
    if (maxValue === 10 && normalizeHeader(header).includes('loy')) {
      // Return null to trigger enhanced detection with actual data (0-10 vs 1-10)
      return null;
    }
    return `1-${hyphenNumberMatch[1]}` as ScaleFormat;
  }
  
  // Try to match just a number with no separator (Sat5, Sat7, Sat3, Loy5, Loy7, Loy10, CES5, CES7)
  const noSeparatorNumberMatch = header.match(/^(?:Sat|CSAT|Satisfaction|Loy|Loyalty|CES|Effort)(\d+)$/i);
  if (noSeparatorNumberMatch && noSeparatorNumberMatch[1]) {
    const maxValue = parseInt(noSeparatorNumberMatch[1]);
    // Special handling for loyalty scale with 10 (could be 0-10 or 1-10)
    if (maxValue === 10 && normalizeHeader(header).includes('loy')) {
      // Return null to trigger enhanced detection with actual data (0-10 vs 1-10)
      return null;
    }
    return `1-${maxValue}` as ScaleFormat;
  }
  
  // No scale pattern found in header — return null to trigger enhanced detection
  // This handles plain headers like "CES", "Sat", "CSAT", "Effort", "Loy", "Loyalty", etc.
  // Enhanced detection will analyze actual data values to determine the scale
  return null;
};

/**
 * Validates if the extracted scale is allowed
 */
export const validateScale = (scale: string | null, type: 'satisfaction' | 'loyalty'): boolean => {
  if (!scale) return false;
  
  // Valid scales
  const satisfactionScales: ScaleFormat[] = ['1-3', '1-5', '1-7'];
  const loyaltyScales: ScaleFormat[] = ['1-5', '1-7', '1-10', '0-10'];
  
  return type === 'satisfaction' 
    ? satisfactionScales.includes(scale as ScaleFormat)
    : loyaltyScales.includes(scale as ScaleFormat);
};

/**
 * Get default scale based on type
 */
export const getDefaultScale = (type: 'satisfaction' | 'loyalty'): ScaleFormat => {
  return type === 'satisfaction' ? '1-5' : '1-5';
};

/**
 * Enhanced scale detection that analyzes actual data to determine possible scales
 */
export const detectPossibleScales = (
  header: string, 
  columnData: number[],
  type: 'satisfaction' | 'loyalty' = 'loyalty'
): ScaleDetectionResult => {
  console.log(`🔍 Detecting scales for header: "${header}" (type: ${type})`);
  
  if (columnData.length === 0) {
    return { 
      definitive: null, 
      possibleScales: [], 
      needsUserInput: false,
      dataRange: { min: 0, max: 0 },
      headerName: header
    };
  }
  
  const validNumbers = columnData.filter(n => !isNaN(n));
  const actualMin = Math.min(...validNumbers);
  const actualMax = Math.max(...validNumbers);
  const dataRange = { min: actualMin, max: actualMax };
  
  // Extract potential max value from header (if present)
  const hyphenNumberMatch = header.match(/[-](\d+)$/);
  const maxFromHeader = hyphenNumberMatch ? parseInt(hyphenNumberMatch[1]) : null;
  
  // Determine if this is a plain header (no scale suffix)
  const isPlainHeader = !maxFromHeader;
  
  console.log(`📈 Analysis: type=${type}, plain=${isPlainHeader}, headerMax=${maxFromHeader}, dataMin=${actualMin}, dataMax=${actualMax}`);
  
  // --- PLAIN HEADER: no scale suffix, determine from data values ---
  if (isPlainHeader) {
    
    if (type === 'satisfaction') {
      // Satisfaction valid scales: 1-3, 1-5, 1-7
      if (actualMax > 7) {
        // Data exceeds max valid satisfaction scale — error
        return { definitive: null, possibleScales: [], needsUserInput: false, dataRange, headerName: header };
      }
      if (actualMax > 5) {
        // max is 6 or 7 → definitive: 1-7
        return { definitive: '1-7' as ScaleFormat, possibleScales: [], needsUserInput: false, dataRange, headerName: header };
      }
      if (actualMax > 3) {
        // max is 4 or 5 → could be 1-5 or 1-7 → ask user
        return { definitive: null, possibleScales: ['1-5', '1-7'] as ScaleFormat[], needsUserInput: true, dataRange, headerName: header };
      }
      // max <= 3 → could be 1-3, 1-5, or 1-7 → ask user
      return { definitive: null, possibleScales: ['1-3', '1-5', '1-7'] as ScaleFormat[], needsUserInput: true, dataRange, headerName: header };
    }
    
    if (type === 'loyalty') {
      // Loyalty valid scales: 1-5, 1-7, 1-10, 0-10
      if (actualMax > 10) {
        // Data exceeds max valid loyalty scale — error
        return { definitive: null, possibleScales: [], needsUserInput: false, dataRange, headerName: header };
      }
      if (actualMin === 0) {
        // Data contains 0 → definitive: 0-10
        return { definitive: '0-10' as ScaleFormat, possibleScales: [], needsUserInput: false, dataRange, headerName: header };
      }
      if (actualMax > 7) {
        // max is 8, 9, or 10 (min >= 1) → could be 1-10 or 0-10 → ask user
        return { definitive: null, possibleScales: ['1-10', '0-10'] as ScaleFormat[], needsUserInput: true, dataRange, headerName: header };
      }
      if (actualMax > 5) {
        // max is 6 or 7 → could be 1-7, 1-10, or 0-10 → ask user
        return { definitive: null, possibleScales: ['1-7', '1-10', '0-10'] as ScaleFormat[], needsUserInput: true, dataRange, headerName: header };
      }
      // max <= 5 → could be 1-5, 1-7, 1-10, or 0-10 → ask user
      return { definitive: null, possibleScales: ['1-5', '1-7', '1-10', '0-10'] as ScaleFormat[], needsUserInput: true, dataRange, headerName: header };
    }
  }
  
  // --- HEADER WITH NUMBER SUFFIX: use header max + data analysis ---
  console.log(`📈 Header has max=${maxFromHeader}, analyzing data`);
  
  // Data contains 0 → definitely 0-X scale
  if (actualMin === 0) {
    return { 
      definitive: `0-${maxFromHeader}` as ScaleFormat, 
      possibleScales: [], 
      needsUserInput: false,
      dataRange,
      headerName: header
    };
  }
  
  // Header max is 10 → could be 1-10 or 0-10, ask user
  if (maxFromHeader === 10) {
    return {
      definitive: null,
      possibleScales: [`1-${maxFromHeader}`, `0-${maxFromHeader}`] as ScaleFormat[],
      needsUserInput: true,
      dataRange,
      headerName: header
    };
  }
  
  // Default: use 1-X scale from header
  return { 
    definitive: `1-${maxFromHeader}` as ScaleFormat, 
    possibleScales: [], 
    needsUserInput: false,
    dataRange,
    headerName: header
  };
};

/**
 * When multiple headers match for the same axis, prefer primary terms over secondary ones.
 * Primary terms are the model's native concepts (Sat/CSAT/Satisfaction for X-axis, Loy/Loyalty for Y-axis).
 * Secondary terms are proxies (CES/Effort for satisfaction, loyalty-family search terms like 'nps').
 * If both primary and secondary exist, primary wins and secondary becomes additional data.
 * If multiple primaries or multiple secondaries exist, return all (will trigger error).
 */
const disambiguateHeaders = (matchedHeaders: string[], type: 'satisfaction' | 'loyalty'): string[] => {
  if (matchedHeaders.length <= 1) return matchedHeaders;
  
  const normalized = (h: string) => normalizeHeader(h);
  
  let primary: string[];
  let secondary: string[];
  
  if (type === 'satisfaction') {
    // Primary: sat, csat, satisfaction — Secondary: ces, effort
    primary = matchedHeaders.filter(h => {
      const n = normalized(h);
      return n.startsWith('sat') || n.startsWith('csat') || n.startsWith('satisfaction');
    });
    secondary = matchedHeaders.filter(h => {
      const n = normalized(h);
      return n.startsWith('ces') || n.startsWith('effort');
    });
  } else {
    // Primary: loy, loyalty — Secondary: other loyalty-family terms
    primary = matchedHeaders.filter(h => {
      const n = normalized(h);
      return n.startsWith('loy') || n.startsWith('loyalty');
    });
    secondary = matchedHeaders.filter(h => {
      const n = normalized(h);
      return !n.startsWith('loy') && !n.startsWith('loyalty');
    });
  }
  
  // If we have primary matches, use only those (secondary becomes additional data)
  if (primary.length > 0) return primary;
  
  // No primaries — use secondary matches
  return secondary;
};

/**
 * Process CSV headers to detect and validate scales
 */
export const processHeaders = (headers: string[]): HeaderProcessingResult => {
  const result: HeaderProcessingResult = {
    satisfactionHeader: null,
    loyaltyHeader: null,
    scales: {
      satisfaction: '1-5',
      loyalty: '1-5'
    },
    isValid: true,
    errors: []
  };
  
  // Find satisfaction header
  // When multiple matches found, prefer primary terms (Sat/CSAT) over secondary (CES/Effort)
  const allSatisfactionHeaders = headers.filter(h => isSatisfactionHeader(h));
  const satisfactionHeaders = disambiguateHeaders(allSatisfactionHeaders, 'satisfaction');
  
  if (satisfactionHeaders.length === 0) {
    result.errors.push('Missing satisfaction column (Expected "Satisfaction", "Sat", "CSAT", or "CES")');
    result.isValid = false;
  } else if (satisfactionHeaders.length > 1) {
    result.errors.push('Multiple satisfaction columns found. Please include only one.');
    result.isValid = false;
  } else {
    result.satisfactionHeader = satisfactionHeaders[0];
    const scale = extractScaleFromHeader(satisfactionHeaders[0]);
    
    if (scale && validateScale(scale, 'satisfaction')) {
      result.scales.satisfaction = scale;
    } else if (scale) {
      result.errors.push(`Invalid satisfaction scale: ${scale}. Allowed scales are: 1-3, 1-5, 1-7`);
      result.isValid = false;
    } else {
      // No scale in header (e.g., plain "CES", "Sat", "CSAT") — defer to enhanced detection
      result.errors.push(`Scale detection deferred for enhanced analysis of "${satisfactionHeaders[0]}" header.`);
      result.scales.satisfaction = getDefaultScale('satisfaction'); // Temporary default, will be overridden by enhanced detection
    }
  }
  
  // Find loyalty header
  // When multiple matches found, prefer primary terms (Loy/Loyalty) over secondary
  const allLoyaltyHeaders = headers.filter(h => isLoyaltyHeader(h));
  const loyaltyHeaders = disambiguateHeaders(allLoyaltyHeaders, 'loyalty');
  
  if (loyaltyHeaders.length === 0) {
    result.errors.push('Missing loyalty column (Expected "Loyalty" or "Loy")');
    result.isValid = false;
  } else if (loyaltyHeaders.length > 1) {
    result.errors.push('Multiple loyalty columns found. Please include only one.');
    result.isValid = false;
  } else {
    result.loyaltyHeader = loyaltyHeaders[0];
    const scale = extractScaleFromHeader(loyaltyHeaders[0]);
    
    if (scale && validateScale(scale, 'loyalty')) {
      result.scales.loyalty = scale;
    } else if (scale) {
      result.errors.push(`Invalid loyalty scale: ${scale}. Allowed scales are: 1-5, 1-7, 1-10, 0-10`);
      result.isValid = false;
    } else {
      // No scale in header (e.g., plain "Loy", "Loyalty", or loyalty-family term) — defer to enhanced detection
      result.errors.push(`Scale detection deferred for enhanced analysis of "${loyaltyHeaders[0]}" header.`);
      result.scales.loyalty = getDefaultScale('loyalty'); // Temporary default, will be overridden by enhanced detection
    }
  }
  
  // Attach original header names to scales for dynamic label display
  result.scales.satisfactionHeaderName = result.satisfactionHeader || undefined;
  result.scales.loyaltyHeaderName = result.loyaltyHeader || undefined;
  
  return result;
};



/**
 * Check if a row appears to be a metadata row (containing REQUIRED/Optional tags)
 */
export const isMetadataRow = (row: Record<string, any>): boolean => {
  const values = Object.values(row)
    .filter(v => v !== null && v !== undefined)
    .map(v => String(v).trim().toUpperCase());
  
  const metadataTerms = ['OPTIONAL', 'REQUIRED'];
  
  // If any value contains metadata terms, it's a metadata row
  return values.some(v => metadataTerms.includes(v));
};

/**
 * Generate a template header row based on specified scales
 */
export const generateTemplateHeader = (
  satisfactionScale: ScaleFormat, 
  loyaltyScale: ScaleFormat
): string => {
  return `ID,Name,Email,Satisfaction:${satisfactionScale},Loyalty:${loyaltyScale},Date,Country,TrueLoyalist,NumPurchases,NumComplaints`;
};

/**
 * Generate metadata row for template
 */
export const generateTemplateMetadata = (): string => {
  return `optional,optional,optional,REQUIRED,REQUIRED,optional,optional,optional,optional,optional`;
};

/**
 * Enhanced header processing with smart scale detection
 */
export const processHeadersWithDataAnalysis = (
  headers: string[], 
  dataRows: any[]
): EnhancedHeaderProcessingResult => {
  // Start with basic header processing
  const basicResult = processHeaders(headers);
  
  const enhancedResult: EnhancedHeaderProcessingResult = {
    ...basicResult,
    scaleDetection: {},
    needsUserConfirmation: false
  };
  
  // Continue with enhanced processing even if basic processing had issues
  // The enhanced analysis can fix scale detection problems
  console.log("Basic processing result:", basicResult);
  
  // Analyze satisfaction column if found
  if (basicResult.satisfactionHeader) {
    const satisfactionData = dataRows
      .map(row => parseFloat(row[basicResult.satisfactionHeader!]))
      .filter(n => !isNaN(n));
    
    const satDetection = detectPossibleScales(basicResult.satisfactionHeader, satisfactionData, 'satisfaction');
    enhancedResult.scaleDetection!.satisfaction = satDetection;
    
    if (satDetection.needsUserInput) {
      enhancedResult.needsUserConfirmation = true;
    } else if (satDetection.definitive) {
      enhancedResult.scales.satisfaction = satDetection.definitive;
    }
  }
  
  // Analyze loyalty column if found
  if (basicResult.loyaltyHeader) {
    const loyaltyData = dataRows
      .map(row => parseFloat(row[basicResult.loyaltyHeader!]))
      .filter(n => !isNaN(n));
    
    const loyDetection = detectPossibleScales(basicResult.loyaltyHeader, loyaltyData, 'loyalty');
    enhancedResult.scaleDetection!.loyalty = loyDetection;
    
    if (loyDetection.needsUserInput) {
      enhancedResult.needsUserConfirmation = true;
    } else if (loyDetection.definitive) {
      enhancedResult.scales.loyalty = loyDetection.definitive;
    }
  }
  
  return enhancedResult;
};

/**
 * Helper function to apply user-confirmed scales
 */
export const applyConfirmedScales = (
  result: EnhancedHeaderProcessingResult,
  confirmedScales: { satisfaction?: ScaleFormat; loyalty?: ScaleFormat }
): HeaderProcessingResult => {
  return {
    satisfactionHeader: result.satisfactionHeader,
    loyaltyHeader: result.loyaltyHeader,
    scales: {
      satisfaction: confirmedScales.satisfaction || result.scales.satisfaction,
      loyalty: confirmedScales.loyalty || result.scales.loyalty,
      satisfactionHeaderName: result.satisfactionHeader || undefined,
      loyaltyHeaderName: result.loyaltyHeader || undefined
    },
    isValid: result.isValid,
    errors: result.errors
  };
};

/**
 * Get user-friendly description for scale formats
 */
export const getScaleDescription = (scale: ScaleFormat): string => {
  if (scale.startsWith('0-')) return '(0-10 scale: 0=lowest)';
  if (scale.startsWith('1-')) return '(Traditional: 1=lowest)';
  return '';
};