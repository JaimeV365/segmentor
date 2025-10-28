import React from 'react';
import { useFilterContext } from '../../visualization/context/FilterContext';
import './FilterDisconnectionPrompt.css';

interface FilterDisconnectionPromptProps {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const FilterDisconnectionPrompt: React.FC<FilterDisconnectionPromptProps> = ({
  isVisible,
  onConfirm,
  onCancel
}) => {
  const { isReportsConnected } = useFilterContext();

  if (!isVisible) return null;

  return (
    <div className="filter-disconnection-prompt-overlay">
      <div className="filter-disconnection-prompt">
        <div className="prompt-header">
          <h3>Filter Connection</h3>
        </div>
        
        <div className="prompt-content">
          <p>
            You're about to modify filters in the Reports section. 
            {isReportsConnected ? (
              <>
                <br /><br />
                <strong>Currently connected:</strong> Reports inherit filters from the main visualization.
                <br /><br />
                Would you like to disconnect Reports filters so they can be independent?
              </>
            ) : (
              <>
                <br /><br />
                Reports filters are currently independent from the main visualization.
              </>
            )}
          </p>
        </div>
        
        <div className="prompt-actions">
          <button 
            className="prompt-btn cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            className="prompt-btn confirm-btn"
            onClick={onConfirm}
          >
            {isReportsConnected ? 'Disconnect' : 'Keep Independent'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterDisconnectionPrompt;
