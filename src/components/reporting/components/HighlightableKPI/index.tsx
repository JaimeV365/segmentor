import React, { useState } from 'react';
import { PREMIUM_CONFIG } from '../../../../constants/premium';
import './HighlightableKPI.css';

type HighlightColor = 'green' | 'yellow' | 'red';

interface HighlightableKPIProps {
  id: string;
  children: React.ReactNode;
  isPremium?: boolean;
  className?: string;
}

export const HighlightableKPI: React.FC<HighlightableKPIProps> = ({
  id,
  children,
  isPremium = false,
  className = ''
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [currentColor, setCurrentColor] = useState<HighlightColor | null>(null);

  const handleClick = () => {
    if (isPremium) {
      setShowColorPicker(true);
    } else {
      // Standard mode - toggle yellow only
      setCurrentColor(currentColor === 'yellow' ? null : 'yellow');
    }
  };

  const handleColorSelect = (color: HighlightColor) => {
    setCurrentColor(currentColor === color ? null : color);
    setShowColorPicker(false);
  };

  return (
    <div 
      className={`highlightable-kpi ${className} 
        ${currentColor ? `highlight-${currentColor}` : ''} 
        ${isPremium ? 'premium-kpi' : ''}`}
      onClick={handleClick}
    >
      {children}
      
      {!currentColor && (
        <div className="kpi-hover-tooltip">
          Click to {isPremium ? 'choose highlight' : 'highlight'}
        </div>
      )}

      {showColorPicker && (
        <div className="color-picker-popup" onClick={e => e.stopPropagation()}>
          <div className="color-options">
            <button
              className={`color-option green ${!isPremium ? 'disabled' : ''}`}
              onClick={() => isPremium && handleColorSelect('green')}
              title={isPremium ? "Highlight positive metric" : "Brand+ feature"}
              disabled={!isPremium}
            />
            <button
              className="color-option yellow"
              onClick={() => handleColorSelect('yellow')}
              title="Standard highlight"
            />
            <button
              className={`color-option red ${!isPremium ? 'disabled' : ''}`}
              onClick={() => isPremium && handleColorSelect('red')}
              title={isPremium ? "Highlight area for improvement" : "Brand+ feature"}
              disabled={!isPremium}
            />
          </div>
        </div>
      )}
    </div>
  );
};