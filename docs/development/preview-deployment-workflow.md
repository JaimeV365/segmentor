# Preview Deployment Workflow Guide

## Overview

Cloudflare Pages automatically creates **preview deployments** for every branch you push to GitHub. These previews are:
- ✅ **Private** - Not indexed by search engines, only accessible via direct URL
- ✅ **Safe** - Never affect your live production site at `segmentor.app`
- ✅ **Automatic** - Created automatically when you push a branch
- ✅ **Perfect for Testing** - Test features before merging to production

## Important: What Goes Live vs. What Doesn't

### 🟢 **LIVE (Production)** - `segmentor.app`
- Only the **`main`** branch deploys to production
- Changes merged to `main` automatically go live
- This is your public website

### 🟡 **PREVIEW (Testing)** - `https://[hash].segmentor.pages.dev`
- All other branches create preview deployments
- Preview URLs are private and safe for testing
- Never affect production

## Safe Workflow: Testing New Features

### Step 1: Create a Feature Branch

**Always start from `main` branch:**

```bash
# Make sure you're on main and it's up to date
git checkout main
git pull origin main

# Create a new branch for your feature
git checkout -b feature-progress-report
```

**Branch Naming Convention:**
- `feature-` prefix for new features (e.g., `feature-progress-report`)
- `fix-` prefix for bug fixes (e.g., `fix-date-filter`)
- `test-` prefix for testing (e.g., `test-preview-deployment`)

### Step 2: Make Your Changes

Work on your feature, make commits as you go:

```bash
# Make your code changes in your editor
# Then commit them
git add .
git commit -m "Add progress report component"
```

### Step 3: Push to Create Preview

```bash
# Push your branch (this creates the preview automatically)
git push origin feature-progress-report
```

**What happens:**
- Cloudflare detects the new branch
- Automatically builds and deploys it
- Creates a preview URL (takes 1-2 minutes)

### Step 4: Get Your Preview URL

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** → **segmentor** project
3. Click **Deployments** tab
4. Find your branch's preview deployment (labeled "Preview")
5. Click on it to see the preview URL
6. URL format: `https://[hash].segmentor.pages.dev/tool/`

### Step 5: Test Your Preview

1. Open the preview URL in your browser
2. Test all functionality thoroughly
3. Share the URL with team/stakeholders if needed
4. Make additional changes if needed (repeat steps 2-4)

### Step 6: When Ready, Merge to Production

**Only merge to `main` when you're 100% satisfied with testing:**

```bash
# Switch back to main
git checkout main
git pull origin main

# Merge your feature branch
git merge feature-progress-report

# Push to main (THIS WILL GO LIVE!)
git push origin main
```

**⚠️ WARNING:** Pushing to `main` automatically deploys to `segmentor.app` (production)

## Safety Checklist: Before Merging to Main

Before you merge to `main`, verify:

- [ ] ✅ Tested the preview URL thoroughly
- [ ] ✅ All features work as expected
- [ ] ✅ No console errors
- [ ] ✅ No broken functionality
- [ ] ✅ Code is ready for production
- [ ] ✅ You're on the correct branch (`main`)
- [ ] ✅ You've pulled latest changes from `main`

## Common Mistakes to Avoid

### ❌ **DON'T: Push directly to main**
```bash
# WRONG - This goes live immediately!
git checkout main
git add .
git commit -m "New feature"
git push origin main  # ⚠️ This deploys to production!
```

### ✅ **DO: Use a feature branch**
```bash
# CORRECT - Safe testing workflow
git checkout -b feature-name
git add .
git commit -m "New feature"
git push origin feature-name  # ✅ Creates preview only
```

### ❌ **DON'T: Test on production**
- Never test new features on `segmentor.app`
- Always use preview deployments

### ✅ **DO: Test on preview URLs**
- Always test on preview URLs first
- Only merge to `main` after thorough testing

## How to Verify You're on the Right Branch

**Before making changes, always check:**

```bash
# See current branch
git branch

# Or see branch with more info
git status
```

**You should see:**
- `* feature-name` (if working on a feature)
- `* main` (only if you're ready to deploy to production)

## Quick Reference Commands

### Create and Test a Feature
```bash
git checkout main                    # Start from main
git pull origin main                 # Get latest
git checkout -b feature-name         # Create branch
# ... make changes ...
git add .
git commit -m "Description"
git push origin feature-name         # Creates preview
# ... test preview URL ...
```

### Deploy to Production (When Ready)
```bash
git checkout main                    # Switch to main
git pull origin main                 # Get latest
git merge feature-name               # Merge feature
git push origin main                 # ⚠️ Deploys to production!
```

### View All Branches
```bash
git branch                           # Local branches
git branch -r                        # Remote branches
```

### Delete a Feature Branch (After Merging)
```bash
# Delete local branch
git branch -d feature-name

# Delete remote branch (and its preview)
git push origin --delete feature-name
```

## Finding Your Preview URL

### Method 1: Cloudflare Dashboard
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Pages → segmentor → Deployments
3. Find your branch's preview deployment
4. Click to get the URL

### Method 2: GitHub Pull Request
1. Create a Pull Request on GitHub
2. Cloudflare bot will comment with preview URL
3. Or check the PR's "Checks" section

## Troubleshooting

### Preview Not Appearing?
- Wait 1-2 minutes (build takes time)
- Check Cloudflare Deployments tab
- Verify branch was pushed successfully: `git push origin branch-name`

### Wrong Branch?
```bash
# Check current branch
git branch

# Switch to correct branch
git checkout branch-name
```

### Accidentally Pushed to Main?
- If you catch it immediately, you can revert
- Check Cloudflare Deployments to see if it deployed
- Consider using branch protection rules in GitHub

## Best Practices

1. **Always work in feature branches** - Never commit directly to `main`
2. **Test thoroughly** - Use preview URLs for all testing
3. **Keep main clean** - Only merge tested, working code
4. **Use descriptive branch names** - Makes it easy to identify previews
5. **Delete old branches** - Clean up after merging

## Summary

- ✅ **Feature branches** = Preview deployments (safe testing)
- ✅ **Main branch** = Production deployment (goes live)
- ✅ **Always test on preview** before merging to main
- ✅ **Preview URLs are private** - safe to share for testing
- ⚠️ **Pushing to main deploys to production** - be careful!

---

**Remember:** When in doubt, create a feature branch and test on preview first!
