import test from 'node:test';
import assert from 'node:assert/strict';

import { buildReferenceImagePayload, inferModelImageRequirement } from '../src/model-input.js';

test('inferModelImageRequirement detects required image url field', () => {
  const openapi = {
    paths: {
      '/run': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    prompt: { type: 'string' },
                    reference_image_url: { type: 'string', format: 'uri' }
                  },
                  required: ['prompt', 'reference_image_url']
                }
              }
            }
          }
        }
      }
    }
  };

  const result = inferModelImageRequirement(openapi);
  assert.equal(result.status, 'ready');
  assert.equal(result.imageSupport, 'required');
  assert.equal(result.preferredField?.name, 'reference_image_url');
  assert.equal(result.fields.length, 1);
  assert.equal(result.fields[0].required, true);
});

test('inferModelImageRequirement detects optional array image field', () => {
  const openapi = {
    paths: {
      '/run': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    prompt: { type: 'string' },
                    image_urls: {
                      type: 'array',
                      items: { type: 'string', format: 'uri' }
                    }
                  },
                  required: ['prompt']
                }
              }
            }
          }
        }
      }
    }
  };

  const result = inferModelImageRequirement(openapi);
  assert.equal(result.status, 'ready');
  assert.equal(result.imageSupport, 'optional');
  assert.equal(result.preferredField?.name, 'image_urls');
  assert.equal(result.preferredField?.expectsArray, true);
});

test('inferModelImageRequirement returns none when no image field exists', () => {
  const openapi = {
    paths: {
      '/run': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    prompt: { type: 'string' },
                    seed: { type: 'integer' }
                  },
                  required: ['prompt']
                }
              }
            }
          }
        }
      }
    }
  };

  const result = inferModelImageRequirement(openapi);
  assert.equal(result.status, 'ready');
  assert.equal(result.imageSupport, 'none');
  assert.equal(result.fields.length, 0);
});

test('buildReferenceImagePayload maps to preferred field', () => {
  const requirement = {
    imageSupport: 'required',
    preferredField: { name: 'reference_image_url', expectsArray: false }
  };
  const payload = buildReferenceImagePayload(requirement, 'https://example.com/ref.png');
  assert.deepEqual(payload, { reference_image_url: 'https://example.com/ref.png' });
});

test('buildReferenceImagePayload handles array fields and empty values', () => {
  const requirement = {
    imageSupport: 'optional',
    preferredField: { name: 'image_urls', expectsArray: true }
  };

  assert.deepEqual(buildReferenceImagePayload(requirement, 'data:image/png;base64,aaaa'), {
    image_urls: ['data:image/png;base64,aaaa']
  });
  assert.deepEqual(buildReferenceImagePayload(requirement, ''), {});
});
