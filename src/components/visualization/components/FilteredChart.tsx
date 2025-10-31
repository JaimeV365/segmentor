import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DataPoint } from '@/types/base';
import { QuadrantChartProps } from '../types';
import QuadrantChart from './QuadrantChart';
import { UnifiedChartControls } from '../controls/UnifiedChartControls';
import { exportCapture } from '../../common/exportCapture';
import { exportCsv } from '../../common/exportCsv';
import { useQuadrantAssignment } from '../context/QuadrantAssignmentContext';
import UnifiedLoadingPopup from '../../ui/UnifiedLoadingPopup';
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
  // Debug the onEffectsChange prop
  console.log('🔍 FilteredChart: Component rendered!');
  console.log('🔍 FilteredChart: onEffectsChange prop:', typeof onEffectsChange, onEffectsChange?.toString().substring(0, 100));
  
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
  const [exporting, setExporting] = useState(false);
  const quadrantCtx = useQuadrantAssignment();
  // Allow external open-unified-panel with desired tab
  useEffect(() => {
    const opener = (e: Event) => {
      const detail = (e as CustomEvent).detail || { tab: 'filters' };
      if (detail.tab === 'export') {
        document.body.setAttribute('data-unified-initial-tab', 'export');
      }
      setIsUnifiedControlsOpen(true);
    };
    window.addEventListener('open-unified-panel', opener as EventListener);
    return () => window.removeEventListener('open-unified-panel', opener as EventListener);
  }, []);
  // Listen for export command from unified panel
  useEffect(() => {
    const handler = async (e: Event) => {
      console.log('📥 Export event received:', e);
      const detail = (e as CustomEvent).detail || { format: 'png' };
      console.log('📥 Export detail:', detail);
      try {
        setExporting(true);
        if (detail.format === 'csv') {
          const computeSegment = (p: any) => {
            const q = quadrantCtx.getQuadrantForPoint(p);
            return quadrantCtx.getDisplayNameForQuadrant(q);
          };
          exportCsv({ data: (filterContext?.filteredData || data) as any, computeSegment });
        } else {
          console.log('📥 Starting image export...');
          // Get chart container dimensions for watermark positioning
          const chartContainer = document.querySelector('.chart-container') as HTMLElement;
          const chartWidth = chartContainer?.getBoundingClientRect().width || 0;
          const chartHeight = chartContainer?.getBoundingClientRect().height || 0;
          console.log('📥 Chart dimensions:', { chartWidth, chartHeight, activeEffectsSize: activeEffects?.size });
          
          try {
            await exportCapture({ 
              targetSelector: '.chart-container', 
              format: detail.format, 
              padding: 92, 
              background: '#ffffff'
            });
            console.log('✅ Export completed');
          } catch (error) {
            console.error('❌ Export failed:', error);
            alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      } finally {
        setExporting(false);
      }
    };
    window.addEventListener('segmentor-export', handler as EventListener);
    return () => window.removeEventListener('segmentor-export', handler as EventListener);
  }, [quadrantCtx, filterContext, data, activeEffects]);

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


  // Handle filter changes by updating the FilterContext
  const handleFilterChange = (filteredData: DataPoint[], activeFilters?: any[]) => {
    console.log('🔄 FilteredChart: Filter change received', {
      filteredDataLength: filteredData.length,
      activeFiltersLength: activeFilters?.length || 0,
      hasFilterContext: !!filterContext
    });
    
    // The FilterPanel will handle updating the FilterContext through its internal logic
    // We don't need to do anything here since FilterPanel uses the context directly
    // when forceLocalState is false (which is the default)
  };


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
      <UnifiedLoadingPopup isVisible={exporting} text="segmenting" size="medium" />
      
      {/* Unified Controls Panel */}
      <UnifiedChartControls
        hasFilterableData={hasFilterableData}
        activeFilterCount={effectiveActiveFilterCount}
        data={data}
        onFilterChange={handleFilterChange}
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
  onEffectsChange={onEffectsChange}
  isPremium={isPremium}
/>
    </div>
  );
});

export default FilteredChart;