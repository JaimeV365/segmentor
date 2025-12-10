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
    const response = await fetch('https://segmentor.jaime-f57.workers.dev/api/user-permissions', {
      headers: {
        'X-Cloudflare-Email': email
      },
      credentials: 'include'
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
  // Extract email from Cloudflare headers or cookies
  // This will depend on your Cloudflare configuration
  return document.cookie.match(/CF_Authorization=([^;]+)/)?.[1] || null;
}