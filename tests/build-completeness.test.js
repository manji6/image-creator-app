import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { constants } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

test('all expected pages are generated', async () => {
  const expectedPages = [
    '_site/index.html',
    '_site/help/index.html',
    '_site/guide/firefly-token/index.html'
  ];

  for (const page of expectedPages) {
    const pagePath = `${ROOT}/${page}`;
    try {
      await access(pagePath, constants.F_OK);
    } catch {
      assert.fail(`Missing page: ${page}`);
    }
  }
});

test('all pages have required structure', async () => {
  const pages = [
    { path: '_site/index.html', name: 'index' },
    { path: '_site/help/index.html', name: 'help' },
    { path: '_site/guide/firefly-token/index.html', name: 'firefly-token' }
  ];

  for (const { path, name } of pages) {
    const html = await readFile(`${ROOT}/${path}`, 'utf8');

    // All pages must have navigation
    assert.match(html, /<nav/, `Missing <nav> in ${name}`);

    // All pages must have title
    assert.match(html, /<title>[^<]+<\/title>/, `Missing <title> in ${name}`);

    // All pages must reference styles.css
    assert.match(html, /styles\.css/, `Missing styles.css in ${name}`);
  }
});

test('build artifacts directory structure is correct', async () => {
  const requiredDirs = [
    '_site',
    '_site/src',
    '_site/help',
    '_site/guide',
    '_site/guide/firefly-token'
  ];

  for (const dir of requiredDirs) {
    const dirPath = `${ROOT}/${dir}`;
    try {
      await access(dirPath, constants.F_OK);
    } catch {
      assert.fail(`Missing directory: ${dir}`);
    }
  }
});
