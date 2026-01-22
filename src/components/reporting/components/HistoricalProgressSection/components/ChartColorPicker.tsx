import React, { useState } from 'react';
import './ChartColorPicker.css';

interface ChartColorPickerProps {
  label: string;
  currentColor: string;
  onColorChange: (color: string) => void;
}

const PRESET_COLORS = [
  '#3a863e', // Brand green
  '#4682B4', // Steel blue
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#a855f7', // Violet
];

export const ChartColorPicker: React.FC<ChartColorPickerProps> = ({
  label,
  currentColor,
  onColorChange
}) => {
  const [hexInput, setHexInput] = useState(currentColor);
  const [showHexInput, setShowHexInput] = useState(false);

  const handlePresetClick = (color: string) => {
    onColorChange(color);
    setHexInput(color);
    setShowHexInput(false);
  };

  const handleHexChange = (value: string) => {
    setHexInput(value);
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      onColorChange(value);
    }
  };

  const handleHexSubmit = () => {
    if (/^#[0-9A-F]{6}$/i.test(hexInput)) {
      onColorChange(hexInput);
      setShowHexInput(false);
    }
  };

  return (
    <div className="chart-color-picker">
      <div className="color-picker-label">
        <span>{label}</span>
        <div 
          className="color-preview" 
          style={{ backgroundColor: currentColor }}
          title={currentColor}
        />
      </div>
      
      <div className="color-palette">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`color-swatch ${currentColor.toLowerCase() === color.toLowerCase() ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => handlePresetClick(color)}
            title={color}
          />
        ))}
      </div>
      
      <div className="color-hex-section">
        {!showHexInput ? (
          <button
            type="button"
            className="hex-toggle-button"
            onClick={() => setShowHexInput(true)}
          >
            Enter hex code
          </button>
        ) : (
          <div className="hex-input-group">
            <input
              type="text"
              className="hex-input"
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              placeholder="#3a863e"
              pattern="^#[0-9A-F]{6}$"
              maxLength={7}
            />
            <button
              type="button"
              className="hex-submit-button"
              onClick={handleHexSubmit}
              disabled={!(/^#[0-9A-F]{6}$/i.test(hexInput))}
            >
              Apply
            </button>
            <button
              type="button"
              className="hex-cancel-button"
              onClick={() => {
                setShowHexInput(false);
                setHexInput(currentColor);
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
