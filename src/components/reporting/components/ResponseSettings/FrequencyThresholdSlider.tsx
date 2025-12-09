// FrequencyThresholdSlider.tsx - FIXED VERSION
import React, { useEffect } from 'react';
import './FrequencyThresholdSlider.css';

interface FrequencyThresholdSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  maxAvailableFrequency?: number; // Maximum frequency available in the data
  disabled?: boolean;
  inPremiumSection?: boolean;
}

export const FrequencyThresholdSlider: React.FC<FrequencyThresholdSliderProps> = ({
  value,
  onChange,
  min = 2,
  max = 10,
  maxAvailableFrequency,
  disabled = false,
  inPremiumSection = false
}) => {
  // Calculate effective max: use maxAvailableFrequency if provided, otherwise use max
  // Ensure we don't go below the minimum
  const effectiveMax = maxAvailableFrequency !== undefined && maxAvailableFrequency > 0
    ? Math.max(maxAvailableFrequency, min)
    : max;
  
  // Disable slider entirely if maxAvailableFrequency is less than 2
  const isSliderDisabled = maxAvailableFrequency !== undefined && maxAvailableFrequency < 2;
  const finalDisabled = disabled || isSliderDisabled;
  
  // Ensure minimum value is enforced
  const effectiveMin = Math.max(min, 2);
  // Clamp value to available range
  const effectiveValue = Math.max(Math.min(value, effectiveMax), effectiveMin);
  
  // Ensure value stays within bounds when maxAvailableFrequency changes
  useEffect(() => {
    if (value > effectiveMax) {
      onChange(effectiveMax);
    } else if (value < effectiveMin) {
      onChange(effectiveMin);
    }
  }, [effectiveMax, effectiveMin]); // Removed value and onChange from deps to avoid infinite loop
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = parseInt(e.target.value);
    // Strictly enforce the max limit - clamp to effectiveMax
    const clampedValue = Math.max(Math.min(inputValue, effectiveMax), effectiveMin);
    if (clampedValue !== value) {
      onChange(clampedValue);
    }
  };
  
  // Prevent any value beyond effectiveMax during dragging
  const handleSliderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = parseInt(e.target.value);
    // Clamp immediately during drag
    if (inputValue > effectiveMax) {
      e.target.value = effectiveMax.toString();
      onChange(effectiveMax);
    } else if (inputValue < effectiveMin) {
      e.target.value = effectiveMin.toString();
      onChange(effectiveMin);
    }
  };

  const getSliderBackground = () => {
    const percentage = ((effectiveValue - effectiveMin) / (effectiveMax - effectiveMin)) * 100;
    return `linear-gradient(to right, #3a863e 0%, #3a863e ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
  };

  // CHANGE: Use inPremiumSection flag instead of premium class
  const containerClass = `frequency-threshold-slider ${finalDisabled ? 'disabled' : ''} ${inPremiumSection ? 'in-premium-section' : ''}`;

  return (
    <div className={containerClass}>
      <div className="slider-header">
        <label className="slider-label">
          Show combinations appearing
        </label>
        <span className="slider-value">
          {effectiveValue}+ times
        </span>
      </div>
      
      <div className="slider-container">
        <input
          type="range"
          className="frequency-slider"
          min={effectiveMin}
          max={effectiveMax}
          step={1}
          value={effectiveValue}
          onChange={handleSliderChange}
          onInput={handleSliderInput}
          disabled={finalDisabled}
          style={{ background: getSliderBackground() }}
        />
        
        <div className="slider-ticks">
          {Array.from({ length: Math.max(effectiveMax, max) - effectiveMin + 1 }, (_, i) => {
            const tickValue = i + effectiveMin;
            const isAvailable = tickValue <= effectiveMax;
            const isActive = effectiveValue === tickValue;
            const isMaxTick = tickValue === max;
            
            return (
              <div 
                key={tickValue}
                className={`tick ${isActive ? 'active' : ''} ${!isAvailable ? 'unavailable' : ''}`}
                title={!isAvailable ? `No combinations appear ${tickValue}+ times` : undefined}
              >
                {isMaxTick ? `${tickValue}+` : tickValue}
              </div>
            );
          })}
        </div>
      </div>
      
     <div className="slider-description">
        <span className="text-xs text-gray-500">
          {isSliderDisabled
            ? "Not enough combinations available (need at least 2)"
            : effectiveValue === 2
            ? "Shows combinations that appear multiple times"
            : `Shows only high-frequency combinations (${effectiveValue}+ occurrences)`
          }
        </span>
      </div>
    </div>
  );
};

export default FrequencyThresholdSlider;