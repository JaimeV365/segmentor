import { useState, useCallback, useEffect } from 'react';
import type { DataPoint, ScaleFormat } from '../../../types/base';
import type { DataReport, ActionsReport } from '../types';
import { generateDataReport } from '../utils/dataReportGenerator';
import { generateActionsReport } from '../utils/actionsReportGenerator';
import { formatDataReportForExport, formatActionsReportForExport, downloadAsFile } from '../utils/exportHelpers';
import { useQuadrantAssignment } from '../../visualization/context/QuadrantAssignmentContext';
import { useAxisLabels } from '../../visualization/context/AxisLabelsContext';

interface UseReportGeneratorProps {
  data: DataPoint[];
  satisfactionScale: ScaleFormat;
  loyaltyScale: ScaleFormat;
  activeEffects: Set<string>;
  showNearApostles?: boolean;
  midpoint?: { sat: number; loy: number };
}

export const useReportGenerator = ({
  data,
  satisfactionScale,
  loyaltyScale,
  activeEffects,
  showNearApostles = false,
  midpoint
}: UseReportGeneratorProps) => {
  // Get context distribution, quadrant function, and axis labels to match graph display
  const { distribution: contextDistribution, getQuadrantForPoint } = useQuadrantAssignment();
  const { labels: axisLabels } = useAxisLabels();
  
  const [dataReport, setDataReport] = useState<DataReport | null>(null);
  const [actionsReport, setActionsReport] = useState<ActionsReport | null>(null);
  const [isOutOfSync, setIsOutOfSync] = useState(false);
  const [lastGeneratedHash, setLastGeneratedHash] = useState<string>('');

  const getCurrentStateHash = useCallback(() => {
    // Create a comprehensive hash that includes actual data content
    // This ensures Actions Report is invalidated when data is added, edited, deleted, or substituted
    const dataFingerprint = data.map(d => ({
      id: d.id,
      satisfaction: d.satisfaction,
      loyalty: d.loyalty,
      excluded: d.excluded
    })).sort((a, b) => a.id.localeCompare(b.id));
    
    return JSON.stringify({
      dataFingerprint, // Actual data content, not just length
      dataLength: data.length,
      excluded: data.filter(d => d.excluded).length,
      scales: `${satisfactionScale}-${loyaltyScale}`,
      effects: Array.from(activeEffects).sort().join(',')
    });
  }, [data, satisfactionScale, loyaltyScale, activeEffects]);

  // Restore a previously generated Actions Report (including captured images) if it matches this dataset.
  useEffect(() => {
    try {
      if (actionsReport) return;
      const raw = localStorage.getItem('savedActionsReportSnapshot');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const hash = getCurrentStateHash();
      if (parsed?.hash === hash && parsed?.report) {
        setActionsReport(parsed.report as ActionsReport);
        setLastGeneratedHash(hash);
        setIsOutOfSync(false);
      }
    } catch {
      // ignore corrupted storage
    }
  }, [actionsReport, getCurrentStateHash]);

  const handleGenerateReports = useCallback(async () => {
  try {
    console.log('🔄 useReportGenerator: About to generate reports');
    console.log('🔄 Data length:', data.length);
    console.log('🔄 First 3 data points:', data.slice(0, 3));
    console.log('🔄 Current state hash:', getCurrentStateHash());
    
    const dataReportContent = await generateDataReport(data, satisfactionScale, loyaltyScale);
      setDataReport(dataReportContent);
      setLastGeneratedHash(getCurrentStateHash());
      setIsOutOfSync(false);
    } catch (error) {
      console.error('Error generating reports:', error);
    }
  }, [data, satisfactionScale, loyaltyScale, activeEffects, getCurrentStateHash]);

  const handleGenerateActionPlan = useCallback(async () => {
    // Convert contextDistribution to the format expected by the aggregator
    const contextDist = contextDistribution ? {
      loyalists: contextDistribution.loyalists || 0,
      mercenaries: contextDistribution.mercenaries || 0,
      hostages: contextDistribution.hostages || 0,
      defectors: contextDistribution.defectors || 0,
      apostles: contextDistribution.apostles || 0,
      terrorists: contextDistribution.terrorists || 0,
      near_apostles: contextDistribution.near_apostles || 0
    } : null;

    // Determine isPremium from activeEffects
    const isPremium = activeEffects.has('premium') || activeEffects.has('PREMIUM');
    console.log('🔍 useReportGenerator: isPremium =', isPremium, 'activeEffects:', Array.from(activeEffects));

    if (!dataReport) {
      // Generate data report first if needed
      const dataReportContent = await generateDataReport(data, satisfactionScale, loyaltyScale);
      setDataReport(dataReportContent);
      
      const actionsReportContent = await generateActionsReport(
        data, 
        activeEffects,
        dataReportContent,
        satisfactionScale,
        loyaltyScale,
        getQuadrantForPoint, // Pass directly - generateActionsReport now accepts VisualizationQuadrantType
        midpoint, // Pass the actual user-adjusted midpoint
        isPremium, // CRITICAL FIX: Pass isPremium instead of false!
        false, // showSpecialZones
        showNearApostles,
        1, // apostlesZoneSize
        1, // terroristsZoneSize
        contextDist,
        axisLabels
      );
      setActionsReport(actionsReportContent);
      try {
        const hash = getCurrentStateHash();
        localStorage.setItem('savedActionsReportSnapshot', JSON.stringify({ hash, report: actionsReportContent }));
      } catch {
        // ignore
      }
      // Update hash to mark Actions Report as in sync with current data
      setLastGeneratedHash(getCurrentStateHash());
      setIsOutOfSync(false);
    } else {
      const actionsReportContent = await generateActionsReport(
        data, 
        activeEffects,
        dataReport,
        satisfactionScale,
        loyaltyScale,
        getQuadrantForPoint, // Pass directly - generateActionsReport now accepts VisualizationQuadrantType
        midpoint, // Pass the actual user-adjusted midpoint
        isPremium, // CRITICAL FIX: Pass isPremium instead of false!
        false, // showSpecialZones
        showNearApostles,
        1, // apostlesZoneSize
        1, // terroristsZoneSize
        contextDist,
        axisLabels
      );
      setActionsReport(actionsReportContent);
      try {
        const hash = getCurrentStateHash();
        localStorage.setItem('savedActionsReportSnapshot', JSON.stringify({ hash, report: actionsReportContent }));
      } catch {
        // ignore
      }
      // Update hash to mark Actions Report as in sync with current data
      setLastGeneratedHash(getCurrentStateHash());
      setIsOutOfSync(false);
    }
  }, [data, activeEffects, dataReport, satisfactionScale, loyaltyScale, contextDistribution, getCurrentStateHash, midpoint, showNearApostles]);

  // Auto-regenerate data report when data changes (but not action plan)
  useEffect(() => {
    if (data.length > 0) {
      handleGenerateReports();
    }
  }, [data, satisfactionScale, loyaltyScale, activeEffects, handleGenerateReports]);

  // Check for out of sync state and invalidate Actions Report when data changes
  useEffect(() => {
    const currentHash = getCurrentStateHash();
    const isOutOfSyncNow = currentHash !== lastGeneratedHash;
    setIsOutOfSync(isOutOfSyncNow);
    
    // If data has changed and Actions Report exists, clear it to force regeneration
    // This ensures old screenshots don't persist when data is added, edited, deleted, or substituted
    if (isOutOfSyncNow && actionsReport) {
      console.log('🔄 Data changed - invalidating Actions Report to prevent stale screenshots');
      setActionsReport(null);
      try {
        localStorage.removeItem('savedActionsReportSnapshot');
      } catch {
        // ignore
      }
    }
  }, [getCurrentStateHash, lastGeneratedHash, actionsReport]);

  const handleCustomizeReport = useCallback((reportType: 'data' | 'actions') => {
    console.log('Customizing report:', reportType);
  }, []);

  const handleExportReport = useCallback((reportType: 'data' | 'actions') => {
    if (reportType === 'data' && dataReport) {
      const content = formatDataReportForExport(dataReport);
      downloadAsFile(content, `data-report-${new Date().toISOString().split('T')[0]}`);
    } else if (reportType === 'actions' && actionsReport) {
      const content = formatActionsReportForExport(actionsReport);
      downloadAsFile(content, `actions-report-${new Date().toISOString().split('T')[0]}`);
    }
  }, [dataReport, actionsReport]);

  const handleShareReport = useCallback((reportType: 'data' | 'actions') => {
    console.log('Sharing report:', reportType);
  }, []);

  return {
    dataReport,
    actionsReport,
    isOutOfSync,
    setIsOutOfSync,
    handleGenerateReports,
    handleGenerateActionPlan,
    handleCustomizeReport,
    handleExportReport,
    handleShareReport
  };
};