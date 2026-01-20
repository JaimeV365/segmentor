import React, { useMemo, useState, useRef, useEffect } from 'react';
import { MovementStats, QuadrantMovement } from '../services/historicalAnalysisService';
import type { QuadrantType } from '../../../../visualization/context/QuadrantAssignmentContext';
import { DataPoint } from '@/types/base';
import { CustomerTimeline } from '../utils/historicalDataUtils';
import { ProximityPointInfoBox } from '../../DistributionSection/ProximityPointInfoBox';
import { InfoRibbon } from '../../InfoRibbon/InfoRibbon';
import { Menu as MenuIcon, X } from 'lucide-react';

interface QuadrantMovementDiagramProps {
  movementStats: MovementStats;
  timelines: CustomerTimeline[];
  data: DataPoint[];
  isClassicModel?: boolean;
}

// Helper to get quadrant display names based on terminology
const getQuadrantDisplayName = (quadrant: string, isClassicModel: boolean = true): string => {
  if (isClassicModel) {
    const names: Record<string, string> = {
      'loyalists': 'Loyalists',
      'mercenaries': 'Mercenaries',
      'hostages': 'Hostages',
      'defectors': 'Defectors',
      'apostles': 'Apostles',
      'near_apostles': 'Near-Apostles',
      'terrorists': 'Terrorists',
      'neutral': 'Neutral'
    };
    return names[quadrant] || quadrant;
  } else {
    // Modern terminology
    const names: Record<string, string> = {
      'loyalists': 'Loyalists',
      'mercenaries': 'Mercenaries',
      'hostages': 'Hostages',
      'defectors': 'Defectors',
      'apostles': 'Advocates',
      'near_apostles': 'Near-Advocates',
      'terrorists': 'Trolls',
      'neutral': 'Neutral'
    };
    return names[quadrant] || quadrant;
  }
};

export const QuadrantMovementDiagram: React.FC<QuadrantMovementDiagramProps> = ({
  movementStats,
  timelines,
  data,
  isClassicModel = true
}) => {
  type MainQuadrantType = 'hostages' | 'loyalists' | 'defectors' | 'mercenaries';

  const MAIN_QUADRANTS: MainQuadrantType[] = useMemo(
    () => ['hostages', 'loyalists', 'defectors', 'mercenaries'],
    []
  );

  const [clickedMovement, setClickedMovement] = useState<{
    points: DataPoint[];
    position: { x: number; y: number };
    fromQuadrant: string;
    toQuadrant: string;
  } | null>(null);
  const [showControlsPanel, setShowControlsPanel] = useState(false);
  const [showPositive, setShowPositive] = useState(true);
  const [showNegative, setShowNegative] = useState(true);
  const [mergeAdvocatesIntoLoyalists, setMergeAdvocatesIntoLoyalists] = useState(false);
  const [mergeNearAdvocatesIntoLoyalists, setMergeNearAdvocatesIntoLoyalists] = useState(false);
  const [mergeTrollsIntoDefectors, setMergeTrollsIntoDefectors] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Movement direction is calculated after merging into the 4 main quadrants.
  // Layout is fixed: Hostages (TL), Loyalists (TR), Defectors (BL), Mercenaries (BR).
  const mainQuadrantHierarchy: Record<MainQuadrantType, number> = {
    'defectors': 1,
    'hostages': 2,
    'mercenaries': 3,
    'loyalists': 4
  };

  // Determine if a movement is positive, negative, or neutral
  const getMovementType = (from: MainQuadrantType, to: MainQuadrantType): 'positive' | 'negative' | 'neutral' => {
    const fromRank = mainQuadrantHierarchy[from] || 0;
    const toRank = mainQuadrantHierarchy[to] || 0;
    if (toRank > fromRank) return 'positive';
    if (toRank < fromRank) return 'negative';
    return 'neutral';
  };

  // Movements shown in the diagram:
  // - Always between the 4 main quadrants
  // - Extra quadrants can be merged into one of the 4 for display (counts/customers merge)
  // - Layout/arrow geometry never changes
  const baseMovementsForDiagram = useMemo((): QuadrantMovement[] => {
    const mapToMainQuadrant = (q: QuadrantType): MainQuadrantType | null => {
      if (q === 'hostages' || q === 'loyalists' || q === 'defectors' || q === 'mercenaries') {
        return q;
      }
      // Simplified merge rules:
      // - Advocates/Apostles and Near-Advocates/Near-Apostles can only be merged into Loyalists
      // - Trolls/Terrorists can only be merged into Defectors
      // - Neutral is not merged into the 4-quadrant diagram
      if (q === 'apostles') return mergeAdvocatesIntoLoyalists ? 'loyalists' : null;
      if (q === 'near_apostles') return mergeNearAdvocatesIntoLoyalists ? 'loyalists' : null;
      if (q === 'terrorists') return mergeTrollsIntoDefectors ? 'defectors' : null;
      if (q === 'neutral') return null;
      return null;
    };

    // First map movements into the 4-quadrant view (dropping anything not mapped).
    const mapped: QuadrantMovement[] = [];
    movementStats.movements.forEach(m => {
      const from = mapToMainQuadrant(m.from);
      const to = mapToMainQuadrant(m.to);
      if (!from || !to) return;
      // If a movement collapses into the same display quadrant after merging, it doesn't appear in the diagram.
      if (from === to) return;
      mapped.push({ ...m, from, to });
    });

    // Merge movements that now share the same display from/to.
    const merged: Record<string, QuadrantMovement> = {};
    mapped.forEach(m => {
      const key = `${m.from}-${m.to}`;
      if (merged[key]) {
        merged[key].count += m.count;
        merged[key].customers.push(...m.customers);
      } else {
        merged[key] = { ...m, customers: [...m.customers] };
      }
    });

    // Apply movement type filters (positive/negative).
    let movements = Object.values(merged);
    movements = movements.filter(m => {
      const movementType = getMovementType(m.from as MainQuadrantType, m.to as MainQuadrantType);
      if (movementType === 'positive' && !showPositive) return false;
      if (movementType === 'negative' && !showNegative) return false;
      return true;
    });

    return movements;
  }, [
    movementStats.movements,
    mergeAdvocatesIntoLoyalists,
    mergeNearAdvocatesIntoLoyalists,
    mergeTrollsIntoDefectors,
  ]);

  const availablePositiveInDiagram = useMemo(() => {
    return baseMovementsForDiagram.some(m => getMovementType(m.from as MainQuadrantType, m.to as MainQuadrantType) === 'positive');
  }, [baseMovementsForDiagram]);

  const availableNegativeInDiagram = useMemo(() => {
    return baseMovementsForDiagram.some(m => getMovementType(m.from as MainQuadrantType, m.to as MainQuadrantType) === 'negative');
  }, [baseMovementsForDiagram]);

  const displayMovements = useMemo((): QuadrantMovement[] => {
    // Apply movement type filters (positive/negative).
    return baseMovementsForDiagram.filter(m => {
      const movementType = getMovementType(m.from as MainQuadrantType, m.to as MainQuadrantType);
      if (movementType === 'positive' && !showPositive) return false;
      if (movementType === 'negative' && !showNegative) return false;
      return true;
    });
  }, [baseMovementsForDiagram, showPositive, showNegative]);

  const hasAdvocatesToMerge = useMemo(() => {
    return movementStats.movements.some(m => m.from === 'apostles' || m.to === 'apostles');
  }, [movementStats.movements]);

  const hasNearAdvocatesToMerge = useMemo(() => {
    return movementStats.movements.some(m => m.from === 'near_apostles' || m.to === 'near_apostles');
  }, [movementStats.movements]);

  const hasTrollsToMerge = useMemo(() => {
    return movementStats.movements.some(m => m.from === 'terrorists' || m.to === 'terrorists');
  }, [movementStats.movements]);

  // Close controls panel when clicking outside
  useEffect(() => {
    if (!showControlsPanel) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      const targetElement = event.target as HTMLElement;
      const isPanelClick = targetElement.closest('.unified-controls-panel');
      const isControlButtonClick = settingsButtonRef.current?.contains(targetElement);
      
      if (!isPanelClick && !isControlButtonClick && panelRef.current) {
        setShowControlsPanel(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showControlsPanel]);

  // Diagram quadrants are always fixed in this exact 2x2 layout (see CSS placement rules).
  // Do not change this order: Hostages (TL), Loyalists (TR), Defectors (BL), Mercenaries (BR).
  const diagramQuadrants: QuadrantType[] = MAIN_QUADRANTS;

  const diagramInfoText = useMemo(() => {
    const base =
      'Numbers in circles indicate customer count moving from source to destination quadrant. Click on a circle to see the customers.';

    const apostlesLabel = isClassicModel ? 'Apostles' : 'Advocates';
    const nearApostlesLabel = isClassicModel ? 'Near-Apostles' : 'Near-Advocates';
    const terroristsLabel = isClassicModel ? 'Terrorists' : 'Trolls';

    return (
      base +
      `\n\nNote: This diagram always keeps the same 4-quadrant layout. ${apostlesLabel} and ${nearApostlesLabel} can be merged into Loyalists, and ${terroristsLabel} can be merged into Defectors using the filter menu (☰).`
    );
  }, [isClassicModel]);

  // Group movements by source quadrant (must be before early return)
  const movementsBySource = useMemo(() => {
    const grouped: Record<string, Array<{ to: QuadrantType; count: number }>> = {};
    displayMovements.forEach(movement => {
      if (!grouped[movement.from]) {
        grouped[movement.from] = [];
      }
      grouped[movement.from].push({ to: movement.to, count: movement.count });
    });
    return grouped;
  }, [displayMovements]);

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

  // Helper function to get DataPoints for a specific movement
  const getDataPointsForMovement = (fromQuadrant: string, toQuadrant: string): DataPoint[] => {
    const movement = displayMovements.find(
      m => m.from === fromQuadrant && m.to === toQuadrant
    );
    if (!movement) {
      console.log('QuadrantMovementDiagram: No movement found', { fromQuadrant, toQuadrant });
      return [];
    }

    const dataPoints: DataPoint[] = [];
    movement.customers.forEach(customer => {
      // Find the timeline for this customer - normalize identifiers for comparison
      const normalizedCustomerId = customer.identifier.toLowerCase().trim();
      const timeline = timelines.find(t => {
        const normalizedTimelineId = t.identifier.toLowerCase().trim();
        return normalizedTimelineId === normalizedCustomerId && t.identifierType === customer.identifierType;
      });
      
      if (timeline) {
        // Find the data point at the "to" date (destination quadrant)
        const normalizedToDate = customer.toDate.trim();
        const point = timeline.dataPoints.find(p => {
          if (!p.date) return false;
          return p.date.trim() === normalizedToDate;
        });
        if (point) {
          dataPoints.push(point);
        }
      }
    });
    
    return dataPoints;
  };

  // Handle circle click
  const handleCircleClick = (e: React.MouseEvent | MouseEvent, fromQuadrant: string, toQuadrant: string) => {
    e.stopPropagation();
    const points = getDataPointsForMovement(fromQuadrant, toQuadrant);
    if (points.length > 0) {
      // Get position from the SVG element or use mouse position
      const svgElement = (e.currentTarget as HTMLElement).closest('svg');
      const rect = svgElement?.getBoundingClientRect();
      const mouseX = 'clientX' in e ? e.clientX : (rect ? rect.left + rect.width / 2 : window.innerWidth / 2);
      const mouseY = 'clientY' in e ? e.clientY : (rect ? rect.top + rect.height / 2 : window.innerHeight / 2);
      
      setClickedMovement({
        points,
        position: {
          x: mouseX,
          y: mouseY
        },
        fromQuadrant,
        toQuadrant
      });
    }
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

    diagramQuadrants.forEach(quadrant => {
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

  const hasAnyMovementsForDiagram = baseMovementsForDiagram.length > 0;
  const hasMovementsToDisplay = displayMovements.length > 0;
  const anyMovementTypeAvailable = availablePositiveInDiagram || availableNegativeInDiagram;
  const isMovementTypeFilterTooExclusive =
    anyMovementTypeAvailable &&
    (!availablePositiveInDiagram || !showPositive) &&
    (!availableNegativeInDiagram || !showNegative);
  const showDiagramEmptyState = isMovementTypeFilterTooExclusive || !hasMovementsToDisplay;

  const emptyStateTitle = isMovementTypeFilterTooExclusive
    ? 'Nothing to display'
    : (!hasAnyMovementsForDiagram ? 'No movements detected' : 'No movements match these filters');

  const emptyStateMessage = (() => {
    if (isMovementTypeFilterTooExclusive) {
      const availableLabels: string[] = [];
      if (availablePositiveInDiagram) availableLabels.push('Positive');
      if (availableNegativeInDiagram) availableLabels.push('Negative');
      const label =
        availableLabels.length === 1
          ? `${availableLabels[0]} movements`
          : `${availableLabels.join(' and/or ')} movements`;
      return `Your Movement Types selection is too exclusive. Use the filter menu (☰) to turn ${label} back on.`;
    }
    if (!hasAnyMovementsForDiagram) {
      return 'No between-quadrant movements are available for the current data (and merge settings).';
    }
    return 'Try adjusting Movement Types or the merge settings using the filter menu (☰).';
  })();

  // Quadrant colors for circles and arrows
  const QUADRANT_COLORS: Record<string, string> = {
    'loyalists': '#4CAF50',
    'mercenaries': '#F7B731',
    'hostages': '#4682B4',
    'defectors': '#DC2626'
  };

  return (
    <div className="quadrant-movement-diagram">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h5 className="movement-diagram-title">Movement Flow Visualization</h5>
        <button
          ref={settingsButtonRef}
          className={`trend-chart-settings-button ${showControlsPanel ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setShowControlsPanel(prev => !prev);
          }}
          title="Filter movements"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            background: showControlsPanel ? '#3a863e' : '#ffffff',
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            color: showControlsPanel ? '#ffffff' : '#3a863e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            if (!showControlsPanel) {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!showControlsPanel) {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }
          }}
        >
          <MenuIcon size={22} />
        </button>
      </div>

      <div style={{ marginTop: '-0.25rem', marginBottom: '1rem' }}>
        <InfoRibbon text={diagramInfoText} />
      </div>
      
      {/* Controls Panel */}
      {showControlsPanel && (
        <div className="unified-controls-panel trend-chart-controls-panel" ref={panelRef}>
          <div className="unified-controls-header">
            <div className="unified-controls-tabs">
              <div className="unified-tab active">
                <MenuIcon size={16} />
                Movement Filters
              </div>
            </div>
            <button className="unified-close-button" onClick={() => setShowControlsPanel(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="unified-controls-content">
            <div className="unified-tab-content">
              <div className="unified-tab-body">
                <div className="chart-settings-content">
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Movement Types
                    </label>
                    {!availablePositiveInDiagram && !availableNegativeInDiagram ? (
                      <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                        No movements are available for the current data.
                      </p>
                    ) : (
                      <>
                        {availablePositiveInDiagram && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={showPositive}
                              onChange={(e) => setShowPositive(e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '13px', color: '#374151' }}>Positive Movements</span>
                          </label>
                        )}
                        {availableNegativeInDiagram && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={showNegative}
                              onChange={(e) => setShowNegative(e.target.checked)}
                              style={{ cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '13px', color: '#374151' }}>Negative Movements</span>
                          </label>
                        )}
                      </>
                    )}
                  </div>
                  
                  <div style={{ marginBottom: '20px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Merge additional quadrants into diagram
                    </label>
                    <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px' }}>
                      The Movement Flow Visualization always stays in a fixed 2×2 layout. Only Loyalists can include {isClassicModel ? 'Apostles' : 'Advocates'} and/or {isClassicModel ? 'Near-Apostles' : 'Near-Advocates'}, and only Defectors can include {isClassicModel ? 'Terrorists' : 'Trolls'}.
                    </p>

                    <div style={{ display: 'grid', gap: '10px' }}>
                      {hasAdvocatesToMerge && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={mergeAdvocatesIntoLoyalists}
                            onChange={(e) => setMergeAdvocatesIntoLoyalists(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '13px', color: '#374151' }}>
                            Count {isClassicModel ? 'Apostles' : 'Advocates'} as Loyalists
                          </span>
                        </label>
                      )}

                      {hasNearAdvocatesToMerge && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={mergeNearAdvocatesIntoLoyalists}
                            onChange={(e) => setMergeNearAdvocatesIntoLoyalists(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '13px', color: '#374151' }}>
                            Count {isClassicModel ? 'Near-Apostles' : 'Near-Advocates'} as Loyalists
                          </span>
                        </label>
                      )}

                      {hasTrollsToMerge && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={mergeTrollsIntoDefectors}
                            onChange={(e) => setMergeTrollsIntoDefectors(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '13px', color: '#374151' }}>
                            Count {isClassicModel ? 'Terrorists' : 'Trolls'} as Defectors
                          </span>
                        </label>
                      )}

                      {!hasAdvocatesToMerge && !hasNearAdvocatesToMerge && !hasTrollsToMerge && (
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>
                          No additional quadrants are present to merge.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="unified-tab-footer">
                <button 
                  className="unified-reset-button" 
                  onClick={() => {
                    setShowPositive(true);
                    setShowNegative(true);
                    setMergeAdvocatesIntoLoyalists(false);
                    setMergeNearAdvocatesIntoLoyalists(false);
                    setMergeTrollsIntoDefectors(false);
                  }}
                >
                  Reset to Default
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="movement-diagram-container">
        <div style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
        <div
          className="movement-quadrant-grid"
          style={showDiagramEmptyState ? { filter: 'blur(1.5px)', opacity: 0.55 } : undefined}
        >
          {/* Render quadrants without individual SVGs */}
          {diagramQuadrants.map(quadrant => (
            <div
              key={quadrant}
              className={`draggable-quadrant ${quadrant}`}
            >
              <div className="quadrant-title">{getQuadrantDisplayName(quadrant, isClassicModel)}</div>
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
                  <g
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCircleClick(e, item.quadrant, item.destQuadrant);
                    }}
                  >
                    <circle
                      cx={item.absoluteStart.x}
                      cy={item.absoluteStart.y}
                      r={circleRadius}
                      fill="#fff"
                      stroke={QUADRANT_COLORS[item.destQuadrant]}
                      strokeWidth={borderWidth}
                      pointerEvents="all"
                    />
                    <text
                      x={item.absoluteStart.x}
                      y={item.absoluteStart.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="3"
                      fontWeight="700"
                      fontFamily="'Lato', sans-serif"
                      fill={QUADRANT_COLORS[item.quadrant]}
                      dy="0.1"
                      pointerEvents="none"
                    >
                      {item.count}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {showDiagramEmptyState && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 30,
              pointerEvents: 'none'
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '12px 14px',
                maxWidth: '380px',
                textAlign: 'center',
                boxShadow: '0 6px 18px rgba(0,0,0,0.08)'
              }}
            >
              <div style={{ fontWeight: 700, color: '#111827', marginBottom: '6px' }}>
                {emptyStateTitle}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.4 }}>
                {emptyStateMessage}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
      
      {/* Customer list modal */}
      {clickedMovement && (
        <ProximityPointInfoBox
          points={clickedMovement.points}
          position={clickedMovement.position}
          quadrant={clickedMovement.toQuadrant}
          onClose={() => setClickedMovement(null)}
          context="distribution"
          customTitle={`${getQuadrantDisplayName(clickedMovement.fromQuadrant, isClassicModel)} to ${getQuadrantDisplayName(clickedMovement.toQuadrant, isClassicModel)}`}
        />
      )}
    </div>
  );
};
