import React, { useState, useRef, useCallback } from 'react';
import { DataPoint } from '@/types/base';
import FunnelButton from './FunnelButton';
import FilterPanel from '../filters/FilterPanel';
import './FilterFunnel.css';

interface FilterFunnelProps {
  data: DataPoint[];
  onFilterChange: (filteredData: DataPoint[], activeFilters?: any[]) => void;
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const FilterFunnel: React.FC<FilterFunnelProps> = ({
  data,
  onFilterChange,
  className = '',
  position = 'top-right'
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const buttonRef = useRef<HTMLDivElement>(null);

  const handleButtonClick = useCallback(() => {
    setIsMenuOpen(!isMenuOpen);
  }, [isMenuOpen]);

  const handleFilterChange = useCallback((filteredData: DataPoint[], activeFilters?: any[]) => {
    setActiveFilterCount(activeFilters?.length || 0);
    onFilterChange(filteredData, activeFilters);
  }, [onFilterChange]);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return (
    <div className={`filter-funnel-container ${className}`} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div ref={buttonRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FunnelButton
          onClick={handleButtonClick}
          isActive={isMenuOpen}
          filterCount={activeFilterCount}
        />
      </div>
      
      {/* Filter Panel Overlay - following BarChart pattern */}
      {isMenuOpen && (
        <div className="filter-overlay" onClick={handleMenuClose}>
          <div 
            className="filter-panel open"
            onClick={(e) => e.stopPropagation()}
          >
            <FilterPanel
              data={data}
              onFilterChange={handleFilterChange}
              onClose={handleMenuClose}
              isOpen={true}
              showPointCount={true}
              hideHeader={true}
              contentOnly={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterFunnel;
