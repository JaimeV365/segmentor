import { DataPoint, ScaleFormat } from '@/types/base';

export interface CSVRow {
  ID: string;
  'Name/Email': string;
  [key: string]: string;
}

export interface HeaderScales {
  satisfaction: ScaleFormat;
  loyalty: ScaleFormat;
  /** Original CSV header name for the satisfaction column (e.g. "CES", "Sat", "CSAT") */
  satisfactionHeaderName?: string;
  /** Original CSV header name for the loyalty column (e.g. "Loy", "Loyalty") */
  loyaltyHeaderName?: string;
}

export interface ValidationErrorData {
  title: string;
  message: string;
  details?: string;
  fix?: string;
}

export interface DuplicateReport {
  count: number;
  items: Array<{ id: string; name: string; reason: string }>;
}

export interface DateIssueReport {
  count: number;
  items: Array<{
    row: number;
    id: string;
    reason: string;
    value: string;
  }>;
}

export interface ValidationResult {
  data: any[];
  rejectedReport: {
    count: number;
    items: Array<{
      row: number;
      id: string;
      reason: string;
      value: string;
    }>;
  };
  warningReport: {
    count: number;
    items: Array<{
      row: number;
      id: string;
      reason: string;
      value: string;
    }>;
  };
}

export interface ParsedDateResult { 
  isValid: boolean; 
  error?: string; 
  warning?: string;
  day?: number; 
  month?: number; 
  year?: number; 
}

export interface ProgressState {
  stage: 'reading' | 'validating' | 'processing' | 'complete' | 'error' | 'waiting-for-scale-confirmation';
  progress: number;
  fileName: string;
  fileSize: string;
}

export interface ValidationResult {
  data: any[];
  rejectedReport: {
    count: number;
    items: Array<{
      row: number;
      id: string;
      reason: string;
      value: string;
    }>;
  };
  warningReport: {
    count: number;
    items: Array<{
      row: number;
      id: string;
      reason: string;
      value: string;
    }>;
  };
}

export interface DateIssueRow {
  id: string;
  name: string;
  date: string;
  email?: string;
  rawDate?: string;
  reason?: string;
  [key: string]: any;
}

export interface DateIssueReport {
  count: number;
  items: DateIssueItem[];
}

export interface DateIssueItem {
  row: number;
  id: string;
  reason: string;
  value: string;
}

export interface CSVValidationState {
  error: ValidationErrorData | null;
  setError: (error: ValidationErrorData | null) => void;
  duplicateReport: DuplicateReport | null;
  setDuplicateReport: (duplicates: DuplicateReport) => void; 
  dateIssuesReport: DateIssueReport | null;
  setDateIssuesReport: (issues: DateIssueReport | null) => void; // Allow null
  dateWarningsReport: DateIssueReport | null;
  setDateWarningsReport: (warnings: DateIssueReport | null) => void; // Allow null
  clearValidationState: () => void;
}