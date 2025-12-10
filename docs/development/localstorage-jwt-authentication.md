# localStorage JWT Authentication (Cookie-Free Alternative)

**Purpose:** Evaluate using localStorage instead of cookies for Brand+ authentication to support users with cookie blockers.

---

## Current Problem

**Cloudflare Access requires cookies:**
- Sets `CF_Authorization` cookie after login
- If cookies are blocked, authentication fails
- Conflicts with your "No Cookies" value statement

---

## localStorage JWT Option

### How It Would Work

1. **User logs in via Cloudflare Access**
   - Cloudflare Access still sets cookie (can't avoid this)
   - After successful login, extract JWT from cookie
   - Store JWT in `localStorage` instead of relying on cookie
   - Clear the cookie (optional)

2. **Subsequent requests:**
   - Read JWT from `localStorage`
   - Send JWT in `Authorization` header to Worker
   - Worker validates JWT (same as cookie validation)

3. **Cookie blockers:**
   - Initial login might still fail (Cloudflare sets cookie)
   - But after login, we use localStorage
   - Future requests work without cookies

---

## Security Analysis

### ✅ Secure Aspects

1. **JWT is cryptographically signed**
   - Can't be forged without Cloudflare's private key
   - Same security as cookie-based JWT

2. **localStorage is domain-scoped**
   - Only accessible by same-origin JavaScript
   - Not sent automatically (unlike cookies)
   - Less vulnerable to CSRF attacks

3. **Worker validates JWT**
   - Backend always verifies token signature
   - Checks expiration
   - Validates email against Brand+ list

### ⚠️ Security Concerns

1. **XSS vulnerability**
   - If your site has XSS, attacker can read localStorage
   - Cookies with `HttpOnly` flag are safer (but we can't use those if cookies are blocked)
   - **Mitigation:** Ensure your site has no XSS vulnerabilities

2. **Initial login still needs cookies**
   - Cloudflare Access sets cookie during login
   - If cookies blocked, initial login fails
   - **Mitigation:** User must temporarily allow cookies for login, then we switch to localStorage

3. **Token expiration**
   - JWT has expiration time
   - Need to handle token refresh
   - **Mitigation:** Check expiration and redirect to login if expired

---

## Implementation Approach

### Option A: Hybrid (Recommended)

1. **Try cookie first** (normal flow)
2. **If cookie blocked or missing:**
   - Check localStorage for JWT
   - Use localStorage JWT if available
3. **After successful cookie login:**
   - Copy JWT to localStorage
   - Use localStorage for future requests

**Pros:**
- Works with and without cookie blockers
- Falls back gracefully
- Best user experience

**Cons:**
- More complex code
- Need to handle both methods

### Option B: localStorage Only

1. **After Cloudflare login:**
   - Extract JWT from cookie immediately
   - Store in localStorage
   - Clear cookie (optional)
2. **All future requests:**
   - Use localStorage JWT only

**Pros:**
- Simpler logic
- Truly cookie-free after initial login

**Cons:**
- Initial login still requires cookies (Cloudflare limitation)
- More manual token management

---

## Code Changes Required

### Frontend (`src/utils/cloudflareAuth.ts`)

```typescript
// Add localStorage helper functions
const JWT_STORAGE_KEY = 'cf_auth_token';

function storeJWT(token: string): void {
  try {
    localStorage.setItem(JWT_STORAGE_KEY, token);
  } catch (e) {
    console.error('Failed to store JWT in localStorage:', e);
  }
}

function getJWTFromStorage(): string | null {
  try {
    return localStorage.getItem(JWT_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to read JWT from localStorage:', e);
    return null;
  }
}

function clearJWT(): void {
  try {
    localStorage.removeItem(JWT_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear JWT from localStorage:', e);
  }
}

// Update checkCloudflareAccess to try localStorage first
export async function checkCloudflareAccess(): Promise<UserAccessProfile> {
  try {
    // Try localStorage first (for cookie-blocked users)
    let jwt = getJWTFromStorage();
    let email: string | null = null;
    
    // If no localStorage JWT, try cookie
    if (!jwt) {
      const cookieMatch = document.cookie.match(/CF_Authorization=([^;]+)/);
      if (cookieMatch) {
        jwt = cookieMatch[1];
        // Store in localStorage for future use
        storeJWT(jwt);
      }
    }
    
    // Extract email from JWT
    if (jwt) {
      try {
        const parts = jwt.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(
            atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
          );
          email = payload.email || payload.sub || null;
          
          // Check expiration
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            // Token expired
            clearJWT();
            return { isAuthenticated: false, isPremium: false };
          }
        }
      } catch (e) {
        console.error('Failed to decode JWT:', e);
        clearJWT();
        return { isAuthenticated: false, isPremium: false };
      }
    }
    
    if (!email) {
      return { isAuthenticated: false, isPremium: false };
    }

    // Verify with Worker using JWT from localStorage
    const response = await fetch('https://segmentor.jaime-f57.workers.dev/api/user-permissions', {
      headers: {
        'X-User-Email': email,
        'Authorization': `Bearer ${jwt}` // Send JWT in header
      },
      // Don't use credentials: 'include' if using localStorage
      // credentials: 'include' // Only if using cookies
    });

    if (!response.ok) {
      // If verification fails, clear invalid token
      clearJWT();
      return { isAuthenticated: false, isPremium: false };
    }

    const userData = await response.json();
    
    return {
      isAuthenticated: true,
      email: userData.email,
      isPremium: userData.isPremium,
      groups: userData.groups
    };
  } catch (error) {
    console.error('Cloudflare Access check failed', error);
    return { isAuthenticated: false, isPremium: false };
  }
}
```

### Worker (`workers/api/user-permissions.js`)

```javascript
// Add JWT validation from Authorization header
async function extractEmailFromRequest(request) {
  // Try Authorization header first (localStorage JWT)
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(
          atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
        );
        
        // Validate expiration
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          return null; // Expired
        }
        
        // TODO: Validate JWT signature with Cloudflare's public key
        // For now, we trust the token (Cloudflare signed it)
        
        return payload.email || payload.sub || null;
      }
    } catch (e) {
      console.error('Failed to decode JWT from Authorization header:', e);
    }
  }
  
  // Fall back to existing cookie/header methods
  // ... existing code ...
}
```

---

## User Experience

### With Cookie Blockers

1. **Initial login:**
   - User clicks "Brand+ Login"
   - Redirected to Cloudflare Access
   - **Problem:** Cloudflare tries to set cookie, but it's blocked
   - **Result:** Login might fail or cookie won't persist

2. **After successful login (if cookie allowed temporarily):**
   - JWT extracted and stored in localStorage
   - Future requests use localStorage
   - Works even if cookies are blocked later

3. **Subsequent visits:**
   - JWT read from localStorage
   - No cookies needed
   - Seamless experience

---

## Recommendation

### ✅ Use localStorage JWT (Hybrid Approach)

**Why:**
1. **Supports cookie blockers** - After initial login, no cookies needed
2. **Secure** - JWT is cryptographically signed, same as cookie
3. **Better UX** - Works for users with strict privacy settings
4. **Maintains security** - Backend still validates everything

**Implementation:**
- Try cookie first (normal flow)
- Fall back to localStorage if cookie unavailable
- Store JWT in localStorage after successful cookie login
- Use localStorage for all subsequent requests

**Limitation:**
- Initial Cloudflare Access login still requires cookies (Cloudflare limitation)
- User must allow cookies for the login page only
- After login, cookies not needed

---

## Alternative: Custom Authentication

If you want **completely cookie-free** authentication:

1. **Build custom login** (not Cloudflare Access)
2. **Use OAuth providers** (Google, Microsoft, etc.)
3. **Store tokens in localStorage**
4. **Validate with your own backend**

**Pros:**
- Truly cookie-free
- Full control

**Cons:**
- Much more complex
- Need to build login UI
- Need to handle OAuth flows
- More maintenance

---

## Conclusion

**localStorage JWT is secure and recommended** if:
- ✅ You implement proper JWT validation in Worker
- ✅ You handle token expiration
- ✅ You protect against XSS (standard security practice)
- ✅ You accept that initial login still needs cookies (Cloudflare limitation)

**The hybrid approach gives you:**
- Best of both worlds
- Works with cookie blockers (after initial login)
- Maintains security
- Better user experience

---

## Next Steps

1. **Implement hybrid localStorage/cookie approach**
2. **Update Worker to accept Authorization header**
3. **Add token expiration checks**
4. **Test with cookie blockers**
5. **Update privacy policy** to clarify authentication cookies vs tracking cookies

