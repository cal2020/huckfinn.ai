/**
 * Cloudflare Pages Function - Transcript Webhook
 *
 * Receives transcripts and forwards them to a Discord channel via webhook.
 * Supports both direct format and Omi AI format.
 *
 * Deployed to: https://huckfinn.ai/api/transcripts
 *
 * Environment Variables Required:
 *   DISCORD_WEBHOOK_URL - The Discord webhook URL for the target channel
 *
 * Usage:
 *   POST /api/transcripts
 *   Content-Type: application/json
 *
 *   Direct format: { "transcript": "...", "metadata": { "title": "..." } }
 *   Omi format: { "session_id": "...", "segments": [{ "text": "...", "speaker": "..." }] }
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

/**
 * Parse incoming payload - supports multiple formats
 */
function parsePayload(body) {
  // Omi format: { session_id, segments: [{ text, speaker, is_user }] }
  if (body.segments && Array.isArray(body.segments)) {
    const transcript = body.segments
      .map(seg => {
        const speaker = seg.is_user ? 'You' : (seg.speaker || 'Speaker');
        return `**${speaker}**: ${seg.text}`;
      })
      .join('\n\n');

    return {
      transcript,
      metadata: {
        title: body.structured?.title || `Omi Session ${new Date().toLocaleDateString()}`,
        session_id: body.session_id,
        source: 'Omi'
      }
    };
  }

  // Omi memory format: { id, structured: { title, overview }, transcript_segments }
  if (body.transcript_segments && Array.isArray(body.transcript_segments)) {
    const transcript = body.transcript_segments
      .map(seg => {
        const speaker = seg.is_user ? 'You' : (seg.speaker || 'Speaker');
        return `**${speaker}**: ${seg.text}`;
      })
      .join('\n\n');

    return {
      transcript: body.structured?.overview || transcript,
      metadata: {
        title: body.structured?.title || `Omi Memory ${new Date().toLocaleDateString()}`,
        session_id: body.id,
        source: 'Omi'
      }
    };
  }

  // Direct format: { transcript, metadata }
  if (body.transcript) {
    return {
      transcript: body.transcript,
      metadata: body.metadata || {}
    };
  }

  return null;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Check for Discord webhook URL
  const discordWebhookUrl = env.DISCORD_WEBHOOK_URL;
  if (!discordWebhookUrl) {
    return jsonResponse({ error: 'Discord webhook not configured' }, 500);
  }

  try {
    // Parse the incoming request
    const body = await request.json();

    // Log incoming payload for debugging
    console.log('Received payload:', JSON.stringify(body));

    const parsed = parsePayload(body);

    if (!parsed || !parsed.transcript) {
      return jsonResponse({
        error: 'Missing transcript in request body',
        hint: 'Expected { transcript: "..." } or Omi format { segments: [...] }'
      }, 400);
    }

    const { transcript, metadata } = parsed;

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
    fields.push({ name: 'Session ID', value: String(metadata.session_id), inline: true });
  }

  // thread_name required for forum channels
  const threadName = metadata.title || `Transcript ${new Date().toLocaleDateString()}`;

  return {
    thread_name: threadName,
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
