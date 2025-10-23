import React, { useMemo } from 'react';
import {
  DataPoint,
  ScaleFormat
} from '@/types/base';
import { QuadrantChartProps } from '../types';
import { useQuadrantAssignment } from '../context/QuadrantAssignmentContext';
import { useChartCalculations, useChartHandlers, useChartState } from '../hooks';
import { ChartControls } from '../controls/ChartControls';
import { ChartContainer } from './ChartContainer';
import './QuadrantChart.css';


const QuadrantChart: React.FC<QuadrantChartProps> = ({
  data,
  satisfactionScale,
  loyaltyScale,
  isClassicModel,
  showNearApostles,
  showSpecialZones,
  showLabels,
  showGrid,
  hideWatermark,
  showAdvancedFeatures,
  activeEffects,
  frequencyFilterEnabled,
  frequencyThreshold,
  isAdjustableMidpoint,
  onFrequencyFilterEnabledChange,
  onFrequencyThresholdChange,
  onIsAdjustableMidpointChange,
  onIsClassicModelChange,
  onShowNearApostlesChange,
  onShowSpecialZonesChange,
  onShowLabelsChange,
  onShowGridChange,
  isUnifiedControlsOpen,
  setIsUnifiedControlsOpen,
  activeFilterCount,
  filteredData,
  totalData,
  onEffectsChange,
  isPremium
}) => {
  // Debug the onEffectsChange prop
  console.log('🔍 QuadrantChart: Component rendered!');
  console.log('🔍 QuadrantChart: onEffectsChange prop:', typeof onEffectsChange, onEffectsChange?.toString().substring(0, 100));
  
  // Get context values
  const { midpoint, apostlesZoneSize: contextApostlesZoneSize, terroristsZoneSize: contextTerroristsZoneSize, setApostlesZoneSize, setTerroristsZoneSize } = useQuadrantAssignment();
  
  // Use custom hooks for chart logic
  const {
    dimensions,
    position,
    maxSizes,
    specialZoneBoundaries,
    frequencyData,
    hasSpaceForNearApostles
  } = useChartCalculations({
    data,
    satisfactionScale,
    loyaltyScale
  });
  
  const { handleMidpointChange, handleZoneResize } = useChartHandlers({ maxSizes });
  
  const {
    showScaleNumbers,
    setShowScaleNumbers,
    showLegends,
    setShowLegends,
    labelMode,
    setLabelMode,
    showQuadrantLabels,
    setShowQuadrantLabels,
    showSpecialZoneLabels,
    setShowSpecialZoneLabels,
    labelPositioning,
    setLabelPositioning,
  } = useChartState();
  
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

  // Debug boundaries
  console.log('🔍 Special zone boundaries calculated in QuadrantChart:', specialZoneBoundaries);
  console.log('🔍 Label positioning:', labelPositioning);
  console.log('🔍 ChartControls props:', { labelPositioning, setLabelPositioning });

  return (
    <div className="quadrant-chart">
      <ChartControls
        isClassicModel={isClassicModel}
        setIsClassicModel={onIsClassicModelChange}
        showNearApostles={showNearApostles}
        setShowNearApostles={onShowNearApostlesChange}
        hasSpaceForNearApostles={hasSpaceForNearApostles}
        showSpecialZones={showSpecialZones}
        setShowSpecialZones={onShowSpecialZonesChange} 
        labelMode={labelMode}
        setLabelMode={setLabelMode}
        labelPositioning={labelPositioning}
        setLabelPositioning={setLabelPositioning}
        showQuadrantLabels={showQuadrantLabels}
        setShowQuadrantLabels={setShowQuadrantLabels}
        showSpecialZoneLabels={showSpecialZoneLabels}
        setSpecialZoneLabels={setShowSpecialZoneLabels}
        onShowLabelsChange={onShowLabelsChange}
        showGrid={showGrid}
        setShowGrid={onShowGridChange}
        isAdjustableMidpoint={isAdjustableMidpoint}
        setIsAdjustableMidpoint={onIsAdjustableMidpointChange}
        frequencyFilterEnabled={frequencyFilterEnabled}
        frequencyThreshold={frequencyThreshold}
        setFrequencyFilterEnabled={onFrequencyFilterEnabledChange}
        setFrequencyThreshold={onFrequencyThresholdChange}
        frequencyData={frequencyData}
        showScaleNumbers={showScaleNumbers}
        setShowScaleNumbers={setShowScaleNumbers}
        showLegends={showLegends}
        setShowLegends={setShowLegends}
        satisfactionScale={satisfactionScale}
        loyaltyScale={loyaltyScale}
        data={data}
        filteredData={filteredData}
        totalData={totalData}
        isUnifiedControlsOpen={isUnifiedControlsOpen || false}
        setIsUnifiedControlsOpen={setIsUnifiedControlsOpen || (() => {})}
        activeFilterCount={activeFilterCount || 0}
        isPremium={isPremium || false}
        effects={activeEffects || new Set()}
        onEffectsChange={onEffectsChange || (() => {})}
        dimensions={gridDimensions}
      />
      
      <ChartContainer
        dimensions={dimensions}
        position={position}
        specialZoneBoundaries={specialZoneBoundaries}
        midpoint={midpoint}
        data={filteredData || data}
        satisfactionScale={satisfactionScale}
        loyaltyScale={loyaltyScale}
        apostlesZoneSize={contextApostlesZoneSize}
        terroristsZoneSize={contextTerroristsZoneSize}
        maxSizes={maxSizes}
        showGrid={showGrid}
        showScaleNumbers={showScaleNumbers}
        showLegends={showLegends}
        showLabels={showLabels}
        showQuadrantLabels={showQuadrantLabels}
        showSpecialZoneLabels={showSpecialZoneLabels}
        labelPositioning={labelPositioning}
        showSpecialZones={showSpecialZones ?? true}
        showNearApostles={showNearApostles}
        isClassicModel={isClassicModel}
        isAdjustableMidpoint={isAdjustableMidpoint}
        hideWatermark={hideWatermark}
        activeEffects={activeEffects}
        frequencyFilterEnabled={frequencyFilterEnabled}
        frequencyThreshold={frequencyThreshold}
        frequencyData={frequencyData}
        onMidpointChange={handleMidpointChange}
        onZoneResize={handleZoneResize}
        onShowNearApostlesChange={onShowNearApostlesChange}
        onApostlesZoneSizeChange={setApostlesZoneSize}
        onTerroristsZoneSizeChange={setTerroristsZoneSize}
      />
    </div>
  );
};

export default QuadrantChart;