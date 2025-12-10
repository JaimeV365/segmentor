export interface UserAccessProfile {
  isAuthenticated: boolean;
  email?: string;
  isPremium: boolean;
  groups?: string[];
}

export async function checkCloudflareAccess(): Promise<UserAccessProfile> {
  try {
    // Check for Cloudflare authentication headers/cookies
    const email = getCloudflareCookie();
    
    if (!email) {
      return {
        isAuthenticated: false,
        isPremium: false
      };
    }

    // Fetch user permissions from your backend
    // The cookie will be sent automatically with credentials: 'include'
    // We can optionally send the email in a header, but the Worker will decode from cookie if needed
    const response = await fetch('https://segmentor.jaime-f57.workers.dev/api/user-permissions', {
      headers: {
        'X-User-Email': email || '' // Send email if we extracted it
      },
      credentials: 'include' // This sends the CF_Authorization cookie automatically
    });

    if (!response.ok) {
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

function getCloudflareCookie(): string | null {
  // Extract email from Cloudflare CF_Authorization cookie (JWT)
  const cookieMatch = document.cookie.match(/CF_Authorization=([^;]+)/);
  if (!cookieMatch) {
    return null;
  }
  
  const token = cookieMatch[1];
  
  // Decode JWT to extract email
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      // Decode JWT payload (base64url)
      const payload = JSON.parse(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
      // Return email from payload
      return payload.email || payload.sub || null;
    }
  } catch (e) {
    console.error('Failed to decode CF_Authorization cookie:', e);
  }
  
  return null;
}