// src/components/data-entry/DataEntryModule.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import DataInput from './forms/DataInput';
import { CSVImport } from './forms/CSVImport';
import SegFileLoader from './forms/SegFileLoader/SegFileLoader';
import TabContainer, { Tab } from '../ui/TabContainer/TabContainer';
import { Upload, Edit3, FolderOpen } from 'lucide-react';
import DemoButton from '../ui/DemoButton/DemoButton';
import { idCounter } from './utils/idCounter';
import { DataPoint, ScaleFormat } from '@/types/base';
import StateManagementService from './services/StateManagementService';
import { 
  DataEntryModuleProps,
  UploadHistoryItem,
  HeaderScales 
} from './types';
import { useNotification } from './NotificationSystem';
import { storageManager } from './utils/storageManager';
import './DataEntryModule.css';

const DataEntryModule: React.FC<DataEntryModuleProps> = ({ 
  onDataChange,
  satisfactionScale,
  loyaltyScale,
  data: externalData,
  onSegFileLoad,
  onDemoDataLoad,
  isDemoMode = false
}) => {
  const [editingData, setEditingData] = useState<DataPoint | null>(null);
  const [data, setData] = useState<DataPoint[]>([]);
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([]);
  const [lastManualEntryTimestamp, setLastManualEntryTimestamp] = useState(0);
  const [activeTab, setActiveTab] = useState('csv-upload');
  const inputSectionRef = useRef<HTMLDivElement>(null);
  const dataEntryModuleRef = useRef<HTMLDivElement>(null);
  const { showNotification } = useNotification();

  const isScalesLocked = StateManagementService.shouldLockScales(
    data, 
    !!editingData, 
    editingData?.id
  );

  // Define startEditing function with useCallback before using it in the useEffect
  const startEditing = useCallback((id: string) => {
    const dataPoint = data.find(item => item.id === id);
    if (dataPoint) {
      setEditingData(dataPoint);
      // Switch to Manual Entry tab
      setActiveTab('manual-entry');
      // Scroll to the data entry module header (which includes the tabs) after a brief delay
      setTimeout(() => {
        if (dataEntryModuleRef.current) {
          dataEntryModuleRef.current.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start' 
          });
        }
      }, 100);
    }
  }, [data]);

  // Listen for edit-data-point event from App
  useEffect(() => {
    const handleEditEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{id: string}>;
      if (customEvent.detail && customEvent.detail.id) {
        startEditing(customEvent.detail.id);
      }
    };

    document.addEventListener('edit-data-point', handleEditEvent);
    
    return () => {
      document.removeEventListener('edit-data-point', handleEditEvent);
    };
  }, [startEditing]);

  useEffect(() => {
    // Only load from storage if externalData is empty (initial load)
    if (externalData?.length) {
      // External data provided - use it (this handles overwrite scenarios)
      setData(externalData);
      return;
    }
    
    // No external data - try loading from storage
    const savedState = storageManager.loadState();
    if (savedState?.data?.length) {
      setData(savedState.data);
      // We're intentionally NOT loading upload history from storage
      // to start with a clean history on each page load
    }
  }, [externalData]);

  const determineGroup = (satisfaction: number, loyalty: number): string => {
    return 'Undefined';
  };

  const handleDataSubmit = (
    id: string, 
    name: string, 
    email: string, 
    satisfaction: number, 
    loyalty: number, 
    date: string,
    dateFormat?: string // Add dateFormat parameter
  ) => {
    try {
      let newId = id;
      
      // HISTORICAL TRACKING: If no ID provided but email exists, reuse ID from existing entry with same email
      // This ensures same customer (same email) gets same ID across different time periods
      if (!newId && email) {
        const normalizedEmail = email.trim().toLowerCase();
        const existingEntryWithEmail = data.find(
          item => item.email && item.email.trim().toLowerCase() === normalizedEmail
        );
        if (existingEntryWithEmail) {
          newId = existingEntryWithEmail.id;
          console.log(`Reusing ID ${newId} for existing email ${email} (historical tracking)`);
        } else {
          newId = idCounter.getNextId();
        }
      } else if (!newId) {
        newId = idCounter.getNextId();
      }

      // First, create the new data point with basic fields
      let newDataPoint: DataPoint & Record<string, any> = {
        id: newId,
        name,
        email: email || undefined,
        satisfaction,
        loyalty,
        date: date || undefined,
        dateFormat: date ? dateFormat : undefined, // Store date format if we have a date
        group: determineGroup(satisfaction, loyalty),
        excluded: false
      };

      // If we are editing, preserve any additional fields from the original data
if (editingData) {
  // Find the original data point
  const originalDataPoint = data.find(item => item.id === editingData.id);
  
  if (originalDataPoint) {
    // Copy all fields from the original data that aren't in the basic fields
    const standardFields = ['id', 'name', 'email', 'satisfaction', 'loyalty', 'date', 'dateFormat', 'group', 'excluded'];
    
    // Iterate over all keys in the original data
    Object.keys(originalDataPoint).forEach(key => {
      // If this is not a standard field, copy it to the new data point
      if (!standardFields.includes(key)) {
        // Use type assertion to tell TypeScript this is safe
        newDataPoint[key] = (originalDataPoint as Record<string, any>)[key];
      }
    });
  }
}

      if (editingData) {
        const newData = data.map(item => 
          item.id === editingData.id ? newDataPoint : item
        );
        setData(newData);
        setEditingData(null);
        
        // Always pass current scales to prevent auto-detection
        const headerScales = {
          satisfaction: satisfactionScale,
          loyalty: loyaltyScale
        };
        onDataChange(newData, headerScales);
        
        storageManager.saveState({
          data: newData,
          uploadHistory
        });

        // Update timestamp to clear CSV import errors and any stale warnings
        setLastManualEntryTimestamp(Date.now());
        
        showNotification({
          title: 'Success',
          message: 'Data point updated successfully',
          type: 'success'
        });
      } else {
        const newData = [...data, newDataPoint];
        setData(newData);
        
        // Always pass current scales to prevent auto-detection
        const headerScales = {
          satisfaction: satisfactionScale,
          loyalty: loyaltyScale
        };
        onDataChange(newData, headerScales);
        
        storageManager.saveState({
          data: newData,
          uploadHistory
        });
        
        // Update timestamp to clear CSV import errors
        setLastManualEntryTimestamp(Date.now());
        
        showNotification({
          title: 'Success',
          message: 'New data point added successfully',
          type: 'success'
        });
      }
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        type: 'error'
      });
    }
  };

  const handleCSVImport = (
    csvData: Array<{ 
      id: string; 
      name: string; 
      satisfaction: number; 
      loyalty: number;
      date?: string;
      email?: string;
      country?: string;
      trueloyalist?: string;
      numpurchases?: string;
      numcomplaints?: string;
      [key: string]: any;
    }>,
    headerScales: HeaderScales,
    overwrite?: boolean
  ): string[] => {
    console.log("handleCSVImport called:", {
      csvDataLength: csvData.length,
      overwrite,
      currentDataLength: data.length
    });
    // Mark as file upload so App.tsx can exit demo mode
    const fileUploadEvent = new CustomEvent('file-upload-started');
    document.dispatchEvent(fileUploadEvent);
    try {
      const processedData = csvData.map(row => {
        // Ensure we have an ID before processing
        const rowId = row.id || row.ID || idCounter.getNextId();
        
        // Create base data point with required fields
        const dataPoint: DataPoint & Record<string, any> = {
          id: rowId,
          name: row.name,
          satisfaction: row.satisfaction,
          loyalty: row.loyalty,
          group: determineGroup(row.satisfaction, row.loyalty)
        };
        
        // Add optional fields if they exist
        if (row.date) dataPoint.date = row.date;
        if (row.email) dataPoint.email = row.email;
        
        // Add additional custom fields
        const optionalFields = ['country', 'trueloyalist', 'numpurchases', 'numcomplaints'];
        optionalFields.forEach(field => {
          if (row[field] !== undefined) {
            dataPoint[field] = row[field];
          }
        });
        
        // Add any other fields that might be present - preserve original case for special fields
        const preserveCaseFields = ['id', 'ID', 'ces', 'CES', 'nps', 'NPS', 'CSAT', 'csat'];
        
        Object.keys(row).forEach(key => {
          // Skip fields we've already handled
          if (!['id', 'name', 'satisfaction', 'loyalty', 'date', 'email', ...optionalFields].includes(key.toLowerCase())) {
            // Check if this is a special field where we should preserve case
            if (preserveCaseFields.includes(key)) {
              dataPoint[key] = row[key]; // Keep original case
            } else {
              dataPoint[key] = row[key]; // Keep as-is for all fields
            }
          }
        });
        
        return dataPoint;
      });
    
      // If overwrite is true, replace all data
      console.log("Creating new data array:", {
        overwrite,
        processedDataLength: processedData.length,
        currentDataLength: data.length,
        willReplace: overwrite
      });
      const newData = overwrite ? [...processedData] : [...data, ...processedData];
      console.log("New data array created with length:", newData.length);
      setData(newData);
      
      // Always pass headerScales to ensure scales are properly set
      onDataChange(newData, headerScales);
      
      // Save to storage to persist the changes
      storageManager.saveState({
        data: newData,
        uploadHistory
      });
    
      return processedData.map(item => item.id);
    } catch (error) {
      showNotification({
        title: 'Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        type: 'error'
      });
      return [];
    }
  };

  const handleScaleUpdate = (value: ScaleFormat, type: 'satisfaction' | 'loyalty') => {
    // Always create a new headerScales object when a scale is updated
    const headerScales = {
      satisfaction: type === 'satisfaction' ? value : satisfactionScale,
      loyalty: type === 'loyalty' ? value : loyaltyScale
    };
    
    // Pass the current data and the updated scales
    onDataChange(data, headerScales);
  };

  // Define tabs with existing components
  const tabs: Tab[] = [
    {
      id: 'csv-upload',
      label: 'Upload CSV',
      icon: <Upload size={16} />,
      content: (
        <CSVImport 
          onImport={handleCSVImport}
          satisfactionScale={satisfactionScale}
          loyaltyScale={loyaltyScale}
          existingIds={data.map(d => d.id)}
          scalesLocked={isScalesLocked}
          uploadHistory={uploadHistory}
          onUploadSuccess={(fileName: string, count: number, ids: string[], wasOverwrite?: boolean) => {
            // If it was an overwrite operation, reset the history
            let newHistory;
            
            if (wasOverwrite) {
              // Start fresh with just this upload
              newHistory = [{
                fileName,
                timestamp: new Date(),
                count,
                remainingCount: count,
                associatedIds: ids
              }];
            } else {
              // Append to existing history
              newHistory = [...uploadHistory, {
                fileName,
                timestamp: new Date(),
                count,
                remainingCount: count,
                associatedIds: ids
              }];
            }
            
            setUploadHistory(newHistory);
            storageManager.saveState({
              uploadHistory: newHistory
            });
          }}
          lastManualEntryTimestamp={lastManualEntryTimestamp}
          existingData={data}
          onSegFileLoad={onSegFileLoad}
          isDemoMode={isDemoMode}
        />
      )
    },
    {
      id: 'manual-entry',
      label: 'Manual Entry',
      icon: <Edit3 size={16} />,
      content: (
        <div ref={inputSectionRef} className="manual-entry-wrapper">
          <DataInput
            onSubmit={handleDataSubmit}
            satisfactionScale={satisfactionScale}
            loyaltyScale={loyaltyScale}
            existingIds={data.map(d => d.id)}
            data={data}
            editingData={editingData}
            onCancelEdit={() => setEditingData(null)}
            scalesLocked={isScalesLocked}
            showScales={true}
            onScaleUpdate={handleScaleUpdate}
            isDemoMode={isDemoMode}
          />
        </div>
      )
    },
    {
      id: 'load-project',
      label: 'Load Project',
      icon: <FolderOpen size={16} />,
      content: (
        <SegFileLoader onSegFileLoad={onSegFileLoad} />
      )
    }
  ];

  return (
    <div className="data-entry-module" ref={dataEntryModuleRef}>
      <h1 className="data-entry-title">Data Entry</h1>
      <TabContainer 
        tabs={tabs} 
        defaultActiveTab="csv-upload"
        className="data-entry-tabs"
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {/* Demo Button - Always visible below tabs when no data */}
      {(!externalData || externalData.length === 0) && data.length === 0 && onDemoDataLoad && (
        <DemoButton 
          onDemoDataLoad={onDemoDataLoad}
          disabled={false}
        />
      )}
    </div>
  );
};

export default DataEntryModule;