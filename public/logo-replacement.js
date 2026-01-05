// Logo replacement script to use image when translation is detected
// This prevents browser translation from breaking the logo text

(function() {
  'use strict';
  
  function isPageTranslated() {
    // Check for Google Translate
    const isGoogleTranslated = document.documentElement.classList.contains('translated-ltr') || 
                                document.documentElement.classList.contains('translated-rtl') ||
                                document.body.classList.contains('translated-ltr') ||
                                document.body.classList.contains('translated-rtl') ||
                                document.querySelector('.goog-te-banner-frame') !== null ||
                                document.querySelector('#google_translate_element') !== null ||
                                document.querySelector('.skiptranslate') !== null;
    
    // Check for Chrome translation
    const htmlLang = document.documentElement.lang;
    const isLangChanged = htmlLang && htmlLang !== 'en' && htmlLang !== '';
    
    // Check if logo text has been broken (has extra spaces)
    const logoText = document.querySelector('.logo-segmentor');
    if (logoText) {
      const textContent = logoText.textContent || '';
      // Check for broken spacing like "seg m entor" or "seg m entor"
      if (textContent.match(/seg\s+m\s+entor/i) || textContent.includes('  ')) {
        return true;
      }
    }
    
    return isGoogleTranslated || isLangChanged;
  }
  
  function replaceLogoWithImage() {
    const logoLinks = document.querySelectorAll('.logo-text');
    
    logoLinks.forEach(function(logoLink) {
      // Check if already replaced
      if (logoLink.querySelector('img.logo-image-replacement')) {
        return;
      }
      
      // Create image element
      const img = document.createElement('img');
      img.src = '/segmentor-logo.png';
      img.alt = 'segmentor.app';
      img.className = 'logo-image-replacement';
      img.setAttribute('translate', 'no');
      img.style.height = '1.5rem';
      img.style.width = 'auto';
      img.style.display = 'inline-block';
      img.style.verticalAlign = 'middle';
      
      // Replace content
      logoLink.innerHTML = '';
      logoLink.appendChild(img);
    });
  }
  
  // Check immediately and on DOM ready
  function checkAndReplace() {
    if (isPageTranslated()) {
      replaceLogoWithImage();
    }
  }
  
  // Run immediately
  checkAndReplace();
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAndReplace);
  } else {
    checkAndReplace();
  }
  
  // Watch for translation changes - more aggressive watching
  const observer = new MutationObserver(function(mutations) {
    checkAndReplace();
    
    // Also check if logo text content changed (translation happened)
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        const target = mutation.target;
        if (target.classList && (target.classList.contains('logo-segmentor') || target.classList.contains('logo-text'))) {
          checkAndReplace();
        }
      }
    });
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'lang'],
    childList: true,
    subtree: true,
    characterData: true
  });
  
  // Watch the logo specifically
  const logoObserver = new MutationObserver(function() {
    checkAndReplace();
  });
  
  // Set up logo observer when logo exists
  function setupLogoObserver() {
    const logoText = document.querySelector('.logo-text');
    if (logoText && !logoText.querySelector('img.logo-image-replacement')) {
      logoObserver.observe(logoText, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }
  
  // Try to set up logo observer
  setupLogoObserver();
  setTimeout(setupLogoObserver, 100);
  setTimeout(setupLogoObserver, 500);
  setTimeout(setupLogoObserver, 1000);
  
  // Check more frequently (in case translation happens after page load)
  setInterval(checkAndReplace, 200);
})();

