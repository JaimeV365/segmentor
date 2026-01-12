#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Development index.html preparation script
 * Temporarily comments out the meta refresh redirect in public/index.html
 */
function prepareDevIndex() {
  console.log('🔧 Preparing public/index.html for development...');
  
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');
  const backupPath = path.join(__dirname, '..', 'public', 'index.html.backup');
  
  if (!fs.existsSync(indexPath)) {
    console.log('❌ public/index.html does not exist');
    return;
  }
  
  // Read the file
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Check if already prepared (redirect is commented)
  if (content.includes('<!-- <meta http-equiv="refresh"')) {
    console.log('ℹ️  public/index.html is already prepared for development');
    return;
  }
  
  // Create backup if it doesn't exist
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(indexPath, backupPath);
    console.log('✅ Created backup: public/index.html.backup');
  }
  
  // Comment out the meta refresh redirect
  content = content.replace(
    /<meta http-equiv="refresh" content="0; url=\/tool\/">/,
    '<!-- <meta http-equiv="refresh" content="0; url=/tool/"> -->'
  );
  
  // Write the modified content
  fs.writeFileSync(indexPath, content, 'utf8');
  console.log('✅ Commented out redirect in public/index.html');
  console.log('   Dev server should now work without redirect loop');
}

// Run if called directly
if (require.main === module) {
  prepareDevIndex();
}

module.exports = { prepareDevIndex };
