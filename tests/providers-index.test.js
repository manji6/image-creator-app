import test from 'node:test';
import assert from 'node:assert/strict';

import { isProviderConfigured } from '../src/providers/index.js';

function makeSettings() {
  return {
    providers: {
      fal: { apiKey: '' },
      google: { apiKey: '' },
      firefly: {
        proxyUrl: '',
        clientId: '',
        accessToken: ''
      }
    }
  };
}

test('isProviderConfigured supports firefly direct token mode and proxy mode', () => {
  const settings = makeSettings();
  assert.equal(isProviderConfigured('firefly', settings), false);

  settings.providers.firefly.clientId = 'cid';
  settings.providers.firefly.accessToken = 'token';
  assert.equal(isProviderConfigured('firefly', settings), true);

  settings.providers.firefly.clientId = '';
  settings.providers.firefly.accessToken = '';
  settings.providers.firefly.proxyUrl = 'https://example.workers.dev';
  assert.equal(isProviderConfigured('firefly', settings), true);
});
