const tokenCache = {
  value: '',
  expiresAt: 0
};

function buildCorsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,x-proxy-token',
    Vary: 'Origin'
  };
}

function jsonResponse(body, env, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...buildCorsHeaders(env)
    }
  });
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function getAdobeToken(env) {
  const now = Date.now();
  if (tokenCache.value && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.value;
  }

  const tokenUrl = env.ADOBE_IMS_URL || 'https://ims-na1.adobelogin.com/ims/token/v3';
  const scope = env.ADOBE_SCOPE || 'openid,AdobeID,read_organizations,firefly_api,ff_apis';

  const form = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.FIREFLY_CLIENT_ID,
    client_secret: env.FIREFLY_CLIENT_SECRET,
    scope
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(`Adobe token request failed: ${payload?.error_description || payload?.error || response.status}`);
  }

  const accessToken = payload?.access_token;
  const expiresIn = Number(payload?.expires_in || 300);
  if (!accessToken) {
    throw new Error('Adobe token response missing access_token');
  }

  tokenCache.value = accessToken;
  tokenCache.expiresAt = Date.now() + expiresIn * 1000;
  return accessToken;
}

function extractImageUrl(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  if (typeof payload.imageUrl === 'string' && payload.imageUrl) {
    return payload.imageUrl;
  }

  if (Array.isArray(payload.images) && payload.images.length > 0) {
    const first = payload.images[0];
    if (typeof first === 'string') {
      return first;
    }
    if (first && typeof first.url === 'string') {
      return first.url;
    }
  }

  if (Array.isArray(payload.outputs) && payload.outputs.length > 0) {
    const first = payload.outputs[0];
    if (typeof first?.url === 'string') {
      return first.url;
    }
    if (typeof first?.image?.url === 'string') {
      return first.image.url;
    }
  }

  if (typeof payload.url === 'string' && payload.url) {
    return payload.url;
  }

  return '';
}

function resolveStatusUrl(initialResponse, initialPayload) {
  return (
    initialPayload?.statusUrl ||
    initialPayload?.status_url ||
    initialResponse.headers.get('location') ||
    initialResponse.headers.get('Location') ||
    ''
  );
}

async function pollFirefly(statusUrl, headers, env) {
  const maxAttempts = Number(env.FIREFLY_POLL_MAX_ATTEMPTS || 40);
  const intervalMs = Number(env.FIREFLY_POLL_INTERVAL_MS || 1500);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(statusUrl, { headers });
    const payload = await parseJsonSafe(response);

    if (!response.ok) {
      throw new Error(`Firefly polling failed: ${payload?.error?.message || response.status}`);
    }

    const imageUrl = extractImageUrl(payload);
    if (imageUrl) {
      return { payload, imageUrl };
    }

    const status = String(payload?.status || payload?.state || '').toLowerCase();
    if (status && ['failed', 'error', 'canceled'].includes(status)) {
      throw new Error(`Firefly job failed: ${payload?.error?.message || payload?.message || status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error('Firefly polling timed out');
}

async function handleGenerate(request, env) {
  if (!env.FIREFLY_CLIENT_ID || !env.FIREFLY_CLIENT_SECRET) {
    return jsonResponse(
      {
        error: 'Firefly credentials are missing. Set FIREFLY_CLIENT_ID and FIREFLY_CLIENT_SECRET.'
      },
      env,
      500
    );
  }

  if (env.PROXY_TOKEN) {
    const providedToken = request.headers.get('x-proxy-token');
    if (!providedToken || providedToken !== env.PROXY_TOKEN) {
      return jsonResponse({ error: 'Unauthorized proxy token' }, env, 401);
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload' }, env, 400);
  }

  const prompt = String(body?.prompt || '').trim();
  const model = String(body?.model || env.FIREFLY_MODEL || 'firefly-v3').trim();
  if (!prompt) {
    return jsonResponse({ error: 'prompt is required' }, env, 400);
  }

  try {
    const token = await getAdobeToken(env);
    const fireflyBase = (env.FIREFLY_API_BASE || 'https://firefly-api.adobe.io').replace(/\/$/, '');
    const response = await fetch(`${fireflyBase}/v3/images/generate-async`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-api-key': env.FIREFLY_CLIENT_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        numVariations: 1,
        contentClass: env.FIREFLY_CONTENT_CLASS || 'photo',
        model
      })
    });

    const initialPayload = await parseJsonSafe(response);
    if (!response.ok) {
      return jsonResponse(
        {
          error: initialPayload?.error?.message || initialPayload?.message || `Firefly request failed: ${response.status}`
        },
        env,
        response.status
      );
    }

    const initialImageUrl = extractImageUrl(initialPayload);
    if (initialImageUrl) {
      return jsonResponse({ imageUrl: initialImageUrl, raw: initialPayload }, env);
    }

    const statusUrl = resolveStatusUrl(response, initialPayload);
    if (!statusUrl) {
      return jsonResponse({ error: 'Firefly response missing status URL', raw: initialPayload }, env, 500);
    }

    const pollResult = await pollFirefly(
      statusUrl,
      {
        Authorization: `Bearer ${token}`,
        'x-api-key': env.FIREFLY_CLIENT_ID,
        'Content-Type': 'application/json'
      },
      env
    );

    return jsonResponse({ imageUrl: pollResult.imageUrl, raw: pollResult.payload }, env);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unhandled error' }, env, 500);
  }
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: buildCorsHeaders(env)
      });
    }

    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/generate') {
      return handleGenerate(request, env);
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return jsonResponse({ ok: true }, env);
    }

    return jsonResponse({ error: 'Not Found' }, env, 404);
  }
};
