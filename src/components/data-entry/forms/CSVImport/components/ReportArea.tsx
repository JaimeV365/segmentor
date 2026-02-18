import React from 'react';
import { AlertTriangle, AlertCircle, Download } from 'lucide-react';
import { DuplicateReport as DuplicateReportType, DateIssueReport, ValidationErrorData } from '../types';

interface ReportAreaProps {
  errorReports?: DateIssueReport | null;
  validationErrors?: ValidationErrorData | null;
  warningReports?: {
    duplicates?: DuplicateReportType | null;
    dateWarnings?: DateIssueReport | null;
  };
  onDownloadDuplicates: () => void;
  onDownloadDateErrors: () => void;
  onDownloadDateWarnings: () => void;
}

const ReportArea: React.FC<ReportAreaProps> = ({
  errorReports,
  validationErrors,
  warningReports,
  onDownloadDuplicates,
  onDownloadDateErrors,
  onDownloadDateWarnings
}) => {
  const hasErrors = (errorReports && errorReports.count > 0) || !!validationErrors;
  
  // Only show warnings if there are no validation errors that prevented the import
  // This prevents showing contradictory messages
  const showWarnings = !validationErrors;
  
  const hasWarnings = showWarnings && 
                    ((warningReports?.duplicates && warningReports.duplicates.count > 0) || 
                     (warningReports?.dateWarnings && warningReports.dateWarnings.count > 0));

  if (!hasErrors && !hasWarnings) return null;

  return (
    <div className="csv-import__reports">
      {/* Error Reports Section */}
      {hasErrors && (
        <div className="csv-import__report-area csv-import__report-area--error">
          <div className="csv-import__report-header">
            <AlertCircle size={16} className="csv-import__report-icon csv-import__report-icon--error" />
            <span>Import Issues</span>
          </div>
          
          {validationErrors && (
            <div className="csv-import__report-item">
              <div className="csv-import__report-details">
                <span className="csv-import__report-title">{validationErrors.title}</span>
                <p className="csv-import__report-message">{validationErrors.message}</p>
                {validationErrors.details && (
                  <p className="csv-import__report-message">{validationErrors.details}</p>
                )}
                {validationErrors.fix && (
                  <p className="csv-import__report-message">
                    <strong>How to fix:</strong> {validationErrors.fix}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {errorReports && errorReports.count > 0 && (
            <div className="csv-import__report-item">
              <div className="csv-import__report-details">
                <span className="csv-import__report-title">Rejected Entries:</span>
                <span className="csv-import__report-count">{errorReports.count} {errorReports.count === 1 ? 'entry' : 'entries'}</span>
                <p className="csv-import__report-message">
                  {errorReports.count === 1 
                    ? 'An entry was skipped due to invalid data. ' 
                    : `${errorReports.count} entries were skipped due to invalid data (e.g. out-of-range values, date errors). `} 
                  Download the report for details.
                </p>
              </div>
              <button 
                className="csv-import__report-button csv-import__report-button--error"
                onClick={onDownloadDateErrors}
              >
                <Download size={14} />
                Download Report
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Warning Reports Section */}
      {hasWarnings && (
        <div className="csv-import__report-area csv-import__report-area--warning">
          <div className="csv-import__report-header">
            <AlertTriangle size={16} className="csv-import__report-icon csv-import__report-icon--warning" />
            <span>Import Warnings</span>
          </div>
          
          {warningReports?.duplicates && warningReports.duplicates.count > 0 && (
            <div className="csv-import__report-item">
              <div className="csv-import__report-details">
                <span className="csv-import__report-title">Potential Duplicates:</span>
                <span className="csv-import__report-count">{warningReports.duplicates.count} {warningReports.duplicates.count === 1 ? 'entry' : 'entries'}</span>
                <p className="csv-import__report-message">
                  {warningReports.duplicates.count === 1 
                    ? 'Found 1 entry that may be a duplicate of existing data. ' 
                    : `Found ${warningReports.duplicates.count} entries that may be duplicates of existing data. `} 
                  These entries have been imported, but you may want to review them.
                </p>
              </div>
              <button 
                className="csv-import__report-button csv-import__report-button--warning"
                onClick={onDownloadDuplicates}
              >
                <Download size={14} />
                Download Report
              </button>
            </div>
          )}
          
          {warningReports?.dateWarnings && warningReports.dateWarnings.count > 0 && (
            <div className="csv-import__report-item">
              <div className="csv-import__report-details">
                <span className="csv-import__report-title">Unusual Dates:</span>
                <span className="csv-import__report-count">{warningReports.dateWarnings.count} {warningReports.dateWarnings.count === 1 ? 'entry' : 'entries'}</span>
                <p className="csv-import__report-message">
                  {warningReports.dateWarnings.count === 1 
                    ? 'One entry contains an unusual date (e.g., very far in the future or past). ' 
                    : `${warningReports.dateWarnings.count} entries contain unusual dates (e.g., very far in the future or past). `} 
                  These entries have been imported, but you may want to review them.
                </p>
              </div>
              <button 
                className="csv-import__report-button csv-import__report-button--warning"
                onClick={onDownloadDateWarnings}
              >
                <Download size={14} />
                Download Report
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportArea;