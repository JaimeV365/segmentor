import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, Package, LogOut } from 'lucide-react';
import './DemoTour.css';

// Custom Bird Icon Component for Mercenaries
const BirdIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className = '' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`lucide lucide-bird-icon lucide-bird ${className}`}
  >
    <path d="M16 7h.01"/>
    <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/>
    <path d="m20 7 2 .5-2 .5"/>
    <path d="M10 18v3"/>
    <path d="M14 17.75V21"/>
    <path d="M7 18a6 6 0 0 0 3.84-10.61"/>
  </svg>
);

interface TourStepConditionProps {
  isPremium?: boolean;
  isOpen?: boolean;
  dataLength?: number;
}

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  scrollOffset?: number;
  requiresInteraction?: boolean;
  ariaLabel?: string;
  condition?: (props: TourStepConditionProps) => boolean; // Condition to show this step
  isIntro?: boolean; // Special intro step that doesn't highlight anything
  showIndicators?: boolean; // Show visual indicators (arrows) for this step
}

interface DemoTourProps {
  isOpen: boolean;
  onClose: () => void;
  isPremium?: boolean;
  dataLength?: number;
}

const createTourSteps = (isPremium: boolean): TourStep[] => {
  const baseSteps: TourStep[] = [
    {
      id: 'intro',
      title: 'Welcome to Demo Mode',
      content: 'This demo showcases segmentor.app with pre-loaded sample data. You\'ll explore:\n\n• Customer segmentation visualisation\n• Chart customisation & branding\n• Advanced filtering & analysis\n• Comprehensive reporting\n• Export capabilities\n\nFollow the tour or explore freely—you can interact with everything!',
      target: 'body',
      position: 'top',
      ariaLabel: 'Tour introduction',
      isIntro: true
    },
    {
      id: 'data-entry',
      title: 'Upload Your Data',
      content: '90 sample customers are now loaded. You can also upload CSV, add entries manually, or load a saved project.',
      target: '[data-section-id="data-entry"]',
      position: 'bottom',
      ariaLabel: 'Data entry section with upload options',
      showIndicators: true
    },
    {
      id: 'data-table',
      title: 'Your Data Table',
      content: 'All customer data in one place. Sort, edit, or exclude customers as needed.',
      target: '[data-section-id="data-table"]',
      position: 'top',
      scrollOffset: 120,
      ariaLabel: 'Data table showing all customer entries'
    },
    {
      id: 'visualization',
      title: 'Automatic Segmentation',
      content: 'Customers automatically segment into four groups. Each dot shows satisfaction and loyalty scores.',
      target: '[data-section-id="main-chart"]',
      position: 'top',
      scrollOffset: 120,
      ariaLabel: 'Customer segmentation visualisation chart'
    },
    {
      id: 'segment-loyalists',
      title: 'Loyalists',
      content: 'High Satisfaction + High Loyalty\n\nYour growth engine. They love you, they\'re staying, and they\'re telling everyone. Nurture these relationships relentlessly.',
      target: '.quadrant.loyalists',
      position: 'right',
      scrollOffset: 120,
      ariaLabel: 'Loyalists segment - high satisfaction and high loyalty',
      showIndicators: true
    },
    {
      id: 'segment-mercenaries',
      title: 'Mercenaries',
      content: 'High Satisfaction + Low Loyalty\n\nThey like your product but won\'t hesitate to switch for a better deal. Build bonds and emotional connection.',
      target: '.quadrant.mercenaries',
      position: 'left',
      scrollOffset: 120,
      ariaLabel: 'Mercenaries segment - high satisfaction and low loyalty',
      showIndicators: true
    },
    {
      id: 'segment-hostages',
      title: 'Hostages',
      content: 'Low Satisfaction + High Loyalty\n\nStuck with you (contracts, switching costs, lack of alternatives). Fix their pain points or risk explosive churn later.',
      target: '.quadrant.hostages',
      position: 'right',
      scrollOffset: 120,
      ariaLabel: 'Hostages segment - low satisfaction and high loyalty',
      showIndicators: true
    },
    {
      id: 'segment-defectors',
      title: 'Defectors',
      content: 'Low Satisfaction + Low Loyalty\n\nAlready mentally gone. Understand why to prevent future defections. Sometimes, letting go is the strategic choice.',
      target: '.quadrant.defectors',
      position: 'left',
      scrollOffset: 120,
      ariaLabel: 'Defectors segment - low satisfaction and low loyalty',
      showIndicators: true
    },
    {
      id: 'chart-controls',
      title: 'Customise Your View',
      content: 'Use the Controls ribbon above the chart to adjust styles, zones, labels, and midpoint settings.',
      target: '.chart-controls-wrapper, .chart-controls',
      position: 'top',
      scrollOffset: 120,
      requiresInteraction: false,
      ariaLabel: 'Chart customisation controls ribbon'
    },
    {
      id: 'brand-customisation',
      title: 'Watermark Customisation',
      content: 'Customise your watermark: adjust size, position, and transparency. Contact Teresa Monroe experts if you need to show your own logo.',
      target: '.control-group.watermark-group',
      position: 'top',
      scrollOffset: 120,
      condition: (props) => props.isPremium === true,
      ariaLabel: 'Watermark Controls and logo customisation options'
    },
    {
      id: 'filters',
      title: 'Filter Your Data',
      content: 'Filter by date, segment, or attributes to dive deeper into specific customer groups. The filter panel is open on the right—use it to slice and dice your data.',
      target: '.unified-controls-panel',
      position: 'left',
      scrollOffset: 0, // Don't scroll - panel is fixed on right side
      ariaLabel: 'Data filtering options panel'
    },
    {
      id: 'reports-section',
      title: 'Analysis Reports',
      content: 'Use the left menu to quickly navigate between reports: Data Report, Segment Distribution, Proximity Analysis, Actions Report, and more. Click any report to jump directly to it.',
      target: '.section-navigation',
      position: 'right',
      scrollOffset: 0, // Don't scroll - drawer is fixed on left side
      ariaLabel: 'Reports navigation shortcuts in left drawer'
    },
    {
      id: 'actions-report',
      title: 'Export Action Plan',
      content: 'Generate comprehensive action plans. Export to PDF or Excel to share with your team.',
      target: '[data-section-id="report-actions"]',
      position: 'top',
      scrollOffset: 120,
      ariaLabel: 'Actions Report for export and sharing'
    },
    {
      id: 'save-progress',
      title: 'Save Your Work',
      content: 'Download a project file from the left menu. Reload it later to continue where you left off.',
      target: '.drawer-save-button-container',
      position: 'right',
      scrollOffset: 0, // Don't scroll - drawer is fixed on left side
      ariaLabel: 'Save progress functionality'
    },
    {
      id: 'support-help',
      title: 'Need Help?',
      content: 'Get support for segmentor or improve your CX programme with Teresa Monroe experts.',
      target: '.drawer-section .drawer-item',
      position: 'right',
      scrollOffset: 0, // Don't scroll - drawer is fixed on left side
      ariaLabel: 'Support and help resources'
    }
  ];

  // Filter steps based on conditions
  return baseSteps.filter(step => {
    if (step.condition) {
      const conditionProps: TourStepConditionProps = { isPremium, isOpen: true, dataLength: 0 };
      return step.condition(conditionProps);
    }
    return true;
  });
};

// Component to dynamically position tab indicators
const TabIndicators: React.FC<{ spotlightRect: DOMRect }> = ({ spotlightRect }) => {
  const [tabPositions, setTabPositions] = useState<Array<{ 
    id: string; 
    label: string; 
    rect: DOMRect;
    labelRect: DOMRect;
    textOffset: number;
  }>>([]);

  useEffect(() => {
    // Find tab buttons dynamically
    const tabContainer = document.querySelector('.data-entry-tabs .tab-header');
    if (!tabContainer) return;

    const tabButtons = tabContainer.querySelectorAll('.tab-button');
    const positions: Array<{ 
      id: string; 
      label: string; 
      rect: DOMRect;
      labelRect: DOMRect;
      textOffset: number;
    }> = [];

    tabButtons.forEach((button) => {
      const buttonRect = button.getBoundingClientRect();
      const labelElement = button.querySelector('.tab-label') as HTMLElement;
      if (!labelElement) return;
      
      const label = labelElement.textContent?.trim() || '';
      const labelRect = labelElement.getBoundingClientRect();
      
      // Determine tab ID from button class or text
      let id = '';
      if (label.toLowerCase().includes('csv') || label.toLowerCase().includes('upload')) {
        id = 'csv-upload';
      } else if (label.toLowerCase().includes('manual')) {
        id = 'manual-entry';
      } else if (label.toLowerCase().includes('load') || label.toLowerCase().includes('project')) {
        id = 'load-project';
      }
      
      if (id && label) {
        // Calculate the distance from the text's right edge to the button's right edge
        const distanceFromTextToButtonEdge = buttonRect.right - labelRect.right;
        
        // Store both button rect and label rect for positioning
        positions.push({ 
          id, 
          label, 
          rect: buttonRect,
          labelRect: labelRect,
          textOffset: distanceFromTextToButtonEdge
        });
      }
    });

    setTabPositions(positions);
  }, [spotlightRect]);

  if (tabPositions.length === 0) return null;

  return (
    <div className="demo-tour-indicators">
      {tabPositions.map((tab) => {
        // Calculate vertical position: slightly above the label's center for better alignment
        // Move up by about 2-3px from center to position it a bit higher
        const verticalCenter = (tab.labelRect.top + tab.labelRect.bottom) / 2 - 3;
        
        // Calculate horizontal position: start from text's right edge
        // Position indicator to the right of the actual text
        const horizontalPosition = tab.labelRect.right + 12;
        
        return (
          <div
            key={tab.id}
            className={`demo-tour-indicator demo-tour-indicator--${tab.id}`}
            style={{
              top: `${verticalCenter}px`,
              left: `${Math.min(horizontalPosition, window.innerWidth - 180)}px`, // Keep within viewport with margin
              transform: 'translateY(-50%)' // Center the indicator itself vertically on the label's center
            }}
          >
            <div className="demo-tour-indicator-label">{tab.label}</div>
          </div>
        );
      })}
    </div>
  );
};

// Component to dynamically position quadrant indicators
const QuadrantIndicators: React.FC<{ spotlightRect: DOMRect; quadrantType: 'loyalists' | 'mercenaries' | 'hostages' | 'defectors' }> = ({ spotlightRect, quadrantType }) => {
  const [quadrantRect, setQuadrantRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    // Find the specific quadrant element
    const quadrantElement = document.querySelector(`.quadrant.${quadrantType}`);
    if (!quadrantElement) return;

    const rect = quadrantElement.getBoundingClientRect();
    setQuadrantRect(rect);
  }, [spotlightRect, quadrantType]);

  if (!quadrantRect) return null;

  // Icon mapping
  const iconMap = {
    loyalists: Heart,
    mercenaries: BirdIcon,
    hostages: Package,
    defectors: LogOut
  };

  const Icon = iconMap[quadrantType];

  // Calculate position based on quadrant location
  // Position indicator at the center of the quadrant vertically
  const centerY = (quadrantRect.top + quadrantRect.bottom) / 2;

  // Determine which side to place the indicator based on quadrant position
  // For top-right (loyalists): place on right
  // For top-left (mercenaries): place on left
  // For bottom-left (hostages): place on left
  // For bottom-right (defectors): place on right
  let indicatorX: number;
  const spacing = 12;
  const indicatorWidth = 150; // Approximate width of indicator

  if (quadrantType === 'loyalists') {
    // Top-right: indicator on the right side
    indicatorX = quadrantRect.right + spacing;
  } else if (quadrantType === 'mercenaries') {
    // Top-left: indicator on the left side
    indicatorX = quadrantRect.left - spacing - indicatorWidth;
  } else if (quadrantType === 'hostages') {
    // Bottom-left: indicator on the left side
    indicatorX = quadrantRect.left - spacing - indicatorWidth;
  } else {
    // Bottom-right (defectors): indicator on the right side
    indicatorX = quadrantRect.right + spacing;
  }

  // Keep within viewport
  indicatorX = Math.max(12, Math.min(indicatorX, window.innerWidth - indicatorWidth - 12));

  return (
    <div
      className={`demo-tour-quadrant-indicator demo-tour-quadrant-indicator--${quadrantType}`}
      style={{
        top: `${centerY}px`,
        left: `${indicatorX}px`,
        transform: 'translateY(-50%)'
      }}
    >
      <div className="demo-tour-quadrant-indicator-icon">
        <Icon size={20} />
      </div>
      <div className="demo-tour-quadrant-indicator-label">
        {quadrantType.charAt(0).toUpperCase() + quadrantType.slice(1)}
      </div>
    </div>
  );
};

export const DemoTour: React.FC<DemoTourProps> = ({
  isOpen,
  onClose,
  isPremium = false,
  dataLength = 0
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const steps = createTourSteps(isPremium);

  // Calculate spotlight and tooltip positions
  const updatePositions = useCallback(() => {
    if (currentStep >= steps.length) return;

    const step = steps[currentStep];
    
    // For chart-controls and brand-customisation steps, ensure controls are expanded before calculating position
    if (step.id === 'chart-controls' || step.id === 'brand-customisation') {
      const controlsContainer = document.querySelector('.chart-controls');
      if (controlsContainer?.classList.contains('collapsed')) {
        // Controls are still collapsed, wait a bit and try again
        setTimeout(() => updatePositions(), 100);
        return;
      }
    }
    
    // For filters step, ensure the filter panel is open before calculating position
    if (step.id === 'filters') {
      const filterPanel = document.querySelector('.unified-controls-panel');
      if (!filterPanel) {
        // Panel is not open yet, wait a bit and try again
        setTimeout(() => updatePositions(), 100);
        return;
      }
    }
    
    // For reports-section, save-progress, and support-help steps, ensure the drawer is open before calculating position
    if (step.id === 'reports-section' || step.id === 'save-progress' || step.id === 'support-help') {
      const drawer = document.querySelector('.left-drawer');
      if (!drawer || !drawer.classList.contains('open')) {
        // Drawer is not open yet, wait a bit and try again
        setTimeout(() => updatePositions(), 100);
        return;
      }
      
      // For reports-section step, also ensure Reports section is expanded
      if (step.id === 'reports-section') {
        const reportsButton = Array.from(document.querySelectorAll('.section-navigation-item')).find(
          (btn) => btn.textContent?.includes('Reports')
        );
        if (reportsButton) {
          const chevron = reportsButton.querySelector('.section-navigation-chevron');
          const isExpanded = chevron?.classList.contains('expanded');
          if (!isExpanded) {
            // Reports section is not expanded yet, wait a bit and try again
            setTimeout(() => updatePositions(), 100);
            return;
          }
        }
      }
    }
    
    const targetElement = document.querySelector(step.target);

    if (!targetElement) {
      // For data-dependent steps, wait a bit and retry (elements are conditionally rendered)
      const dataDependentSteps = ['data-table', 'visualization', 'segment-loyalists', 'segment-mercenaries', 'segment-hostages', 'segment-defectors', 'reports-section', 'actions-report'];
      if (dataDependentSteps.includes(step.id)) {
        // Retry a few times with increasing delays
        let retryCount = 0;
        const maxRetries = 10;
        const retryInterval = 300;
        
        const retryCheck = () => {
          retryCount++;
          const retryElement = document.querySelector(step.target);
          if (retryElement) {
            // Found it! Update positions now
            updatePositions();
          } else if (retryCount < maxRetries) {
            // Not found yet, try again
            setTimeout(retryCheck, retryInterval);
          } else {
            // Give up after max retries
            console.warn(`Tour step target not found after ${maxRetries} retries: ${step.target}`);
          }
        };
        
        setTimeout(retryCheck, retryInterval);
      }
      console.warn(`Tour step target not found: ${step.target}`);
      return;
    }

    // Get element position
    const rect = targetElement.getBoundingClientRect();
    setSpotlightRect(rect);

    // Calculate tooltip position based on step.position
    // Use reasonable estimates for tooltip dimensions (reduced for more compact tooltip)
    const tooltipWidth = 400;
    const tooltipHeight = 240; // Reduced height for more compact tooltip
    const spacing = 20;
    const padding = 20; // Padding from viewport edges

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;
    let preferredPosition = step.position;

    // For quadrant segment steps, always position below to avoid covering indicators
    const isSegmentStep = step.id.startsWith('segment-');
    if (isSegmentStep) {
      preferredPosition = 'bottom';
    }

    // Calculate preferred position
    switch (preferredPosition) {
      case 'top':
        top = rect.top - tooltipHeight - spacing;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        // If tooltip would go above viewport, flip to bottom
        if (top < padding) {
          preferredPosition = 'bottom';
          top = rect.bottom + spacing;
        }
        break;
      case 'bottom':
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        // Special handling for data-entry and segment steps - position below the highlighted area
        if (step.id === 'data-entry' || isSegmentStep) {
          // Position below the spotlight area
          top = rect.bottom + spacing + (isSegmentStep ? 20 : 20);
          // If it doesn't fit, allow scrolling - position it below and let user scroll
          // Don't constrain to viewport, let it be scrollable
          if (top + tooltipHeight > viewportHeight - padding) {
            // Position it below, user can scroll to see buttons
            // Ensure at least some of tooltip is visible
            if (top > viewportHeight - 100) {
              top = viewportHeight - 100; // Show at least top part
            }
          }
        } else {
          top = rect.bottom + spacing;
          // For other steps, ensure buttons are visible
          if (top + tooltipHeight > viewportHeight - padding) {
            top = Math.max(padding, viewportHeight - tooltipHeight - padding);
          }
        }
        // Ensure tooltip doesn't go above viewport
        if (top < padding) {
          top = padding;
        }
        break;
      case 'left':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.left - tooltipWidth - spacing;
        // If tooltip would go left of viewport, flip to right
        if (left < padding) {
          preferredPosition = 'right';
          left = rect.right + spacing;
        }
        break;
      case 'right':
        top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
        left = rect.right + spacing;
        // If tooltip would go right of viewport, flip to left
        if (left + tooltipWidth > viewportWidth - padding) {
          preferredPosition = 'left';
          left = rect.left - tooltipWidth - spacing;
        }
        break;
    }

    // Ensure tooltip stays within viewport bounds
    // Horizontal constraints
    if (left < padding) {
      left = padding;
    } else if (left + tooltipWidth > viewportWidth - padding) {
      left = viewportWidth - tooltipWidth - padding;
    }

    // Vertical constraints - ensure buttons are always visible
    // Priority: keep tooltip fully visible, especially buttons at bottom
    if (top < padding) {
      top = padding;
    } else if (top + tooltipHeight > viewportHeight - padding) {
      // If tooltip would go below viewport, try to position it better
      if (preferredPosition === 'bottom') {
        // Try positioning above the target
        const topPosition = rect.top - tooltipHeight - spacing;
        if (topPosition >= padding) {
          top = topPosition;
        } else {
          // Center it vertically if it doesn't fit above
          top = Math.max(padding, Math.min(viewportHeight - tooltipHeight - padding, (viewportHeight - tooltipHeight) / 2));
        }
      } else {
        // For other positions, ensure it doesn't go below viewport
        top = Math.max(padding, viewportHeight - tooltipHeight - padding);
      }
    }

    setTooltipPosition({ top, left });
  }, [currentStep, steps]);

  // Scroll to target element
  const scrollToTarget = useCallback((step: TourStep) => {
    // Don't scroll for intro step
    if (step.isIntro) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Update positions after scroll
      setTimeout(() => updatePositions(), 700);
      return;
    }

    // Don't scroll for filters step - panel is fixed on right side
    if (step.id === 'filters') {
      // Wait for panel to be fully open and visible before updating positions
      setTimeout(() => {
        const panel = document.querySelector('.unified-controls-panel');
        if (panel) {
          updatePositions();
        } else {
          // Panel still not open, retry
          setTimeout(() => updatePositions(), 200);
        }
      }, 400);
      return;
    }
    
    // Don't scroll for reports-section step - drawer is fixed on left side
    if (step.id === 'reports-section') {
      // Wait for drawer to be fully open before updating positions
      setTimeout(() => {
        const drawer = document.querySelector('.left-drawer');
        if (drawer && drawer.classList.contains('open')) {
          updatePositions();
        } else {
          // Drawer still not open, retry
          setTimeout(() => updatePositions(), 200);
        }
      }, 400);
      return;
    }
    
    // Don't scroll for save-progress step - drawer is fixed on left side
    if (step.id === 'save-progress') {
      // Wait for drawer to be fully open before updating positions
      setTimeout(() => {
        const drawer = document.querySelector('.left-drawer');
        if (drawer && drawer.classList.contains('open')) {
          updatePositions();
        } else {
          // Drawer still not open, retry
          setTimeout(() => updatePositions(), 200);
        }
      }, 400);
      return;
    }
    
    // Don't scroll for support-help step - drawer is fixed on left side
    if (step.id === 'support-help') {
      // Wait for drawer to be fully open before updating positions
      setTimeout(() => {
        const drawer = document.querySelector('.left-drawer');
        if (drawer && drawer.classList.contains('open')) {
          updatePositions();
        } else {
          // Drawer still not open, retry
          setTimeout(() => updatePositions(), 200);
        }
      }, 400);
      return;
    }

    const targetElement = document.querySelector(step.target);
    if (!targetElement) {
      // For data-dependent steps, wait and retry before scrolling
      const dataDependentSteps = ['data-table', 'visualization', 'segment-loyalists', 'segment-mercenaries', 'segment-hostages', 'segment-defectors'];
      if (dataDependentSteps.includes(step.id)) {
        let retryCount = 0;
        const maxRetries = 10;
        const retryInterval = 300;
        
        const retryScroll = () => {
          retryCount++;
          const retryElement = document.querySelector(step.target);
          if (retryElement) {
            // Found it! Now scroll
            scrollToTarget(step);
          } else if (retryCount < maxRetries) {
            setTimeout(retryScroll, retryInterval);
          }
        };
        
        setTimeout(retryScroll, retryInterval);
      }
      return;
    }

    const offset = step.scrollOffset || 120;
    const rect = targetElement.getBoundingClientRect();
    const elementTop = rect.top + window.pageYOffset;

    // Scroll to element with proper offset
    // For data-entry step, scroll less to keep tooltip visible below
    const scrollOffset = step.id === 'data-entry' ? 80 : offset;
    window.scrollTo({
      top: elementTop - scrollOffset,
      behavior: 'smooth'
    });

    // Wait for scroll to complete before updating positions
    setTimeout(() => {
      updatePositions();
      
      // For data-entry step, check if tooltip buttons are visible and scroll if needed
      if (step.id === 'data-entry') {
        requestAnimationFrame(() => {
          const tooltipElement = document.querySelector('.demo-tour-tooltip');
          if (tooltipElement) {
            const tooltipRect = tooltipElement.getBoundingClientRect();
            const viewportBottom = window.innerHeight;
            // If tooltip buttons are cut off, scroll to reveal them
            if (tooltipRect.bottom > viewportBottom - 10) {
              const scrollAmount = tooltipRect.bottom - viewportBottom + 20;
              window.scrollBy({
                top: scrollAmount,
                behavior: 'smooth'
              });
            }
          }
        });
      }
    }, 700);
  }, [updatePositions]);

  // Handle step changes
  useEffect(() => {
    if (!isOpen || currentStep >= steps.length) return;

    const step = steps[currentStep];
    
    // For chart-controls and brand-customisation steps, expand the controls if they're collapsed
    if (step.id === 'chart-controls' || step.id === 'brand-customisation') {
      const controlsHeader = document.querySelector('.chart-controls-header');
      const controlsContainer = document.querySelector('.chart-controls');
      if (controlsHeader && controlsContainer?.classList.contains('collapsed')) {
        // Click the header to expand
        (controlsHeader as HTMLElement).click();
        // Wait for expansion animation before scrolling
        setTimeout(() => {
          scrollToTarget(step);
        }, 350);
      } else {
        scrollToTarget(step);
      }
    } else if (step.id === 'filters') {
      // For filters step, open the filter panel with filters tab active
      const filterPanel = document.querySelector('.unified-controls-panel');
      
      if (!filterPanel) {
        // Panel is not open, dispatch the event to open it with filters tab
        const evt = new CustomEvent('open-unified-panel', { detail: { tab: 'filters' } });
        window.dispatchEvent(evt);
        // Wait for panel to open before scrolling
        setTimeout(() => {
          scrollToTarget(step);
        }, 300);
      } else {
        // Panel is already open, check if filters tab is active
        const exportTitle = filterPanel.querySelector('.unified-controls-title');
        if (exportTitle) {
          // Export tab is active, click filters tab to switch
          const filtersTab = filterPanel.querySelector('.unified-controls-tabs .unified-tab');
          if (filtersTab) {
            (filtersTab as HTMLElement).click();
            setTimeout(() => {
              scrollToTarget(step);
            }, 200);
          } else {
            scrollToTarget(step);
          }
        } else {
          // Filters tab should already be active
          scrollToTarget(step);
        }
      }
    } else if (step.id === 'reports-section' || step.id === 'save-progress' || step.id === 'support-help') {
      // For reports-section, save-progress, and support-help steps, open the left drawer if it's not already open
      const drawer = document.querySelector('.left-drawer');
      const drawerToggle = document.querySelector('.drawer-toggle');
      
      if (drawer && !drawer.classList.contains('open') && drawerToggle) {
        // Drawer is closed, click the toggle to open it
        (drawerToggle as HTMLElement).click();
        // Wait for drawer to open before expanding Reports section and calculating positions
        setTimeout(() => {
          // For reports-section step, expand the Reports section if it's not already expanded
          if (step.id === 'reports-section') {
            const reportsButton = Array.from(document.querySelectorAll('.section-navigation-item')).find(
              (btn) => btn.textContent?.includes('Reports')
            ) as HTMLElement;
            if (reportsButton) {
              const chevron = reportsButton.querySelector('.section-navigation-chevron');
              const isExpanded = chevron?.classList.contains('expanded');
              if (!isExpanded) {
                // Click to expand
                reportsButton.click();
                // Wait a bit for expansion animation
                setTimeout(() => {
                  scrollToTarget(step);
                }, 200);
                return;
              }
            }
          }
          scrollToTarget(step);
        }, 300);
      } else {
        // Drawer is already open, check if Reports section needs to be expanded
        if (step.id === 'reports-section') {
          const reportsButton = Array.from(document.querySelectorAll('.section-navigation-item')).find(
            (btn) => btn.textContent?.includes('Reports')
          ) as HTMLElement;
          if (reportsButton) {
            const chevron = reportsButton.querySelector('.section-navigation-chevron');
            const isExpanded = chevron?.classList.contains('expanded');
            if (!isExpanded) {
              // Click to expand
              reportsButton.click();
              // Wait a bit for expansion animation
              setTimeout(() => {
                scrollToTarget(step);
              }, 200);
              return;
            }
          }
        }
        scrollToTarget(step);
      }
    } else {
      scrollToTarget(step);
    }

    // Update positions after a short delay to ensure DOM is ready
    // Use a single timeout to prevent multiple rapid updates
    const timeoutId = setTimeout(() => {
      updatePositions();
    }, 700); // Slightly longer delay to ensure scroll completes

    // Debounce scroll/resize updates to prevent blinking
    let scrollTimeout: NodeJS.Timeout;
    let resizeTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => updatePositions(), 100);
    };
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => updatePositions(), 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(scrollTimeout);
      clearTimeout(resizeTimeout);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, currentStep, steps, scrollToTarget, updatePositions]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, steps, scrollToTarget, updatePositions]);

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && tooltipRef.current) {
      const focusableElement = tooltipRef.current.querySelector<HTMLElement>('button');
      if (focusableElement) {
        focusableElement.focus();
      }
    }
  }, [isOpen, currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
    // Mark tour as completed in session storage
    sessionStorage.setItem('demo-tour-completed', 'true');
  };

  const handleSkip = () => {
    handleClose();
  };

  if (!isOpen || steps.length === 0) return null;

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div
      ref={overlayRef}
      className="demo-tour-overlay"
      role="dialog"
      aria-labelledby={`tour-title-${step.id}`}
      aria-describedby={`tour-description-${step.id}`}
      aria-modal="false"
      aria-live="polite"
      onClick={(e) => {
        // Close on backdrop click (but not on tooltip click or spotlight area)
        if (e.target === overlayRef.current) {
          // Check if click is within spotlight area
          if (spotlightRect) {
            const clickX = (e as any).clientX;
            const clickY = (e as any).clientY;
            const isInSpotlight = 
              clickX >= spotlightRect.left &&
              clickX <= spotlightRect.right &&
              clickY >= spotlightRect.top &&
              clickY <= spotlightRect.bottom;
            
            // Don't close if clicking within spotlight (allows interaction)
            if (isInSpotlight) {
              return;
            }
          }
          handleClose();
        }
      }}
    >
      {/* Spotlight */}
      {spotlightRect && (
        <div
          ref={spotlightRef}
          className="demo-tour-spotlight"
          style={{
            top: `${spotlightRect.top}px`,
            left: `${spotlightRect.left}px`,
            width: `${spotlightRect.width}px`,
            height: `${spotlightRect.height}px`
          }}
        />
      )}

      {/* Visual Indicators for upload tabs */}
      {step.showIndicators && spotlightRect && step.id === 'data-entry' && <TabIndicators spotlightRect={spotlightRect} />}
      
      {/* Visual Indicators for quadrants */}
      {step.showIndicators && spotlightRect && step.id.startsWith('segment-') && (() => {
        const quadrantType = step.id.replace('segment-', '') as 'loyalists' | 'mercenaries' | 'hostages' | 'defectors';
        return <QuadrantIndicators spotlightRect={spotlightRect} quadrantType={quadrantType} />;
      })()}

      {/* Tooltip */}
      {tooltipPosition && (
        <div
          ref={tooltipRef}
          className="demo-tour-tooltip"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="demo-tour-tooltip-header">
            <div className="demo-tour-progress">
              Step {currentStep + 1} of {steps.length}
            </div>
            <button
              onClick={handleSkip}
              className="demo-tour-skip-button"
              aria-label="Skip tour"
              title="Skip tour (Esc)"
            >
              <X size={16} />
            </button>
          </div>

          <div className="demo-tour-tooltip-body">
            <h3
              id={`tour-title-${step.id}`}
              className="demo-tour-title"
            >
              {step.id.startsWith('segment-') && (() => {
                const quadrantType = step.id.replace('segment-', '') as 'loyalists' | 'mercenaries' | 'hostages' | 'defectors';
                const iconMap = {
                  loyalists: Heart,
                  mercenaries: BirdIcon,
                  hostages: Package,
                  defectors: LogOut
                };
                const Icon = iconMap[quadrantType];
                return (
                  <span className="demo-tour-title-icon">
                    <Icon size={20} />
                  </span>
                );
              })()}
              {step.title}
            </h3>
            <p
              id={`tour-description-${step.id}`}
              className="demo-tour-description"
              style={{ whiteSpace: 'pre-line' }}
            >
              {step.content}
            </p>
          </div>

          <div className="demo-tour-tooltip-actions">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="demo-tour-button demo-tour-button--secondary"
              aria-label="Previous step"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              onClick={handleNext}
              className="demo-tour-button demo-tour-button--primary"
              aria-label={isLastStep ? 'Finish tour' : 'Next step'}
            >
              {isLastStep ? 'Finish Tour' : 'Next'}
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Keyboard hints */}
          <div className="demo-tour-keyboard-hints" aria-hidden="true">
            <span>← → Navigate</span>
            <span>Esc Close</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoTour;

