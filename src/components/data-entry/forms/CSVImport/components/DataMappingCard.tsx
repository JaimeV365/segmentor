import React, { useState, useMemo } from 'react';
import { MappingAnalysis, AxisMappingAnalysis, NumericColumnInfo } from '../utils/headerProcessing';
import './DataMappingCard.css';

export interface DataMappingSelection {
  satisfactionHeader: string;
  loyaltyHeader: string;
}

interface DataMappingCardProps {
  isOpen: boolean;
  mappingAnalysis: MappingAnalysis;
  onConfirm: (selection: DataMappingSelection) => void;
  onCancel: () => void;
}

/**
 * DataMappingCard — Phase 2 "pre-flight check" for CSV field assignment.
 *
 * Shows one row per axis. Each row can be in one of three states:
 *   1. Auto-detected (green checkmark, no action needed)
 *   2. Multiple candidates (radio buttons — user picks one)
 *   3. No match (dropdown of eligible numeric columns)
 *
 * Appears after CSV parsing, before data loads into the tool.
 */
export const DataMappingCard: React.FC<DataMappingCardProps> = ({
  isOpen,
  mappingAnalysis,
  onConfirm,
  onCancel
}) => {
  // Track user selections for each axis
  const [satSelection, setSatSelection] = useState<string>('');
  const [loySelection, setLoySelection] = useState<string>('');

  // Reset selections when the card opens with new analysis
  React.useEffect(() => {
    if (isOpen) {
      // Pre-fill auto-detected values
      setSatSelection(
        mappingAnalysis.satisfaction.status === 'auto-detected'
          ? mappingAnalysis.satisfaction.detectedHeader || ''
          : ''
      );
      setLoySelection(
        mappingAnalysis.loyalty.status === 'auto-detected'
          ? mappingAnalysis.loyalty.detectedHeader || ''
          : ''
      );
    }
  }, [isOpen, mappingAnalysis]);

  // Compute eligible columns for each axis dropdown (no-match scenario)
  // Exclude columns already selected or auto-detected by the other axis
  const satEligibleColumns = useMemo(() => {
    return mappingAnalysis.numericColumns.filter(col => {
      if (!col.eligibleForSatisfaction) return false;
      // Exclude column selected for loyalty
      if (col.header === loySelection) return false;
      return true;
    });
  }, [mappingAnalysis.numericColumns, loySelection]);

  const loyEligibleColumns = useMemo(() => {
    return mappingAnalysis.numericColumns.filter(col => {
      if (!col.eligibleForLoyalty) return false;
      // Exclude column selected for satisfaction
      if (col.header === satSelection) return false;
      return true;
    });
  }, [mappingAnalysis.numericColumns, satSelection]);

  // The Continue button is enabled when both axes have a selection
  const canContinue = satSelection !== '' && loySelection !== '';

  // Count remaining columns (not assigned to an axis)
  const assignedHeaders = new Set([satSelection, loySelection].filter(Boolean));
  const remainingCount = mappingAnalysis.totalColumnCount - assignedHeaders.size;

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (canContinue) {
      onConfirm({
        satisfactionHeader: satSelection,
        loyaltyHeader: loySelection
      });
    }
  };

  return (
    <div className="data-mapping-overlay">
      <div className="data-mapping-card">
        {/* Header */}
        <div className="data-mapping-header">
          <h3>Data Mapping</h3>
          <button className="data-mapping-close" onClick={onCancel}>&times;</button>
        </div>

        <div className="data-mapping-content">
          {/* Explanation */}
          <p className="data-mapping-explanation">
            We analysed your CSV columns and matched what we could. Please review and complete the mapping below.
          </p>

          {/* Satisfaction axis row */}
          <AxisRow
            axisName="Satisfaction"
            axisDescription="Select the field that measures customer satisfaction, experience quality, or effort"
            analysis={mappingAnalysis.satisfaction}
            eligibleColumns={satEligibleColumns}
            selection={satSelection}
            onSelect={setSatSelection}
            otherSelection={loySelection}
          />

          <div className="data-mapping-divider" />

          {/* Loyalty axis row */}
          <AxisRow
            axisName="Loyalty"
            axisDescription="Select the field that measures recommendation intent, loyalty, or repurchase likelihood"
            analysis={mappingAnalysis.loyalty}
            eligibleColumns={loyEligibleColumns}
            selection={loySelection}
            onSelect={setLoySelection}
            otherSelection={satSelection}
          />

          {/* Remaining columns note */}
          {remainingCount > 0 && (
            <p className="data-mapping-remaining">
              Remaining columns ({remainingCount}) will be available as additional data in your records.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="data-mapping-actions">
          <button
            type="button"
            className="data-mapping-button data-mapping-button--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="data-mapping-button data-mapping-button--confirm"
            disabled={!canContinue}
            onClick={handleConfirm}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-component: renders a single axis row in the mapping card
// ─────────────────────────────────────────────────────────────

interface AxisRowProps {
  axisName: string;
  axisDescription: string;
  analysis: AxisMappingAnalysis;
  eligibleColumns: NumericColumnInfo[];
  selection: string;
  onSelect: (header: string) => void;
  otherSelection: string;
}

const AxisRow: React.FC<AxisRowProps> = ({
  axisName,
  axisDescription,
  analysis,
  eligibleColumns,
  selection,
  onSelect,
  otherSelection
}) => {
  // State 1: Auto-detected
  if (analysis.status === 'auto-detected') {
    const scaleLabel = analysis.detectedScale
      ? `:${analysis.detectedScale}`
      : '';
    return (
      <div className="axis-row axis-row--detected">
        <div className="axis-row-label">{axisName} axis</div>
        <div className="axis-row-status axis-row-status--ok">
          <span className="axis-row-icon axis-row-icon--check">&#10003;</span>
          <span className="axis-row-header-name">
            {analysis.detectedHeader}{scaleLabel}
          </span>
          <span className="axis-row-badge">auto-detected</span>
        </div>
      </div>
    );
  }

  // State 2: Multiple candidates
  if (analysis.status === 'multiple-candidates' && analysis.candidates) {
    return (
      <div className="axis-row axis-row--ambiguous">
        <div className="axis-row-label">{axisName} axis</div>
        <div className="axis-row-status axis-row-status--warn">
          <span className="axis-row-icon axis-row-icon--warn">&#9888;</span>
          <span>Multiple matching columns found</span>
        </div>
        <div className="axis-row-candidates">
          {analysis.candidates.map(candidate => (
            <label
              key={candidate.header}
              className={`axis-row-radio ${selection === candidate.header ? 'axis-row-radio--selected' : ''}`}
            >
              <input
                type="radio"
                name={`axis-${axisName}`}
                value={candidate.header}
                checked={selection === candidate.header}
                onChange={() => onSelect(candidate.header)}
              />
              <span className="axis-row-radio-label">
                {candidate.header}
                <span className="axis-row-range">
                  (values: {candidate.dataRange.min}&ndash;{candidate.dataRange.max})
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="axis-row-hint">The other will appear as additional data.</p>
      </div>
    );
  }

  // State 3: No match
  return (
    <div className="axis-row axis-row--missing">
      <div className="axis-row-label">{axisName} axis</div>
      <div className="axis-row-status axis-row-status--warn">
        <span className="axis-row-icon axis-row-icon--warn">&#9888;</span>
        <span>No matching column found</span>
      </div>
      <p className="axis-row-description">{axisDescription}:</p>
      {eligibleColumns.length > 0 ? (
        <select
          className="axis-row-dropdown"
          value={selection}
          onChange={e => onSelect(e.target.value)}
        >
          <option value="">-- Select a column --</option>
          {eligibleColumns
            .filter(col => col.header !== otherSelection)
            .map(col => (
              <option key={col.header} value={col.header}>
                {col.header} (values: {col.dataRange.min}&ndash;{col.dataRange.max})
              </option>
            ))}
        </select>
      ) : (
        <p className="axis-row-no-eligible">
          No numeric columns with values in a valid {axisName.toLowerCase()} scale range were found in your CSV.
        </p>
      )}
    </div>
  );
};
