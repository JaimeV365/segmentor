// src/components/visualization/components/DataPoints/DataPointInfoBox.tsx
import React, { useEffect, useRef } from 'react';
import { DataPoint } from '@/types/base';
import { useQuadrantAssignment } from '../../context/QuadrantAssignmentContext';
import { useAxisLabels } from '../../context/AxisLabelsContext';
import { useNotification } from '../../../data-entry/NotificationSystem';

import './DataPointInfoBox.css';

export interface QuadrantOption {
  group: string;
  color: string;
}

export const InfoBox: React.FC<{
  point: DataPoint;
  normalized: { x: number; y: number };
  quadrantInfo: QuadrantOption;
  count: number;
  samePoints: DataPoint[];
  availableOptions?: QuadrantOption[];
  onGroupChange?: (group: QuadrantOption) => void;
  onClose?: () => void;
}> = ({ point, normalized, quadrantInfo, count, samePoints, availableOptions, onGroupChange, onClose }) => {
  const boxRef = useRef<HTMLDivElement>(null);

  const { getDisplayNameForQuadrant, getQuadrantForPoint } = useQuadrantAssignment();
  const { labels } = useAxisLabels();
  const notification = useNotification();
  
  // Add effect to check and adjust position
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    
    // Get box dimensions
    const boxRect = box.getBoundingClientRect();
    
    // Get parent/chart dimensions (assuming the chart is a parent or ancestor)
    const chartElement = box.closest('.chart-container') || document.body;
    const chartRect = chartElement.getBoundingClientRect();
    
    let adjustedLeft = normalized.x;
    let adjustedBottom = normalized.y + 5;
    
    // Check if tooltip extends beyond right edge
    if (boxRect.right > chartRect.right) {
      // Shift left to stay inside the chart
      const overflow = boxRect.right - chartRect.right;
      adjustedLeft = Math.max(0, normalized.x - (overflow / chartRect.width * 100));
    }
    
    // Check if tooltip extends beyond left edge
    if (boxRect.left < chartRect.left) {
      adjustedLeft = Math.min(100, normalized.x + ((chartRect.left - boxRect.left) / chartRect.width * 100));
    }
    
    // Check if tooltip extends beyond top edge (bottom in SVG coordinates)
    if (boxRect.top < chartRect.top) {
      // Flip to display below the point
      adjustedBottom = normalized.y - (boxRect.height / chartRect.height * 100) - 5;
    }
    
    // Check if tooltip extends beyond bottom edge
    if (boxRect.bottom > chartRect.bottom) {
      adjustedBottom = normalized.y + (boxRect.height / chartRect.height * 100) + 5;
    }
    
    // Apply adjusted position
    box.style.left = `${adjustedLeft}%`;
    box.style.bottom = `${adjustedBottom}%`;
    
  }, [normalized]);
  
  return (
    <div
      ref={boxRef}
      className="data-point-info"
      style={{
        position: 'absolute',
        left: `${normalized.x}%`,
        bottom: `${normalized.y + 5}%`
      }}
      onClick={e => e.stopPropagation()}
    >
      <div 
        className="data-point-info__header"
        style={{ 
          borderLeftColor: quadrantInfo.color,
          borderLeftWidth: '4px'
        }}
      >
        {/* Show title based on whether this is a multi-point or single point */}
        {count > 1 ? (
          <div className="data-point-info__title">Multiple Data Points</div>
        ) : (
          <div className="data-point-info__title">{point.name}</div>
        )}
        <div className="data-point-info__id">ID: {point.id}</div>
      </div>

      <div className="data-point-info__content">
        <div className="data-point-info__stats">
          {/* Quadrant indicator */}
          <div className="data-point-info__quadrant-indicator">
            <div className="data-point-info__label">Group:</div>
            <div className="data-point-info__value" style={{ color: quadrantInfo.color, fontWeight: 600 }}>
  {(() => {
    const contextResult = getQuadrantForPoint(point);
    return quadrantInfo.group;
  })()}
</div>
          </div>
          
          {/* Satisfaction and Loyalty in prominent display */}
          <div className="data-point-info__metrics">
            <div className="data-point-info__metric">
              <div className="data-point-info__metric-value" style={{ color: quadrantInfo.color }}>
                {point.satisfaction}
              </div>
              <div className="data-point-info__metric-label">{labels.satisfaction}</div>
            </div>
            
            <div className="data-point-info__metric-divider"></div>
            
            <div className="data-point-info__metric">
              <div className="data-point-info__metric-value" style={{ color: quadrantInfo.color }}>
                {point.loyalty}
              </div>
              <div className="data-point-info__metric-label">{labels.loyalty}</div>
            </div>
          </div>
        </div>

        {availableOptions && availableOptions.length > 1 && (
          <div className="data-point-info__boundary">
            <div className="data-point-info__boundary-text">
              This point is on a boundary line
            </div>
            <div className="data-point-info__buttons">
              {availableOptions.map(option => {
                const isActive = quadrantInfo.group === option.group;
                return (
                  <button
                    key={option.group}
                    onClick={isActive ? undefined : () => {
                      onGroupChange?.(option);
                      // Don't close immediately - let the loading popup show first
                      // onClose will be called after the loading is complete
                      notification.showNotification({
                        title: 'Point Reassigned',
                        message: `Point ${point.satisfaction},${point.loyalty} changed to ${option.group}`,
                        type: 'success'
                      });
                    }}
                    className={`data-point-info__button ${isActive ? 'active' : 'available'}`}
                    style={{
                      borderColor: option.color,
                      backgroundColor: isActive ? option.color : 'white',
                      color: isActive ? 'white' : option.color,
                      cursor: isActive ? 'default' : 'pointer',
                      opacity: isActive ? 1 : 0.8
                    }}
                    title={isActive ? 'Current assignment' : `Reassign to ${option.group}`}
                  >
                    {option.group}
                    {isActive && <span className="active-indicator">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {count > 1 && (
          <div className="data-point-info__multiple">
            <div className="data-point-info__multiple-header">
              {count} points in this position:
            </div>
            <div className="data-point-info__points-list">
              {samePoints.map(p => (
                <div key={p.id} className="data-point-info__point">
                  <span>{p.name || "Unnamed point"}</span>
                  <span className="data-point-info__point-id">{p.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoBox;