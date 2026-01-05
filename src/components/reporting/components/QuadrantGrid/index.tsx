import React, { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';


interface QuadrantData {
  type: 'loyalists' | 'hostages' | 'mercenaries' | 'defectors';
  title: string;
  value: number;
  total: number;
}

interface QuadrantGridProps {
  quadrants: QuadrantData[];
  isPremium?: boolean;
}

export const QuadrantGrid: React.FC<QuadrantGridProps> = ({ 
  quadrants: initialQuadrants,
  isPremium = false
}) => {
  const [quadrants, setQuadrants] = useState(initialQuadrants);

  const moveQuadrant = useCallback((dragIndex: number, hoverIndex: number) => {
    if (!isPremium) return;
    
    setQuadrants(prevQuadrants => {
      const newQuadrants = [...prevQuadrants];
      const [removed] = newQuadrants.splice(dragIndex, 1);
      newQuadrants.splice(hoverIndex, 0, removed);
      return newQuadrants;
    });
  }, [isPremium]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="report-quadrant-grid">
        {quadrants.map((quadrant, index) => (
          <div 
  key={quadrant.type}
  className={`draggable-quadrant ${quadrant.type}`}
>
  <div className="quadrant-title" translate="no">{quadrant.title}</div>
  <div className="quadrant-value">{quadrant.value}</div>
  <div className="quadrant-subtext">
    ({((quadrant.value / quadrant.total) * 100).toFixed(1)}%)
  </div>
</div>
        ))}
      </div>
    </DndProvider>
  );
};