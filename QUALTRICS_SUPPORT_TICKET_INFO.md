# Qualtrics Support Ticket Information

## Project Details
- **Zone ID**: `ZN_11X8CuCOswXGKnC`
- **Deployment URL**: `https://zn11x8cucoswxgknc-teresamonroesandbox.siteintercept.qualtrics.com/SIE/?Q_ZID=ZN_11X8CuCOswXGKnC`
- **Website Domain**: `segmentor.app`
- **Public URL**: `https://segmentor.app/contact.html` ✅ **Publicly accessible** (no authentication required)
- **Status**: Intercept is **Active and Published** in Qualtrics

## Issue Summary
The Qualtrics intercept is not loading on our website (`segmentor.app/contact.html`) despite being active and published. The deployment code is correctly implemented, but the intercept does not appear in any browser.

## Console Errors Observed

### Firefox
```
The resource at "https://zn11x8cucoswxgknc-teresamonroesandbox.siteintercept.qualtrics.com/SIE/?Q_ZID=ZN_11X8CuCOswXGKnC" was blocked because Enhanced Tracking Protection is enabled.
```

**Note**: Even after disabling Enhanced Tracking Protection, the intercept still does not load.

### Chrome & Edge
```
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
SIE/:1 Failed to load resource: net::ERR_NAME_NOT_RESOLVED
```

**Additional Console Output**:
```
❌ Qualtrics chunk failed to load: https://zn11x8cucoswxgknc-teresamonroesandbox.siteintercept.qualtrics.com/SIE/?Q_ZID=ZN_11X8CuCOswXGKnC
   Current domain: segmentor.app
   Qualtrics object exists: false
   Target div exists: true
   Target div has children: 0
```

## Network Request Status

### Direct URL Access
When accessing the deployment URL directly in a browser:
- ✅ **Returns JavaScript code** (the orchestrator script loads successfully)
- ✅ **HTTP Status**: 200 OK
- ✅ **Content-Type**: `application/javascript`

### From Website
When loading from `segmentor.app/contact.html`:
- ❌ **Network request fails** with `ERR_NAME_NOT_RESOLVED` (Chrome/Edge)
- ❌ **Blocked by Enhanced Tracking Protection** (Firefox)
- ❌ **No network request appears** in some cases (suggesting script never executes)

## Implementation Details

### Deployment Code Location
- Script placed in `<head>` section (per Qualtrics documentation)
- Target div `<div id='ZN_11X8CuCOswXGKnC'>` placed in `<body>`
- Code matches exactly what was provided in Qualtrics Deployment tab

### Content Security Policy (CSP)
We have configured CSP headers as per Qualtrics documentation:

**Meta Tag (in HTML)**:
```
connect-src https://*.qualtrics.com; 
frame-src https://*.qualtrics.com; 
img-src https://siteintercept.qualtrics.com data:; 
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.qualtrics.com; 
style-src 'self' 'unsafe-inline' https://*.qualtrics.com;
```

**Cloudflare Pages Headers** (`_headers` file):
```
/contact.html
  Content-Security-Policy: connect-src https://*.qualtrics.com; frame-src https://*.qualtrics.com; img-src https://siteintercept.qualtrics.com data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.qualtrics.com; style-src 'self' 'unsafe-inline' https://*.qualtrics.com;
```

## Questions for Qualtrics Support

1. **Domain Whitelisting**: Is `segmentor.app` whitelisted/configured in the Qualtrics project settings? Do we need to explicitly add our domain?

2. **Intercept Targeting Logic**: 
   - Are there any targeting conditions that might prevent the intercept from showing?
   - Should we check the intercept's "Website Conditions" or "Action Set Logic"?

3. **Sandbox Account**: The subdomain includes `teresamonroesandbox` - could this be a sandbox/test account limitation? Do sandbox accounts have restrictions on which domains can use intercepts?

4. **DNS/Subdomain**: 
   - The subdomain `zn11x8cucoswxgknc-teresamonroesandbox.siteintercept.qualtrics.com` resolves when accessed directly, but fails when loaded from our website. Is this expected behavior?
   - Could there be CORS or referrer restrictions?

5. **Browser Compatibility**: 
   - Why does Firefox show a tracking protection error even after disabling Enhanced Tracking Protection?
   - Why does Chrome/Edge show `ERR_NAME_NOT_RESOLVED` when the URL works when accessed directly?

6. **Network Request Verification**: 
   - Should we see a network request to `?Q_ZID=ZN_11X8CuCOswXGKnC` in the browser's Network tab?
   - If no request appears, what could prevent the deployment code from executing?

7. **Activation Status**: 
   - We've confirmed the intercept is "Active" and "Published" - are there any other status checks we should verify?
   - Could there be a delay in activation propagation?

## Testing Performed

- ✅ Verified deployment code matches Qualtrics exactly
- ✅ Confirmed intercept is Active and Published
- ✅ Tested in multiple browsers (Chrome, Edge, Firefox)
- ✅ Disabled browser privacy features (tracking protection, ad blockers)
- ✅ Verified CSP headers are configured correctly
- ✅ Confirmed target div exists in DOM
- ✅ Direct URL access returns JavaScript successfully
- ❌ Intercept does not appear on website
- ❌ Network requests fail from website context

## Additional Information

- **Hosting**: Cloudflare Pages
- **Browser Developer Tools**: Network tab shows no successful requests to Qualtrics domains
- **Console**: Qualtrics object (`window.QSI`) never initializes
- **Target Div**: Remains empty (no content inserted)

## Next Steps Requested

1. Verify domain whitelisting/configuration for `segmentor.app`
2. Review intercept targeting logic and conditions
3. Check if sandbox accounts have domain restrictions
4. Investigate why direct URL access works but website loading fails
5. Provide guidance on debugging intercept deployment issues
