import type { DataPoint, ScaleFormat } from '../../../types/base';
import type { ActionsReport, DataReport, QuadrantType } from '../types';
import { generateActionPlan } from '../components/ActionsReport/ActionPlanGenerator';
import { EnhancedProximityClassifier } from '../services/EnhancedProximityClassifier';
import { calculateRecommendationScore } from '../../../utils/recommendationScore';
import type { QuadrantType as VisualizationQuadrantType } from '../../visualization/context/DataProcessingContext';

// Note: This generator calculates proximity analysis and recommendation score.
// In a future optimization, these could be passed from components that already calculate them.

export const generateActionsReport = async (
  data: DataPoint[],
  activeEffects: Set<string>,
  dataReport?: DataReport | null,
  satisfactionScale?: ScaleFormat,
  loyaltyScale?: ScaleFormat,
  getQuadrantForPoint?: (point: DataPoint) => VisualizationQuadrantType,
  midpoint?: { sat: number; loy: number },
  isPremium: boolean = false,
  showSpecialZones: boolean = false,
  showNearApostles: boolean = false,
  apostlesZoneSize: number = 1,
  terroristsZoneSize: number = 1,
  contextDistribution?: Record<string, number> | null,
  axisLabels?: { satisfaction: string; loyalty: string }
): Promise<ActionsReport> => {
  // If no data report or scales, return empty
  if (!dataReport || !satisfactionScale || !loyaltyScale) {
    return {
      date: new Date().toISOString(),
      recommendations: [],
      insights: [],
      priorityActions: [],
      isPremium: activeEffects.has('premium')
    };
  }

  // Calculate proximity analysis if we have the required data
  let proximityAnalysis = null;
  if (getQuadrantForPoint && midpoint) {
    try {
      const enhancedClassifier = new EnhancedProximityClassifier(
        satisfactionScale,
        loyaltyScale,
        midpoint,
        apostlesZoneSize,
        terroristsZoneSize
      );
      proximityAnalysis = enhancedClassifier.analyzeProximity(
        data.filter(d => !d.excluded),
        getQuadrantForPoint!, // Type assertion: we know it's defined here due to the if check above
        isPremium,
        undefined,
        showSpecialZones,
        showNearApostles
      );
    } catch (error) {
      console.warn('Failed to calculate proximity analysis:', error);
    }
  }

  // Calculate recommendation score
  let recommendationScore = null;
  try {
    recommendationScore = calculateRecommendationScore(
      data.filter(d => !d.excluded),
      loyaltyScale
    );
  } catch (error) {
    console.warn('Failed to calculate recommendation score:', error);
  }

  // Generate Action Plan
  try {
    // Determine isClassicModel from dataReport or default to false (modern)
    const isClassicModel = (dataReport as any)?.isClassicModel ?? false;
    
    const actionPlan = await generateActionPlan(
      dataReport,
      proximityAnalysis,
      recommendationScore,
      satisfactionScale,
      loyaltyScale,
      true, // Capture charts on generation
      showNearApostles,
      isClassicModel,
      contextDistribution,
      midpoint, // Pass the actual user-adjusted midpoint
      data.filter(d => !d.excluded), // Pass the original data with emails
      isPremium, // For Brand+ users, hide watermark in main chart capture
      axisLabels
    );

    // Convert Action Plan to ActionsReport format (for backward compatibility)
    return {
      date: actionPlan.date,
      recommendations: actionPlan.actions.map(action => ({
        category: action.quadrant || 'general',
        meaning: action.statement,
        actions: [],
        priority: action.priority
      })),
      insights: [
        ...actionPlan.findings.map(f => f.statement),
        ...actionPlan.opportunities.map(o => o.statement),
        ...actionPlan.risks.map(r => r.statement)
      ],
      priorityActions: actionPlan.actions.map(a => a.statement),
      isPremium: activeEffects.has('premium'),
      // Store full action plan for the component to use
      actionPlan: actionPlan as any
    };
  } catch (error) {
    console.error('Failed to generate action plan:', error);
    return {
      date: new Date().toISOString(),
      recommendations: [],
      insights: [],
      priorityActions: [],
      isPremium: activeEffects.has('premium')
    };
  }
};