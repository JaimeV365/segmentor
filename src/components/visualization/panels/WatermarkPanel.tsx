import React, { useRef, useEffect } from 'react';
import { X, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';
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
  isPremium?: boolean;
}

const WatermarkPanel: React.FC<WatermarkPanelProps> = ({
  effects,
  onEffectsChange,
  onClose,
  isOpen,
  dimensions,
  isPremium
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Use the centralized watermark controls hook
  const {
    currentState,
    handlePositionChange,
    resetToDefault,
    updateEffects,
    nudgePosition,
    setLogoSize,
    toggleFlat
  } = useWatermarkControls({
    effects,
    onEffectsChange,
    dimensions
  });

  // Gate drag by panel open + premium (safe: handlers gated, pointer events always on)
  useEffect(() => {
    updateEffects(next => {
      if (isOpen && isPremium) next.add('WM_DRAG_ENABLED');
      else next.delete('WM_DRAG_ENABLED');
    });
    return () => updateEffects(next => next.delete('WM_DRAG_ENABLED'));
  }, [isOpen, isPremium, updateEffects]);

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
    setLogoSize(size);
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
    toggleFlat(checked);
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
            {/* Opacity Control */}
            <div className="watermark-control-group">
              <label className="watermark-control-label">Transparency</label>
              <div className="watermark-size-controls">
                <input
                  type="range"
                  min="0.4"
                  max="1"
                  step="0.05"
                  value={(() => {
                    const effect = Array.from(effects).find(e => e.startsWith('LOGO_OPACITY:'));
                    const v = effect ? parseFloat(effect.replace('LOGO_OPACITY:', '')) : 0.6;
                    return isNaN(v) ? 0.6 : Math.max(0.4, Math.min(1, v));
                  })()}
                  onChange={(e) => {
                    const val = Math.max(0.4, Math.min(1, parseFloat(e.target.value)));
                    updateEffects(next => {
                      Array.from(next).filter(s => s.startsWith('LOGO_OPACITY:')).forEach(s => next.delete(s));
                      next.add(`LOGO_OPACITY:${val}`);
                    });
                  }}
                  className="watermark-size-slider"
                />
                <span className="watermark-size-unit">{Math.round(((() => {
                  const effect = Array.from(effects).find(e => e.startsWith('LOGO_OPACITY:'));
                  const v = effect ? parseFloat(effect.replace('LOGO_OPACITY:', '')) : 0.6;
                  return isNaN(v) ? 0.6 : Math.max(0.4, Math.min(1, v));
                })()) * 100)}%</span>
              </div>
            </div>
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
              <div className="watermark-position-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div className="watermark-arrow-controls" style={{ marginLeft: '-6px' }}>
                  <div className="arrow-row">
                    <div className="arrow-spacer"></div>
                    <button 
                      className="arrow-button"
                      onClick={(e) => {
                        e.preventDefault();
                        nudgePosition(0, -15);
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
                        nudgePosition(-15, 0);
                      }}
                      title="Move Left"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div className="arrow-center"></div>
                    <button 
                      className="arrow-button"
                      onClick={(e) => {
                        e.preventDefault();
                        nudgePosition(15, 0);
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
                        nudgePosition(0, 15);
                      }}
                      title="Move Down"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <div className="arrow-spacer"></div>
                  </div>
                </div>
                <div className="watermark-rotation-side" style={{ marginLeft: 8 }}>
                  <button 
                    className="arrow-button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFlat(!currentState.isFlat);
                    }}
                    title="Toggle horizontal/vertical"
                  >
                    <RotateCw size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Style options removed: replaced by rotation icon near arrows */}

          </>
        )}
      </div>
      {/* Footer with Reset Button matching unified style (stick to bottom) */}
      <div className="unified-tab-footer">
        <button 
          className="unified-reset-button" 
          onClick={handleReset}
        >
          Reset All
        </button>
      </div>
    </div>
  );
};

export default WatermarkPanel;
