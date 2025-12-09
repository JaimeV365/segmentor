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
  console.log('[ColorPalette] RENDERING - disabled:', disabled, 'isPremium:', isPremium, 'colors count:', colors.length);
  
  const handleColorClick = (color: string, event: React.MouseEvent<HTMLButtonElement>) => {
    console.log('[ColorPalette] handleColorClick CALLED for color:', color);
    event.stopPropagation();
    console.log('[ColorPalette] Color clicked:', color, 'disabled:', disabled, 'isPremium:', isPremium);
    if (!disabled && isPremium) {
      console.log('[ColorPalette] Calling onColorSelect with:', color);
      onColorSelect(color);
    } else {
      console.log('[ColorPalette] Click ignored - disabled:', disabled, 'isPremium:', isPremium);
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
              onClick={(e) => {
                console.log('[ColorPalette] Button onClick FIRED for color:', color, 'button disabled:', disabled || !isPremium);
                handleColorClick(color, e);
              }}
              onMouseDown={(e) => {
                console.log('[ColorPalette] Button onMouseDown for color:', color);
              }}
              disabled={disabled || !isPremium}
              title={!isPremium ? 'Brand+ feature' : `Select ${color}`}
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
