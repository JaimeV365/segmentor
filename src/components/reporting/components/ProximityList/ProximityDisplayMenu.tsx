import React from 'react';
import './ProximityDisplayMenu.css';

export interface ProximityDisplaySettings {
  grouping: 'flat' | 'bySourceRegion' | 'byStrategicPriority' | 'byDistance';
  showOpportunities: boolean;
  showWarnings: boolean;
  showEmptyCategories: boolean;
  highlightHighImpact: boolean;
  highImpactMethod: 'smart' | 'highBar' | 'standard' | 'sensitive';
  sortBy: 'customerCount' | 'averageDistance' | 'strategicImpact' | 'alphabetical';
}

interface ProximityDisplayMenuProps {
  settings: ProximityDisplaySettings;
  onSettingsChange: (settings: ProximityDisplaySettings) => void;
  onReset: () => void;
}

export const createDefaultProximityDisplaySettings = (): ProximityDisplaySettings => ({
  grouping: 'bySourceRegion',
  showOpportunities: true,
  showWarnings: true,
  showEmptyCategories: false,
  highlightHighImpact: true,
  highImpactMethod: 'smart',
  sortBy: 'customerCount'
});

const ProximityDisplayMenu: React.FC<ProximityDisplayMenuProps> = ({
  settings,
  onSettingsChange,
  onReset
}) => {
  const handleGroupingChange = (grouping: ProximityDisplaySettings['grouping']) => {
    onSettingsChange({ ...settings, grouping });
  };

  const handleFilterChange = (key: keyof Pick<ProximityDisplaySettings, 'showOpportunities' | 'showWarnings' | 'showEmptyCategories' | 'highlightHighImpact' | 'highImpactMethod'>, value: boolean | string) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleSortChange = (sortBy: ProximityDisplaySettings['sortBy']) => {
    onSettingsChange({ ...settings, sortBy });
  };

  const groupingOptions = [
    { value: 'bySourceRegion', label: 'By Segment', description: 'Group by originating quadrant/zone' },
    { value: 'byStrategicPriority', label: 'By Strategic Priority', description: 'Conversion-ready vs cross-quadrant moves' },
    { value: 'byDistance', label: 'By Distance/Difficulty', description: '1-step vs multi-step moves' },
    { value: 'flat', label: 'Full List', description: 'No grouping - show all relationships in a single list' }
  ];

  const sortOptions = [
    { value: 'customerCount', label: 'By Customer Count', description: 'Highest numbers first' },
    { value: 'averageDistance', label: 'By Average Distance', description: 'Closest relationships first' },
    { value: 'strategicImpact', label: 'By Strategic Impact', description: 'Most valuable opportunities first' },
    { value: 'alphabetical', label: 'Alphabetical', description: 'Consistent ordering' }
  ];

  return (
    <div className="proximity-display-menu">
      <div className="menu-section">
        <h4>Grouping Options</h4>
        {groupingOptions.map(option => (
          <label key={option.value} className="menu-option">
            <input
              type="radio"
              name="grouping"
              value={option.value}
              checked={settings.grouping === option.value}
              onChange={() => handleGroupingChange(option.value as ProximityDisplaySettings['grouping'])}
            />
            <div className="option-content">
              <span className="option-label">{option.label}</span>
              <span className="option-description">{option.description}</span>
            </div>
          </label>
        ))}
      </div>

      <div className="menu-section">
        <h4>Display Filters</h4>
        <label className="menu-option">
          <input
            type="checkbox"
            checked={settings.showOpportunities}
            onChange={(e) => handleFilterChange('showOpportunities', e.target.checked)}
          />
          <span className="option-label">Show Opportunities</span>
          <span className="option-description">Positive movements toward better segments</span>
        </label>
        
        <label className="menu-option">
          <input
            type="checkbox"
            checked={settings.showWarnings}
            onChange={(e) => handleFilterChange('showWarnings', e.target.checked)}
          />
          <span className="option-label">Show Warnings</span>
          <span className="option-description">Negative movements toward worse segments</span>
        </label>
        
        <label className="menu-option">
          <input
            type="checkbox"
            checked={settings.showEmptyCategories}
            onChange={(e) => handleFilterChange('showEmptyCategories', e.target.checked)}
          />
          <span className="option-label">Show Empty Categories</span>
          <span className="option-description">Display categories even when count = 0</span>
        </label>
        
        <label className="menu-option">
          <input
            type="checkbox"
            checked={settings.highlightHighImpact}
            onChange={(e) => handleFilterChange('highlightHighImpact', e.target.checked)}
          />
          <span className="option-label">Highlight High-Impact</span>
          <span className="option-description">Show ⭐ star and highlight relationships based on selected detection method</span>
        </label>
      </div>

      {settings.highlightHighImpact && (
        <div className="menu-section">
          <h4>High-Impact Detection</h4>
          <label className="menu-option">
            <input
              type="radio"
              name="highImpactMethod"
              value="smart"
              checked={settings.highImpactMethod === 'smart'}
              onChange={() => handleFilterChange('highImpactMethod', 'smart')}
            />
            <div className="option-content">
              <span className="option-label">Smart (Top 20% by volume)</span>
              <span className="option-description">Adaptive Intelligence - works regardless of data distribution</span>
            </div>
          </label>
          <label className="menu-option">
            <input
              type="radio"
              name="highImpactMethod"
              value="highBar"
              checked={settings.highImpactMethod === 'highBar'}
              onChange={() => handleFilterChange('highImpactMethod', 'highBar')}
            />
            <div className="option-content">
              <span className="option-label">High Bar (10% threshold)</span>
              <span className="option-description">Major movements only</span>
            </div>
          </label>
          <label className="menu-option">
            <input
              type="radio"
              name="highImpactMethod"
              value="standard"
              checked={settings.highImpactMethod === 'standard'}
              onChange={() => handleFilterChange('highImpactMethod', 'standard')}
            />
            <div className="option-content">
              <span className="option-label">Standard (5% threshold)</span>
              <span className="option-description">Typical business focus</span>
            </div>
          </label>
          <label className="menu-option">
            <input
              type="radio"
              name="highImpactMethod"
              value="sensitive"
              checked={settings.highImpactMethod === 'sensitive'}
              onChange={() => handleFilterChange('highImpactMethod', 'sensitive')}
            />
            <div className="option-content">
              <span className="option-label">Sensitive (2% threshold)</span>
              <span className="option-description">Detailed analysis</span>
            </div>
          </label>
        </div>
      )}

      <div className="menu-section">
        <h4>Sort Options</h4>
        {sortOptions.map(option => (
          <label key={option.value} className="menu-option">
            <input
              type="radio"
              name="sortBy"
              value={option.value}
              checked={settings.sortBy === option.value}
              onChange={() => handleSortChange(option.value as ProximityDisplaySettings['sortBy'])}
            />
            <div className="option-content">
              <span className="option-label">{option.label}</span>
              <span className="option-description">{option.description}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default ProximityDisplayMenu;
