import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, Download, X } from 'lucide-react';
import type { ActionsReport as ActionsReportType } from '../../types';
import type { ActionPlanReport, ChartImage, Finding } from './types';
import { captureChartAsImage } from './imageCapture/chartImageCapture';
import { exportActionPlanToPDF, exportActionPlanToPPTX, exportActionPlanToXLSX } from './export/actionPlanExporter';
import { UnifiedLoadingPopup } from '../../../ui/UnifiedLoadingPopup';
import { DisclaimerContent } from './disclaimerContent';
import { EditableText } from './EditableText';
import { useAxisLabels } from '../../../visualization/context/AxisLabelsContext';
import '../../../visualization/controls/UnifiedChartControls.css';
import './ActionsReport.css';

// Helper function to map chart selectors to human-readable section names
function getSectionNameFromSelector(selector: string): string {
  if (selector.includes('chart-container') || selector === '.chart-container') {
    return 'Main Visualisation';
  }
  if (selector.includes('report-distribution') || selector.includes('quadrant-grid')) {
    return 'Distribution';
  }
  if (selector.includes('report-historical-progress') || selector.includes('movement-diagram')) {
    return 'Historical Progress';
  }
  if (selector.includes('report-response-concentration') || selector.includes('concentration')) {
    return 'Response Concentration';
  }
  if (selector.includes('report-proximity') || selector.includes('proximity')) {
    if (selector.includes('actionable-conversions')) {
      return 'Actionable Conversions';
    }
    return 'Proximity Analysis';
  }
  if (selector.includes('recommendation-score') || selector.includes('recommendation')) {
    if (selector.includes('simulator')) {
      return 'Recommendation Score Simulator';
    }
    return 'Recommendation Score';
  }
  // Fallback: return the selector itself (cleaned up)
  return selector.replace(/[\[\].#]/g, '').replace(/-/g, ' ');
}

interface ActionsReportProps {
  report: ActionsReportType | null;
  onCustomize: (reportType: 'actions') => void;
  onExport: (reportType: 'actions') => void;
  onShare: (reportType: 'actions') => void;
  onGenerateActionPlan?: () => Promise<void>;
  isPremium?: boolean;
}

export const ActionsReport: React.FC<ActionsReportProps> = ({
  report,
  onCustomize,
  onExport,
  onShare,
  onGenerateActionPlan,
  isPremium = false
}) => {
  // Hooks must be called before any early returns
  const { labels } = useAxisLabels();
  const [capturedCharts, setCapturedCharts] = useState<Map<string, ChartImage>>(new Map());
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showPDFCustomizeOptions, setShowPDFCustomizeOptions] = useState(false);
  // PDF Export options - try to load from localStorage
  const [pdfFontFamily, setPdfFontFamily] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('actionReportsPdfExportOptions');
      if (saved) {
        const options = JSON.parse(saved);
        return options.fontFamily || 'lato';
      }
    } catch (e) {
      console.warn('Failed to load PDF export options from localStorage:', e);
    }
    return 'lato';
  });
  const [pdfShowImageWatermarks, setPdfShowImageWatermarks] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('actionReportsPdfExportOptions');
      if (saved) {
        const options = JSON.parse(saved);
        return options.showImageWatermarks !== undefined ? options.showImageWatermarks : false;
      }
    } catch (e) {
      console.warn('Failed to load PDF export options from localStorage:', e);
    }
    return false;
  });
  const [pdfShowPageWatermarks, setPdfShowPageWatermarks] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('actionReportsPdfExportOptions');
      if (saved) {
        const options = JSON.parse(saved);
        return options.showPageWatermarks !== undefined ? options.showPageWatermarks : true;
      }
    } catch (e) {
      console.warn('Failed to load PDF export options from localStorage:', e);
    }
    return true;
  });
  const [pdfHeaderLogoSize, setPdfHeaderLogoSize] = useState<'large' | 'medium' | 'small'>(() => {
    try {
      const saved = localStorage.getItem('actionReportsPdfExportOptions');
      if (saved) {
        const options = JSON.parse(saved);
        if (options.headerLogoSize) return options.headerLogoSize;
      }
    } catch (e) { /* ignore */ }
    return 'large';
  });
  const [pdfConsultantName, setPdfConsultantName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('actionReportsPdfExportOptions');
      if (saved) {
        const options = JSON.parse(saved);
        return options.consultantName || '';
      }
    } catch (e) { /* ignore */ }
    return '';
  });
  
  // Persist PDF export options to localStorage when they change
  useEffect(() => {
    localStorage.setItem('actionReportsPdfExportOptions', JSON.stringify({
      fontFamily: pdfFontFamily,
      showImageWatermarks: pdfShowImageWatermarks,
      showPageWatermarks: pdfShowPageWatermarks,
      headerLogoSize: pdfHeaderLogoSize,
      consultantName: pdfConsultantName
    }));
  }, [pdfFontFamily, pdfShowImageWatermarks, pdfShowPageWatermarks, pdfHeaderLogoSize, pdfConsultantName]);
  const [selectedExportOption, setSelectedExportOption] = useState<string | null>(null);
  const exportPanelRef = useRef<HTMLDivElement>(null);
  const calculationStartTime = React.useRef<number>(0);
  
  // Section collapse state - try to load from localStorage
  const [expandedSections, setExpandedSections] = useState<{
    findings: boolean;
    opportunitiesRisks: boolean;
    actions: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('actionReportsExpandedSections');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load Action Reports expanded sections from localStorage:', e);
    }
    return {
      findings: false,
      opportunitiesRisks: false,
      actions: false
    };
  });
  
  // Persist section collapse state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('actionReportsExpandedSections', JSON.stringify(expandedSections));
  }, [expandedSections]);
  
  const toggleSection = (section: 'findings' | 'opportunitiesRisks' | 'actions') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const actionPlanBase = report?.actionPlan as ActionPlanReport | undefined;
  const [actionPlan, setActionPlan] = useState<ActionPlanReport | null>(actionPlanBase || null);
  
  // Helper function to clear all editable-text localStorage items
  const clearEditableTextStorage = useCallback(() => {
    // Clear all localStorage items that start with 'editable-text-'
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('editable-text-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }, []);
  
  // Clear localStorage on component mount to reset edits on page refresh
  useEffect(() => {
    clearEditableTextStorage();
  }, [clearEditableTextStorage]);

  // Close export panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportPanelRef.current && !exportPanelRef.current.contains(event.target as Node)) {
        setShowExportPanel(false);
      }
    };

    if (showExportPanel) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showExportPanel]);
  
  // Initialize actionPlan from report when it changes
  // Always reset to actionPlanBase to ensure we get fresh data (no corrupted state)
  useEffect(() => {
    if (actionPlanBase) {
      // Check if this is a new action plan (different date)
      const previousDate = actionPlan?.date;
      const newDate = actionPlanBase.date;
      
      // If dates are different, clear localStorage to reset all edits
      if (previousDate && previousDate !== newDate) {
        clearEditableTextStorage();
      }
      
      // Always create a deep copy to ensure we're using the fresh data from the report
      // This prevents any local state modifications from persisting
      const freshActionPlan: ActionPlanReport = {
        ...actionPlanBase,
        findings: [...actionPlanBase.findings],
        opportunities: [...actionPlanBase.opportunities],
        risks: [...actionPlanBase.risks],
        actions: [...actionPlanBase.actions],
        supportingImages: actionPlanBase.supportingImages ? [...actionPlanBase.supportingImages] : []
      };
      
      // Debug logging
      console.log('[ActionsReport] Setting fresh action plan:', {
        opportunities: freshActionPlan.opportunities.length,
        risks: freshActionPlan.risks.length,
        findings: freshActionPlan.findings.length,
        actions: freshActionPlan.actions.length
      });
      
      setActionPlan(freshActionPlan);
    }
  }, [actionPlanBase, actionPlan?.date, clearEditableTextStorage]);

  // Scroll to Actions Report after content is fully rendered
  // This waits for actionPlan to be set AND for all sections to be rendered in the DOM
  useEffect(() => {
    if (actionPlan && !isGenerating) {
      // Wait for DOM to fully render all sections (Findings, Opportunities & Risks, Actions)
      // Use multiple requestAnimationFrame calls to ensure all content is rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            const actionsSection = document.querySelector('[data-section-id="report-actions"]');
            if (actionsSection) {
              // Use the exact same scroll target selection as drawer navigation
              const scrollTarget = actionsSection.querySelector('.report-title-wrapper') || 
                                  actionsSection.querySelector('.report-title') || 
                                  actionsSection.querySelector('h3') || 
                                  actionsSection;
              if (scrollTarget) {
                // Use the exact same scroll logic as drawer navigation (which works correctly)
                const offset = 100; // Same offset as drawer navigation
                const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
                const elementTop = scrollTarget.getBoundingClientRect().top + currentScroll;
                
                window.scrollTo({
                  top: elementTop - offset,
                  behavior: 'smooth'
                });
              }
            }
          }, 300); // Small delay to ensure all sections are rendered
        });
      });
    }
  }, [actionPlan, isGenerating]);

  // Check if sections are visible
  const [missingSections, setMissingSections] = useState<string[]>([]);
  
  useEffect(() => {
    const sections: string[] = [];
    const concentrationSection = document.querySelector('[data-section-id="report-response-concentration"]');
    const concentrationExpanded = concentrationSection?.classList.contains('expanded') || 
                                  concentrationSection?.querySelector('[aria-expanded="true"]');
    if (!concentrationExpanded) {
      sections.push('Response Concentration');
    }
    
    const recommendationSection = document.querySelector('#recommendation-score-section, [data-section-id="report-recommendation-score"]');
    if (!recommendationSection) {
      sections.push('Recommendation Score');
    }
    
    setMissingSections(sections);
  }, [report]);

  // Helper to find chart image by selector
  const getChartImage = useCallback((selector: string | undefined): ChartImage | undefined => {
    if (!selector) return undefined;
    // First check captured charts (on-demand)
    if (capturedCharts.has(selector)) {
      return capturedCharts.get(selector);
    }
    // Then check supportingImages from action plan
    if (actionPlan?.supportingImages) {
      return actionPlan.supportingImages.find(img => img.selector === selector);
    }
    return undefined;
  }, [capturedCharts, actionPlan]);

  // Handle Accept button click
  const handleAccept = useCallback(async () => {
    if (!onGenerateActionPlan) return;
    
    // Ensure disclaimer modal is closed
    setShowDisclaimerModal(false);
    
    // Clear all editable text storage before regenerating
    clearEditableTextStorage();
    
    // Reset actionPlan state to null to force a fresh load when report regenerates
    setActionPlan(null);
    
    // Set loading state IMMEDIATELY (synchronously) - this triggers immediate UI update
    setIsGenerating(true);
    calculationStartTime.current = Date.now();
    setIsAccepted(true);
    
    // Don't scroll here - let the useEffect handle it after actionPlan is set and content is rendered
    // Just trigger navigation update
    requestAnimationFrame(() => {
      const navUpdateEvent = new CustomEvent('update-active-section', { 
        detail: { sectionId: 'report-actions' } 
      });
      document.dispatchEvent(navUpdateEvent);
    });
    
    // Use setTimeout (like midpoint) to ensure popup renders before heavy work starts
    setTimeout(async () => {
      try {
        await onGenerateActionPlan();
        
        // Ensure loading shows for at least 1 second
        const elapsedTime = Date.now() - calculationStartTime.current;
        const remainingTime = Math.max(0, 1000 - elapsedTime);
        
        setTimeout(() => {
          setIsGenerating(false);
        }, remainingTime);
      } catch (error) {
        console.error('Failed to generate actions report:', error);
        setIsGenerating(false);
        setIsAccepted(false);
      }
    }, 50); // Same delay as midpoint movement - ensures popup renders first
  }, [onGenerateActionPlan, clearEditableTextStorage]);

  // Handle Regenerate button click - regenerate directly since user already accepted
  const handleRegenerate = useCallback(async () => {
    if (!onGenerateActionPlan) return;
    
    // Ensure disclaimer modal is closed
    setShowDisclaimerModal(false);
    
    // Clear captured charts so they'll be recaptured with new data
    setCapturedCharts(new Map());
    
    // Clear all editable text storage before regenerating
    clearEditableTextStorage();
    
    // Reset actionPlan state to null to force a fresh load when report regenerates
    setActionPlan(null);
    
    // Set loading state IMMEDIATELY (synchronously) - this triggers immediate UI update
    setIsGenerating(true);
    calculationStartTime.current = Date.now();
    
    // Don't scroll here - let the useEffect handle it after actionPlan is set and content is rendered
    // Just trigger navigation update
    requestAnimationFrame(() => {
      const navUpdateEvent = new CustomEvent('update-active-section', { 
        detail: { sectionId: 'report-actions' } 
      });
      document.dispatchEvent(navUpdateEvent);
    });
    
    // Use setTimeout (like midpoint) to ensure popup renders before heavy work starts
    setTimeout(async () => {
      try {
        await onGenerateActionPlan();
        
        // Ensure loading shows for at least 1 second
        const elapsedTime = Date.now() - calculationStartTime.current;
        const remainingTime = Math.max(0, 1000 - elapsedTime);
        
        setTimeout(() => {
          setIsGenerating(false);
        }, remainingTime);
      } catch (error) {
        console.error('Failed to regenerate actions report:', error);
        setIsGenerating(false);
      }
    }, 50); // Same delay as midpoint movement - ensures popup renders first
  }, [onGenerateActionPlan, clearEditableTextStorage]);

  // Capture chart on demand
  const handleCaptureChart = useCallback(async (selector: string, caption: string) => {
    setIsCapturing(true);
    try {
      console.log('📸 Attempting to capture chart with selector:', selector);
      // Always hide watermark when capturing main chart (watermark added correctly in export)
      const isMainChart = selector.includes('chart-container') || selector === '.chart-container';
      const hideWatermark = isMainChart; // Always hide for main chart - watermark added in export
      const chartImage = await captureChartAsImage(selector, caption, { hideWatermark });
      if (chartImage) {
        console.log('✅ Chart captured successfully:', chartImage.id);
        setCapturedCharts(prev => {
          const newMap = new Map(prev);
          newMap.set(selector, chartImage);
          return newMap;
        });
        // Also update the action plan's supportingImages if it exists
        if (actionPlan?.supportingImages) {
          const existingIndex = actionPlan.supportingImages.findIndex(img => img.selector === selector);
          if (existingIndex >= 0) {
            actionPlan.supportingImages[existingIndex] = chartImage;
          } else {
            actionPlan.supportingImages.push(chartImage);
          }
        }
      } else {
        console.warn('⚠️ Chart capture returned null for selector:', selector);
        // Map selector to human-readable section name
        const sectionName = getSectionNameFromSelector(selector);
        alert(`Could not capture the ${sectionName} chart. Please ensure the section is expanded and visible.`);
      }
    } catch (error) {
      console.error('❌ Failed to capture chart:', error);
      alert('Failed to capture chart. Please check the console for details.');
    } finally {
      setIsCapturing(false);
    }
  }, [actionPlan]);

  // Export handlers with loading modal
  const handleExportPDF = useCallback(async () => {
    if (!actionPlan) return;
    setIsExporting(true);
    setSelectedExportOption('pdf');
    try {
      await exportActionPlanToPDF(actionPlan, {
        fontFamily: pdfFontFamily as 'montserrat' | 'lato' | 'arial' | 'helvetica' | 'times',
        showImageWatermarks: pdfShowImageWatermarks,
        showPageWatermarks: pdfShowPageWatermarks,
        axisLabels: labels,
        isTMStaff: isPremium,
        headerLogoSize: pdfHeaderLogoSize,
        consultantName: pdfConsultantName.trim()
      });
      setShowExportPanel(false);
      setShowPDFCustomizeOptions(false);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
      setSelectedExportOption(null);
    }
  }, [actionPlan, pdfFontFamily, pdfShowImageWatermarks, pdfShowPageWatermarks]);

  const handleExportPPTX = useCallback(async () => {
    if (!actionPlan) return;
    setIsExporting(true);
    try {
      await exportActionPlanToPPTX(actionPlan);
    } catch (error) {
      console.error('Failed to export PPTX:', error);
      alert('Failed to export PPTX. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [actionPlan]);

  const handleExportXLSX = useCallback(async () => {
    if (!actionPlan) return;
    setIsExporting(true);
    try {
      // Try to get raw data and quadrant function from report if available
      // The report may have been extended with these properties
      const rawData = (report as any)?.data?.filter((d: any) => !d.excluded);
      const computeSegment = (report as any)?.getQuadrantForPoint;
      
      console.log('[ActionsReport] Exporting to XLSX:', {
        hasActionPlan: !!actionPlan,
        hasRawData: !!rawData,
        rawDataLength: rawData?.length || 0,
        hasComputeSegment: !!computeSegment
      });
      
      await exportActionPlanToXLSX(actionPlan, rawData, computeSegment);
    } catch (error) {
      console.error('Failed to export XLSX:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [actionPlan, report]);

  // Extract modal JSX - MUST be available in all return paths
  // This ensures the modal portal is rendered regardless of which return path the component takes
  const disclaimerModalJSX = showDisclaimerModal && typeof document !== 'undefined' ? createPortal(
    <div className="disclaimer-modal-overlay" onClick={() => setShowDisclaimerModal(false)}>
      <div className="disclaimer-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="disclaimer-modal-header">
          <h3>Report Disclaimer & Limitation of Liability</h3>
          <button 
            className="disclaimer-modal-close"
            onClick={() => setShowDisclaimerModal(false)}
            aria-label="Close disclaimer"
          >
            ×
          </button>
        </div>
        <div className="disclaimer-modal-body">
          <DisclaimerContent />
        </div>
        <div className="disclaimer-modal-footer">
          <button 
            className="disclaimer-modal-close-button"
            onClick={() => setShowDisclaimerModal(false)}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  // Show loading popup
  if (isGenerating) {
    return (
      <>
        {disclaimerModalJSX}
        <UnifiedLoadingPopup isVisible={true} text="segmenting" size="medium" />
        <div className="report-card action-plan-container" data-section-id="report-actions" style={{ minHeight: '400px' }}>
          <div className="report-title-wrapper">
            <h3 className="report-title">Actions Report</h3>
          </div>
          {/* Spacer to ensure section is tall enough for intersection observer to detect */}
          <div style={{ height: '300px' }} aria-hidden="true" />
        </div>
      </>
    );
  }

  // Show info box and accept button if not accepted or no report
  if (!isAccepted || !report || !actionPlan || (!actionPlan.findings.length && !actionPlan.opportunities.length && !actionPlan.risks.length && !actionPlan.actions.length)) {
    return (
      <>
        {disclaimerModalJSX}
        <div className="report-card action-plan-container" data-section-id="report-actions">
        <div className="report-title-wrapper">
          <h3 className="report-title">Actions Report</h3>
        </div>

        {/* Information Box - using InfoRibbon style */}
        <div className="info-ribbon action-plan-info-ribbon">
          <div className="info-ribbon-content">
            <p className="info-text">
              <strong>About This Report</strong>
              <br /><br />
              {isAccepted ? (
                <>
                  You have accepted the terms and this Actions Report has been generated based on the <strong>currently visible and enabled sections</strong> in your reports, 
                  using the <strong>active filters and settings</strong> you had configured at the time of generation. If you want to see different insights or 
                  focus on specific aspects, you can adjust the settings in the Data Report, Response Concentration, Distribution, 
                  and Proximity Analysis sections and generate a new report.
                </>
              ) : (
                <>
                  This Actions Report will be generated based on the <strong>currently visible and enabled sections</strong> in your reports, 
                  using the <strong>active filters and settings</strong> you have configured.
                  <br /><br />
                  If you want different insights, simply adjust the settings in the sections above before generating.
                </>
              )}
              {missingSections.length > 0 && (
                <>
                  <br /><br />
                  <strong>Note:</strong> The following sections are currently disabled and {isAccepted ? 'were not included' : 'will not appear'} in this report: 
                  <strong> {missingSections.join(' and ')}</strong>.
                  <br />
                  Enable them above if you wish to include them.
                </>
              )}
              <br /><br />
              <div className="disclaimer-warning-box">
                <p className="disclaimer-warning-text">
                  <strong>Important:</strong> This report is generated automatically by <span translate="no">segmentor.app</span>. It is for general guidance only, may contain errors, and is NOT professional advice. You must independently verify everything before relying on it.
                </p>
                {!isAccepted && (
                  <p className="disclaimer-acceptance-text">
                    By clicking "Accept & Generate Action Report" you confirm you have read and fully accept our binding{' '}
                    <button
                      type="button"
                      className="disclaimer-link"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Only open modal when this specific link is clicked
                        setShowDisclaimerModal(true);
                      }}
                    >
                      Report Disclaimer & Limitation of Liability
                    </button>.
                  </p>
                )}
              </div>
            </p>
          </div>
        </div>

        {/* Accept Button */}
        <div className="action-plan-accept-section">
          <button 
            type="button"
            onClick={handleAccept}
            disabled={!onGenerateActionPlan || isGenerating}
            className="accept-button"
          >
            Accept & Generate Action Report
          </button>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      {disclaimerModalJSX}

      <div className="report-card action-plan-container" data-section-id="report-actions">
        <div className="report-title-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="report-title">Actions Report</h3>
          {actionPlan && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowExportPanel(!showExportPanel);
              }}
              disabled={isExporting}
              className={`chart-controls-filter-button ${showExportPanel ? 'active' : ''}`}
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: showExportPanel ? '#3a863e' : 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease',
                color: showExportPanel ? 'white' : '#3a863e',
                opacity: isExporting ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isExporting) {
                  e.currentTarget.style.backgroundColor = showExportPanel ? '#34753a' : '#f9fafb';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }
              }}
              onMouseLeave={(e) => {
                if (!isExporting) {
                  e.currentTarget.style.backgroundColor = showExportPanel ? '#3a863e' : 'white';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }
              }}
              aria-label="Export options"
              title="Export options"
            >
              <Download size={16} />
            </button>
          )}
        </div>

        {/* Simplified Info Box - shown after report is generated */}
        <div className="info-ribbon action-plan-info-ribbon">
          <div className="info-ribbon-content">
            <p className="info-text">
              <strong>About This Report</strong>
              <br /><br />
              This Actions Report has been generated based on the <strong>currently visible and enabled sections</strong> in your reports, 
              using the <strong>active filters and settings</strong> you had configured at the time of generation.
              {missingSections.length > 0 && (
                <>
                  <br /><br />
                  <strong>Note:</strong> The following sections were not visible or enabled when this report was generated and were not included: 
                  <strong> {missingSections.join(' and ')}</strong>. To include them, expand or enable these sections above and click "Regenerate Report" below.
                </>
              )}
              <div style={{ textAlign: 'right', marginTop: '12px' }}>
                <button
                  onClick={handleRegenerate}
                  className="regenerate-report-button"
                  type="button"
                  disabled={isGenerating || !onGenerateActionPlan}
                >
                  {isGenerating ? 'Regenerating...' : 'Regenerate Report'}
                </button>
              </div>
            </p>
          </div>
        </div>

      <div className="report-content action-plan-content">
        {/* Findings Section */}
        {actionPlan.findings.length > 0 && (
          <section className="action-plan-section findings-section">
            <div 
              className="section-header-container"
              onClick={() => toggleSection('findings')}
            >
              <div className="section-header-content">
                <h3 className="section-title collapsible-section-title">
                  <span>Findings</span>
                  <span className="section-count">({actionPlan.findings.length})</span>
                </h3>
                <p className="section-description-preview">
                  Key observations and facts from the analysis of your customer data.
                </p>
              </div>
              <span className="collapse-icon">{expandedSections.findings ? '▼' : '▶'}</span>
            </div>
            {expandedSections.findings && (
              <div className="section-content-container">
                <div className="findings-list">
              {(() => {
                // Track current category for section titles
                let currentCategory: string | null = null;
                const getSectionTitle = (category: string): string => {
                  const titles: Record<string, string> = {
                    'data': 'Data Overview',
                    'concentration': 'Response Concentration',
                    'distribution': 'Customer Distribution',
                    'historical': 'Historical Progress',
                    'proximity': 'Proximity Analysis',
                    'recommendation': 'Recommendation Score'
                  };
                  return titles[category] || category.charAt(0).toUpperCase() + category.slice(1);
                };
                
                // Filter findings based on section visibility
                const visibleFindings = actionPlan.findings.filter(finding => {
                  // Hide Response Concentration findings if section is hidden
                  if (finding.category === 'concentration') {
                    const concentrationSection = document.querySelector('[data-section-id="report-response-concentration"]');
                    const concentrationExpanded = concentrationSection?.classList.contains('expanded') || 
                                                  concentrationSection?.querySelector('[aria-expanded="true"]');
                    return !!concentrationExpanded;
                  }
                  // Hide Recommendation Score findings if section is hidden
                  if (finding.category === 'recommendation') {
                    const recommendationSection = document.querySelector('#recommendation-score-section, [data-section-id="report-recommendation-score"]');
                    if (!recommendationSection) return false;
                    
                    // Hide simulator finding unless we have an actual captured image for it
                    // The simulator is optional - only show if user has used it AND we captured an image
                    if (finding.id === 'chart-recommendation-simulator') {
                      const hasImage = actionPlan.supportingImages?.some(img => img.selector === finding.chartSelector);
                      // Only show if we have an image - no image means don't show this finding
                      return !!hasImage;
                    }
                    return true;
                  }
                  // Show all other findings
                  return true;
                });
                
                return visibleFindings.map((finding, visibleIndex) => {
                  // Find the actual index in the full findings array
                  const actualIndex = actionPlan.findings.findIndex(f => f.id === finding.id);
                  
                  // Add section title if category changed
                  const sectionTitle = finding.category && finding.category !== currentCategory ? (
                    (() => {
                      currentCategory = finding.category;
                      return (
                        <div key={`section-title-${finding.category}`} className="findings-section-title">
                          <h4>{getSectionTitle(finding.category)}</h4>
                        </div>
                      );
                    })()
                  ) : null;
                  
                  const findingElement = (() => {
                    // Chart finding - show chart with commentary
                    if (finding.isChartItem && finding.chartSelector) {
                      // Skip proximity chart if proximity analysis is unavailable
                      if (finding.id === 'chart-proximity' || finding.id === 'chart-proximity-actionable-conversions') {
                        // Check if proximity section shows unavailable message
                        const proximitySection = document.querySelector('[data-section-id="report-proximity"]');
                        const isUnavailable = proximitySection?.querySelector('.proximity-unavailable');
                        if (isUnavailable) {
                          // Don't render anything if proximity analysis is unavailable
                          return null;
                        }
                      }
                      
                  const chartImage = getChartImage(finding.chartSelector);
                  // Debug logging for actionable conversions
                  if (finding.id === 'chart-proximity-actionable-conversions') {
                    console.log('🔍 Actionable Conversions Chart Finding:', {
                      id: finding.id,
                      selector: finding.chartSelector,
                      hasChartImage: !!chartImage,
                      chartImageId: chartImage?.id,
                      capturedChartsSize: capturedCharts.size,
                      actionPlanSupportingImages: actionPlan?.supportingImages?.length || 0
                    });
                  }
                  return (
                    <div key={finding.id} className="finding-item chart-finding-item">
                      {chartImage ? (
                        <div className="chart-finding-content">
                          <div className="chart-image-container">
                            {isPremium && (
                              <button
                                type="button"
                                className="chart-image-delete-button"
                                onClick={() => {
                                  // Remove only the image, keep the text commentary
                                  if (finding.chartSelector) {
                                    // Remove from captured charts
                                    setCapturedCharts(prev => {
                                      const updated = new Map(prev);
                                      updated.delete(finding.chartSelector!);
                                      return updated;
                                    });
                                    
                                    // Remove from action plan's supporting images
                                    if (actionPlan) {
                                      const updatedSupportingImages = actionPlan.supportingImages.filter(
                                        img => img.selector !== finding.chartSelector
                                      );
                                      setActionPlan({
                                        ...actionPlan,
                                        supportingImages: updatedSupportingImages
                                      });
                                    }
                                  }
                                }}
                                title="Delete image"
                                aria-label="Delete image"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            <img 
                              src={chartImage.dataUrl} 
                              alt={chartImage.caption}
                              className="chart-image"
                            />
                          </div>
                          <div className="chart-commentary">
                            <EditableText
                              content={finding.chartCommentary || finding.statement}
                              id={`chart-commentary-captured-${finding.id}`}
                              isPremium={isPremium}
                              onSave={(id, content) => {
                                console.log('Saved chart commentary (captured):', id, content);
                              }}
                              onDelete={(id) => {
                                // Clear the commentary text but keep the image
                                if (actionPlan) {
                                  const updatedFindings = actionPlan.findings.map(f => {
                                    if (f.id === finding.id) {
                                      return {
                                        ...f,
                                        chartCommentary: '',
                                        statement: ''
                                      };
                                    }
                                    return f;
                                  });
                                  setActionPlan({
                                    ...actionPlan,
                                    findings: updatedFindings
                                  });
                                }
                              }}
                              className="chart-commentary-text"
                              tag="p"
                            />
                            {/* Category badge removed */}
                          </div>
                        </div>
                      ) : (
                        <div className="chart-finding-placeholder">
                          {finding.chartSelector ? (
                            <>
                              <button
                                onClick={() => handleCaptureChart(finding.chartSelector!, finding.chartCommentary || finding.statement)}
                                disabled={isCapturing}
                                className="capture-chart-button restore-image-button"
                              >
                                {isCapturing ? 'Capturing...' : 'Restore Image'}
                              </button>
                              <EditableText
                                content={finding.chartCommentary || finding.statement}
                                id={`chart-commentary-${finding.id}`}
                                isPremium={isPremium}
                                onSave={(id, content) => {
                                  console.log('Saved chart commentary:', id, content);
                                }}
                                onDelete={(id) => {
                                  // Remove the finding from the action plan
                                  if (actionPlan) {
                                    const newFindings = actionPlan.findings.filter(f => f.id !== finding.id);
                                    setActionPlan({
                                      ...actionPlan,
                                      findings: newFindings
                                    });
                                  }
                                }}
                                className="chart-commentary-preview"
                                tag="p"
                              />
                            </>
                          ) : (
                            <div className="chart-unavailable-message">
                              <EditableText
                                content={finding.chartCommentary || finding.statement}
                                id={`chart-commentary-text-${finding.id}`}
                                isPremium={isPremium}
                                onSave={(id, content) => {
                                  console.log('Saved chart commentary text:', id, content);
                                }}
                                onDelete={(id) => {
                                  // Remove the finding from the action plan
                                  if (actionPlan) {
                                    const newFindings = actionPlan.findings.filter(f => f.id !== finding.id);
                                    setActionPlan({
                                      ...actionPlan,
                                      findings: newFindings
                                    });
                                  }
                                }}
                                className="chart-commentary-text"
                                tag="p"
                              />
                              {finding.supportingData?.note && (
                                <p className="chart-note">ℹ️ {finding.supportingData.note}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
                
                    // Text finding - show text only
                    return (
                      <div key={finding.id} className="finding-item text-finding-item">
                        <div className="finding-content">
                          <EditableText
                            content={finding.statement}
                            id={`finding-${finding.id}`}
                            isPremium={isPremium}
                            onSave={(id, content) => {
                              console.log('Saved finding:', id, content);
                            }}
                            onDelete={(id) => {
                              // Remove the finding from the action plan
                              if (actionPlan) {
                                const newFindings = actionPlan.findings.filter(f => f.id !== finding.id);
                                setActionPlan({
                                  ...actionPlan,
                                  findings: newFindings
                                });
                              }
                            }}
                            className="finding-statement"
                            tag="p"
                          />
                        </div>
                        {/* Category badge removed - not useful for users */}
                      </div>
                    );
                  })();
                  
                  // Show plus button if:
                  // 1. Teresa Monroe staff mode is enabled (advanced feature)
                  // 2. Current finding is a text finding (not a chart)
                  const showPlusButton = isPremium && !finding.isChartItem;
                  
                  return (
                    <React.Fragment key={`fragment-${finding.id}`}>
                      {sectionTitle}
                      <div 
                        className="finding-item-wrapper"
                        onMouseEnter={(e) => {
                          if (showPlusButton) {
                            const plusButton = e.currentTarget.querySelector('.finding-insert-between') as HTMLElement;
                            if (plusButton) {
                              plusButton.style.opacity = '1';
                            }
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (showPlusButton) {
                            const plusButton = e.currentTarget.querySelector('.finding-insert-between') as HTMLElement;
                            if (plusButton) {
                              plusButton.style.opacity = '0';
                            }
                          }
                        }}
                      >
                        {findingElement}
                        {/* Plus button between text findings (not chart findings) */}
                        {showPlusButton && (
                          <button
                            type="button"
                            className="finding-insert-between"
                            onClick={() => {
                              // Create a new empty finding
                              const newFinding: Finding = {
                                id: `custom-finding-${Date.now()}`,
                                category: finding.category, // Use same category as current finding
                                statement: '<p class="finding-placeholder">New finding. Click to edit.</p>',
                                priority: finding.priority + 0.5, // Insert between current and next
                                isChartItem: false
                              };
                              
                              // Insert the new finding into the action plan
                              if (actionPlan && actualIndex >= 0) {
                                const newFindings = [...actionPlan.findings];
                                newFindings.splice(actualIndex + 1, 0, newFinding);
                                setActionPlan({
                                  ...actionPlan,
                                  findings: newFindings
                                });
                              }
                            }}
                            title="Add new finding here"
                            aria-label="Add new finding here"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    </React.Fragment>
                  );
                });
              })()}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Opportunities & Risks Section */}
        {(actionPlan.opportunities.length > 0 || actionPlan.risks.length > 0) && (
          <section className="action-plan-section opportunities-risks-section">
            <div 
              className="section-header-container"
              onClick={() => toggleSection('opportunitiesRisks')}
            >
              <div className="section-header-content">
                <h3 className="section-title collapsible-section-title">
                  <span>Opportunities & Risks</span>
                  <span className="section-count">
                    ({actionPlan.opportunities.length} opportunities, {actionPlan.risks.length} risks)
                  </span>
                </h3>
                <p className="section-description-preview">
                  Strategic insights highlighting potential growth areas and areas requiring attention.
                </p>
              </div>
              <span className="collapse-icon">{expandedSections.opportunitiesRisks ? '▼' : '▶'}</span>
            </div>
            {expandedSections.opportunitiesRisks && (
              <div className="section-content-container">
                {/* Opportunities - shown first */}
                {actionPlan.opportunities.length > 0 && (
                  <div className="opportunities-section">
                    <h4 className="subsection-title opportunities-title">
                      Opportunities
                    </h4>
                    <div className="opportunities-list">
                      {actionPlan.opportunities.map((opportunity, oppIndex) => (
                        <div key={opportunity.id} className="opportunity-item-wrapper">
                          <div className={`opportunity-item impact-${opportunity.impact}`}>
                          <div className="opportunity-header">
                            <span className={`impact-badge impact-${opportunity.impact}`}>
                              {opportunity.impact.toUpperCase()}
                            </span>
                          </div>
                          <EditableText
                            content={opportunity.statement}
                            id={`opportunity-${opportunity.id}`}
                            isPremium={isPremium}
                            onSave={(id, content) => {
                              console.log('Saved opportunity:', id, content);
                            }}
                            onDelete={(id) => {
                              // Remove the opportunity from the action plan
                              if (actionPlan) {
                                const newOpportunities = actionPlan.opportunities.filter(o => o.id !== opportunity.id);
                                setActionPlan({
                                  ...actionPlan,
                                  opportunities: newOpportunities
                                });
                              }
                            }}
                            className="opportunity-statement"
                            tag="p"
                          />
                          {/* Customer list for opportunities */}
                          {opportunity.supportingData?.customers && 
                           opportunity.supportingData.customers.length > 0 && (
                            <div className="action-customers-list">
                              <details className="customers-details" open>
                                <summary className="customers-summary">
                                  <span className="customers-count">
                                    {opportunity.supportingData.count || opportunity.supportingData.customerCount || opportunity.supportingData.customers.length} customer{(opportunity.supportingData.count || opportunity.supportingData.customerCount || opportunity.supportingData.customers.length) !== 1 ? 's' : ''}
                                  </span>
                                  <span className="customers-toggle">▼</span>
                                </summary>
                                <div className="customers-table-container">
                                  <table className="customers-table">
                                    <thead>
                                      <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Position</th>
                                        {!opportunity.supportingData?.quadrant && <th>Distance</th>}
                                        {opportunity.supportingData?.quadrant && <th>{labels.satisfaction}</th>}
                                        {opportunity.supportingData?.quadrant && <th>{labels.loyalty}</th>}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {opportunity.supportingData.customers.map((customer: any, idx: number) => (
                                        <tr key={customer.id || idx}>
                                          <td>{customer.id || '—'}</td>
                                          <td>{customer.name || '—'}</td>
                                          <td>{customer.email || '—'}</td>
                                          <td>{customer.position || `(${customer.satisfaction}, ${customer.loyalty})`}</td>
                                          {!opportunity.supportingData?.quadrant && (
                                            <td>{customer.distance !== undefined ? customer.distance.toFixed(2) : '—'}</td>
                                          )}
                                          {opportunity.supportingData?.quadrant && (
                                            <>
                                              <td>{customer.satisfaction !== undefined ? customer.satisfaction.toFixed(1) : '—'}</td>
                                              <td>{customer.loyalty !== undefined ? customer.loyalty.toFixed(1) : '—'}</td>
                                            </>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </details>
                            </div>
                          )}
                          {/* Only show proximity charts if they're specific to this opportunity and not already in Findings */}
                          {opportunity.source === 'proximity' && opportunity.chartSelector && (() => {
                            // Check if this chart is already shown in Findings
                            const alreadyShown = actionPlan.findings.some(f => 
                              f.isChartItem && f.chartSelector === opportunity.chartSelector
                            );
                            
                            if (alreadyShown) {
                              // Reference the chart from Findings instead
                              return (
                                <p className="chart-reference">
                                  <em>(See proximity analysis chart in Findings section above)</em>
                                </p>
                              );
                            }
                            
                            // Show chart if not already in Findings
                            const chartImage = getChartImage(opportunity.chartSelector);
                            return chartImage ? (
                              <div className="chart-image-container small-chart">
                                <img 
                                  src={chartImage.dataUrl} 
                                  alt={chartImage.caption}
                                  className="chart-image"
                                />
                                <p className="chart-caption">{chartImage.caption}</p>
                              </div>
                            ) : null;
                          })()}
                          </div>
                          {/* Plus button to add new opportunity - TM users only */}
                          {isPremium && (
                            <button
                              type="button"
                              className="finding-insert-between"
                              onClick={() => {
                                // Create a new empty opportunity
                                const newOpportunity = {
                                  id: `custom-opportunity-${Date.now()}`,
                                  statement: '<p class="finding-placeholder">New opportunity. Click to edit.</p>',
                                  source: 'proximity' as const,
                                  impact: 'medium' as const,
                                  supportingData: {}
                                };
                                
                                // Insert the new opportunity into the action plan
                                if (actionPlan) {
                                  const newOpportunities = [...actionPlan.opportunities];
                                  newOpportunities.splice(oppIndex + 1, 0, newOpportunity);
                                  setActionPlan({
                                    ...actionPlan,
                                    opportunities: newOpportunities
                                  });
                                }
                              }}
                              title="Add new opportunity here"
                              aria-label="Add new opportunity here"
                            >
                              <Plus size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risks - shown after opportunities */}
                {actionPlan.risks.length > 0 && (
                  <div className="risks-section">
                    <h4 className="subsection-title risks-title">
                      Risks
                    </h4>
                    <div className="risks-list">
                      {actionPlan.risks.map((risk, riskIndex) => (
                        <div key={risk.id} className="risk-item-wrapper">
                          <div className={`risk-item severity-${risk.severity}`}>
                          <div className="risk-header">
                            <span className={`severity-badge severity-${risk.severity}`}>
                              {risk.severity.toUpperCase()}
                            </span>
                          </div>
                          <EditableText
                            content={risk.statement}
                            id={`risk-${risk.id}`}
                            isPremium={isPremium}
                            onSave={(id, content) => {
                              console.log('Saved risk:', id, content);
                            }}
                            onDelete={(id) => {
                              // Remove the risk from the action plan
                              if (actionPlan) {
                                const newRisks = actionPlan.risks.filter(r => r.id !== risk.id);
                                setActionPlan({
                                  ...actionPlan,
                                  risks: newRisks
                                });
                              }
                            }}
                            className="risk-statement"
                            tag="p"
                          />
                          {/* Customer list for risks */}
                          {risk.supportingData?.customers && 
                           risk.supportingData.customers.length > 0 && (
                            <div className="action-customers-list">
                              <details className="customers-details" open>
                                <summary className="customers-summary">
                                  <span className="customers-count">
                                    {risk.supportingData.count || risk.supportingData.customerCount || risk.supportingData.customers.length} customer{(risk.supportingData.count || risk.supportingData.customerCount || risk.supportingData.customers.length) !== 1 ? 's' : ''}
                                  </span>
                                  <span className="customers-toggle">▼</span>
                                </summary>
                                <div className="customers-table-container">
                                  <table className="customers-table">
                                    <thead>
                                      <tr>
                                        <th>ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Position</th>
                                        {!risk.supportingData?.quadrant && <th>Distance</th>}
                                        {risk.supportingData?.quadrant && <th>{labels.satisfaction}</th>}
                                        {risk.supportingData?.quadrant && <th>{labels.loyalty}</th>}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {risk.supportingData.customers.map((customer: any, idx: number) => (
                                        <tr key={customer.id || idx}>
                                          <td>{customer.id || '—'}</td>
                                          <td>{customer.name || '—'}</td>
                                          <td>{customer.email || '—'}</td>
                                          <td>{customer.position || `(${customer.satisfaction}, ${customer.loyalty})`}</td>
                                          {!risk.supportingData?.quadrant && (
                                            <td>{customer.distance !== undefined ? customer.distance.toFixed(2) : '—'}</td>
                                          )}
                                          {risk.supportingData?.quadrant && (
                                            <>
                                              <td>{customer.satisfaction !== undefined ? customer.satisfaction.toFixed(1) : '—'}</td>
                                              <td>{customer.loyalty !== undefined ? customer.loyalty.toFixed(1) : '—'}</td>
                                            </>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </details>
                            </div>
                          )}
                          {/* Only show proximity charts if they're specific to this risk and not already in Findings */}
                          {risk.source === 'proximity' && risk.chartSelector && (() => {
                            // Check if this chart is already shown in Findings
                            const alreadyShown = actionPlan.findings.some(f => 
                              f.isChartItem && f.chartSelector === risk.chartSelector
                            );
                            
                            if (alreadyShown) {
                              // Reference the chart from Findings instead
                              return (
                                <p className="chart-reference">
                                  <em>(See proximity analysis chart in Findings section above)</em>
                                </p>
                              );
                            }
                            
                            // Show chart if not already in Findings
                            const chartImage = getChartImage(risk.chartSelector);
                            return chartImage ? (
                              <div className="chart-image-container small-chart">
                                <img 
                                  src={chartImage.dataUrl} 
                                  alt={chartImage.caption}
                                  className="chart-image"
                                />
                                <p className="chart-caption">{chartImage.caption}</p>
                              </div>
                            ) : null;
                          })()}
                          </div>
                          {/* Plus button to add new risk - TM users only */}
                          {isPremium && (
                            <button
                              type="button"
                              className="finding-insert-between"
                              onClick={() => {
                                // Create a new empty risk
                                const newRisk = {
                                  id: `custom-risk-${Date.now()}`,
                                  statement: '<p class="finding-placeholder">New risk. Click to edit.</p>',
                                  source: 'proximity' as const,
                                  severity: 'medium' as const,
                                  supportingData: {}
                                };
                                
                                // Insert the new risk into the action plan
                                if (actionPlan) {
                                  const newRisks = [...actionPlan.risks];
                                  newRisks.splice(riskIndex + 1, 0, newRisk);
                                  setActionPlan({
                                    ...actionPlan,
                                    risks: newRisks
                                  });
                                }
                              }}
                              title="Add new risk here"
                              aria-label="Add new risk here"
                            >
                              <Plus size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Actions Section */}
        {actionPlan.actions.length > 0 && (
          <section className="action-plan-section actions-section">
            <div 
              className="section-header-container"
              onClick={() => toggleSection('actions')}
            >
              <div className="section-header-content">
                <h3 className="section-title collapsible-section-title">
                  <span>Actions</span>
                  <span className="section-count">({actionPlan.actions.length})</span>
                </h3>
                <p className="section-description-preview">
                  Recommended strategies and actions, prioritised by impact and ease of implementation.
                </p>
              </div>
              <span className="collapse-icon">{expandedSections.actions ? '▼' : '▶'}</span>
            </div>
            {expandedSections.actions && (
              <div className="section-content-container">
                <div className="actions-list">
              {(() => {
                // Group actions by type for better organization
                const crisisActions = actionPlan.actions.filter(a => a.priority === 0);
                const redemptionActions = actionPlan.actions.filter(a => a.priority === 1);
                const conversionActions = actionPlan.actions.filter(a => 
                  a.supportingData?.conversionType === 'opportunity'
                );
                const standardActions = actionPlan.actions.filter(a => 
                  a.priority >= 2 && a.supportingData?.conversionType !== 'opportunity'
                );
                
                // Sort each group by ROI (higher = better)
                const sortByROI = (a: typeof actionPlan.actions[0], b: typeof actionPlan.actions[0]) => b.roi - a.roi;
                
                const sortedCrisis = crisisActions.sort(sortByROI);
                const sortedRedemption = redemptionActions.sort(sortByROI);
                const sortedConversions = conversionActions.sort(sortByROI);
                const sortedStandard = standardActions.sort(sortByROI);
                
                // Render groups with section headers
                return (
                  <>
                    {sortedCrisis.length > 0 && (
                      <>
                        <div className="action-group-header">
                          <h4 className="action-group-title">Urgent Actions</h4>
                          <p className="action-group-description">Critical situations requiring immediate attention</p>
                        </div>
                        {sortedCrisis.map((action) => (
                          <div key={action.id} className="action-item">
                    <div className="action-header">
                      <div className="action-meta">
                        {action.quadrant && (
                          <span 
                            className="action-quadrant" 
                            data-quadrant={action.quadrant.toLowerCase()}
                          >
                            {action.quadrant}
                          </span>
                        )}
                        <span className={`actionability-badge actionability-${action.actionability}`}>
                          {action.actionability}
                        </span>
                        <span className={`impact-badge impact-${action.expectedImpact}`}>
                          {action.expectedImpact} impact
                        </span>
                      </div>
                      <div className="action-roi">
                        ROI Score: {action.roi}
                      </div>
                    </div>
                    <EditableText
                      content={action.statement}
                      id={`action-${action.id}`}
                      isPremium={isPremium}
                      onSave={(id, content) => {
                        console.log('Saved action:', id, content);
                      }}
                      onDelete={(id) => {
                        // Remove the action from the action plan
                        if (actionPlan) {
                          const newActions = actionPlan.actions.filter(a => a.id !== action.id);
                          setActionPlan({
                            ...actionPlan,
                            actions: newActions
                          });
                        }
                      }}
                      className="action-statement"
                      tag="p"
                    />
                    
                    {/* Customer list for crisis risk, conversion actions, and quadrant-based actions */}
                    {((action.supportingData?.riskType === 'crisis' || 
                       action.supportingData?.conversionType === 'opportunity' ||
                       action.supportingData?.quadrant) && 
                     action.supportingData?.customers && 
                     action.supportingData.customers.length > 0) && (
                      <div className="action-customers-list">
                        <details className="customers-details" open>
                          <summary className="customers-summary">
                            <span className="customers-count">
                              {action.supportingData.count || action.supportingData.customerCount || action.supportingData.customers.length} customer{(action.supportingData.count || action.supportingData.customerCount || action.supportingData.customers.length) !== 1 ? 's' : ''}
                            </span>
                            <span className="customers-toggle">▼</span>
                          </summary>
                          <div className="customers-table-container">
                            <table className="customers-table">
                              <thead>
                                <tr>
                                  <th>ID</th>
                                  <th>Name</th>
                                  <th>Email</th>
                                  <th>Position</th>
                                  {!(action.supportingData?.quadrant && !action.supportingData?.conversionType && !action.supportingData?.riskType && !action.supportingData?.opportunityType) && <th>Distance</th>}
                                  {action.supportingData?.conversionType === 'opportunity' && <th>Chances</th>}
                                  {action.supportingData?.riskType === 'crisis' && <th>Risk Score</th>}
                                  {action.supportingData?.quadrant && !action.supportingData?.conversionType && !action.supportingData?.riskType && !action.supportingData?.opportunityType && <th>{labels.satisfaction}</th>}
                                  {action.supportingData?.quadrant && !action.supportingData?.conversionType && !action.supportingData?.riskType && !action.supportingData?.opportunityType && <th>{labels.loyalty}</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {action.supportingData.customers.map((customer: any, idx: number) => (
                                  <tr key={customer.id || idx}>
                                    <td>{customer.id || '—'}</td>
                                    <td>{customer.name || '—'}</td>
                                    <td>{customer.email || '—'}</td>
                                    <td>{customer.position || `(${customer.satisfaction}, ${customer.loyalty})`}</td>
                                    {!(action.supportingData?.quadrant && !action.supportingData?.conversionType && !action.supportingData?.riskType && !action.supportingData?.opportunityType) && (
                                      <td>{customer.distance !== undefined ? customer.distance.toFixed(2) : '—'}</td>
                                    )}
                                    {action.supportingData?.conversionType === 'opportunity' && (
                                      <td>{customer.chances !== undefined ? `${customer.chances.toFixed(1)}%` : '—'}</td>
                                    )}
                                    {action.supportingData?.riskType === 'crisis' && (
                                      <td>{customer.riskScore !== undefined ? customer.riskScore.toFixed(1) : '—'}</td>
                                    )}
                                    {action.supportingData?.quadrant && !action.supportingData?.conversionType && !action.supportingData?.riskType && !action.supportingData?.opportunityType && (
                                      <>
                                        <td>{customer.satisfaction !== undefined ? customer.satisfaction.toFixed(1) : '—'}</td>
                                        <td>{customer.loyalty !== undefined ? customer.loyalty.toFixed(1) : '—'}</td>
                                      </>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      </div>
                    )}
                          </div>
                        ))}
                      </>
                    )}
                    
                    {sortedRedemption.length > 0 && (
                      <>
                        <div className="action-group-header">
                          <h4 className="action-group-title">Redemption Opportunities</h4>
                          <p className="action-group-description">High-value opportunities to win back customers</p>
                        </div>
                        {sortedRedemption.map((action) => (
                          <div key={action.id} className="action-item">
                            <div className="action-header">
                              <div className="action-meta">
                                {action.quadrant && (
                                  <span 
                                    className="action-quadrant" 
                                    data-quadrant={action.quadrant.toLowerCase()}
                                    translate="no"
                                  >
                                    {action.quadrant}
                                  </span>
                                )}
                                <span className={`actionability-badge actionability-${action.actionability}`}>
                                  {action.actionability}
                                </span>
                                <span className={`impact-badge impact-${action.expectedImpact}`}>
                                  {action.expectedImpact} impact
                                </span>
                              </div>
                              <div className="action-roi">
                                ROI Score: {action.roi}
                              </div>
                            </div>
                            <EditableText
                              content={action.statement}
                              id={`action-${action.id}`}
                              isPremium={isPremium}
                              onSave={(id, content) => {
                                console.log('Saved action:', id, content);
                              }}
                              className="action-statement"
                              tag="p"
                            />
                            
                            {/* Customer list for redemption, crisis risk and conversion actions */}
                            {((action.supportingData?.opportunityType === 'redemption' || 
                               action.supportingData?.riskType === 'crisis' || 
                               action.supportingData?.conversionType === 'opportunity' ||
                               action.supportingData?.quadrant) && 
                             action.supportingData?.customers && 
                             action.supportingData.customers.length > 0) && (
                              <div className="action-customers-list">
                                <details className="customers-details" open>
                                  <summary className="customers-summary">
                                    <span className="customers-count">
                                      {action.supportingData.count || action.supportingData.customerCount || action.supportingData.customers.length} customer{(action.supportingData.count || action.supportingData.customerCount || action.supportingData.customers.length) !== 1 ? 's' : ''}
                                    </span>
                                    <span className="customers-toggle">▼</span>
                                  </summary>
                                  <div className="customers-table-container">
                                    <table className="customers-table">
                                      <thead>
                                        <tr>
                                          <th>ID</th>
                                          <th>Name</th>
                                          <th>Email</th>
                                          <th>Position</th>
                                          {!(action.supportingData?.quadrant && !action.supportingData?.conversionType && !action.supportingData?.riskType && !action.supportingData?.opportunityType) && <th>Distance</th>}
                                          {action.supportingData?.conversionType === 'opportunity' && <th>Chances</th>}
                                          {(action.supportingData?.riskType === 'crisis' || action.supportingData?.opportunityType === 'redemption') && <th>Risk Score</th>}
                                          {action.supportingData?.quadrant && !action.supportingData?.conversionType && !action.supportingData?.riskType && !action.supportingData?.opportunityType && <th>{labels.satisfaction}</th>}
                                          {action.supportingData?.quadrant && !action.supportingData?.conversionType && !action.supportingData?.riskType && !action.supportingData?.opportunityType && <th>{labels.loyalty}</th>}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {action.supportingData.customers.map((customer: any, idx: number) => (
                                          <tr key={customer.id || idx}>
                                            <td>{customer.id || '—'}</td>
                                            <td>{customer.name || '—'}</td>
                                            <td>{customer.email || '—'}</td>
                                            <td>{customer.position || `(${customer.satisfaction}, ${customer.loyalty})`}</td>
                                            {!(action.supportingData?.quadrant && !action.supportingData?.conversionType && !action.supportingData?.riskType && !action.supportingData?.opportunityType) && (
                                              <td>{customer.distance !== undefined ? customer.distance.toFixed(2) : '—'}</td>
                                            )}
                                            {action.supportingData?.conversionType === 'opportunity' && (
                                              <td>{customer.chances !== undefined ? `${customer.chances.toFixed(1)}%` : '—'}</td>
                                            )}
                                            {(action.supportingData?.riskType === 'crisis' || action.supportingData?.opportunityType === 'redemption') && (
                                              <td>{customer.riskScore !== undefined ? customer.riskScore.toFixed(1) : '—'}</td>
                                            )}
                                            {action.supportingData?.quadrant && !action.supportingData?.conversionType && !action.supportingData?.riskType && !action.supportingData?.opportunityType && (
                                              <>
                                                <td>{customer.satisfaction !== undefined ? customer.satisfaction.toFixed(1) : '—'}</td>
                                                <td>{customer.loyalty !== undefined ? customer.loyalty.toFixed(1) : '—'}</td>
                                              </>
                                            )}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                    
                    {sortedConversions.length > 0 && (
                      <>
                        <div className="action-group-header">
                          <h4 className="action-group-title">Conversion Opportunities</h4>
                          <p className="action-group-description">Customers close to moving to better segments - grouped by conversion type</p>
                        </div>
                        {sortedConversions.map((action) => (
                          <div key={action.id} className="action-item">
                            <div className="action-header">
                              <div className="action-meta">
                                {action.quadrant && (
                                  <span 
                                    className="action-quadrant" 
                                    data-quadrant={action.quadrant.toLowerCase()}
                                    translate="no"
                                  >
                                    {action.quadrant}
                                  </span>
                                )}
                                <span className={`actionability-badge actionability-${action.actionability}`}>
                                  {action.actionability}
                                </span>
                                <span className={`impact-badge impact-${action.expectedImpact}`}>
                                  {action.expectedImpact} impact
                                </span>
                              </div>
                              <div className="action-roi">
                                ROI Score: {action.roi}
                              </div>
                            </div>
                            <EditableText
                              content={action.statement}
                              id={`action-${action.id}`}
                              isPremium={isPremium}
                              onSave={(id, content) => {
                                console.log('Saved action:', id, content);
                              }}
                              className="action-statement"
                              tag="p"
                            />
                            
                            {/* Customer list for conversion actions */}
                            {action.supportingData?.conversionType === 'opportunity' && 
                             action.supportingData?.customers && 
                             action.supportingData.customers.length > 0 && (
                              <div className="action-customers-list">
                                <details className="customers-details" open>
                                  <summary className="customers-summary">
                                    <span className="customers-count">
                                      {action.supportingData.customerCount} customer{action.supportingData.customerCount !== 1 ? 's' : ''}
                                    </span>
                                    <span className="customers-toggle">▼</span>
                                  </summary>
                                  <div className="customers-table-container">
                                    <table className="customers-table">
                                      <thead>
                                        <tr>
                                          <th>ID</th>
                                          <th>Name</th>
                                          <th>Email</th>
                                          <th>Position</th>
                                          <th>Distance</th>
                                          <th>Chances</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {action.supportingData.customers.map((customer: any, idx: number) => (
                                          <tr key={customer.id || idx}>
                                            <td>{customer.id || '—'}</td>
                                            <td>{customer.name || '—'}</td>
                                            <td>{customer.email || '—'}</td>
                                            <td>{customer.position || `(${customer.satisfaction}, ${customer.loyalty})`}</td>
                                            <td>{customer.distance !== undefined ? customer.distance.toFixed(2) : '—'}</td>
                                            <td>{customer.chances !== undefined ? `${customer.chances.toFixed(1)}%` : '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                    
                    {sortedStandard.length > 0 && (
                      <>
                        <div className="action-group-header">
                          <h4 className="action-group-title">Standard Actions</h4>
                          <p className="action-group-description">Recommended actions for each customer segment</p>
                        </div>
                        {sortedStandard.map((action) => (
                          <div key={action.id} className="action-item">
                            <div className="action-header">
                              <div className="action-meta">
                                {action.quadrant && (
                                  <span 
                                    className="action-quadrant" 
                                    data-quadrant={action.quadrant.toLowerCase()}
                                    translate="no"
                                  >
                                    {action.quadrant}
                                  </span>
                                )}
                                <span className={`actionability-badge actionability-${action.actionability}`}>
                                  {action.actionability}
                                </span>
                                <span className={`impact-badge impact-${action.expectedImpact}`}>
                                  {action.expectedImpact} impact
                                </span>
                              </div>
                              <div className="action-roi">
                                ROI Score: {action.roi}
                              </div>
                            </div>
                            <EditableText
                              content={action.statement}
                              id={`action-${action.id}`}
                              isPremium={isPremium}
                              onSave={(id, content) => {
                                console.log('Saved action:', id, content);
                              }}
                              className="action-statement"
                              tag="p"
                            />
                            
                            {/* Customer list for conversion actions and quadrant-based actions */}
                            {((action.supportingData?.conversionType === 'opportunity' || 
                               action.supportingData?.quadrant) && 
                             action.supportingData?.customers && 
                             action.supportingData.customers.length > 0) && (
                              <div className="action-customers-list">
                                <details className="customers-details" open>
                                  <summary className="customers-summary">
                                    <span className="customers-count">
                                      {action.supportingData.count || action.supportingData.customerCount || action.supportingData.customers.length} customer{(action.supportingData.count || action.supportingData.customerCount || action.supportingData.customers.length) !== 1 ? 's' : ''}
                                    </span>
                                    <span className="customers-toggle">▼</span>
                                  </summary>
                                  <div className="customers-table-container">
                                    <table className="customers-table">
                                      <thead>
                                        <tr>
                                          <th>ID</th>
                                          <th>Name</th>
                                          <th>Email</th>
                                          <th>Position</th>
                                          {!(action.supportingData?.quadrant && !action.supportingData?.conversionType) && <th>Distance</th>}
                                          {action.supportingData?.conversionType === 'opportunity' && <th>Chances</th>}
                                          {action.supportingData?.quadrant && !action.supportingData?.conversionType && <th>{labels.satisfaction}</th>}
                                          {action.supportingData?.quadrant && !action.supportingData?.conversionType && <th>{labels.loyalty}</th>}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {action.supportingData.customers.map((customer: any, idx: number) => (
                                          <tr key={customer.id || idx}>
                                            <td>{customer.id || '—'}</td>
                                            <td>{customer.name || '—'}</td>
                                            <td>{customer.email || '—'}</td>
                                            <td>{customer.position || `(${customer.satisfaction}, ${customer.loyalty})`}</td>
                                            {!(action.supportingData?.quadrant && !action.supportingData?.conversionType) && (
                                              <td>{customer.distance !== undefined ? customer.distance.toFixed(2) : '—'}</td>
                                            )}
                                            {action.supportingData?.conversionType === 'opportunity' && (
                                              <td>{customer.chances !== undefined ? `${customer.chances.toFixed(1)}%` : '—'}</td>
                                            )}
                                            {action.supportingData?.quadrant && !action.supportingData?.conversionType && (
                                              <>
                                                <td>{customer.satisfaction !== undefined ? customer.satisfaction.toFixed(1) : '—'}</td>
                                                <td>{customer.loyalty !== undefined ? customer.loyalty.toFixed(1) : '—'}</td>
                                              </>
                                            )}
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
                </div>
              </div>
            )}
          </section>
        )}
      </div>


      <UnifiedLoadingPopup isVisible={isExporting} text="segmenting" size="medium" />

      {/* Export Panel - Side Panel */}
      {showExportPanel && actionPlan && (
        <>
          {/* Overlay */}
          <div 
            className="unified-controls-overlay"
            onClick={() => setShowExportPanel(false)}
          />
          
          {/* Side Panel */}
          <div className="unified-controls-panel" ref={exportPanelRef}>
            <div className="unified-controls-header">
              <div
                className="unified-controls-title"
                style={{ color: '#3a863e', fontFamily: 'Montserrat, sans-serif', fontWeight: 600 }}
              >
                {showPDFCustomizeOptions ? 'Customise PDF Export' : 'Actions Report Export'}
              </div>
              <button 
                type="button"
                className="unified-close-button" 
                onClick={() => {
                  setShowExportPanel(false);
                  setShowPDFCustomizeOptions(false);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="unified-controls-content">
              <div className="unified-tab-content">
                <div className="unified-tab-body">
                  {showPDFCustomizeOptions ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {/* Font Selection - PDF only */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                          Body Text Font
                        </label>
                        <select
                          value={pdfFontFamily}
                          onChange={(e) => setPdfFontFamily(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: 6,
                            fontSize: '14px',
                            color: '#374151',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="lato">Default</option>
                          <option value="arial">Arial</option>
                          <option value="helvetica">Helvetica</option>
                          <option value="times">Times New Roman</option>
                        </select>
                        <p style={{ fontSize: '12px', color: '#6b7280', marginTop: 4, marginBottom: 0 }}>
                          Applies to body text only. Titles and headers use Montserrat.
                        </p>
                      </div>

                      {/* Consultant Name - TM staff only */}
                      {isPremium && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <label style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                            Consultant Name
                          </label>
                          <input
                            type="text"
                            value={pdfConsultantName}
                            onChange={(e) => setPdfConsultantName(e.target.value)}
                            placeholder="Optional — e.g. Jane Smith"
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: 6,
                              fontSize: '14px',
                              color: '#374151',
                              backgroundColor: 'white',
                              boxSizing: 'border-box'
                            }}
                          />
                          <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: 2, marginBottom: 0 }}>
                            {pdfConsultantName.trim()
                              ? `Footer will read: "by ${pdfConsultantName.trim()} at Teresa Monroe"`
                              : 'Leave blank to show "by Teresa Monroe"'}
                          </p>
                        </div>
                      )}

                      {/* Watermark Toggles - PDF only */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                          Watermarks (PDF)
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={pdfShowImageWatermarks}
                            onChange={(e) => setPdfShowImageWatermarks(e.target.checked)}
                            style={{ accentColor: '#3a863e', width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '14px', color: '#6b7280' }}>Show watermarks on chart images</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={pdfShowPageWatermarks}
                            onChange={(e) => setPdfShowPageWatermarks(e.target.checked)}
                            style={{ accentColor: '#3a863e', width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '14px', color: '#6b7280' }}>Show watermarks on page headers</span>
                        </label>
                        {pdfShowPageWatermarks && (
                          <div style={{ marginLeft: 26, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '13px', color: '#9ca3af' }}>Logo size:</span>
                            {(['large', 'medium', 'small'] as const).map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => setPdfHeaderLogoSize(size)}
                                style={{
                                  padding: '3px 10px',
                                  fontSize: '12px',
                                  borderRadius: 4,
                                  border: pdfHeaderLogoSize === size ? '1px solid #3a863e' : '1px solid #d1d5db',
                                  background: pdfHeaderLogoSize === size ? '#e8f5e9' : 'white',
                                  color: pdfHeaderLogoSize === size ? '#2e7d32' : '#6b7280',
                                  fontWeight: pdfHeaderLogoSize === size ? 600 : 400,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {size.charAt(0).toUpperCase() + size.slice(1)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Export PDF Button */}
                      <div style={{ marginTop: 'auto', paddingTop: 16 }}>
                        <button
                          type="button"
                          onClick={handleExportPDF}
                          disabled={isExporting}
                          className="report-button"
                          style={{
                            width: '100%',
                            background: '#3a863e',
                            border: '1px solid #3a863e',
                            color: 'white',
                            padding: '12px 16px',
                            borderRadius: 6,
                            fontSize: '14px',
                            fontWeight: 600,
                            opacity: isExporting ? 0.5 : 1,
                            cursor: isExporting ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isExporting) {
                              e.currentTarget.style.backgroundColor = '#34753a';
                              e.currentTarget.style.borderColor = '#34753a';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isExporting) {
                              e.currentTarget.style.backgroundColor = '#3a863e';
                              e.currentTarget.style.borderColor = '#3a863e';
                            }
                          }}
                        >
                          {isExporting ? 'Exporting...' : 'Export PDF'}
                        </button>
                      </div>

                      {/* Back Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowPDFCustomizeOptions(false);
                        }}
                        className="report-button"
                        style={{
                          width: '100%',
                          background: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          color: '#374151',
                          padding: '10px 16px',
                          borderRadius: 6,
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e5e7eb';
                          e.currentTarget.style.borderColor = '#9ca3af';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }}
                      >
                        ← Back to Export Options
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isPremium) {
                          setShowPDFCustomizeOptions(true);
                        } else {
                          handleExportPDF();
                        }
                      }}
                      disabled={isExporting}
                      className="report-button"
                      style={{
                        width: '100%',
                        background: selectedExportOption === 'pdf' ? '#3a863e' : 'white',
                        border: selectedExportOption === 'pdf' ? '1px solid #3a863e' : '1px solid #d1d5db',
                        color: selectedExportOption === 'pdf' ? 'white' : '#6b7280',
                        padding: '12px 16px',
                        borderRadius: 6,
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: selectedExportOption === 'pdf' ? 600 : 500,
                        opacity: isExporting ? 0.5 : 1,
                        cursor: isExporting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isExporting) {
                          if (selectedExportOption === 'pdf') {
                            e.currentTarget.style.backgroundColor = '#34753a';
                            e.currentTarget.style.borderColor = '#34753a';
                          } else {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                            e.currentTarget.style.borderColor = '#9ca3af';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isExporting) {
                          if (selectedExportOption === 'pdf') {
                            e.currentTarget.style.backgroundColor = '#3a863e';
                            e.currentTarget.style.borderColor = '#3a863e';
                          } else {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = '#d1d5db';
                          }
                        }
                      }}
                    >
                      Export PDF
                    </button>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedExportOption('excel');
                        setShowExportPanel(false);
                        await handleExportXLSX();
                        setSelectedExportOption(null);
                      }}
                      disabled={isExporting}
                      className="report-button"
                      style={{
                        width: '100%',
                        background: selectedExportOption === 'excel' ? '#3a863e' : 'white',
                        border: selectedExportOption === 'excel' ? '1px solid #3a863e' : '1px solid #d1d5db',
                        color: selectedExportOption === 'excel' ? 'white' : '#6b7280',
                        padding: '12px 16px',
                        borderRadius: 6,
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: selectedExportOption === 'excel' ? 600 : 500,
                        opacity: isExporting ? 0.5 : 1,
                        cursor: isExporting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isExporting) {
                          if (selectedExportOption === 'excel') {
                            e.currentTarget.style.backgroundColor = '#34753a';
                            e.currentTarget.style.borderColor = '#34753a';
                          } else {
                            e.currentTarget.style.backgroundColor = '#f3f4f6';
                            e.currentTarget.style.borderColor = '#9ca3af';
                          }
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isExporting) {
                          if (selectedExportOption === 'excel') {
                            e.currentTarget.style.backgroundColor = '#3a863e';
                            e.currentTarget.style.borderColor = '#3a863e';
                          } else {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = '#d1d5db';
                          }
                        }
                      }}
                    >
                      Export Excel
                    </button>
                    {/* Start Presentation - Placeholder for future feature */}
                    {/* <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowExportPanel(false);
                        await handleExportPPTX();
                      }}
                      disabled={isExporting}
                      className="report-button"
                      style={{
                        width: '100%',
                        background: 'white',
                        border: '1px solid #d1d5db',
                        color: '#6b7280',
                        padding: '12px 16px',
                        borderRadius: 6,
                        textAlign: 'left',
                        fontSize: '14px',
                        fontWeight: 500,
                        opacity: isExporting ? 0.5 : 1,
                        cursor: isExporting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isExporting) {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#9ca3af';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isExporting) {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }
                      }}
                    >
                      Start Presentation
                    </button> */}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
};
