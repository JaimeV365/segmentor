/**
 * Maps statement IDs to chart CSS selectors
 * This determines which chart should be captured to support each statement
 */
export function getChartSelectorForStatement(statementId: string): string | undefined {
  const mapping: Record<string, string> = {
    // Distribution statements → main chart
    'dominant-loyalists': '.chart-container',
    'dominant-mercenaries': '.chart-container',
    'dominant-hostages': '.chart-container',
    'dominant-defectors': '.chart-container',
    'dominant-apostles': '.chart-container',
    'dominant-terrorists': '.chart-container',
    'distribution-balance': '.chart-container',
    'distribution-skewed': '.chart-container',
    
    // Sample size statements → main chart (shows overall data)
    'sample-low': '.chart-container',
    'sample-high': '.chart-container',
    'sample-representation': '.chart-container',
    
    // Concentration statements → response concentration section
    'concentration-patterns': '[data-section-id="report-response-concentration"]',
    'most-common-combo': '[data-section-id="report-response-concentration"]',
    'response-clustering': '[data-section-id="report-response-concentration"]',
    
    // Detailed distribution → distribution section
    'distribution-details': '[data-section-id="report-distribution"]',
    'quadrant-breakdown': '[data-section-id="report-distribution"]',
    'quadrant-percentages': '[data-section-id="report-distribution"]',
    
    // Proximity → proximity section
    'proximity-risk': '[data-section-id="report-proximity"]',
    'proximity-opportunity': '[data-section-id="report-proximity"]',
    'proximity-crisis': '[data-section-id="report-proximity"]',
    'proximity-redemption': '[data-section-id="report-proximity"]',
    
    // Recommendation score → recommendation section
    'recommendation-score': '#recommendation-score-section',
    'nps-analysis': '#recommendation-score-section',
    'promoter-opportunity': '#recommendation-score-section',
    'detractor-concern': '#recommendation-score-section',
    
    // Statistics → main chart (shows overall patterns)
    'satisfaction-average': '.chart-container',
    'loyalty-average': '.chart-container',
    'statistics-patterns': '.chart-container',
  };
  
  return mapping[statementId];
}

/**
 * Gets chart type from selector
 */
export function getChartTypeFromSelector(selector: string): 'main' | 'distribution' | 'concentration' | 'proximity' | 'recommendation' {
  if (selector.includes('chart-container') || selector === '.chart-container') {
    return 'main';
  }
  if (selector.includes('distribution')) {
    return 'distribution';
  }
  if (selector.includes('concentration')) {
    return 'concentration';
  }
  if (selector.includes('proximity')) {
    return 'proximity';
  }
  if (selector.includes('recommendation')) {
    return 'recommendation';
  }
  return 'main'; // Default
}

