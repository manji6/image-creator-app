import test from 'node:test';
import assert from 'node:assert/strict';

import { exportSettingsToJSON, validateImportedSettings } from '../src/settings-export.js';

test('exportSettingsToJSON strips firefly accessToken', () => {
  const settings = {
    activeProvider: 'fal',
    mode: 'light',
    commonPrompt: 'test',
    concurrency: 2,
    providers: {
      fal: { apiKey: 'fal-key', model: 'fal-ai/flux/schnell' },
      google: { apiKey: 'google-key', model: 'gemini-2.5' },
      firefly: { clientId: 'cid', accessToken: 'secret-token', model: 'firefly-v3' }
    }
  };

  const json = exportSettingsToJSON(settings);
  const parsed = JSON.parse(json);

  assert.equal(parsed.version, 1);
  assert.equal(parsed.appName, 'image_creator_app');
  assert.equal(parsed.settings.providers.firefly.accessToken, '');
  assert.equal(parsed.settings.providers.fal.apiKey, 'fal-key');
  assert.equal(parsed.settings.activeProvider, 'fal');
});

test('exportSettingsToJSON does not mutate original settings', () => {
  const settings = {
    activeProvider: 'fal',
    providers: {
      firefly: { accessToken: 'secret' }
    }
  };

  exportSettingsToJSON(settings);
  assert.equal(settings.providers.firefly.accessToken, 'secret');
});

test('validateImportedSettings rejects invalid JSON', () => {
  assert.throws(() => validateImportedSettings('not json'), { message: 'JSONの解析に失敗しました。' });
});

test('validateImportedSettings rejects missing settings key', () => {
  assert.throws(() => validateImportedSettings('{"version":1}'), { message: '設定データが見つかりません。' });
});

test('validateImportedSettings rejects missing required fields', () => {
  assert.throws(
    () => validateImportedSettings('{"settings":{"mode":"light"}}'),
    { message: '必須フィールドが不足しています。' }
  );
});

test('validateImportedSettings returns settings on valid input', () => {
  const input = JSON.stringify({
    version: 1,
    appName: 'image_creator_app',
    settings: {
      activeProvider: 'fal',
      mode: 'light',
      providers: { fal: { apiKey: 'key' } }
    }
  });

  const result = validateImportedSettings(input);
  assert.equal(result.activeProvider, 'fal');
  assert.equal(result.providers.fal.apiKey, 'key');
});
