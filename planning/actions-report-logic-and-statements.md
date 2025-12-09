# Actions Report Logic and Statements

**Document Purpose**: This document defines the complete logic, definitions, and statement conditions for generating the Actions Report. This is an internal reference document for developers implementing the report generation system.

**Status**: Private document - not for public distribution

**Last Updated**: 2024-01-XX

---

## Table of Contents

1. [Customer Segmentation Overview](#customer-segmentation-overview)
2. [Quadrant Definitions and Descriptions](#quadrant-definitions-and-descriptions)
3. [Distribution Analysis Logic](#distribution-analysis-logic)
4. [Statement Generation Rules](#statement-generation-rules)
5. [Report-Specific Logic](#report-specific-logic)
6. [Current Production Statements](#current-production-statements)
7. [Statement Templates](#statement-templates)
8. [Thresholds and Constants](#thresholds-and-constants)

---

## Customer Segmentation Overview

The Actions Report analyses customer distribution across four main quadrants and special zones based on satisfaction and loyalty scores. The analysis helps identify strategic actions and priorities.

### Main Quadrants

- **Loyalists**: High satisfaction, high loyalty
- **Mercenaries**: High satisfaction, low loyalty
- **Hostages**: Low satisfaction, high loyalty
- **Defectors**: Low satisfaction, low loyalty

### Special Zones

- **Apostles**: Maximum satisfaction and maximum loyalty
- **Terrorists**: Minimum satisfaction and minimum loyalty
- **Near-Apostles**: Near-maximum satisfaction and loyalty
- **Near-Terrorists**: Near-minimum satisfaction and loyalty

### Neutral Customers (Midpoint)

- **Neutrals**: Customers exactly on the midpoint (satisfaction = midpoint, loyalty = midpoint)
- **Important Note**: Neutrals are excluded from distribution counting and analytical calculations, but they should still be mentioned in findings and opportunities as they represent a critical transition point.

---

## Quadrant Definitions and Descriptions

### 1. Loyalists (Satisfied and Loyal)

**Definition**: Customers with high satisfaction and high loyalty scores.

**Meaning**:
These customers are the happy ones and not only that, they enjoy buying from you. The most satisfied with your brand and display loyalty through consistent purchases. They're the foundation of your business's stability and growth. Loyalists may not always advocate publicly, but their steady support is invaluable. However, loyalty is fragile and the competency is fierce out there, so you should not take your loyalists' loyalty for granted.

**Strategic Context**:
Loyalists are the reason why your business is still alive. They are happy customers who are also willing to come back to you. Your focus should be to:
- Keep them engaged and satisfied
- Attract more customers from other segments
- Work towards upgrading them to apostles

**Key Actions** (from `actions.ts`):
1. **Strengthen loyalty**: Implement retention strategies such as personalised offers, loyalty programmes, and exclusive perks.
2. **Encourage advocacy**: Motivate them to become brand advocates through referral programmes, user-generated content campaigns, or testimonials.
3. **Reward loyalty**: Recognise their value with thank-you notes, anniversary discounts, or early access to new products.
4. **Involve them in your success**: They are clearly willing to keep buying from you, so make sure you are meeting their expectations. If you organise any research for launching new products and services, or you need any customer testimonials, these people should be your top candidates.

---

### 2. Hostages (Dissatisfied but Loyal)

**Definition**: Customers with low satisfaction but high loyalty scores.

**Meaning**:
These customers continue to buy from you due to a lack of alternatives, switching costs, or necessity, but they're dissatisfied. They accepted they need to keep buying from you for regulatory reasons, compliance, to meet their customers' requirements or any other reason, but don't forget they would not buy from you otherwise. Not only they will churn as soon as a better option arises, but they could be already damaging your reputation through negative feedback.

**Strategic Context**:
These are customers who, for whatever reason, need to buy from you although they are not particularly happy about your services and products.

**Why They Keep Buying**:
Depending on your industry, it could be because of:
- Legal requirement
- Business condition
- Contract they are tied to
- You are the only company offering the product they need
- Your location is better in the market
- Your competitors are even worse than you
- Other constraints

**What to Investigate**:
1. Why they keep buying from you?
2. Why they are not happy?
3. Potentially find improvements to apply if it's about issues in some particular area of the customer journey (e.g. invoicing, delivery, support, etc.)

**Key Actions** (from `actions.ts`):
1. **Don't ignore them**: Remember they are active customers! You don't need to invest in expensive Marketing campaigns to attract them because they are already doing so. Then, you must focus on meeting their expectations by understanding their motivations and needs.
2. **Understand reasons**: The first thing you need to do is understand why they are not satisfied with your products and services. You may be tempted to investigate why they are forced to buy from you, but your real interest should be on their lack of satisfaction, rather than their forced loyalty.
3. **Address dissatisfaction**: If you know why you are not meeting Hostages' needs, you may be uncovering pain points that potentially affect other segments in your customer base. Tackling those issues will help to turn their dissatisfaction and others'. Address their concerns promptly and transparently to build trust.
4. **Create a path to satisfaction**: Transition them into Loyalists by offering improved service, personalised solutions, or tailored engagement.
5. **Offer them support**: In today's world personalisation is key. Your Customer Success strategy should count on special measures for this group, such as a dedicated account manager, direct support line, dedicated communications, documentation or more approachable channels.
6. **Monitor closely**: Use feedback systems to track whether interventions are improving their experience and sentiment.

---

### 3. Defectors (Dissatisfied and Disloyal)

**Definition**: Customers with low satisfaction and low loyalty scores.

**Meaning**:
These customers are unhappy and have already stopped purchasing from you or are on the brink of doing so. They are likely to share negative feedback and may harm your reputation if left unaddressed.

**Strategic Context**:
Defectors are customers at risk of leaving you or people who have left you already. It would be a good idea to investigate further their reasons, if there were some complaint, or something went wrong last time they bought from you.

**Important Considerations - Before Getting Obsessed with This Group**:

Before you get obsessed with this group, you also need to consider that depending on your industry and products, some customers would just buy a one-off purchase from you, and that's not necessarily a problem. This is particularly relevant in industries where single transactions are the norm (e.g., event tickets, one-time services, specialised equipment). In these cases, a customer not returning doesn't necessarily indicate dissatisfaction - they may simply have had a one-time need that you fulfilled successfully.

Similarly, people may have bought from you in error, assuming your services and products would do something different to what they actually do, or for whatever reason you are not a good fit for their needs. This could happen due to:
- Misunderstanding of what your product or service actually does
- Marketing or messaging that didn't accurately represent your offering
- Customers making assumptions about capabilities that weren't clearly communicated
- A mismatch between customer expectations and your actual value proposition

You can explore those reasons and consider expanding your offer based on that. Understanding why customers bought from you in error can reveal opportunities to:
- Improve your marketing and messaging clarity
- Expand your product or service offerings to meet unmet needs
- Better align your value proposition with customer expectations
- Identify new market segments you could serve

**When Defectors Are a Real Concern**:

However, if defectors represent a significant portion of your customer base, or if they're leaving after multiple purchases, this is a genuine concern that requires immediate attention. In these cases, the defection is likely due to:
- Actual dissatisfaction with your products or services
- Poor customer experience at some point in their journey
- Better alternatives becoming available
- A breakdown in the customer relationship

**"Wrong Customers" Concept**:

Within this group, we need to consider the "wrong customers". If a customer constantly complains, returns products, or requires excessive service, they may not align with your company's core value proposition. These customers can:
- Consume disproportionate resources (support time, refunds, replacements)
- Negatively impact team morale
- Potentially damage your reputation through persistent complaints
- Create operational inefficiencies

You should invest in preventing this from the very first steps of the customer journey by:
- Clearly communicating what your products/services do and don't do
- Setting proper expectations upfront
- Having clear terms and conditions
- Screening customers where appropriate (for B2B or high-value transactions)
- Providing self-service resources to help customers determine if you're the right fit

As a last resort, some companies implement 'firing customers' strategies to let wrong customers go. This is a difficult decision but may be necessary when:
- The customer relationship is unprofitable and unlikely to improve
- The customer's behaviour is harmful to your business or team
- Multiple attempts to resolve issues have failed
- The customer's needs fundamentally don't align with what you offer

If you do need to part ways with a customer, do so professionally and respectfully, perhaps by:
- Explaining that you may not be the best fit for their needs
- Suggesting alternative providers if appropriate
- Offering a graceful exit that doesn't burn bridges

**Key Actions** (from `actions.ts`):
1. **Prevent**: A defector is by definition someone disappointed. These people used to buy from you (or considered doing so), but at some point, they changed their minds. Running research to understand those frustrations will allow you to do something to prevent those situations from affecting other customers.
2. **Damage control**: Identify defectors as early as possible and address their dissatisfaction proactively. Use your data to find their emails and chat interactions if they exist. Read their reviews, or customer support interactions to understand their grievances. They most likely already gave up on you, so you don't need to waste your time sending them surveys that they are very likely to ignore.
3. **Win them back**: It may be not too late and you may have some chances to win them back. Offer a personalised resolution or incentive to regain their trust. Do not think about discounts as an immediate reaction, or free services. The first action would be the acknowledgment of mistakes, apologise for any wrongdoing and resolving issues. Once the air is clear you can think about promotions and gestures of goodwill.
4. **Learn from them**: Prevention again. Analyse defectors' feedback to uncover systemic issues and prevent future churn.

---

### 4. Mercenaries (Satisfied but Disloyal)

**Definition**: Customers with high satisfaction but low loyalty scores.

**Meaning**:
Mercenaries are satisfied with their experience but lack loyalty. They shop with you opportunistically, typically driven by discounts, deals, or convenience and will switch to competitors without hesitation.

**Important Context** (from `action_report.md`):
> This group is often misinterpreted and many brands penalise customers who come and go, by rejecting applications from customers who left earlier. On the contrary, this group represents the core of the massive opportunity that is a returning customer.
>
> Mercenaries know you, like you and trust you. What is wrong with that? Do you want customers to buy from you and only from you? Welcome to the real world with globalised fierce competition.
>
> Instead of disregarding them, you should make efforts to make them come back to you. They are unlikely to be exclusively buying from you, but at least make sure you keep your products and services in the Mercenaries' top suppliers to buy from as frequently as possible.
>
> If you are in retail or other industries, it's in your business nature to accept that your customers are also others' customers. Don't fight it, use it!

**Strategic Context**:
These are customers who are happy with you but also buy from or are prepared to buy from competitors. This is something worth exploring, and you should consider second-time buyer discounts and other retention strategies. Most importantly, you need to be present in their minds when they're ready to make a purchase decision, since they are actually happy with you. You simply need to be a strong contender next time they are ready to buy and decide between you and your competitors.

**Key Insight - Top Suppliers Goal**:
Instead of trying to make Mercenaries exclusively loyal to you (which is often unrealistic), focus on ensuring your products and services remain in their top suppliers to buy from as frequently as possible. This is a more achievable and realistic goal that recognises the reality of modern competition. In retail and many other industries, it's natural that your customers are also others' customers - don't fight this reality, use it to your advantage.

**Important Note**:
We are all mercenaries though. Most of us buy our groceries from different supermarkets and our clothes from different brands.

**Key Actions** (from `actions.ts` and `action_report.md`):
1. **Know your customers**: The first question you should have an answer to is why they buy from you and what they like from your offering. Make sure you keep that, and improve it when possible.
2. **Know your competitors**: The second question would be what are others offering that you don't. You may find some easy wins and good ideas to implement in your brand. If the industry is progressing but you are not, you need to keep up.
3. **Build relationships**: Create a sense of connection with the brand through personalised communications, loyalty programmes, or customer communities.
4. **Reward loyalty**: You should celebrate when a Mercenary is making a purchase. Recognise their value with thank-you notes, anniversary discounts, or early access to new products. You want to create a sense of connection with the brand through personalised communications, loyalty programmes, or customer communities.
5. **Second-time buyer discounts**: Consider offering second-time buyer discounts and other retention strategies specifically designed to encourage Mercenaries to return. These customers are already happy with you - you just need to make it easy and attractive for them to come back.
6. **Differentiate beyond price**: Emphasise unique value propositions like quality, convenience, or user experience that competitors can't easily replicate.
7. **Personalised offers**: Use customer data to offer exclusive deals or personalised recommendations that make them feel valued.
8. **Simplify repurchasing**: Eliminate friction in the purchasing process, from easy online checkouts to convenient delivery options.
9. **Incentivise repeat purchases**: Use targeted promotions or tiered loyalty programmes to encourage recurring business.
10. **Stay in their top suppliers**: Focus on ensuring your products and services remain in Mercenaries' top suppliers to buy from as frequently as possible, rather than trying to make them exclusively loyal.

---

### 5. Apostles (Highly Satisfied, Loyal, and Advocating)

**Definition**: Maximum satisfaction and maximum loyalty scores.

**Meaning**:
Apostles are your brand's strongest supporters. They're not only loyal and satisfied but also actively advocate for your brand by recommending it to others. Apostles bring in new customers through word of mouth, social proof, and genuine enthusiasm for your products or services. They represent the pinnacle of customer experience success.

**Risk Warning**:
> The risk with Apostles is taking them for granted and assuming that they don't need your attention and they will always be there no matter what.

**Strategic Context**:
You should give apostles and near-apostles a gentle push. They are customers ready to praise you publicly and on social media, so you can help them to do so by:
- Including them in some VIP referral programme
- Providing them with materials for them to share and promote your brand
- Making them your ambassadors, your influencers as a down-to-earth addition to your global Marketing strategy

**Key Actions** (from `actions.ts` and `action_report.md`):
1. **Celebrate and amplify**: Publicly acknowledge and reward Apostles for their advocacy through exclusive benefits, recognition programmes, or personalised thank-you notes. Advocates who praise your brand on social media will appreciate your engagement, such as comments or likes on their posts. You should always amplify positivity and expand it as much as possible so it can influence others.
2. **Leverage their voice**: Invite them to become part of referral programmes, co-creation initiatives (e.g., helping to design new products), or ambassador programmes. Share their testimonials and stories across your marketing channels. Give them a voice to inspire others.
3. **Maintain satisfaction**: Continue delivering exceptional service and experiences to ensure they remain loyal and satisfied. Be proactive in gathering their feedback and addressing any potential issues.
4. **Enable advocacy**: Provide tools and incentives that make it easier for them to recommend your brand, such as shareable links, exclusive discount codes for friends, or social media badges.

---

### 6. Near-Apostles (Highly Satisfied and Loyal, but Limited Advocacy)

**Definition**: Near-maximum satisfaction and loyalty scores, but not yet full advocates.

**Meaning**:
Near-Apostles are Loyalists who are on the verge of becoming full advocates. They love your brand and are loyal but have not yet actively promoted or recommended you to others.

**Strategic Context**:
> Your priority here is promoting them into full Apostles, ensuring they don't lose their connection with your brand.

**Key Actions** (from `action_report.md`):
1. **Activate advocacy**: Encourage them to share their experiences through referral programmes, social sharing incentives, or contests.
2. **Showcase their stories**: Feature these customers in case studies, testimonials, or user-generated content campaigns.
3. **Deepen engagement**: Invite them to participate in product feedback sessions or brand ambassador programmes, fostering a stronger connection.

---

### 7. Neutrals (Midpoint Customers)

**Definition**: Customers with satisfaction and loyalty scores exactly equal to the midpoint of their respective scales.

**Meaning**:
These customers are at a critical transition point - they're neither satisfied nor dissatisfied, neither loyal nor disloyal. They're "fence-sitters" who could move in literally any direction. This makes them both a significant opportunity and a potential risk, depending on how you engage with them.

**Strategic Context**:
Neutrals are excluded from distribution counting because they don't clearly belong to any quadrant. However, they represent a crucial segment that requires immediate attention because:
- They're at a tipping point and could become Loyalists, Mercenaries, Hostages, or Defectors
- Small improvements or missteps could dramatically shift their trajectory
- They represent "low-hanging fruit" - customers who are neither committed nor alienated
- Their neutral position suggests they haven't formed strong opinions yet, making them more receptive to positive experiences

**Why They Matter**:
- **Opportunity**: With the right engagement, they could easily become Loyalists or even Apostles
- **Risk**: Without attention, they could drift toward Hostages or Defectors
- **Efficiency**: They're more malleable than customers with strong opinions, making targeted interventions more effective
- **Early Warning**: A large number of Neutrals might indicate that your brand hasn't made a strong impression yet, or that customers are genuinely indifferent

**Key Actions**:
1. **Engage immediately**: Don't let them remain neutral - reach out to understand their experience and expectations
2. **Create positive moments**: Design experiences that will tip them toward satisfaction and loyalty
3. **Gather feedback**: Use their neutral position as an opportunity to understand what would make them more satisfied and loyal
4. **Personalised outreach**: Since they're not strongly committed, personalised attention can have a significant impact
5. **Monitor closely**: Track their movement - are they trending toward positive or negative quadrants?
6. **Prevent drift**: Act before they become Hostages or Defectors

**When to Mention Neutrals**:
- Always mention if there are any Neutral customers (count > 0)
- Emphasise their critical transition point status
- Highlight the opportunity and risk they represent
- Provide actionable guidance on how to engage with them

---

### 8. Terrorists (and Near-Terrorists)

**Definition**: Minimum satisfaction and minimum loyalty scores (or near-minimum).

**Meaning**:
These customers are extremely dissatisfied and disloyal. They may actively discourage others from buying and could damage your reputation.

**Strategic Context**:
You need to keep an eye on customers who could be considered trolls or near-trolls, as they could damage your reputation and prevent new and existing buyers from purchasing from you. You may want to investigate further and consider amending terms or resolving issues with them.

**Key Actions**:
1. **Monitor closely**: Track these customers and their interactions
2. **Investigate reasons**: Understand why they are extremely dissatisfied
3. **Consider damage control**: Implement measures to prevent reputation damage
4. **Amend terms**: Potentially resolve issues or amend terms with them

---

## Distribution Analysis Logic

### Calculating Distribution

The distribution evaluator calculates:
- **Counts**: Number of customers in each quadrant
- **Percentages**: Percentage of total customers in each quadrant
- **Largest Quadrant**: The quadrant with the most customers
- **Balance Status**: Whether distribution is balanced or skewed

### Distribution Metrics

**Available Calculations** (from `distributionEvaluator.ts`):
- `counts`: Record of counts per quadrant
- `percentages`: Record of percentages per quadrant
- `largest`: The quadrant with the highest count
- `isBalanced`: True if multiple quadrants have similar counts (within 15% of largest)
- `isSkewed`: True if one quadrant dominates > 50% of total
- `closelyFollowed`: Array of quadrants within 15% of the largest quadrant's count
- `total`: Total number of customers

### Balance Detection Logic

**Closely Followed Threshold**: 15% difference from largest
- If a quadrant's count is within 15% of the largest quadrant's count, it's considered "closely followed"

**Balanced Distribution**: 
- `isBalanced = true` when `closelyFollowed.length >= 2`
- This means at least 2 quadrants are within 15% of the largest

**Skewed Distribution**:
- `isSkewed = true` when `largestCount > total * 0.5`
- This means the largest quadrant has more than 50% of all customers

**Too Empty Detection**:
- A quadrant with < 5% of total could be considered "too empty"
- OR: A quadrant with < 20% of average per quadrant (average = total / 4 for main quadrants)

**Too Full Detection**:
- A quadrant > 50% of total (skewed)
- OR: A quadrant significantly larger than others (> 10 percentage points difference from second largest)

**Statement for Too Empty Quadrant**:
When a quadrant has < 5% of total customers, include: "It's worth noting that the {QuadrantName} segment is significantly underrepresented, with only {count} customers ({percentage}% of your base). This could indicate that this customer type is rare in your market, or that your data collection might be missing certain customer segments or experiences. Consider whether this underrepresentation reflects your actual customer base or suggests gaps in your data collection approach."

**Statement for Too Full Quadrant**:
When a quadrant > 50% of total (skewed), this is already covered by the skewed distribution statement. However, if a quadrant is significantly larger (> 10 percentage points difference) but not quite skewed, consider: "Your customer distribution shows a strong concentration in the {QuadrantName} segment, with {percentage}% of customers. Whilst this might seem positive, it also indicates a lack of diversity in your customer base, which could pose risks if market conditions change or if this segment's needs evolve."

---

## Statement Generation Rules

### Opening Statements Based on Largest Group

**Order of Presentation**: Groups should be presented by order of relevance, meaning the group with more volume of customers is presented first.

#### If Apostles is the Most Numerous

**Opening Statement**:
"This is your most popular group of customers, according to the data analysed. It's wonderful to see that most of your customers are potential advocates of your brand!"

**Follow-up Statements**:
- **If closely followed by another**: "However, you shouldn't be tempted to rest on your laurels, as although this is your most popular group, others are not far behind."
- **If not closely followed**: "However, you shouldn't be tempted to rest on your laurels, as these customers might move to other groups if you don't take good care of them."

#### If Loyalists is the Most Numerous

**Opening Statement**:
"Loyalists is the most popular segment with {count} customers, representing {percentage}% of the total. This is excellent news - Loyalists are the reason why your business is still alive. They are happy customers who are also willing to come back to you. They're the foundation of your business's stability and growth. However, remember that loyalty is fragile and competition is fierce, so you should not take their loyalty for granted."

**Follow-up Statements**:
- **If closely followed**: "However, you shouldn't be tempted to rest on your laurels, as although Loyalists is your most popular group, {other groups} {is/are} not far behind."
- **If not closely followed**: "However, you shouldn't be tempted to rest on your laurels, as these customers might move to other groups if you don't take good care of them."

#### If Mercenaries is the Most Numerous

**Opening Statement**:
"Mercenaries is the most popular segment with {count} customers, representing {percentage}% of the total. This group represents satisfied customers who know you, like you, and trust you - but they also shop with competitors. Rather than seeing this as a problem, recognise it as a massive opportunity. These are returning customers who are happy with your offering. Your goal should be to keep your products and services in their top suppliers to buy from as frequently as possible, rather than trying to make them exclusively loyal (which is often unrealistic in today's competitive landscape)."

**Follow-up Statements**:
- **If closely followed**: "However, you shouldn't be tempted to rest on your laurels, as although Mercenaries is your most popular group, {other groups} {is/are} not far behind."
- **If not closely followed**: "However, you shouldn't be tempted to rest on your laurels, as these customers might move to other groups if you don't take good care of them."

#### If Hostages is the Most Numerous

**Opening Statement**:
"Hostages is the most popular segment with {count} customers, representing {percentage}% of the total. This is a serious concern that requires immediate attention. Hostages are customers who continue to buy from you despite being dissatisfied - they're staying out of necessity rather than choice. This means a significant portion of your customer base is unhappy with your products or services, and they will churn as soon as a better option becomes available. Additionally, they could already be damaging your reputation through negative feedback. You need to urgently investigate why they're not satisfied and address the underlying issues before competitors provide alternatives."

**Follow-up Statements**:
- **If closely followed**: "The situation is particularly concerning as {other groups} {is/are} not far behind, indicating widespread issues across your customer base."
- **If not closely followed**: "This concentration of dissatisfied customers represents a significant risk to your business stability and reputation."

#### If Defectors is the Most Numerous

**Opening Statement**:
"Defectors is the most popular segment with {count} customers, representing {percentage}% of the total. This is a critical situation that demands immediate action. Defectors are customers who are both dissatisfied and disloyal - they've either already left you or are on the brink of doing so. Having this as your largest segment indicates serious problems with your products, services, or customer experience. These customers are likely sharing negative feedback and may be actively harming your reputation. You need to urgently investigate what went wrong, address the root causes, and implement recovery strategies before this situation worsens."

**Follow-up Statements**:
- **If closely followed**: "The situation is particularly alarming as {other groups} {is/are} not far behind, suggesting systemic issues affecting a large portion of your customer base."
- **If not closely followed**: "This concentration of defectors represents an urgent crisis that requires immediate intervention to prevent further customer loss and reputational damage."

#### If Near-Apostles is the Most Numerous

**Opening Statement**:
"Near-Apostles is the most popular segment with {count} customers, representing {percentage}% of the total. This is excellent news - Near-Apostles are Loyalists who are on the verge of becoming full advocates. They love your brand and are loyal, but haven't yet actively promoted or recommended you to others. Your priority should be promoting them into full Apostles by activating their advocacy potential, ensuring they don't lose their connection with your brand, and giving them the tools and incentives to become your brand ambassadors."

**Follow-up Statements**:
- **If closely followed**: "However, you shouldn't be tempted to rest on your laurels, as although Near-Apostles is your most popular group, {other groups} {is/are} not far behind. Focus on converting these Near-Apostles into full advocates while maintaining your position."
- **If not closely followed**: "However, you shouldn't be tempted to rest on your laurels, as these customers might move to other groups if you don't take good care of them. Act now to activate their advocacy potential."

#### If Terrorists/Near-Terrorists is the Most Numerous

**Opening Statement**:
"Terrorists/Near-Terrorists is the most popular segment with {count} customers, representing {percentage}% of the total. This is a serious concern that requires immediate attention. These customers are extremely dissatisfied and disloyal, and they may actively discourage others from buying and could damage your reputation. You need to investigate why such a large portion of your customer base falls into this category and take urgent action to address the underlying issues."

**Follow-up Statements**:
- **If closely followed**: "However, you shouldn't be tempted to rest on your laurels, as although Terrorists/Near-Terrorists is your most popular group, {other groups} {is/are} not far behind."
- **If not closely followed**: "However, you shouldn't be tempted to rest on your laurels, as these customers might move to other groups if you don't take good care of them."

#### Neutral Customers Statement

**Condition**: There are Neutral customers (count > 0)

**Opening Statement**:
"You have {count} Neutral customer{plural} ({percentage}% of your total) who {is/are} exactly at the midpoint - neither satisfied nor dissatisfied, neither loyal nor disloyal. These customers are at a critical transition point where they could move in literally any direction. This represents both a significant opportunity and a potential risk. With the right engagement, they could easily become Loyalists or even Apostles, but without attention, they could drift toward Hostages or Defectors. Their neutral position suggests they haven't formed strong opinions yet, making them more receptive to positive experiences. You should engage with them immediately to understand their experience, create positive moments that will tip them toward satisfaction and loyalty, and monitor their movement closely to prevent drift toward negative quadrants."

**Follow-up Statements**:
- **If Neutral count is high (> 10% of total)**: "The significant number of Neutral customers suggests that your brand hasn't made a strong impression yet, or that customers are genuinely indifferent. This is an opportunity to proactively shape their experience and guide them toward positive quadrants."
- **If Neutral count is low (< 5% of total)**: "Whilst the number of Neutral customers is small, each one represents a critical opportunity. Don't overlook them - targeted engagement could quickly convert them into Loyalists."

### Sample Size Statements

#### If Total Number of Categorised Customers is Too Low

**Condition**: Sample size is low (threshold: < 30 customers, configurable)

**Statement**:
"It's important to highlight that we have a limited sample of {number} customers, which is not too high."

**Follow-up Statements**:

1. **If volume is limited but there's presence in all groups**:
   "However, although the number of customers is limited, they are actually somewhat spread out across the different categories, which might make us consider them as representative, even if the volume isn't too high. You will probably need to carry out some further analysis to determine if all personas and all significant segments are represented in this somewhat small group of customers that we are analysing here."

2. **If volume is limited and there're groups with very little presence or none at all**:
   "In addition to the somewhat small group of customers to analyse, it should be noted that not all groups have sufficient representation, with only a few or no customers at all in some quadrants. This might mean that we don't have sufficient representation of customers, and any analysis on this data might be incomplete, if not potentially misleading. You should segment the customer data and determine whether the small sample is representative enough for the personas, the moments of truth covered, the possible customer journeys covered, and whatever else applies to consider different representations. If it is concluded that the current data is not representative enough, it is strongly suggested to find ways to add customer data to this analysis or alternatively find alternatives to analyse customer data."

#### If Total Number of Categorised Customers is High Enough

**Condition**: Sample size is high (threshold: >= 100 customers, configurable)

**Statement**:
"We've got a good sample of {number} customers that should be a good representation of your customer base. However, far from making assumptions, you should make sure that this sample is representative enough for the personas, the moments of truth covered, the possible customer journeys covered, and whatever else applies to consider different representations."

**Follow-up Statements**:

1. **If number of customers is high and there's a good representation in all groups**:
   "We seem to have a good representation of customers in all groups, which constitutes a healthy scenario where all possible mindsets and customer types are covered in the analysis."

2. **If number of customers is high but not really representing all groups**:
   "It should be noted that not all groups seem to have sufficient representation, with only a small portion or no customers at all. This might mean that we don't have sufficient representation of customers, and any analysis on this data might be incomplete, if not potentially misleading. You should segment the customer data and determine whether the sample is representative enough for the personas, the moments of truth covered, the possible customer journeys covered, and whatever else applies to consider different representations. If it is concluded that the current data is not representative enough, it is strongly suggested to find ways to add customer data to this analysis or alternatively find alternatives to analyse customer data."

### Ideal Scenario Statement

**Condition**: There's a minimum of data and it's spread across all groups

**Statement**:
"The ideal scenario would be when there's a minimum amount of data and it's spread across all groups. This balanced representation allows for a more comprehensive and reliable analysis of your customer base."

### Edge Cases

#### Tied Quadrants (Equal Counts)

**Condition**: Two or more quadrants have exactly the same count (tied for largest)

**Statement Template**:
"Your customer distribution shows {QuadrantName1} and {QuadrantName2} are equally represented, each with {count} customers ({percentage}% of the total). This balanced distribution suggests {interpretation based on which quadrants are tied}."

**Interpretations**:
- **If Loyalists and Mercenaries tied**: "a healthy mix of satisfied customers, with some showing strong loyalty and others shopping around - both are positive indicators."
- **If Hostages and Defectors tied**: "significant challenges with customer satisfaction across your base, requiring urgent attention."
- **If positive and negative quadrants tied**: "a divided customer base, with equal numbers of satisfied and dissatisfied customers - this represents both opportunity and risk."

#### Very Small Largest Group

**Condition**: Largest quadrant represents < 15% of total (very fragmented distribution)

**Statement Template**:
"Your customer base is highly fragmented, with {QuadrantName} being your largest segment at only {percentage}% of customers. This extreme diversity suggests {interpretation}. While diversity can be positive, such high fragmentation may indicate {potential issues}."

#### Zero Customers in Quadrant

**Condition**: One or more main quadrants have zero customers

**Statement Template**:
"It's worth noting that you have no customers in the {QuadrantName} segment. {Contextual explanation}. This could indicate {possible reasons}, or it might suggest that your data collection is missing certain customer types or experiences."

**Contextual Explanations**:
- **No Defectors**: "This is unusual - most businesses have some defectors. This could indicate excellent customer satisfaction, or it might suggest your data collection is missing customers who have already left or are dissatisfied."
- **No Hostages**: "This suggests customers aren't feeling trapped - they're either satisfied or have left. This is generally positive, though it's worth ensuring you're capturing all customer experiences."
- **No Mercenaries**: "This suggests customers are either very loyal or very disloyal, with little in between. This could indicate strong brand loyalty or strong dissatisfaction - check your other segments."
- **No Loyalists**: "This is concerning - having no Loyalists suggests significant challenges with customer satisfaction and loyalty. This requires immediate investigation."

### Defector-Specific Contextual Statements

**When to Include Defector Context**:
These statements should be included when Defectors represent a significant portion of the customer base, or when generating actions/recommendations for the Defectors segment.

#### Statement: One-Off Purchase Context

**Condition**: 
- Defectors segment is present
- Industry or product type suggests one-off purchases are common
- OR: Analysis shows many defectors had only single purchase

**Statement Template**:
"Before focusing too heavily on Defectors, it's worth considering that depending on your industry and products, some customers may have intended to make just a one-off purchase from you, and that's not necessarily a problem. This is particularly relevant in industries where single transactions are the norm, such as event tickets, one-time services, or specialised equipment. In these cases, a customer not returning doesn't necessarily indicate dissatisfaction - they may simply have had a one-time need that you fulfilled successfully."

#### Statement: Buying in Error Context

**Condition**:
- Defectors segment is present
- Analysis suggests potential misalignment between customer expectations and offering

**Statement Template**:
"Some customers may have bought from you in error, assuming your services and products would do something different to what they actually do, or for whatever reason you are not a good fit for their needs. This could happen due to misunderstanding of what your product or service actually does, marketing or messaging that didn't accurately represent your offering, customers making assumptions about capabilities that weren't clearly communicated, or a mismatch between customer expectations and your actual value proposition. Understanding why customers bought from you in error can reveal opportunities to improve your marketing and messaging clarity, expand your product or service offerings to meet unmet needs, better align your value proposition with customer expectations, or identify new market segments you could serve."

#### Statement: When Defectors Are a Real Concern

**Condition**:
- Defectors represent > 20% of customer base
- OR: Analysis shows defectors had multiple purchases before leaving
- OR: Defectors segment is the largest or second-largest group

**Statement Template**:
"However, Defectors represent {percentage}% of your customer base, which is a genuine concern that requires immediate attention. In these cases, the defection is likely due to actual dissatisfaction with your products or services, poor customer experience at some point in their journey, better alternatives becoming available, or a breakdown in the customer relationship. This warrants focused investigation and action."

#### Statement: Wrong Customers Warning

**Condition**:
- Defectors segment is present
- Analysis shows patterns of excessive complaints, returns, or support requests

**Statement Template**:
"Within the Defectors group, it's worth considering whether some of these are 'wrong customers' - customers who constantly complain, return products, or require excessive service. These customers may not align with your company's core value proposition and can consume disproportionate resources, negatively impact team morale, potentially damage your reputation through persistent complaints, and create operational inefficiencies. You should invest in preventing this from the very first steps of the customer journey by clearly communicating what your products/services do and don't do, setting proper expectations upfront, having clear terms and conditions, screening customers where appropriate, and providing self-service resources to help customers determine if you're the right fit."

### Recommendation Score Statements

**Important**: Always refer to this metric as "Recommendation Score" - never use "NPS" or "Net Promoter Score" in any statements.

#### Basic Recommendation Score Statements

**Condition**: Recommendation Score is available (score !== 0)

**Detection Logic**:
- `isStrong`: Score is significantly positive (typically >= 50, but context-dependent)
- `isPositive`: Score > 0 (more promoters than detractors)
- `isNegative`: Score < 0 (more detractors than promoters)
- `isWeak`: Score is negative or very low positive

**Statement Templates**:

**For Strong Positive Scores**:
"Your Recommendation Score of {score} is strong and positive, indicating that you have significantly more promoters than detractors."

**For Positive Scores (Not Strong)**:
"Your Recommendation Score of {score} is positive, showing that you have more promoters than detractors, though there's still room for improvement."

**For Negative Scores**:
"Your Recommendation Score of {score} is negative, indicating that you have more detractors than promoters, which is a concern that needs addressing."

**Additional Context**:
- Any Recommendation Score above 0 is a positive outcome, as it means you have more excited customers than not excited
- Companies that largely rely on excited customers (like Facebook or Google) would rarely go beyond 50, and that would be a great result considering their massive volume of customers
- The focus should be on using the score to set strategies and define actions to improve, rather than obsessing over achieving the highest possible number

#### Incomplete Scale Coverage

**Condition**: Not all values on the Recommendation Score scale have customer responses

**Detection Logic**:
- Check if there are customers in all possible scale values (typically 0-10 for an 11-point scale)
- If any scale values have zero customers, the scope may be incomplete

**Statement Template**:
"It's worth noting that your Recommendation Score analysis may have an incomplete scope, as not all values on the scale are represented in your customer responses. A Recommendation Score is typically more accurate and reliable when analysing a balanced and healthy scenario where responses are distributed across the full range of possible values. This could indicate that your data collection might be missing certain customer segments or experiences."

**Tone**: Prudent, helpful, professional - not accusatory

#### Suspiciously High Score Detection

**Condition**: Recommendation Score is unusually high (typically 70+ or 80+)

**Detection Logic**:
- Score >= 70: Flag as potentially suspicious
- Score >= 80: Flag as highly suspicious
- Score >= 90: Flag as extremely suspicious

**Context** (from `NPS true or false.txt`):
The Recommendation Score is calculated by subtracting percentages (% promoters - % detractors). In a healthy scenario where both percentages are positive, the result will never reach 100. The scale is demanding, with only around 20% of possible answers counting as positive, while 60% are subtracted. Additionally, passives (around 20% of possible answers) are ignored in the calculation.

**Statement Templates**:

**For Scores 70-79**:
"Your Recommendation Score of {score} is quite high. Whilst this is encouraging, it's worth considering whether the way data is being gathered could potentially be biased. For example, are you being selective about who you ask the question, or asking it only during particularly positive moments of the customer journey? A Recommendation Score is typically more accurate and reliable when analysing a balanced and healthy scenario where responses are collected across different touchpoints and customer experiences, including moments when customers might be frustrated or disappointed."

**For Scores 80-89**:
"Your Recommendation Score of {score} is very high, which is uncommon in typical customer experience scenarios. This may indicate that your data collection approach could be selective or biased. For instance, are you asking the Recommendation Score question only at the beginning of the customer experience when they're happy with their deal, after using a promotion discount, or when they have built a good relationship with the sales team? The most revealing and honest moment for the Recommendation Score is not when a customer has just joined, but when they have had opportunities to be frustrated or disappointed. Consider whether you're collecting responses after service issues, complaints, or other challenging moments in the customer journey."

**For Scores 90+**:
"Your Recommendation Score of {score} is exceptionally high, which is extremely rare in genuine customer experience scenarios. This strongly suggests that your data collection method may be biased or selective. A score this high typically means almost everyone is a promoter, with almost no detractors or passives - in other words, the vast majority of customers rated the question with the two highest possible answers. This pattern often occurs when: the sample is too small and selective, the question is only asked at positive moments in the customer journey, or certain customer segments are systematically excluded. We would recommend reviewing your data collection methodology to ensure you're gathering responses from a representative sample across all customer touchpoints and experiences, including challenging moments."

**Tone**: Prudent, professional, helpful - constructive rather than accusatory. Focus on helping improve data quality rather than criticising.

**Additional Context**:
- Companies that largely rely on excited customers (like Facebook or Google) would rarely go beyond 50, and that would be a great result considering their massive volume of customers
- Any Recommendation Score above 0 is a positive outcome, as it means you have more excited customers than not excited
- The focus should be on using the score to set strategies and define actions to improve, rather than obsessing over achieving the highest possible number

---

## Report-Specific Logic

### Findings Report

**Purpose**: Present key observations about the data and distribution.

**Structure**:
1. Data Overview (sample size, representation)
2. Distribution Analysis (largest group, balance, skew)
3. Statistics (satisfaction/loyalty averages)
4. Recommendation Score

**Current Production Statements** (from `findings.ts`):

1. **Sample Size Findings**:
   - Low sample: "It's important to highlight that we have a limited sample of {total} customers, which is not too high."
   - High sample: "We've got a good sample of {total} customers that should be a good representation of your customer base..."

2. **Distribution Findings**:
   - Main: "Your most common group is {QuadrantName}."
   - Closely followed: "However, you shouldn't be tempted to rest on your laurels, as although {LargestQuadrant} is your most popular group, {OtherQuadrants} {is/are} not far behind."
   - Skewed: "Your customer base is heavily concentrated in the {QuadrantName} segment, with {percentage}% of customers falling into this category..."
   - Balanced: "Your customer base shows a relatively balanced distribution across different segments..."

3. **Statistics Findings**:
   - Satisfaction above/below average
   - Loyalty above/below average

4. **Recommendation Score Findings**:
   - **Basic Score Statements**:
     - Strong positive: "Your Recommendation Score of {score} is strong and positive, indicating that you have significantly more promoters than detractors."
     - Positive: "Your Recommendation Score of {score} is positive, showing that you have more promoters than detractors, though there's still room for improvement."
     - Negative: "Your Recommendation Score of {score} is negative, indicating that you have more detractors than promoters, which is a concern that needs addressing."
   - **Score Validation Comments**:
     - Incomplete scale coverage (not all scale values represented)
     - Potential bias detection (suspiciously high scores: 70+, 80+, 90+)

### Actions Report

**Purpose**: Provide actionable recommendations prioritised by impact and ease.

**Structure**:
1. Actions by Quadrant (if quadrant has customers)
2. Proximity-based Actions (crisis prevention, redemption opportunities)
3. Special Zone Actions (apostles, terrorists)

**Key Principles**:
- Actions are generated for each quadrant that has customers
- Actions are generated for Neutral customers if they exist (count > 0)
- Actions are prioritised by ROI (impact × actionability)
- Urgent actions (crisis prevention) get priority 0
- Neutral customer actions should be high priority due to their critical transition point
- Each action includes the quadrant context

**Current Production Actions** (from `actions.ts`):

See [Quadrant Definitions](#quadrant-definitions-and-descriptions) section above for complete action lists.

### Opportunities Report

**Purpose**: Highlight positive opportunities for growth and improvement.

**Current Production Statements** (from `opportunities.ts`):

1. **Proximity Opportunities**:
   - Top opportunity statements
   - Redemption diagonal (defectors → loyalists)
   - Apostles promotion opportunities

2. **Recommendation Score Opportunities**:
   - **High Promoters (>20%)**: "You have {count} Promoters ({percentage}% of your customers), which is excellent. These customers are your brand advocates and represent a strong foundation for growth through word-of-mouth and referrals."
   - **Growing Promoters (10-20%)**: "You have {count} Promoters ({percentage}% of your customers). Whilst this is a good foundation, there's an opportunity to grow this segment through exceptional customer experiences and referral incentives."
   - **High Passives (>20%)**: "You have {count} Passives ({percentage}% of your customers) who are neutral about your brand. These customers represent a significant opportunity to move them into the Promoter category through targeted engagement and improved experiences."

3. **Distribution Opportunities**:
   - Mercenaries opportunities
   - Hostages conversion opportunities
   - Balanced distribution opportunities

4. **Neutral Customers Opportunities**:
   - Critical transition point opportunity
   - Low-hanging fruit for conversion
   - High potential for positive movement

### Risks Report

**Purpose**: Identify potential threats and areas of concern.

**Current Production Statements** (from `risks.ts`):

1. **Proximity Risks**:
   - Top risk statements
   - Crisis diagonal (loyalists → defectors)
   - Loyalists losing loyalty

2. **Recommendation Score Risks**:
   - **Detractors Risks**:
     - High detractors (>20%): "You have {count} Detractors ({percentage}% of your customers), who are unlikely to recommend your brand and may actively discourage others. This represents a significant risk to your reputation and growth."
     - Severity: High if >30%, Medium if 20-30%
   - **Negative Recommendation Score Risks**:
     - Negative score: "Your Recommendation Score of {score} is negative, meaning you have more Detractors than Promoters. This is a serious concern that requires immediate attention to prevent further customer loss and reputational damage."
     - Severity: High

3. **Distribution Risks**:
   - Defectors risks
   - Hostages risks

### Chart Findings

**Purpose**: Provide expert commentary for charts in the report.

**Current Production Statements** (from `chartFindings.ts`):

1. **Main Visualisation Chart Commentary**
2. **Distribution Chart Commentary**
3. **Response Concentration Chart Commentary**
4. **Proximity Analysis Chart Commentary**
5. **Recommendation Score Chart Commentary**

---

## Current Production Statements

### Findings Statements (from `findings.ts`)

**Sample Size**:
- Low sample with good representation
- Low sample with poor representation
- High sample with good representation
- High sample with poor representation

**Distribution**:
- Dominant quadrant statement
- Closely followed statement
- Skewed distribution statement
- Balanced distribution statement

**Statistics**:
- Satisfaction above/below average
- Loyalty above/below average

**Recommendation Score**:
- Strong/positive/negative score statements

### Actions Statements (from `actions.ts`)

**Loyalists Actions** (4 actions):
1. Strengthen loyalty
2. Encourage advocacy
3. Reward loyalty
4. Involve them in your success

**Mercenaries Actions** (6 actions):
1. Know your customers
2. Know your competitors
3. Build relationships
4. Reward loyalty
5. Differentiate beyond price
6. Simplify repurchasing

**Hostages Actions** (5 actions):
1. Don't ignore them
2. Understand reasons
3. Address dissatisfaction
4. Create a path to satisfaction
5. Offer them support

**Defectors Actions** (4 actions):
1. Prevent future defections
2. Damage control
3. Win them back
4. Learn from them

**Apostles Actions** (3 actions):
1. Celebrate and amplify
2. Leverage their voice
3. Maintain satisfaction

**Neutral Customers Actions** (6 actions):
1. Engage immediately
2. Create positive moments
3. Gather feedback
4. Personalised outreach
5. Monitor closely
6. Prevent drift

**Proximity-Based Actions**:
- Crisis prevention (loyalists → defectors)
- Redemption opportunity (defectors → loyalists)

### Opportunities Statements (from `opportunities.ts`)

- Proximity opportunities
- Recommendation score opportunities
- Distribution opportunities
- Neutral customers opportunities (critical transition point)

### Risks Statements (from `risks.ts`)

- Proximity risks
- Recommendation score risks
- Distribution risks

### Chart Findings Statements (from `chartFindings.ts`)

- Main visualisation commentary
- Distribution commentary
- Concentration commentary
- Proximity commentary
- Recommendation score commentary

---

## Statement Templates

### Distribution Statements

**Template 1: Most Popular Group (Basic)**
```
Your most common group is {QuadrantName}.
```

**Template 2: Most Popular Group (Enhanced)**
```
{QuadrantName} is the most popular segment with {count} customers, representing {percentage}% of the total.
```

**Template 3: Unbalanced Distribution**
```
Your customer distribution is unbalanced. The {QuadrantName} segment is {too crowded/too sparse}, with {percentage}% of customers.
```

**Template 3a: Too Empty Quadrant**
```
It's worth noting that the {QuadrantName} segment is significantly underrepresented, with only {count} customers ({percentage}% of your base). This could indicate that this customer type is rare in your market, or that your data collection might be missing certain customer segments or experiences. Consider whether this underrepresentation reflects your actual customer base or suggests gaps in your data collection approach.
```

**Template 3b: Too Full Quadrant (Not Skewed)**
```
Your customer distribution shows a strong concentration in the {QuadrantName} segment, with {percentage}% of customers. Whilst this might seem positive, it also indicates a lack of diversity in your customer base, which could pose risks if market conditions change or if this segment's needs evolve.
```

**Template 4: Balanced Distribution**
```
Your customer base shows a relatively balanced distribution across different segments, which suggests a healthy mix of customer types and reduces the risk of over-reliance on a single segment.
```

**Template 5: Closely Followed**
```
However, you shouldn't be tempted to rest on your laurels, as although {LargestQuadrant} is your most popular group, {OtherQuadrants} {is/are} not far behind.
```

**Template 6: Not Closely Followed**
```
However, you shouldn't be tempted to rest on your laurels, as these customers might move to other groups if you don't take good care of them.
```

### Sample Size Statements

**Template: Low Sample**
```
It's important to highlight that we have a limited sample of {number} customers, which is not too high.
```

**Template: High Sample**
```
We've got a good sample of {number} customers that should be a good representation of your customer base. However, far from making assumptions, you should make sure that this sample is representative enough for the personas, the moments of truth covered, the possible customer journeys covered, and whatever else applies to consider different representations.
```

### Quadrant Context Statements

**Template: Quadrant Introduction**
```
{QuadrantName} are {description}. {Strategic context}. {Key actions to consider}.
```

### Defector-Specific Statement Templates

**Template: One-Off Purchase Context**
```
Before focusing too heavily on Defectors, it's worth considering that depending on your industry and products, some customers may have intended to make just a one-off purchase from you, and that's not necessarily a problem. This is particularly relevant in industries where single transactions are the norm, such as event tickets, one-time services, or specialised equipment. In these cases, a customer not returning doesn't necessarily indicate dissatisfaction - they may simply have had a one-time need that you fulfilled successfully.
```

**Template: Buying in Error Context**
```
Some customers may have bought from you in error, assuming your services and products would do something different to what they actually do, or for whatever reason you are not a good fit for their needs. This could happen due to misunderstanding of what your product or service actually does, marketing or messaging that didn't accurately represent your offering, customers making assumptions about capabilities that weren't clearly communicated, or a mismatch between customer expectations and your actual value proposition. Understanding why customers bought from you in error can reveal opportunities to improve your marketing and messaging clarity, expand your product or service offerings to meet unmet needs, better align your value proposition with customer expectations, or identify new market segments you could serve.
```

**Template: When Defectors Are a Real Concern**
```
However, Defectors represent {percentage}% of your customer base, which is a genuine concern that requires immediate attention. In these cases, the defection is likely due to actual dissatisfaction with your products or services, poor customer experience at some point in their journey, better alternatives becoming available, or a breakdown in the customer relationship. This warrants focused investigation and action.
```

**Template: Wrong Customers Warning**
```
Within the Defectors group, it's worth considering whether some of these are 'wrong customers' - customers who constantly complain, return products, or require excessive service. These customers may not align with your company's core value proposition and can consume disproportionate resources, negatively impact team morale, potentially damage your reputation through persistent complaints, and create operational inefficiencies. You should invest in preventing this from the very first steps of the customer journey by clearly communicating what your products/services do and don't do, setting proper expectations upfront, having clear terms and conditions, screening customers where appropriate, and providing self-service resources to help customers determine if you're the right fit.
```

### Edge Case Statement Templates

**Template: Tied Quadrants**
```
Your customer distribution shows {QuadrantName1} and {QuadrantName2} are equally represented, each with {count} customers ({percentage}% of the total). This balanced distribution suggests {interpretation based on which quadrants are tied}.
```

**Template: Very Small Largest Group**
```
Your customer base is highly fragmented, with {QuadrantName} being your largest segment at only {percentage}% of customers. This extreme diversity suggests {interpretation}. While diversity can be positive, such high fragmentation may indicate {potential issues}.
```

**Template: Zero Customers in Quadrant**
```
It's worth noting that you have no customers in the {QuadrantName} segment. {Contextual explanation}. This could indicate {possible reasons}, or it might suggest that your data collection is missing certain customer types or experiences.
```

**Template: Neutral Customers**
```
You have {count} Neutral customer{plural} ({percentage}% of your total) who {is/are} exactly at the midpoint - neither satisfied nor dissatisfied, neither loyal nor disloyal. These customers are at a critical transition point where they could move in literally any direction. This represents both a significant opportunity and a potential risk. With the right engagement, they could easily become Loyalists or even Apostles, but without attention, they could drift toward Hostages or Defectors. Their neutral position suggests they haven't formed strong opinions yet, making them more receptive to positive experiences. You should engage with them immediately to understand their experience, create positive moments that will tip them toward satisfaction and loyalty, and monitor their movement closely to prevent drift toward negative quadrants.
```

**Template: High Neutral Count**
```
The significant number of Neutral customers suggests that your brand hasn't made a strong impression yet, or that customers are genuinely indifferent. This is an opportunity to proactively shape their experience and guide them toward positive quadrants.
```

**Template: Low Neutral Count**
```
Whilst the number of Neutral customers is small, each one represents a critical opportunity. Don't overlook them - targeted engagement could quickly convert them into Loyalists.
```

### Recommendation Score Statement Templates

**Template: Strong Positive Score**
```
Your Recommendation Score of {score} is strong and positive, indicating that you have significantly more promoters than detractors.
```

**Template: Positive Score (Not Strong)**
```
Your Recommendation Score of {score} is positive, showing that you have more promoters than detractors, though there's still room for improvement.
```

**Template: Negative Score**
```
Your Recommendation Score of {score} is negative, indicating that you have more detractors than promoters, which is a concern that needs addressing.
```

**Template: High Promoters Opportunity**
```
You have {count} Promoters ({percentage}% of your customers), which is excellent. These customers are your brand advocates and represent a strong foundation for growth through word-of-mouth and referrals.
```

**Template: Growing Promoters Opportunity**
```
You have {count} Promoters ({percentage}% of your customers). Whilst this is a good foundation, there's an opportunity to grow this segment through exceptional customer experiences and referral incentives.
```

**Template: Passives Conversion Opportunity**
```
You have {count} Passives ({percentage}% of your customers) who are neutral about your brand. These customers represent a significant opportunity to move them into the Promoter category through targeted engagement and improved experiences.
```

**Template: High Detractors Risk**
```
You have {count} Detractors ({percentage}% of your customers), who are unlikely to recommend your brand and may actively discourage others. This represents a significant risk to your reputation and growth.
```

**Template: Negative Recommendation Score Risk**
```
Your Recommendation Score of {score} is negative, meaning you have more Detractors than Promoters. This is a serious concern that requires immediate attention to prevent further customer loss and reputational damage.
```

### Recommendation Score Validation Statements

**Template: Incomplete Scale Coverage**
```
It's worth noting that your Recommendation Score analysis may have an incomplete scope, as not all values on the scale are represented in your customer responses. A Recommendation Score is typically more accurate and reliable when analysing a balanced and healthy scenario where responses are distributed across the full range of possible values. This could indicate that your data collection might be missing certain customer segments or experiences.
```

**Template: High Score (70-79)**
```
Your Recommendation Score of {score} is quite high. Whilst this is encouraging, it's worth considering whether the way data is being gathered could potentially be biased. For example, are you being selective about who you ask the question, or asking it only during particularly positive moments of the customer journey? A Recommendation Score is typically more accurate and reliable when analysing a balanced and healthy scenario where responses are collected across different touchpoints and customer experiences, including moments when customers might be frustrated or disappointed.
```

**Template: Very High Score (80-89)**
```
Your Recommendation Score of {score} is very high, which is uncommon in typical customer experience scenarios. This may indicate that your data collection approach could be selective or biased. For instance, are you asking the Recommendation Score question only at the beginning of the customer experience when they're happy with their deal, after using a promotion discount, or when they have built a good relationship with the sales team? The most revealing and honest moment for the Recommendation Score is not when a customer has just joined, but when they have had opportunities to be frustrated or disappointed. Consider whether you're collecting responses after service issues, complaints, or other challenging moments in the customer journey.
```

**Template: Exceptionally High Score (90+)**
```
Your Recommendation Score of {score} is exceptionally high, which is extremely rare in genuine customer experience scenarios. This strongly suggests that your data collection method may be biased or selective. A score this high typically means almost everyone is a promoter, with almost no detractors or passives - in other words, the vast majority of customers rated the question with the two highest possible answers. This pattern often occurs when: the sample is too small and selective, the question is only asked at positive moments in the customer journey, or certain customer segments are systematically excluded. We would recommend reviewing your data collection methodology to ensure you're gathering responses from a representative sample across all customer touchpoints and experiences, including challenging moments.
```

---

## Thresholds and Constants

### Distribution Thresholds

- **Closely Followed**: Within 15% of largest quadrant's count
- **Skewed**: Largest quadrant > 50% of total
- **Balanced**: At least 2 quadrants within 15% of largest
- **Too Empty**: Quadrant < 5% of total OR < 20% of average per quadrant
- **Too Full**: Quadrant > 50% of total (skewed)
- **Significantly Larger**: > 10 percentage points difference from second largest

### Sample Size Thresholds

- **Low Sample**: < 30 customers (configurable)
- **High Sample**: >= 100 customers (configurable)
- **Good Representation**: All main quadrants have at least 1 customer

### ROI Calculation

- **Impact Scores**: high = 3, medium = 2, low = 1
- **Actionability Scores**: easy = 3, medium = 2, hard = 1
- **ROI = Impact × Actionability** (1-9 scale)

### Recommendation Score Thresholds

- **Potentially Suspicious**: Score >= 70 (flag for potential bias)
- **Highly Suspicious**: Score >= 80 (strong indication of bias)
- **Extremely Suspicious**: Score >= 90 (very strong indication of bias)
- **Incomplete Scale**: Not all scale values (typically 0-10) have customer responses
- **Healthy Range**: Scores above 0 are positive; typical top performers rarely exceed 50

**Note**: Always refer to this metric as "Recommendation Score" - never use "NPS" or "Net Promoter Score".

---

## Critical Review and Quality Assurance

### Statement Quality Assessment

**Areas of Strength**:
- ✅ Comprehensive quadrant definitions with strategic context
- ✅ Detailed action lists for each segment
- ✅ Recommendation Score validation logic
- ✅ Defector contextual statements (one-off purchases, buying in error, wrong customers)
- ✅ Edge cases now covered (tied quadrants, zero customers, very small groups)

**Areas Improved**:
- ✅ **Hostages/Defectors as largest**: Now includes urgent context explaining why this is a crisis
- ✅ **Sample size statements**: Condensed repetitive language while maintaining key information
- ✅ **Too empty/too full**: Added statement templates for these scenarios
- ✅ **Near-Apostles**: Added contextual opening statement
- ✅ **Edge cases**: Added handling for tied quadrants, very small groups, zero customers
- ✅ **Neutral customers**: Added comprehensive section explaining their critical transition point status, strategic importance, and actionable statements

**Remaining Considerations**:

1. **Defector Contextual Statements - Detection Logic**:
   - "Industry or product type suggests one-off purchases" - This requires either:
     - User input/configuration about industry type
     - Analysis of purchase patterns (single vs. multiple purchases)
     - Default to showing the statement when Defectors < 20% (less urgent)
   
2. **Statement Length Balance**:
   - Some statements are detailed (good for context)
   - Some are concise (good for clarity)
   - Consider: Should we have "short" and "detailed" versions based on user preference?

3. **Tone Consistency**:
   - Most statements are professional and helpful ✅
   - Crisis statements (Hostages/Defectors largest) are appropriately urgent ✅
   - Recommendation Score warnings are constructive, not accusatory ✅

4. **Actionability**:
   - All statements include actionable insights ✅
   - Actions are prioritised by ROI ✅
   - Context helps users understand why actions matter ✅

5. **Coverage Completeness**:
   - All main quadrants covered ✅
   - Special zones covered ✅
   - Neutral customers covered ✅
   - Edge cases now covered ✅
   - Sample size scenarios covered ✅
   - Distribution scenarios covered ✅
   - Recommendation Score scenarios covered ✅

### Recommendations for Implementation

1. **Prioritise Urgency**: When Hostages or Defectors is largest, these should be flagged as high-priority findings
2. **Contextual Triggers**: Implement logic to detect when to show Defector contextual statements (e.g., check purchase history if available)
3. **Statement Variants**: Consider having concise and detailed versions of key statements
4. **User Testing**: Test statements with actual users to ensure they're helpful, not overwhelming

## Implementation Notes

### Current Implementation Files

1. **`distributionEvaluator.ts`**: Calculates distribution metrics
2. **`findings.ts`**: Generates findings statements
3. **`actions.ts`**: Generates action statements
4. **`opportunities.ts`**: Generates opportunity statements
5. **`risks.ts`**: Generates risk statements
6. **`chartFindings.ts`**: Generates chart commentary

### Enhancement Opportunities

1. **Enhanced Distribution Statements**:
   - Add "clearly more crowded" detection
   - Add "too empty/too full" detection with specific thresholds
   - Include percentage and count in main statement when appropriate
   - Add opening statements based on largest group type

2. **Quadrant Context in Findings**:
   - Add quadrant descriptions when first mentioning a quadrant
   - Include strategic context for each quadrant
   - Add full quadrant meaning/description

3. **Unbalanced Distribution Detection**:
   - Calculate average per quadrant
   - Identify quadrants significantly below/above average
   - Generate specific statements about imbalance

4. **Special Zones Handling**:
   - Add specific statements for apostles/terrorists
   - Include near-apostles/near-terrorists in analysis
   - Generate specific actions for special zones
   - Add opening statements for special zones

5. **Order of Presentation**:
   - Present groups by order of relevance (volume)
   - Add opening statements based on largest group

6. **Sample Size Enhancements**:
   - Add more detailed representation analysis
   - Include guidance on data collection improvements

---

## Future Enhancements

1. **Dynamic Thresholds**: Allow configuration of thresholds per client/industry
2. **Industry-Specific Context**: Adjust statements based on industry type
3. **Temporal Analysis**: Compare distribution over time
4. **Predictive Statements**: Predict likely movements between quadrants
5. **Customizable Templates**: Allow clients to customize statement templates
6. **"Wrong Customers" Detection**: Identify and flag customers who may not align with value proposition
7. **Enhanced Near-Apostles Handling**: More specific actions for near-apostles promotion

---

## Revision History

- **2024-01-XX**: Initial document creation
- **2024-01-XX**: Updated with all production statements, action_report.md suggestions, and enhancements
- **2024-01-XX**: Added Recommendation Score validation statements and harmonised document to British English with professional, positive, prudent tone
- **2024-01-XX**: Expanded Defectors section with complete context on one-off purchases, buying in error, wrong customers concept, and when defectors are a real concern. Added statement generation rules and templates for defector-specific contextual statements. Ensured all ideas are present and fully developed, not condensed or removed.
- **2024-01-XX**: Comprehensive review and additions:
  - Added contextual opening statements for Mercenaries (top 3 suppliers goal), Loyalists (foundation of business), and Terrorists (serious concern)
  - Expanded Mercenaries section with "top 3 suppliers" concept and "second-time buyer discounts" in actions
  - Harmonised all opening statement follow-ups to use "as" instead of "because" for British English consistency
  - Added "Stay in their top 3" as explicit action for Mercenaries
  - Verified all concepts from action_report.md are fully included and expanded

---

**End of Document**
