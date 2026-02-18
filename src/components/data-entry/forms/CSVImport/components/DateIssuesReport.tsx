// src/components/data-entry/forms/CSVImport/components/DateIssuesReport.tsx

import React from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import { DateIssueReport } from '../types';

interface DateIssuesReportProps {
  report: DateIssueReport;
  onDownload: () => void;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  iconClassName?: string;
  buttonClassName?: string;
  isError?: boolean; // New prop to distinguish errors from warnings
  message?: string; // Custom message override
}

export const DateIssuesReport: React.FC<DateIssuesReportProps> = ({ 
  report, 
  onDownload,
  className = "csv-import__date-issues",
  title = "Rejected Entries",
  icon = <AlertTriangle size={16} />,
  iconClassName = "csv-import__date-issues-icon",
  buttonClassName = "csv-import__download-report",
  isError = true,
  message
}) => {
  if (!report || report.count === 0) return null;
  
  // Default messages based on whether this is an error or warning
  const defaultMessage = isError
    ? `${report.count === 1 
        ? 'A row was skipped due to invalid data.' 
        : `${report.count} rows were skipped due to invalid data (e.g. out-of-range values, date errors).`} 
      Download the report for details.`
    : `${report.count === 1 
        ? 'One row contains an unusual date (e.g., very far in the future or past).' 
        : `${report.count} rows contain unusual dates (e.g., very far in the future or past).`} 
      These rows were imported, but you may want to review them.`;
  
  return (
    <div className={className}>
      <div className="csv-import__date-issues-header">
        {icon && <span className={iconClassName}>{icon}</span>}
        <span>{title}: {report.count} {report.count === 1 ? 'row' : 'rows'}</span>
      </div>
      <p className="csv-import__date-issues-message">
        {message || defaultMessage}
      </p>
      <button 
        className={buttonClassName}
        onClick={onDownload}
      >
        <Download size={14} />
        Download Report
      </button>
    </div>
  );
};