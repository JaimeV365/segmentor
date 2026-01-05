// Logo replacement script to use image when translation is detected
// This prevents browser translation from breaking the logo text

(function() {
  'use strict';
  
  console.log('[Logo Replacement] Script loaded');
  
  let isReplaced = false;
  
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
    
    // Check if logo text has been broken (has extra spaces) - this is the key check
    const logoText = document.querySelector('.logo-segmentor');
    if (logoText) {
      const textContent = logoText.textContent || '';
      const innerHTML = logoText.innerHTML || '';
      // Check for broken spacing patterns - "seg m entor" or "seg  m  entor"
      if (textContent.match(/seg\s+m\s+entor/i) || 
          textContent.match(/seg\s{2,}m\s{2,}entor/i) ||
          textContent.includes('seg ') && textContent.includes(' m ') && textContent.includes(' entor') ||
          innerHTML.includes('seg ') && innerHTML.includes(' m ') && innerHTML.includes(' entor')) {
        console.log('[Logo Replacement] Detected broken logo text:', textContent);
        return true;
      }
    }
    
    // Also check the full logo link text
    const logoLink = document.querySelector('.logo-text');
    if (logoLink) {
      const fullText = logoLink.textContent || '';
      // Check for "Seg m entor" pattern (case insensitive)
      if (fullText.match(/seg\s+m\s+entor/i) || 
          fullText.match(/Seg\s+m\s+entor/i) ||
          (fullText.includes('seg ') && fullText.includes(' m ') && fullText.includes(' entor')) ||
          (fullText.includes('Seg ') && fullText.includes(' m ') && fullText.includes(' entor'))) {
        console.log('[Logo Replacement] Detected broken logo in full text:', fullText);
        return true;
      }
    }
    
    return isGoogleTranslated || isLangChanged;
  }
  
  function replaceLogoWithImage() {
    if (isReplaced) return;
    
    const logoLinks = document.querySelectorAll('.logo-text');
    
    if (logoLinks.length === 0) {
      // Logo not found yet, try again later
      return;
    }
    
    logoLinks.forEach(function(logoLink) {
      // Check if already replaced
      if (logoLink.querySelector('img.logo-image-replacement')) {
        isReplaced = true;
        return;
      }
      
      // Double-check the text content before replacing
      const currentText = logoLink.textContent || '';
      const needsReplacement = isPageTranslated() || 
                               currentText.match(/seg\s+m\s+entor/i) ||
                               currentText.match(/Seg\s+m\s+entor/);
      
      if (!needsReplacement && !isPageTranslated()) {
        return; // Don't replace if text is fine
      }
      
      // Create image element
      const img = document.createElement('img');
      img.src = '/segmentor-logo.png';
      img.alt = 'segmentor.app';
      img.className = 'logo-image-replacement notranslate';
      img.setAttribute('translate', 'no');
      img.style.height = '1.5rem';
      img.style.width = 'auto';
      img.style.display = 'inline-block';
      img.style.verticalAlign = 'middle';
      img.style.maxWidth = '200px';
      img.style.objectFit = 'contain';
      
      // Replace content
      logoLink.innerHTML = '';
      logoLink.appendChild(img);
      
      // Mark as replaced
      isReplaced = true;
      
      console.log('[Logo Replacement] Replaced text logo with image. Original text was:', currentText);
    });
  }
  
  // Check immediately and on DOM ready
  function checkAndReplace() {
    if (!isReplaced) {
      // Always try to replace if translation is detected OR if text is broken
      if (isPageTranslated()) {
        replaceLogoWithImage();
      } else {
        // Also check if text is already broken (even if translation not detected yet)
        const logoLink = document.querySelector('.logo-text');
        if (logoLink) {
          const text = logoLink.textContent || '';
          if (text.match(/seg\s+m\s+entor/i) || text.match(/Seg\s+m\s+entor/)) {
            console.log('[Logo Replacement] Found broken text, replacing immediately');
            replaceLogoWithImage();
          }
        }
      }
    }
  }
  
  // Run immediately
  checkAndReplace();
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      checkAndReplace();
      // Also check after a short delay
      setTimeout(checkAndReplace, 100);
      setTimeout(checkAndReplace, 500);
    });
  } else {
    checkAndReplace();
    setTimeout(checkAndReplace, 100);
    setTimeout(checkAndReplace, 500);
  }
  
  // Watch for translation changes - more aggressive watching
  const observer = new MutationObserver(function(mutations) {
    if (isReplaced) return;
    
    checkAndReplace();
    
    // Also check if logo text content changed (translation happened)
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        const target = mutation.target;
        if (target && (target.classList && (target.classList.contains('logo-segmentor') || target.classList.contains('logo-text') || target.closest('.logo-text')))) {
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
  
  // Watch the logo specifically - more aggressive
  const logoObserver = new MutationObserver(function() {
    if (!isReplaced) {
      checkAndReplace();
    }
  });
  
  // Set up logo observer when logo exists
  function setupLogoObserver() {
    const logoText = document.querySelector('.logo-text');
    if (logoText && !logoText.querySelector('img.logo-image-replacement')) {
      logoObserver.observe(logoText, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      });
    }
  }
  
  // Try to set up logo observer multiple times
  setupLogoObserver();
  setTimeout(setupLogoObserver, 50);
  setTimeout(setupLogoObserver, 100);
  setTimeout(setupLogoObserver, 500);
  setTimeout(setupLogoObserver, 1000);
  setTimeout(setupLogoObserver, 2000);
  
  // Check very frequently (in case translation happens after page load)
  setInterval(function() {
    if (!isReplaced) {
      checkAndReplace();
    }
  }, 100);
})();

