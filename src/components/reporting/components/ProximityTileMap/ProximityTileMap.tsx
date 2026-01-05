import React, { useMemo } from 'react';
import { DataPoint, ScaleFormat } from '../../../../types/base';
import './ProximityTileMap.css';

interface ProximityTileMapProps {
  data: DataPoint[];
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  midpoint: { sat: number; loy: number };
  isClassicModel: boolean;
  showSpecialZones?: boolean;
  includeSpecialGroups?: boolean;
  // Authoritative proximity analysis and distribution (optional)
  proximityAnalysis?: any;
  contextDistribution?: Record<string, number>;
}

interface ProximityGroup {
  id: string;
  label: string;
  count: number;
  color: string;
  percentage: number;
  category: 'quadrant_boundary' | 'special_zone' | 'solid' | 'special_group';
}

export const ProximityTileMap: React.FC<ProximityTileMapProps> = ({
  data,
  satisfactionScale,
  loyaltyScale,
  midpoint,
  isClassicModel,
  showSpecialZones = false,
  includeSpecialGroups = false,
  proximityAnalysis,
  contextDistribution
}) => {
  // Calculate maximum scale values
  const maxSat = parseInt(satisfactionScale.split('-')[1]);
  const maxLoy = parseInt(loyaltyScale.split('-')[1]);

  // Legacy threshold kept only for fallback when analysis is not provided
  const PROXIMITY_THRESHOLD = 1;

  // Get terminology based on classic or modern model
  const terminology = {
    apostles: isClassicModel ? 'Apostles' : 'Advocates',
    terrorists: isClassicModel ? 'Terrorists' : 'Trolls',
  };

  // Calculate proximity groups
  const proximityGroups = useMemo(() => {
    // Initialize groups
    const groups: Record<string, number> = {
      // Points near quadrant boundaries
      loyalists_near_mercenaries: 0,
      loyalists_near_hostages: 0,
      mercenaries_near_loyalists: 0,
      mercenaries_near_defectors: 0,
      hostages_near_loyalists: 0,
      hostages_near_defectors: 0,
      defectors_near_mercenaries: 0,
      defectors_near_hostages: 0,
      
      // Points near special zones if enabled
      near_apostles: 0,
      near_terrorists: 0,
      
      // Special groups if enabled
      apostles: 0,
      terrorists: 0,
      
      // Points firmly in their quadrants (not near any boundary)
      solid_loyalists: 0,
      solid_mercenaries: 0,
      solid_hostages: 0,
      solid_defectors: 0,
    };

    // If authoritative analysis is provided, use it to populate groups
    if (proximityAnalysis && proximityAnalysis.analysis) {
      try {
        groups.loyalists_near_mercenaries = proximityAnalysis.analysis.loyalists_close_to_mercenaries?.customerCount || 0;
        groups.loyalists_near_hostages = proximityAnalysis.analysis.loyalists_close_to_hostages?.customerCount || 0;
        groups.mercenaries_near_loyalists = proximityAnalysis.analysis.mercenaries_close_to_loyalists?.customerCount || 0;
        groups.mercenaries_near_defectors = proximityAnalysis.analysis.mercenaries_close_to_defectors?.customerCount || 0;
        groups.hostages_near_loyalists = proximityAnalysis.analysis.hostages_close_to_loyalists?.customerCount || 0;
        groups.hostages_near_defectors = proximityAnalysis.analysis.hostages_close_to_defectors?.customerCount || 0;
        groups.defectors_near_mercenaries = proximityAnalysis.analysis.defectors_close_to_mercenaries?.customerCount || 0;
        groups.defectors_near_hostages = proximityAnalysis.analysis.defectors_close_to_hostages?.customerCount || 0;

        // Special zones proximity (if present in analysis)
        if (showSpecialZones && proximityAnalysis.specialZones) {
          // Map near apostles if available (optional)
          // groups.near_apostles could be derived when those endpoints exist
        }

        // Special groups counts (optional visual)
        if (includeSpecialGroups) {
          const totalApostles = contextDistribution?.apostles || 0;
          const totalTerrorists = contextDistribution?.terrorists || 0;
          groups.apostles = totalApostles;
          groups.terrorists = totalTerrorists;
        }

        // Solid counts derived from context distribution minus proximity
        if (contextDistribution) {
          groups.solid_loyalists = Math.max(0, (contextDistribution.loyalists || 0) - groups.loyalists_near_mercenaries - groups.loyalists_near_hostages);
          groups.solid_mercenaries = Math.max(0, (contextDistribution.mercenaries || 0) - groups.mercenaries_near_loyalists - groups.mercenaries_near_defectors);
          groups.solid_hostages = Math.max(0, (contextDistribution.hostages || 0) - groups.hostages_near_loyalists - groups.hostages_near_defectors);
          groups.solid_defectors = Math.max(0, (contextDistribution.defectors || 0) - groups.defectors_near_mercenaries - groups.defectors_near_hostages);
        }

        return groups;
      } catch (e) {
        // If analysis cannot be consumed, fallback to legacy calculation
      }
    }

    // Fallback legacy calculation (kept for safety if analysis not provided)
    data.forEach(point => {
      if (point.excluded) return;
      
      const { satisfaction: sat, loyalty: loy } = point;
      
      // Check for special groups first if including them
      if (includeSpecialGroups) {
        if (sat === maxSat && loy === maxLoy) {
          groups.apostles++;
          return;
        }
        
        if (sat === 1 && loy === 1) {
          groups.terrorists++;
          return;
        }
      }
      
      // Determine base quadrant
      const isHighSat = sat >= midpoint.sat;
      const isHighLoy = loy >= midpoint.loy;
      
      // Check for special zones if enabled
      if (showSpecialZones) {
        // Check for near apostles
        if (sat >= maxSat - PROXIMITY_THRESHOLD && sat < maxSat && 
            loy >= maxLoy - PROXIMITY_THRESHOLD && loy < maxLoy) {
          groups.near_apostles++;
          return;
        }
        
        // Check for near terrorists
        if (sat <= 1 + PROXIMITY_THRESHOLD && sat > 1 && 
            loy <= 1 + PROXIMITY_THRESHOLD && loy > 1) {
          groups.near_terrorists++;
          return;
        }
      }

      // Determine quadrant and proximity (legacy threshold)
      if (isHighSat && isHighLoy) {
        // Loyalists quadrant
        if (sat - midpoint.sat <= PROXIMITY_THRESHOLD) {
          groups.loyalists_near_hostages++;
        } else if (loy - midpoint.loy <= PROXIMITY_THRESHOLD) {
          groups.loyalists_near_mercenaries++;
        } else {
          groups.solid_loyalists++;
        }
      } else if (isHighSat && !isHighLoy) {
        // Mercenaries quadrant
        if (sat - midpoint.sat <= PROXIMITY_THRESHOLD) {
          groups.mercenaries_near_defectors++;
        } else if (midpoint.loy - loy <= PROXIMITY_THRESHOLD) {
          groups.mercenaries_near_loyalists++;
        } else {
          groups.solid_mercenaries++;
        }
      } else if (!isHighSat && isHighLoy) {
        // Hostages quadrant
        if (midpoint.sat - sat <= PROXIMITY_THRESHOLD) {
          groups.hostages_near_loyalists++;
        } else if (loy - midpoint.loy <= PROXIMITY_THRESHOLD) {
          groups.hostages_near_defectors++;
        } else {
          groups.solid_hostages++;
        }
      } else {
        // Defectors quadrant
        if (midpoint.sat - sat <= PROXIMITY_THRESHOLD) {
          groups.defectors_near_mercenaries++;
        } else if (midpoint.loy - loy <= PROXIMITY_THRESHOLD) {
          groups.defectors_near_hostages++;
        } else {
          groups.solid_defectors++;
        }
      }
    });

    return groups;
  }, [data, midpoint, maxSat, maxLoy, showSpecialZones, includeSpecialGroups, proximityAnalysis, contextDistribution]);

  // Format data for display
  const formattedGroups: ProximityGroup[] = useMemo(() => {
    const totalPoints = data.filter(point => !point.excluded).length;
    
    const groupConfigs: Record<string, {
      label: string;
      color: string;
      category: 'quadrant_boundary' | 'special_zone' | 'solid' | 'special_group';
    }> = {
      // Points near quadrant boundaries
      loyalists_near_mercenaries: {
        label: 'Loyalists Near Mercenaries',
        color: '#4CAF50', // Green with yellow tint
        category: 'quadrant_boundary'
      },
      loyalists_near_hostages: {
        label: 'Loyalists Near Hostages',
        color: '#4CAF50', // Green with blue tint
        category: 'quadrant_boundary'
      },
      mercenaries_near_loyalists: {
        label: 'Mercenaries Near Loyalists',
        color: '#F7B731', // Yellow with green tint
        category: 'quadrant_boundary'
      },
      mercenaries_near_defectors: {
        label: 'Mercenaries Near Defectors',
        color: '#F7B731', // Yellow with red tint
        category: 'quadrant_boundary'
      },
      hostages_near_loyalists: {
        label: 'Hostages Near Loyalists',
        color: '#4682B4', // Blue with green tint
        category: 'quadrant_boundary'
      },
      hostages_near_defectors: {
        label: 'Hostages Near Defectors',
        color: '#4682B4', // Blue with red tint
        category: 'quadrant_boundary'
      },
      defectors_near_mercenaries: {
        label: 'Defectors Near Mercenaries',
        color: '#DC2626', // Red with yellow tint
        category: 'quadrant_boundary'
      },
      defectors_near_hostages: {
        label: 'Defectors Near Hostages',
        color: '#DC2626', // Red with blue tint
        category: 'quadrant_boundary'
      },
      
      // Points near special zones
      near_apostles: {
        label: `Near ${terminology.apostles}`,
        color: '#10B981', // Emerald green
        category: 'special_zone'
      },
      near_terrorists: {
        label: `Near ${terminology.terrorists}`,
        color: '#EF4444', // Bright red
        category: 'special_zone'
      },
      
      // Special groups
      apostles: {
        label: terminology.apostles,
        color: '#059669', // Darker green
        category: 'special_group'
      },
      terrorists: {
        label: terminology.terrorists,
        color: '#B91C1C', // Darker red
        category: 'special_group'
      },
      
      // Solid points
      solid_loyalists: {
        label: 'Solid Loyalists',
        color: '#15803D', // Dark green
        category: 'solid'
      },
      solid_mercenaries: {
        label: 'Solid Mercenaries',
        color: '#B45309', // Dark yellow/amber
        category: 'solid'
      },
      solid_hostages: {
        label: 'Solid Hostages',
        color: '#1E40AF', // Dark blue
        category: 'solid'
      },
      solid_defectors: {
        label: 'Solid Defectors',
        color: '#991B1B', // Dark red
        category: 'solid'
      },
    };

    // Convert to array, filter out zero counts, and sort by count (descending)
    return Object.entries(proximityGroups)
      .filter(([_, count]) => count > 0)
      .map(([key, count]) => ({
        id: key,
        label: groupConfigs[key].label,
        count,
        color: groupConfigs[key].color,
        percentage: (count / totalPoints) * 100,
        category: groupConfigs[key].category
      }))
      .sort((a, b) => b.count - a.count);
  }, [proximityGroups, terminology, data]);

  // No data case
  if (formattedGroups.length === 0) {
    return (
      <div className="proximity-empty-state">
        <p>No proximity data available</p>
        <p className="proximity-empty-subtext">Try adjusting the midpoint or scales</p>
      </div>
    );
  }

  // Calculate the size of each tile proportionally
  const calculateTileSize = (percentage: number): string => {
    // Ensure minimum size for visibility
    const minSize = 4; // Minimum percentage size
    return `${Math.max(minSize, percentage)}%`;
  };

  return (
    <div className="proximity-tile-map">
      <div className="tile-container">
        {formattedGroups.map((group, index) => (
          <div
            key={index}
            className={`proximity-tile ${group.category}`}
            style={{
              backgroundColor: group.color,
              width: calculateTileSize(group.percentage),
              height: calculateTileSize(group.percentage),
              opacity: 0.75 + (0.25 * (group.percentage / 100))
            }}
            title={`${group.label}: ${group.count} (${group.percentage.toFixed(1)}%)`}
          >
            <div className="tile-content">
              <div className="tile-label" translate="no">{group.label}</div>
              <div className="tile-count">{group.count}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProximityTileMap;