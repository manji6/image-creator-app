import test from 'node:test';
import assert from 'node:assert/strict';

import {
  chooseFileExtension,
  embedPromptMetadataInPng,
  sanitizePromptSegment,
  shortPromptHash
} from '../src/download.js';

function hasChunk(bytes, chunkName) {
  const pattern = new TextEncoder().encode(chunkName);
  for (let i = 0; i <= bytes.length - pattern.length; i += 1) {
    let matched = true;
    for (let j = 0; j < pattern.length; j += 1) {
      if (bytes[i + j] !== pattern[j]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return true;
    }
  }
  return false;
}

test('sanitizePromptSegment strips invalid filename chars', () => {
  const result = sanitizePromptSegment('  a/b:c*?"<>|  テスト prompt  ');
  assert.equal(result, 'abc_テスト_prompt');
});

test('shortPromptHash is deterministic', async () => {
  const a = await shortPromptHash('hello');
  const b = await shortPromptHash('hello');
  const c = await shortPromptHash('world');
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('chooseFileExtension resolves by mime first', () => {
  const blob = new Blob(['x'], { type: 'image/jpeg' });
  const ext = chooseFileExtension(blob, 'https://example.com/file.png');
  assert.equal(ext, 'jpg');
});

test('embedPromptMetadataInPng inserts iTXt chunk', async () => {
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7ZtioAAAAASUVORK5CYII=';
  const bytes = Buffer.from(base64, 'base64');
  const blob = new Blob([bytes], { type: 'image/png' });

  const result = await embedPromptMetadataInPng(blob, '日本語プロンプト');
  const out = new Uint8Array(await result.blob.arrayBuffer());

  assert.equal(result.metadataEmbedded, true);
  assert.equal(hasChunk(out, 'iTXt'), true);
  assert.equal(out.length > bytes.length, true);
});
