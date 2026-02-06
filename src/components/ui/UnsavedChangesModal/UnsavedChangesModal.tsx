import React from 'react';
import './UnsavedChangesModal.css';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onSaveAndLeave: () => void;
  onLeaveWithoutSaving: () => void;
  onCancel: () => void;
  // Reload-specific props (optional)
  isReloadModal?: boolean;
  onReloadKeepData?: () => void;
  onReloadFresh?: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onSaveAndLeave,
  onLeaveWithoutSaving,
  onCancel,
  isReloadModal = false,
  onReloadKeepData,
  onReloadFresh
}) => {
  if (!isOpen) return null;

  // Reload modal has different options
  if (isReloadModal) {
    return (
      <div className="unsaved-changes-overlay" onClick={onCancel}>
        <div className="unsaved-changes-modal" onClick={(e) => e.stopPropagation()}>
          <div className="unsaved-changes-header">
            <h3 className="unsaved-changes-title">🔄 Reload Page</h3>
          </div>
          
          <div className="unsaved-changes-content">
            <p className="unsaved-changes-message">
              How would you like to reload the page?
            </p>
          </div>

          <div className="unsaved-changes-actions">
            <button
              className="unsaved-changes-button unsaved-changes-button--primary"
              onClick={onReloadKeepData}
            >
              Reload (Keep Data)
            </button>
            <button
              className="unsaved-changes-button unsaved-changes-button--danger"
              onClick={onReloadFresh}
            >
              Reload Fresh (Clear Data)
            </button>
            <button
              className="unsaved-changes-button unsaved-changes-button--secondary"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unsaved-changes-overlay" onClick={onCancel}>
      <div className="unsaved-changes-modal" onClick={(e) => e.stopPropagation()}>
        <div className="unsaved-changes-header">
          <h3 className="unsaved-changes-title">⚠️ Unsaved Changes</h3>
        </div>
        
        <div className="unsaved-changes-content">
          <p className="unsaved-changes-message">
            You have unsaved changes. Are you sure you want to leave?
          </p>
        </div>

        <div className="unsaved-changes-actions">
          <button
            className="unsaved-changes-button unsaved-changes-button--primary"
            onClick={onSaveAndLeave}
          >
            Save & Leave
          </button>
          <button
            className="unsaved-changes-button unsaved-changes-button--danger"
            onClick={onLeaveWithoutSaving}
          >
            Leave Without Saving
          </button>
          <button
            className="unsaved-changes-button unsaved-changes-button--secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

