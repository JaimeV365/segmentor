import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Monitor, Smartphone } from 'lucide-react';
import ScreenSizeIndicator from '../ScreenSizeIndicator/ScreenSizeIndicator';
import './ScreenSizeWarning.css';

interface ScreenSizeWarningProps {
  className?: string;
}

export const ScreenSizeWarning: React.FC<ScreenSizeWarningProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [screenSize, setScreenSize] = useState<'medium' | 'small' | 'very-small' | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      
      if (width <= 480) {
        setScreenSize('very-small');
      } else if (width <= 768) {
        setScreenSize('small');
      } else if (width <= 1400) { // Increased from 1024 to 1400
        setScreenSize('medium');
      } else {
        setScreenSize(null);
      }
      
      // Show warning for small and medium screens
      const shouldShow = (width <= 1400) && !isDismissed; // Increased from 1024 to 1400
      
      setIsVisible(shouldShow);
    };

    // Check on mount
    checkScreenSize();

    // Check on resize
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, [isDismissed]);

  // Add/remove body class when warning is visible
  useEffect(() => {
    if (isVisible) {
      document.body.classList.add('screen-warning-active');
    } else {
      document.body.classList.remove('screen-warning-active');
    }

    return () => {
      document.body.classList.remove('screen-warning-active');
    };
  }, [isVisible]);

  // Show indicator when screen size changes
  useEffect(() => {
    if (screenSize) {
      setShowIndicator(true);
      const timer = setTimeout(() => {
        setShowIndicator(false);
      }, 6000); // Auto-hide after 6 seconds (longer display)

      return () => clearTimeout(timer);
    }
  }, [screenSize]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  const getWarningMessage = () => {
    switch (screenSize) {
      case 'very-small':
        return {
          icon: <Smartphone size={16} />,
          message: "For the full experience with all features, try using a larger screen or desktop device.",
          type: 'very-small-screen'
        };
      case 'small':
        return {
          icon: <Smartphone size={16} />,
          message: "For the full experience with all features, try using a larger screen or desktop device.",
          type: 'small-screen'
        };
      case 'medium':
        return {
          icon: <Monitor size={16} />,
          message: "For the full experience with all contextual menus, consider using a larger screen.",
          type: 'medium-screen'
        };
      default:
        return null;
    }
  };

  const warning = getWarningMessage();

  if (!isVisible || !warning) {
    return null;
  }

  return (
    <>
      <div className={`screen-size-warning ${warning.type} ${className}`}>
        <div className="warning-content">
          <div className="warning-icon">
            {warning.icon}
          </div>
          <span className="warning-message">
            {warning.message}
          </span>
        </div>
        <button 
          className="warning-close" 
          onClick={handleDismiss}
          aria-label="Dismiss warning"
        >
          <X size={16} />
        </button>
      </div>
      {showIndicator && <ScreenSizeIndicator screenSize={screenSize} />}
    </>
  );
};

export default ScreenSizeWarning;
