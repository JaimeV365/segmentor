import React, { useState, useCallback, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { DataPoint, ScaleFormat } from '@/types/base';
import { useNotification } from '../../NotificationSystem';
import { FileUploader } from './components/FileUploader';
import { UploadHistory, UploadHistoryItem } from './components/UploadHistory';
import { ImportModeModal, ImportMode } from './components/ImportModeModal';
import { ScaleConfirmationModal } from './components/ScaleConfirmationModal';
import { DataMappingCard, DataMappingSelection } from './components/DataMappingCard';
import { 
  applyConfirmedScales, 
  isMetadataRow, 
  detectPossibleScales,
  getDefaultScale,
  MappingAnalysis,
  EnhancedHeaderProcessingResult
} from './utils/headerProcessing';
import ReportArea from './components/ReportArea';
import { 
  generateDuplicateCSV, 
  generateTemplateCSV,
  generateDateIssuesCSV,
  validateDataRows,
  detectDuplicates
} from './utils';
import { useCSVParser, useCSVValidation } from './hooks';
import { HeaderScales } from './types';
import { UnifiedLoadingPopup } from '../../../ui/UnifiedLoadingPopup';
import './styles/index.css';

// Demo limitation constants
const DEMO_MAX_ENTRIES = 100;


interface CSVImportProps {
  onImport: (
    data: Array<{ 
      id: string; 
      name: string; 
      satisfaction: number; 
      loyalty: number;
      date?: string;
      email?: string;
      [key: string]: any;
    }>, 
    headerScales: HeaderScales,
    overwrite?: boolean
  ) => string[];
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  existingIds: string[];
  existingData: DataPoint[]; 
  scalesLocked: boolean;
  uploadHistory: UploadHistoryItem[];
  onUploadSuccess: (fileName: string, count: number, ids: string[], wasOverwrite?: boolean) => void;
  lastManualEntryTimestamp?: number; // New prop to track manual entries
  onSegFileLoad?: (file: File) => Promise<void>;
  isDemoMode?: boolean; // New prop to detect demo mode
}

export const CSVImport: React.FC<CSVImportProps> = ({ 
  onImport, 
  satisfactionScale, 
  loyaltyScale, 
  existingIds,
  existingData,
  scalesLocked,
  uploadHistory,
  onUploadSuccess,
  lastManualEntryTimestamp = 0,
  onSegFileLoad,
  isDemoMode = false
}) => {
  const { showNotification } = useNotification();
  
  const [showImportModeModal, setShowImportModeModal] = useState(false);
  const [pendingFileData, setPendingFileData] = useState<{
    file: File, 
    headerScales: HeaderScales,
    validatedData?: any[],
    headerResult?: any
  } | null>(null);
  const [showScaleConfirmationModal, setShowScaleConfirmationModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── Data Mapping Card state ──
  const [showMappingCard, setShowMappingCard] = useState(false);
  const [mappingAnalysis, setMappingAnalysis] = useState<MappingAnalysis | null>(null);
  const [pendingMappingData, setPendingMappingData] = useState<{
    file: File;
    cleanedData: any[];
  } | null>(null);
  
  // Use ref to store setProgress so it can be accessed in processParsedData before useCSVParser is called
  const setProgressRef = useRef<((progress: any) => void) | null>(null);
  
  const {
    error,
    setError,
    duplicateReport,
    setDuplicateReport,
    dateIssuesReport,
    setDateIssuesReport,
    dateWarningsReport,
    setDateWarningsReport,
    clearValidationState
  } = useCSVValidation();

  // Add this new effect to listen for clear warnings event
  useEffect(() => {
    const handleClearWarnings = () => {
      clearValidationState();
    };

    document.addEventListener('clear-csv-warnings', handleClearWarnings);
    return () => {
      document.removeEventListener('clear-csv-warnings', handleClearWarnings);
    };
  }, [clearValidationState]);

  // Clear pending data when component unmounts
  useEffect(() => {
    return () => {
      setPendingFileData(null);
    };
  }, []);
  
  // Clear validation state when a manual entry is made
  useEffect(() => {
    if (lastManualEntryTimestamp > 0) {
      clearValidationState();
    }
  }, [lastManualEntryTimestamp, clearValidationState]);

  // Handle scale confirmation modal display
  useEffect(() => {
    if (pendingFileData?.headerResult?.needsUserConfirmation) {
      setShowScaleConfirmationModal(true);
    }
  }, [pendingFileData]);

  const showImportModeDialog = useCallback(() => {
    console.log("Opening import mode dialog");
    setShowImportModeModal(true);
  }, []);

  // This function processes a valid CSV file that passed initial validations
  const processParsedData = useCallback((
    validatedData: any[], 
    headerScales: HeaderScales, 
    fileName: string,
    forceOverwrite: boolean = false
  ) => {
    console.log("processParsedData called:", {
      dataLength: validatedData.length,
      headerScales,
      fileName,
      forceOverwrite
    });
    
    // HISTORICAL TRACKING: Check for internal duplicates within the file
    // Only flag as duplicate if same ID AND same date (allows historical tracking)
    const idDateMap = new Map<string, Set<string>>(); // Map<id, Set<dates>>
    const trueDuplicates: Array<{id: string, date: string}> = [];
    
    validatedData.forEach(item => {
      if (item.id) {
        const normalizedDate = (item.date || '').trim();
        const idDateKey = `${item.id}|${normalizedDate}`;
        
        if (!idDateMap.has(item.id)) {
          idDateMap.set(item.id, new Set());
        }
        
        const dateSet = idDateMap.get(item.id)!;
        if (dateSet.has(normalizedDate)) {
          // Same ID + same date = duplicate
          trueDuplicates.push({ id: item.id, date: normalizedDate || 'no date' });
        } else {
          dateSet.add(normalizedDate);
        }
      }
    });
    
    console.log("Internal duplicates check (same ID + same date):", trueDuplicates);
    
    if (trueDuplicates.length > 0) {
      console.log("Found internal duplicates, showing error");
      // Create a unique list of duplicate IDs
      const uniqueDuplicateIds = Array.from(new Set(trueDuplicates.map(d => d.id)));
      
      setError({
        title: 'Duplicate IDs Found',
        message: 'Your CSV contains entries with the same ID and date.',
        details: 'Duplicate IDs (same ID + same date): ' + uniqueDuplicateIds.join(', '),
        fix: 'IDs can be the same if they have different dates (for historical tracking). Please ensure entries with the same ID have different dates, or use unique IDs.'
      });
      setProgressRef.current?.(null); // Clear progress to unblock the upload area
      return false;
    }
    
    // Validation based on mode
    if (!forceOverwrite) {
      // Append mode - check for conflicts with existing data
      console.log("Append mode - checking conflicts with existing data");
      
      // Find IDs that exist in both datasets
      const conflictingIds = validatedData
        .map(item => item.id)
        .filter(id => existingIds.includes(id));
      
      console.log("Conflicting IDs:", conflictingIds);
      
      if (conflictingIds.length > 0) {
        console.log("Found conflicts with existing data");
        // Create unique list of conflicting IDs
        const uniqueConflictIds = Array.from(new Set(conflictingIds));
        
        if (uniqueConflictIds.length > 0) {
          setError({
            title: 'Duplicate entries detected',
            message: `${uniqueConflictIds.length} entries in your CSV already exist in the system.`,
            details: 'Duplicate IDs: ' + uniqueConflictIds.join(', '),
            fix: 'Please use unique IDs or choose to replace all data instead.'
          });
          setProgressRef.current?.(null); // Clear progress to unblock the upload area
          return false;
        }
      }
      
      // Validate scales if existing data is present (only in append mode)
      if (scalesLocked) {
        console.log("Scales locked, checking compatibility");
        if (headerScales.satisfaction !== satisfactionScale) {
          console.log("Satisfaction scale mismatch");
          setError({
            title: 'Scale mismatch',
            message: `CSV uses different Satisfaction scale (${headerScales.satisfaction}) than current (${satisfactionScale})`,
            fix: 'Please adjust your CSV file scales to match the current settings or use replace mode'
          });
          setProgressRef.current?.(null);
          return false;
        }

        if (headerScales.loyalty !== loyaltyScale) {
          console.log("Loyalty scale mismatch");
          setError({
            title: 'Scale mismatch',
            message: `CSV uses different Loyalty scale (${headerScales.loyalty}) than current (${loyaltyScale})`,
            fix: 'Please adjust your CSV file scales to match the current settings or use replace mode'
          });
          setProgressRef.current?.(null);
          return false;
        }
      }
    } else {
      console.log("Overwrite mode - bypassing all existing data validations");
    }
    
    try {
      console.log("All checks passed, calling onImport");
      
      // Apply demo limitation if in demo mode
      let dataToImport = validatedData;
      let truncatedCount = 0;
      
      console.log("Demo mode check:", {
        isDemoMode,
        forceOverwrite,
        validatedDataLength: validatedData.length,
        existingDataLength: existingData.length
      });
      
      if (isDemoMode) {
        if (forceOverwrite) {
          // For overwrite mode, limit to demo max entries (don't check against existing data)
          console.log("Overwrite mode: limiting new data to", DEMO_MAX_ENTRIES, "entries");
          if (validatedData.length > DEMO_MAX_ENTRIES) {
            dataToImport = validatedData.slice(0, DEMO_MAX_ENTRIES);
            truncatedCount = validatedData.length - DEMO_MAX_ENTRIES;
          }
        } else {
          // For add mode, check if adding would exceed limit
          const currentCount = existingData.length;
          const availableSlots = DEMO_MAX_ENTRIES - currentCount;
          
          console.log("Append mode: current count =", currentCount, ", available slots =", availableSlots);
          
          if (availableSlots <= 0) {
            console.log("No available slots, showing error");
            showNotification({
              title: 'Demo Limitation',
              message: `Demo mode is limited to ${DEMO_MAX_ENTRIES} entries. You have reached the limit. Use "Replace All" to replace existing data, or exit demo mode for unlimited data.`,
              type: 'warning'
            });
            setProgressRef.current?.(null);
            return false;
          }
          
          if (validatedData.length > availableSlots) {
            dataToImport = validatedData.slice(0, availableSlots);
            truncatedCount = validatedData.length - availableSlots;
          }
        }
      }
      
      // Process the import
      const importedIds = onImport(dataToImport, headerScales, forceOverwrite);
      console.log("Import successful, got IDs:", importedIds.length);
      
      onUploadSuccess(fileName, dataToImport.length, importedIds, forceOverwrite);
      
      // Show appropriate success message
      let successMessage = `Successfully ${forceOverwrite ? 'replaced all data' : 'imported'} ${dataToImport.length} entries from ${fileName}`;
      
      if (isDemoMode && truncatedCount > 0) {
        successMessage += `. Note: Demo mode is limited to ${DEMO_MAX_ENTRIES} entries. ${truncatedCount} entries were not imported. Exit demo mode for unlimited data.`;
      }
      
      showNotification({
        title: 'Success',
        message: successMessage,
        type: 'success'
      });
      
      console.log("Clearing progress state");
      setProgressRef.current?.(null); // Clear progress state to unblock the upload area
      
      // Instead of clearing all validation states, only clear errors
      // This preserves warnings like duplicates
      setError(null); 
      return true;
    } catch (err) {
      console.error('Import Error:', err);
      setError({
        title: 'Import Error',
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        fix: 'Please try again or contact support'
      });
      setProgressRef.current?.(null); // Clear progress state even on error
      return false;
    }
  }, [onImport, onUploadSuccess, satisfactionScale, loyaltyScale, scalesLocked, setError, showNotification, existingIds, existingData, isDemoMode, clearValidationState]);

  const handleCompleteImport = useCallback((
    validatedData: any[], 
    headerScales: HeaderScales, 
    fileName: string,
    hasDateIssues: boolean = false,
    hasDateWarnings: boolean = false
  ) => {
    console.log("handleCompleteImport called:", {
      dataLength: validatedData.length,
      headerScales,
      fileName,
      hasDateIssues,
      hasDateWarnings
    });
    
    // Always check for all types of duplicates and set reports
    console.log("Checking for duplicates");
    const duplicateInfo = detectDuplicates(validatedData, existingData);
    console.log("Duplicate info:", duplicateInfo);
    
    if (duplicateInfo.count > 0) {
      console.log("Setting duplicate report with count:", duplicateInfo.count);
      setDuplicateReport(duplicateInfo);
    }
    
    // Only show Add/Replace if there's existing data - check both existingIds and existingData
    // Make sure we have actual data, not just empty arrays
    const hasExistingData = existingData && Array.isArray(existingData) && existingData.length > 0;
    const hasExistingIds = existingIds && Array.isArray(existingIds) && existingIds.length > 0;
    
    if (hasExistingIds && hasExistingData) {
      console.log("Existing data found, showing import mode dialog");
      // Store data to be used after mode selection
      setPendingFileData({ 
        file: new File([], fileName), // Placeholder file since we already have the data
        headerScales,
        validatedData
      });
      showImportModeDialog();
      return false;
    }
    
    // If no existing data, proceed with import as "add"
    console.log("No existing data, proceeding with import");
    return processParsedData(validatedData, headerScales, fileName, false);
  }, [existingIds, existingData, setDuplicateReport, processParsedData, showImportModeDialog]);

  // ── Data Mapping Card: "mapping needed" handler (must be declared before useCSVParser) ──

  /**
   * Called by useCSVParser when the mapping analysis determines that
   * one or both axes could not be auto-detected.
   */
  const handleMappingNeeded = useCallback((
    analysis: MappingAnalysis,
    file: File,
    cleanedData: any[]
  ) => {
    console.log("Mapping card triggered");
    setMappingAnalysis(analysis);
    setPendingMappingData({ file, cleanedData });
    setShowMappingCard(true);
  }, []);

  const {
    progress,
    parseFile,
    dateIssuesReport: parserDateIssues,
    dateWarningsReport: parserDateWarnings,
    setProgress
  } = useCSVParser({
    onComplete: handleCompleteImport,
    onDuplicatesFound: setDuplicateReport,
    onError: setError,
    satisfactionScale,
    loyaltyScale,
    scalesLocked,
    existingIds,
    setPendingFileData,
    showImportModeDialog,
    onMappingNeeded: handleMappingNeeded
  });
  
  // Store setProgress in ref so it can be accessed in processParsedData
  useEffect(() => {
    setProgressRef.current = setProgress;
  }, [setProgress]);
  
  // Manage loading state - only show for actual data processing
  useEffect(() => {
    // Hide loading popup if any user interaction modal is open
    if (showImportModeModal || showScaleConfirmationModal || showMappingCard) {
      setIsLoading(false);
      return;
    }
    
    if (progress) {
      // Only show loading popup for actual data processing stages
      if (progress.stage === 'reading' || progress.stage === 'validating' || progress.stage === 'processing') {
        setIsLoading(true);
      } else {
        // Hide for everything else (complete, error, user interaction, etc.)
        setIsLoading(false);
      }
    } else {
      // No progress means no loading
      setIsLoading(false);
    }
  }, [progress, showImportModeModal, showScaleConfirmationModal, showMappingCard]);
  
  // Additional safety: hide loading when no progress and no pending data
  useEffect(() => {
    if (!progress && !pendingFileData) {
      setIsLoading(false);
    }
  }, [progress, pendingFileData]);

  // FIXED: Updated handleScaleConfirmation to prevent infinite loop
  const handleScaleConfirmation = useCallback((confirmedScales: { satisfaction?: ScaleFormat; loyalty?: ScaleFormat }) => {
    console.log("Scale confirmation received:", confirmedScales);
    
    if (!pendingFileData?.headerResult) {
      console.error("No pending file data with header result");
      return;
    }
    
    // Apply confirmed scales to the header result
    const finalHeaderScales = applyConfirmedScales(pendingFileData.headerResult, confirmedScales);
    console.log("Final header scales:", finalHeaderScales);
    
    // Close the modal immediately
    setShowScaleConfirmationModal(false);
    
    // If we have validated data already, use it directly
    if (pendingFileData.validatedData) {
      console.log("Using existing validated data");
      const validatedData = pendingFileData.validatedData;
      const fileName = pendingFileData.file.name || 'data.csv';
      
      // Clear pending data first to prevent re-triggering
      setPendingFileData(null);
      
      // Complete the import with confirmed scales
      const success = processParsedData(validatedData, finalHeaderScales.scales, fileName, false);
      if (success) {
        setProgressRef.current?.(null);
      }
      return;
    }
    
    // If we don't have validated data, we need to continue processing from where we left off
    console.log("Continuing with scale-confirmed processing");
    
    // Read the file data again but with confirmed scales
    const file = pendingFileData.file;
    
    // Clear pending data to prevent re-triggering
    setPendingFileData(null);
    
    // Parse the file content directly without going through the full parseFile cycle
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          console.log("Re-parsing with confirmed scales complete");
          
          // Filter out metadata rows
          const cleanedData = results.data.filter(row => !isMetadataRow(row));
          
          // Get headers for validation
          const headers = Object.keys(results.data[0] || {});
          const headerResult = pendingFileData.headerResult;
          
          if (!headerResult?.satisfactionHeader || !headerResult?.loyaltyHeader) {
            console.error("Missing header information");
            setError({
              title: 'Processing Error',
              message: 'Missing header information for validation',
              fix: 'Please try uploading the file again'
            });
            setProgressRef.current?.(null);
            return;
          }
          
          // Validate data with confirmed scales
          console.log("Validating data with confirmed scales:", finalHeaderScales.scales);
          const validationResult = validateDataRows(
            cleanedData,
            headerResult.satisfactionHeader,
            headerResult.loyaltyHeader,
            finalHeaderScales.scales.satisfaction,
            finalHeaderScales.scales.loyalty,
            existingData // Pass existing data for ID reuse (historical tracking)
          );
          
          const validatedData = validationResult.data;
          console.log("Scale-confirmed validation complete, rows:", validatedData.length);
          
          // Set reports for UI display
          if (validationResult.rejectedReport.count > 0) {
            setDateIssuesReport(validationResult.rejectedReport);
          }
          
          if (validationResult.warningReport.count > 0) {
            setDateWarningsReport(validationResult.warningReport);
          }
          
          // Complete the import process
          const success = handleCompleteImport(
            validatedData,
            finalHeaderScales.scales,
            file.name,
            validationResult.rejectedReport.count > 0,
            validationResult.warningReport.count > 0
          );
          
          if (success) {
            setProgressRef.current?.(null);
          }
          
        } catch (err) {
          console.error('Scale confirmation processing error:', err);
          setError({
            title: 'Processing Error',
            message: err instanceof Error ? err.message : 'Unknown error occurred',
            fix: 'Please try uploading the file again'
          });
          setProgressRef.current?.(null);
        }
      },
      error: (error: Error) => {
        console.error('Scale confirmation re-parsing error:', error);
        setError({
          title: 'File Processing Error',
          message: 'Could not process the file with confirmed scales',
          details: error.message,
          fix: 'Please try uploading the file again'
        });
        setProgressRef.current?.(null);
      }
    });
  }, [pendingFileData, handleCompleteImport, processParsedData, setDateIssuesReport, setDateWarningsReport, setError]);

  const handleScaleConfirmationCancel = useCallback(() => {
    console.log("Scale confirmation cancelled");
    setShowScaleConfirmationModal(false);
    setPendingFileData(null);
    setProgressRef.current?.(null);
  }, []);

  // ── Data Mapping Card handlers (continued) ──

  /**
   * Called when the user confirms their column selections in the DataMappingCard.
   * Runs scale detection on the selected columns, then either:
   *   - Shows the ScaleConfirmationModal (if scales are ambiguous)
   *   - Or proceeds directly to data validation and import
   */
  const handleMappingConfirmation = useCallback((selection: DataMappingSelection) => {
    console.log("Mapping card confirmed:", selection);
    setShowMappingCard(false);

    if (!pendingMappingData) {
      console.error("No pending mapping data");
      return;
    }

    const { file, cleanedData } = pendingMappingData;

    // Run scale detection on the user-selected columns
    const satData = cleanedData
      .map(row => parseFloat(row[selection.satisfactionHeader]))
      .filter(n => !isNaN(n));
    const loyData = cleanedData
      .map(row => parseFloat(row[selection.loyaltyHeader]))
      .filter(n => !isNaN(n));

    const satDetection = detectPossibleScales(selection.satisfactionHeader, satData, 'satisfaction');
    const loyDetection = detectPossibleScales(selection.loyaltyHeader, loyData, 'loyalty');

    const needsScaleConfirmation = satDetection.needsUserInput || loyDetection.needsUserInput;

    // Build a header result compatible with the existing pipeline
    const headerResult: EnhancedHeaderProcessingResult = {
      satisfactionHeader: selection.satisfactionHeader,
      loyaltyHeader: selection.loyaltyHeader,
      scales: {
        satisfaction: satDetection.definitive || getDefaultScale('satisfaction'),
        loyalty: loyDetection.definitive || getDefaultScale('loyalty'),
        satisfactionHeaderName: selection.satisfactionHeader,
        loyaltyHeaderName: selection.loyaltyHeader,
      },
      isValid: true,
      errors: [],
      scaleDetection: {
        satisfaction: satDetection,
        loyalty: loyDetection,
      },
      needsUserConfirmation: needsScaleConfirmation,
    };

    if (needsScaleConfirmation) {
      console.log("Post-mapping: scale confirmation needed");
      setPendingFileData({
        file,
        headerScales: headerResult.scales,
        validatedData: undefined,
        headerResult
      });
      setShowScaleConfirmationModal(true);
      setPendingMappingData(null);
      return;
    }

    // No scale confirmation needed — validate and import directly
    console.log("Post-mapping: proceeding to validation with scales:", headerResult.scales);
    try {
      const validationResult = validateDataRows(
        cleanedData,
        selection.satisfactionHeader,
        selection.loyaltyHeader,
        headerResult.scales.satisfaction,
        headerResult.scales.loyalty,
        existingData
      );

      const validatedData = validationResult.data;
      console.log("Post-mapping validation complete, rows:", validatedData.length);

      if (validationResult.rejectedReport.count > 0) {
        setDateIssuesReport(validationResult.rejectedReport);
      }
      if (validationResult.warningReport.count > 0) {
        setDateWarningsReport(validationResult.warningReport);
      }

      const success = handleCompleteImport(
        validatedData,
        headerResult.scales,
        file.name,
        validationResult.rejectedReport.count > 0,
        validationResult.warningReport.count > 0
      );

      if (success) {
        setProgressRef.current?.(null);
      }
    } catch (err) {
      console.error('Post-mapping validation error:', err);
      setError({
        title: 'Validation Error',
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        fix: 'Please check your data and try again'
      });
      setProgressRef.current?.(null);
    }

    setPendingMappingData(null);
  }, [pendingMappingData, handleCompleteImport, setError, setDateIssuesReport, setDateWarningsReport, existingData]);

  const handleMappingCancel = useCallback(() => {
    console.log("Mapping card cancelled");
    setShowMappingCard(false);
    setMappingAnalysis(null);
    setPendingMappingData(null);
    setProgressRef.current?.(null);
  }, []);

  // Sync dates issues and warnings from the parser
  useEffect(() => {
    if (parserDateIssues) {
      setDateIssuesReport(parserDateIssues);
    }
    if (parserDateWarnings) {
      setDateWarningsReport(parserDateWarnings);
    }
  }, [parserDateIssues, parserDateWarnings, setDateIssuesReport, setDateWarningsReport]);

  // Clear date warnings when lastManualEntryTimestamp changes (indicating an edit)
  useEffect(() => {
    if (lastManualEntryTimestamp > 0) {
      // Instead of directly using the hooks' setters which expect non-null values
      clearValidationState(); // Use the clearValidationState function which properly resets all states
    }
  }, [lastManualEntryTimestamp, clearValidationState]);

  const handleFileSelect = useCallback(async (file: File) => {
    console.log("File selected:", file.name);
    clearValidationState();
    setPendingFileData(null); // Reset pending data for new file
    setShowMappingCard(false);
    setMappingAnalysis(null);
    setPendingMappingData(null);
    
    // Handle CSV files
    parseFile(file);
  }, [clearValidationState, parseFile, onImport, showNotification]);

  const handleDownloadDuplicateReport = useCallback(() => {
    if (duplicateReport) {
      generateDuplicateCSV(duplicateReport);
    }
  }, [duplicateReport]);

  const handleDownloadDateErrorsReport = useCallback(() => {
    if (dateIssuesReport) {
      generateDateIssuesCSV(dateIssuesReport, 'issues');
    }
  }, [dateIssuesReport]);

  const handleDownloadDateWarningsReport = useCallback(() => {
    if (dateWarningsReport) {
      generateDateIssuesCSV(dateWarningsReport, 'warnings');
    }
  }, [dateWarningsReport]);

  const handleImportModeSelect = (mode: ImportMode) => {
    console.log("Import mode selected:", mode);
    setShowImportModeModal(false);
    
    if (!pendingFileData) {
      console.log("No pending file data, clearing progress");
      setProgressRef.current?.(null); // Clear progress to unblock the upload area
      return;
    }
    
    const overwrite = mode === 'overwrite';
    console.log("Mode selected:", overwrite ? "overwrite" : "append", "| overwrite flag =", overwrite);
    
    // If we already have validated data, use it directly
    if (pendingFileData.validatedData) {
      // For overwrite mode, skip the external validation checks
      if (overwrite) {
        console.log("Using validated data, overwrite mode - bypassing external validations");
        console.log("Calling processParsedData with forceOverwrite =", true, "| data length =", pendingFileData.validatedData.length);
        processParsedData(
          pendingFileData.validatedData, 
          pendingFileData.headerScales, 
          pendingFileData.file.name || 'data.csv',
          true
        );
        setPendingFileData(null);
        return;
      }
      
      // For append mode, do the validation checks
      console.log("Using validated data, append mode - performing validation checks");
      processParsedData(
        pendingFileData.validatedData, 
        pendingFileData.headerScales, 
        pendingFileData.file.name || 'data.csv',
        false
      );
      setPendingFileData(null);
      return;
    }
    
    console.log("No validated data, re-parsing file");
    // Otherwise, we need to re-parse the file
    clearValidationState();
    
    Papa.parse(pendingFileData.file, {
      complete: (results) => {
        try {
          console.log("Re-parsing complete, processing headers");
          const headers = Object.keys(results.data[0] || {});
          const headerResult = {
            satisfactionHeader: headers.find(h => h.toLowerCase().includes('satisfaction') || h.toLowerCase().includes('sat')) || '',
            loyaltyHeader: headers.find(h => h.toLowerCase().includes('loyalty') || h.toLowerCase().includes('loy')) || '',
          };
          
          // Process data rows
          console.log("Validating data rows");
          const validationResult = validateDataRows(
            results.data, 
            headerResult.satisfactionHeader, 
            headerResult.loyaltyHeader,
            pendingFileData.headerScales.satisfaction,
            pendingFileData.headerScales.loyalty,
            existingData // Pass existing data for ID reuse (historical tracking)
          );
          
          const validatedData = validationResult.data;
          console.log("Validation complete, rows:", validatedData.length);
          
          // Check for warnings/issues
          if (validationResult.rejectedReport.count > 0) {
            console.log("Setting date issues report");
            setDateIssuesReport(validationResult.rejectedReport);
          }
          
          if (validationResult.warningReport.count > 0) {
            console.log("Setting date warnings report");
            setDateWarningsReport(validationResult.warningReport);
          }
          
          // Process data with the selected mode
          processParsedData(validatedData, pendingFileData.headerScales, pendingFileData.file.name, overwrite);
          setPendingFileData(null);
        } catch (err) {
          console.error('Re-parsing Error:', err);
          setError({
            title: 'Processing Error',
            message: err instanceof Error ? err.message : 'Unknown error occurred',
            fix: 'Please check your file format and try again'
          });
          setPendingFileData(null);
          setProgressRef.current?.(null); // Clear progress on error
        }
      },
      header: true,
      error: (error: Error) => {
        console.error('CSV Re-Parsing Error:', error);
        setError({
          title: 'Invalid CSV Format',
          message: 'Could not parse the CSV file',
          details: error.message,
          fix: 'Make sure your file is a properly formatted CSV'
        });
        setPendingFileData(null);
        setProgressRef.current?.(null); // Clear progress on error
      }
    });
  };

  const handleTemplateDownload = () => {
    generateTemplateCSV(satisfactionScale, loyaltyScale);
  };
  
  return (
    <div className="csv-import">
      <FileUploader 
        onFileSelect={handleFileSelect}
        onTemplateDownload={handleTemplateDownload}
        processing={!!progress || !!pendingFileData || !!pendingMappingData}
      />
      
      <UnifiedLoadingPopup 
        isVisible={isLoading} 
        text="segmenting"
        size="medium"
      />

      <ReportArea 
        errorReports={dateIssuesReport}
        validationErrors={error}
        warningReports={{
          duplicates: duplicateReport,
          dateWarnings: dateWarningsReport
        }}
        onDownloadDuplicates={handleDownloadDuplicateReport}
        onDownloadDateErrors={handleDownloadDateErrorsReport}
        onDownloadDateWarnings={handleDownloadDateWarningsReport}
      />

      <UploadHistory history={uploadHistory} />

      <ImportModeModal 
        isOpen={showImportModeModal}
        onClose={() => {
          console.log("Import mode modal closed");
          setShowImportModeModal(false);
          setPendingFileData(null);
          setProgressRef.current?.(null); // Clear progress when modal is closed
        }}
        onSelectMode={handleImportModeSelect}
      />

      <ScaleConfirmationModal
        isOpen={showScaleConfirmationModal}
        onConfirm={handleScaleConfirmation}
        onCancel={handleScaleConfirmationCancel}
        scaleDetection={pendingFileData?.headerResult?.scaleDetection || {}}
        basicScales={pendingFileData?.headerScales || { satisfaction: '1-5', loyalty: '1-5' }}
      />

      {mappingAnalysis && (
        <DataMappingCard
          isOpen={showMappingCard}
          mappingAnalysis={mappingAnalysis}
          onConfirm={handleMappingConfirmation}
          onCancel={handleMappingCancel}
        />
      )}
    </div>
  );
};

export type { UploadHistoryItem };