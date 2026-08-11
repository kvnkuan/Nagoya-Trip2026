import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const projectFile = (path) => new URL(`../${path}`, import.meta.url);

test('PWA source files exist', async () => {
  const files = [
    'public/index.html',
    'public/styles.css',
    'public/manifest.webmanifest',
    'public/sw.js',
    'public/icon.svg',
    'src/app.js',
    'scripts/build.mjs',
  ];
  await assert.doesNotReject(() => Promise.all(files.map((file) => readFile(projectFile(file), 'utf8'))));
});

test('manifest and HTML are configured for an iPhone standalone PWA', async () => {
  const manifest = JSON.parse(await readFile(projectFile('public/manifest.webmanifest'), 'utf8'));
  const html = await readFile(projectFile('public/index.html'), 'utf8');

  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'zh-Hant');
  assert.ok(manifest.icons.some((icon) => icon.purpose.includes('maskable')));
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /manifest\.webmanifest/);
});

test('service worker caches the app shell and refreshes Markdown data', async () => {
  const serviceWorker = await readFile(projectFile('public/sw.js'), 'utf8');
  assert.match(serviceWorker, /nagoya-trip\.md/);
  assert.match(serviceWorker, /cache\.put/);
  assert.match(serviceWorker, /APP_SHELL/);
});

test('hero has no decorative pseudo-element character', async () => {
  const css = await readFile(projectFile('public/styles.css'), 'utf8');
  assert.doesNotMatch(css, /\.hero::after/);
});

test('app runtime has no local annotation storage or editor binding', async () => {
  const app = await readFile(projectFile('src/app.js'), 'utf8');
  assert.doesNotMatch(app, /localStorage|noteStorageKey|bindNoteEditors|data-note-/);
});

test('app shell does not impose a 320px body minimum', async () => {
  const css = await readFile(projectFile('public/styles.css'), 'utf8');
  assert.doesNotMatch(css, /min-width:\s*320px/);
  assert.doesNotMatch(css, /width:\s*min\(100%,\s*430px\)/);
  assert.match(css, /max-width:\s*430px/);
});
