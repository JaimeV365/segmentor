import React, { useState } from 'react';
import { X, Play, Upload, Eye, Target, ArrowRight } from 'lucide-react';
import './WelcomeBanner.css';

interface WelcomeBannerProps {
  onDismiss: () => void;
  onStartTour: () => void;
  onLoadSampleData: () => void;
  onUploadData: () => void;
}

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
  {
    id: 'data-entry',
    title: 'Upload Your Data',
    description: 'Start by uploading your customer data using CSV files, manual entry, or loading a previous project.',
    target: '.data-entry-module',
    position: 'bottom'
  },
  {
    id: 'chart-visualization',
    title: 'See Your Chart',
    description: 'Once data is loaded, you\'ll see your customers plotted on the Segmentor chart. Each dot represents a customer.',
    target: '.visualization-container',
    position: 'top'
  },
  {
    id: 'loyalists',
    title: 'Loyalists (Top Right)',
    description: 'These are your best customers - highly satisfied AND highly loyal. They love your products and stick with you.',
    target: '.quadrant-loyalists',
    position: 'left'
  },
  {
    id: 'apostles',
    title: 'Apostles (Top Left)',
    description: 'Highly satisfied but less loyal. They love your products but might switch if they find something better.',
    target: '.quadrant-apostles',
    position: 'right'
  },
  {
    id: 'defectors',
    title: 'Defectors (Bottom Right)',
    description: 'Loyal but not satisfied. They stick with you but aren\'t happy - they might leave soon.',
    target: '.quadrant-defectors',
    position: 'left'
  },
  {
    id: 'terrorists',
    title: 'Terrorists (Bottom Left)',
    description: 'Neither satisfied nor loyal. These customers might spread negative word-of-mouth.',
    target: '.quadrant-terrorists',
    position: 'right'
  }
];

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ 
  onDismiss, 
  onStartTour, 
  onLoadSampleData, 
  onUploadData
}) => {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const handleStartTour = () => {
    setIsTourActive(true);
    setCurrentStep(0);
    onStartTour();
  };

  // Add tour highlighting effect
  React.useEffect(() => {
    if (isTourActive) {
      const step = tourSteps[currentStep];
      const targetElement = document.querySelector(step.target);
      
      if (targetElement) {
        // Scroll to the target element
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
      }
    }
  }, [isTourActive, currentStep]);

  const handleNextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsTourActive(false);
      setCurrentStep(0);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipTour = () => {
    setIsTourActive(false);
    setCurrentStep(0);
  };

  const handleUploadClick = () => {
    onUploadData();
    onDismiss();
  };

  const handleSampleDataClick = () => {
    onLoadSampleData();
    onDismiss();
  };

  if (isTourActive) {
    const step = tourSteps[currentStep];
    return (
      <div className="welcome-banner welcome-banner--tour">
        <div className="welcome-banner__tour-overlay" />
        <div className="welcome-banner__tour-content">
          <div className="welcome-banner__tour-header">
            <div className="welcome-banner__tour-progress">
              Step {currentStep + 1} of {tourSteps.length}
            </div>
            <button
              onClick={handleSkipTour}
              className="welcome-banner__tour-skip"
              aria-label="Skip tour"
            >
              <X size={16} />
            </button>
          </div>
          
          <div className="welcome-banner__tour-body">
            <h3 className="welcome-banner__tour-title">{step.title}</h3>
            <p className="welcome-banner__tour-description">{step.description}</p>
          </div>
          
          <div className="welcome-banner__tour-actions">
            <button
              onClick={handlePrevStep}
              disabled={currentStep === 0}
              className="welcome-banner__tour-button welcome-banner__tour-button--secondary"
            >
              Previous
            </button>
            <button
              onClick={handleNextStep}
              className="welcome-banner__tour-button welcome-banner__tour-button--primary"
            >
              {currentStep === tourSteps.length - 1 ? 'Finish Tour' : 'Next'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-banner">
      <div className="welcome-banner__content">
        <div className="welcome-banner__icon">
          <Target size={20} />
        </div>
        <div className="welcome-banner__text">
          <div className="welcome-banner__title">Welcome to Segmentor</div>
          <div className="welcome-banner__description">
            Analyse your customer satisfaction and loyalty to identify your best customers and growth opportunities.
          </div>
        </div>
        <div className="welcome-banner__actions">
          <button
            onClick={handleStartTour}
            className="welcome-banner__button welcome-banner__button--primary"
          >
            <Eye size={16} />
            Take Quick Tour
          </button>
          <button
            onClick={handleSampleDataClick}
            className="welcome-banner__button welcome-banner__button--tertiary"
          >
            <Play size={16} />
            Try Sample Data
          </button>
          <button
            onClick={onDismiss}
            className="welcome-banner__dismiss-button"
            aria-label="Dismiss welcome banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
