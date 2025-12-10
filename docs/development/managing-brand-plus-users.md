# Managing Brand+ Users

**Last Updated:** December 10, 2024  
**Status:** Production ✅

---

## Overview

This guide explains how to add paying customers' emails to the authorized Brand+ user list. Brand+ access is controlled by the **Cloudflare Worker**, not by Cloudflare Access policies.

---

## Important: Where to Add Users

**✅ Add users in the Worker code** (`workers/api/user-permissions.js`)

**❌ Do NOT add users in Cloudflare Access policies** (Access only controls login, not Brand+ features)

The Worker is the **single source of truth** for Brand+ authorization. Even if a user can log in via Cloudflare Access, they won't get Brand+ features unless their email is in the Worker's Brand+ lists.

---

## Three Methods to Grant Brand+ Access

The Worker supports three methods for granting Brand+ access:

### Method 1: Individual Emails (Best for Individual Customers)

**Location:** `workers/api/user-permissions.js`

**Code:**
```javascript
const BRAND_PLUS_USERS = [
  'customer1@company.com',
  'customer2@company.com',
  'another@example.com',
  // Add customer emails here
];
```

**When to Use:**
- Individual customers who purchased Brand+
- Small number of users
- Each customer has different email domain

**Steps:**
1. Open `workers/api/user-permissions.js`
2. Find `BRAND_PLUS_USERS` array (around line 17)
3. Add customer email addresses:
   ```javascript
   const BRAND_PLUS_USERS = [
     'newcustomer@company.com',  // Add new customer here
     'existing@customer.com',
   ];
   ```
4. Save file
5. Commit and push to GitHub:
   ```bash
   git add workers/api/user-permissions.js
   git commit -m "Add Brand+ access for customer@company.com"
   git push origin main
   ```
6. Worker will auto-deploy (takes 1-2 minutes)

**Example:**
```javascript
// Before
const BRAND_PLUS_USERS = [
  'customer1@company.com',
];

// After adding new customer
const BRAND_PLUS_USERS = [
  'customer1@company.com',
  'newcustomer@example.com',  // New customer added
];
```

---

### Method 2: Email Domains (Best for Company-Wide Access)

**Location:** `workers/api/user-permissions.js`

**Code:**
```javascript
const BRAND_PLUS_DOMAINS = [
  '@teresamonroe.com',
  '@company.com',
  // Add email domains here
];
```

**When to Use:**
- Entire company/team has Brand+ access
- All users from a specific domain should have access
- Easier to manage than individual emails

**Steps:**
1. Open `workers/api/user-permissions.js`
2. Find `BRAND_PLUS_DOMAINS` array (around line 24)
3. Add email domain (include the `@` symbol):
   ```javascript
   const BRAND_PLUS_DOMAINS = [
     '@teresamonroe.com',
     '@newcompany.com',  // Add new domain here
   ];
   ```
4. Save file
5. Commit and push to GitHub:
   ```bash
   git add workers/api/user-permissions.js
   git commit -m "Add Brand+ access for @newcompany.com domain"
   git push origin main
   ```
6. Worker will auto-deploy (takes 1-2 minutes)

**Example:**
```javascript
// Before
const BRAND_PLUS_DOMAINS = [
  '@teresamonroe.com',
];

// After adding new company domain
const BRAND_PLUS_DOMAINS = [
  '@teresamonroe.com',
  '@newcompany.com',  // All @newcompany.com emails now have Brand+
];
```

**Note:** Any email ending with `@newcompany.com` will automatically get Brand+ access, including:
- `john@newcompany.com`
- `jane@newcompany.com`
- `team@newcompany.com`
- etc.

---

### Method 3: Cloudflare Access Groups (Best for Scalable Management)

**Location:** `workers/api/user-permissions.js` + Cloudflare Dashboard

**Code:**
```javascript
const BRAND_PLUS_GROUPS = [
  'brand-plus',
  'premium',
  // Add Access group names here
];
```

**When to Use:**
- Large number of users
- Want to manage users in Cloudflare dashboard (not code)
- Need to add/remove users frequently
- Multiple teams/departments

**Steps:**

**Step 1: Create Access Group in Cloudflare**
1. Go to Cloudflare Dashboard → Zero Trust → Access → Groups
2. Click "Add a group"
3. Name: `brand-plus` (or `premium`)
4. Add users to the group:
   - Individual emails
   - Email domains
   - Identity provider groups
5. Save group

**Step 2: Update Worker Code**
1. Open `workers/api/user-permissions.js`
2. Find `BRAND_PLUS_GROUPS` array (around line 29)
3. Add group name:
   ```javascript
   const BRAND_PLUS_GROUPS = [
     'brand-plus',
     'premium',
     'new-group',  // Add new group name here
   ];
   ```
4. Save file
5. Commit and push to GitHub:
   ```bash
   git add workers/api/user-permissions.js
   git commit -m "Add Brand+ access for 'new-group' Access group"
   git push origin main
   ```
6. Worker will auto-deploy (takes 1-2 minutes)

**Step 3: Configure Access Application**
1. Go to Cloudflare Dashboard → Zero Trust → Access → Applications
2. Find your Brand+ application
3. Edit policies
4. Ensure policies include the group
5. Save

**Example:**
```javascript
// Before
const BRAND_PLUS_GROUPS = [
  'brand-plus',
];

// After adding new group
const BRAND_PLUS_GROUPS = [
  'brand-plus',
  'enterprise-customers',  // New group added
];
```

**Benefits:**
- Add/remove users in Cloudflare dashboard (no code changes)
- Users automatically get Brand+ when added to group
- Users automatically lose Brand+ when removed from group
- No Worker redeployment needed for user changes

---

## Which Method Should I Use?

### Use Individual Emails If:
- ✅ Small number of customers (< 20)
- ✅ Each customer has different email domain
- ✅ Simple, straightforward management
- ✅ Customers are individuals, not companies

### Use Email Domains If:
- ✅ Entire company/team has Brand+ access
- ✅ All users from company should have access
- ✅ Company has consistent email domain
- ✅ Want to grant access to all employees automatically

### Use Access Groups If:
- ✅ Large number of users (> 20)
- ✅ Need to add/remove users frequently
- ✅ Want to manage users in Cloudflare dashboard
- ✅ Multiple teams/departments with different access
- ✅ Need audit trail of who has access

---

## Workflow: Adding a New Paying Customer

### Scenario: Customer purchases Brand+ subscription

**Recommended Steps:**

1. **Receive Payment Confirmation**
   - Customer completes purchase
   - Payment system confirms payment
   - You receive customer email address

2. **Add Customer Email**
   - Open `workers/api/user-permissions.js`
   - Add email to `BRAND_PLUS_USERS` array:
     ```javascript
     const BRAND_PLUS_USERS = [
       'existing@customer.com',
       'newcustomer@company.com',  // New customer
     ];
     ```

3. **Commit and Push**
   ```bash
   git add workers/api/user-permissions.js
   git commit -m "Add Brand+ access for newcustomer@company.com"
   git push origin main
   ```

4. **Wait for Deployment**
   - Worker auto-deploys (1-2 minutes)
   - Check Cloudflare Dashboard → Workers → Logs to verify

5. **Notify Customer**
   - Send welcome email with link: `https://segmentor.pages.dev/brand-plus.html`
   - Customer can now sign in and access Brand+ features

**Alternative: If Customer Has Company Domain**
- If entire company has Brand+ access, add domain instead:
  ```javascript
  const BRAND_PLUS_DOMAINS = [
    '@company.com',  // All @company.com emails get Brand+
  ];
  ```

---

## Removing Brand+ Access

### Remove Individual Email

1. Open `workers/api/user-permissions.js`
2. Remove email from `BRAND_PLUS_USERS`:
   ```javascript
   // Before
   const BRAND_PLUS_USERS = [
     'customer1@company.com',
     'customer2@company.com',  // Remove this
   ];
   
   // After
   const BRAND_PLUS_USERS = [
     'customer1@company.com',
   ];
   ```
3. Commit and push:
   ```bash
   git commit -m "Remove Brand+ access for customer2@company.com"
   git push origin main
   ```

### Remove Domain

1. Open `workers/api/user-permissions.js`
2. Remove domain from `BRAND_PLUS_DOMAINS`:
   ```javascript
   // Before
   const BRAND_PLUS_DOMAINS = [
     '@company.com',  // Remove this
   ];
   
   // After
   const BRAND_PLUS_DOMAINS = [
     // Empty or other domains
   ];
   ```
3. Commit and push

### Remove from Access Group

1. Go to Cloudflare Dashboard → Zero Trust → Access → Groups
2. Find the group (e.g., `brand-plus`)
3. Remove user from group
4. User immediately loses Brand+ access (no code changes needed)

---

## Verification

### Test New User Access

1. **Add user to Worker lists** (as described above)
2. **Wait for Worker deployment** (1-2 minutes)
3. **Test login:**
   - Visit `https://segmentor.pages.dev/brand-plus.html`
   - Sign in with customer email
   - Should redirect to `/tool/` with Brand+ features active

### Check Worker Logs

1. Go to Cloudflare Dashboard → Workers & Pages → segmentor
2. Click "Logs" tab
3. Look for API requests to `/api/user-permissions`
4. Check logs for:
   - Email extraction success
   - Brand+ verification result
   - `isPremium: true/false`

### Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for logs:
   - `✅ Brand+ authenticated: email@example.com`
   - `isPremium: true`

---

## Best Practices

### 1. Use Descriptive Commit Messages

```bash
# Good
git commit -m "Add Brand+ access for customer@company.com"

# Better
git commit -m "Add Brand+ access for customer@company.com (Subscription #12345)"
```

### 2. Keep Lists Organized

```javascript
// Good: Organized by date or customer type
const BRAND_PLUS_USERS = [
  // Enterprise customers
  'enterprise1@company.com',
  'enterprise2@company.com',
  
  // Individual customers
  'customer1@example.com',
  'customer2@example.com',
];
```

### 3. Document Large Changes

If adding many users at once, add a comment:

```javascript
const BRAND_PLUS_USERS = [
  // Added 2024-12-10: Q4 2024 customers
  'customer1@company.com',
  'customer2@company.com',
  'customer3@company.com',
  // ... more customers
];
```

### 4. Use Access Groups for Scale

If you have > 20 customers, consider migrating to Access Groups:
- Easier to manage in dashboard
- No code changes for user additions
- Better audit trail

---

## Troubleshooting

### User Can Log In But No Brand+ Features

**Problem:** User authenticated but `isPremium: false`

**Check:**
1. Is email in `BRAND_PLUS_USERS` array?
2. Is email domain in `BRAND_PLUS_DOMAINS` array?
3. Is user in Access group listed in `BRAND_PLUS_GROUPS`?
4. Has Worker been deployed after adding user?
5. Check Worker logs for verification result

**Solution:**
- Verify email is in correct list
- Check email spelling (case-insensitive but check exact match)
- Wait for Worker deployment to complete
- Check browser console for API response

### User Cannot Log In

**Problem:** User cannot authenticate via Cloudflare Access

**Check:**
1. Is Cloudflare Access application configured?
2. Is `/brand-plus-auth` route protected?
3. Is user email in Access policies (for login, not Brand+)?
4. Check Access logs in Cloudflare dashboard

**Solution:**
- This is an Access configuration issue, not Worker issue
- Check Cloudflare Zero Trust → Access → Applications
- Verify Access policies allow user to log in

### Worker Not Deploying

**Problem:** Changes to Worker not taking effect

**Check:**
1. Is file committed to Git?
2. Is file pushed to `main` branch?
3. Check Cloudflare Workers CI/CD logs
4. Verify Worker name matches in `wrangler.toml`

**Solution:**
- Ensure `workers/api/user-permissions.js` is committed
- Push to `main` branch
- Check Cloudflare Dashboard → Workers → Builds

---

## Related Documentation

- `docs/development/brand-plus-authentication-architecture.md` - Complete architecture overview
- `docs/development/deployment-architecture.md` - Deployment details
- `workers/api/user-permissions.js` - Worker source code

---

## Quick Reference

**File to Edit:** `workers/api/user-permissions.js`

**Arrays to Modify:**
- `BRAND_PLUS_USERS` - Individual emails (line ~17)
- `BRAND_PLUS_DOMAINS` - Email domains (line ~24)
- `BRAND_PLUS_GROUPS` - Access groups (line ~29)

**After Changes:**
```bash
git add workers/api/user-permissions.js
git commit -m "Add Brand+ access for customer@example.com"
git push origin main
```

**Wait:** 1-2 minutes for Worker auto-deployment

**Test:** Visit `https://segmentor.pages.dev/brand-plus.html` and sign in

---

**Note:** Always add users to the Worker code, not just Cloudflare Access policies. Access controls login, but the Worker controls Brand+ features.

