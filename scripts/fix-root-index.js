#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Fix the root index.html to redirect to /tool/ instead of being the React app
 * This ensures static HTML files are served correctly when Cloudflare Pages serves from public/
 */
function fixRootIndex() {
  console.log('🔧 Fixing root index.html...');
  
  const publicDir = path.join(__dirname, '..', 'public');
  const indexPath = path.join(publicDir, 'index.html');
  
  // Create a simple redirect page for root
  const redirectHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>segmentor.app - Professional Customer Segmentation Tool</title>
    <meta http-equiv="refresh" content="0; url=/tool/">
    <link rel="canonical" href="https://segmentor.app/tool/" />
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            color: #2c3e50;
        }
        .redirect-container {
            text-align: center;
            padding: 2rem;
        }
        .logo {
            margin-bottom: 2rem;
        }
        .logo img {
            height: 60px;
            width: auto;
        }
        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3a863e;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .redirect-text {
            font-size: 1.125rem;
            color: #6b7280;
            margin-top: 1rem;
        }
        .link {
            color: #3a863e;
            text-decoration: none;
            margin-top: 1rem;
            display: inline-block;
        }
        .link:hover {
            text-decoration: underline;
        }
    </style>
    <script>
        // Immediate redirect, preserving query parameters
        const queryString = window.location.search;
        const hash = window.location.hash;
        window.location.href = '/tool/' + queryString + hash;
    </script>
</head>
<body>
    <div class="redirect-container">
        <div class="logo">
            <img src="/segmentor-logo.png" alt="segmentor.app" />
        </div>
        <div class="spinner"></div>
        <div class="redirect-text">Redirecting to segmentor.app...</div>
        <a href="/tool/" class="link">Click here if you are not redirected</a>
    </div>
    <script>
        // Fallback redirect, preserving query parameters
        setTimeout(() => {
            const queryString = window.location.search;
            const hash = window.location.hash;
            window.location.href = '/tool/' + queryString + hash;
        }, 500);
    </script>
</body>
</html>`;

  fs.writeFileSync(indexPath, redirectHTML, 'utf8');
  console.log('✅ Root index.html updated to redirect to /tool/');
}

// Run if called directly
if (require.main === module) {
  fixRootIndex();
}

module.exports = { fixRootIndex };
