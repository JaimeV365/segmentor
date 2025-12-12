#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Copy static HTML files from public/ to build/ directory
 * This ensures Cloudflare Pages serves the static HTML files correctly
 */
function copyStaticFiles() {
  console.log('📋 Copying static HTML files to build directory...');
  
  const publicDir = path.join(__dirname, '..', 'public');
  const buildDir = path.join(__dirname, '..', 'build');
  
  // List of static HTML files to copy (excluding index.html which is the React app)
  const staticFiles = [
    'about.html',
    'faq.html',
    'contact.html',
    'privacy.html',
    'terms.html',
    'brand-plus.html',
    '404.html',
    '_redirects',
    'robots.txt',
    'segmentor-logo.png',
    'tm-logo.png'
  ];
  
  // Also copy directories that contain static assets
  const staticDirs = [
    'assets',
    'icons',
    'fonts'
  ];
  
  // Ensure build directory exists
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  
  // Copy static HTML files
  staticFiles.forEach(file => {
    const sourcePath = path.join(publicDir, file);
    const destPath = path.join(buildDir, file);
    
    if (fs.existsSync(sourcePath)) {
      // If it's a directory, copy recursively
      if (fs.statSync(sourcePath).isDirectory()) {
        copyRecursive(sourcePath, destPath);
      } else {
        // Copy file
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ Copied ${file}`);
      }
    } else {
      console.log(`⚠️  File not found: ${file}`);
    }
  });
  
  // Copy static directories
  staticDirs.forEach(dir => {
    const sourcePath = path.join(publicDir, dir);
    const destPath = path.join(buildDir, dir);
    
    if (fs.existsSync(sourcePath)) {
      copyRecursive(sourcePath, destPath);
      console.log(`✅ Copied directory ${dir}/`);
    }
  });
  
  console.log('✅ Static files copy complete!');
}

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
  copyStaticFiles();
}

module.exports = { copyStaticFiles };
