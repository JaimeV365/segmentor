import React from 'react';
import InputField from '../../InputField';
import { ScaleFormat } from '@/types/base';
import { SatisfactionFieldProps } from '../types';
import { useAxisLabels } from '../../../../visualization/context/AxisLabelsContext';

const SATISFACTION_SCALES: ScaleFormat[] = ['1-3', '1-5', '1-7'];

export const SatisfactionField: React.FC<SatisfactionFieldProps> = ({
  formState,
  errors,
  onInputChange,
  scale,
  showScales,
  scalesLocked,
  onScaleUpdate
}) => {
  const { labels } = useAxisLabels();
  // Parse scale range for dropdown options
  const currentScale = scale.split('-');
  const min = currentScale[0];
  const max = currentScale[1];
  
  // Generate dropdown options based on the current scale
  const scaleOptions = Array.from(
    { length: Number(max) - Number(min) + 1 },
    (_, i) => (Number(min) + i).toString()
  );
  
  return (
    <div className="satisfaction-field">
      {showScales && (
        <div className="scale-selector">
          <label>
            {labels.satisfaction} Scale <span className="required-field">*</span>
          </label>
          <select
            value={scale}
            onChange={(e) => onScaleUpdate(e.target.value as ScaleFormat, 'satisfaction')}
            disabled={scalesLocked}
          >
            {SATISFACTION_SCALES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
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
        placeholder={`${labels.satisfaction} (${min}-${max})`}
        value={formState.satisfaction}
        onChange={(value) => onInputChange('satisfaction', value)}
        error={errors.satisfaction}
        min={min}
        max={max}
        dropdownOptions={scaleOptions}
        required={true}
      />
    </div>
  );
};