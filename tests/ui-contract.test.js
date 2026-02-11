import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

test('index.html has global generate controls', async () => {
  const html = await readFile(`${ROOT}/index.html`, 'utf8');
  assert.doesNotMatch(html, /id="generateAllButton"/);
  assert.match(html, /id="generateExistingButton"/);
  assert.match(html, /id="regenerateFailedButton"/);
  assert.match(html, /id="downloadAllButton"/);
  assert.match(html, /id="providerModelSelect"/);
  assert.match(html, /id="modeSelect"/);
  assert.match(html, /id="fireflyClientIdInput"/);
  assert.match(html, /id="fireflyAccessTokenInput"/);
  assert.match(html, /id="fireflyApiBaseInput"/);
  assert.match(html, /id="fireflyContentClassInput"/);
  assert.match(html, /id="modelRequirementMessage"/);
  assert.match(html, /id="referenceImageSection"/);
  assert.match(html, /id="referenceImageInput"/);
  assert.match(html, /id="referenceImageUrlInput"/);
  assert.match(html, /id="referenceImageValidationMessage"/);
  assert.match(html, /class="card-actions[^"]*"/);
  assert.match(html, /class="card-regenerate[^"]*bg-blue-600[^"]*text-white[^"]*hover:bg-blue-700/);
  assert.match(html, /class="card-preview[^"]*text-blue-700/);
  assert.match(html, /class="card-download[^"]*bg-emerald-600[^"]*text-white[^"]*hover:bg-emerald-700/);
  assert.match(html, /id="previewModal"/);
  assert.match(html, /id="imagePreviewModal"/);
  assert.match(html, /id="imagePreviewModalImage"/);
  assert.match(html, /id="closeImagePreviewModalButton"/);
  assert.match(html, /jszip\.min\.js/);
});

test('action button classes are generated via Tailwind utilities in JS fallback', async () => {
  const script = await readFile(`${ROOT}/src/card-actions.js`, 'utf8');
  assert.match(script, /card-regenerate[^']*bg-blue-600[^']*text-white[^']*hover:bg-blue-700/);
  assert.match(script, /card-preview[^']*text-blue-700/);
  assert.match(script, /card-download[^']*bg-emerald-600[^']*text-white[^']*hover:bg-emerald-700/);
});

test('styles.css does not override regenerate button colors directly', async () => {
  const css = await readFile(`${ROOT}/styles.css`, 'utf8');
  assert.doesNotMatch(css, /\.card-regenerate\s*\{/);
});
