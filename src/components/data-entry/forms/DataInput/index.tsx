// src/components/data-entry/forms/DataInput/index.tsx
import React, { useState, useEffect } from 'react';
import CardLayout from '../../layout/CardLayout';
import { BasicInfoFields } from './components/BasicInfoFields';
import { SatisfactionField } from './components/SatisfactionField';
import { LoyaltyField } from './components/LoyaltyField';
import { DateField } from './components/DateField';
import { FormActions } from './components/FormActions';
import { useDataInput } from './hooks/useDataInput';
import { useDuplicateCheck } from '../../hooks/useDuplicateCheck';
import DuplicateHandler from '../../components/DuplicateHandler';
import type { DataInputProps } from './types';
import type { DataPoint } from '@/types/base';
// import StateManagementService from '../../services/StateManagementService';
import './styles.css';

const DataInput: React.FC<DataInputProps> = (props) => {
  const [currentDateFormat, setCurrentDateFormat] = useState('dd/MM/yyyy');
  const {
    formState,
    errors,
    handleInputChange,
    handleSubmit: originalSubmit,
    resetForm,
    setDateFormat
  } = useDataInput(props);

  // Cast data to proper type - ensure it has all required properties
  const dataPoints = (props.data || []) as DataPoint[];
  const [skipNextDuplicateCheck, setSkipNextDuplicateCheck] = useState(false);
  const { checkForDuplicates, duplicateData, setDuplicateData } = useDuplicateCheck(dataPoints);
  
  // For determining if dates exist, we always want to lock the format when editing an item with a date
  // Even if it's the only item in the table
  const hasExistingDates = (!!props.editingData && props.editingData.date) || 
    props.data?.some(item => 
      item.date && item.date.trim() !== '' && 
      (!props.editingData || item.id !== props.editingData.id)
    ) || false;
  
  // Update form state when editingData changes
  useEffect(() => {
    if (props.editingData) {
      // Using handleInputChange to update each field
      handleInputChange('id', props.editingData.id || '');
      handleInputChange('name', props.editingData.name || '');
      handleInputChange('email', props.editingData.email || '');
      handleInputChange('satisfaction', props.editingData.satisfaction.toString());
      handleInputChange('loyalty', props.editingData.loyalty.toString());
      handleInputChange('date', props.editingData.date || '');
      
      // Also update dateFormat if available
      if (props.editingData.dateFormat) {
        handleInputChange('dateFormat', props.editingData.dateFormat);
      }
    }
  }, [props.editingData, handleInputChange]);

  // Unused function
  /* const handleDateFormatChange = (format: string) => {
    setCurrentDateFormat(format);
    setDateFormat(format); // Update the date format in the useDataInput hook
  }; */
  
  // Handle form submission with duplicate check
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  
    // First do standard validation using the existing handleSubmit function
    // but don't actually submit yet
    const validationResult = originalSubmit(e, false);
    
    if (validationResult?.isValid) {
      // Create data point from form state
      const newDataPoint: DataPoint = {
        id: formState.id || '',
        name: formState.name,
        email: formState.email || undefined,
        satisfaction: Number(formState.satisfaction),
        loyalty: Number(formState.loyalty),
        date: formState.date || undefined,
        dateFormat: formState.dateFormat || currentDateFormat, 
        group: 'default'
      };
      
      // Remove the check that skips duplicate detection for edits
      // Always check for duplicates except when the skip flag is explicitly set
      if (skipNextDuplicateCheck) {
        setSkipNextDuplicateCheck(false);
        
        // Submit directly without duplicate check
        props.onSubmit(
          formState.id,
          formState.name,
          formState.email,
          Number(formState.satisfaction),
          Number(formState.loyalty),
          formState.date,
          formState.dateFormat
        );
        
        // Reset form
        resetForm();
        
        return;
      }
      
      // Check for duplicates - handle type safely
      const editingId = props.editingData?.id;
      const { isDuplicate, duplicate } = checkForDuplicates(newDataPoint, editingId);
  
      if (isDuplicate && duplicate) {
        // Show duplicate handler
        setDuplicateData({
          existing: duplicate,
          new: newDataPoint
        });
      } else {
        // Not a duplicate, submit normally
        props.onSubmit(
          formState.id,
          formState.name,
          formState.email,
          Number(formState.satisfaction),
          Number(formState.loyalty),
          formState.date,
          formState.dateFormat
        );
        
        // Reset form
        resetForm();
      }
    }
  };

  // Handle duplicate actions
  const handleDuplicateSkip = () => {
    setDuplicateData(null);
  };

  const handleDuplicateAdd = () => {
    if (duplicateData) {
      props.onSubmit(
        duplicateData.new.id,
        duplicateData.new.name,
        duplicateData.new.email || '',
        duplicateData.new.satisfaction,
        duplicateData.new.loyalty,
        duplicateData.new.date || '',
        duplicateData.new.dateFormat
      );
      setDuplicateData(null);
      
      // Always reset form after submission
      resetForm();
    }
  };

  const handleDuplicateEdit = () => {
    // Keep the form data but close the modal
    setDuplicateData(null);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="data-input" noValidate>
        <CardLayout title="Manual Entry">
          {/* Added form instructions */}
          <div className="form-instructions">
            Fields marked with <span className="required-field">*</span> are required
          </div>
          
          <div className="data-input__grid">
            <BasicInfoFields
              formState={formState}
              errors={errors}
              onInputChange={handleInputChange}
              
            />
            <SatisfactionField
              formState={formState}
              errors={errors}
              onInputChange={handleInputChange}
              scale={props.satisfactionScale}
              showScales={props.showScales}
              scalesLocked={props.scalesLocked}
              onScaleUpdate={props.onScaleUpdate}
            />
            <LoyaltyField
              formState={formState}
              errors={errors}
              onInputChange={handleInputChange}
              scale={props.loyaltyScale}
              showScales={props.showScales}
              scalesLocked={props.scalesLocked}
              onScaleUpdate={props.onScaleUpdate}
            />
            <DateField
              formState={formState}
              errors={errors}
              onInputChange={handleInputChange}
              isLocked={props.scalesLocked}
              hasExistingDates={hasExistingDates === true}
              onDateFormatChange={setCurrentDateFormat}
            />
            <FormActions
              isEditing={!!props.editingData}
              onCancel={props.onCancelEdit}
              isAtDemoLimit={props.isDemoMode && !props.editingData && dataPoints.length >= 100}
              currentCount={dataPoints.length}
              maxCount={100}
            />
          </div>
        </CardLayout>
      </form>

      {/* Duplicate Handler Dialog */}
      {duplicateData && (
        <DuplicateHandler
          isOpen={!!duplicateData}
          onClose={handleDuplicateSkip}
          existingEntry={duplicateData.existing}
          newEntry={duplicateData.new}
          onSkip={handleDuplicateSkip}
          onAdd={handleDuplicateAdd}
          onEdit={handleDuplicateEdit}
        />
      )}
    </>
  );
};

export default DataInput;