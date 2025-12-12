#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Navigation HTML template
const navigationHTML = `
<nav class="main-navigation">
  <div class="nav-container">
    <div class="nav-logo">
      <a href="/" class="logo-text">
        <span class="logo-segmentor">seg<span class="logo-m">m</span>entor</span><span class="logo-app">.APP</span>
      </a>
    </div>
    <div class="nav-links">
      <a href="/about.html" class="nav-link">About</a>
      <a href="/faq.html" class="nav-link">FAQ</a>
      <a href="/contact.html" class="nav-link">Contact</a>
      <a href="/tool/" class="nav-link nav-link-primary">Use Tool</a>
    </div>
  </div>
</nav>
`;

// Font preload links (for faster font loading)
const fontPreloadHTML = `
<link rel="preload" href="/fonts/Montserrat-Bold.ttf" as="font" type="font/ttf" crossorigin="anonymous">
<link rel="preload" href="/fonts/Jaro-Regular.ttf" as="font" type="font/ttf" crossorigin="anonymous">
`;

// CSS for navigation
const navigationCSS = `
/* Font Face Declarations - Using Local Fonts */
@font-face {
  font-family: 'Montserrat';
  src: url('/fonts/Montserrat-Bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Jaro';
  src: url('/fonts/Jaro-Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

.main-navigation {
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
}

.nav-logo {
  font-size: 1.5rem;
  font-weight: 700;
}

.logo-text {
  text-decoration: none;
  display: flex;
  align-items: baseline;
  gap: 0;
  color: #333333;
  font-family: 'Montserrat', sans-serif;
}

.logo-segmentor {
  font-family: 'Montserrat', sans-serif;
  font-weight: 700;
  color: #333333;
}

.logo-m {
  color: #3a863e;
}

.logo-app {
  font-family: 'Jaro', sans-serif;
  color: #3a863e;
  text-transform: uppercase;
  font-size: 0.6em;
  vertical-align: baseline;
  display: inline-block;
  margin-left: 2px;
}

.nav-links {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.nav-link {
  text-decoration: none;
  color: #374151;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #3a863e;
}

.nav-link-primary {
  background: #3a863e;
  color: white !important;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
}

.nav-link-primary:hover {
  background: #2d6b31;
}

@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-links {
    gap: 1rem;
  }
}
`;

// Function to inject navigation into HTML files
function injectNavigation(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove old navigation if it exists (multiple patterns)
    content = content.replace(/<!-- Website Header -->[\s\S]*?<\/header>/g, '');
    content = content.replace(/<header class="website-header">[\s\S]*?<\/header>/g, '');
    content = content.replace(/<nav class="main-navigation">[\s\S]*?<\/nav>/g, '');
    
    // Remove old navigation CSS if it exists (inline styles)
    content = content.replace(/\.main-navigation[\s\S]*?}/g, '');
    content = content.replace(/\.nav-container[\s\S]*?}/g, '');
    content = content.replace(/\.nav-logo[\s\S]*?}/g, '');
    content = content.replace(/\.nav-links[\s\S]*?}/g, '');
    content = content.replace(/\.nav-link[\s\S]*?}/g, '');
    content = content.replace(/\.logo-text[\s\S]*?}/g, '');
    content = content.replace(/\.logo-segmentor[\s\S]*?}/g, '');
    content = content.replace(/\.logo-m[\s\S]*?}/g, '');
    content = content.replace(/\.logo-app[\s\S]*?}/g, '');
    
    // Remove old font imports and @font-face declarations (more comprehensive patterns)
    content = content.replace(/@import url\([^)]*fonts\.googleapis\.com[^)]*Jaro[^)]*\);/g, '');
    content = content.replace(/@import url\([^)]*fonts\.googleapis\.com[^)]*Montserrat[^)]*\);/g, '');
    content = content.replace(/@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=Jaro[^']*'\);/g, '');
    content = content.replace(/@import url\('https:\/\/fonts\.googleapis\.com\/css2\?family=Montserrat[^']*'\);/g, '');
    content = content.replace(/@font-face[\s\S]{0,500}font-family:\s*['"]Montserrat['"][\s\S]{0,500}?}/g, '');
    content = content.replace(/@font-face[\s\S]{0,500}font-family:\s*['"]Jaro['"][\s\S]{0,500}?}/g, '');
    
    // Remove duplicate empty CSS comment blocks and media queries (more aggressive)
    // Remove all instances of these comment patterns, even if followed by empty lines
    content = content.replace(/\/\*\s*Font Face Declarations[^*]*\*\/[\s\n]*/g, '');
    content = content.replace(/\/\*\s*Import Google Fonts[^*]*\*\/[\s\n]*/g, '');
    content = content.replace(/\/\*\s*Jaro font[^*]*\*\/[\s\n]*/g, '');
    content = content.replace(/\/\*\s*Fallback: If local fonts fail[^*]*\*\/[\s\n]*/g, '');
    // Remove empty media queries
    content = content.replace(/@media\s*\([^)]*\)\s*\{[\s\n]*\}/g, '');
    // Remove excessive blank lines (4+ consecutive newlines)
    content = content.replace(/\n\s*\n\s*\n\s*\n+/g, '\n\n');
    
    // Remove empty style blocks
    content = content.replace(/<style>\s*<\/style>/g, '');
    content = content.replace(/<style>\s*\/\*[\s\S]*?\*\/\s*<\/style>/g, '');
    
    // Always inject fresh navigation (don't check if it exists, just replace)
    
    // Remove old preload links (remove any existing font preloads)
    content = content.replace(/<link rel="preload" href="\/fonts\/[^"]*"[^>]*>/g, '');
    
    // Inject font preload links in head (for faster font loading)
    if (content.includes('<head>')) {
      // Always add preload links after <head> tag (replace first occurrence only)
      const headMatch = content.match(/<head>/);
      if (headMatch) {
        content = content.replace(
          /<head>/,
          `<head>${fontPreloadHTML}`
        );
      }
    }
    
    // Inject CSS in head (always inject fresh, we've already removed old CSS above)
    if (content.includes('<head>')) {
      // Find the first <style> tag or insert before </head>
      if (content.includes('<style>')) {
        // Insert before first style tag
        content = content.replace(
          '<style>',
          `<style>${navigationCSS}\n`
        );
      } else {
        // Insert after <head>
        content = content.replace(
          '<head>',
          `<head>\n<style>${navigationCSS}</style>`
        );
      }
    }
    
    // Inject navigation after opening body tag
    if (content.includes('<body>')) {
      content = content.replace(
        '<body>',
        `<body>\n${navigationHTML}`
      );
    } else if (content.includes('<body ')) {
      // Handle body tag with attributes
      content = content.replace(
        /<body[^>]*>/,
        `$&\n${navigationHTML}`
      );
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Navigation injected into ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Main function
function buildNavigation() {
  console.log('🚀 Building navigation for GitHub Pages...');
  
  const publicDir = path.join(__dirname, '..', 'public');
  const buildDir = path.join(__dirname, '..', 'build');
  
  // List of HTML files to process
  const htmlFiles = [
    'index.html',
    'about.html', 
    'faq.html',
    'contact.html',
    'privacy.html',
    'terms.html',
    'brand-plus.html',
    '404.html'
  ];
  
  // Process files in public directory
  htmlFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    if (fs.existsSync(filePath)) {
      injectNavigation(filePath);
    }
  });
  
  // Process files in build directory (after React build)
  htmlFiles.forEach(file => {
    const filePath = path.join(buildDir, file);
    if (fs.existsSync(filePath)) {
      injectNavigation(filePath);
    }
  });
  
  console.log('✅ Navigation build complete!');
}

// Run if called directly
if (require.main === module) {
  buildNavigation();
}

module.exports = { buildNavigation, injectNavigation };
