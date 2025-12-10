# Step-by-Step: Migrate Customer Emails to Cloudflare KV

**Goal:** Remove all customer email addresses from source code and store them securely in Cloudflare KV.

**Time Required:** 15-20 minutes

**Prerequisites:**
- Access to Cloudflare Dashboard
- Your Cloudflare account login credentials

---

## Step 1: Create Cloudflare KV Namespace

1. **Log into Cloudflare Dashboard**
   - Go to: https://dash.cloudflare.com/
   - Log in with your Cloudflare account

2. **Navigate to KV**
   - In the left sidebar, click **"Workers & Pages"**
   - Click **"KV"** in the submenu
   - Or go directly to: https://dash.cloudflare.com/ → Your Account → Workers & Pages → KV

3. **Create New Namespace**
   - Click the blue **"Create a namespace"** button
   - **Namespace name:** `BRAND_PLUS_USERS`
     - This is just a label for you - can be anything
     - I recommend `BRAND_PLUS_USERS` to match the code
   - Click **"Add"**

4. **Copy the Namespace ID**
   - After creation, you'll see your namespace listed
   - Next to the name, you'll see an **ID** (looks like: `abc123def456ghi789...`)
   - **IMPORTANT:** Copy this ID - you'll need it in Step 3
   - Example ID format: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

---

## Step 2: Add Namespace Binding to Your Worker

1. **Go to Your Worker**
   - Still in Cloudflare Dashboard
   - Click **"Workers & Pages"** in left sidebar
   - Click on **"segmentor"** (your Worker name)
   - If you don't see it, click **"Overview"** and find it in the list

2. **Open Settings**
   - Click the **"Settings"** tab at the top
   - Scroll down past "Variables and Secrets" section
   - Look for **"Bindings"** section (separate from Variables)

3. **Add KV Namespace Binding**
   - In the **"Bindings"** section, click **"Add binding"** button
   - A dropdown or form will appear
   - **Binding type:** Select **"KV Namespace"** from the dropdown
   - **Variable name:** `BRAND_PLUS_USERS`
     - This MUST match what we'll use in code
     - Use exactly: `BRAND_PLUS_USERS` (all caps, underscore)
   - **KV namespace:** Click dropdown and select `BRAND_PLUS_USERS` (the one you created in Step 1)
   - Click **"Save"** or **"Add"**

4. **Alternative: If you don't see "Bindings" section**
   - The UI might be different - look for any section that mentions "Bindings", "Resources", or "Integrations"
   - OR you can skip this step and configure it via `wrangler.toml` only (see Step 3)
   - The `wrangler.toml` configuration will work for both local and production

5. **Verify Binding**
   - You should now see `BRAND_PLUS_USERS` listed in the Bindings section
   - If you don't see it in the dashboard, that's OK - we'll configure it via `wrangler.toml` in Step 3

---

## Step 3: Update wrangler.toml (This Configures the Binding)

**Important:** Even if you couldn't add the binding in the dashboard, this step will configure it. The `wrangler.toml` file is used for Worker configuration.

1. **Open `workers/wrangler.toml`**
   - In your code editor, open the file: `workers/wrangler.toml`

2. **Add KV Namespace Configuration**
   - Find the commented section that says:
     ```toml
     # KV namespaces (if you want to store Brand+ users in KV instead of hardcoding)
     # [[kv_namespaces]]
     # binding = "BRAND_PLUS_USERS"
     # id = "your-kv-namespace-id"
     ```
   
   - Replace it with (uncomment and add your actual ID):
     ```toml
     # KV namespaces for Brand+ user management
     [[kv_namespaces]]
     binding = "BRAND_PLUS_USERS"
     id = "YOUR_NAMESPACE_ID_HERE"  # Replace with the ID you copied in Step 1
     ```
   
   - **Replace `YOUR_NAMESPACE_ID_HERE`** with the actual namespace ID you copied in Step 1
   - Example:
     ```toml
     [[kv_namespaces]]
     binding = "BRAND_PLUS_USERS"
     id = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
     ```

3. **Save the file**

4. **Note:** When you deploy via `wrangler deploy`, it will automatically configure the binding based on `wrangler.toml`. You don't necessarily need to add it in the dashboard if you configure it here.

---

## Step 4: Migrate Existing Customer Emails to KV

You have two options. Choose the one that works best for you:

### Option A: Manual Entry (Best for Small Lists - < 20 customers)

1. **Go to KV Namespace**
   - In Cloudflare Dashboard: **Workers & Pages** → **KV**
   - Click on the namespace name: `BRAND_PLUS_USERS`

2. **Add Each Customer Email**
   - Click **"Add entry"** button
   - **Key:** `user:customer@company.com`
     - Format: `user:` followed by the email address
     - Example: `user:john@example.com`
   - **Value:** `true`
     - Just type `true` - we only check if the key exists
   - Click **"Save"**
   - Repeat for each customer email

3. **Add Domain-Based Access (if needed)**
   - If you have domain-based access (like `@teresamonroe.com`):
   - Click **"Add entry"**
   - **Key:** `domain:@teresamonroe.com`
   - **Value:** `true`
   - Click **"Save"**

### Option B: Bulk Upload via Wrangler CLI (Best for Large Lists)

1. **Create a JSON file**
   - Create a file called `customers.json` in the `workers/` directory
   - Format:
     ```json
     [
       {
         "key": "user:customer1@company.com",
         "value": "true"
       },
       {
         "key": "user:customer2@company.com",
         "value": "true"
       },
       {
         "key": "domain:@teresamonroe.com",
         "value": "true"
       }
     ]
     ```
   - Add all your customer emails and domains

2. **Install Wrangler (if not already installed)**
   ```bash
   npm install -g wrangler
   ```
   Or use npx (no installation needed):
   ```bash
   npx wrangler --version
   ```

3. **Authenticate Wrangler**
   ```bash
   cd workers
   npx wrangler login
   ```
   - This will open your browser to authorize Wrangler
   - Click "Allow" in the browser

4. **Upload to KV**
   ```bash
   npx wrangler kv:bulk put --namespace-id=YOUR_NAMESPACE_ID customers.json
   ```
   - Replace `YOUR_NAMESPACE_ID` with the ID from Step 1
   - Example:
     ```bash
     npx wrangler kv:bulk put --namespace-id=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6 customers.json
     ```

5. **Verify Upload**
   - Go back to Cloudflare Dashboard → KV → Your namespace
   - You should see all your entries listed

---

## Step 5: Update Worker Code

1. **Open `workers/api/user-permissions.js`**

2. **Remove the hardcoded arrays** (lines 14-32):
   - Delete these lines:
     ```javascript
     // List of Brand+ user emails (exact matches)
     const BRAND_PLUS_USERS = [
       // Add your Brand+ user emails here
     ];
     
     // Brand+ email domains (any email ending with these domains)
     const BRAND_PLUS_DOMAINS = [
       '@teresamonroe.com',
     ];
     
     // Brand+ user groups (if using Cloudflare Access groups)
     const BRAND_PLUS_GROUPS = [
       'brand-plus',
       'premium',
     ];
     ```

3. **Add KV lookup functions** (add after line 33, before `export default`):
   ```javascript
   // Check if email is in KV store
   async function isEmailInKV(email, env) {
     try {
       const value = await env.BRAND_PLUS_USERS.get(`user:${email}`);
       return value !== null;
     } catch (error) {
       console.error('KV lookup error for email:', error);
       return false;
     }
   }
   
   // Check if email domain is in KV store
   async function isDomainInKV(email, env) {
     try {
       // Extract domain from email (e.g., @company.com)
       const domain = '@' + email.split('@')[1];
       const value = await env.BRAND_PLUS_USERS.get(`domain:${domain}`);
       return value !== null;
     } catch (error) {
       console.error('KV lookup error for domain:', error);
       return false;
     }
   }
   ```

4. **Replace the premium check** (around line 119-133):
   - Find this code:
     ```javascript
     // Check if user has Brand+ access
     // Method 1: Check exact email match
     const isEmailPremium = BRAND_PLUS_USERS.includes(email);
     
     // Method 2: Check email domain (any email ending with @teresamonroe.com, etc.)
     const isDomainPremium = BRAND_PLUS_DOMAINS.some(domain => 
       email.toLowerCase().endsWith(domain.toLowerCase())
     );
     
     // Method 3: Check groups (if using Cloudflare Access groups)
     const isGroupPremium = groups.some(group => 
       BRAND_PLUS_GROUPS.includes(group.trim().toLowerCase())
     );
     
     const isPremium = isEmailPremium || isDomainPremium || isGroupPremium;
     ```
   
   - Replace with:
     ```javascript
     // Check if user has Brand+ access
     // Method 1: Check exact email match in KV
     const isEmailPremium = await isEmailInKV(email, env);
     
     // Method 2: Check email domain in KV
     const isDomainPremium = await isDomainInKV(email, env);
     
     // Method 3: Check groups (if using Cloudflare Access groups)
     // Groups can stay as hardcoded array since they're not sensitive
     const BRAND_PLUS_GROUPS = ['brand-plus', 'premium'];
     const isGroupPremium = groups.some(group => 
       BRAND_PLUS_GROUPS.includes(group.trim().toLowerCase())
     );
     
     const isPremium = isEmailPremium || isDomainPremium || isGroupPremium;
     ```

5. **Save the file**

---

## Step 6: Test Locally (Optional but Recommended)

1. **Test with Wrangler**
   ```bash
   cd workers
   npx wrangler dev
   ```
   - This starts a local development server
   - Test the `/api/user-permissions` endpoint
   - Verify it can read from KV

2. **If you get errors:**
   - Check that `wrangler.toml` has the correct namespace ID
   - Verify you ran `npx wrangler login`
   - Check that the namespace binding is correct

---

## Step 7: Deploy and Verify

1. **Commit and Push Changes**
   ```bash
   git add workers/api/user-permissions.js workers/wrangler.toml
   git commit -m "Migrate customer emails to Cloudflare KV"
   git push origin main
   ```

2. **Wait for Deployment**
   - Cloudflare Workers will auto-deploy (usually 1-2 minutes)
   - Check Cloudflare Dashboard → Workers → segmentor → Logs

3. **Test in Production**
   - Visit: `https://segmentor.pages.dev/brand-plus.html`
   - Sign in with a customer email that's in KV
   - Verify Brand+ features activate
   - Check browser console for any errors

4. **Verify No Emails in Code**
   - Check `workers/api/user-permissions.js` - should have NO customer emails
   - Run: `git diff` to see what changed
   - Verify no customer emails appear in the diff

---

## Step 8: Add New Customers (Going Forward)

**IMPORTANT: You must add emails in TWO places:**

1. **Cloudflare Access Policy** (so they can log in)
2. **KV Namespace** (so they get Brand+ features)

### Adding to Access Policy (Required for Login)

1. Go to **Zero Trust** → **Access** → **Applications**
2. Click on your Brand+ authentication application
3. Edit the policy
4. Add the customer email to the policy
5. Click **"Save"**

### Adding to KV (Required for Brand+ Features)

**Method 1: Cloudflare Dashboard (Easiest)**

1. Go to **Workers & Pages** → **KV** → `BRAND_PLUS_USERS`
2. Click **"Add entry"**
3. **Key:** `user:newcustomer@company.com` (must include `user:` prefix)
4. **Value:** `true`
5. Click **"Save"**

**Method 2: Wrangler CLI**

```bash
cd workers
npx wrangler kv:key put "user:newcustomer@company.com" "true" --namespace-id=YOUR_NAMESPACE_ID
```

### Summary

- **Access Policy** = Can they log in? (Authentication)
- **KV** = Do they get Brand+ features? (Authorization)
- **Both are required!**

---

## Step 9: Remove Old Code from Git History (Optional but Recommended)

**Warning:** This rewrites Git history. Only do this if you're comfortable with that.

1. **Verify migration is complete and working**
   - Test with real customers
   - Confirm everything works

2. **Remove from current code** (already done in Step 5)

3. **Optional: Remove from Git history**
   ```bash
   # This removes the file from all Git history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch workers/api/user-permissions.js" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Force push (WARNING: This rewrites history)
   git push origin --force --all
   ```
   
   **Only do this if:**
   - You're sure the migration works
   - You understand this rewrites Git history
   - You've backed up your repository

---

## Troubleshooting

### "Worker can't access KV"
- **Check:** Namespace binding in Worker settings (Step 2)
- **Check:** `wrangler.toml` has correct namespace ID (Step 3)
- **Fix:** Re-add binding or update `wrangler.toml`

### "Customers can't access Brand+"
- **Check:** KV entries exist (go to dashboard and verify)
- **Check:** Key format is correct (`user:email@domain.com`)
- **Check:** Worker logs for KV lookup errors
- **Fix:** Verify keys match exactly (case-sensitive)

### "Local development doesn't work"
- **Check:** Ran `npx wrangler login`
- **Check:** `wrangler.toml` has correct namespace ID
- **Fix:** Re-authenticate or update namespace ID

### "Build fails"
- **Check:** No syntax errors in Worker code
- **Check:** All async/await is correct
- **Fix:** Review error messages and fix syntax

---

## Security Checklist

After migration, verify:

- ✅ No customer emails in `workers/api/user-permissions.js`
- ✅ No customer emails in any other source files
- ✅ KV namespace is accessible only via Cloudflare dashboard (with your login)
- ✅ Worker code is deployed and working
- ✅ Test with real customer emails
- ✅ All customers can still access Brand+

---

## What You've Achieved

✅ **Customer emails removed from source code**
✅ **Emails stored securely in Cloudflare KV**
✅ **Not visible in GitHub repository**
✅ **Can add/remove customers without code changes**
✅ **Only accessible via Cloudflare dashboard (with your login)**

---

## Next Steps

1. **Test thoroughly** with real customer emails
2. **Document the process** for adding new customers
3. **Update your team** on how to add customers (if applicable)
4. **Monitor Worker logs** for any issues

---

**Need Help?** Check Cloudflare Worker logs in the dashboard for detailed error messages.

