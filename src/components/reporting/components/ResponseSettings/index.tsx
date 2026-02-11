import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { ResponseSettingsProps, DEFAULT_SETTINGS } from './types';
import FrequencyThresholdSlider from './FrequencyThresholdSlider';
import TierToggle from './TierToggle';
import InfoPopup from './InfoPopup';
import { useAxisLabels } from '../../../visualization/context/AxisLabelsContext';
import './styles.css';

const colorPalette = [
    '#3a863e', // Brand green
    '#CC0000', // Red
    '#F7B731', // Orange
    '#3A6494', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#78716c', // Warm gray
    '#ffef00', // Yellow
  ];

// Helper function to check if settings have changed from defaults
const hasSettingsChanged = (current: any, defaults: any): boolean => {
  return JSON.stringify(current) !== JSON.stringify(defaults);
};

const ResponseSettings: React.FC<ResponseSettingsProps & { activeSection?: 'distribution' | 'responses' | 'intensity' }> = ({
  settings,
  onSettingsChange,
  onClose,
  isPremium,
  activeSection = 'distribution',
  availableTiers,
  availableItemsCount,
  maxCombinationFrequency
}) => {
    const { labels } = useAxisLabels();
    const [customHexInput, setCustomHexInput] = useState('');
    const [satHexInput, setSatHexInput] = useState('');
    const [loyHexInput, setLoyHexInput] = useState('');

  // Check if current settings have changed from defaults
  const distributionChanged = useMemo(() => 
    hasSettingsChanged(settings.miniPlot, DEFAULT_SETTINGS.miniPlot), 
    [settings.miniPlot]
  );
  
  const responsesChanged = useMemo(() => 
    hasSettingsChanged(settings.list, DEFAULT_SETTINGS.list), 
    [settings.list]
  );
  
  const intensityChanged = useMemo(() => 
    hasSettingsChanged(settings.dial, DEFAULT_SETTINGS.dial), 
    [settings.dial]
  );

  // Smart slider logic
  const isInsufficient = !availableItemsCount || availableItemsCount < 5;
  const hasNoRange = availableItemsCount === 5; // Exactly 5 items = no range to slide
  const effectiveMin = isInsufficient ? (availableItemsCount || 0) : 5;
  const effectiveMax = isInsufficient ? (availableItemsCount || 0) : Math.min(availableItemsCount || 15, 15);
  
  const getEffectiveValue = () => {
    if (isInsufficient) return availableItemsCount || 0;
    return Math.max(Math.min(settings.list.maxItems, effectiveMax), effectiveMin);
  };
  
  const getSliderPercentage = () => {
    if (isInsufficient) return 100;
    const value = getEffectiveValue();
    return ((value - effectiveMin) / (effectiveMax - effectiveMin)) * 100;
  };
  
  const getContextText = () => {
    if (isInsufficient) {
      return `Only ${availableItemsCount || 0} combinations available`;
    } else if (hasNoRange) {
      return `Showing all ${availableItemsCount} combinations`;
    } else if ((availableItemsCount || 0) > 15) {
      return `Showing top ${getEffectiveValue()} of ${availableItemsCount} total combinations`;
    } else {
      return `Showing ${getEffectiveValue()} of ${availableItemsCount} total combinations`;
    }
  };
  
  

  const handleSettingChange = (
    section: keyof typeof settings,
    key: string,
    value: any
  ) => {
    onSettingsChange({
      ...settings,
      [section]: {
        ...settings[section],
        [key]: value
      }
    });
  };

  return (
  <div className="response-settings-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    {/* Remove header when used in tabbed mode */}
    {!activeSection && (
      <div className="response-settings-header">
        <h3>Response Concentration Settings</h3>
        <button 
          onClick={onClose}
          className="response-settings-close"
        >
          <X size={20} />
        </button>
      </div>
    )}

    {/* Distribution Map Settings */}
    {(!activeSection || activeSection === 'distribution') && (
      <div className="settings-section">
        <h4>Response Distribution Map</h4>
        <div className="settings-group">
          <label className="settings-checkbox">
  <input
    type="checkbox"
    checked={settings.miniPlot.useQuadrantColors}
    onChange={(e) => handleSettingChange('miniPlot', 'useQuadrantColors', e.target.checked)}
  />
  Use segment colors
</label>

{!settings.miniPlot.useQuadrantColors && (
  <div className="color-customization">
    <div className="color-palette">
      {colorPalette.map((color) => (
        <div
          key={color}
          className="color-swatch"
          style={{ backgroundColor: color }}
          onClick={() => handleSettingChange(
            'miniPlot',
            'customColors',
            { ...settings.miniPlot.customColors, default: color }
          )}
        />
      ))}
    </div>
    <div className="custom-color-input">
      <span>Custom hex:</span>
      <span>#</span>
      <input
        type="text"
        value={customHexInput}
        onChange={(e) => {
          const value = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
          setCustomHexInput(value);
          if (value.length === 6) {
            handleSettingChange(
              'miniPlot',
              'customColors',
              { ...settings.miniPlot.customColors, default: '#' + value }
            );
          }
        }}
        placeholder="3a863e"
        maxLength={6}
      />
    </div>
  </div>
)}

<label className="settings-checkbox">
  <input
    type="checkbox"
    checked={settings.miniPlot.showAverageDot}
    onChange={(e) => handleSettingChange('miniPlot', 'showAverageDot', e.target.checked)}
  />
  Show average position
</label>
        </div>

        {/* Advanced Frequency Controls - Public for all users */}
        <div className="premium-section">
          <div className="premium-section-header">
            <h5>Advanced Frequency Controls</h5>
          </div>
          
          <FrequencyThresholdSlider
            value={settings.miniPlot.frequencyThreshold || 2}
            onChange={(value) => handleSettingChange('miniPlot', 'frequencyThreshold', value)}
            min={1}
            max={10}
            maxAvailableFrequency={maxCombinationFrequency}
            inPremiumSection={false}
          />
          
          <TierToggle
            showTiers={settings.miniPlot.showTiers || false}
            maxTiers={settings.miniPlot.maxTiers || 2}
            onShowTiersChange={(show) => handleSettingChange('miniPlot', 'showTiers', show)}
            onMaxTiersChange={(tiers) => handleSettingChange('miniPlot', 'maxTiers', tiers)}
            disabled={false}
            availableTiers={availableTiers}
          />
        </div>
        
        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <button
            className={`filter-manage-button ${!distributionChanged ? 'disabled' : ''}`}
            onClick={() => onSettingsChange({
              ...settings,
              miniPlot: { ...DEFAULT_SETTINGS.miniPlot }
            })}
            disabled={!distributionChanged}
          >
            Reset All
          </button>
        </div>
      </div>
    )}

    {/* Response List Settings */}
    {(!activeSection || activeSection === 'responses') && (
      <div className="settings-section">
        <h4>Frequent Responses</h4>
        <div className="settings-group">
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={settings.list.useColorCoding}
              onChange={(e) => handleSettingChange('list', 'useColorCoding', e.target.checked)}
            />
            Use color coding
          </label>

          <div className="settings-input">
            <label className={availableItemsCount && availableItemsCount < 5 ? 'disabled' : ''}>Maximum items</label>
            <div className="smart-slider-container">
              <input
                type="range"
                min={effectiveMin}
                max={effectiveMax}
                value={getEffectiveValue()}
                disabled={isInsufficient || hasNoRange}
                onChange={(e) => handleSettingChange('list', 'maxItems', parseInt(e.target.value))}
                className={`smart-slider ${(isInsufficient || hasNoRange) ? 'disabled' : ''}`}
              />
              <span className={`smart-slider-value ${(isInsufficient || hasNoRange) ? 'disabled' : ''}`}>
                {getEffectiveValue()}
              </span>
            </div>
            <div className={`smart-slider-context ${(!availableItemsCount || availableItemsCount < 5) ? 'disabled' : ''}`}>
              {getContextText()}
            </div>
          </div>
        </div>
        
        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <button
            className={`filter-manage-button ${!responsesChanged ? 'disabled' : ''}`}
            onClick={() => onSettingsChange({
              ...settings,
              list: { ...DEFAULT_SETTINGS.list }
            })}
            disabled={!responsesChanged}
          >
            Reset All
          </button>
        </div>
      </div>
    )}

    {/* Response Intensity Settings */}
    {(!activeSection || activeSection === 'intensity') && (
      <div className="settings-section">
        <h4>Response Intensity</h4>
        <div className="settings-group">
          <div className="settings-row">
            <div className="settings-input">
  <label>
    Min value
    <InfoPopup
      content="Sets the minimum expected percentage. Values below this threshold will be highlighted in red on the dial to indicate they're below the expected range."
      id="min-value-info"
    />
  </label>
  <input
    type="number"
    value={settings.dial.minValue}
    onChange={(e) => handleSettingChange('dial', 'minValue', parseInt(e.target.value))}
  />
</div>
<div className="settings-input">
  <label>
    Max value
    <InfoPopup
      content="Sets the maximum expected percentage. Values above this threshold will be highlighted in red on the dial to indicate they exceed the expected range."
      id="max-value-info"
    />
  </label>
  <input
    type="number"
    value={settings.dial.maxValue}
    onChange={(e) => handleSettingChange('dial', 'maxValue', parseInt(e.target.value))}
  />
</div>
          </div>

          <div className="color-customizations-container">
            {/* Satisfaction Column */}
            <div>
              <label>{labels.satisfaction}</label>
              <div className="color-picker">
                {colorPalette.map((color) => (
                  <div
                    key={color}
                    className="color-swatch"
                    style={{ backgroundColor: color }}
                    onClick={() => handleSettingChange(
                      'dial',
                      'customColors',
                      { ...settings.dial.customColors, satisfaction: color }
                    )}
                  />
                ))}
              </div>
              <div className="custom-color-input">
                <span className="text-xs text-gray-500">Custom hex:</span>
                <span>#</span>
                <input
                  type="text"
                  className="text-xs"
                  value={satHexInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                    setSatHexInput(value);
                    if (value.length === 6) {
                      handleSettingChange(
                        'dial',
                        'customColors',
                        { ...settings.dial.customColors, satisfaction: '#' + value }
                      );
                    }
                  }}
                  placeholder="3a863e"
                  maxLength={6}
                />
              </div>
            </div>
            
            {/* Loyalty Column */}
            <div>
              <label>{labels.loyalty}</label>
              <div className="color-picker">
                {colorPalette.map((color) => (
                  <div
                    key={color}
                    className="color-swatch"
                    style={{ backgroundColor: color }}
                    onClick={() => handleSettingChange(
                      'dial',
                      'customColors',
                      { ...settings.dial.customColors, loyalty: color }
                    )}
                  />
                ))}
              </div>
              <div className="custom-color-input">
                <span className="text-xs text-gray-500">Custom hex:</span>
                <span>#</span>
                <input
                  type="text"
                  className="text-xs"
                  value={loyHexInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                    setLoyHexInput(value);
                    if (value.length === 6) {
                      handleSettingChange(
                        'dial',
                        'customColors',
                        { ...settings.dial.customColors, loyalty: '#' + value }
                      );
                    }
                  }}
                  placeholder="4682b4"
                  maxLength={6}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <button
            className={`filter-manage-button ${!intensityChanged ? 'disabled' : ''}`}
            onClick={() => onSettingsChange({
              ...settings,
              dial: { ...DEFAULT_SETTINGS.dial }
            })}
            disabled={!intensityChanged}
          >
            Reset All
          </button>
        </div>
      </div>
    )}
  </div>
);
};

export default ResponseSettings;