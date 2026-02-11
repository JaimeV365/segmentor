import React from 'react';
import InputField from '../../InputField';
import { ScaleFormat } from '@/types/base';
import { LoyaltyFieldProps } from '../types';
import { useAxisLabels } from '../../../../visualization/context/AxisLabelsContext';

const LOYALTY_SCALES: ScaleFormat[] = ['1-5', '1-7', '1-10', '0-10'];

export const LoyaltyField: React.FC<LoyaltyFieldProps> = ({
  formState,
  errors,
  onInputChange,
  scale,
  showScales,
  scalesLocked,
  onScaleUpdate
}) => {
  const { labels } = useAxisLabels();
  // Parse the current scale to get min/max values
  const currentScale = scale.split('-');
  const min = currentScale[0];
  const max = currentScale[1];
  
  // Generate dropdown options based on the current scale
  const scaleOptions = Array.from(
    { length: Number(max) - Number(min) + 1 },
    (_, i) => (Number(min) + i).toString()
  );
  
  return (
    <div className="loyalty-field">
      {showScales && (
        <div className="scale-selector">
          <label>
            {labels.loyalty} Scale <span className="required-field">*</span>
          </label>
          <select
            value={scale}
            onChange={(e) => onScaleUpdate(e.target.value as ScaleFormat, 'loyalty')}
            disabled={scalesLocked}
          >
            {LOYALTY_SCALES.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          {scalesLocked && (
            <div className="scale-warning-message">
              Scales are locked while data exists
            </div>
          )}
        </div>
      )}
      <InputField
        type="number"
        placeholder={`${labels.loyalty} (${min}-${max})`}
        value={formState.loyalty}
        onChange={(value) => onInputChange('loyalty', value)}
        error={errors.loyalty}
        min={min}
        max={max}
        dropdownOptions={scaleOptions}
        required={true}
      />
    </div>
  );
};