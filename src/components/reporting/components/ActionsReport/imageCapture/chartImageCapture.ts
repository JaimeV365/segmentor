import html2canvas from 'html2canvas';
import type { ChartImage } from '../types';
import { getChartTypeFromSelector } from '../evaluators/chartMapping';

/**
 * Captures a chart element as an image and returns the data URL
 * Based on the existing exportCapture.ts approach
 */
/**
 * Expands a collapsible section if it's collapsed
 */
function expandSectionIfNeeded(sectionId: string): boolean {
  const section = document.querySelector(`[data-section-id="${sectionId}"]`);
  if (!section) return false;
  
  // Check if it's a collapsible section (has expand/collapse button)
  const expandButton = section.querySelector('.advanced-section-header, [aria-expanded]') as HTMLElement;
  if (!expandButton) return false;
  
  const isExpanded = expandButton.getAttribute('aria-expanded') === 'true' || 
                     section.classList.contains('expanded');
  
  if (!isExpanded) {
    // Click to expand
    expandButton.click();
    // Wait a bit for the content to render
    return true;
  }
  
  return false;
}

/**
 * Switches to a specific proximity tab if needed
 * Returns true if tab was switched, false if already on that tab or tab not found
 */
function switchProximityTabIfNeeded(tabName: string): boolean {
  const proximitySection = document.querySelector('[data-section-id="report-proximity"]');
  if (!proximitySection) return false;
  
  // Find all tab buttons
  const allTabs = proximitySection.querySelectorAll('.proximity-tab');
  let targetTab: HTMLElement | null = null;
  
  // Find the tab by looking for the label text
  for (const tab of Array.from(allTabs)) {
    const label = tab.querySelector('.tab-label')?.textContent?.trim().toLowerCase();
    const normalizedTabName = tabName.toLowerCase();
    
    // Check if label matches (e.g., "actionable conversions" matches "conversions" or "actionable conversions")
    if (label && (label.includes(normalizedTabName) || normalizedTabName.includes(label))) {
      targetTab = tab as HTMLElement;
      break;
    }
  }
  
  if (!targetTab) {
    console.warn(`⚠️ Proximity tab "${tabName}" not found`);
    return false;
  }
  
  // Check if already active
  if (targetTab.classList.contains('active')) {
    return false;
  }
  
  // Click to switch tab
  console.log(`🔄 Switching to proximity tab: ${tabName}`);
  targetTab.click();
  return true;
}

export async function captureChartAsImage(
  selector: string,
  caption: string,
  options?: { hideWatermark?: boolean }
): Promise<ChartImage | null> {
  // CRITICAL DEBUG - This should ALWAYS appear if function is called
  console.log('========================================');
  console.log('🚨🚨🚨 captureChartAsImage FUNCTION CALLED');
  console.log('🚨🚨🚨 Selector:', selector);
  console.log('🚨🚨🚨 Options:', JSON.stringify(options));
  console.log('========================================');
  
  const { hideWatermark = false } = options || {};
  console.log('🚨🚨🚨 hideWatermark value:', hideWatermark);
  console.log('🚨🚨🚨 IS MAIN CHART?', selector.includes('chart-container') || selector === '.chart-container');
  
  // Handle multiple selectors (fallback chain)
  const selectors = selector.split(',').map(s => s.trim());
  let el: HTMLElement | null = null;
  
  // First, try to expand sections if needed
  if (selector.includes('report-response-concentration')) {
    const wasExpanded = expandSectionIfNeeded('report-response-concentration');
    if (wasExpanded) {
      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // For Proximity Analysis, switch to the appropriate tab if needed
  let tabWasSwitched = false;
  if (selector.includes('report-proximity') || selector.includes('proximity')) {
    // Check if we need to capture the Actionable Conversions tab
    // The selector will be something like: [data-section-id="report-proximity"] .actionable-conversions-section
    if (selector.includes('actionable-conversions') || 
        (selector.includes('conversions') && !selector.includes('proximity-distribution-card'))) {
      // Save current scroll position and ensure we're on Actions Report section
      // This prevents the drawer menu from jumping to Proximity Analysis when we switch tabs
      const actionsSection = document.querySelector('[data-section-id="report-actions"]');
      
      // Ensure Actions Report section is visible and active in navigation BEFORE switching tabs
      if (actionsSection) {
        const scrollTarget = actionsSection.querySelector('.report-title-wrapper') || 
                            actionsSection.querySelector('.report-title') || 
                            actionsSection.querySelector('h3') || 
                            actionsSection;
        if (scrollTarget) {
          const offset = 80;
          const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
          const elementTop = scrollTarget.getBoundingClientRect().top + currentScroll;
          const currentTop = window.scrollY || document.documentElement.scrollTop;
          const distanceFromTarget = Math.abs(currentTop - (elementTop - offset));
          
          // Only scroll if we're far from the target (more than 100px away)
          if (distanceFromTarget > 100) {
            // Use auto scroll to avoid visible movement during capture
            window.scrollTo({
              top: elementTop - offset,
              behavior: 'auto'
            });
          }
          
          // Force update active section in navigation to Actions Report
          const navUpdateEvent = new CustomEvent('update-active-section', { 
            detail: { sectionId: 'report-actions' } 
          });
          document.dispatchEvent(navUpdateEvent);
          
          // Wait a moment for scroll to complete
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Now switch the tab
      tabWasSwitched = switchProximityTabIfNeeded('conversions');
      if (tabWasSwitched) {
        // Wait for React to re-render the tab content
        await new Promise(resolve => requestAnimationFrame(() => {
          setTimeout(resolve, 400);
        }));
        
        // Re-ensure Actions Report is still active after tab switch
        // This prevents the Intersection Observer from switching to Proximity Analysis
        if (actionsSection) {
          const navUpdateEvent = new CustomEvent('update-active-section', { 
            detail: { sectionId: 'report-actions' } 
          });
          document.dispatchEvent(navUpdateEvent);
        }
      }
    }
    // Could add more tab switching logic here for other tabs if needed
    // e.g., 'lateral', 'diagonal', 'crossroads', 'risk', 'total'
  }
  
  // For Recommendation Score, ensure the section is visible
  if (selector.includes('recommendation-score') || selector.includes('report-recommendation-score')) {
    // Check if the section exists and is visible
    let section = document.querySelector('#recommendation-score-section') as HTMLElement | null;
    if (!section) {
      section = document.querySelector('[data-section-id="report-recommendation-score"]') as HTMLElement | null;
    }
    
    if (!section) {
      console.warn('⚠️ Recommendation Score section not found in DOM. It may not be rendered (check if showRecommendationScore is true).');
      // The section is conditionally rendered, so it might not exist
      // Don't scroll - just try to find the section without scrolling
      // Scrolling causes UX issues when user accepts disclaimer
    }
    
    if (section) {
      // Make sure it's visible
      if (section.offsetHeight === 0 || section.style.display === 'none') {
        console.warn('⚠️ Recommendation Score section exists but is hidden');
      } else {
        // Don't scroll - just ensure it's rendered (scrolling causes UX issues)
        // The section should already be visible if it exists
      }
    }
  }
  
  // Try each selector in order
  // If tab was switched, retry finding the element a few times in case React hasn't rendered yet
  const maxRetries = tabWasSwitched ? 5 : 1; // Increased retries for tab switching
  for (let retry = 0; retry < maxRetries; retry++) {
    if (retry > 0) {
      // Wait a bit more for React to render
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    for (const sel of selectors) {
      console.log(`🔍 Trying selector: ${sel}${retry > 0 ? ` (retry ${retry}/${maxRetries})` : ''}`);
      el = document.querySelector(sel) as HTMLElement | null;
      
      if (el) {
        const rect = el.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(el);
        const isVisible = rect.width > 0 && rect.height > 0 && 
                         computedStyle.display !== 'none' && 
                         computedStyle.visibility !== 'hidden' &&
                         computedStyle.opacity !== '0';
        
        console.log(`✅ Found element with selector: ${sel}`, {
          width: rect.width,
          height: rect.height,
          visible: isVisible,
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity
        });
        
        // Check if element is actually visible
        if (isVisible) {
          break;
        } else {
          console.warn(`⚠️ Element found but not visible (${rect.width}x${rect.height}, display: ${computedStyle.display}, visibility: ${computedStyle.visibility})`);
          el = null;
        }
      } else {
        console.log(`❌ Selector not found: ${sel}`);
        // If this is actionable conversions and we can't find it, check if tab is active
        if (sel.includes('actionable-conversions-section')) {
          const proximitySection = document.querySelector('[data-section-id="report-proximity"]');
          const activeTab = proximitySection?.querySelector('.proximity-tab.active .tab-label')?.textContent?.trim();
          console.log(`🔍 Current active tab: "${activeTab}"`);
          const conversionsTab = proximitySection?.querySelector('.proximity-tab');
          console.log(`🔍 Available tabs:`, Array.from(proximitySection?.querySelectorAll('.proximity-tab') || []).map(t => t.querySelector('.tab-label')?.textContent?.trim()));
        }
      }
    }
    
    // If we found the element, break out of retry loop
    if (el) {
      const rect = el.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);
      if (rect.width > 0 && rect.height > 0 && 
          computedStyle.display !== 'none' && 
          computedStyle.visibility !== 'hidden' &&
          computedStyle.opacity !== '0') {
        break;
      }
    }
  }
  
  if (!el) {
    console.warn(`❌ Chart element not found for any selector: ${selector}`);
    console.log('💡 Available elements in page:', {
      'report-response-concentration': document.querySelector('[data-section-id="report-response-concentration"]') ? 'found' : 'not found',
      'report-recommendation-score': document.querySelector('[data-section-id="report-recommendation-score"]') ? 'found' : 'not found',
      'recommendation-score-section': document.querySelector('#recommendation-score-section') ? 'found' : 'not found',
      'recommendation-score-widgets': document.querySelector('.recommendation-score-widgets') ? 'found' : 'not found',
      'miniplot-container': document.querySelector('.miniplot-container') ? 'found' : 'not found'
    });
    return null;
  }

  // Store watermark restore info outside try block so it's accessible in finally
  let originalWatermarkStyles: Array<{ element: HTMLElement; display: string; visibility: string; opacity: string }> = [];
  
  try {
    // Wait for fonts to be ready
    if ((document as any).fonts?.ready) {
      await (document as any).fonts.ready;
    }
    
    // For main chart, wait a bit longer to ensure watermark is rendered
    if (hideWatermark && (selector.includes('chart-container') || selector === '.chart-container')) {
      console.log('⏳ Waiting for watermark to render before capture...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Get element dimensions
    const rect = el.getBoundingClientRect();
    
    // Create wrapper (same approach as exportCapture)
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '-10000px';
    wrapper.style.top = '0';
    wrapper.style.zIndex = '-1';
    
    // Special handling for main visualization chart - needs extra padding on all sides for labels and data points
    const isMainChart = selector.includes('chart-container') || selector === '.chart-container';
    if (isMainChart) {
      // Extra padding to ensure:
      // - Left: Loyalty axis labels and title are fully visible
      // - Right: Data points on the edge are fully visible
      // - Bottom: Satisfaction axis labels and title are fully visible
      // - Top: Any top labels or titles are visible
      wrapper.style.padding = '30px 60px 50px 80px'; // top, right, bottom, left
    } else {
      wrapper.style.padding = '20px';
    }
    
    wrapper.style.background = '#ffffff';
    wrapper.style.borderRadius = '8px';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.overflow = 'visible'; // Ensure overflow is visible for data points

    // For Brand+ main chart: Remove watermark from ORIGINAL BEFORE cloning
    // This ensures the clone never has the watermark - much better approach!
    if (hideWatermark && (selector.includes('chart-container') || selector === '.chart-container')) {
      console.log('🔍🔍🔍 REMOVING WATERMARK FROM ORIGINAL BEFORE CLONE');
      console.log('🔍🔍🔍 Element selector:', selector);
      console.log('🔍🔍🔍 Original element:', el);
      
      // Wait for React to finish rendering the watermark
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Find watermark in ORIGINAL element (not clone!) - use multiple search strategies
      let watermarks = el.querySelectorAll('.watermark-layer') as NodeListOf<HTMLElement>;
      
      // Try broader search if not found
      if (watermarks.length === 0) {
        watermarks = el.querySelectorAll('[class*="watermark"]') as NodeListOf<HTMLElement>;
      }
      
      // Also check for divs with absolute positioning that contain images (watermark structure)
      if (watermarks.length === 0) {
        const allDivs = el.querySelectorAll('div') as NodeListOf<HTMLElement>;
        const foundWatermarks: HTMLElement[] = [];
        allDivs.forEach(div => {
          const computedStyle = window.getComputedStyle(div);
          if (div.classList.contains('watermark-layer') || 
              div.getAttribute('class')?.includes('watermark') ||
              (computedStyle.position === 'absolute' && 
               computedStyle.zIndex === '3000' && 
               div.querySelector('img'))) {
            foundWatermarks.push(div);
          }
        });
        if (foundWatermarks.length > 0) {
          watermarks = foundWatermarks as any;
        }
      }
      
      console.log('🔍 Found', watermarks.length, 'watermark element(s) in ORIGINAL element');
      
      // Remove each watermark from ORIGINAL and store for restoration
      watermarks.forEach((wm, idx) => {
        const parent = wm.parentElement;
        if (parent) {
          // Store for restoration
          (wm as any).__originalParent = parent;
          (wm as any).__originalNextSibling = wm.nextSibling;
          
          originalWatermarkStyles.push({
            element: wm,
            display: '',
            visibility: '',
            opacity: ''
          });
          
          // Remove from ORIGINAL DOM - this is the key!
          wm.remove();
          console.log(`✅ Removed watermark ${idx + 1} from ORIGINAL before clone`);
        } else {
          console.warn(`⚠️ Watermark ${idx + 1} has no parent - cannot remove`);
        }
      });
      
      // Wait a moment to ensure React doesn't re-add it
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify watermark is gone from original
      const verify = el.querySelectorAll('.watermark-layer') as NodeListOf<HTMLElement>;
      if (verify.length > 0) {
        console.warn(`⚠️ WARNING: ${verify.length} watermark(s) still found in original after removal!`);
        // Force remove any remaining
        verify.forEach(wm => {
          wm.remove();
          console.log('🚫 Force removed remaining watermark from original');
        });
      } else {
        console.log('✅ Verification: Watermark successfully removed from ORIGINAL');
      }
    }
    
    // NOW clone - watermark won't be in clone because it's not in original!
    const clone = el.cloneNode(true) as HTMLElement;
    
    // Verify clone doesn't have watermark (should be 0 if we removed from original)
    if (hideWatermark && (selector.includes('chart-container') || selector === '.chart-container')) {
      const cloneCheck = clone.querySelectorAll('.watermark-layer') as NodeListOf<HTMLElement>;
      if (cloneCheck.length === 0) {
        console.log('✅✅✅ SUCCESS: Clone has NO watermark (removed from original worked!)');
      } else {
        console.error(`❌❌❌ ERROR: Clone has ${cloneCheck.length} watermark(s) - removal from original failed!`);
        // Emergency fallback: remove from clone
        cloneCheck.forEach(wm => {
          console.log('🚫 Emergency: Removing watermark from clone');
          wm.remove();
        });
      }
    }
    
    // For main chart, ensure clone can accommodate data points and labels that extend beyond container bounds
    if (isMainChart) {
      // Add extra width to accommodate:
      // - Data points on the right edge (can extend up to their radius, typically 8-12px)
      // - Axis labels on the left side (Loyalty axis labels can extend beyond container)
      // The wrapper padding handles most of this, but we add a bit more for safety
      const extraWidth = 40; // Extra space for data point radius and left-side labels
      const extraHeight = 30; // Extra space for bottom axis labels
      clone.style.width = `${rect.width + extraWidth}px`;
      clone.style.height = `${rect.height + extraHeight}px`;
    } else {
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
    }
    
    clone.style.boxSizing = 'border-box';
    clone.style.overflow = 'visible';
    
    // Remove titles, headers, and infoboxes from clone
    // For Response Concentration and Recommendation Score, remove section titles
    if (selector.includes('report-response-concentration') || selector.includes('recommendation-score-widgets')) {
      // Remove section-level titles and headers
      const sectionTitles = clone.querySelectorAll(
        '.bar-chart-panel-title, .section-title, h1, h2, h3, h4, h5, h6'
      );
      sectionTitles.forEach(title => {
        const titleEl = title as HTMLElement;
        // Check if it's a top-level section title
        const parent = titleEl.parentElement;
        if (parent && (parent.classList.contains('response-concentration-section') || 
            parent.classList.contains('recommendation-score-section') ||
            parent.hasAttribute('data-section-id'))) {
          titleEl.remove();
        }
      });
    }
    
    // For Recommendation Score Simulator, keep the title but remove the info ribbon
    if (selector.includes('recommendation-score-simulator') || selector.includes('.recommendation-score-simulator')) {
      const infoRibbon = clone.querySelector('.info-ribbon');
      if (infoRibbon) {
        infoRibbon.remove();
      }
    }
    
    
    // Special handling for proximity actionable conversions section
    if (selector.includes('actionable-conversions-section')) {
      // Remove tab navigation and info ribbons from the clone
      const tabNavigation = clone.querySelector('.proximity-tabs');
      if (tabNavigation) {
        tabNavigation.remove();
      }
      const infoRibbon = clone.querySelector('.proximity-tab-info, .info-ribbon');
      if (infoRibbon) {
        infoRibbon.remove();
      }
      // Keep only the actionable conversions content
    }
    
    // Special handling for proximity distribution card - remove header/title
    if (selector.includes('.proximity-distribution-card')) {
      const cardHeader = clone.querySelector('.proximity-card-header, .proximity-card-title');
      if (cardHeader) {
        cardHeader.remove();
      }
      
      // CRITICAL FIX: Inject a style tag to disable ::before pseudo-elements
      // html2canvas renders ::before pseudo-elements as rectangles (ignoring clip-path)
      // By disabling them, we prevent the rectangle from appearing
      const styleTag = document.createElement('style');
      styleTag.textContent = `
        .proximity-edge.top::before,
        .proximity-edge.right::before,
        .proximity-edge.bottom::before,
        .proximity-edge.left::before {
          content: none !important;
          display: none !important;
        }
      `;
      // Insert style tag at the beginning of the clone so it takes precedence over external CSS
      clone.insertBefore(styleTag, clone.firstChild);
      
      // Fix proximity edges: Convert ::before pseudo-elements (triangles) to real DOM elements
      // html2canvas doesn't render clip-path on pseudo-elements correctly
      const proximityEdges = clone.querySelectorAll('.proximity-edge') as NodeListOf<HTMLElement>;
      const originalEdges = el ? el.querySelectorAll('.proximity-edge') as NodeListOf<HTMLElement> : [];
      
      // Map edge classes to clip-path polygons (from CSS)
      const clipPathMap: Record<string, string> = {
        'top': 'polygon(0% 0%, 100% 0%, 50% 50%)',
        'right': 'polygon(100% 0%, 100% 100%, 50% 50%)',
        'bottom': 'polygon(0% 100%, 100% 100%, 50% 50%)',
        'left': 'polygon(0% 0%, 0% 100%, 50% 50%)'
      };
      
      // Map target quadrants to background colors (from CSS)
      const quadrantColors: Record<string, string> = {
        'loyalists': 'rgba(76, 175, 80, 0.3)',
        'mercenaries': 'rgba(247, 183, 49, 0.3)',
        'hostages': 'rgba(70, 130, 180, 0.3)',
        'defectors': 'rgba(220, 38, 38, 0.3)'
      };
      
      proximityEdges.forEach((edge, index) => {
        const originalEdge = originalEdges[index];
        if (!originalEdge) return;
        
        const targetQuadrant = edge.getAttribute('data-target-quadrant');
        const backgroundColor = targetQuadrant ? (quadrantColors[targetQuadrant] || 'rgba(0, 0, 0, 0.1)') : 'rgba(0, 0, 0, 0.1)';
        
        // Check if this is a longitudinal edge (top, right, bottom, left) that uses clip-path
        const edgeClass = Array.from(edge.classList).find(cls => ['top', 'right', 'bottom', 'left'].includes(cls));
        const isLongitudinal = edgeClass && !edge.classList.contains('diagonal') && !edge.classList.contains('special');
        
        // Check if this is a corner edge (uses gradient backgrounds, not clip-path)
        const isCornerEdge = edge.classList.contains('top-right') || 
                            edge.classList.contains('bottom-left') || 
                            edge.classList.contains('top-left') || 
                            edge.classList.contains('bottom-right');
        
        // Only remove backgrounds for longitudinal edges (they use clip-path pseudo-elements)
        // Corner edges use gradients and should be preserved
        if (isLongitudinal) {
          // Get computed background from original to see if there's a color
          const originalEdgeStyle = window.getComputedStyle(originalEdge);
          
          // Force remove all backgrounds and make edge invisible (only SVG triangle will show)
          edge.style.backgroundColor = 'transparent';
          edge.style.background = 'none';
          edge.style.border = 'none';
          edge.style.setProperty('background-color', 'transparent', 'important');
          edge.style.setProperty('background', 'none', 'important');
          edge.style.setProperty('background-image', 'none', 'important');
          // Remove any box-shadow that might create a visible rectangle
          edge.style.setProperty('box-shadow', 'none', 'important');
          // Hide the ::before pseudo-element by setting content to none
          // This prevents html2canvas from rendering it as a rectangle
          edge.style.setProperty('content', 'none', 'important');
          // Also try to hide it via pseudo-element styles (though this might not work)
          // The best approach is to ensure the edge itself has no visible area
          edge.style.setProperty('outline', 'none', 'important');
        } else if (isCornerEdge) {
          // For corner edges, preserve the gradient background (it creates the triangle effect)
          // Just ensure no unwanted backgrounds are added
          const originalEdgeStyle = window.getComputedStyle(originalEdge);
          const originalBg = originalEdgeStyle.background || originalEdgeStyle.backgroundImage;
          if (originalBg && originalBg !== 'none') {
            // Preserve the gradient background
            edge.style.background = originalBg;
          }
        }
        
        if (isLongitudinal && clipPathMap[edgeClass!]) {
          // Get actual rendered dimensions from original edge
          const originalRect = originalEdge.getBoundingClientRect();
          const width = originalRect.width;
          const height = originalRect.height;
          
          // Create an SVG triangle instead of using clip-path (more reliable with html2canvas)
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.style.position = 'absolute';
          svg.style.top = '0';
          svg.style.left = '0';
          svg.style.width = `${width}px`;
          svg.style.height = `${height}px`;
          svg.style.zIndex = '10';
          svg.style.pointerEvents = 'none';
          svg.setAttribute('width', width.toString());
          svg.setAttribute('height', height.toString());
          svg.setAttribute('preserveAspectRatio', 'none');
          svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
          
          // Define triangle points based on edge class
          let points = '';
          if (edgeClass === 'top') {
            points = `0,0 ${width},0 ${width/2},${height}`;
          } else if (edgeClass === 'right') {
            points = `${width},0 ${width},${height} 0,${height/2}`;
          } else if (edgeClass === 'bottom') {
            points = `0,${height} ${width},${height} ${width/2},0`;
          } else if (edgeClass === 'left') {
            points = `0,0 0,${height} ${width},${height/2}`;
          }
          
          const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          polygon.setAttribute('points', points);
          polygon.setAttribute('fill', backgroundColor);
          svg.appendChild(polygon);
          
          // Insert SVG as first child so it's behind edge-count but covers any background
          const edgeCount = edge.querySelector('.edge-count');
          if (edgeCount) {
            edge.insertBefore(svg, edgeCount);
          } else {
            edge.appendChild(svg);
          }
        }
        
        // Ensure edge-count positioning is preserved for ALL edge types
        const edgeCount = edge.querySelector('.edge-count') as HTMLElement;
        if (edgeCount) {
          const originalEdgeCount = originalEdge.querySelector('.edge-count') as HTMLElement;
          if (originalEdgeCount) {
            // Get exact position from original using getBoundingClientRect
            const originalEdgeRect = originalEdge.getBoundingClientRect();
            const originalCountRect = originalEdgeCount.getBoundingClientRect();
            
            // Calculate relative position within the edge (in pixels)
            const relativeTop = originalCountRect.top - originalEdgeRect.top;
            const relativeLeft = originalCountRect.left - originalEdgeRect.left;
            
            // Get computed styles for size
            const originalStyle = window.getComputedStyle(originalEdgeCount);
            const width = originalStyle.width || '24px';
            const height = originalStyle.height || '24px';
            
            // Use exact pixel positioning instead of transform (more reliable)
            edgeCount.style.position = 'absolute';
            edgeCount.style.top = `${relativeTop}px`;
            edgeCount.style.left = `${relativeLeft}px`;
            edgeCount.style.transform = 'none'; // Remove transform, use exact positioning
            edgeCount.style.zIndex = '30';
            // Ensure flex centering is preserved for text
            edgeCount.style.display = 'flex';
            edgeCount.style.alignItems = 'center';
            edgeCount.style.justifyContent = 'center';
            // Preserve size
            edgeCount.style.width = width;
            edgeCount.style.height = height;
          }
        }
      });
    }
    
    // Remove infoboxes and UI controls from clone (for distribution section)
    // These are positioned absolutely and overlay the chart
    const infoboxes = clone.querySelectorAll(
      '.quadrant-info-box, .proximity-point-info-box, .proximity-infobox, .proximity-infobox--positioned, ' +
      '.info-box, [class*="infobox"], [class*="info-box"], ' +
      '[class*="QuadrantInfoBox"], [class*="ProximityPointInfoBox"], ' +
      '.info-ribbon, [class*="InfoRibbon"]'
    );
    infoboxes.forEach(box => {
      const boxEl = box as HTMLElement;
      // Also check parent elements
      if (boxEl.closest('.quadrant-grid, .response-concentration-section, .recommendation-score-section, .proximity-distribution-card')) {
        boxEl.remove();
      }
    });
    
    // Remove "Click for details" premium-hint elements from distribution section
    // This applies to both the Findings section and export
    const premiumHints = clone.querySelectorAll('.premium-hint');
    premiumHints.forEach(hint => {
      const hintEl = hint as HTMLElement;
      // Check if it's within a distribution section (quadrant-grid or distribution-card)
      if (hintEl.closest('.quadrant-grid, .distribution-card, .distribution-section')) {
        hintEl.remove();
      }
    });
    
    // Remove funnel icon and other UI controls that might overlay
    // Note: el is guaranteed to be non-null here because we return early if it's null
    if (el) {
      const uiControls = clone.querySelectorAll(
        '[class*="funnel"], [class*="control"], button:not(.quadrant-grid button), ' +
        '.settings-button, .filter-button, [role="button"]'
      );
      const parentRect = el.getBoundingClientRect();
      uiControls.forEach(control => {
        const controlEl = control as HTMLElement;
        // Only remove if it's positioned absolutely or is clearly a UI control
        const style = window.getComputedStyle(controlEl);
        if (style.position === 'absolute' || style.position === 'fixed') {
          // Check if it's overlaying the chart area
          const rect = controlEl.getBoundingClientRect();
          // If control is within chart bounds, remove it
          if (rect.top >= parentRect.top && rect.left >= parentRect.left &&
              rect.bottom <= parentRect.bottom && rect.right <= parentRect.right) {
            controlEl.remove();
          }
        }
      });
    }
    
    // Handle watermarks: For non-main charts, fix dimensions. For main chart with hideWatermark, already removed above.
    if (!hideWatermark) {
      // Only process watermarks for non-main charts (main chart watermarks already removed above)
      const watermarkLayers = clone.querySelectorAll('.watermark-layer') as NodeListOf<HTMLElement>;
      // Fix watermark dimensions in the clone (same as exportCapture.ts)
      watermarkLayers.forEach(layer => {
        const currentTransform = layer.style.transform || getComputedStyle(layer).transform;
        const isVertical = currentTransform.includes('rotate(-90deg)') || currentTransform.includes('-90deg');
        
        if (isVertical) {
          const currentWidth = parseFloat(layer.style.width || '90') || 90;
          const logoSize = currentWidth;
          const verticalScale = 0.4;
          const containerWidth = logoSize * 2.8 * verticalScale;
          const containerHeight = logoSize * 0.4 * verticalScale;
          
          layer.style.width = `${containerWidth}px`;
          layer.style.height = `${containerHeight}px`;
          layer.style.transformOrigin = 'center center';
          
          const currentLeft = parseFloat(layer.style.left || '0') || 0;
          const currentTop = parseFloat(layer.style.top || '0') || 0;
          const originalCenterX = currentLeft + logoSize / 2;
          const originalCenterY = currentTop + logoSize / 2;
          const adjustedLeft = originalCenterX - containerWidth / 2;
          const adjustedTop = originalCenterY - containerHeight / 2;
          const rightOffset = 40;
          layer.style.left = `${adjustedLeft + rightOffset}px`;
          layer.style.top = `${adjustedTop}px`;
        }
      });
    }
    
    // For Response Concentration chart, fix y-axis labels
    if (selector.includes('report-response-concentration')) {
      // Fix .mini-plot-y-label elements (from MiniPlot component)
      // Current: writing-mode: vertical-lr + transform: rotate(180deg) = upside down
      // Desired: rotate 90deg clockwise = change rotate(180deg) to rotate(-90deg)
      // Also adjust position: move right and down a bit
      const miniPlotYLabels = clone.querySelectorAll('.mini-plot-y-label');
      miniPlotYLabels.forEach((label) => {
        const labelEl = label as HTMLElement;
        // Change the transform: rotate and translate to move right and down
        // translate(5px, 10px) moves it 5px right and 10px down
        labelEl.style.setProperty('transform', 'translate(5px, 10px) rotate(-90deg)', 'important');
        // Reduce the gap - original has margin-right: 6px, reduce to 2px
        labelEl.style.setProperty('margin-right', '2px', 'important');
      });
      
      // Fix .y-label elements (from AxisLegends component) if present
      const yLabels = clone.querySelectorAll('.y-label');
      yLabels.forEach(label => {
        const labelEl = label as HTMLElement;
        // Get the inline style transform (this is what React sets)
        const inlineStyle = labelEl.getAttribute('style') || '';
        const computedStyle = window.getComputedStyle(labelEl);
        
        // Apply rotation fix to Y-axis labels (loyalty axis, whatever the label text)
        {
          // Get current transform from inline style or computed
          let transform = inlineStyle.match(/transform:\s*([^;]+)/)?.[1] || 
                         computedStyle.transform || 
                         '';
          
          // If transform includes rotate(-90deg), we need to fix it
          if (transform.includes('rotate(-90deg)') || transform.includes('-90deg')) {
            // Extract translateY part if it exists
            const translateMatch = transform.match(/translateY\([^)]+\)/);
            const translatePart = translateMatch ? translateMatch[0] : '';
            
            // Build new style string without rotation
            let newStyle = inlineStyle;
            // Remove the rotate part from transform
            newStyle = newStyle.replace(/transform:\s*[^;]+/, `transform: ${translatePart || 'none'}`);
            // Remove any remaining rotate references
            newStyle = newStyle.replace(/rotate\(-90deg\)/g, '').replace(/rotate\(-90 deg\)/g, '');
            
            // Set the new style
            labelEl.setAttribute('style', newStyle);
            
            // Override with explicit styles
            labelEl.style.transform = translatePart || 'none';
            labelEl.style.transformOrigin = 'left center';
            labelEl.style.writingMode = 'vertical-rl';
            labelEl.style.textOrientation = 'upright';
            
            // Ensure positioning is maintained
            if (computedStyle.left && computedStyle.left !== 'auto') {
              labelEl.style.left = computedStyle.left;
            }
            if (computedStyle.top && computedStyle.top !== 'auto') {
              labelEl.style.top = computedStyle.top;
            }
          } else {
            // Even if no rotation, ensure it's vertical
            labelEl.style.writingMode = 'vertical-rl';
            labelEl.style.textOrientation = 'upright';
          }
        }
      });
    }
    
    // For Recommendation Score charts, fix Loyalty Distribution percentage labels
    if (selector.includes('recommendation-score-widgets') || selector.includes('recommendation-score-section')) {
      // Fix .chart-bar-percentage.rotated elements (from LoyaltyDistributionChart component)
      // Ensure proper rotation and spacing for "xx.xx%" format (up to 4 digits + decimal + %)
      const rotatedPercentages = clone.querySelectorAll('.chart-bar-percentage.rotated');
      rotatedPercentages.forEach((percentage) => {
        const percentageEl = percentage as HTMLElement;
        const computedStyle = window.getComputedStyle(percentageEl);
        
        // Override with explicit styles to ensure proper rotation and spacing
        percentageEl.style.setProperty('transform', 'rotate(-90deg)', 'important');
        percentageEl.style.setProperty('transform-origin', 'center center', 'important');
        percentageEl.style.setProperty('white-space', 'nowrap', 'important');
        percentageEl.style.setProperty('writing-mode', 'initial', 'important'); // Remove writing-mode
        percentageEl.style.setProperty('text-orientation', 'initial', 'important'); // Remove text-orientation
        
        // Ensure enough space for rotated text (width becomes height when rotated -90deg)
        // "xx.xx%" needs about 3.5rem width (which becomes height when rotated)
        percentageEl.style.setProperty('min-width', '3.5rem', 'important');
        percentageEl.style.setProperty('width', 'auto', 'important');
        percentageEl.style.setProperty('height', 'auto', 'important');
        percentageEl.style.setProperty('min-height', '1rem', 'important');
        
        // Center the rotated text
        percentageEl.style.setProperty('left', '50%', 'important');
        percentageEl.style.setProperty('margin-left', '-1.75rem', 'important');
        percentageEl.style.setProperty('bottom', '-0.5rem', 'important');
        
        // Ensure flex centering
        percentageEl.style.setProperty('display', 'flex', 'important');
        percentageEl.style.setProperty('align-items', 'center', 'important');
        percentageEl.style.setProperty('justify-content', 'center', 'important');
      });
    }
    
    // Fix data point inner rings for export (convert inset box-shadow to nested divs for better html2canvas compatibility)
    // Also remove outer box-shadows that create black shadow artifacts
    // Note: el is guaranteed to be non-null here because we return early if it's null (line 101-111)
    const dataPoints = clone.querySelectorAll('.data-point') as NodeListOf<HTMLElement>;
    console.log('🔍 Chart Capture: Found', dataPoints.length, 'data points');
    
    dataPoints.forEach((point, index) => {
      // Get computed style from ORIGINAL element (not clone) to see actual box-shadow
      // Find the corresponding original point
      // el is guaranteed to be non-null here (checked at line 101-111)
      const originalPoints = el!.querySelectorAll('.data-point') as NodeListOf<HTMLElement>;
      const originalPoint = originalPoints[index];
      
      // Get size from original or clone
      const inlineWidth = point.style.width;
      const size = parseFloat(inlineWidth) || (originalPoint ? parseFloat(window.getComputedStyle(originalPoint).width) : parseFloat(window.getComputedStyle(point).width)) || 0;
      
      // Get the computed box-shadow from the ORIGINAL element to see what we need to convert
      // But we'll remove ALL box-shadows from the CLONE and rebuild only what we need
      const originalBoxShadow = originalPoint ? window.getComputedStyle(originalPoint).boxShadow : '';
      
      // ALWAYS remove all box-shadows from the clone first (CSS class adds box-shadow: 0 1px 3px rgba(0,0,0,0.2))
      // Use !important to override CSS class box-shadow
      point.style.setProperty('box-shadow', 'none', 'important');
      
      // Also remove any outline that might create a black circle
      point.style.setProperty('outline', 'none', 'important');
      
      // Now check the original's box-shadow to see if it has an inset shadow (inner ring) we need to convert
      let boxShadow = originalBoxShadow;
      
      console.log(`🔍 Chart Capture: Point ${index}, boxShadow:`, boxShadow, 'size:', size);
      
      // Check if it's an inset box-shadow (inner ring)
      // Box-shadow format in browser: "rgba(0, 0, 0, 0.3) 0px 0px 0px 16.52px inset"
      if (boxShadow && boxShadow.includes('inset')) {
        // Match format: "rgba(...) 0px 0px 0px Xpx inset" or "rgba(...) 0 0 0 Xpx inset"
        const insetMatch = boxShadow.match(/(rgba?\([^)]+\))\s+0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+([\d.]+)px\s+inset/);
        if (insetMatch) {
          const ringColor = insetMatch[1];
          const ringWidth = parseFloat(insetMatch[2]);
          
          // Calculate inner circle size so the border stays INSIDE the dot
          // The inset box-shadow creates a ring that's ringWidth pixels from the edge
          // So the ring extends from radius (size/2 - ringWidth) to radius (size/2)
          // When we use a border with box-sizing: content-box, the border is added OUTSIDE the element's size
          // So if inner div has size D and border B, total size = D + 2*B
          // We want total size <= size (dot size), so: D + 2*B <= size
          // Therefore: D <= size - 2*B
          // To match the inset box-shadow exactly, we want the border outer edge at size/2
          // So: D/2 + B = size/2, therefore D = size - 2*B
          const innerCircleSize = Math.max(0, size - ringWidth * 2);
          
          console.log(`✅ Chart Capture: Converting point ${index}, ringWidth:`, ringWidth, 'innerCircleSize:', innerCircleSize, 'dot size:', size);
          
          if (innerCircleSize > 0 && ringWidth > 0) {
            // Remove ALL box-shadows (inset and outer shadows) that might create artifacts in html2canvas
            // The CSS has box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) which creates the black shadow
            // Use !important to override CSS class
            point.style.setProperty('box-shadow', 'none', 'important');
            
            // Add flex display to center the inner ring
            point.style.display = 'flex';
            point.style.alignItems = 'center';
            point.style.justifyContent = 'center';
            
            // Create nested div for inner ring
            // Use content-box so border is added outside, matching the inset box-shadow behavior
            const innerRing = document.createElement('div');
            innerRing.style.width = `${innerCircleSize}px`;
            innerRing.style.height = `${innerCircleSize}px`;
            innerRing.style.borderRadius = '50%';
            innerRing.style.border = `${ringWidth}px solid ${ringColor}`;
            innerRing.style.boxSizing = 'content-box'; // Border added outside, not included in size
            innerRing.style.pointerEvents = 'none';
            innerRing.style.flexShrink = '0';
            innerRing.style.boxShadow = 'none'; // Ensure no shadow on inner ring
            innerRing.style.margin = '0'; // No margin
            innerRing.style.padding = '0'; // No padding
            
            point.appendChild(innerRing);
            const actualOuterRadius = (innerCircleSize + ringWidth * 2) / 2;
            console.log(`✅ Chart Capture: Added inner ring to point ${index}, innerCircleSize:`, innerCircleSize, 'ringWidth:', ringWidth, 'total size:', innerCircleSize + ringWidth * 2, 'dot size:', size, 'actual outer radius:', actualOuterRadius, 'dot radius:', size/2);
          } else {
            // Even if no inner ring, remove outer box-shadow to prevent black shadow artifacts
            point.style.setProperty('box-shadow', 'none', 'important');
          }
        } else {
          console.warn(`⚠️ Chart Capture: Could not parse box-shadow for point ${index}:`, boxShadow);
        }
      }
    });
    
    // Convert canvas elements to images (if using canvas rendering)
    // el is guaranteed to be non-null here (checked at line 101-111)
    const originalCanvasElements = el!.querySelectorAll('canvas.canvas-data-points') as NodeListOf<HTMLCanvasElement>;
    const clonedCanvasElements = clone.querySelectorAll('canvas.canvas-data-points') as NodeListOf<HTMLCanvasElement>;
    
    console.log('🔍 Chart Capture: Found', originalCanvasElements.length, 'canvas elements');
    
    originalCanvasElements.forEach((originalCanvas, index) => {
      const clonedCanvas = clonedCanvasElements[index];
      if (!clonedCanvas || !originalCanvas) return;
      
      try {
        // Get the rendered content from the original canvas
        const dataUrl = originalCanvas.toDataURL('image/png', 1.0);
        console.log('✅ Chart Capture: Converted canvas to image, size:', dataUrl.length);
        
        // Convert cloned canvas to image
        const img = document.createElement('img');
        img.src = dataUrl;
        
        // Copy positioning styles from canvas
        const computedStyle = window.getComputedStyle(originalCanvas);
        img.style.width = computedStyle.width || `${originalCanvas.width}px`;
        img.style.height = computedStyle.height || `${originalCanvas.height}px`;
        img.style.position = computedStyle.position || 'absolute';
        img.style.left = computedStyle.left || '0';
        img.style.top = computedStyle.top || '0';
        img.style.pointerEvents = 'none';
        img.style.zIndex = computedStyle.zIndex || 'auto';
        
        // Replace cloned canvas with image
        const parent = clonedCanvas.parentElement;
        if (parent) {
          parent.insertBefore(img, clonedCanvas);
          clonedCanvas.remove();
          console.log('✅ Chart Capture: Replaced canvas with image');
        }
      } catch (err) {
        console.warn('❌ Chart Capture: Failed to convert canvas to image:', err);
      }
    });
    
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    try {
      // Calculate wrapper dimensions including padding for html2canvas
      const wrapperRect = wrapper.getBoundingClientRect();
      const wrapperWidth = wrapperRect.width;
      const wrapperHeight = wrapperRect.height;
      
      // Capture using html2canvas
      // Set windowWidth and windowHeight to ensure full capture including padding and overflow
      const canvas = await html2canvas(wrapper, {
        scale: 2, // High quality
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: wrapperWidth,
        windowHeight: wrapperHeight,
        allowTaint: false
      });

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      const chartType = getChartTypeFromSelector(selector);
      
      // For Recommendation Score Simulator, generate explanatory text if it has been used
      let finalCaption = caption;
      if (selector.includes('recommendation-score-simulator') || selector.includes('.recommendation-score-simulator')) {
        const simulator = document.querySelector('.recommendation-score-simulator');
        if (simulator) {
          // Check if simulator has been used (any sliders have non-zero values)
          const sliders = simulator.querySelectorAll('input[type="range"]');
          let hasChanges = false;
          const changes: Array<{label: string; value: number; type: string}> = [];
          
          sliders.forEach(slider => {
            const input = slider as HTMLInputElement;
            const value = parseInt(input.value) || 0;
            if (value !== 0) {
              hasChanges = true;
              // Get the label to understand what change this represents
              const control = input.closest('.simulator-control');
              const labelEl = control?.querySelector('.control-label');
              const label = labelEl?.textContent?.trim() || '';
              // Determine the type of change
              let type = '';
              if (label.toLowerCase().includes('detractor') && label.toLowerCase().includes('passive')) {
                type = 'detractorsToPassives';
              } else if (label.toLowerCase().includes('detractor') && label.toLowerCase().includes('promoter')) {
                type = 'detractorsToPromoters';
              } else if (label.toLowerCase().includes('passive') && label.toLowerCase().includes('promoter')) {
                type = 'passivesToPromoters';
              } else if (label.toLowerCase().includes('passive') && label.toLowerCase().includes('detractor')) {
                type = 'passivesToDetractors';
              } else if (label.toLowerCase().includes('promoter') && label.toLowerCase().includes('passive')) {
                type = 'promotersToPassives';
              } else if (label.toLowerCase().includes('promoter') && label.toLowerCase().includes('detractor')) {
                type = 'promotersToDetractors';
              }
              if (label && value > 0) {
                changes.push({ label, value, type });
              }
            }
          });
          
          // Get current and simulated scores from DOM
          const currentScoreEl = simulator.querySelector('.score-display.current .score-value');
          const simulatedScoreEl = simulator.querySelector('.score-display.simulated .score-value');
          const currentScore = currentScoreEl ? parseFloat(currentScoreEl.textContent || '0') : 0;
          const simulatedScore = simulatedScoreEl ? parseFloat(simulatedScoreEl.textContent || '0') : 0;
          
          if (hasChanges && Math.abs(simulatedScore - currentScore) > 0.1) {
            const scoreDiff = simulatedScore - currentScore;
            const isImprovement = scoreDiff > 0;
            
            // Build change descriptions
            const changeDescriptions: string[] = [];
            changes.forEach(change => {
              if (change.type === 'detractorsToPassives') {
                changeDescriptions.push(`convert ${change.value} Detractor${change.value !== 1 ? 's' : ''} to Passive${change.value !== 1 ? 's' : ''}`);
              } else if (change.type === 'detractorsToPromoters') {
                changeDescriptions.push(`convert ${change.value} Detractor${change.value !== 1 ? 's' : ''} to Promoter${change.value !== 1 ? 's' : ''}`);
              } else if (change.type === 'passivesToPromoters') {
                changeDescriptions.push(`convert ${change.value} Passive${change.value !== 1 ? 's' : ''} to Promoter${change.value !== 1 ? 's' : ''}`);
              } else if (change.type === 'passivesToDetractors') {
                changeDescriptions.push(`convert ${change.value} Passive${change.value !== 1 ? 's' : ''} to Detractor${change.value !== 1 ? 's' : ''}`);
              } else if (change.type === 'promotersToPassives') {
                changeDescriptions.push(`convert ${change.value} Promoter${change.value !== 1 ? 's' : ''} to Passive${change.value !== 1 ? 's' : ''}`);
              } else if (change.type === 'promotersToDetractors') {
                changeDescriptions.push(`convert ${change.value} Promoter${change.value !== 1 ? 's' : ''} to Detractor${change.value !== 1 ? 's' : ''}`);
              }
            });
            
            finalCaption = `Based on the Recommendation Score Simulator, if you were to ${changeDescriptions.join(', ')}, your Recommendation Score would ${isImprovement ? 'improve' : 'change'} from ${currentScore.toFixed(1)} to ${simulatedScore.toFixed(1)} (${isImprovement ? '+' : ''}${scoreDiff.toFixed(1)} points). `;
            
            if (isImprovement) {
              finalCaption += `To achieve this improvement, focus on converting Detractors to Promoters or Passives, and moving Passives to Promoters through targeted engagement, improved customer experience, and addressing pain points.`;
            } else {
              finalCaption += `This simulation shows a potential decline, which highlights areas that need attention to prevent customer movement in this direction.`;
            }
          } else {
            // Simulator hasn't been used or scores are the same - return null to skip capture
            return null;
          }
        } else {
          // Simulator not found - return null
          return null;
        }
      }

      return {
        id: selector,
        chartType,
        dataUrl,
        caption: finalCaption,
        selector
      };
    } finally {
      // Restore watermark in original element if we removed it (for Brand+ main chart)
      if (originalWatermarkStyles.length > 0) {
        originalWatermarkStyles.forEach(({ element }) => {
          console.log('✅ Restoring watermark in original element');
          // If we removed it from DOM, restore it
          if ((element as any).__originalParent) {
            const parent = (element as any).__originalParent;
            const nextSibling = (element as any).__originalNextSibling;
            if (nextSibling) {
              parent.insertBefore(element, nextSibling);
            } else {
              parent.appendChild(element);
            }
            console.log('✅ Watermark restored to DOM');
          } else {
            // If we just hid it, restore styles
            element.style.display = (element as any).__originalDisplay || '';
            element.style.visibility = (element as any).__originalVisibility || '';
            element.style.opacity = (element as any).__originalOpacity || '';
            element.style.removeProperty('position');
            element.style.removeProperty('left');
            element.style.removeProperty('top');
            element.style.removeProperty('z-index');
          }
        });
      }
      
      // Cleanup
      if (document.body.contains(wrapper)) {
        wrapper.remove();
      }
    }
  } catch (error) {
    console.error(`Failed to capture chart ${selector}:`, error);
    return null;
  }
}

/**
 * Captures multiple charts in parallel
 */
export async function captureMultipleCharts(
  selectors: Array<{ selector: string; caption: string }>,
  options?: { hideWatermarkForMainChart?: boolean }
): Promise<ChartImage[]> {
  const { hideWatermarkForMainChart = false } = options || {};
  console.log('🚨🚨🚨 captureMultipleCharts CALLED with hideWatermarkForMainChart:', hideWatermarkForMainChart);
  console.log('🚨🚨🚨 Number of charts to capture:', selectors.length);
  selectors.forEach(({ selector }) => {
    console.log('🚨🚨🚨 Chart selector:', selector);
  });
  
  const promises = selectors.map(({ selector, caption }) => {
    // For Brand+ users, hide watermark when capturing main chart
    // Check if selector matches main chart (exact match or contains chart-container)
    const isMainChart = selector === '.chart-container' || 
                       selector.includes('chart-container') ||
                       selector.includes('chart-main-visualisation');
    const hideWatermark = hideWatermarkForMainChart && isMainChart;
    
    if (isMainChart) {
      console.log('🚨🚨🚨 Main chart detected:', {
        selector,
        hideWatermark,
        isPremium: hideWatermarkForMainChart,
        exactMatch: selector === '.chart-container',
        containsChartContainer: selector.includes('chart-container')
      });
    } else {
      console.log('📊 Other chart:', selector, 'hideWatermark:', false);
    }
    
    return captureChartAsImage(selector, caption, { hideWatermark });
  });
  
  const results = await Promise.all(promises);
  
  // Filter out null results
  return results.filter((img): img is ChartImage => img !== null);
}

