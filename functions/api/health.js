// Simple health check endpoint
export async function onRequestGet(context) {
  return new Response(JSON.stringify({
    status: 'ok',
    hasDiscordUrl: !!context.env.DISCORD_WEBHOOK_URL,
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
