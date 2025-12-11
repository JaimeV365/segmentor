# Fix SSL Error 525 (SSL Handshake Failed)

## What is Error 525?

Error 525 means Cloudflare couldn't establish a secure SSL/TLS connection to your origin server. This typically happens when:

1. **SSL/TLS encryption mode is set incorrectly** (most common)
2. **Custom domain has SSL issues**
3. **Origin server doesn't have valid SSL certificate**

## Quick Fix (Most Common Solution)

### Step 1: Check SSL/TLS Mode

1. **Go to Cloudflare Dashboard**
   - Navigate to: https://dash.cloudflare.com/
   - Select your account

2. **Select Your Domain**
   - If you have `segmentor.app` as a custom domain, select it
   - If you only use `segmentor.pages.dev`, you may not see this option (Pages.dev domains are managed by Cloudflare)

3. **Go to SSL/TLS Settings**
   - In the left sidebar, click **"SSL/TLS"**
   - Click **"Overview"** tab

4. **Check Encryption Mode**
   - You should see: **"Encryption mode"**
   - Current setting will be shown (e.g., "Flexible", "Full", "Full (strict)")

5. **Change to "Full"**
   - If it's set to **"Flexible"** → Change to **"Full"**
   - If it's already **"Full"** → Try **"Full (strict)"** (only if your origin has valid SSL)
   - **"Full (strict)"** is the most secure but requires a valid SSL certificate on your origin

### Step 2: Verify Custom Domain in Cloudflare Pages (CRITICAL - Most Likely Issue)

**This is the most common cause when SSL mode is already "Full"**

1. **Go to Workers & Pages**
   - In Cloudflare Dashboard, click **"Workers & Pages"**
   - Select your **"segmentor"** Pages project (NOT the Worker)

2. **Check Custom Domains Tab**
   - Click **"Custom domains"** tab
   - Look for `segmentor.app` in the list

3. **Check Domain Status**
   - **If domain is NOT listed:**
     - Click **"Set up a custom domain"** or **"Add custom domain"**
     - Enter: `segmentor.app`
     - Follow the DNS setup instructions
     - Wait 5-15 minutes for SSL provisioning
   
   - **If domain IS listed but shows error:**
     - Click on `segmentor.app` to view details
     - Check the status:
       - ✅ **"Active"** = Good, but check DNS
       - ⚠️ **"Pending"** = Wait for SSL provisioning (5-15 min)
       - ❌ **"Error"** = DNS misconfigured or SSL issue
   
   - **If domain shows "Active" but still getting 525:**
     - Click **"Remove"** or **"Delete"** on the domain
     - Wait 1 minute
     - Click **"Set up a custom domain"** again
     - Re-add `segmentor.app`
     - This will trigger SSL certificate re-provisioning

4. **Verify DNS Configuration**
   - Go to your domain's DNS settings (in Cloudflare Dashboard, select `segmentor.app` domain)
   - Check DNS records:
     - Should have a **CNAME** record: `segmentor.app` → `segmentor.pages.dev`
     - OR an **A** record pointing to Cloudflare Pages IP
   - If DNS is wrong, fix it and wait for propagation (5-15 minutes)

### Step 3: Wait for Propagation

- SSL changes can take **5-15 minutes** to propagate
- Clear your browser cache
- Try accessing the site again

## If Error Persists

### Check Cloudflare Access Application

If the error happens when accessing Brand+ login:

1. **Go to Zero Trust → Access → Applications**
2. **Find your Brand+ application**
3. **Check Application Domain**
   - Should be: `segmentor.pages.dev` or `segmentor.app`
   - Must match your actual domain

4. **Check for Custom Origin**
   - If there's a custom origin server configured, ensure it has valid SSL
   - For Cloudflare Pages, you typically don't need a custom origin

### Verify Worker Configuration

1. **Go to Workers & Pages → segmentor (Worker)**
2. **Check Routes**
   - Ensure routes are configured correctly
   - No custom origin servers that might have SSL issues

## Common Causes

| Cause | Solution |
|-------|----------|
| SSL mode is "Flexible" | Change to "Full" or "Full (strict)" |
| Custom domain not connected to Pages | Add domain in Pages → Custom domains |
| Custom domain SSL not provisioned | Wait 5-15 minutes for auto-provisioning |
| DNS misconfigured | Fix CNAME/A record pointing to Pages |
| Domain needs re-provisioning | Remove and re-add custom domain |
| Invalid origin SSL certificate | Use "Full" instead of "Full (strict)" |
| Custom origin server misconfigured | Remove custom origin or fix SSL on origin |

## Still Having Issues?

1. **Check Cloudflare Status Page**: https://www.cloudflarestatus.com/
2. **Review Cloudflare Logs**: Workers & Pages → Your Project → Logs
3. **Contact Cloudflare Support**: If issue persists after trying above steps

