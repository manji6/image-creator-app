import { ANALYTICS_CONFIG } from './config.js';
import { createGTMProvider } from './providers/gtm-provider.js';
import { createConsoleProvider } from './providers/console-provider.js';
import { createNoopProvider } from './providers/noop-provider.js';

let currentProvider = null;
let sessionId = null;
let config = { ...ANALYTICS_CONFIG };

// セッションID生成/取得
function getSessionId() {
  if (sessionId) return sessionId;

  try {
    const stored = sessionStorage.getItem(config.sessionIdKey);
    if (stored) {
      sessionId = stored;
      return sessionId;
    }
  } catch (error) {
    console.warn('Analytics: sessionStorage not available', error);
  }

  sessionId = crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;

  try {
    sessionStorage.setItem(config.sessionIdKey, sessionId);
  } catch (error) {
    console.warn('Analytics: could not store session ID', error);
  }

  return sessionId;
}

// 環境判定
function detectEnvironment() {
  if (config.environment !== 'auto') {
    return config.environment;
  }

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
    return 'development';
  }

  return 'production';
}

// オプトイン確認
function isOptedIn() {
  try {
    const optIn = localStorage.getItem(config.optInKey);
    // デフォルトはオプトイン（明示的にオプトアウトしていない限り有効）
    return optIn !== 'false';
  } catch {
    return true;
  }
}

// プロバイダー初期化
function initializeProvider() {
  if (!config.enabled || !isOptedIn()) {
    currentProvider = createNoopProvider();
    return;
  }

  const env = detectEnvironment();

  if (env === 'development' && config.provider === 'gtm') {
    // 開発環境ではconsoleプロバイダーを推奨
    console.log('[Analytics] Development mode: using console provider');
    currentProvider = createConsoleProvider();
    return;
  }

  switch (config.provider) {
    case 'gtm':
      currentProvider = createGTMProvider(config.gtmContainerId);
      break;
    case 'console':
      currentProvider = createConsoleProvider();
      break;
    default:
      currentProvider = createNoopProvider();
  }
}

// 共通メタデータ付与
function enrichEventData(eventName, data = {}) {
  return {
    event: eventName,
    ...data,
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
    environment: detectEnvironment(),
    app_version: config.appVersion
  };
}

// 公開API
export function configure(options = {}) {
  config = { ...config, ...options };
  initializeProvider();
}

export function trackEvent(eventName, data = {}) {
  if (!currentProvider) {
    initializeProvider();
  }

  const enrichedData = enrichEventData(eventName, data);
  currentProvider.track(enrichedData);
}

export function trackPageView(path) {
  trackEvent('page_view', { page_path: path });
}

export function setUserProperty(key, value) {
  if (!currentProvider) {
    initializeProvider();
  }

  currentProvider.setUserProperty(key, value);
}

// 初期化（モジュールロード時）
initializeProvider();
