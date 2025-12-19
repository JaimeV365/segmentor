# Qualtrics Support Ticket - VPN/DNS Resolution Issue

## Message to Qualtrics Support

Hi,

Thank you for confirming that the intercept is working on your end. However, I've identified a **critical compatibility issue** that prevents the contact form from working for many users.

**The Problems:**
1. **VPN/DNS Issue:** The Qualtrics subdomain `zn11x8cucoswxgknc-teresamonroesandbox.siteintercept.qualtrics.com` fails to resolve when users are connected via VPNs (tested with Proton VPN, and likely affects other VPNs as well). This results in `ERR_NAME_NOT_RESOLVED` errors.

2. **Ad Blocker Issue:** The script is blocked by ad blockers and privacy extensions (uBlock Origin, AdBlock Plus, Privacy Badger, etc.) even though the URL is accessible (returns 200 OK). This results in `ERR_BLOCKED_BY_CLIENT` errors. The fetch succeeds, but the script tag injection is blocked.

**Testing Performed:**
- ✅ Intercept works correctly in Edge when VPN is disabled
- ❌ Intercept fails with `ERR_NAME_NOT_RESOLVED` when VPN is enabled (Proton VPN tested)
- ❌ Intercept fails with `ERR_BLOCKED_BY_CLIENT` in Firefox and Chrome (ad blockers/privacy extensions)
- ✅ DNS lookup confirms: `nslookup` returns "Non-existent domain" when VPN is active
- ✅ The subdomain IS accessible (verified via direct browser access without VPN - returns 200 OK)
- ✅ Fetch API can retrieve the script content (200 OK), but script tag injection is blocked
- ✅ CSP headers are correctly configured per your documentation
- ✅ Deployment code matches exactly what you provided

**Business Impact:**
This is a **critical blocker** for production use. Both issues affect a significant portion of users:

**VPN Issue:**
- Personal privacy VPNs (Proton, NordVPN, ExpressVPN, etc.)
- Corporate VPNs for remote workers
- Public WiFi VPNs for security

**Ad Blocker Issue:**
- Ad blockers are used by ~30% of internet users (uBlock Origin, AdBlock Plus, etc.)
- Privacy extensions (Privacy Badger, Ghostery, etc.)
- Browser built-in tracking protection (Firefox Enhanced Tracking Protection, Chrome privacy features)

If the contact form doesn't work for users on VPNs or with ad blockers, we cannot use this solution in production. This likely explains why you couldn't access the site from your work computer as well.

**Questions:**
1. **VPN/DNS:** Is there a way to configure the intercept to use a different subdomain or DNS configuration that works with VPNs?
2. **VPN/DNS:** Can Qualtrics whitelist common VPN DNS servers or provide alternative endpoints?
3. **Ad Blockers:** How can we prevent ad blockers from blocking the Qualtrics script? Are there alternative deployment methods?
4. **Ad Blockers:** Can Qualtrics provide a domain/subdomain that's less likely to be blocked by ad blocker filter lists?
5. **General:** Is there a fallback mechanism or alternative deployment method that doesn't rely on dynamic subdomains?
6. **General:** Are there any known workarounds for VPN and ad blocker compatibility issues?

**Deployment Details:**
- **URL:** https://segmentor.app/contact
- **Zone ID:** ZN_11X8CuCOswXGKnC
- **Status:** Intercept is published and active in Qualtrics dashboard

I need this resolved before we can go live, as a contact form that doesn't work for VPN users is not acceptable for our use case.

Thank you for your assistance.

Best regards,
Jaime
