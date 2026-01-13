import React from 'react';
import { MovementStats, QuadrantMovement } from '../services/historicalAnalysisService';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { QuadrantType } from '../../../../visualization/context/QuadrantAssignmentContext';

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
  const colors: Record<QuadrantType, string> = {
    'apostles': '#10b981',
    'near_apostles': '#34d399',
    'loyalists': '#3a863e',
    'mercenaries': '#f59e0b',
    'hostages': '#8b5cf6',
    'neutral': '#6b7280',
    'defectors': '#ef4444',
    'terrorists': '#dc2626'
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
