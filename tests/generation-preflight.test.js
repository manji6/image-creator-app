import test from 'node:test';
import assert from 'node:assert/strict';

import { runGenerationPreflight } from '../src/generation-preflight.js';

function buildSettings(provider = 'fal', configured = true) {
  return {
    activeProvider: provider,
    providers: {
      fal: { apiKey: configured && provider === 'fal' ? 'key' : '' },
      google: { apiKey: configured && provider === 'google' ? 'key' : '' },
      firefly: { proxyUrl: configured && provider === 'firefly' ? 'https://proxy.example.com' : '' }
    }
  };
}

test('runGenerationPreflight stops when template validation fails', async () => {
  let referenceCalled = false;
  const ok = await runGenerationPreflight({
    settings: buildSettings(),
    ensureTemplateValidOrNotify: () => false,
    ensureReferenceImageReadyForGeneration: async () => {
      referenceCalled = true;
      return true;
    },
    setGlobalMessage: () => {}
  });

  assert.equal(ok, false);
  assert.equal(referenceCalled, false);
});

test('runGenerationPreflight stops when reference image validation fails', async () => {
  const ok = await runGenerationPreflight({
    settings: buildSettings(),
    ensureTemplateValidOrNotify: () => true,
    ensureReferenceImageReadyForGeneration: async () => false,
    setGlobalMessage: () => {}
  });

  assert.equal(ok, false);
});

test('runGenerationPreflight reports unconfigured provider', async () => {
  const messages = [];
  const ok = await runGenerationPreflight({
    settings: buildSettings('fal', false),
    ensureTemplateValidOrNotify: () => true,
    ensureReferenceImageReadyForGeneration: async () => true,
    setGlobalMessage: (type, text) => {
      messages.push({ type, text });
    }
  });

  assert.equal(ok, false);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].type, 'error');
});

test('runGenerationPreflight returns true when checks pass', async () => {
  const ok = await runGenerationPreflight({
    settings: buildSettings('google', true),
    ensureTemplateValidOrNotify: () => true,
    ensureReferenceImageReadyForGeneration: async () => true,
    setGlobalMessage: () => {}
  });

  assert.equal(ok, true);
});
