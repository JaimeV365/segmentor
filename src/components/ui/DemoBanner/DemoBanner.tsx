import React from 'react';
import { X, Sparkles } from 'lucide-react';
import './DemoBanner.css';

interface DemoBannerProps {
  onDismiss: () => void;
  onLoadRealData: () => void;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ onDismiss, onLoadRealData }) => {
  return (
    <div className="demo-banner">
      <div className="demo-banner__content">
        <div className="demo-banner__icon">
          <Sparkles size={20} />
        </div>
        <div className="demo-banner__text">
          <div className="demo-banner__title">Live Demo Mode</div>
          <div className="demo-banner__description">
            Exploring with sample data • Premium features enabled
          </div>
        </div>
        <div className="demo-banner__actions">
          <button
            onClick={onLoadRealData}
            className="demo-banner__load-button"
          >
            Exit Demo
          </button>
          <button
            onClick={onDismiss}
            className="demo-banner__dismiss-button"
            aria-label="Dismiss demo banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoBanner;
