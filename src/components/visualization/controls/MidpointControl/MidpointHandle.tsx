import React, { useState, useEffect, useRef } from 'react';
import { Move } from 'lucide-react';
import { Position, GridDimensions, Midpoint, ScaleFormat, isZeroBasedScale } from '@/types/base';
import { isDraggingNearHalfCell } from '../../utils/positionCalculator';
import { UnifiedLoadingPopup } from '../../../ui/UnifiedLoadingPopup';
import './MidpointHandle.css';


interface MidpointHandleProps {
  position: Position;
  midpoint: Midpoint;
  dimensions: GridDimensions;
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  onMidpointChange: (newMidpoint: Midpoint) => void;
  isAdjustable?: boolean;
  apostlesZoneSize: number;
  terroristsZoneSize: number;
  showNearApostles: boolean;
  onShowNearApostlesChange: (show: boolean) => void;
  showSpecialZones: boolean;
}

const MidpointHandle: React.FC<MidpointHandleProps> = ({ 
  position,
  midpoint,
  dimensions,
  satisfactionScale,
  loyaltyScale,
  onMidpointChange,
  isAdjustable = true,
  apostlesZoneSize,
  terroristsZoneSize,
  showNearApostles,
  onShowNearApostlesChange,
  showSpecialZones
}) => {
  const [isNearHalf, setIsNearHalf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [visualPosition, setVisualPosition] = useState(position);
  const finalMidpointRef = useRef<Midpoint | null>(null);
  const calculationStartTime = useRef<number>(0);

  useEffect(() => {
    setIsNearHalf(isDraggingNearHalfCell(position, dimensions));
  }, [position, dimensions]);

  // Sync visual position with actual position when not dragging and not showing loading popup
  useEffect(() => {
    if (!isDragging && !showLoadingPopup) {
      setVisualPosition(position);
    }
  }, [position, isDragging, showLoadingPopup]);

  if (!isAdjustable) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    
    const container = e.currentTarget.parentElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startMidpoint = { ...midpoint };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();

      const deltaX = moveEvent.clientX - startX;
      const deltaY = startY - moveEvent.clientY;
      
      // Check if using 1-3 scale
    const is1To3Scale = satisfactionScale === '1-3' || loyaltyScale === '1-3';
    
    // For 1-3 scale, only allow vertical movement (keep same horizontal position)
    const newSat = is1To3Scale ? startMidpoint.sat : startMidpoint.sat + (deltaX / containerRect.width) * (dimensions.totalCols - 1);
    const newLoy = startMidpoint.loy + (deltaY / containerRect.height) * (dimensions.totalRows - 1);
      
      // Calculate limits - use default zone sizes when areas hidden, actual sizes when shown
      const effectiveApostlesSize = showSpecialZones ? apostlesZoneSize : 1;
      const effectiveTerroristsSize = showSpecialZones ? terroristsZoneSize : 1;
      
     // Calculate proper bounds - only fix loyalty axis for 0-10 scale
      const minSat = effectiveTerroristsSize + 1;
      let maxSat = dimensions.totalCols - effectiveApostlesSize;
      
      // Special handling for zero-based loyalty scales (0-5, 0-7, 0-10)
      let minLoy, maxLoy;
      if (isZeroBasedScale(loyaltyScale)) {
        minLoy = effectiveTerroristsSize;  // For 0-10: 1 (not +1)
        maxLoy = dimensions.totalRows - effectiveApostlesSize - 1;  // For 0-10: should be 9, not 10
      } else {
        minLoy = effectiveTerroristsSize + 1;
        maxLoy = dimensions.totalRows - effectiveApostlesSize;
      }
      
      // If near-apostles is active, we need extra space
      if (showNearApostles) {
        maxSat -= 1;
        maxLoy -= 1;
      }
      
      // Check if moving into near-apostles area and it's active
      const wouldEncroachNearApostles = (
        (newSat > maxSat || newLoy > maxLoy) && 
        showNearApostles
      );
      
      if (wouldEncroachNearApostles) {
        // Turn off near-apostles if we're encroaching on its area
        onShowNearApostlesChange(false);
        
        // Now recalculate limits without near-apostles restriction
        maxSat = dimensions.totalCols - apostlesZoneSize;
        maxLoy = dimensions.totalRows - apostlesZoneSize;
      }
      
      // Ensure midpoint stays within valid range
      const validSat = Math.max(minSat, Math.min(maxSat, newSat));
      const validLoy = Math.max(minLoy, Math.min(maxLoy, newLoy));
      
      const newMidpoint = {
        sat: Math.round(validSat * 2) / 2,
        loy: Math.round(validLoy * 2) / 2
      };
      
      // Store the calculated midpoint for later use
      finalMidpointRef.current = newMidpoint;
      
      // Update visual position immediately (no calculations triggered)
      // Use the same calculation as calculateMidpointPosition
      const newVisualPosition = {
        x: ((newMidpoint.sat - dimensions.scaleRanges.satisfaction.min) / (dimensions.totalCols - 1)) * 100,
        y: ((newMidpoint.loy - dimensions.scaleRanges.loyalty.min) / (dimensions.totalRows - 1)) * 100
      };
      setVisualPosition(newVisualPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setShowLoadingPopup(true); // Show popup IMMEDIATELY
      calculationStartTime.current = Date.now(); // Record start time
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
      
      // Use setTimeout to ensure popup renders before calculations start
      setTimeout(() => {
        // Now trigger the calculations with the final midpoint
        if (finalMidpointRef.current) {
          onMidpointChange(finalMidpointRef.current);
          finalMidpointRef.current = null;
        }
        
        // Ensure loading popup shows for at least 1 second from start time
        const elapsedTime = Date.now() - calculationStartTime.current;
        const remainingTime = Math.max(0, 1000 - elapsedTime);
        
        setTimeout(() => {
          setShowLoadingPopup(false); // Hide popup with fade animation
        }, remainingTime);
      }, 50); // Small delay to ensure popup renders first
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'move';
  };

  // Use visual position when dragging or showing loading popup, actual position otherwise
  const currentPosition = (isDragging || showLoadingPopup) ? visualPosition : position;

  return (
    <>
      <div 
        className="midpoint-handle"
        style={{
          left: `${currentPosition.x}%`,
          bottom: `${currentPosition.y}%`,
          transform: 'translate(-50%, 50%)',
          transition: (isDragging || showLoadingPopup) ? 'none' : 'all 0.2s ease'
        }}
        onMouseDown={handleMouseDown}
        role="button"
        tabIndex={0}
        title="Drag to move midpoint"
      >
        <div className={`midpoint-dot ${isNearHalf ? 'midpoint-dot--half' : ''}`}>
          <Move 
            size={16} 
            color="#000"
            strokeWidth={2} 
          />
        </div>
      </div>
      
      {/* Prominent Loading Popup - centered on screen */}
      <UnifiedLoadingPopup isVisible={showLoadingPopup} text="segmenting" size="medium" />
    </>
  );
};

export { MidpointHandle };
export type { MidpointHandleProps };
export default MidpointHandle;