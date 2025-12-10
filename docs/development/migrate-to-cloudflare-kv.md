# Migrating Customer Emails to Cloudflare KV

**Purpose:** Move Brand+ customer email lists from source code to Cloudflare KV for security and privacy.

---

## Step 1: Create Cloudflare KV Namespace

1. **Go to Cloudflare Dashboard**
   - Navigate to: **Workers & Pages** → **KV**
   - Or direct link: https://dash.cloudflare.com/ → Your Account → Workers & Pages → KV

2. **Create New Namespace**
   - Click **"Create a namespace"**
   - **Name:** `BRAND_PLUS_USERS` (or `brand-plus-users`)
   - **Note:** This name will be used in your Worker code
   - Click **"Add"**

3. **Copy the Namespace ID**
   - After creation, you'll see the namespace with an ID (e.g., `abc123def456...`)
   - **Copy this ID** - you'll need it for Step 3

---

## Step 2: Add Namespace to Worker

1. **Go to Your Worker**
   - Navigate to: **Workers & Pages** → **segmentor** (your Worker)
   - Click on **"Settings"** tab
   - Scroll to **"Variables"** section

2. **Add KV Namespace Binding**
   - Under **"KV Namespace Bindings"**, click **"Add binding"**
   - **Variable name:** `BRAND_PLUS_USERS` (must match what you use in code)
   - **KV namespace:** Select the namespace you created (`BRAND_PLUS_USERS`)
   - Click **"Save"**

3. **Update `wrangler.toml`** (for local development)
   - Open `workers/wrangler.toml`
   - Add KV namespace binding:
   ```toml
   [[kv_namespaces]]
   binding = "BRAND_PLUS_USERS"
   id = "your-namespace-id-here"  # Replace with actual ID from Step 1
   ```

---

## Step 3: Migrate Existing Customer Emails

### Option A: Using Cloudflare Dashboard (Manual - Small Lists)

1. **Go to KV Namespace**
   - Navigate to: **Workers & Pages** → **KV** → Your namespace
   - Click on the namespace name

2. **Add Customer Emails**
   - Click **"Add entry"**
   - **Key:** `user:customer1@company.com` (format: `user:email`)
   - **Value:** `true` (or any value - we just check if key exists)
   - Click **"Save"**
   - Repeat for each customer email

### Option B: Using Wrangler CLI (Recommended - Bulk Import)

1. **Create a JSON file with customer emails:**
   ```json
   {
     "user:customer1@company.com": "true",
     "user:customer2@company.com": "true",
     "user:customer3@company.com": "true"
   }
   ```

2. **Use Wrangler to bulk upload:**
   ```bash
   cd workers
   npx wrangler kv:bulk put --namespace-id=YOUR_NAMESPACE_ID customers.json
   ```

3. **Or add emails one by one:**
   ```bash
   npx wrangler kv:key put "user:customer@company.com" "true" --namespace-id=YOUR_NAMESPACE_ID
   ```

### Option C: Using Worker Script (Programmatic)

Create a temporary Worker script to migrate:

```javascript
// migrate-customers.js (temporary script)
export default {
  async fetch(request, env) {
    const customers = [
      'customer1@company.com',
      'customer2@company.com',
      // ... your existing list
    ];
    
    for (const email of customers) {
      await env.BRAND_PLUS_USERS.put(`user:${email}`, 'true');
    }
    
    return new Response(`Migrated ${customers.length} customers`);
  }
};
```

---

## Step 4: Update Worker Code

1. **Open `workers/api/user-permissions.js`**

2. **Remove hardcoded arrays:**
   ```javascript
   // DELETE THESE LINES:
   const BRAND_PLUS_USERS = [
     // ... customer emails
   ];
   
   const BRAND_PLUS_DOMAINS = [
     '@teresamonroe.com',
   ];
   
   const BRAND_PLUS_GROUPS = [
     'brand-plus',
     'premium',
   ];
   ```

3. **Add KV lookup functions:**
   ```javascript
   // Check if email is in KV store
   async function isEmailInKV(email, env) {
     try {
       const value = await env.BRAND_PLUS_USERS.get(`user:${email}`);
       return value !== null;
     } catch (error) {
       console.error('KV lookup error:', error);
       return false;
     }
   }
   
   // Check if email domain is in KV store
   async function isDomainInKV(email, env) {
     try {
       // Extract domain from email
       const domain = '@' + email.split('@')[1];
       const value = await env.BRAND_PLUS_USERS.get(`domain:${domain}`);
       return value !== null;
     } catch (error) {
       console.error('KV domain lookup error:', error);
       return false;
     }
   }
   ```

4. **Update the premium check:**
   ```javascript
   // Replace the old check with:
   const isEmailPremium = await isEmailInKV(email, env);
   const isDomainPremium = await isDomainInKV(email, env);
   // Groups can stay as array (or move to KV too)
   const isGroupPremium = groups.some(group => 
     ['brand-plus', 'premium'].includes(group.trim().toLowerCase())
   );
   
   const isPremium = isEmailPremium || isDomainPremium || isGroupPremium;
   ```

---

## Step 5: Add Domains to KV

1. **For domain-based access** (like `@teresamonroe.com`):
   - In KV namespace, add entry:
   - **Key:** `domain:@teresamonroe.com`
   - **Value:** `true`

2. **Or use Wrangler:**
   ```bash
   npx wrangler kv:key put "domain:@teresamonroe.com" "true" --namespace-id=YOUR_NAMESPACE_ID
   ```

---

## Step 6: Remove Customer Emails from Source Code

1. **Update `workers/api/user-permissions.js`**
   - Remove all customer email arrays
   - Keep only the lookup functions

2. **Commit changes:**
   ```bash
   git add workers/api/user-permissions.js workers/wrangler.toml
   git commit -m "Migrate customer emails to Cloudflare KV"
   git push origin main
   ```

3. **Verify:**
   - Check that no customer emails appear in `git diff`
   - Verify Worker still works after deployment

---

## Step 7: Adding New Customers (Going Forward)

### Method 1: Cloudflare Dashboard
1. Go to **Workers & Pages** → **KV** → Your namespace
2. Click **"Add entry"**
3. **Key:** `user:newcustomer@company.com`
4. **Value:** `true`
5. Click **"Save"**

### Method 2: Wrangler CLI
```bash
cd workers
npx wrangler kv:key put "user:newcustomer@company.com" "true" --namespace-id=YOUR_NAMESPACE_ID
```

### Method 3: Worker API (if you create an admin endpoint)
```javascript
// Admin endpoint (protect with additional auth!)
if (request.url.includes('/admin/add-customer')) {
  const { email } = await request.json();
  await env.BRAND_PLUS_USERS.put(`user:${email}`, 'true');
  return new Response(JSON.stringify({ success: true }));
}
```

---

## Step 8: Remove Old Code from Repository

1. **Verify migration is complete:**
   - Test Worker with real customer emails
   - Confirm all customers can still access Brand+

2. **Remove from Git history** (optional but recommended):
   ```bash
   # This removes customer emails from Git history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch workers/api/user-permissions.js" \
     --prune-empty --tag-name-filter cat -- --all
   ```

   **Warning:** This rewrites Git history. Only do this if you're sure.

3. **Or simply ensure no emails are in current code:**
   - Verify `workers/api/user-permissions.js` has no customer emails
   - Commit the cleaned version

---

## Security Benefits

✅ **Customer emails no longer in source code**
✅ **Not visible in GitHub repository**
✅ **Only accessible via Cloudflare dashboard (with your login)**
✅ **Can be managed without code changes**
✅ **Encrypted at rest in Cloudflare KV**

---

## Troubleshooting

### Worker can't access KV
- Check namespace binding in Worker settings
- Verify `wrangler.toml` has correct namespace ID
- Ensure Worker has KV namespace bound

### Customers can't access Brand+
- Check KV entries exist (go to dashboard)
- Verify key format matches (`user:email@domain.com`)
- Check Worker logs for KV lookup errors

### Local development issues
- Run `npx wrangler dev` to test locally
- KV will use your namespace in development
- Or use `wrangler.toml` for local KV simulation

---

## Next Steps

After migration:
1. Test with real customer emails
2. Verify all customers can access Brand+
3. Document the new process for adding customers
4. Remove customer emails from any other files (if any)

---

**Note:** Keep your Cloudflare account secure! Anyone with access to your Cloudflare dashboard can see/modify customer emails in KV.

