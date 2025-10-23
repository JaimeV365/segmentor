import React, { useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Trash2 } from 'lucide-react';
import { DataPoint } from '@/types/base';
import { TableHeader, TableRow, TableFooter } from './TableComponents';
import DetailsModal from './DetailsModal';
import { parseDateForSorting } from './DateUtils';

interface DataDisplayProps {
  data: DataPoint[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onDeleteAll: () => void;  
  onToggleExclude: (id: string) => void;  
  satisfactionScale: string;
  loyaltyScale: string;
  isDemoMode?: boolean;
}

interface Size {
  width: number;
  height: number;
}

type SortField = 'id' | 'name' | 'email' | 'satisfaction' | 'loyalty' | 'date';
type SortDirection = 'asc' | 'desc' | null;

const DataDisplay: React.FC<DataDisplayProps> = ({ 
  data, 
  onDelete, 
  onEdit,
  onDeleteAll,
  onToggleExclude,
  satisfactionScale,
  loyaltyScale,
  isDemoMode = false
}) => {
  const ROW_HEIGHT = 50;
  const HEADER_HEIGHT = 40;
  const FOOTER_HEIGHT = 60;

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [detailsModalData, setDetailsModalData] = useState<{isOpen: boolean, data: DataPoint | null}>({
    isOpen: false,
    data: null
  });

  // Sort handling
  const handleSort = (field: string) => {
    const typedField = field as SortField;
    if (sortField === typedField) {
      // Cycle through: null -> asc -> desc -> null
      if (sortDirection === null) {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(typedField);
      setSortDirection('asc');
    }
  };

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortField || !sortDirection) return data;
  
    return [...data].sort((a, b) => {
      // Handle date field specifically with our custom parser
      if (sortField === 'date') {
        const aDate = parseDateForSorting(a[sortField] || '');
        const bDate = parseDateForSorting(b[sortField] || '');
        
        // If both values are valid dates, compare them
        if (aDate && bDate) {
          return sortDirection === 'asc' 
            ? aDate.getTime() - bDate.getTime()
            : bDate.getTime() - aDate.getTime();
        }
        
        // Handle cases where one or both dates are invalid
        if (!a[sortField] && b[sortField]) return sortDirection === 'asc' ? 1 : -1;
        if (a[sortField] && !b[sortField]) return sortDirection === 'asc' ? -1 : 1;
        
        // Fall back to string comparison
        const aValue = a[sortField] || '';
        const bValue = b[sortField] || '';
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      // Handle string fields (name, email)
      else if (sortField === 'name' || sortField === 'email') {
        const aValue = (a[sortField] || '').toString().toLowerCase();
        const bValue = (b[sortField] || '').toString().toLowerCase();
        
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
  
      // For numeric fields (satisfaction, loyalty)
      const aValue = a[sortField];
      const bValue = b[sortField];
  
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
      }
    });
  }, [data, sortField, sortDirection]);

  // Calculate totals and averages
  const totals = sortedData.reduce((acc, curr) => ({
    satisfaction: acc.satisfaction + (curr.excluded ? 0 : curr.satisfaction),
    loyalty: acc.loyalty + (curr.excluded ? 0 : curr.loyalty),
    count: acc.count + (curr.excluded ? 0 : 1)
  }), { satisfaction: 0, loyalty: 0, count: 0 });

  // Open details modal
  const handleOpenDetails = (point: DataPoint) => {
    setDetailsModalData({
      isOpen: true,
      data: point
    });
  };

  // Close details modal
  const handleCloseDetails = () => {
    setDetailsModalData({
      isOpen: false,
      data: null
    });
  };

  // Row renderer for virtualized list
  const rowRenderer = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <TableRow
      index={index}
      style={style}
      data={sortedData[index]}
      onEdit={onEdit}
      onDelete={onDelete}
      onToggleExclude={onToggleExclude}
      onViewDetails={handleOpenDetails}
    />
  );

  return (
    <div className="data-display">
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
  <h1 className="data-table-title">Data Table</h1>
</div>

      {/* Demo progress indicator */}
      {isDemoMode && (
        <div className="demo-progress-indicator">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${Math.min((data.length / 100) * 100, 100)}%` }}
            />
          </div>
          <div className="progress-text">
            {data.length} of 100 entries used
            {data.length >= 100 && <span className="limit-reached"> (Limit reached)</span>}
          </div>
        </div>
      )}

      {sortedData.length > 0 ? (
        <div style={{ 
          height: 'calc(100vh - 400px)', 
          minHeight: '300px', 
          maxHeight: '600px', 
          width: '100%',
          border: '1px solid #ddd',
          borderRadius: '4px',
          overflow: 'hidden',
          resize: 'vertical',
      position: 'relative'
        }}>
          <AutoSizer>
            {({ height, width }: Size) => (
              <div style={{ width, height }}>
                <TableHeader 
                  satisfactionScale={satisfactionScale}
                  loyaltyScale={loyaltyScale}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  handleSort={handleSort}
                  headerHeight={HEADER_HEIGHT}
                />
                <List
                  height={height - HEADER_HEIGHT - FOOTER_HEIGHT}
                  width={width}
                  itemCount={sortedData.length}
                  itemSize={ROW_HEIGHT}
                >
                  {rowRenderer}
                </List>
                <TableFooter 
                  totals={totals}
                  footerHeight={FOOTER_HEIGHT}
                />
              </div>
            )}
          </AutoSizer>
        </div>
      ) : (
        <p className="no-data-message">No data entered yet.</p>
      )}
      
      {/* Delete All button moved below table */}
      {data.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            onClick={onDeleteAll}
            style={{
              padding: '8px 16px',
              backgroundColor: '#C83C34',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Trash2 size={16} />
            Delete All Data
          </button>
        </div>
      )}

      {/* Details Modal */}
      {detailsModalData.data && (
        <DetailsModal
          isOpen={detailsModalData.isOpen}
          onClose={handleCloseDetails}
          data={detailsModalData.data}
        />
      )}
    </div>
  );
};

export default DataDisplay;