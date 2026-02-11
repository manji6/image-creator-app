import { generateWithFal } from './fal.js';
import { generateWithGoogle } from './google.js';
import { generateWithFirefly } from './firefly.js';

export const PROVIDER_INFO = {
  fal: {
    id: 'fal',
    label: 'fal.ai',
    description: 'API Key があれば即利用可能です。'
  },
  google: {
    id: 'google',
    label: 'Google AI Studio',
    description: 'API Key を入力すると画像生成を利用できます。'
  },
  firefly: {
    id: 'firefly',
    label: 'Adobe Firefly',
    description: 'Proxy URL または Client ID + Access Token を設定すると利用できます。'
  }
};

const PROVIDER_RUNTIME = {
  fal: {
    isConfigured: (settings) => Boolean(settings.providers.fal.apiKey),
    generate: ({ finalPrompt, settings, providerInput, signal }) =>
      generateWithFal({ finalPrompt, settings, providerInput, signal })
  },
  google: {
    isConfigured: (settings) => Boolean(settings.providers.google.apiKey),
    generate: ({ finalPrompt, settings, signal }) => generateWithGoogle({ finalPrompt, settings, signal })
  },
  firefly: {
    isConfigured: (settings) =>
      Boolean(settings.providers.firefly.proxyUrl) ||
      Boolean(settings.providers.firefly.clientId && settings.providers.firefly.accessToken),
    generate: ({ finalPrompt, settings, signal }) => generateWithFirefly({ finalPrompt, settings, signal })
  }
};

export function isProviderConfigured(provider, settings) {
  return Boolean(PROVIDER_RUNTIME[provider]?.isConfigured(settings));
}

export function providerHint(provider, settings) {
  const info = PROVIDER_INFO[provider];
  if (!info) {
    return 'Unknown provider';
  }

  if (provider === 'firefly') {
    const useProxy = Boolean(settings.providers.firefly.proxyUrl);
    const useDirect = Boolean(settings.providers.firefly.clientId && settings.providers.firefly.accessToken);
    if (useProxy || useDirect) {
      const mode = useProxy ? 'Proxy' : 'Direct Token';
      return `${info.label}: 設定済み (${mode})`;
    }
    return `${info.label}: 未設定。${info.description}`;
  }

  if (isProviderConfigured(provider, settings)) {
    return `${info.label}: 設定済み`;
  }

  return `${info.label}: 未設定。${info.description}`;
}

export async function generateImage({ provider, finalPrompt, settings, providerInput = {}, signal }) {
  const runtime = PROVIDER_RUNTIME[provider];
  if (!runtime) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  return runtime.generate({ finalPrompt, settings, providerInput, signal });
}
