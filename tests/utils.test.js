import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFinalPrompt,
  deepMerge,
  extractImageUrl,
  normalizePromptLines
} from '../src/utils.js';

test('normalizePromptLines keeps only non-empty trimmed lines', () => {
  const input = '  one  \n\n two\n   \nthree  ';
  assert.deepEqual(normalizePromptLines(input), ['one', 'two', 'three']);
});

test('buildFinalPrompt combines common and line prompt', () => {
  const combined = buildFinalPrompt('style', 'subject');
  assert.equal(combined, 'style\n\nsubject');
  assert.equal(buildFinalPrompt('', 'subject'), 'subject');
});

test('deepMerge merges nested config objects', () => {
  const base = {
    providers: {
      fal: { apiKey: '', model: 'default' },
      firefly: { proxyUrl: '' }
    },
    activeProvider: 'fal'
  };

  const override = {
    providers: {
      fal: { apiKey: 'abc' }
    }
  };

  const merged = deepMerge(base, override);
  assert.equal(merged.providers.fal.apiKey, 'abc');
  assert.equal(merged.providers.fal.model, 'default');
  assert.equal(merged.providers.firefly.proxyUrl, '');
  assert.equal(merged.activeProvider, 'fal');
});

test('extractImageUrl supports Gemini inlineData payload', () => {
  const payload = {
    candidates: [
      {
        content: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: 'abcd1234'
              }
            }
          ]
        }
      }
    ]
  };

  assert.equal(extractImageUrl(payload), 'data:image/png;base64,abcd1234');
});

test('extractImageUrl supports urls in images array', () => {
  const payload = {
    images: [{ url: 'https://example.com/image.png' }]
  };

  assert.equal(extractImageUrl(payload), 'https://example.com/image.png');
});

test('extractImageUrl supports Firefly polling payload with result.outputs.image.url', () => {
  const payload = {
    status: 'succeeded',
    result: {
      outputs: [
        {
          image: {
            url: 'https://example.com/firefly-result.png'
          }
        }
      ]
    }
  };

  assert.equal(extractImageUrl(payload), 'https://example.com/firefly-result.png');
});
