export const MODEL_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
export const MODEL_REQUIREMENT_DEBOUNCE_MS = 300;

export const MIN_GENERATION_CONCURRENCY = 1;
export const MAX_GENERATION_CONCURRENCY = 4;
export const DEFAULT_GENERATION_CONCURRENCY = 2;

export const MAX_FAL_MODEL_PAGES = 20;
export const MAX_GOOGLE_MODEL_PAGES = 8;

// Storage keys for session cache
export const MODEL_CATALOG_STORAGE_PREFIX = 'image_creator_model_catalog_';
export const MODEL_REQUIREMENT_STORAGE_KEY = 'image_creator_model_requirement_cache';
