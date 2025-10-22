import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DataPoint } from '@/types/base';
import { QuadrantChartProps } from '../types';
import QuadrantChart from './QuadrantChart';
import { UnifiedChartControls } from '../controls/UnifiedChartControls';
import { useFilterContextSafe } from '../context/FilterContext';
import './FilteredChart.css';

// Extend the QuadrantChartProps to create FilteredChartProps
interface FilteredChartProps extends QuadrantChartProps {
  onEffectsChange?: (effects: Set<string>) => void;
  isPremium?: boolean;
  onShowNotification?: (notification: { title: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }) => void;
}

const FilteredChart: React.FC<FilteredChartProps> = React.memo(({
  data,
  satisfactionScale,
  loyaltyScale,
  isClassicModel,
  showNearApostles,
  showSpecialZones = true,
  showLabels,
  showGrid,
  hideWatermark,
  showAdvancedFeatures,
  activeEffects,
  frequencyFilterEnabled,
  frequencyThreshold,
  isAdjustableMidpoint,
  apostlesZoneSize = 1,
  terroristsZoneSize = 1,
  onFrequencyFilterEnabledChange,
  onFrequencyThresholdChange,
  onIsAdjustableMidpointChange,
  onIsClassicModelChange,
  onShowNearApostlesChange,
  onShowSpecialZonesChange,
  onShowLabelsChange,
  onShowGridChange,
  onEffectsChange,
  isPremium,
  onShowNotification
}) => {
  const [isUnifiedControlsOpen, setIsUnifiedControlsOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  
  // Try to access filter context if available
  const filterContext = useFilterContextSafe();
  
  // Use filter context data directly - no local state caching
  const effectiveFilteredData = filterContext?.filteredData || data;
  const effectiveActiveFilterCount = filterContext?.activeFilterCount || 0;

  // Determine if we have filterable data
  const hasFilterableData = useMemo(() => {
    // Check for dates
    const hasDate = data.some(item => item.date);
    
    // Check for custom fields (anything beyond standard fields)
    const hasCustomFields = data.some(item => {
      const standardFields = ['id', 'name', 'satisfaction', 'loyalty', 'excluded', 'date', 'dateFormat', 'group', 'email'];
      return Object.keys(item).some(key => !standardFields.includes(key));
    });
    
    // Check for multiple groups
    const uniqueGroups = new Set(data.map(item => item.group));
    const hasMultipleGroups = uniqueGroups.size > 1;
    
    // Check for satisfaction/loyalty distributions
    const hasSatisfactionDistribution = new Set(data.map(item => item.satisfaction)).size > 1;
    const hasLoyaltyDistribution = new Set(data.map(item => item.loyalty)).size > 1;
    
    return hasDate || hasCustomFields || hasMultipleGroups || hasSatisfactionDistribution || hasLoyaltyDistribution;
  }, [data]);

  // No need to update local filtered data - using context data directly

  // Handle click outside to close filter panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isFilterPanelOpen &&
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('.filter-toggle')
      ) {
        setIsFilterPanelOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterPanelOpen]);

  // Handle escape key to close filter panel
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFilterPanelOpen) {
        setIsFilterPanelOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isFilterPanelOpen]);


  /// Handle filter changes
  // No need for handleFilterChange - using context data directly


  // Calculate grid dimensions for watermark controls
  const gridDimensions = useMemo(() => {
    const maxSat = parseInt(satisfactionScale.split('-')[1]);
    const maxLoy = parseInt(loyaltyScale.split('-')[1]);
    const minSat = parseInt(satisfactionScale.split('-')[0]);
    const minLoy = parseInt(loyaltyScale.split('-')[0]);
    return {
      totalCols: maxSat,
      totalRows: maxLoy,
      cellWidth: 40, // Approximate cell width
      cellHeight: 40, // Approximate cell height
      midpointCol: Math.floor(maxSat / 2),
      midpointRow: Math.floor(maxLoy / 2),
      hasNearApostles: showNearApostles,
      scaleRanges: {
        satisfaction: { min: minSat, max: maxSat },
        loyalty: { min: minLoy, max: maxLoy }
      }
    };
  }, [satisfactionScale, loyaltyScale, showNearApostles]);



  return (
    <div className="filtered-chart-container" ref={chartRef}>
      
      {/* Unified Controls Panel */}
      <UnifiedChartControls
        hasFilterableData={hasFilterableData}
        activeFilterCount={effectiveActiveFilterCount}
        data={data}
        onFilterChange={() => {}} // No longer needed - using context data directly
        effects={activeEffects}
        onEffectsChange={onEffectsChange || (() => {})}
        dimensions={gridDimensions}
        isPremium={isPremium || false}
        frequencyFilterEnabled={frequencyFilterEnabled}
        frequencyThreshold={frequencyThreshold}
        onFrequencyFilterEnabledChange={onFrequencyFilterEnabledChange}
        onFrequencyThresholdChange={onFrequencyThresholdChange}
        frequencyData={{
          maxFrequency: 10, // This should be calculated from data
          hasOverlaps: true // This should be calculated from data
        }}
        isOpen={isUnifiedControlsOpen}
        onClose={() => setIsUnifiedControlsOpen(false)}
        onShowNotification={onShowNotification}
      />
      
      
      {/* Chart with Filtered Data */}
      <QuadrantChart
  data={data}
  satisfactionScale={satisfactionScale}
  loyaltyScale={loyaltyScale}
  isClassicModel={isClassicModel}
  showNearApostles={showNearApostles}
  showSpecialZones={showSpecialZones}
  showLabels={showLabels}
  showGrid={showGrid}
  hideWatermark={hideWatermark}
  showAdvancedFeatures={showAdvancedFeatures}
  activeEffects={activeEffects}
  frequencyFilterEnabled={frequencyFilterEnabled}
  frequencyThreshold={frequencyThreshold}
  isAdjustableMidpoint={isAdjustableMidpoint}
  onFrequencyFilterEnabledChange={onFrequencyFilterEnabledChange}
  onFrequencyThresholdChange={onFrequencyThresholdChange}
  onIsAdjustableMidpointChange={onIsAdjustableMidpointChange}
  onIsClassicModelChange={onIsClassicModelChange}
  onShowNearApostlesChange={onShowNearApostlesChange}
  onShowSpecialZonesChange={onShowSpecialZonesChange || (() => {})}
  onShowLabelsChange={onShowLabelsChange}
  onShowGridChange={onShowGridChange}
  isUnifiedControlsOpen={isUnifiedControlsOpen}
  setIsUnifiedControlsOpen={setIsUnifiedControlsOpen}
  activeFilterCount={effectiveActiveFilterCount}
  filteredData={effectiveFilteredData}
  totalData={data}
  apostlesZoneSize={apostlesZoneSize}
  terroristsZoneSize={terroristsZoneSize}
/>
    </div>
  );
});

export default FilteredChart;