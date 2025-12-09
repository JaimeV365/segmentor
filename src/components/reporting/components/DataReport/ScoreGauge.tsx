import React from 'react';

interface ScoreGaugeProps {
  score: number; // -100 to +100
  isPremium?: boolean;
  customColors?: {
    red: string;
    orange: string;
    green: string;
  };
  decimalPrecision?: 0 | 1 | 2;
}

const DEFAULT_COLORS = {
  red: '#DC2626',
  orange: '#F97316',
  green: '#16A34A'
};

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  isPremium = false,
  customColors,
  decimalPrecision = 0
}) => {
  const colors = customColors || DEFAULT_COLORS;
  
  // Determine gauge color based on score
  const gaugeColor = score < 0 ? colors.red : score === 0 ? colors.orange : colors.green;
  
  // Format score with specified decimal precision
  const formattedScore = score.toFixed(decimalPrecision);
  
  // Calculate angle for gauge arc (semi-circle: 0° to 180°)
  // Score range: -100 to +100 maps to 0° to 180°
  // -100 → 0° (left/9 o'clock), 0 → 90° (top/12 o'clock), +100 → 180° (right/3 o'clock)
  // But we want: -100 → 9 o'clock, 0 → 9 o'clock, +100 → 3 o'clock
  // So we need: score -100 to +100 maps to angle 0° to 180°, but rotated 90° clockwise
  // Actually, let's think: we want the arc to go from 9 o'clock (-90°) to 3 o'clock (+90°)
  // Score -100 → angle -90° (9 o'clock/left)
  // Score 0 → angle -90° (9 o'clock/left) 
  // Score +100 → angle +90° (3 o'clock/right)
  // So: angle = -90 + (score + 100) / 200 * 180
  //     angle = -90 + (score + 100) * 0.9
  //     angle = -90 + score * 0.9 + 90
  //     angle = score * 0.9
  // Wait, that's not right. Let me recalculate:
  // We want: score -100 maps to -90°, score 0 maps to -90°, score +100 maps to +90°
  // So: angle = -90 + (score + 100) / 200 * 180
  //     For score = -100: angle = -90 + 0/200 * 180 = -90° ✓
  //     For score = 0: angle = -90 + 100/200 * 180 = -90 + 90 = 0° ✗ (should be -90°)
  //     For score = +100: angle = -90 + 200/200 * 180 = -90 + 180 = 90° ✓
  // 
  // Actually, I think the user wants:
  // -100 → 9 o'clock (-90°)
  // 0 → 9 o'clock (-90°) - same as -100
  // +100 → 3 o'clock (+90°)
  // So the arc should always start at -90° and go to: -90 + (score + 100) / 200 * 180
  // But wait, that means 0 and -100 both point to the same place. That doesn't make sense.
  // 
  // Let me re-read: "if the NPS is 0, the graph shows 12 oclock, it it should be pointing to 9 oclock"
  // So currently 0 = 12 o'clock (top/0°), should be 0 = 9 o'clock (left/-90°)
  // "if the nps is 100 (maximum) it should be pointing at 3 oclock and right now is at 6 oclock"
  // So currently 100 = 6 o'clock (bottom/180°), should be 100 = 3 o'clock (right/+90°)
  // 
  // So the mapping should be:
  // -100 → 9 o'clock (-90°)
  // 0 → 9 o'clock (-90°) - wait, that doesn't make sense either
  // 
  // Actually, I think the user means:
  // The arc should span from 9 o'clock to 3 o'clock (left to right)
  // -100 should be at the leftmost point (9 o'clock = -90°)
  // 0 should be somewhere in the middle... but which middle? Top middle (12 o'clock = 0°) or left-right middle (center = 0°)?
  // +100 should be at the rightmost point (3 o'clock = +90°)
  // 
  // I think the simplest interpretation is:
  // The arc goes from 9 o'clock (-90°) to 3 o'clock (+90°)
  // Score -100 maps to -90° (left)
  // Score 0 maps to 0° (top/center of arc)
  // Score +100 maps to +90° (right)
  // So: angle = (score / 100) * 90
  // But that gives: -100 → -90°, 0 → 0°, +100 → +90°
  // But 0° is 12 o'clock, not 9 o'clock. So maybe the user wants 0 to also point to 9 o'clock?
  // 
  // Let me try a different approach: rotate the entire SVG 90° clockwise
  // This way, what was 12 o'clock becomes 3 o'clock, what was 6 o'clock becomes 9 o'clock
  // So if I keep the original calculation (0 = 12 o'clock, 100 = 6 o'clock) and rotate the SVG 90° clockwise,
  // then 0 will be at 3 o'clock and 100 will be at 9 o'clock... that's backwards.
  // 
  // Actually, rotating 90° clockwise means:
  // 12 o'clock → 3 o'clock
  // 3 o'clock → 6 o'clock  
  // 6 o'clock → 9 o'clock
  // 9 o'clock → 12 o'clock
  // 
  // So if I rotate 90° clockwise:
  // Current 0 (12 o'clock) → becomes 3 o'clock
  // Current 100 (6 o'clock) → becomes 9 o'clock
  // But we want: 0 → 9 o'clock, 100 → 3 o'clock
  // So I need to rotate 90° counter-clockwise instead:
  // 12 o'clock → 9 o'clock ✓
  // 6 o'clock → 3 o'clock ✓
  // 
  // So I'll rotate the SVG -90° (counter-clockwise) to achieve this.
  
  // Calculate angle for gauge arc
  // After rotating SVG -90°, the mapping becomes:
  // -100 → 0° (becomes 9 o'clock/left) ✓
  // 0 → 90° (becomes 12 o'clock/top) - but user wants 9 o'clock
  // +100 → 180° (becomes 3 o'clock/right) ✓
  // 
  // Actually, let's think differently. We want:
  // -100 → 9 o'clock (-90°)
  // 0 → 9 o'clock (-90°) - same as -100
  // +100 → 3 o'clock (+90°)
  // 
  // So the arc should go from -90° to +90°, and:
  // score -100 maps to -90° (left)
  // score 0 maps to -90° (left) - wait, that doesn't make sense
  // score +100 maps to +90° (right)
  // 
  // I think the user wants a linear mapping from left to right:
  // -100 → leftmost (-90°)
  // 0 → middle (0°)
  // +100 → rightmost (+90°)
  // So: angle = (score / 100) * 90
  // But after rotating -90°, 0° becomes 9 o'clock, which is what we want for score 0
  // And +90° becomes 3 o'clock, which is what we want for score +100
  // And -90° becomes 6 o'clock, which is what we want for score -100
  // 
  // Actually wait, rotating -90°:
  // -90° → 6 o'clock (bottom)
  // 0° → 9 o'clock (left) ✓
  // +90° → 12 o'clock (top)
  // 
  // So if I want:
  // score -100 → 9 o'clock → need angle 0° before rotation
  // score 0 → 9 o'clock → need angle 0° before rotation (same as -100?)
  // score +100 → 3 o'clock → need angle 180° before rotation
  // 
  // That doesn't make sense. Let me re-read the requirement.
  // "if the NPS is 0, the graph shows 12 oclock, it it should be pointing to 9 oclock"
  // So currently 0 = 12 o'clock, should be 0 = 9 o'clock
  // "if the nps is 100 (maximum) it should be pointing at 3 oclock and right now is at 6 oclock"
  // So currently 100 = 6 o'clock, should be 100 = 3 o'clock
  // 
  // So the current mapping is:
  // 0 → 12 o'clock (0°)
  // 100 → 6 o'clock (180°)
  // 
  // After rotating -90°:
  // 0° → 9 o'clock ✓
  // 180° → 3 o'clock ✓
  // 
  // So I just need to rotate the SVG -90° and keep the current angle calculation!
  // But wait, the current calculation maps score 0 to 90°, not 0°. Let me check...
  
  // Original calculation: angle = ((score + 100) / 200) * 180
  // For score 0: angle = (100 / 200) * 180 = 90°
  // For score 100: angle = (200 / 200) * 180 = 180°
  // 
  // So currently:
  // score 0 → 90° (3 o'clock)
  // score 100 → 180° (6 o'clock)
  // 
  // But user says:
  // Currently: 0 = 12 o'clock, 100 = 6 o'clock
  // 
  // So maybe the current code has score 0 mapping to 0°? Let me check the original code...
  // Actually, I think the issue is that I need to map:
  // score 0 → 0° (which becomes 9 o'clock after -90° rotation) ✓
  // score 100 → 180° (which becomes 3 o'clock after -90° rotation) ✓
  // 
  // So: angle = (score / 100) * 180
  // For score 0: angle = 0° ✓
  // For score 100: angle = 180° ✓
  // For score -100: angle = -180° = 180° (same as +100)
  // 
  // Actually, let's use: angle = ((score + 100) / 200) * 180
  // But adjust so that score 0 maps to 0°:
  // We want: score 0 → angle 0°
  // Current: score 0 → angle 90°
  // So we need to subtract 90°: angle = ((score + 100) / 200) * 180 - 90
  // For score 0: angle = 90 - 90 = 0° ✓
  // For score 100: angle = 180 - 90 = 90° ✗ (should be 180°)
  // 
  // Let me try: angle = (score / 100) * 180
  // For score -100: angle = -180° = 180° (wraps around)
  // For score 0: angle = 0° ✓
  // For score 100: angle = 180° ✓
  // 
  // But -180° and 180° are the same, so -100 and +100 would point to the same place.
  // 
  // I think the simplest solution is:
  // Map score -100 to 0°, score 0 to 0°, score +100 to 180°
  // Then rotate -90° so 0° becomes 9 o'clock and 180° becomes 3 o'clock
  // But that means -100 and 0 point to the same place, which doesn't make sense.
  // 
  // Let me try a different approach: map score linearly from -90° to +90°
  // angle = (score / 100) * 90
  // For score -100: angle = -90°
  // For score 0: angle = 0°
  // For score +100: angle = +90°
  // Then rotate the SVG -90°:
  // -90° → 6 o'clock (bottom)
  // 0° → 9 o'clock (left) ✓
  // +90° → 12 o'clock (top)
  // 
  // That's still not right. Let me try rotating +90° instead:
  // -90° → 12 o'clock (top)
  // 0° → 3 o'clock (right)
  // +90° → 6 o'clock (bottom)
  // 
  // Still not right. Let me think about this differently.
  // 
  // The user wants the arc to span from 9 o'clock to 3 o'clock (left to right).
  // In standard coordinates, 9 o'clock is -90°, 3 o'clock is +90°.
  // So I want the arc to go from -90° to +90°.
  // Score -100 should be at -90° (left)
  // Score 0 should be at... hmm, the user said 0 should point to 9 o'clock, same as -100?
  // Score +100 should be at +90° (right)
  // 
  // I think the user might want:
  // -100 → leftmost point of arc (-90°)
  // 0 → leftmost point of arc (-90°) - same as -100
  // +100 → rightmost point of arc (+90°)
  // 
  // So the arc always starts at -90° and goes to: -90 + (score + 100) / 200 * 180
  // For score -100: endAngle = -90 + 0 = -90° (no arc, just a point)
  // For score 0: endAngle = -90 + 90 = 0° (arc from -90° to 0°)
  // For score +100: endAngle = -90 + 180 = +90° (full arc from -90° to +90°)
  
  // Calculate angle for gauge arc
  // Arc spans from 9 o'clock (-90°) to 3 o'clock (+90°)
  // User wants: score 0 → 9 o'clock (-90°), score 100 → 3 o'clock (+90°)
  // Map score -100 to +100 linearly to -90° to +90°
  // Formula: angle = (score / 100) * 90
  // For score -100: angle = -90° (9 o'clock/left) ✓
  // For score 0: angle = 0° (12 o'clock/top) - but user wants 9 o'clock
  // For score +100: angle = +90° (3 o'clock/right) ✓
  // 
  // Actually, user wants score 0 to point to 9 o'clock, not 12 o'clock
  // So we need: score 0 → -90°, score 100 → +90°
  // This means: angle = -90 + (score / 100) * 180
  // For score 0: angle = -90° ✓
  // For score 100: angle = -90 + 180 = +90° ✓
  // For score -100: angle = -90 - 180 = -270° = +90° (wraps)
  // 
  // Better approach: map score range -100 to +100 to angle range -90° to +90°
  // angle = (score / 100) * 90
  // But then shift so score 0 maps to -90°:
  // angle = -90 + ((score + 100) / 200) * 180
  // For score -100: angle = -90 + 0 = -90° ✓
  // For score 0: angle = -90 + 90 = 0° ✗ (should be -90°)
  // For score +100: angle = -90 + 180 = +90° ✓
  //
  // Let me try: angle = -90 + (score / 100) * 180, but clamp score to 0-100
  // For score 0: angle = -90° ✓
  // For score 100: angle = -90 + 180 = +90° ✓
  // For score -100: clamp to 0, so angle = -90° ✓
  // Gauge arc calculation - FIXED v5
  // In SVG coordinates: 0° = right (3 o'clock), 90° = bottom (6 o'clock), 180° = left (9 o'clock), 270° = top (12 o'clock)
  // We want: Score -100 → 9 o'clock (left/180°), Score 0 → 12 o'clock (top/270°), Score +100 → 3 o'clock (right/0°)
  // Map score -100 to +100 to SVG angles 180° to 0° (left to right, going counter-clockwise through top)
  // Formula: angle = 180 - ((score + 100) / 200) * 180
  //   Score -100: angle = 180 - 0 = 180° (9 o'clock) ✓
  //   Score 0: angle = 180 - 90 = 90° (6 o'clock) - wait, that's wrong!
  // Actually, we need: Score 0 → 270° (12 o'clock)
  // So: angle = 180 + ((score + 100) / 200) * 180, but wrap at 360
  // Or better: angle = 180 - ((score + 100) / 200) * 180, but this gives 0-180 range
  // Let me recalculate: we want -100→180°, 0→270°, +100→0° (or 360°)
  // Range is 180° to 360° (or 0°), which is 180° total
  // angle = 180 + ((score + 100) / 200) * 180
  //   Score -100: angle = 180 + 0 = 180° (9 o'clock) ✓
  //   Score 0: angle = 180 + 90 = 270° (12 o'clock) ✓
  //   Score +100: angle = 180 + 180 = 360° = 0° (3 o'clock) ✓
  const startAngleSVG = 180; // Always start from left (9 o'clock) in SVG coordinates
  const endAngleSVG = 180 + ((score + 100) / 200) * 180; // Map -100 to +100 to 180° to 360° (which wraps to 0°)
  // Handle wrap-around: if endAngleSVG >= 360, subtract 360
  const normalizedEndAngle = endAngleSVG >= 360 ? endAngleSVG - 360 : endAngleSVG;
  
  // SVG dimensions - increased size to accommodate labels
  // Add extra padding to viewBox to ensure labels are fully visible in screenshots
  const size = 240;
  const padding = 20; // Extra padding for labels
  const viewBoxSize = size + padding * 2;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = 80;
  
  const startX = centerX + radius * Math.cos(startAngleSVG * Math.PI / 180);
  const startY = centerY + radius * Math.sin(startAngleSVG * Math.PI / 180);
  const endX = centerX + radius * Math.cos(normalizedEndAngle * Math.PI / 180);
  const endY = centerY + radius * Math.sin(normalizedEndAngle * Math.PI / 180);
  
  // Calculate the angle difference, accounting for wrap-around
  let angleDiff = normalizedEndAngle - startAngleSVG;
  if (angleDiff < 0) angleDiff += 360; // Handle wrap-around
  const largeArcFlag = angleDiff > 180 ? 1 : 0;
  
  const arcPath = `M ${centerX} ${centerY} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
  
  // Background arc (full semi-circle from 9 o'clock to 3 o'clock, going through 12 o'clock)
  // In SVG: 180° (9 o'clock) to 0° (3 o'clock), going counter-clockwise through 270° (12 o'clock)
  const bgStartAngle = 180; // Left (9 o'clock) in SVG coordinates
  const bgEndAngle = 0; // Right (3 o'clock) in SVG coordinates (or 360°)
  const bgStartX = centerX + radius * Math.cos(bgStartAngle * Math.PI / 180);
  const bgStartY = centerY + radius * Math.sin(bgStartAngle * Math.PI / 180);
  const bgEndX = centerX + radius * Math.cos(bgEndAngle * Math.PI / 180);
  const bgEndY = centerY + radius * Math.sin(bgEndAngle * Math.PI / 180);
  // Large arc flag = 1 because we want the top half (180° arc going counter-clockwise)
  const bgArcPath = `M ${centerX} ${centerY} L ${bgStartX} ${bgStartY} A ${radius} ${radius} 0 1 1 ${bgEndX} ${bgEndY} Z`;

  return (
    <div className="score-gauge-container">
      <div className="score-gauge-label">Recommendation Score</div>
      <svg
        width={size}
        height={size}
        viewBox={`-${padding} -${padding} ${viewBoxSize} ${viewBoxSize}`}
        className="score-gauge-svg"
      >
        {/* Background arc (gray) */}
        <path
          d={bgArcPath}
          fill="#E5E7EB"
          stroke="none"
        />
        
        {/* Score arc (colored) */}
        <path
          d={arcPath}
          fill={gaugeColor}
          stroke="none"
          opacity={0.8}
        />
        
        {/* Scale markers - positioned at bottom of arc */}
        <text x={centerX - radius - 30} y={centerY + radius + 20} textAnchor="middle" fontSize="12" fill="#6B7280">
          -100
        </text>
        <text x={centerX} y={centerY + radius + 20} textAnchor="middle" fontSize="12" fill="#6B7280">
          0
        </text>
        <text x={centerX + radius + 30} y={centerY + radius + 20} textAnchor="middle" fontSize="12" fill="#6B7280">
          +100
        </text>
        
        {/* Score text between graph and scale markers */}
        <text
          x={centerX}
          y="180"
          textAnchor="middle"
          className="score-gauge-text"
          fill={gaugeColor}
          fontSize="48"
          fontWeight="bold"
        >
          {formattedScore}
        </text>
      </svg>
    </div>
  );
};

