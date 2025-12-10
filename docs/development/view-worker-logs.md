# How to View Cloudflare Worker Logs

## Quick Access

1. **Go to Cloudflare Dashboard**
   - https://dash.cloudflare.com/

2. **Navigate to Your Worker**
   - Click **"Workers & Pages"** in left sidebar
   - Click on **"segmentor"** (your Worker name)

3. **View Logs**
   - Click the **"Logs"** tab at the top
   - Or click **"Real-time Logs"** button
   - You'll see all console.log() output and errors

## What to Look For

- **API Request logs** - Shows email, groups, hasEmail
- **KV lookup errors** - If KV access fails
- **Email extraction** - Whether email was found from cookie/header
- **Premium check results** - isEmailPremium, isDomainPremium values

## Filtering Logs

- Use the search box to filter by email address
- Look for errors (red text)
- Check timestamps to see recent requests

## Alternative: Real-time Tail

For live debugging:
1. Go to Worker → **"Logs"** tab
2. Click **"Start tailing"** or **"Real-time Logs"**
3. Make a request to your API
4. See logs appear in real-time

