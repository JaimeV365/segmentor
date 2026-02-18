// src/components/data-entry/forms/CSVImport/components/DateIssuesReport.tsx

import React from 'react';
import { AlertTriangle, Download } from 'lucide-react';
import { DateIssueReport } from '../types';

function summarizeRejections(items: DateIssueReport['items']): string {
  let sat = 0, loy = 0, date = 0, other = 0;
  for (const item of items) {
    const r = item.reason.toLowerCase();
    if (r.includes('satisfaction')) sat++;
    else if (r.includes('loyalty')) loy++;
    else if (r.includes('date')) date++;
    else other++;
  }
  const parts: string[] = [];
  if (sat > 0) parts.push(`${sat} with invalid satisfaction values`);
  if (loy > 0) parts.push(`${loy} with invalid loyalty values`);
  if (date > 0) parts.push(`${date} with date errors`);
  if (other > 0) parts.push(`${other} with other issues`);
  return parts.join(', ');
}

interface DateIssuesReportProps {
  report: DateIssueReport;
  onDownload: () => void;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  iconClassName?: string;
  buttonClassName?: string;
  isError?: boolean;
  message?: string;
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
  
  const defaultMessage = isError
    ? `${report.count === 1 
        ? 'A row was skipped: ' 
        : `${report.count} rows were skipped: `}${summarizeRejections(report.items)}. Download the report for details.`
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