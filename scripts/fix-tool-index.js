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
  const assetManifestPath = path.join(buildDir, 'asset-manifest.json');
  
  let reactIndex;
  
  // Try to read React's index.html from build directory
  if (fs.existsSync(buildIndexPath)) {
    const content = fs.readFileSync(buildIndexPath, 'utf8');
    // Check if it's actually a React app (not a redirect file)
    if (content.includes('<div id="root"></div>') && !content.includes('Redirecting')) {
      reactIndex = content;
      console.log('✅ Found React app index.html in build/');
    } else {
      console.log('⚠️  build/index.html exists but appears to be a redirect file, generating from asset-manifest...');
      reactIndex = generateReactIndex(assetManifestPath);
    }
  } else {
    // If build/index.html doesn't exist, generate it from asset-manifest
    console.log('⚠️  build/index.html not found, generating from asset-manifest...');
    reactIndex = generateReactIndex(assetManifestPath);
  }
  
  // Ensure tool directory exists
  const toolDir = path.join(buildDir, 'tool');
  if (!fs.existsSync(toolDir)) {
    fs.mkdirSync(toolDir, { recursive: true });
  }
  
  // Write React's index.html to tool/index.html (overwriting any redirect file)
  fs.writeFileSync(toolIndexPath, reactIndex, 'utf8');
  
  // Inject navigation into the generated HTML
  injectNavigation(toolIndexPath);
  
  // Ensure Cloudflare Web Analytics beacon and Umami are present (e.g. when content came from build/index.html)
  let finalContent = fs.readFileSync(toolIndexPath, 'utf8');
  const cfBeacon = '<!-- Cloudflare Web Analytics --><script defer src=\'https://static.cloudflareinsights.com/beacon.min.js\' data-cf-beacon=\'{"token": "7d77bf377e604da0a3435a5817a2e33a"}\'></script><!-- End Cloudflare Web Analytics -->';
  const umamiScript = '<script defer src="https://cloud.umami.is/script.js" data-website-id="7ca02d83-acd6-4fe7-b273-2b1efd01c7bb"></script>';
  if (!finalContent.includes('cloudflareinsights.com')) {
    finalContent = finalContent.replace('</body>', cfBeacon + '\n  ' + umamiScript + '\n  </body>');
    fs.writeFileSync(toolIndexPath, finalContent, 'utf8');
    console.log('   Cloudflare Web Analytics beacon injected');
  } else if (!finalContent.includes('cloud.umami.is')) {
    finalContent = finalContent.replace('</body>', umamiScript + '\n  </body>');
    fs.writeFileSync(toolIndexPath, finalContent, 'utf8');
    console.log('   Umami script injected');
  }
  
  console.log('✅ Copied/generated React app index.html to build/tool/index.html');
  console.log('   Removed any redirect file that was there');
  console.log('   Navigation injected');
}

function injectNavigation(filePath) {
  const { injectNavigation: injectNav } = require('./build-navigation.js');
  injectNav(filePath);
}

function generateReactIndex(assetManifestPath) {
  if (!fs.existsSync(assetManifestPath)) {
    console.error('❌ ERROR: build/asset-manifest.json does not exist!');
    console.error('   React app may not have built correctly.');
    process.exit(1);
  }
  
  const assetManifest = JSON.parse(fs.readFileSync(assetManifestPath, 'utf8'));
  const cssFiles = assetManifest.entrypoints.filter(f => f.endsWith('.css'));
  const jsFiles = assetManifest.entrypoints.filter(f => f.endsWith('.js'));
  
  console.log(`   Found ${cssFiles.length} CSS files and ${jsFiles.length} JS files in asset-manifest`);
  
  // Generate React app HTML template with correct paths for /tool/ base
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="/tool/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="google" content="notranslate" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Professional customer segmentation tool using the Apostles Model methodology" />
    <link rel="apple-touch-icon" href="/tool/logo192.png" />
    <link rel="manifest" href="/tool/manifest.json" />
    ${cssFiles.map(css => `<link rel="stylesheet" href="/tool/${css}" />`).join('\n    ')}
    <title>segmentor.app - Customer Segmentation Tool</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
    ${jsFiles.map(js => `<script src="/tool/${js}"></script>`).join('\n    ')}
    <script src="/logo-replacement.js"></script>
    <!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "7d77bf377e604da0a3435a5817a2e33a"}'></script><!-- End Cloudflare Web Analytics -->
    <script defer src="https://cloud.umami.is/script.js" data-website-id="7ca02d83-acd6-4fe7-b273-2b1efd01c7bb"></script>
  </body>
</html>`;
}

// Run if called directly
if (require.main === module) {
  fixToolIndex();
}

module.exports = { fixToolIndex };
