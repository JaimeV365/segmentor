import React from 'react';

interface CategoryDistributionChartProps {
  detractors: number;
  passives: number;
  promoters: number;
  detractorsPercent: number;
  passivesPercent: number;
  promotersPercent: number;
  chartType?: 'bar' | 'pie';
  displayFormat?: 'count' | 'percentage' | 'both';
}

const COLORS = {
  detractors: '#DC2626',
  passives: '#F97316',
  promoters: '#16A34A'
};

export const CategoryDistributionChart: React.FC<CategoryDistributionChartProps> = ({
  detractors,
  passives,
  promoters,
  detractorsPercent,
  passivesPercent,
  promotersPercent,
  chartType = 'bar',
  displayFormat = 'both'
}) => {
  const total = detractors + passives + promoters;
  const maxCount = Math.max(detractors, passives, promoters, 1);
  const maxPercent = Math.max(detractorsPercent, passivesPercent, promotersPercent, 1);
  
  // Determine bar height based on display format
  const getBarHeight = (count: number, percent: number) => {
    if (displayFormat === 'percentage') {
      return `${(percent / maxPercent) * 100}%`;
    }
    // For 'count' or 'both', use count-based height
    return `${(count / maxCount) * 100}%`;
  };

  if (chartType === 'pie') {
    // Pie chart implementation
    const total = detractors + passives + promoters;
    
    if (total === 0) {
      return (
        <div className="category-distribution-chart pie-chart">
          <h5 className="chart-title">Category Distribution</h5>
          <div className="pie-chart-container">
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
              No data available
            </div>
          </div>
        </div>
      );
    }
    
    const detractorsAngle = (detractors / total) * 360;
    const passivesAngle = (passives / total) * 360;
    const promotersAngle = (promoters / total) * 360;
    
    // Calculate cumulative angles
    const detractorsStartAngle = 0;
    const detractorsEndAngle = detractorsStartAngle + detractorsAngle;
    const passivesStartAngle = detractorsEndAngle;
    const passivesEndAngle = passivesStartAngle + passivesAngle;
    const promotersStartAngle = passivesEndAngle;
    const promotersEndAngle = promotersStartAngle + promotersAngle;
    
    // Calculate midpoint angles for label positioning
    const detractorsMidAngle = (detractorsStartAngle + detractorsEndAngle) / 2;
    const passivesMidAngle = (passivesStartAngle + passivesEndAngle) / 2;
    const promotersMidAngle = (promotersStartAngle + promotersEndAngle) / 2;
    
    // Helper function to create arc path
    const createArcPath = (startAngle: number, endAngle: number, cx: number, cy: number, radius: number) => {
      const start = startAngle - 90; // Start from top
      const end = endAngle - 90;
      const startX = cx + radius * Math.cos(start * Math.PI / 180);
      const startY = cy + radius * Math.sin(start * Math.PI / 180);
      const endX = cx + radius * Math.cos(end * Math.PI / 180);
      const endY = cy + radius * Math.sin(end * Math.PI / 180);
      const largeArc = endAngle - startAngle > 180 ? 1 : 0;
      return `M ${cx} ${cy} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY} Z`;
    };
    
    // Helper function to get label text based on display format
    const getLabelText = (count: number, percent: number) => {
      if (displayFormat === 'percentage') {
        return `${percent.toFixed(1)}%`;
      } else if (displayFormat === 'count') {
        return `${count}`;
      } else {
        return `${count} (${percent.toFixed(1)}%)`;
      }
    };
    
    // Helper function to calculate label position
    const getLabelPosition = (midAngle: number, angle: number, cx: number, cy: number, radius: number) => {
      const angleRad = (midAngle - 90) * Math.PI / 180;
      // If slice is small (< 30 degrees), position label outside
      const isSmallSlice = angle < 30;
      const labelRadius = isSmallSlice ? radius * 1.15 : radius * 0.6;
      const x = cx + labelRadius * Math.cos(angleRad);
      const y = cy + labelRadius * Math.sin(angleRad);
      return { x, y, isSmallSlice };
    };

    return (
      <div className="category-distribution-chart pie-chart">
        <h5 className="chart-title">Category Distribution</h5>
        <div className="pie-chart-container">
          <svg width="200" height="200" viewBox="0 0 200 200" className="pie-chart-svg">
            {/* Detractors slice */}
            {detractorsAngle > 0 && (
              <>
                <path
                  d={createArcPath(detractorsStartAngle, detractorsEndAngle, 100, 100, 80)}
                  fill={COLORS.detractors}
                  stroke="white"
                  strokeWidth="2"
                />
                {detractorsAngle > 5 && ( // Show label if slice exists
                  (() => {
                    const labelPos = getLabelPosition(detractorsMidAngle, detractorsAngle, 100, 100, 80);
                    return (
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="pie-slice-label"
                        fill={labelPos.isSmallSlice ? COLORS.detractors : "white"}
                        fontSize={labelPos.isSmallSlice ? "11" : "12"}
                        fontWeight="600"
                        style={{ 
                          textShadow: labelPos.isSmallSlice ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)',
                          fill: labelPos.isSmallSlice ? COLORS.detractors : 'white'
                        }}
                      >
                        {getLabelText(detractors, detractorsPercent)}
                      </text>
                    );
                  })()
                )}
              </>
            )}
            
            {/* Passives slice */}
            {passivesAngle > 0 && (
              <>
                <path
                  d={createArcPath(passivesStartAngle, passivesEndAngle, 100, 100, 80)}
                  fill={COLORS.passives}
                  stroke="white"
                  strokeWidth="2"
                />
                {passivesAngle > 5 && ( // Show label if slice exists
                  (() => {
                    const labelPos = getLabelPosition(passivesMidAngle, passivesAngle, 100, 100, 80);
                    return (
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="pie-slice-label"
                        fill={labelPos.isSmallSlice ? COLORS.passives : "white"}
                        fontSize={labelPos.isSmallSlice ? "11" : "12"}
                        fontWeight="600"
                        style={{ 
                          textShadow: labelPos.isSmallSlice ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)',
                          fill: labelPos.isSmallSlice ? COLORS.passives : 'white'
                        }}
                      >
                        {getLabelText(passives, passivesPercent)}
                      </text>
                    );
                  })()
                )}
              </>
            )}
            
            {/* Promoters slice */}
            {promotersAngle > 0 && (
              <>
                <path
                  d={createArcPath(promotersStartAngle, promotersEndAngle, 100, 100, 80)}
                  fill={COLORS.promoters}
                  stroke="white"
                  strokeWidth="2"
                />
                {promotersAngle > 5 && ( // Show label if slice exists
                  (() => {
                    const labelPos = getLabelPosition(promotersMidAngle, promotersAngle, 100, 100, 80);
                    return (
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="pie-slice-label"
                        fill={labelPos.isSmallSlice ? COLORS.promoters : "white"}
                        fontSize={labelPos.isSmallSlice ? "11" : "12"}
                        fontWeight="600"
                        style={{ 
                          textShadow: labelPos.isSmallSlice ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.5)',
                          fill: labelPos.isSmallSlice ? COLORS.promoters : 'white'
                        }}
                      >
                        {getLabelText(promoters, promotersPercent)}
                      </text>
                    );
                  })()
                )}
              </>
            )}
          </svg>
          
          <div className="pie-chart-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: COLORS.detractors }}></span>
              <span className="legend-label">Detractors</span>
              <span className="legend-value">
                {displayFormat === 'percentage' 
                  ? `${detractorsPercent.toFixed(1)}%`
                  : displayFormat === 'count'
                  ? `${detractors}`
                  : `${detractors} (${detractorsPercent.toFixed(1)}%)`}
              </span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: COLORS.passives }}></span>
              <span className="legend-label">Passives</span>
              <span className="legend-value">
                {displayFormat === 'percentage' 
                  ? `${passivesPercent.toFixed(1)}%`
                  : displayFormat === 'count'
                  ? `${passives}`
                  : `${passives} (${passivesPercent.toFixed(1)}%)`}
              </span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: COLORS.promoters }}></span>
              <span className="legend-label">Promoters</span>
              <span className="legend-value">
                {displayFormat === 'percentage' 
                  ? `${promotersPercent.toFixed(1)}%`
                  : displayFormat === 'count'
                  ? `${promoters}`
                  : `${promoters} (${promotersPercent.toFixed(1)}%)`}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Bar chart implementation (default)
  return (
    <div className="category-distribution-chart bar-chart">
      <h5 className="chart-title">Category Distribution</h5>
      <div className="category-bars">
        <div className="category-bar-container">
          <div className="category-bar-wrapper">
            <div
              className="category-bar"
              style={{
                height: getBarHeight(detractors, detractorsPercent),
                backgroundColor: COLORS.detractors
              }}
              title={`Detractors: ${detractors} (${detractorsPercent.toFixed(1)}%)`}
            >
              {displayFormat !== 'percentage' && detractors > 0 && (
                <span className="category-bar-count">{detractors}</span>
              )}
            </div>
          </div>
          <div className="category-bar-label">Detractors</div>
          {displayFormat !== 'count' && (
            <div className="category-bar-percentage">{detractorsPercent.toFixed(1)}%</div>
          )}
        </div>
        
        <div className="category-bar-container">
          <div className="category-bar-wrapper">
            <div
              className="category-bar"
              style={{
                height: getBarHeight(passives, passivesPercent),
                backgroundColor: COLORS.passives
              }}
              title={`Passives: ${passives} (${passivesPercent.toFixed(1)}%)`}
            >
              {displayFormat !== 'percentage' && passives > 0 && (
                <span className="category-bar-count">{passives}</span>
              )}
            </div>
          </div>
          <div className="category-bar-label">Passives</div>
          {displayFormat !== 'count' && (
            <div className="category-bar-percentage">{passivesPercent.toFixed(1)}%</div>
          )}
        </div>
        
        <div className="category-bar-container">
          <div className="category-bar-wrapper">
            <div
              className="category-bar"
              style={{
                height: getBarHeight(promoters, promotersPercent),
                backgroundColor: COLORS.promoters
              }}
              title={`Promoters: ${promoters} (${promotersPercent.toFixed(1)}%)`}
            >
              {displayFormat !== 'percentage' && promoters > 0 && (
                <span className="category-bar-count">{promoters}</span>
              )}
            </div>
          </div>
          <div className="category-bar-label">Promoters</div>
          {displayFormat !== 'count' && (
            <div className="category-bar-percentage">{promotersPercent.toFixed(1)}%</div>
          )}
        </div>
      </div>
    </div>
  );
};

