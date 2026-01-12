# Development Server & Staging Deployment Guide

## Problem: Infinite Redirect Loop in Local Development

When running `npm start` locally, the app enters an infinite redirect loop because:
1. `public/index.html` contains a meta refresh redirect to `/tool/` (line 14)
2. The `homepage: "/tool"` setting in `package.json` makes React serve from that path
3. This creates a redirect loop when accessing the root URL

## Solution 1: Use Development Script (Recommended)

### Quick Fix

Use the new `start:dev` script instead of `start`:

```bash
npm run start:dev
```

This script:
- Automatically comments out the redirect in `public/index.html` before starting
- Starts the dev server without auto-opening browser
- Serves the app correctly
- **Navigate to:** `http://localhost:3000/tool/` in your browser

**After you're done developing**, restore the original file:
```bash
npm run restore:dev
```

This restores the redirect for production builds.

### Why This Works

The `start:dev` script:
- Uses `BROWSER=none` to prevent auto-opening (which would hit the redirect)
- Still serves from the correct path due to `homepage: "/tool"` setting
- You manually navigate to `/tool/` which bypasses the root redirect

## Solution 2: Cloudflare Pages Preview Deployments (Best for Testing)

For testing features without publishing publicly, use Cloudflare Pages preview deployments.

### How It Works

Cloudflare Pages automatically creates preview deployments for:
- **Pull Requests**: Every PR gets its own preview URL
- **Feature Branches**: Any branch pushed to GitHub gets a preview
- **Commits**: Each commit on a branch gets a unique preview

### Preview URL Format

```
https://<branch-name>--<project-name>.pages.dev
```

Example:
```
https://feature-progress-report--segmentor.pages.dev
```

### Setup (Usually Already Configured)

1. **Check Cloudflare Pages Settings:**
   - Go to Cloudflare Dashboard → Pages → Your Project
   - Check "Builds and deployments" section
   - Preview deployments should be enabled by default

2. **If Not Enabled:**
   - Go to Settings → Builds & deployments
   - Ensure "Preview deployments" is checked
   - Save changes

### Usage Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feature-progress-report
   ```

2. **Make your changes and commit:**
   ```bash
   git add .
   git commit -m "Add progress report feature"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin feature-progress-report
   ```

4. **Get Preview URL:**
   - Cloudflare automatically builds and deploys
   - Check Cloudflare Dashboard → Pages → Your Project → Deployments
   - Or check GitHub PR (if you create one) - Cloudflare bot comments with preview URL

5. **Share Privately:**
   - Preview URLs are not indexed by search engines
   - Only accessible to people with the URL
   - Perfect for testing before merging to main

### Benefits

- ✅ **No public exposure** - Preview URLs are private
- ✅ **Automatic** - No manual deployment needed
- ✅ **Multiple environments** - Test different features simultaneously
- ✅ **Production-like** - Same environment as production
- ✅ **Easy sharing** - Share URL with team/stakeholders

## Solution 3: Alternative Local Development Setup

If you prefer to fix the redirect issue completely:

### Option A: Temporarily Comment Redirect

1. Open `public/index.html`
2. Comment out line 14:
   ```html
   <!-- <meta http-equiv="refresh" content="0; url=/tool/"> -->
   ```
3. Run `npm start` normally
4. **Remember to uncomment before committing!**

### Option B: Create Dev-Specific Index

1. Create `public/index.dev.html` (copy of `index.html` without redirect)
2. Create a script to swap files before starting:
   ```json
   "start:local": "node scripts/prepare-dev.js && react-scripts start"
   ```

## Recommended Workflow

### For Quick Local Development:
```bash
npm run start:dev
# Then navigate to http://localhost:3000/tool/
```

### For Testing Before Publishing:
1. Create feature branch
2. Push to GitHub
3. Use Cloudflare preview URL
4. Test thoroughly
5. Merge to main when ready

## Troubleshooting

### Issue: Still Getting Redirect Loop

**Solution:** Make sure you're navigating to `http://localhost:3000/tool/` not `http://localhost:3000/`

### Issue: Cloudflare Preview Not Building

**Check:**
1. Cloudflare Pages is connected to your GitHub repo
2. Build settings are correct (see `docs/development/cloudflare-pages-config.md`)
3. Branch name doesn't contain special characters (use hyphens)

### Issue: Preview URL Not Accessible

**Check:**
1. Build completed successfully in Cloudflare Dashboard
2. URL is correct (check Deployments tab)
3. No authentication required (unless configured)

## Summary

- **Local Dev:** Use `npm run start:dev` and navigate to `/tool/`
- **Testing:** Use Cloudflare Pages preview deployments (automatic)
- **Production:** Merge to main branch (auto-deploys to production)

No additional Cloudflare setup needed - preview deployments work automatically once your repo is connected to Cloudflare Pages.
