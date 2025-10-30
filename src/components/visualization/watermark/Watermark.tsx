// Watermark.tsx
import React from 'react';
import { GridDimensions } from '@/types/base';

interface WatermarkProps {
  hide: boolean;
  customLogo?: string;
  effects?: Set<string>;
  dimensions: GridDimensions;
}

const DEFAULT_LOGO = 'https://raw.githubusercontent.com/JaimeV365/segmentor/main/Logo%20large%209%20no%20motto%20stylised%20hand.png';
const XP_LOGO = 'https://xperience-360.com/wp-content/uploads/2024/12/New-Xperience-Logo-Black-loop-corrected-360-centered.png';
const TM_LOGO = 'https://cdn.prod.website-files.com/6667436f74d6166897e4686e/667ec77e501687a868dd9fe7_TeresaMonroe%20logo%20blanc.webp';

export const Watermark: React.FC<WatermarkProps> = ({ 
  hide, 
  customLogo, 
  effects = new Set(),
  dimensions
}) => {
  if (hide || effects?.has('HIDE_WATERMARK')) return null;

  // Choose logo based on effects
  let logoUrl = DEFAULT_LOGO; // Segmentor (default) logo
  
  if (effects?.has('SHOW_XP_LOGO')) {
    logoUrl = XP_LOGO;
  } else if (effects?.has('SHOW_TM_LOGO')) {
    logoUrl = TM_LOGO;
  } else if (effects?.has('CUSTOM_LOGO')) {
    // Get custom logo URL from effects
    const customUrlFromEffects = Array.from(effects).find(e => e.startsWith('CUSTOM_LOGO_URL:'));
    console.log('Custom logo effect found, effects:', Array.from(effects));
    if (customUrlFromEffects) {
      logoUrl = customUrlFromEffects.replace('CUSTOM_LOGO_URL:', '');
      console.log('Using custom logo URL from effects:', logoUrl);
    } else {
      console.log('CUSTOM_LOGO effect found but no URL in effects');
    }
  } 

  // Use custom logo from props if provided (overrides other settings)
  if (customLogo) {
    logoUrl = customLogo;
  }

  // Determine rotation - default is -90deg (vertical) unless LOGO_FLAT is set
  const rotation = effects?.has('LOGO_FLAT') ? '0deg' : '-90deg';

  // Base size (default)
  let logoSize = 90;

  // Check for size modifiers in effects
  const sizeModifier = Array.from(effects).find(e => e.startsWith('LOGO_SIZE:'));
  if (sizeModifier) {
    const sizeValue = parseInt(sizeModifier.replace('LOGO_SIZE:', ''), 10);
    if (!isNaN(sizeValue) && sizeValue > 0) {
      logoSize = sizeValue;
    }
  }

  // Check for position modifiers in effects
  let logoX = 0;
  let logoY = 0;
  
  const xModifier = Array.from(effects).find(e => e.startsWith('LOGO_X:'));
  if (xModifier) {
    const xValue = parseInt(xModifier.replace('LOGO_X:', ''), 10);
    if (!isNaN(xValue)) {
      logoX = xValue;
    }
  } else {
    const container = document.querySelector('.chart-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      const isFlatCalc = effects?.has('LOGO_FLAT');
      const effWidth = isFlatCalc ? logoSize : logoSize * 0.3;
      logoX = Math.max(0, rect.width - effWidth - 60);
    }
  }
  
  const yModifier = Array.from(effects).find(e => e.startsWith('LOGO_Y:'));
  if (yModifier) {
    const yValue = parseInt(yModifier.replace('LOGO_Y:', ''), 10);
    if (!isNaN(yValue)) {
      logoY = yValue;
    }
  } else {
    const container = document.querySelector('.chart-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      const isFlatCalc = effects?.has('LOGO_FLAT');
      const effHeight = isFlatCalc ? logoSize * 0.3 : logoSize;
      logoY = Math.max(0, rect.height - effHeight - 60);
    }
  }

  // Position within the chart area with adjustable offset
  const isFlat = effects?.has('LOGO_FLAT');
  const styles: React.CSSProperties = {
    position: 'absolute',
    left: `${10 + logoX}px`,
    top: `${10 + logoY}px`, // Changed from bottom to top for better control
    width: `${logoSize}px`,
    height: `${logoSize}px`,
    opacity: 0.6,
    transition: 'opacity 0.2s ease, transform 0.3s ease',
    zIndex: 25,
    transform: `rotate(${rotation})`,
    pointerEvents: 'none'
  };

  const hoverStyles = {
    opacity: 1
  };

  return (
    <div 
      style={styles} 
      onMouseEnter={e => Object.assign(e.currentTarget.style, hoverStyles)}
      onMouseLeave={e => Object.assign(e.currentTarget.style, { opacity: 0.6 })}
    >
      <img 
  src={logoUrl} 
  alt="Logo" 
  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
  onError={(e) => {
    console.error('Error loading logo from URL:', logoUrl);
    e.currentTarget.src = DEFAULT_LOGO; // Fallback to default logo
  }}
/>
    </div>
  );
};

export default Watermark;