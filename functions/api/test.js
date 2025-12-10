export async function onRequest() {
  return new Response(JSON.stringify({ message: 'Test function works' }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

