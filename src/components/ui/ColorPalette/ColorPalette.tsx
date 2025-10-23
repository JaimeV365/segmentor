import React from 'react';
import { PREMIUM_CONFIG } from '../../../constants/premium';
import PremiumFeature from '../PremiumFeature';
import './ColorPalette.css';

export interface ColorPaletteProps {
  colors?: string[];
  selectedColor?: string;
  onColorSelect: (color: string) => void;
  isPremium: boolean;
  disabled?: boolean;
  className?: string;
  showCustomInput?: boolean;
  customHexValue?: string;
  onCustomHexChange?: (hex: string) => void;
}

export const ColorPalette: React.FC<ColorPaletteProps> = ({
  colors = PREMIUM_CONFIG.COLORS.PALETTE,
  selectedColor,
  onColorSelect,
  isPremium,
  disabled = false,
  className = '',
  showCustomInput = false,
  customHexValue = '',
  onCustomHexChange
}) => {
  const handleColorClick = (color: string) => {
    if (!disabled && (isPremium || !disabled)) {
      onColorSelect(color);
    }
  };

  return (
    <div className={`color-palette ${className}`}>
      <div className="color-swatches">
        {colors.map((color) => (
          <PremiumFeature
            key={color}
            isPremium={isPremium}
            featureType="colorCustomization"
            disabledMessage="Color customization"
          >
            <button
              className={`color-swatch ${selectedColor === color ? 'selected' : ''} ${
                !isPremium ? 'premium-disabled' : ''
              }`}
              style={{ 
                backgroundColor: color,
                opacity: !isPremium ? 0.6 : 1
              }}
              onClick={() => handleColorClick(color)}
              disabled={disabled || !isPremium}
              title={!isPremium ? 'Premium feature' : `Select ${color}`}
            />
          </PremiumFeature>
        ))}
      </div>
      
      {showCustomInput && (
        <PremiumFeature
          isPremium={isPremium}
          featureType="colorCustomization"
          disabledMessage="Custom color input"
        >
          <div className="custom-color-input">
            <span className="custom-color-label">Custom hex:</span>
            <span>#</span>
            <input
              type="text"
              value={customHexValue}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
                onCustomHexChange?.(value);
              }}
              placeholder="3a863e"
              maxLength={6}
              disabled={disabled || !isPremium}
              className={!isPremium ? 'premium-disabled' : ''}
            />
          </div>
        </PremiumFeature>
      )}
    </div>
  );
};

export default ColorPalette;
