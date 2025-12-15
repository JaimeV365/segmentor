import React from 'react';
import { Star, LogIn } from 'lucide-react';
import './BrandPlusIndicator.css';

interface BrandPlusIndicatorProps {
  isPremium: boolean;
  onSignIn?: () => void;
}

/**
 * TM Agent Indicator Component
 * 
 * Always-visible indicator in the top-right corner that:
 * - Shows "Agent Login" for non-authenticated users
 * - Shows "TM Agent Active" for authenticated TM agents
 * - Provides quick access to TM agent features
 */
export const BrandPlusIndicator: React.FC<BrandPlusIndicatorProps> = ({
  isPremium,
  onSignIn
}) => {
  const handleClick = () => {
    if (isPremium) {
      // Already authenticated - could show account info or do nothing
      return;
    } else {
      // Not authenticated - redirect to Brand+ page
      if (onSignIn) {
        onSignIn();
      } else {
        window.location.href = '/brand-plus.html';
      }
    }
  };

  return (
    <div 
      className={`brand-plus-indicator ${isPremium ? 'active' : 'inactive'}`}
      onClick={handleClick}
      title={isPremium ? 'TM Agent Active' : 'Agent Login'}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {isPremium ? (
        <>
          <Star 
            size={18} 
            fill="#3a863e"
            color="#3a863e"
            strokeWidth={2}
          />
          <span className="brand-plus-indicator-text">Brand+</span>
        </>
      ) : (
        <>
          <LogIn 
            size={18} 
            color="#3a863e"
            strokeWidth={2}
          />
          <span className="brand-plus-indicator-text">Agent Login</span>
        </>
      )}
    </div>
  );
};

export default BrandPlusIndicator;

