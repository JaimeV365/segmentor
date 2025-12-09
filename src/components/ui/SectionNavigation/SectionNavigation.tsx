import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Table, 
  BarChart3, 
  FileBarChart,
  ChevronRight,
  ChevronDown,
  Database,
  TrendingUp,
  MapPin,
  Lightbulb,
  Activity,
  Star
} from 'lucide-react';
import './SectionNavigation.css';

interface NavigationSubItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  selector: string;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  selector: string; // CSS selector or ref identifier
  visible?: boolean;
  subItems?: NavigationSubItem[]; // Optional sub-sections
}

interface SectionNavigationProps {
  dataLength: number; // To conditionally show sections
}

export const SectionNavigation: React.FC<SectionNavigationProps> = ({ 
  dataLength 
}) => {
  const [activeSection, setActiveSection] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Check if Recommendation Score section exists
  const [hasRecommendationScore, setHasRecommendationScore] = useState(false);
  
  // Check if Response Concentration section is expanded
  const [isResponseConcentrationExpanded, setIsResponseConcentrationExpanded] = useState(false);
  
  useEffect(() => {
    // Check if Recommendation Score section exists in DOM
    const checkRecommendationScore = () => {
      const element = document.querySelector('[data-section-id="report-recommendation-score"]');
      setHasRecommendationScore(!!element);
    };
    
    // Check if Response Concentration section is expanded
    const checkResponseConcentrationExpanded = () => {
      const element = document.querySelector('[data-section-id="report-response-concentration"]');
      if (element) {
        // Check multiple ways: aria-expanded attribute, expanded class, or visible content
        const button = element.querySelector('.advanced-section-header');
        const hasExpandedClass = element.classList.contains('expanded');
        const content = element.querySelector('.advanced-section-content');
        const ariaExpanded = button?.getAttribute('aria-expanded') === 'true';
        const hasVisibleContent = !!content && content.getBoundingClientRect().height > 0;
        
        setIsResponseConcentrationExpanded(ariaExpanded || hasExpandedClass || hasVisibleContent);
      } else {
        setIsResponseConcentrationExpanded(false);
      }
    };
    
    checkRecommendationScore();
    checkResponseConcentrationExpanded();
    
    // Check periodically in case sections are added/removed or expanded/collapsed dynamically
    const interval = setInterval(() => {
      checkRecommendationScore();
      checkResponseConcentrationExpanded();
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  // Memoize navigation items based on dataLength, hasRecommendationScore, and isResponseConcentrationExpanded
  const navigationItems: NavigationItem[] = useMemo(() => {
    const reportSubItems: NavigationSubItem[] = [
      {
        id: 'report-data',
        label: 'Data Report',
        icon: <Database size={16} />,
        selector: '[data-section-id="report-data"]'
      }
    ];
    
    // Add Recommendation Score if it exists (after Data Report)
    if (hasRecommendationScore) {
      reportSubItems.push({
        id: 'report-recommendation-score',
        label: 'Recommendation Score',
        icon: <Star size={16} />,
        selector: '[data-section-id="report-recommendation-score"]'
      });
    }
    
    // Add Response Concentration only if expanded (after Recommendation Score)
    if (isResponseConcentrationExpanded) {
      reportSubItems.push({
        id: 'report-response-concentration',
        label: 'Response Concentration',
        icon: <Activity size={16} />,
        selector: '[data-section-id="report-response-concentration"]'
      });
    }
    
    // Add remaining items
    reportSubItems.push(
      {
        id: 'report-distribution',
        label: 'Segment Distribution',
        icon: <TrendingUp size={16} />,
        selector: '[data-section-id="report-distribution"]'
      },
      {
        id: 'report-proximity',
        label: 'Proximity Analysis',
        icon: <MapPin size={16} />,
        selector: '[data-section-id="report-proximity"]'
      },
      {
        id: 'report-actions',
        label: 'Actions Report',
        icon: <Lightbulb size={16} />,
        selector: '[data-section-id="report-actions"]'
      }
    );
    
    return [
      {
        id: 'data-entry',
        label: 'Data Entry',
        icon: <FileText size={18} />,
        selector: '.data-entry-section',
        visible: true
      },
      {
        id: 'data-table',
        label: 'Data Table',
        icon: <Table size={18} />,
        selector: '.data-table-section',
        visible: dataLength > 0
      },
      {
        id: 'main-chart',
        label: 'Main Chart',
        icon: <BarChart3 size={18} />,
        selector: '.visualization-section',
        visible: dataLength > 0
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: <FileBarChart size={18} />,
        selector: '.reporting-section',
        visible: dataLength > 0,
        subItems: reportSubItems
      }
    ];
  }, [dataLength, hasRecommendationScore, isResponseConcentrationExpanded]);

  // Optional: Scroll tracking with Intersection Observer
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-10% 0px -60% 0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute('data-section-id');
          if (sectionId) {
            setActiveSection(sectionId);
            // If it's a sub-item, also expand the parent section
            const parentItem = navigationItems.find(item => 
              item.subItems?.some(sub => sub.id === sectionId)
            );
            if (parentItem && !expandedSections.has(parentItem.id)) {
              setExpandedSections(prev => new Set(prev).add(parentItem.id));
            }
          }
        }
      });
    }, observerOptions);

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      // Observe all main sections and sub-sections
      navigationItems.forEach(item => {
        // Observe main section
        const element = document.querySelector(item.selector);
        if (element && item.visible) {
          // Ensure data-section-id is set (in case it wasn't set in App.tsx)
          if (!element.getAttribute('data-section-id')) {
            element.setAttribute('data-section-id', item.id);
          }
          observer.observe(element);
        }
        
        // Observe sub-sections
        item.subItems?.forEach(subItem => {
          const subElement = document.querySelector(subItem.selector);
          if (subElement) {
            observer.observe(subElement);
          }
        });
      });
    }, 100);

    // Listen for manual section updates (e.g., when Actions Report generation starts)
    const handleUpdateActiveSection = (event: CustomEvent) => {
      const sectionId = event.detail?.sectionId;
      if (sectionId) {
        setActiveSection(sectionId);
        // If it's a sub-item, also expand the parent section
        const parentItem = navigationItems.find(item => 
          item.subItems?.some(sub => sub.id === sectionId)
        );
        if (parentItem && !expandedSections.has(parentItem.id)) {
          setExpandedSections(prev => new Set(prev).add(parentItem.id));
        }
      }
    };

    document.addEventListener('update-active-section', handleUpdateActiveSection as EventListener);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      document.removeEventListener('update-active-section', handleUpdateActiveSection as EventListener);
    };
  }, [dataLength, navigationItems, expandedSections]);

  const handleNavigation = (item: NavigationItem | NavigationSubItem) => {
    const element = document.querySelector(item.selector);
    if (element) {
      let scrollTarget: Element | null = null;
      let offset = 80; // Offset for fixed headers/navigation
      
      // Find the appropriate title element to scroll to for each section
      if (item.id === 'report-data') {
        scrollTarget = element.querySelector('.report-title-wrapper') || element.querySelector('.report-title') || element;
      } else if (item.id === 'report-response-concentration') {
        // Scroll to the advanced section header (which has the title)
        scrollTarget = element.querySelector('#response-concentration-title') || element.querySelector('.advanced-section-header');
      } else if (item.id === 'report-distribution') {
        scrollTarget = element.querySelector('.distribution-title') || element.querySelector('h2') || element;
      } else if (item.id === 'report-proximity') {
        scrollTarget = element.querySelector('.proximity-title') || element.querySelector('.proximity-header h3') || element;
      } else if (item.id === 'report-actions') {
        scrollTarget = element.querySelector('.report-title-wrapper') || element.querySelector('.report-title') || element.querySelector('h3') || element;
        offset = 100; // Offset from top to show Actions Report title clearly
      } else if (item.id === 'report-recommendation-score') {
        scrollTarget = element.querySelector('.recommendation-score-header') || element.querySelector('.report-section-title') || element;
      }
      
      // Default fallback
      if (!scrollTarget) {
        scrollTarget = element;
      }
      
      // Scroll to the target with proper offset
      if (scrollTarget) {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        const elementTop = scrollTarget.getBoundingClientRect().top + currentScroll;
        
        window.scrollTo({
          top: elementTop - offset,
          behavior: 'smooth'
        });
      } else {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
      
      // Update active section after scroll
      setTimeout(() => {
        setActiveSection(item.id);
      }, 300);
    }
  };

  const handleSectionClick = (item: NavigationItem, event: React.MouseEvent) => {
    // If item has sub-items, toggle expansion
    if (item.subItems && item.subItems.length > 0) {
      event.stopPropagation();
      setExpandedSections(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item.id)) {
          newSet.delete(item.id);
        } else {
          newSet.add(item.id);
        }
        return newSet;
      });
    } else {
      // No sub-items, navigate directly
      handleNavigation(item);
    }
  };

  const handleSubItemClick = (subItem: NavigationSubItem, parentItem: NavigationItem, event: React.MouseEvent) => {
    event.stopPropagation();
    handleNavigation(subItem);
  };

  const visibleItems = navigationItems.filter(item => item.visible);

  if (visibleItems.length === 0) return null;

  return (
    <div className="section-navigation">
      <div className="section-navigation-header">
        <h4 className="section-navigation-title">Quick Navigation</h4>
      </div>
      
      <nav className="section-navigation-list">
        {visibleItems.map((item) => {
          const isExpanded = expandedSections.has(item.id);
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isActive = activeSection === item.id || 
            (hasSubItems && item.subItems?.some(sub => activeSection === sub.id));

          return (
            <div key={item.id} className="section-navigation-group">
              <button
                className={`section-navigation-item ${
                  isActive ? 'active' : ''
                } ${hasSubItems ? 'has-subitems' : ''}`}
                onClick={(e) => handleSectionClick(item, e)}
                title={`Jump to ${item.label}`}
                type="button"
              >
                <span className="section-navigation-icon">
                  {item.icon}
                </span>
                <span className="section-navigation-label">{item.label}</span>
                {hasSubItems ? (
                  <ChevronDown 
                    size={16} 
                    className={`section-navigation-chevron ${isExpanded ? 'expanded' : ''}`}
                  />
                ) : (
                  <ChevronRight 
                    size={16} 
                    className="section-navigation-chevron" 
                  />
                )}
              </button>
              
              {/* Sub-items */}
              {hasSubItems && isExpanded && item.subItems && (
                <div className="section-navigation-sublist">
                  {item.subItems.map((subItem) => {
                    const isSubActive = activeSection === subItem.id;
                    return (
                      <button
                        key={subItem.id}
                        className={`section-navigation-subitem ${
                          isSubActive ? 'active' : ''
                        }`}
                        onClick={(e) => handleSubItemClick(subItem, item, e)}
                        title={`Jump to ${subItem.label}`}
                        type="button"
                      >
                        <span className="section-navigation-subicon">
                          {subItem.icon}
                        </span>
                        <span className="section-navigation-sublabel">{subItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

export default SectionNavigation;

