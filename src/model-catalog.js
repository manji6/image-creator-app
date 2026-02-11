import { summarizeError, toJsonWithError } from './utils.js';
import { MAX_FAL_MODEL_PAGES, MAX_GOOGLE_MODEL_PAGES } from './app-constants.js';

const FAL_MODELS_URL = 'https://api.fal.ai/v1/models';
const GOOGLE_MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

function extractModelList(payload) {
  return Array.isArray(payload)
    ? payload
    : payload?.models || payload?.data || payload?.items || [];
}

function uniqueById(entries) {
  const map = new Map();
  for (const entry of entries) {
    if (!entry?.id) {
      continue;
    }
    if (!map.has(entry.id)) {
      map.set(entry.id, entry);
    }
  }
  return [...map.values()];
}

function uniqueByLabel(entries) {
  const counts = new Map();
  for (const entry of entries) {
    const key = entry?.label || '';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function normalizeFalItem(raw) {
  const id =
    raw?.endpoint_id ||
    raw?.endpointId ||
    raw?.id ||
    raw?.modelId ||
    raw?.slug ||
    raw?.name ||
    raw?.path;
  if (!id || typeof id !== 'string') {
    return null;
  }
  const cleanId = id.trim();
  if (!cleanId) {
    return null;
  }
  const label =
    raw?.metadata?.display_name ||
    raw?.metadata?.displayName ||
    raw?.title ||
    raw?.displayName ||
    raw?.name ||
    cleanId;
  return {
    id: cleanId,
    label: String(label),
    provider: 'fal'
  };
}

function normalizeGoogleItem(raw) {
  const rawName = raw?.name;
  if (!rawName || typeof rawName !== 'string') {
    return null;
  }

  const supported = Array.isArray(raw?.supportedGenerationMethods)
    ? raw.supportedGenerationMethods
    : [];

  // Keep models that can be invoked with generateContent.
  if (supported.length > 0 && !supported.includes('generateContent')) {
    return null;
  }

  const id = rawName.replace(/^models\//, '').trim();
  if (!id || id.includes('embedding')) {
    return null;
  }

  return {
    id,
    label: id,
    provider: 'google'
  };
}

function sortByLabel(entries) {
  return [...entries].sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
}

export function withDisambiguatedLabels(entries) {
  const counts = uniqueByLabel(entries);
  return entries.map((entry) => {
    const duplicated = (counts.get(entry.label) || 0) > 1;
    return {
      ...entry,
      displayLabel: duplicated ? `${entry.label} (${entry.id})` : entry.label
    };
  });
}

export function normalizeFalModels(payload) {
  const rawList = extractModelList(payload);

  const normalized = rawList
    .map((entry) => normalizeFalItem(entry))
    .filter(Boolean);

  return sortByLabel(uniqueById(normalized));
}

function findRawFalModel(payload, endpointId) {
  const targetId = String(endpointId || '').trim();
  const rawList = extractModelList(payload);
  if (!targetId) {
    return rawList[0] || null;
  }
  return (
    rawList.find((entry) => {
      const id = entry?.endpoint_id || entry?.endpointId || entry?.id || entry?.name;
      return String(id || '').trim() === targetId;
    }) || rawList[0] || null
  );
}

function extractOpenApiSpec(rawModel) {
  if (!rawModel || typeof rawModel !== 'object') {
    return null;
  }
  return (
    rawModel?.['openapi-3.0'] ||
    rawModel?.openapi_3_0 ||
    rawModel?.openapi ||
    rawModel?.metadata?.['openapi-3.0'] ||
    rawModel?.metadata?.openapi_3_0 ||
    rawModel?.metadata?.openapi ||
    null
  );
}

export function normalizeGoogleModels(payload) {
  const rawList = Array.isArray(payload?.models) ? payload.models : [];
  const normalized = rawList
    .map((entry) => normalizeGoogleItem(entry))
    .filter(Boolean);

  return sortByLabel(uniqueById(normalized));
}

export async function fetchFalModels(apiKey, signal) {
  if (!apiKey) {
    throw new Error('fal.ai API key を設定するとモデル一覧を取得できます。');
  }

  const collected = [];
  let cursor = '';
  let guard = 0;

  while (guard < MAX_FAL_MODEL_PAGES) {
    const params = new URLSearchParams({ limit: '200' });
    if (cursor) {
      params.set('cursor', cursor);
    }

    const response = await fetch(`${FAL_MODELS_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Key ${apiKey}`
      },
      signal
    });
    const payload = await toJsonWithError(response);
    collected.push(...normalizeFalModels(payload));

    const hasMore = Boolean(payload?.has_more) || Boolean(payload?.next_cursor);
    if (!hasMore || !payload?.next_cursor) {
      break;
    }
    cursor = payload.next_cursor;
    guard += 1;
  }

  const models = sortByLabel(uniqueById(collected));
  if (models.length === 0) {
    throw new Error('fal.ai のモデル一覧が空でした。');
  }
  return models;
}

export async function fetchGoogleModels(apiKey, signal) {
  if (!apiKey) {
    throw new Error('Google API Key を設定するとモデル一覧を取得できます。');
  }

  const collected = [];
  let pageToken = '';
  let guard = 0;

  while (guard < MAX_GOOGLE_MODEL_PAGES) {
    const params = new URLSearchParams({
      key: apiKey,
      pageSize: '200'
    });
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    const response = await fetch(`${GOOGLE_MODELS_URL}?${params.toString()}`, {
      signal
    });
    const payload = await toJsonWithError(response);
    collected.push(...normalizeGoogleModels(payload));

    if (!payload?.nextPageToken) {
      break;
    }
    pageToken = payload.nextPageToken;
    guard += 1;
  }

  const models = sortByLabel(uniqueById(collected));
  if (models.length === 0) {
    throw new Error('Google のモデル一覧が空でした。');
  }
  return models;
}

export async function fetchFalModelOpenApi(apiKey, endpointId, signal) {
  if (!apiKey) {
    throw new Error('fal.ai API key を設定すると入力要件を取得できます。');
  }
  if (!endpointId) {
    throw new Error('モデルIDが未設定です。');
  }

  const params = new URLSearchParams({
    endpoint_id: endpointId,
    expand: 'openapi-3.0',
    limit: '1'
  });

  const response = await fetch(`${FAL_MODELS_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Key ${apiKey}`
    },
    signal
  });
  const payload = await toJsonWithError(response);
  const rawModel = findRawFalModel(payload, endpointId);
  const openapi = extractOpenApiSpec(rawModel);

  if (!openapi || typeof openapi !== 'object') {
    throw new Error('モデル詳細にOpenAPI情報が含まれていません。');
  }
  return openapi;
}

export function getModelFetchErrorMessage(error) {
  return summarizeError(error);
}
