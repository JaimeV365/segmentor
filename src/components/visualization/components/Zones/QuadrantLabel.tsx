import React from 'react';
import { Heart, Package, LogOut } from 'lucide-react';

// Custom Bird Icon Component for Mercenaries
const BirdIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
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
    className={`lucide lucide-bird-icon lucide-bird ${className}`}
  >
    <path d="M16 7h.01"/>
    <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/>
    <path d="m20 7 2 .5-2 .5"/>
    <path d="M10 18v3"/>
    <path d="M14 17.75V21"/>
    <path d="M7 18a6 6 0 0 0 3.84-10.61"/>
  </svg>
);

interface QuadrantLabelProps {
  quadrant: 'loyalists' | 'mercenaries' | 'hostages' | 'defectors';
  position: {
    left: string;
    bottom: string;
    width: string;
    height: string;
  };
  isClassicModel?: boolean;
  showLabels?: boolean;
}

const QuadrantLabel: React.FC<QuadrantLabelProps> = ({
  quadrant,
  position,
  isClassicModel = false,
  showLabels = true
}) => {
  if (!showLabels) return null;

  const getQuadrantInfo = () => {
    switch (quadrant) {
      case 'loyalists':
        return {
          label: 'Loyalists',
          color: '#1B4332',
          icon: <Heart size={16} />
        };
      case 'mercenaries':
        return {
          label: 'Mercenaries',
          color: '#854D0E',
          icon: <BirdIcon size={16} />
        };
      case 'hostages':
        return {
          label: 'Hostages',
          color: '#1E3A8A',
          icon: <Package size={16} />
        };
      case 'defectors':
        return {
          label: 'Defectors',  // Always "Defectors" regardless of mode
          color: '#7F1D1D',
          icon: <LogOut size={16} />
        };
    }
  };

  const info = getQuadrantInfo();

  // Convert percentage strings to numbers for calculations
  const left = parseFloat(position.left);
  const bottom = parseFloat(position.bottom);
  const width = parseFloat(position.width);
  const height = parseFloat(position.height);

  // Position label in the center of each quadrant
  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${left + width/2}%`,
    bottom: `${bottom + height/2}%`,
    transform: 'translate(-50%, 50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '8px 16px',
    borderRadius: '6px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    color: info.color,
    fontWeight: 500,
    fontSize: '14px',
    zIndex: 2,
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  return (
    <div style={labelStyle} translate="no">
      {info.icon}
      {info.label}
    </div>
  );
};

export default QuadrantLabel;