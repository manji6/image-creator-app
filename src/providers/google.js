import { extractImageUrl, summarizeError, toJsonWithError } from '../utils.js';

export async function generateWithGoogle({ finalPrompt, settings, signal }) {
  const googleSettings = settings.providers.google;
  if (!googleSettings.apiKey) {
    throw new Error('Google API key is not configured');
  }

  const model = googleSettings.model || 'gemini-2.5-flash-image-preview';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': googleSettings.apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: finalPrompt }]
        }
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    }),
    signal
  });

  const payload = await toJsonWithError(response);
  const imageUrl = extractImageUrl(payload);
  if (!imageUrl) {
    throw new Error(`Google response did not include an image. payload=${summarizeError(payload)}`);
  }

  return {
    imageUrl,
    raw: payload,
    provider: 'google',
    model
  };
}
