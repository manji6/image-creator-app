export function deepMerge(base, override) {
  if (!override || typeof override !== 'object') {
    return structuredClone(base);
  }
  const result = structuredClone(base);
  for (const [key, value] of Object.entries(override)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function normalizePromptLines(batchText) {
  if (!batchText) {
    return [];
  }
  return batchText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function buildFinalPrompt(commonPrompt, linePrompt) {
  const normalizedCommon = (commonPrompt || '').trim();
  const normalizedLine = (linePrompt || '').trim();
  if (!normalizedCommon) {
    return normalizedLine;
  }
  if (!normalizedLine) {
    return normalizedCommon;
  }
  return `${normalizedCommon}\n\n${normalizedLine}`;
}

export function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const randomPart = Math.random().toString(16).slice(2, 10);
  return `local-${Date.now()}-${randomPart}`;
}

export function createPromptCard(prompt) {
  return {
    id: createId(),
    prompt,
    finalPrompt: '',
    status: 'pending',
    imageUrl: '',
    errorMessage: '',
    provider: '',
    model: '',
    updatedAt: new Date().toISOString()
  };
}

export function statusClassName(status) {
  return `status-${status || 'pending'}`;
}

export function extractImageUrl(payload) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  if (typeof payload.imageUrl === 'string' && payload.imageUrl) {
    return payload.imageUrl;
  }

  if (payload.images && Array.isArray(payload.images) && payload.images.length > 0) {
    const firstImage = payload.images[0];
    if (typeof firstImage === 'string') {
      return firstImage;
    }
    if (firstImage && typeof firstImage.url === 'string') {
      return firstImage.url;
    }
  }

  if (payload.image && typeof payload.image.url === 'string') {
    return payload.image.url;
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

  if (payload.result && typeof payload.result === 'object') {
    const fromResult = extractImageUrl(payload.result);
    if (fromResult) {
      return fromResult;
    }
  }

  if (typeof payload.url === 'string' && payload.url) {
    return payload.url;
  }

  if (payload.candidates && Array.isArray(payload.candidates)) {
    for (const candidate of payload.candidates) {
      const parts = candidate?.content?.parts;
      if (!Array.isArray(parts)) {
        continue;
      }
      for (const part of parts) {
        const inlineData = part.inlineData || part.inline_data;
        if (inlineData?.data) {
          const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
          return `data:${mimeType};base64,${inlineData.data}`;
        }
      }
    }
  }

  return '';
}

export function summarizeError(error) {
  if (!error) {
    return 'Unknown error';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'object' && typeof error.message === 'string') {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

export async function toJsonWithError(response) {
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error || payload?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
