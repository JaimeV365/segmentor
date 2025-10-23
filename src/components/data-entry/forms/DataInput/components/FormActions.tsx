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
}) => (
  <div className="data-input__actions">
    <button 
      type="submit" 
      className="data-input__button data-input__button--primary"
      disabled={!isEditing && isAtDemoLimit}
      title={!isEditing && isAtDemoLimit ? `Demo limited to ${maxCount} entries. Exit demo mode for unlimited data.` : undefined}
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
    
    {/* Demo limit message */}
    {!isEditing && isAtDemoLimit && (
      <div className="demo-limit-message">
        <p>Demo limited to {maxCount} entries ({currentCount}/{maxCount} used)</p>
        <p className="upgrade-hint">Exit demo mode for unlimited data</p>
      </div>
    )}
  </div>
);