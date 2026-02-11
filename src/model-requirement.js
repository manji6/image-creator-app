import { fetchFalModelOpenApi } from './model-catalog.js';
import { inferModelImageRequirement } from './model-input.js';
import { summarizeError } from './utils.js';

export function createRequirementEntry() {
  return {
    status: 'idle',
    provider: '',
    modelId: '',
    imageSupport: 'none',
    fields: [],
    preferredField: null,
    unsupportedReason: '',
    error: ''
  };
}

export function createModelRequirementState(partial = {}) {
  return {
    ...createRequirementEntry(),
    ...partial
  };
}

export function createNoImageRequirement(provider, modelId) {
  return createModelRequirementState({
    status: 'ready',
    provider,
    modelId,
    imageSupport: 'none'
  });
}

export function requirementCacheKey(provider, modelId) {
  return `${provider}:${String(modelId || '').trim()}`;
}

export async function resolveModelRequirement({ provider, modelId, falApiKey, signal }) {
  const normalizedModel = String(modelId || '').trim();
  if (provider !== 'fal' || !falApiKey || !normalizedModel) {
    return createNoImageRequirement(provider, normalizedModel);
  }

  try {
    const openapi = await fetchFalModelOpenApi(falApiKey, normalizedModel, signal);
    const inferred = inferModelImageRequirement(openapi);
    return createModelRequirementState({
      ...inferred,
      provider,
      modelId: normalizedModel,
      error: ''
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }

    return createModelRequirementState({
      status: 'error',
      provider,
      modelId: normalizedModel,
      imageSupport: 'unknown',
      fields: [],
      preferredField: null,
      unsupportedReason: '',
      error: summarizeError(error)
    });
  }
}
