import React from 'react';
import { MovementStats } from '../services/historicalAnalysisService';
import type { QuadrantType } from '../../../../visualization/context/QuadrantAssignmentContext';
import { ArrowRight } from 'lucide-react';

interface QuadrantMovementDiagramProps {
  movementStats: MovementStats;
}

// Branded quadrant colors
const QUADRANT_COLORS: Record<QuadrantType, string> = {
  'loyalists': '#4CAF50',      // Green
  'mercenaries': '#F7B731',    // Orange
  'hostages': '#4682B4',       // Blue
  'defectors': '#DC2626',      // Red
  'apostles': '#10B981',       // Emerald
  'terrorists': '#EF4444',     // Red
  'near_apostles': '#10B981',  // Emerald
  'neutral': '#6b7280'         // Gray
};

// Quadrant positions in a 2x2 grid
const QUADRANT_POSITIONS: Record<string, { x: number; y: number }> = {
  'loyalists': { x: 1, y: 1 },      // Top-right
  'mercenaries': { x: 1, y: 0 },    // Bottom-right
  'hostages': { x: 0, y: 1 },       // Top-left
  'defectors': { x: 0, y: 0 },      // Bottom-left
  'apostles': { x: 1, y: 1 },       // Same as loyalists (top-right)
  'terrorists': { x: 0, y: 0 },     // Same as defectors (bottom-left)
  'near_apostles': { x: 1, y: 1 },  // Same as loyalists
  'neutral': { x: 0.5, y: 0.5 }     // Center
};

const getQuadrantPosition = (quadrant: QuadrantType): { x: number; y: number } => {
  return QUADRANT_POSITIONS[quadrant] || { x: 0.5, y: 0.5 };
};

export const QuadrantMovementDiagram: React.FC<QuadrantMovementDiagramProps> = ({
  movementStats
}) => {
  // Filter to only show movements between the 4 main quadrants for clarity
  const mainQuadrants: QuadrantType[] = ['loyalists', 'mercenaries', 'hostages', 'defectors'];
  const mainMovements = movementStats.movements.filter(m => 
    mainQuadrants.includes(m.from) && mainQuadrants.includes(m.to)
  );

  if (mainMovements.length === 0) {
    return null; // Don't show diagram if no main quadrant movements
  }

  // Calculate positions for SVG
  const diagramSize = 300;
  const quadrantSize = 100;
  const centerX = diagramSize / 2;
  const centerY = diagramSize / 2;

  const getQuadrantCenter = (quadrant: QuadrantType): { x: number; y: number } => {
    const pos = getQuadrantPosition(quadrant);
    return {
      x: centerX + (pos.x - 0.5) * (diagramSize - quadrantSize),
      y: centerY - (pos.y - 0.5) * (diagramSize - quadrantSize) // Invert Y for SVG
    };
  };

  return (
    <div className="quadrant-movement-diagram">
      <h5 className="movement-diagram-title">Movement Flow Visualization</h5>
      <div className="movement-diagram-container">
        <svg width={diagramSize} height={diagramSize} viewBox={`0 0 ${diagramSize} ${diagramSize}`}>
          {/* Draw quadrants as background */}
          {mainQuadrants.map(quadrant => {
            const center = getQuadrantCenter(quadrant);
            return (
              <g key={quadrant}>
                <rect
                  x={center.x - quadrantSize / 2}
                  y={center.y - quadrantSize / 2}
                  width={quadrantSize}
                  height={quadrantSize}
                  fill={QUADRANT_COLORS[quadrant]}
                  fillOpacity={0.2}
                  stroke={QUADRANT_COLORS[quadrant]}
                  strokeWidth={2}
                  rx={4}
                />
                <text
                  x={center.x}
                  y={center.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill={QUADRANT_COLORS[quadrant]}
                >
                  {quadrant.charAt(0).toUpperCase() + quadrant.slice(1)}
                </text>
              </g>
            );
          })}

          {/* Draw movement arrows */}
          {mainMovements.slice(0, 12).map((movement, index) => {
            const fromCenter = getQuadrantCenter(movement.from);
            const toCenter = getQuadrantCenter(movement.to);
            
            // Skip if same quadrant
            if (fromCenter.x === toCenter.x && fromCenter.y === toCenter.y) {
              return null;
            }

            // Calculate arrow path
            const dx = toCenter.x - fromCenter.x;
            const dy = toCenter.y - fromCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const unitX = dx / distance;
            const unitY = dy / distance;
            
            // Start point (edge of source quadrant)
            const startX = fromCenter.x + unitX * (quadrantSize / 2 - 10);
            const startY = fromCenter.y + unitY * (quadrantSize / 2 - 10);
            
            // End point (edge of target quadrant)
            const endX = toCenter.x - unitX * (quadrantSize / 2 - 10);
            const endY = toCenter.y - unitY * (quadrantSize / 2 - 10);

            // Arrow head
            const arrowSize = 8;
            const angle = Math.atan2(dy, dx);

            return (
              <g key={`${movement.from}-${movement.to}-${index}`}>
                {/* Arrow line */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={QUADRANT_COLORS[movement.to]}
                  strokeWidth={Math.min(2 + movement.count * 0.3, 6)}
                  markerEnd="url(#arrowhead)"
                  opacity={0.7}
                />
                {/* Count label at midpoint */}
                <text
                  x={(startX + endX) / 2}
                  y={(startY + endY) / 2 - 5}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fill={QUADRANT_COLORS[movement.to]}
                  style={{ pointerEvents: 'none' }}
                >
                  {movement.count}
                </text>
              </g>
            );
          })}

          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill="#374151"
                opacity={0.7}
              />
            </marker>
          </defs>
        </svg>
      </div>
      <p className="movement-diagram-note" style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', textAlign: 'center' }}>
        Numbers indicate customer count. Arrow thickness represents movement volume.
      </p>
    </div>
  );
};
