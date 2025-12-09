import React from 'react';
import './TierToggle.css';

interface TierToggleProps {
  showTiers: boolean;
  maxTiers: number;
  onShowTiersChange: (show: boolean) => void;
  onMaxTiersChange: (tiers: number) => void;
  disabled?: boolean;
  availableTiers?: number[]; // New: Array of available tier numbers
}

export const TierToggle: React.FC<TierToggleProps> = ({
  showTiers,
  maxTiers,
  onShowTiersChange,
  onMaxTiersChange,
  disabled = false,
  availableTiers = [1, 2, 3] // Default to all tiers available
}) => {
  const tierOptions = [
    { value: 1, label: 'Single Tier', description: 'Show only top frequency' },
    { value: 2, label: 'Two Tiers', description: 'Primary + secondary frequency' },
    { value: 3, label: 'Three Tiers', description: 'High, medium, low frequency' }
  ];

  return (
    <div className={`tier-toggle ${disabled ? 'disabled' : ''}`}>
      <div className="tier-header">
        <label className="tier-checkbox">
          <input
            type="checkbox"
            checked={showTiers}
            onChange={(e) => onShowTiersChange(e.target.checked)}
            disabled={disabled}
          />
          Tier-capped display
        </label>
      </div>
      
      {showTiers && (
        <div className="tier-options">
          <div className="tier-options-header">
            <span className="tier-options-label">Frequency Tiers</span>
          </div>
          
          <div className="tier-buttons">
            {tierOptions.map((option) => {
              const isAvailable = availableTiers.includes(option.value);
              const isDisabled = disabled || !isAvailable;
              
              return (
                <button
                  key={option.value}
                  className={`tier-button ${maxTiers === option.value ? 'active' : ''} ${!isAvailable ? 'unavailable' : ''}`}
                  onClick={() => isAvailable && onMaxTiersChange(option.value)}
                  disabled={isDisabled}
                  title={isAvailable ? option.description : `No data available for ${option.label.toLowerCase()}`}
                >
                
                  <div className="tier-button-content">
                    <span className="tier-number">{option.value}</span>
                    <span className="tier-label">{option.label}</span>
                  </div>
                  <div className="tier-preview">
                    {Array.from({ length: option.value }, (_, i) => (
                      <div 
                        key={i}
                        className={`tier-dot tier-${i + 1}`}
                        style={{
                          opacity: 1 - (i * 0.3),
                          transform: `scale(${1 - (i * 0.2)})`
                        }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="tier-description">
            <span className="text-xs text-gray-500">
              {maxTiers === 1 && "Shows only the highest frequency combinations"}
              {maxTiers === 2 && "Shows primary (100%) and secondary (75%+) frequency tiers"}
              {maxTiers === 3 && "Shows high, medium, and lower frequency tiers"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TierToggle;