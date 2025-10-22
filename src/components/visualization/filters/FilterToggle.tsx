import React from 'react';
import { Filter } from 'lucide-react';
import './FilterToggle.css';

interface FilterToggleProps {
  onClick: () => void;
  activeFilterCount: number;
  isOpen: boolean;
}

const FilterToggle: React.FC<FilterToggleProps> = ({ 
  onClick, 
  activeFilterCount,
  isOpen
}) => {
  return (
    <button 
      className={`filter-toggle ${isOpen ? 'active' : ''} ${activeFilterCount > 0 ? 'has-filters' : ''}`}
      onClick={onClick}
      title="Filter data"
      aria-label="Toggle filter panel"
    >
      <Filter size={20} />
      {activeFilterCount > 0 && (
        <span className="filter-count">{activeFilterCount}</span>
      )}
    </button>
  );
};

export default FilterToggle;









































