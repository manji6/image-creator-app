import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { constants } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

test('all navigation links point to existing pages', async () => {
  const siteData = JSON.parse(
    await readFile(`${ROOT}/src-templates/_data/site.json`, 'utf8')
  );

  for (const item of siteData.nav) {
    const url = item.url;
    // Convert URL to file path: /help/ → _site/help/index.html
    const pagePath = url === '/'
      ? `${ROOT}/_site/index.html`
      : `${ROOT}/_site${url.replace(/\/$/, '')}/index.html`;

    try {
      await access(pagePath, constants.F_OK);
    } catch {
      assert.fail(`Navigation broken: "${item.label}" → ${url} (missing: ${pagePath})`);
    }
  }
});

test('navigation links are rendered correctly in all pages', async () => {
  const pages = [
    '_site/index.html',
    '_site/help/index.html',
    '_site/guide/firefly-token/index.html'
  ];

  for (const page of pages) {
    const html = await readFile(`${ROOT}/${page}`, 'utf8');

    // Verify navigation contains correct hrefs
    assert.match(html, /href="\/"/, `Missing home link in ${page}`);
    assert.match(html, /href="\/help\/"/, `Missing help link in ${page}`);
    assert.match(html, /href="\/guide\/firefly-token\/"/, `Missing firefly guide link in ${page}`);
  }
});
