/**
 * Cloudflare Pages Function: Image Proxy
 * 
 * Fetches an external image server-side and returns it with CORS headers.
 * This allows the browser to use cross-origin images in canvas/PDF generation
 * even when the origin server blocks CORS or returns 403 to direct fetches.
 * 
 * Usage: /api/proxy-image?url=https://example.com/logo.svg
 */
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const imageUrl = url.searchParams.get('url');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const parsed = new URL(imageUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return new Response(JSON.stringify({ error: 'Only http/https URLs are allowed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const imgResponse = await fetch(imageUrl, {
      headers: {
        'Accept': 'image/svg+xml, image/png, image/jpeg, image/webp, image/*, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; SegmentorProxy/1.0)',
      },
    });

    if (!imgResponse.ok) {
      return new Response(JSON.stringify({ error: `Upstream returned ${imgResponse.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const contentType = imgResponse.headers.get('Content-Type') || 'application/octet-stream';
    const body = await imgResponse.arrayBuffer();

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        ...corsHeaders,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Proxy fetch failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
