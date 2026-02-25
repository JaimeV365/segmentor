import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { useNotification } from '../../NotificationSystem';
import { UnifiedLoadingPopup } from '../../../ui/UnifiedLoadingPopup';
import { UploadHistory } from '../CSVImport/components/UploadHistory';
import type { UploadHistoryItem } from '../../types';
import './SegFileLoader.css';

interface SegFileLoaderProps {
  onSegFileLoad?: (file: File) => Promise<{ count: number; ids: string[] } | void>;
  uploadHistory?: UploadHistoryItem[];
  onUploadSuccess?: (fileName: string, count: number, ids: string[]) => void;
}

const SegFileLoader: React.FC<SegFileLoaderProps> = ({ onSegFileLoad, uploadHistory = [], onUploadSuccess }) => {
  const { showNotification } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!onSegFileLoad) {
      showNotification({
        title: 'Error',
        message: 'File loading functionality is not available.',
        type: 'error'
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.seg')) {
      showNotification({
        title: 'Invalid File',
        message: 'Please select a .seg file (saved project file).',
        type: 'error'
      });
      return;
    }

    try {
      setIsLoading(true);
      const loadResult = await onSegFileLoad(file);
      const loadedCount = loadResult?.count ?? 0;
      const loadedIds = loadResult?.ids ?? [];

      onUploadSuccess?.(file.name, loadedCount, loadedIds);

      showNotification({
        title: 'Success',
        message: loadedCount > 0
          ? `Project loaded successfully from ${file.name} (${loadedCount} entries).`
          : `Project loaded successfully from ${file.name}.`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to load .seg file:', error);
      showNotification({
        title: 'Error',
        message: 'Failed to load the project file. Please check the file format.',
        type: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  }, [onSegFileLoad, showNotification]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  return (
    <div className="seg-file-loader-wrapper">
      <div className="seg-file-loader">
        <div className="seg-file-loader__header">
          <div className="seg-file-loader__header-content">
            <div className="seg-file-loader__title">Load Previous Project</div>
            <div className="seg-file-loader__description">
              Load a previously saved .seg file to continue your work.
            </div>
          </div>
        </div>
        
        <div 
          className="seg-file-loader__dropzone"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isLoading && fileInputRef.current?.click()}
        >
          <div className="seg-file-loader__dropzone-icon">
            <UploadCloud size={24} stroke="#3a863e" />
          </div>
          <div className="seg-file-loader__dropzone-text">
            Drop your .seg file here or click to browse
          </div>
        </div>
        
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".seg" 
          onChange={handleFileInputChange} 
          className="seg-file-loader__file-input"
          disabled={isLoading}
        />
      </div>

      <UploadHistory history={uploadHistory} />
      
      <UnifiedLoadingPopup 
        isVisible={isLoading} 
        text="segmenting"
        size="medium"
      />
    </div>
  );
};

export default SegFileLoader;
