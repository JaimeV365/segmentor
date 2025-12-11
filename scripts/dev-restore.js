#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Development restore script
 * Restores public/tool/index.html redirect file after development
 */
function restoreDev() {
  console.log('🔧 Restoring production files...');
  
  const toolIndexPath = path.join(__dirname, '..', 'public', 'tool', 'index.html');
  const redirectBackupPath = path.join(__dirname, '..', 'public', 'tool', 'index.html.redirect');
  
  // If backup exists, restore it
  if (fs.existsSync(redirectBackupPath)) {
    if (fs.existsSync(toolIndexPath)) {
      fs.unlinkSync(toolIndexPath);
    }
    fs.renameSync(redirectBackupPath, toolIndexPath);
    console.log('✅ Restored public/tool/index.html redirect file');
  } else {
    console.log('ℹ️  No backup file to restore');
  }
}

// Run if called directly
if (require.main === module) {
  restoreDev();
}

module.exports = { restoreDev };
