/**
 * Statement Templates
 * 
 * This file is auto-generated from the markdown document.
 * DO NOT EDIT MANUALLY - run: node scripts/parse-statement-templates.js
 * 
 * Generated: 2025-11-28T11:18:45.056Z
 */

interface StatementTemplate {
  id: string;
  category: 'findings' | 'opportunities' | 'risks' | 'actions';
  type: string;
  condition?: string;
  template: string;
  placeholders?: string[];
  quadrant?: string;
  priority?: number;
}

interface StatementTemplates {
  findings: StatementTemplate[];
  opportunities: StatementTemplate[];
  risks: StatementTemplate[];
  actions: StatementTemplate[];
}

const statementTemplates: StatementTemplates = {
  "findings": [
    {
      "id": "low-sample",
      "type": "Low Sample",
      "template": "It's important to highlight that we have a limited sample of {number} customers, which is not too high.",
      "placeholders": [
        "number"
      ],
      "category": "findings"
    },
    {
      "id": "high-sample",
      "type": "High Sample",
      "template": "We've got a good sample of {number} customers that should be a good representation of your customer base. However, far from making assumptions, you should make sure that this sample is representative enough for the personas, the moments of truth covered, the possible customer journeys covered, and whatever else applies to consider different representations.",
      "placeholders": [
        "number"
      ],
      "category": "findings"
    },
    {
      "id": "quadrant-introduction",
      "type": "Quadrant Introduction",
      "template": "{QuadrantName} are {description}. {Strategic context}. {Key actions to consider}.",
      "placeholders": [
        "QuadrantName",
        "description",
        "Strategic context",
        "Key actions to consider"
      ],
      "category": "findings"
    },
    {
      "id": "one-off-purchase-context",
      "type": "One-Off Purchase Context",
      "template": "Before focusing too heavily on Defectors, it's worth considering that depending on your industry and products, some customers may have intended to make just a one-off purchase from you, and that's not necessarily a problem. This is particularly relevant in industries where single transactions are the norm, such as event tickets, one-time services, or specialised equipment. In these cases, a customer not returning doesn't necessarily indicate dissatisfaction - they may simply have had a one-time need that you fulfilled successfully.",
      "placeholders": [],
      "category": "findings"
    },
    {
      "id": "buying-in-error-context",
      "type": "Buying in Error Context",
      "template": "Some customers may have bought from you in error, assuming your services and products would do something different to what they actually do, or for whatever reason you are not a good fit for their needs. This could happen due to misunderstanding of what your product or service actually does, marketing or messaging that didn't accurately represent your offering, customers making assumptions about capabilities that weren't clearly communicated, or a mismatch between customer expectations and your actual value proposition. Understanding why customers bought from you in error can reveal opportunities to improve your marketing and messaging clarity, expand your product or service offerings to meet unmet needs, better align your value proposition with customer expectations, or identify new market segments you could serve.",
      "placeholders": [],
      "category": "findings"
    },
    {
      "id": "when-defectors-are-a-real-concern",
      "type": "When Defectors Are a Real Concern",
      "template": "However, Defectors represent {percentage}% of your customer base, which is a genuine concern that requires immediate attention. In these cases, the defection is likely due to actual dissatisfaction with your products or services, poor customer experience at some point in their journey, better alternatives becoming available, or a breakdown in the customer relationship. This warrants focused investigation and action.",
      "placeholders": [
        "percentage"
      ],
      "category": "findings"
    },
    {
      "id": "wrong-customers-warning",
      "type": "Wrong Customers Warning",
      "template": "Within the Defectors group, it's worth considering whether some of these are 'wrong customers' - customers who constantly complain, return products, or require excessive service. These customers may not align with your company's core value proposition and can consume disproportionate resources, negatively impact team morale, potentially damage your reputation through persistent complaints, and create operational inefficiencies. You should invest in preventing this from the very first steps of the customer journey by clearly communicating what your products/services do and don't do, setting proper expectations upfront, having clear terms and conditions, screening customers where appropriate, and providing self-service resources to help customers determine if you're the right fit.",
      "placeholders": [],
      "category": "findings"
    },
    {
      "id": "tied-quadrants",
      "type": "Tied Quadrants",
      "template": "Your customer distribution shows {QuadrantName1} and {QuadrantName2} are equally represented, each with {count} customers ({percentage}% of the total). This balanced distribution suggests {interpretation based on which quadrants are tied}.",
      "placeholders": [
        "QuadrantName1",
        "QuadrantName2",
        "count",
        "percentage",
        "interpretation based on which quadrants are tied"
      ],
      "category": "findings"
    },
    {
      "id": "very-small-largest-group",
      "type": "Very Small Largest Group",
      "template": "Your customer base is highly fragmented, with {QuadrantName} being your largest segment at only {percentage}% of customers. This extreme diversity suggests {interpretation}. While diversity can be positive, such high fragmentation may indicate {potential issues}.",
      "placeholders": [
        "QuadrantName",
        "percentage",
        "interpretation",
        "potential issues"
      ],
      "category": "findings"
    },
    {
      "id": "zero-customers-in-quadrant",
      "type": "Zero Customers in Quadrant",
      "template": "It's worth noting that you have no customers in the {QuadrantName} segment. {Contextual explanation}. This could indicate {possible reasons}, or it might suggest that your data collection is missing certain customer types or experiences.",
      "placeholders": [
        "QuadrantName",
        "Contextual explanation",
        "possible reasons"
      ],
      "category": "findings"
    },
    {
      "id": "neutral-customers",
      "type": "Neutral Customers",
      "template": "You have {count} Neutral customer{plural} ({percentage}% of your total) who {is/are} exactly at the midpoint - neither satisfied nor dissatisfied, neither loyal nor disloyal. These customers are at a critical transition point where they could move in literally any direction. This represents both a significant opportunity and a potential risk. With the right engagement, they could easily become Loyalists or even Apostles, but without attention, they could drift toward Hostages or Defectors. Their neutral position suggests they haven't formed strong opinions yet, making them more receptive to positive experiences. You should engage with them immediately to understand their experience, create positive moments that will tip them toward satisfaction and loyalty, and monitor their movement closely to prevent drift toward negative quadrants.",
      "placeholders": [
        "count",
        "plural",
        "percentage",
        "is/are"
      ],
      "category": "findings"
    },
    {
      "id": "high-neutral-count",
      "type": "High Neutral Count",
      "template": "The significant number of Neutral customers suggests that your brand hasn't made a strong impression yet, or that customers are genuinely indifferent. This is an opportunity to proactively shape their experience and guide them toward positive quadrants.",
      "placeholders": [],
      "category": "findings"
    },
    {
      "id": "low-neutral-count",
      "type": "Low Neutral Count",
      "template": "Whilst the number of Neutral customers is small, each one represents a critical opportunity. Don't overlook them - targeted engagement could quickly convert them into Loyalists.",
      "placeholders": [],
      "category": "findings"
    },
    {
      "id": "strong-positive-score",
      "type": "Strong Positive Score",
      "template": "Your Recommendation Score of {score} is strong and positive, indicating that you have significantly more promoters than detractors.",
      "placeholders": [
        "score"
      ],
      "category": "findings"
    },
    {
      "id": "positive-score-not-strong",
      "type": "Positive Score (Not Strong)",
      "template": "Your Recommendation Score of {score} is positive, showing that you have more promoters than detractors, though there's still room for improvement.",
      "placeholders": [
        "score"
      ],
      "category": "findings"
    },
    {
      "id": "negative-score",
      "type": "Negative Score",
      "template": "Your Recommendation Score of {score} is negative, indicating that you have more detractors than promoters, which is a concern that needs addressing.",
      "placeholders": [
        "score"
      ],
      "category": "findings"
    },
    {
      "id": "incomplete-scale-coverage",
      "type": "Incomplete Scale Coverage",
      "template": "It's worth noting that your Recommendation Score analysis may have an incomplete scope, as not all values on the scale are represented in your customer responses. A Recommendation Score is typically more accurate and reliable when analysing a balanced and healthy scenario where responses are distributed across the full range of possible values. This could indicate that your data collection might be missing certain customer segments or experiences.",
      "placeholders": [],
      "category": "findings"
    },
    {
      "id": "high-score-70-79",
      "type": "High Score (70-79)",
      "template": "Your Recommendation Score of {score} is quite high. Whilst this is encouraging, it's worth considering whether the way data is being gathered could potentially be biased. For example, are you being selective about who you ask the question, or asking it only during particularly positive moments of the customer journey? A Recommendation Score is typically more accurate and reliable when analysing a balanced and healthy scenario where responses are collected across different touchpoints and customer experiences, including moments when customers might be frustrated or disappointed.",
      "placeholders": [
        "score"
      ],
      "category": "findings"
    },
    {
      "id": "very-high-score-80-89",
      "type": "Very High Score (80-89)",
      "template": "Your Recommendation Score of {score} is very high, which is uncommon in typical customer experience scenarios. This may indicate that your data collection approach could be selective or biased. For instance, are you asking the Recommendation Score question only at the beginning of the customer experience when they're happy with their deal, after using a promotion discount, or when they have built a good relationship with the sales team? The most revealing and honest moment for the Recommendation Score is not when a customer has just joined, but when they have had opportunities to be frustrated or disappointed. Consider whether you're collecting responses after service issues, complaints, or other challenging moments in the customer journey.",
      "placeholders": [
        "score"
      ],
      "category": "findings"
    },
    {
      "id": "exceptionally-high-score-90",
      "type": "Exceptionally High Score (90+)",
      "template": "Your Recommendation Score of {score} is exceptionally high, which is extremely rare in genuine customer experience scenarios. This strongly suggests that your data collection method may be biased or selective. A score this high typically means almost everyone is a promoter, with almost no detractors or passives - in other words, the vast majority of customers rated the question with the two highest possible answers. This pattern often occurs when: the sample is too small and selective, the question is only asked at positive moments in the customer journey, or certain customer segments are systematically excluded. We would recommend reviewing your data collection methodology to ensure you're gathering responses from a representative sample across all customer touchpoints and experiences, including challenging moments.",
      "placeholders": [
        "score"
      ],
      "category": "findings"
    },
    {
      "id": "opening-statement-apostles",
      "type": "Opening Statement - apostles",
      "template": "This is your most popular group of customers, according to the data analysed. It's wonderful to see that most of your customers are potential advocates of your brand!",
      "placeholders": [],
      "category": "findings",
      "quadrant": "apostles"
    },
    {
      "id": "opening-statement-loyalists",
      "type": "Opening Statement - loyalists",
      "template": "Loyalists is the most popular segment with {count} customers, representing {percentage}% of the total. This is excellent news - Loyalists are the reason why your business is still alive. They are happy customers who are also willing to come back to you. They're the foundation of your business's stability and growth. However, remember that loyalty is fragile and competition is fierce, so you should not take their loyalty for granted.",
      "placeholders": [
        "count",
        "percentage"
      ],
      "category": "findings",
      "quadrant": "loyalists"
    },
    {
      "id": "opening-statement-mercenaries",
      "type": "Opening Statement - mercenaries",
      "template": "Mercenaries is the most popular segment with {count} customers, representing {percentage}% of the total. This group represents satisfied customers who know you, like you, and trust you - but they also shop with competitors. Rather than seeing this as a problem, recognise it as a massive opportunity. These are returning customers who are happy with your offering. Your goal should be to keep your products and services in their top suppliers to buy from as frequently as possible, rather than trying to make them exclusively loyal (which is often unrealistic in today's competitive landscape).",
      "placeholders": [
        "count",
        "percentage"
      ],
      "category": "findings",
      "quadrant": "mercenaries"
    },
    {
      "id": "opening-statement-hostages",
      "type": "Opening Statement - hostages",
      "template": "Hostages is the most popular segment with {count} customers, representing {percentage}% of the total. This is a serious concern that requires immediate attention. Hostages are customers who continue to buy from you despite being dissatisfied - they're staying out of necessity rather than choice. This means a significant portion of your customer base is unhappy with your products or services, and they will churn as soon as a better option becomes available. Additionally, they could already be damaging your reputation through negative feedback. You need to urgently investigate why they're not satisfied and address the underlying issues before competitors provide alternatives.",
      "placeholders": [
        "count",
        "percentage"
      ],
      "category": "findings",
      "quadrant": "hostages"
    },
    {
      "id": "opening-statement-defectors",
      "type": "Opening Statement - defectors",
      "template": "Defectors is the most popular segment with {count} customers, representing {percentage}% of the total. This is a critical situation that demands immediate action. Defectors are customers who are both dissatisfied and disloyal - they've either already left you or are on the brink of doing so. Having this as your largest segment indicates serious problems with your products, services, or customer experience. These customers are likely sharing negative feedback and may be actively harming your reputation. You need to urgently investigate what went wrong, address the root causes, and implement recovery strategies before this situation worsens.",
      "placeholders": [
        "count",
        "percentage"
      ],
      "category": "findings",
      "quadrant": "defectors"
    },
    {
      "id": "opening-statement-near_apostles",
      "type": "Opening Statement - near_apostles",
      "template": "Near-Apostles is the most popular segment with {count} customers, representing {percentage}% of the total. This is excellent news - Near-Apostles are Loyalists who are on the verge of becoming full advocates. They love your brand and are loyal, but haven't yet actively promoted or recommended you to others. Your priority should be promoting them into full Apostles by activating their advocacy potential, ensuring they don't lose their connection with your brand, and giving them the tools and incentives to become your brand ambassadors.",
      "placeholders": [
        "count",
        "percentage"
      ],
      "category": "findings",
      "quadrant": "near_apostles"
    },
    {
      "id": "opening-statement-terrorists",
      "type": "Opening Statement - terrorists",
      "template": "Terrorists/Near-Terrorists is the most popular segment with {count} customers, representing {percentage}% of the total. This is a serious concern that requires immediate attention. These customers are extremely dissatisfied and disloyal, and they may actively discourage others from buying and could damage your reputation. You need to investigate why such a large portion of your customer base falls into this category and take urgent action to address the underlying issues.",
      "placeholders": [
        "count",
        "percentage"
      ],
      "category": "findings",
      "quadrant": "terrorists"
    },
    {
      "id": "neutral-customers-statement",
      "type": "Neutral Customers Statement",
      "template": "You have {count} Neutral customer{plural} ({percentage}% of your total) who {is/are} exactly at the midpoint - neither satisfied nor dissatisfied, neither loyal nor disloyal. These customers are at a critical transition point where they could move in literally any direction. This represents both a significant opportunity and a potential risk. With the right engagement, they could easily become Loyalists or even Apostles, but without attention, they could drift toward Hostages or Defectors. Their neutral position suggests they haven't formed strong opinions yet, making them more receptive to positive experiences. You should engage with them immediately to understand their experience, create positive moments that will tip them toward satisfaction and loyalty, and monitor their movement closely to prevent drift toward negative quadrants.",
      "placeholders": [
        "count",
        "plural",
        "percentage",
        "is/are"
      ],
      "category": "findings"
    },
    {
      "id": "neutral-customers-high",
      "type": "Neutral Customers - High Count",
      "template": "The significant number of Neutral customers suggests that your brand hasn't made a strong impression yet, or that customers are genuinely indifferent. This is an opportunity to proactively shape their experience and guide them toward positive quadrants.",
      "placeholders": [],
      "category": "findings"
    },
    {
      "id": "neutral-customers-low",
      "type": "Neutral Customers - Low Count",
      "template": "Whilst the number of Neutral customers is small, each one represents a critical opportunity. Don't overlook them - targeted engagement could quickly convert them into Loyalists.",
      "placeholders": [],
      "category": "findings"
    },
    {
      "id": "sample-size-low",
      "type": "Sample Size - Low",
      "template": "It's important to highlight that we have a limited sample of {number} customers, which is not too high.",
      "placeholders": [
        "number"
      ],
      "category": "findings"
    },
    {
      "id": "sample-size-high",
      "type": "Sample Size - High",
      "template": "We've got a good sample of {number} customers that should be a good representation of your customer base. However, far from making assumptions, you should make sure that this sample is representative enough for the personas, the moments of truth covered, the possible customer journeys covered, and whatever else applies to consider different representations.",
      "placeholders": [
        "number"
      ],
      "category": "findings"
    },
    {
      "id": "sample-size-good-representation",
      "type": "Sample Size - Good Representation",
      "template": "However, although the number of customers is limited, they are actually somewhat spread out across the different categories, which might make us consider them as representative, even if the volume isn't too high. You will probably need to carry out some further analysis to determine if all personas and all significant segments are represented in this somewhat small group of customers that we are analysing here.",
      "placeholders": [],
      "category": "findings"
    },
    {
      "id": "sample-size-poor-representation",
      "type": "Sample Size - Poor Representation",
      "template": "In addition to the somewhat small group of customers to analyse, it should be noted that not all groups have sufficient representation, with only a few or no customers at all in some quadrants. This might mean that we don't have sufficient representation of customers, and any analysis on this data might be incomplete, if not potentially misleading. You should segment the customer data and determine whether the small sample is representative enough for the personas, the moments of truth covered, the possible customer journeys covered, and whatever else applies to consider different representations. If it is concluded that the current data is not representative enough, it is strongly suggested to find ways to add customer data to this analysis or alternatively find alternatives to analyse customer data.",
      "placeholders": [],
      "category": "findings"
    }
  ],
  "opportunities": [
    {
      "id": "high-promoters-opportunity",
      "type": "High Promoters Opportunity",
      "template": "You have {count} Promoters ({percentage}% of your customers), which is excellent. These customers are your brand advocates and represent a strong foundation for growth through word-of-mouth and referrals.",
      "placeholders": [
        "count",
        "percentage"
      ],
      "category": "opportunities"
    },
    {
      "id": "growing-promoters-opportunity",
      "type": "Growing Promoters Opportunity",
      "template": "You have {count} Promoters ({percentage}% of your customers). Whilst this is a good foundation, there's an opportunity to grow this segment through exceptional customer experiences and referral incentives.",
      "placeholders": [
        "count",
        "percentage"
      ],
      "category": "opportunities"
    },
    {
      "id": "passives-conversion-opportunity",
      "type": "Passives Conversion Opportunity",
      "template": "You have {count} Passives ({percentage}% of your customers) who are neutral about your brand. These customers represent a significant opportunity to move them into the Promoter category through targeted engagement and improved experiences.",
      "placeholders": [
        "count",
        "percentage"
      ],
      "category": "opportunities"
    },
    {
      "id": "opportunity-promoters-high",
      "type": "High Promoters Opportunity",
      "template": "You have {count} Promoters ({percentage}% of your customers), which is excellent. These customers are your brand advocates and represent a strong foundation for growth through word-of-mouth and referrals.",
      "placeholders": [
        "count",
        "percentage"
      ],
      "category": "opportunities"
    },
    {
      "id": "opportunity-promoters-growing",
      "type": "Growing Promoters Opportunity",
      "template": "You have {count} Promoters ({percentage}% of your customers). Whilst this is a good foundation, there's an opportunity to grow this segment through exceptional customer experiences and referral incentives.",
      "placeholders": [
        "count",
        "percentage"
      ],
      "category": "opportunities"
    },
    {
      "id": "opportunity-passives",
      "type": "Passives Conversion Opportunity",
      "template": "You have {count} Passives ({percentage}% of your customers) who are neutral about your brand. These customers represent a significant opportunity to move them into the Promoter category through targeted engagement and improved experiences.",
      "placeholders": [
        "count",
        "percentage"
      ],
      "category": "opportunities"
    }
  ],
  "risks": [
    {
      "id": "high-detractors-risk",
      "type": "High Detractors Risk",
      "template": "You have {count} Detractors ({percentage}% of your customers), who are unlikely to recommend your brand and may actively discourage others. This represents a significant risk to your reputation and growth.",
      "placeholders": [
        "count",
        "percentage"
      ],
      "category": "risks"
    },
    {
      "id": "negative-recommendation-score-risk",
      "type": "Negative Recommendation Score Risk",
      "template": "Your Recommendation Score of {score} is negative, meaning you have more Detractors than Promoters. This is a serious concern that requires immediate attention to prevent further customer loss and reputational damage.",
      "placeholders": [
        "score"
      ],
      "category": "risks"
    },
    {
      "id": "risk-detractors-high",
      "type": "High Detractors Risk",
      "template": "You have {count} Detractors ({percentage}% of your customers), who are unlikely to recommend your brand and may actively discourage others. This represents a significant risk to your reputation and growth.",
      "placeholders": [
        "count",
        "percentage"
      ],
      "category": "risks"
    },
    {
      "id": "risk-negative-score",
      "type": "Negative Recommendation Score Risk",
      "template": "Your Recommendation Score of {score} is negative, meaning you have more Detractors than Promoters. This is a serious concern that requires immediate attention to prevent further customer loss and reputational damage.",
      "placeholders": [
        "score"
      ],
      "category": "risks"
    }
  ],
  "actions": [
    {
      "id": "action-unknown-strengthen-loyalty",
      "type": "Strengthen loyalty",
      "template": "Implement retention strategies such as personalised offers, loyalty programmes, and exclusive perks.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 1
    },
    {
      "id": "action-unknown-encourage-advocacy",
      "type": "Encourage advocacy",
      "template": "Motivate them to become brand advocates through referral programmes, user-generated content campaigns, or testimonials.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 2
    },
    {
      "id": "action-unknown-reward-loyalty",
      "type": "Reward loyalty",
      "template": "Recognise their value with thank-you notes, anniversary discounts, or early access to new products.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 3
    },
    {
      "id": "action-unknown-involve-them-in-your-success",
      "type": "Involve them in your success",
      "template": "They are clearly willing to keep buying from you, so make sure you are meeting their expectations. If you organise any research for launching new products and services, or you need any customer testimonials, these people should be your top candidates.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 4
    },
    {
      "id": "action-unknown-dont-ignore-them",
      "type": "Don't ignore them",
      "template": "Remember they are active customers! You don't need to invest in expensive Marketing campaigns to attract them because they are already doing so. Then, you must focus on meeting their expectations by understanding their motivations and needs.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 1
    },
    {
      "id": "action-unknown-understand-reasons",
      "type": "Understand reasons",
      "template": "The first thing you need to do is understand why they are not satisfied with your products and services. You may be tempted to investigate why they are forced to buy from you, but your real interest should be on their lack of satisfaction, rather than their forced loyalty.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 2
    },
    {
      "id": "action-unknown-address-dissatisfaction",
      "type": "Address dissatisfaction",
      "template": "If you know why you are not meeting Hostages' needs, you may be uncovering pain points that potentially affect other segments in your customer base. Tackling those issues will help to turn their dissatisfaction and others'. Address their concerns promptly and transparently to build trust.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 3
    },
    {
      "id": "action-unknown-create-a-path-to-satisfaction",
      "type": "Create a path to satisfaction",
      "template": "Transition them into Loyalists by offering improved service, personalised solutions, or tailored engagement.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 4
    },
    {
      "id": "action-unknown-offer-them-support",
      "type": "Offer them support",
      "template": "In today's world personalisation is key. Your Customer Success strategy should count on special measures for this group, such as a dedicated account manager, direct support line, dedicated communications, documentation or more approachable channels.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 5
    },
    {
      "id": "action-unknown-monitor-closely",
      "type": "Monitor closely",
      "template": "Use feedback systems to track whether interventions are improving their experience and sentiment.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 6
    },
    {
      "id": "action-unknown-prevent",
      "type": "Prevent",
      "template": "A defector is by definition someone disappointed. These people used to buy from you (or considered doing so), but at some point, they changed their minds. Running research to understand those frustrations will allow you to do something to prevent those situations from affecting other customers.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 1
    },
    {
      "id": "action-unknown-damage-control",
      "type": "Damage control",
      "template": "Identify defectors as early as possible and address their dissatisfaction proactively. Use your data to find their emails and chat interactions if they exist. Read their reviews, or customer support interactions to understand their grievances. They most likely already gave up on you, so you don't need to waste your time sending them surveys that they are very likely to ignore.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 2
    },
    {
      "id": "action-unknown-win-them-back",
      "type": "Win them back",
      "template": "It may be not too late and you may have some chances to win them back. Offer a personalised resolution or incentive to regain their trust. Do not think about discounts as an immediate reaction, or free services. The first action would be the acknowledgment of mistakes, apologise for any wrongdoing and resolving issues. Once the air is clear you can think about promotions and gestures of goodwill.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 3
    },
    {
      "id": "action-unknown-learn-from-them",
      "type": "Learn from them",
      "template": "Prevention again. Analyse defectors' feedback to uncover systemic issues and prevent future churn.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 4
    },
    {
      "id": "action-unknown-know-your-customers",
      "type": "Know your customers",
      "template": "The first question you should have an answer to is why they buy from you and what they like from your offering. Make sure you keep that, and improve it when possible.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 1
    },
    {
      "id": "action-unknown-know-your-competitors",
      "type": "Know your competitors",
      "template": "The second question would be what are others offering that you don't. You may find some easy wins and good ideas to implement in your brand. If the industry is progressing but you are not, you need to keep up.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 2
    },
    {
      "id": "action-unknown-build-relationships",
      "type": "Build relationships",
      "template": "Create a sense of connection with the brand through personalised communications, loyalty programmes, or customer communities.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 3
    },
    {
      "id": "action-unknown-reward-loyalty",
      "type": "Reward loyalty",
      "template": "You should celebrate when a Mercenary is making a purchase. Recognise their value with thank-you notes, anniversary discounts, or early access to new products. You want to create a sense of connection with the brand through personalised communications, loyalty programmes, or customer communities.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 4
    },
    {
      "id": "action-unknown-second-time-buyer-discounts",
      "type": "Second-time buyer discounts",
      "template": "Consider offering second-time buyer discounts and other retention strategies specifically designed to encourage Mercenaries to return. These customers are already happy with you - you just need to make it easy and attractive for them to come back.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 5
    },
    {
      "id": "action-unknown-differentiate-beyond-price",
      "type": "Differentiate beyond price",
      "template": "Emphasise unique value propositions like quality, convenience, or user experience that competitors can't easily replicate.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 6
    },
    {
      "id": "action-unknown-personalised-offers",
      "type": "Personalised offers",
      "template": "Use customer data to offer exclusive deals or personalised recommendations that make them feel valued.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 7
    },
    {
      "id": "action-unknown-simplify-repurchasing",
      "type": "Simplify repurchasing",
      "template": "Eliminate friction in the purchasing process, from easy online checkouts to convenient delivery options.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 8
    },
    {
      "id": "action-unknown-incentivise-repeat-purchases",
      "type": "Incentivise repeat purchases",
      "template": "Use targeted promotions or tiered loyalty programmes to encourage recurring business.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 9
    },
    {
      "id": "action-unknown-stay-in-their-top-suppliers",
      "type": "Stay in their top suppliers",
      "template": "Focus on ensuring your products and services remain in Mercenaries' top suppliers to buy from as frequently as possible, rather than trying to make them exclusively loyal.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 10
    },
    {
      "id": "action-unknown-celebrate-and-amplify",
      "type": "Celebrate and amplify",
      "template": "Publicly acknowledge and reward Apostles for their advocacy through exclusive benefits, recognition programmes, or personalised thank-you notes. Advocates who praise your brand on social media will appreciate your engagement, such as comments or likes on their posts. You should always amplify positivity and expand it as much as possible so it can influence others.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 1
    },
    {
      "id": "action-unknown-leverage-their-voice",
      "type": "Leverage their voice",
      "template": "Invite them to become part of referral programmes, co-creation initiatives (e.g., helping to design new products), or ambassador programmes. Share their testimonials and stories across your marketing channels. Give them a voice to inspire others.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 2
    },
    {
      "id": "action-unknown-maintain-satisfaction",
      "type": "Maintain satisfaction",
      "template": "Continue delivering exceptional service and experiences to ensure they remain loyal and satisfied. Be proactive in gathering their feedback and addressing any potential issues.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 3
    },
    {
      "id": "action-unknown-enable-advocacy",
      "type": "Enable advocacy",
      "template": "Provide tools and incentives that make it easier for them to recommend your brand, such as shareable links, exclusive discount codes for friends, or social media badges.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 4
    },
    {
      "id": "action-unknown-activate-advocacy",
      "type": "Activate advocacy",
      "template": "Encourage them to share their experiences through referral programmes, social sharing incentives, or contests.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 1
    },
    {
      "id": "action-unknown-showcase-their-stories",
      "type": "Showcase their stories",
      "template": "Feature these customers in case studies, testimonials, or user-generated content campaigns.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 2
    },
    {
      "id": "action-unknown-deepen-engagement",
      "type": "Deepen engagement",
      "template": "Invite them to participate in product feedback sessions or brand ambassador programmes, fostering a stronger connection.",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 3
    },
    {
      "id": "action-unknown-engage-immediately",
      "type": "Engage immediately",
      "template": "Don't let them remain neutral - reach out to understand their experience and expectations",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 1
    },
    {
      "id": "action-unknown-create-positive-moments",
      "type": "Create positive moments",
      "template": "Design experiences that will tip them toward satisfaction and loyalty",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 2
    },
    {
      "id": "action-unknown-gather-feedback",
      "type": "Gather feedback",
      "template": "Use their neutral position as an opportunity to understand what would make them more satisfied and loyal",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 3
    },
    {
      "id": "action-unknown-personalised-outreach",
      "type": "Personalised outreach",
      "template": "Since they're not strongly committed, personalised attention can have a significant impact",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 4
    },
    {
      "id": "action-unknown-monitor-closely",
      "type": "Monitor closely",
      "template": "Track their movement - are they trending toward positive or negative quadrants?",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 5
    },
    {
      "id": "action-unknown-prevent-drift",
      "type": "Prevent drift",
      "template": "Act before they become Hostages or Defectors\r\n\r\n**When to Mention Neutrals**:\r\n- Always mention if there are any Neutral customers (count > 0)\r\n- Emphasise their critical transition point status\r\n- Highlight the opportunity and risk they represent\r\n- Provide actionable guidance on how to engage with them",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 6
    },
    {
      "id": "action-unknown-monitor-closely",
      "type": "Monitor closely",
      "template": "Track these customers and their interactions",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 1
    },
    {
      "id": "action-unknown-investigate-reasons",
      "type": "Investigate reasons",
      "template": "Understand why they are extremely dissatisfied",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 2
    },
    {
      "id": "action-unknown-consider-damage-control",
      "type": "Consider damage control",
      "template": "Implement measures to prevent reputation damage",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 3
    },
    {
      "id": "action-unknown-amend-terms",
      "type": "Amend terms",
      "template": "Potentially resolve issues or amend terms with them",
      "placeholders": [],
      "category": "actions",
      "quadrant": "unknown",
      "priority": 4
    }
  ]
};

export default statementTemplates;
