import React from 'react';
import ReactDOM from 'react-dom';
// import { X } from 'lucide-react';
import { DataPoint } from '@/types/base';
import { useAxisLabels } from '../../visualization/context/AxisLabelsContext';

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: DataPoint;
}

const DetailsModal: React.FC<DetailsModalProps> = ({ isOpen, onClose, data }) => {
  const { labels } = useAxisLabels();
  if (!isOpen) return null;
  
  // Standard keys we don't need to show duplicates of
  // const standardKeys = ['id', 'name', 'email', 'satisfaction', 'loyalty', 'date', 'excluded', 'group'];
  
  return ReactDOM.createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          borderTopLeftRadius: '8px',
          borderTopRightRadius: '8px'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>Data Details</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: '4px',
              fontSize: '24px'
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        
        <div style={{
          padding: '20px',
          maxHeight: 'calc(80vh - 120px)', /* Account for header and footer */
          overflowY: 'auto'
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 2fr', 
            gap: '12px'
          }}>
            {Object.entries(data).map(([key, value]) => {
  // Skip excluded property and group
  if (key === 'excluded' || key === 'group') return null;
  
  // Skip all fields with Sat- or Loy- prefix
  if (key.startsWith('Sat-') || key.startsWith('Loy-') || 
      key.startsWith('sat-') || key.startsWith('loy-')) {
    return null;
  }

  // Add this new check to skip duplicate fields
  // Skip satisfaction/loyalty variant fields
  if ((key.toLowerCase().includes('satisfaction') || key.toLowerCase().includes('loyalty')) && 
      key !== 'satisfaction' && key !== 'loyalty') {
    return null;
  }
  
  // Skip date duplicate fields (with format info)
  if ((key.toLowerCase().includes('date(') || 
      key.toLowerCase().includes('date_') || 
      key.toLowerCase().includes('mm/dd') ||
      key.toLowerCase().includes('dd/mm')) && 
      key.toLowerCase() !== 'date') {
    return null;
  }
  
  // Handle field name display with special cases
              let displayKey = key;
              
              // Special cases for field names
              const specialFieldMap: Record<string, string> = {
                'id': 'ID',
                'satisfaction': labels.satisfaction,
                'loyalty': labels.loyalty,
                'ces': 'CES',
                'csat': 'CSAT',
                'email': 'Email',
                'date': 'Date'
              };
              
              // Check case-insensitive match for special fields
              Object.entries(specialFieldMap).forEach(([fieldKey, display]) => {
                if (key.toLowerCase() === fieldKey.toLowerCase()) {
                  displayKey = display;
                }
              });
              
              // For other fields, just capitalize first letter
              if (displayKey === key) {
                displayKey = key.charAt(0).toUpperCase() + key.slice(1);
              }
              
              return (
                <React.Fragment key={key}>
                  <div style={{ 
                    padding: '8px', 
                    fontWeight: '600',
                    backgroundColor: '#f9fafb', 
                    borderRadius: '4px',
                    color: '#111827',
                    fontSize: '14px',
                    borderLeft: '3px solid #3a863e'
                  }}>
                    {displayKey}
                  </div>
                  <div style={{ 
                    padding: '8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    color: '#4b5563',
                    fontSize: '14px'
                  }}>
                    {value !== undefined && value !== null ? String(value) : '-'}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
        
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          backgroundColor: '#f9fafb'
        }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3a863e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DetailsModal;