import { extractImageUrl, sleep, summarizeError, toJsonWithError } from '../utils.js';

function normalizeProxyUrl(proxyUrl) {
  return (proxyUrl || '').trim().replace(/\/$/, '');
}

function normalizeApiBase(apiBase) {
  return (apiBase || 'https://firefly-api.adobe.io').trim().replace(/\/$/, '');
}

function resolveStatusUrl(initialResponse, payload) {
  return (
    payload?.statusUrl ||
    payload?.status_url ||
    initialResponse.headers.get('location') ||
    initialResponse.headers.get('Location') ||
    ''
  );
}

async function pollFireflyStatus(statusUrl, headers, signal) {
  const maxAttempts = 80;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers,
      signal
    });
    const payload = await toJsonWithError(response);
    const imageUrl = extractImageUrl(payload);
    if (imageUrl) {
      return {
        imageUrl,
        payload
      };
    }

    const status = String(payload?.status || payload?.state || '').toLowerCase();
    if (status && ['succeeded', 'completed', 'done'].includes(status)) {
      throw new Error('Firefly job finished but image URL was not found in polling payload.');
    }
    if (status && ['failed', 'error', 'canceled'].includes(status)) {
      throw new Error(`Firefly job failed: ${payload?.error?.message || payload?.message || status}`);
    }

    // Keep polling until image URL appears or failed status is returned.
    await sleep(1500);
  }

  throw new Error('Firefly polling timed out');
}

async function generateWithFireflyProxy(finalPrompt, fireflySettings, signal) {
  const proxyUrl = normalizeProxyUrl(fireflySettings.proxyUrl);
  if (!proxyUrl) {
    throw new Error('Firefly proxy URL is not configured');
  }

  const headers = {
    'Content-Type': 'application/json'
  };

  if (fireflySettings.proxyToken) {
    headers['x-proxy-token'] = fireflySettings.proxyToken;
  }

  const response = await fetch(`${proxyUrl}/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: finalPrompt,
      model: fireflySettings.model || 'firefly-v3'
    }),
    signal
  });

  return toJsonWithError(response);
}

async function generateWithFireflyAccessToken(finalPrompt, fireflySettings, signal) {
  const accessToken = String(fireflySettings.accessToken || '').trim();
  const clientId = String(fireflySettings.clientId || '').trim();
  if (!accessToken || !clientId) {
    throw new Error('Firefly Client ID と Access Token を設定してください。');
  }

  const apiBase = normalizeApiBase(fireflySettings.apiBase);
  const model = fireflySettings.model || 'firefly-v3';
  const contentClass = fireflySettings.contentClass || 'photo';
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'x-api-key': clientId,
    'Content-Type': 'application/json'
  };

  const response = await fetch(`${apiBase}/v3/images/generate-async`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: finalPrompt,
      numVariations: 1,
      contentClass,
      model
    }),
    signal
  });
  const payload = await toJsonWithError(response);
  const imageUrl = extractImageUrl(payload);
  if (imageUrl) {
    return payload;
  }

  const statusUrl = resolveStatusUrl(response, payload);
  if (!statusUrl) {
    throw new Error('Firefly response missing status URL');
  }

  const polled = await pollFireflyStatus(statusUrl, headers, signal);
  return polled.payload;
}

export async function generateWithFirefly({ finalPrompt, settings, signal }) {
  const fireflySettings = settings.providers.firefly;
  const payload = fireflySettings.proxyUrl
    ? await generateWithFireflyProxy(finalPrompt, fireflySettings, signal)
    : await generateWithFireflyAccessToken(finalPrompt, fireflySettings, signal);
  const imageUrl = extractImageUrl(payload);
  if (!imageUrl) {
    throw new Error(`Firefly response did not include an image. payload=${summarizeError(payload)}`);
  }

  return {
    imageUrl,
    raw: payload,
    provider: 'firefly',
    model: fireflySettings.model || 'firefly-v3'
  };
}
