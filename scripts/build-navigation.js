#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Navigation HTML template
const navigationHTML = `
<nav class="main-navigation">
  <div class="nav-container">
    <div class="nav-logo">
      <a href="/">
        <img src="/segmentor-logo.png" alt="Segmentor" />
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

// CSS for navigation
const navigationCSS = `
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

.nav-logo img {
  height: 40px;
  width: auto;
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
    
    // Remove old navigation if it exists
    content = content.replace(/<!-- Website Header -->[\s\S]*?<\/header>/g, '');
    content = content.replace(/<header class="website-header">[\s\S]*?<\/header>/g, '');
    
    // Check if our new navigation already exists
    if (content.includes('main-navigation') && !content.includes('website-header')) {
      console.log(`Navigation already exists in ${filePath}`);
      return;
    }
    
    // Inject CSS in head
    if (content.includes('<head>')) {
      content = content.replace(
        '<head>',
        `<head>\n<style>${navigationCSS}</style>`
      );
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
