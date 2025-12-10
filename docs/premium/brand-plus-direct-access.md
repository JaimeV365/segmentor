# Brand+ Direct Access Link

## Overview

Brand+ users can use a direct access link to quickly sign in and access the tool without navigating through the main website.

## Direct Access URL

**For Brand+ Users:**
```
https://segmentor.pages.dev/brand-plus.html
```

This URL:
- Shows the Brand+ sign-in page immediately
- After authentication, redirects to `/tool/` with Brand+ features active
- Provides a bookmarkable link for returning Brand+ users

## Usage

### For Brand+ Users

1. **Bookmark the link:** Save `https://segmentor.pages.dev/brand-plus.html` as a bookmark
2. **Share with team:** Provide this link to team members who have Brand+ access
3. **Email signature:** Include this link in email signatures for easy access

### For Administrators

1. **Share in onboarding:** Include this link when onboarding new Brand+ users
2. **Support documentation:** Reference this link in support materials
3. **Email templates:** Use this link in welcome emails for Brand+ subscribers

## User Flow

1. User visits `/brand-plus.html`
2. Clicks "Sign in with Cloudflare Access"
3. Completes Cloudflare Access authentication
4. System verifies Brand+ status via `/api/user-permissions`
5. User is redirected to `/tool/` with Brand+ features active

## Alternative Access Methods

### From Main Website
- Click "Sign in" button in the top-right corner (always visible)
- Click "Upgrade to Brand+" in the drawer menu

### From Saved Files
- When loading a `.seg` file created by a Brand+ user, the system will prompt for login
- Click "Yes" to be redirected to the sign-in page

## Security Notes

- The direct access link does not bypass authentication
- Users must still complete Cloudflare Access login
- Only users in the Brand+ user list will have access
- The link is public, but access is protected by Cloudflare Access

## Related Documentation

- `docs/premium/brand-plus-login-setup.md` - Login flow setup
- `docs/premium/cloudflare-worker-setup.md` - API setup
- `docs/premium/cloudflare-access-setup-guide.md` - Access configuration

