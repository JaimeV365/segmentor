import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { DataReport } from './components/DataReport';
import { ActionsReport } from './components/ActionsReport';
import ProximitySection from './components/ProximitySection/ProximitySection';
import DistributionSection from './components/DistributionSection';
import ResponseConcentrationSection from './components/ResponseConcentrationSection';
import './ReportingSection.css';
import { useReportGenerator } from './hooks/useReportGenerator';
import { useFilterContext } from '../visualization/context/FilterContext';
import { useChartConfigSafe } from '../visualization/context/ChartConfigContext';
import type { DataPoint, ScaleFormat } from '../../types/base';
import { DEFAULT_SETTINGS, ResponseConcentrationSettings } from './components/ResponseSettings/types';
import type { DataReport as DataReportType } from './types';

// Component to handle Response Concentration with title controls and collapsible functionality
const ResponseConcentrationTitleWrapper: React.FC<{
  dataReport: DataReportType | null;
  responseConcentrationSettings: ResponseConcentrationSettings;
  setResponseConcentrationSettings: (settings: ResponseConcentrationSettings) => void;
  isPremium: boolean;
  data: DataPoint[];
}> = ({ dataReport, responseConcentrationSettings, setResponseConcentrationSettings, isPremium, data }) => {
  const [titleControls, setTitleControls] = useState<React.ReactNode>(null);
  
  // State for collapsible section with localStorage persistence
  // Always default to collapsed (false) - user must manually expand
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Note: Removed auto-expand on navigation - section stays collapsed until user clicks
  
  // Persist expanded state to localStorage only when user manually changes it
  // Don't persist on initial load or navigation events
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    localStorage.setItem('responseConcentrationExpanded', isExpanded.toString());
  }, [isExpanded]);
  
  if (!dataReport) return null;
  
  return (
    <div className={`report-card advanced-section ${isExpanded ? 'expanded' : ''}`}>
      <button
        className="advanced-section-header"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} Advanced: Response Concentration`}
        id="response-concentration-title"
      >
        <div className="advanced-section-header-left">
          <div className="advanced-chevron-wrapper">
            {isExpanded ? (
              <ChevronDown size={18} className="advanced-chevron" />
            ) : (
              <ChevronRight size={18} className="advanced-chevron" />
            )}
          </div>
          <span className="advanced-badge">Advanced</span>
          <h3 className="report-title advanced-title">Response Concentration</h3>
        </div>
        <div className="advanced-section-header-right" onClick={(e) => e.stopPropagation()}>
          {isExpanded && <div onClick={(e) => e.stopPropagation()}>{titleControls}</div>}
        </div>
      </button>
      
      {isExpanded && (
        <div className="advanced-section-content">
          <div className="report-content" style={{ paddingTop: 0, display: 'flex', flexDirection: 'column' }}>
            <ResponseConcentrationSection
              report={dataReport}
              settings={responseConcentrationSettings}
              onSettingsChange={setResponseConcentrationSettings}
              isPremium={isPremium}
              originalData={data}
              hideTitle={true}
              onRenderTitleControls={setTitleControls}
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface ReportingSectionProps {
  data: DataPoint[];
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  activeEffects: Set<string>;
  isClassicModel: boolean;
  isPremium?: boolean;
  showSpecialZones?: boolean;
  showNearApostles?: boolean;
}

export const ReportingSection: React.FC<ReportingSectionProps> = ({
  data,
  satisfactionScale,
  loyaltyScale,
  activeEffects,
  isClassicModel,
  showSpecialZones = true,
  showNearApostles = false
}) => {
  // Get filtered data from FilterContext
  // NOTE: Old global API removed - each report uses getReportFilteredData with reportId
  // For now, use main filter context filteredData
  const { filteredData } = useFilterContext();
  
  // Get midpoint from ChartConfigContext to use actual user-adjusted midpoint
  const chartConfig = useChartConfigSafe();
  const midpoint = chartConfig?.midpoint;

  const {
    dataReport,
    actionsReport,
    isOutOfSync,
    setIsOutOfSync,
    handleGenerateReports,
    handleGenerateActionPlan,
    handleCustomizeReport,
    handleExportReport,
    handleShareReport
  } = useReportGenerator({
    data: filteredData, // Use filtered data instead of raw data
    satisfactionScale,
    loyaltyScale,
    activeEffects,
    showNearApostles,
    midpoint // Pass the actual user-adjusted midpoint
  });

  // isPremium should ONLY be true if 'premium' or 'PREMIUM' is explicitly in activeEffects
  // Do NOT use activeEffects.size > 0 as that would make ANY effect trigger premium mode
  const isPremium = activeEffects.has('premium') || activeEffects.has('PREMIUM');
  
  // State for Response Concentration section
  const [responseConcentrationSettings, setResponseConcentrationSettings] = useState<ResponseConcentrationSettings>(() => {
    // Try to load from localStorage
    try {
      const saved = localStorage.getItem('responseConcentrationSettings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load Response Concentration settings from localStorage:', e);
    }
    return DEFAULT_SETTINGS;
  });
  
  // Persist Response Concentration settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('responseConcentrationSettings', JSON.stringify(responseConcentrationSettings));
  }, [responseConcentrationSettings]);
  
console.log('🔍 ReportingSection Premium Check:');
console.log('  activeEffects:', Array.from(activeEffects));
console.log('  activeEffects.has("premium"):', activeEffects.has('premium'));
console.log('  isPremium result:', isPremium);

console.log('🚨🚨🚨 REPORTING SECTION RENDERING - THIS SHOULD APPEAR');
console.log('🚨🚨🚨 About to render DistributionSection with:', {
  dataLength: data.length,
  showSpecialZones,
  showNearApostles,
  dataReportExists: !!dataReport,
  distributionExists: !!dataReport?.distribution
});

  return (
    <div className="section reporting-section">
      <div className="flex justify-between items-center mb-4">
        <h1 className="reports-title">Reports</h1>
      </div>

      

      

      {isOutOfSync && (
        <div className="update-warning">
          <span>⚠️ Report settings have changed. Click to update.</span>
          <button 
            className="update-button"
            onClick={() => {
              handleGenerateReports();
              // Force refresh of report components with current premium status
              setIsOutOfSync(false);
            }}
          >
            Update Reports
          </button>
        </div>
      )}
      
      <div className="reports-container">
        <div data-section-id="report-data">
          <DataReport
            report={dataReport}
            onCustomize={handleCustomizeReport}
            onExport={handleExportReport}
            onShare={handleShareReport}
            isClassicModel={isClassicModel}
            isPremium={isPremium}
            // Pass the original data
            originalData={data}
          />
        </div>

        <div data-section-id="report-response-concentration">
          <ResponseConcentrationTitleWrapper
            dataReport={dataReport}
            responseConcentrationSettings={responseConcentrationSettings}
            setResponseConcentrationSettings={setResponseConcentrationSettings}
            isPremium={isPremium}
            data={data}
          />
        </div>

        <div data-section-id="report-distribution">
          <DistributionSection
            distribution={dataReport?.distribution || {
              loyalists: 0,
              defectors: 0,
              mercenaries: 0,
              hostages: 0,
              apostles: 0,
              nearApostles: 0,
              terrorists: 0
            }}
            total={dataReport?.totalEntries || 0}
            isPremium={isPremium}
            onQuadrantMove={() => {}}
            onQuadrantSelect={() => {}}
            data={filteredData}
            originalData={data}
            satisfactionScale={satisfactionScale}
            loyaltyScale={loyaltyScale}
            isClassicModel={isClassicModel}
            showSpecialZones={showSpecialZones}
            showNearApostles={showNearApostles}
          />
        </div>

        <div data-section-id="report-proximity">
          <ProximitySection
            data={filteredData}
            originalData={data}
            satisfactionScale={satisfactionScale}
            loyaltyScale={loyaltyScale}
            isPremium={isPremium}
            isClassicModel={isClassicModel}
            showSpecialZones={showSpecialZones}
            showNearApostles={showNearApostles}
          />
        </div>

        <div data-section-id="report-actions">
          <ActionsReport
            report={actionsReport}
            onCustomize={handleCustomizeReport}
            onExport={handleExportReport}
            onShare={handleShareReport}
            onGenerateActionPlan={handleGenerateActionPlan}
            isPremium={isPremium}
          />
        </div>
      </div>
    </div>
  );
};