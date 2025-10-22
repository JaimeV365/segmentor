#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to remove old navigation from HTML files
function cleanupOldNavigation(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove old header navigation
    content = content.replace(/<!-- Website Header -->[\s\S]*?<\/header>/g, '');
    content = content.replace(/<header class="website-header">[\s\S]*?<\/header>/g, '');
    
    // Remove old header CSS link
    content = content.replace(/<link rel="stylesheet" href="\/assets\/css\/header\.css">\s*/g, '');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Cleaned up old navigation in ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Main function
function cleanupAllFiles() {
  console.log('🧹 Cleaning up old navigation...');
  
  const publicDir = path.join(__dirname, '..', 'public');
  const buildDir = path.join(__dirname, '..', 'build');
  
  // List of HTML files to process
  const htmlFiles = [
    'index.html',
    'about.html', 
    'faq.html',
    '404.html'
  ];
  
  // Process files in public directory
  htmlFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    if (fs.existsSync(filePath)) {
      cleanupOldNavigation(filePath);
    }
  });
  
  // Process files in build directory
  htmlFiles.forEach(file => {
    const filePath = path.join(buildDir, file);
    if (fs.existsSync(filePath)) {
      cleanupOldNavigation(filePath);
    }
  });
  
  console.log('✅ Cleanup complete!');
}

// Run if called directly
if (require.main === module) {
  cleanupAllFiles();
}

module.exports = { cleanupAllFiles, cleanupOldNavigation };
