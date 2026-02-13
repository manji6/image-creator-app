export const ANALYTICS_CONFIG = {
  enabled: true,
  environment: 'auto', // 'auto', 'development', 'production'
  provider: 'console', // 'gtm', 'console', 'noop'
  gtmContainerId: 'GTM-XXXXXXX', // ← ユーザーが用意したコンテナID
  sessionIdKey: 'analytics_session_id',
  optInKey: 'analytics_opt_in',
  appVersion: '0.1.0'
};

export const EVENTS = {
  // セッション
  APP_SESSION_START: 'app_session_start',

  // ページビュー（仮想）
  PAGE_VIEW: 'page_view',

  // カード操作
  CARD_CREATION: 'card_creation',
  CARD_REGENERATE: 'card_regenerate',
  CARD_DELETION: 'card_deletion',

  // 生成プロセス
  GENERATION_BATCH_START: 'generation_batch_start',
  GENERATION_CARD_SUCCESS: 'generation_card_success',
  GENERATION_CARD_FAILED: 'generation_card_failed',
  GENERATION_BATCH_COMPLETE: 'generation_batch_complete',

  // ダウンロード
  BATCH_DOWNLOAD_START: 'batch_download_start',
  BATCH_DOWNLOAD_COMPLETE: 'batch_download_complete',

  // 設定
  PROVIDER_SWITCH: 'provider_switch',
  SETTINGS_SAVE: 'settings_save',

  // UI操作
  MODAL_OPEN: 'modal_open',
  MODAL_CLOSE: 'modal_close',

  // 参照画像
  REFERENCE_IMAGE_UPLOAD: 'reference_image_upload',

  // エラー
  ERROR_OCCURRENCE: 'error_occurrence'
};

export const ERROR_TYPES = {
  VALIDATION: 'validation_error',
  API: 'api_error',
  NETWORK: 'network_error',
  CONFIG: 'config_error',
  REFERENCE_IMAGE: 'reference_image_error',
  UNKNOWN: 'unknown_error'
};
