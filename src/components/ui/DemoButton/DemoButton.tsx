import React from 'react';
import { Play } from 'lucide-react';
import './DemoButton.css';

interface DemoButtonProps {
  onDemoDataLoad: () => void;
  disabled?: boolean;
}

export const DemoButton: React.FC<DemoButtonProps> = ({ onDemoDataLoad, disabled = false }) => {
  return (
    <div className="demo-button-container">
      <div className="demo-button-content">
        <div className="demo-button-text">
          <span className="demo-button-label">No data?</span>
          <span className="demo-button-description">Try with sample data to explore the tool</span>
        </div>
        <button
          onClick={onDemoDataLoad}
          disabled={disabled}
          className="demo-button"
        >
          <Play size={16} />
          Try Sample Data
        </button>
      </div>
    </div>
  );
};

export default DemoButton;
