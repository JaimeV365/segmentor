import React from 'react';
import { Star, LogIn } from 'lucide-react';
import './BrandPlusIndicator.css';

interface BrandPlusIndicatorProps {
  isPremium: boolean;
  onSignIn?: () => void;
}

/**
 * Teresa Monroe Staff Indicator Component
 * 
 * Discrete indicator for Teresa Monroe staff access:
 * - Hidden from regular users
 * - Only visible to authenticated TM staff
 * - Provides access to TM staff features
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
      // Not authenticated - redirect to TM login page
      if (onSignIn) {
        onSignIn();
      } else {
        window.location.href = '/tm';
      }
    }
  };

  return (
    <div 
      className={`brand-plus-indicator ${isPremium ? 'active' : 'inactive'}`}
      onClick={handleClick}
      title={isPremium ? 'Teresa Monroe Staff Active' : 'Teresa Monroe Staff Login'}
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
          <span className="brand-plus-indicator-text">TM</span>
        </>
      ) : (
        <>
          <LogIn 
            size={18} 
            color="#3a863e"
            strokeWidth={2}
          />
          <span className="brand-plus-indicator-text">TM Login</span>
        </>
      )}
    </div>
  );
};

export default BrandPlusIndicator;

