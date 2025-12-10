/**
 * Cloudflare Pages Function: User Permissions API
 * 
 * This function validates Cloudflare Access authentication and returns Brand+ status
 * 
 * Accessible at: segmentor.pages.dev/api/user-permissions
 */

// List of Brand+ user emails
// TODO: Replace this with your actual Brand+ user list
// For production, consider using Cloudflare KV storage or external database
const BRAND_PLUS_USERS = [
  // Add your Brand+ user emails here
  // Example: 'user@example.com',
  // Example: 'premium@company.com',
  // ADD YOUR BRAND+ USER EMAILS BELOW:
];

// Brand+ user groups (if using Cloudflare Access groups)
const BRAND_PLUS_GROUPS = [
  'brand-plus',
  'premium',
];

export async function onRequest({ request }) {
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Cloudflare-Email',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    // Get Cloudflare Access headers
    // These are automatically added by Cloudflare Access when user is authenticated
    const email = request.headers.get('Cf-Access-Authenticated-User-Email');
    const groups = request.headers.get('Cf-Access-Groups')?.split(',') || [];
    
    // Log for debugging (remove in production or use proper logging)
    console.log('API Request:', {
      email,
      groups,
      hasEmail: !!email,
      userAgent: request.headers.get('User-Agent'),
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
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Check if user has Brand+ access
    // Method 1: Check email list
    const isEmailPremium = BRAND_PLUS_USERS.includes(email);
    
    // Method 2: Check groups (if using Cloudflare Access groups)
    const isGroupPremium = groups.some(group => 
      BRAND_PLUS_GROUPS.includes(group.trim().toLowerCase())
    );
    
    const isPremium = isEmailPremium || isGroupPremium;

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
          'Access-Control-Allow-Origin': '*',
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
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

