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

  // Group movements by source quadrant (must be before early return)
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

  if (mainMovements.length === 0) {
    return null;
  }

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
          {/* Render in correct order: Hostages (top-left), Loyalists (top-right), Defectors (bottom-left), Mercenaries (bottom-right) */}
          {['hostages', 'loyalists', 'defectors', 'mercenaries'].map(quadrant => {
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
                  preserveAspectRatio="xMidYMid meet"
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
                    
                    // Circle properties
                    const circleRadius = 8;
                    const borderWidth = 2.5;
                    
                    // Start point (edge of circle)
                    const startX = sourceX + unitX * circleRadius;
                    const startY = sourceY + unitY * circleRadius;
                    
                    // End point (edge of destination quadrant - calculate based on quadrant position)
                    let endX, endY;
                    // Calculate which edge of destination quadrant to hit
                    if (pos.to === 'loyalists') {
                      // Top-right: hit top or right edge depending on angle
                      if (Math.abs(dy) > Math.abs(dx)) {
                        // More vertical, hit top edge
                        endX = destX + (destX - sourceX) / Math.abs(dy) * (destY - 5);
                        endY = 5;
                      } else {
                        // More horizontal, hit right edge
                        endX = 95;
                        endY = destY + (destY - sourceY) / Math.abs(dx) * (destX - 5);
                      }
                    } else if (pos.to === 'mercenaries') {
                      // Bottom-right: hit bottom or right edge
                      if (Math.abs(dy) > Math.abs(dx)) {
                        endX = destX + (destX - sourceX) / Math.abs(dy) * (95 - destY);
                        endY = 95;
                      } else {
                        endX = 95;
                        endY = destY + (destY - sourceY) / Math.abs(dx) * (destX - 5);
                      }
                    } else if (pos.to === 'hostages') {
                      // Top-left: hit top or left edge
                      if (Math.abs(dy) > Math.abs(dx)) {
                        endX = destX - (destX - sourceX) / Math.abs(dy) * (destY - 5);
                        endY = 5;
                      } else {
                        endX = 5;
                        endY = destY - (destY - sourceY) / Math.abs(dx) * (95 - destX);
                      }
                    } else { // defectors
                      // Bottom-left: hit bottom or left edge
                      if (Math.abs(dy) > Math.abs(dx)) {
                        endX = destX - (destX - sourceX) / Math.abs(dy) * (95 - destY);
                        endY = 95;
                      } else {
                        endX = 5;
                        endY = destY - (destY - sourceY) / Math.abs(dx) * (95 - destX);
                      }
                    }
                    
                    // Create unique marker ID for each destination color to avoid conflicts
                    const markerId = `arrowhead-${pos.to}`;
                    
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
                          markerEnd={`url(#${markerId})`}
                          opacity={0.75}
                        />
                        {/* Circle with number - white fill, border in destination color, number in source color */}
                        <circle
                          cx={sourceX}
                          cy={sourceY}
                          r={circleRadius}
                          fill="#fff"
                          stroke={QUADRANT_COLORS[pos.to]}
                          strokeWidth={borderWidth}
                        />
                        <text
                          x={sourceX}
                          y={sourceY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="7"
                          fontWeight="700"
                          fill={QUADRANT_COLORS[quadrant]}
                        >
                          {pos.count}
                        </text>
                      </g>
                    );
                  })}
                  
                  {/* Arrow marker definitions - clean simple two-line V-shape tip */}
                  <defs>
                    {Object.entries(QUADRANT_COLORS).map(([quad, color]) => (
                      <marker
                        key={`arrowhead-${quad}`}
                        id={`arrowhead-${quad}`}
                        markerWidth="8"
                        markerHeight="8"
                        refX="7"
                        refY="4"
                        orient="auto"
                        markerUnits="userSpaceOnUse"
                      >
                        {/* Simple two-line arrow tip */}
                        <line
                          x1="0"
                          y1="0"
                          x2="8"
                          y2="4"
                          stroke={color}
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <line
                          x1="0"
                          y1="8"
                          x2="8"
                          y2="4"
                          stroke={color}
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </marker>
                    ))}
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
