import React from 'react';
import { AlertTriangle, AlertCircle, Download } from 'lucide-react';
import { DuplicateReport, DateIssueReport, ValidationErrorData } from '../types';
import './EnhancedReportArea.css';

/** Categorize rejected items by scanning their reason strings. */
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

interface EnhancedReportAreaProps {
  errorReports?: DateIssueReport | null;
  validationErrors?: ValidationErrorData | null;
  warningReports?: {
    duplicates?: DuplicateReport | null;
    dateWarnings?: DateIssueReport | null;
  };
  onDownloadDuplicates: () => void;
  onDownloadDateErrors: () => void;
  onDownloadDateWarnings: () => void;
}

export const EnhancedReportArea: React.FC<EnhancedReportAreaProps> = ({
  errorReports,
  validationErrors,
  warningReports,
  onDownloadDuplicates,
  onDownloadDateErrors,
  onDownloadDateWarnings
}) => {
  const hasErrors = (errorReports && errorReports.count > 0) || !!validationErrors;
  const hasWarnings = (warningReports?.duplicates && warningReports.duplicates.count > 0) || 
                     (warningReports?.dateWarnings && warningReports.dateWarnings.count > 0);

  if (!hasErrors && !hasWarnings) return null;

  return (
    <div className="enhanced-report-area">
      {/* Error Reports Section */}
      {hasErrors && (
        <div className="report-panel report-panel--error">
          <div className="report-panel__header">
            <AlertCircle size={18} className="report-panel__icon" />
            <span>Import Issues</span>
          </div>
          
          <div className="report-panel__content">
            {validationErrors && (
              <div className="report-item">
                <div className="report-item__content">
                  <div className="report-item__title">{validationErrors.title}</div>
                  <p className="report-item__message">{validationErrors.message}</p>
                  {validationErrors.details && (
                    <p className="report-item__details">{validationErrors.details}</p>
                  )}
                  {validationErrors.fix && (
                    <p className="report-item__fix">
                      <strong>How to fix:</strong> {validationErrors.fix}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {errorReports && errorReports.count > 0 && (
              <div className="report-item report-item--with-action">
                <div className="report-item__content">
                  <div className="report-item__title">
                    Rejected Entries: <span className="report-item__count">{errorReports.count}</span>
                  </div>
                  <p className="report-item__message">
                    {errorReports.count === 1 
                      ? 'An entry was skipped: ' 
                      : `${errorReports.count} entries were skipped: `}
                    {summarizeRejections(errorReports.items)}.
                    {' '}Download the report for details.
                  </p>
                </div>
                <button 
                  className="report-action-button report-action-button--error"
                  onClick={onDownloadDateErrors}
                >
                  <Download size={14} />
                  Download Report
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Warning Reports Section */}
      {hasWarnings && (
        <div className="report-panel report-panel--warning">
          <div className="report-panel__header">
            <AlertTriangle size={18} className="report-panel__icon" />
            <span>Import Warnings</span>
          </div>
          
          {/* Add explanatory message about warning content */}
          <div className="report-item">
            <div className="report-item__content">
              <p className="report-item__message" style={{ fontWeight: 500 }}>
                Note: All data has been successfully imported. The warnings below are provided for your information.
              </p>
            </div>
          </div>
          
          <div className="report-panel__content">
            {warningReports?.duplicates && warningReports.duplicates.count > 0 && (
              <div className="report-item report-item--with-action">
                <div className="report-item__content">
                  <div className="report-item__title">
                    Potential Duplicates: <span className="report-item__count">{warningReports.duplicates.count}</span>
                  </div>
                  <p className="report-item__message">
                    {warningReports.duplicates.count === 1 
                      ? 'Found 1 entry that may be a duplicate of existing data. ' 
                      : `Found ${warningReports.duplicates.count} entries that may be duplicates of existing data. `}
                    These entries have been imported, but you may want to review them.
                  </p>
                </div>
                <button 
                  className="report-action-button report-action-button--warning"
                  onClick={onDownloadDuplicates}
                >
                  <Download size={14} />
                  Download Report
                </button>
              </div>
            )}
            
            {warningReports?.dateWarnings && warningReports.dateWarnings.count > 0 && (
              <div className="report-item report-item--with-action">
                <div className="report-item__content">
                  <div className="report-item__title">
                    Unusual Dates: <span className="report-item__count">{warningReports.dateWarnings.count}</span>
                  </div>
                  <p className="report-item__message">
                    {warningReports.dateWarnings.count === 1 
                      ? 'One entry contains an unusual date (e.g., very far in the future or past). ' 
                      : `${warningReports.dateWarnings.count} entries contain unusual dates (e.g., very far in the future or past). `}
                    These entries have been imported, but you may want to review them.
                  </p>
                </div>
                <button 
                  className="report-action-button report-action-button--warning"
                  onClick={onDownloadDateWarnings}
                >
                  <Download size={14} />
                  Download Report
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedReportArea;