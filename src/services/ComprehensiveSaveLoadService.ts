import { ApostlesSaveData } from '../types/save-export';
import { saveExportService } from './SaveExportService';
import { getPointKey } from '../components/visualization/services';

// This service handles comprehensive save/load operations
// It needs to be called from components that have access to all the context data

export interface SaveLoadService {
  saveComprehensiveProgress: (saveData: ApostlesSaveData) => Promise<void>;
  loadComprehensiveProgress: (file: File) => Promise<ApostlesSaveData>;
  createSaveData: (params: CreateSaveDataParams) => ApostlesSaveData;
}

export interface CreateSaveDataParams {
  // Core Data
  data: any[];
  manualAssignments: Map<string, string>;
  satisfactionScale: string;
  loyaltyScale: string;
  satisfactionHeaderName?: string; // Original CSV header name for dynamic labels
  loyaltyHeaderName?: string; // Original CSV header name for dynamic labels
  
  // Chart Configuration
  midpoint: { sat: number; loy: number };
  apostlesZoneSize: number;
  terroristsZoneSize: number;
  isClassicModel: boolean;
  
  // UI State
  showGrid: boolean;
  showScaleNumbers: boolean;
  showLegends: boolean;
  showNearApostles: boolean;
  showSpecialZones: boolean;
  isAdjustableMidpoint: boolean;
  labelMode: number;
  labelPositioning: 'above-dots' | 'below-dots';
  areasDisplayMode: number;
  frequencyFilterEnabled: boolean;
  frequencyThreshold: number;
  
  // Filter State (Enhanced)
  filterState?: {
    dateRange: {
      startDate: Date | null;
      endDate: Date | null;
      preset?: string;
    };
    attributes: Array<{
      field: string;
      values: Set<string | number>;
      availableValues?: Array<{
        value: string | number;
        count: number;
      }>;
      expanded?: boolean;
    }>;
    isActive: boolean;
  };
  
  // Premium
  isPremium?: boolean;
  effects?: Set<string>;
  originalPremiumData?: { effects: string[]; brandPlusUser: boolean } | null;
  
  // Report Visibility States
  reportVisibility?: {
    showRecommendationScore: boolean;
    responseConcentrationExpanded: boolean;
  };
  
  // Report Settings and Customizations
  reportSettings?: {
    responseConcentration?: any; // ResponseConcentrationSettings type
    recommendationScore?: {
      decimalPrecision: 0 | 1 | 2;
      categoryChartType: 'bar' | 'pie';
      displayFormat: 'count' | 'percentage' | 'both';
      useCategoryColors: boolean;
    };
    customizations?: {
      highlightedKPIs: string[];
      chartColors: {
        satisfaction: Record<number, string>;
        loyalty: Record<number, string>;
      };
    };
    proximityDisplay?: {
      grouping: 'flat' | 'bySourceRegion' | 'byStrategicPriority' | 'byDistance';
      showOpportunities: boolean;
      showWarnings: boolean;
      showEmptyCategories: boolean;
      highlightHighImpact: boolean;
      highImpactMethod: 'smart' | 'highBar' | 'standard' | 'sensitive';
      sortBy: 'customerCount' | 'averageDistance' | 'strategicImpact' | 'alphabetical';
    };
    actionReports?: {
      editableTexts?: Record<string, {
        content: string;
        backgroundColor?: string | null;
      }>;
      expandedSections?: {
        findings: boolean;
        opportunitiesRisks: boolean;
        actions: boolean;
      };
      pdfExportOptions?: {
        fontFamily: 'montserrat' | 'lato' | 'arial' | 'helvetica' | 'times';
        showImageWatermarks: boolean;
        showPageWatermarks: boolean;
      };

      // Saved/generated Action Plan snapshot (so Save includes the final Actions Report)
      savedActionPlanSnapshot?: any;
    };

    // Historical Progress preferences (diagram/journeys UI settings)
    historicalProgress?: {
      diagram?: any;
      journeys?: any;
    };
  };
  
  // Individual Report Filter States
  // Note: These should have Date objects and Sets - the service will serialize them
  reportFilterStates?: Record<string, any>;
}

class ComprehensiveSaveLoadServiceImpl implements SaveLoadService {
  
  /**
   * Create comprehensive save data from all current state
   */
  createSaveData(params: CreateSaveDataParams): ApostlesSaveData {
    // Debug logging
    console.log('🔍 ComprehensiveSaveLoadService createSaveData - Filter state:', {
      hasFilterState: !!params.filterState,
      filterState: params.filterState,
      midpoint: params.midpoint,
      manualAssignmentsSize: params.manualAssignments.size
    });
    
    // Convert manual assignments Map to array
    const manualAssignmentsArray = Array.from(params.manualAssignments.entries()).map(
      ([pointId, quadrant]) => ({ pointId, quadrant })
    );

    // Create a set of reassigned point IDs for quick lookup
    const reassignedPointIds = new Set(manualAssignmentsArray.map(ma => ma.pointId));

    // Build headers dynamically based on available data
    const headers: any = {
      satisfaction: params.satisfactionScale,
      loyalty: params.loyaltyScale,
      group: 'text',
      excluded: 'boolean',
      reassigned: 'boolean'
    };
    
    // Store original CSV header names for dynamic axis labels
    if (params.satisfactionHeaderName) {
      headers.satisfactionHeaderName = params.satisfactionHeaderName;
    }
    if (params.loyaltyHeaderName) {
      headers.loyaltyHeaderName = params.loyaltyHeaderName;
    }

    // Add optional headers if they exist in the data
    const samplePoint = params.data[0];
    if (samplePoint?.email) headers.email = 'text';
    if (samplePoint?.date) headers.date = 'date';
    if (samplePoint?.dateFormat) headers.dateFormat = 'text';

    // Add additional attributes as columns
    if (samplePoint?.additionalAttributes) {
      Object.keys(samplePoint.additionalAttributes).forEach(key => {
        headers[key] = 'text'; // Default to text type
      });
    }

    // Build rows with all data flattened
    const rows = params.data.map(point => {
      // Use compound key for checking reassignment (matches manualAssignments keys)
      const pointKey = getPointKey(point);
      const row: any = {
        id: point.id,
        name: point.name,
        satisfaction: point.satisfaction,
        loyalty: point.loyalty,
        group: point.group || 'Default',
        excluded: point.excluded || false,
        reassigned: reassignedPointIds.has(pointKey)
      };

      // Add optional fields
      if (point.email) row.email = point.email;
      if (point.date) row.date = point.date;
      if (point.dateFormat) row.dateFormat = point.dateFormat;

      // Flatten additional attributes
      if (point.additionalAttributes) {
        Object.entries(point.additionalAttributes).forEach(([key, value]) => {
          row[key] = value;
        });
      }

      return row;
    });

    return {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      fileName: saveExportService.getDefaultFileName(),
      
      // Part 1: Data Table (CSV-like structure)
      dataTable: {
        headers,
        rows
      },
      
      // Part 2: Context/Settings
      context: {
        manualAssignments: manualAssignmentsArray,
        
        chartConfig: {
          midpoint: params.midpoint,
          apostlesZoneSize: params.apostlesZoneSize,
          terroristsZoneSize: params.terroristsZoneSize,
          isClassicModel: params.isClassicModel
        },
        
        uiState: {
          showGrid: params.showGrid,
          showScaleNumbers: params.showScaleNumbers,
          showLegends: params.showLegends,
          showNearApostles: params.showNearApostles,
          showSpecialZones: params.showSpecialZones,
          isAdjustableMidpoint: params.isAdjustableMidpoint,
          labelMode: params.labelMode,
          labelPositioning: params.labelPositioning,
          areasDisplayMode: params.areasDisplayMode,
          frequencyFilterEnabled: params.frequencyFilterEnabled,
          frequencyThreshold: params.frequencyThreshold
        },
        
        // Always save filter state, even if empty/default
        filters: {
          dateRange: {
            startDate: params.filterState?.dateRange?.startDate instanceof Date 
              ? params.filterState.dateRange.startDate.toISOString() 
              : (typeof params.filterState?.dateRange?.startDate === 'string' 
                  ? params.filterState.dateRange.startDate 
                  : null),
            endDate: params.filterState?.dateRange?.endDate instanceof Date 
              ? params.filterState.dateRange.endDate.toISOString() 
              : (typeof params.filterState?.dateRange?.endDate === 'string' 
                  ? params.filterState.dateRange.endDate 
                  : null),
            preset: params.filterState?.dateRange?.preset || 'all'
          },
          attributes: (params.filterState?.attributes || []).map(attr => ({
            field: attr.field,
            values: attr.values instanceof Set ? Array.from(attr.values) : (Array.isArray(attr.values) ? attr.values : []),
            availableValues: attr.availableValues,
            expanded: attr.expanded
          })),
          isActive: params.filterState?.isActive || false
        },
        
        premium: params.isPremium ? {
          // TM user saving - use their current premium settings
          isPremium: true,
          effects: Array.from(params.effects || new Set()),
          brandPlusUser: true, // Mark this save as created by a Brand+ user
          brandPlusUserEmail: undefined // Could be populated from auth context in the future
        } : (params.originalPremiumData ? {
          // Free user saving - preserve original premium data from file
          isPremium: false,
          effects: params.originalPremiumData.effects,
          brandPlusUser: params.originalPremiumData.brandPlusUser
        } : undefined),
        
        // Report Visibility States
        reportVisibility: params.reportVisibility || {
          showRecommendationScore: false,
          responseConcentrationExpanded: false
        },
        
        // Report Settings and Customizations
        reportSettings: params.reportSettings || undefined,
        
        // Individual Report Filter States
        reportFilterStates: params.reportFilterStates ? Object.entries(params.reportFilterStates).reduce((acc, [reportId, state]) => {
          // Handle both already-serialized and raw FilterState formats
          const dateRange = state.dateRange || {};
          const startDate = dateRange.startDate instanceof Date 
            ? dateRange.startDate.toISOString() 
            : (typeof dateRange.startDate === 'string' ? dateRange.startDate : null);
          const endDate = dateRange.endDate instanceof Date 
            ? dateRange.endDate.toISOString() 
            : (typeof dateRange.endDate === 'string' ? dateRange.endDate : null);
          
          acc[reportId] = {
            dateRange: {
              startDate,
              endDate,
              preset: dateRange.preset || 'all'
            },
            attributes: (state.attributes || []).map((attr: any) => ({
              field: attr.field,
              values: attr.values instanceof Set ? Array.from(attr.values) : (Array.isArray(attr.values) ? attr.values : []),
              availableValues: attr.availableValues,
              expanded: attr.expanded
            })),
            isActive: state.isActive || false,
            frequencyFilterEnabled: state.frequencyFilterEnabled,
            frequencyThreshold: state.frequencyThreshold
          };
          return acc;
        }, {} as Record<string, any>) : undefined
      }
    };
  }

  /**
   * Save comprehensive progress
   */
  async saveComprehensiveProgress(saveData: ApostlesSaveData): Promise<void> {
    await saveExportService.saveProgress(saveData);
  }

  /**
   * Load comprehensive progress
   */
  async loadComprehensiveProgress(file: File): Promise<ApostlesSaveData> {
    return await saveExportService.loadProgress(file);
  }
}

// Export singleton instance
export const comprehensiveSaveLoadService = new ComprehensiveSaveLoadServiceImpl();
export default comprehensiveSaveLoadService;
