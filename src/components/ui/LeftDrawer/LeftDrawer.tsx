import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Star } from 'lucide-react';
import './LeftDrawer.css';

interface LeftDrawerProps {
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  isPremium?: boolean;
}

export const LeftDrawer: React.FC<LeftDrawerProps> = ({ 
  children, 
  isOpen, 
  onToggle,
  isPremium = false
}) => {
  return (
    <>
      {/* Drawer Toggle Button - Always visible */}
      <button
        className={`drawer-toggle ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        title={isOpen ? 'Close menu' : 'Open menu'}
      >
        {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </button>

      {/* Drawer Overlay - Non-interactive, allows clicking through to content */}
      {isOpen && (
        <div 
          className="drawer-overlay"
        />
      )}

      {/* Drawer Content */}
      <div className={`left-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h3 className="drawer-title">
            Menu
            {isPremium && (
              <span title="Brand+ Active">
                <Star 
                  size={12}
                  strokeWidth={1.5}
                  fill="transparent"
                  color="#3a863e"
                  style={{
                    opacity: 0.5,
                    transition: 'all 0.2s ease'
                  }}
                />
              </span>
            )}
          </h3>
        </div>
        
        <div className="drawer-content">
          {children}
        </div>
      </div>
    </>
  );
};

export default LeftDrawer;
