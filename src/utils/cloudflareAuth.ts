export interface UserAccessProfile {
  isAuthenticated: boolean;
  email?: string;
  isPremium: boolean;
  groups?: string[];
}

// localStorage key for JWT token (cookie-free authentication)
const JWT_STORAGE_KEY = 'cf_auth_token';

// Store JWT in localStorage (cookie-free)
function storeJWT(token: string): void {
  try {
    localStorage.setItem(JWT_STORAGE_KEY, token);
    console.log('✅ JWT stored in localStorage');
  } catch (e) {
    console.error('Failed to store JWT in localStorage:', e);
  }
}

// Get JWT from localStorage
function getJWTFromStorage(): string | null {
  try {
    return localStorage.getItem(JWT_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to read JWT from localStorage:', e);
    return null;
  }
}

// Clear JWT from localStorage
function clearJWT(): void {
  try {
    localStorage.removeItem(JWT_STORAGE_KEY);
    console.log('🗑️ JWT cleared from localStorage');
  } catch (e) {
    console.error('Failed to clear JWT from localStorage:', e);
  }
}

// Extract email from JWT token
function extractEmailFromJWT(jwt: string): string | null {
  try {
    const parts = jwt.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      return payload.email || payload.sub || null;
    }
  } catch (e) {
    console.error('Failed to decode JWT:', e);
  }
  return null;
}

// Check if JWT is expired
function isJWTExpired(jwt: string): boolean {
  try {
    const parts = jwt.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return true; // Expired
      }
    }
  } catch (e) {
    console.error('Failed to check JWT expiration:', e);
  }
  return false;
}

export async function checkCloudflareAccess(): Promise<UserAccessProfile> {
  try {
    let jwt: string | null = null;
    let email: string | null = null;

    // Step 1: Try localStorage first (cookie-free)
    jwt = getJWTFromStorage();
    
    // Step 2: If no localStorage JWT, try to extract from cookie (initial login)
    // After login, we'll store it in localStorage for future use
    if (!jwt) {
      const cookieMatch = document.cookie.match(/CF_Authorization=([^;]+)/);
      if (cookieMatch) {
        jwt = cookieMatch[1];
        // Store in localStorage for future use (cookie-free after this)
        storeJWT(jwt);
        console.log('📦 Extracted JWT from cookie and stored in localStorage');
      }
    }

    // Step 3: Extract email from JWT
    if (jwt) {
      // Check if token is expired
      if (isJWTExpired(jwt)) {
        console.log('⏰ JWT expired, clearing...');
        clearJWT();
        return { isAuthenticated: false, isPremium: false };
      }
      
      email = extractEmailFromJWT(jwt);
    }
    
    console.log('🔍 Cloudflare Auth Check:', { 
      hasLocalStorageJWT: !!getJWTFromStorage(),
      hasCookie: !!document.cookie.match(/CF_Authorization=/),
      extractedEmail: email 
    });
    
    if (!email || !jwt) {
      console.log('⚠️ No JWT or email found - user not authenticated');
      return {
        isAuthenticated: false,
        isPremium: false
      };
    }

    console.log('📡 Calling Worker API for:', email);
    // Fetch user permissions from backend using JWT from localStorage
    // Send JWT in Authorization header (cookie-free)
    const response = await fetch('https://segmentor.jaime-f57.workers.dev/api/user-permissions', {
      headers: {
        'X-User-Email': email,
        'Authorization': `Bearer ${jwt}` // Send JWT in header instead of cookie
      }
      // No credentials: 'include' - we're using localStorage, not cookies
    });
    
    console.log('📥 Worker API Response:', { 
      status: response.status, 
      ok: response.ok 
    });

    if (!response.ok) {
      // If verification fails, token might be invalid - clear it
      if (response.status === 401) {
        clearJWT();
      }
      return {
        isAuthenticated: false,
        isPremium: false
      };
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
    return {
      isAuthenticated: false,
      isPremium: false
    };
  }
}