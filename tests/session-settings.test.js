import test from 'node:test';
import assert from 'node:assert/strict';

import { stripSessionOnlySettings } from '../src/session-settings.js';

test('stripSessionOnlySettings clears firefly access token without mutating input', () => {
  const input = {
    providers: {
      firefly: {
        accessToken: 'token-abc',
        clientId: 'client-id'
      }
    }
  };

  const result = stripSessionOnlySettings(input);
  assert.equal(result.providers.firefly.accessToken, '');
  assert.equal(result.providers.firefly.clientId, 'client-id');
  assert.equal(input.providers.firefly.accessToken, 'token-abc');
});
