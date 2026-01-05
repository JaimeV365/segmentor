import React, { useState, useEffect, useRef } from 'react';
import { X, Globe } from 'lucide-react';
import './TranslationBanner.css';

export const TranslationBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if page is translated by browser
    const checkTranslation = () => {
      // Detect Google Translate - check for translated classes
      const isGoogleTranslated = document.documentElement.classList.contains('translated-ltr') || 
                                  document.documentElement.classList.contains('translated-rtl') ||
                                  document.body.classList.contains('translated-ltr') ||
                                  document.body.classList.contains('translated-rtl') ||
                                  document.querySelector('.goog-te-banner-frame') !== null ||
                                  document.querySelector('#google_translate_element') !== null;
      
      // Detect other translation indicators
      const hasTranslationMeta = document.querySelector('meta[name="google-translate-customization"]');
      const hasTranslationScript = document.querySelector('script[src*="translate"]');
      
      // Check if language attribute changed from 'en'
      const htmlLang = document.documentElement.lang;
      const isLangChanged = htmlLang && htmlLang !== 'en' && htmlLang !== '';
      
      // Check for Chrome's built-in translation (adds font-family changes)
      const bodyStyle = window.getComputedStyle(document.body);
      const hasChromeTranslation = bodyStyle.fontFamily.includes('Google Noto') || 
                                   document.documentElement.getAttribute('data-translate') === 'yes';
      
      return isGoogleTranslated || !!hasTranslationMeta || !!hasTranslationScript || isLangChanged || hasChromeTranslation;
    };

    // Check on mount and periodically
    const check = () => {
      if (!isDismissed && checkTranslation()) {
        setIsVisible(true);
      }
    };

    check();
    const interval = setInterval(check, 1000);
    
    // Also listen for DOM changes (translation happens dynamically)
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'lang'],
      subtree: true
    });

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, [isDismissed]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    // Store dismissal in localStorage
    localStorage.setItem('translation-banner-dismissed', 'true');
  };

  // Check localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem('translation-banner-dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // Set translate="no" directly on DOM element (React doesn't always handle this attribute correctly)
  useEffect(() => {
    if (bannerRef.current) {
      bannerRef.current.setAttribute('translate', 'no');
      // Also set on child elements
      const children = bannerRef.current.querySelectorAll('*');
      children.forEach(child => {
        child.setAttribute('translate', 'no');
      });
    }
  }, [isVisible]);

  if (!isVisible || isDismissed) return null;

  return (
    <div ref={bannerRef} className="translation-banner notranslate" role="alert" aria-live="polite" translate="no">
      <div className="translation-banner-content">
        <Globe size={16} className="translation-banner-icon" />
        <div className="translation-banner-text notranslate">
          <strong className="notranslate">Browser Translation Active</strong>
          <span className="notranslate">This page is being translated by your browser. Translations may contain errors and are not provided by <span className="notranslate">segmentor.app</span>.</span>
        </div>
        <button
          className="translation-banner-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss translation notice"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default TranslationBanner;

