import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Star, ArrowBigUpDash } from 'lucide-react';
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
            <span 
              className="brand-plus-indicator"
              onClick={(e) => {
                e.stopPropagation();
                if (!isPremium) {
                  window.location.href = '/brand-plus.html';
                }
              }}
              title={isPremium ? 'Brand+ Active' : 'Upgrade to Brand+'}
            >
              {isPremium ? (
                <Star 
                  size={16}
                  strokeWidth={2}
                  fill="transparent"
                  color="#3a863e"
                  style={{
                    transition: 'all 0.2s ease',
                    cursor: 'default'
                  }}
                />
              ) : (
                <ArrowBigUpDash 
                  size={20}
                  strokeWidth={2}
                  color="#3a863e"
                  style={{
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                />
              )}
            </span>
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
