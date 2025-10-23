// src/components/data-entry/forms/DataInput/types.ts

import { DataPoint, ScaleFormat } from '@/types/base';

export interface FormState {
  id: string;
  name: string;
  email: string;
  satisfaction: string;
  loyalty: string;
  date: string;
  dateFormat?: string;
}

export interface InputFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: 'text' | 'number' | 'email' | 'date';
  min?: string;
  max?: string;
  onBlur?: (value: string) => void;
  dropdownOptions?: string[];
  onDropdownSelect?: (value: string) => void;
  required?: boolean;
}

export interface DateFieldProps {
  formState: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  onInputChange: (field: keyof FormState, value: string) => void;
  isLocked: boolean;
  hasExistingDates: boolean;
  onDateFormatChange?: (format: string) => void;
}

export interface SatisfactionFieldProps {
  formState: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  onInputChange: (field: keyof FormState, value: string) => void;
  scale: ScaleFormat;
  showScales: boolean;
  scalesLocked: boolean;
  onScaleUpdate: (value: ScaleFormat, type: 'satisfaction' | 'loyalty') => void;
}

export interface LoyaltyFieldProps {
  formState: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  onInputChange: (field: keyof FormState, value: string) => void;
  scale: ScaleFormat;
  showScales: boolean;
  scalesLocked: boolean;
  onScaleUpdate: (value: ScaleFormat, type: 'satisfaction' | 'loyalty') => void;
}

// Add this interface to fix the missing DataInputProps error
export interface DataInputProps {
  onSubmit: (id: string, name: string, email: string, satisfaction: number, loyalty: number, date: string, dateFormat?: string) => void;
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  existingIds: string[];
  data: Array<{
    id: string;
    date?: string;
    dateFormat?: string;
  }>;
  editingData?: { 
    id: string; 
    name: string; 
    email?: string;
    satisfaction: number; 
    loyalty: number;
    date?: string;
    dateFormat?: string;
  } | null;
  onCancelEdit: () => void;
  scalesLocked: boolean;
  showScales: boolean;
  lockReason?: string;
  onDataSubmitted?: () => void;
  isDemoMode?: boolean;
  
  onScaleUpdate: (value: ScaleFormat, type: 'satisfaction' | 'loyalty') => void;
}