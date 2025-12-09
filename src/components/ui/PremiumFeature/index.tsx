import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { PREMIUM_CONFIG, type PremiumFeature as PremiumFeatureType } from '../../../constants/premium';
import './PremiumFeature.css';

interface PremiumFeatureProps {
  children: React.ReactNode;
  isPremium: boolean;
  featureType?: PremiumFeatureType;
  onPreview?: () => void;
  description?: string;
  previewDuration?: number;
  feature?: string;
  onUpgrade?: () => void;
  showPreview?: boolean;
  disabledMessage?: string;
}

const PremiumFeature: React.FC<PremiumFeatureProps> = ({
  children,
  isPremium,
  featureType,
  onPreview,
  description = "Brand+ feature",
  previewDuration = 2,
  feature,
  onUpgrade,
  showPreview = true,
  disabledMessage
}) => {
  const [isPreview, setIsPreview] = useState(false);
  
  // Determine if feature should be enabled based on type
  const isAnalysisFeature = featureType && PREMIUM_CONFIG.FEATURES.ANALYSIS.includes(featureType as any);
  const isPersonalizationFeature = featureType && PREMIUM_CONFIG.FEATURES.PERSONALIZATION.includes(featureType as any);
  const isEnabled = isPremium || isAnalysisFeature;
  
  

  const handleClick = () => {
    if (!isEnabled && onPreview && !isPreview && showPreview) {
      setIsPreview(true);
      onPreview();
      setTimeout(() => setIsPreview(false), previewDuration * 1000);
    }
  };

  // For analysis features, always show enabled
  if (isAnalysisFeature) {
    return <>{children}</>;
  }

  // For personalization features with premium, show enabled (no wrapper interference)
  if (isPersonalizationFeature && isPremium) {
    return <>{children}</>;
  }

  // For personalization features, show with premium overlay if not premium
  if (isPersonalizationFeature && !isPremium) {
    return (
      <div className="premium-feature-wrapper">
        <div className="premium-feature-disabled">
          {children}
          <div className="premium-overlay">
            <Lock size={16} />
            <span>{disabledMessage || 'Brand+ Feature'}</span>
            {onUpgrade && (
              <button onClick={onUpgrade} className="upgrade-button">
                Upgrade
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Legacy behavior for backward compatibility
  return (
    <div 
      className={`relative ${!isEnabled && !isPreview ? 'opacity-50' : ''} 
        transition-opacity duration-200`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${description}${!isEnabled ? ' (Brand+ feature)' : ''}`}
    >
      {!isEnabled && !isPreview && (
        <div className="absolute -top-2 -right-2 z-10">
          <Lock 
            className="w-4 h-4 text-gray-500" 
            aria-hidden="true"
          />
        </div>
      )}
      <div className={`${!isEnabled && !isPreview ? 'cursor-pointer' : ''}`}>
        {children}
      </div>
      {!isEnabled && !isPreview && (
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-5 
          transition-colors duration-200 rounded flex items-center justify-center">
          <span className="sr-only">{description}</span>
          {feature && (
            <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded shadow-sm">
              Brand+ Feature
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PremiumFeature;