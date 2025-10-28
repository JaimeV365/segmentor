import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Menu, X, Info } from 'lucide-react';
import { MiniPlot } from '../MiniPlot';
import CombinationDial from '../CombinationDial';
import ResponseSettings from '../ResponseSettings';
import type { DataReport } from '../../types';
import type { ResponseConcentrationSettings } from '../ResponseSettings/types';
import type { DataPoint } from '@/types/base';
import FilterPanel from '../../../visualization/filters/FilterPanel';
import { getEnhancedCombinations, type CombinationWithTier } from './enhancedCombinations';
import './styles.css';
import './TierToggle.css';
import { useQuadrantAssignment, QuadrantType } from '../../../visualization/context/QuadrantAssignmentContext';

interface Combination {
  satisfaction: number;
  loyalty: number;
  count: number;
  percentage: number;
}

// Define a record type for dynamic properties
interface DynamicDataPoint extends Record<string, any> {
  id: string;
  satisfaction: number;
  loyalty: number;
  count: number;
  percentage: number;
  name: string;
  group: string;
}

interface ResponseConcentrationProps {
  report: DataReport;
  settings: ResponseConcentrationSettings;
  onSettingsChange: (settings: ResponseConcentrationSettings) => void;
  isPremium: boolean;
  originalData?: DataPoint[]; // Add original data prop to access all fields
  // Main chart frequency filter integration
  frequencyFilterEnabled?: boolean;
  frequencyThreshold?: number;
  onFrequencyFilterEnabledChange?: (enabled: boolean) => void;
  onFrequencyThresholdChange?: (threshold: number) => void;
}

export const ResponseConcentrationSection: React.FC<ResponseConcentrationProps> = ({
  report,
  settings,
  onSettingsChange,
  isPremium,
  originalData = [],
  frequencyFilterEnabled = false,
  frequencyThreshold = 2,
  onFrequencyFilterEnabledChange,
  onFrequencyThresholdChange
}) => {
  console.log("🚨 COMPONENT START - ResponseConcentrationSection is rendering!");
  console.log("🔥 ResponseConcentrationSection ENTRY - originalData length:", originalData.length);
  console.log("🔥 Component is rendering with settings:", settings.miniPlot);
  // Connect to QuadrantAssignmentContext for live color updates
  const { getQuadrantForPoint, midpoint, manualAssignments } = useQuadrantAssignment();
  console.log("🔥 MANUAL ASSIGNMENTS DEBUG:", Array.from(manualAssignments.entries()));
  console.log("🔥 MANUAL ASSIGNMENTS STRING:", Array.from(manualAssignments.entries()).join(','));
  console.log("🔥 CONTEXT CONNECTED - midpoint:", midpoint, "manualAssignments size:", manualAssignments.size);
  console.log("***DEBUG*** isPremium result:", isPremium);
  
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'filters'>('settings');
const [activeSettingsTab, setActiveSettingsTab] = useState<'distribution' | 'responses' | 'intensity'>('distribution');
  const [activeFilters, setActiveFilters] = useState<any[]>([]);
  const [useMainChartFrequencyFilter, setUseMainChartFrequencyFilter] = useState(false);
  
  
  // Add state for info ribbon visibility
  const [showInfoRibbon, setShowInfoRibbon] = useState(true);

  // Add refs for click-outside detection (following BarChart pattern)
const panelRef = useRef<HTMLDivElement>(null);
const settingsButtonRef = useRef<HTMLButtonElement>(null);

// Click-outside handler (copied from BarChart)
const handleClickOutside = useCallback((event: MouseEvent) => {
  if (!showPanel) return;
  
  const targetElement = event.target as HTMLElement;
  const isPanelClick = targetElement.closest('.filter-panel');
  const isFilterPanelClick = targetElement.closest('.report-filter-panel') || 
                             targetElement.closest('.filter-panel-content');
  const isTabClick = targetElement.closest('.filter-tab');
  const isControlButtonClick = settingsButtonRef.current?.contains(targetElement);
  const isInfoPopupClick = targetElement.closest('.info-popup-portal') || 
                          targetElement.closest('.info-popup-content') ||
                          targetElement.closest('.info-popup-close');
  
  // Close panel when clicking outside (but not on tabs or info popups)
  if (!isPanelClick && !isControlButtonClick && !isTabClick && !isFilterPanelClick && !isInfoPopupClick) {
    setShowPanel(false);
  }
}, [showPanel]);

useEffect(() => {
  document.addEventListener('mousedown', handleClickOutside);
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [handleClickOutside]);
  
  // Enhanced combinations that support premium features
  const getEnhancedCombinationsWithSettings = (data: any[]): CombinationWithTier[] => {
    if (!data || data.length === 0) return [];
    
    return getEnhancedCombinations(data, {
      frequencyThreshold: settings.miniPlot.frequencyThreshold || 2,
      showTiers: settings.miniPlot.showTiers || false,
      maxTiers: settings.miniPlot.maxTiers || 2,
      isPremium
    });
  };

  // Add state for filtered data using enhanced combinations with premium features
  const [filteredData, setFilteredData] = useState<CombinationWithTier[]>(
    originalData.length > 0 ? 
      getEnhancedCombinationsWithSettings(originalData) : 
      report.mostCommonCombos.map(combo => ({ ...combo, tier: 1, opacity: 1, size: 1 }))
  );
  
  console.log("***DEBUG*** Initial filteredData:", filteredData);
  console.log("***DEBUG*** Report mostCommonCombos:", report.mostCommonCombos);
  console.log("***DEBUG*** Settings frequencyThreshold:", settings.miniPlot.frequencyThreshold);
  console.log("***DEBUG*** Settings showTiers:", settings.miniPlot.showTiers);
  console.log("***DEBUG*** Settings maxTiers:", settings.miniPlot.maxTiers);

  // Real-time update effect - responds to both data and settings changes
  useEffect(() => {
    console.log("🔥 useEffect TRIGGERED - dependency changed!");
    if (originalData && originalData.length > 0) {
      const newCombinations = getEnhancedCombinationsWithSettings(originalData);
      setFilteredData(newCombinations);
      console.log("🔥 useEffect TRIGGERED - rebuilding combinations due to dependency change");
      console.log("🔥 Current context values - midpoint:", midpoint, "manualAssignments:", manualAssignments.size);
      setFilteredData(newCombinations);
      console.log("🔥 New combinations built:", newCombinations.length);
    }
  }, [
    originalData,
    settings.miniPlot.frequencyThreshold,
    settings.miniPlot.showTiers,
    settings.miniPlot.maxTiers,
    // Listen to context changes for live color updates
    midpoint.sat,
    midpoint.loy,
    Array.from(manualAssignments.entries()).join(',')
  ]);

  // Prepare the filterable data from originalData
  const [filterableData, setFilterableData] = useState<any[]>([]);

  // Determine if we have filterable data (using same logic as main visualization)
  const hasFilterableFields = useMemo(() => {
    if (filterableData.length === 0) return false;
    
    // Check for dates
    const hasDate = filterableData.some(item => item.date);
    
    // Check for custom fields (anything beyond standard fields)
    const hasCustomFields = filterableData.some(item => {
      const standardFields = ['id', 'name', 'satisfaction', 'loyalty', 'excluded', 'date', 'dateFormat', 'group', 'email', 'quadrant', 'count', 'percentage'];
      return Object.keys(item).some(key => !standardFields.includes(key));
    });
    
    // Check for multiple groups
    const uniqueGroups = new Set(filterableData.map(item => item.group));
    const hasMultipleGroups = uniqueGroups.size > 1;
    
    // Check for satisfaction/loyalty distributions
    const hasSatisfactionDistribution = new Set(filterableData.map(item => item.satisfaction)).size > 1;
    const hasLoyaltyDistribution = new Set(filterableData.map(item => item.loyalty)).size > 1;
    
    return hasDate || hasCustomFields || hasMultipleGroups || hasSatisfactionDistribution || hasLoyaltyDistribution;
  }, [filterableData]);
  
  // Set up filterable data on component mount or when original data changes
  useEffect(() => {
    if (originalData && originalData.length > 0 && report.mostCommonCombos.length > 0) {
      // Create a map of satisfaction-loyalty pairs for quick lookup
      const comboMap = new Map();
      report.mostCommonCombos.forEach(combo => {
        const key = `${combo.satisfaction}-${combo.loyalty}`;
        comboMap.set(key, combo);
      });
      
      // Filter original data to only include points that match common combinations
      const filtered = originalData.filter(point => {
        const key = `${point.satisfaction}-${point.loyalty}`;
        return comboMap.has(key);
      });
      
      console.log("***DEBUG*** Prepared filterable data:", filtered.length);
      setFilterableData(filtered);
      console.log("***DEBUG*** Prepared filterable data:", filtered.length);
      console.log("***DEBUG*** Prepared filterable data sample:", filtered[0]);
      setFilterableData(filtered);
    }
  }, [originalData, report.mostCommonCombos]);

 // Get available tiers based on raw combination calculation
  // Get available tiers based on current data and frequency threshold
  const getAvailableTiers = () => {
    if (!originalData || originalData.length === 0) return [];
    
    // Calculate combinations directly from raw data
    const combinationMap = new Map<string, number>();
    
    originalData.filter(d => !d.excluded).forEach(d => {
      const key = `${d.satisfaction}-${d.loyalty}`;
      combinationMap.set(key, (combinationMap.get(key) || 0) + 1);
    });
    
    // Filter by frequency threshold to get valid combinations
    const frequencyThreshold = settings.miniPlot.frequencyThreshold || 2;
    const validCombinations = Array.from(combinationMap.values())
      .filter(count => count >= frequencyThreshold);
    
    const available = [];
    
    // Tier 1: Always available if we have any valid combinations
    if (validCombinations.length > 0) {
      available.push(1);
    }
    
    // Tier 2: Available only if we have combinations with different frequencies
    const uniqueFrequencies = new Set(validCombinations);
    if (uniqueFrequencies.size >= 2) {
      available.push(2);
    }
    
    // Tier 3: Available only if we have 3+ different frequency levels
    if (uniqueFrequencies.size >= 3) {
      available.push(3);
    }
    
    return available;
  };
  
  const availableTiers = getAvailableTiers();
  
  // Auto-adjust maxItems if it's lower than available combinations (only increase, never decrease)
useEffect(() => {
  if (filteredData.length > 0 && settings.list.maxItems < filteredData.length && settings.list.maxItems < 10) {
    // Only auto-adjust if the current setting is the old default (5) or very low
    // This prevents overriding user's intentional choices
    onSettingsChange({
      ...settings,
      list: {
        ...settings.list,
        maxItems: Math.min(filteredData.length, 15) // Cap at 15 for performance
      }
    });
  }
}, [filteredData.length, onSettingsChange]);
const getFilteredCombinations = () => {
    const result = filteredData.slice(0, settings.list.maxItems);
    console.log("***DEBUG*** getFilteredCombinations result:", result);
    return result;
  };

  const getColorForQuadrant = (quadrant: QuadrantType): string => {
    switch (quadrant) {
      case 'apostles':
      case 'near_apostles':
      case 'loyalists':
        return '#4CAF50';
      case 'mercenaries':
        return '#F7B731';
      case 'hostages':
        return '#3A6494';  // This will fix your blue issue!
      case 'defectors':
      case 'terrorists':
        return '#CC0000';
      default:
        return '#666666';
    }
  };
  
  const getPointColor = (satisfaction: number, loyalty: number): string => {
    console.log("🔥 getPointColor CALLED for point:", satisfaction, loyalty);
    if (settings.miniPlot.useQuadrantColors) {
      console.log("🔥 Using quadrant colors - creating temp point");
      
      // Find real point at these coordinates to get correct manual assignment
      // Find real point at these coordinates, prioritizing manually assigned points
const candidatePoints = originalData.filter(p => 
  p.satisfaction === satisfaction && p.loyalty === loyalty && !p.excluded
);

const realPoint = candidatePoints.find(p => manualAssignments.has(p.id)) || candidatePoints[0];
      
      let quadrant;
      if (realPoint) {
        // Use real point ID to get correct manual assignment
        quadrant = getQuadrantForPoint(realPoint);
      } else {
        // Fallback: create temp point for coordinates not in originalData
        const tempPoint: DataPoint = {
          id: `temp-${satisfaction}-${loyalty}`,
          name: 'temp',
          satisfaction,
          loyalty,
          group: 'temp',
          date: '',
          email: '',
          excluded: false
        };
        quadrant = getQuadrantForPoint(tempPoint);
      }
      console.log("🔥 Context returned quadrant:", quadrant, "for point:", realPoint ? realPoint.id : `temp-${satisfaction}-${loyalty}`);
      
      // Map to same colors as main chart
      console.log("🔥 Mapping quadrant to color:", quadrant);
      switch (quadrant) {
        case 'loyalists':
        case 'apostles':
        case 'near_apostles':
          return '#4CAF50'; // Green
        case 'mercenaries':
          return '#F7B731'; // Orange
        case 'hostages':
          return '#3A6494'; // Blue
        case 'defectors':
        case 'terrorists':
          return '#CC0000'; // Red
        default:
          return '#4CAF50'; // Fallback
      }
    } else {
      return settings.miniPlot.customColors.default || '#3a863e';
    }
  };

  const handleFilterChange = (filteredPoints: any[], filters: any[]) => {
    console.log("***DEBUG*** handleFilterChange called with:", filteredPoints.length, "points");
    setActiveFilters(filters);
    
    if (filteredPoints.length === 0) {
      setFilteredData([]);
      return;
    }

    // Create a map of filtered points by satisfaction-loyalty combination
    const filteredComboMap = new Map<string, number>();
    filteredPoints.forEach(point => {
      const key = `${point.satisfaction}-${point.loyalty}`;
      filteredComboMap.set(key, (filteredComboMap.get(key) || 0) + 1);
    });

    // Apply filters to the enhanced combinations
    const newFilteredData = getEnhancedCombinationsWithSettings(filteredPoints);
    setFilteredData(newFilteredData);
    
    console.log("***DEBUG*** Filter applied, new filteredData:", newFilteredData);
  };

  return (
    <section className="response-concentration-section">
      <div className="response-concentration-header">
        <div className="section-title-container">
          <h3>Response Concentration</h3>
          {activeFilters.length > 0 && (
            <span className="filter-indicator">
              {activeFilters.length} filter{activeFilters.length !== 1 ? 's' : ''} active
            </span>
          )}
        </div>
        
        {isPremium && (
          <div className="response-concentration-controls">
  <button 
    ref={settingsButtonRef}
    className={`response-concentration-control-button ${showPanel ? 'active' : ''} ${activeFilters && activeFilters.length > 0 ? 'has-filters' : ''}`}
    onClick={() => {
      setShowPanel(!showPanel);
      // Start with filters tab if there are active filters, otherwise settings
      setActiveTab(activeFilters && activeFilters.length > 0 ? 'filters' : 'settings');
    }}
    title="Chart settings and filters"
  >
    <Menu size={22} />
    {activeFilters && activeFilters.length > 0 && (
      <span className="filter-badge small">{activeFilters.length}</span>
    )}
  </button>
</div>
        )}
      </div>

      <div className="response-concentration-content">
        {/* Info Ribbon */}
        {showInfoRibbon && (
          <div className="info-ribbon">
            <div className="info-ribbon-content">
              <Info size={16} className="info-icon" />
              <p className="info-text">
                This section shows response patterns where multiple participants gave identical satisfaction and loyalty ratings.
                It helps identify patterns in your responses and highlights the most common rating combinations.
              </p>
            </div>
            <button 
              onClick={() => setShowInfoRibbon(false)} 
              className="info-ribbon-close"
              aria-label="Close information"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="response-concentration-grid">
        {/* Distribution Map */}
        <div className="concentration-column">
          <h5>Response Distribution Map</h5>
          <div className="miniplot-container">
            <MiniPlot 
              key={`miniplot-${midpoint.sat}-${midpoint.loy}-${Array.from(manualAssignments.entries()).join(',')}`}
              combinations={filteredData}
              satisfactionScale={report.satisfactionScale}
              loyaltyScale={report.loyaltyScale}
              useQuadrantColors={settings.miniPlot.useQuadrantColors}
              customColors={settings.miniPlot.customColors}
              averagePoint={{
                satisfaction: report.statistics.satisfaction.average,
                loyalty: report.statistics.loyalty.average
              }}
              showAverageDot={settings.miniPlot.showAverageDot}
              getPointColor={getPointColor}
            />
          </div>
          {(settings.miniPlot.showAverageDot || (isPremium && settings.miniPlot.showTiers)) && (
            <div className="miniplot-legend">
              {settings.miniPlot.showAverageDot && (
                <div className="legend-item">
                  <span className="legend-dot average-dot"></span>
                  <span className="legend-text">Average Position</span>
                </div>
              )}
              {/* Phase 2: Tier legend for premium users */}
              {isPremium && settings.miniPlot.showTiers && (
                <div className="tier-legend">
                  {Array.from({ length: settings.miniPlot.maxTiers || 2 }, (_, i) => (
                    <div key={i} className="legend-item">
                      <span 
                        className="legend-dot tier-dot"
                        style={{
                          opacity: i === 0 ? 1 : i === 1 ? 0.7 : 0.5,
                          transform: `scale(${i === 0 ? 1 : i === 1 ? 0.85 : 0.7})`
                        }}
                      ></span>
                      <span className="legend-text">
                        Tier {i + 1} {i === 0 ? '(High)' : i === 1 ? '(Medium)' : '(Low)'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Combinations List */}
        <div className="concentration-column">
          <h5>Frequent Responses</h5>
          <ul className="combinations-list">
            {getFilteredCombinations().map((combo: CombinationWithTier, index: number) => (
              <li key={index} className="combination-item" style={{ opacity: combo.opacity || 1 }}>
                {settings.list.useColorCoding && (
  <span 
    className="combination-marker"
    style={{ 
      backgroundColor: getPointColor(combo.satisfaction, combo.loyalty),
      transform: `scale(${combo.size || 1})`
    }} 
  />
)}
                <div className="combination-text">
                  <span className="combination-values">
                    {combo.satisfaction}, {combo.loyalty}
                    {/* Phase 2: Show tier indicator for premium users */}
                    {isPremium && settings.miniPlot.showTiers && combo.tier && (
                      <span className={`tier-indicator tier-${combo.tier}`}>
                        T{combo.tier}
                      </span>
                    )}
                  </span>
                  <span className="combination-stats">
                    ({combo.count} responses - {combo.percentage.toFixed(1)}%)
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Response Intensity */}
        <div className="concentration-column">
          <h5>Response Intensity</h5>
          <CombinationDial
            statistics={report.statistics}
            totalEntries={report.totalEntries}
            isPremium={isPremium}
            minValue={settings.dial.minValue}
            maxValue={settings.dial.maxValue}
            customColors={settings.dial.customColors}
          />
        </div>
      </div>

      {/* Settings/Filters Panel */}
      {showPanel && (
  <div className="filter-overlay">
    <div 
      ref={panelRef}
      className="filter-panel open"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="filter-panel-header">
        <div className="filter-panel-tabs">
          <button 
            className={`filter-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
          {isPremium && (
            <button 
              className={`filter-tab ${activeTab === 'filters' ? 'active' : ''} ${hasFilterableFields ? '' : 'disabled'}`}
              onClick={(e) => {
                e.stopPropagation();
                if (hasFilterableFields) {
                  setActiveTab('filters');
                }
              }}
              disabled={!hasFilterableFields}
            >
              Filters
              {activeFilters && activeFilters.length > 0 && (
                <span className="filter-badge small">{activeFilters.length}</span>
              )}
            </button>
          )}
        </div>
        <button className="filter-panel-close" onClick={() => setShowPanel(false)}>
          <X size={20} />
        </button>
      </div>
      
      {activeTab === 'settings' ? (
  <div className="filter-panel-content">
    {/* Settings Sub-tabs */}
    <div className="settings-sub-tabs">
      <button 
  className={`settings-sub-tab ${activeSettingsTab === 'distribution' ? 'active' : ''}`}
  data-tab="distribution"
  onClick={() => setActiveSettingsTab('distribution')}
>
  Distribution
</button>
<button 
  className={`settings-sub-tab ${activeSettingsTab === 'responses' ? 'active' : ''}`}
  data-tab="responses"
  onClick={() => setActiveSettingsTab('responses')}
>
  Responses
</button>
<button 
  className={`settings-sub-tab ${activeSettingsTab === 'intensity' ? 'active' : ''}`}
  data-tab="intensity"
  onClick={() => setActiveSettingsTab('intensity')}
>
  Intensity
</button>
    </div>
    
    {/* Existing ResponseSettings component with conditional sections */}
    <div className="settings-content">
      <ResponseSettings
          settings={settings}
          onSettingsChange={onSettingsChange}
          onClose={() => setShowPanel(false)}
          isPremium={isPremium}
          activeSection={activeSettingsTab}
          frequencyFilterEnabled={frequencyFilterEnabled}
          frequencyThreshold={frequencyThreshold}
          onFrequencyFilterEnabledChange={onFrequencyFilterEnabledChange}
          onFrequencyThresholdChange={onFrequencyThresholdChange}
          availableTiers={availableTiers}
          availableItemsCount={filteredData.length}
        />
    </div>
  </div>
) : (
  <div style={{ width: '100%', height: '100%' }}>
    <FilterPanel
      data={(() => {
        console.log("***DEBUG*** Passing filterableData to FilterPanel:", filterableData);
        console.log("***DEBUG*** filterableData.length:", filterableData.length);
        return filterableData;
      })()}
      onFilterChange={handleFilterChange}
      onClose={() => setShowPanel(false)}
      isOpen={true}
      showPointCount={true}
      hideHeader={true}
      contentOnly={true}
    />
  </div>
)}
    </div>
  </div>
)}
    </section>
  );
};

export default ResponseConcentrationSection;