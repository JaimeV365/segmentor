import React, { useState, useEffect } from 'react';
import { Switch } from '../../../ui/Switch/Switch';
import { TwoStateToggle } from '../../../ui/TwoStateToggle/TwoStateToggle';
import { BookOpen, Tags, Monitor, Filter } from 'lucide-react';
import { ScaleFormat } from '../../../../types/base';
import WatermarkPanel from '../../panels/WatermarkPanel';
import './ChartControls.css';

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

// Crown Icon Component for Premium Features
const CrownIcon: React.FC<{ size?: number; className?: string }> = ({ size = 12, className = '' }) => (
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
    className={`lucide lucide-crown-icon lucide-crown ${className}`}
  >
    <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/>
    <path d="M5 21h14"/>
  </svg>
);


type LabelMode = 'all' | 'quadrants' | 'sub-sections' | 'none';
type LabelPositioning = 'above-dots' | 'below-dots';

interface ChartControlsProps {
  /** Toggle between classic and modern terminology */
  isClassicModel: boolean;
  setIsClassicModel: (value: boolean) => void;
  
  /** Near-apostles zone visibility */
  showNearApostles: boolean;
  setShowNearApostles: (value: boolean) => void;
  hasSpaceForNearApostles: boolean;

  /** Label display mode */
  labelMode: LabelMode;
  setLabelMode: (mode: LabelMode) => void;
  
  /** Label positioning relative to data points */
  labelPositioning: LabelPositioning;
  setLabelPositioning: (positioning: LabelPositioning) => void;
  
  /** Grid visibility */
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  
  /** Midpoint adjustment */
  isAdjustableMidpoint: boolean;
  setIsAdjustableMidpoint: (adjustable: boolean) => void;
  
  /** Frequency filtering */
  frequencyFilterEnabled: boolean;
  frequencyThreshold: number;
  setFrequencyFilterEnabled: (enabled: boolean) => void;
  setFrequencyThreshold: (threshold: number) => void;
  frequencyData: {
    maxFrequency: number;
    hasOverlaps: boolean;
  };
  
  /** Scale and legend display */
  showScaleNumbers: boolean;
  setShowScaleNumbers: (show: boolean) => void;
  showLegends: boolean;
  setShowLegends: (show: boolean) => void;
  
  // Filter functionality
  data?: any[];
  filteredData?: any[];
  totalData?: any[];
  isUnifiedControlsOpen: boolean;
  setIsUnifiedControlsOpen: (open: boolean) => void;
  activeFilterCount: number;
  
  // Optional parameters for backward compatibility
  showSpecialZones?: boolean;
  setShowSpecialZones?: (show: boolean) => void;
  showQuadrantLabels?: boolean;
  setShowQuadrantLabels?: (show: boolean) => void;
  showSpecialZoneLabels?: boolean;
  setSpecialZoneLabels?: (show: boolean) => void;
  onShowLabelsChange?: (show: boolean) => void;
  satisfactionScale?: ScaleFormat;
  loyaltyScale?: ScaleFormat;
  
  // Watermark controls (Premium only)
  isPremium?: boolean;
  effects?: Set<string>;
  onEffectsChange?: (effects: Set<string>) => void;
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
  
  // Save Progress functionality
  onSaveProgress?: () => void;
}

export const ChartControls: React.FC<ChartControlsProps> = ({
  isClassicModel,
  setIsClassicModel,
  showNearApostles,
  setShowNearApostles,
  hasSpaceForNearApostles,
  showSpecialZones = true,
  setShowSpecialZones = () => {},
  satisfactionScale = '1-5',
  loyaltyScale = '1-5',
  labelMode,
  setLabelMode,
  labelPositioning,
  setLabelPositioning,
  showQuadrantLabels = true,
  setShowQuadrantLabels = () => {},
  showSpecialZoneLabels = true,
  setSpecialZoneLabels = () => {},
  onShowLabelsChange = () => {},
  showGrid,
  setShowGrid,
  isAdjustableMidpoint,
  setIsAdjustableMidpoint,
  frequencyFilterEnabled,
  frequencyThreshold,
  setFrequencyFilterEnabled,
  setFrequencyThreshold,
  frequencyData,
  showScaleNumbers,
  setShowScaleNumbers,
  showLegends,
  setShowLegends,
  data,
  filteredData,
  totalData,
  isUnifiedControlsOpen,
  setIsUnifiedControlsOpen,
  activeFilterCount,
  isPremium = false,
  effects = new Set(),
  onEffectsChange = () => {},
  dimensions
}) => {
  console.log('🔍 ChartControls received labelPositioning:', labelPositioning);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showWatermarkPanel, setShowWatermarkPanel] = useState(false);
  
  // Debug watermark panel state and props
  console.log('🔍 ChartControls: showWatermarkPanel state:', showWatermarkPanel);
  console.log('🔍 ChartControls: onEffectsChange prop:', typeof onEffectsChange, onEffectsChange.toString().substring(0, 100));
  console.log('🔍 ChartControls: effects prop:', Array.from(effects));


  // Compute the areas display mode
  const getAreaDisplayMode = (): number => {
    if (!showSpecialZones) return 1;
    if (!showNearApostles) return 2;
    return 3;
  };

  const [areasDisplayMode, setAreasDisplayMode] = useState<number>(getAreaDisplayMode());

  // Sync display mode with individual toggles
  useEffect(() => {
    setAreasDisplayMode(getAreaDisplayMode());
  }, [showNearApostles, showSpecialZones]);

  // Effect to sync label state with near-apostles visibility
useEffect(() => {
  if (!showNearApostles && labelMode === 'sub-sections') {
    // Call the function directly without dependency
    setLabelMode('all');
    setShowQuadrantLabels(true);
    setSpecialZoneLabels(true);
  }
}, [showNearApostles, labelMode, setShowQuadrantLabels, setSpecialZoneLabels]);



  const handleLabelClick = (mode: LabelMode) => {
    setLabelMode(mode);
    switch (mode) {
      case 'all':
        setShowQuadrantLabels(true);
        setSpecialZoneLabels(true);
        onShowLabelsChange(true); // Enable global labels
        break;
      case 'quadrants':
        setShowQuadrantLabels(true);
        setSpecialZoneLabels(false);
        onShowLabelsChange(true); // Enable global labels
        break;
      case 'sub-sections':
        setShowQuadrantLabels(false);
        setSpecialZoneLabels(true);
        onShowLabelsChange(true); // Enable global labels
        break;
      case 'none':
        setShowQuadrantLabels(false);
        setSpecialZoneLabels(false);
        onShowLabelsChange(false); // Disable global labels
        break;
    }
  };
  
  const handleAreasDisplayModeChange = (position: number) => {
  setAreasDisplayMode(position);
  switch(position) {
    case 1: // No Areas - only main quadrants
      setShowSpecialZones(false);
      setShowNearApostles(false);
      break;
    case 2: // Main Areas - quadrants + apostles/terrorists  
      setShowSpecialZones(true);
      setShowNearApostles(false);
      break;
    case 3: // All Areas - everything including near-zones
      setShowSpecialZones(true);
      setShowNearApostles(true);
      break;
  }
};

// Auto-switch from "All Areas" to "Main Areas" when space runs out
useEffect(() => {
  if (areasDisplayMode === 3 && !hasSpaceForNearApostles) {
    console.log('🔄 Auto-switching from "All Areas" to "Main Areas" - no space available');
    setAreasDisplayMode(2);
    handleAreasDisplayModeChange(2);
  }
}, [hasSpaceForNearApostles, areasDisplayMode, handleAreasDisplayModeChange]);

  const renderLabelButtons = () => {
    const buttons = [
      {
        mode: 'all' as LabelMode,
        label: 'All Labels',
        show: true
      },
      {
        mode: 'quadrants' as LabelMode,
        label: 'Quadrants',
        show: true
      },
      {
        mode: 'sub-sections' as LabelMode,
        label: 'Areas',
        show: showNearApostles && hasSpaceForNearApostles
      },
      {
        mode: 'none' as LabelMode,
        label: 'No Labels',
        show: true
      }
    ];

    return buttons.map(button => 
      button.show && (
        <button 
          key={button.mode}
          className={`label-button ${labelMode === button.mode ? 'active' : ''}`}
          onClick={() => handleLabelClick(button.mode)}
        >
          {button.label}
        </button>
      )
    );
  };

  const renderAreasButtons = () => {
    const buttons = [
      {
        mode: 1,
        label: 'No Areas',
        show: true
      },
      {
        mode: 2,
        label: 'Main Areas',
        show: true
      },
      {
        mode: 3,
        label: 'All Areas',
        show: hasSpaceForNearApostles
      }
    ];

    return buttons.map(button => 
      button.show && (
        <button 
          key={button.mode}
          className={`label-button ${areasDisplayMode === button.mode ? 'active' : ''}`}
          onClick={() => handleAreasDisplayModeChange(button.mode)}
        >
          {button.label}
        </button>
      )
    );
  };

  return (
    <>
      <div className="chart-controls-wrapper">
      <div className="chart-controls-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="control-section-title-text">
          Controls {isCollapsed ? 
            <span style={{ color: '#3a863e' }}>▼</span> : 
            <span style={{ color: '#3a863e' }}>▲</span>}
        </div>
        {/* Filter button and data counter integrated into header */}
        {data && data.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Data points counter */}
            <div style={{
              fontSize: '13px',
              fontWeight: '500',
              color: '#374151',
              fontFamily: 'Lato, sans-serif',
              backgroundColor: '#f9fafb',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid #e5e7eb'
            }}>
              {(() => {
                const activeData = data ? data.filter(p => !p.excluded) : [];
                // Now that FilterContext properly excludes items, filteredData should be correct
                const filteredCount = filteredData ? filteredData.length : activeData.length;
                const totalCount = activeData.length;
                console.log('🔍 Counter debug:', { 
                  filteredCount, 
                  totalCount, 
                  filteredDataLength: filteredData?.length, 
                  dataLength: data?.length,
                  excludedCount: data ? data.filter(p => p.excluded).length : 0,
                  hasFilters: !!filteredData,
                  filteredDataIsSameAsData: filteredData === data,
                  activeDataLength: activeData.length
                });
                return `${filteredCount} of ${totalCount} points`;
              })()}
            </div>
            
            {/* Filter button */}
            <div style={{ position: 'relative' }}>
              <button 
                className={`chart-controls-filter-button ${isUnifiedControlsOpen ? 'active' : ''} ${activeFilterCount > 0 ? 'has-filters' : ''}`}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent collapsing when clicking filter
                  setIsUnifiedControlsOpen(!isUnifiedControlsOpen);
                }}
                title="Unified Controls"
                aria-label="Toggle unified controls panel"
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: isUnifiedControlsOpen ? '#3a863e' : 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease',
                  color: isUnifiedControlsOpen ? 'white' : '#3a863e'
                }}
              >
                <Filter size={16} />
              </button>
              {activeFilterCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {activeFilterCount}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className={`chart-controls ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Display Group */}
        <div className={`control-group display-group ${isPremium ? 'premium-mode' : ''}`}>
          <div className="control-section-title">
            <Monitor size={16} className="control-section-icon" />
            <span className="control-section-title-text">Display</span>
          </div>
          <div className="control-group-content">
            <TwoStateToggle
              leftLabel="Fixed"
              rightLabel="Adjustable"
              value={isAdjustableMidpoint ? 'right' : 'left'}
              onChange={(value: 'left' | 'right') => setIsAdjustableMidpoint(value === 'right')}
            />

            <Switch
              checked={showGrid}
              onChange={setShowGrid}
              leftLabel="Grid"
            />
                        
            <Switch
              checked={showScaleNumbers}
              onChange={setShowScaleNumbers}
              leftLabel="Scale Numbers"
            />
                        
            <Switch
              checked={showLegends}
              onChange={setShowLegends}
              leftLabel="Legends"
            />
          </div>
        </div>

        {/* Labels Group */}
        <div className={`control-group labels-group ${isPremium ? 'premium-mode' : ''}`}>
          <div className="control-section-title">
            <Tags size={16} className="control-section-icon" />
            <span className="control-section-title-text">Labels</span>
          </div>
          <div className="control-group-content">
            <div className="vertical-buttons labels-buttons">
              {renderLabelButtons()}
            </div>
            
            {/* Label Positioning Controls */}
            <div className="label-positioning-controls">
              <div className="control-label">Label Position:</div>
              <TwoStateToggle
                leftLabel="Above Dots"
                rightLabel="Below Dots"
                value={labelPositioning === 'above-dots' ? 'left' : 'right'}
                onChange={(value: 'left' | 'right') => {
                  const newPositioning = value === 'left' ? 'above-dots' : 'below-dots';
                  setLabelPositioning(newPositioning);
                }}
              />
            </div>
          </div>
        </div>


        {/* Terminology Group */}
        <div className={`control-group terminology-group ${isPremium ? 'premium-mode' : ''}`}>
          <div className="control-section-title">
            <BookOpen size={16} className="control-section-icon" />
            <span className="control-section-title-text">Terminology</span>
          </div>
          <div className="control-group-content">
            <TwoStateToggle
  leftLabel="Classic"
  rightLabel="Modern"
  value={isClassicModel ? 'left' : 'right'}
  onChange={(value: 'left' | 'right') => setIsClassicModel(value === 'left')}
  disabled={labelMode === 'none'}
  disabledReason={labelMode === 'none' ? "Not applicable when labels are hidden" : undefined}
/>
            <div className="vertical-buttons terminology-buttons">
              {renderAreasButtons()}
            </div>
          </div>
        </div>

        {/* Watermark Controls (Always visible, but disabled in Standard mode) */}
        <div className={`control-group watermark-group ${isPremium ? 'premium-mode' : 'standard-mode'}`}>
          <div className="control-section-title">
            <CompassIcon size={16} className="control-section-icon" />
            <span className="control-section-title-text">Watermark</span>
          </div>
          <div className="control-group-content">
            <button 
              className="watermark-toggle-button"
              disabled={!isPremium}
              onClick={() => {
                if (!isPremium) return; // Don't do anything in Standard mode
                
                console.log('🔍 ChartControls: Watermark button clicked, current state:', showWatermarkPanel);
                setShowWatermarkPanel(!showWatermarkPanel);
                
                // Auto-scroll to chart when opening watermark controls
                if (!showWatermarkPanel) {
                  setTimeout(() => {
                    const chartElement = document.querySelector('.chart-container');
                    if (chartElement) {
                      const rect = chartElement.getBoundingClientRect();
                      const headerHeight = 80; // Approximate header height
                      const scrollTop = window.pageYOffset + rect.top - headerHeight;
                      
                      window.scrollTo({
                        top: Math.max(0, scrollTop),
                        behavior: 'smooth'
                      });
                    }
                  }, 200);
                }
              }}
              style={{
                width: '100%',
                padding: '6px 8px',
                backgroundColor: showWatermarkPanel ? '#3a863e' : 'white',
                color: showWatermarkPanel ? 'white' : '#3a863e',
                border: '1px solid #3a863e',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '500',
                cursor: isPremium ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                transition: 'all 0.2s ease',
                opacity: isPremium ? 1 : 0.7,
                whiteSpace: 'nowrap',
                minHeight: '32px'
              }}
              onMouseEnter={(e) => {
                if (!showWatermarkPanel && isPremium) {
                  e.currentTarget.style.backgroundColor = '#f0f9f0';
                }
              }}
              onMouseLeave={(e) => {
                if (!showWatermarkPanel && isPremium) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
              title={isPremium ? "Watermark Controls" : "Watermark Controls - Premium Feature"}
            >
              <CompassIcon size={16} />
              Watermark Controls
              {!isPremium && <CrownIcon size={12} className="premium-crown" />}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Watermark Panel */}
    {showWatermarkPanel && (
      <WatermarkPanel
        effects={effects}
        onEffectsChange={onEffectsChange}
        onClose={() => setShowWatermarkPanel(false)}
        isOpen={showWatermarkPanel}
        dimensions={dimensions}
      />
    )}
    </>
  );
};

export default ChartControls;