import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createReferenceImageState,
  getReferenceImageValue,
  hasReferenceImageValue,
  parseReferenceImageUrl
} from '../src/reference-image.js';

test('createReferenceImageState returns empty initial shape', () => {
  assert.deepEqual(createReferenceImageState(), {
    fileName: '',
    mimeType: '',
    fileDataUrl: '',
    url: ''
  });
});

test('getReferenceImageValue prioritizes file data over url', () => {
  assert.equal(
    getReferenceImageValue({
      fileDataUrl: 'data:image/png;base64,aaaa',
      url: 'https://example.com/ignored.png'
    }),
    'data:image/png;base64,aaaa'
  );
  assert.equal(getReferenceImageValue({ fileDataUrl: '', url: 'https://example.com/ref.png' }), 'https://example.com/ref.png');
});

test('hasReferenceImageValue reflects availability', () => {
  assert.equal(hasReferenceImageValue({ fileDataUrl: '', url: '' }), false);
  assert.equal(hasReferenceImageValue({ fileDataUrl: '', url: 'https://example.com/ref.png' }), true);
});

test('parseReferenceImageUrl allows http(s)/data and rejects unsupported protocol', () => {
  assert.equal(parseReferenceImageUrl('https://example.com/ref.png'), 'https://example.com/ref.png');
  assert.equal(parseReferenceImageUrl('data:image/png;base64,aaaa'), 'data:image/png;base64,aaaa');
  assert.throws(() => parseReferenceImageUrl('ftp://example.com/file.png'));
});
