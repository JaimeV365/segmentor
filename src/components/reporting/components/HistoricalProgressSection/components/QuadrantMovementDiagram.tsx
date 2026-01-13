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

  // Positioning matrix for circles based on source and destination
  // Format: { source: { destination: { x, y } } }
  const CIRCLE_POSITION_MATRIX: Record<string, Record<string, { x: number; y: number }>> = {
    'hostages': {
      'loyalists': { x: 80, y: 20 },   // Top-right of hostages (toward loyalists)
      'mercenaries': { x: 80, y: 80 }, // Bottom-right of hostages (toward mercenaries)
      'defectors': { x: 20, y: 80 }    // Bottom-left of hostages (toward defectors)
    },
    'loyalists': {
      'hostages': { x: 20, y: 20 },    // Top-left of loyalists (toward hostages)
      'mercenaries': { x: 80, y: 80 }, // Bottom-right of loyalists (toward mercenaries)
      'defectors': { x: 20, y: 80 }     // Bottom-left of loyalists (toward defectors)
    },
    'defectors': {
      'hostages': { x: 50, y: 20 },    // Top-center of defectors (toward hostages)
      'loyalists': { x: 80, y: 20 },   // Top-right of defectors (toward loyalists)
      'mercenaries': { x: 80, y: 50 }  // Right-center of defectors (toward mercenaries)
    },
    'mercenaries': {
      'hostages': { x: 20, y: 20 },    // Top-left of mercenaries (toward hostages)
      'loyalists': { x: 80, y: 20 },   // Top-right of mercenaries (toward loyalists)
      'defectors': { x: 20, y: 50 }    // Left-center of mercenaries (toward defectors)
    }
  };

  const getCirclePositionForDestination = (sourceQuadrant: string, destinationQuadrant: string): { x: number; y: number } => {
    return CIRCLE_POSITION_MATRIX[sourceQuadrant]?.[destinationQuadrant] || { x: 50, y: 50 };
  };

  // Calculate circle positions within each quadrant (percentage-based)
  const getCirclePositions = (movements: Array<{ to: QuadrantType; count: number }>, sourceQuadrant: string) => {
    const positions: Array<{ x: number; y: number; to: QuadrantType; count: number }> = [];
    
    // If multiple movements to same destination, offset them slightly
    const destinationGroups: Record<string, Array<{ to: QuadrantType; count: number }>> = {};
    movements.forEach(movement => {
      if (!destinationGroups[movement.to]) {
        destinationGroups[movement.to] = [];
      }
      destinationGroups[movement.to].push(movement);
    });

    Object.entries(destinationGroups).forEach(([dest, destMovements]) => {
      if (destMovements.length === 1) {
        const pos = getCirclePositionForDestination(sourceQuadrant, dest);
        positions.push({ ...pos, to: dest as QuadrantType, count: destMovements[0].count });
      } else {
        // Multiple movements to same destination - offset them slightly
        const basePos = getCirclePositionForDestination(sourceQuadrant, dest);
        destMovements.forEach((movement, idx) => {
          const offset = (idx - (destMovements.length - 1) / 2) * 8; // 8% offset per circle
          positions.push({ 
            x: basePos.x + (basePos.x > 50 ? -Math.abs(offset) : Math.abs(offset)), 
            y: basePos.y + (basePos.y > 50 ? -Math.abs(offset) : Math.abs(offset)),
            to: dest as QuadrantType, 
            count: movement.count 
          });
        });
      }
    });
    
    return positions;
  };

  // Calculate arrow end point - simple straight lines ending well into destination quadrant
  // Arrows extend across boundaries and into the destination quadrant (15-20% from opposite edge)
  const getArrowEndPoint = (sourceX: number, sourceY: number, sourceQuadrant: string, destinationQuadrant: string): { x: number; y: number } => {
    // Simple rules: draw straight lines (vertical, horizontal, or diagonal) well into destination
    // Boundary is at 50%, so we extend to 15-20% from opposite edge to clearly cross boundaries
    
    // Defectors (bottom-left) to Hostages (top-left): vertical up, end well into hostages quadrant
    if (sourceQuadrant === 'defectors' && destinationQuadrant === 'hostages') {
      return { x: sourceX, y: 20 }; // Straight up, well into top quadrant (20% from top)
    }
    
    // Hostages (top-left) to Defectors (bottom-left): vertical down, end well into defectors quadrant
    if (sourceQuadrant === 'hostages' && destinationQuadrant === 'defectors') {
      return { x: sourceX, y: 80 }; // Straight down, well into bottom quadrant (20% from bottom)
    }
    
    // Defectors (bottom-left) to Loyalists (top-right): diagonal up-right, end well into loyalists quadrant
    if (sourceQuadrant === 'defectors' && destinationQuadrant === 'loyalists') {
      return { x: 20, y: 20 }; // End well into top-right quadrant (20% from top and right edges)
    }
    
    // Defectors (bottom-left) to Mercenaries (bottom-right): horizontal right, end well into mercenaries quadrant
    if (sourceQuadrant === 'defectors' && destinationQuadrant === 'mercenaries') {
      return { x: 80, y: sourceY }; // Straight right, well into right quadrant (20% from right)
    }
    
    // Hostages (top-left) to Loyalists (top-right): horizontal right, end well into loyalists quadrant
    if (sourceQuadrant === 'hostages' && destinationQuadrant === 'loyalists') {
      return { x: 80, y: sourceY }; // Straight right, well into right quadrant (20% from right)
    }
    
    // Hostages (top-left) to Mercenaries (bottom-right): diagonal down-right, end well into mercenaries quadrant
    if (sourceQuadrant === 'hostages' && destinationQuadrant === 'mercenaries') {
      return { x: 20, y: 80 }; // End well into bottom-right quadrant (20% from bottom and right edges)
    }
    
    // Loyalists (top-right) to Hostages (top-left): horizontal left, end well into hostages quadrant
    if (sourceQuadrant === 'loyalists' && destinationQuadrant === 'hostages') {
      return { x: 20, y: sourceY }; // Straight left, well into left quadrant (20% from left)
    }
    
    // Loyalists (top-right) to Defectors (bottom-left): diagonal down-left, end well into defectors quadrant
    if (sourceQuadrant === 'loyalists' && destinationQuadrant === 'defectors') {
      return { x: 80, y: 80 }; // End well into bottom-left quadrant (20% from bottom and left edges)
    }
    
    // Loyalists (top-right) to Mercenaries (bottom-right): vertical down, end well into mercenaries quadrant
    if (sourceQuadrant === 'loyalists' && destinationQuadrant === 'mercenaries') {
      return { x: sourceX, y: 80 }; // Straight down, well into bottom quadrant (20% from bottom)
    }
    
    // Mercenaries (bottom-right) to Hostages (top-left): diagonal up-left, end well into hostages quadrant
    if (sourceQuadrant === 'mercenaries' && destinationQuadrant === 'hostages') {
      return { x: 80, y: 20 }; // End well into top-left quadrant (20% from top and left edges)
    }
    
    // Mercenaries (bottom-right) to Loyalists (top-right): vertical up, end well into loyalists quadrant
    if (sourceQuadrant === 'mercenaries' && destinationQuadrant === 'loyalists') {
      return { x: sourceX, y: 20 }; // Straight up, well into top quadrant (20% from top)
    }
    
    // Mercenaries (bottom-right) to Defectors (bottom-left): horizontal left, end well into defectors quadrant
    if (sourceQuadrant === 'mercenaries' && destinationQuadrant === 'defectors') {
      return { x: 20, y: sourceY }; // Straight left, well into left quadrant (20% from left)
    }
    
    // Default fallback
    return { x: 50, y: 50 };
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
            const circlePositions = getCirclePositions(movements, quadrant);
            
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
                    const sourceX = pos.x;
                    const sourceY = pos.y;
                    const arrowEnd = getArrowEndPoint(sourceX, sourceY, quadrant, pos.to);
                    const endX = arrowEnd.x;
                    const endY = arrowEnd.y;
                    
                    // Circle properties
                    const circleRadius = 8;
                    const borderWidth = 2.5;
                    
                    // Start point (center of circle - arrow originates from center)
                    const startX = sourceX;
                    const startY = sourceY;
                    
                    // Create unique marker ID for each destination color to avoid conflicts
                    const markerId = `arrowhead-${pos.to}`;
                    
                    return (
                      <g key={`${quadrant}-${pos.to}-${idx}`}>
                        {/* Arrow line - drawn first so circle appears on top */}
                        <line
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke={QUADRANT_COLORS[pos.to]}
                          strokeWidth={2.5}
                          markerEnd={`url(#${markerId})`}
                          opacity={0.8}
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
