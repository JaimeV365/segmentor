import React, { useState, useEffect, useRef } from 'react';
import { MessageCircleQuestion } from 'lucide-react';
import DataEntryModule from './components/data-entry/DataEntryModule';
import DataDisplay from './components/data-entry/table/DataDisplay';
import { DataPoint, ScaleFormat, ScaleState } from './types/base';
import { QuadrantAssignmentProvider } from './components/visualization/context/QuadrantAssignmentContext';
import { FilterProvider } from './components/visualization/context/FilterContext';
import { AxisLabelsProvider } from './components/visualization/context/AxisLabelsContext';
import { useNotification } from './components/data-entry/NotificationSystem';
// No longer need date filter utils - context handles this automatically
import FilteredChart from './components/visualization/components/FilteredChart';
import { ReportingSection } from './components/reporting/ReportingSection';
import LeftDrawer from './components/ui/LeftDrawer/LeftDrawer';
import DrawerSaveButton from './components/ui/DrawerSaveButton/DrawerSaveButton';
import { SectionNavigation } from './components/ui/SectionNavigation/SectionNavigation';
import ScreenSizeWarning from './components/ui/ScreenSizeWarning/ScreenSizeWarning';
import DemoBanner from './components/ui/DemoBanner/DemoBanner';
import WelcomeBanner from './components/ui/WelcomeBanner/WelcomeBanner';
import { DemoTour } from './components/ui/DemoTour';
import { UnifiedLoadingPopup } from './components/ui/UnifiedLoadingPopup';
import { UnsavedChangesModal } from './components/ui/UnsavedChangesModal/UnsavedChangesModal';
import { BrandPlusIndicator } from './components/ui/BrandPlusIndicator/BrandPlusIndicator';
import { UnsavedChangesTracker } from './components/ui/UnsavedChangesTracker/UnsavedChangesTracker';
import { Footer } from './components/ui/Footer/Footer';
import { TranslationBanner } from './components/ui/TranslationBanner/TranslationBanner';
import { storageManager } from './components/data-entry/utils/storageManager';
import './App.css';
import './components/visualization/controls/ResponsiveDesign.css';
import { HeaderScales } from './components/data-entry/forms/CSVImport/types';

const App: React.FC = () => {
  const [data, setData] = useState<DataPoint[]>([]);
  const notification = useNotification();
  const [scales, setScales] = useState<ScaleState>({
    satisfactionScale: '1-5',
    loyaltyScale: '1-5',
    isLocked: false
  });
  // Source metric header names for dynamic axis labels
  const [axisHeaderNames, setAxisHeaderNames] = useState<{
    satisfaction?: string;
    loyalty?: string;
  }>({});
  
  const dataEntryRef = useRef<HTMLDivElement>(null);
const visualizationRef = useRef<HTMLDivElement>(null);
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
  const [hideWatermark, setHideWatermark] = useState(false);
  // Store original premium data from loaded file to preserve when free users save
  const originalPremiumDataRef = useRef<{ effects: string[]; brandPlusUser: boolean } | null>(null);
  // Update watermark visibility based on effects
  useEffect(() => {
    setHideWatermark(activeEffects.has('HIDE_WATERMARK'));
  }, [activeEffects]);

  
  const [isPremium, setIsPremium] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);
  const [showDemoTour, setShowDemoTour] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const isDemoDataLoadRef = useRef(false); // Track if we're currently loading demo data
  const isFileUploadRef = useRef(false); // Track if data is coming from CSV/.seg file upload (triggers demo exit)

  // Check Cloudflare Access authentication on mount and periodically
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { checkCloudflareAccess } = await import('./utils/cloudflareAuth');
        const accessProfile = await checkCloudflareAccess();
        
        if (accessProfile.isAuthenticated && accessProfile.isPremium) {
          console.log('✅ Teresa Monroe staff authenticated:', accessProfile.email);
          setIsPremium(true);
        } else if (accessProfile.isAuthenticated && !accessProfile.isPremium) {
          console.log('ℹ️ Authenticated but not TM agent:', accessProfile.email);
          setIsPremium(false);
        } else {
          console.log('ℹ️ Not authenticated with Cloudflare Access');
          setIsPremium(false);
        }
      } catch (error) {
        console.log('Cloudflare auth check failed (API may not exist yet):', error);
        // Don't set premium if check fails - require actual authentication
        setIsPremium(false);
      }
    };
    
    // Check immediately on mount
    checkAuth();
    
    // Periodic verification every 5 minutes to prevent client-side bypass
    const verificationInterval = setInterval(() => {
      console.log('🔄 Periodic Teresa Monroe staff verification check...');
      checkAuth();
    }, 5 * 60 * 1000); // 5 minutes
    
    // Cleanup interval on unmount
    return () => {
      clearInterval(verificationInterval);
    };
  }, []);

  // Demo data loading function
  const handleDemoDataLoad = async () => {
    try {
      setIsLoadingDemo(true);
      setIsDemoMode(true);
      isDemoDataLoadRef.current = true; // Mark that we're loading demo data
      // Don't auto-enable Premium mode for demo - keep it as regular demo
      
      const response = await fetch('/segmentor-demo.csv');
      if (!response.ok) {
        throw new Error(`Failed to fetch demo data: ${response.status} ${response.statusText}`);
      }
      const csvText = await response.text();
      
      if (!csvText || csvText.trim().length === 0) {
        throw new Error('Demo data file is empty');
      }
      
      // Parse CSV data
      const lines = csvText.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const dataRows = lines.slice(1).filter(line => line.trim());
      
      // Find column indices
      const dateIndex = headers.findIndex(h => h.toLowerCase() === 'date');
      const nameIndex = headers.findIndex(h => h.toLowerCase().includes('name') || h.toLowerCase().includes('email'));
      const satisfactionIndex = headers.findIndex(h => h.toLowerCase().includes('satisfaction'));
      const loyaltyIndex = headers.findIndex(h => h.toLowerCase().includes('loyalty'));
      
      // Helper function to convert date format from yyyy-mm-dd to dd/mm/yyyy
      const convertDateFormat = (dateStr: string): string => {
        if (!dateStr || dateStr.trim() === '') return '';
        
        // Check if already in dd/mm/yyyy format
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr.trim())) {
          return dateStr.trim();
        }
        
        // Convert from yyyy-mm-dd to dd/mm/yyyy
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
          const [year, month, day] = dateStr.trim().split('-');
          return `${day}/${month}/${year}`;
        }
        
        // Return as-is if format is unrecognized
        return dateStr.trim();
      };
      
      // Map to track customer names and assign consistent IDs/emails
      const customerMap = new Map<string, { id: string; email: string }>();
      let customerCounter = 1;
      
      const demoData: DataPoint[] = dataRows.slice(0, 90).map((row, index) => {
        const values = row.split(',').map(v => v.trim());
        
        // Get customer name
        const customerName = (nameIndex >= 0 ? values[nameIndex] : null) || `Demo User ${index + 1}`;
        
        // Get or create consistent ID/email for this customer name
        let customerInfo = customerMap.get(customerName);
        if (!customerInfo) {
          customerInfo = {
            id: `DEMO_${customerCounter}`,
            email: `demo${customerCounter}@example.com`
          };
          customerMap.set(customerName, customerInfo);
          customerCounter++;
        }
        
        // Get date from CSV or generate fallback
        let dateValue: string;
        if (dateIndex >= 0 && values[dateIndex] && values[dateIndex].trim() !== '') {
          dateValue = convertDateFormat(values[dateIndex]);
        } else {
          // Fallback to generated date if column missing or empty
          dateValue = new Date(2024, 0, 1 + (index % 30)).toISOString().split('T')[0];
          // Convert fallback to dd/mm/yyyy format
          const [year, month, day] = dateValue.split('-');
          dateValue = `${day}/${month}/${year}`;
        }
        
        return {
          id: customerInfo.id,
          name: customerName,
          satisfaction: (satisfactionIndex >= 0 ? parseInt(values[satisfactionIndex]) : parseInt(values[2])) || 1,
          loyalty: (loyaltyIndex >= 0 ? parseInt(values[loyaltyIndex]) : parseInt(values[3])) || 1,
          email: customerInfo.email,
          date: dateValue,
          dateFormat: 'dd/mm/yyyy', // Add date format
          group: ['Apostles', 'Loyalists', 'Defectors', 'Terrorists'][index % 4],
          additionalAttributes: {
            country: ['USA', 'Canada', 'UK', 'Australia'][index % 4],
            language: ['English', 'French', 'Spanish', 'German'][index % 4],
            purchases: Math.floor(Math.random() * 10) + 1
          }
        };
      });
      
      // Use handleDataChange to set demo data, then reset the ref
      handleDataChange(demoData, {
        satisfaction: '1-5',
        loyalty: '0-10'
      });
      setScales({
        satisfactionScale: '1-5',
        loyaltyScale: '0-10',
        isLocked: false
      });
      isDemoDataLoadRef.current = false; // Reset after demo data is loaded
      
      notification.showNotification({
        title: 'Demo Data Loaded',
        message: '90 sample entries loaded. You can add up to 10 more entries manually.',
        type: 'success'
      });

      // Check if we should auto-start the tour (from trial parameter)
      const urlParams = new URLSearchParams(window.location.search);
      const isTrial = urlParams.get('trial') === 'true';
      const hasSeenTour = sessionStorage.getItem('demo-tour-completed');
      
      if (isTrial && !hasSeenTour) {
        // Wait for DOM to settle, then start tour
        setTimeout(() => {
          setShowDemoTour(true);
          setShowWelcomeBanner(false); // Hide welcome banner when tour starts
        }, 1500);
      }
    } catch (error) {
      console.error('Error loading demo data:', error);
      notification.showNotification({
        title: 'Error',
        message: 'Failed to load demo data. Please try again.',
        type: 'error'
      });
      setIsDemoMode(false);
      setIsPremium(false);
      } finally {
      setIsLoadingDemo(false);
      isDemoDataLoadRef.current = false; // Reset ref after demo load completes (success or error)
    }
  };

  // Check for trial parameter on mount and auto-load demo
  const trialAutoLoadRef = useRef(false);
  useEffect(() => {
    if (trialAutoLoadRef.current) return; // Only run once
    const urlParams = new URLSearchParams(window.location.search);
    const isTrial = urlParams.get('trial') === 'true';
    const hasSeenTour = sessionStorage.getItem('demo-tour-completed');
    
    if (isTrial && !hasSeenTour && data.length === 0) {
      trialAutoLoadRef.current = true;
      // Auto-load demo data
      handleDemoDataLoad();
    }
  }, [data.length]); // Run when data changes or on mount

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

  const handleStartTour = async () => {
    // If no data is loaded, load sample data first, then start tour
    if (data.length === 0) {
      setShowWelcomeBanner(false);
      await handleDemoDataLoad();
      // Wait for data to be set and DOM to update, then start tour
      setTimeout(() => {
        setShowDemoTour(true);
      }, 500);
    } else {
      // Data already loaded, just start the tour
      setShowWelcomeBanner(false);
      setShowDemoTour(true);
    }
  };

  const handleCloseTour = () => {
    setShowDemoTour(false);
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

  // Exit confirmation modal state
  const [showExitModal, setShowExitModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const saveButtonRef = useRef<{ triggerSave: () => Promise<void> } | null>(null);

  // Reload confirmation modal state
  const [showReloadModal, setShowReloadModal] = useState(false);

  // Track unsaved changes state (updated by UnsavedChangesTracker component)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load progress handler
  const handleLoadProgress = async (file: File) => {
    console.log('Loading progress from file:', file.name);
    isFileUploadRef.current = true; // Mark as file upload (.seg file)
    try {
      // Import the comprehensive save/load service
      const { comprehensiveSaveLoadService } = await import('./services/ComprehensiveSaveLoadService');
      
      // Load the .seg file
      const saveData = await comprehensiveSaveLoadService.loadComprehensiveProgress(file);
      
      // Note: If this is a TM file loaded by a free user, we'll load it directly
      // Premium features won't be restored (handled below in the premium restoration logic)
      
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
        
        // Mark as file upload (.seg file) so we exit demo mode
        isFileUploadRef.current = true;
        
        // Load the data with proper scales from headers (including source header names for dynamic labels)
        handleDataChange(finalDataPoints, {
          satisfaction: saveData.dataTable.headers.satisfaction as ScaleFormat,
          loyalty: saveData.dataTable.headers.loyalty as ScaleFormat,
          satisfactionHeaderName: saveData.dataTable.headers.satisfactionHeaderName,
          loyaltyHeaderName: saveData.dataTable.headers.loyaltyHeaderName
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
        // Premium features restoration logic:
        // - Everyone can SEE premium features from files (for display)
        // - Only TM users can EDIT premium features (controls already restricted)
        // - Free users preserve original premium data when saving
        if (context.premium?.brandPlusUser) {
          // Store original premium data to preserve when saving
          originalPremiumDataRef.current = {
            effects: context.premium.effects || [],
            brandPlusUser: true
          };
          
          // Restore premium effects for DISPLAY (everyone can see them)
          setActiveEffects(new Set(context.premium.effects || []));
          
          // Only update isPremium if current user is also premium (for editing permissions)
          if (isPremium) {
            setIsPremium(context.premium.isPremium || false);
          }
        } else {
          // File wasn't created by TM user - clear original premium data
          originalPremiumDataRef.current = null;
        }
        // If file wasn't created by TM user, keep current isPremium state (don't log out TM users)
        
        // Load report visibility states
        if (context.reportVisibility) {
          localStorage.setItem('showRecommendationScore', context.reportVisibility.showRecommendationScore.toString());
          localStorage.setItem('responseConcentrationExpanded', context.reportVisibility.responseConcentrationExpanded.toString());
          // Dispatch custom event to notify components that seg file was loaded
          document.dispatchEvent(new CustomEvent('segFileLoaded'));
        }
        
        // Load report settings and customizations
        if (context.reportSettings) {
          if (context.reportSettings.responseConcentration) {
            localStorage.setItem('responseConcentrationSettings', JSON.stringify(context.reportSettings.responseConcentration));
          }
          if (context.reportSettings.recommendationScore) {
            localStorage.setItem('recommendationScoreSettings', JSON.stringify(context.reportSettings.recommendationScore));
          }
          if (context.reportSettings.customizations) {
            localStorage.setItem('report-customization', JSON.stringify({
              highlightedKPIs: context.reportSettings.customizations.highlightedKPIs,
              chartColors: context.reportSettings.customizations.chartColors
            }));
          }
          if (context.reportSettings.proximityDisplay) {
            localStorage.setItem('proximityDisplaySettings', JSON.stringify(context.reportSettings.proximityDisplay));
          }
          if (context.reportSettings.actionReports) {
            // Restore editable text items
            if (context.reportSettings.actionReports.editableTexts) {
              Object.entries(context.reportSettings.actionReports.editableTexts).forEach(([key, value]: [string, any]) => {
                localStorage.setItem(key, JSON.stringify({
                  content: value.content,
                  backgroundColor: value.backgroundColor
                }));
              });
            }
            // Restore section collapse state
            if (context.reportSettings.actionReports.expandedSections) {
              localStorage.setItem('actionReportsExpandedSections', JSON.stringify(context.reportSettings.actionReports.expandedSections));
            }
            // Restore PDF export options
            if (context.reportSettings.actionReports.pdfExportOptions) {
              localStorage.setItem('actionReportsPdfExportOptions', JSON.stringify(context.reportSettings.actionReports.pdfExportOptions));
            }

            // Restore saved/generated Action Plan snapshot (final Actions Report)
            if ((context.reportSettings.actionReports as any).savedActionPlanSnapshot) {
              localStorage.setItem(
                'savedActionsReportSnapshot',
                JSON.stringify((context.reportSettings.actionReports as any).savedActionPlanSnapshot)
              );
            }
          }

          // Restore Historical Progress UI preferences
          if ((context.reportSettings as any).historicalProgress) {
            const hp = (context.reportSettings as any).historicalProgress;
            if (hp.diagram) {
              localStorage.setItem('historicalProgressDiagramSettings', JSON.stringify(hp.diagram));
            }
            if (hp.journeys) {
              localStorage.setItem('historicalProgressJourneysSettings', JSON.stringify(hp.journeys));
            }
          }
        }
        
        // Load individual report filter states - store in localStorage to be restored by FilterProvider
        if (context.reportFilterStates) {
          localStorage.setItem('savedReportFilterStates', JSON.stringify(context.reportFilterStates));
        }
        
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
        
        // Mark as file upload (.seg file) so we exit demo mode
        isFileUploadRef.current = true;
        
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
        // Premium features restoration logic (legacy format):
        // - If TM user loads TM file: Restore premium features from file
        // - If TM user loads regular file: Keep TM user logged in (preserve authentication)
        // - If free user loads TM file: Don't restore premium features (skip this block)
        // Premium features restoration logic (legacy format):
        // - Everyone can SEE premium features from files (for display)
        // - Only TM users can EDIT premium features (controls already restricted)
        // - Free users preserve original premium data when saving
        if ((saveData as any).premium?.brandPlusUser) {
          // Store original premium data to preserve when saving
          originalPremiumDataRef.current = {
            effects: (saveData as any).premium.effects || [],
            brandPlusUser: true
          };
          
          // Restore premium effects for DISPLAY (everyone can see them)
          setActiveEffects(new Set((saveData as any).premium.effects || []));
          
          // Only update isPremium if current user is also premium (for editing permissions)
          if (isPremium) {
            setIsPremium((saveData as any).premium.isPremium || false);
          }
        } else {
          // File wasn't created by TM user - clear original premium data
          originalPremiumDataRef.current = null;
        }
        // If file wasn't created by TM user, keep current isPremium state (don't log out TM users)
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




  // Listen for file upload events (CSV/.seg) to mark them
  useEffect(() => {
    const handleFileUpload = () => {
      isFileUploadRef.current = true;
    };
    
    document.addEventListener('file-upload-started', handleFileUpload);
    return () => {
      document.removeEventListener('file-upload-started', handleFileUpload);
    };
  }, []);

  const handleDataChange = (newData: DataPoint[], headerScales?: HeaderScales) => {
    // Process data to ensure group property
    const processedData = newData.map(point => ({
      ...point,
      group: point.group || 'default'
    }));
  
    // If user is uploading their own file (CSV/.seg, not demo data and not manual entry), exit demo mode
    if (isDemoMode && !isDemoDataLoadRef.current && isFileUploadRef.current) {
      setIsDemoMode(false);
    }
    
    // Reset file upload flag after processing
    isFileUploadRef.current = false;
  
    // Only set scales on first data entry or when explicitly provided by headerScales
    if (data.length === 0 || headerScales) {
      // If headerScales is explicitly provided, use those exact scales
      if (headerScales) {
        setScales({
          satisfactionScale: headerScales.satisfaction,
          loyaltyScale: headerScales.loyalty,
          isLocked: true
        });
        // Store source header names for dynamic axis labels
        setAxisHeaderNames({
          satisfaction: headerScales.satisfactionHeaderName,
          loyalty: headerScales.loyaltyHeaderName
        });
        // Default "Show Recommendation Score" from loyalty scale (CSV/demo/manual). .seg load overwrites this in onSettingsLoad.
        const showRec = headerScales.loyalty.startsWith('0-');
        localStorage.setItem('showRecommendationScore', String(showRec));
        document.dispatchEvent(new CustomEvent('segFileLoaded'));
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
        // Auto-detect never produces 0-10, so default Recommendation Score off
        localStorage.setItem('showRecommendationScore', 'false');
        document.dispatchEvent(new CustomEvent('segFileLoaded'));
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
      setAxisHeaderNames({}); // Reset axis labels to defaults
      localStorage.setItem('showRecommendationScore', 'false');
      document.dispatchEvent(new CustomEvent('segFileLoaded'));
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
      setAxisHeaderNames({}); // Reset axis labels to defaults
      localStorage.setItem('showRecommendationScore', 'false');
      document.dispatchEvent(new CustomEvent('segFileLoaded'));
      
      // Clear storage so DemoButton shows when data is empty
      storageManager.clearState();
      
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
    <>
    <TranslationBanner />
    <div className="app">
      {/* Loading screen for demo data */}
      <UnifiedLoadingPopup isVisible={isLoadingDemo} text="segmenting" size="medium" />
      
      <ScreenSizeWarning />
      
      {/* Teresa Monroe Staff Indicator - Hidden from regular users, only visible when authenticated */}
      {isPremium && (
        <BrandPlusIndicator 
          isPremium={isPremium}
          onSignIn={() => {
            window.location.href = '/tm';
          }}
        />
      )}
      
      {/* App Header - Removed redundant header, mode indicator moved to welcome banner */}
      
      <main className="app-content">
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

        {/* Demo Tour - Shows when trial=true and demo data is loaded */}
        <DemoTour
          isOpen={showDemoTour}
          onClose={handleCloseTour}
          isPremium={isPremium}
          dataLength={data.length}
        />
            
            <div className="section data-entry-section" ref={dataEntryRef} data-section-id="data-entry">
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
              <AxisLabelsProvider
                satisfactionHeaderName={axisHeaderNames.satisfaction}
                loyaltyHeaderName={axisHeaderNames.loyalty}
              >
              <div className="section data-table-section" data-section-id="data-table">
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
                <UnsavedChangesTracker
                  data={data}
                  satisfactionScale={scales.satisfactionScale}
                  loyaltyScale={scales.loyaltyScale}
                  showGrid={showGrid}
                  showScaleNumbers={true}
                  showLegends={true}
                  showNearApostles={showNearApostles}
                  showSpecialZones={showSpecialZones}
                  isAdjustableMidpoint={isAdjustableMidpoint}
                  labelMode={1}
                  labelPositioning="below-dots"
                  areasDisplayMode={showNearApostles ? 3 : 2}
                  frequencyFilterEnabled={frequencyFilterEnabled}
                  frequencyThreshold={frequencyThreshold}
                  isPremium={isPremium}
                  effects={activeEffects}
                  midpoint={midpoint || undefined}
                  apostlesZoneSize={apostlesZoneSize}
                  terroristsZoneSize={terroristsZoneSize}
                  isClassicModel={isClassicModel}
                  onHasUnsavedChangesChange={setHasUnsavedChanges}
                  onReloadRequested={() => setShowReloadModal(true)}
                />
                <div className="section visualization-section" ref={visualizationRef} data-section-id="main-chart">
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

                <div className="section reporting-section" data-section-id="reports">
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
                
                {/* Left Drawer with Save Button and Teresa Monroe Staff Indicator - Inside providers for context access */}
                <LeftDrawer
                  isOpen={isDrawerOpen} 
                  onToggle={() => setIsDrawerOpen(!isDrawerOpen)}
                  isPremium={isPremium}
                >
                  {/* Section Navigation */}
                  <SectionNavigation dataLength={data.length} />
                  
                  {/* Spacer to push bottom content down */}
                  <div style={{ flex: 1 }} />
                  
                  {/* Support Section - Always at bottom */}
                  <div className="drawer-section">
                    <a
                      href="/getting-started.html"
                      className="drawer-item"
                      title="Get help and support – getting started guide"
                    >
                      <span className="drawer-item-icon">
                        <MessageCircleQuestion size={18} />
                      </span>
                      <span className="drawer-item-text">Help</span>
                    </a>
                  </div>
                  
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
                      originalPremiumData={originalPremiumDataRef.current}
                    />
                  )}
                </LeftDrawer>
                </QuadrantAssignmentProvider>
              </FilterProvider>
              </AxisLabelsProvider>
            )}
          </main>
        </div>
        
        {/* Exit Confirmation Modal (Option 4) */}
        <UnsavedChangesModal
          isOpen={showExitModal}
          onSaveAndLeave={async () => {
            // Note: In a real implementation, you'd need to expose a save function
            // from DrawerSaveButton or use a context. For now, we'll just close.
            // The user can manually save before leaving.
            setShowExitModal(false);
            if (pendingNavigation) {
              pendingNavigation();
              setPendingNavigation(null);
            }
          }}
          onLeaveWithoutSaving={() => {
            setShowExitModal(false);
            if (pendingNavigation) {
              pendingNavigation();
              setPendingNavigation(null);
            }
          }}
          onCancel={() => {
            setShowExitModal(false);
            setPendingNavigation(null);
          }}
        />
        
        {/* Reload Confirmation Modal */}
        <UnsavedChangesModal
          isOpen={showReloadModal}
          isReloadModal={true}
          onSaveAndLeave={() => {}} // Not used for reload modal
          onLeaveWithoutSaving={() => {}} // Not used for reload modal
          onCancel={() => setShowReloadModal(false)}
          onReload={() => {
            setShowReloadModal(false);
            // Clear all app data from localStorage
            storageManager.clearState();
            // Clear the unsaved changes tracking state
            localStorage.removeItem('apostles-model-last-saved-state');
            localStorage.removeItem('apostles-model-last-saved-time');
            // Set flag to skip the browser's beforeunload dialog (prevents duplicate)
            sessionStorage.setItem('skipBeforeUnload', 'true');
            window.location.reload();
          }}
        />
        
        {/* Footer */}
        <Footer />
    </>
  );
};

export default App;