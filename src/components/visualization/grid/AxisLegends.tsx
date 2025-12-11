import React from 'react';
import { ScaleFormat } from '../../../types/base';

interface AxisLegendsProps {
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  showLegends: boolean;
  showScaleNumbers: boolean;
}

const AxisLegends: React.FC<AxisLegendsProps> = ({
  satisfactionScale,
  loyaltyScale,
  showLegends,
  showScaleNumbers
}) => {
  if (!showLegends) return null;

  // Extract scale ranges (both min and max)
  const [satMin, satMax] = satisfactionScale.split('-').map(Number);
  const [loyMin, loyMax] = loyaltyScale.split('-').map(Number);

  // Calculate positions based on scale visibility
  const xLabelBottom = showScaleNumbers ? '-85px' : '-45px';
  const yLabelLeft = showScaleNumbers ? '-60px' : '-30px';

  const labelStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  };

  const textStyles: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    letterSpacing: '0.01em',
  };

  const rangeStyles: React.CSSProperties = {
    fontSize: '12px',
    color: '#6b7280',
    paddingLeft: '10px',
    marginLeft: '10px',
    borderLeft: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    fontFeatureSettings: '"tnum" on, "lnum" on',  // For better number alignment
  };

  return (
    <div className="axis-labels" style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 20
    }}>
      {/* Satisfaction (X-axis) Legend */}
      <div 
        className="x-label" 
        style={{
          ...labelStyles,
          position: 'absolute',
          left: '50%',
          bottom: xLabelBottom,
          transform: 'translateX(-50%)',
        }}
      >
        <span style={textStyles}>
          Satisfaction
        </span>
        <span style={rangeStyles}>
          {satMin} - {satMax}
        </span>
      </div>

      {/* Loyalty (Y-axis) Legend */}
      <div 
        className="y-label"
        style={{
          ...labelStyles,
          position: 'absolute',
          top: '50%',
          left: yLabelLeft,
          transformOrigin: 'left center',
          transform: 'translateY(-50%) rotate(-90deg)',
        }}
      >
        <span style={textStyles}>
          Loyalty
        </span>
        <span style={rangeStyles}>
          {loyMin} - {loyMax}
        </span>
      </div>
    </div>
  );
};

export default AxisLegends;