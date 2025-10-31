import React, { useState, useRef, useEffect } from 'react';
import { Filter } from 'lucide-react';
import './FunnelButton.css';

interface FunnelButtonProps {
  onClick: () => void;
  isActive?: boolean;
  filterCount?: number;
  className?: string;
}

const FunnelButton: React.FC<FunnelButtonProps> = ({
  onClick,
  isActive = false,
  filterCount = 0,
  className = ''
}) => {
  return (
    <button
      className={`funnel-button ${isActive ? 'active' : ''} ${className}`}
      onClick={onClick}
      aria-label="Open filters menu"
      title="Filter data"
    >
      <div className="funnel-icon-container">
        <Filter size={16} />
        {filterCount > 0 && (
          <span className="filter-count-badge">
            {filterCount}
          </span>
        )}
      </div>
    </button>
  );
};

export default FunnelButton;
























































