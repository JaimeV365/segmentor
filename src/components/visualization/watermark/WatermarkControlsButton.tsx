import React, { useState, useEffect, useRef } from 'react';
import { Settings, X } from 'lucide-react';
import './WatermarkControlsButton.css';

interface WatermarkControlsButtonProps {
  effects: Set<string>;
  onEffectsChange: (effects: Set<string>) => void;
  isPremium: boolean;
}

export const WatermarkControlsButton: React.FC<WatermarkControlsButtonProps> = ({
  effects,
  onEffectsChange,
  isPremium
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  // For now, let's just show it when premium (we'll add intersection observer later)
  useEffect(() => {
    setIsVisible(true); // Always visible for now
  }, []);

  // Don't render if not premium
  if (!isPremium) return null;

  // Helper functions to get current state
  const isWatermarkVisible = !effects.has('HIDE_WATERMARK');
  const getCurrentLogo = () => {
    if (effects.has('SHOW_XP_LOGO')) return 'xp';
    if (effects.has('SHOW_TM_LOGO')) return 'tm';
    if (effects.has('CUSTOM_LOGO')) return 'custom';
    return 'default'; // Segmentor default
  };
  
  const getCurrentSize = () => {
    const sizeEffect = Array.from(effects).find(e => e.startsWith('LOGO_SIZE:'));
    return sizeEffect ? parseInt(sizeEffect.replace('LOGO_SIZE:', ''), 10) : 90;
  };

  const getCurrentPosition = () => {
    const xEffect = Array.from(effects).find(e => e.startsWith('LOGO_X:'));
    const yEffect = Array.from(effects).find(e => e.startsWith('LOGO_Y:'));
    return {
      x: xEffect ? parseInt(xEffect.replace('LOGO_X:', ''), 10) : 0,
      y: yEffect ? parseInt(yEffect.replace('LOGO_Y:', ''), 10) : 0
    };
  };
  
  const getCustomLogoUrl = () => {
    const urlEffect = Array.from(effects).find(e => e.startsWith('CUSTOM_LOGO_URL:'));
    return urlEffect ? urlEffect.replace('CUSTOM_LOGO_URL:', '') : '';
  };
  
  const isLogoFlat = effects.has('LOGO_FLAT');

  // Check if any watermark settings have been modified from defaults
  const hasModifications = () => {
    return effects.has('HIDE_WATERMARK') ||
           effects.has('SHOW_XP_LOGO') ||
           effects.has('SHOW_TM_LOGO') ||
           effects.has('CUSTOM_LOGO') ||
           Array.from(effects).some(e => e.startsWith('CUSTOM_LOGO_URL:')) ||
           Array.from(effects).some(e => e.startsWith('LOGO_SIZE:')) ||
           Array.from(effects).some(e => e.startsWith('LOGO_X:')) ||
           Array.from(effects).some(e => e.startsWith('LOGO_Y:')) ||
           effects.has('LOGO_FLAT');
  };

  // Reset all watermark settings to defaults
  const resetWatermarkSettings = () => {
    const newEffects = new Set(effects);
    
    // Remove all watermark-related effects
    newEffects.delete('HIDE_WATERMARK');
    newEffects.delete('SHOW_XP_LOGO');
    newEffects.delete('SHOW_TM_LOGO');
    newEffects.delete('CUSTOM_LOGO');
    newEffects.delete('LOGO_FLAT');
    
    // Remove all dynamic effects
    Array.from(newEffects)
      .filter(e => 
        e.startsWith('CUSTOM_LOGO_URL:') ||
        e.startsWith('LOGO_SIZE:') ||
        e.startsWith('LOGO_X:') ||
        e.startsWith('LOGO_Y:')
      )
      .forEach(e => newEffects.delete(e));
    
    onEffectsChange(newEffects);
  };

  // Handle visibility toggle
  const handleVisibilityToggle = (visible: boolean) => {
    const newEffects = new Set(effects);
    if (visible) {
      newEffects.delete('HIDE_WATERMARK');
    } else {
      newEffects.add('HIDE_WATERMARK');
    }
    onEffectsChange(newEffects);
  };

  // Handle logo selection
  const handleLogoChange = (logoType: string) => {
    const newEffects = new Set(effects);
    
    // Clear all logo effects
    newEffects.delete('HIDE_WATERMARK');
    newEffects.delete('SHOW_XP_LOGO');
    newEffects.delete('SHOW_TM_LOGO');
    newEffects.delete('CUSTOM_LOGO');
    Array.from(newEffects)
      .filter(e => e.startsWith('CUSTOM_LOGO_URL:'))
      .forEach(e => newEffects.delete(e));

    // Set new logo
    switch (logoType) {
      case 'xp':
        newEffects.add('SHOW_XP_LOGO');
        break;
      case 'tm':
        newEffects.add('SHOW_TM_LOGO');
        break;
      case 'custom':
        newEffects.add('CUSTOM_LOGO');
        break;
      // default is no special effect (Segmentor)
    }
    
    onEffectsChange(newEffects);
  };

  // Handle custom logo URL
  const handleCustomLogoChange = (url: string) => {
    const newEffects = new Set(effects);
    
    // Remove existing custom URL
    Array.from(newEffects)
      .filter(e => e.startsWith('CUSTOM_LOGO_URL:'))
      .forEach(e => newEffects.delete(e));
    
    // Add new URL if provided
    if (url.trim()) {
      newEffects.add(`CUSTOM_LOGO_URL:${url.trim()}`);
    }
    
    onEffectsChange(newEffects);
  };

  // Handle size adjustment
  const adjustSize = (delta: number) => {
    const currentSize = getCurrentSize();
    const newSize = Math.max(50, Math.min(200, currentSize + delta));
    
    const newEffects = new Set(effects);
    
    // Remove existing size effect
    Array.from(newEffects)
      .filter(e => e.startsWith('LOGO_SIZE:'))
      .forEach(e => newEffects.delete(e));
    
    // Add new size
    newEffects.add(`LOGO_SIZE:${newSize}`);
    
    onEffectsChange(newEffects);
  };

  // Handle position adjustment
  const adjustPosition = (axis: 'x' | 'y', delta: number) => {
    const currentPos = getCurrentPosition();
    const newValue = Math.max(-10, Math.min(10, currentPos[axis] + delta));
    
    const newEffects = new Set(effects);
    
    // Remove existing position effect for this axis
    Array.from(newEffects)
      .filter(e => e.startsWith(`LOGO_${axis.toUpperCase()}:`))
      .forEach(e => newEffects.delete(e));
    
    // Add new position (only if not zero)
    if (newValue !== 0) {
      newEffects.add(`LOGO_${axis.toUpperCase()}:${newValue}`);
    }
    
    onEffectsChange(newEffects);
  };

  // Handle rotation toggle
  const handleRotationToggle = (flat: boolean) => {
    const newEffects = new Set(effects);
    
    if (flat) {
      newEffects.add('LOGO_FLAT');
    } else {
      newEffects.delete('LOGO_FLAT');
    }
    
    onEffectsChange(newEffects);
  };

  return (
    <>
      {/* Chart-integrated button */}
      <div className="watermark-controls-chart-button" ref={buttonRef}>
        <button
          className={`watermark-controls-trigger ${showPanel ? 'active' : ''}`}
          onClick={() => setShowPanel(!showPanel)}
          title="Watermark Settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Side panel */}
      {showPanel && (
        <>
          <div className="watermark-controls-overlay" onClick={() => setShowPanel(false)} />
          <div className="watermark-controls-panel">
            <div className="watermark-controls-header">
              <h3>Watermark Settings</h3>
              <button onClick={() => setShowPanel(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="watermark-controls-content">
              {/* Visibility Toggle */}
              <div className="watermark-control-group">
                <label className="watermark-control-label">
                  <input
                    type="checkbox"
                    checked={isWatermarkVisible}
                    onChange={(e) => handleVisibilityToggle(e.target.checked)}
                  />
                  Show Watermark
                </label>
              </div>

              {isWatermarkVisible && (
                <>
                  {/* Logo Selection */}
                  <div className="watermark-control-group">
                    <label>Logo</label>
                    <select 
                      value={getCurrentLogo()} 
                      onChange={(e) => handleLogoChange(e.target.value)}
                      className="watermark-control-select"
                    >
                      <option value="default">Segmentor</option>
                      <option value="xp">Xperience 360</option>
                      <option value="tm">Teresa Monroe</option>
                      <option value="custom">Custom Logo URL</option>
                    </select>
                  </div>

                  {/* Custom URL Input */}
                  {getCurrentLogo() === 'custom' && (
                    <div className="watermark-control-group">
                      <label>Custom Logo URL</label>
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
                    <label>Size: {getCurrentSize()}px</label>
                    <div className="watermark-size-controls">
                      <button 
                        onClick={() => adjustSize(-10)}
                        className="watermark-size-button"
                        disabled={getCurrentSize() <= 50}
                      >
                        -
                      </button>
                      <span className="watermark-size-display">{getCurrentSize()}px</span>
                      <button 
                        onClick={() => adjustSize(10)}
                        className="watermark-size-button"
                        disabled={getCurrentSize() >= 200}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Rotation Control */}
                  <div className="watermark-control-group">
                    <label>Orientation</label>
                    <div className="watermark-rotation-controls">
                      <button
                        className={`watermark-rotation-button ${!isLogoFlat ? 'active' : ''}`}
                        onClick={() => handleRotationToggle(false)}
                      >
                        Vertical
                      </button>
                      <button
                        className={`watermark-rotation-button ${isLogoFlat ? 'active' : ''}`}
                        onClick={() => handleRotationToggle(true)}
                      >
                        Horizontal
                      </button>
                    </div>
                  </div>

                  {/* Position Control */}
                  <div className="watermark-control-group">
                    <label>Position</label>
                    
                    {/* Horizontal Position */}
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                        Horizontal: {getCurrentPosition().x}px
                      </label>
                      <div className="watermark-size-controls">
                        <button 
                          onClick={() => adjustPosition('x', -1)}
                          className="watermark-size-button"
                          disabled={getCurrentPosition().x <= -10}
                          title="Move left"
                        >
                          ←
                        </button>
                        <span className="watermark-size-display">{getCurrentPosition().x}px</span>
                        <button 
                          onClick={() => adjustPosition('x', 1)}
                          className="watermark-size-button"
                          disabled={getCurrentPosition().x >= 10}
                          title="Move right"
                        >
                          →
                        </button>
                      </div>
                    </div>

                    {/* Vertical Position */}
                    <div>
                      <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                        Vertical: {getCurrentPosition().y}px
                      </label>
                      <div className="watermark-size-controls">
                        <button 
                          onClick={() => adjustPosition('y', 1)}
                          className="watermark-size-button"
                          disabled={getCurrentPosition().y >= 10}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <span className="watermark-size-display">{getCurrentPosition().y}px</span>
                        <button 
                          onClick={() => adjustPosition('y', -1)}
                          className="watermark-size-button"
                          disabled={getCurrentPosition().y <= -10}
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer with Reset Button */}
            <div className="watermark-controls-footer">
              <button 
                className="watermark-reset-button" 
                onClick={resetWatermarkSettings}
                disabled={!hasModifications()}
              >
                Reset All
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
















































