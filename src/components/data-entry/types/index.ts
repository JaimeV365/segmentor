import { DataPoint, ScaleFormat } from '@/types/base';

export interface InputFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  warning?: string; 
  type?: 'text' | 'number' | 'email' | 'date';
  min?: string;
  max?: string;
  label?: string;
  dropdownOptions?: string[];
  onDropdownSelect?: (value: string) => void;
  onBlur?: (value: string) => void;
  forceCloseDropdown?: boolean;
  required?: boolean;
}

export interface CSVImportProps {
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
  scalesLocked: boolean;
  uploadHistory: UploadHistoryItem[];
  onUploadSuccess: (fileName: string, count: number, ids: string[], wasOverwrite?: boolean) => void;
  lastManualEntryTimestamp?: number; // Tracks manual entries to clear warnings after edits
}

export interface UseDataEntryFormProps {
  initialData?: DataPoint;
  onSubmit: (data: DataPoint) => void;
  onCancel: () => void;
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  existingIds: string[];
}

export interface DataEntryModuleProps {
  onDataChange: (data: DataPoint[], headerScales?: HeaderScales) => void;
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  data: DataPoint[];
  onSegFileLoad?: (file: File) => Promise<void>;
  onDemoDataLoad?: () => void;
  isDemoMode?: boolean;
}

export interface HeaderScales {
  satisfaction: ScaleFormat;
  loyalty: ScaleFormat;
}

export interface UploadHistoryItem {
  fileName: string;
  timestamp: Date;
  count: number;
  remainingCount: number;
  associatedIds: string[];
}

export interface FormState {
  id: string;
  name: string;
  email: string;
  satisfaction: string;
  loyalty: string;
  date: string;
}

export interface FormErrors {
  id?: string;
  name?: string;
  email?: string;
  satisfaction?: string;
  loyalty?: string;
  date?: string;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export interface DataEntryFormProps {
  initialData?: DataPoint;
  onSubmit: (data: DataPoint) => void;
  onCancel: () => void;
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  existingIds: string[];
  isScalesLocked: boolean;
  showScales: boolean;
  onScaleUpdate?: (value: ScaleFormat, type: 'satisfaction' | 'loyalty') => void;
}

export type { DataPoint };