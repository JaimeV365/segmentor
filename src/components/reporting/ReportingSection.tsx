import React from 'react';
import { DataReport } from './components/DataReport';
import { ActionsReport } from './components/ActionsReport';
import ProximitySection from './components/ProximitySection/ProximitySection';
import DistributionSection from './components/DistributionSection';
import './ReportingSection.css';
import { useReportGenerator } from './hooks/useReportGenerator';
import { useFilterContext } from '../visualization/context/FilterContext';
import type { DataPoint, ScaleFormat } from '../../types/base';

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

  const {
    dataReport,
    actionsReport,
    isOutOfSync,
    setIsOutOfSync,
    handleGenerateReports,
    handleCustomizeReport,
    handleExportReport,
    handleShareReport
  } = useReportGenerator({
    data: filteredData, // Use filtered data instead of raw data
    satisfactionScale,
    loyaltyScale,
    activeEffects
  });

  const isPremium = activeEffects.has('premium') || activeEffects.has('PREMIUM') || Boolean(activeEffects.size > 0);
  
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
satisfactionScale={satisfactionScale}
loyaltyScale={loyaltyScale}
isClassicModel={isClassicModel}
showSpecialZones={showSpecialZones}
showNearApostles={showNearApostles}
/>

<ProximitySection
data={filteredData}
satisfactionScale={satisfactionScale}
loyaltyScale={loyaltyScale}
isPremium={isPremium}
showSpecialZones={showSpecialZones}
showNearApostles={showNearApostles}
/>



<ActionsReport
report={actionsReport}
onCustomize={handleCustomizeReport}
onExport={handleExportReport}
onShare={handleShareReport}
/>

{/* Reporting Controls - At the very end */}
<div className="report-actions">
  <button onClick={() => handleCustomizeReport('data')} className="report-button">Customise</button>
  <button onClick={() => handleExportReport('data')} className="report-button primary">Export</button>
  <button onClick={() => handleShareReport('data')} className="report-button">Share</button>
</div>
</div>
    </div>
  );
};