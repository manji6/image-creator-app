import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeFalModels,
  normalizeGoogleModels,
  withDisambiguatedLabels
} from '../src/model-catalog.js';

test('normalizeFalModels maps payload variants and filters by category', () => {
  const payload = {
    models: [
      { endpoint_id: 'fal-ai/flux/schnell', metadata: { display_name: 'Flux Schnell' }, category: 'text-to-image' },
      { name: 'fal-ai/flux/dev', category: 'image-to-image' },
      { endpoint_id: 'fal-ai/flux/schnell', category: 'text-to-image' },
      { endpoint_id: 'fal-ai/video-gen', metadata: { display_name: 'Video Generator' }, category: 'text-to-video' },
      { endpoint_id: 'fal-ai/text-gen', category: 'text-generation' },
      { endpoint_id: 'fal-ai/legacy-model' } // カテゴリーなしは互換性のため表示
    ]
  };

  const result = normalizeFalModels(payload);
  assert.equal(result.length, 3);
  // ソート順は sortByLabel によってアルファベット順になる
  assert.deepEqual(
    result.map((item) => item.id),
    ['fal-ai/flux/dev', 'fal-ai/legacy-model', 'fal-ai/flux/schnell']
  );
});

test('normalizeGoogleModels filters unsupported models', () => {
  const payload = {
    models: [
      { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] },
      { name: 'models/gemini-2.0-flash-image', supportedGenerationMethods: ['generateContent'] }
    ]
  };

  const result = normalizeGoogleModels(payload);
  assert.deepEqual(
    result.map((item) => item.id),
    ['gemini-2.0-flash-image', 'gemini-2.5-flash']
  );
});

test('withDisambiguatedLabels appends id when labels are duplicated', () => {
  const result = withDisambiguatedLabels([
    { id: 'a/1', label: 'Flux 2' },
    { id: 'a/2', label: 'Flux 2' },
    { id: 'b/1', label: 'Kling 2' }
  ]);

  assert.deepEqual(
    result.map((item) => item.displayLabel),
    ['Flux 2 (a/1)', 'Flux 2 (a/2)', 'Kling 2']
  );
});
