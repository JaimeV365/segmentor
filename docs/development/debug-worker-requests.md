# Debugging Worker Requests

## If You Don't See Logs in Observability

### Step 1: Check Browser Console

1. **Open Browser DevTools**
   - Press `F12` or right-click → "Inspect"
   - Go to **"Console"** tab

2. **Try the Request Again**
   - Sign in with the email that's not working
   - Watch the console for errors

3. **Look For:**
   - CORS errors
   - Network errors (404, 500, etc.)
   - Failed fetch requests

### Step 2: Check Network Tab

1. **Open DevTools → Network Tab**
2. **Filter by:** `user-permissions`
3. **Try the request again**
4. **Click on the request** to see:
   - Request URL
   - Request headers
   - Response status
   - Response body

### Step 3: Check Worker Logs Location

**Correct Location:**
1. Cloudflare Dashboard
2. **Workers & Pages** → **segmentor** (your Worker)
3. **"Logs"** tab (NOT "Observability")
4. Or click **"Real-time Logs"** button

**Alternative:**
- Go to **Workers & Pages** → **Overview**
- Find your Worker
- Click on it
- Go to **"Logs"** tab

### Step 4: Verify Request is Reaching Worker

**If no logs appear:**
- The request might be failing before reaching the Worker
- Check browser console for CORS errors
- Check Network tab for failed requests
- Verify the Worker URL is correct: `https://segmentor.jaime-f57.workers.dev/api/user-permissions`

### Step 5: Test Directly

**Test the Worker directly:**
1. Open browser console
2. Run:
   ```javascript
   fetch('https://segmentor.jaime-f57.workers.dev/api/user-permissions', {
     headers: { 'X-User-Email': 'test@example.com' },
     credentials: 'include'
   }).then(r => r.json()).then(console.log)
   ```
3. Check Worker logs - you should see this request

