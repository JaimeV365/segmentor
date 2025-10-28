// src/components/reporting/filters/ReportFilterPanel.tsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Filter } from 'lucide-react';
import './ReportFilterPanel.css';
import { DataPoint } from '../../../types/base';
import { FilterConnectionToggle } from '../../ui/FilterConnectionToggle';
import { FilterDisconnectionPrompt } from '../../ui/FilterDisconnectionPrompt';
import { useFilterContext } from '../../visualization/context/FilterContext';

interface ReportFilterPanelProps {
  data: DataPoint[];
  onClose: () => void;
  onApplyFilters: (filters: ReportFilter[]) => void;
  activeFilters: ReportFilter[];
  isPremium: boolean;
  embedded?: boolean;
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'between';
  value: any;
  label?: string;
}

export const ReportFilterPanel: React.FC<ReportFilterPanelProps> = ({
  data,
  onClose,
  onApplyFilters,
  activeFilters,
  isPremium,
  embedded = false
}) => {
  const [filters, setFilters] = useState<ReportFilter[]>(activeFilters || []);
  const [activeTab, setActiveTab] = useState<'filters' | 'settings'>('filters');
  const [showDisconnectionPrompt, setShowDisconnectionPrompt] = useState(false);
  const [pendingFilterChange, setPendingFilterChange] = useState<ReportFilter[] | null>(null);
  
  // Get FilterContext for connection management
  const { isReportsConnected, setReportsConnection } = useFilterContext();
  
  // Handle disconnection prompt
  const handleDisconnectionConfirm = () => {
    setReportsConnection(false);
    setShowDisconnectionPrompt(false);
    if (pendingFilterChange) {
      setFilters(pendingFilterChange);
      setPendingFilterChange(null);
    }
  };
  
  const handleDisconnectionCancel = () => {
    setShowDisconnectionPrompt(false);
    setPendingFilterChange(null);
  };
  
  // Check if we need to show disconnection prompt when filters change
  const handleFilterChange = (newFilters: ReportFilter[]) => {
    if (isReportsConnected && filters.length === 0 && newFilters.length > 0) {
      // First filter change after inheriting from master - show prompt
      setPendingFilterChange(newFilters);
      setShowDisconnectionPrompt(true);
    } else {
      setFilters(newFilters);
    }
  };
  
  // Extract unique field names from data
  const getAvailableFields = () => {
    const standardFields = ['satisfaction', 'loyalty', 'quadrant'];
    
    // Extract all field names from the first few data points
    const sampleData = data.slice(0, 10);
    const allFields = new Set<string>();
    
    sampleData.forEach(point => {
      Object.keys(point).forEach(key => {
        // Filter out standard fields we don't want to include
        if (!['id', 'excluded', 'group'].includes(key)) {
          allFields.add(key);
        }
      });
    });
    
    return [...standardFields, ...Array.from(allFields)].sort();
  };

  // Get unique values for a field to populate dropdown options
  const getUniqueValuesForField = (field: string): string[] => {
    if (!field || !data || data.length === 0) return [];
    
    const values = new Set<string>();
    
    data.forEach(point => {
      if (typeof point[field as keyof DataPoint] !== 'undefined') {
        values.add(String(point[field as keyof DataPoint]));
      }
    });
    
    return Array.from(values).sort();
  };

  // Check if field should use dropdown or text input
  const shouldUseDropdown = (field: string): boolean => {
    // If numerical fields, don't use dropdown
    if (field === 'satisfaction' || field === 'loyalty') return false;
    
    // For other fields, check number of unique values
    const uniqueValues = getUniqueValuesForField(field);
    // If too many unique values or empty, use text input
    if (uniqueValues.length > 15 || uniqueValues.length === 0) return false;
    
    return true;
  };

  const addFilter = () => {
    if (filters.length >= 3 && !isPremium) {
      alert('Premium feature required for more than 3 filters');
      return;
    }
    
    const fields = getAvailableFields();
    if (fields.length > 0) {
      handleFilterChange([...filters, {
        field: fields[0],
        operator: 'equals',
        value: ''
      }]);
    }
  };

  const removeFilter = (index: number) => {
    const newFilters = [...filters];
    newFilters.splice(index, 1);
    handleFilterChange(newFilters);
  };

  const updateFilter = (index: number, field: string, value: any) => {
    const newFilters = [...filters];
    newFilters[index] = {
      ...newFilters[index],
      [field]: value
    };
    handleFilterChange(newFilters);
  };

  const handleApply = () => {
    // Check if this is the first filter change and we're connected
    if (isReportsConnected && filters.length > 0 && activeFilters.length === 0) {
      // First filter change - show disconnection prompt
      setPendingFilterChange(filters);
      setShowDisconnectionPrompt(true);
      return;
    }
    
    // Normal apply
    onApplyFilters(filters);
    onClose();
  };

  const handleClear = () => {
    handleFilterChange([]);
    onApplyFilters([]);
    onClose();
  };

  // Format operator for display
  const getOperatorLabel = (operator: string): string => {
    switch (operator) {
      case 'equals': return 'Equals';
      case 'notEquals': return 'Not Equals';
      case 'contains': return 'Contains';
      case 'greaterThan': return 'Greater Than';
      case 'lessThan': return 'Less Than';
      case 'between': return 'Between';
      default: return operator;
    }
  };

  // Reset filters when activeFilters prop changes
  useEffect(() => {
    setFilters(activeFilters || []);
  }, [activeFilters]);

  return (
    <div className={`report-filter-panel ${embedded ? 'embedded' : ''}`}>
      {!embedded && (
        <div className="report-filter-panel-header">
          <div className="header-left">
            <h3>Filter Data</h3>
            <FilterConnectionToggle showLabel={true} />
          </div>
          <button 
            className="report-filter-panel-close"
            onClick={onClose}
            aria-label="Close filter panel"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {!embedded && isPremium && (
        <div className="report-filter-tabs">
          <div 
            className={`report-filter-tab ${activeTab === 'filters' ? 'active' : ''}`}
            onClick={() => setActiveTab('filters')}
          >
            Filters
          </div>
          <div 
            className={`report-filter-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </div>
        </div>
      )}

      <div className="report-filter-panel-content">
        {activeTab === 'filters' && (
          <>
            {filters.length === 0 ? (
              <div className="report-filter-empty-message">
                <Filter size={24} className="filter-icon" />
                <p>No filters applied yet</p>
                <p className="subtitle">Add filters to refine your data visualization</p>
              </div>
            ) : (
              filters.map((filter, index) => (
                <div key={index} className="report-filter-item">
                  <div className="report-filter-field">
                    <label>Field</label>
                    <select
                      value={filter.field}
                      onChange={(e) => updateFilter(index, 'field', e.target.value)}
                      aria-label="Select field"
                    >
                      {getAvailableFields().map(field => (
                        <option key={field} value={field}>
                          {field.charAt(0).toUpperCase() + field.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="report-filter-operator">
                    <label>Operator</label>
                    <select
                      value={filter.operator}
                      onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                      aria-label="Select operator"
                    >
                      <option value="equals">Equals</option>
                      <option value="notEquals">Not Equals</option>
                      <option value="contains">Contains</option>
                      <option value="greaterThan">Greater Than</option>
                      <option value="lessThan">Less Than</option>
                      {isPremium && <option value="between">Between</option>}
                    </select>
                  </div>
                  
                  <div className="report-filter-value">
                    <label>Value</label>
                    {shouldUseDropdown(filter.field) ? (
                      <select
                        value={filter.value}
                        onChange={(e) => updateFilter(index, 'value', e.target.value)}
                        aria-label="Select value"
                      >
                        <option value="">Select a value</option>
                        {getUniqueValuesForField(filter.field).map(value => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={filter.field === 'satisfaction' || filter.field === 'loyalty' ? 'number' : 'text'}
                        value={filter.value}
                        onChange={(e) => updateFilter(index, 'value', e.target.value)}
                        placeholder="Enter value"
                        aria-label="Enter value"
                      />
                    )}
                  </div>
                  
                  <button
                    className="report-filter-remove"
                    onClick={() => removeFilter(index)}
                    aria-label="Remove filter"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}

            <div className="report-filter-actions">
              <button 
                className="report-filter-add" 
                onClick={addFilter}
              >
                <span className="report-filter-add-text"><Plus size={16} /> Add Filter</span>
              </button>
            </div>
          </>
        )}
        
        {activeTab === 'settings' && (
          <div className="report-filter-settings">
            <p>Filter settings will be available in a future update.</p>
          </div>
        )}
      </div>

      {!embedded && (
        <div className="report-filter-panel-footer">
          <button 
            className="report-filter-button secondary"
            onClick={handleClear}
          >
            Clear
          </button>
          <button 
            className="report-filter-button primary"
            onClick={handleApply}
          >
            Apply
          </button>
        </div>
      )}
      
      {/* Disconnection Prompt */}
      <FilterDisconnectionPrompt
        isVisible={showDisconnectionPrompt}
        onConfirm={handleDisconnectionConfirm}
        onCancel={handleDisconnectionCancel}
      />
    </div>
  );
};