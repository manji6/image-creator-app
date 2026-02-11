import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getActiveProviderModel,
  getProviderApiKey,
  readSettingsFromForm,
  setActiveProviderModel,
  syncSettingsFromForm,
  writeSettingsToForm
} from '../src/settings-form.js';

const DEFAULT_SETTINGS = {
  activeProvider: 'fal',
  mode: 'light',
  commonPrompt: '',
  providers: {
    fal: { apiKey: '', model: 'fal-ai/flux/schnell' },
    google: { apiKey: '', model: 'gemini-2.5-flash-image-preview' },
    firefly: {
      clientId: '',
      accessToken: '',
      apiBase: 'https://firefly-api.adobe.io',
      contentClass: 'photo',
      proxyUrl: '',
      proxyToken: '',
      model: 'firefly-v3'
    }
  }
};

function createRefs() {
  return {
    providerSelect: { value: 'fal' },
    modeSelect: { value: 'light' },
    commonPromptInput: { value: '' },
    falApiKeyInput: { value: '' },
    googleApiKeyInput: { value: '' },
    fireflyClientIdInput: { value: '' },
    fireflyAccessTokenInput: { value: '' },
    fireflyApiBaseInput: { value: '' },
    fireflyContentClassInput: { value: '' },
    fireflyProxyUrlInput: { value: '' },
    fireflyProxyTokenInput: { value: '' },
    providerModelManualInput: { value: '' }
  };
}

test('getActiveProviderModel returns provider model or default', () => {
  const settings = structuredClone(DEFAULT_SETTINGS);
  settings.activeProvider = 'google';
  settings.providers.google.model = 'custom-google';
  assert.equal(getActiveProviderModel(settings, DEFAULT_SETTINGS), 'custom-google');

  settings.providers.google.model = '  ';
  assert.equal(getActiveProviderModel(settings, DEFAULT_SETTINGS), 'gemini-2.5-flash-image-preview');
});

test('setActiveProviderModel updates active provider model with fallback', () => {
  const settings = structuredClone(DEFAULT_SETTINGS);
  settings.activeProvider = 'fal';
  setActiveProviderModel(settings, DEFAULT_SETTINGS, 'fal-ai/new-model');
  assert.equal(settings.providers.fal.model, 'fal-ai/new-model');

  setActiveProviderModel(settings, DEFAULT_SETTINGS, '   ');
  assert.equal(settings.providers.fal.model, 'fal-ai/flux/schnell');
});

test('readSettingsFromForm reads values from refs', () => {
  const refs = createRefs();
  refs.providerSelect.value = 'google';
  refs.modeSelect.value = 'advanced';
  refs.commonPromptInput.value = 'base';
  refs.googleApiKeyInput.value = '  key-google  ';
  refs.fireflyClientIdInput.value = 'cid';
  refs.fireflyAccessTokenInput.value = 'token';
  refs.fireflyApiBaseInput.value = 'https://firefly-api.adobe.io';
  refs.fireflyContentClassInput.value = 'photo';
  refs.providerModelManualInput.value = 'gemini-custom';
  const state = { settings: structuredClone(DEFAULT_SETTINGS) };

  const result = readSettingsFromForm({ refs, state, defaultSettings: DEFAULT_SETTINGS });
  assert.equal(result.activeProvider, 'google');
  assert.equal(result.mode, 'advanced');
  assert.equal(result.commonPrompt, 'base');
  assert.equal(result.providers.google.apiKey, 'key-google');
  assert.equal(result.providers.google.model, 'gemini-custom');
  assert.equal(result.providers.firefly.clientId, 'cid');
  assert.equal(result.providers.firefly.accessToken, 'token');
});

test('writeSettingsToForm populates refs from settings', () => {
  const refs = createRefs();
  const settings = structuredClone(DEFAULT_SETTINGS);
  settings.activeProvider = 'firefly';
  settings.mode = 'advanced';
  settings.commonPrompt = 'shared';
  settings.providers.firefly.proxyUrl = 'https://example.com/proxy';

  writeSettingsToForm({ refs, settings, defaultSettings: DEFAULT_SETTINGS });
  assert.equal(refs.providerSelect.value, 'firefly');
  assert.equal(refs.modeSelect.value, 'advanced');
  assert.equal(refs.commonPromptInput.value, 'shared');
  assert.equal(refs.fireflyProxyUrlInput.value, 'https://example.com/proxy');
});

test('syncSettingsFromForm updates state and calls hooks', () => {
  const refs = createRefs();
  refs.providerSelect.value = 'fal';
  refs.falApiKeyInput.value = 'FAL_KEY';
  refs.providerModelManualInput.value = 'fal-ai/new';

  const state = { settings: structuredClone(DEFAULT_SETTINGS) };
  let validated = 0;
  let hinted = 0;

  syncSettingsFromForm({
    refs,
    state,
    defaultSettings: DEFAULT_SETTINGS,
    validateCurrentTemplate: () => {
      validated += 1;
    },
    updateProviderHint: () => {
      hinted += 1;
    }
  });

  assert.equal(state.settings.providers.fal.apiKey, 'FAL_KEY');
  assert.equal(state.settings.providers.fal.model, 'fal-ai/new');
  assert.equal(validated, 1);
  assert.equal(hinted, 1);
});

test('getProviderApiKey picks correct provider value', () => {
  const settings = structuredClone(DEFAULT_SETTINGS);
  settings.providers.fal.apiKey = 'f';
  settings.providers.google.apiKey = 'g';
  assert.equal(getProviderApiKey('fal', settings), 'f');
  assert.equal(getProviderApiKey('google', settings), 'g');
  assert.equal(getProviderApiKey('firefly', settings), '');
});
