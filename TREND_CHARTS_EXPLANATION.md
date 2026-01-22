# Trend Charts - Complete Explanation

## Overview
The Trend Charts show how **average satisfaction and loyalty scores change over time** across your customer base. They help you see overall trends and patterns in customer sentiment.

## How They Work - Step by Step

### Step 1: Grouping Data by Date
The system takes all your customer data points and groups them by **date**. 

**Example:**
- Customer A: Satisfaction=4, Loyalty=7, Date=01/01/2024
- Customer B: Satisfaction=3, Loyalty=6, Date=01/01/2024
- Customer C: Satisfaction=5, Loyalty=8, Date=01/01/2024
- Customer A: Satisfaction=5, Loyalty=8, Date=01/02/2024 (same customer, different date)
- Customer D: Satisfaction=2, Loyalty=4, Date=01/02/2024

**After grouping by date:**
- **01/01/2024**: [Customer A, Customer B, Customer C]
- **01/02/2024**: [Customer A, Customer D]

### Step 2: Calculating Averages for Each Date
For each date, the system calculates the **average** of all customers who have data on that date.

**For 01/01/2024:**
- Satisfaction values: [4, 3, 5]
- Average Satisfaction = (4 + 3 + 5) / 3 = 12 / 3 = **4.0**
- Loyalty values: [7, 6, 8]
- Average Loyalty = (7 + 6 + 8) / 3 = 21 / 3 = **7.0**

**For 01/02/2024:**
- Satisfaction values: [5, 2] (Customer A's new value + Customer D)
- Average Satisfaction = (5 + 2) / 2 = 7 / 2 = **3.5**
- Loyalty values: [8, 4]
- Average Loyalty = (8 + 4) / 2 = 12 / 2 = **6.0**

### Step 3: Creating the Chart Points
Each date becomes a point on the chart:
- **Point 1**: Date=01/01/2024, Average Satisfaction=4.0, Average Loyalty=7.0
- **Point 2**: Date=01/02/2024, Average Satisfaction=3.5, Average Loyalty=6.0

### Step 4: Drawing the Lines
The chart connects these points with lines, showing the trend over time.

## Important Points to Understand

### 1. **Each Point is an Average**
- The point on Jan 1st shows the **average** of all customers who have data on Jan 1st
- It's NOT showing individual customer movements
- It's showing the **overall trend** of your customer base

### 2. **Different Customers Can Contribute to Different Dates**
- Customer A appears on both Jan 1st and Jan 2nd
- Customer B only appears on Jan 1st
- Customer D only appears on Jan 2nd
- The average on each date includes **only the customers who have data on that specific date**

### 3. **The Chart Shows Overall Trends**
- If the line goes **up**, it means the average is improving over time
- If the line goes **down**, it means the average is declining over time
- If the line is **flat**, it means the average is staying roughly the same

### 4. **Point Size Indicates Customer Count**
- Larger dots = more customers contributed to that average
- Smaller dots = fewer customers contributed to that average

### 5. **Clicking a Point Shows Individual Customers**
- When you click a data point, you see a list of **all the individual customers** who contributed to that average
- This lets you see who was included in the calculation

## Example Scenario

Let's say you have:
- **Week 1 (01/01/2024)**: 10 customers, average satisfaction = 3.5
- **Week 2 (08/01/2024)**: 15 customers (5 new + 10 returning), average satisfaction = 4.2
- **Week 3 (15/01/2024)**: 12 customers (some left, some new), average satisfaction = 3.8

The chart would show:
- A point at Week 1 with value 3.5
- A point at Week 2 with value 4.2 (line goes up)
- A point at Week 3 with value 3.8 (line goes down)

This tells you:
- Overall satisfaction improved from Week 1 to Week 2
- Overall satisfaction declined from Week 2 to Week 3
- The trend is somewhat volatile

## Why This is Useful

1. **See Overall Patterns**: Understand if your customer base is generally improving or declining
2. **Identify Trends**: Spot long-term patterns that might not be obvious from individual customer data
3. **Track Impact**: See if changes in your business correlate with changes in average scores
4. **Compare Periods**: Compare average scores between different time periods

## What the Charts DON'T Show

- **Individual customer journeys**: They don't show how specific customers moved over time
- **Customer retention**: They don't tell you if the same customers are being measured
- **Causes**: They don't explain WHY the averages changed

For individual customer movements, use the **Movement Flow Visualization** instead.
