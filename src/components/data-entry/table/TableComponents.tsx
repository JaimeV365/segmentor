import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Edit, Eye, EyeOff, Trash2 } from 'lucide-react';
import { DataPoint } from '@/types/base';
import { useAxisLabels } from '../../visualization/context/AxisLabelsContext';

interface TableHeaderProps {
  satisfactionScale: string;
  loyaltyScale: string;
  sortField: string | null;
  sortDirection: 'asc' | 'desc' | null;
  handleSort: (field: string) => void;
  headerHeight: number;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: DataPoint;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleExclude: (id: string) => void;
  onViewDetails: (data: DataPoint) => void;
}

interface TableFooterProps {
  totals: {
    satisfaction: number;
    loyalty: number;
    count: number;
  };
  footerHeight: number;
}

export const SortableHeader = ({ 
  field, 
  label, 
  currentSortField, 
  sortDirection, 
  onSort 
}: { 
  field: string; 
  label: string;
  currentSortField: string | null;
  sortDirection: 'asc' | 'desc' | null;
  onSort: (field: string) => void;
}) => {
  const getSortIcon = () => {
    if (currentSortField !== field) return <ArrowUpDown size={16} className="text-gray-400" />;
    return sortDirection === 'asc' ? 
      <ArrowUp size={16} className="text-blue-500" /> : 
      <ArrowDown size={16} className="text-blue-500" />;
  };

  return (
    <div
      onClick={() => onSort(field)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        userSelect: 'none',
        padding: '8px'
      }}
    >
      <span>{label}</span>
      {getSortIcon()}
    </div>
  );
};

export const TableHeader: React.FC<TableHeaderProps> = ({ 
  satisfactionScale, 
  loyaltyScale, 
  sortField, 
  sortDirection, 
  handleSort,
  headerHeight
}) => {
  const { labels } = useAxisLabels();
  return (
    <div 
      style={{ 
        position: 'sticky',
        top: 0,
        display: 'flex', 
        borderBottom: '2px solid #ddd',
        backgroundColor: '#f2f2f2',
        fontWeight: 'bold',
        height: `${headerHeight}px`,
        alignItems: 'center',
        zIndex: 1
      }}
    >
      <div style={{ flex: 0.5 }}>
        <SortableHeader 
          field="id" 
          label="ID" 
          currentSortField={sortField} 
          sortDirection={sortDirection} 
          onSort={handleSort} 
        />
      </div>
      <div style={{ flex: 1 }}>
        <SortableHeader 
          field="name" 
          label="Name" 
          currentSortField={sortField} 
          sortDirection={sortDirection} 
          onSort={handleSort} 
        />
      </div>
      <div style={{ flex: 1 }}>
        <SortableHeader 
          field="email" 
          label="Email" 
          currentSortField={sortField} 
          sortDirection={sortDirection} 
          onSort={handleSort} 
        />
      </div>
      <div style={{ flex: 0.7, textAlign: 'center' }}>
        <SortableHeader 
          field="satisfaction" 
          label={`${labels.satisfaction.length <= 4 ? labels.satisfaction : labels.satisfaction.substring(0, 3)} (${satisfactionScale})`} 
          currentSortField={sortField} 
          sortDirection={sortDirection} 
          onSort={handleSort} 
        />
      </div>
      <div style={{ flex: 0.7, textAlign: 'center' }}>
        <SortableHeader 
          field="loyalty" 
          label={`${labels.loyalty.length <= 4 ? labels.loyalty : labels.loyalty.substring(0, 3)} (${loyaltyScale})`} 
          currentSortField={sortField} 
          sortDirection={sortDirection} 
          onSort={handleSort} 
        />
      </div>
      <div style={{ flex: 0.8 }}>
        <SortableHeader 
          field="date" 
          label="Date" 
          currentSortField={sortField} 
          sortDirection={sortDirection} 
          onSort={handleSort} 
        />
      </div>
      <div style={{ flex: 0.8, padding: '8px', textAlign: 'center' }}>Actions</div>
    </div>
  );
};

export const TableRow: React.FC<RowProps> = ({ 
  index, 
  style, 
  data, 
  onEdit, 
  onDelete, 
  onToggleExclude,
  onViewDetails 
}) => {
  // Check if the data point has additional fields
  const standardKeys = ['id', 'name', 'email', 'satisfaction', 'loyalty', 'date', 'excluded', 'group'];
  const hasAdditionalData = Object.keys(data).some(key => !standardKeys.includes(key));
  
  return (
    <div 
      style={{ 
        ...style, 
        display: 'flex', 
        alignItems: 'center',
        borderBottom: '1px solid #ddd',
        backgroundColor: data.excluded ? '#F3F4F6' : index % 2 === 0 ? '#f9f9f9' : 'white',
        color: data.excluded ? '#9CA3AF' : 'inherit',
        textDecoration: data.excluded ? 'line-through' : 'none'
      }}
    >
      <div style={{ flex: 0.5, padding: '8px' }}>{data.id}</div>
      <div style={{ flex: 1, padding: '8px' }}>{data.name}</div>
      <div style={{ flex: 1, padding: '8px' }}>{data.email || '-'}</div>
      <div style={{ flex: 0.7, padding: '8px', textAlign: 'center' }}>{data.satisfaction}</div>
      <div style={{ flex: 0.7, padding: '8px', textAlign: 'center' }}>{data.loyalty}</div>
      <div style={{ flex: 0.8, padding: '8px' }}>{data.date || '-'}</div>
      <div style={{ 
        flex: 0.8, 
        padding: '8px', 
        display: 'flex',
        gap: '8px',
        justifyContent: 'center'
      }}>
        {hasAdditionalData && (
          <button 
            onClick={() => onViewDetails(data)}
            style={{
              padding: '6px',
              backgroundColor: 'transparent',
              color: '#6B7280',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            title="View all details"
          >
            <Search size={18} />
          </button>
        )}
        
        <button 
          onClick={() => onEdit(data.id)}
          style={{
            padding: '6px',
            backgroundColor: 'transparent',
            color: '#6B7280',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          title="Edit"
        >
          <Edit size={18} />
        </button>
        
        <button 
          onClick={() => onToggleExclude(data.id)}
          style={{
            padding: '6px',
            backgroundColor: 'transparent',
            color: data.excluded ? '#EF4444' : '#6B7280',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          title={data.excluded ? "Include in analysis" : "Exclude from analysis"}
        >
          {data.excluded ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>

        <button 
          onClick={() => onDelete(data.id)}
          style={{
            padding: '6px',
            backgroundColor: 'transparent',
            color: '#C83C34',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          title="Delete"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export const TableFooter: React.FC<TableFooterProps> = ({ totals, footerHeight }) => {
  const averages = {
    satisfaction: totals.count ? (totals.satisfaction / totals.count).toFixed(1) : '0',
    loyalty: totals.count ? (totals.loyalty / totals.count).toFixed(1) : '0'
  };

  return (
    <div 
      style={{ 
        position: 'sticky',
        bottom: 0,
        display: 'flex', 
        borderTop: '2px solid #ddd',
        backgroundColor: '#f8f8f8',
        height: `${footerHeight}px`,
        alignItems: 'center',
        zIndex: 1
      }}
    >
      <div style={{ flex: 0.5, padding: '8px' }}>
        <strong>Total:</strong> {totals.count}
      </div>
      <div style={{ flex: 1, padding: '8px' }}></div>
      <div style={{ flex: 1, padding: '8px' }}></div>
      <div style={{ flex: 0.7, padding: '8px', textAlign: 'center' }}>
        <strong>Avg:</strong> {averages.satisfaction}
      </div>
      <div style={{ flex: 0.7, padding: '8px', textAlign: 'center' }}>
        <strong>Avg:</strong> {averages.loyalty}
      </div>
      <div style={{ flex: 0.8, padding: '8px' }}></div>
      <div style={{ flex: 0.8, padding: '8px' }}></div>
    </div>
  );
};