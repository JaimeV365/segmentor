#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Development setup script
 * Temporarily renames public/tool/index.html redirect file so dev server works
 */
function setupDev() {
  console.log('🔧 Setting up development environment...');
  
  const toolIndexPath = path.join(__dirname, '..', 'public', 'tool', 'index.html');
  const redirectBackupPath = path.join(__dirname, '..', 'public', 'tool', 'index.html.redirect');
  
  // If redirect file exists, rename it
  if (fs.existsSync(toolIndexPath)) {
    // Check if it's a redirect file (contains "Redirecting to")
    const content = fs.readFileSync(toolIndexPath, 'utf8');
    if (content.includes('Redirecting to segmentor.app')) {
      fs.renameSync(toolIndexPath, redirectBackupPath);
      console.log('✅ Renamed public/tool/index.html to index.html.redirect');
      console.log('   The React dev server will now serve the app correctly');
    } else {
      console.log('ℹ️  public/tool/index.html is not a redirect file, leaving it as is');
    }
  } else {
    console.log('ℹ️  public/tool/index.html does not exist');
  }
}

// Run if called directly
if (require.main === module) {
  setupDev();
}

module.exports = { setupDev };
