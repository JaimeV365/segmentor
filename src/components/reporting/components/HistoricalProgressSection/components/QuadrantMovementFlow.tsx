import React from 'react';
import { MovementStats, QuadrantMovement } from '../services/historicalAnalysisService';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { QuadrantType } from '../../../../visualization/context/QuadrantAssignmentContext';
import { QuadrantMovementDiagram } from './QuadrantMovementDiagram';

interface QuadrantMovementFlowProps {
  movementStats: MovementStats;
}

const getQuadrantDisplayName = (quadrant: QuadrantType): string => {
  const names: Record<QuadrantType, string> = {
    'apostles': 'Apostles',
    'near_apostles': 'Near Apostles',
    'loyalists': 'Loyalists',
    'mercenaries': 'Mercenaries',
    'hostages': 'Hostages',
    'neutral': 'Neutral',
    'defectors': 'Defectors',
    'terrorists': 'Terrorists'
  };
  return names[quadrant] || quadrant;
};

const getQuadrantColor = (quadrant: QuadrantType): string => {
  // Use exact branded colors from the system
  const colors: Record<QuadrantType, string> = {
    'apostles': '#10B981',        // Emerald
    'near_apostles': '#10B981',   // Emerald (same as apostles)
    'loyalists': '#4CAF50',       // Green (branded)
    'mercenaries': '#F7B731',     // Orange (branded)
    'hostages': '#4682B4',        // Blue (branded)
    'neutral': '#6b7280',         // Gray
    'defectors': '#DC2626',        // Red (branded)
    'terrorists': '#EF4444'        // Red
  };
  return colors[quadrant] || '#6b7280';
};

export const QuadrantMovementFlow: React.FC<QuadrantMovementFlowProps> = ({
  movementStats
}) => {
  // Show top 10 movements by count
  const topMovements = movementStats.movements.slice(0, 10);

  return (
    <div className="quadrant-movement-flow">
      {/* Visual quadrant movement diagram */}
      <QuadrantMovementDiagram movementStats={movementStats} />
      
      <div className="movement-stats-summary">
        <div className="movement-stat-card positive">
          <TrendingUp size={20} />
          <div>
            <div className="movement-stat-value">{movementStats.positiveMovements}</div>
            <div className="movement-stat-label">Positive Movements</div>
          </div>
        </div>
        <div className="movement-stat-card negative">
          <TrendingDown size={20} />
          <div>
            <div className="movement-stat-value">{movementStats.negativeMovements}</div>
            <div className="movement-stat-label">Negative Movements</div>
          </div>
        </div>
        <div className="movement-stat-card neutral">
          <Minus size={20} />
          <div>
            <div className="movement-stat-value">{movementStats.neutralMovements}</div>
            <div className="movement-stat-label">No Change</div>
          </div>
        </div>
      </div>

      <div className="movement-flow-list">
        <h4 className="movement-flow-title">Top Movements</h4>
        {topMovements.length === 0 ? (
          <p className="no-movements">No movements detected</p>
        ) : (
          <div className="movement-items">
            {topMovements.map((movement, index) => (
              <div key={index} className="movement-item">
                <div 
                  className="movement-quadrant from-quadrant"
                  style={{ backgroundColor: getQuadrantColor(movement.from) }}
                >
                  {getQuadrantDisplayName(movement.from)}
                </div>
                <ArrowRight size={16} className="movement-arrow" />
                <div 
                  className="movement-quadrant to-quadrant"
                  style={{ backgroundColor: getQuadrantColor(movement.to) }}
                >
                  {getQuadrantDisplayName(movement.to)}
                </div>
                <div className="movement-count">{movement.count} customers</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
