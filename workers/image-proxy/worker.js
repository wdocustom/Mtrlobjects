/**
 * MTRL Image Proxy — Cloudflare Worker
 * =====================================
 * Sits between the Squarespace widget and Stability AI.
 * Keeps the API key server-side (stored as a Cloudflare secret).
 *
 * Flow:
 *   Browser widget  →  this Worker  →  Stability AI  →  this Worker  →  Browser
 *
 * Deploy:
 *   cd workers/image-proxy
 *   wrangler secret put STABILITY_API_KEY   (paste your key)
 *   wrangler deploy
 */

// -----------------------------------------------------------------
// CONFIGURATION
// -----------------------------------------------------------------

/**
 * Allowed origins for CORS. Replace with your actual Squarespace
 * domain(s) before going live. During development you can leave
 * the wildcard, but lock it down for production.
 */
const ALLOWED_ORIGINS = [
  // Replace these with your real domains:
  'https://www.yoursite.com',
  'https://yoursite.com',
  // Keep localhost for testing:
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

/** Stability AI image-to-image endpoint (SD3 / SD3.5) */
const STABILITY_URL =
  'https://api.stability.ai/v2beta/stable-image/generate/sd3';

// -----------------------------------------------------------------
// CORS HELPERS
// -----------------------------------------------------------------

/**
 * Build CORS headers. In production, restrict Access-Control-Allow-Origin
 * to your known domains. For initial testing we allow the request origin
 * if it's in the allowlist, or fall back to the first allowed origin.
 */
const corsHeaders = (requestOrigin) => {
  const origin = ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
};

/** Handle CORS preflight (OPTIONS) requests. */
const handleOptions = (request) => {
  const origin = request.headers.get('Origin') || '';
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
};

// -----------------------------------------------------------------
// MAIN HANDLER
// -----------------------------------------------------------------

export default {
  async fetch(request, env) {
    // --- CORS preflight ---
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin);

    // --- Only accept POST ---
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json', ...cors } }
      );
    }

    // --- Ensure API key is configured ---
    if (!env.STABILITY_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Server misconfigured — missing API key' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
      );
    }

    try {
      // --- Parse the incoming request from the widget ---
      const body = await request.json();
      const { image_base64, prompt, style, strength } = body;

      if (!image_base64 || !prompt) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: image_base64, prompt' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...cors } }
        );
      }

      // ---------------------------------------------------------
      // BUILD THE STABILITY AI REQUEST
      //
      // Stability's v2beta endpoint expects multipart/form-data,
      // not JSON. We convert the base64 image to a Blob and
      // assemble a FormData payload.
      // ---------------------------------------------------------

      // Strip the data URI prefix if present:
      //   "data:image/png;base64,iVBOR..." → "iVBOR..."
      const rawBase64 = image_base64.includes(',')
        ? image_base64.split(',')[1]
        : image_base64;

      // Detect MIME type from the data URI prefix, default to png
      const mimeMatch = image_base64.match(/^data:(image\/\w+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      const extension = mimeType.split('/')[1] || 'png';

      // Decode base64 → binary → Blob
      const binaryString = atob(rawBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const imageBlob = new Blob([bytes], { type: mimeType });

      // Assemble the multipart form
      const formData = new FormData();
      formData.append('image', imageBlob, `input.${extension}`);
      formData.append('prompt', prompt);
      formData.append('mode', 'image-to-image');
      formData.append('output_format', 'png');

      // strength: 0.0 = almost identical to input,
      //           1.0 = completely reimagined.
      // Default 0.65 is a good balance for style transfer.
      formData.append('strength', String(strength ?? 0.65));

      // Optional: if you want to use a specific model variant
      // formData.append('model', 'sd3.5-large');

      // ---------------------------------------------------------
      // CALL STABILITY AI
      // ---------------------------------------------------------
      const stabilityResponse = await fetch(STABILITY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.STABILITY_API_KEY}`,
          'Accept': 'image/*',
        },
        body: formData,
      });

      // ---------------------------------------------------------
      // HANDLE THE RESPONSE
      // ---------------------------------------------------------
      if (!stabilityResponse.ok) {
        const errorText = await stabilityResponse.text();
        console.error('Stability AI error:', stabilityResponse.status, errorText);
        return new Response(
          JSON.stringify({
            error: `Stability AI returned ${stabilityResponse.status}`,
            detail: errorText,
          }),
          { status: 502, headers: { 'Content-Type': 'application/json', ...cors } }
        );
      }

      // Stability returns the raw image bytes when Accept: image/*
      const imageBuffer = await stabilityResponse.arrayBuffer();
      const resultBase64 = btoa(
        String.fromCharCode(...new Uint8Array(imageBuffer))
      );

      // Return the generated image as a base64 data URI
      return new Response(
        JSON.stringify({
          image: `data:image/png;base64,${resultBase64}`,
          style,
          prompt,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...cors },
        }
      );

    } catch (err) {
      console.error('Worker error:', err);
      return new Response(
        JSON.stringify({ error: err.message || 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...cors } }
      );
    }
  },
};
