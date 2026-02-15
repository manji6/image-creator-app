export const DB_NAME = 'image_batch_studio';
export const DB_VERSION = 1;
export const SETTINGS_KEY = 'app_settings';

export const CARD_STATUSES = {
  pending: 'pending',
  generating: 'generating',
  success: 'success',
  error: 'error'
};

export const DEFAULT_SETTINGS = {
  activeProvider: 'fal',
  mode: 'light',
  commonPrompt: '',
  concurrency: 2,
  providers: {
    fal: {
      apiKey: '',
      model: 'fal-ai/flux/schnell',
      endpointMode: 'sync'
    },
    google: {
      apiKey: '',
      model: 'gemini-2.5-flash-image-preview'
    },
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

export const STATUS_LABELS = {
  pending: '待機',
  generating: '生成中',
  success: '完了',
  error: '失敗',
  dirty: '設定変更あり'
};
