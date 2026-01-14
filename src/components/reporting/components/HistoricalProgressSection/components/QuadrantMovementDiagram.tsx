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
    
    // Defectors (bottom-left) to Hostages (top-left): vertical up, end longer into quadrant
    // Hostages local: y=0 is top, y=100 is bottom (boundary). End 12% into quadrant = 88%
    if (sourceQuadrant === 'defectors' && destinationQuadrant === 'hostages') {
      return { x: sourceX, y: 88 }; // 12% into hostages quadrant
    }
    
    // Hostages (top-left) to Defectors (bottom-left): vertical down, end longer into quadrant
    // Defectors local: y=0 is top (boundary), y=100 is bottom. End 12% into quadrant = 12%
    if (sourceQuadrant === 'hostages' && destinationQuadrant === 'defectors') {
      return { x: sourceX, y: 12 }; // 12% into defectors quadrant
    }
    
    // Defectors (bottom-left) to Loyalists (top-right): diagonal up-right, end longer into quadrant
    // Loyalists local: x=0 is left (boundary), y=0 is top, y=100 is bottom (boundary). End 12% into quadrant
    if (sourceQuadrant === 'defectors' && destinationQuadrant === 'loyalists') {
      return { x: 12, y: 88 }; // 12% into loyalists quadrant
    }
    
    // Defectors (bottom-left) to Mercenaries (bottom-right): horizontal right, end longer into quadrant
    // Mercenaries local: x=0 is left (boundary), y=0 is top (boundary), y=100 is bottom. End 12% into quadrant
    if (sourceQuadrant === 'defectors' && destinationQuadrant === 'mercenaries') {
      return { x: 12, y: sourceY }; // 12% into mercenaries quadrant
    }
    
    // Hostages (top-left) to Loyalists (top-right): horizontal right, end longer into quadrant
    // Loyalists local: x=0 is left (boundary), x=100 is right. End 12% into quadrant
    if (sourceQuadrant === 'hostages' && destinationQuadrant === 'loyalists') {
      return { x: 12, y: sourceY }; // 12% into loyalists quadrant
    }
    
    // Hostages (top-left) to Mercenaries (bottom-right): diagonal down-right, end longer into quadrant
    // Mercenaries local: x=0 is left (boundary), y=0 is top (boundary). End 12% into quadrant
    if (sourceQuadrant === 'hostages' && destinationQuadrant === 'mercenaries') {
      return { x: 12, y: 12 }; // 12% into mercenaries quadrant
    }
    
    // Loyalists (top-right) to Hostages (top-left): horizontal left, end longer into quadrant
    // Hostages local: x=100 is right (boundary), x=0 is left. End 12% into quadrant = 88%
    if (sourceQuadrant === 'loyalists' && destinationQuadrant === 'hostages') {
      return { x: 88, y: sourceY }; // 12% into hostages quadrant
    }
    
    // Loyalists (top-right) to Defectors (bottom-left): diagonal down-left, end longer into quadrant
    // Defectors local: x=100 is right (boundary), y=0 is top (boundary). End 12% into quadrant
    if (sourceQuadrant === 'loyalists' && destinationQuadrant === 'defectors') {
      return { x: 88, y: 12 }; // 12% into defectors quadrant
    }
    
    // Loyalists (top-right) to Mercenaries (bottom-right): vertical down, end longer into quadrant
    // Mercenaries local: y=0 is top (boundary), y=100 is bottom. End 12% into quadrant = 12%
    if (sourceQuadrant === 'loyalists' && destinationQuadrant === 'mercenaries') {
      return { x: sourceX, y: 12 }; // 12% into mercenaries quadrant
    }
    
    // Mercenaries (bottom-right) to Hostages (top-left): diagonal up-left, end longer into quadrant
    // Hostages local: x=100 is right (boundary), y=100 is bottom (boundary). End 12% into quadrant
    if (sourceQuadrant === 'mercenaries' && destinationQuadrant === 'hostages') {
      return { x: 88, y: 88 }; // 12% into hostages quadrant
    }
    
    // Mercenaries (bottom-right) to Loyalists (top-right): vertical up, end longer into quadrant
    // Loyalists local: y=100 is bottom (boundary), y=0 is top. End 12% into quadrant = 88%
    if (sourceQuadrant === 'mercenaries' && destinationQuadrant === 'loyalists') {
      return { x: sourceX, y: 88 }; // 12% into loyalists quadrant
    }
    
    // Mercenaries (bottom-right) to Defectors (bottom-left): horizontal left, end longer into quadrant
    // Defectors local: x=100 is right (boundary), x=0 is left. End 12% into quadrant = 88%
    if (sourceQuadrant === 'mercenaries' && destinationQuadrant === 'defectors') {
      return { x: 88, y: sourceY }; // 12% into defectors quadrant
    }
    
    // Default fallback
    return { x: 50, y: 50 };
  };

  // Convert quadrant-relative positions to absolute grid positions
  // Grid layout: Hostages (0,0), Loyalists (1,0), Defectors (0,1), Mercenaries (1,1)
  const getAbsolutePosition = (quadrant: string, relativeX: number, relativeY: number): { x: number; y: number } => {
    // Each quadrant is 50x50 in the 100x100 grid coordinate system
    // Gap between quadrants is ~1.5% (0.75rem gap / ~500px = ~1.5%)
    const quadrantPositions: Record<string, { baseX: number; baseY: number }> = {
      'hostages': { baseX: 0, baseY: 0 },      // Top-left
      'loyalists': { baseX: 50, baseY: 0 },    // Top-right
      'defectors': { baseX: 0, baseY: 50 },    // Bottom-left
      'mercenaries': { baseX: 50, baseY: 50 }  // Bottom-right
    };
    
    const base = quadrantPositions[quadrant] || { baseX: 0, baseY: 0 };
    // Convert relative position (0-100 within quadrant) to absolute (0-100 in grid)
    // Account for gap: each quadrant is ~49% of the grid (with ~1% gap)
    return {
      x: base.baseX + (relativeX / 100) * 49,
      y: base.baseY + (relativeY / 100) * 49
    };
  };

  // Collect all circles and arrows for the single overlay (must be before early return)
  const allArrowsAndCircles = useMemo(() => {
    const items: Array<{
      quadrant: string;
      sourceX: number;
      sourceY: number;
      destQuadrant: string;
      count: number;
      absoluteStart: { x: number; y: number };
      absoluteEnd: { x: number; y: number };
    }> = [];

    ['hostages', 'loyalists', 'defectors', 'mercenaries'].forEach(quadrant => {
      const movements = movementsBySource[quadrant] || [];
      const circlePositions = getCirclePositions(movements, quadrant);
      
      circlePositions.forEach((pos) => {
        const relativeX = pos.x;
        const relativeY = pos.y;
        const arrowEnd = getArrowEndPoint(relativeX, relativeY, quadrant, pos.to);
        
        // Convert to absolute positions
        const absoluteStart = getAbsolutePosition(quadrant, relativeX, relativeY);
        const absoluteEnd = getAbsolutePosition(pos.to, arrowEnd.x, arrowEnd.y);
        
        items.push({
          quadrant,
          sourceX: relativeX,
          sourceY: relativeY,
          destQuadrant: pos.to,
          count: pos.count,
          absoluteStart,
          absoluteEnd
        });
      });
    });
    
    return items;
  }, [movementsBySource]);

  if (mainMovements.length === 0) {
    return null;
  }

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
          {/* Render quadrants without individual SVGs */}
          {['hostages', 'loyalists', 'defectors', 'mercenaries'].map(quadrant => (
            <div
              key={quadrant}
              className={`draggable-quadrant ${quadrant}`}
            >
              <div className="quadrant-title">{QUADRANT_NAMES[quadrant]}</div>
            </div>
          ))}
          
          {/* Single SVG overlay covering entire grid for arrows and circles */}
          <svg 
            className="movement-overlay-svg" 
            viewBox="0 0 100 100" 
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Arrow marker definitions - clean simple two-line V-shape tip */}
            <defs>
              {Object.entries(QUADRANT_COLORS).map(([quad, color]) => (
                <marker
                  key={`arrowhead-${quad}`}
                  id={`arrowhead-${quad}`}
                  markerWidth="6"
                  markerHeight="6"
                  refX="6"
                  refY="3"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                  overflow="visible"
                  viewBox="0 0 6 6"
                >
                  {/* Simple two-line arrow tip */}
                  <line
                    x1="0"
                    y1="0"
                    x2="6"
                    y2="3"
                    stroke={color}
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                  <line
                    x1="0"
                    y1="6"
                    x2="6"
                    y2="3"
                    stroke={color}
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                </marker>
              ))}
            </defs>
            
            {/* Draw all arrows and circles */}
            {allArrowsAndCircles.map((item, idx) => {
              const circleRadius = 4;
              const borderWidth = 1;
              const markerId = `arrowhead-${item.destQuadrant}`;
              
              return (
                <g key={`${item.quadrant}-${item.destQuadrant}-${idx}`}>
                  {/* Arrow line - drawn first so circle appears on top */}
                  <line
                    x1={item.absoluteStart.x}
                    y1={item.absoluteStart.y}
                    x2={item.absoluteEnd.x}
                    y2={item.absoluteEnd.y}
                    stroke={QUADRANT_COLORS[item.destQuadrant]}
                    strokeWidth={1}
                    markerEnd={`url(#${markerId})`}
                    opacity={0.8}
                  />
                  {/* Circle with number - white fill, border in destination color, number in source color */}
                  <circle
                    cx={item.absoluteStart.x}
                    cy={item.absoluteStart.y}
                    r={circleRadius}
                    fill="#fff"
                    stroke={QUADRANT_COLORS[item.destQuadrant]}
                    strokeWidth={borderWidth}
                  />
                  <text
                    x={item.absoluteStart.x}
                    y={item.absoluteStart.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="3"
                    fontWeight="700"
                    fontFamily="'Montserrat', sans-serif"
                    fill={QUADRANT_COLORS[item.quadrant]}
                    dy="0.1"
                  >
                    {item.count}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      <p className="movement-diagram-note">
        Numbers in circles indicate customer count moving from source to destination quadrant.
      </p>
    </div>
  );
};
