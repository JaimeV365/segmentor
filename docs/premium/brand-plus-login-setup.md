# Brand+ Login Integration Setup Guide

## Overview

The Brand+ page (`/brand-plus.html`) now includes an integrated sign-in flow that allows existing Brand+ users to authenticate directly on the page without navigating away. This follows Top Tasks principles by prioritizing the most common user action (signing in) while keeping upgrade options accessible below.

## Page Structure

The page is organized with Top Tasks priority:

1. **Sign In Section (Primary)** - Top of page
   - For existing Brand+ users who need to authenticate
   - Most frequent task, most prominent position

2. **Divider** - Visual separation

3. **Pricing/Upgrade Section (Secondary)** - Below the fold
   - For new users considering Brand+
   - Less frequent task, accessible via scroll

## Cloudflare Access Configuration

### Step 1: Create Protected Route

Create a Cloudflare Access-protected route that handles authentication:

**Route:** `/brand-plus-auth`

**Purpose:** This route is protected by Cloudflare Access. When users click "Sign in", they're redirected here, which triggers Cloudflare's login flow.

### Step 2: Configure Cloudflare Access Application

1. **Log into Cloudflare Dashboard**
   - Navigate to **Zero Trust** → **Access** → **Applications**
   - Click **Add an application**
   - Choose **Self-hosted** application

2. **Application Settings:**
   - **Application name:** "Brand+ Authentication"
   - **Session duration:** 24 hours (or preferred)
   - **Application domain:** `segmentor.pages.dev` (or your custom domain)
   - **Path:** `/brand-plus-auth`

3. **Access Policies:**
   - **Policy name:** "Brand+ Users"
   - **Action:** Allow
   - **Rules:** 
     - Include: Email addresses of Brand+ subscribers
     - Example: `brandplus@company.com`, `premium@company.com`
   - **Additional headers:** 
     - Send user email: `Cf-Access-Authenticated-User-Email`
     - Send user groups: `Cf-Access-Groups`

4. **Redirect Settings (IMPORTANT):**
   - In your Cloudflare Access application settings, look for:
     - **"Allowed redirect URLs"** or **"Redirect URL"** field
   - Set it to: `https://segmentor.pages.dev/brand-plus.html?auth=success`
   - **Note:** This must be configured in the dashboard - URL parameters won't work
   - This is where users will be redirected after successful authentication

### Step 3: Customize Login Page (Optional but Recommended)

**⚠️ Important Limitation:** Cloudflare Access currently only supports **one custom login page** across all applications in your Zero Trust account. If you have multiple applications, they will share the same login page customization.

**Options:**

1. **Use Generic Branding (Recommended)**
   - Create a login page that works for all your applications
   - Use your main brand logo and colors
   - Keep messaging generic (e.g., "Sign in to continue")

2. **Application-Specific Messaging**
   - Use the "Organization name" field to identify which app
   - Example: "Segmentor" or "Your Company Name"
   - Users will see the same page but understand the context

3. **Skip Customization**
   - Use Cloudflare's default login page
   - Users will still authenticate successfully
   - Less branded but fully functional

**To Customize:**

1. Navigate to **Zero Trust** → **Access** → **Custom Pages**
2. Select **Access login page** → **Manage**
3. Customize:
   - **Organization name:** "Segmentor" (or your main brand name)
   - **Logo:** Upload your main brand logo
   - **Background color:** Match your brand (#3a863e or similar)
   - **Header/Footer text:** Generic messaging that works for all apps

**Note:** The custom page will be used by ALL your Zero Trust applications. Choose branding that represents your overall brand rather than application-specific branding.

## Backend API Endpoint (Cloudflare Workers)

You'll need a Cloudflare Worker to verify authentication and check Brand+ status:

**Endpoint:** `/api/user-permissions`

**Purpose:** Verify Cloudflare Access authentication and return user's Brand+ status

**Implementation Example:**

```javascript
// Cloudflare Worker: /api/user-permissions
export default {
  async fetch(request) {
    // Get Cloudflare Access headers
    const email = request.headers.get('Cf-Access-Authenticated-User-Email');
    const groups = request.headers.get('Cf-Access-Groups')?.split(',') || [];
    
    if (!email) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check if user has Brand+ access
    // Replace this with your actual user database/check
    const brandPlusUsers = [
      'brandplus@company.com',
      'premium@company.com'
      // Add your Brand+ user emails here
    ];
    
    const isPremium = brandPlusUsers.includes(email) || groups.includes('brand-plus');
    
    return new Response(JSON.stringify({
      email,
      isPremium,
      groups
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

## User Flow

### Existing Brand+ User (Sign In)

1. User clicks "Sign in with Cloudflare Access" button
2. Redirects to `/brand-plus-auth` (Cloudflare Access protected)
3. Cloudflare shows login page (customized with your branding)
4. User authenticates with their email/SSO
5. Cloudflare redirects back to `/brand-plus.html?auth=success`
6. Page checks authentication status via `/api/user-permissions`
7. If authenticated and premium, shows success message
8. Auto-redirects to `/tool/` with Brand+ features enabled

### New User (Upgrade)

1. User scrolls down past sign-in section
2. Sees pricing and upgrade information
3. Clicks "Upgrade to Brand+" button
4. Goes through purchase flow
5. After purchase, receives Brand+ access
6. Can then use sign-in section to authenticate

## JavaScript Functions

### `checkAuthStatus()`
- Checks for Cloudflare authentication cookie
- Verifies with backend API
- Shows success state if authenticated
- Auto-redirects to tool if premium

### `initiateCloudflareLogin()`
- Redirects user to `/brand-plus-auth`
- Includes return URL parameter for redirect after auth

### `showAuthSuccess()`
- Hides sign-in button
- Shows success message
- Triggers redirect to tool

## Testing

### Test Sign-In Flow

1. **As unauthenticated user:**
   - Visit `/brand-plus.html`
   - Should see sign-in section at top
   - Click "Sign in" button
   - Should redirect to Cloudflare login
   - After login, should redirect back and show success

2. **As authenticated Brand+ user:**
   - Visit `/brand-plus.html`
   - Should automatically detect authentication
   - Should show success message
   - Should auto-redirect to tool

3. **As authenticated non-Brand+ user:**
   - Visit `/brand-plus.html`
   - Should see sign-in section (not authenticated for Brand+)
   - Can scroll to see upgrade options

### Test Upgrade Flow

1. Visit `/brand-plus.html` as new user
2. Scroll past sign-in section
3. See pricing information
4. Click upgrade button
5. Complete purchase flow

## Troubleshooting

### Issue: Sign-in button doesn't redirect
- **Check:** Cloudflare Access route `/brand-plus-auth` is configured
- **Check:** Route is properly protected in Cloudflare dashboard

### Issue: Authentication not detected after login
- **Check:** Cloudflare redirect URL includes `?auth=success`
- **Check:** Backend API endpoint `/api/user-permissions` is working
- **Check:** Cloudflare headers are being sent correctly

### Issue: User authenticated but not premium
- **Check:** User email is in Brand+ users list in backend
- **Check:** Cloudflare Access groups include 'brand-plus' if using groups
- **Check:** Backend API is checking both email and groups

## Security Considerations

1. **Never trust client-side authentication state**
   - Always verify on backend via Cloudflare headers
   - Client-side checks are for UX only

2. **Validate Cloudflare headers**
   - Check `Cf-Access-Authenticated-User-Email` header
   - Verify headers are from Cloudflare (not spoofed)

3. **Session management**
   - Cloudflare handles session cookies
   - Backend should validate on each request

## Future Enhancements

- [ ] Add "Remember me" option
- [ ] Show user email when authenticated
- [ ] Add "Sign out" functionality
- [ ] Support multiple authentication providers
- [ ] Add loading states during authentication

## Related Documentation

- `docs/premium/cloudflare-integration-guide.md` - General Cloudflare Access setup
- `docs/development/deployment-architecture.md` - Deployment architecture
- `docs/premium/premium-features-documentation.md` - Brand+ features overview

