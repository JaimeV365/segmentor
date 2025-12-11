# Cloudflare Pages Configuration

## Required Settings

For the segmentor.app project, Cloudflare Pages must be configured with the following settings:

### Build Settings

1. **Build command:** `npm run build`
   - This builds the React application and prepares all static files
   - The build process includes:
     - React app compilation
     - Navigation injection into HTML files
     - Copying build output to `public/tool/`
     - Fixing root `index.html` redirect

2. **Build output directory:** `public`
   - Cloudflare Pages serves files from the `public/` directory
   - The React app is located at `public/tool/` after build

3. **Deploy command:** `cd workers && npx wrangler deploy`
   - This deploys the Cloudflare Worker for Brand+ authentication
   - Runs AFTER the build completes
   - Deploys the API endpoint at `segmentor.jaime-f57.workers.dev`

### Environment Variables

No special environment variables are required for the build process.

### Root Directory

Leave as default (project root).

## Build Process Flow

1. **Install dependencies:** `npm clean-install`
2. **Build React app:** `npm run build`
   - Compiles React app to `build/` directory
   - Runs navigation injection scripts
   - Copies build output to `public/tool/`
   - Creates redirect `index.html` at root
3. **Deploy Worker:** `cd workers && npx wrangler deploy`
   - Deploys Cloudflare Worker for API endpoints

## Troubleshooting

### Build Step Skipped

If the build step is being skipped, check:
- Build command is set to `npm run build` (not empty)
- Build output directory is set to `public`
- No conflicting configuration files

### Infinite Redirect Loop

If experiencing redirect loops:
- Ensure `public/tool/index.html` exists after build
- Check `public/_redirects` file has SPA fallback rule: `/tool/* /tool/index.html 200`

### Worker Not Deploying

If the Worker isn't deploying:
- Check deploy command: `cd workers && npx wrangler deploy`
- Verify `workers/wrangler.toml` exists
- Check Worker has proper KV namespace bindings configured
