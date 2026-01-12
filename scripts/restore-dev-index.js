#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Restore public/index.html after development
 * Restores the meta refresh redirect from backup
 */
function restoreDevIndex() {
  console.log('🔧 Restoring public/index.html...');
  
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  const backupPath = path.join(__dirname, '..', 'public', 'index.html.backup');
  
  if (!fs.existsSync(backupPath)) {
    console.log('ℹ️  No backup file found, nothing to restore');
    return;
  }
  
  // Restore from backup
  fs.copyFileSync(backupPath, indexPath);
  fs.unlinkSync(backupPath);
  console.log('✅ Restored public/index.html from backup');
}

// Run if called directly
if (require.main === module) {
  restoreDevIndex();
}

module.exports = { restoreDevIndex };
