# Cloudflare Worker Setup Guide - User Permissions API

## Overview

This guide will help you create and deploy the Cloudflare Worker that handles Brand+ user authentication verification.

## Why We Need This

- Cloudflare Access authenticates users (checks if they can access protected routes)
- But it doesn't tell us if they're a Brand+ subscriber
- The Worker checks the user's email against your Brand+ user list
- Returns whether they have Brand+ access

## Step-by-Step Setup

### Option A: Deploy via Cloudflare Dashboard (Recommended for First Time)

#### Step 1: Create the Worker

1. **Go to Cloudflare Dashboard**
   - Navigate to: https://dash.cloudflare.com/
   - Sign in

2. **Go to Workers & Pages**
   - In the left sidebar, click **"Workers & Pages"**
   - Click **"Create application"**
   - Click **"Create Worker"**

3. **Configure Your Worker Project**
   - **Project name:** `segmentor` (or `segmentor-user-permissions`)
   - **Build command:** Leave empty (no build step needed)
   - **Deploy command:** `npx wrangler deploy`
   - **Path:** `workers/api/` (this is where your worker file is located)
   - **API token:** You'll need to create one (see below)

4. **Create API Token (if needed)**
   - Go to: https://dash.cloudflare.com/profile/api-tokens
   - Click **"Create Token"**
   - Use **"Edit Cloudflare Workers"** template
   - Select your account and zone
   - Copy the token and paste it in the Worker setup

5. **Add the Code**
   - In the Worker editor, delete the default code
   - Copy the code from: `workers/api/user-permissions.js`
   - Paste it into the Worker editor
   - **Update the Brand+ user list:**
     ```javascript
     const BRAND_PLUS_USERS = [
       'your-brand-plus-user@example.com',
       'another-user@example.com',
       // Add all your Brand+ subscriber emails here
     ];
     ```

6. **Deploy**
   - Click **"Deploy"** or **"Save and Deploy"**

#### Step 2: Configure the Route

1. **In the Worker, click "Triggers" tab**
2. **Click "Add Route"**
3. **Configure:**
   - **Route:** `segmentor.pages.dev/api/user-permissions`
   - **Zone:** Select your domain (`segmentor.pages.dev`)
   - Click **"Add route"**

### Option B: Deploy via Wrangler CLI (Alternative Method)

If you prefer using the command line:

1. **Install Wrangler** (if not already installed):
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Navigate to workers directory**:
   ```bash
   cd workers
   ```

4. **Deploy the worker**:
   ```bash
   wrangler deploy
   ```

5. **Configure the route** (in Cloudflare Dashboard):
   - Go to Workers & Pages → Your worker → Triggers
   - Add route: `segmentor.pages.dev/api/user-permissions`

### Step 4: Test the Worker

1. **Go to the Worker's "Settings" tab**
2. **Copy the Worker URL** (for testing)
3. **Test with curl or browser:**
   ```bash
   curl https://segmentor.pages.dev/api/user-permissions
   ```
   Should return: `{"error":"Unauthorized"}` (expected - no auth headers)

### Step 5: Verify It Works

Once deployed, the API will:
- ✅ Return user email and Brand+ status when authenticated
- ✅ Return 401 error when not authenticated
- ✅ Handle CORS properly for browser requests

## Managing Brand+ Users

### Adding New Brand+ Users

1. **Edit the Worker code**
2. **Add email to `BRAND_PLUS_USERS` array:**
   ```javascript
   const BRAND_PLUS_USERS = [
     'existing@user.com',
     'new-brand-plus@user.com', // Add here
   ];
   ```
3. **Save and deploy**

### Using Cloudflare Access Groups (Alternative)

Instead of hardcoding emails, you can use Cloudflare Access Groups:

1. **In Cloudflare Zero Trust → Access → Groups**
2. **Create a group:** "Brand+ Users"
3. **Add emails to the group**
4. **In your Cloudflare Access Application:**
   - Add header: `Cf-Access-Groups`
5. **The Worker will check groups automatically**

## Troubleshooting

### Issue: API returns 401 even after login

**Check:**
- Is the route configured correctly?
- Are you accessing from the same domain?
- Check browser console for CORS errors

### Issue: API returns isPremium: false for Brand+ users

**Check:**
- Is the email in the `BRAND_PLUS_USERS` array?
- Does the email match exactly (case-sensitive)?
- Check Cloudflare Access groups if using that method

### Issue: CORS errors

**Solution:**
- The Worker includes CORS headers
- Make sure the route is configured correctly
- Check that requests include `credentials: 'include'`

## Security Notes

1. **Never expose the Worker code publicly** (it contains user list)
2. **Consider using Cloudflare KV** for large user lists
3. **Validate all inputs** (the Worker does this)
4. **Monitor Worker logs** for suspicious activity

## Next Steps

After setting up the Worker:
1. Test authentication flow
2. Verify Brand+ features activate
3. Add your Brand+ user emails to the list
4. Monitor Worker logs for any issues

## Related Documentation

- `docs/premium/brand-plus-login-setup.md` - Login flow setup
- `docs/premium/cloudflare-access-setup-guide.md` - Access configuration
- `docs/development/deployment-architecture.md` - Overall architecture

