import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFinalPrompt,
  createPromptCard,
  deepMerge,
  extractImageUrl,
  isCardDirty,
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

test('createPromptCard accepts provider and model', () => {
  const card = createPromptCard('hello world', 'google', 'gemini-2.5');
  assert.equal(card.prompt, 'hello world');
  assert.equal(card.provider, 'google');
  assert.equal(card.model, 'gemini-2.5');
  assert.equal(card.status, 'pending');
  assert.equal(card.generatedWith, null);
});

test('createPromptCard defaults provider and model to empty', () => {
  const card = createPromptCard('test');
  assert.equal(card.provider, '');
  assert.equal(card.model, '');
  assert.equal(card.generatedWith, null);
});

test('isCardDirty returns false when no generatedWith', () => {
  const card = createPromptCard('test', 'fal', 'model-a');
  assert.equal(isCardDirty(card, '', buildFinalPrompt), false);
});

test('isCardDirty returns false for non-success status', () => {
  const card = createPromptCard('test', 'fal', 'model-a');
  card.status = 'error';
  card.generatedWith = { provider: 'fal', model: 'model-a', finalPrompt: 'test', commonPrompt: '' };
  assert.equal(isCardDirty(card, '', buildFinalPrompt), false);
});

test('isCardDirty returns true when provider changed', () => {
  const card = createPromptCard('test', 'google', 'model-a');
  card.status = 'success';
  card.generatedWith = { provider: 'fal', model: 'model-a', finalPrompt: 'test', commonPrompt: '' };
  assert.equal(isCardDirty(card, '', buildFinalPrompt), true);
});

test('isCardDirty returns true when model changed', () => {
  const card = createPromptCard('test', 'fal', 'model-b');
  card.status = 'success';
  card.generatedWith = { provider: 'fal', model: 'model-a', finalPrompt: 'test', commonPrompt: '' };
  assert.equal(isCardDirty(card, '', buildFinalPrompt), true);
});

test('isCardDirty returns true when common prompt changed', () => {
  const card = createPromptCard('subject', 'fal', 'model-a');
  card.status = 'success';
  card.generatedWith = { provider: 'fal', model: 'model-a', finalPrompt: 'old common\n\nsubject', commonPrompt: 'old common' };
  assert.equal(isCardDirty(card, 'new common', buildFinalPrompt), true);
});

test('isCardDirty returns false when nothing changed', () => {
  const card = createPromptCard('subject', 'fal', 'model-a');
  card.status = 'success';
  card.generatedWith = { provider: 'fal', model: 'model-a', finalPrompt: 'common\n\nsubject', commonPrompt: 'common' };
  assert.equal(isCardDirty(card, 'common', buildFinalPrompt), false);
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
