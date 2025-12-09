// src/components/reporting/components/DistributionSection/ProximityPointInfoBox.tsx
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { DataPoint } from '@/types/base';
import '../../../visualization/components/DataPoints/DataPointInfoBox.css';

export interface QuadrantOption {
  group: string;
  color: string;
}

export const ProximityPointInfoBox: React.FC<{
  points: DataPoint[];
  position: { x: number; y: number };
  quadrant: string;
  proximityType?: string;
  onClose: () => void;
  context?: 'distribution' | 'proximity';
  isClassicModel?: boolean;
  secondaryPoints?: DataPoint[];
  secondaryQuadrant?: string;
  secondaryProximityType?: string;
}> = ({ 
  points, 
  position, 
  quadrant, 
  proximityType, 
  onClose, 
  context = 'distribution', 
  isClassicModel = true,
  secondaryPoints,
  secondaryQuadrant,
  secondaryProximityType
}) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(false);
  const [showAllSecondary, setShowAllSecondary] = useState(false);
  
  // Reset showAll when points change
  useEffect(() => {
    setShowAll(false);
    setShowAllSecondary(false);
  }, [points, secondaryPoints]);
  
  // Colors based on quadrant
  const getQuadrantInfo = (): QuadrantOption => {
    switch (quadrant) {
      case 'loyalists':
        return { group: 'Loyalists', color: '#4CAF50' };
      case 'mercenaries':
        return { group: 'Mercenaries', color: '#F7B731' };
      case 'hostages':
        return { group: 'Hostages', color: '#3A6494' };
      case 'defectors':
        return { group: 'Defectors', color: '#DC2626' };
      default:
        return { group: 'Unknown', color: '#6B7280' };
    }
  };

  // Get the title based on context and proximity type
  const getFormattedTitle = (): string => {
    if (context === 'proximity' && proximityType) {
      // For proximity reports: "Loyalists near Mercenaries"
      const sourceQuadrant = quadrant.charAt(0).toUpperCase() + quadrant.slice(1);
      
      // Handle special zone proximity types first
      if (proximityType === 'apostles') {
        return `${sourceQuadrant} near ${isClassicModel ? 'Apostles' : 'Advocates'}`;
      }
      if (proximityType === 'near_apostles') {
        return `${sourceQuadrant} near ${isClassicModel ? 'Near-Apostles' : 'Near-Advocates'}`;
      }
      if (proximityType === 'terrorists') {
        return `${sourceQuadrant} near ${isClassicModel ? 'Terrorists' : 'Trolls'}`;
      }
      
      // Handle regular quadrant proximity types
      const targetQuadrant = proximityType.replace('near_', '').charAt(0).toUpperCase() + 
                           proximityType.replace('near_', '').slice(1);
      return `${sourceQuadrant} near ${targetQuadrant}`;
    }
    
    // For distribution reports: show dynamic titles based on proximity type
    if (context === 'distribution' && proximityType) {
      const sourceQuadrant = quadrant.charAt(0).toUpperCase() + quadrant.slice(1);
      
      // Handle special zone proximity types
      if (proximityType === 'apostles') {
        return `${sourceQuadrant} nearly ${isClassicModel ? 'Apostles' : 'Advocates'}`;
      }
      if (proximityType === 'near_apostles') {
        return `${sourceQuadrant} nearly ${isClassicModel ? 'Near-Apostles' : 'Near-Advocates'}`;
      }
      if (proximityType === 'terrorists') {
        return `${sourceQuadrant} nearly ${isClassicModel ? 'Terrorists' : 'Trolls'}`;
      }
      
      // Handle regular quadrant proximity types
      if (proximityType === 'near_loyalists') {
        return `${sourceQuadrant} nearly Loyalists`;
      }
      if (proximityType === 'near_mercenaries') {
        return `${sourceQuadrant} nearly Mercenaries`;
      }
      if (proximityType === 'near_hostages') {
        return `${sourceQuadrant} nearly Hostages`;
      }
      if (proximityType === 'near_defectors') {
        return `${sourceQuadrant} nearly Defectors`;
      }
      
      // Fallback for other proximity types
      const targetQuadrant = proximityType.replace('near_', '').charAt(0).toUpperCase() + 
                           proximityType.replace('near_', '').slice(1);
      return `${sourceQuadrant} nearly ${targetQuadrant}`;
    }
    
    // For distribution reports without proximity type: show customer details
    if (context === 'distribution') {
      return `Customer Details`;
    }
    
    // Fallback
    return quadrant.charAt(0).toUpperCase() + quadrant.slice(1);
  };

  // Get customer display name with incremental numbering for anonymous customers
  const getCustomerDisplayName = (point: DataPoint, index: number): string => {
    // If customer has a name, use it
    if (point.name && point.name.trim()) return point.name.trim();
    // If customer has email but no name, use email
    if (point.email && point.email.trim()) return point.email.trim();
    // For anonymous customers, use incremental numbering starting from 1
    return `Customer ${index + 1}`;
  };

  const quadrantInfo = getQuadrantInfo();
  const title = getFormattedTitle();
  
  // Check if we have points (must be defined before use)
  const hasPrimaryPoints = points && points.length > 0;
  const hasSecondaryPoints = secondaryPoints && secondaryPoints.length > 0;
  
  // Get secondary title if secondary points exist
  const getSecondaryTitle = (): string => {
    if (!secondaryQuadrant || !secondaryProximityType) return '';
    
    // Format source quadrant name properly
    let formattedSourceQuadrant: string;
    if (secondaryQuadrant === 'near_apostles') {
      formattedSourceQuadrant = isClassicModel ? 'Near-Apostles' : 'Near-Advocates';
    } else {
      formattedSourceQuadrant = secondaryQuadrant.charAt(0).toUpperCase() + secondaryQuadrant.slice(1);
    }
    
    if (secondaryProximityType === 'apostles') {
      return `${formattedSourceQuadrant} near ${isClassicModel ? 'Apostles' : 'Advocates'}`;
    }
    if (secondaryProximityType === 'near_apostles') {
      return `${formattedSourceQuadrant} near ${isClassicModel ? 'Near-Apostles' : 'Near-Advocates'}`;
    }
    if (secondaryProximityType === 'terrorists') {
      return `${formattedSourceQuadrant} near ${isClassicModel ? 'Terrorists' : 'Trolls'}`;
    }
    
    if (secondaryProximityType === 'near_apostles') {
      return `${formattedSourceQuadrant} near ${isClassicModel ? 'Near-Apostles' : 'Near-Advocates'}`;
    }
    
    const targetQuadrant = secondaryProximityType.replace('near_', '').charAt(0).toUpperCase() + 
                         secondaryProximityType.replace('near_', '').slice(1);
    return `${formattedSourceQuadrant} near ${targetQuadrant}`;
  };
  
  const secondaryTitle = getSecondaryTitle();
  const hasTwoColumns = hasSecondaryPoints && hasPrimaryPoints;
  
  // Handle click outside for modal
useEffect(() => {
  const box = boxRef.current;
  if (!box) return;
  
  // Click outside handler
  const handleClickOutside = (e: MouseEvent) => {
    if (box && !box.contains(e.target as Node)) {
      onClose();
    }
  };
  
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [onClose]);
  
  if (!hasPrimaryPoints && !hasSecondaryPoints) {
    return (
      <div
        ref={boxRef}
        className="data-point-info data-point-info--reports"
        style={{
          position: 'absolute',
          zIndex: 2000
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="data-point-info__header">
          <div className="data-point-info__title" style={{ color: getQuadrantInfo().color }}>
            {getFormattedTitle()}
          </div>
          <div className="data-point-info__id">
            0 points
          </div>
        </div>
        
        <div className="data-point-info__content">
          
          <div className="data-point-info__multiple">
            <div className="data-point-info__more">
              No customers in this proximity area
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Helper function to render customer list
  const renderCustomerList = (
    customerPoints: DataPoint[],
    isShowingAll: boolean,
    setIsShowingAll: (value: boolean) => void,
    titleText: string,
    titleColor: string
  ) => {
    if (!customerPoints || customerPoints.length === 0) {
      return (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            padding: '12px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
          }}>
            <div style={{
              fontWeight: '600',
              fontSize: '14px',
              color: titleColor,
              marginBottom: '4px'
            }}>
              {titleText}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280'
            }}>
              0 customers
            </div>
          </div>
          <div style={{
            padding: '12px',
            color: '#6b7280',
            fontSize: '12px',
            fontStyle: 'italic'
          }}>
            No customers in this proximity relationship
          </div>
        </div>
      );
    }
    
    const displayedPoints = isShowingAll ? customerPoints : customerPoints.slice(0, 5);
    const maxDisplayed = Math.min(customerPoints.length, 5);
    
    return (
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          padding: '12px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{
            fontWeight: '600',
            fontSize: '14px',
            color: titleColor,
            marginBottom: '4px'
          }}>
            {titleText}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#6b7280'
          }}>
            {customerPoints.length} {customerPoints.length === 1 ? 'customer' : 'customers'}
          </div>
        </div>
        <div className="data-point-info__list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {displayedPoints.map((point, index) => (
            <div key={point.id || index} className="data-point-info__list-item" style={{
              padding: '8px 12px',
              borderBottom: index < displayedPoints.length - 1 ? '1px solid #e5e7eb' : 'none'
            }}>
              <div className="data-point-info__customer-name" style={{
                fontWeight: '600',
                fontSize: '14px',
                marginBottom: '4px'
              }}>
                {getCustomerDisplayName(point, index)}, ID: {point.id}
              </div>
              <div className="data-point-info__customer-coords" style={{
                fontSize: '12px',
                color: '#6b7280'
              }}>
                Satisfaction: {point.satisfaction}, Loyalty: {point.loyalty}
              </div>
            </div>
          ))}
        </div>
        {customerPoints.length > 5 && (
          <div className="data-point-info__more" style={{
            padding: '8px 12px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
          }}>
            {!isShowingAll ? (
              <div>
                <span style={{ color: '#6b7280', fontSize: '12px' }}>
                  Showing {maxDisplayed} of {customerPoints.length} customers
                </span>
                <button
                  onClick={() => setIsShowingAll(true)}
                  style={{
                    marginLeft: '8px',
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textDecoration: 'underline'
                  }}
                >
                  Show All
                </button>
              </div>
            ) : (
              <div>
                <span style={{ color: '#6b7280', fontSize: '12px' }}>
                  Showing all {customerPoints.length} customers
                </span>
                <button
                  onClick={() => setIsShowingAll(false)}
                  style={{
                    marginLeft: '8px',
                    background: 'none',
                    border: 'none',
                    color: '#3b82f6',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textDecoration: 'underline'
                  }}
                >
                  Show Less
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const modalContent = (
    <div
      ref={boxRef}
      className="data-point-info data-point-info--reports"
      style={{
        position: 'absolute',
        zIndex: 99999,
        left: `${position.x + (window.pageXOffset || document.documentElement.scrollLeft) + 10}px`,
        top: `${position.y + (window.pageYOffset || document.documentElement.scrollTop) + 10}px`,
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        minWidth: hasTwoColumns ? '600px' : '240px',
        maxWidth: hasTwoColumns ? '800px' : '400px',
        maxHeight: '80vh',
        overflowY: 'auto',
        color: '#333',
        fontSize: '14px'
      }}
      onClick={e => e.stopPropagation()}
    >
      <div className="data-point-info__header" style={{
        padding: '12px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <div className="data-point-info__title" style={{ 
          color: quadrantInfo.color,
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '4px'
        }}>
          {hasTwoColumns ? 'Near-Apostles Proximity' : title}
        </div>
        <div className="data-point-info__id" style={{
          fontSize: '12px',
          color: '#6b7280'
        }}>
          {hasTwoColumns 
            ? `${(points?.length || 0) + (secondaryPoints?.length || 0)} total customers`
            : `${points?.length || 0} ${(points?.length || 0) === 1 ? 'point' : 'points'}`
          }
        </div>
      </div>
  
      <div className="data-point-info__content" style={{
        display: hasTwoColumns ? 'flex' : 'block',
        gap: hasTwoColumns ? '0' : '0',
        borderTop: hasTwoColumns ? '1px solid #e5e7eb' : 'none'
      }}>
        {hasTwoColumns ? (
          <>
            {hasPrimaryPoints && renderCustomerList(
              points,
              showAll,
              setShowAll,
              title,
              quadrantInfo.color
            )}
            {hasPrimaryPoints && hasSecondaryPoints && (
              <div style={{
                width: '1px',
                backgroundColor: '#e5e7eb',
                margin: '0'
              }} />
            )}
            {hasSecondaryPoints && secondaryPoints && renderCustomerList(
              secondaryPoints,
              showAllSecondary,
              setShowAllSecondary,
              secondaryTitle,
              '#10B981' // Near-Apostles color (emerald)
            )}
          </>
        ) : (
          <div className="data-point-info__multiple">
            <div className="data-point-info__list">
              {(showAll ? points : points.slice(0, 5)).map((point, index) => (
                <div key={point.id || index} className="data-point-info__list-item" style={{
                  padding: '8px 12px',
                  borderBottom: index < (showAll ? points.length - 1 : Math.min(points.length, 5) - 1) ? '1px solid #e5e7eb' : 'none'
                }}>
                  <div className="data-point-info__customer-name" style={{
                    fontWeight: '600',
                    fontSize: '14px',
                    marginBottom: '4px'
                  }}>
                    {getCustomerDisplayName(point, index)}, ID: {point.id}
                  </div>
                  <div className="data-point-info__customer-coords" style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    Satisfaction: {point.satisfaction}, Loyalty: {point.loyalty}
                  </div>
                </div>
              ))}
            </div>
            
            {points.length > 5 && (
              <div className="data-point-info__more" style={{
                padding: '8px 12px',
                borderTop: '1px solid #e5e7eb',
                marginTop: '8px'
              }}>
                {!showAll ? (
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>
                      Showing 5 of {points.length} customers
                    </span>
                    <button
                      onClick={() => setShowAll(true)}
                      style={{
                        marginLeft: '8px',
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        fontSize: '12px',
                        textDecoration: 'underline'
                      }}
                    >
                      Show All
                    </button>
                  </div>
                ) : (
                  <div>
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>
                      Showing all {points.length} customers
                    </span>
                    <button
                      onClick={() => setShowAll(false)}
                      style={{
                        marginLeft: '8px',
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        fontSize: '12px',
                        textDecoration: 'underline'
                      }}
                    >
                      Show Less
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Render modal using React Portal to document.body to avoid CSS clipping
  return ReactDOM.createPortal(modalContent, document.body);
};

export default ProximityPointInfoBox;