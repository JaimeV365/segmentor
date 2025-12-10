# Brand+ Authentication Architecture

**Last Updated:** December 10, 2024  
**Status:** Production ✅

---

## Executive Summary

This document describes the complete authentication and authorization architecture for Brand+ features. The system uses **Cloudflare Access** for authentication (login) and a **Cloudflare Worker** for authorization (Brand+ access verification).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 1. User clicks "Sign in"
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Access (Authentication)              │
│  • Protects /brand-plus-auth route                          │
│  • Shows login page                                          │
│  • Validates user credentials                                │
│  • Sets CF_Authorization cookie (JWT)                       │
│  • Redirects back to /brand-plus.html                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 2. User authenticated
                       │    Cookie: CF_Authorization=<JWT>
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              React Application (/tool/)                      │
│  • Checks CF_Authorization cookie                           │
│  • Decodes JWT to extract email                             │
│  • Calls Worker API to verify Brand+ status                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 3. API Request
                       │    GET /api/user-permissions
                       │    Cookie: CF_Authorization=<JWT>
                       │    Header: X-User-Email=<email>
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         Cloudflare Worker (Authorization)                   │
│  • Extracts email from cookie or header                     │
│  • Checks against Brand+ user lists                         │
│  • Returns { isPremium: true/false }                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 4. Response
                       │    { isPremium: true, email: "..." }
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              React Application                               │
│  • Sets isPremium state                                     │
│  • Enables Brand+ features                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Cloudflare Access (Authentication Layer)

**Purpose:** Handles user login and authentication

**Configuration:**
- **Application Name:** "Brand+ Authentication" (or similar)
- **Protected Route:** `/brand-plus-auth`
- **Domain:** `segmentor.pages.dev` (or custom domain)
- **Session Duration:** 24 hours (configurable)

**How It Works:**
1. User clicks "Sign in" button on `/brand-plus.html`
2. Redirects to `/brand-plus-auth` (protected by Access)
3. Cloudflare Access intercepts the request
4. Shows login page (customizable with your branding)
5. User authenticates (email/SSO)
6. Access sets `CF_Authorization` cookie (JWT token)
7. Redirects back to `/brand-plus.html?auth=success`

**Key Features:**
- No code changes needed - configured in Cloudflare dashboard
- Supports multiple identity providers (email, Google, Microsoft, etc.)
- Customizable login page with your branding
- Automatic session management

**Location:** Cloudflare Zero Trust Dashboard → Access → Applications

---

### 2. Cloudflare Worker (Authorization Layer)

**Purpose:** Verifies if authenticated user has Brand+ access

**Worker Details:**
- **Name:** `segmentor`
- **URL:** `https://segmentor.jaime-f57.workers.dev`
- **Endpoint:** `/api/user-permissions`
- **File Location:** `workers/api/user-permissions.js`

**How It Works:**
1. Receives request from frontend with `CF_Authorization` cookie
2. Extracts email from:
   - `Cf-Access-Authenticated-User-Email` header (if route protected by Access)
   - `X-User-Email` header (from frontend)
   - `CF_Authorization` cookie (decodes JWT)
3. Checks email against Brand+ lists:
   - Exact email matches (`BRAND_PLUS_USERS`)
   - Domain matches (`BRAND_PLUS_DOMAINS`)
   - Group matches (`BRAND_PLUS_GROUPS`)
4. Returns JSON response:
   ```json
   {
     "email": "user@example.com",
     "isPremium": true,
     "groups": [],
     "authenticated": true
   }
   ```

**Authorization Methods:**
The Worker supports three methods for granting Brand+ access:

1. **Individual Emails** (`BRAND_PLUS_USERS` array)
   - Exact email match
   - Best for: Individual customers
   - Example: `['customer@company.com', 'another@company.com']`

2. **Email Domains** (`BRAND_PLUS_DOMAINS` array)
   - Any email ending with specified domain
   - Best for: Company-wide access
   - Example: `['@teresamonroe.com', '@company.com']`

3. **Cloudflare Access Groups** (`BRAND_PLUS_GROUPS` array)
   - Users in specific Access groups
   - Best for: Scalable team management
   - Example: `['brand-plus', 'premium']`

**Location:** `workers/api/user-permissions.js` in repository

---

### 3. Frontend Integration

**Files:**
- `src/utils/cloudflareAuth.ts` - Authentication utility
- `src/App.tsx` - Main app (checks auth on mount)
- `public/brand-plus.html` - Login/upgrade page

**Authentication Flow:**
1. **On App Load** (`App.tsx`):
   ```typescript
   useEffect(() => {
     const checkAuth = async () => {
       const accessProfile = await checkCloudflareAccess();
       if (accessProfile.isAuthenticated && accessProfile.isPremium) {
         setIsPremium(true);
       }
     };
     checkAuth();
   }, []);
   ```

2. **Cookie Decoding** (`cloudflareAuth.ts`):
   - Reads `CF_Authorization` cookie
   - Decodes JWT to extract email
   - Sends email to Worker API

3. **API Call**:
   ```typescript
   const response = await fetch('https://segmentor.jaime-f57.workers.dev/api/user-permissions', {
     headers: { 'X-User-Email': email },
     credentials: 'include' // Sends cookie automatically
   });
   ```

---

## User Flows

### Flow 1: New Brand+ User (First Login)

1. User purchases Brand+ subscription
2. Receives email with link to `/brand-plus.html`
3. Visits page, clicks "Sign in with Cloudflare Access"
4. Redirected to Cloudflare login page
5. Authenticates with email/SSO
6. Redirected back to `/brand-plus.html?auth=success`
7. Page checks authentication via Worker API
8. Worker verifies email is in Brand+ list
9. Returns `isPremium: true`
10. Page shows success message
11. Auto-redirects to `/tool/` with Brand+ features active

### Flow 2: Returning Brand+ User

1. User visits `/brand-plus.html` or `/tool/`
2. React app checks `CF_Authorization` cookie
3. If cookie exists and valid:
   - Decodes JWT to get email
   - Calls Worker API
   - Worker verifies Brand+ status
   - Sets `isPremium: true`
   - Brand+ features enabled immediately
4. If cookie expired:
   - User redirected to login
   - Follows Flow 1 steps 4-11

### Flow 3: Free User (No Interference)

1. User uses tool normally
2. No authentication required
3. All free features work as normal
4. Can optionally see "Upgrade to Brand+" in drawer
5. No forced registration or login

---

## Security Model

### Authentication (Who Can Log In)

**Controlled by:** Cloudflare Access policies

- Access policies determine who can authenticate
- Can be configured to allow:
  - Specific email addresses
  - Email domains
  - Cloudflare Access groups
  - Identity providers (Google, Microsoft, etc.)

**Note:** Access policies control login access, but **do not** grant Brand+ features. Authorization is separate.

### Authorization (Who Gets Brand+ Features)

**Controlled by:** Cloudflare Worker (`workers/api/user-permissions.js`)

- Worker checks three lists:
  1. `BRAND_PLUS_USERS` - Individual emails
  2. `BRAND_PLUS_DOMAINS` - Email domains
  3. `BRAND_PLUS_GROUPS` - Access groups

- **Only users in these lists get `isPremium: true`**
- Even if user can log in via Access, they won't get Brand+ unless in Worker lists

### Why Two Layers?

1. **Separation of Concerns:**
   - Access = Authentication (login)
   - Worker = Authorization (premium features)

2. **Flexibility:**
   - Can allow login for testing without granting Brand+
   - Can grant Brand+ to users who log in via different methods

3. **Security:**
   - Worker is the single source of truth for Brand+ access
   - Client-side checks are for UX only
   - Backend always verifies

---

## CORS Configuration

The Worker handles CORS for cross-origin requests:

**Allowed Origins:**
- `https://segmentor.pages.dev`
- `https://segmentor.app`
- `http://localhost:3000` (development)

**Headers:**
- `Content-Type`
- `X-User-Email`
- `X-Cloudflare-Email`

**Credentials:**
- `Access-Control-Allow-Credentials: true`
- Allows cookies to be sent cross-origin

---

## Cookie Details

**Cookie Name:** `CF_Authorization`

**Format:** JWT (JSON Web Token)

**Structure:**
```
Header.Payload.Signature
```

**Payload Contains:**
- `email` - User's email address
- `sub` - Subject (user identifier)
- `iat` - Issued at (timestamp)
- `exp` - Expiration (timestamp)
- Other Cloudflare Access claims

**Decoding:**
```javascript
const parts = token.split('.');
const payload = JSON.parse(
  atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
);
const email = payload.email || payload.sub;
```

---

## Error Handling

### Authentication Errors

**No Cookie:**
- User not logged in
- Redirect to `/brand-plus.html` for login

**Invalid Cookie:**
- Cookie expired or malformed
- Clear cookie, redirect to login

**API Error:**
- Worker unavailable
- Log error, assume not premium
- Don't grant Brand+ access

### Authorization Errors

**Email Not Found:**
- User authenticated but not in Brand+ lists
- Returns `isPremium: false`
- User can use tool but no Brand+ features

**Worker Error:**
- Server error in Worker
- Returns 500 error
- Frontend assumes not premium

---

## Deployment

### Worker Deployment

**Automatic:**
- Worker deploys automatically via Cloudflare Workers CI/CD
- Triggered by push to `main` branch
- Deploy command: `cd workers && npx wrangler deploy`

**Manual:**
```bash
cd workers
npx wrangler deploy
```

### Frontend Deployment

**Automatic:**
- Cloudflare Pages auto-deploys on push to `main`
- Builds React app
- Deploys to `segmentor.pages.dev`

**Manual:**
- Push to GitHub `main` branch
- Cloudflare Pages detects push
- Builds and deploys automatically

---

## Monitoring & Debugging

### Worker Logs

**Location:** Cloudflare Dashboard → Workers & Pages → segmentor → Logs

**What to Check:**
- API request logs
- Email extraction success
- Brand+ verification results
- Error messages

### Frontend Console

**Browser DevTools → Console**

**Key Logs:**
- `🔍 Checking authentication...`
- `🍪 Cookie found: true/false`
- `✅ Brand+ authenticated: email@example.com`
- `⚠️ Auth API not available`

### Common Issues

**1. Cookie Not Set:**
- Check Cloudflare Access application is configured
- Verify `/brand-plus-auth` route is protected
- Check redirect settings

**2. Email Not Extracted:**
- Check JWT decoding in frontend
- Verify cookie format
- Check Worker logs for email extraction

**3. Brand+ Not Activating:**
- Verify email is in Worker lists
- Check Worker logs for verification result
- Ensure `isPremium: true` in API response

---

## Related Documentation

- `docs/development/deployment-architecture.md` - Overall deployment architecture
- `docs/development/managing-brand-plus-users.md` - Guide for adding users
- `docs/premium/brand-plus-login-setup.md` - Login page setup
- `workers/api/user-permissions.js` - Worker source code
- `src/utils/cloudflareAuth.ts` - Frontend auth utility

---

**Note:** This architecture ensures secure, scalable authentication and authorization for Brand+ features while maintaining a seamless user experience for both free and premium users.

