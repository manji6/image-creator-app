import { extractImageUrl, sleep, summarizeError, toJsonWithError } from '../utils.js';

function encodeModelPath(model) {
  return model
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

async function pollFalQueue(statusUrl, headers, signal) {
  const maxAttempts = 60;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const statusRes = await fetch(statusUrl, {
      headers,
      signal
    });
    const statusPayload = await toJsonWithError(statusRes);
    const status = statusPayload?.status;

    if (status === 'COMPLETED') {
      const responseUrl = statusPayload?.response_url;
      if (!responseUrl) {
        throw new Error('fal queue completed but response_url is missing');
      }
      const responseRes = await fetch(responseUrl, {
        headers,
        signal
      });
      return toJsonWithError(responseRes);
    }

    if (status === 'FAILED') {
      throw new Error(statusPayload?.error || 'fal queue job failed');
    }

    await sleep(1500);
  }

  throw new Error('fal queue polling timed out');
}

export async function generateWithFal({ finalPrompt, settings, providerInput = {}, signal }) {
  const falSettings = settings.providers.fal;
  if (!falSettings.apiKey) {
    throw new Error('fal.ai API key is not configured');
  }

  const modelPath = encodeModelPath(falSettings.model || 'fal-ai/flux/schnell');
  const endpointMode = falSettings.endpointMode === 'queue' ? 'queue' : 'sync';
  const baseUrl = endpointMode === 'queue' ? 'https://queue.fal.run' : 'https://fal.run';
  const endpointUrl = `${baseUrl}/${modelPath}`;

  const headers = {
    Authorization: `Key ${falSettings.apiKey}`,
    'Content-Type': 'application/json'
  };

  const submitResponse = await fetch(endpointUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: finalPrompt,
      ...providerInput
    }),
    signal
  });

  const submitPayload = await toJsonWithError(submitResponse);

  let resultPayload = submitPayload;
  if (endpointMode === 'queue') {
    const statusUrl = submitPayload?.status_url;
    if (!statusUrl) {
      throw new Error('fal queue response did not include status_url');
    }
    resultPayload = await pollFalQueue(statusUrl, headers, signal);
  }

  const imageUrl = extractImageUrl(resultPayload);
  if (!imageUrl) {
    throw new Error(`fal.ai response did not include an image. payload=${summarizeError(resultPayload)}`);
  }

  return {
    imageUrl,
    raw: resultPayload,
    provider: 'fal',
    model: falSettings.model || 'fal-ai/flux/schnell'
  };
}
