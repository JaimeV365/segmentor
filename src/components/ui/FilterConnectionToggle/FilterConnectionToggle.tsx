import React, { useState } from 'react';
import { useFilterContext } from '../../visualization/context/FilterContext';
import { useNotification } from '../../data-entry/NotificationSystem';
import './FilterConnectionToggle.css';

interface FilterConnectionToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const FilterConnectionToggle: React.FC<FilterConnectionToggleProps> = ({
  className = '',
  showLabel = false
}) => {
  // NOTE: Old global API removed - each report manages its own connection
  // This component is no longer used - connection toggle is inline in BarChart
  // Keeping for backward compatibility but methods don't exist
  const filterContext = useFilterContext();
  const isReportsConnected = false; // Default since global API removed
  
  const { showNotification } = useNotification();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleToggle = () => {
    // NOTE: This component is deprecated - connection toggle is now inline in BarChart
    // This is kept for backward compatibility only
    console.warn('FilterConnectionToggle: This component is deprecated');
  };
  
  const handleConfirmReconnect = () => {
    // NOTE: This component is deprecated
    setShowConfirmModal(false);
  };
  
  const handleCancelReconnect = () => {
    setShowConfirmModal(false);
  };

  return (
    <div className={`filter-connection-toggle ${className}`}>
      <button
        onClick={handleToggle}
        className={`connection-toggle-btn ${isReportsConnected ? 'connected' : 'disconnected'}`}
        title={isReportsConnected ? 'Disconnect from main filters' : 'Connect to main filters'}
      >
        {isReportsConnected ? (
          // Connected icon (link-2)
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="lucide lucide-link-2"
          >
            <path d="M9 17H7A5 5 0 0 1 7 7h2"/>
            <path d="M15 7h2a5 5 0 1 1 0 10h-2"/>
            <line x1="8" x2="16" y1="12" y2="12"/>
          </svg>
        ) : (
          // Disconnected icon (link-2-off)
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="lucide lucide-link-2-off"
          >
            <path d="M9 17H7A5 5 0 0 1 7 7"/>
            <path d="M15 7h2a5 5 0 0 1 4 8"/>
            <line x1="8" x2="12" y1="12" y2="12"/>
            <line x1="2" x2="22" y1="2" y2="22"/>
          </svg>
        )}
        {showLabel && (
          <span className="connection-label">
            {isReportsConnected ? 'Connected' : 'Disconnected'}
          </span>
        )}
      </button>
      
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="filter-connection-modal-overlay">
          <div className="filter-connection-modal">
            <div className="modal-header">
              <h3>Connect to Main Chart Filters?</h3>
            </div>
            <div className="modal-content">
              <p>This will discard your local changes and sync to the main chart filters.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="modal-btn cancel-btn"
                onClick={handleCancelReconnect}
              >
                Cancel
              </button>
              <button 
                className="modal-btn confirm-btn"
                onClick={handleConfirmReconnect}
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterConnectionToggle;
