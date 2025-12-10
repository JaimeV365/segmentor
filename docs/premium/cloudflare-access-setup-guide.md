# Cloudflare Access Setup Guide - Step by Step

## Overview

This guide will help you verify and configure your Cloudflare Access application for Brand+ authentication.

---

## Step 1: Access Cloudflare Zero Trust Dashboard

1. **Log into Cloudflare Dashboard**
   - Go to: https://dash.cloudflare.com/
   - Sign in with your Cloudflare account

2. **Navigate to Zero Trust**
   - In the left sidebar, look for **"Zero Trust"** (it might be under "More Products" or directly visible)
   - Click on **"Zero Trust"**
   - If you don't see it, you may need to enable Zero Trust first (it's free for up to 50 users)

---

## Step 2: Find Your Access Applications

1. **Go to Access → Applications**
   - In the Zero Trust dashboard, look for **"Access"** in the left sidebar
   - Click on **"Access"**
   - Then click on **"Applications"**

2. **View Your Applications**
   - You should see a list of all your Access applications
   - Look for your Brand+ application (you mentioned you created it)
   - If you see multiple applications, identify which one is for Brand+

---

## Step 3: Check Application Configuration

Click on your **Brand+ application** to view its details. You should see:

### Application Details Section

Look for these fields:

1. **Application Name**
   - Should be something like "Brand+ Authentication" or similar

2. **Application Domain**
   - This should be: `segmentor.pages.dev` (or your custom domain)
   - **This is important!** It must match your actual domain

3. **Session Duration**
   - How long users stay logged in (e.g., 24 hours)

### Application URL / Path

This is the key part! Look for:

- **"Self-hosted"** or **"Path"** field
- It should show something like:
  - `/brand-plus-auth` 
  - Or the full URL: `https://segmentor.pages.dev/brand-plus-auth`

**What to check:**
- ✅ If you see `/brand-plus-auth` listed → Good! It's configured
- ❌ If you don't see a path, or see a different path → We need to configure it

---

## Step 4: Verify the Protected Route

### Option A: If Path is Already Set

If you see `/brand-plus-auth` in the application:

1. **Test the URL directly:**
   - Open a new incognito/private browser window
   - Go to: `https://segmentor.pages.dev/brand-plus-auth`
   - **What should happen:**
     - ✅ You should see the Cloudflare login page
     - ❌ If you see your homepage or get redirected → The path isn't working correctly

### Option B: If Path is NOT Set

If you don't see `/brand-plus-auth` configured:

1. **Edit the Application:**
   - Click the **"Edit"** button on your Brand+ application
   - Look for **"Application domain"** or **"Path"** field
   - Add or change it to: `/brand-plus-auth`
   - Save the changes

---

## Step 5: Check Access Policies

1. **In the Application Details, scroll to "Policies"**
   - You should see policies that define who can access

2. **Verify Policy Rules:**
   - Should include email addresses of Brand+ users
   - Or email domains (like `@yourcompany.com`)

3. **Check Policy Action:**
   - Should be set to **"Allow"**

---

## Step 6: Find the Application URL

The Cloudflare Access application doesn't have a "public URL" in the traditional sense. Instead:

1. **The URL is your domain + the protected path:**
   - Format: `https://[your-domain]/[protected-path]`
   - Example: `https://segmentor.pages.dev/brand-plus-auth`

2. **To verify this is correct:**
   - The application domain should match your site domain
   - The path should be `/brand-plus-auth`

---

## Step 7: Test the Configuration

### Test 1: Direct URL Access

1. Open an incognito/private browser window
2. Navigate to: `https://segmentor.pages.dev/brand-plus-auth`
3. **Expected result:**
   - ✅ Cloudflare login page appears
   - ❌ Homepage appears → Path not configured correctly
   - ❌ 404 error → Path doesn't exist or wrong domain

### Test 2: Check Browser Console

1. Open `/brand-plus.html` in your browser
2. Open Developer Tools (F12)
3. Go to **Console** tab
4. Look for any errors related to the iframe
5. Check **Network** tab to see if `/brand-plus-auth` is being requested

---

## Common Issues and Solutions

### Issue 1: Seeing Homepage Instead of Login

**Possible causes:**
- Path `/brand-plus-auth` is not configured in Cloudflare Access
- Application domain doesn't match your actual domain
- Route is not protected (no policy applied)

**Solution:**
- Verify the path in Cloudflare Access application settings
- Make sure application domain matches exactly (including subdomain)
- Ensure at least one policy is configured

### Issue 2: 404 Error

**Possible causes:**
- The path doesn't exist on your site
- Cloudflare Access isn't intercepting the route

**Solution:**
- Cloudflare Access should intercept the route even if it doesn't exist physically
- Check that the application is active/enabled
- Verify the domain matches

### Issue 3: Iframe Shows Error

**Possible causes:**
- X-Frame-Options header blocking iframe
- CORS issues
- Cloudflare Access doesn't allow iframe embedding

**Solution:**
- Cloudflare Access login pages may not work in iframes
- We may need to use redirect instead of iframe (fallback is already in code)

---

## Step 8: Alternative - Use Full Redirect

If the iframe approach doesn't work, we can use a redirect instead:

1. **Change the iframe to a button that redirects:**
   - User clicks button
   - Redirects to `/brand-plus-auth`
   - After login, redirects back to `/brand-plus.html?auth=success`

This is already implemented as a fallback in the code.

---

## Quick Checklist

Before testing, verify:

- [ ] Zero Trust is enabled in your Cloudflare account
- [ ] Brand+ Access application exists
- [ ] Application domain matches your site domain (`segmentor.pages.dev`)
- [ ] Path is set to `/brand-plus-auth` (or similar)
- [ ] At least one Access policy is configured with Brand+ user emails
- [ ] Application is active/enabled

---

## Next Steps

Once you've verified the configuration:

1. **Share what you found:**
   - What path is configured? (if any)
   - What domain is set?
   - Does `/brand-plus-auth` show the login page when accessed directly?

2. **We'll update the code:**
   - If the path is different, we'll update the iframe URL
   - If iframe doesn't work, we'll switch to redirect mode

---

## Screenshots Guide (What to Look For)

### In Cloudflare Dashboard:

1. **Zero Trust → Access → Applications**
   - Should show your Brand+ application

2. **Application Details:**
   - **Application domain:** `segmentor.pages.dev`
   - **Path:** `/brand-plus-auth` (or blank if not set)
   - **Status:** Active/Enabled

3. **Policies Section:**
   - Should list policies with email addresses
   - Action should be "Allow"

---

## Still Stuck?

If you can't find these settings:

1. **Check if Zero Trust is enabled:**
   - Go to Cloudflare Dashboard
   - Look for "Zero Trust" in sidebar
   - If missing, you may need to enable it first

2. **Check application status:**
   - Make sure the application is not paused/disabled
   - Look for an "Enable" or "Activate" button

3. **Verify domain:**
   - Make sure your site domain is added to Cloudflare
   - The domain in Access application must match exactly

---

## Contact Points

If you need help:
- Cloudflare Support: https://support.cloudflare.com/
- Cloudflare Community: https://community.cloudflare.com/
- Zero Trust Documentation: https://developers.cloudflare.com/cloudflare-one/

