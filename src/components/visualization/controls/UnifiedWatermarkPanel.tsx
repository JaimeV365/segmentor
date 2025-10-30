import React, { useEffect, useRef } from 'react';
import { X, Crown, RotateCw } from 'lucide-react';
import { GridDimensions } from '@/types/base';
import { useWatermarkControls } from '../../../hooks/useWatermarkControls';

interface UnifiedWatermarkPanelProps {
  isOpen: boolean;
  onClose: () => void;
  effects: Set<string>;
  onEffectsChange: (effects: Set<string>) => void;
  dimensions: GridDimensions;
  isPremium?: boolean;
}

export const UnifiedWatermarkPanel: React.FC<UnifiedWatermarkPanelProps> = ({
  isOpen,
  onClose,
  effects,
  onEffectsChange,
  dimensions,
  isPremium
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Body class to harmonize with unified controls
  useEffect(() => {
    if (isOpen) document.body.classList.add('unified-controls-open');
    return () => document.body.classList.remove('unified-controls-open');
  }, [isOpen]);

  if (!isOpen) return null;

  const { currentState, nudgePosition, setLogoSize, toggleFlat, updateEffects } = useWatermarkControls({
    effects,
    onEffectsChange,
    dimensions
  });

  // DnD always on (stable behavior) — no gating here

  return (
    <div className="unified-controls-panel" ref={panelRef}>
      <div className="unified-controls-header">
        <div className="unified-controls-tabs">
          <button className={`unified-tab active`}>
            <Crown size={16} />
            Watermark
          </button>
        </div>
        <button className="unified-close-button" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="unified-controls-content">
        <div className="unified-tab-content">
          <div className="unified-tab-body">
            {/* Logo Selection */}
            <div className="unified-control-group">
              <label className="unified-control-label">Logo</label>
              <select
                className="unified-control-select"
                value={
                  effects.has('SHOW_XP_LOGO') ? 'xp' :
                  effects.has('SHOW_TM_LOGO') ? 'tm' :
                  effects.has('CUSTOM_LOGO') ? 'custom' : 'default'
                }
                onChange={(e) => {
                  updateEffects(next => {
                    next.delete('SHOW_XP_LOGO');
                    next.delete('SHOW_TM_LOGO');
                    next.delete('CUSTOM_LOGO');
                    if (e.target.value === 'tm') next.add('SHOW_TM_LOGO');
                    else if (e.target.value === 'custom') next.add('CUSTOM_LOGO');
                  });
                }}
              >
                <option value="default">Segmentor (Default)</option>
                <option value="tm">Teresa Monroe</option>
                <option value="custom">Custom Logo</option>
              </select>
            </div>

            {/* Size Controls */}
            <div className="unified-control-group">
              <label className="unified-control-label">Size</label>
              <div className="unified-size-controls">
                <button
                  className="unified-size-button"
                  onClick={() => setLogoSize(currentState.size - 10)}
                >
                  -
                </button>
                <div className="unified-size-display">{currentState.size}px</div>
                <button
                  className="unified-size-button"
                  onClick={() => setLogoSize(currentState.size + 10)}
                >
                  +
                </button>
              </div>
            </div>

            {/* Transparency Control */}
            <div className="unified-control-group">
              <label className="unified-control-label">Transparency</label>
              <div className="unified-size-controls">
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
                  className="unified-control-input"
                />
                <div className="unified-size-display">{Math.round(((() => {
                  const effect = Array.from(effects).find(e => e.startsWith('LOGO_OPACITY:'));
                  const v = effect ? parseFloat(effect.replace('LOGO_OPACITY:', '')) : 0.6;
                  return isNaN(v) ? 0.6 : Math.max(0.4, Math.min(1, v));
                })()) * 100)}%</div>
              </div>
            </div>

            {/* Position Controls */}
            <div className="unified-control-group">
              <label className="unified-control-label">Position</label>
              <div className="unified-position-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div className="unified-position-arrows" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: '-6px' }}>
                  <div className="unified-size-controls">
                    <button className="unified-size-button" onClick={() => nudgePosition(0, -10)}>↑</button>
                  </div>
                  <div className="unified-size-controls">
                    <button className="unified-size-button" onClick={() => nudgePosition(-10, 0)}>←</button>
                    <div className="unified-size-display">Move</div>
                    <button className="unified-size-button" onClick={() => nudgePosition(10, 0)}>→</button>
                  </div>
                  <div className="unified-size-controls">
                    <button className="unified-size-button" onClick={() => nudgePosition(0, 10)}>↓</button>
                  </div>
                </div>
                <div className="unified-position-rotate" style={{ marginLeft: 8, display: 'flex', gap: 8 }}>
                  <button
                    className="unified-size-button"
                    title="Toggle horizontal/vertical"
                    onClick={() => toggleFlat(!effects.has('LOGO_FLAT'))}
                  >
                    <RotateCw size={16} />
                  </button>
                  {isPremium && (
                    <button
                      className="unified-size-button"
                      title={effects.has('WM_DRAG_ENABLED') ? 'Disable drag to move' : 'Enable drag to move'}
                      aria-pressed={effects.has('WM_DRAG_ENABLED')}
                      onClick={() => updateEffects(next => {
                        if (next.has('WM_DRAG_ENABLED')) next.delete('WM_DRAG_ENABLED');
                        else next.add('WM_DRAG_ENABLED');
                      })}
                    >
                      {(() => {
                        const muted = !effects.has('WM_DRAG_ENABLED');
                        return (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={muted ? '#9ca3af' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
                            <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
                            <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
                            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
                            {muted && <path d="M3 21L21 3" />}
                          </svg>
                        );
                      })()}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Footer with Reset Button */}
            <div className="unified-tab-footer">
              <button 
                className="unified-reset-button" 
                onClick={() => updateEffects(next => {
                  Array.from(next).filter(e => e.startsWith('LOGO_') || e.startsWith('SHOW_') || e.startsWith('CUSTOM_') || e === 'HIDE_WATERMARK').forEach(e => next.delete(e));
                })}
              >
                Reset All
              </button>
            </div>
            {/* Rotation controls removed in favor of side icon */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedWatermarkPanel;

