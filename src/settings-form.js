import { deepMerge } from './utils.js';

export function getActiveProviderModel(settings, defaultSettings) {
  const provider = settings.activeProvider;
  const model = settings.providers?.[provider]?.model;
  if (typeof model === 'string' && model.trim()) {
    return model.trim();
  }
  return defaultSettings.providers?.[provider]?.model || '';
}

export function setActiveProviderModel(settings, defaultSettings, nextModel) {
  const provider = settings.activeProvider;
  const value = String(nextModel || '').trim();
  settings.providers[provider].model = value || defaultSettings.providers[provider].model;
}

export function readSettingsFromForm({ refs, state, defaultSettings }) {
  const next = structuredClone(state.settings);
  next.activeProvider = refs.providerSelect.value;
  next.mode = refs.modeSelect.value;
  next.commonPrompt = refs.commonPromptInput.value;
  next.providers.fal.apiKey = refs.falApiKeyInput.value.trim();
  next.providers.google.apiKey = refs.googleApiKeyInput.value.trim();
  next.providers.firefly.clientId = refs.fireflyClientIdInput?.value.trim() || '';
  next.providers.firefly.accessToken = refs.fireflyAccessTokenInput?.value.trim() || '';
  next.providers.firefly.apiBase =
    refs.fireflyApiBaseInput?.value.trim() || defaultSettings.providers.firefly.apiBase;
  next.providers.firefly.contentClass =
    refs.fireflyContentClassInput?.value.trim() || defaultSettings.providers.firefly.contentClass;
  next.providers.firefly.proxyUrl = refs.fireflyProxyUrlInput?.value.trim() || '';
  next.providers.firefly.proxyToken = refs.fireflyProxyTokenInput?.value.trim() || '';

  const modelInput = refs.providerModelManualInput.value.trim();
  next.providers[next.activeProvider].model = modelInput || defaultSettings.providers[next.activeProvider].model;

  return next;
}

export function writeSettingsToForm({ refs, settings, defaultSettings }) {
  refs.providerSelect.value = settings.activeProvider;
  refs.modeSelect.value = settings.mode || 'light';
  refs.commonPromptInput.value = settings.commonPrompt || '';
  refs.falApiKeyInput.value = settings.providers.fal.apiKey || '';
  refs.googleApiKeyInput.value = settings.providers.google.apiKey || '';
  if (refs.fireflyClientIdInput) {
    refs.fireflyClientIdInput.value = settings.providers.firefly.clientId || '';
  }
  if (refs.fireflyAccessTokenInput) {
    refs.fireflyAccessTokenInput.value = settings.providers.firefly.accessToken || '';
  }
  if (refs.fireflyApiBaseInput) {
    refs.fireflyApiBaseInput.value = settings.providers.firefly.apiBase || defaultSettings.providers.firefly.apiBase;
  }
  if (refs.fireflyContentClassInput) {
    refs.fireflyContentClassInput.value =
      settings.providers.firefly.contentClass || defaultSettings.providers.firefly.contentClass;
  }
  if (refs.fireflyProxyUrlInput) {
    refs.fireflyProxyUrlInput.value = settings.providers.firefly.proxyUrl || '';
  }
  if (refs.fireflyProxyTokenInput) {
    refs.fireflyProxyTokenInput.value = settings.providers.firefly.proxyToken || '';
  }
  refs.providerModelManualInput.value = getActiveProviderModel(settings, defaultSettings);
}

export function syncSettingsFromForm({
  refs,
  state,
  defaultSettings,
  validateCurrentTemplate,
  updateProviderHint
}) {
  state.settings = deepMerge(
    defaultSettings,
    readSettingsFromForm({
      refs,
      state,
      defaultSettings
    })
  );
  validateCurrentTemplate();
  updateProviderHint();
}

export function getProviderApiKey(provider, settings) {
  if (provider === 'fal') {
    return settings.providers.fal.apiKey;
  }
  if (provider === 'google') {
    return settings.providers.google.apiKey;
  }
  return '';
}
