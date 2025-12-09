import React, { createContext, useContext } from 'react';
import { DataPoint, ScaleFormat, SpecialZoneBoundaries } from '../../../types/base';
import { ChartConfigProvider } from './ChartConfigContext';
import { DataProcessingProvider } from './DataProcessingContext';
import { useChartConfig } from './ChartConfigContext';
import { useDataProcessing } from './DataProcessingContext';

// Re-export the quadrant type for compatibility
export type { QuadrantType } from './DataProcessingContext';

// Define the shape of our unified context (keeping the EXACT same interface as original)
interface QuadrantAssignmentContextType {
  // Midpoint state
  midpoint: { sat: number; loy: number };
  setMidpoint: (newMidpoint: { sat: number; loy: number }) => void;
  
  // Zone size state - adding direct access to these
  apostlesZoneSize: number;
  terroristsZoneSize: number;
  setApostlesZoneSize: (size: number) => void;
  setTerroristsZoneSize: (size: number) => void;
  
  // Manual assignments management
  manualAssignments: Map<string, import('./DataProcessingContext').QuadrantType>;
  updateManualAssignment: (pointId: string, quadrant: import('./DataProcessingContext').QuadrantType) => void;
  clearManualAssignment: (pointId: string) => void;
  
  // Quadrant determination
  getQuadrantForPoint: (point: DataPoint) => import('./DataProcessingContext').QuadrantType;
  
  // Distribution statistics
  distribution: Record<import('./DataProcessingContext').QuadrantType, number>;
  
  // Scale information
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  
  // Terminology management
  isClassicModel: boolean;
  
  // Areas mode (for filter options)
  showSpecialZones: boolean;
  showNearApostles: boolean;
  
  // Enhanced classification functions
  getDisplayNameForQuadrant: (quadrantType: import('./DataProcessingContext').QuadrantType) => string;
  getBoundaryOptions: (point: DataPoint) => import('../components/DataPoints/DataPointInfoBox').QuadrantOption[];
  isPointInSpecialZone: (point: DataPoint) => boolean;
  
  // Auto-reassignment functions
  autoReassignPointsOnMidpointChange: () => void;
  clearAllManualAssignments: () => void;
  getHierarchicalClassification: (
    point: DataPoint
  ) => {
    baseQuadrant: import('./DataProcessingContext').QuadrantType;
    specificZone: import('./DataProcessingContext').QuadrantType | null;
  };
}

// Create the unified context
const QuadrantAssignmentContext = createContext<QuadrantAssignmentContextType | undefined>(undefined);

interface QuadrantAssignmentProviderProps {
  children: React.ReactNode;
  data: DataPoint[];
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  initialMidpoint?: { sat: number; loy: number };
  initialManualAssignments?: Map<string, import('./DataProcessingContext').QuadrantType>;
  isClassicModel?: boolean;
  showNearApostles?: boolean;
  showSpecialZones?: boolean;
  apostlesZoneSize?: number;
  terroristsZoneSize?: number;
  onApostlesZoneSizeChange?: (size: number) => void;
  onTerroristsZoneSizeChange?: (size: number) => void;
  specialZoneBoundaries?: SpecialZoneBoundaries;
  enableMigrationVerification?: boolean;
}

// Unified provider that combines both contexts
export const QuadrantAssignmentProvider: React.FC<QuadrantAssignmentProviderProps> = (props) => {
  return (
    <ChartConfigProvider
      satisfactionScale={props.satisfactionScale}
      loyaltyScale={props.loyaltyScale}
      initialMidpoint={props.initialMidpoint}
      isClassicModel={props.isClassicModel}
      apostlesZoneSize={props.apostlesZoneSize}
      terroristsZoneSize={props.terroristsZoneSize}
      onApostlesZoneSizeChange={props.onApostlesZoneSizeChange}
      onTerroristsZoneSizeChange={props.onTerroristsZoneSizeChange}
    >
      <DataProcessingProvider
        data={props.data}
        showNearApostles={props.showNearApostles}
        showSpecialZones={props.showSpecialZones}
        initialManualAssignments={props.initialManualAssignments}
      >
        <UnifiedContextWrapper>
          {props.children}
        </UnifiedContextWrapper>
      </DataProcessingProvider>
    </ChartConfigProvider>
  );
};

// Wrapper component that provides the unified context
const UnifiedContextWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const chartConfig = useChartConfig();
  const dataProcessing = useDataProcessing();

  // Combine both contexts into the unified interface
  const unifiedValue: QuadrantAssignmentContextType = {
    // From ChartConfig
    midpoint: chartConfig.midpoint,
    setMidpoint: chartConfig.setMidpoint,
    apostlesZoneSize: chartConfig.apostlesZoneSize,
    terroristsZoneSize: chartConfig.terroristsZoneSize,
    setApostlesZoneSize: chartConfig.setApostlesZoneSize,
    setTerroristsZoneSize: chartConfig.setTerroristsZoneSize,
    satisfactionScale: chartConfig.satisfactionScale,
    loyaltyScale: chartConfig.loyaltyScale,
    isClassicModel: chartConfig.isClassicModel,
    
    // From DataProcessing
    manualAssignments: dataProcessing.manualAssignments,
    updateManualAssignment: dataProcessing.updateManualAssignment,
    clearManualAssignment: dataProcessing.clearManualAssignment,
    getQuadrantForPoint: dataProcessing.getQuadrantForPoint,
    distribution: dataProcessing.distribution,
    getDisplayNameForQuadrant: dataProcessing.getDisplayNameForQuadrant,
    getBoundaryOptions: dataProcessing.getBoundaryOptions,
    isPointInSpecialZone: dataProcessing.isPointInSpecialZone,
    getHierarchicalClassification: dataProcessing.getHierarchicalClassification,
    autoReassignPointsOnMidpointChange: dataProcessing.autoReassignPointsOnMidpointChange,
    clearAllManualAssignments: dataProcessing.clearAllManualAssignments,
    showSpecialZones: dataProcessing.showSpecialZones,
    showNearApostles: dataProcessing.showNearApostles,
  };

  return (
    <QuadrantAssignmentContext.Provider value={unifiedValue}>
      {children}
    </QuadrantAssignmentContext.Provider>
  );
};

// Hook for using the context (maintains exact same API)
export const useQuadrantAssignment = (): QuadrantAssignmentContextType => {
  const context = useContext(QuadrantAssignmentContext);
  if (context === undefined) {
    throw new Error('useQuadrantAssignment must be used within a QuadrantAssignmentProvider');
  }
  return context;
};

// Safe version that returns null if context is not available
export const useQuadrantAssignmentSafe = (): QuadrantAssignmentContextType | null => {
  const context = useContext(QuadrantAssignmentContext);
  return context || null;
};
