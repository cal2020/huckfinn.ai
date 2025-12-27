/**
 * Cloudflare Pages Function - Transcript Webhook
 *
 * Receives transcripts and forwards them to a Discord channel via webhook.
 *
 * Deployed to: https://huckfinn.ai/api/transcripts
 *
 * Environment Variables Required:
 *   DISCORD_WEBHOOK_URL - The Discord webhook URL for the target channel
 *
 * Usage:
 *   POST /api/transcripts
 *   Content-Type: application/json
 *   Body: { "transcript": "...", "metadata": { ... } }
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Check for Discord webhook URL
  const discordWebhookUrl = env.DISCORD_WEBHOOK_URL;
  if (!discordWebhookUrl) {
    return jsonResponse({ error: 'Discord webhook not configured' }, 500);
  }

  try {
    // Parse the incoming transcript
    const body = await request.json();
    const { transcript, metadata = {} } = body;

    if (!transcript) {
      return jsonResponse({ error: 'Missing transcript in request body' }, 400);
    }

    // Format the Discord message
    const discordMessage = formatDiscordMessage(transcript, metadata);

    // Send to Discord
    const discordResponse = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordMessage)
    });

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text();
      console.error('Discord webhook error:', errorText);
      return jsonResponse({
        error: 'Failed to send to Discord',
        details: errorText
      }, 502);
    }

    return jsonResponse({
      success: true,
      message: 'Transcript forwarded to Discord'
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return jsonResponse({
      error: 'Failed to process transcript',
      details: error.message
    }, 500);
  }
}

/**
 * Format transcript for Discord embed message
 */
function formatDiscordMessage(transcript, metadata) {
  const timestamp = new Date().toISOString();

  // Truncate transcript if too long (Discord limit is 4096 for embed description)
  const maxLength = 4000;
  const truncatedTranscript = transcript.length > maxLength
    ? transcript.substring(0, maxLength) + '\n\n... [truncated]'
    : transcript;

  // Build embed fields from metadata
  const fields = [];
  if (metadata.source) {
    fields.push({ name: 'Source', value: metadata.source, inline: true });
  }
  if (metadata.duration) {
    fields.push({ name: 'Duration', value: metadata.duration, inline: true });
  }
  if (metadata.session_id) {
    fields.push({ name: 'Session ID', value: metadata.session_id, inline: true });
  }

  return {
    embeds: [{
      title: metadata.title || 'New Transcript Received',
      description: truncatedTranscript,
      color: 0x5865F2, // Discord blurple
      fields: fields.length > 0 ? fields : undefined,
      footer: {
        text: 'HuckFinn.ai Transcript Webhook'
      },
      timestamp: timestamp
    }]
  };
}

// Handle OPTIONS for CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
}
