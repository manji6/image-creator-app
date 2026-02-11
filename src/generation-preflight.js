import { isProviderConfigured } from './providers/index.js';

export async function runGenerationPreflight({
  settings,
  ensureTemplateValidOrNotify,
  ensureReferenceImageReadyForGeneration,
  setGlobalMessage
}) {
  if (!ensureTemplateValidOrNotify()) {
    return false;
  }

  if (!(await ensureReferenceImageReadyForGeneration())) {
    return false;
  }

  const provider = settings.activeProvider;
  const configured = isProviderConfigured(provider, settings);
  if (!configured) {
    setGlobalMessage('error', '利用プロバイダが未設定です。API設定を確認してください。');
    return false;
  }

  return true;
}
