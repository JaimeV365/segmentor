import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  icon?: React.ReactNode;
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

export const NotificationContext = React.createContext<NotificationContextType>({
  showNotification: () => {},
  clearNotification: () => {},
  clearAll: () => {}
});

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    
    // Set duration based on notification type
    let duration = notification.duration;
    if (duration === undefined) {  // Only set default duration if not explicitly provided
      switch (notification.type) {
        case 'success':
          duration = 5000;  // 5 seconds
          break;
        case 'warning':
          duration = 10000;  // 10 seconds
          break;
        case 'info':
          duration = 8000;  // 8 seconds
          break;
        case 'error':
          duration = 0;  // Stay until manually closed
          break;
      }
    }
  
    const newNotification = {
      ...notification,
      id,
      duration
    };
    
    setNotifications(prev => [...prev, newNotification]);
  
    if (duration > 0) {
      setTimeout(() => {
        clearNotification(id);
      }, duration);
    }
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  

  return (
    <NotificationContext.Provider value={{ showNotification, clearNotification, clearAll }}>
      {children}
      <div style={{ 
        position: 'fixed', 
        top: '1rem', 
        right: '1rem', 
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        maxWidth: '20rem'
      }}>
        {notifications.map((notification) => (
          <div
            key={notification.id}
            style={{
              backgroundColor: notification.type === 'error' ? '#FEF2F2' : 
                             notification.type === 'success' ? '#F0FDF4' :
                             notification.type === 'warning' ? '#FFFBEB' :
                             '#EFF6FF',
              border: `1px solid ${
                notification.type === 'error' ? '#FCA5A5' :
                notification.type === 'success' ? '#86EFAC' :
                notification.type === 'warning' ? '#FCD34D' :
                '#93C5FD'
              }`,
              borderRadius: '0.5rem',
              padding: '1rem',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              animation: 'slideIn 0.3s ease-out forwards',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              {notification.icon && (
                <div style={{ marginTop: '2px' }}>
                  {notification.icon}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{
                  margin: '0 0 0.25rem 0',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: notification.type === 'error' ? '#991B1B' :
                         notification.type === 'success' ? '#166534' :
                         notification.type === 'warning' ? '#92400E' :
                         '#1E40AF'
                }}>
                  {notification.title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: notification.type === 'error' ? '#B91C1C' :
                         notification.type === 'success' ? '#15803D' :
                         notification.type === 'warning' ? '#B45309' :
                         '#1E40AF'
                }}>
                  {notification.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => clearNotification(notification.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.25rem',
                marginLeft: '0.5rem',
                cursor: 'pointer',
                color: '#6B7280',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationProvider;