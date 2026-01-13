import React, { useMemo } from 'react';
import { MovementStats } from '../services/historicalAnalysisService';
import type { QuadrantType } from '../../../../visualization/context/QuadrantAssignmentContext';

interface QuadrantMovementDiagramProps {
  movementStats: MovementStats;
}

// Quadrant display names
const QUADRANT_NAMES: Record<string, string> = {
  'loyalists': 'Loyalists',
  'mercenaries': 'Mercenaries',
  'hostages': 'Hostages',
  'defectors': 'Defectors'
};

export const QuadrantMovementDiagram: React.FC<QuadrantMovementDiagramProps> = ({
  movementStats
}) => {
  // Filter to only show movements between the 4 main quadrants
  const mainQuadrants: QuadrantType[] = ['loyalists', 'mercenaries', 'hostages', 'defectors'];
  const mainMovements = movementStats.movements.filter(m => 
    mainQuadrants.includes(m.from) && mainQuadrants.includes(m.to)
  );

  if (mainMovements.length === 0) {
    return null;
  }

  // Group movements by source quadrant
  const movementsBySource = useMemo(() => {
    const grouped: Record<string, Array<{ to: QuadrantType; count: number }>> = {};
    mainMovements.forEach(movement => {
      if (!grouped[movement.from]) {
        grouped[movement.from] = [];
      }
      grouped[movement.from].push({ to: movement.to, count: movement.count });
    });
    return grouped;
  }, [mainMovements]);

  // Calculate circle positions within each quadrant (percentage-based)
  const getCirclePositions = (movements: Array<{ to: QuadrantType; count: number }>) => {
    const positions: Array<{ x: number; y: number; to: QuadrantType; count: number }> = [];
    const count = movements.length;
    
    if (count === 1) {
      positions.push({ x: 50, y: 50, to: movements[0].to, count: movements[0].count });
    } else if (count === 2) {
      positions.push({ x: 30, y: 50, to: movements[0].to, count: movements[0].count });
      positions.push({ x: 70, y: 50, to: movements[1].to, count: movements[1].count });
    } else if (count === 3) {
      positions.push({ x: 50, y: 30, to: movements[0].to, count: movements[0].count });
      positions.push({ x: 30, y: 70, to: movements[1].to, count: movements[1].count });
      positions.push({ x: 70, y: 70, to: movements[2].to, count: movements[2].count });
    } else {
      // Four or more: grid formation
      movements.forEach((movement, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        positions.push({ 
          x: 25 + col * 50, 
          y: 25 + row * 50, 
          to: movement.to, 
          count: movement.count 
        });
      });
    }
    
    return positions;
  };

  // Get destination quadrant center position (percentage-based)
  const getDestinationCenter = (quadrant: string): { x: number; y: number } => {
    const positions: Record<string, { x: number; y: number }> = {
      'loyalists': { x: 75, y: 25 },      // Top-right
      'mercenaries': { x: 75, y: 75 },    // Bottom-right
      'hostages': { x: 25, y: 25 },       // Top-left
      'defectors': { x: 25, y: 75 }       // Bottom-left
    };
    return positions[quadrant] || { x: 50, y: 50 };
  };

  // Quadrant colors for circles and arrows
  const QUADRANT_COLORS: Record<string, string> = {
    'loyalists': '#4CAF50',
    'mercenaries': '#F7B731',
    'hostages': '#4682B4',
    'defectors': '#DC2626'
  };

  return (
    <div className="quadrant-movement-diagram">
      <h5 className="movement-diagram-title">Movement Flow Visualization</h5>
      <div className="movement-diagram-container">
        <div className="movement-quadrant-grid">
          {mainQuadrants.map(quadrant => {
            const movements = movementsBySource[quadrant] || [];
            const circlePositions = getCirclePositions(movements);
            
            return (
              <div
                key={quadrant}
                className={`draggable-quadrant ${quadrant}`}
              >
                <div className="quadrant-title">{QUADRANT_NAMES[quadrant]}</div>
                
                {/* SVG overlay for circles and arrows */}
                <svg 
                  className="movement-overlay-svg" 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
                >
                  {/* Draw circles with numbers and arrows */}
                  {circlePositions.map((pos, idx) => {
                    const destCenter = getDestinationCenter(pos.to);
                    const sourceX = pos.x;
                    const sourceY = pos.y;
                    const destX = destCenter.x;
                    const destY = destCenter.y;
                    
                    // Calculate arrow path
                    const dx = destX - sourceX;
                    const dy = destY - sourceY;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const unitX = dx / distance;
                    const unitY = dy / distance;
                    
                    // Start point (edge of circle)
                    const circleRadius = 7;
                    const startX = sourceX + unitX * circleRadius;
                    const startY = sourceY + unitY * circleRadius;
                    
                    // End point (edge of destination quadrant - adjust based on position)
                    let endX, endY;
                    if (pos.to === 'loyalists') {
                      endX = 90;
                      endY = 10;
                    } else if (pos.to === 'mercenaries') {
                      endX = 90;
                      endY = 90;
                    } else if (pos.to === 'hostages') {
                      endX = 10;
                      endY = 10;
                    } else { // defectors
                      endX = 10;
                      endY = 90;
                    }
                    
                    return (
                      <g key={`${quadrant}-${pos.to}-${idx}`}>
                        {/* Arrow line */}
                        <line
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke={QUADRANT_COLORS[pos.to]}
                          strokeWidth={2.5}
                          markerEnd="url(#arrowhead)"
                          opacity={0.8}
                        />
                        {/* Circle with number */}
                        <circle
                          cx={sourceX}
                          cy={sourceY}
                          r={circleRadius}
                          fill={QUADRANT_COLORS[quadrant]}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                        <text
                          x={sourceX}
                          y={sourceY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="6.5"
                          fontWeight="700"
                          fill="#fff"
                        >
                          {pos.count}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* Arrow marker definition */}
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="8"
                      markerHeight="8"
                      refX="7"
                      refY="4"
                      orient="auto"
                    >
                      <polygon
                        points="0 0, 8 4, 0 8"
                        fill="#374151"
                        opacity={0.8}
                      />
                    </marker>
                  </defs>
                </svg>
              </div>
            );
          })}
        </div>
      </div>
      <p className="movement-diagram-note">
        Numbers in circles indicate customer count moving from source to destination quadrant.
      </p>
    </div>
  );
};
