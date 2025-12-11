import React, { useMemo } from 'react';
import { Heart, Package, LogOut } from 'lucide-react';
import { GridDimensions, ScaleFormat } from '@/types/base';
import { useQuadrantAssignment } from '../context/QuadrantAssignmentContext';
import { calculateSpecialZoneBoundaries } from '../utils/zoneCalculator';
import './IndependentLabelLayer.css';

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

interface IndependentLabelLayerProps {
  dimensions: GridDimensions;
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  isClassicModel: boolean;
  showLabels: boolean;
  labelPositioning: 'above-dots' | 'below-dots';
  showSpecialZones?: boolean;
  showNearApostles?: boolean;
  showQuadrantLabels?: boolean;
  showSpecialZoneLabels?: boolean;
  apostlesZoneSize?: number;
  terroristsZoneSize?: number;
}

export const IndependentLabelLayer: React.FC<IndependentLabelLayerProps> = ({
  dimensions,
  satisfactionScale,
  loyaltyScale,
  isClassicModel,
  showLabels,
  labelPositioning,
  showSpecialZones = false,
  showNearApostles = false,
  showQuadrantLabels = true,
  showSpecialZoneLabels = true,
  apostlesZoneSize = 1,
  terroristsZoneSize = 1
}) => {
  // Get the current midpoint and zone sizes from context
  const { midpoint, apostlesZoneSize: contextApostlesZoneSize, terroristsZoneSize: contextTerroristsZoneSize } = useQuadrantAssignment();
  
  // Calculate special zone boundaries
  const specialZoneBoundaries = useMemo(() => {
    return calculateSpecialZoneBoundaries(
      contextApostlesZoneSize,
      contextTerroristsZoneSize,
      satisfactionScale,
      loyaltyScale
    );
  }, [contextApostlesZoneSize, contextTerroristsZoneSize, satisfactionScale, loyaltyScale]);
  
  console.log('🔍 IndependentLabelLayer rendering:', { 
    showLabels, 
    labelPositioning, 
    showSpecialZones, 
    showQuadrantLabels, 
    showSpecialZoneLabels, 
    midpoint, 
    specialZoneBoundaries 
  });
  
  if (!showLabels) {
    console.log('🔍 IndependentLabelLayer: showLabels is false, returning null');
    return null;
  }

  const getLabelPosition = (quadrant: 'loyalists' | 'mercenaries' | 'hostages' | 'defectors') => {
    // Parse the scale format strings to get min/max values
    const satMin = parseInt(satisfactionScale.split('-')[0]);
    const satMax = parseInt(satisfactionScale.split('-')[1]);
    const loyMin = parseInt(loyaltyScale.split('-')[0]);
    const loyMax = parseInt(loyaltyScale.split('-')[1]);
    
    // Use the current midpoint from context (not calculated)
    const midpointSat = midpoint.sat;
    const midpointLoy = midpoint.loy;
    
    // Debug logging
    console.log(`🔍 ${quadrant} positioning:`, { 
      satMin, satMax, loyMin, loyMax, 
      midpointSat, midpointLoy,
      satisfactionScale, loyaltyScale 
    });
    
    switch (quadrant) {
      case 'loyalists':
        // Top-right quadrant: sat > midpoint, loy > midpoint
        // Center should be: sat = (midpoint + max) / 2, loy = (midpoint + max) / 2
        const loyalistsSat = (midpointSat + satMax) / 2;
        const loyalistsLoy = (midpointLoy + loyMax) / 2;
        return { 
          x: ((loyalistsSat - satMin) / (satMax - satMin)) * 100,
          y: ((loyMax - loyalistsLoy) / (loyMax - loyMin)) * 100 // Invert Y for display
        };
      case 'mercenaries':
        // Bottom-right quadrant: sat > midpoint, loy < midpoint
        const mercenariesSat = (midpointSat + satMax) / 2;
        const mercenariesLoy = (loyMin + midpointLoy) / 2;
        return { 
          x: ((mercenariesSat - satMin) / (satMax - satMin)) * 100,
          y: ((loyMax - mercenariesLoy) / (loyMax - loyMin)) * 100 // Invert Y for display
        };
      case 'hostages':
        // Top-left quadrant: sat < midpoint, loy > midpoint
        const hostagesSat = (satMin + midpointSat) / 2;
        const hostagesLoy = (midpointLoy + loyMax) / 2;
        return { 
          x: ((hostagesSat - satMin) / (satMax - satMin)) * 100,
          y: ((loyMax - hostagesLoy) / (loyMax - loyMin)) * 100 // Invert Y for display
        };
      case 'defectors':
        // Bottom-left quadrant: sat < midpoint, loy < midpoint
        const defectorsSat = (satMin + midpointSat) / 2;
        const defectorsLoy = (loyMin + midpointLoy) / 2;
        return { 
          x: ((defectorsSat - satMin) / (satMax - satMin)) * 100,
          y: ((loyMax - defectorsLoy) / (loyMax - loyMin)) * 100 // Invert Y for display
        };
    }
  };

  const getLabelText = (quadrant: 'loyalists' | 'mercenaries' | 'hostages' | 'defectors') => {
    // Always use the same terminology as the original system
    switch (quadrant) {
      case 'loyalists': return 'Loyalists';
      case 'mercenaries': return 'Mercenaries';
      case 'hostages': return 'Hostages';
      case 'defectors': return 'Defectors';
    }
  };

  const getLabelColor = (quadrant: 'loyalists' | 'mercenaries' | 'hostages' | 'defectors') => {
    switch (quadrant) {
      case 'loyalists': return '#4CAF50'; // Green
      case 'mercenaries': return '#F7B731'; // Orange
      case 'hostages': return '#3A6494'; // Blue
      case 'defectors': return '#CC0000'; // Red
    }
  };

  const getQuadrantIcon = (quadrant: 'loyalists' | 'mercenaries' | 'hostages' | 'defectors') => {
    switch (quadrant) {
      case 'loyalists': return <Heart size={16} />;
      case 'mercenaries': return <BirdIcon size={16} />;
      case 'hostages': return <Package size={16} />;
      case 'defectors': return <LogOut size={16} />;
    }
  };

  const quadrants: Array<'loyalists' | 'mercenaries' | 'hostages' | 'defectors'> = 
    ['loyalists', 'mercenaries', 'hostages', 'defectors'];

  // Calculate center positions for special zones
  const apostlesCenterSat = (specialZoneBoundaries.apostles.edgeVertixSat + parseInt(satisfactionScale.split('-')[1])) / 2;
  const apostlesCenterLoy = (specialZoneBoundaries.apostles.edgeVertixLoy + parseInt(loyaltyScale.split('-')[1])) / 2;
  
  const terroristsCenterSat = (parseInt(satisfactionScale.split('-')[0]) + specialZoneBoundaries.terrorists.edgeVertixSat) / 2;
  const terroristsCenterLoy = (parseInt(loyaltyScale.split('-')[0]) + specialZoneBoundaries.terrorists.edgeVertixLoy) / 2;
  
  // Calculate Near-Apostles vertex position (at the intersection of Apostles zone and Near-Apostles area)
  const nearApostlesActualVertexSat = specialZoneBoundaries.apostles.edgeVertixSat - 0.5;
  const nearApostlesActualVertexLoy = specialZoneBoundaries.apostles.edgeVertixLoy - 0.5;

  return (
    <div 
      className="independent-label-layer"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: labelPositioning === 'above-dots' ? 1500 : 10, // High z-index for above, low for below (but always below InfoBox)
      }}
    >
      {/* Quadrant Labels - Only show if showQuadrantLabels is true */}
      {showQuadrantLabels && quadrants.map((quadrant) => {
        const position = getLabelPosition(quadrant);
        const text = getLabelText(quadrant);
        const color = getLabelColor(quadrant);
        const icon = getQuadrantIcon(quadrant);
        
        return (
          <div
            key={quadrant}
            className={`independent-label independent-label--${quadrant}`}
            style={{
              position: 'absolute',
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              padding: '8px 16px',
              borderRadius: '8px',
              border: `2px solid ${color}`,
              color: color,
              fontWeight: '600',
              fontSize: '16px',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
              pointerEvents: 'none',
              zIndex: 1, // Relative to the layer
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {icon}
            {text}
          </div>
        );
      })}
      
      {/* Special Zone Labels - Only show if showSpecialZones and showSpecialZoneLabels are true */}
      {showSpecialZones && showSpecialZoneLabels && (
        <>
          {/* Apostles/Advocates Zone */}
          <div
            className="independent-label independent-label--apostles"
            style={{
              position: 'absolute',
              // Position at the center of the Apostles zone
              top: `${((parseInt(loyaltyScale.split('-')[1]) - apostlesCenterLoy) / (parseInt(loyaltyScale.split('-')[1]) - parseInt(loyaltyScale.split('-')[0]))) * 100}%`,
              left: `${((apostlesCenterSat - parseInt(satisfactionScale.split('-')[0])) / (parseInt(satisfactionScale.split('-')[1]) - parseInt(satisfactionScale.split('-')[0]))) * 100}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '2px solid #4CAF50',
              color: '#4CAF50',
              fontWeight: '500',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {isClassicModel ? 'Apostles' : 'Advocates'}
          </div>

          {/* Terrorists/Trolls Zone */}
          <div
            className="independent-label independent-label--terrorists"
            style={{
              position: 'absolute',
              // Position at the center of the Terrorists zone
              top: `${((parseInt(loyaltyScale.split('-')[1]) - terroristsCenterLoy) / (parseInt(loyaltyScale.split('-')[1]) - parseInt(loyaltyScale.split('-')[0]))) * 100}%`,
              left: `${((terroristsCenterSat - parseInt(satisfactionScale.split('-')[0])) / (parseInt(satisfactionScale.split('-')[1]) - parseInt(satisfactionScale.split('-')[0]))) * 100}%`,
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '2px solid #CC0000',
              color: '#CC0000',
              fontWeight: '500',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {isClassicModel ? 'Terrorists' : 'Trolls'}
          </div>

          {/* Near-Apostles/Near-Advocates Zone - Only show when showNearApostles is true */}
          {showNearApostles && (
            <div
              className="independent-label independent-label--near-apostles"
              style={{
                position: 'absolute',
                // Position at the vertex of the L-shape (the actual Near-Apostles area)
                top: `${((parseInt(loyaltyScale.split('-')[1]) - nearApostlesActualVertexLoy) / (parseInt(loyaltyScale.split('-')[1]) - parseInt(loyaltyScale.split('-')[0]))) * 100}%`,
                left: `${((nearApostlesActualVertexSat - parseInt(satisfactionScale.split('-')[0])) / (parseInt(satisfactionScale.split('-')[1]) - parseInt(satisfactionScale.split('-')[0]))) * 100}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '2px solid #4CAF50',
                color: '#4CAF50',
                fontWeight: '500',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              {isClassicModel ? 'Near-Apostles' : 'Near-Advocates'}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default IndependentLabelLayer;
