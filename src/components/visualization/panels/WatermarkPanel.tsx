import React, { useRef, useEffect } from 'react';
import { X, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Switch } from '../../ui/Switch/Switch';
import { useWatermarkControls } from '../../../hooks/useWatermarkControls';
import './WatermarkPanel.css';

// Compass Icon Component
const CompassIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`lucide lucide-compass-icon lucide-compass ${className}`}
  >
    <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/>
    <circle cx="12" cy="12" r="10"/>
  </svg>
);

interface WatermarkPanelProps {
  effects: Set<string>;
  onEffectsChange: (effects: Set<string>) => void;
  onClose: () => void;
  isOpen: boolean;
  dimensions?: {
    totalCols: number;
    totalRows: number;
    cellWidth: number;
    cellHeight: number;
    midpointCol: number;
    midpointRow: number;
    hasNearApostles: boolean;
    scaleRanges: {
      satisfaction: { min: number; max: number };
      loyalty: { min: number; max: number };
    };
  };
}

const WatermarkPanel: React.FC<WatermarkPanelProps> = ({
  effects,
  onEffectsChange,
  onClose,
  isOpen,
  dimensions
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Use the centralized watermark controls hook
  const {
    currentState,
    handlePositionChange,
    resetToDefault,
    updateEffects
  } = useWatermarkControls({
    effects,
    onEffectsChange,
    dimensions
  });

  // Note: Auto-scroll is handled by ChartControls to avoid position changes

  // Helper functions for UI
  const isWatermarkVisible = currentState.isVisible;
  const getCurrentLogo = () => currentState.logoType;
  const getCurrentSize = () => currentState.size;
  const getCurrentPosition = () => currentState.position;
  const getCustomLogoUrl = () => currentState.customUrl;
  const isLogoFlat = currentState.isFlat;

  // Event handlers
  const handleVisibilityToggle = (checked: boolean) => {
    updateEffects(effects => {
      if (checked) {
        effects.delete('HIDE_WATERMARK');
      } else {
        effects.add('HIDE_WATERMARK');
      }
    });
  };

  const handleLogoChange = (logoType: string) => {
    updateEffects(effects => {
      effects.delete('SHOW_TM_LOGO');
      effects.delete('CUSTOM_LOGO');
      if (logoType === 'tm') effects.add('SHOW_TM_LOGO');
      else if (logoType === 'custom') effects.add('CUSTOM_LOGO');
    });
  };

  const handleSizeChange = (size: number) => {
    // Constrain size between 50px and 200px
    const constrainedSize = Math.max(50, Math.min(200, size));
    updateEffects(effects => {
      // Remove existing size effect
      const sizeEffect = Array.from(effects).find(e => e.startsWith('LOGO_SIZE:'));
      if (sizeEffect) effects.delete(sizeEffect);
      // Add new size effect
      effects.add(`LOGO_SIZE:${constrainedSize}`);
    });
  };

  const handleCustomLogoChange = (url: string) => {
    updateEffects(effects => {
      // Remove existing custom URL effect
      const urlEffect = Array.from(effects).find(e => e.startsWith('CUSTOM_LOGO_URL:'));
      if (urlEffect) effects.delete(urlEffect);
      // Add new custom URL effect
      if (url) effects.add(`CUSTOM_LOGO_URL:${url}`);
    });
  };

  const handleFlatToggle = (checked: boolean) => {
    updateEffects(effects => {
      if (checked) {
        effects.add('LOGO_FLAT');
      } else {
        effects.delete('LOGO_FLAT');
      }
    });
  };

  const handleReset = () => {
    updateEffects(effects => {
      // Remove all watermark-related effects
      const watermarkEffects = Array.from(effects).filter(e => 
        e.startsWith('LOGO_') || e.startsWith('SHOW_') || e.startsWith('CUSTOM_') || e === 'HIDE_WATERMARK'
      );
      watermarkEffects.forEach(effect => effects.delete(effect));
    });
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ESC key to close
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, onClose]);

  const currentPosition = getCurrentPosition();

  return (
    <div 
      className={`watermark-panel ${isOpen ? 'open' : ''}`} 
      ref={panelRef}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="watermark-panel-header">
        <div className="watermark-panel-title">
          <CompassIcon size={20} />
          <span>Watermark Controls</span>
        </div>
        <button className="watermark-panel-close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="watermark-panel-content">
        {/* Visibility Toggle */}
        <div className="watermark-control-group">
          <label className="watermark-control-label">
            <Switch
              checked={isWatermarkVisible}
              onChange={handleVisibilityToggle}
              leftLabel="Show Watermark"
            />
          </label>
        </div>

        {isWatermarkVisible && (
          <>
            {/* Logo Selection */}
            <div className="watermark-control-group">
              <label className="watermark-control-label">Logo Type</label>
              <select 
                value={getCurrentLogo()} 
                onChange={(e) => handleLogoChange(e.target.value)}
                className="watermark-control-select"
              >
                <option value="default">Segmentor (Default)</option>
                <option value="tm">Teresa Monroe</option>
                <option value="custom">Custom Logo</option>
              </select>
            </div>

            {/* Custom URL Input */}
            {getCurrentLogo() === 'custom' && (
              <div className="watermark-control-group">
                <label className="watermark-control-label">Custom Logo URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={getCustomLogoUrl()}
                  onChange={(e) => handleCustomLogoChange(e.target.value)}
                  className="watermark-control-input"
                />
              </div>
            )}

            {/* Size Control */}
            <div className="watermark-control-group">
              <label className="watermark-control-label">Size</label>
              <div className="watermark-size-controls">
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={getCurrentSize()}
                  onChange={(e) => handleSizeChange(parseInt(e.target.value))}
                  className="watermark-size-slider"
                />
                <input
                  type="number"
                  min="50"
                  max="200"
                  value={getCurrentSize()}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value)) {
                      handleSizeChange(value);
                    }
                  }}
                  className="watermark-size-input"
                />
                <span className="watermark-size-unit">px</span>
              </div>
            </div>

            {/* Position Controls */}
            <div className="watermark-control-group">
              <label className="watermark-control-label">Position</label>
              <div className="watermark-arrow-controls">
                <div className="arrow-row">
                  <div className="arrow-spacer"></div>
                  <button 
                    className="arrow-button"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePositionChange('y', currentPosition.y - 15);
                    }}
                    title="Move Up"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <div className="arrow-spacer"></div>
                </div>
                <div className="arrow-row">
                  <button 
                    className="arrow-button"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePositionChange('x', currentPosition.x - 15);
                    }}
                    title="Move Left"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="arrow-center">
                    <span>Move</span>
                  </div>
                  <button 
                    className="arrow-button"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePositionChange('x', currentPosition.x + 15);
                    }}
                    title="Move Right"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
                <div className="arrow-row">
                  <div className="arrow-spacer"></div>
                  <button 
                    className="arrow-button"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePositionChange('y', currentPosition.y + 15);
                    }}
                    title="Move Down"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <div className="arrow-spacer"></div>
                </div>
              </div>
              <button 
                className="watermark-reset-button"
                onClick={resetToDefault}
                title="Reset to default position (bottom-right)"
              >
                <RotateCcw size={16} />
                Reset Position
              </button>
            </div>

            {/* Style Options */}
            <div className="watermark-control-group">
              <label className="watermark-control-label">
                <Switch
                  checked={isLogoFlat}
                  onChange={handleFlatToggle}
                  leftLabel="Flat Style"
                />
              </label>
            </div>

            {/* Reset Button */}
            <div className="watermark-control-group">
              <button 
                className="watermark-reset-button" 
                onClick={handleReset}
              >
                <RotateCcw size={16} />
                Reset All
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WatermarkPanel;
