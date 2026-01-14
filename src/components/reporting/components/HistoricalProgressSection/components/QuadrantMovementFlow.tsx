import React, { useState } from 'react';
import { MovementStats, QuadrantMovement } from '../services/historicalAnalysisService';
import { ArrowRight, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import type { QuadrantType } from '../../../../visualization/context/QuadrantAssignmentContext';
import { QuadrantMovementDiagram } from './QuadrantMovementDiagram';
import { DataPoint } from '@/types/base';
import { CustomerTimeline } from '../utils/historicalDataUtils';

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

  // Helper to get all customer data with their full timeline for a movement
  const getCustomerDataForMovement = (movement: QuadrantMovement): Array<{
    customer: DataPoint;
    timeline: CustomerTimeline;
    allDates: string[];
    firstDate: string;
    lastDate: string;
    middleDates: string[];
    originPoint: DataPoint | null;
    destinyPoint: DataPoint | null;
  }> => {
    const customerData: Array<{
      customer: DataPoint;
      timeline: CustomerTimeline;
      allDates: string[];
      firstDate: string;
      lastDate: string;
      middleDates: string[];
      originPoint: DataPoint | null;
      destinyPoint: DataPoint | null;
    }> = [];
    
    movement.customers.forEach(customer => {
      // Normalize identifier for matching
      const normalizedCustomerId = customer.identifier.toLowerCase().trim();
      const timeline = timelines.find(t => {
        const normalizedTimelineId = t.identifier.toLowerCase().trim();
        return normalizedTimelineId === normalizedCustomerId && t.identifierType === customer.identifierType;
      });
      
      if (timeline && timeline.dataPoints.length > 0) {
        // Get all dates for this customer, sorted
        const datesWithPoints = timeline.dataPoints
          .filter(p => p.date)
          .map(p => ({ date: p.date!.trim(), point: p }))
          .sort((a, b) => a.date.localeCompare(b.date));
        
        if (datesWithPoints.length > 0) {
          const allDates = datesWithPoints.map(d => d.date);
          const firstDate = allDates[0];
          const lastDate = allDates[allDates.length - 1];
          const middleDates = allDates.length > 2 ? allDates.slice(1, -1) : [];
          
          // Find origin and destiny points
          const normalizedFromDate = customer.fromDate.trim();
          const normalizedToDate = customer.toDate.trim();
          const originPoint = datesWithPoints.find(d => d.date === normalizedFromDate)?.point || null;
          const destinyPoint = datesWithPoints.find(d => d.date === normalizedToDate)?.point || null;
          
          // Use the destiny point as the main customer data point
          const mainPoint = destinyPoint || datesWithPoints[datesWithPoints.length - 1].point;
          
          customerData.push({
            customer: mainPoint,
            timeline,
            allDates,
            firstDate,
            lastDate,
            middleDates,
            originPoint,
            destinyPoint
          });
        }
      }
    });
    
    return customerData;
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
            <div className="movement-stat-label">Positive Transitions</div>
            <div className="movement-stat-description" style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
              Individual customer moves
            </div>
          </div>
        </div>
        <div className="movement-stat-card negative">
          <TrendingDown size={20} />
          <div>
            <div className="movement-stat-value">{movementStats.negativeMovements}</div>
            <div className="movement-stat-label">Negative Transitions</div>
            <div className="movement-stat-description" style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
              Individual customer moves
            </div>
          </div>
        </div>
        <div className="movement-stat-card neutral">
          <Minus size={20} />
          <div>
            <div className="movement-stat-value">{movementStats.neutralMovements}</div>
            <div className="movement-stat-label">No Change</div>
            <div className="movement-stat-description" style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
              Same quadrant
            </div>
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
              const customerData = isExpanded ? getCustomerDataForMovement(movement) : [];
              
              return (
                <div key={index} className="movement-item" style={{ marginBottom: '16px' }}>
                  <div 
                    className="movement-item-header"
                    style={{ 
                      cursor: 'pointer',
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
                    <div className="movement-count">
                      {movement.count} customers
                    </div>
                  </div>
                  {isExpanded && customerData.length > 0 && (
                    <div className="movement-customers-table" style={{ 
                      padding: '16px',
                      backgroundColor: '#f9fafb',
                      borderTop: '1px solid #e5e7eb',
                      marginTop: '8px',
                      overflowX: 'auto'
                    }}>
                      <table style={{ 
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '13px'
                      }}>
                        <thead>
                          <tr style={{ 
                            backgroundColor: '#f3f4f6',
                            borderBottom: '2px solid #e5e7eb'
                          }}>
                            <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>Customer</th>
                            <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>Position</th>
                            <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>Date (Origin)</th>
                            <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>Date (Destiny)</th>
                            {customerData.some(c => c.middleDates.length > 0) && (
                              <th style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>Middle Dates</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {customerData.map((item, idx) => {
                            const customerName = item.customer.name || item.customer.email || `Customer ${item.customer.id}`;
                            return (
                              <tr 
                                key={idx}
                                style={{ 
                                  borderBottom: '1px solid #e5e7eb',
                                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                                }}
                              >
                                <td style={{ padding: '8px' }}>{customerName}</td>
                                <td style={{ padding: '8px' }}>
                                  {item.customer.satisfaction},{item.customer.loyalty}
                                </td>
                                <td style={{ padding: '8px' }}>
                                  {item.originPoint?.date || item.firstDate}
                                </td>
                                <td style={{ padding: '8px' }}>
                                  {item.destinyPoint?.date || item.lastDate}
                                </td>
                                {customerData.some(c => c.middleDates.length > 0) && (
                                  <td style={{ padding: '8px', color: '#6b7280' }}>
                                    {item.middleDates.length > 0 ? item.middleDates.join(', ') : '-'}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
