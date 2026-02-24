import type { Action } from '../types';
import type { EvaluatorResults } from '../types';
import type { QuadrantType } from '../../../types';
import type { ProximityAnalysisResult } from '../../../services/EnhancedProximityClassifier';
import { getTemplatesForCategory, renderTemplate } from './statementLoader';

/**
 * Gets display name for quadrant
 */
function getQuadrantDisplayName(quadrant: string, isClassicModel: boolean = false): string {
  const names: Record<string, string> = {
    loyalists: 'Loyalists',
    mercenaries: 'Mercenaries',
    hostages: 'Hostages',
    defectors: 'Defectors',
    apostles: isClassicModel ? 'Apostles' : 'Advocates',
    terrorists: isClassicModel ? 'Terrorists' : 'Trolls',
    near_apostles: isClassicModel ? 'Near-Apostles' : 'Near-Advocates',
    nearApostles: isClassicModel ? 'Near-Apostles' : 'Near-Advocates',
    near_terrorists: isClassicModel ? 'Near-Terrorists' : 'Near-Trolls'
  };
  return names[quadrant] || quadrant;
}

/**
 * Calculates ROI score (impact × actionability)
 */
function calculateROI(impact: 'high' | 'medium' | 'low', actionability: 'easy' | 'medium' | 'hard'): number {
  const impactScore = { high: 3, medium: 2, low: 1 };
  const actionabilityScore = { easy: 3, medium: 2, hard: 1 };
  return impactScore[impact] * actionabilityScore[actionability];
}

/**
 * Conversion type for actionable conversions
 */
interface Conversion {
  from: string;
  to: string;
  total: number;
  averageChances: number;
  customers: Array<{
    id: string;
    name?: string;
    email?: string;
    satisfaction: number;
    loyalty: number;
    currentQuadrant: string;
    targetQuadrant: string;
    distanceFromBoundary: number;
    riskScore: number;
  }>;
}

type AudienceContext = 'b2c' | 'b2b';

/**
 * Determines impact level based on customer count and average chances
 */
function determineImpact(customerCount: number, averageChances: number): 'high' | 'medium' | 'low' {
  if (customerCount >= 5 && averageChances >= 70) return 'high';
  if (customerCount >= 3 && averageChances >= 50) return 'medium';
  if (customerCount >= 2 && averageChances >= 30) return 'medium';
  return 'low';
}

/**
 * Determines actionability based on average chances
 */
function determineActionability(averageChances: number): 'easy' | 'medium' | 'hard' {
  if (averageChances >= 75) return 'easy';
  if (averageChances >= 50) return 'medium';
  return 'hard';
}

/**
 * Generates conversion statement
 */
function generateConversionStatement(conv: Conversion, isClassicModel: boolean): string {
  const fromName = getQuadrantDisplayName(conv.from, isClassicModel);
  const toName = getQuadrantDisplayName(conv.to, isClassicModel);
  return `You might consider focusing on converting ${conv.total} customer${conv.total !== 1 ? 's' : ''} from ${fromName} to ${toName}. Average chances of movement: ${conv.averageChances.toFixed(1)}%.`;
}

/**
 * Gets singular/plural form of quadrant name
 */
function getQuadrantName(count: number, quadrant: string, isClassicModel: boolean = false): string {
  const plural = getQuadrantDisplayName(quadrant, isClassicModel);
  if (count === 1) {
    // Return singular form
    const singularMap: Record<string, string> = {
      'Loyalists': 'Loyalist',
      'Mercenaries': 'Mercenary',
      'Hostages': 'Hostage',
      'Defectors': 'Defector',
      'Apostles': 'Apostle',
      'Advocates': 'Advocate',
      'Terrorists': 'Terrorist',
      'Trolls': 'Troll',
      'Near-Apostles': 'Near-Apostle',
      'Near-Advocates': 'Near-Advocate',
      'Near-Terrorists': 'Near-Terrorist',
      'Near-Trolls': 'Near-Troll'
    };
    return singularMap[plural] || plural;
  }
  return plural; // Return plural form
}

/**
 * Generates Actions statements based on evaluator results
 */
export function generateActions(
  evaluators: EvaluatorResults, 
  isClassicModel: boolean = false,
  actionableConversions?: { opportunities: Conversion[]; warnings: Conversion[] },
  proximityAnalysis?: ProximityAnalysisResult | null,
  originalData?: Array<{ id: string; name?: string; email?: string; satisfaction: number; loyalty: number; excluded?: boolean }>,
  getQuadrantForPoint?: (point: { satisfaction: number; loyalty: number }) => string,
  audienceContext: AudienceContext = 'b2c'
): Action[] {
  const actions: Action[] = [];

  // ===== LOYALISTS ACTIONS =====
  // Using templates from markdown document (source of truth)
  const loyalistsCount = evaluators.distribution.counts.loyalists || 0;
  if (loyalistsCount > 0) {
    const loyalistName = getQuadrantName(loyalistsCount, 'loyalists', isClassicModel);
    
    // Get customer list for Loyalists
    let loyalistsCustomers: Array<{
      id: string;
      name?: string;
      email?: string;
      satisfaction: number;
      loyalty: number;
      position: string;
    }> = [];
    
    if (originalData && getQuadrantForPoint) {
      loyalistsCustomers = originalData
        .filter(point => !point.excluded && getQuadrantForPoint(point) === 'loyalists')
        .map(point => ({
          id: point.id,
          name: point.name || '',
          email: point.email || '',
          satisfaction: point.satisfaction,
          loyalty: point.loyalty,
          position: `(${point.satisfaction}, ${point.loyalty})`,
          ...(point as any) // Spread all additional properties from original data
        }));
    }
    
    // Get Loyalists actions from templates
    const loyalistActions = [
      { type: 'Strengthen loyalty', priority: 1, actionability: 'medium' as const, expectedImpact: 'high' as const },
      { type: 'Encourage advocacy', priority: 2, actionability: 'medium' as const, expectedImpact: 'high' as const },
      { type: 'Reward loyalty', priority: 3, actionability: 'easy' as const, expectedImpact: 'medium' as const },
      { type: 'Involve them in your success', priority: 4, actionability: 'easy' as const, expectedImpact: 'medium' as const }
    ];

    loyalistActions.forEach(({ type, priority, actionability, expectedImpact }, index) => {
      const template = getTemplatesForCategory('actions').find(t => t.type === type);
      if (template) {
        // Update statements to mention Loyalists explicitly and avoid imperative tense
        let statement = template.template;
        if (type === 'Strengthen loyalty') {
          statement = audienceContext === 'b2b'
            ? `You might implement retention strategies for ${loyalistName} such as account-based success plans, renewal workshops, and executive relationship mapping.`
            : `You might implement retention strategies for ${loyalistName} such as personalised offers, loyalty programmes, and exclusive perks.`;
        } else if (type === 'Encourage advocacy') {
          statement = audienceContext === 'b2b'
            ? `You could encourage advocacy among ${loyalistName}. You might invite ${loyalistsCount === 1 ? 'them' : 'them'} to share measurable outcomes and become references in case studies, webinars, or peer customer communities.`
            : `You could encourage advocacy among ${loyalistName}. You might invite ${loyalistsCount === 1 ? 'them' : 'them'} to share their positive experiences and become brand ambassadors.`;
        } else if (type === 'Reward loyalty') {
          statement = `You might reward ${loyalistName} for their loyalty through exclusive benefits, early access to new products, or special recognition programmes.`;
        } else if (type === 'Involve them in your success') {
          statement = audienceContext === 'b2b'
            ? `You could involve ${loyalistName} in your success by running joint roadmap reviews, inviting ${loyalistsCount === 1 ? 'them' : 'them'} to pilot features in production contexts, or including ${loyalistsCount === 1 ? 'them' : 'them'} in customer advisory boards.`
            : `You could involve ${loyalistName} in your success by seeking their feedback, inviting ${loyalistsCount === 1 ? 'them' : 'them'} to beta test new products, or including ${loyalistsCount === 1 ? 'them' : 'them'} in co-creation initiatives.`;
        }
        
        const supportingData: any = { 
          count: loyalistsCount,
          quadrant: 'loyalists'
        };
        // Customer list shown only in first action to avoid duplication
        if (index === 0) {
          supportingData.customers = loyalistsCustomers;
        }
        
        actions.push({
          id: `action-loyalists-${type.toLowerCase().replace(/\s+/g, '-')}`,
          statement: statement,
          quadrant: 'loyalists',
          priority: priority,
          actionability: actionability,
          expectedImpact: expectedImpact,
          roi: calculateROI(expectedImpact, actionability),
          supportingData
        });
      }
    });
  }

  // ===== MERCENARIES ACTIONS =====
  const mercenariesCount = evaluators.distribution.counts.mercenaries || 0;
  if (mercenariesCount > 0) {
    const mercenaryName = getQuadrantName(mercenariesCount, 'mercenaries', isClassicModel);
    
    // Get customer list for Mercenaries
    let mercenariesCustomers: Array<{
      id: string;
      name?: string;
      email?: string;
      satisfaction: number;
      loyalty: number;
      position: string;
    }> = [];
    
    if (originalData && getQuadrantForPoint) {
      mercenariesCustomers = originalData
        .filter(point => !point.excluded && getQuadrantForPoint(point) === 'mercenaries')
        .map(point => ({
          id: point.id,
          name: point.name || '',
          email: point.email || '',
          satisfaction: point.satisfaction,
          loyalty: point.loyalty,
          position: `(${point.satisfaction}, ${point.loyalty})`,
          ...(point as any) // Spread all additional properties from original data
        }));
    }
    
    // Note: Customer list is shown in 'opportunity-mercenaries' to avoid duplication
    actions.push({
      id: 'action-mercenaries-know-customers',
      statement: `You might consider knowing your ${mercenaryName}. The first question you could have an answer to is why ${mercenariesCount === 1 ? 'they buy' : 'they buy'} from you and what ${mercenariesCount === 1 ? 'they like' : 'they like'} from your offering. You might make sure you keep that, and improve it when possible.`,
      quadrant: 'mercenaries',
      priority: 1,
      actionability: 'medium',
      expectedImpact: 'high',
      roi: calculateROI('high', 'medium'),
      supportingData: { 
        count: mercenariesCount,
        quadrant: 'mercenaries'
        // Customer list shown in 'opportunity-mercenaries' to avoid duplication
      }
    });

    actions.push({
      id: 'action-mercenaries-know-competitors',
      statement: `For ${mercenaryName}, you might consider understanding your competitors. The second question could be what others are offering that you don't. You may find some easy wins and good ideas to implement in your brand. If the industry is progressing but you are not, you might need to keep up.`,
      quadrant: 'mercenaries',
      priority: 2,
      actionability: 'medium',
      expectedImpact: 'high',
      roi: calculateROI('high', 'medium'),
      supportingData: { 
        count: mercenariesCount,
        quadrant: 'mercenaries'
        // Customer list shown in 'opportunity-mercenaries' to avoid duplication
      }
    });

    actions.push({
      id: 'action-mercenaries-build-relationships',
      statement: audienceContext === 'b2b'
        ? `You could build relationships with ${mercenaryName} by strengthening stakeholder trust through account reviews, success governance, and role-specific enablement.`
        : `You could build relationships with ${mercenaryName} by creating a sense of connection with the brand through personalised communications, loyalty programmes, or customer communities.`,
      quadrant: 'mercenaries',
      priority: 3,
      actionability: 'medium',
      expectedImpact: 'medium',
      roi: calculateROI('medium', 'medium'),
      supportingData: { 
        count: mercenariesCount,
        quadrant: 'mercenaries'
        // Customer list shown in 'opportunity-mercenaries' to avoid duplication
      }
    });

    actions.push({
      id: 'action-mercenaries-reward',
      statement: audienceContext === 'b2b'
        ? `You might consider rewarding ${mercenaryName} by recognising expansion milestones, successful renewals, or adoption growth across teams. You could recognise their value with executive thank-you outreach, commercial flexibility where appropriate, or priority access to roadmap features.`
        : `You might consider rewarding ${mercenaryName} by celebrating when ${mercenariesCount === 1 ? 'they make' : 'they make'} a purchase. You could recognise their value with thank-you notes, anniversary discounts, or early access to new products.`,
      quadrant: 'mercenaries',
      priority: 4,
      actionability: 'easy',
      expectedImpact: 'medium',
      roi: calculateROI('medium', 'easy'),
      supportingData: { 
        count: mercenariesCount,
        quadrant: 'mercenaries'
        // Customer list shown in 'opportunity-mercenaries' to avoid duplication
      }
    });

    actions.push({
      id: 'action-mercenaries-differentiate',
      statement: `For ${mercenaryName}, you might differentiate beyond price by emphasising unique value propositions like quality, convenience, or user experience that competitors can't easily replicate.`,
      quadrant: 'mercenaries',
      priority: 5,
      actionability: 'hard',
      expectedImpact: 'high',
      roi: calculateROI('high', 'hard'),
      supportingData: { 
        count: mercenariesCount,
        quadrant: 'mercenaries'
        // Customer list shown in 'opportunity-mercenaries' to avoid duplication
      }
    });

    actions.push({
      id: 'action-mercenaries-simplify',
      statement: audienceContext === 'b2b'
        ? `You could simplify renewals and expansion for ${mercenaryName} by reducing procurement friction, streamlining legal and security steps, and clarifying implementation ownership.`
        : `You could simplify repurchasing for ${mercenaryName} by eliminating friction in the purchasing process, from easy online checkouts to convenient delivery options.`,
      quadrant: 'mercenaries',
      priority: 6,
      actionability: 'medium',
      expectedImpact: 'medium',
      roi: calculateROI('medium', 'medium'),
      supportingData: { 
        count: mercenariesCount,
        quadrant: 'mercenaries'
        // Customer list shown in 'opportunity-mercenaries' to avoid duplication
      }
    });
  }

  // ===== HOSTAGES ACTIONS =====
  const hostagesCount = evaluators.distribution.counts.hostages || 0;
  if (hostagesCount > 0) {
    const hostageName = getQuadrantName(hostagesCount, 'hostages', isClassicModel);
    
    // Get customer list for Hostages
    let customers: Array<{
      id: string;
      name?: string;
      email?: string;
      satisfaction: number;
      loyalty: number;
      position: string;
    }> = [];
    
    if (originalData && getQuadrantForPoint) {
      customers = originalData
        .filter(point => !point.excluded && getQuadrantForPoint(point) === 'hostages')
        .map(point => ({
          id: point.id,
          name: point.name || '',
          email: point.email || '',
          satisfaction: point.satisfaction,
          loyalty: point.loyalty,
          position: `(${point.satisfaction}, ${point.loyalty})`,
          ...(point as any) // Spread all additional properties from original data
        }));
    }
    
    actions.push({
      id: 'action-hostages-dont-ignore',
      statement: `It may be important not to overlook ${hostageName}. Remember ${hostagesCount === 1 ? 'this Hostage is' : 'they are'} active customer${hostagesCount === 1 ? '' : 's'} who ${hostagesCount === 1 ? 'is' : 'are'} already buying from you, so there may be no need to invest in expensive marketing campaigns to acquire ${hostagesCount === 1 ? 'them' : 'them'}. Instead, you might focus on meeting their expectations by understanding their motivations and needs.`,
      quadrant: 'hostages',
      priority: 1,
      actionability: 'easy',
      expectedImpact: 'high',
      roi: calculateROI('high', 'easy'),
      supportingData: { 
        count: hostagesCount,
        quadrant: 'hostages',
        customers: customers
      }
    });

    actions.push({
      id: 'action-hostages-understand',
      statement: `For ${hostageName}, you might consider understanding why ${hostagesCount === 1 ? 'they are' : 'they are'} not satisfied with your products and services. You may be tempted to investigate why ${hostagesCount === 1 ? 'they are' : 'they are'} forced to buy from you, but your real interest might be on their lack of satisfaction, rather than their forced loyalty.`,
      quadrant: 'hostages',
      priority: 2,
      actionability: 'medium',
      expectedImpact: 'high',
      roi: calculateROI('high', 'medium'),
      supportingData: { 
        count: hostagesCount,
        quadrant: 'hostages',
        customers: customers
      }
    });

    actions.push({
      id: 'action-hostages-address',
      statement: `You could address dissatisfaction among ${hostageName}. If you know why you are not meeting ${hostageName}' needs, you may be uncovering pain points that potentially affect other segments in your customer base. Tackling those issues might help to turn their dissatisfaction and others'. You could address their concerns promptly and transparently to build trust.`,
      quadrant: 'hostages',
      priority: 3,
      actionability: 'medium',
      expectedImpact: 'high',
      roi: calculateROI('high', 'medium'),
      supportingData: { 
        count: hostagesCount,
        quadrant: 'hostages',
        customers: customers
      }
    });

    actions.push({
      id: 'action-hostages-create-path',
      statement: `You might create a path to satisfaction for ${hostageName} by transitioning ${hostagesCount === 1 ? 'them' : 'them'} into Loyalists through offering improved service, personalised solutions, or tailored engagement.`,
      quadrant: 'hostages',
      priority: 4,
      actionability: 'hard',
      expectedImpact: 'high',
      roi: calculateROI('high', 'hard'),
      supportingData: { 
        count: hostagesCount,
        quadrant: 'hostages',
        customers: customers
      }
    });

    actions.push({
      id: 'action-hostages-support',
      statement: `You could offer support to ${hostageName}. In today's world personalisation is key. Your Customer Success strategy might count on special measures for this group, such as a dedicated account manager, direct support line, dedicated communications, documentation or more approachable channels.`,
      quadrant: 'hostages',
      priority: 5,
      actionability: 'medium',
      expectedImpact: 'medium',
      roi: calculateROI('medium', 'medium'),
      supportingData: { 
        count: hostagesCount,
        quadrant: 'hostages',
        customers: customers
      }
    });
  }

  // ===== DEFECTORS ACTIONS =====
  const defectorsCount = evaluators.distribution.counts.defectors || 0;
  if (defectorsCount > 0) {
    const defectorName = getQuadrantName(defectorsCount, 'defectors', isClassicModel);
    
    // Get customer list for Defectors
    let defectorsCustomers: Array<{
      id: string;
      name?: string;
      email?: string;
      satisfaction: number;
      loyalty: number;
      position: string;
    }> = [];
    
    if (originalData && getQuadrantForPoint) {
      defectorsCustomers = originalData
        .filter(point => !point.excluded && getQuadrantForPoint(point) === 'defectors')
        .map(point => ({
          id: point.id,
          name: point.name || '',
          email: point.email || '',
          satisfaction: point.satisfaction,
          loyalty: point.loyalty,
          position: `(${point.satisfaction}, ${point.loyalty})`,
          ...(point as any) // Spread all additional properties from original data
        }));
    }
    
    // Note: Customer list is shown in 'risk-defectors' to avoid duplication
    // We only show it in the first action (highest priority) as a reference
    actions.push({
      id: 'action-defectors-prevent',
      statement: `You may want to consider preventing future defections. ${defectorsCount === 1 ? 'A Defector is' : 'Defectors are'} by definition ${defectorsCount === 1 ? 'someone' : 'people'} disappointed. ${defectorsCount === 1 ? 'This person' : 'These people'} used to buy from you (or considered doing so), but at some point, they changed their mind${defectorsCount === 1 ? '' : 's'}. Running research to understand those frustrations could allow you to prevent those situations from affecting other customers.`,
      quadrant: 'defectors',
      priority: 1,
      actionability: 'medium',
      expectedImpact: 'high',
      roi: calculateROI('high', 'medium'),
      supportingData: { 
        count: defectorsCount,
        quadrant: 'defectors'
        // Customer list shown in 'risk-defectors' to avoid duplication
      }
    });

    actions.push({
      id: 'action-defectors-damage-control',
      statement: `For ${defectorName}, you might consider damage control. You could identify ${defectorName} as early as possible and address their dissatisfaction proactively. You might use your data to find their emails and chat interactions if they exist. Reading their reviews, or customer support interactions could help you understand their grievances. They most likely already gave up on you, so you might not need to waste your time sending them surveys that they are very likely to ignore.`,
      quadrant: 'defectors',
      priority: 2,
      actionability: 'easy',
      expectedImpact: 'high',
      roi: calculateROI('high', 'easy'),
      supportingData: { 
        count: defectorsCount,
        quadrant: 'defectors'
        // Customer list shown in 'risk-defectors' to avoid duplication
      }
    });

    actions.push({
      id: 'action-defectors-win-back',
      statement: `You might consider winning ${defectorName} back. It may not be too late and you may have some chances to win ${defectorsCount === 1 ? 'them' : 'them'} back. You could offer a personalised resolution or incentive to regain their trust. You might not want to think about discounts as an immediate reaction, or free services. The first action could be the acknowledgment of mistakes, apologising for any wrongdoing and resolving issues. Once the air is clear you might think about promotions and gestures of goodwill.`,
      quadrant: 'defectors',
      priority: 3,
      actionability: 'hard',
      expectedImpact: 'high',
      roi: calculateROI('high', 'hard'),
      supportingData: { 
        count: defectorsCount,
        quadrant: 'defectors'
        // Customer list shown in 'risk-defectors' to avoid duplication
      }
    });

    actions.push({
      id: 'action-defectors-learn',
      statement: `You could learn from ${defectorName}. Prevention again. Analysing ${defectorName}' feedback might help you uncover systemic issues and prevent future churn.`,
      quadrant: 'defectors',
      priority: 4,
      actionability: 'easy',
      expectedImpact: 'medium',
      roi: calculateROI('medium', 'easy'),
      supportingData: { 
        count: defectorsCount,
        quadrant: 'defectors'
        // Customer list shown in 'risk-defectors' to avoid duplication
      }
    });
  }

  // ===== NEUTRAL CUSTOMERS ACTIONS =====
  const neutralCount = evaluators.distribution.neutralCount || 0;
  if (neutralCount > 0) {
    actions.push({
      id: 'action-neutral-engage',
      statement: 'You may want to engage with Neutral customers promptly. It could be valuable to reach out to understand their experience and expectations before they drift in either direction. Their neutral position suggests they haven\'t formed strong opinions yet, making them potentially more receptive to positive experiences than customers with strong opinions.',
      quadrant: undefined,
      priority: 1,
      actionability: 'easy',
      expectedImpact: 'high',
      roi: calculateROI('high', 'easy'),
      supportingData: { count: neutralCount }
    });

    actions.push({
      id: 'action-neutral-create-moments',
      statement: 'You could create positive moments for Neutral customers by designing experiences that may tip them toward satisfaction and loyalty. Since they\'re at a critical transition point, even small improvements could dramatically shift their trajectory toward positive quadrants.',
      quadrant: undefined,
      priority: 2,
      actionability: 'medium',
      expectedImpact: 'high',
      roi: calculateROI('high', 'medium'),
      supportingData: { count: neutralCount }
    });

    actions.push({
      id: 'action-neutral-gather-feedback',
      statement: 'You might consider gathering feedback from Neutral customers. Their neutral position could be an opportunity to understand what would make them more satisfied and loyal. Their responses may be more honest and less biased than those of customers with strong opinions.',
      quadrant: undefined,
      priority: 3,
      actionability: 'easy',
      expectedImpact: 'medium',
      roi: calculateROI('medium', 'easy'),
      supportingData: { count: neutralCount }
    });

    actions.push({
      id: 'action-neutral-personalised',
      statement: 'You could provide personalised outreach to Neutral customers. Since they\'re not strongly committed, personalised attention may have a significant impact and could help them feel valued and understood.',
      quadrant: undefined,
      priority: 4,
      actionability: 'medium',
      expectedImpact: 'medium',
      roi: calculateROI('medium', 'medium'),
      supportingData: { count: neutralCount }
    });

    actions.push({
      id: 'action-neutral-monitor',
      statement: 'You may want to monitor Neutral customers closely. Tracking their movement could reveal whether they are trending toward positive or negative quadrants. Early intervention, before they drift toward Hostages or Defectors, could make a significant difference.',
      quadrant: undefined,
      priority: 5,
      actionability: 'easy',
      expectedImpact: 'medium',
      roi: calculateROI('medium', 'easy'),
      supportingData: { count: neutralCount }
    });
  }

  // ===== APOSTLES ACTIONS =====
  const apostlesCount = evaluators.distribution.counts.apostles || 0;
  if (apostlesCount > 0) {
    const apostleName = getQuadrantName(apostlesCount, 'apostles', isClassicModel);
    
    // Get customer list for Apostles
    let apostlesCustomers: Array<{
      id: string;
      name?: string;
      email?: string;
      satisfaction: number;
      loyalty: number;
      position: string;
    }> = [];
    
    if (originalData && getQuadrantForPoint) {
      apostlesCustomers = originalData
        .filter(point => !point.excluded && getQuadrantForPoint(point) === 'apostles')
        .map(point => ({
          id: point.id,
          name: point.name || '',
          email: point.email || '',
          satisfaction: point.satisfaction,
          loyalty: point.loyalty,
          position: `(${point.satisfaction}, ${point.loyalty})`,
          ...(point as any) // Spread all additional properties from original data
        }));
    }
    
    actions.push({
      id: 'action-apostles-celebrate',
      statement: audienceContext === 'b2b'
        ? `You might celebrate and amplify. Publicly acknowledging and rewarding ${apostleName} for their advocacy through exclusive benefits, recognition programmes, or personalised thank-you notes could be very effective. Champions who advocate for your company in professional channels may appreciate your support through co-authored case studies, webinar participation, or recognition in industry communities. Publishing those outcomes can help influence peers and new prospects.`
        : `You might celebrate and amplify. Publicly acknowledging and rewarding ${apostleName} for their advocacy through exclusive benefits, recognition programmes, or personalised thank-you notes could be very effective. ${isClassicModel ? 'Apostles' : 'Advocates'} who praise your brand on social media may appreciate your engagement, such as comments or likes on their posts. Amplifying positivity and expanding it as much as possible could help influence others.`,
      quadrant: 'apostles',
      priority: 1,
      actionability: 'easy',
      expectedImpact: 'high',
      roi: calculateROI('high', 'easy'),
      supportingData: { 
        count: apostlesCount,
        quadrant: 'apostles',
        customers: apostlesCustomers
      }
    });

    actions.push({
      id: 'action-apostles-leverage',
      statement: audienceContext === 'b2b'
        ? `You might leverage ${apostleName}' voice. You could invite ${apostlesCount === 1 ? 'them' : 'them'} to participate in reference programmes, product councils, joint success stories, or peer-to-peer customer sessions. You might publish joint case studies, quantified outcomes, and implementation stories across sales enablement and demand-generation channels. Giving ${apostlesCount === 1 ? 'them' : 'them'} a voice could inspire others.`
        : `You might leverage ${apostleName}' voice. You could invite ${apostlesCount === 1 ? 'them' : 'them'} to become part of referral programmes, co-creation initiatives (e.g., helping to design new products), or ambassador programmes. You might share their testimonials and stories across your marketing channels. Giving ${apostlesCount === 1 ? 'them' : 'them'} a voice could inspire others.`,
      quadrant: 'apostles',
      priority: 2,
      actionability: 'medium',
      expectedImpact: 'high',
      roi: calculateROI('high', 'medium'),
      supportingData: { 
        count: apostlesCount,
        quadrant: 'apostles'
        // Customer list shown in first action to avoid duplication
      }
    });

    actions.push({
      id: 'action-apostles-maintain',
      statement: `You might maintain satisfaction for ${apostleName}. You could continue delivering exceptional service and experiences to ensure ${apostlesCount === 1 ? 'they remain' : 'they remain'} loyal and satisfied. You might be proactive in gathering their feedback and addressing any potential issues.`,
      quadrant: 'apostles',
      priority: 3,
      actionability: 'medium',
      expectedImpact: 'high',
      roi: calculateROI('high', 'medium'),
      supportingData: { 
        count: apostlesCount,
        quadrant: 'apostles'
        // Customer list shown in first action to avoid duplication
      }
    });
  }

  // ===== PROXIMITY-BASED ACTIONS =====

  // Crisis prevention (loyalists → defectors)
  const crisisRisk = evaluators.proximity.topRisks.find(r => r.type === 'loyalists_close_to_defectors');
  if (crisisRisk && crisisRisk.count > 0) {
    const loyalistName = getQuadrantName(crisisRisk.count, 'loyalists', isClassicModel);
    const defectorName = getQuadrantName(crisisRisk.count, 'defectors', isClassicModel);
    
    // Get customer list from proximity analysis
    let customers: Array<{
      id: string;
      name?: string;
      email?: string;
      satisfaction: number;
      loyalty: number;
      position: string;
      distance: number;
      riskScore: number;
    }> = [];
    
    if (proximityAnalysis?.analysis?.loyalists_close_to_defectors?.customers) {
      const detail = proximityAnalysis.analysis.loyalists_close_to_defectors;
      customers = detail.customers.map(c => {
        // Try to get email from original data if available
        const originalCustomer = originalData?.find(d => d.id === c.id);
        return {
          id: c.id,
          name: c.name || originalCustomer?.name || '',
          email: originalCustomer?.email || '',
          satisfaction: c.satisfaction,
          loyalty: c.loyalty,
          position: `(${c.satisfaction}, ${c.loyalty})`,
          distance: c.distanceFromBoundary,
          riskScore: c.riskScore,
          ...(originalCustomer || {}) // Spread all additional properties from original data
        };
      });
    }
    
    actions.push({
      id: 'action-crisis-prevention',
      statement: `${crisisRisk.count} ${getQuadrantName(crisisRisk.count, 'loyalists', isClassicModel)}${crisisRisk.count === 1 ? ' is' : ' are'} at risk of becoming ${getQuadrantName(crisisRisk.count, 'defectors', isClassicModel)}. This may require attention. You might consider reaching out to understand their concerns and could take action to address issues before they churn.`,
      quadrant: 'loyalists',
      priority: 0, // Highest priority
      actionability: 'hard',
      expectedImpact: 'high',
      roi: calculateROI('high', 'hard'),
      supportingData: { 
        count: crisisRisk.count, 
        riskType: 'crisis',
        relationship: 'loyalists_close_to_defectors',
        customers: customers
      }
    });
  }

  // Redemption opportunity (defectors → loyalists)
  const redemptionOpp = evaluators.proximity.topOpportunities.find(o => o.type === 'defectors_close_to_loyalists');
  if (redemptionOpp && redemptionOpp.count > 0) {
    const defectorName = getQuadrantName(redemptionOpp.count, 'defectors', isClassicModel);
    const loyalistName = getQuadrantName(redemptionOpp.count, 'loyalists', isClassicModel);
    
    // Get customer list from proximity analysis
    let customers: Array<{
      id: string;
      name?: string;
      email?: string;
      satisfaction: number;
      loyalty: number;
      position: string;
      distance: number;
      riskScore: number;
    }> = [];
    
    if (proximityAnalysis?.analysis?.defectors_close_to_loyalists?.customers) {
      const detail = proximityAnalysis.analysis.defectors_close_to_loyalists;
      customers = detail.customers.map(c => {
        // Try to get email from original data if available
        const originalCustomer = originalData?.find(d => d.id === c.id);
        return {
          id: c.id,
          name: c.name || originalCustomer?.name || '',
          email: originalCustomer?.email || '',
          satisfaction: c.satisfaction,
          loyalty: c.loyalty,
          position: `(${c.satisfaction}, ${c.loyalty})`,
          distance: c.distanceFromBoundary,
          riskScore: c.riskScore,
          ...(originalCustomer || {}) // Spread all additional properties from original data
        };
      });
    }
    
    actions.push({
      id: 'action-redemption',
      statement: `${redemptionOpp.count} ${getQuadrantName(redemptionOpp.count, 'defectors', isClassicModel)}${redemptionOpp.count === 1 ? ' is' : ' are'} close to becoming ${getQuadrantName(redemptionOpp.count, 'loyalists', isClassicModel)}. This could represent a high-value redemption opportunity. You might consider engaging them personally, addressing their past concerns, and demonstrating that you've learned from their feedback.`,
      quadrant: 'defectors',
      priority: 1,
      actionability: 'hard',
      expectedImpact: 'high',
      roi: calculateROI('high', 'hard'),
      supportingData: { 
        count: redemptionOpp.count, 
        opportunityType: 'redemption',
        relationship: 'defectors_close_to_loyalists',
        customers: customers
      }
    });
  }

  // ===== ACTIONABLE CONVERSIONS (High Priority Opportunities) =====
  // Add all High Priority Opportunities as actions
  console.log('[generateActions] Actionable Conversions Check:', {
    hasConversions: !!actionableConversions,
    opportunitiesCount: actionableConversions?.opportunities?.length || 0,
    opportunities: actionableConversions?.opportunities?.map(conv => ({
      from: conv.from,
      to: conv.to,
      total: conv.total,
      averageChances: conv.averageChances
    })) || []
  });
  
  if (actionableConversions?.opportunities && actionableConversions.opportunities.length > 0) {
    console.log(`[generateActions] Adding ${actionableConversions.opportunities.length} conversion actions`);
    actionableConversions.opportunities.forEach((conv, idx) => {
      const impact = determineImpact(conv.total, conv.averageChances);
      const actionability = determineActionability(conv.averageChances);
      
      actions.push({
        id: `action-conversion-${conv.from}-to-${conv.to}`,
        statement: generateConversionStatement(conv, isClassicModel),
        quadrant: conv.from as QuadrantType | 'apostles' | 'terrorists' | 'near_apostles' | undefined,
        priority: 2 + idx, // After crisis (0) and redemption (1)
        actionability: actionability,
        expectedImpact: impact,
        roi: calculateROI(impact, actionability),
        supportingData: {
          conversionType: 'opportunity',
          from: conv.from,
          to: conv.to,
          customerCount: conv.total,
          averageChances: conv.averageChances,
          customers: conv.customers.map(c => {
            const originalCustomer = originalData?.find(d => d.id === c.id);
            return {
              id: c.id,
              name: c.name || originalCustomer?.name || '',
              email: originalCustomer?.email || c.email || '',
              satisfaction: c.satisfaction,
              loyalty: c.loyalty,
              position: `(${c.satisfaction}, ${c.loyalty})`,
              distance: c.distanceFromBoundary,
              chances: c.riskScore,
              ...(originalCustomer || {}) // Spread all additional properties from original data
            };
          })
        }
      });
    });
  }

  // Sort by priority (lower = higher priority), then by ROI (higher = better)
  return actions.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return b.roi - a.roi;
  });
}

