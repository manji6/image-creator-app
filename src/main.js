import { CARD_STATUSES, DEFAULT_SETTINGS } from './constants.js';
import {
  clearCards,
  deleteCard,
  loadCards,
  loadSettings,
  saveSettings,
  upsertCard,
  upsertCards
} from './db.js';
import { downloadCardsBundle, downloadSingleCard } from './download.js';
import {
  isGenerateExistingDisabled,
  isRegenerateFailedDisabled,
  pickRunnableCardIds
} from './generation-helpers.js';
import {
  fetchFalModels,
  fetchGoogleModels,
  getModelFetchErrorMessage,
  withDisambiguatedLabels,
  saveCatalogToStorage,
  loadCatalogFromStorage,
  clearCatalogFromStorage
} from './model-catalog.js';
import { buildReferenceImagePayload } from './model-input.js';
import {
  createModelRequirementState,
  createNoImageRequirement,
  createRequirementEntry,
  requirementCacheKey,
  resolveModelRequirement
} from './model-requirement.js';
import {
  createReferenceImageState,
  getReferenceImageValue,
  hasReferenceImageValue,
  parseReferenceImageUrl,
  readReferenceImageFile
} from './reference-image.js';
import {
  DEFAULT_GENERATION_CONCURRENCY,
  MAX_GENERATION_CONCURRENCY,
  MIN_GENERATION_CONCURRENCY,
  MODEL_CACHE_TTL_MS,
  MODEL_REQUIREMENT_DEBOUNCE_MS,
  MODEL_REQUIREMENT_STORAGE_KEY
} from './app-constants.js';
import { runGenerationPreflight } from './generation-preflight.js';
import { generateImage, providerHint, PROVIDER_INFO } from './providers/index.js';
import { stripSessionOnlySettings } from './session-settings.js';
import {
  getActiveProviderModel as getActiveProviderModelFromSettings,
  getProviderApiKey as getProviderApiKeyFromSettings,
  setActiveProviderModel as setActiveProviderModelInSettings,
  syncSettingsFromForm as syncSettingsFromSettingsForm,
  writeSettingsToForm as writeSettingsToSettingsForm
} from './settings-form.js';
import { renderCardsView } from './cards-view.js';
import { buildStatusSummary, globalMessageClasses } from './ui-state.js';
import { renderTemplate, validateTemplate } from './template.js';
import { isProviderConfigured } from './providers/index.js';
import {
  buildFinalPrompt,
  createPromptCard,
  deepMerge,
  normalizePromptLines,
  summarizeError
} from './utils.js';
import { trackEvent, trackPageView, EVENTS, ERROR_TYPES } from './analytics/index.js';
import { exportSettingsToJSON, validateImportedSettings } from './settings-export.js';

function createCatalogEntry() {
  return {
    status: 'idle',
    models: [],
    error: '',
    loadedAt: 0
  };
}

function saveRequirementCacheToStorage() {
  try {
    const entries = Array.from(state.modelRequirementCache.entries());
    sessionStorage.setItem(MODEL_REQUIREMENT_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('Failed to cache model requirements:', error);
  }
}

function loadRequirementCacheFromStorage() {
  try {
    const stored = sessionStorage.getItem(MODEL_REQUIREMENT_STORAGE_KEY);
    if (!stored) return new Map();
    const entries = JSON.parse(stored);
    return new Map(entries);
  } catch (error) {
    console.warn('Failed to load model requirement cache:', error);
    return new Map();
  }
}

const state = {
  settings: structuredClone(DEFAULT_SETTINGS),
  cards: [],
  isBatchGenerating: false,
  isDownloadingBundle: false,
  runningCardIds: new Set(),
  abortControllers: new Map(),
  modelCatalog: {
    fal: loadCatalogFromStorage('fal') || createCatalogEntry(),
    google: loadCatalogFromStorage('google') || createCatalogEntry()
  },
  modelFetchControllers: new Map(),
  requirementFetchController: null,
  modelRequirementDebounceTimer: null,
  modelRequirementCache: loadRequirementCacheFromStorage(),
  modelRequirement: createRequirementEntry(),
  referenceImage: createReferenceImageState(),
  referenceImageValidationMessage: '',
  templateValidation: {
    ok: true,
    errors: []
  },
  previewContent: ''
};

const refs = {
  providerSelect: document.querySelector('#providerSelect'),
  providerHint: document.querySelector('#providerHint'),
  providerModelSelect: document.querySelector('#providerModelSelect'),
  providerModelManualInput: document.querySelector('#providerModelManualInput'),
  refreshModelsButton: document.querySelector('#refreshModelsButton'),
  modelFetchMessage: document.querySelector('#modelFetchMessage'),
  modelRequirementMessage: document.querySelector('#modelRequirementMessage'),
  referenceImageSection: document.querySelector('#referenceImageSection'),
  referenceDropzone: document.querySelector('#referenceDropzone'),
  referenceImageInput: document.querySelector('#referenceImageInput'),
  referenceImageUrlInput: document.querySelector('#referenceImageUrlInput'),
  clearReferenceImageButton: document.querySelector('#clearReferenceImageButton'),
  referenceImagePreviewWrap: document.querySelector('#referenceImagePreviewWrap'),
  referenceImagePreview: document.querySelector('#referenceImagePreview'),
  referenceImageMeta: document.querySelector('#referenceImageMeta'),
  referenceImageValidationMessage: document.querySelector('#referenceImageValidationMessage'),
  modeSelect: document.querySelector('#modeSelect'),
  modeHint: document.querySelector('#modeHint'),
  templateValidationMessage: document.querySelector('#templateValidationMessage'),
  commonPromptInput: document.querySelector('#commonPromptInput'),
  falApiKeyInput: document.querySelector('#falApiKeyInput'),
  googleApiKeyInput: document.querySelector('#googleApiKeyInput'),
  fireflyClientIdInput: document.querySelector('#fireflyClientIdInput'),
  fireflyAccessTokenInput: document.querySelector('#fireflyAccessTokenInput'),
  fireflyApiBaseInput: document.querySelector('#fireflyApiBaseInput'),
  fireflyContentClassInput: document.querySelector('#fireflyContentClassInput'),
  fireflyProxyUrlInput: document.querySelector('#fireflyProxyUrlInput'),
  fireflyProxyTokenInput: document.querySelector('#fireflyProxyTokenInput'),
  exportSettingsButton: document.querySelector('#exportSettingsButton'),
  importSettingsInput: document.querySelector('#importSettingsInput'),
  promptBatchInput: document.querySelector('#promptBatchInput'),
  createCardsButton: document.querySelector('#createCardsButton'),
  generateExistingButton: document.querySelector('#generateExistingButton'),
  regenerateFailedButton: document.querySelector('#regenerateFailedButton'),
  downloadAllButton: document.querySelector('#downloadAllButton'),
  clearCardsButton: document.querySelector('#clearCardsButton'),
  statusSummary: document.querySelector('#statusSummary'),
  globalMessage: document.querySelector('#globalMessage'),
  cardsGrid: document.querySelector('#cardsGrid'),
  cardTemplate: document.querySelector('#cardTemplate'),
  previewModal: document.querySelector('#previewModal'),
  previewModalHint: document.querySelector('#previewModalHint'),
  previewModalContent: document.querySelector('#previewModalContent'),
  closePreviewModalButton: document.querySelector('#closePreviewModalButton'),
  copyPreviewButton: document.querySelector('#copyPreviewButton'),
  imagePreviewModal: document.querySelector('#imagePreviewModal'),
  imagePreviewModalImage: document.querySelector('#imagePreviewModalImage'),
  imagePreviewPromptSection: document.querySelector('#imagePreviewPromptSection'),
  imagePreviewProvider: document.querySelector('#imagePreviewProvider'),
  imagePreviewPromptContent: document.querySelector('#imagePreviewPromptContent'),
  closeImagePreviewModalButton: document.querySelector('#closeImagePreviewModalButton')
};

function hasRunningJobs() {
  return state.runningCardIds.size > 0;
}

function getActiveProviderModel(settings = state.settings) {
  return getActiveProviderModelFromSettings(settings, DEFAULT_SETTINGS);
}

function setActiveProviderModel(nextModel) {
  setActiveProviderModelInSettings(state.settings, DEFAULT_SETTINGS, nextModel);
}

function writeSettingsToForm() {
  writeSettingsToSettingsForm({
    refs,
    settings: state.settings,
    defaultSettings: DEFAULT_SETTINGS
  });
}

function syncSettingsFromForm() {
  syncSettingsFromSettingsForm({
    refs,
    state,
    defaultSettings: DEFAULT_SETTINGS,
    validateCurrentTemplate,
    updateProviderHint
  });
}

function getProviderApiKey(provider, settings = state.settings) {
  return getProviderApiKeyFromSettings(provider, settings);
}

function isAdvancedMode(settings = state.settings) {
  return settings.mode === 'advanced';
}

function closePreviewModal() {
  refs.previewModal.classList.add('hidden');
  refs.previewModal.classList.remove('flex');

  // Analytics: 仮想ページビュー（モーダルを閉じる）
  trackPageView('/');
}

function openPreviewModal(content, hint) {
  state.previewContent = content;
  refs.previewModalHint.textContent = hint || '';
  refs.previewModalContent.textContent = content || '';
  refs.previewModal.classList.remove('hidden');
  refs.previewModal.classList.add('flex');

  // Analytics: 仮想ページビュー（プロンプトプレビュー）
  trackPageView('/modal/prompt-preview');
}

function closeImagePreviewModal() {
  refs.imagePreviewModal.classList.add('hidden');
  refs.imagePreviewModal.classList.remove('flex');
  refs.imagePreviewModalImage.removeAttribute('src');
  refs.imagePreviewPromptContent.textContent = '';

  // Analytics: 仮想ページビュー（モーダルを閉じる）
  trackPageView('/');
}

function openImagePreviewModal(imageUrl, promptText, providerText) {
  refs.imagePreviewModalImage.src = imageUrl;
  refs.imagePreviewPromptContent.textContent = promptText || '（プロンプト情報なし）';
  if (refs.imagePreviewProvider) {
    refs.imagePreviewProvider.textContent = providerText || '';
  }
  refs.imagePreviewModal.classList.remove('hidden');
  refs.imagePreviewModal.classList.add('flex');

  // Analytics: 仮想ページビュー（画像プレビュー）
  trackPageView('/modal/image-preview');
}

function resetModelCatalog(provider) {
  if (!state.modelCatalog[provider]) {
    return;
  }
  state.modelCatalog[provider] = createCatalogEntry();
  clearCatalogFromStorage(provider);
}

function validateCurrentTemplate() {
  if (!isAdvancedMode(state.settings)) {
    state.templateValidation = { ok: true, errors: [] };
    return state.templateValidation;
  }

  const template = String(state.settings.commonPrompt || '');
  const errors = [];

  if (!template.trim()) {
    errors.push('Advanced Modeでは共通プロンプトテンプレートが必須です。');
  }

  const validation = validateTemplate(template, ['item']);
  if (validation.unknownVariables.length > 0) {
    errors.push(`未定義変数: ${validation.unknownVariables.join(', ')}`);
  }
  if (validation.invalidTokens.length > 0) {
    errors.push(`不正なテンプレート記法: ${validation.invalidTokens.join(', ')}`);
  }
  if (template.trim() && !validation.usedVariables.includes('item')) {
    errors.push('テンプレートに {{item}} (または ${item}, {$item}) を含めてください。');
  }

  state.templateValidation = {
    ok: errors.length === 0,
    errors
  };
  return state.templateValidation;
}

function renderTemplateValidation() {
  const validation = state.templateValidation;
  if (!isAdvancedMode(state.settings)) {
    refs.templateValidationMessage.classList.add('hidden');
    refs.templateValidationMessage.textContent = '';
    return;
  }

  if (validation.ok) {
    refs.templateValidationMessage.classList.add('hidden');
    refs.templateValidationMessage.textContent = '';
    return;
  }

  refs.templateValidationMessage.classList.remove('hidden');
  refs.templateValidationMessage.textContent = validation.errors.join(' / ');
}

function modeHintText() {
  if (isAdvancedMode(state.settings)) {
    return 'Advanced: 共通テンプレート内の {{item}} を一括入力1行ごとに展開します。';
  }
  return 'Light: 共通プロンプト + 一括入力行をそのまま結合して送信します。';
}

function updateProviderHint() {
  const base = providerHint(state.settings.activeProvider, state.settings);
  const provider = state.settings.activeProvider;

  if (provider !== 'fal' && provider !== 'google') {
    refs.providerHint.textContent = `${base} モデルは手入力で設定してください。`;
    return;
  }

  const catalog = state.modelCatalog[provider];
  let modelHint = 'モデル一覧: 未取得';
  if (catalog.status === 'loading') {
    modelHint = 'モデル一覧: 取得中';
  } else if (catalog.status === 'ready') {
    modelHint = `モデル一覧: ${catalog.models.length}件`;
  } else if (catalog.status === 'error') {
    modelHint = `モデル一覧: 取得失敗 (${catalog.error})`;
  }

  refs.providerHint.textContent = `${base} ${modelHint}`;
}

function setModelFetchMessage() {
  const provider = state.settings.activeProvider;
  if (provider !== 'fal' && provider !== 'google') {
    refs.modelFetchMessage.textContent = 'Fireflyは手入力モデルを利用します。';
    return;
  }

  const catalog = state.modelCatalog[provider];
  if (catalog.status === 'loading') {
    refs.modelFetchMessage.textContent = 'モデル一覧を取得中です...';
    return;
  }
  if (catalog.status === 'error') {
    refs.modelFetchMessage.textContent = `取得失敗: ${catalog.error}`;
    return;
  }
  if (catalog.status === 'ready') {
    refs.modelFetchMessage.textContent = `${catalog.models.length}件のモデルを取得済み`; 
    return;
  }
  refs.modelFetchMessage.textContent = '一覧を更新すると利用可能モデルを取得します。';
}

function setReferenceImageValidationMessage(text) {
  state.referenceImageValidationMessage = String(text || '');
  if (state.referenceImageValidationMessage) {
    refs.referenceImageValidationMessage.textContent = state.referenceImageValidationMessage;
    refs.referenceImageValidationMessage.classList.remove('hidden');
    return;
  }
  refs.referenceImageValidationMessage.classList.add('hidden');
  refs.referenceImageValidationMessage.textContent = '';
}

function updateReferencePreview() {
  const previewSrc = state.referenceImage.fileDataUrl || state.referenceImage.url || '';
  const hasValue = Boolean(previewSrc);

  refs.clearReferenceImageButton.disabled = !hasValue;
  refs.clearReferenceImageButton.classList.toggle('opacity-60', !hasValue);
  refs.clearReferenceImageButton.classList.toggle('cursor-not-allowed', !hasValue);
  refs.referenceImageUrlInput.value = state.referenceImage.url || '';

  if (!hasValue) {
    refs.referenceImagePreviewWrap.classList.add('hidden');
    refs.referenceImagePreview.removeAttribute('src');
    refs.referenceImageMeta.textContent = '';
    return;
  }

  refs.referenceImagePreviewWrap.classList.remove('hidden');
  refs.referenceImagePreview.src = previewSrc;
  if (state.referenceImage.fileName) {
    refs.referenceImageMeta.textContent = `${state.referenceImage.fileName} (${state.referenceImage.mimeType || 'image'})`;
  } else {
    refs.referenceImageMeta.textContent = state.referenceImage.url;
  }
}

function renderModelRequirement() {
  const activeProvider = state.settings.activeProvider;
  const requirement = state.modelRequirement;
  let message = '参照画像の自動判定は fal.ai モデル選択時のみ対応しています。';
  let showReferenceSection = false;

  if (activeProvider === 'fal') {
    if (requirement.status === 'loading') {
      message = 'モデルの入力要件を確認中です...';
    } else if (requirement.status === 'error') {
      message = `入力要件の取得に失敗: ${requirement.error || 'unknown error'}`;
    } else if (requirement.imageSupport === 'required') {
      if (requirement.unsupportedReason) {
        message = `参照画像: 必須 (未対応: ${requirement.unsupportedReason})`;
      } else {
        message = '参照画像: 必須';
        showReferenceSection = true;
      }
    } else if (requirement.imageSupport === 'optional') {
      message = '参照画像: 任意';
      showReferenceSection = true;
    } else if (requirement.imageSupport === 'none') {
      message = '参照画像: 不要';
    } else {
      message = '参照画像要件を判定できませんでした。';
    }
  }

  refs.modelRequirementMessage.textContent = message;
  refs.referenceImageSection.classList.toggle('hidden', !showReferenceSection);
  if (!showReferenceSection) {
    state.referenceImageValidationMessage = '';
  }
  updateReferencePreview();
  setReferenceImageValidationMessage(state.referenceImageValidationMessage);
}

function clearReferenceImageState() {
  state.referenceImage = createReferenceImageState();
  refs.referenceImageInput.value = '';
  setReferenceImageValidationMessage('');
  render(false);
}

async function setReferenceImageFromFile(file) {
  if (!file) {
    return;
  }

  if (!String(file.type || '').startsWith('image/')) {
    setReferenceImageValidationMessage('画像ファイルを選択してください。');
    return;
  }

  try {
    const dataUrl = await readReferenceImageFile(file);
    state.referenceImage = {
      fileName: file.name || 'reference-image',
      mimeType: file.type || 'image/png',
      fileDataUrl: dataUrl,
      url: ''
    };
    refs.referenceImageUrlInput.value = '';
    refs.referenceImageInput.value = '';
    setReferenceImageValidationMessage('');

    // Analytics: 参照画像アップロード（ファイル）
    trackEvent(EVENTS.REFERENCE_IMAGE_UPLOAD, {
      source: 'file',
      mime_type: file.type,
      active_provider: state.settings.activeProvider
    });

    render(false);
  } catch (error) {
    setReferenceImageValidationMessage(`参照画像を読み込めませんでした: ${summarizeError(error)}`);
  }
}

function setReferenceImageFromUrl(rawUrl) {
  try {
    const normalizedUrl = parseReferenceImageUrl(rawUrl);
    if (!normalizedUrl) {
      clearReferenceImageState();
      return;
    }

    state.referenceImage = {
      fileName: '',
      mimeType: '',
      fileDataUrl: '',
      url: normalizedUrl
    };
    refs.referenceImageInput.value = '';
    setReferenceImageValidationMessage('');

    // Analytics: 参照画像アップロード（URL）
    trackEvent(EVENTS.REFERENCE_IMAGE_UPLOAD, {
      source: 'url',
      active_provider: state.settings.activeProvider
    });

    render(false);
  } catch (error) {
    setReferenceImageValidationMessage(`参照画像URLが不正です: ${summarizeError(error)}`);
    render(false);
  }
}

async function fetchModelRequirement(provider, modelId, force = false) {
  const normalizedModel = String(modelId || '').trim();
  const noRequirement = createNoImageRequirement(provider, normalizedModel);
  if (provider !== 'fal' || !state.settings.providers.fal.apiKey || !normalizedModel) {
    state.modelRequirement = noRequirement;
    render(false);
    return noRequirement;
  }

  const cacheKey = requirementCacheKey(provider, normalizedModel);
  if (!force && state.modelRequirementCache.has(cacheKey)) {
    const cached = state.modelRequirementCache.get(cacheKey);
    state.modelRequirement = cached;
    render(false);
    return cached;
  }

  if (state.requirementFetchController) {
    state.requirementFetchController.abort();
  }

  const loadingRequirement = createModelRequirementState({
    status: 'loading',
    provider,
    modelId: normalizedModel,
    imageSupport: 'unknown'
  });
  state.modelRequirement = loadingRequirement;
  render(false);

  const controller = new AbortController();
  state.requirementFetchController = controller;

  try {
    const resolved = await resolveModelRequirement({
      provider,
      modelId: normalizedModel,
      falApiKey: state.settings.providers.fal.apiKey,
      signal: controller.signal
    });
    if (resolved.status !== 'error') {
      state.modelRequirementCache.set(cacheKey, resolved);
      saveRequirementCacheToStorage();
    }

    if (
      state.settings.activeProvider === provider &&
      getActiveProviderModel(state.settings) === normalizedModel
    ) {
      state.modelRequirement = resolved;
      render(false);
    }
    return resolved;
  } catch (error) {
    if (error?.name === 'AbortError') {
      return state.modelRequirement;
    }
    const failed = createModelRequirementState({
      status: 'error',
      provider,
      modelId: normalizedModel,
      imageSupport: 'unknown',
      error: summarizeError(error)
    });
    if (
      state.settings.activeProvider === provider &&
      getActiveProviderModel(state.settings) === normalizedModel
    ) {
      state.modelRequirement = failed;
      render(false);
    }
    return failed;
  } finally {
    if (state.requirementFetchController === controller) {
      state.requirementFetchController = null;
    }
  }
}

function scheduleModelRequirementRefresh(force = false) {
  if (state.modelRequirementDebounceTimer) {
    clearTimeout(state.modelRequirementDebounceTimer);
  }
  state.modelRequirementDebounceTimer = setTimeout(() => {
    state.modelRequirementDebounceTimer = null;
    void fetchModelRequirement(
      state.settings.activeProvider,
      getActiveProviderModel(state.settings),
      force
    );
  }, MODEL_REQUIREMENT_DEBOUNCE_MS);
}

function resetRequirementState() {
  state.modelRequirementCache.clear();
  try {
    sessionStorage.removeItem(MODEL_REQUIREMENT_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear requirement cache:', error);
  }
  if (state.requirementFetchController) {
    state.requirementFetchController.abort();
    state.requirementFetchController = null;
  }
  state.modelRequirement = createRequirementEntry();
}

async function ensureReferenceImageReadyForGeneration() {
  const provider = state.settings.activeProvider;
  const modelId = getActiveProviderModel(state.settings);
  const requirement = await fetchModelRequirement(provider, modelId, false);

  setReferenceImageValidationMessage('');

  if (provider !== 'fal') {
    return true;
  }

  if (requirement.status === 'loading') {
    setGlobalMessage('error', 'モデル入力要件の確認中です。少し待って再実行してください。');
    return false;
  }

  if (requirement.status === 'error') {
    setGlobalMessage('error', `モデル入力要件の取得に失敗しました: ${requirement.error}`);
    return false;
  }

  if (requirement.unsupportedReason) {
    setGlobalMessage('error', `このモデルの画像入力要件には未対応です: ${requirement.unsupportedReason}`);
    return false;
  }

  if (requirement.imageSupport === 'required' && !hasReferenceImageValue(state.referenceImage)) {
    setReferenceImageValidationMessage('このモデルは参照画像が必須です。画像ファイルまたはURLを指定してください。');
    setGlobalMessage('error', '参照画像が未設定のため生成を開始できません。');
    return false;
  }

  return true;
}

function referenceImagePayloadFor(provider, settingsSnapshot) {
  if (provider !== 'fal') {
    return {};
  }

  const model = settingsSnapshot.providers.fal.model || '';
  const cacheKey = requirementCacheKey(provider, model);
  const requirement =
    state.modelRequirement.provider === provider && state.modelRequirement.modelId === model
      ? state.modelRequirement
      : state.modelRequirementCache.get(cacheKey) || createNoImageRequirement(provider, model);

  return buildReferenceImagePayload(requirement, getReferenceImageValue(state.referenceImage));
}

function buildModelSelectOptions() {
  const provider = state.settings.activeProvider;
  const currentModel = getActiveProviderModel(state.settings);
  const select = refs.providerModelSelect;
  select.innerHTML = '';

  if (provider === 'firefly') {
    const option = document.createElement('option');
    option.value = currentModel;
    option.textContent = currentModel || 'firefly-v3';
    select.appendChild(option);
    select.disabled = true;
    refs.refreshModelsButton.disabled = true;
    setModelFetchMessage();
    return;
  }

  const catalog = state.modelCatalog[provider];
  refs.refreshModelsButton.disabled = catalog.status === 'loading';

  const addOption = (value, label) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  };

  if (catalog.status === 'loading') {
    addOption('__loading__', 'モデル一覧を取得中...');
    select.disabled = true;
    setModelFetchMessage();
    return;
  }

  let hasAnyOption = false;
  for (const model of withDisambiguatedLabels(catalog.models)) {
    addOption(model.id, model.displayLabel || model.label);
    hasAnyOption = true;
  }

  if (currentModel && !catalog.models.some((model) => model.id === currentModel)) {
    addOption(currentModel, `${currentModel} (現在の設定値)`);
    hasAnyOption = true;
  }

  if (!hasAnyOption) {
    addOption('__empty__', 'モデル一覧未取得 (手入力を利用)');
    select.disabled = true;
  } else {
    select.disabled = false;
    select.value = currentModel;
  }

  setModelFetchMessage();
}

async function fetchModelCatalog(provider, force = false) {
  if (provider !== 'fal' && provider !== 'google') {
    return;
  }

  const catalog = state.modelCatalog[provider];
  const stillFresh = catalog.loadedAt > 0 && Date.now() - catalog.loadedAt < MODEL_CACHE_TTL_MS;
  if (!force && catalog.status === 'ready' && stillFresh) {
    buildModelSelectOptions();
    updateProviderHint();
    if (provider === state.settings.activeProvider) {
      void fetchModelRequirement(provider, getActiveProviderModel(state.settings), false);
    }
    return;
  }

  const apiKey = getProviderApiKey(provider, state.settings);
  catalog.status = 'loading';
  catalog.error = '';
  buildModelSelectOptions();
  updateProviderHint();

  const existingController = state.modelFetchControllers.get(provider);
  if (existingController) {
    existingController.abort();
  }
  const controller = new AbortController();
  state.modelFetchControllers.set(provider, controller);

  try {
    const models = provider === 'fal'
      ? await fetchFalModels(apiKey, controller.signal)
      : await fetchGoogleModels(apiKey, controller.signal);

    state.modelCatalog[provider] = {
      status: 'ready',
      models,
      error: '',
      loadedAt: Date.now()
    };
    saveCatalogToStorage(provider, state.modelCatalog[provider]);
  } catch (error) {
    if (error?.name === 'AbortError') {
      return;
    }
    state.modelCatalog[provider] = {
      status: 'error',
      models: [],
      error: getModelFetchErrorMessage(error),
      loadedAt: 0
    };
  } finally {
    state.modelFetchControllers.delete(provider);
    buildModelSelectOptions();
    updateProviderHint();
    if (provider === state.settings.activeProvider) {
      void fetchModelRequirement(provider, getActiveProviderModel(state.settings), false);
    }
  }
}

function ensureTemplateValidOrNotify() {
  validateCurrentTemplate();
  if (!state.templateValidation.ok) {
    setGlobalMessage('error', `テンプレートエラー: ${state.templateValidation.errors.join(' / ')}`);
    render();
    return false;
  }
  return true;
}

function buildPromptForRequest(settings, linePrompt) {
  if (settings.mode === 'advanced') {
    const rendered = renderTemplate(settings.commonPrompt || '', {
      item: linePrompt
    });

    if (rendered.unresolvedVariables.length > 0) {
      throw new Error(`未解決変数: ${rendered.unresolvedVariables.join(', ')}`);
    }

    return rendered.text.trim();
  }

  return buildFinalPrompt(settings.commonPrompt, linePrompt);
}

function renderStatusSummary() {
  const status = buildStatusSummary(state.cards);
  refs.statusSummary.textContent = status.summaryText;
}

function setGlobalMessage(type, text) {
  refs.globalMessage.classList.remove(
    'hidden',
    'border-red-200',
    'bg-red-50',
    'text-red-700',
    'border-teal-200',
    'bg-teal-50',
    'text-teal-700',
    'border-slate-200',
    'bg-slate-50',
    'text-slate-700'
  );

  if (!text) {
    refs.globalMessage.classList.add('hidden');
    refs.globalMessage.textContent = '';
    return;
  }

  refs.globalMessage.textContent = text;
  refs.globalMessage.classList.add(...globalMessageClasses(type));

  // Analytics: エラー発生時のみトラッキング
  if (type === 'error') {
    trackEvent(EVENTS.ERROR_OCCURRENCE, {
      error_type: classifyErrorFromMessage(text),
      message: text,
      component: inferErrorComponent(text),
      active_provider: state.settings.activeProvider
    });
  }
}

function updateProviderConfigurationMessage() {
  const active = state.settings.activeProvider;
  const configured = isProviderConfigured(active, state.settings);

  if (!configured) {
    setGlobalMessage('error', `${PROVIDER_INFO[active]?.label || active}のAPI設定が未入力です。API設定を確認してください。`);
  } else {
    setGlobalMessage('info', '準備完了。APIキーはブラウザ内にのみ保存され、Firefly Access Tokenはセッション内のみ保持されます。');
  }
}

function renderCards() {
  const templateBlocked = isAdvancedMode(state.settings) && !state.templateValidation.ok;
  const providerNotConfigured = !isProviderConfigured(state.settings.activeProvider, state.settings);

  renderCardsView({
    cards: state.cards,
    templateBlocked,
    providerNotConfigured,
    runningCardIds: state.runningCardIds,
    isDownloadingBundle: state.isDownloadingBundle,
    commonPrompt: (state.settings.commonPrompt || '').trim(),
    buildPromptFn: (common, line) => buildPromptForRequest({ ...state.settings, commonPrompt: common }, line),
    refs,
    onImagePreview: handleImagePreviewCard,
    onRegenerate: handleRegenerate,
    onPreview: handlePreviewCard,
    onDownload: handleDownloadCard,
    onRemove: handleRemoveCard,
    onPromptChange: async (cardId, promptValue) => {
      const current = state.cards.find((entry) => entry.id === cardId);
      if (!current) {
        return;
      }
      current.prompt = promptValue;
      current.updatedAt = new Date().toISOString();
      await upsertCard(current);
      render();
    },
    onProviderChange: async (cardId, newProvider) => {
      const current = state.cards.find((entry) => entry.id === cardId);
      if (!current) {
        return;
      }
      current.provider = newProvider;
      current.updatedAt = new Date().toISOString();
      await upsertCard(current);
      render();
    },
    onModelChange: async (cardId, newModel) => {
      const current = state.cards.find((entry) => entry.id === cardId);
      if (!current) {
        return;
      }
      current.model = newModel;
      current.updatedAt = new Date().toISOString();
      await upsertCard(current);
      render();
    }
  });
}

function renderModeHint() {
  refs.modeHint.textContent = modeHintText();
}

function render(shouldRenderCards = true) {
  validateCurrentTemplate();
  renderModeHint();
  renderTemplateValidation();
  updateProviderHint();
  buildModelSelectOptions();
  renderModelRequirement();
  renderStatusSummary();
  if (shouldRenderCards) {
    renderCards();
  }

  const templateBlocked = isAdvancedMode(state.settings) && !state.templateValidation.ok;
  const providerNotConfigured = !isProviderConfigured(state.settings.activeProvider, state.settings);

  refs.createCardsButton.disabled = templateBlocked;
  refs.generateExistingButton.disabled =
    isGenerateExistingDisabled(state.isBatchGenerating, state.cards) || templateBlocked || providerNotConfigured;
  refs.regenerateFailedButton.disabled =
    isRegenerateFailedDisabled(state.isBatchGenerating, state.cards) || templateBlocked || providerNotConfigured;
  refs.downloadAllButton.disabled =
    state.isDownloadingBundle || !state.cards.some((card) => Boolean(card.imageUrl));
}

function handleExportSettings() {
  syncSettingsFromForm();
  const json = exportSettingsToJSON(state.settings);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `image-creator-settings-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  setGlobalMessage('success', '設定をエクスポートしました。');
}

async function handleImportSettings(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const importedSettings = validateImportedSettings(text);
    state.settings = deepMerge(DEFAULT_SETTINGS, importedSettings);
    writeSettingsToForm();
    await saveSettings(stripSessionOnlySettings(state.settings));
    setGlobalMessage('success', '設定をインポートしました。');
    render();
  } catch (error) {
    setGlobalMessage('error', `インポート失敗: ${summarizeError(error)}`);
  } finally {
    event.target.value = '';
  }
}

async function addCardsFromBatch() {
  syncSettingsFromForm();
  if (!ensureTemplateValidOrNotify()) {
    return [];
  }

  const lines = normalizePromptLines(refs.promptBatchInput.value);
  if (lines.length === 0) {
    setGlobalMessage('info', '入力欄にプロンプトを1行以上入れてください。');
    return [];
  }

  const activeProvider = state.settings.activeProvider;
  const activeModel = getActiveProviderModel(state.settings);
  const cards = lines.map((line) => createPromptCard(line, activeProvider, activeModel));
  state.cards = [...cards, ...state.cards];
  await upsertCards(cards);
  refs.promptBatchInput.value = '';
  render();
  setGlobalMessage('success', `${cards.length}件のカードを追加しました。`);

  // Analytics: カード作成
  trackEvent(EVENTS.CARD_CREATION, {
    count: cards.length,
    mode: state.settings.mode,
    active_provider: state.settings.activeProvider
  });

  return cards;
}

async function handleRemoveCard(cardId) {
  const index = state.cards.findIndex((entry) => entry.id === cardId);
  if (index === -1) {
    return;
  }

  const [removed] = state.cards.splice(index, 1);
  const controller = state.abortControllers.get(cardId);
  if (controller) {
    controller.abort();
    state.abortControllers.delete(cardId);
  }
  state.runningCardIds.delete(cardId);
  await deleteCard(removed.id);

  // Analytics: カード削除
  trackEvent(EVENTS.CARD_DELETION, {
    card_status: removed.status,
    active_provider: state.settings.activeProvider
  });

  render();
}

async function handleRegenerate(cardId) {
  syncSettingsFromForm();
  if (
    !(await runGenerationPreflight({
      settings: state.settings,
      ensureTemplateValidOrNotify,
      ensureReferenceImageReadyForGeneration,
      setGlobalMessage
    }))
  ) {
    render(false);
    return;
  }

  if (state.runningCardIds.has(cardId)) {
    setGlobalMessage('info', 'このカードはすでに生成中です。');
    return;
  }

  const card = state.cards.find((entry) => entry.id === cardId);
  if (!card) {
    return;
  }

  // Use card's own provider if set, otherwise fallback to global
  const provider = card.provider || state.settings.activeProvider;

  if (!isProviderConfigured(provider, state.settings)) {
    setGlobalMessage('error', `${provider} のAPI設定が未入力です。`);
    return;
  }

  // Analytics: 個別再生成
  trackEvent(EVENTS.CARD_REGENERATE, {
    card_id: hashCardId(cardId),
    previous_status: card.status,
    active_provider: provider
  });

  await processCard(cardId, provider);
}

async function processCard(cardId, provider) {
  if (state.runningCardIds.has(cardId)) {
    return;
  }

  const card = state.cards.find((entry) => entry.id === cardId);
  if (!card) {
    return;
  }

  state.runningCardIds.add(cardId);
  card.status = CARD_STATUSES.generating;
  card.errorMessage = '';
  card.provider = provider;
  await upsertCard(card);
  render();

  const settingsSnapshot = deepMerge(DEFAULT_SETTINGS, state.settings);
  settingsSnapshot.activeProvider = provider;
  if (card.model && settingsSnapshot.providers[provider]) {
    settingsSnapshot.providers[provider].model = card.model;
  }
  const finalPrompt = buildPromptForRequest(settingsSnapshot, card.prompt);
  const providerInput = referenceImagePayloadFor(provider, settingsSnapshot);
  card.finalPrompt = finalPrompt;
  const controller = new AbortController();
  state.abortControllers.set(cardId, controller);

  try {
    const result = await generateImage({
      provider,
      finalPrompt,
      settings: settingsSnapshot,
      providerInput,
      signal: controller.signal
    });
    card.status = CARD_STATUSES.success;
    card.imageUrl = result.imageUrl;
    card.provider = result.provider;
    card.model = result.model;
    card.errorMessage = '';
    card.generatedWith = {
      provider: result.provider,
      model: result.model,
      finalPrompt,
      commonPrompt: (settingsSnapshot.commonPrompt || '').trim()
    };

    // Analytics: 生成成功
    trackEvent(EVENTS.GENERATION_CARD_SUCCESS, {
      card_id: hashCardId(cardId),
      provider: result.provider,
      model: result.model,
      has_reference_image: hasReferenceImageValue(state.referenceImage),
      active_provider: provider
    });
  } catch (error) {
    card.status = CARD_STATUSES.error;
    card.errorMessage = summarizeError(error);

    // Analytics: 生成失敗
    trackEvent(EVENTS.GENERATION_CARD_FAILED, {
      card_id: hashCardId(cardId),
      provider,
      model: getActiveProviderModel(settingsSnapshot),
      error_type: classifyError(error),
      error_message: summarizeError(error),
      active_provider: provider
    });
  } finally {
    state.abortControllers.delete(cardId);
    state.runningCardIds.delete(cardId);
    await upsertCard(card);
    render();
  }
}

async function processGenerationQueue(cardIds) {
  if (
    !(await runGenerationPreflight({
      settings: state.settings,
      ensureTemplateValidOrNotify,
      ensureReferenceImageReadyForGeneration,
      setGlobalMessage
    }))
  ) {
    render(false);
    return;
  }

  const globalProvider = state.settings.activeProvider;

  const queue = pickRunnableCardIds(cardIds, state.runningCardIds);
  if (queue.length === 0) {
    setGlobalMessage('info', '実行可能なカードがありません。');
    return;
  }
  const requestedConcurrency = Number(state.settings.concurrency) || DEFAULT_GENERATION_CONCURRENCY;
  const concurrency = Math.min(
    Math.max(requestedConcurrency, MIN_GENERATION_CONCURRENCY),
    MAX_GENERATION_CONCURRENCY
  );
  state.isBatchGenerating = true;
  setGlobalMessage('info', `生成開始: ${queue.length}件`);
  render();

  // Analytics: 一括生成開始
  const startTime = Date.now();
  trackEvent(EVENTS.GENERATION_BATCH_START, {
    queue_length: queue.length,
    provider: globalProvider,
    model: getActiveProviderModel(state.settings),
    concurrency,
    active_provider: globalProvider
  });

  try {
    const workers = Array.from({ length: Math.min(concurrency, queue.length) }).map(async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) {
          return;
        }
        const card = state.cards.find((entry) => entry.id === next);
        const cardProvider = card?.provider || globalProvider;
        // eslint-disable-next-line no-await-in-loop
        await processCard(next, cardProvider);
      }
    });
    await Promise.all(workers);
  } finally {
    state.isBatchGenerating = false;
  }

  const { counts } = buildStatusSummary(state.cards);
  const duration = Date.now() - startTime;

  // Analytics: 一括生成完了
  trackEvent(EVENTS.GENERATION_BATCH_COMPLETE, {
    total: cardIds.length,
    success_count: counts.success,
    error_count: counts.error,
    duration_ms: duration,
    active_provider: globalProvider
  });

  if (counts.error > 0) {
    setGlobalMessage('info', `生成完了: 成功${counts.success} / 失敗${counts.error}`);
  } else {
    setGlobalMessage('success', `生成完了: ${counts.success}件`);
  }
  render();
}

async function handleGenerateExistingCards() {
  syncSettingsFromForm();

  let targetIds = [];
  const batchLines = normalizePromptLines(refs.promptBatchInput.value);
  if (batchLines.length > 0) {
    const cards = await addCardsFromBatch();
    targetIds = cards.map((card) => card.id);
  } else {
    targetIds = state.cards.map((card) => card.id);
  }

  if (targetIds.length === 0) {
    setGlobalMessage('info', '生成対象カードがありません。');
    return;
  }
  await processGenerationQueue(targetIds);
}

async function handleRegenerateFailedCards() {
  syncSettingsFromForm();
  const failedIds = state.cards.filter((card) => card.status === CARD_STATUSES.error).map((card) => card.id);
  if (failedIds.length === 0) {
    setGlobalMessage('info', '失敗カードはありません。');
    return;
  }
  await processGenerationQueue(failedIds);
}

async function handleImagePreviewCard(cardId) {
  const card = state.cards.find((entry) => entry.id === cardId);
  if (!card?.imageUrl) {
    setGlobalMessage('info', 'このカードにはプレビュー可能な画像がありません。');
    return;
  }
  const promptText = card.finalPrompt || card.prompt || '';
  const providerText = card.provider ? `${card.provider} / ${card.model || 'default'}` : '';
  openImagePreviewModal(card.imageUrl, promptText, providerText);
}

function previewHintForMode() {
  if (isAdvancedMode(state.settings)) {
    return 'Advanced Mode: テンプレート展開後にAPIへ送信される全文です。';
  }
  return 'Light Mode: 共通プロンプト + 個別プロンプトの結合結果です。';
}

async function handlePreviewCard(cardId) {
  const card = state.cards.find((entry) => entry.id === cardId);
  if (!card) {
    return;
  }

  syncSettingsFromForm();

  try {
    if (!ensureTemplateValidOrNotify()) {
      return;
    }
    const finalPrompt = buildPromptForRequest(state.settings, card.prompt);
    openPreviewModal(finalPrompt, previewHintForMode());
  } catch (error) {
    setGlobalMessage('error', `プレビュー作成失敗: ${summarizeError(error)}`);
  }
}

async function handleCopyPreview() {
  if (!state.previewContent) {
    return;
  }

  try {
    await navigator.clipboard.writeText(state.previewContent);
    setGlobalMessage('success', 'プレビュー内容をコピーしました。');
  } catch {
    setGlobalMessage('error', 'クリップボードへのコピーに失敗しました。');
  }
}

async function handleDownloadCard(cardId) {
  const card = state.cards.find((entry) => entry.id === cardId);
  if (!card?.imageUrl) {
    setGlobalMessage('info', 'このカードにはダウンロード可能な画像がありません。');
    return;
  }

  try {
    const result = await downloadSingleCard(card);
    const metadataLabel = result.metadataEmbedded ? ' (PNG metadataあり)' : '';
    setGlobalMessage('success', `ダウンロードしました: ${result.fileName}${metadataLabel}`);
  } catch (error) {
    setGlobalMessage('error', `ダウンロード失敗: ${summarizeError(error)}`);
  }
}

async function handleDownloadAllCards() {
  const downloadable = state.cards.filter((card) => card.imageUrl);
  if (downloadable.length === 0) {
    setGlobalMessage('info', 'ダウンロード可能なカードがありません。');
    return;
  }

  state.isDownloadingBundle = true;
  setGlobalMessage('info', `${downloadable.length}件の画像をダウンロード準備中です...`);
  render();

  // Analytics: 一括ダウンロード開始
  trackEvent(EVENTS.BATCH_DOWNLOAD_START, {
    total_cards: downloadable.length,
    active_provider: state.settings.activeProvider
  });

  try {
    const result = await downloadCardsBundle(downloadable);

    // Analytics: 一括ダウンロード完了
    trackEvent(EVENTS.BATCH_DOWNLOAD_COMPLETE, {
      success_count: result.success,
      total: result.total,
      mode: result.mode,
      metadata_embedded: result.metadataEmbedded || 0,
      active_provider: state.settings.activeProvider
    });

    if (result.mode === 'zip') {
      setGlobalMessage(
        'success',
        `一括ダウンロード完了: ${result.success}/${result.total}件 (PNG metadata埋め込み ${result.metadataEmbedded}件)`
      );
    } else {
      setGlobalMessage('info', `ZIP未使用で個別DLを実行しました: ${result.success}/${result.total}件`);
    }
  } catch (error) {
    setGlobalMessage('error', `一括ダウンロード失敗: ${summarizeError(error)}`);
  } finally {
    state.isDownloadingBundle = false;
    render();
  }
}

async function handleClearCards() {
  if (hasRunningJobs()) {
    setGlobalMessage('error', '生成中は全削除できません。');
    return;
  }
  if (state.isDownloadingBundle) {
    setGlobalMessage('error', '一括ダウンロード中は全削除できません。');
    return;
  }
  const confirmed = window.confirm('カードを全削除します。よろしいですか？');
  if (!confirmed) {
    return;
  }
  state.cards = [];
  await clearCards();
  closePreviewModal();
  closeImagePreviewModal();
  setGlobalMessage('success', 'カードを全削除しました。');
  render();
}

function switchActiveProvider(nextProvider) {
  const previousProvider = state.settings.activeProvider;
  const previousModelInput = refs.providerModelManualInput.value.trim();
  if (previousProvider) {
    state.settings.providers[previousProvider].model =
      previousModelInput || DEFAULT_SETTINGS.providers[previousProvider].model;
  }

  state.settings.activeProvider = nextProvider;
  refs.providerModelManualInput.value =
    state.settings.providers[nextProvider].model || DEFAULT_SETTINGS.providers[nextProvider].model;

  syncSettingsFromForm();
  render();
  void fetchModelCatalog(nextProvider, false);
  void fetchModelRequirement(nextProvider, getActiveProviderModel(state.settings), false);
  updateProviderConfigurationMessage();
  scheduleSettingsAutoSave();

  // Analytics: プロバイダー切り替え
  trackEvent(EVENTS.PROVIDER_SWITCH, {
    from: previousProvider,
    to: nextProvider,
    active_provider: nextProvider
  });
}

let settingsAutoSaveTimer = null;
function scheduleSettingsAutoSave() {
  if (settingsAutoSaveTimer) {
    clearTimeout(settingsAutoSaveTimer);
  }
  settingsAutoSaveTimer = setTimeout(() => {
    settingsAutoSaveTimer = null;
    void saveSettings(stripSessionOnlySettings(state.settings));
  }, 500);
}

function bindEvents() {
  if (refs.exportSettingsButton) {
    refs.exportSettingsButton.addEventListener('click', () => {
      void handleExportSettings();
    });
  }

  if (refs.importSettingsInput) {
    refs.importSettingsInput.addEventListener('change', (event) => {
      void handleImportSettings(event);
    });
  }

  refs.providerSelect.addEventListener('change', (event) => {
    switchActiveProvider(event.target.value);
  });

  refs.modeSelect.addEventListener('change', () => {
    syncSettingsFromForm();
    render();
    scheduleSettingsAutoSave();
  });

  let commonPromptCardDebounce = null;
  refs.commonPromptInput.addEventListener('input', () => {
    syncSettingsFromForm();
    render(false);
    scheduleSettingsAutoSave();
    if (commonPromptCardDebounce) {
      clearTimeout(commonPromptCardDebounce);
    }
    commonPromptCardDebounce = setTimeout(() => {
      commonPromptCardDebounce = null;
      renderCards();
    }, 300);
  });

  refs.providerModelManualInput.addEventListener('input', () => {
    syncSettingsFromForm();
    render(false);
    scheduleModelRequirementRefresh(false);
    scheduleSettingsAutoSave();
  });

  refs.providerModelSelect.addEventListener('change', (event) => {
    const nextModel = event.target.value;
    if (!nextModel || nextModel === '__loading__' || nextModel === '__empty__') {
      return;
    }
    refs.providerModelManualInput.value = nextModel;
    setActiveProviderModel(nextModel);
    render();
    void fetchModelRequirement(state.settings.activeProvider, getActiveProviderModel(state.settings), false);
    scheduleSettingsAutoSave();
  });

  refs.refreshModelsButton.addEventListener('click', () => {
    void fetchModelCatalog(state.settings.activeProvider, true);
  });

  refs.falApiKeyInput.addEventListener('input', () => {
    resetModelCatalog('fal');
    resetRequirementState();
    syncSettingsFromForm();
    render(false);
    scheduleModelRequirementRefresh(false);
    updateProviderConfigurationMessage();
    scheduleSettingsAutoSave();
  });

  refs.googleApiKeyInput.addEventListener('input', () => {
    resetModelCatalog('google');
    syncSettingsFromForm();
    render(false);
    updateProviderConfigurationMessage();
    scheduleSettingsAutoSave();
  });

  refs.fireflyClientIdInput.addEventListener('input', () => {
    syncSettingsFromForm();
    render(false);
    updateProviderConfigurationMessage();
    scheduleSettingsAutoSave();
  });

  refs.fireflyAccessTokenInput.addEventListener('input', () => {
    syncSettingsFromForm();
    render(false);
    updateProviderConfigurationMessage();
  });

  refs.fireflyApiBaseInput.addEventListener('input', () => {
    syncSettingsFromForm();
    render(false);
    scheduleSettingsAutoSave();
  });

  refs.fireflyContentClassInput.addEventListener('input', () => {
    syncSettingsFromForm();
    render(false);
    scheduleSettingsAutoSave();
  });

  if (refs.fireflyProxyUrlInput) {
    refs.fireflyProxyUrlInput.addEventListener('input', () => {
      syncSettingsFromForm();
      render(false);
      scheduleSettingsAutoSave();
    });
  }

  if (refs.fireflyProxyTokenInput) {
    refs.fireflyProxyTokenInput.addEventListener('input', () => {
      syncSettingsFromForm();
      render(false);
      scheduleSettingsAutoSave();
    });
  }

  refs.referenceImageInput.addEventListener('change', (event) => {
    const input = event.currentTarget;
    const [file] = input?.files || [];
    void setReferenceImageFromFile(file);
  });

  refs.referenceImageUrlInput.addEventListener('change', (event) => {
    const input = event.currentTarget;
    setReferenceImageFromUrl(input?.value || '');
  });

  refs.clearReferenceImageButton.addEventListener('click', () => {
    clearReferenceImageState();
  });

  refs.referenceDropzone.addEventListener('click', (event) => {
    const target = event.target;
    if (
      target === refs.referenceImageInput ||
      (target instanceof Element && target.closest('label'))
    ) {
      return;
    }
    refs.referenceImageInput.click();
  });

  refs.referenceDropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    refs.referenceDropzone.classList.add('border-emerald-500', 'bg-emerald-50');
  });

  refs.referenceDropzone.addEventListener('dragleave', () => {
    refs.referenceDropzone.classList.remove('border-emerald-500', 'bg-emerald-50');
  });

  refs.referenceDropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    refs.referenceDropzone.classList.remove('border-emerald-500', 'bg-emerald-50');
    const [file] = event.dataTransfer?.files || [];
    void setReferenceImageFromFile(file);
  });

  refs.createCardsButton.addEventListener('click', () => {
    void addCardsFromBatch();
  });

  refs.generateExistingButton.addEventListener('click', () => {
    void handleGenerateExistingCards();
  });

  refs.regenerateFailedButton.addEventListener('click', () => {
    void handleRegenerateFailedCards();
  });

  refs.downloadAllButton.addEventListener('click', () => {
    void handleDownloadAllCards();
  });

  refs.clearCardsButton.addEventListener('click', () => {
    void handleClearCards();
  });

  refs.closePreviewModalButton.addEventListener('click', () => {
    closePreviewModal();
  });

  refs.copyPreviewButton.addEventListener('click', () => {
    void handleCopyPreview();
  });

  refs.previewModal.addEventListener('click', (event) => {
    if (event.target === refs.previewModal) {
      closePreviewModal();
    }
  });

  refs.closeImagePreviewModalButton.addEventListener('click', () => {
    closeImagePreviewModal();
  });

  refs.imagePreviewModal.addEventListener('click', (event) => {
    if (event.target === refs.imagePreviewModal) {
      closeImagePreviewModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !refs.previewModal.classList.contains('hidden')) {
      closePreviewModal();
    }
    if (event.key === 'Escape' && !refs.imagePreviewModal.classList.contains('hidden')) {
      closeImagePreviewModal();
    }
  });
}

// Analytics用ユーティリティ関数

// カードIDのプライバシー保護（ハッシュ化）
function hashCardId(cardId) {
  return `card_${cardId.slice(0, 8)}`;
}

// エラー分類（Error型→エラータイプ文字列）
function classifyError(error) {
  const message = summarizeError(error).toLowerCase();

  if (message.includes('api key') || message.includes('unauthorized')) {
    return ERROR_TYPES.CONFIG;
  }
  if (message.includes('network') || message.includes('fetch')) {
    return ERROR_TYPES.NETWORK;
  }
  if (message.includes('validation') || message.includes('invalid')) {
    return ERROR_TYPES.VALIDATION;
  }
  if (message.includes('reference') || message.includes('image')) {
    return ERROR_TYPES.REFERENCE_IMAGE;
  }
  if (message.includes('http') || message.includes('status')) {
    return ERROR_TYPES.API;
  }

  return ERROR_TYPES.UNKNOWN;
}

// エラーメッセージから分類（文字列→エラータイプ文字列）
function classifyErrorFromMessage(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('テンプレート') || lowerMessage.includes('validation')) {
    return ERROR_TYPES.VALIDATION;
  }
  if (lowerMessage.includes('api') || lowerMessage.includes('未設定')) {
    return ERROR_TYPES.CONFIG;
  }
  if (lowerMessage.includes('参照画像')) {
    return ERROR_TYPES.REFERENCE_IMAGE;
  }

  return ERROR_TYPES.UNKNOWN;
}

// エラー発生コンポーネント推定
function inferErrorComponent(message) {
  if (message.includes('テンプレート')) return 'template';
  if (message.includes('API設定') || message.includes('APIキー')) return 'settings';
  if (message.includes('モデル')) return 'model';
  if (message.includes('参照画像')) return 'reference_image';
  if (message.includes('ダウンロード')) return 'download';
  if (message.includes('初期化')) return 'initialization';
  return 'unknown';
}

async function init() {
  try {
    state.settings = deepMerge(DEFAULT_SETTINGS, await loadSettings());
    validateCurrentTemplate();
    state.cards = await loadCards();
    writeSettingsToForm();
    bindEvents();
    render();

    const active = state.settings.activeProvider;
    await fetchModelCatalog(active, false);
    await fetchModelRequirement(active, getActiveProviderModel(state.settings), false);

    updateProviderConfigurationMessage();

    // Analytics: セッション開始
    trackEvent(EVENTS.APP_SESSION_START, {
      cards_count: state.cards.length,
      has_api_keys: isProviderConfigured(active, state.settings),
      default_provider: active,
      active_provider: active
    });
  } catch (error) {
    console.error(error);
    setGlobalMessage('error', `初期化に失敗しました: ${summarizeError(error)}`);
  }
}

void init();
