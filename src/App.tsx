import React, { useState, useEffect, useRef } from 'react';
import DataEntryModule from './components/data-entry/DataEntryModule';
import DataDisplay from './components/data-entry/table/DataDisplay';
import { DataPoint, ScaleFormat, ScaleState } from './types/base';
import { QuadrantAssignmentProvider } from './components/visualization/context/QuadrantAssignmentContext';
import { FilterProvider } from './components/visualization/context/FilterContext';
import { useNotification } from './components/data-entry/NotificationSystem';
// No longer need date filter utils - context handles this automatically
import FilteredChart from './components/visualization/components/FilteredChart';
import { ReportingSection } from './components/reporting/ReportingSection';
import LeftDrawer from './components/ui/LeftDrawer/LeftDrawer';
import DrawerSaveButton from './components/ui/DrawerSaveButton/DrawerSaveButton';
import ScreenSizeWarning from './components/ui/ScreenSizeWarning/ScreenSizeWarning';
import DemoBanner from './components/ui/DemoBanner/DemoBanner';
import WelcomeBanner from './components/ui/WelcomeBanner/WelcomeBanner';
import './App.css';
import './components/visualization/controls/ResponsiveDesign.css';

interface HeaderScales {
  satisfaction: ScaleFormat;
  loyalty: ScaleFormat;
}

const App: React.FC = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  const notification = useNotification();
  const [scales, setScales] = useState<ScaleState>({
    satisfactionScale: '1-5',
    loyaltyScale: '1-5',
    isLocked: false
  });
  
  const dataEntryRef = useRef<HTMLDivElement>(null);
const visualizationRef = useRef<HTMLDivElement>(null);
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
  const [hideWatermark, setHideWatermark] = useState(false);
  // Update watermark visibility based on effects
  useEffect(() => {
    setHideWatermark(activeEffects.has('HIDE_WATERMARK'));
  }, [activeEffects]);

  
  const [isPremium, setIsPremium] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);

  // Demo data loading function
  const handleDemoDataLoad = async () => {
    try {
      setIsDemoMode(true);
      setIsPremium(true); // Auto-enable Premium mode for demo
      
      const response = await fetch('/apostles_model_template.csv');
      const csvText = await response.text();
      
      // Parse CSV data
      const lines = csvText.split('\n');
      const headers = lines[0].split(',');
      const dataRows = lines.slice(1).filter(line => line.trim());
      
      const demoData: DataPoint[] = dataRows.slice(0, 90).map((row, index) => {
        const values = row.split(',');
        return {
          id: `DEMO_${index + 1}`,
          name: values[1] || `Demo User ${index + 1}`,
          satisfaction: parseInt(values[2]) || 1,
          loyalty: parseInt(values[3]) || 1,
          email: `demo${index + 1}@example.com`,
          date: new Date(2024, 0, 1 + (index % 30)).toISOString().split('T')[0],
          group: ['Apostles', 'Loyalists', 'Defectors', 'Terrorists'][index % 4],
          additionalAttributes: {
            country: ['USA', 'Canada', 'UK', 'Australia'][index % 4],
            language: ['English', 'French', 'Spanish', 'German'][index % 4],
            purchases: Math.floor(Math.random() * 10) + 1
          }
        };
      });
      
      setData(demoData);
      setScales({
        satisfactionScale: '1-5',
        loyaltyScale: '0-10',
        isLocked: false
      });
      
      notification.showNotification({
        title: 'Demo Data Loaded',
        message: '90 sample entries loaded. You can add up to 10 more entries manually.',
        type: 'success'
      });
    } catch (error) {
      console.error('Error loading demo data:', error);
      notification.showNotification({
        title: 'Error',
        message: 'Failed to load demo data. Please try again.',
        type: 'error'
      });
      setIsDemoMode(false);
      setIsPremium(false);
    }
  };

  // Demo banner handlers
  const handleDismissDemo = () => {
    setIsDemoMode(false);
  };

  const handleLoadRealData = () => {
    // Full page refresh to reset everything
    window.location.reload();
  };

  // Welcome banner handlers
  const handleDismissWelcome = () => {
    setShowWelcomeBanner(false);
  };

  const handleStartTour = () => {
    // For now, just dismiss the banner
    // In the future, we can implement the actual tour highlighting
    setShowWelcomeBanner(false);
  };

  const handleUploadData = () => {
    // Scroll to data entry section
    if (dataEntryRef.current) {
      dataEntryRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

// Sync isPremium with activeEffects
useEffect(() => {
  if (isPremium && !activeEffects.has('premium')) {
    setActiveEffects(prev => new Set([...Array.from(prev), 'premium']));
  } else if (!isPremium && activeEffects.has('premium')) {
    setActiveEffects(prev => {
      const newSet = new Set(prev);
      newSet.delete('premium');
      return newSet;
    });
  }
}, [isPremium, activeEffects]);

// Listen for header mode toggle events
useEffect(() => {
  const handleHeaderModeToggle = (event: CustomEvent) => {
    const { isPremium: headerIsPremium } = event.detail;
    setIsPremium(headerIsPremium);
  };
  
  window.addEventListener('headerModeToggle', handleHeaderModeToggle as EventListener);
  
  return () => {
    window.removeEventListener('headerModeToggle', handleHeaderModeToggle as EventListener);
  };
}, []);
  
  
  // Chart control states
  const [isClassicModel, setIsClassicModel] = useState(false); // Default to Modern
  const [showNearApostles, setShowNearApostles] = useState(false); // Default to Simple
  const [showSpecialZones, setShowSpecialZones] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [isAdjustableMidpoint, setIsAdjustableMidpoint] = useState(false);
  const [frequencyFilterEnabled, setFrequencyFilterEnabled] = useState(false);
  const [frequencyThreshold, setFrequencyThreshold] = useState(1);
  const [apostlesZoneSize, setApostlesZoneSize] = useState(1); // Default to 1
  const [terroristsZoneSize, setTerroristsZoneSize] = useState(1); // Default to 1
  const [midpoint, setMidpoint] = useState<{ sat: number; loy: number } | null>(null); // For loaded .seg files
  const [manualAssignments, setManualAssignments] = useState<Map<string, any> | null>(null); // For loaded .seg files
  const [filterState, setFilterState] = useState<any>(null); // For loaded .seg files

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load progress handler
  const handleLoadProgress = async (file: File) => {
    console.log('Loading progress from file:', file.name);
    try {
      // Import the comprehensive save/load service
      const { comprehensiveSaveLoadService } = await import('./services/ComprehensiveSaveLoadService');
      
      // Load the .seg file
      const saveData = await comprehensiveSaveLoadService.loadComprehensiveProgress(file);
      
      // Handle both old and new format
      if (saveData.version === '2.0.0' && saveData.dataTable) {
        // New format: Load from dataTable
        const dataPoints = saveData.dataTable.rows.map(row => {
          const point: any = {
            id: row.id,
            name: row.name,
            satisfaction: row.satisfaction,
            loyalty: row.loyalty,
            group: row.group || 'Default',
            excluded: row.excluded || false
          };
          
          // Add optional fields
          if (row.email) point.email = row.email;
          if (row.date) point.date = row.date;
          if (row.dateFormat) point.dateFormat = row.dateFormat;
          
          // Reconstruct additionalAttributes from flattened columns
          const additionalAttributes: Record<string, any> = {};
          Object.keys(row).forEach(key => {
            if (!['id', 'name', 'satisfaction', 'loyalty', 'email', 'date', 'dateFormat', 'group', 'excluded', 'reassigned'].includes(key)) {
              additionalAttributes[key] = row[key];
            }
          });
          
          if (Object.keys(additionalAttributes).length > 0) {
            point.additionalAttributes = additionalAttributes;
          }
          
          return point;
        });
        
        // Apply demo limitation if in demo mode
        let finalDataPoints = dataPoints;
        if (isDemoMode && dataPoints.length > 100) {
          finalDataPoints = dataPoints.slice(0, 100);
          notification.showNotification({
            title: 'Demo Limitation',
            message: `Demo limited to 100 entries. Showing first 100 of ${dataPoints.length} entries from ${file.name}.`,
            type: 'info'
          });
        }
        
        // Load the data with proper scales from headers
        handleDataChange(finalDataPoints, {
          satisfaction: saveData.dataTable.headers.satisfaction as ScaleFormat,
          loyalty: saveData.dataTable.headers.loyalty as ScaleFormat
        });
        
        // Load the context settings
        const context = saveData.context;
        setMidpoint(context.chartConfig.midpoint); // Set the midpoint for the provider
        
        // Load manual assignments
        const manualAssignmentsMap = new Map<string, any>();
        context.manualAssignments.forEach((assignment: any) => {
          manualAssignmentsMap.set(assignment.pointId, assignment.quadrant);
        });
        setManualAssignments(manualAssignmentsMap);
        
        // Load filter state
        if (context.filters) {
          const loadedFilterState = {
            dateRange: {
              startDate: context.filters.dateRange.startDate ? new Date(context.filters.dateRange.startDate) : null,
              endDate: context.filters.dateRange.endDate ? new Date(context.filters.dateRange.endDate) : null,
              preset: context.filters.dateRange.preset || 'all'
            },
            attributes: context.filters.attributes.map((attr: any) => ({
              field: attr.field,
              values: new Set(attr.values),
              availableValues: attr.availableValues,
              expanded: attr.expanded
            })),
            isActive: context.filters.isActive
          };
          setFilterState(loadedFilterState);
        }
        
        setApostlesZoneSize(context.chartConfig.apostlesZoneSize);
        setTerroristsZoneSize(context.chartConfig.terroristsZoneSize);
        setShowGrid(context.uiState.showGrid);
        setShowNearApostles(context.uiState.showNearApostles);
        setShowSpecialZones(context.uiState.showSpecialZones);
        setIsAdjustableMidpoint(context.uiState.isAdjustableMidpoint);
        setFrequencyFilterEnabled(context.uiState.frequencyFilterEnabled);
        setFrequencyThreshold(context.uiState.frequencyThreshold);
        setIsPremium(context.premium?.isPremium || false);
        setActiveEffects(new Set(context.premium?.effects || []));
        
      } else {
        // Old format: Handle legacy structure (for backward compatibility during transition)
        console.warn('Loading legacy .seg format - consider re-saving for better compatibility');
        
        const dataPoints = (saveData as any).data?.points?.map((point: any) => ({
          ...point,
          group: point.group || 'Default'
        })) || [];
        
        // Apply demo limitation if in demo mode
        let finalDataPoints = dataPoints;
        if (isDemoMode && dataPoints.length > 100) {
          finalDataPoints = dataPoints.slice(0, 100);
          notification.showNotification({
            title: 'Demo Limitation',
            message: `Demo limited to 100 entries. Showing first 100 of ${dataPoints.length} entries from ${file.name}.`,
            type: 'info'
          });
        }
        
        handleDataChange(finalDataPoints, {
          satisfaction: (saveData as any).data?.scales?.satisfaction as ScaleFormat || '1-5',
          loyalty: (saveData as any).data?.scales?.loyalty as ScaleFormat || '1-5'
        });
        
        // Load legacy settings
        if ((saveData as any).chartConfig) {
          setMidpoint((saveData as any).chartConfig.midpoint || { sat: 3, loy: 3 });
          setApostlesZoneSize((saveData as any).chartConfig.apostlesZoneSize || 1);
          setTerroristsZoneSize((saveData as any).chartConfig.terroristsZoneSize || 1);
        }
        if ((saveData as any).uiState) {
          setShowGrid((saveData as any).uiState.showGrid ?? true);
          setShowNearApostles((saveData as any).uiState.showNearApostles ?? false);
          setShowSpecialZones((saveData as any).uiState.showSpecialZones ?? true);
          setIsAdjustableMidpoint((saveData as any).uiState.isAdjustableMidpoint ?? false);
          setFrequencyFilterEnabled((saveData as any).uiState.frequencyFilterEnabled ?? false);
          setFrequencyThreshold((saveData as any).uiState.frequencyThreshold ?? 1);
        }
        if ((saveData as any).premium) {
          setIsPremium((saveData as any).premium.isPremium || false);
          setActiveEffects(new Set((saveData as any).premium.effects || []));
        }
      }
      
      console.log('Progress loaded successfully:', saveData);
    } catch (error) {
      console.error('Failed to load progress:', error);
      // You might want to show a notification here
    }
  };

// Add callbacks to handle zone size changes from the context
const handleApostlesZoneSizeChange = (size: number) => {
  console.log(`🔄 App.tsx: Apostles zone size changed to ${size}`);
  setApostlesZoneSize(size);
};

const handleTerroristsZoneSizeChange = (size: number) => {
  console.log(`🔄 App.tsx: Terrorists zone size changed to ${size}`);
  setTerroristsZoneSize(size);
};




  const handleDataChange = (newData: DataPoint[], headerScales?: HeaderScales) => {
    // Process data to ensure group property
    const processedData = newData.map(point => ({
      ...point,
      group: point.group || 'default'
    }));
  
    // Only set scales on first data entry or when explicitly provided by headerScales
    if (data.length === 0 || headerScales) {
      // If headerScales is explicitly provided, use those exact scales
      if (headerScales) {
        setScales({
          satisfactionScale: headerScales.satisfaction,
          loyaltyScale: headerScales.loyalty,
          isLocked: true
        });
      } else {
        // Only use auto-detection on first data entry with no scales
        const maxSatisfaction = Math.max(...processedData.map(d => d.satisfaction));
        const maxLoyalty = Math.max(...processedData.map(d => d.loyalty));
        
        const newScales: ScaleState = {
          satisfactionScale: maxSatisfaction > 5 ? (maxSatisfaction > 7 ? '1-10' : '1-7') : '1-5',
          loyaltyScale: maxLoyalty > 7 ? '1-10' : maxLoyalty > 5 ? '1-7' : '1-5',
          isLocked: true
        };
        setScales(newScales);
      }
    }
    setData(processedData);
  };

  const handleDeleteDataPoint = (id: string) => {
    console.log('🗑️ Deleting data point:', id);
    const newData = data.filter(item => item.id !== id);
    setData(newData);
    if (newData.length === 0) {
      setScales({
        satisfactionScale: '1-5',
        loyaltyScale: '1-5',
        isLocked: false
      });
    }
    // Clear filters when data is deleted
    console.log('🗑️ Data deleted, clearing filters...');
    const clearFiltersEvent = new CustomEvent('clear-filters-due-to-data-change');
    document.dispatchEvent(clearFiltersEvent);
  };

  const handleEditDataPoint = (id: string) => {
    // Scroll to the data entry section
    if (dataEntryRef.current) {
      dataEntryRef.current.scrollIntoView({ behavior: 'smooth' });
      
      // Dispatch a custom event to tell the DataEntryModule to start editing
      const editEvent = new CustomEvent('edit-data-point', { detail: { id } });
      document.dispatchEvent(editEvent);
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm('Are you sure you want to delete all data? This cannot be undone.')) {
      setData([]);
      setScales({
        satisfactionScale: '1-5',
        loyaltyScale: '1-5',
        isLocked: false
      });
      
      // Dispatch a custom event to clear CSV warnings
      const clearWarningsEvent = new CustomEvent('clear-csv-warnings');
      document.dispatchEvent(clearWarningsEvent);
    }
  };

  const handleToggleExclude = (id: string) => {
    console.log('🚫 Toggling exclude for data point:', id);
    setData(data.map(item => 
      item.id === id ? { ...item, excluded: !item.excluded } : item
    ));
    // Clear filters when data is excluded
    console.log('🚫 Data excluded, clearing filters...');
    const clearFiltersEvent = new CustomEvent('clear-filters-due-to-data-change');
    document.dispatchEvent(clearFiltersEvent);
  };

  // No longer need manual filter validation - the context handles automatic recalculation

  

  return (
    <div className="app">
      {/* <ScreenSizeWarning /> */}
      
      {/* App Header - Removed redundant header, mode indicator moved to welcome banner */}
      
      <main className="app-content">
            {/* Temporary Premium Toggle Button for Testing */}
            <div style={{
              position: 'fixed',
              top: '80px',
              right: '20px',
              zIndex: 1000,
              background: isPremium ? '#3a863e' : '#6b7280',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'all 0.2s ease'
            }} onClick={() => setIsPremium(!isPremium)}>
              {isPremium ? '⭐ Premium Mode' : '🔒 Standard Mode'}
            </div>
            
            {/* Demo Banner */}
        {showWelcomeBanner && data.length === 0 && !isDemoMode && (
          <WelcomeBanner
            onDismiss={handleDismissWelcome}
            onStartTour={handleStartTour}
            onLoadSampleData={handleDemoDataLoad}
            onUploadData={handleUploadData}
          />
        )}
        
        {isDemoMode && (
          <DemoBanner
            onDismiss={handleDismissDemo}
            onLoadRealData={handleLoadRealData}
          />
        )}
            
            <div className="section data-entry-section" ref={dataEntryRef}>
              <DataEntryModule 
                onDataChange={handleDataChange}
                satisfactionScale={scales.satisfactionScale}
                loyaltyScale={scales.loyaltyScale}
                data={data}
                onSegFileLoad={handleLoadProgress}
                onDemoDataLoad={handleDemoDataLoad}
                isDemoMode={isDemoMode}
              />
            </div>

            {data.length > 0 && (
              <div className="section data-table-section">
                <DataDisplay 
                  data={data}
                  satisfactionScale={scales.satisfactionScale}
                  loyaltyScale={scales.loyaltyScale}
                  onDelete={handleDeleteDataPoint}
                  onEdit={handleEditDataPoint}
                  onDeleteAll={handleDeleteAll}
                  onToggleExclude={handleToggleExclude}
                  isDemoMode={isDemoMode}
                />
              </div>
            )}

            {data.length > 0 && (
              <FilterProvider 
                initialData={data} 
                data={data} 
                initialFilterState={filterState || undefined}
                onShowNotification={notification.showNotification}
              >
                <QuadrantAssignmentProvider
                  data={data}
                  satisfactionScale={scales.satisfactionScale}
                  loyaltyScale={scales.loyaltyScale}
                  initialMidpoint={midpoint || undefined}
                  initialManualAssignments={manualAssignments || undefined}
                  isClassicModel={isClassicModel}
                  showNearApostles={showNearApostles}
                  showSpecialZones={showSpecialZones}
                  apostlesZoneSize={apostlesZoneSize}
                  terroristsZoneSize={terroristsZoneSize}
                >
                <div className="section visualization-section" ref={visualizationRef}>
                  <h1 className="customer-segmentation-title">Customer Segmentation</h1>
                  <div className="visualization-content visualization-container">
                    <FilteredChart
                      data={data}
                      satisfactionScale={scales.satisfactionScale}
                      loyaltyScale={scales.loyaltyScale}
                      isClassicModel={isClassicModel}
                      showNearApostles={showNearApostles}
                      showSpecialZones={showSpecialZones}
                      showLabels={showLabels}
                      showGrid={showGrid}
                      hideWatermark={hideWatermark}
                      showAdvancedFeatures={activeEffects.size > 0}
                      activeEffects={activeEffects}
                      frequencyFilterEnabled={frequencyFilterEnabled}
                      frequencyThreshold={frequencyThreshold}
                      isAdjustableMidpoint={isAdjustableMidpoint}
                      apostlesZoneSize={apostlesZoneSize} 
                      terroristsZoneSize={terroristsZoneSize}
                      onFrequencyFilterEnabledChange={setFrequencyFilterEnabled}
                      onFrequencyThresholdChange={setFrequencyThreshold}
                      onIsAdjustableMidpointChange={setIsAdjustableMidpoint}
                      onIsClassicModelChange={setIsClassicModel}
                      onShowNearApostlesChange={setShowNearApostles}
                      onShowSpecialZonesChange={setShowSpecialZones}
                      onShowLabelsChange={setShowLabels}
                      onShowGridChange={setShowGrid}
                      onEffectsChange={setActiveEffects}
                      isPremium={isPremium}
                      onShowNotification={notification.showNotification}
                    />
                    
                    
                  </div>
                </div>

                <div className="section reporting-section">
                  <ReportingSection
  data={data}
  satisfactionScale={scales.satisfactionScale}
  loyaltyScale={scales.loyaltyScale}
  activeEffects={activeEffects}
  isClassicModel={isClassicModel}
  isPremium={isPremium}
  showSpecialZones={showSpecialZones}
  showNearApostles={showNearApostles}
/>
                </div>
                
                {/* Left Drawer with Save Button - Inside providers for context access */}
                <LeftDrawer
                  isOpen={isDrawerOpen} 
                  onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
                >
                  {/* Save Button - Only show when there's data */}
                  {data.length > 0 && (
                    <DrawerSaveButton
                      data={data}
                      satisfactionScale={scales.satisfactionScale}
                      loyaltyScale={scales.loyaltyScale}
                      showGrid={showGrid}
                      showScaleNumbers={true} // TODO: Get from context
                      showLegends={true} // TODO: Get from context
                      showNearApostles={showNearApostles}
                      showSpecialZones={showSpecialZones}
                      isAdjustableMidpoint={isAdjustableMidpoint}
                      labelMode={1} // TODO: Get from context
                      labelPositioning="below-dots" // TODO: Get from context
                      areasDisplayMode={showNearApostles ? 3 : 2}
                      frequencyFilterEnabled={frequencyFilterEnabled}
                      frequencyThreshold={frequencyThreshold}
                      isPremium={isPremium}
                      effects={activeEffects}
                    />
                  )}
                </LeftDrawer>
                </QuadrantAssignmentProvider>
              </FilterProvider>
            )}
          </main>
        </div>
  );
};

export default App;