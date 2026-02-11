import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { 
  CSVRow, 
  HeaderScales, 
  ValidationErrorData, 
  ProgressState,
  DuplicateReport,
  DateIssueReport
} from '../types';
import { 
  validateFile, 
  validateDataRows, 
  formatFileSize
} from '../utils';

// Import from utils/headerProcessing directly to avoid conflicts
import { 
  processHeaders, 
  processHeadersWithDataAnalysis, 
  isMetadataRow, 
  EnhancedHeaderProcessingResult,
  analyzeColumnsForMapping,
  MappingAnalysis
} from '../utils/headerProcessing';

interface UseCSVParserProps {
  onComplete: (
    data: any[], 
    headerScales: HeaderScales, 
    fileName: string,
    hasDateIssues: boolean,
    hasDateWarnings: boolean
  ) => boolean;
  onDuplicatesFound: (duplicates: DuplicateReport) => void;
  onError: (error: ValidationErrorData) => void;
  satisfactionScale: string;
  loyaltyScale: string;
  scalesLocked: boolean;
  existingIds: string[];
  setPendingFileData: (data: {file: File, headerScales: HeaderScales, validatedData?: any[], headerResult?: any} | null) => void;
  showImportModeDialog: () => void;
  onMappingNeeded?: (analysis: MappingAnalysis, file: File, cleanedData: any[]) => void;
}

export const useCSVParser = ({
  onComplete,
  onDuplicatesFound,
  onError,
  satisfactionScale,
  loyaltyScale,
  scalesLocked,
  existingIds,
  setPendingFileData,
  showImportModeDialog,
  onMappingNeeded
}: UseCSVParserProps) => {
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [dateIssuesReport, setDateIssuesReport] = useState<DateIssueReport | null>(null);
  const [dateWarningsReport, setDateWarningsReport] = useState<DateIssueReport | null>(null);

  const parseFile = useCallback((file: File) => {
    console.log("parseFile called for:", file.name);
    // Reset state
    setCurrentFileName(file.name);
    setDateIssuesReport(null);
    setDateWarningsReport(null);
    setPendingFileData(null);
    
    // Initialize progress
    setProgress({
      stage: 'reading',
      progress: 0,
      fileName: file.name,
      fileSize: formatFileSize(file.size)
    });

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid && validation.error) {
      console.log("File validation failed:", validation.error);
      onError(validation.error);
      setProgress(null);
      return;
    }

    // Parse CSV
    const parseConfig = { 
      complete: (results: Papa.ParseResult<CSVRow>) => {
        try {
          console.log("Papa parsing complete, rows:", results.data.length);
          setProgress(prev => prev ? { ...prev, stage: 'validating', progress: 30 } : null);

          if (results.data.length < 2) {
            console.log("Not enough data rows");
            onError({
              title: 'Empty or invalid file',
              message: 'CSV file must contain at least one row of data',
              fix: 'Please check your file contains data rows below the header row'
            });
            setProgress(null);
            return;
          }

          setProgress(prev => prev ? { ...prev, progress: 50 } : null);
          
          // Filter out metadata rows from data (REQUIRED/OPTIONAL)
          const cleanedData = results.data.filter(row => !isMetadataRow(row));
          
          // Process headers
          const headers = Object.keys(results.data[0] || {});
          console.log("Processing headers:", headers);

          // ── NEW: Run mapping analysis FIRST to decide the flow path ──
          const mappingAnalysis = analyzeColumnsForMapping(headers, cleanedData);
          const needsMapping =
            mappingAnalysis.satisfaction.status !== 'auto-detected' ||
            mappingAnalysis.loyalty.status !== 'auto-detected';

          if (needsMapping && onMappingNeeded) {
            console.log("Mapping card needed — handing off to DataMappingCard");
            console.log("  Satisfaction status:", mappingAnalysis.satisfaction.status);
            console.log("  Loyalty status:", mappingAnalysis.loyalty.status);
            onMappingNeeded(mappingAnalysis, file, cleanedData);
            setProgress(prev => prev ? { ...prev, stage: 'waiting-for-mapping', progress: 55 } : null);
            return;
          }

          // ── Both axes auto-detected → proceed with existing pipeline ──
          const headerResult = processHeadersWithDataAnalysis(headers, cleanedData);
          
          if (!headerResult.isValid) {
            console.log("Invalid headers:", headerResult.errors);
            onError({
              title: 'Invalid CSV structure',
              message: 'There are issues with the CSV headers',
              details: headerResult.errors.join('\n'),
              fix: 'Please ensure your CSV has properly formatted Satisfaction and Loyalty columns.'
            });
            setProgress(null);
            return;
          }

          if (!headerResult.satisfactionHeader || !headerResult.loyaltyHeader) {
            console.log("Missing required headers");
            onError({
              title: 'Missing required columns',
              message: 'CSV must contain both Satisfaction and Loyalty columns',
              fix: 'Please add the missing columns or download and use the template provided'
            });
            setProgress(null);
            return;
          }
          
          // Check if enhanced scale detection needs user confirmation
          if (headerResult.needsUserConfirmation) {
            console.log("Scale confirmation needed, storing pending data");
            setPendingFileData({
              file,
              headerScales: headerResult.scales,
              validatedData: undefined,
              headerResult
            });
            setProgress(prev => prev ? { ...prev, stage: 'waiting-for-scale-confirmation', progress: 60 } : null);
            return;
          }

          // Use detected scales and include original header names
          const headerScales: HeaderScales = {
            ...headerResult.scales,
            satisfactionHeaderName: headerResult.satisfactionHeader || undefined,
            loyaltyHeaderName: headerResult.loyaltyHeader || undefined
          };
          console.log("Detected scales:", headerScales);

          // Process data rows
          try {
            console.log("Validating data rows");
            const validationResult = validateDataRows(
              cleanedData, 
              headerResult.satisfactionHeader, 
              headerResult.loyaltyHeader,
              headerScales.satisfaction,
              headerScales.loyalty
            );
          
            const validatedData = validationResult.data;
            console.log("Validation complete, valid rows:", validatedData.length);
            
            // Set reports for UI display
            let hasDateIssues = false;
            let hasDateWarnings = false;
            
            if (validationResult.rejectedReport.count > 0) {
              console.log("Date issues found:", validationResult.rejectedReport.count);
              setDateIssuesReport(validationResult.rejectedReport);
              hasDateIssues = true;
            }
            
            if (validationResult.warningReport.count > 0) {
              console.log("Date warnings found:", validationResult.warningReport.count);
              setDateWarningsReport(validationResult.warningReport);
              hasDateWarnings = true;
            }

            setProgress(prev => prev ? { ...prev, progress: 90 } : null);
            
            // Pass the validated data to the parent component for further processing
            console.log("Calling onComplete");
            const result = onComplete(
              validatedData, 
              headerScales, 
              file.name,
              hasDateIssues,
              hasDateWarnings
            );
            console.log("onComplete result:", result);
            
            // If result is true, the import was successful
            if (result) {
              console.log("Import successful, setting complete state");
              setProgress(prev => prev ? { ...prev, stage: 'complete', progress: 100 } : null);
              setTimeout(() => setProgress(null), 2000);
            } else {
              // Import was not completed (e.g., waiting for user confirmation)
              console.log("Import incomplete, waiting for user action");
              setProgress(prev => prev ? { ...prev, stage: 'processing', progress: 95 } : null);
            }
          } catch (err) {
            console.error('Validation Error:', err);
            onError({
              title: 'Validation Error',
              message: err instanceof Error ? err.message : 'Unknown error occurred',
              fix: 'Please check your data and try again'
            });
            setProgress(null);
            return;
          }
          
        } catch (err) {
          console.error('CSV Processing Error:', err);
          onError({
            title: 'Processing Error',
            message: err instanceof Error ? err.message : 'Unknown error occurred',
            fix: 'Please check your file format and try again'
          });
          setProgress(prev => prev ? { ...prev, stage: 'error' } : null);
          setTimeout(() => setProgress(null), 1000);
        }
      },
      header: true,
      skipEmptyLines: true,
      error: (error: Error) => {
        console.error('CSV Parsing Error:', error);
        onError({
          title: 'Invalid CSV Format',
          message: 'Could not parse the CSV file',
          details: error.message,
          fix: 'Make sure your file is a properly formatted CSV'
        });
        setProgress(prev => prev ? { ...prev, stage: 'error' } : null);
        setTimeout(() => setProgress(null), 1000);
      }
    };
    
    // Apply parse config
    Papa.parse(file, parseConfig as Papa.ParseConfig);
  }, [
    onComplete, 
    onError,
    setPendingFileData,
    onMappingNeeded
  ]);

  return {
    progress,
    currentFileName,
    parseFile,
    dateIssuesReport,
    dateWarningsReport,
    setProgress
  };
};