import React, { useState } from 'react';
import { MovementStats, QuadrantMovement } from '../services/historicalAnalysisService';
import { ArrowRight, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import type { QuadrantType } from '../../../../visualization/context/QuadrantAssignmentContext';
import { QuadrantMovementDiagram } from './QuadrantMovementDiagram';
import { DataPoint } from '@/types/base';
import { CustomerTimeline } from '../utils/historicalDataUtils';
import { ProximityPointInfoBox } from '../../DistributionSection/ProximityPointInfoBox';

interface QuadrantMovementFlowProps {
  movementStats: MovementStats;
  timelines: CustomerTimeline[];
  data: DataPoint[];
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
  // Use branded colors with sufficient opacity for visibility (0.3 for better readability)
  const colors: Record<QuadrantType, string> = {
    'apostles': 'rgba(16, 185, 129, 0.3)',   // Emerald with opacity
    'near_apostles': 'rgba(16, 185, 129, 0.3)', // Emerald with opacity
    'loyalists': 'rgba(76, 175, 80, 0.3)',    // Green (branded) with opacity
    'mercenaries': 'rgba(247, 183, 49, 0.3)', // Orange (branded) with opacity
    'hostages': 'rgba(70, 130, 180, 0.3)',    // Blue (branded) with opacity
    'neutral': 'rgba(107, 114, 128, 0.3)',    // Gray with opacity
    'defectors': 'rgba(220, 38, 38, 0.3)',    // Red (branded) with opacity
    'terrorists': 'rgba(239, 68, 68, 0.3)'    // Red with opacity
  };
  return colors[quadrant] || 'rgba(107, 114, 128, 0.3)';
};

export const QuadrantMovementFlow: React.FC<QuadrantMovementFlowProps> = ({
  movementStats,
  timelines,
  data
}) => {
  // Show top 10 movements by count
  const topMovements = movementStats.movements.slice(0, 10);
  const [expandedMovements, setExpandedMovements] = useState<Set<number>>(new Set());
  const [clickedMovement, setClickedMovement] = useState<{
    points: DataPoint[];
    position: { x: number; y: number };
    fromQuadrant: string;
    toQuadrant: string;
  } | null>(null);

  // Helper to get DataPoints for a movement
  const getDataPointsForMovement = (movement: QuadrantMovement): DataPoint[] => {
    const dataPoints: DataPoint[] = [];
    movement.customers.forEach(customer => {
      const timeline = timelines.find(t => t.identifier === customer.identifier);
      if (timeline) {
        const point = timeline.dataPoints.find(p => p.date && p.date.trim() === customer.toDate);
        if (point) {
          dataPoints.push(point);
        }
      }
    });
    return dataPoints;
  };

  const toggleMovement = (index: number) => {
    setExpandedMovements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleMovementClick = (e: React.MouseEvent, movement: QuadrantMovement) => {
    e.stopPropagation();
    const points = getDataPointsForMovement(movement);
    if (points.length > 0) {
      setClickedMovement({
        points,
        position: {
          x: e.clientX,
          y: e.clientY
        },
        fromQuadrant: movement.from,
        toQuadrant: movement.to
      });
    }
  };

  return (
    <div className="quadrant-movement-flow">
      {/* Visual quadrant movement diagram */}
      <QuadrantMovementDiagram 
        movementStats={movementStats}
        timelines={timelines}
        data={data}
      />
      
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
            {topMovements.map((movement, index) => {
              const isExpanded = expandedMovements.has(index);
              const points = isExpanded ? getDataPointsForMovement(movement) : [];
              
              return (
                <div key={index} className="movement-item">
                  <div 
                    className="movement-item-header"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '4px',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => toggleMovement(index)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
                    <div 
                      className="movement-count"
                      onClick={(e) => handleMovementClick(e, movement)}
                      style={{ 
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        color: '#3b82f6'
                      }}
                    >
                      {movement.count} customers
                    </div>
                  </div>
                  {isExpanded && points.length > 0 && (
                    <div className="movement-customers-list" style={{ 
                      padding: '8px 32px',
                      backgroundColor: '#f9fafb',
                      borderTop: '1px solid #e5e7eb'
                    }}>
                      {points.map((point, pointIdx) => (
                        <div 
                          key={pointIdx}
                          style={{
                            padding: '4px 0',
                            fontSize: '13px',
                            color: '#374151'
                          }}
                        >
                          {point.name || point.email || `Customer ${point.id}`} 
                          <span style={{ color: '#6b7280', marginLeft: '8px' }}>
                            (S: {point.satisfaction}, L: {point.loyalty})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Customer list modal */}
          {clickedMovement && (
            <ProximityPointInfoBox
              points={clickedMovement.points}
              position={clickedMovement.position}
              quadrant={clickedMovement.toQuadrant}
              onClose={() => setClickedMovement(null)}
              context="distribution"
              customTitle={`${getQuadrantDisplayName(clickedMovement.fromQuadrant as QuadrantType)} to ${getQuadrantDisplayName(clickedMovement.toQuadrant as QuadrantType)}`}
            />
          )}
        )}
      </div>
    </div>
  );
};
