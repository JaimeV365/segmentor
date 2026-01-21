import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { QuadrantType } from '../../../../visualization/context/QuadrantAssignmentContext';
import type { DataPoint } from '@/types/base';
import type { CustomerTimeline } from '../utils/historicalDataUtils';

type SortKey =
  | 'customer'
  | 'dates'
  | 'moves'
  | 'distinctQuadrants'
  | 'startDate'
  | 'endDate';

interface JourneyStep {
  date: string;
  quadrant: QuadrantType;
  satisfaction: number;
  loyalty: number;
}

interface JourneyRow {
  key: string;
  identifier: string;
  identifierType: 'email' | 'id';
  name: string;
  group: string;
  datesCount: number;
  movesCount: number;
  distinctQuadrantsCount: number;
  startDate: string;
  endDate: string;
  pathLabel: string;
  steps: JourneyStep[];
}

const getQuadrantDisplayName = (quadrant: QuadrantType, isClassicModel: boolean = true): string => {
  if (isClassicModel) {
    const names: Record<QuadrantType, string> = {
      apostles: 'Apostles',
      near_apostles: 'Near-Apostles',
      loyalists: 'Loyalists',
      mercenaries: 'Mercenaries',
      hostages: 'Hostages',
      neutral: 'Neutral',
      defectors: 'Defectors',
      terrorists: 'Terrorists'
    };
    return names[quadrant] || quadrant;
  }
  const names: Record<QuadrantType, string> = {
    apostles: 'Advocates',
    near_apostles: 'Near-Advocates',
    loyalists: 'Loyalists',
    mercenaries: 'Mercenaries',
    hostages: 'Hostages',
    neutral: 'Neutral',
    defectors: 'Defectors',
    terrorists: 'Trolls'
  };
  return names[quadrant] || quadrant;
};

const toJourneyRow = (
  timeline: CustomerTimeline,
  getQuadrantForPoint: (point: DataPoint) => QuadrantType,
  isClassicModel: boolean
): JourneyRow | null => {
  // Build a per-date list of points (dedupe dates; last point for a date wins)
  const byDate = new Map<string, DataPoint>();
  timeline.dataPoints.forEach(p => {
    if (!p.date) return;
    byDate.set(p.date.trim(), p);
  });

  const dates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));
  if (dates.length < 2) return null;

  const steps: JourneyStep[] = dates.map(date => {
    const p = byDate.get(date)!;
    return {
      date,
      quadrant: getQuadrantForPoint(p),
      satisfaction: p.satisfaction,
      loyalty: p.loyalty
    };
  });

  // Compress consecutive duplicates for the path label, but keep full steps for details.
  const compressedQuadrants: QuadrantType[] = [];
  steps.forEach(s => {
    const last = compressedQuadrants[compressedQuadrants.length - 1];
    if (!last || last !== s.quadrant) {
      compressedQuadrants.push(s.quadrant);
    }
  });

  const movesCount = Math.max(0, compressedQuadrants.length - 1);
  const distinctQuadrantsCount = new Set(steps.map(s => s.quadrant)).size;
  const pathLabel = compressedQuadrants.map(q => getQuadrantDisplayName(q, isClassicModel)).join(' → ');

  const lastPoint = timeline.dataPoints[timeline.dataPoints.length - 1];
  return {
    key: `${timeline.identifierType}:${timeline.identifier}`,
    identifier: timeline.identifier,
    identifierType: timeline.identifierType,
    name: lastPoint?.name || '',
    group: lastPoint?.group || '',
    datesCount: dates.length,
    movesCount,
    distinctQuadrantsCount,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    pathLabel,
    steps
  };
};

export const CustomerJourneysSection: React.FC<{
  timelines: CustomerTimeline[];
  getQuadrantForPoint: (point: DataPoint) => QuadrantType;
  isClassicModel?: boolean;
}> = ({ timelines, getQuadrantForPoint, isClassicModel = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [minMoves, setMinMoves] = useState(2);
  const [sortKey, setSortKey] = useState<SortKey>('moves');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const all = timelines
      .map(t => toJourneyRow(t, getQuadrantForPoint, isClassicModel))
      .filter((r): r is JourneyRow => !!r);

    const filtered = all.filter(r => r.movesCount >= minMoves);

    const compare = (a: JourneyRow, b: JourneyRow) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'customer':
          return dir * (a.name || a.identifier).localeCompare(b.name || b.identifier);
        case 'dates':
          return dir * (a.datesCount - b.datesCount);
        case 'moves':
          return dir * (a.movesCount - b.movesCount);
        case 'distinctQuadrants':
          return dir * (a.distinctQuadrantsCount - b.distinctQuadrantsCount);
        case 'startDate':
          return dir * a.startDate.localeCompare(b.startDate);
        case 'endDate':
          return dir * a.endDate.localeCompare(b.endDate);
        default:
          return 0;
      }
    };

    filtered.sort(compare);
    return { allCount: all.length, filtered };
  }, [timelines, getQuadrantForPoint, isClassicModel, minMoves, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'customer' || key === 'startDate' || key === 'endDate' ? 'asc' : 'desc');
  };

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="customer-journeys-section">
      <div className="customer-journeys-header" onClick={() => setIsExpanded(v => !v)}>
        <div className="customer-journeys-title">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <span>Customer Journeys (multi-movement)</span>
        </div>
        <div className="customer-journeys-meta">
          <span className="customer-journeys-count">
            {rows.filtered.length} shown
            {rows.allCount > 0 ? ` / ${rows.allCount} total` : ''}
          </span>
          <button
            type="button"
            className="customer-journeys-toggle"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(v => !v);
            }}
          >
            {isExpanded ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="customer-journeys-body">
          <div className="customer-journeys-controls">
            <label className="customer-journeys-control">
              <span>Minimum movements</span>
              <select value={minMoves} onChange={(e) => setMinMoves(parseInt(e.target.value, 10))}>
                <option value={1}>1+</option>
                <option value={2}>2+</option>
                <option value={3}>3+</option>
                <option value={4}>4+</option>
                <option value={5}>5+</option>
              </select>
            </label>
          </div>

          {rows.filtered.length === 0 ? (
            <div className="customer-journeys-empty">
              No customers match this criteria.
            </div>
          ) : (
            <div className="customer-journeys-table-wrapper">
              <table className="customer-journeys-table">
                <thead>
                  <tr>
                    <th />
                    <th className="sortable" onClick={() => toggleSort('customer')}>
                      Customer
                    </th>
                    <th className="sortable" onClick={() => toggleSort('dates')}>
                      Dates
                    </th>
                    <th className="sortable" onClick={() => toggleSort('moves')}>
                      Movements
                    </th>
                    <th className="sortable" onClick={() => toggleSort('distinctQuadrants')}>
                      Quadrants
                    </th>
                    <th className="sortable" onClick={() => toggleSort('startDate')}>
                      First Date
                    </th>
                    <th className="sortable" onClick={() => toggleSort('endDate')}>
                      Last Date
                    </th>
                    <th>Path</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.filtered.map((r) => {
                    const isRowExpanded = expandedRows.has(r.key);
                    const displayCustomer = r.name || r.identifier;
                    return (
                      <React.Fragment key={r.key}>
                        <tr className={isRowExpanded ? 'expanded' : ''} onClick={() => toggleRow(r.key)}>
                          <td className="chev">
                            {isRowExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </td>
                          <td>
                            <div className="customer-cell">
                              <div className="customer-name">{displayCustomer}</div>
                              <div className="customer-sub">{r.identifierType}: {r.identifier}</div>
                            </div>
                          </td>
                          <td>{r.datesCount}</td>
                          <td>{r.movesCount}</td>
                          <td>{r.distinctQuadrantsCount}</td>
                          <td>{r.startDate}</td>
                          <td>{r.endDate}</td>
                          <td className="path">{r.pathLabel}</td>
                        </tr>
                        {isRowExpanded && (
                          <tr className="details">
                            <td colSpan={8}>
                              <div className="journey-steps">
                                <table className="journey-steps-table">
                                  <thead>
                                    <tr>
                                      <th>Date</th>
                                      <th>Quadrant</th>
                                      <th>Satisfaction</th>
                                      <th>Loyalty</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {r.steps.map((s) => (
                                      <tr key={`${r.key}:${s.date}`}>
                                        <td>{s.date}</td>
                                        <td>{getQuadrantDisplayName(s.quadrant, isClassicModel)}</td>
                                        <td>{s.satisfaction}</td>
                                        <td>{s.loyalty}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

