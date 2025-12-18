import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Users, FolderOpen } from 'lucide-react';
import './ProximityList.css';
import { ProximityDisplaySettings, createDefaultProximityDisplaySettings } from './ProximityDisplayMenu';

interface ProximityDetail {
  customerCount: number;
  positionCount: number;
  averageDistance: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  customers: Array<{
    id: string;
    name?: string;
    satisfaction: number;
    loyalty: number;
    distanceFromBoundary: number;
    currentQuadrant: string;
    proximityTargets: string[];
    riskScore: number;
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  }>;
}

interface ProximityAnalysisLike {
  analysis: Record<string, ProximityDetail>;
  summary?: {
    totalProximityCustomers: number;
    totalProximityPositions: number;
  };
  settings?: {
    totalCustomers: number;
  };
}

interface ProximityListProps {
  proximityAnalysis: ProximityAnalysisLike;
  totalCustomers: number;
  isClassicModel?: boolean;
  isPremium?: boolean;
  displaySettings?: ProximityDisplaySettings;
}

interface ProximityItem {
  key: string;
  label: string;
  count: number;
  pct: number;
  baseQuadrant: string;
  targetQuadrant: string;
  baseColour: string;
  targetColour: string;
  textColour: string;
  isWarning: boolean;
  isOpportunity: boolean;
  explanation: string;
  detail: ProximityDetail | null;
  strategicImpact: number;
  averageDistance: number;
  isHighImpact?: boolean;
  isGroup?: boolean;
  groupItems?: ProximityItem[];
}

// Function to get relation labels based on terminology
const getRelationLabels = (isClassicModel: boolean): Record<string, string> => ({
  // Lateral proximity relationships
  loyalists_close_to_hostages: 'Loyalists Nearly Hostages',
  loyalists_close_to_mercenaries: 'Loyalists Nearly Mercenaries',
  hostages_close_to_loyalists: 'Hostages Nearly Loyalists',
  hostages_close_to_defectors: 'Hostages Nearly Defectors',
  mercenaries_close_to_loyalists: 'Mercenaries Nearly Loyalists',
  mercenaries_close_to_defectors: 'Mercenaries Nearly Defectors',
  defectors_close_to_hostages: 'Defectors Nearly Hostages',
  defectors_close_to_mercenaries: 'Defectors Nearly Mercenaries',
  // Diagonal proximity relationships (crisis movements)
  loyalists_close_to_defectors: 'Loyalists Nearly Defectors',
  mercenaries_close_to_hostages: 'Mercenaries Nearly Hostages',
  hostages_close_to_mercenaries: 'Hostages Nearly Mercenaries',
  defectors_close_to_loyalists: 'Defectors Nearly Loyalists',
  // Special zone proximity relationships - DYNAMIC based on terminology
  loyalists_close_to_apostles: `Loyalists Nearly ${isClassicModel ? 'Apostles' : 'Advocates'}`,
  loyalists_close_to_near_apostles: `Loyalists Nearly ${isClassicModel ? 'Near-Apostles' : 'Near-Advocates'}`,
  near_apostles_close_to_apostles: `${isClassicModel ? 'Near-Apostles' : 'Near-Advocates'} Nearly ${isClassicModel ? 'Apostles' : 'Advocates'}`,
  defectors_close_to_terrorists: `Defectors Nearly ${isClassicModel ? 'Terrorists' : 'Trolls'}`,
  // Reverse movements (from special zones back to main quadrants)
  apostles_close_to_loyalists: `${isClassicModel ? 'Apostles' : 'Advocates'} Nearly Loyalists`,
  near_apostles_close_to_loyalists: `${isClassicModel ? 'Near-Apostles' : 'Near-Advocates'} Nearly Loyalists`,
  terrorists_close_to_defectors: `${isClassicModel ? 'Terrorists' : 'Trolls'} Nearly Defectors`
});

// Strategic group classifications
// WARNING: Movements towards worse segments (negative)
const WARNING_GROUPS = [
  'loyalists_close_to_mercenaries',
  'loyalists_close_to_hostages', 
  'mercenaries_close_to_defectors',
  'hostages_close_to_defectors',
  'defectors_close_to_terrorists',
  // Diagonal warning relationships (crisis movements)
  'loyalists_close_to_defectors',
  'mercenaries_close_to_hostages',
  // Special zones: moving backwards from top zones (when special zones enabled)
  'apostles_close_to_loyalists',
  'near_apostles_close_to_loyalists'
];

// OPPORTUNITY: Movements towards better segments (positive)
const OPPORTUNITY_GROUPS = [
  'mercenaries_close_to_loyalists',
  'hostages_close_to_loyalists',
  'defectors_close_to_mercenaries',
  'defectors_close_to_hostages',
  'loyalists_close_to_apostles',
  'loyalists_close_to_near_apostles',
  'near_apostles_close_to_apostles',
  // Diagonal opportunity relationships (redemption movements)
  'hostages_close_to_mercenaries',
  'defectors_close_to_loyalists',
  // Special zones: moving up from worst zone (when special zones enabled)
  'terrorists_close_to_defectors'
];

// Function to get proximity explanations based on terminology
const getProximityExplanations = (isClassicModel: boolean): Record<string, string> => ({
  loyalists_close_to_mercenaries: 'These customers are positioned nearly the mercenaries boundary',
  loyalists_close_to_hostages: 'These customers are positioned nearly the hostages boundary',
  hostages_close_to_loyalists: 'These customers are positioned nearly the loyalists boundary',
  hostages_close_to_defectors: 'These customers are positioned nearly the defectors boundary',
  mercenaries_close_to_loyalists: 'These customers are positioned nearly the loyalists boundary',
  mercenaries_close_to_defectors: 'These customers are positioned nearly the defectors boundary',
  defectors_close_to_mercenaries: 'These customers are positioned nearly the mercenaries boundary',
  defectors_close_to_hostages: 'These customers are positioned nearly the hostages boundary',
  // Diagonal proximity explanations (crisis movements)
  loyalists_close_to_defectors: 'These customers are positioned nearly the defectors boundary (crisis diagonal)',
  mercenaries_close_to_hostages: 'These customers are positioned nearly the hostages boundary (disappointment diagonal)',
  hostages_close_to_mercenaries: 'These customers are positioned nearly the mercenaries boundary (switching diagonal)',
  defectors_close_to_loyalists: 'These customers are positioned nearly the loyalists boundary (redemption diagonal)',
  // Special zone proximity explanations - DYNAMIC based on terminology
  loyalists_close_to_apostles: `These customers are positioned nearly the ${isClassicModel ? 'apostles' : 'advocates'} zone`,
  loyalists_close_to_near_apostles: `These customers are positioned nearly the ${isClassicModel ? 'near apostles' : 'near advocates'} zone`,
  near_apostles_close_to_apostles: `These customers are positioned nearly the ${isClassicModel ? 'apostles' : 'advocates'} zone from the ${isClassicModel ? 'near apostles' : 'near advocates'} zone`,
  defectors_close_to_terrorists: `These customers are positioned nearly the ${isClassicModel ? 'terrorists' : 'trolls'} zone`,
  // Reverse movements - special zones back to main quadrants
  apostles_close_to_loyalists: `These ${isClassicModel ? 'apostles' : 'advocates'} are at risk of dropping back to the loyalists zone`,
  near_apostles_close_to_loyalists: `These ${isClassicModel ? 'near-apostles' : 'near-advocates'} are at risk of dropping back to the loyalists zone`,
  terrorists_close_to_defectors: `These ${isClassicModel ? 'terrorists' : 'trolls'} are positioned nearly the defectors zone (improvement opportunity)`
});

// Brand colours rendered as subtle rgba for professional look
const BASE_COLOURS: Record<string, string> = {
  loyalists: 'rgba(76, 175, 80, 0.30)',       // #4CAF50 @ 30%
  mercenaries: 'rgba(247, 183, 49, 0.30)',    // #F7B731 @ 30%
  hostages: 'rgba(70, 130, 180, 0.30)',       // #4682B4 @ 30%
  defectors: 'rgba(220, 38, 38, 0.30)',       // #DC2626 @ 30%
  apostles: 'rgba(16, 185, 129, 0.30)',       // #10B981 @ 30%
  near_apostles: 'rgba(16, 185, 129, 0.20)',  // #10B981 @ 20%
  terrorists: 'rgba(239, 68, 68, 0.30)'       // #EF4444 @ 30%
};

const TARGET_COLOURS: Record<string, string> = {
  loyalists: 'rgba(76, 175, 80, 0.20)',       // #4CAF50 @ 20%
  mercenaries: 'rgba(247, 183, 49, 0.20)',    // #F7B731 @ 20%
  hostages: 'rgba(70, 130, 180, 0.20)',       // #4682B4 @ 20%
  defectors: 'rgba(220, 38, 38, 0.20)',       // #DC2626 @ 20%
  apostles: 'rgba(16, 185, 129, 0.20)',       // #10B981 @ 20%
  near_apostles: 'rgba(16, 185, 129, 0.15)',  // #10B981 @ 15%
  terrorists: 'rgba(239, 68, 68, 0.20)'       // #EF4444 @ 20%
};

// Solid colors for text (same base colors but solid)
const TEXT_COLOURS: Record<string, string> = {
  loyalists: '#4CAF50',       // Green
  mercenaries: '#F7B731',     // Orange
  hostages: '#4682B4',        // Blue  
  defectors: '#DC2626',       // Red
  apostles: '#10B981',        // Emerald
  near_apostles: '#10B981',   // Emerald
  terrorists: '#EF4444'       // Red
};

function getBaseQuadrantFromKey(key: string): string {
  return key.split('_close_to_')[0];
}

function getTargetQuadrantFromKey(key: string): string {
  return key.split('_close_to_')[1];
}

// Helper function to format segment names (e.g., "near_apostles" -> "Near-Apostles")
function formatSegmentName(region: string): string {
  return region
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-');
}

// Custom Tooltip Component
interface CustomTooltipProps {
  type: 'opportunity' | 'warning';
  isVisible: boolean;
  position: { top: number; left: number };
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ type, isVisible, position }) => {
  if (!isVisible) return null;

  const isOpportunity = type === 'opportunity';
  const icon = isOpportunity ? '💡' : '⚠️';
  const label = isOpportunity ? 'Opportunity' : 'Warning';
  const description = isOpportunity ? 'Positive customer movement' : 'Negative customer movement';
  const borderColor = isOpportunity ? '#4CAF50' : '#DC2626';

  return (
    <div
      className="custom-tooltip"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        zIndex: 1000,
        pointerEvents: 'none'
      }}
    >
      <div 
        className="custom-tooltip-content"
        style={{
          borderColor: borderColor
        }}
      >
        <div className="tooltip-header">
          <span className="tooltip-icon">{icon}</span>
          <span className="tooltip-label">{label}</span>
        </div>
        <div className="tooltip-description">{description}</div>
      </div>
    </div>
  );
};

export const ProximityList: React.FC<ProximityListProps> = ({
  proximityAnalysis,
  totalCustomers,
  isClassicModel = true,
  isPremium = false,
  displaySettings: externalDisplaySettings
}) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [expandedGroupItem, setExpandedGroupItem] = useState<string | null>(null);
  const [showAllCustomers, setShowAllCustomers] = useState<Record<string, boolean>>({});
  const [tooltip, setTooltip] = useState<{ type: 'opportunity' | 'warning'; isVisible: boolean; position: { top: number; left: number } }>({
    type: 'opportunity',
    isVisible: false,
    position: { top: 0, left: 0 }
  });
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use external display settings if provided, otherwise use internal state
  const [internalDisplaySettings, setInternalDisplaySettings] = useState<ProximityDisplaySettings>(() => createDefaultProximityDisplaySettings());
  
  // Use external settings if provided, otherwise use internal state
  const displaySettings = externalDisplaySettings || internalDisplaySettings;
  
  const handleSettingsChange = (newSettings: ProximityDisplaySettings) => {
    if (externalDisplaySettings) {
      // If external settings are provided, we can't change them here
      // This shouldn't happen since the hamburger menu is now in the parent
      console.warn('Cannot change display settings - they are controlled by parent component');
      return;
    }
    
    setInternalDisplaySettings(newSettings);
    
    // Debug logging for high-impact feature toggle
    if (newSettings.highlightHighImpact !== displaySettings.highlightHighImpact) {
      console.log(`🎯 High-Impact feature ${newSettings.highlightHighImpact ? 'ENABLED' : 'DISABLED'}`);
    }
  };

  const handleResetSettings = () => {
    if (externalDisplaySettings) {
      console.warn('Cannot reset display settings - they are controlled by parent component');
      return;
    }
    setInternalDisplaySettings(createDefaultProximityDisplaySettings());
  };

  // Tooltip handlers
  const handleMouseEnter = (e: React.MouseEvent, type: 'opportunity' | 'warning') => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      type,
      isVisible: true,
      position: {
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX + rect.width / 2
      }
    });
  };

  const handleMouseLeave = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setTooltip(prev => ({ ...prev, isVisible: false }));
    }, 100);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  const items = useMemo((): ProximityItem[] => {
    const entries = Object.entries(proximityAnalysis.analysis || {});
    
    // Get relation labels and explanations based on terminology
    const relationLabels = getRelationLabels(isClassicModel);
    const proximityExplanations = getProximityExplanations(isClassicModel);
    
    // Calculate high-impact threshold based on method
    let highImpactThreshold = 0;
    if (displaySettings.highlightHighImpact) {
      switch (displaySettings.highImpactMethod) {
        case 'smart':
          // Calculate top 20% by volume - sort all entries by customer count and take top 20%
          const sortedByCount = entries
            .filter(([_, detail]) => detail && typeof detail === 'object' && (detail.customerCount || 0) > 0)
            .sort((a, b) => (b[1]?.customerCount || 0) - (a[1]?.customerCount || 0));
          const top20Count = Math.max(1, Math.ceil(sortedByCount.length * 0.2));
          highImpactThreshold = sortedByCount.length > 0 ? (sortedByCount[top20Count - 1]?.[1]?.customerCount || 0) : 0;
          break;
        case 'highBar':
          highImpactThreshold = Math.ceil(totalCustomers * 0.10); // 10%
          break;
        case 'standard':
          highImpactThreshold = Math.ceil(totalCustomers * 0.05); // 5%
          break;
        case 'sensitive':
          highImpactThreshold = Math.ceil(totalCustomers * 0.02); // 2%
          break;
      }
    }
    
    // Apply filtering based on display settings
    let filtered = entries.filter(([key, detail]) => {
      const count = detail?.customerCount || 0;
      const isWarning = WARNING_GROUPS.includes(key);
      const isOpportunity = OPPORTUNITY_GROUPS.includes(key);
      
      if (!displaySettings.showEmptyCategories && count === 0) {
        return false;
      }
      
      if (!displaySettings.showOpportunities && isOpportunity) {
        return false;
      }
      
      if (!displaySettings.showWarnings && isWarning) {
        return false;
      }

      return true;
    });
    
    // Map to items with all properties
    const mapped = filtered.map(([key, detail]) => {
      const label = relationLabels[key] || key;
      const baseQuadrant = getBaseQuadrantFromKey(key);
      const targetQuadrant = getTargetQuadrantFromKey(key);
      const count = detail?.customerCount || 0;
      const pct = totalCustomers > 0 ? (count / totalCustomers) * 100 : 0;
      const baseColour = BASE_COLOURS[baseQuadrant] || '#6B7280';
      const targetColour = TARGET_COLOURS[targetQuadrant] || '#9CA3AF';
      const textColour = TEXT_COLOURS[baseQuadrant] || '#374151';
      
      // Determine strategic classification
      const isWarning = WARNING_GROUPS.includes(key);
      const isOpportunity = OPPORTUNITY_GROUPS.includes(key);
      const explanation = proximityExplanations[key];
      
      // Calculate strategic impact score (higher is better)
      const strategicImpact = isOpportunity ? (count * 2) : (isWarning ? count * 0.5 : count);
      
      // Determine if this is a high-impact relationship
      const isHighImpact = displaySettings.highlightHighImpact && count >= highImpactThreshold;
      
      // Debug logging for high-impact feature
      if (displaySettings.highlightHighImpact && isHighImpact) {
        console.log(`🌟 HIGH-IMPACT: ${label} - Count: ${count}, Pct: ${pct.toFixed(1)}%, Opportunity: ${isOpportunity}`);
      }
      
      return { 
        key, 
        label, 
        count, 
        pct, 
        baseQuadrant, 
        targetQuadrant, 
        baseColour, 
        targetColour,
        textColour,
        isWarning,
        isOpportunity,
        explanation,
        detail,
        strategicImpact,
        averageDistance: detail?.averageDistance || 0,
        isHighImpact
      };
    });
    
    // Apply sorting based on display settings
    const sorted = mapped.sort((a, b) => {
      switch (displaySettings.sortBy) {
        case 'customerCount':
          return b.count - a.count;
        case 'averageDistance':
          return a.averageDistance - b.averageDistance;
        case 'strategicImpact':
          return b.strategicImpact - a.strategicImpact;
        case 'alphabetical':
          return a.label.localeCompare(b.label);
        default:
          return b.count - a.count;
      }
    });
    
    // Apply grouping based on display settings
    if (displaySettings.grouping === 'flat') {
      return sorted;
    }
    
    // Group by source region
    if (displaySettings.grouping === 'bySourceRegion') {
      const grouped: Record<string, typeof sorted> = {};
      sorted.forEach(item => {
        if (!grouped[item.baseQuadrant]) {
          grouped[item.baseQuadrant] = [];
        }
        grouped[item.baseQuadrant].push(item);
      });
      
      return Object.entries(grouped).map(([region, items]) => ({
        key: `group_${region}`,
        label: `${formatSegmentName(region)} Segment`,
        count: items.reduce((sum, item) => sum + item.count, 0),
        pct: 0,
        baseQuadrant: region,
        targetQuadrant: '',
        baseColour: BASE_COLOURS[region] || '#6B7280',
        targetColour: '#9CA3AF',
        textColour: TEXT_COLOURS[region] || '#374151',
        isWarning: false,
        isOpportunity: false,
        explanation: `All proximity relationships from the ${region} segment`,
        detail: null,
        strategicImpact: 0,
        averageDistance: 0,
        isGroup: true,
        groupItems: items
      }));
    }
    
    // Group by strategic priority
    if (displaySettings.grouping === 'byStrategicPriority') {
      const opportunities = sorted.filter(item => item.isOpportunity);
      const warnings = sorted.filter(item => item.isWarning);
      const neutral = sorted.filter(item => !item.isOpportunity && !item.isWarning);
      
      const groups = [];
      if (opportunities.length > 0) {
        groups.push({
          key: 'group_opportunities',
          label: 'Conversion Opportunities',
          count: opportunities.reduce((sum, item) => sum + item.count, 0),
          pct: 0,
          baseQuadrant: 'opportunities',
          targetQuadrant: '',
          baseColour: 'rgba(76, 175, 80, 0.30)',
          targetColour: '#9CA3AF',
          textColour: '#4CAF50',
          isWarning: false,
          isOpportunity: true,
          explanation: 'Positive movements toward better segments',
          detail: null,
          strategicImpact: 0,
          averageDistance: 0,
          isGroup: true,
          groupItems: opportunities
        });
      }
      
      if (warnings.length > 0) {
        groups.push({
          key: 'group_warnings',
          label: 'Risk Warnings',
          count: warnings.reduce((sum, item) => sum + item.count, 0),
          pct: 0,
          baseQuadrant: 'warnings',
          targetQuadrant: '',
          baseColour: 'rgba(220, 38, 38, 0.30)',
          targetColour: '#9CA3AF',
          textColour: '#DC2626',
          isWarning: true,
          isOpportunity: false,
          explanation: 'Negative movements toward worse segments',
          detail: null,
          strategicImpact: 0,
          averageDistance: 0,
          isGroup: true,
          groupItems: warnings
        });
      }
      
      if (neutral.length > 0) {
        groups.push({
          key: 'group_neutral',
          label: 'Neutral Movements',
          count: neutral.reduce((sum, item) => sum + item.count, 0),
          pct: 0,
          baseQuadrant: 'neutral',
          targetQuadrant: '',
          baseColour: 'rgba(108, 117, 125, 0.30)',
          targetColour: '#9CA3AF',
          textColour: '#6C757D',
          isWarning: false,
          isOpportunity: false,
          explanation: 'Cross-quadrant movements with neutral impact',
          detail: null,
          strategicImpact: 0,
          averageDistance: 0,
          isGroup: true,
          groupItems: neutral
        });
      }
      
      return groups;
    }
    
    // Group by distance/difficulty
    if (displaySettings.grouping === 'byDistance') {
      const oneStep = sorted.filter(item => item.averageDistance <= 1);
      const multiStep = sorted.filter(item => item.averageDistance > 1);
      
      // Split one-step by positive/negative
      const oneStepOpportunities = oneStep.filter(item => item.isOpportunity);
      const oneStepWarnings = oneStep.filter(item => item.isWarning);
      
      // Split multi-step by positive/negative
      const multiStepOpportunities = multiStep.filter(item => item.isOpportunity);
      const multiStepWarnings = multiStep.filter(item => item.isWarning);
      
      const groups = [];
      
      // One-Step Opportunities
      if (oneStepOpportunities.length > 0) {
        groups.push({
          key: 'group_one_step_opportunities',
          label: '1-Step Moves - Conversion Opportunities',
          count: oneStepOpportunities.reduce((sum, item) => sum + item.count, 0),
          pct: 0,
          baseQuadrant: 'one_step_opportunities',
          targetQuadrant: '',
          baseColour: 'rgba(76, 175, 80, 0.30)',
          targetColour: '#9CA3AF',
          textColour: '#4CAF50',
          isWarning: false,
          isOpportunity: true,
          explanation: 'Easy positive movements toward better segments',
          detail: null,
          strategicImpact: 0,
          averageDistance: 0,
          isGroup: true,
          groupItems: oneStepOpportunities
        });
      }
      
      // One-Step Warnings
      if (oneStepWarnings.length > 0) {
        groups.push({
          key: 'group_one_step_warnings',
          label: '1-Step Moves - Risk Warnings',
          count: oneStepWarnings.reduce((sum, item) => sum + item.count, 0),
          pct: 0,
          baseQuadrant: 'one_step_warnings',
          targetQuadrant: '',
          baseColour: 'rgba(220, 38, 38, 0.30)',
          targetColour: '#9CA3AF',
          textColour: '#DC2626',
          isWarning: true,
          isOpportunity: false,
          explanation: 'Easy negative movements toward worse segments',
          detail: null,
          strategicImpact: 0,
          averageDistance: 0,
          isGroup: true,
          groupItems: oneStepWarnings
        });
      }
      
      // Multi-Step Opportunities
      if (multiStepOpportunities.length > 0) {
        groups.push({
          key: 'group_multi_step_opportunities',
          label: 'Multi-Step Moves - Conversion Opportunities',
          count: multiStepOpportunities.reduce((sum, item) => sum + item.count, 0),
          pct: 0,
          baseQuadrant: 'multi_step_opportunities',
          targetQuadrant: '',
          baseColour: 'rgba(76, 175, 80, 0.30)',
          targetColour: '#9CA3AF',
          textColour: '#4CAF50',
          isWarning: false,
          isOpportunity: true,
          explanation: 'Challenging positive movements toward better segments',
          detail: null,
          strategicImpact: 0,
          averageDistance: 0,
          isGroup: true,
          groupItems: multiStepOpportunities
        });
      }
      
      // Multi-Step Warnings
      if (multiStepWarnings.length > 0) {
        groups.push({
          key: 'group_multi_step_warnings',
          label: 'Multi-Step Moves - Risk Warnings',
          count: multiStepWarnings.reduce((sum, item) => sum + item.count, 0),
          pct: 0,
          baseQuadrant: 'multi_step_warnings',
          targetQuadrant: '',
          baseColour: 'rgba(220, 38, 38, 0.30)',
          targetColour: '#9CA3AF',
          textColour: '#DC2626',
          isWarning: true,
          isOpportunity: false,
          explanation: 'Challenging negative movements toward worse segments',
          detail: null,
          strategicImpact: 0,
          averageDistance: 0,
          isGroup: true,
          groupItems: multiStepWarnings
        });
      }
      
      return groups;
    }
    
    return sorted;
  }, [proximityAnalysis, totalCustomers, displaySettings, isClassicModel]);

  const handleItemClick = (key: string) => {
    setExpandedItem(expandedItem === key ? null : key);
  };

  const handleShowAllCustomers = (key: string) => {
    setShowAllCustomers(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Helper function to get customer display name with incremental numbering for anonymous customers
  const getCustomerDisplayName = (customer: any, index: number): string => {
    // If customer has a name, use it
    if (customer.name && customer.name.trim()) return customer.name.trim();
    // If customer has email but no name, use email
    if (customer.email && customer.email.trim()) return customer.email.trim();
    // For anonymous customers, use incremental numbering starting from 1
    return `Customer ${index + 1}`;
  };

  const warning = useMemo(() => {
    // Negative movements toward defectors or away from loyalists
    const negativeKeys = [
      'mercenaries_close_to_defectors',
      'hostages_close_to_defectors',
      'loyalists_close_to_mercenaries',
      'loyalists_close_to_hostages'
    ];
    const totalNeg = negativeKeys.reduce((sum, key) => sum + (proximityAnalysis.analysis?.[key]?.customerCount || 0), 0);
    
    // Calculate total proximity customers (only those actually in proximity groups)
    const allProximityKeys = Object.keys(proximityAnalysis.analysis || {});
    const totalProximityCustomers = allProximityKeys.reduce((sum, key) => sum + (proximityAnalysis.analysis?.[key]?.customerCount || 0), 0);
    
    const pct = totalProximityCustomers > 0 ? (totalNeg / totalProximityCustomers) * 100 : 0;
    return pct >= 15 ? Math.round(pct) : 0;
  }, [proximityAnalysis]);

  const opportunity = useMemo(() => {
    // Positive movements toward loyalists
    const positiveKeys = [
      'mercenaries_close_to_loyalists',
      'hostages_close_to_loyalists',
      'defectors_close_to_mercenaries',
      'defectors_close_to_hostages'
    ];
    const totalPos = positiveKeys.reduce((sum, key) => sum + (proximityAnalysis.analysis?.[key]?.customerCount || 0), 0);
    
    // Calculate total proximity customers (only those actually in proximity groups)
    const allProximityKeys = Object.keys(proximityAnalysis.analysis || {});
    const totalProximityCustomers = allProximityKeys.reduce((sum, key) => sum + (proximityAnalysis.analysis?.[key]?.customerCount || 0), 0);
    
    const pct = totalProximityCustomers > 0 ? (totalPos / totalProximityCustomers) * 100 : 0;
    return pct >= 15 ? Math.round(pct) : 0;
  }, [proximityAnalysis]);

  // Helper function to get grouping label
  const getGroupingLabel = (): string => {
    switch (displaySettings.grouping) {
      case 'bySourceRegion':
        return 'By Segment';
      case 'byStrategicPriority':
        return 'By Strategic Priority';
      case 'byDistance':
        return 'By Distance/Difficulty';
      case 'flat':
        return 'Full List';
      default:
        return 'Full List';
    }
  };

  const renderGroupItem = (groupItem: ProximityItem) => (
    <div 
      key={groupItem.key} 
      className={`group-item ${expandedGroupItem === groupItem.key ? 'expanded' : ''}`}
      data-warning={groupItem.isWarning}
      data-opportunity={groupItem.isOpportunity}
      onClick={(e) => {
        e.stopPropagation();
        if (expandedGroupItem === groupItem.key) {
          setExpandedGroupItem(null);
        } else {
          setExpandedGroupItem(groupItem.key);
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      <div className="group-item-header">
        <span className="group-item-label" style={{ color: groupItem.textColour }}>
          {groupItem.label}
        </span>
        <span className="group-item-count">{groupItem.count} customers</span>
      </div>
      <div className="group-item-bar">
        <div
          className="group-item-bar-base"
          style={{ backgroundColor: groupItem.baseColour }}
        />
        <div className="group-item-bar-gap" />
        <div
          className="group-item-bar-target"
          style={{ backgroundColor: groupItem.targetColour }}
        />
      </div>
      {expandedGroupItem === groupItem.key && (
        <div className="group-item-expanded">
          {groupItem.isWarning && (
            <div className="warning-section">
              <div className="warning-header">
                <span className="warning-text">WARNING</span>
              </div>
              <p className="explanation">{groupItem.explanation}</p>
            </div>
          )}

          {groupItem.isOpportunity && (
            <div className="opportunity-section">
              <div className="opportunity-header">
                <span className="opportunity-text">OPPORTUNITY</span>
              </div>
              <p className="explanation">{groupItem.explanation}</p>
            </div>
          )}

          {groupItem.detail && (
            <div className="group-item-customers">
              <div className="customers-header">
                <Users size={18} className="customers-icon" style={{ color: groupItem.textColour }} />
                <span className="customers-text">Customers ({groupItem.count})</span>
              </div>
              <div className="customers-list">
                {(showAllCustomers[groupItem.key] ? groupItem.detail?.customers : groupItem.detail?.customers?.slice(0, 5))?.map((customer, index) => (
                  <div key={customer.id || index} className="customer-item">
                    <span className="customer-name">
                      {getCustomerDisplayName(customer, index)}, ID: {customer.id}
                    </span>
                    <span className="customer-coords">
                      ({customer.satisfaction}, {customer.loyalty})
                    </span>
                  </div>
                ))}
                {groupItem.detail?.customers && groupItem.detail.customers.length > 5 && (
                  <div 
                    className="customer-more"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowAllCustomers(groupItem.key);
                    }}
                    style={{ cursor: 'pointer', color: '#3b82f6', textDecoration: 'underline' }}
                  >
                    {!showAllCustomers[groupItem.key] ? (
                      `+${groupItem.detail.customers.length - 5} more customers`
                    ) : (
                      'Show Less'
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="proximity-list">
      <CustomTooltip 
        type={tooltip.type}
        isVisible={tooltip.isVisible}
        position={tooltip.position}
      />
      <div className="proximity-list-header">
        <h4>{getGroupingLabel()}</h4>
      </div>

      <div className="proximity-list-body">
        {items.map(item => (
          <div 
            className={`proximity-list-item ${item.isGroup ? 'group-item' : ''}`}
            key={item.key}
            data-warning={item.isWarning}
            data-opportunity={item.isOpportunity}
          >
            <div 
              className={`proximity-list-row ${item.isGroup ? 'group-summary' : ''} ${expandedItem === item.key ? 'expanded' : ''} ${item.isHighImpact ? 'high-impact' : ''} ${item.isOpportunity ? 'opportunity' : ''} ${item.isWarning ? 'warning' : ''}`}
              onClick={() => {
                if (expandedItem === item.key) {
                  setExpandedItem(null);
                  setExpandedGroupItem(null); // Clear group item when parent closes
                } else {
                  setExpandedItem(item.key);
                  setExpandedGroupItem(null); // Clear group item when opening new parent
                }
              }}
              onMouseEnter={(e) => {
                if (item.isOpportunity) handleMouseEnter(e, 'opportunity');
                else if (item.isWarning) handleMouseEnter(e, 'warning');
              }}
              onMouseLeave={handleMouseLeave}
            >
              <div className="label-col">
                <span className="item-label" style={{ color: item.textColour }}>
                  {item.label}
                  {item.isGroup && <span className="group-indicator"> (Group)</span>}
                </span>
              </div>
              <div className="bar-col">
                <div className="bar">
                  <div
                    className="bar-base"
                    style={{ backgroundColor: item.baseColour }}
                  />
                  <div className="bar-gap" />
                  <div
                    className="bar-target"
                    style={{ backgroundColor: item.targetColour }}
                  />
                </div>
              </div>
              <div className="count-col">{item.count}</div>
              <div className="pct-col">{item.pct.toFixed(1)}%</div>
              <div className="expand-icon">
                {expandedItem === item.key ? '▼' : '▶'}
              </div>
            </div>
            
            {expandedItem === item.key && (
              <div className="proximity-list-expanded">
                <div className="expanded-content">
                  {item.isWarning && (
                    <div className="warning-section">
                      <div className="warning-header">
                        <span className="warning-text">WARNING</span>
                      </div>
                      <p className="explanation">{item.explanation}</p>
                    </div>
                  )}
                  
                  {item.isOpportunity && (
                    <div className="opportunity-section">
                      <div className="opportunity-header">
                        <span className="opportunity-text">OPPORTUNITY</span>
                      </div>
                      <p className="explanation">{item.explanation}</p>
                    </div>
                  )}
                  
                  {item.isGroup ? (
                    <div className="group-section" onClick={(e) => e.stopPropagation()}>
                      <div className="group-header">
                        <FolderOpen size={18} className="group-icon" style={{ color: item.textColour }} />
                        <span className="group-text">Group Contents ({item.groupItems?.length || 0} relationships)</span>
                      </div>
                      {(() => {
                        const opportunityItems = item.groupItems?.filter(groupItem => groupItem.isOpportunity) || [];
                        const warningItems = item.groupItems?.filter(groupItem => groupItem.isWarning) || [];
                        const neutralItems = item.groupItems?.filter(groupItem => !groupItem.isOpportunity && !groupItem.isWarning) || [];
                        
                        return (
                          <div className="group-items-columns">
                            {opportunityItems.length > 0 && (
                              <div className="group-items-column opportunity">
                                <div className="group-category-header">Opportunities</div>
                                {opportunityItems.map(renderGroupItem)}
                              </div>
                            )}
                            {warningItems.length > 0 && (
                              <div className="group-items-column warning">
                                <div className="group-category-header">Warnings</div>
                                {warningItems.map(renderGroupItem)}
                              </div>
                            )}
                            {neutralItems.length > 0 && (
                              <div className="group-items-column neutral">
                                <div className="group-category-header">Neutral</div>
                                {neutralItems.map(renderGroupItem)}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="customers-section">
                      <div className="customers-header">
                        <Users size={18} className="customers-icon" style={{ color: item.textColour }} />
                        <span className="customers-text">Customers ({item.count})</span>
                      </div>
                      <div className="customers-list">
                        {(showAllCustomers[item.key] ? item.detail?.customers : item.detail?.customers?.slice(0, 5))?.map((customer, index) => (
                          <div key={customer.id || index} className="customer-item">
                            <span className="customer-name">
                              {getCustomerDisplayName(customer, index)}, ID: {customer.id}
                            </span>
                            <span className="customer-coords">
                              ({customer.satisfaction}, {customer.loyalty})
                            </span>
                          </div>
                        ))}
                        {item.detail?.customers && item.detail.customers.length > 5 && (
                          <div 
                            className="customer-more"
                            onClick={() => handleShowAllCustomers(item.key)}
                            style={{ cursor: 'pointer', color: '#3b82f6', textDecoration: 'underline' }}
                          >
                            {!showAllCustomers[item.key] ? (
                              `+${item.detail.customers.length - 5} more customers`
                            ) : (
                              'Show Less'
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProximityList;


