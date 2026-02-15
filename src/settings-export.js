export function exportSettingsToJSON(settings) {
  const exported = structuredClone(settings);
  if (exported?.providers?.firefly) {
    exported.providers.firefly.accessToken = '';
  }
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      appName: 'image_creator_app',
      settings: exported
    },
    null,
    2
  );
}

export function validateImportedSettings(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('JSONの解析に失敗しました。');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('無効なフォーマットです。');
  }

  if (!parsed.settings || typeof parsed.settings !== 'object') {
    throw new Error('設定データが見つかりません。');
  }

  const s = parsed.settings;
  if (!s.activeProvider || !s.providers) {
    throw new Error('必須フィールドが不足しています。');
  }

  return parsed.settings;
}
