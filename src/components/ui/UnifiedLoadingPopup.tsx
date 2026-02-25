import React, { useState, useEffect, useRef } from 'react';

// Inline SegmentingLoadingIndicator component
const SegmentingLoadingIndicator: React.FC<{ size?: 'small' | 'medium' }> = ({ size = 'small' }) => {
  const spinnerSize = size === 'small' ? '20px' : '32px';
  const textSize = size === 'small' ? '14px' : '18px';
  const gap = size === 'small' ? '10px' : '16px';
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `2px solid rgba(58, 134, 62, 0.2)`,
          borderTop: `2px solid #3a863e`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      <div
        style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '700',
          fontSize: textSize,
          color: '#333333'
        }}
      >
        seg<span style={{ color: '#3a863e' }}>m</span>enting
        <span style={{ animation: 'blink 1.4s infinite' }}>.</span>
        <span style={{ animation: 'blink 1.4s infinite', animationDelay: '0.2s' }}>.</span>
        <span style={{ animation: 'blink 1.4s infinite', animationDelay: '0.4s' }}>.</span>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
};

// Custom loading text component
const CustomLoadingText: React.FC<{ text: string; size?: 'small' | 'medium' }> = ({ text, size = 'small' }) => {
  const textSize = size === 'small' ? '14px' : '18px';
  const gap = size === 'small' ? '10px' : '16px';
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <div
        style={{
          width: size === 'small' ? '20px' : '32px',
          height: size === 'small' ? '20px' : '32px',
          border: `2px solid rgba(58, 134, 62, 0.2)`,
          borderTop: `2px solid #3a863e`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />
      <div
        style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: '700',
          fontSize: textSize,
          color: '#333333'
        }}
      >
        {text}
        <span style={{ animation: 'blink 1.4s infinite' }}>.</span>
        <span style={{ animation: 'blink 1.4s infinite', animationDelay: '0.2s' }}>.</span>
        <span style={{ animation: 'blink 1.4s infinite', animationDelay: '0.4s' }}>.</span>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
};

interface UnifiedLoadingPopupProps {
  isVisible: boolean;
  text?: string;
  size?: 'small' | 'medium';
  minDisplayMs?: number;
}

const MIN_DISPLAY_MS_DEFAULT = 800;

export const UnifiedLoadingPopup: React.FC<UnifiedLoadingPopupProps> = ({ 
  isVisible, 
  text = 'segmenting',
  size = 'medium',
  minDisplayMs = MIN_DISPLAY_MS_DEFAULT
}) => {
  const [showPopup, setShowPopup] = useState(false);
  const shownAtRef = useRef<number>(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    if (isVisible) {
      shownAtRef.current = Date.now();
      setShowPopup(true);
    } else if (showPopup) {
      const elapsed = Date.now() - shownAtRef.current;
      const remaining = Math.max(0, minDisplayMs - elapsed);
      if (remaining > 0) {
        hideTimerRef.current = setTimeout(() => {
          setShowPopup(false);
          hideTimerRef.current = null;
        }, remaining);
      } else {
        setShowPopup(false);
      }
    }
  }, [isVisible, minDisplayMs, showPopup]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  if (!showPopup) return null;
  
  return (
    <>
      {/* Backdrop overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />
      
      {/* Loading popup */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: '3px solid #3a863e',
            borderRadius: '16px',
            padding: '32px 40px',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.3)',
            animation: 'fadeIn 0.3s ease-out',
            backdropFilter: 'blur(8px)',
            minWidth: '200px',
            textAlign: 'center'
          }}
        >
          {text === 'segmenting' ? (
            <SegmentingLoadingIndicator size={size} />
          ) : (
            <CustomLoadingText text={text} size={size} />
          )}
        </div>
      </div>
    </>
  );
};

export default UnifiedLoadingPopup;
