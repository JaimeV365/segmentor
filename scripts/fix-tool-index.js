#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fix the tool/index.html to be the React app, not a redirect file
 * This ensures the React app loads correctly when Cloudflare Pages serves from /build
 */
function fixToolIndex() {
  console.log('🔧 Fixing build/tool/index.html...');
  
  const buildDir = path.join(__dirname, '..', 'build');
  const buildIndexPath = path.join(buildDir, 'index.html');
  const toolIndexPath = path.join(buildDir, 'tool', 'index.html');
  
  // Check if React's index.html exists
  if (!fs.existsSync(buildIndexPath)) {
    console.error('❌ ERROR: build/index.html does not exist!');
    console.error('   React app may not have built correctly.');
    console.error('   Check that homepage in package.json is set correctly.');
    process.exit(1);
  }
  
  // Read React's index.html
  const reactIndex = fs.readFileSync(buildIndexPath, 'utf8');
  
  // Ensure tool directory exists
  const toolDir = path.join(buildDir, 'tool');
  if (!fs.existsSync(toolDir)) {
    fs.mkdirSync(toolDir, { recursive: true });
  }
  
  // Write React's index.html to tool/index.html (overwriting any redirect file)
  fs.writeFileSync(toolIndexPath, reactIndex, 'utf8');
  console.log('✅ Copied React app index.html to build/tool/index.html');
  console.log('   Removed any redirect file that was there');
}

// Run if called directly
if (require.main === module) {
  fixToolIndex();
}

module.exports = { fixToolIndex };
