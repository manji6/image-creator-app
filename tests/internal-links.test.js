import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

test('help page links to firefly guide correctly', async () => {
  const html = await readFile(`${ROOT}/_site/help/index.html`, 'utf8');

  // Check for the specific link to Firefly guide
  assert.match(
    html,
    /href="\/guide\/firefly-token\/"/,
    'Help page must link to Firefly guide with correct pretty URL format'
  );

  // Ensure it's NOT using the old .html format
  assert.doesNotMatch(
    html,
    /href="\/guide\/firefly-token\.html"/,
    'Help page must not use old .html format for Firefly guide link'
  );
});

test('all internal links use pretty URL format', async () => {
  const pages = [
    '_site/index.html',
    '_site/help/index.html',
    '_site/guide/firefly-token/index.html'
  ];

  for (const page of pages) {
    const html = await readFile(`${ROOT}/${page}`, 'utf8');

    // Find all internal links (starting with /)
    const internalLinks = html.match(/href="(\/[^"]+)"/g) || [];

    for (const link of internalLinks) {
      const url = link.match(/href="([^"]+)"/)[1];

      // Skip external resources, root, and static assets
      if (url === '/'
          || url.startsWith('/src/')
          || url.startsWith('/styles.')
          || url.startsWith('/favicon')
          || url.startsWith('/apple-touch-icon')
          || url.match(/\.(png|jpg|jpeg|gif|svg|css|js|json|ico)$/)) {
        continue;
      }

      // Internal page links should use pretty URL format (trailing /)
      if (!url.endsWith('/')) {
        assert.fail(
          `Non-pretty URL found in ${page}: ${url} (should end with /)`
        );
      }
    }
  }
});
