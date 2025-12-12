#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Cross-platform deploy preparation script
 * Replaces the Unix shell commands in deploy:prepare with Node.js operations
 */
function deployPrepare() {
  console.log('🚀 Preparing deployment...');
  
  const buildDir = path.join(__dirname, '..', 'build');
  const publicDir = path.join(__dirname, '..', 'public');
  const toolDir = path.join(buildDir, 'tool');
  const staticDir = path.join(buildDir, 'static');
  
  // 1. Create build/tool directory and clean it
  if (fs.existsSync(toolDir)) {
    fs.rmSync(toolDir, { recursive: true, force: true });
  }
  fs.mkdirSync(toolDir, { recursive: true });
  console.log('✅ Created/cleaned build/tool/');
  
  // 2. Copy build/static to build/tool/static
  if (fs.existsSync(staticDir)) {
    copyRecursive(staticDir, path.join(toolDir, 'static'));
    console.log('✅ Copied build/static to build/tool/static');
  } else {
    console.log('⚠️  build/static not found');
  }
  
  // 3. Run fix-tool-index.js
  const { fixToolIndex } = require('./fix-tool-index.js');
  fixToolIndex();
  
  // 4. Copy files from build/ to build/tool/ (optional files with error handling)
  const filesToCopy = [
    { src: 'asset-manifest.json', dest: 'asset-manifest.json' },
    { src: 'manifest.json', dest: 'manifest.json' },
    { src: 'favicon.ico', dest: 'favicon.ico' }
  ];
  
  filesToCopy.forEach(({ src, dest }) => {
    const srcPath = path.join(buildDir, src);
    const destPath = path.join(toolDir, dest);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Copied ${src} to build/tool/`);
    }
  });
  
  // Copy logo files (logo*.png pattern)
  const logoFiles = fs.readdirSync(buildDir).filter(file => 
    file.startsWith('logo') && file.endsWith('.png')
  );
  logoFiles.forEach(file => {
    const srcPath = path.join(buildDir, file);
    const destPath = path.join(toolDir, file);
    fs.copyFileSync(srcPath, destPath);
    console.log(`✅ Copied ${file} to build/tool/`);
  });
  
  // 5. Copy _redirects from public/ to build/
  const redirectsPath = path.join(publicDir, '_redirects');
  const buildRedirectsPath = path.join(buildDir, '_redirects');
  if (fs.existsSync(redirectsPath)) {
    fs.copyFileSync(redirectsPath, buildRedirectsPath);
    console.log('✅ Copied _redirects to build/');
  }
  
  // 6. Copy build HTML files back to public/ (for sync/backup)
  const htmlFiles = [
    'about.html',
    'faq.html',
    'contact.html',
    'privacy.html',
    'terms.html',
    'brand-plus.html',
    '404.html'
  ];
  
  htmlFiles.forEach(file => {
    const srcPath = path.join(buildDir, file);
    const destPath = path.join(publicDir, file);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`✅ Synced ${file} to public/`);
    }
  });
  
  // 7. Copy directories from build/ back to public/ (fonts, icons, assets)
  const dirsToSync = ['fonts', 'icons', 'assets'];
  
  dirsToSync.forEach(dir => {
    const srcPath = path.join(buildDir, dir);
    const destPath = path.join(publicDir, dir);
    if (fs.existsSync(srcPath)) {
      if (fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true, force: true });
      }
      copyRecursive(srcPath, destPath);
      console.log(`✅ Synced ${dir}/ to public/`);
    }
  });
  
  console.log('✅ Deployment preparation complete!');
}

/**
 * Recursively copy directory from source to destination
 */
function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Run if called directly
if (require.main === module) {
  deployPrepare();
}

module.exports = { deployPrepare };
