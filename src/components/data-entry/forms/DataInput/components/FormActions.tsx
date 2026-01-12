import React from 'react';

interface FormActionsProps {
  isEditing: boolean;
  onCancel: () => void;
  isAtDemoLimit?: boolean;
  currentCount?: number;
  maxCount?: number;
}

export const FormActions: React.FC<FormActionsProps> = ({
  isEditing,
  onCancel,
  isAtDemoLimit = false,
  currentCount = 0,
  maxCount = 100
}) => {
  // Show message when approaching limit (90+) or at/over limit
  const isApproachingLimit = !isEditing && currentCount >= 90 && currentCount < maxCount;
  const isAtLimit = !isEditing && isAtDemoLimit;
  const showMessage = isApproachingLimit || isAtLimit;
  
  return (
    <div className="data-input__actions">
      <button 
        type="submit" 
        className="data-input__button data-input__button--primary"
        disabled={isAtLimit}
        title={isAtLimit ? `Demo limited to ${maxCount} entries. Exit demo mode for unlimited data.` : undefined}
      >
        {isEditing ? 'Update' : 'Add Data'}
      </button>
      {isEditing && (
        <button 
          type="button" 
          onClick={onCancel}
          className="data-input__button data-input__button--secondary"
        >
          Cancel
        </button>
      )}
      
      {/* Demo limit message - show when approaching or at limit */}
      {showMessage && (
        <div className="demo-limit-message">
          {isAtLimit ? (
            <>
              <p>{currentCount} out of {maxCount} entries used (Limit reached)</p>
              <p className="upgrade-hint">Exit demo mode for unlimited data</p>
            </>
          ) : (
            <>
              <p>{currentCount} out of {maxCount} entries used</p>
              <p className="upgrade-hint">Approaching limit. Exit demo mode for unlimited data</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};