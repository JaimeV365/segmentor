import React, { useState } from 'react';
import { Info } from 'lucide-react';
import type { DataReport as DataReportType } from '../../types';
import BarChart from '../BarChart';
import type { BarChartData } from '../BarChart';
import { HighlightableKPI } from '../HighlightableKPI';
import { MiniPlot } from '../MiniPlot';
import StatisticsSection from './StatisticsSection';
import CombinationDial from '../CombinationDial';
import { DEFAULT_SETTINGS, ResponseConcentrationSettings } from '../ResponseSettings/types';
import ResponseConcentrationSection from '../ResponseConcentrationSection';
import ResponseSettings from '../ResponseSettings';
import { DataPoint } from '@/types/base';
import type { QuadrantType } from '../../types';

interface DataReportProps {
  report: DataReportType | null;
  onCustomize: (reportType: 'data') => void;
  onExport: (reportType: 'data') => void;
  onShare: (reportType: 'data') => void;
  isClassicModel: boolean;
  isPremium?: boolean;
  originalData?: DataPoint[];
}

export const DataReport: React.FC<DataReportProps> = ({
  report,
  onCustomize,
  onExport,
  onShare,
  isClassicModel = true,
  isPremium = false,
  originalData = []
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ResponseConcentrationSettings>(DEFAULT_SETTINGS);
  const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantType | null>(null);
   
  if (!report) return null;

  const transformData = (distribution: Record<number, number>, maxValue: number): BarChartData[] => {
    return Array.from({ length: maxValue }, (_, i) => ({
      value: i + 1,
      count: distribution[i + 1] || 0
    }));
  };

  const getFilteredCombinations = () => {
    return report.mostCommonCombos.slice(0, settings.list.maxItems);
  };

  const terminology = {
    apostles: isClassicModel ? 'Apostles' : 'Advocates',
    terrorists: isClassicModel ? 'Terrorists' : 'Trolls'
  };

  const handleQuadrantMove = (fromIndex: number, toIndex: number) => {
    // This would handle reordering of quadrants in a premium version
    if (!isPremium) return;
  };

  const handleQuadrantSelect = (quadrant: QuadrantType) => {
    setSelectedQuadrant(prev => prev === quadrant ? null : quadrant);
  };
  
  return (
    <div className="report-card" onClick={(e) => e.stopPropagation()}>
      <h3 className="report-title">Data Report</h3>
      {/* Introductory information specific to Data Report */}
      <div className="report-content" style={{ paddingTop: 0 }}>
        <div className="info-ribbon">
          <div className="info-ribbon-content">
            <Info size={16} className="info-icon" />
            <p className="info-text">
              This Data Report provides an overview of your dataset with key statistics and distributions. Use it to identify overall response trends and the most common satisfaction–loyalty combinations to help you analyse and segment customer data.
            </p>
          </div>
        </div>
      </div>
      <div className="report-content">
        {/* Basic Information section */}
        <div className="report-section">
          <h4 className="report-section-title">Basic Information</h4>
          <div className="report-data-grid">
            <HighlightableKPI id="date" isPremium={isPremium}>
              <div className="report-stat-item flex justify-between w-full">
                <span className="report-stat-label">Date:</span>
                <span className="report-stat-value">
                  {new Date(report.date).toLocaleDateString()}
                </span>
              </div>
            </HighlightableKPI>
            <HighlightableKPI id="satisfaction-scale" isPremium={isPremium}>
              <div className="report-stat-item">
                <span className="report-stat-label">Satisfaction Scale:</span>
                <span className="report-stat-value">{report.satisfactionScale}</span>
              </div>
            </HighlightableKPI>
            <HighlightableKPI id="loyalty-scale" isPremium={isPremium}>
              <div className="report-stat-item flex justify-between w-full">
                <span className="report-stat-label">Loyalty Scale:</span>
                <span className="report-stat-value">{report.loyaltyScale}</span>
              </div>
            </HighlightableKPI>
          </div>
        </div>

        {/* Respondent Information section */}
        <div className="report-section">
          <h4 className="report-section-title">Respondent Information</h4>
          <div className="report-data-grid">
            <HighlightableKPI id="total-entries" isPremium={isPremium}>
              <div className="report-stat-item flex justify-between w-full">
                <span className="report-stat-label">Total Entries:</span>
                <span className="report-stat-value">{report.totalEntries}</span>
              </div>
            </HighlightableKPI>
            <HighlightableKPI id="excluded-entries" isPremium={isPremium}>
              <div className="report-stat-item flex justify-between w-full">
                <span className="report-stat-label">Excluded:</span>
                <span className="report-stat-value">{report.excludedEntries}</span>
              </div>
            </HighlightableKPI>
            <HighlightableKPI id="identified-entries" isPremium={isPremium}>
              <div className="report-stat-item flex justify-between w-full">
                <span className="report-stat-label">Identified:</span>
                <span className="report-stat-value">{report.identifiedCount}</span>
              </div>
            </HighlightableKPI>
            <HighlightableKPI id="anonymous-entries" isPremium={isPremium}>
              <div className="report-stat-item flex justify-between w-full">
                <span className="report-stat-label">Anonymous:</span>
                <span className="report-stat-value">{report.anonymousCount}</span>
              </div>
            </HighlightableKPI>
          </div>
        </div>

        {/* Statistics section */}
        <StatisticsSection 
          statistics={report.statistics}
          scales={{
            satisfaction: report.satisfactionScale,
            loyalty: report.loyaltyScale
          }}
          totalEntries={report.totalEntries}
          isPremium={isPremium}
          originalData={originalData}
        />

        {/* Response Concentration Section */}
        <div className="report-section">
          <ResponseConcentrationSection
            report={report}
            settings={settings}
            onSettingsChange={setSettings}
            isPremium={isPremium}
            originalData={originalData}
          />
        </div>

        

        

        {/* Selected Quadrant Details (if any) */}
        {selectedQuadrant && report.quadrantStats && report.quadrantStats[selectedQuadrant] && (
          <div className="report-section">
            <h4 className="report-section-title">{selectedQuadrant.charAt(0).toUpperCase() + selectedQuadrant.slice(1)} Details</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-white rounded border">
                  <h5 className="font-medium text-gray-700">Statistics</h5>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-sm text-gray-600">Count</p>
                      <p className="font-semibold">{report.quadrantStats[selectedQuadrant].count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Percentage</p>
                      <p className="font-semibold">{report.quadrantStats[selectedQuadrant].percentage.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg. Satisfaction</p>
                      <p className="font-semibold">{report.quadrantStats[selectedQuadrant].satisfaction.average.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg. Loyalty</p>
                      <p className="font-semibold">{report.quadrantStats[selectedQuadrant].loyalty.average.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-3 bg-white rounded border">
                  <h5 className="font-medium text-gray-700">Key Findings</h5>
                  <ul className="mt-2 text-sm space-y-1">
                    <li>• Most common satisfaction: {Object.entries(report.quadrantStats[selectedQuadrant].satisfaction.distribution)
                      .sort((a, b) => b[1] - a[1])[0][0]}</li>
                    <li>• Most common loyalty: {Object.entries(report.quadrantStats[selectedQuadrant].loyalty.distribution)
                      .sort((a, b) => b[1] - a[1])[0][0]}</li>
                    {isPremium && (
                      <li>• Significance: {report.quadrantStats[selectedQuadrant].count > (report.totalEntries * 0.25) 
                        ? 'High' : report.quadrantStats[selectedQuadrant].count > (report.totalEntries * 0.1) 
                        ? 'Medium' : 'Low'}</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <ResponseSettings
          settings={settings}
          onSettingsChange={setSettings}
          onClose={() => setShowSettings(false)}
          isPremium={isPremium}
        />
      )}

      
    </div>
  );
};

export default DataReport;