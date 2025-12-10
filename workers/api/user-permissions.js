/**
 * Cloudflare Worker: User Permissions API
 * 
 * This worker validates Cloudflare Access authentication and returns Brand+ status
 * 
 * Deployment:
 * 1. Go to Cloudflare Dashboard → Workers & Pages
 * 2. Create a new Worker
 * 3. Copy this code into the worker
 * 4. Add route: segmentor.pages.dev/api/user-permissions
 * 5. Save and deploy
 */

// List of Brand+ user emails (exact matches)
// TODO: Replace this with your actual Brand+ user list
// For production, consider using Cloudflare KV storage or external database
const BRAND_PLUS_USERS = [
  // Add your Brand+ user emails here
  // Example: 'user@example.com',
  // Example: 'premium@company.com',
];

// Brand+ email domains (any email ending with these domains)
const BRAND_PLUS_DOMAINS = [
  '@teresamonroe.com',
];

// Brand+ user groups (if using Cloudflare Access groups)
const BRAND_PLUS_GROUPS = [
  'brand-plus',
  'premium',
];

export default {
  async fetch(request, env, ctx) {
    // Get the origin from the request for CORS
    const origin = request.headers.get('Origin') || 'https://segmentor.pages.dev';
    const allowedOrigins = [
      'https://segmentor.pages.dev',
      'https://segmentor.app',
      'http://localhost:3000' // For local development
    ];
    const allowOrigin = allowedOrigins.includes(origin) ? origin : 'https://segmentor.pages.dev';
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': allowOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-User-Email, X-Cloudflare-Email',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      // Get Cloudflare Access headers (if route is protected by Access)
      let email = request.headers.get('Cf-Access-Authenticated-User-Email');
      let groups = request.headers.get('Cf-Access-Groups')?.split(',') || [];
      
      // Fallback: Get email from custom header (if passed from client)
      // This is needed when Access isn't protecting the route directly
      if (!email) {
        email = request.headers.get('X-User-Email') || request.headers.get('X-Cloudflare-Email');
      }
      
      // If still no email, try to extract from CF_Authorization cookie
      if (!email) {
        const cookieHeader = request.headers.get('Cookie');
        if (cookieHeader) {
          const authCookie = cookieHeader.split(';').find(c => c.trim().startsWith('CF_Authorization='));
          if (authCookie) {
            try {
              const cookieValue = authCookie.split('=')[1];
              const parts = cookieValue.split('.');
              if (parts.length === 3) {
                // Decode JWT payload
                const payload = JSON.parse(
                  atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
                );
                email = payload.email || payload.sub || null;
              }
            } catch (e) {
              console.log('Could not decode cookie:', e);
            }
          }
        }
      }
      
      // Log for debugging (remove in production or use proper logging)
      console.log('API Request:', {
        email,
        groups,
        hasEmail: !!email,
        userAgent: request.headers.get('User-Agent'),
        allHeaders: Object.fromEntries(request.headers.entries()),
      });

      // Check if user is authenticated
      if (!email) {
        return new Response(
          JSON.stringify({ 
            error: 'Unauthorized',
            message: 'No Cloudflare Access authentication found'
          }), 
          {
            status: 401,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': allowOrigin,
              'Access-Control-Allow-Credentials': 'true',
            }
          }
        );
      }

    // Check if user has Brand+ access
    // Method 1: Check exact email match
    const isEmailPremium = BRAND_PLUS_USERS.includes(email);
    
    // Method 2: Check email domain (any email ending with @teresamonroe.com, etc.)
    const isDomainPremium = BRAND_PLUS_DOMAINS.some(domain => 
      email.toLowerCase().endsWith(domain.toLowerCase())
    );
    
    // Method 3: Check groups (if using Cloudflare Access groups)
    const isGroupPremium = groups.some(group => 
      BRAND_PLUS_GROUPS.includes(group.trim().toLowerCase())
    );
    
    const isPremium = isEmailPremium || isDomainPremium || isGroupPremium;

      // Return user permissions
      return new Response(
        JSON.stringify({
          email,
          isPremium,
          groups: groups.map(g => g.trim()),
          authenticated: true,
        }), 
        {
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowOrigin,
            'Access-Control-Allow-Credentials': 'true',
          }
        }
      );
    } catch (error) {
      console.error('Error in user-permissions API:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Internal Server Error',
          message: error.message 
        }), 
          {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': allowOrigin,
              'Access-Control-Allow-Credentials': 'true',
            }
          }
      );
    }
  },
};

